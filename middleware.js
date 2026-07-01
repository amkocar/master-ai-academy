const API_BASE = process.env.WHOP_API_BASE || "https://api.whop.com/api/v1";

function b64urlToString(value) {
  value = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = value.length % 4 ? 4 - (value.length % 4) : 0;
  return atob(value + "=".repeat(pad));
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
  const bytes = new Uint8Array(sig);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifySession(cookie) {
  if (!cookie) return null;
  const [payload, sig] = cookie.split(".");
  const secret = process.env.WHOP_SESSION_SECRET || process.env.WHOP_CLIENT_SECRET;
  if (!payload || !sig || !secret) return null;
  const expected = await hmac(payload, secret);
  if (expected !== sig) return null;
  return JSON.parse(b64urlToString(payload));
}

async function checkWhopAccess(userId) {
  const apiKey = process.env.WHOP_API_KEY;
  const productId = process.env.WHOP_PRODUCT_ID;
  if (!apiKey || !productId) return false;

  const r = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(productId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Api-Version-Date": process.env.WHOP_API_VERSION || "2026-07-01",
    },
  });

  if (!r.ok) return false;
  const data = await r.json().catch(() => ({}));
  return !!data.has_access && data.access_level !== "no_access";
}

export const config = {
  matcher: ["/academy.html"],
};

export default async function middleware(request) {
  const sessionCookie = request.cookies.get("maa_session")?.value;
  const session = await verifySession(sessionCookie);

  if (!session?.user_id) {
    return Response.redirect(new URL("/paywall.html", request.url), 302);
  }

  const hasAccess = await checkWhopAccess(session.user_id);

  if (!hasAccess) {
    const response = Response.redirect(new URL("/paywall.html?access=expired", request.url), 302);
    response.headers.append("Set-Cookie", "maa_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    return response;
  }

  return;
}
