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
      .is('deletado_em', null)
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

    // Resolve cliente_pk via sessão (se logado)
    let cliente_pk = null;
    const sessaoTk = req.headers['x-sessao-token'];
    if (sessaoTk) {
      const { data: sessao } = await supabase
        .from('catalogo_sessoes')
        .select('cliente_pk')
        .eq('token', sessaoTk)
        .gt('expira_em', new Date().toISOString())
        .single();
      if (sessao) cliente_pk = sessao.cliente_pk;
    }

    const { data: pedido, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .insert({
        catalogo_pk:     catalogo.pk,
        filial_pk:       catalogo.filial_pk,
        cliente_pk,
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
      .select('pk, produto_pk, nome_produto, quantidade, produto_substituto_pk, nome_produto_substituto')
      .eq('pedido_pk', pedido.pk)
      .order('pk');

    const allPks = [...new Set(
      [...(itens||[]).map(i => i.produto_pk), ...(itens||[]).map(i => i.produto_substituto_pk)].filter(Boolean)
    )];
    let fotoMap = {};
    if (allPks.length) {
      const { data: prods } = await supabase.from('produtos').select('pk, foto_url').in('pk', allPks);
      (prods || []).forEach(p => { fotoMap[p.pk] = p.foto_url || null; });
    }

    const itensCompletos = (itens || []).map(i => ({
      nome_produto:            i.nome_produto,
      quantidade:              i.quantidade,
      foto_url:                fotoMap[i.produto_pk] || null,
      produto_substituto_pk:   i.produto_substituto_pk || null,
      nome_produto_substituto: i.nome_produto_substituto || null,
      foto_url_substituto:     i.produto_substituto_pk ? (fotoMap[i.produto_substituto_pk] || null) : null,
    }));

    res.json({ ok: true, pedido: { ...pedido, itens: itensCompletos } });
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

// ── Helpers ──────────────────────────────────────────────────
const soDigitos = s => (s || '').replace(/\D/g, '');

// POST /api/catalogo-publico/:token/cliente/login
router.post('/:token/cliente/login', async (req, res) => {
  try {
    const { email, telefone } = req.body;
    if (!email?.trim() || !telefone?.trim()) {
      return res.status(400).json({ erro: 'E-mail e telefone obrigatórios' });
    }

    // Descobre a filial pelo token do catálogo
    const { data: catalogo, error: errCat } = await supabase
      .from('catalogos')
      .select('pk, filial_pk')
      .eq('token', req.params.token)
      .is('deletado_em', null)
      .single();
    if (errCat || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });

    // Busca clientes da filial com esse e-mail (case-insensitive)
    const { data: candidatos } = await supabase
      .from('clientes')
      .select('pk, nome, email, telefone, filial_pk')
      .eq('filial_pk', catalogo.filial_pk)
      .ilike('email', email.trim());

    // Verifica telefone normalizando ambos os lados (remove não-dígitos)
    const telBuscado = soDigitos(telefone);
    const cliente = (candidatos || []).find(c => soDigitos(c.telefone) === telBuscado);

    if (!cliente) {
      return res.status(401).json({ erro: 'E-mail ou telefone não encontrado no cadastro' });
    }

    // Cria sessão com validade de 7 dias
    const sessaoToken = crypto.randomBytes(32).toString('hex');
    const expiraEm    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: errSessao } = await supabase
      .from('catalogo_sessoes')
      .insert({
        cliente_pk:  cliente.pk,
        catalogo_pk: catalogo.pk,
        token:       sessaoToken,
        expira_em:   expiraEm,
      });
    if (errSessao) throw errSessao;

    res.json({
      ok: true,
      sessao_token: sessaoToken,
      cliente: {
        pk:       cliente.pk,
        nome:     cliente.nome,
        email:    cliente.email,
        telefone: cliente.telefone,
      },
    });
  } catch (err) {
    console.error('[CatalogoPublico/POST/login]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/catalogo-publico/:token/cliente/sessao — valida sessão existente
router.get('/:token/cliente/sessao', async (req, res) => {
  try {
    const sessaoToken = req.headers['x-sessao-token'];
    if (!sessaoToken) return res.status(401).json({ erro: 'Token não informado' });

    const { data: sessao, error } = await supabase
      .from('catalogo_sessoes')
      .select('pk, cliente_pk, expira_em, clientes(pk, nome, email, telefone)')
      .eq('token', sessaoToken)
      .gt('expira_em', new Date().toISOString())
      .single();

    if (error || !sessao) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });

    res.json({
      ok: true,
      cliente: {
        pk:       sessao.clientes.pk,
        nome:     sessao.clientes.nome,
        email:    sessao.clientes.email,
        telefone: sessao.clientes.telefone,
      },
    });
  } catch (err) {
    console.error('[CatalogoPublico/GET/sessao]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/catalogo-publico/:token/cliente/pedidos — pedidos do cliente logado
router.get('/:token/cliente/pedidos', async (req, res) => {
  try {
    const sessaoToken = req.headers['x-sessao-token'];
    if (!sessaoToken) return res.status(401).json({ erro: 'Não autenticado' });

    // Valida sessão
    const { data: sessao, error: errSessao } = await supabase
      .from('catalogo_sessoes')
      .select('pk, cliente_pk, catalogo_pk')
      .eq('token', sessaoToken)
      .gt('expira_em', new Date().toISOString())
      .single();
    if (errSessao || !sessao) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });

    // Busca pedidos do cliente neste catálogo
    const { data: pedidos, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status, valor_orcamento, obs_orcamento, pedido_token, data_evento, hora_evento, tipo_entrega, criado_em')
      .eq('catalogo_pk', sessao.catalogo_pk)
      .eq('cliente_pk', sessao.cliente_pk)
      .is('deletado_em', null)
      .order('criado_em', { ascending: false });

    if (errPed) throw errPed;

    // Busca itens de cada pedido
    const pks = (pedidos || []).map(p => p.pk);
    let itensMap = {};
    if (pks.length) {
      const { data: itens } = await supabase
        .from('pedidos_catalogo_itens')
        .select('pedido_pk, nome_produto, quantidade')
        .in('pedido_pk', pks);
      (itens || []).forEach(i => {
        if (!itensMap[i.pedido_pk]) itensMap[i.pedido_pk] = [];
        itensMap[i.pedido_pk].push({ nome: i.nome_produto, quantidade: i.quantidade });
      });
    }

    res.json({
      ok: true,
      data: (pedidos || []).map(p => ({ ...p, itens: itensMap[p.pk] || [] })),
    });
  } catch (err) {
    console.error('[CatalogoPublico/GET/cliente/pedidos]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
