// ══════════════════════════════════════════════════════════════════
// Festou — API NFC-e  (Nota Fiscal de Consumidor Eletrônica)
// Modelo 65 · SEFAZ-AM · Simples Nacional (CRT=1) · Layout v4.00
// ══════════════════════════════════════════════════════════════════
//
// Variáveis de ambiente necessárias (configure no Vercel Dashboard):
//
//  NFCE_CERT_B64       — Certificado A1 em base64  (cat cert.pfx | base64 -w0)
//  NFCE_CERT_PASSWORD  — Senha do certificado
//  NFCE_CSC            — Código de Segurança do Contribuinte (SEFAZ-AM)
//  NFCE_CSC_ID         — ID do CSC, ex: "000001"
//  NFCE_IE             — Inscrição Estadual da empresa
//  NFCE_AMBIENTE       — "1" = Produção  |  "2" = Homologação (padrão: 2)
//  NFCE_URL_AUTH_HOM   — Webservice de autorização (Homologação)
//  NFCE_URL_AUTH_PROD  — Webservice de autorização (Produção)
//  NFCE_URL_QR_HOM     — URL consulta QR Code (Homologação)
//  NFCE_URL_QR_PROD    — URL consulta QR Code (Produção)
//  SUPABASE_URL        — URL do projeto Supabase
//  SUPABASE_KEY        — Service Role Key do Supabase
// ══════════════════════════════════════════════════════════════════

'use strict';

process.env.SUPABASE_URL = (process.env.SUPABASE_URL || "https://lflpzskcpcsfzagackuy.supabase.co").replace('.supabase.com', '.supabase.co');
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_5jo3h0in7z4PPCsw4K5RjA_g-TVT_NP";

const forge  = require('node-forge');
const crypto = require('crypto');
const https  = require('https');

// ── Constantes SEFAZ-AM ─────────────────────────────────────────
const CUF_AM    = '13';
const CMUN_MAN  = '1302603';  // IBGE Manaus
const NS_NFE    = 'http://www.portalfiscal.inf.br/nfe';
const NS_DSIG   = 'http://www.w3.org/2000/09/xmldsig#';
const CFOP_DEF  = '5102';   // Venda interna (dentro do AM)
const NCM_DEF   = '95030099'; // Brinquedos / artigos de festa (fallback)

// ── URLs padrão AM ──────────────────────────────────────────────
const URL_AUTH_HOM  = process.env.NFCE_URL_AUTH_HOM
  || 'https://homnfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4';
const URL_AUTH_PROD = process.env.NFCE_URL_AUTH_PROD
  || 'https://nfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4';
const URL_QR_HOM    = process.env.NFCE_URL_QR_HOM
  || 'https://homologacao.sefaz.am.gov.br/nfce/consultanfce.aspx';
const URL_QR_PROD   = process.env.NFCE_URL_QR_PROD
  || 'https://www.sefaz.am.gov.br/nfce/consultanfce.aspx';

// ── Helpers gerais ──────────────────────────────────────────────
function pad(v, n) { return String(v).padStart(n, '0'); }
function fmt2(v)   { return Number(v || 0).toFixed(2); }
function fmt4(v)   { return Number(v || 0).toFixed(4); }
function fmt10(v)  { return Number(v || 0).toFixed(10); }
function stripNonNum(s) { return String(s || '').replace(/\D/g, ''); }

// ── Chave de Acesso NFC-e (44 dígitos) ──────────────────────────
function gerarChave(cnpj, aamm, serie, nNF, cNF) {
  // cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8)
  const base = CUF_AM
    + pad(aamm, 4)
    + pad(stripNonNum(cnpj), 14)
    + '65'               // mod = 65 (NFC-e)
    + pad(serie, 3)
    + pad(nNF, 9)
    + '1'                // tpEmis = 1 (normal)
    + pad(cNF, 8);       // cNF (randômico)
  return base + calculaDV(base);
}

