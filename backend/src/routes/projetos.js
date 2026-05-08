'use strict';

const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

// ── Focus NFe helpers ─────────────────────────────────────────────
function focusBaseUrl(ambiente) {
  return Number(ambiente || 2) === 1
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';
}

function focusAuth(ambiente) {
  const isProd = Number(ambiente || 2) === 1;
  const token  = isProd ? process.env.FOCUSNFE_TOKEN_PROD : process.env.FOCUSNFE_TOKEN_HOM;
  if (!token) throw new Error(isProd ? 'FOCUSNFE_TOKEN_PROD não configurado' : 'FOCUSNFE_TOKEN_HOM não configurado');
  return 'Basic ' + Buffer.from(token + ':').toString('base64');
}

async function focusRequest(method, path, body, ambiente) {
  const url  = focusBaseUrl(ambiente) + path;
  const auth = focusAuth(ambiente);
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    signal: AbortSignal.timeout(30000),
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  const text = await resp.text();
  console.log(`\n=== Focus NF-e ${method} ${path} | HTTP ${resp.status} ===\n${text}\n===`);
  try { return { status: resp.status, data: JSON.parse(text) }; }
  catch { return { status: resp.status, data: { _raw: text } }; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function aguardarAutorizacaoNfe(ref, ambiente) {
  for (let i = 0; i < 14; i++) {
    await sleep(2000);
    const { data } = await focusRequest('GET', `/v2/nfe/${ref}`, null, ambiente);
    if (data.status !== 'processando_autorizacao') return data;
  }
  return { status: 'timeout', mensagem_sefaz: 'Tempo limite aguardando resposta da SEFAZ' };
}

const FORMAS_NF = {
  dinheiro: '01', cheque: '02', credito: '03', debito: '04',
  crediario: '05', pix: '17', transferencia: '17',
};

// ── GET /api/projetos ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });

    const { data, error } = await supabase
      .from('projetos')
      .select('*, clientes(pk, nome, cpf, logradouro, numero, bairro, cep, cidade, uf)')
      .eq('filial_pk', filial_pk)
      .order('data_decoracao', { ascending: false });

    if (error) throw error;
    return res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error('[Projetos/GET]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── GET /api/projetos/:pk ────────────────────────────────────────
router.get('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;
    const { data, error } = await supabase
      .from('projetos')
      .select('*, clientes(pk, nome, cpf, logradouro, numero, bairro, cep, cidade, uf), filiais(pk, nome_fantasia, razao_social, cnpj, logradouro, numero_end, bairro, cidade, uf, cep, telefone)')
      .eq('pk', pk)
      .single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('[Projetos/GET/:pk]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── POST /api/projetos ───────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { filial_pk, titulo, cliente_pk, valor, data_decoracao, cfop, ncm, forma_pagamento, observacao, status } = req.body;
    if (!filial_pk || !titulo) return res.status(400).json({ erro: 'filial_pk e titulo são obrigatórios' });

    const payload = {
      filial_pk,
      titulo,
      cliente_pk:      cliente_pk      || null,
      valor:           parseFloat(valor || 0),
      data_decoracao:  data_decoracao  || null,
      cfop:            cfop            || '5102',
      ncm:             ncm             || null,
      forma_pagamento: forma_pagamento || null,
      observacao:      observacao      || null,
      status:          status          || 'pendente',
    };

    const { data: proj, error } = await supabase
      .from('projetos').insert([payload]).select().single();
    if (error) throw error;

    if (data_decoracao) await criarEventoAgenda(proj);

    return res.json({ ok: true, data: proj });
  } catch (err) {
    console.error('[Projetos/POST]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── PUT /api/projetos/:pk ────────────────────────────────────────
router.put('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;
    const { titulo, cliente_pk, valor, data_decoracao, cfop, ncm, forma_pagamento, observacao, status } = req.body;

    const payload = {
      titulo,
      cliente_pk:      cliente_pk      || null,
      valor:           parseFloat(valor || 0),
      data_decoracao:  data_decoracao  || null,
      cfop:            cfop            || '5102',
      ncm:             ncm             || null,
      forma_pagamento: forma_pagamento || null,
      observacao:      observacao      || null,
      status:          status          || 'pendente',
    };

    const { data: proj, error } = await supabase
      .from('projetos').update(payload).eq('pk', pk).select().single();
    if (error) throw error;

    await sincronizarEventoAgenda(proj);

    return res.json({ ok: true, data: proj });
  } catch (err) {
    console.error('[Projetos/PUT]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── DELETE /api/projetos/:pk ─────────────────────────────────────
router.delete('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;
    const { data: proj } = await supabase.from('projetos').select('agenda_pk').eq('pk', pk).single();

    const { error } = await supabase.from('projetos').delete().eq('pk', pk);
    if (error) throw error;

    if (proj?.agenda_pk) {
      await supabase.from('agenda').delete().eq('pk', proj.agenda_pk);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[Projetos/DELETE]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── POST /api/projetos/:pk/emitir-nfe ───────────────────────────
router.post('/:pk/emitir-nfe', async (req, res) => {
  try {
    const { pk } = req.params;
    const { ambiente } = req.body;
    const amb = Number(ambiente || 2);

    const { data: proj, error: projErr } = await supabase
      .from('projetos')
      .select('*, clientes(pk, nome, cpf, logradouro, numero, bairro, cep, cidade, uf)')
      .eq('pk', pk)
      .single();

    if (projErr || !proj) return res.status(404).json({ erro: 'Projeto não encontrado' });
    if (proj.nfe_chave && proj.nfe_protocolo) {
      return res.status(400).json({ erro: 'NF-e já autorizada', chave: proj.nfe_chave });
    }

    const { data: filial } = await supabase.from('filiais').select('*').eq('pk', proj.filial_pk).single();
    if (!filial?.cnpj) return res.status(400).json({ erro: 'Filial sem CNPJ cadastrado' });

    const cli = proj.clientes;
    if (!cli) return res.status(400).json({ erro: 'Projeto sem cliente vinculado' });
    if (!cli.logradouro || !cli.cidade || !cli.uf) {
      return res.status(400).json({ erro: 'Cliente sem endereço completo. Cadastre logradouro, município e UF antes de emitir NF-e.' });
    }

    const cnpj = String(filial.cnpj).replace(/\D/g, '');
    const dataEmissao = new Date().toLocaleString('sv-SE', { timeZone: 'America/Manaus' })
      .replace(' ', 'T') + '-04:00';

    const ncm = (proj.ncm || '00000000').replace(/\D/g, '').padStart(8, '0');
    const valorTotal = parseFloat(proj.valor || 0);

    const payload = {
      cnpj_emitente:                             cnpj,
      natureza_operacao:                         'PRESTAÇÃO DE SERVIÇO',
      data_emissao:                              dataEmissao,
      tipo_documento:                            1,
      presenca_comprador:                        1,
      consumidor_final:                          1,
      finalidade_emissao:                        1,
      indicador_inscricao_estadual_destinatario: 9,
      modalidade_frete:                          9,
      nome_destinatario:                         cli.nome,
      logradouro_destinatario:                   cli.logradouro,
      numero_destinatario:                       cli.numero || 'S/N',
      bairro_destinatario:                       cli.bairro || 'Centro',
      cidade_destinatario:                    cli.cidade,
      uf_destinatario:                           cli.uf,
      cep_destinatario:                          String(cli.cep || '').replace(/\D/g, '') || undefined,
      itens: [{
        numero_item:               1,
        codigo_produto:            String(proj.pk),
        descricao:                 proj.titulo,
        cfop:                      proj.cfop || '5102',
        unidade_comercial:         'UN',
        quantidade_comercial:      1,
        valor_unitario_comercial:  valorTotal,
        valor_unitario_tributavel: valorTotal,
        unidade_tributavel:        'UN',
        quantidade_tributavel:     1,
        valor_bruto:               valorTotal,
        codigo_ncm:                ncm,
        icms_situacao_tributaria:  '400',
        icms_origem:               0,
        pis_situacao_tributaria:   '07',
        cofins_situacao_tributaria:'07',
      }],
      formas_pagamento: [{
        forma_pagamento: FORMAS_NF[String(proj.forma_pagamento || '').toLowerCase()] || '99',
        valor_pagamento: valorTotal,
      }],
    };

    const cpfDoc = String(cli.cpf || '').replace(/\D/g, '');
    if (cpfDoc.length === 11) payload.cpf_destinatario = cpfDoc;
    else if (cpfDoc.length === 14) payload.cnpj_destinatario = cpfDoc;

    const ref = `nfe-proj-${pk}-${Date.now()}`;
    console.log('[Projetos/NF-e payload]', JSON.stringify(payload, null, 2));

    const { status: httpStatus, data: envio } = await focusRequest('POST', `/v2/nfe?ref=${ref}`, payload, amb);

    if (httpStatus >= 400) {
      const msg = envio.mensagem || envio.erros?.map(e => e.mensagem).join('; ') || 'Erro ao enviar para Focus NFe';
      return res.json({ ok: false, erro: msg });
    }

    let resultado = envio;
    if (resultado.status === 'processando_autorizacao') {
      resultado = await aguardarAutorizacaoNfe(ref, amb);
    }

    const autorizada = resultado.status === 'autorizado';

    const update = {
      nfe_ref:       ref,
      nfe_chave:     resultado.chave_nfe      || null,
      nfe_protocolo: resultado.protocolo      || null,
      nfe_status:    resultado.status_sefaz   || resultado.status || '',
      nfe_motivo:    resultado.mensagem_sefaz || resultado.status || '',
      nfe_numero:    resultado.numero         || null,
      nfe_serie:     resultado.serie          || '1',
      nfe_ambiente:  String(amb),
      nfe_xml:       autorizada ? (resultado.caminho_xml_nota_fiscal || null) : null,
      nfe_danfe:     resultado.caminho_danfe ? focusBaseUrl(amb) + resultado.caminho_danfe : null,
    };

    await supabase.from('projetos').update(update).eq('pk', pk);

    return res.json({
      ok:        autorizada,
      chave:     update.nfe_chave,
      protocolo: update.nfe_protocolo,
      cStat:     update.nfe_status,
      xMotivo:   update.nfe_motivo,
      numero:    update.nfe_numero,
      danfe:     update.nfe_danfe,
      erro:      autorizada ? null : `[${update.nfe_status}] ${update.nfe_motivo || 'Erro na autorização'}`,
    });

  } catch (err) {
    console.error('[Projetos/emitir-nfe]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// ── Helpers agenda ────────────────────────────────────────────────
async function criarEventoAgenda(proj) {
  try {
    const { data: ev } = await supabase.from('agenda').insert([{
      filial_pk:   proj.filial_pk,
      titulo:      proj.titulo,
      descricao:   `Projeto — ${proj.titulo}`,
      data_evento: proj.data_decoracao,
      data_inicio: proj.data_decoracao,
      data_fim:    proj.data_decoracao,
      tipo:        'projeto',
      projeto_pk:  proj.pk,
      cor:         '#a855f7',
    }]).select().single();

    if (ev) {
      await supabase.from('projetos').update({ agenda_pk: ev.pk }).eq('pk', proj.pk);
    }
  } catch (err) {
    console.error('[Projetos/criarEventoAgenda]', err.message);
  }
}

async function sincronizarEventoAgenda(proj) {
  try {
    if (proj.agenda_pk) {
      await supabase.from('agenda').update({
        titulo:      proj.titulo,
        data_evento: proj.data_decoracao,
        data_inicio: proj.data_decoracao,
        data_fim:    proj.data_decoracao,
        descricao:   `Projeto — ${proj.titulo}`,
      }).eq('pk', proj.agenda_pk);
    } else if (proj.data_decoracao) {
      await criarEventoAgenda(proj);
    }
  } catch (err) {
    console.error('[Projetos/sincronizarEventoAgenda]', err.message);
  }
}

module.exports = router;
