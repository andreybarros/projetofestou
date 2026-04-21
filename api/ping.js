module.exports = async (req, res) => {
  const info = {
    ok: true,
    url: req.url,
    node: process.version,
    supabase_url: process.env.SUPABASE_URL || '(usando fallback hardcoded)',
    supabase_key_set: !!process.env.SUPABASE_KEY,
  };

  // Testa conexão com o Supabase diretamente
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://lflpzskcpcsfzagackuy.supabase.co';
    const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_5jo3h0in7z4PPCsw4K5RjA_g-TVT_NP';
    const resp = await fetch(`${supabaseUrl}/rest/v1/filiais?select=pk&limit=1`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    info.supabase_status = resp.status;
    info.supabase_ok = resp.ok;
  } catch (e) {
    info.supabase_error = e.message;
    info.supabase_cause = e.cause?.message;
  }

  res.json(info);
};