function calculaDV(chave43) {
  let soma = 0;
  let peso = 2;
  for (let i = 42; i >= 0; i--) {
    soma += parseInt(chave43[i], 10) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  return String(dv > 9 ? 0 : dv);
}

// ── Número aleatório para cNF ────────────────────────────────────
function cNFAleatorio() {
  return pad(Math.floor(Math.random() * 99999999), 8);
}

// ── Data/hora no formato NF-e (com offset AM = -04:00) ───────────
function dhNFe() {
  const now = new Date();
  const off = '-04:00';
  const iso = new Date(now.getTime() - 4 * 3600 * 1000)
    .toISOString()
    .slice(0, 19);
  return iso + off;
}

// ── AAMM para chave ──────────────────────────────────────────────
function getAAMM() {
  const d = new Date();
  const y = String(d.getUTCFullYear()).slice(2);
  const m = pad(d.getUTCMonth() + 1, 2);
  return y + m;
}

// ── Código do meio de pagamento NFC-e ───────────────────────────
function tPag(forma) {
  const map = {
    dinheiro:     '01',
    cheque:       '02',
    credito:      '03',
    debito:       '04',
    crediario:    '05',
    vale:         '10',
    pix:          '17',
    transferencia:'17',
  };
  return map[String(forma).toLowerCase()] || '99';
}

// ── Limpar string para XML ───────────────────────────────────────
function xStr(s, max) {
  let v = String(s || '').trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, '');
  return max ? v.slice(0, max) : v;
}

