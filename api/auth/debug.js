module.exports = async (req, res) => {
  res.status(200).json({
    ok: true,
    env: {
      WHOP_PRODUCT_ID: Boolean(process.env.WHOP_PRODUCT_ID),
      WHOP_CLIENT_ID: Boolean(process.env.WHOP_CLIENT_ID),
      WHOP_CLIENT_SECRET: Boolean(process.env.WHOP_CLIENT_SECRET),
      WHOP_API_KEY: Boolean(process.env.WHOP_API_KEY),
      WHOP_SESSION_SECRET: Boolean(process.env.WHOP_SESSION_SECRET),
      WHOP_REDIRECT_URI: Boolean(process.env.WHOP_REDIRECT_URI),
    },
  });
};
