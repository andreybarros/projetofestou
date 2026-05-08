import { supabase } from '../composables/useSupabase';

function fmtDt(iso) {
  if (!iso) return '_______________';
  return iso.slice(0, 10).split('-').reverse().join('/');
}

function fmtMoeda(v) {
  return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function endereco(cli) {
  const partes = [];
  if (cli.logradouro) partes.push(cli.logradouro + (cli.numero ? ', ' + cli.numero : ''));
  if (cli.bairro) partes.push(cli.bairro);
  if (cli.cep) partes.push(cli.cep);
  return partes.join(' - ');
}

export async function imprimirContratoLocacao({ vendaPk, cpfNota, pagamentos, itens, total }) {
  let cli = {};
  let dataRetirada  = '';
  let dataDevolucao = '';

  if (vendaPk) {
    const { data: venda } = await supabase
      .from('vendas')
      .select('data_locacao, data_devolucao_prevista, cliente_pk')
      .eq('pk', vendaPk)
      .single();

    if (venda) {
      dataRetirada  = venda.data_locacao            || '';
      dataDevolucao = venda.data_devolucao_prevista || '';

      if (venda.cliente_pk) {
        const { data: clienteDB } = await supabase
          .from('clientes')
          .select('pk, nome, cpf, telefone, logradouro, numero, bairro, cep, data_nascimento')
          .eq('pk', venda.cliente_pk)
          .single();
        if (clienteDB) cli = clienteDB;
      }
    }
  }

  const hoje = new Date();
  const dia  = hoje.getDate();
  const mes  = hoje.toLocaleString('pt-BR', { month: 'long' });
  const ano  = hoje.getFullYear();

  const formas = ['dinheiro', 'pix', 'débito', 'crédito', 'crediário'];
  const checksHtml = formas.map(f => {
    const ativo = pagamentos.some(p => p.forma.toLowerCase() === f);
    return `<div class="check-item"><span class="check-box">${ativo ? '✓' : ''}</span> ${f.charAt(0).toUpperCase() + f.slice(1)}</div>`;
  }).join('');

  const itensHtml = itens.map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${it.nome}</td>
      <td style="text-align:center">${it.qtd}</td>
      <td>${fmtMoeda(it.preco_unitario)}</td>
      <td style="text-align:center">${it.desconto_pct > 0 ? it.desconto_pct + '%' : '—'}</td>
      <td>${fmtMoeda(it.preco_total)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Contrato de Locação — Festou</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 14px 22px; line-height: 1.35; }
  h1 { font-size: 12px; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  h2 { font-size: 10px; text-align: center; font-weight: normal; margin-bottom: 8px; color: #444; }
  .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #333; margin: 7px 0 4px; padding-bottom: 1px; }
  .row { display: flex; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
  .field { flex: 1; min-width: 120px; }
  .field label { font-size: 8px; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 1px; color: #555; }
  .field .val { border-bottom: 1px solid #555; padding-bottom: 1px; min-height: 14px; word-break: break-word; }
  .pagamento-checks { display: flex; gap: 12px; margin-bottom: 4px; flex-wrap: wrap; }
  .check-item { display: flex; align-items: center; gap: 3px; font-size: 10px; }
  .check-box { width: 10px; height: 10px; border: 1px solid #333; display: inline-block; line-height: 10px; text-align: center; font-size: 9px; }
  .itens-table { width: 100%; border-collapse: collapse; margin-top: 3px; }
  .itens-table th, .itens-table td { border: 1px solid #aaa; padding: 3px 5px; font-size: 9px; }
  .itens-table th { background: #f0f0f0; font-weight: bold; }
  .itens-table td:last-child { text-align: right; }
  .total-line { text-align: right; font-weight: bold; font-size: 10px; margin-top: 4px; }
  .clausulas { margin-top: 6px; }
  .clausulas p { font-size: 8.5px; margin-bottom: 2px; text-align: justify; line-height: 1.3; }
  .assinaturas { display: flex; justify-content: space-between; margin-top: 14px; }
  .assin { width: 45%; border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 9px; }
  @media print { body { padding: 10px 18px; } }
</style>
</head>
<body>
<h1>Contrato de Prestação de Serviço</h1>
<h2>Locação de Móveis de Decoração</h2>

<div class="section-title">Dados do Contratante</div>
<div class="row">
  <div class="field"><label>Nome completo</label><div class="val">${cli.nome || ''}</div></div>
  <div class="field" style="max-width:200px"><label>CPF</label><div class="val">${cli.cpf || cpfNota || ''}</div></div>
</div>
<div class="row">
  <div class="field"><label>RG</label><div class="val"> </div></div>
  <div class="field"><label>Telefone</label><div class="val">${cli.telefone || ''}</div></div>
  <div class="field"><label>Data de Nascimento</label><div class="val">${cli.data_nascimento ? new Date(cli.data_nascimento).toLocaleDateString('pt-BR') : ''}</div></div>
</div>
<div class="row">
  <div class="field"><label>Endereço</label><div class="val">${endereco(cli)}</div></div>
</div>

<div class="section-title">Dados da Contratada</div>
<div class="row">
  <div class="field"><label>Nome</label><div class="val">ANDREY RONALD BARROS DA CONCEIÇÃO</div></div>
  <div class="field"><label>CPF/CNPJ</label><div class="val">56.918.133/0001-04</div></div>
</div>
<div class="row">
  <div class="field"><label>Endereço</label><div class="val">ALAMEDA COSME FERREIRA 6893 — ZUMBI DOS PALMARES, MANAUS-AM</div></div>
  <div class="field" style="max-width:200px"><label>Telefone</label><div class="val">(92) 98612-5736</div></div>
</div>

<div class="section-title">Forma de Pagamento</div>
<div class="pagamento-checks">${checksHtml}</div>
<div class="row">
  <div class="field"><label>Valor total</label><div class="val"><strong>${fmtMoeda(total)}</strong></div></div>
  <div class="field"><label>Data da retirada</label><div class="val">${fmtDt(dataRetirada)}</div></div>
  <div class="field"><label>Data de devolução</label><div class="val">${fmtDt(dataDevolucao)}</div></div>
</div>

<div class="section-title">Acessórios Locados</div>
<table class="itens-table">
  <thead><tr><th>#</th><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Desc.</th><th>Total</th></tr></thead>
  <tbody>${itensHtml}</tbody>
</table>
<div class="total-line">TOTAL: ${fmtMoeda(total)}</div>

<div class="clausulas">
<div class="section-title">Cláusulas Contratuais</div>
<p>1. A locação terá a duração acordada entre as partes; a devolução deverá ocorrer na data informada, caso contrário será cobrado o mesmo valor da locação por dia adicional.</p>
<p>2. O pagamento total deverá ser efetuado no ato da locação. O frete será cobrado conforme tabela do estabelecimento.</p>
<p>3. Em caso de extravio, danos ou quebra, o contratante deverá repor a peça por outra nova de mesma especificação ou pagar o valor correspondente (incluindo frete). Se a peça integrar conjunto, o conjunto inteiro deverá ser reposto.</p>
<p>4. O pagamento de reposição deverá ser realizado na devolução, sob pena de multa equivalente ao dobro do valor da peça. A não devolução configurará apropriação indébita.</p>
<p>5. Peças devolvidas sujas, arranhadas ou com avarias sujeitam o contratante a cobrança de até 20% do valor de reposição.</p>
<p>6. Cancelamento com até 7 dias de antecedência: sem ônus. Entre 7 dias e 24h: multa de 50%. Em até 24h da retirada ou após pagamento: multa de 100%, sem devolução.</p>
<p>7. Todo material de transporte deverá ser devolvido nas mesmas condições recebidas. Fica eleito o foro de Manaus-AM para dirimir quaisquer litígios.</p>
</div>

<p style="margin-top:10px; text-align:center; font-size:9px">Manaus, ${dia} de ${mes} de ${ano}.</p>
<div class="assinaturas">
  <div class="assin">LOCADOR<br/></div>
  <div class="assin">LOCATÁRIO(A)<br/>${cli.nome || '_______________________________'}</div>
</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

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