// ── Geração do XML NFC-e ─────────────────────────────────────────
function gerarXMLNFCe(dados) {
  const {
    chave, filial, itens, pagamentos, cliente,
    numero, serie, total, dhEmi, tpAmb, csc, cscId
  } = dados;

  const cnpj   = stripNonNum(filial.cnpj);
  const ie     = filial.ie || process.env.NFCE_IE || 'ISENTO';
  const natOp  = 'VENDA DE MERCADORIA AO CONSUMIDOR';
  const cNF    = chave.slice(35, 43);

  // Monta lista de itens
  let detXML = '';
  itens.forEach((item, idx) => {
    const ncm    = stripNonNum(item.ncm || NCM_DEF).padStart(8, '0');
    const cfop   = item.cfop || CFOP_DEF;
    const uCom   = (item.unidade_comercial || 'UN').slice(0, 6);
    const qtd    = Number(item.qtd || 1);
    const vUnit  = Number(item.preco_unit || 0);
    const vDesc  = Number(item.desconto_val || 0);
    const vProd  = Number(item.total_item || (qtd * vUnit));
    const csosn  = item.csosn || '400'; // Simples Nacional sem destaque de ICMS

    detXML += `<det nItem="${idx + 1}">`;
    detXML += `<prod>`;
    detXML += `<cProd>${xStr(item.codigo || String(idx + 1), 60)}</cProd>`;
    detXML += `<cEAN>SEM GTIN</cEAN>`;
    detXML += `<xProd>${xStr(item.descricao, 120)}</xProd>`;
    detXML += `<NCM>${ncm}</NCM>`;
    detXML += `<CFOP>${cfop}</CFOP>`;
    detXML += `<uCom>${xStr(uCom, 6)}</uCom>`;
    detXML += `<qCom>${fmt4(qtd)}</qCom>`;
    detXML += `<vUnCom>${fmt10(vUnit)}</vUnCom>`;
    detXML += `<vProd>${fmt2(vProd + vDesc)}</vProd>`;
    detXML += `<cEANTrib>SEM GTIN</cEANTrib>`;
    detXML += `<uTrib>${xStr(uCom, 6)}</uTrib>`;
    detXML += `<qTrib>${fmt4(qtd)}</qTrib>`;
    detXML += `<vUnTrib>${fmt10(vUnit)}</vUnTrib>`;
    if (vDesc > 0) detXML += `<vDesc>${fmt2(vDesc)}</vDesc>`;
    detXML += `<indTot>1</indTot>`;
    detXML += `</prod>`;
    detXML += `<imposto>`;
    detXML += `<ICMS><ICMSSN${csosn}><orig>0</orig><CSOSN>${csosn}</CSOSN></ICMSSN${csosn}></ICMS>`;
    detXML += `<PIS><PISNT><CST>07</CST></PISNT></PIS>`;
    detXML += `<COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>`;
    detXML += `</imposto>`;
    detXML += `</det>`;
  });

  // Totais
  const vProdTot = itens.reduce((s, i) => s + Number(i.total_item || 0) + Number(i.desconto_val || 0), 0);
  const vDescTot = itens.reduce((s, i) => s + Number(i.desconto_val || 0), 0);
  const vNF      = Number(total || 0);

  // Pagamentos
  let pagXML = '';
  let vPagTot = 0;
  pagamentos.forEach(p => {
    const vp = Number(p.valor || 0);
    vPagTot += vp;
    pagXML += `<detPag><tPag>${tPag(p.forma)}</tPag><vPag>${fmt2(vp)}</vPag></detPag>`;
  });
  // Troco (se dinheiro e valor pago > total)
  const trocoItem = pagamentos.find(p => p.forma === 'dinheiro' && Number(p.troco || 0) > 0);
  if (trocoItem) pagXML += `<vTroco>${fmt2(trocoItem.troco)}</vTroco>`;

  // Destinatário (opcional — CPF se informado)
  let destXML = '';
  if (cliente && cliente.cpf) {
    const cpfNum = stripNonNum(cliente.cpf);
    if (cpfNum.length === 11) {
      destXML = `<dest><CPF>${cpfNum}</CPF>`;
      if (cliente.nome) destXML += `<xNome>${xStr(cliente.nome, 60)}</xNome>`;
      destXML += `<indIEDest>9</indIEDest></dest>`;
    }
  }

  // Endereço emitente
  const end   = filial;
  const cep   = stripNonNum(end.cep || '').padStart(8, '0');

  // QR Code
  const urlConsulta = tpAmb === '1' ? URL_QR_PROD : URL_QR_HOM;
  const qrCode      = gerarQRCode(chave, tpAmb, dhEmi, vNF, urlConsulta, cliente?.cpf, csc, cscId);

  // infNFe (sem assinatura ainda)
  const infNFe = `<infNFe versao="4.00" Id="NFe${chave}" xmlns="${NS_NFE}">`
    + `<ide>`
    + `<cUF>${CUF_AM}</cUF>`
    + `<cNF>${cNF}</cNF>`
    + `<natOp>${natOp}</natOp>`
    + `<mod>65</mod>`
    + `<serie>${Number(serie)}</serie>`
    + `<nNF>${numero}</nNF>`
    + `<dhEmi>${dhEmi}</dhEmi>`
    + `<tpNF>1</tpNF>`
    + `<idDest>1</idDest>`
    + `<cMunFG>${CMUN_MAN}</cMunFG>`
    + `<tpImp>4</tpImp>`
    + `<tpEmis>1</tpEmis>`
    + `<cDV>${chave[43]}</cDV>`
    + `<tpAmb>${tpAmb}</tpAmb>`
    + `<finNFe>1</finNFe>`
    + `<indFinal>1</indFinal>`
    + `<indPres>1</indPres>`
    + `<procEmi>0</procEmi>`
    + `<verProc>FestouPDV-1.0</verProc>`
    + `</ide>`
    + `<emit>`
    + `<CNPJ>${cnpj}</CNPJ>`
    + `<xNome>${xStr(end.razao_social || end.nome, 60)}</xNome>`
    + (end.nome_fantasia ? `<xFant>${xStr(end.nome_fantasia || end.nome, 60)}</xFant>` : '')
    + `<enderEmit>`
    + `<xLgr>${xStr(end.logradouro || 'ALAMEDA COSME FERREIRA', 60)}</xLgr>`
    + `<nro>${xStr(end.numero_end || 'SN', 60)}</nro>`
    + (end.complemento ? `<xCpl>${xStr(end.complemento, 60)}</xCpl>` : '')
    + `<xBairro>${xStr(end.bairro || 'CENTRO', 60)}</xBairro>`
    + `<cMun>${CMUN_MAN}</cMun>`
    + `<xMun>Manaus</xMun>`
    + `<UF>AM</UF>`
    + `<CEP>${cep}</CEP>`
    + `<cPais>1058</cPais>`
    + `<xPais>Brasil</xPais>`
    + (end.telefone ? `<fone>${stripNonNum(end.telefone).slice(0, 14)}</fone>` : '')
    + `<enderEmit>`
    + `<IE>${stripNonNum(ie)}</IE>`
    + `<CRT>1</CRT>`
    + `</emit>`
    + destXML
    + detXML
    + `<total>`
    + `<ICMSTot>`
    + `<vBC>0.00</vBC>`
    + `<vICMS>0.00</vICMS>`
    + `<vICMSDeson>0.00</vICMSDeson>`
    + `<vFCP>0.00</vFCP>`
    + `<vBCST>0.00</vBCST>`
    + `<vST>0.00</vST>`
    + `<vFCPST>0.00</vFCPST>`
    + `<vFCPSTRet>0.00</vFCPSTRet>`
    + `<vProd>${fmt2(vProdTot)}</vProd>`
    + `<vFrete>0.00</vFrete>`
    + `<vSeg>0.00</vSeg>`
    + `<vDesc>${fmt2(vDescTot)}</vDesc>`
    + `<vII>0.00</vII>`
    + `<vIPI>0.00</vIPI>`
    + `<vIPIDevol>0.00</vIPIDevol>`
    + `<vPIS>0.00</vPIS>`
    + `<vCOFINS>0.00</vCOFINS>`
    + `<vOutro>0.00</vOutro>`
    + `<vNF>${fmt2(vNF)}</vNF>`
    + `</ICMSTot>`
    + `</total>`
    + `<transp><modFrete>9</modFrete></transp>`
    + `<pag>${pagXML}</pag>`
    + `<infAdic><infCpl>Simples Nacional</infCpl></infAdic>`
    + `</infNFe>`;

  const infNFeSupl = `<infNFeSupl>`
    + `<qrCode><![CDATA[${qrCode}]]></qrCode>`
    + `<urlChave>${urlConsulta}</urlChave>`
    + `</infNFeSupl>`;

  return { infNFe, infNFeSupl };
}

