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
  const { filial_pk, conta_pk, de, ate } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const hoje    = new Date().toLocaleString('en-CA', { timeZone: 'America/Manaus' }).slice(0, 10);
    const dataIni = de  || hoje.slice(0, 8) + '01';
    const dataFim = ate || hoje;

    // Resolve contas da filial
    const { data: contasFilial, error: ce } = await supabase
      .from('contas_bancarias').select('pk, nome').eq('filial_pk', filial_pk).eq('ativo', true);
    if (ce) throw ce;
    const contaMap  = Object.fromEntries((contasFilial || []).map(c => [c.pk, c.nome]));
    const contaPks  = (contasFilial || []).map(c => c.pk);
    const filtroContaPks = conta_pk ? [parseInt(conta_pk)] : contaPks;

    if (!filtroContaPks.length) return res.json({ ok: true, data: [] });

    // 1. Formas de pagamento — mapa forma → label para exibir nome amigável
    const { data: formasPag } = await supabase
      .from('formas_pagamento').select('forma, label').eq('filial_pk', filial_pk);
    const formaLabelMap = Object.fromEntries((formasPag || []).map(f => [f.forma, f.label]));

    // 2. Movimentações financeiras (apenas entradas/saídas que NÃO sejam pagamentos de despesa,
    //    pois despesas virão da tabela despesas para preservar categoria)
    const { data: movs, error: em } = await supabase
      .from('movimentacoes_financeiras')
      .select('pk, conta_pk, tipo_movimento, valor, descricao, data_movimento, venda_pk')
      .in('conta_pk', filtroContaPks)
      .gte('data_movimento', dataIni + 'T00:00:00')
      .lte('data_movimento', dataFim + 'T23:59:59');
    if (em) throw em;

    const movsNoPeriodo = (movs || []).filter(m => {
      const dataManaus = new Date(m.data_movimento).toLocaleString('en-CA', { timeZone: 'America/Manaus' }).slice(0, 10);
      // Exclui pagamentos de despesa — eles vêm da tabela despesas com categoria preservada
      return dataManaus >= dataIni && dataManaus <= dataFim
        && !m.descricao?.startsWith('Pagamento de Despesa:');
    });

    // 3. Despesas (pagas e pendentes) — TODAS trazem categoria
    let qDesp = supabase
      .from('despesas')
      .select('pk, descricao, valor, conta_pk, status, vencimento, data_pagamento, categoria')
      .eq('filial_pk', filial_pk);
    if (conta_pk) qDesp = qDesp.or(`conta_pk.eq.${conta_pk},conta_pk.is.null`);
    const { data: todasDespesas, error: ed } = await qDesp;
    if (ed) throw ed;

    const linhasDespesas = (todasDespesas || [])
      .map(d => {
        const dataRef = d.status === 'pago' && d.data_pagamento
          ? new Date(d.data_pagamento).toLocaleString('en-CA', { timeZone: 'America/Manaus' }).slice(0, 10)
          : d.vencimento;
        return { dataRef, d };
      })
      .filter(({ dataRef }) => dataRef >= dataIni && dataRef <= dataFim)
      .map(({ dataRef, d }) => ({
        pk:               `desp-${d.pk}`,
        conta_pk:         d.conta_pk,
        contas_bancarias: d.conta_pk ? { nome: contaMap[d.conta_pk] || '—' } : null,
        tipo_movimento:   d.status === 'pago' ? 'saida' : 'previsto',
        valor:            d.valor,
        descricao:        d.descricao,
        categoria:        d.categoria || null,
        data_movimento:   dataRef,
        _origem:          'despesa',
      }));

    // 4. Recebimentos da consolidação (entradas) com nome da forma de pagamento
    let qRec = supabase
      .from('recebimentos')
      .select('pk, conta_pk, data_recebimento, valor, forma, descricao, venda_pk')
      .eq('filial_pk', filial_pk)
      .eq('ativo', true)
      .gte('data_recebimento', dataIni)
      .lte('data_recebimento', dataFim);
    if (conta_pk) qRec = qRec.eq('conta_pk', parseInt(conta_pk));
    const { data: recebimentos, error: er } = await qRec;
    if (er) throw er;

    // Busca números das vendas vinculadas
    const vendaPksRec = [...new Set((recebimentos || []).filter(r => r.venda_pk).map(r => r.venda_pk))];
    const vendaNumMap = {};
    if (vendaPksRec.length) {
      const { data: vds } = await supabase.from('vendas').select('pk, numero').in('pk', vendaPksRec);
      (vds || []).forEach(v => { vendaNumMap[v.pk] = v.numero; });
    }

    const linhasRecebimentos = (recebimentos || [])
      .filter(r => filtroContaPks.includes(r.conta_pk) || !r.conta_pk)
      .map(r => ({
        pk:               `rec-${r.pk}`,
        conta_pk:         r.conta_pk,
        contas_bancarias: r.conta_pk ? { nome: contaMap[r.conta_pk] || '—' } : null,
        tipo_movimento:   'entrada',
        valor:            r.valor,
        descricao:        r.descricao || (r.venda_pk ? `Recebimento Venda #${vendaNumMap[r.venda_pk] || r.venda_pk}` : 'Recebimento avulso'),
        // Exibe o NOME da forma de pagamento, não o identificador interno
        categoria:        r.forma ? (formaLabelMap[r.forma] || r.forma) : null,
        data_movimento:   r.data_recebimento,
        _origem:          'recebimento',
      }));

    const lista = [
      ...movsNoPeriodo.map(m => ({ ...m, contas_bancarias: { nome: contaMap[m.conta_pk] || '—' }, _origem: 'mov', categoria: null })),
      ...linhasRecebimentos,
      ...linhasDespesas,
    ].sort((a, b) => new Date(b.data_movimento) - new Date(a.data_movimento));

    res.json({ ok: true, data: lista });
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
