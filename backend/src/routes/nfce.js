'use strict';

const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

const BRASILNFE_URL = 'https://api.brasilnfe.com.br/services/fiscal';

// ── Mapa de formas de pagamento ──────────────────────────────────
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

// ── Montar payload BrasilNFe ─────────────────────────────────────
function montarPayload({ filial, venda, itens, pagamentos, prodsFiscalMap, cpfConsumidor, tpAmb }) {
  const produtos = itens.map((item, idx) => {
    const fiscal = prodsFiscalMap[item.produto_pk] || {};
    const ncm    = (fiscal.ncm || '95030099').replace(/\D/g, '').padStart(8, '0');
    return {
      NmProduto:                  item.descricao || `PRODUTO ${idx + 1}`,
      CodProdutoServico:          String(item.codigo || item.produto_pk || idx + 1),
      EAN:                        'SEM GTIN',
      NCM:                        ncm,
      UnidadeComercial:           fiscal.unidade_comercial || 'UN',
      UnidadeComercialTributavel: fiscal.unidade_comercial || 'UN',
      Quantidade:                 Number(item.qtd || 1),
      QuantidadeTributavel:       Number(item.qtd || 1),
      ValorUnitario:              Number(item.preco_unit || 0),
      ValorUnitarioTributavel:    Number(item.preco_unit || 0),
      ValorTotal:                 Number(item.total_item || 0) + Number(item.desconto_val || 0),
      ValorDesconto:              Number(item.desconto_val || 0),
      ValorSeguro:                0,
      ValorFrete:                 0,
      ValorOutrasDespesas:        0,
      CFOP:                       parseInt(fiscal.cfop || '5102'),
      OrigemProduto:              0,
      Imposto: {
        ICMS:   { CodSituacaoTributaria: fiscal.csosn || '400' },
        PIS:    { CodSituacaoTributaria: '07', BaseCalculo: 0, Aliquota: 0 },
        COFINS: { CodSituacaoTributaria: '07', BaseCalculo: 0, Aliquota: 0 },
      },
    };
  });

  const pagamentosPayload = pagamentos.map(p => ({
    IndicadorPagamento: 0,
    FormaPagamento:     FORMA_PAGAMENTO[String(p.forma).toLowerCase()] || '99',
    VlPago:             Number(p.valor || 0),
  }));

  const payload = {
    ModeloDocumento:      65,
    Serie:                1,
    TipoAmbiente:         Number(tpAmb || 2),
    NaturezaOperacao:     'VENDA DE MERCADORIA AO CONSUMIDOR',
    Finalidade:           1,
    IndicadorPresenca:    1,
    ConsumidorFinal:      true,
    CalcularIBPT:         false,
    Observacao:           'Simples Nacional',
    IdentificadorInterno: String(venda.pk),
    Produtos:             produtos,
    Pagamentos:           pagamentosPayload,
    Transporte:           { ModalidadeFrete: 9 },
  };

  if (cpfConsumidor) {
    const cpf = String(cpfConsumidor).replace(/\D/g, '');
    if (cpf.length === 11) {
      payload.Cliente = {
        CpfCnpj:     cpf,
        NmCliente:   venda.cliente || 'CONSUMIDOR',
        IndicadorIe: 9,
        Ie:          'ISENTO',
      };
    }
  }

  return payload;
}