// ── QR Code NFC-e ────────────────────────────────────────────────
function gerarQRCode(chave, tpAmb, dhEmi, vNF, urlConsulta, cpfDest, csc, cscId) {

  // Data no formato AAMMDDHHMM
  const dhStr = dhEmi.replace(/[-:T]/g, '').slice(0, 12).slice(2); // AAMMDDHHMM
  const vNFStr = fmt2(vNF).replace('.', '').replace(',', '');

  let url = `${urlConsulta}?p=${chave}|2|${tpAmb}|${cpfDest ? stripNonNum(cpfDest) : ''}|${dhStr.slice(0, 4)}|${vNFStr}|0.00`;

  const hash = crypto.createHash('sha1')
    .update(url + csc, 'utf8')
    .digest('hex')
    .toUpperCase();

  url += `|${hash}|${cscId}`;
  return url;
}

// ── Assinatura XML ───────────────────────────────────────────────
// Implementação de XMLDSig para NF-e conforme NT 2016.002 v1.30
function extrairPem(certPfxB64, certPassword) {
  const pfxDer  = forge.util.decode64(certPfxB64);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const p12     = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, certPassword);

  let privateKey = null;
  let certBags = [];

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === forge.pki.oids.keyBag) {
        privateKey = safeBag.key;
      }
      if (safeBag.type === forge.pki.oids.certBag) {
        certBags.push(safeBag);
      }
    }
  }

  if (!privateKey) throw new Error('Chave privada não encontrada no certificado .pfx');
  if (certBags.length === 0) throw new Error('Nenhum certificado encontrado no .pfx');

  // Relaciona a chave privada ao certificado exato usando o Módulo RSA (n)
  const expectedModulus = privateKey.n.toString(16);
  let targetCert = certBags.find(b => b.cert.publicKey.n && b.cert.publicKey.n.toString(16) === expectedModulus)?.cert;
  
  if (!targetCert) targetCert = certBags[0].cert; // Fallback extremo

  const certPem = forge.pki.certificateToPem(targetCert);
  // Pega restante da cadeia para o TLS (opcional, fortalece a handshake TLS da Sefaz)
  const caPems = certBags.filter(b => b.cert !== targetCert).map(b => forge.pki.certificateToPem(b.cert));

  return { 
    privateKey, 
    certPem, 
    keyPem: forge.pki.privateKeyToPem(privateKey),
    caPems
  };
}

