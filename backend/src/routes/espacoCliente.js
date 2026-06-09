'use strict';
const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const supabase = require('../supabase');
const { enviarPushCliente } = require('../push');

const soDigitos = s => (s || '').replace(/\D/g, '');

function dedupFiliais(lista) {
  const visto = new Set();
  return lista.filter(f => {
    const key = f.filial_pk ?? f.cliente_pk;
    if (visto.has(key)) return false;
    visto.add(key);
    return true;
  });
}

// Sem .is('catalogo_pk', null) na query para não depender do comportamento do PostgREST com NULL
// Verificação feita em código depois
async function validarSessao(req, res, next) {
  const tok = req.headers['x-sessao-token'];
  if (!tok) return res.status(401).json({ erro: 'Não autenticado' });

  const { data: sessao, error } = await supabase
    .from('catalogo_sessoes')
    .select('pk, cliente_pk, catalogo_pk')
    .eq('token', tok)
    .gt('expira_em', new Date().toISOString())
    .maybeSingle();

  if (error || !sessao) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
  // Só aceita sessões do Espaço do Cliente (catalogo_pk nulo)
  if (sessao.catalogo_pk != null) return res.status(401).json({ erro: 'Sessão inválida para este portal' });

  const emailBase   = sessao.clientes?.email?.toLowerCase() || '';
  let   clientePk   = sessao.cliente_pk;
  let   filialPk    = null;

  const requestedPk = req.headers['x-cliente-pk'] ? Number(req.headers['x-cliente-pk']) : null;
  if (requestedPk && requestedPk !== clientePk) {
    // Busca email do cliente solicitado para validar que é a mesma pessoa
    const { data: cBase } = await supabase
      .from('clientes').select('email').eq('pk', clientePk).maybeSingle();
    const emailSessao = cBase?.email?.toLowerCase() || '';

    const { data: c } = await supabase
      .from('clientes').select('email, filial_pk').eq('pk', requestedPk).maybeSingle();
    if (!c || c.email?.toLowerCase() !== emailSessao)
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    clientePk = requestedPk;
    filialPk  = c.filial_pk;
  } else {
    const { data: c } = await supabase
      .from('clientes').select('filial_pk').eq('pk', clientePk).maybeSingle();
    filialPk = c?.filial_pk ?? null;
  }

  req.cliente_pk = clientePk;
  req.filial_pk  = filialPk;
  next();
}

