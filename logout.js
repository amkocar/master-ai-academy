module.exports = async (req, res) => {
  res.setHeader("Set-Cookie", "maa_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  res.writeHead(302, { Location: "/paywall.html?logged_out=1" });
  res.end();
};
