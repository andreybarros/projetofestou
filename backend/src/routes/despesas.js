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
      supabase.from('categorias_despesa').select('pk, nome, cor').eq('filial_pk', filial_pk).eq('ativo', true).order('nome'),
    ]);
    res.json({ ok: true, fornecedores: forn || [], contas: contas || [], categorias: cats || [] });
  } catch (e) {
    console.error('[Despesas/auxiliares]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── Categorias de despesa ─────────────────────────────────────────────────────
router.get('/categorias', async (req, res) => {
  const { filial_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const { data, error } = await supabase
      .from('categorias_despesa')
      .select('pk, nome, cor')
      .eq('filial_pk', filial_pk)
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (e) {
    console.error('[Despesas/categorias/listar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

router.post('/categorias', async (req, res) => {
  const { filial_pk, nome, cor } = req.body;
  if (!filial_pk || !nome?.trim()) return res.status(400).json({ erro: 'filial_pk e nome obrigatórios' });
  try {
    const { data, error } = await supabase
      .from('categorias_despesa')
      .insert([{ filial_pk, nome: nome.trim(), cor: cor || '#6366f1', ativo: true }])
      .select().single();
    if (error) throw error;
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[Despesas/categorias/criar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

router.put('/categorias/:pk', async (req, res) => {
  const { pk } = req.params;
  const { nome, cor } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'nome obrigatório' });
  try {
    const { error } = await supabase
      .from('categorias_despesa')
      .update({ nome: nome.trim(), cor: cor || '#6366f1' })
      .eq('pk', pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Despesas/categorias/atualizar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

router.delete('/categorias/:pk', async (req, res) => {
  const { pk } = req.params;
  try {
    const { error } = await supabase
      .from('categorias_despesa')
      .update({ ativo: false })
      .eq('pk', pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Despesas/categorias/excluir]', e.message);
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
      .select('*, fornecedores(nome), categorias_despesa(pk, nome, cor)')
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
  const { filial_pk, descricao, fornecedor_pk, valor, vencimento, categoria_pk, status, conta_pk } = req.body;
  if (!filial_pk || !descricao || !vencimento || valor === undefined)
    return res.status(400).json({ erro: 'filial_pk, descricao, vencimento e valor obrigatórios' });
  try {
    const isoNow = new Date().toISOString();
    const payload = { filial_pk, descricao, fornecedor_pk: fornecedor_pk || null, valor, vencimento, categoria_pk: categoria_pk || null, status: status || 'pendente' };
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
  const { descricao, fornecedor_pk, valor, vencimento, categoria_pk, status, conta_pk } = req.body;
  if (!descricao || !vencimento || valor === undefined)
    return res.status(400).json({ erro: 'descricao, vencimento e valor obrigatórios' });
  try {
    // Busca estado atual para saber se está sendo baixada agora
    const { data: atual } = await supabase.from('despesas').select('status, conta_pk').eq('pk', pk).single();

    const payload = {
      descricao, fornecedor_pk: fornecedor_pk || null, valor, vencimento, categoria_pk: categoria_pk || null,
    };

    const estaBaixando = status === 'pago' && atual?.status !== 'pago';
    if (status) payload.status = status;
    if (status === 'pago') {
      payload.conta_pk      = conta_pk || null;
      payload.data_pagamento = atual?.status === 'pago' ? undefined : new Date().toISOString();
    } else {
      payload.conta_pk      = null;
      payload.data_pagamento = null;
    }
    // Remove campo undefined
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    const { error } = await supabase.from('despesas').update(payload).eq('pk', pk);
    if (error) throw error;

    // Se está sendo baixada pela primeira vez via edição, registra movimentação
    if (estaBaixando && conta_pk) {
      await supabase.from('movimentacoes_financeiras').insert([{
        conta_pk,
        tipo_movimento: 'saida',
        valor,
        descricao:      'Pagamento de Despesa: ' + descricao,
        data_movimento: new Date().toISOString(),
      }]);
    }

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
