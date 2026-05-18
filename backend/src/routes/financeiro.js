const express  = require('express');
const supabase  = require('../supabase');
const router    = express.Router();

const FORMAS_PADRAO = [
  { forma: 'dinheiro', label: 'Dinheiro', icone: '💵', ordem: 0, ativo: true },
  { forma: 'pix',      label: 'Pix',      icone: '📱', ordem: 1, ativo: true },
  { forma: 'credito',  label: 'Crédito',  icone: '💳', ordem: 2, ativo: true },
  { forma: 'debito',   label: 'Débito',   icone: '💳', ordem: 3, ativo: true },
  { forma: 'crediario',label: 'Crediário',icone: '📒', ordem: 4, ativo: true },
];

// ── Contas bancárias ──────────────────────────────────────────────────────────

router.get('/contas', async (req, res) => {
  const { filial_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('*')
    .eq('filial_pk', filial_pk)
    .eq('ativo', true)
    .order('nome');
  if (error) { console.error('[Financeiro/contas GET]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true, data });
});

router.post('/contas', async (req, res) => {
  const { filial_pk, nome, tipo, saldo } = req.body;
  if (!filial_pk || !nome) return res.status(400).json({ erro: 'filial_pk e nome obrigatórios' });
  const { data, error } = await supabase
    .from('contas_bancarias')
    .insert([{ filial_pk, nome, tipo: tipo || 'pix', saldo: saldo || 0 }])
    .select()
    .single();
  if (error) { console.error('[Financeiro/contas POST]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true, data });
});

router.patch('/contas/:pk/saldo', async (req, res) => {
  const { pk } = req.params;
  const { saldo } = req.body;
  if (saldo === undefined) return res.status(400).json({ erro: 'saldo obrigatório' });
  const { error } = await supabase.from('contas_bancarias').update({ saldo }).eq('pk', pk);
  if (error) { console.error('[Financeiro/contas PATCH saldo]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true });
});

router.delete('/contas/:pk', async (req, res) => {
  const { pk } = req.params;
  const { error } = await supabase.from('contas_bancarias').update({ ativo: false }).eq('pk', pk);
  if (error) { console.error('[Financeiro/contas DELETE]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true });
});

// ── Extrato ───────────────────────────────────────────────────────────────────

router.get('/extrato', async (req, res) => {
  const { filial_pk, conta_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    let q = supabase
      .from('movimentacoes_financeiras')
      .select('*, contas_bancarias(nome, filial_pk)')
      .order('data_movimento', { ascending: false })
      .limit(100);

    if (conta_pk) {
      q = q.eq('conta_pk', conta_pk);
    } else {
      const { data: contasFilial, error: ce } = await supabase
        .from('contas_bancarias')
        .select('pk')
        .eq('filial_pk', filial_pk);
      if (ce) throw ce;
      const pks = (contasFilial || []).map(c => c.pk);
      if (!pks.length) return res.json({ ok: true, data: [] });
      q = q.in('conta_pk', pks);
    }

    const { data, error } = await q;
    if (error) throw error;
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[Financeiro/extrato]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── Formas de pagamento ───────────────────────────────────────────────────────

router.get('/formas', async (req, res) => {
  const { filial_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const { data, error } = await supabase
      .from('formas_pagamento')
      .select('*')
      .eq('filial_pk', filial_pk)
      .order('ordem');
    if (error) throw error;

    if (!data || data.length === 0) {
      const seeds = FORMAS_PADRAO.map(f => ({ ...f, filial_pk: parseInt(filial_pk) }));
      await supabase.from('formas_pagamento').insert(seeds);
      const { data: fresh } = await supabase
        .from('formas_pagamento')
        .select('*')
        .eq('filial_pk', filial_pk)
        .order('ordem');
      return res.json({ ok: true, data: fresh || [] });
    }
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[Financeiro/formas GET]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

router.post('/formas', async (req, res) => {
  const { filial_pk, forma, label, icone, ordem } = req.body;
  if (!filial_pk || !forma || !label) return res.status(400).json({ erro: 'filial_pk, forma e label obrigatórios' });
  const formaId = forma.trim().toLowerCase().replace(/\s+/g, '_');
  const { data, error } = await supabase
    .from('formas_pagamento')
    .insert([{ filial_pk, forma: formaId, label, icone: icone || '💳', ativo: true, ordem: ordem ?? 99 }])
    .select()
    .single();
  if (error) { console.error('[Financeiro/formas POST]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true, data });
});

router.patch('/formas/:pk', async (req, res) => {
  const { pk } = req.params;
  const campos = {};
  if (req.body.forma  !== undefined) campos.forma  = req.body.forma.trim().toLowerCase().replace(/\s+/g, '_');
  if (req.body.label  !== undefined) campos.label  = req.body.label;
  if (req.body.icone  !== undefined) campos.icone  = req.body.icone;
  if (req.body.ativo  !== undefined) campos.ativo  = req.body.ativo;
  const { error } = await supabase.from('formas_pagamento').update(campos).eq('pk', pk);
  if (error) { console.error('[Financeiro/formas PATCH]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true });
});

router.delete('/formas/:pk', async (req, res) => {
  const { pk } = req.params;
  const { error } = await supabase.from('formas_pagamento').delete().eq('pk', pk);
  if (error) { console.error('[Financeiro/formas DELETE]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true });
});

// ── Categorias de despesa ─────────────────────────────────────────────────────

router.get('/categorias', async (req, res) => {
  const { filial_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  const { data, error } = await supabase
    .from('categorias_despesa')
    .select('*')
    .eq('filial_pk', filial_pk)
    .eq('ativo', true)
    .order('nome');
  if (error) { console.error('[Financeiro/categorias GET]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true, data });
});

router.post('/categorias', async (req, res) => {
  const { filial_pk, nome } = req.body;
  if (!filial_pk || !nome) return res.status(400).json({ erro: 'filial_pk e nome obrigatórios' });
  const { data, error } = await supabase
    .from('categorias_despesa')
    .insert([{ filial_pk, nome }])
    .select()
    .single();
  if (error) { console.error('[Financeiro/categorias POST]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true, data });
});

router.delete('/categorias/:pk', async (req, res) => {
  const { pk } = req.params;
  const { error } = await supabase.from('categorias_despesa').update({ ativo: false }).eq('pk', pk);
  if (error) { console.error('[Financeiro/categorias DELETE]', error.message); return res.status(500).json({ erro: error.message }); }
  res.json({ ok: true });
});

module.exports = router;