// ── Assinatura XML ───────────────────────────────────────────────
// Implementação de XMLDSig para NF-e conforme NT 2016.002 v1.30
function assinarXML(infNFe, infNFeSupl, certPfxB64, certPassword) {
  const { privateKey, certPem } = extrairPem(certPfxB64, certPassword);

  // Extrair apenas o corpo base64 do certificado (sem header/footer PEM)
  const certB64 = certPem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '');

  // 2. Digest SHA-1 do infNFe (C14N = o próprio elemento com namespace)
  const digestInfNFe = crypto.createHash('sha1')
    .update(infNFe, 'utf8')
    .digest('base64');

  // Id da referência (chave NF-e)
  const refId = infNFe.match(/Id="(NFe[^"]+)"/)[1];

  // 3. Construir SignedInfo
  const signedInfo =
    `<SignedInfo xmlns="${NS_DSIG}">`
    + `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>`
    + `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod>`
    + `<Reference URI="#${refId}">`
    + `<Transforms>`
    + `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform>`
    + `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform>`
    + `</Transforms>`
    + `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod>`
    + `<DigestValue>${digestInfNFe}</DigestValue>`
    + `</Reference>`
    + `</SignedInfo>`;

  // 4. Assinar SignedInfo com RSA-SHA1
  const md = forge.md.sha1.create();
  md.update(signedInfo, 'utf8');
  const sig    = privateKey.sign(md);
  const sigB64 = forge.util.encode64(sig);

  // 5. Montar elemento <Signature>
  const signature =
    `<Signature xmlns="${NS_DSIG}">`
    + signedInfo
    + `<SignatureValue>${sigB64}</SignatureValue>`
    + `<KeyInfo>`
    + `<X509Data>`
    + `<X509Certificate>${certB64}</X509Certificate>`
    + `</X509Data>`
    + `</KeyInfo>`
    + `</Signature>`;

  // 6. Montar NFe completa: <NFe> + infNFe + infNFeSupl + Signature + </NFe>
  const nfe =
    `<NFe xmlns="${NS_NFE}">`
    + infNFe
    + infNFeSupl
    + signature
    + `</NFe>`;

  return nfe;
}

// ── Envelope SOAP 1.2 ────────────────────────────────────────────
function montarSOAP(nfeXML, tpAmb, lote) {
  const enviNFe =
    `<enviNFe versao="4.00" xmlns="${NS_NFE}">`
    + `<idLote>${pad(lote, 15)}</idLote>`
    + `<indSinc>1</indSinc>`
    + nfeXML
    + `</enviNFe>`;

  return `<?xml version="1.0" encoding="utf-8"?>`
    + `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`
    + ` xmlns:xsd="http://www.w3.org/2001/XMLSchema"`
    + ` xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">`
    + `<soap12:Body>`
    + `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">`
    + enviNFe
    + `</nfeDadosMsg>`
    + `</soap12:Body>`
    + `</soap12:Envelope>`;
}

