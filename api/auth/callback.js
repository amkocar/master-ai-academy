const crypto = require("crypto");

const API_BASE = process.env.WHOP_API_BASE || "https://api.whop.com/api/v1";

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf("=");
    return [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
  }));
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sign(payload, secret) {
  return b64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

function sessionCookie(user, maxAge) {
  const secret = process.env.WHOP_SESSION_SECRET || process.env.WHOP_CLIENT_SECRET;
  if (!secret) throw new Error("Missing WHOP_SESSION_SECRET or WHOP_CLIENT_SECRET");
  const payload = b64url(JSON.stringify({
    user_id: user.sub,
    name: user.name || "",
    username: user.preferred_username || "",
    email: user.email || "",
    iat: Date.now(),
  }));
  const sig = sign(payload, secret);
  return `maa_session=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function exchangeCode({ code, verifier, redirectUri }) {
  const body = {
  grant_type: "authorization_code",
  code,
  redirect_uri: redirectUri,
  client_id: process.env.WHOP_CLIENT_ID,
  client_secret: process.env.WHOP_CLIENT_SECRET,
  code_verifier: verifier,
  };
 

  const r = await fetch("https://api.whop.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Token exchange failed ${r.status}: ${text}`);
  }
  return r.json();
}

async function getUserInfo(accessToken) {
  const r = await fetch("https://api.whop.com/oauth/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`Userinfo failed: ${r.status}`);
  return r.json();
}

async function checkAccess(userId) {
  const apiKey = process.env.WHOP_API_KEY;
  const productId = process.env.WHOP_PRODUCT_ID;
  if (!apiKey) throw new Error("Missing WHOP_API_KEY");
  if (!productId) throw new Error("Missing WHOP_PRODUCT_ID");

  const r = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(productId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Api-Version-Date": process.env.WHOP_API_VERSION || "2026-07-01",
    },
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Whop access check failed ${r.status}: ${text}`);
  }
  return r.json();
}

module.exports = async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const url = new URL(req.url, `https://${req.headers.host}`);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) throw new Error(`Whop OAuth error: ${error}`);
    if (!code || !returnedState) throw new Error("Missing OAuth code/state");
    if (!cookies.whop_oauth_state || returnedState !== cookies.whop_oauth_state) {
      throw new Error("Invalid OAuth state");
    }

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const redirectUri = process.env.WHOP_REDIRECT_URI || `${proto}://${host}/api/auth/callback`;

    const tokens = await exchangeCode({ code, verifier: cookies.whop_oauth_verifier, redirectUri });
    const user = await getUserInfo(tokens.access_token);
    const access = await checkAccess(user.sub);

    if (!access.has_access || access.access_level === "no_access") {
      res.setHeader("Set-Cookie", [
        clearCookie("maa_session"),
        clearCookie("whop_oauth_state"),
        clearCookie("whop_oauth_verifier"),
      ]);
      res.writeHead(302, { Location: "/paywall.html?access=denied" });
      res.end();
      return;
    }

    res.setHeader("Set-Cookie", [
      sessionCookie(user, 60 * 60 * 24 * 30),
      clearCookie("whop_oauth_state"),
      clearCookie("whop_oauth_verifier"),
    ]);
    res.writeHead(302, { Location: "/academy.html" });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send(`Auth error: ${e.message}`);
  }
};
