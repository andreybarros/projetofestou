'use strict';

const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

// ── GET / — listar pedidos da filial ────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { filial_pk, status } = req.query;
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });

    let q = supabase
      .from('pedidos_compra')
      .select('pk, numero, status, observacao, nf_numero, nf_fornecedor, nf_data_entrada, nf_valor, criado_em, fornecedores(pk, nome)')
      .eq('filial_pk', filial_pk)
      .eq('ativo', true)
      .order('criado_em', { ascending: false });

    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;

    const pedidos = data || [];
    const pks = pedidos.map(p => p.pk);

    let contagemMap = {};
    if (pks.length) {
      const { data: itens } = await supabase
        .from('pedidos_compra_itens')
        .select('pedido_pk')
        .in('pedido_pk', pks);
      (itens || []).forEach(i => {
        contagemMap[i.pedido_pk] = (contagemMap[i.pedido_pk] || 0) + 1;
      });
    }

    return res.json({
      ok: true,
      data: pedidos.map(p => ({ ...p, qtd_itens: contagemMap[p.pk] || 0 })),
    });
  } catch (err) {
    console.error('[PedidosCompra/GET]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── GET /:pk — detalhes com itens ──────────────────────────────
router.get('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;

    const { data: pedido, error } = await supabase
      .from('pedidos_compra')
      .select('*, fornecedores(pk, nome, cnpj_cpf)')
      .eq('pk', pk)
      .single();
    if (error) throw error;

    const { data: itens } = await supabase
      .from('pedidos_compra_itens')
      .select('pk, quantidade, preco_unitario, produtos(pk, descricao, codigo, saldo, unidade)')
      .eq('pedido_pk', pk)
      .order('pk');

    return res.json({ ok: true, data: { ...pedido, itens: itens || [] } });
  } catch (err) {
    console.error('[PedidosCompra/GET/:pk]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── POST / — criar pedido ───────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { filial_pk, fornecedor_pk, observacao, itens } = req.body;
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });

    const { data: numero } = await supabase.rpc('proximo_numero_pedido_compra', { p_filial_pk: filial_pk });

    const { data: pedido, error } = await supabase
      .from('pedidos_compra')
      .insert([{
        filial_pk,
        numero,
        fornecedor_pk: fornecedor_pk || null,
        observacao:    observacao    || null,
        status:        'em_andamento',
      }])
      .select()
      .single();
    if (error) throw error;

    if (itens?.length) {
      const rows = itens.map(it => ({
        pedido_pk:      pedido.pk,
        produto_pk:     it.produto_pk,
        quantidade:     parseFloat(it.quantidade     || 0),
        preco_unitario: parseFloat(it.preco_unitario || 0),
      }));
      const { error: errItens } = await supabase.from('pedidos_compra_itens').insert(rows);
      if (errItens) throw errItens;
    }

    return res.json({ ok: true, data: pedido });
  } catch (err) {
    console.error('[PedidosCompra/POST]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── PUT /:pk — editar pedido + itens ───────────────────────────
router.put('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;
    const { fornecedor_pk, observacao, status, itens,
            nf_numero, nf_serie, nf_chave, nf_fornecedor, nf_data_entrada, nf_valor } = req.body;

    const payload = {
      fornecedor_pk: fornecedor_pk || null,
      observacao:    observacao    || null,
      status:        status        || 'em_andamento',
    };

    if (status === 'finalizado') {
      payload.nf_numero      = nf_numero      || null;
      payload.nf_serie       = nf_serie       || null;
      payload.nf_chave       = nf_chave       || null;
      payload.nf_fornecedor  = nf_fornecedor  || null;
      payload.nf_data_entrada = nf_data_entrada || null;
      payload.nf_valor       = nf_valor ? parseFloat(nf_valor) : null;
    }

    const { data: pedido, error } = await supabase
      .from('pedidos_compra')
      .update(payload)
      .eq('pk', pk)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('pedidos_compra_itens').delete().eq('pedido_pk', pk);

    if (itens?.length) {
      const rows = itens.map(it => ({
        pedido_pk:      Number(pk),
        produto_pk:     it.produto_pk,
        quantidade:     parseFloat(it.quantidade     || 0),
        preco_unitario: parseFloat(it.preco_unitario || 0),
      }));
      const { error: errItens } = await supabase.from('pedidos_compra_itens').insert(rows);
      if (errItens) throw errItens;
    }

    return res.json({ ok: true, data: pedido });
  } catch (err) {
    console.error('[PedidosCompra/PUT]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── PATCH /:pk/status — atualizar status + dados de NF ─────────
router.patch('/:pk/status', async (req, res) => {
  try {
    const { pk } = req.params;
    const { status, nf_numero, nf_serie, nf_chave, nf_fornecedor, nf_data_entrada, nf_valor } = req.body;
    if (!status) return res.status(400).json({ erro: 'status obrigatório' });

    const payload = { status };
    if (nf_numero)      payload.nf_numero      = nf_numero;
    if (nf_serie)       payload.nf_serie       = nf_serie;
    if (nf_chave)       payload.nf_chave       = nf_chave;
    if (nf_fornecedor)  payload.nf_fornecedor  = nf_fornecedor;
    if (nf_data_entrada) payload.nf_data_entrada = nf_data_entrada;
    if (nf_valor)       payload.nf_valor       = parseFloat(nf_valor);

    const { error } = await supabase.from('pedidos_compra').update(payload).eq('pk', pk);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PedidosCompra/PATCH/status]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── DELETE /:pk — soft delete ───────────────────────────────────
router.delete('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;
    const { error } = await supabase.from('pedidos_compra').update({ ativo: false }).eq('pk', pk);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PedidosCompra/DELETE]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
