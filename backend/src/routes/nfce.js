'use strict';

const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

// Focus NFe — homologação: https://homologacao.focusnfe.com.br
//            produção:    https://api.focusnfe.com.br
function focusBaseUrl() {
  return Number(process.env.NFCE_AMBIENTE || 2) === 1
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';
}

function focusAuth() {
  const token = process.env.FOCUSNFE_TOKEN;
  if (!token) throw new Error('FOCUSNFE_TOKEN não configurado no .env');
  return 'Basic ' + Buffer.from(token + ':').toString('base64');
}

const FORMA_PAGAMENTO = {
  dinheiro:      '01',
  cheque:        '02',
  credito:       '03',
  debito:        '04',
  crediario:     '05',
  vale:          '10',
  pix:           '17',
  transferencia: '17',
};

// ── Helpers Supabase ─────────────────────────────────────────────
async function buscarVenda(venda_pk) {
  const { data, error } = await supabase
    .from('vendas').select('*').eq('pk', venda_pk).single();
  if (error || !data) throw new Error('Venda não encontrada');
  return data;
}
async function buscarItens(venda_pk) {
  const { data } = await supabase.from('itens_venda').select('*').eq('venda_pk', venda_pk);
  return data || [];
}
async function buscarPagamentos(venda_pk) {
  const { data } = await supabase.from('pagamentos_venda').select('*').eq('venda_pk', venda_pk);
  return data || [];
}
async function buscarFilial(filial_pk) {
  const { data } = await supabase.from('filiais').select('*').eq('pk', filial_pk).single();
  return data;
}
async function buscarProdutosFiscais(prodPks) {
  if (!prodPks.length) return [];
  const { data } = await supabase
    .from('produtos').select('pk,ncm,cfop,csosn,unidade_comercial').in('pk', prodPks);
  return data || [];
}
async function salvarResultado(venda_pk, update) {
  const { error } = await supabase.from('vendas').update(update).eq('pk', venda_pk);
  if (error) console.error('[NFC-e salvarResultado]', error.message);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Chamar Focus NFe ─────────────────────────────────────────────
async function focusRequest(method, path, body) {
  const url  = focusBaseUrl() + path;
  const auth = focusAuth();

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    signal: AbortSignal.timeout(30000),
  };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);
  const text = await resp.text();
  console.log(`\n=== Focus NFe ${method} ${path} | HTTP ${resp.status} ===\n${text}\n===`);
  try { return { status: resp.status, data: JSON.parse(text) }; }
  catch { return { status: resp.status, data: { _raw: text } }; }
}

// Aguarda o processamento assíncrono da Focus NFe (máx ~28s)
async function aguardarAutorizacao(ref, tentativas = 14, intervalo = 2000) {
  for (let i = 0; i < tentativas; i++) {
    await sleep(intervalo);
    const { data } = await focusRequest('GET', `/v2/nfce/${ref}`);
    if (data.status !== 'processando_autorizacao') return data;
  }
  return { status: 'timeout', mensagem_sefaz: 'Tempo limite aguardando resposta da SEFAZ' };
}

// ── Montar payload Focus NFe ─────────────────────────────────────
function montarPayload({ filial, venda, itens, pagamentos, prodsFiscalMap, cpfConsumidor }) {
  const cnpj = String(filial.cnpj || '').replace(/\D/g, '');

  // Data no fuso de Manaus (UTC-4)
  const dataEmissao = new Date().toLocaleString('sv-SE', { timeZone: 'America/Manaus' })
    .replace(' ', 'T') + '-04:00';

  const itensFocus = itens.map((item, idx) => {
    const fiscal = prodsFiscalMap[item.produto_pk] || {};
    const ncm    = (fiscal.ncm || '00000000').replace(/\D/g, '').padStart(8, '0');
    const vlBruto = Number(item.total_item || 0) + Number(item.desconto_val || 0);

    const obj = {
      numero_item:               idx + 1,
      codigo_produto:            String(item.codigo || item.produto_pk || idx + 1),
      descricao:                 item.descricao || `PRODUTO ${idx + 1}`,
      cfop:                      String(fiscal.cfop || '5102'),
      unidade_comercial:         fiscal.unidade_comercial || 'UN',
      quantidade_comercial:      Number(item.qtd || 1),
      valor_unitario_comercial:  Number(item.preco_unit || 0),
      valor_unitario_tributavel: Number(item.preco_unit || 0),
      unidade_tributavel:        fiscal.unidade_comercial || 'UN',
      quantidade_tributavel:     Number(item.qtd || 1),
      valor_bruto:               vlBruto,
      codigo_ncm:                ncm,
      icms_situacao_tributaria:  fiscal.csosn || '400',
      icms_origem:               0,
      pis_situacao_tributaria:   '07',
      cofins_situacao_tributaria:'07',
    };

    if (Number(item.desconto_val || 0) > 0) {
      obj.valor_desconto = Number(item.desconto_val);
    }

    return obj;
  });

  const formasPagamento = pagamentos.map(p => ({
    forma_pagamento: FORMA_PAGAMENTO[String(p.forma).toLowerCase()] || '99',
    valor_pagamento: Number(p.valor || 0),
  }));

  const payload = {
    cnpj_emitente:         cnpj,
    natureza_operacao:     'VENDA DE MERCADORIA AO CONSUMIDOR',
    data_emissao:          dataEmissao,
    tipo_documento:        1,
    presenca_comprador:    1,
    consumidor_final:      1,
    finalidade_emissao:    1,
    indicador_inscricao_estadual_destinatario: 9,
    modalidade_frete:      9,
    itens:                 itensFocus,
    formas_pagamento:      formasPagamento,
  };

  if (cpfConsumidor) {
    const cpf = String(cpfConsumidor).replace(/\D/g, '');
    if (cpf.length === 11) {
      payload.cpf_destinatario  = cpf;
      payload.nome_destinatario = venda.cliente || 'CONSUMIDOR';
    }
  }

  return payload;
}