// ── Chamar BrasilNFe ─────────────────────────────────────────────
async function chamarBrasilNFe(endpoint, body) {
  const token = process.env.BRASILNFE_TOKEN;
  if (!token) throw new Error('BRASILNFE_TOKEN não configurado');

  const resp = await fetch(`${BRASILNFE_URL}${endpoint}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Token':        token,
    },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const text = await resp.text();
  process.stdout.write(`\n=== BrasilNFe ${endpoint} | HTTP ${resp.status} ===\n${text}\n===\n`);
  try { return JSON.parse(text); } catch { return { _raw: text }; }
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
        erro: 'NFC-e já autorizada.', chave: venda.nfce_chave, protocolo: venda.nfce_protocolo,
      });
    }

    const filial = await buscarFilial(venda.filial_pk);
    if (!filial)       return res.status(404).json({ erro: 'Filial não encontrada' });
    if (!filial.cnpj)  return res.status(500).json({ erro: 'Filial sem CNPJ' });

    const prodPks      = itens.map(i => i.produto_pk).filter(Boolean);
    const prodsFiscais = await buscarProdutosFiscais(prodPks);
    const prodsFiscalMap = {};
    prodsFiscais.forEach(p => { prodsFiscalMap[p.pk] = p; });

    const payload   = montarPayload({ filial, venda, itens, pagamentos, prodsFiscalMap, cpfConsumidor: cpf_consumidor, tpAmb: process.env.NFCE_AMBIENTE || '2' });
    console.log('[NFC-e payload]', JSON.stringify(payload, null, 2));
    const resultado = await chamarBrasilNFe('/EnviarNotaFiscal', payload);

    // BrasilNFe pode devolver em ReturnNF ou na raiz
    const retorno  = resultado.ReturnNF || {};

    // Erro interno BrasilNFe (ReturnNF: null) — ex: certificado não configurado
    if (!resultado.ReturnNF && resultado.Error) {
      return res.json({ ok: false, erro: resultado.Error, cStat: '', xMotivo: resultado.Error, chave: null, protocolo: null, numero: null, danfe: null });
    }

    const cStat    = retorno.CodStatusRespostaSefaz ?? retorno.cStat ?? retorno.Status ?? null;
    const xMotivo  = retorno.DsStatusRespostaSefaz  ?? retorno.xMotivo ?? retorno.Mensagem ?? retorno.Message ?? '';
    const autorizada = retorno.Ok === true || Number(cStat) === 100;

    const update = {
      nfce_chave:      retorno.ChaveNF || null,
      nfce_protocolo:  retorno.Protocolo || (autorizada ? String(retorno.Numero) : null),
      nfce_status:     cStat !== null ? String(cStat) : '',
      nfce_motivo:     xMotivo,
      nfce_numero:     retorno.Numero || null,
      nfce_ambiente:   String(payload.TipoAmbiente),
      nfce_dh_emissao: new Date().toISOString(),
      nfce_cpf_dest:   cpf_consumidor || null,
      nfce_xml:        autorizada ? (resultado.Base64Xml || retorno.Xml || null) : null,
    };

    await salvarResultado(venda_pk, update);

    const erroMsg = autorizada
      ? null
      : (update.nfce_motivo
          ? `[${update.nfce_status}] ${update.nfce_motivo}`
          : 'BrasilNFe retornou erro sem descrição. Verifique: token válido, CNPJ cadastrado no painel e plano ativo.');

    return res.json({
      ok:        autorizada,
      chave:     update.nfce_chave,
      protocolo: update.nfce_protocolo,
      cStat:     update.nfce_status,
      xMotivo:   update.nfce_motivo,
      numero:    update.nfce_numero,
      danfe:     resultado.Base64File || retorno.Base64File || null,
      erro:      erroMsg,
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
    if (!venda_pk)                          return res.status(400).json({ erro: 'venda_pk obrigatório' });
    if (!justificativa || justificativa.length < 15) return res.status(400).json({ erro: 'Justificativa mínimo 15 caracteres' });

    const venda = await buscarVenda(venda_pk);
    if (!venda.nfce_chave || !venda.nfce_protocolo)
      return res.status(400).json({ erro: 'Venda sem NFC-e autorizada' });

    const diffMin = (Date.now() - new Date(venda.nfce_dh_emissao).getTime()) / 60000;
    if (diffMin > 30)
      return res.status(400).json({ erro: `Prazo expirado (${Math.round(diffMin)} min após emissão — limite: 30 min)` });

    const resultado = await chamarBrasilNFe('/CancelarNotaFiscal', {
      ChaveNF: venda.nfce_chave, Justificativa: justificativa,
    });

    const retorno   = resultado.ReturnNF || resultado;
    const cancelado = retorno.Ok === true || retorno.CodStatusRespostaSefaz === 101;

    if (cancelado) {
      await salvarResultado(venda_pk, { nfce_status: '101', nfce_motivo: 'Cancelamento homologado' });
    }

    return res.json({
      ok:      cancelado,
      cStat:   retorno.CodStatusRespostaSefaz,
      xMotivo: retorno.DsStatusRespostaSefaz,
      erro:    cancelado ? null : retorno.DsStatusRespostaSefaz,
    });

  } catch (err) {
    console.error('[NFC-e cancelar]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// POST /api/nfce/consultar
// Body: { chave }
// ══════════════════════════════════════════════════════════════════
router.post('/consultar', async (req, res) => {
  try {
    const { chave } = req.body;
    if (!chave) return res.status(400).json({ erro: 'chave obrigatória' });

    const resultado = await chamarBrasilNFe('/ConsultarNotaFiscal', { ChaveNF: chave });
    const retorno   = resultado.ReturnNF || resultado;

    return res.json({
      ok:        retorno.Ok,
      cStat:     retorno.CodStatusRespostaSefaz,
      xMotivo:   retorno.DsStatusRespostaSefaz,
      protocolo: retorno.Protocolo,
      chave:     retorno.ChaveNF,
    });

  } catch (err) {
    console.error('[NFC-e consultar]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/nfce/check
// ══════════════════════════════════════════════════════════════════
router.get('/check', async (_req, res) => {
  const token = process.env.BRASILNFE_TOKEN;
  return res.json({
    configurado: !!token,
    ambiente:    process.env.NFCE_AMBIENTE || '2',
  });
});

module.exports = router;