// ── Enviar para SEFAZ via HTTPS com certificado mútuo ───────────
async function enviarSEFAZ(soapBody, urlStr, certPfxB64, certPassword) {
  const url = new URL(urlStr);
  const { keyPem, certPem, caPems } = extrairPem(certPfxB64, certPassword);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port:     url.port || 443,
      path:     url.pathname + (url.search || ''),
      method:   'POST',
      headers:  {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapBody, 'utf8'),
      },
      key:      keyPem,
      cert:     certPem,
      ca:       caPems,
      rejectUnauthorized: false,  // SEFAZ AM usa certificados ICP-Brasil (pode ter chain issues)
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout SEFAZ (20s)')); });
    req.write(soapBody, 'utf8');
    req.end();
  });
}

// ── Parser simples de tag XML ────────────────────────────────────
function getTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m  = xml.match(re);
  return m ? m[1].trim() : null;
}
function getAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const m  = xml.match(re);
  return m ? m[1] : null;
}

// ── Buscar venda no Supabase ────────────────────────────────────
async function buscarVenda(vendaPk) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/vendas?pk=eq.${vendaPk}&select=*`;
  const r   = await fetch(url, {
    headers: {
      'apikey':        process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
    }
  });
  const data = await r.json();
  if (!r.ok || !data.length) throw new Error('Venda não encontrada');
  return data[0];
}

async function buscarItens(vendaPk) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/itens_venda?venda_pk=eq.${vendaPk}&select=*`;
  const r   = await fetch(url, {
    headers: {
      'apikey':        process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
    }
  });
  return r.json();
}

async function buscarFilial(filialPk) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/filiais?pk=eq.${filialPk}&select=*`;
  const r = await fetch(url, {
    headers: {
      'apikey':        process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
    }
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data[0] || null;
}

async function buscarPagamentos(vendaPk) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/pagamentos_venda?venda_pk=eq.${vendaPk}&select=*`;
  const r   = await fetch(url, {
    headers: {
      'apikey':        process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
    }
  });
  return r.json();
}

async function buscarProdutosFiscais(prodPks) {
  if (!prodPks.length) return [];
  const ids = prodPks.join(',');
  const url = `${process.env.SUPABASE_URL}/rest/v1/produtos?pk=in.(${ids})&select=pk,ncm,cfop,csosn,unidade_comercial`;
  const r   = await fetch(url, {
    headers: {
      'apikey':        process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
    }
  });
  return r.json();
}

