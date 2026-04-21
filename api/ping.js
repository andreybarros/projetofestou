module.exports = (req, res) => {
  res.json({ ok: true, url: req.url, method: req.method, env: !!process.env.SUPABASE_KEY });
};
