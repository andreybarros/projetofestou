'use strict';

const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

async function insertItens(rows) {
  const { error } = await supabase.from('pedidos_compra_itens').insert(rows);
  if (error) {
    // fallback sem descricao_livre caso a coluna ainda não exista no banco
    const rowsSem = rows.map(({ descricao_livre, ...r }) => r);
    const { error: err2 } = await supabase.from('pedidos_compra_itens').insert(rowsSem);
    if (err2) throw err2;
  }
}

// ── GET / — listar pedidos da filial ────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { filial_pk, status } = req.query;
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });

    let q = supabase
      .from('pedidos_compra')
      .select('pk, numero, status, observacao, criado_em, fornecedores(pk, nome)')
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

    // Busca itens sem FK join para evitar falha caso constraint não exista
    let { data: itens, error: errItens } = await supabase
      .from('pedidos_compra_itens')
      .select('pk, produto_pk, quantidade, preco_unitario, descricao_livre')
      .eq('pedido_pk', pk)
      .order('pk');

    if (errItens) {
      console.error('[PedidosCompra/GET/:pk/itens]', errItens.message);
      // descricao_livre pode não existir ainda no banco
      const res2 = await supabase
        .from('pedidos_compra_itens')
        .select('pk, produto_pk, quantidade, preco_unitario')
        .eq('pedido_pk', pk)
        .order('pk');
      if (res2.error) console.error('[PedidosCompra/GET/:pk/itens-fallback]', res2.error.message);
      itens = res2.data;
    }

    // Busca dados dos produtos em query separada
    const prodPks = [...new Set((itens || []).map(i => i.produto_pk).filter(Boolean))];
    let produtosMap = {};
    if (prodPks.length) {
      const { data: prods } = await supabase
        .from('produtos')
        .select('pk, descricao, codigo, saldo')
        .in('pk', prodPks);
      (prods || []).forEach(p => { produtosMap[p.pk] = p; });
    }

    const itensFormatados = (itens || []).map(it => ({
      ...it,
      produtos: produtosMap[it.produto_pk] || null,
    }));

    return res.json({ ok: true, data: { ...pedido, itens: itensFormatados } });
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
        pedido_pk:       pedido.pk,
        produto_pk:      it.produto_pk      || null,
        descricao_livre: it.descricao_livre || null,
        quantidade:      parseFloat(it.quantidade     || 0),
        preco_unitario:  parseFloat(it.preco_unitario || 0),
      }));
      await insertItens(rows);
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
        pedido_pk:       Number(pk),
        produto_pk:      it.produto_pk      || null,
        descricao_livre: it.descricao_livre || null,
        quantidade:      parseFloat(it.quantidade     || 0),
        preco_unitario:  parseFloat(it.preco_unitario || 0),
      }));
      await insertItens(rows);
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

// ── POST /:pk/entrada — dar entrada no estoque ─────────────────
router.post('/:pk/entrada', async (req, res) => {
  try {
    const { pk } = req.params;
    const { modo, nf_numero, nf_serie, nf_chave, nf_fornecedor, nf_data_entrada, nf_valor } = req.body;

    // 1. Busca TODOS os itens (incluindo avulsos sem produto_pk)
    const { data: todosItens, error: errItens } = await supabase
      .from('pedidos_compra_itens')
      .select('pk, produto_pk, descricao_livre, quantidade')
      .eq('pedido_pk', pk)
      .order('pk');
    if (errItens) throw errItens;

    if (!todosItens || todosItens.length === 0) {
      return res.status(400).json({ erro: 'O pedido não possui itens.' });
    }

    // 2. Bloqueia se qualquer item não tiver produto vinculado
    const semProduto = todosItens.filter(it => !it.produto_pk);
    if (semProduto.length > 0) {
      return res.status(400).json({
        erro: `${semProduto.length} item(s) não estão vinculados a um produto cadastrado. Edite o pedido e vincule todos os itens antes de dar entrada.`,
        itens_sem_produto: semProduto.map(it => ({
          pk: it.pk,
          descricao_livre: it.descricao_livre || 'Item avulso',
        })),
      });
    }

    // 3. Busca pedido para obter número e filial
    const { data: pedido } = await supabase
      .from('pedidos_compra')
      .select('numero, filial_pk')
      .eq('pk', pk)
      .single();

    // 4. Busca saldo atual de todos os produtos antes de ajustar
    const prodPks = todosItens.map(it => it.produto_pk);
    const { data: produtosAntes } = await supabase
      .from('produtos')
      .select('pk, descricao, saldo')
      .in('pk', prodPks);
    const saldoMap = {};
    const nomeMap  = {};
    (produtosAntes || []).forEach(p => {
      saldoMap[p.pk] = parseFloat(p.saldo || 0);
      nomeMap[p.pk]  = p.descricao || String(p.pk);
    });

    // 5. Atualiza saldo de todos os produtos via RPC atômica
    let atualizados = 0;
    const auditoriaRows = [];
    for (const it of todosItens) {
      const qtd        = parseFloat(it.quantidade || 0);
      const saldoAntes = saldoMap[it.produto_pk] ?? 0;
      const { error: errUpd } = await supabase.rpc('ajustar_saldo_produto', {
        p_pk:                it.produto_pk,
        p_delta:             qtd,
        p_permitir_negativo: true,
      });
      if (!errUpd) {
        atualizados++;
        auditoriaRows.push({
          filial_pk:    pedido?.filial_pk || null,
          produto_pk:   it.produto_pk,
          nome:         nomeMap[it.produto_pk] || String(it.produto_pk),
          saldo_antes:  saldoAntes,
          qtd_debitada: -qtd, // negativo = entrada (devolução de estoque)
          saldo_apos:   saldoAntes + qtd,
          observacao:   `Entrada de pedido de compra #${pedido?.numero || pk}`,
        });
      } else {
        console.error(`[PedidosCompra/entrada] Erro ao ajustar produto ${it.produto_pk}:`, errUpd.message);
      }
    }

    // 6. Grava auditoria de estoque
    if (auditoriaRows.length) {
      const { error: errAudit } = await supabase.from('auditoria_estoque').insert(auditoriaRows);
      if (errAudit) console.error('[PedidosCompra/entrada] Erro ao gravar auditoria:', errAudit.message);
    }

    // 4. Atualiza status do pedido
    const novoStatus = modo === 'com_nf' ? 'finalizado' : 'comprado';
    const payload = { status: novoStatus };
    if (modo === 'com_nf') {
      if (nf_numero)       payload.nf_numero       = nf_numero;
      if (nf_serie)        payload.nf_serie        = nf_serie;
      if (nf_chave)        payload.nf_chave        = nf_chave;
      if (nf_fornecedor)   payload.nf_fornecedor   = nf_fornecedor;
      if (nf_data_entrada) payload.nf_data_entrada = nf_data_entrada;
      if (nf_valor)        payload.nf_valor        = parseFloat(nf_valor);
    }

    const { error: errPed } = await supabase.from('pedidos_compra').update(payload).eq('pk', pk);
    if (errPed) throw errPed;

    return res.json({ ok: true, qtd_itens: atualizados });
  } catch (err) {
    console.error('[PedidosCompra/POST/entrada]', err.message);
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