async function atualizarVendaNFCe(vendaPk, nfceData) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/vendas?pk=eq.${vendaPk}`;
  await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey':        process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(nfceData),
  });
}

// ── Buscar próximo número NFC-e ──────────────────────────────────
async function proximoNumeroNFCe(filialPk, serie) {
  // Busca o maior número já emitido para esta filial/série
  const url = `${process.env.SUPABASE_URL}/rest/v1/vendas`
    + `?filial_pk=eq.${filialPk}`
    + `&nfce_numero=not.is.null`
    + `&nfce_serie=eq.${serie}`
    + `&select=nfce_numero&order=nfce_numero.desc&limit=1`;
  const r = await fetch(url, {
    headers: {
      'apikey':        process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
    }
  });
  const data = await r.json();
  return (data[0]?.nfce_numero || 0) + 1;
}

// ══════════════════════════════════════════════════════════════════
// Handler principal Vercel
// ══════════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  try {
    const body     = req.body || {};
    const action   = body.action || 'emitir';

    // ── Verificar configuração ───────────────────────────────────
    if (action === 'check') {
      const certB64 = process.env.NFCE_CERT_B64;
      const certPwd = process.env.NFCE_CERT_PASSWORD;
      const csc     = process.env.NFCE_CSC;
      const ie      = process.env.NFCE_IE;
      const amb     = process.env.NFCE_AMBIENTE || '2';

      const status  = {
        cert_configurado: !!certB64,
        senha_configurada: !!certPwd,
        csc_configurado:  !!(csc && csc.length > 0),
        ie_configurada:   !!(ie),
        ambiente:         amb === '1' ? 'Produção' : 'Homologação',
        pronto:           !!(certB64 && certPwd && csc && ie),
      };

      // Validar certificado se configurado
      if (certB64 && certPwd) {
        try {
          const pfxDer  = forge.util.decode64(certB64);
          const pfxAsn1 = forge.asn1.fromDer(pfxDer);
          const p12     = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, certPwd);
          for (const sc of p12.safeContents) {
            for (const sb of sc.safeBags) {
              if (sb.type === forge.pki.oids.certBag && sb.cert) {
                const vaf  = sb.cert.validity.notAfter;
                const hoje = new Date();
                status.cert_valido    = hoje < vaf;
                status.cert_vencimento = vaf.toLocaleDateString('pt-BR');
                status.cert_titular   = sb.cert.subject.getField('CN')?.value || '?';
              }
            }
          }
        } catch (e) {
          status.cert_erro = e.message;
        }
      }

      return res.status(200).json(status);
    }

    // ── Emitir NFC-e ────────────────────────────────────────────
    if (action === 'emitir') {
      const { venda_pk, cpf_consumidor } = body;
      if (!venda_pk) return res.status(400).json({ erro: 'venda_pk não informado' });

      // Buscar dados da venda
      const [venda, itensVenda, pagamentosVenda] = await Promise.all([
        buscarVenda(venda_pk),
        buscarItens(venda_pk),
        buscarPagamentos(venda_pk),
      ]);

      if (venda.nfce_chave) {
        return res.status(400).json({
          erro: 'Esta venda já possui uma NFC-e emitida.',
          chave: venda.nfce_chave,
          protocolo: venda.nfce_protocolo,
        });
      }

      // Buscar dados da filial (usando o filial_pk da venda)
      const filial = await buscarFilial(venda.filial_pk);
      if (!filial) return res.status(404).json({ erro: 'Filial não encontrada' });
      if (!filial.cnpj) {
        return res.status(500).json({ erro: 'Filial sem CNPJ configurado.' });
      }

      // Configurações do certificado (DB ou .env)
      const certB64 = filial.nfce_cert_b64 || process.env.NFCE_CERT_B64;
      const certPwd = filial.nfce_cert_senha || process.env.NFCE_CERT_PASSWORD;

      if (!certB64) {
        return res.status(500).json({
          erro: 'Certificado digital não configurado. Acesse Cadastro de Filiais > Dados Fiscais e faça o upload do arquivo .pfx'
        });
      }
      if (!certPwd) return res.status(500).json({ erro: 'Senha do certificado não configurada.' });

      const csc   = filial.nfce_csc || process.env.NFCE_CSC || '';
      const cscId = filial.nfce_csc_id || process.env.NFCE_CSC_ID || '000001';
      const ie    = filial.ie || process.env.NFCE_IE || '';
      const tpAmb = (filial.nfce_ambiente || '').toString() || process.env.NFCE_AMBIENTE || '2';

      if (!csc) return res.status(500).json({ erro: 'CSC não configurado. Acesse Cadastro de Filiais > Dados Fiscais.' });

      // Mesclar dados fiscais dos produtos
      const prodPks = itensVenda.map(i => i.produto_pk).filter(Boolean);
      const prodsFiscais = await buscarProdutosFiscais(prodPks);
      const fiscalMap = {};
      prodsFiscais.forEach(p => { fiscalMap[p.pk] = p; });

      const itensComFiscal = itensVenda.map(item => ({
        ...item,
        ncm:               fiscalMap[item.produto_pk]?.ncm  || NCM_DEF,
        cfop:              fiscalMap[item.produto_pk]?.cfop || CFOP_DEF,
        csosn:             fiscalMap[item.produto_pk]?.csosn || '400',
        unidade_comercial: fiscalMap[item.produto_pk]?.unidade_comercial || 'UN',
      }));

      // Série e número
      const serie = filial.nfce_serie || 1;
      const numero = await proximoNumeroNFCe(venda.filial_pk, serie);

      // Data
      const dhEmi = dhNFe();
      const aamm  = getAAMM();
      const cNF   = cNFAleatorio();
      const chave = gerarChave(filial.cnpj, aamm, serie, numero, cNF);

      // Cliente para o destinatário
      const clienteData = cpf_consumidor
        ? { cpf: cpf_consumidor, nome: venda.cliente }
        : (venda.cliente ? { nome: venda.cliente } : null);

      // Gerar XML
      const { infNFe, infNFeSupl } = gerarXMLNFCe({
        chave, filial, serie, numero,
        itens:       itensComFiscal,
        pagamentos:  pagamentosVenda,
        cliente:     clienteData,
        total:       venda.total,
        dhEmi, tpAmb, csc, cscId
      });

      // Assinar
      const nfeAssinada = assinarXML(infNFe, infNFeSupl, certB64, certPwd);

      // Montar lote SOAP
      const lote    = Date.now();
      const soap    = montarSOAP(nfeAssinada, tpAmb, lote);
      const urlAuth = tpAmb === '1' ? URL_AUTH_PROD : URL_AUTH_HOM;

      // Enviar para SEFAZ
      const respSOAP = await enviarSEFAZ(soap, urlAuth, certB64, certPwd);

      // Parsear resposta
      let cStat   = getTag(respSOAP, 'cStat');
      let xMotivo = getTag(respSOAP, 'xMotivo') || getTag(respSOAP, 'faultstring') || getTag(respSOAP, 'Text') || 'Resposta irreconhecível da SEFAZ';
      const nProt   = getTag(respSOAP, 'nProt');
      const dhRecbto = getTag(respSOAP, 'dhRecbto');

      if (!cStat) cStat = getTag(respSOAP, 'faultcode') || 'FAULT';

      const autorizada = cStat === '100';

      // Salvar resultado na venda
      const nfceUpdate = {
        nfce_chave:    chave,
        nfce_serie:    serie,
        nfce_numero:   numero,
        nfce_status:   cStat,
        nfce_motivo:   xMotivo,
        nfce_protocolo: nProt || null,
        nfce_ambiente:  tpAmb,
        nfce_xml:      nfeAssinada,
        nfce_qrcode:   gerarQRCode(chave, tpAmb, dhEmi, venda.total, tpAmb === '1' ? URL_QR_PROD : URL_QR_HOM, cpf_consumidor, csc, cscId),
        nfce_dh_emissao: dhEmi,
      };
      await atualizarVendaNFCe(venda_pk, nfceUpdate);

      return res.status(200).json({
        ok:          autorizada,
        cStat,
        xMotivo,
        nProt,
        chave,
        dhRecbto:    dhRecbto || dhEmi,
        qrCode:      nfceUpdate.nfce_qrcode,
        urlConsulta: tpAmb === '1' ? URL_QR_PROD : URL_QR_HOM,
        tpAmb,
        numero,
        serie,
        erro:        autorizada ? null : `SEFAZ: [${cStat}] ${xMotivo}`,
        rawResp:     respSOAP.slice(0, 1000)
      });
    }

    return res.status(400).json({ erro: 'action inválida' });

  } catch (err) {
    console.error('[NFC-e]', err);
    return res.status(500).json({ 
      erro: err.message,
      stack: err.stack,
      cause: err.cause ? err.cause.message : null
    });
  }
};