// ══════════════════════════════════════════════════════════════════
// POST /api/nfce/emitir
// ══════════════════════════════════════════════════════════════════
router.post('/emitir', async (req, res) => {
  try {
    const { venda_pk, cpf_consumidor } = req.body;
    if (!venda_pk) return res.status(400).json({ erro: 'venda_pk obrigatório' });

    const [venda, itens, pagamentos] = await Promise.all([
      buscarVenda(venda_pk),
      buscarItens(venda_pk),
      buscarPagamentos(venda_pk),
    ]);

    if (venda.nfce_chave && venda.nfce_protocolo) {
      return res.status(400).json({
        erro: 'NFC-e já autorizada.',
        chave: venda.nfce_chave,
        protocolo: venda.nfce_protocolo,
      });
    }

    const filial = await buscarFilial(venda.filial_pk);
    if (!filial)      return res.status(404).json({ erro: 'Filial não encontrada' });
    if (!filial.cnpj) return res.status(400).json({ erro: 'Filial sem CNPJ cadastrado' });

    const prodPks       = itens.map(i => i.produto_pk).filter(Boolean);
    const prodsFiscais  = await buscarProdutosFiscais(prodPks);
    const prodsFiscalMap = {};
    prodsFiscais.forEach(p => { prodsFiscalMap[p.pk] = p; });

    // ref único por venda — usado para cancelar/consultar depois
    const ref     = `nfce-${venda_pk}-${Date.now()}`;
    const payload = montarPayload({ filial, venda, itens, pagamentos, prodsFiscalMap, cpfConsumidor: cpf_consumidor });

    console.log('[Focus NFC-e payload]', JSON.stringify(payload, null, 2));

    // 1. Envia para Focus NFe
    const { status: httpStatus, data: envio } = await focusRequest(
      'POST', `/v2/nfce?ref=${ref}`, payload
    );

    if (httpStatus >= 400 && envio.codigo !== 'nfe_cancelada') {
      const msg = envio.mensagem || envio.erros?.map(e => e.mensagem).join('; ') || 'Erro ao enviar para Focus NFe';
      return res.json({ ok: false, erro: msg, cStat: '', xMotivo: msg });
    }

    // 2. Aguarda processamento assíncrono
    let resultado = envio;
    if (resultado.status === 'processando_autorizacao') {
      resultado = await aguardarAutorizacao(ref);
    }

    const autorizada = resultado.status === 'autorizado';
    const cancelada  = resultado.status === 'cancelado';

    const update = {
      nfce_ref:      ref,
      nfce_chave:    resultado.chave_nfe    || null,
      nfce_protocolo:resultado.protocolo    || null,
      nfce_status:   resultado.status_sefaz || resultado.status || '',
      nfce_motivo:   resultado.mensagem_sefaz || resultado.status || '',
      nfce_numero:   resultado.numero        || null,
      nfce_serie:    resultado.serie         || filial.nfce_serie || 1,
      nfce_ambiente: String(process.env.NFCE_AMBIENTE || '2'),
      nfce_dh_emissao: new Date().toISOString(),
      nfce_cpf_dest: cpf_consumidor || null,
      nfce_xml:      autorizada ? (resultado.caminho_xml_nota_fiscal || null) : null,
      nfce_qrcode:   resultado.qrcode_url || null,
      nfce_danfe:    resultado.caminho_danfe ? focusBaseUrl() + resultado.caminho_danfe : null,
    };

    await salvarResultado(venda_pk, update);

    return res.json({
      ok:        autorizada,
      chave:     update.nfce_chave,
      protocolo: update.nfce_protocolo,
      cStat:     update.nfce_status,
      xMotivo:   update.nfce_motivo,
      numero:    update.nfce_numero,
      danfe:     resultado.caminho_danfe ? focusBaseUrl() + resultado.caminho_danfe : null,
      erro:      autorizada || cancelada
        ? null
        : `[${update.nfce_status}] ${update.nfce_motivo || 'Erro na autorização'}`,
    });

  } catch (err) {
    console.error('[NFC-e emitir]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/nfce/cancelar
// Body: { venda_pk, justificativa }
// ══════════════════════════════════════════════════════════════════
router.post('/cancelar', async (req, res) => {
  try {
    const { venda_pk, justificativa } = req.body;
    if (!venda_pk)                               return res.status(400).json({ erro: 'venda_pk obrigatório' });
    if (!justificativa || justificativa.length < 15) return res.status(400).json({ erro: 'Justificativa mínimo 15 caracteres' });

    const venda = await buscarVenda(venda_pk);
    if (!venda.nfce_chave || !venda.nfce_protocolo)
      return res.status(400).json({ erro: 'Venda sem NFC-e autorizada' });

    const diffMin = (Date.now() - new Date(venda.nfce_dh_emissao).getTime()) / 60000;
    if (diffMin > 30)
      return res.status(400).json({ erro: `Prazo expirado (${Math.round(diffMin)} min — limite: 30 min)` });

    const ref = venda.nfce_ref || `nfce-${venda_pk}`;
    const { status: httpStatus, data: resultado } = await focusRequest(
      'DELETE', `/v2/nfce/${ref}`, { justificativa }
    );

    const cancelado = resultado.status === 'cancelado' || httpStatus === 200;

    if (cancelado) {
      await salvarResultado(venda_pk, { nfce_status: '101', nfce_motivo: 'Cancelamento homologado' });
    }

    return res.json({
      ok:      cancelado,
      cStat:   resultado.status_sefaz || (cancelado ? '101' : ''),
      xMotivo: resultado.mensagem_sefaz || resultado.status || '',
      erro:    cancelado ? null : (resultado.mensagem || 'Erro ao cancelar'),
    });

  } catch (err) {
    console.error('[NFC-e cancelar]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/nfce/consultar
// Body: { chave } ou { venda_pk }
// ══════════════════════════════════════════════════════════════════
router.post('/consultar', async (req, res) => {
  try {
    const { chave, venda_pk } = req.body;

    let ref = null;
    if (venda_pk) {
      const venda = await buscarVenda(venda_pk);
      ref = venda.nfce_ref;
    }
    if (!ref && chave) ref = chave; // fallback: usa a chave como ref

    if (!ref) return res.status(400).json({ erro: 'Informe venda_pk ou chave' });

    const { data: resultado } = await focusRequest('GET', `/v2/nfce/${ref}`);

    return res.json({
      ok:        resultado.status === 'autorizado',
      status:    resultado.status,
      cStat:     resultado.status_sefaz,
      xMotivo:   resultado.mensagem_sefaz,
      protocolo: resultado.protocolo,
      chave:     resultado.chave_nfe,
      danfe:     resultado.caminho_danfe ? focusBaseUrl() + resultado.caminho_danfe : null,
    });

  } catch (err) {
    console.error('[NFC-e consultar]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/nfce/danfe-html?url=<url_completa>
// Proxy: baixa o HTML do DANFE da Focus NFe e devolve ao frontend
// para impressão via iframe (contorna CORS cross-origin).
// ══════════════════════════════════════════════════════════════════
router.get('/danfe-html', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ erro: 'url obrigatória' });

    const base = focusBaseUrl();
    if (!url.startsWith(base)) return res.status(400).json({ erro: 'URL não permitida' });

    const resp = await fetch(url, {
      headers: { Authorization: focusAuth() },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return res.status(resp.status).json({ erro: 'Erro ao buscar DANFE' });

    let html = await resp.text();

    // Reescreve URLs relativas para absolutas apontando para a Focus NFe
    html = html.replace(/(href|src)="(?!https?:\/\/)(\/?[^"]+)"/g, (_, attr, path) => {
      const abs = path.startsWith('/') ? base + path : base + '/' + path;
      return `${attr}="${abs}"`;
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    return res.send(html);
  } catch (err) {
    console.error('[NFC-e danfe-html]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/nfce/check
// ══════════════════════════════════════════════════════════════════
router.get('/check', async (_req, res) => {
  const token = process.env.FOCUSNFE_TOKEN;
  return res.json({
    configurado: !!token,
    provedor:    'Focus NFe',
    ambiente:    Number(process.env.NFCE_AMBIENTE || 2) === 1 ? 'producao' : 'homologacao',
    url_base:    focusBaseUrl(),
  });
});

module.exports = router;
