const express  = require('express');
const supabase  = require('../supabase');
const router    = express.Router();

// ── Auxiliares (fornecedores + contas + categorias) ───────────────────────────
router.get('/auxiliares', async (req, res) => {
  const { filial_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const [{ data: forn }, { data: contas }, { data: cats }] = await Promise.all([
      supabase.from('fornecedores').select('pk, nome').eq('ativo', true).order('nome'),
      supabase.from('contas_bancarias').select('pk, nome').eq('ativo', true).order('nome'),
      supabase.from('categorias_despesa').select('pk, nome, cor').eq('filial_pk', filial_pk).order('nome'),
    ]);
    res.json({ ok: true, fornecedores: forn || [], contas: contas || [], categorias: cats || [] });
  } catch (e) {
    console.error('[Despesas/auxiliares]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── Listar despesas ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { filial_pk, ini, fim, status } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    let q = supabase
      .from('despesas')
      .select('*, fornecedores(nome)')
      .eq('filial_pk', filial_pk)
      .order('vencimento', { ascending: true });
    if (ini)    q = q.gte('vencimento', ini);
    if (fim)    q = q.lte('vencimento', fim);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (e) {
    console.error('[Despesas/listar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── Criar despesa ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { filial_pk, descricao, fornecedor_pk, valor, vencimento, categoria, status, conta_pk } = req.body;
  if (!filial_pk || !descricao || !vencimento || valor === undefined)
    return res.status(400).json({ erro: 'filial_pk, descricao, vencimento e valor obrigatórios' });
  try {
    const isoNow = new Date().toISOString();
    const payload = { filial_pk, descricao, fornecedor_pk: fornecedor_pk || null, valor, vencimento, categoria: categoria || null, status: status || 'pendente' };
    if (status === 'pago') {
      payload.conta_pk      = conta_pk || null;
      payload.data_pagamento = isoNow;
    }
    const { data, error } = await supabase.from('despesas').insert([payload]).select().single();
    if (error) throw error;

    if (status === 'pago' && conta_pk) {
      await supabase.from('movimentacoes_financeiras').insert([{
        conta_pk,
        tipo_movimento: 'saida',
        valor,
        descricao: 'Pagamento de Despesa: ' + descricao,
        data_movimento: isoNow,
      }]);
    }
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[Despesas/criar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── Atualizar despesa ─────────────────────────────────────────────────────────
router.put('/:pk', async (req, res) => {
  const { pk } = req.params;
  const { descricao, fornecedor_pk, valor, vencimento, categoria } = req.body;
  if (!descricao || !vencimento || valor === undefined)
    return res.status(400).json({ erro: 'descricao, vencimento e valor obrigatórios' });
  try {
    const { error } = await supabase.from('despesas').update({
      descricao, fornecedor_pk: fornecedor_pk || null, valor, vencimento, categoria: categoria || null,
    }).eq('pk', pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Despesas/atualizar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── Baixar despesa (confirmar pagamento) ──────────────────────────────────────
router.patch('/:pk/baixar', async (req, res) => {
  const { pk } = req.params;
  const { conta_pk, descricao, valor } = req.body;
  if (!conta_pk) return res.status(400).json({ erro: 'conta_pk obrigatório' });
  try {
    const isoNow = new Date().toISOString();
    const [{ error: em }, { error: ed }] = await Promise.all([
      supabase.from('movimentacoes_financeiras').insert([{
        conta_pk,
        tipo_movimento: 'saida',
        valor,
        descricao: 'Pagamento de Despesa: ' + (descricao || ''),
        data_movimento: isoNow,
      }]),
      supabase.from('despesas').update({ status: 'pago', conta_pk, data_pagamento: isoNow }).eq('pk', pk),
    ]);
    if (em) throw em;
    if (ed) throw ed;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Despesas/baixar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── Excluir despesa ───────────────────────────────────────────────────────────
router.delete('/:pk', async (req, res) => {
  const { pk } = req.params;
  try {
    const { error } = await supabase.from('despesas').delete().eq('pk', pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Despesas/excluir]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