// POST /api/espaco-cliente/login
router.post('/login', async (req, res) => {
  try {
    const { email, telefone } = req.body;
    if (!email?.trim() || !telefone?.trim())
      return res.status(400).json({ erro: 'E-mail e telefone obrigatórios' });

    const { data: candidatos } = await supabase
      .from('clientes')
      .select('pk, nome, email, telefone, filial_pk, filiais(pk, nome)')
      .ilike('email', email.trim())
      .eq('ativo', true);

    const telBuscado = soDigitos(telefone);
    const matches    = (candidatos || []).filter(c => soDigitos(c.telefone) === telBuscado);

    if (!matches.length)
      return res.status(401).json({ erro: 'E-mail ou telefone não encontrado no cadastro' });

    const principal   = matches[0];
    const sessaoToken = crypto.randomBytes(32).toString('hex');
    const expiraEm    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Omite catalogo_pk para que fique NULL no banco (sem passar null explicitamente)
    const { error: errSessao } = await supabase
      .from('catalogo_sessoes')
      .insert({ cliente_pk: principal.pk, token: sessaoToken, expira_em: expiraEm });
    if (errSessao) throw errSessao;

    const filiais = dedupFiliais(matches.map(c => ({
      cliente_pk:  c.pk,
      filial_pk:   c.filial_pk,
      filial_nome: c.filiais?.nome || `Filial ${c.filial_pk || c.pk}`,
    })));

    res.json({
      ok: true,
      sessao_token: sessaoToken,
      cliente:  { pk: principal.pk, nome: principal.nome, email: principal.email },
      filiais,
    });
  } catch (err) {
    console.error('[EspacoCliente/login]', err.message);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/espaco-cliente/sessao
router.get('/sessao', async (req, res) => {
  try {
    const tok = req.headers['x-sessao-token'];
    if (!tok) return res.status(401).json({ erro: 'Token não informado' });

    const { data: sessao, error } = await supabase
      .from('catalogo_sessoes')
      .select('pk, cliente_pk, catalogo_pk')
      .eq('token', tok)
      .gt('expira_em', new Date().toISOString())
      .maybeSingle();

    if (error || !sessao) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
    if (sessao.catalogo_pk != null) return res.status(401).json({ erro: 'Sessão inválida para este portal' });

    // Busca dados do cliente separadamente para evitar problemas de RLS no join
    const { data: c, error: errC } = await supabase
      .from('clientes')
      .select('pk, nome, email, telefone')
      .eq('pk', sessao.cliente_pk)
      .maybeSingle();

    if (errC || !c) return res.status(401).json({ erro: 'Cliente não encontrado' });

    const { data: outros } = await supabase
      .from('clientes')
      .select('pk, filial_pk, filiais(pk, nome)')
      .ilike('email', c.email)
      .eq('ativo', true);

    const filiais = dedupFiliais((outros || []).map(o => ({
      cliente_pk:  o.pk,
      filial_pk:   o.filial_pk,
      filial_nome: o.filiais?.nome || `Filial ${o.filial_pk || o.pk}`,
    })));

    res.json({
      ok: true,
      cliente: { pk: c.pk, nome: c.nome, email: c.email, telefone: c.telefone },
      filiais,
    });
  } catch (err) {
    console.error('[EspacoCliente/sessao]', err.message);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/espaco-cliente/vendas
router.get('/vendas', validarSessao, async (req, res) => {
  try {
    console.log('[EspacoCliente/vendas] cliente_pk:', req.cliente_pk, 'filial_pk:', req.filial_pk);

    const { data: vendas, error } = await supabase
      .from('vendas')
      .select('pk, numero, total, subtotal, desconto_total, status, tipo_venda, criado_em, data_locacao, data_devolucao_prevista, status_locacao, nfce_protocolo, nfce_numero, nfce_serie, nfce_danfe, nfce_chave, data_vencimento_crediario, status_crediario')
      .eq('cliente_pk', req.cliente_pk)
      .neq('ativo', false)
      .order('criado_em', { ascending: false })
      .limit(100);
    if (error) { console.error('[EspacoCliente/vendas] query error:', error); throw error; }
    console.log('[EspacoCliente/vendas] encontradas:', vendas?.length ?? 0);

    const pks = (vendas || []).map(v => v.pk);

    // Mapa de formas de pagamento para label de exibição
    let formasLabel = {};
    if (req.filial_pk) {
      const { data: formas } = await supabase
        .from('formas_pagamento')
        .select('forma, label')
        .eq('filial_pk', req.filial_pk)
        .eq('ativo', true);
      (formas || []).forEach(f => { formasLabel[f.forma] = f.label; });
    }

    let itensMap = {}, pagMap = {};
    if (pks.length) {
      const [{ data: itens }, { data: pags }] = await Promise.all([
        supabase.from('itens_venda').select('venda_pk, descricao, qtd, preco_unit, total_item').in('venda_pk', pks),
        supabase.from('pagamentos_venda').select('venda_pk, forma, valor').in('venda_pk', pks),
      ]);
      (itens || []).forEach(i => { (itensMap[i.venda_pk] ??= []).push(i); });
      (pags  || []).forEach(p => {
        (pagMap[p.venda_pk] ??= []).push({
          forma: p.forma,
          label: formasLabel[p.forma] || fmtFormaFallback(p.forma),
          valor: p.valor,
        });
      });
    }

    res.json({
      ok: true,
      data: (vendas || []).map(v => ({ ...v, itens: itensMap[v.pk] || [], pagamentos: pagMap[v.pk] || [] })),
    });
  } catch (err) {
    console.error('[EspacoCliente/vendas]', err.message);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/espaco-cliente/pedidos
router.get('/pedidos', validarSessao, async (req, res) => {
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status, valor_orcamento, obs_orcamento, pedido_token, data_evento, hora_evento, tipo_entrega, criado_em, observacao, catalogo_pk, catalogos(pk, token, nome)')
      .eq('cliente_pk', req.cliente_pk)
      .is('deletado_em', null)
      .order('criado_em', { ascending: false });
    if (error) throw error;

    const pks = (pedidos || []).map(p => p.pk);
    let itensMap = {};
    if (pks.length) {
      const { data: itens } = await supabase
        .from('pedidos_catalogo_itens')
        .select('pedido_pk, nome_produto, quantidade')
        .in('pedido_pk', pks);
      (itens || []).forEach(i => { (itensMap[i.pedido_pk] ??= []).push(i); });
    }

    res.json({
      ok: true,
      data: (pedidos || []).map(p => ({
        ...p,
        itens:          itensMap[p.pk] || [],
        catalogo_token: p.catalogos?.token || null,
        catalogo_nome:  p.catalogos?.nome  || null,
      })),
    });
  } catch (err) {
    console.error('[EspacoCliente/pedidos]', err.message);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/espaco-cliente/catalogo-login
router.post('/catalogo-login', validarSessao, async (req, res) => {
  try {
    const { catalogo_token } = req.body;
    if (!catalogo_token) return res.status(400).json({ erro: 'Token do catálogo obrigatório' });

    const { data: catalogo } = await supabase
      .from('catalogos').select('pk').eq('token', catalogo_token).maybeSingle();
    if (!catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });

    const sessaoToken = crypto.randomBytes(32).toString('hex');
    const expiraEm   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('catalogo_sessoes')
      .insert({ cliente_pk: req.cliente_pk, catalogo_pk: catalogo.pk, token: sessaoToken, expira_em: expiraEm });
    if (error) throw error;

    res.json({ ok: true, sessao_token: sessaoToken });
  } catch (err) {
    console.error('[EspacoCliente/catalogo-login]', err.message);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/espaco-cliente/danfe/:venda_pk
// Proxy autenticado para o DANFE da NFC-e — sem expor credenciais FocusNFe ao cliente
router.get('/danfe/:venda_pk', validarSessao, async (req, res) => {
  try {
    const vendaPk = Number(req.params.venda_pk);
    if (!vendaPk) return res.status(400).json({ erro: 'Venda inválida' });

    const { data: venda } = await supabase
      .from('vendas')
      .select('pk, nfce_danfe, nfce_protocolo, cliente_pk')
      .eq('pk', vendaPk)
      .eq('cliente_pk', req.cliente_pk)
      .maybeSingle();

    if (!venda?.nfce_danfe || !venda?.nfce_protocolo)
      return res.status(404).json({ erro: 'NFC-e não disponível para esta venda' });

    const url = venda.nfce_danfe;
    const allowedBases = ['https://api.focusnfe.com.br', 'https://homologacao.focusnfe.com.br'];
    const base = allowedBases.find(b => url.startsWith(b));
    if (!base) return res.status(400).json({ erro: 'URL de NFC-e inválida' });

    const isProd = base.includes('api.focusnfe');
    const token  = isProd ? process.env.FOCUSNFE_TOKEN_PROD : process.env.FOCUSNFE_TOKEN_HOM;
    if (!token) return res.status(500).json({ erro: 'Token FocusNFe não configurado' });

    const focusResp = await fetch(url, {
      headers: { Authorization: 'Basic ' + Buffer.from(token + ':').toString('base64') },
      signal: AbortSignal.timeout(15000),
    });
    if (!focusResp.ok) return res.status(focusResp.status).json({ erro: 'Erro ao buscar DANFE' });

    let html = await focusResp.text();
    // Reescreve URLs relativas para absolutas (CSS, imagens)
    html = html.replace(/(href|src)="(?!https?:\/\/)(\/?[^"]+)"/g, (_, attr, path) => {
      const abs = path.startsWith('/') ? base + path : base + '/' + path;
      return `${attr}="${abs}"`;
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.send(html);
  } catch (err) {
    console.error('[EspacoCliente/danfe]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/espaco-cliente/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ erro: 'Push não configurado' });
  res.json({ ok: true, key });
});

// POST /api/espaco-cliente/push-subscribe
router.post('/push-subscribe', validarSessao, async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ erro: 'Assinatura inválida' });

    await supabase
      .from('push_subscriptions')
      .upsert(
        { cliente_pk: req.cliente_pk, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'cliente_pk,endpoint' }
      );

    res.json({ ok: true });
  } catch (err) {
    console.error('[EspacoCliente/push-subscribe]', err.message);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/espaco-cliente/push-check-crediarios  — verifica vencimentos de amanhã e envia push
router.get('/push-check-crediarios', validarSessao, async (req, res) => {
  try {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().slice(0, 10);

    const { data: vencendo } = await supabase
      .from('vendas')
      .select('pk, numero, total, data_vencimento_crediario')
      .eq('cliente_pk', req.cliente_pk)
      .eq('data_vencimento_crediario', dataAmanha)
      .neq('status_crediario', 'recebido')
      .neq('ativo', false);

    if (vencendo?.length) {
      for (const v of vencendo) {
        await enviarPushCliente(req.cliente_pk, {
          title:               'Crediário vence amanhã!',
          body:                `Venda #${v.numero || v.pk} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.total)}`,
          url:                 '/minha-conta',
          tag:                 `crediario-${v.pk}`,
          requireInteraction:  true,
        });
      }
    }

    res.json({ ok: true, vencendo: vencendo?.length || 0 });
  } catch (err) {
    console.error('[EspacoCliente/push-check-crediarios]', err.message);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

function fmtFormaFallback(s) {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = router;
