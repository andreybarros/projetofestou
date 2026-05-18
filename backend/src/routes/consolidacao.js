const express  = require('express');
const supabase = require('../supabase');
const router   = express.Router();

// ── Regras de prazo por forma de pagamento ────────────────────────────────
function proximoDiaUtil(base, dias) {
  const d = new Date(base);
  let n = 0;
  while (n < dias) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return d;
}

function dataPrevisao(forma, base) {
  const f = (forma || '').toLowerCase();
  const d = new Date(base);
  if (f === 'dinheiro' || f === 'pix') return d.toISOString().slice(0, 10);
  if (f === 'debito'   || f === 'credito') return proximoDiaUtil(d, 1).toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

// ── 1. Auxiliares (contas + formas) ───────────────────────────────────────
router.get('/auxiliares', async (req, res) => {
  const { filial_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const [{ data: contas }, { data: formas }] = await Promise.all([
      supabase.from('contas_bancarias').select('pk, nome').eq('filial_pk', filial_pk).eq('ativo', true).order('nome'),
      supabase.from('formas_pagamento').select('pk, forma, label').eq('filial_pk', filial_pk).eq('ativo', true).order('ordem'),
    ]);
    res.json({ ok: true, contas: contas || [], formas: formas || [] });
  } catch (e) {
    console.error('[Consolidacao/auxiliares]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 2. Pagamentos pendentes de confirmação ────────────────────────────────
router.get('/pendentes', async (req, res) => {
  const { filial_pk, de, ate, forma } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const dataIni = (de  || new Date().toISOString().slice(0, 8) + '01') + 'T00:00:00';
    const dataFim = (ate || new Date().toISOString().slice(0, 10))        + 'T23:59:59';

    let q = supabase
      .from('pagamentos_venda')
      .select('pk, venda_pk, forma, valor, vendas!inner(pk, numero, criado_em, cliente_pk, filial_pk)')
      .eq('vendas.filial_pk', parseInt(filial_pk))
      .eq('vendas.ativo', true)
      .gte('vendas.criado_em', dataIni)
      .lte('vendas.criado_em', dataFim);

    if (forma) q = q.eq('forma', forma);

    const { data: pagamentos, error } = await q;
    if (error) throw error;

    const lista = pagamentos || [];

    // Clientes
    const clientePks = [...new Set(lista.map(p => p.vendas?.cliente_pk).filter(Boolean))];
    const clienteMap = {};
    if (clientePks.length) {
      const { data: clis } = await supabase.from('clientes').select('pk, nome').in('pk', clientePks);
      (clis || []).forEach(c => { clienteMap[c.pk] = c.nome; });
    }

    // Já confirmados
    const pks = lista.map(p => p.pk);
    let jaConfirmados = new Set();
    if (pks.length) {
      const { data: recExist } = await supabase.from('recebimentos').select('pagamento_pk').in('pagamento_pk', pks);
      jaConfirmados = new Set((recExist || []).map(r => r.pagamento_pk));
    }

    const pendentes = lista
      .filter(p => !jaConfirmados.has(p.pk))
      .map(p => {
        const v  = p.vendas;
        const dt = v?.criado_em ? new Date(v.criado_em) : new Date();
        return {
          pk:            p.pk,
          venda_pk:      p.venda_pk,
          venda_numero:  v?.numero,
          venda_cliente: v?.cliente_pk ? (clienteMap[v.cliente_pk] || null) : null,
          venda_data:    dt.toISOString().slice(0, 10),
          venda_hora:    dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Manaus' }),
          forma:         p.forma,
          valor:         p.valor,
          data_prevista: dataPrevisao(p.forma, dt),
        };
      })
      .sort((a, b) => b.venda_data.localeCompare(a.venda_data));

    res.json({ ok: true, data: pendentes });
  } catch (e) {
    console.error('[Consolidacao/pendentes]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 3. Recebimentos lançados ──────────────────────────────────────────────
router.get('/recebimentos', async (req, res) => {
  const { filial_pk, de, ate, forma } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const dataIni = de  || new Date().toISOString().slice(0, 8) + '01';
    const dataFim = ate || new Date().toISOString().slice(0, 10);

    let q = supabase
      .from('recebimentos')
      .select('*')
      .eq('filial_pk', parseInt(filial_pk))
      .gte('data_recebimento', dataIni)
      .lte('data_recebimento', dataFim)
      .order('data_recebimento', { ascending: false });

    if (forma) q = q.eq('forma', forma);

    const { data: items, error } = await q;
    if (error) throw error;

    const lista    = items || [];
    const vendaPks = [...new Set(lista.filter(r => r.venda_pk).map(r => r.venda_pk))];

    if (vendaPks.length) {
      const { data: vendas } = await supabase
        .from('vendas').select('pk, numero, cliente_pk').eq('ativo', true).in('pk', vendaPks);

      const clientePks = [...new Set((vendas || []).map(v => v.cliente_pk).filter(Boolean))];
      const clienteMap = {};
      if (clientePks.length) {
        const { data: clis } = await supabase.from('clientes').select('pk, nome').in('pk', clientePks);
        (clis || []).forEach(c => { clienteMap[c.pk] = c.nome; });
      }

      const vm = {};
      (vendas || []).forEach(v => { vm[v.pk] = v; });
      lista.forEach(r => {
        if (r.venda_pk && vm[r.venda_pk]) {
          r.venda_numero  = vm[r.venda_pk].numero;
          r.venda_cliente = vm[r.venda_pk].cliente_pk ? (clienteMap[vm[r.venda_pk].cliente_pk] || null) : null;
        }
      });
    }

    res.json({ ok: true, data: lista });
  } catch (e) {
    console.error('[Consolidacao/recebimentos]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 4. Confirmar pagamento pendente ───────────────────────────────────────
router.post('/confirmar', async (req, res) => {
  const { filial_pk, pagamento_pk, venda_pk, conta_pk, data_recebimento, valor, forma, descricao } = req.body;
  if (!filial_pk || !pagamento_pk || !data_recebimento || valor === undefined)
    return res.status(400).json({ erro: 'filial_pk, pagamento_pk, data_recebimento e valor obrigatórios' });
  try {
    const { error } = await supabase.from('recebimentos').insert({
      filial_pk:        parseInt(filial_pk),
      pagamento_pk,
      venda_pk:         venda_pk || null,
      conta_pk:         conta_pk || null,
      data_recebimento,
      valor,
      forma:            forma || null,
      descricao:        descricao || null,
    });
    if (error) throw error;

    if (conta_pk) {
      await supabase.rpc('ajustar_saldo_conta', { p_conta_pk: conta_pk, p_delta: valor });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[Consolidacao/confirmar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 5. Lançamento avulso ──────────────────────────────────────────────────
router.post('/avulso', async (req, res) => {
  const { filial_pk, conta_pk, data_recebimento, valor, forma, descricao } = req.body;
  if (!filial_pk || !data_recebimento || valor === undefined)
    return res.status(400).json({ erro: 'filial_pk, data_recebimento e valor obrigatórios' });
  try {
    const { error } = await supabase.from('recebimentos').insert({
      filial_pk:        parseInt(filial_pk),
      pagamento_pk:     null,
      venda_pk:         null,
      conta_pk:         conta_pk || null,
      data_recebimento,
      valor:            parseFloat(valor),
      forma:            forma || null,
      descricao:        descricao || null,
    });
    if (error) throw error;

    if (conta_pk) {
      await supabase.rpc('ajustar_saldo_conta', { p_conta_pk: conta_pk, p_delta: parseFloat(valor) });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[Consolidacao/avulso]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 6. Excluir recebimento ────────────────────────────────────────────────
router.delete('/:pk', async (req, res) => {
  const { pk } = req.params;
  try {
    const { data: rec, error: erGet } = await supabase
      .from('recebimentos').select('pk, conta_pk, valor').eq('pk', parseInt(pk)).single();
    if (erGet || !rec) return res.status(404).json({ erro: 'Recebimento não encontrado' });

    const { error } = await supabase.from('recebimentos').delete().eq('pk', parseInt(pk));
    if (error) throw error;

    if (rec.conta_pk) {
      await supabase.rpc('ajustar_saldo_conta', { p_conta_pk: rec.conta_pk, p_delta: -rec.valor });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[Consolidacao/excluir]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
