import { NextResponse } from "next/server";

const API_BASE = process.env.WHOP_API_BASE || "https://api.whop.com/api/v1";

function b64urlToBytes(value) {
  value = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = value.length % 4 ? 4 - (value.length % 4) : 0;
  const binary = atob(value + "=".repeat(pad));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToB64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToB64url(new Uint8Array(sig));
}

async function verifySession(cookie) {
  try {
    if (!cookie) return null;

    const [payload, sig] = cookie.split(".");
    const secret = process.env.WHOP_SESSION_SECRET || process.env.WHOP_CLIENT_SECRET;

    if (!payload || !sig || !secret) return null;

    const expected = await hmac(payload, secret);
    if (expected !== sig) return null;

    const json = new TextDecoder().decode(b64urlToBytes(payload));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

async function checkWhopAccess(userId) {
  try {
    const apiKey = process.env.WHOP_API_KEY;
    const productId = process.env.WHOP_PRODUCT_ID;

    if (!apiKey || !productId || !userId) return false;

    const r = await fetch(
      `${API_BASE}/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(productId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Api-Version-Date": process.env.WHOP_API_VERSION || "2026-07-01",
        },
        cache: "no-store",
      }
    );

    if (!r.ok) return false;

    const data = await r.json();
    return Boolean(data.has_access) && data.access_level !== "no_access";
  } catch (e) {
    return false;
  }
}

export const config = {
  matcher: ["/academy.html"],
};

export default async function middleware(request) {
  try {
    const sessionCookie = request.cookies.get("maa_session")?.value;
    const session = await verifySession(sessionCookie);

    if (!session?.user_id) {
      return NextResponse.redirect(new URL("/paywall.html", request.url));
    }

    const hasAccess = await checkWhopAccess(session.user_id);

    if (!hasAccess) {
      const response = NextResponse.redirect(new URL("/paywall.html?access=expired", request.url));
      response.cookies.set("maa_session", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      return response;
    }

    return NextResponse.next();
  } catch (e) {
    return NextResponse.redirect(new URL("/paywall.html?middleware=error", request.url));
  }
}
