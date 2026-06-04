'use strict';

const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const supabase = require('../supabase');

// ── Admin: listar catálogos da filial ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });

    const { data, error } = await supabase
      .from('catalogos')
      .select('pk, nome, descricao, token, ativo, criado_em')
      .eq('filial_pk', filial_pk)
      .is('deletado_em', null)
      .order('criado_em', { ascending: false });
    if (error) throw error;

    // Conta itens e pedidos por catálogo
    const pks = (data || []).map(c => c.pk);
    const contagemItens    = {};
    const contagemPedidos  = {};
    if (pks.length) {
      const [{ data: itens }, { data: pedidos }] = await Promise.all([
        supabase.from('catalogo_itens').select('catalogo_pk').in('catalogo_pk', pks),
        supabase.from('pedidos_catalogo').select('catalogo_pk, status').in('catalogo_pk', pks),
      ]);
      (itens   || []).forEach(i => { contagemItens[i.catalogo_pk]   = (contagemItens[i.catalogo_pk]   || 0) + 1; });
      (pedidos || []).forEach(p => { contagemPedidos[p.catalogo_pk] = (contagemPedidos[p.catalogo_pk] || 0) + 1; });
    }

    res.json({
      ok: true,
      data: (data || []).map(c => ({
        ...c,
        qtd_itens:   contagemItens[c.pk]   || 0,
        qtd_pedidos: contagemPedidos[c.pk] || 0,
      })),
    });
  } catch (err) {
    console.error('[Catalogos/GET]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: criar catálogo ─────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { filial_pk, nome, descricao } = req.body;
    if (!filial_pk || !nome?.trim()) return res.status(400).json({ erro: 'filial_pk e nome obrigatórios' });

    const token = crypto.randomBytes(16).toString('hex');
    const { data, error } = await supabase
      .from('catalogos')
      .insert({ filial_pk, nome: nome.trim(), descricao: descricao?.trim() || null, token })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ ok: true, data });
  } catch (err) {
    console.error('[Catalogos/POST]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: atualizar catálogo ─────────────────────────────────
router.put('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;
    const { nome, descricao, ativo } = req.body;

    const payload = {};
    if (nome      !== undefined) payload.nome      = nome?.trim() || null;
    if (descricao !== undefined) payload.descricao = descricao?.trim() || null;
    if (ativo     !== undefined) payload.ativo     = ativo;

    const { error } = await supabase.from('catalogos').update(payload).eq('pk', pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/PUT]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: soft-delete catálogo ──────────────────────────────
router.delete('/:pk', async (req, res) => {
  try {
    const { error } = await supabase
      .from('catalogos')
      .update({ deletado_em: new Date().toISOString() })
      .eq('pk', req.params.pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/DELETE]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: buscar catálogo por pk ────────────────────────────
router.get('/:pk', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('catalogos')
      .select('pk, nome, descricao, token, ativo, criado_em')
      .eq('pk', req.params.pk)
      .is('deletado_em', null)
      .single();
    if (error || !data) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[Catalogos/GET/:pk]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: listar produtos do catálogo ────────────────────────
router.get('/:pk/produtos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('catalogo_itens')
      .select('produto_pk, produtos(pk, descricao, codigo, foto_url, valor_venda, saldo)')
      .eq('catalogo_pk', req.params.pk)
      .order('pk');
    if (error) throw error;
    res.json({ ok: true, data: (data || []).map(i => i.produtos).filter(Boolean) });
  } catch (err) {
    console.error('[Catalogos/GET/produtos]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: adicionar produto ao catálogo ─────────────────────
router.post('/:pk/produtos', async (req, res) => {
  try {
    const { produto_pk } = req.body;
    if (!produto_pk) return res.status(400).json({ erro: 'produto_pk obrigatório' });

    const { error } = await supabase
      .from('catalogo_itens')
      .insert({ catalogo_pk: req.params.pk, produto_pk });
    if (error) {
      if (error.code === '23505') return res.status(409).json({ erro: 'Produto já está no catálogo' });
      throw error;
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/POST/produto]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: remover produto do catálogo ───────────────────────
router.delete('/:pk/produtos/:produto_pk', async (req, res) => {
  try {
    const { error } = await supabase
      .from('catalogo_itens')
      .delete()
      .eq('catalogo_pk', req.params.pk)
      .eq('produto_pk', req.params.produto_pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/DELETE/produto]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: listar pedidos recebidos ──────────────────────────
router.get('/:pk/pedidos', async (req, res) => {
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, nome_cliente, telefone, email, observacao, status, valor_orcamento, obs_orcamento, pedido_token, data_evento, hora_evento, tipo_entrega, endereco_evento, criado_em')
      .eq('catalogo_pk', req.params.pk)
      .is('deletado_em', null)
      .order('criado_em', { ascending: false });
    if (error) throw error;

    const pedidoPks = (pedidos || []).map(p => p.pk);
    let itensMap = {};
    if (pedidoPks.length) {
      const { data: itens } = await supabase
        .from('pedidos_catalogo_itens')
        .select('pk, pedido_pk, produto_pk, nome_produto, quantidade, produto_substituto_pk, nome_produto_substituto')
        .in('pedido_pk', pedidoPks)
        .order('pk');

      const allProdPks = [...new Set(
        [...(itens||[]).map(i => i.produto_pk), ...(itens||[]).map(i => i.produto_substituto_pk)].filter(Boolean)
      )];
      let prodMap = {};
      if (allProdPks.length) {
        const { data: prods } = await supabase.from('produtos').select('pk, foto_url, saldo').in('pk', allProdPks);
        (prods || []).forEach(p => { prodMap[p.pk] = p; });
      }

      (itens || []).forEach(i => {
        if (!itensMap[i.pedido_pk]) itensMap[i.pedido_pk] = [];
        itensMap[i.pedido_pk].push({
          pk:                      i.pk,
          nome:                    i.nome_produto,
          quantidade:              i.quantidade,
          produto_pk:              i.produto_pk,
          foto_url:                prodMap[i.produto_pk]?.foto_url || null,
          saldo:                   prodMap[i.produto_pk]?.saldo ?? null,
          produto_substituto_pk:   i.produto_substituto_pk || null,
          nome_produto_substituto: i.nome_produto_substituto || null,
          foto_url_substituto:     i.produto_substituto_pk ? (prodMap[i.produto_substituto_pk]?.foto_url || null) : null,
        });
      });
    }

    res.json({
      ok: true,
      data: (pedidos || []).map(p => ({ ...p, itens: itensMap[p.pk] || [] })),
    });
  } catch (err) {
    console.error('[Catalogos/GET/pedidos]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: soft-delete pedido ────────────────────────────────
router.delete('/pedidos/:pk', async (req, res) => {
  try {
    const { error } = await supabase
      .from('pedidos_catalogo')
      .update({ deletado_em: new Date().toISOString(), status: 'cancelado' })
      .eq('pk', req.params.pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/DELETE/pedido]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: responder pedido com orçamento ────────────────────
router.patch('/pedidos/:pk/orcamento', async (req, res) => {
  try {
    const { valor_orcamento, obs_orcamento, status } = req.body;
    const payload = {
      status:          status          || 'orcamento_enviado',
      valor_orcamento: valor_orcamento ? parseFloat(valor_orcamento) : null,
      obs_orcamento:   obs_orcamento?.trim() || null,
    };
    const { error } = await supabase
      .from('pedidos_catalogo').update(payload).eq('pk', req.params.pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/PATCH/orcamento]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: substituir produto de um item do pedido ───────────
router.patch('/pedidos/itens/:pk/substituir', async (req, res) => {
  try {
    const { produto_substituto_pk } = req.body;

    let nome_produto_substituto = null;
    if (produto_substituto_pk) {
      const { data: prod } = await supabase
        .from('produtos').select('descricao').eq('pk', produto_substituto_pk).single();
      if (!prod) return res.status(404).json({ erro: 'Produto substituto não encontrado' });
      nome_produto_substituto = prod.descricao;
    }

    const { error } = await supabase
      .from('pedidos_catalogo_itens')
      .update({ produto_substituto_pk: produto_substituto_pk || null, nome_produto_substituto })
      .eq('pk', req.params.pk);
    if (error) throw error;

    res.json({ ok: true, nome_produto_substituto });
  } catch (err) {
    console.error('[Catalogos/PATCH/itens/substituir]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: marcar pedido como retirado ou devolvido ──────────
router.patch('/pedidos/:pk/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['retirado', 'devolvido'].includes(status))
      return res.status(400).json({ erro: 'Status inválido. Use retirado ou devolvido.' });

    const { data: pedido, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status, filial_pk')
      .eq('pk', req.params.pk)
      .single();
    if (errPed || !pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

    if (status === 'retirado' && pedido.status !== 'aprovado')
      return res.status(400).json({ erro: 'Pedido precisa estar aprovado para ser marcado como retirado' });
    if (status === 'devolvido' && pedido.status !== 'retirado')
      return res.status(400).json({ erro: 'Pedido precisa estar retirado para ser marcado como devolvido' });

    const agora = new Date().toISOString();
    const updatePayload = { status };
    if (status === 'retirado')  updatePayload.retirado_em  = agora;
    if (status === 'devolvido') updatePayload.devolvido_em = agora;

    const { error: errUpd } = await supabase
      .from('pedidos_catalogo').update(updatePayload).eq('pk', req.params.pk);
    if (errUpd) throw errUpd;

    // Busca itens com produto_pk, nome e quantidade
    const { data: itens } = await supabase
      .from('pedidos_catalogo_itens')
      .select('produto_pk, nome_produto, quantidade')
      .eq('pedido_pk', req.params.pk);

    const itensFiltrados = (itens || []).filter(i => i.produto_pk);
    if (!itensFiltrados.length) return res.json({ ok: true });

    // Lê saldos atuais antes do ajuste
    const prodPks = itensFiltrados.map(i => i.produto_pk);
    const { data: produtosAtual } = await supabase
      .from('produtos').select('pk, saldo, descricao').in('pk', prodPks);
    const saldoMap = {};
    (produtosAtual || []).forEach(p => { saldoMap[p.pk] = { saldo: p.saldo ?? 0, descricao: p.descricao }; });

    // Ajusta saldo de cada produto e monta auditoria
    const delta       = status === 'retirado' ? -1 : 1;
    const observacao  = status === 'retirado' ? 'Pedido retirado' : 'Pedido devolvido';
    const auditoriaRows = [];

    for (const it of itensFiltrados) {
      const saldoAntes = saldoMap[it.produto_pk]?.saldo ?? 0;
      await supabase.rpc('ajustar_saldo_produto', { p_pk: it.produto_pk, p_delta: delta * it.quantidade });
      auditoriaRows.push({
        filial_pk:          pedido.filial_pk || null,
        produto_pk:         it.produto_pk,
        pedido_catalogo_pk: pedido.pk,
        nome:               saldoMap[it.produto_pk]?.descricao || it.nome_produto || null,
        saldo_antes:        saldoAntes,
        qtd_debitada:       delta * it.quantidade,
        saldo_apos:         saldoAntes + delta * it.quantidade,
        observacao,
      });
    }

    if (auditoriaRows.length) {
      await supabase.from('auditoria_estoque').insert(auditoriaRows);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/PATCH/status]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── PUBLIC: buscar catálogo pelo token (sem auth) ────────────
router.get('/public/:token', async (req, res) => {
  try {
    const { data: catalogo, error } = await supabase
      .from('catalogos')
      .select('pk, nome, descricao, ativo')
      .eq('token', req.params.token)
      .single();

    if (error || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    if (!catalogo.ativo)    return res.status(410).json({ erro: 'Este catálogo não está mais disponível' });

    const { data: itens } = await supabase
      .from('catalogo_itens')
      .select('produtos(pk, descricao, foto_url, codigo)')
      .eq('catalogo_pk', catalogo.pk)
      .order('pk');

    const produtos = (itens || []).map(i => i.produtos).filter(Boolean);
    res.json({ ok: true, catalogo: { nome: catalogo.nome, descricao: catalogo.descricao }, produtos });
  } catch (err) {
    console.error('[Catalogos/PUBLIC/GET]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── PUBLIC: cliente envia pedido de interesse (sem auth) ─────
router.post('/public/:token/pedido', async (req, res) => {
  try {
    const { nome_cliente, telefone, email, observacao, itens } = req.body;
    if (!nome_cliente?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
    if (!Array.isArray(itens) || !itens.length) return res.status(400).json({ erro: 'Selecione ao menos um produto' });

    const { data: catalogo, error: errCat } = await supabase
      .from('catalogos')
      .select('pk, filial_pk, ativo')
      .eq('token', req.params.token)
      .single();
    if (errCat || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    if (!catalogo.ativo)     return res.status(410).json({ erro: 'Catálogo indisponível' });

    const { data: pedido, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .insert({
        catalogo_pk:  catalogo.pk,
        filial_pk:    catalogo.filial_pk,
        nome_cliente: nome_cliente.trim(),
        telefone:     telefone?.trim() || null,
        email:        email?.trim()    || null,
        observacao:   observacao?.trim() || null,
        status:       'aguardando',
      })
      .select('pk')
      .single();
    if (errPed) throw errPed;

    // Busca nomes dos produtos para snapshot
    const prodPks = itens.map(i => i.produto_pk).filter(Boolean);
    const nomesMap = {};
    if (prodPks.length) {
      const { data: prods } = await supabase.from('produtos').select('pk, descricao').in('pk', prodPks);
      (prods || []).forEach(p => { nomesMap[p.pk] = p.descricao; });
    }

    const rows = itens.map(i => ({
      pedido_pk:   pedido.pk,
      produto_pk:  i.produto_pk,
      nome_produto: nomesMap[i.produto_pk] || i.nome || null,
      quantidade:  parseInt(i.quantidade || 1, 10),
    }));

    const { error: errItens } = await supabase.from('pedidos_catalogo_itens').insert(rows);
    if (errItens) throw errItens;

    res.status(201).json({ ok: true, pedido_pk: pedido.pk });
  } catch (err) {
    console.error('[Catalogos/PUBLIC/POST]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
