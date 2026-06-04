'use strict';

const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const supabase = require('../supabase');

// GET /api/catalogo-publico/:token — catálogo público sem auth
router.get('/:token', async (req, res) => {
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
      .select('produtos(pk, descricao, foto_url, codigo, saldo)')
      .eq('catalogo_pk', catalogo.pk)
      .order('pk');

    const produtos = (itens || []).map(i => i.produtos).filter(Boolean);
    res.json({ ok: true, catalogo: { nome: catalogo.nome, descricao: catalogo.descricao }, produtos });
  } catch (err) {
    console.error('[CatalogoPublico/GET]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/catalogo-publico/:token/pedido — cliente envia pedido sem auth
router.post('/:token/pedido', async (req, res) => {
  try {
    const {
      nome_cliente, telefone, email, observacao, itens,
      data_evento, hora_evento, tipo_entrega, endereco_evento,
    } = req.body;

    if (!nome_cliente?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
    if (!Array.isArray(itens) || !itens.length) return res.status(400).json({ erro: 'Selecione ao menos um produto' });
    if (tipo_entrega === 'entrega' && !endereco_evento?.trim()) {
      return res.status(400).json({ erro: 'Informe o endereço do evento para entrega' });
    }

    const { data: catalogo, error: errCat } = await supabase
      .from('catalogos')
      .select('pk, filial_pk, ativo')
      .eq('token', req.params.token)
      .single();
    if (errCat || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    if (!catalogo.ativo)     return res.status(410).json({ erro: 'Catálogo indisponível' });

    const pedido_token = crypto.randomBytes(16).toString('hex');

    const { data: pedido, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .insert({
        catalogo_pk:     catalogo.pk,
        filial_pk:       catalogo.filial_pk,
        nome_cliente:    nome_cliente.trim(),
        telefone:        telefone?.trim()        || null,
        email:           email?.trim()           || null,
        observacao:      observacao?.trim()       || null,
        data_evento:     data_evento             || null,
        hora_evento:     hora_evento             || null,
        tipo_entrega:    tipo_entrega            || 'retirada',
        endereco_evento: endereco_evento?.trim() || null,
        pedido_token,
        status:          'aguardando',
      })
      .select('pk')
      .single();
    if (errPed) throw errPed;

    const prodPks = itens.map(i => i.produto_pk).filter(Boolean);
    const nomesMap = {};
    if (prodPks.length) {
      const { data: prods } = await supabase.from('produtos').select('pk, descricao').in('pk', prodPks);
      (prods || []).forEach(p => { nomesMap[p.pk] = p.descricao; });
    }

    const rows = itens.map(i => ({
      pedido_pk:    pedido.pk,
      produto_pk:   i.produto_pk,
      nome_produto: nomesMap[i.produto_pk] || i.nome || null,
      quantidade:   parseInt(i.quantidade || 1, 10),
    }));

    const { error: errItens } = await supabase.from('pedidos_catalogo_itens').insert(rows);
    if (errItens) throw errItens;

    res.status(201).json({ ok: true, pedido_pk: pedido.pk, pedido_token });
  } catch (err) {
    console.error('[CatalogoPublico/POST/pedido]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/orcamento-publico/:token — cliente visualiza orçamento sem auth
router.get('/orcamento/:token', async (req, res) => {
  try {
    const { data: pedido, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, nome_cliente, telefone, data_evento, hora_evento, tipo_entrega, endereco_evento, observacao, status, valor_orcamento, obs_orcamento, criado_em')
      .eq('pedido_token', req.params.token)
      .single();

    if (error || !pedido) return res.status(404).json({ erro: 'Orçamento não encontrado' });

    const { data: itens } = await supabase
      .from('pedidos_catalogo_itens')
      .select('nome_produto, quantidade')
      .eq('pedido_pk', pedido.pk)
      .order('pk');

    res.json({ ok: true, pedido: { ...pedido, itens: itens || [] } });
  } catch (err) {
    console.error('[OrcamentoPublico/GET]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/orcamento-publico/:token/aprovar — cliente aprova orçamento sem auth
router.post('/orcamento/:token/aprovar', async (req, res) => {
  try {
    const { data: pedido, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status, valor_orcamento')
      .eq('pedido_token', req.params.token)
      .single();

    if (error || !pedido) return res.status(404).json({ erro: 'Orçamento não encontrado' });
    if (!pedido.valor_orcamento) return res.status(400).json({ erro: 'O orçamento ainda não foi enviado' });
    if (pedido.status === 'aprovado') return res.status(409).json({ erro: 'Orçamento já aprovado' });

    const { error: errUpd } = await supabase
      .from('pedidos_catalogo')
      .update({ status: 'aprovado' })
      .eq('pk', pedido.pk);
    if (errUpd) throw errUpd;

    res.json({ ok: true });
  } catch (err) {
    console.error('[OrcamentoPublico/POST/aprovar]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
