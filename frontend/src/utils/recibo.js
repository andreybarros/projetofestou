import { supabase } from '../composables/useSupabase';

// ── Formatadores ──────────────────────────────────────────────────
function fmtMoeda(v) {
  return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Valor por extenso (pt-BR) ─────────────────────────────────────
const UNIDADES = [
  '', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove',
  'Dez', 'Onze', 'Doze', 'Treze', 'Quatorze', 'Quinze', 'Dezesseis', 'Dezessete', 'Dezoito', 'Dezenove',
];
const DEZENAS  = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
const CENTENAS = ['', 'Cento', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos', 'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];

function bloco(n) {
  if (n === 0)   return '';
  if (n === 100) return 'Cem';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let s = c > 0 ? CENTENAS[c] : '';
  if (r === 0) return s;
  if (r < 20)  return (s ? s + ' e ' : '') + UNIDADES[r];
  const d = Math.floor(r / 10);
  const u = r % 10;
  return (s ? s + ' e ' : '') + DEZENAS[d] + (u > 0 ? ' e ' + UNIDADES[u] : '');
}

function valorPorExtenso(valor) {
  const total = Math.round(parseFloat(valor || 0) * 100);
  const reais  = Math.floor(total / 100);
  const cents  = total % 100;
  const partes = [];

  if (reais >= 1000000) {
    const m = Math.floor(reais / 1000000);
    partes.push(bloco(m) + (m === 1 ? ' Milhão' : ' Milhões'));
  }
  const r2 = reais % 1000000;
  if (r2 >= 1000) {
    const mil = Math.floor(r2 / 1000);
    partes.push((mil === 1 ? 'Mil' : bloco(mil) + ' Mil'));
  }
  const r3 = reais % 1000;
  if (r3 > 0) partes.push(bloco(r3));

  let resultado = '';
  if (reais > 0) {
    resultado = partes.join(' e ') + (reais === 1 ? ' Real' : ' Reais');
  }
  if (cents > 0) {
    if (resultado) resultado += ' e ';
    resultado += bloco(cents) + (cents === 1 ? ' Centavo' : ' Centavos');
  }
  return resultado || 'Zero Reais';
}

// ── Endereço da filial ────────────────────────────────────────────
function enderecoFilial(f) {
  const partes = [];
  if (f.logradouro) partes.push(f.logradouro + (f.numero_end ? ', ' + f.numero_end : ''));
  if (f.bairro)     partes.push(f.bairro);
  return partes.join(' — ');
}

// ── Imprimir recibo ───────────────────────────────────────────────
export async function imprimirReciboProj({ projetoPk, filialPk }) {
  // Buscar projeto + cliente
  const { data: proj } = await supabase
    .from('projetos')
    .select('*, clientes(pk, nome, cpf)')
    .eq('pk', projetoPk)
    .single();

  // Buscar filial
  const { data: fil } = await supabase
    .from('filiais')
    .select('nome_fantasia, razao_social, cnpj, logradouro, numero_end, bairro, cidade, uf, cep, telefone')
    .eq('pk', filialPk)
    .single();

  if (!proj || !fil) {
    alert('Não foi possível carregar os dados para impressão.');
    return;
  }

  const hoje    = new Date();
  const dia     = hoje.getDate();
  const mes     = hoje.toLocaleString('pt-BR', { month: 'long' });
  const ano     = hoje.getFullYear();

  const nomeFilial  = fil.nome_fantasia || fil.razao_social || '';
  const cnpjFmt     = String(fil.cnpj || '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  const cepFmt      = String(fil.cep  || '').replace(/(\d{5})(\d{3})/, '$1-$2');
  const nomeCliente = proj.clientes?.nome || 'Cliente';
  const valor       = parseFloat(proj.valor || 0);
  const extenso     = valorPorExtenso(valor);
  const forma       = String(proj.forma_pagamento || '').toLowerCase();

  // Dados de recebimento por forma de pagamento
  const dadosRecebimento = {
    pix:          `PIX: ${cnpjFmt || fil.telefone || '—'}`,
    dinheiro:     'Dinheiro',
    debito:       'Cartão de Débito',
    credito:      'Cartão de Crédito',
    crediario:    'Crediário',
    transferencia:`Transferência Bancária`,
    cheque:       'Cheque',
  };
  const infoReceb = dadosRecebimento[forma] || (forma ? forma : 'A combinar');

  // URL absoluta da logo
  const logoUrl = window.location.origin + '/img/logo.png';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Recibo — ${nomeFilial}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px 30px; line-height: 1.5; }
  .topo { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 14px; }
  .logo { max-height: 60px; max-width: 160px; object-fit: contain; }
  .titulo-recibo { font-size: 22px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #1a1a1a; }
  .corpo { margin-bottom: 18px; }
  .corpo p { font-size: 11.5px; margin-bottom: 6px; text-align: justify; }
  .valor-destaque { font-weight: bold; }
  .secao { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #aaa; }
  .secao-titulo { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 5px; }
  .secao p { font-size: 11.5px; margin-bottom: 3px; }
  .rodape { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .assinatura { text-align: center; width: 280px; }
  .assinatura .linha { border-top: 1px solid #333; margin-bottom: 6px; }
  .assinatura p { font-size: 10.5px; line-height: 1.5; }
  .data-local { font-size: 11px; color: #333; }
  @media print { body { padding: 14px 22px; } }
</style>
</head>
<body>

<div class="topo">
  <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />
  <div class="titulo-recibo">Recibo</div>
</div>

<div class="corpo">
  <p>
    Recebi de <span class="valor-destaque">${nomeCliente}</span> a importância de
    <span class="valor-destaque">${fmtMoeda(valor)}</span>
    (${extenso})
    referente a Prestação de Serviços de Decoração — ${proj.titulo}.
  </p>
</div>

<div class="secao">
  <div class="secao-titulo">Resumo</div>
  <p>Valor total do Serviço: <strong>${fmtMoeda(valor)}</strong></p>
</div>

<div class="secao">
  <div class="secao-titulo">Dados para Recebimento</div>
  <p>${infoReceb}</p>
</div>

<div class="rodape">
  <div class="data-local">
    Manaus, ${dia} de ${mes} de ${ano}.
  </div>

  <div class="assinatura">
    <div class="linha"></div>
    <p>
      <strong>${nomeFilial}</strong><br/>
      ${fil.telefone ? fil.telefone + '<br/>' : ''}
      ${cnpjFmt ? 'CNPJ: ' + cnpjFmt + '<br/>' : ''}
      ${enderecoFilial(fil)}<br/>
      ${cepFmt ? 'CEP: ' + cepFmt + ' ' : ''}${fil.cidade || 'Manaus'}-${fil.uf || 'AM'}
    </p>
  </div>
</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow.addEventListener('afterprint', () => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    });
  };
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 10_000);
}
