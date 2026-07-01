const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sha256(verifier) {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

module.exports = async (req, res) => {
  const clientId = process.env.WHOP_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("Missing WHOP_CLIENT_ID in Vercel Environment Variables.");
    return;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = process.env.WHOP_REDIRECT_URI || `${proto}://${host}/api/auth/callback`;

  const state = base64url(crypto.randomBytes(24));
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = sha256(verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: process.env.WHOP_OAUTH_SCOPE || "openid profile email",
    state,
    nonce: base64url(crypto.randomBytes(16)),
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  if (process.env.WHOP_COMPANY_ID) {
    params.set("company_id", process.env.WHOP_COMPANY_ID);
  }

  res.setHeader("Set-Cookie", [
    cookie("whop_oauth_state", state, 600),
    cookie("whop_oauth_verifier", verifier, 600),
  ]);
  res.writeHead(302, { Location: `https://api.whop.com/oauth/authorize?${params}` });
  res.end();
};
