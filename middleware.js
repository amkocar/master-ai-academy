const API_BASE = process.env.WHOP_API_BASE || "https://api.whop.com/api/v1";

function redirectTo(url) {
  return Response.redirect(url, 302);
}

function b64urlDecode(value) {
  value = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = value.length % 4 ? 4 - (value.length % 4) : 0;
  return atob(value + "=".repeat(pad));
}

function b64urlEncode(bytes) {
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
  return b64urlEncode(new Uint8Array(sig));
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const parts = header.split(";").map(v => v.trim());
  for (const part of parts) {
    if (part.startsWith(name + "=")) return decodeURIComponent(part.slice(name.length + 1));
  }
  return "";
}

async function verifySession(cookie) {
  try {
    if (!cookie) return null;

    const [payload, sig] = cookie.split(".");
    const secret = process.env.WHOP_SESSION_SECRET || process.env.WHOP_CLIENT_SECRET;

    if (!payload || !sig || !secret) return null;

    const expected = await hmac(payload, secret);
    if (expected !== sig) return null;

    return JSON.parse(b64urlDecode(payload));
  } catch (e) {
    return null;
  }
}

async function checkWhopAccess(userId) {
  try {
    const apiKey = process.env.WHOP_API_KEY;
    const productId = process.env.WHOP_PRODUCT_ID;

    if (!apiKey || !productId || !userId) return false;

    const response = await fetch(
      `${API_BASE}/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(productId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Api-Version-Date": process.env.WHOP_API_VERSION || "2026-07-01",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
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
    const url = new URL(request.url);

    const sessionCookie = readCookie(request, "maa_session");
    const session = await verifySession(sessionCookie);

    if (!session || !session.user_id) {
      return redirectTo(new URL("/paywall.html", url).toString());
    }

    const hasAccess = await checkWhopAccess(session.user_id);

    if (!hasAccess) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: new URL("/paywall.html?access=expired", url).toString(),
          "Set-Cookie": "maa_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
        },
      });
    }

    return fetch(request);
  } catch (e) {
    return redirectTo(new URL("/paywall.html?middleware=error", request.url).toString());
  }
}
