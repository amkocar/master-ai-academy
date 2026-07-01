const crypto = require("crypto");
const API_BASE = process.env.WHOP_API_BASE || "https://api.whop.com/api/v1";

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf("=");
    return [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
  }));
}

function sign(payload, secret) {
  return Buffer.from(crypto.createHmac("sha256", secret).update(payload).digest()).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function verifySession(cookie) {
  if (!cookie) return null;
  const [payload, sig] = cookie.split(".");
  const secret = process.env.WHOP_SESSION_SECRET || process.env.WHOP_CLIENT_SECRET;
  if (!payload || !sig || !secret) return null;
  const expected = sign(payload, secret);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
}

async function checkAccess(userId) {
  const r = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(process.env.WHOP_PRODUCT_ID)}`, {
    headers: {
      Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
      "Api-Version-Date": process.env.WHOP_API_VERSION || "2026-07-01",
    },
  });
  if (!r.ok) return { has_access: false, access_level: "no_access" };
  return r.json();
}

module.exports = async (req, res) => {
  const session = verifySession(parseCookies(req).maa_session);
  if (!session) {
    res.status(401).json({ logged_in: false, access: false });
    return;
  }
  const access = await checkAccess(session.user_id);
  res.status(200).json({
    logged_in: true,
    access: !!access.has_access && access.access_level !== "no_access",
    access_level: access.access_level || null,
    user: {
      id: session.user_id,
      name: session.name,
      username: session.username,
      email: session.email,
    },
  });
};
