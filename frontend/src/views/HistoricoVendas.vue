<template>
  <div class="hist-wrap">
    <div class="hist-header">
      <div class="header-main">
        <h2 class="page-title">Histórico de Vendas</h2>
        <div class="stats-pills">
          <span class="stat-pill"><strong>{{ totalRegistros }}</strong> vendas</span>
        </div>
      </div>

      <div class="filtros-bar">
        <div class="search-group">
          <span class="material-symbols-outlined search-icon">search</span>
          <input v-model="busca" type="text" placeholder="Número, cliente ou operador..." class="busca-input-v2" @keyup.enter="carregar(0)" />
        </div>

        <div class="filter-group">
          <div class="date-range-group">
            <input type="date" v-model="dataInicio" class="date-input-v2" title="Data inicial" />
            <span class="date-sep">até</span>
            <input type="date" v-model="dataFim" class="date-input-v2" title="Data final" />
          </div>

          <select v-model="filtroStatus" class="sel-input-v2">
            <option value="">Todos Status</option>
            <option value="finalizada">Finalizadas</option>
            <option value="devolvida">Devolvidas</option>
            <option value="cancelada">Canceladas</option>
          </select>

          <button @click="carregar(0)" class="btn-refresh" title="Atualizar">
            <span class="material-symbols-outlined">refresh</span>
          </button>
          <button @click="limparFiltros" class="btn-clear" title="Limpar Filtros">
            <span class="material-symbols-outlined">filter_alt_off</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="carregando" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando histórico...</p>
    </div>

    <div v-else-if="vendas.length === 0" class="vazio">
      <span class="material-symbols-outlined empty-icon">inventory_2</span>
      <p>Nenhuma venda encontrada para os filtros selecionados.</p>
    </div>

    <div v-else class="tabela-container custom-scroll">
      <table class="tabela-v2">
        <thead>
          <tr>
            <th>Nº Venda</th>
            <th>Data / Hora</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Tipo</th>
            <th>Total</th>
            <th>Status</th>
            <th>NFC-e</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in vendas" :key="v.pk" @click="abrirDetalhe(v)">
            <td class="col-num">#{{ v.numero }}</td>
            <td class="col-date">{{ fmtDate(v.criado_em) }}</td>
            <td class="col-client">{{ v.cliente || "Consumidor Final" }}</td>
            <td class="col-op">{{ v.vendedor || v.operador || "—" }}</td>
            <td>
              <span :class="['type-pill', v.tipo_venda === 'locacao' ? 'loc' : 'vnd']">
                {{ v.tipo_venda === 'locacao' ? 'Locação' : 'Venda' }}
              </span>
            </td>
            <td class="col-total">{{ fmt(v.total) }}</td>
            <td>
              <span :class="['status-badge', statusCls(v.status)]">{{ v.status }}</span>
            </td>
            <td>
              <div v-if="v.nfce_chave" class="nfce-status authorized">
                <span class="material-symbols-outlined">check_circle</span>
                <span>Emitida</span>
              </div>
              <div v-else class="nfce-status pending">
                <span class="material-symbols-outlined">hourglass_empty</span>
                <span>Pendente</span>
              </div>
            </td>
            <td @click.stop class="text-right">
              <div class="actions-group">
                <button v-if="v.tipo_venda !== 'locacao'"
                  @click="abrirDetalheEImprimir(v)" class="action-btn print" title="Reimprimir Recibo">
                  <span class="material-symbols-outlined">print</span>
                </button>
                <button v-if="v.status === 'finalizada'"
                  @click="confirmarDevolucao(v)" class="action-btn return" title="Devolução">
                  <span class="material-symbols-outlined">settings_backup_restore</span>
                </button>
                <button @click="confirmarExclusao(v)" class="action-btn delete" title="Excluir Venda">
                  <span class="material-symbols-outlined">delete</span>
                </button>
                <button @click="abrirDetalhe(v)" class="action-btn view" title="Ver Detalhes">
                  <span class="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination-bar">
        <button :disabled="paginaAtual === 0" @click="carregar(paginaAtual - 1)" class="pag-btn">
          <span class="material-symbols-outlined">chevron_left</span> Anterior
        </button>
        <span class="pag-info">Página {{ paginaAtual + 1 }} de {{ totalPaginas }}</span>
        <button :disabled="paginaAtual + 1 >= totalPaginas" @click="carregar(paginaAtual + 1)" class="pag-btn">
          Próxima <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>

    <!-- Modal Detalhe -->
    <Teleport to="body">
      <div v-if="detalhe" class="modal-bg" @click.self="fecharDetalhe">
        <div class="modal det-modal">

          <div class="det-modal-header">
            <div>
              <h3 class="det-title">Venda #{{ detalhe.numero }}</h3>
              <p class="det-sub">{{ fmtDate(detalhe.criado_em) }}</p>
            </div>
            <div class="det-header-right">
              <span :class="['status-badge', statusCls(detalhe.status)]">{{ detalhe.status }}</span>
              <button @click="fecharDetalhe" class="btn-close-x">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="det-meta-grid">
            <div class="det-meta-item">
              <span class="det-meta-label">Cliente</span>
              <span class="det-meta-val">{{ detalhe.cliente || 'Consumidor Final' }}</span>
            </div>
            <div class="det-meta-item">
              <span class="det-meta-label">Vendedor</span>
              <span class="det-meta-val">{{ detalhe.vendedor || detalhe.operador || '—' }}</span>
            </div>
            <div class="det-meta-item">
              <span class="det-meta-label">Tipo</span>
              <span class="det-meta-val">{{ detalhe.tipo_venda === 'locacao' ? 'Locação' : 'Venda' }}</span>
            </div>
            <div v-if="detalhe.nfce_chave" class="det-meta-item">
              <span class="det-meta-label">NFC-e</span>
              <span class="det-meta-val" style="color:#059669;font-weight:800">Autorizada</span>
            </div>
          </div>

          <div v-if="detalheCarregando" class="det-loading">
            <div class="spinner-sm"></div>
            <span>Carregando itens...</span>
          </div>

          <template v-else>
            <div class="det-section">
              <h4 class="det-section-title">
                <span class="material-symbols-outlined">shopping_bag</span>
                Itens ({{ detalheItens.length }})
              </h4>
              <table class="det-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th class="tr">Qtd</th>
                    <th class="tr">Unit.</th>
                    <th class="tr">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in detalheItens" :key="it.pk">
                    <td>
                      <span class="det-item-nome">{{ it.descricao }}</span>
                      <span v-if="it.desconto_val > 0" class="det-disc">− {{ fmt(it.desconto_val) }}</span>
                    </td>
                    <td class="tr mono">{{ it.qtd }}</td>
                    <td class="tr mono">{{ fmt(it.preco_unit) }}</td>
                    <td class="tr mono bold">{{ fmt(it.total_item) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="det-section">
              <h4 class="det-section-title">
                <span class="material-symbols-outlined">payments</span>
                Pagamentos
              </h4>
              <div class="det-pags">
                <div v-for="p in detalhePagamentos" :key="p.pk" class="det-pag-row">
                  <span class="det-pag-forma">{{ p.forma }}</span>
                  <span class="det-pag-val">{{ fmt(p.valor) }}</span>
                </div>
              </div>
              <div class="det-total-row">
                <span>TOTAL</span>
                <span>{{ fmt(detalhe.total) }}</span>
              </div>
            </div>
          </template>

          <div class="det-actions">
            <button @click="fecharDetalhe" class="det-btn-fechar">Fechar</button>
            <button v-if="detalhe.tipo_venda !== 'locacao'" @click="reimprimirRecibo" class="det-btn-print" :disabled="detalheCarregando">
              <span class="material-symbols-outlined">print</span>
              Reimprimir Recibo
            </button>
            <button v-if="!detalhe.nfce_chave && detalhe.status === 'finalizada'"
              @click="emitirNFCeDetalhe" class="det-btn-nfce" :disabled="emitindoPk === detalhe.pk">
              <span class="material-symbols-outlined">{{ emitindoPk === detalhe.pk ? 'sync' : 'receipt_long' }}</span>
              {{ emitindoPk === detalhe.pk ? 'Emitindo...' : 'Emitir NFC-e' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal NFC-e autorizada -->
    <Teleport to="body">
      <div v-if="nfceResult" class="modal-bg" @click.self="nfceResult = null">
        <div class="modal modal-nfce">
          <div class="nfce-ok-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <h3>NFC-e Autorizada</h3>
          <div class="nfce-actions">
            <button v-if="nfceResult.danfe" @click="imprimirDanfe(nfceResult.danfe)" class="det-btn-print">
              <span class="material-symbols-outlined">print</span>
              Imprimir DANFE
            </button>
            <button @click="nfceResult = null" class="det-btn-fechar">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Devolução -->
    <Teleport to="body">
      <div v-if="showModalDevolucao" class="modal-bg" @click.self="showModalDevolucao = false">
        <div class="modal dev-modal">
          <div class="dev-header">
            <span class="material-symbols-outlined dev-icon">settings_backup_restore</span>
            <h3>Devolução de Venda #{{ vendaParaDevolver?.numero }}</h3>
          </div>
          <p class="dev-alert">Esta ação irá estornar o estoque dos produtos e registrar a saída no caixa.</p>
          <div class="field">
            <label>Motivo da Devolução</label>
            <textarea v-model="motivoDevolucao" placeholder="Ex: Cliente desistiu da compra..." class="dev-textarea"></textarea>
          </div>
          <div class="dev-actions">
            <button @click="showModalDevolucao = false" class="det-btn-fechar" :disabled="carregando">Voltar</button>
            <button @click="processarDevolucao" class="btn-confirmar-dev" :disabled="carregando">Confirmar Devolução</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Transition name="toast">
      <div v-if="toastShow" :class="['toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useSessaoStore }  from "../stores/sessao";
import { supabase }        from "../composables/useSupabase";
import apiClient           from "../services/api";

const sessaoStore = useSessaoStore();

const vendas         = ref([]);
const carregando     = ref(false);
const busca          = ref("");
const filtroStatus   = ref("");
const emitindoPk     = ref(null);
const detalhe        = ref(null);
const detalheItens       = ref([]);
const detalhePagamentos  = ref([]);
const detalheCarregando  = ref(false);
const nfceResult     = ref(null);
const toastMsg   = ref('');
const toastTipo  = ref('ok');
const toastShow  = ref(false);

const dataInicio = ref('');
const dataFim    = ref('');

const limit          = 20;
const totalRegistros = ref(0);
const paginaAtual    = ref(0);
const totalPaginas   = computed(() => Math.ceil(totalRegistros.value / limit) || 1);

const showModalDevolucao = ref(false);
const vendaParaDevolver  = ref(null);
const motivoDevolucao    = ref("");

let toastTimer = null;
function toast(msg, tipo = 'ok', ms = 4000) {
  toastMsg.value = msg; toastTipo.value = tipo; toastShow.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastShow.value = false; }, ms);
}

onMounted(() => carregar(0));

async function carregar(pagina = 0) {
  carregando.value = true;
  paginaAtual.value = pagina;
  try {
    const params = {
      filial_pk: sessaoStore.filial?.pk,
      inicio:    dataInicio.value,
      fim:       dataFim.value,
      status:    filtroStatus.value,
      busca:     busca.value,
      limit,
      offset:    pagina * limit
    };
    const resp = await apiClient.get("/api/vendas", { params });
    vendas.value         = resp.data.data || [];
    totalRegistros.value = resp.data.count || 0;
  } catch (e) {
    toast("Erro ao carregar: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function limparFiltros() {
  busca.value = ""; filtroStatus.value = "";
  dataInicio.value = ''; dataFim.value = '';
  carregar(0);
}

async function confirmarExclusao(v) {
  if (!confirm(`Deseja EXCLUIR a venda #${v.numero}? Esta ação retornará os produtos ao estoque e NÃO pode ser desfeita.`)) return;
  carregando.value = true;
  try {
    const resp = await apiClient.delete(`/api/vendas/${v.pk}`);
    if (resp.data.ok) { toast("Venda excluída e estoque estornado."); await carregar(paginaAtual.value); }
  } catch (e) {
    toast("Erro ao excluir: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

async function abrirDetalhe(v) {
  detalhe.value = v;
  detalheItens.value = [];
  detalhePagamentos.value = [];
  detalheCarregando.value = true;
  try {
    const [ri, rp] = await Promise.all([
      supabase.from('itens_venda').select('*').eq('venda_pk', v.pk).order('pk'),
      supabase.from('pagamentos_venda').select('*').eq('venda_pk', v.pk).order('pk'),
    ]);
    detalheItens.value      = ri.data || [];
    detalhePagamentos.value = rp.data || [];
  } catch (e) {
    toast('Erro ao carregar detalhes.', 'err');
  } finally {
    detalheCarregando.value = false;
  }
}

async function abrirDetalheEImprimir(v) {
  await abrirDetalhe(v);
  reimprimirRecibo();
}

function fecharDetalhe() { detalhe.value = null; }

function reimprimirRecibo() {
  const v    = detalhe.value;
  const itens = detalheItens.value;
  const pags  = detalhePagamentos.value;
  const fmtDt = (d) => new Date(d).toLocaleDateString('pt-BR') + ' ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const linhaItens = itens.map(it => {
    const disc = it.desconto_val > 0 ? ` (-${fmt(it.desconto_val)})` : '';
    return `
      <tr>
        <td>${it.descricao}${disc}<br/><span style="font-size:13px;font-weight:bold">${it.qtd} × ${fmt(it.preco_unit)}</span></td>
        <td style="text-align:right;white-space:nowrap;font-weight:bold">${fmt(it.total_item)}</td>
      </tr>`;
  }).join('');

  const linhaPags = pags.map(p =>
    `<tr><td style="text-transform:capitalize">${p.forma}</td><td style="text-align:right">${fmt(p.valor)}</td></tr>`
  ).join('');

  const totalPago = pags.reduce((s, p) => s + parseFloat(p.valor || 0), 0);
  const troco     = Math.max(0, totalPago - parseFloat(v.total || 0));

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Recibo #${v.numero}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 13px; color: #000; width: 320px; margin: 0 auto; padding: 20px 10px; }
  .center { text-align: center; }
  .sep    { border: none; border-top: 1px dashed #555; margin: 8px 0; }
  h1 { font-size: 16px; text-align: center; font-family: Arial, sans-serif; font-weight: 900; letter-spacing: 1px; }
  h2 { font-size: 11px; text-align: center; font-weight: bold; color: #000; margin-bottom: 2px; }
  .dnf { font-size: 11px; text-align: center; border: 1px solid #000; padding: 3px 8px; display: inline-block; margin: 6px auto 2px; letter-spacing: .5px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 2px; vertical-align: top; font-size: 13px; font-weight: bold; }
  .total-line { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 4px; }
  .sub-line   { display: flex; justify-content: space-between; font-size: 12px; color: #000; font-weight: bold; margin-top: 2px; }
  .rodape { font-size: 11px; text-align: center; color: #000; font-weight: bold; margin-top: 10px; line-height: 1.7; }
  @media print { body { padding: 4px; } }
</style>
</head>
<body>
<h1>FESTOU</h1>
<h2>Locações e Decorações</h2>
<h2>CNPJ: 56.918.133/0001-04</h2>
<h2>Alameda Cosme Ferreira 6893 — Manaus/AM</h2>
<div class="center"><span class="dnf">DOCUMENTO NÃO FISCAL</span></div>
<hr class="sep"/>
<div class="sub-line"><span>Nº da venda</span><span>#${v.numero}</span></div>
<div class="sub-line"><span>Data/hora</span><span>${fmtDt(new Date(v.criado_em))}</span></div>
${v.cliente ? `<div class="sub-line"><span>Cliente</span><span>${v.cliente}</span></div>` : ''}
<div class="sub-line"><span>Vendedor</span><span>${v.vendedor || v.operador || '—'}</span></div>
<hr class="sep"/>
<table>${linhaItens}</table>
<hr class="sep"/>
<div class="total-line"><span>TOTAL</span><span>${fmt(v.total)}</span></div>
<hr class="sep"/>
<table>${linhaPags}</table>
${troco > 0.009 ? `<div class="sub-line"><span>Troco</span><span>${fmt(troco)}</span></div>` : ''}
<hr class="sep"/>
<div class="rodape">Obrigado pela preferência!<br/>Este documento não tem valor fiscal.</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 10_000);
}

async function emitirNFCeDetalhe() {
  const v = detalhe.value;
  emitindoPk.value = v.pk;
  try {
    const resp = await apiClient.post("/api/nfce/emitir", { venda_pk: v.pk });
    if (resp.data.ok) {
      nfceResult.value = resp.data;
      detalhe.value = { ...v, nfce_chave: resp.data.chave || 'emitida' };
      await carregar(paginaAtual.value);
    } else {
      toast(resp.data.erro || 'NFC-e rejeitada', 'err');
    }
  } catch (e) {
    toast("Erro: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    emitindoPk.value = null;
  }
}

function confirmarDevolucao(v) {
  vendaParaDevolver.value = v;
  motivoDevolucao.value = "";
  showModalDevolucao.value = true;
}

async function processarDevolucao() {
  const v = vendaParaDevolver.value;
  if (!v) return;
  carregando.value = true;
  try {
    const resp = await apiClient.post("/api/vendas/devolver", { venda_pk: v.pk, motivo: motivoDevolucao.value });
    if (resp.data.ok) {
      toast(`Venda #${v.numero} devolvida com sucesso!`);
      showModalDevolucao.value = false;
      await carregar(paginaAtual.value);
    }
  } catch (e) {
    toast("Erro: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function imprimirDanfe(base64) {
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const blob = new Blob([buf], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob), '_blank');
}

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function statusCls(s) {
  if (s === "finalizada") return "ok";
  if (s === "devolvida")  return "warn";
  if (s === "cancelada")  return "err";
  return "muted";
}
</script>

<style scoped>
.hist-wrap { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 0.3s ease-out; color: var(--text); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.hist-header  { display: flex; flex-direction: column; gap: 1.25rem; }
.header-main  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.page-title   { margin: 0; font-size: 1.6rem; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.stats-pills  { display: flex; gap: .75rem; }
.stat-pill    { padding: .4rem 1.2rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 50px; font-size: .85rem; color: var(--text); font-weight: 600; }
.stat-pill strong { color: var(--primary); }

.filtros-bar  { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--bg2); padding: 1rem; border-radius: 16px; border: 1px solid var(--border); flex-wrap: wrap; }
.search-group { position: relative; flex: 1; min-width: 280px; }
.search-icon  { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 20px; color: var(--primary); opacity: .7; }
.busca-input-v2 { width: 100%; padding: .75rem 1rem .75rem 2.8rem; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text); font-size: .95rem; transition: all .2s; outline: none; }
.busca-input-v2:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.filter-group { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.date-range-group { display: flex; align-items: center; gap: 6px; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; padding: 0 12px; height: 48px; }
.date-input-v2 { background: transparent; border: none; color: var(--text); font-size: .85rem; outline: none; cursor: pointer; font-weight: 600; width: 130px; }
.date-sep { font-size: .75rem; color: var(--text2); font-weight: 800; opacity: .5; }
.sel-input-v2 { padding: .75rem 1rem; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text); font-size: .9rem; outline: none; cursor: pointer; min-width: 160px; font-weight: 600; }
.btn-refresh  { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--primary); color: #fff; border: none; border-radius: 12px; cursor: pointer; transition: all .2s; }
.btn-refresh:hover { filter: brightness(1.1); transform: rotate(45deg); }
.btn-clear    { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--bg3); color: var(--text2); border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all .2s; }
.btn-clear:hover { background: #fee2e2; color: #ef4444; border-color: #ef4444; }

/* Tabela */
.tabela-container { background: var(--bg2); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; }
.tabela-v2 { width: 100%; border-collapse: collapse; }
.tabela-v2 th { background: var(--bg3); padding: 1rem; text-align: left; font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; color: var(--text2); border-bottom: 2px solid var(--border); }
.tabela-v2 td { padding: 1rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.tabela-v2 tr:last-child td { border-bottom: none; }
.tabela-v2 tr:hover td { background: var(--bg3); cursor: pointer; }
.col-num    { font-weight: 800; color: var(--primary); }
.col-date   { font-size: .85rem; }
.col-total  { font-weight: 800; color: #10b981; }
.text-right { text-align: right; }

.type-pill  { padding: 3px 10px; border-radius: 20px; font-size: .7rem; font-weight: 800; }
.type-pill.vnd { background: rgba(99,102,241,.1); color: var(--primary); }
.type-pill.loc { background: rgba(245,158,11,.1); color: #d97706; }

.status-badge { padding: .35rem .9rem; border-radius: 8px; font-size: .7rem; font-weight: 800; text-transform: uppercase; display: inline-flex; }
.status-badge.ok   { background: #d1fae5; color: #065f46; }
.status-badge.warn { background: #fef3c7; color: #92400e; }
.status-badge.err  { background: #fee2e2; color: #991b1b; }

.nfce-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }
.nfce-status .material-symbols-outlined { font-size: 13px; }
.nfce-status.authorized { background: #d1fae5; color: #065f46; }
.nfce-status.pending    { background: var(--bg3); color: var(--text2); }

.actions-group { display: flex; gap: .5rem; justify-content: flex-end; }
.action-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); cursor: pointer; transition: all .18s; display: flex; align-items: center; justify-content: center; }
.action-btn .material-symbols-outlined { font-size: 17px; }
.action-btn:hover { transform: scale(1.08); }
.action-btn.delete:hover { border-color: #ef4444; color: #ef4444; background: #fee2e2; }
.action-btn.print:hover  { border-color: var(--primary); color: var(--primary); background: rgba(99,102,241,.1); }
.action-btn.view:hover   { border-color: #06b6d4; color: #06b6d4; background: rgba(6,182,212,.1); }
.action-btn.return:hover { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,.1); }

/* Paginação */
.pagination-bar { display: flex; align-items: center; justify-content: center; gap: 2rem; padding: 1.25rem; background: var(--bg3); border-top: 1px solid var(--border); }
.pag-btn { display: flex; align-items: center; gap: 6px; padding: .55rem 1.1rem; border-radius: 10px; border: 1px solid var(--border); background: var(--bg2); color: var(--text); font-weight: 700; cursor: pointer; transition: all .2s; font-size: .85rem; }
.pag-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.pag-btn:disabled { opacity: .4; cursor: not-allowed; }
.pag-info { font-weight: 700; font-size: .9rem; color: var(--text2); }

/* Loading / Empty */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem; color: var(--text2); }
.vazio { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem; color: var(--text2); }
.empty-icon { font-size: 3rem; opacity: .3; }
.spinner { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s infinite linear; }

/* ── Modal Detalhe ─────────────────────────── */
.modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; width: 100%; max-width: 600px; box-shadow: 0 24px 60px rgba(0,0,0,.4); overflow: hidden; }

.det-modal { max-width: 640px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }

.det-modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.det-title { margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--text); }
.det-sub   { margin: 3px 0 0; font-size: .82rem; color: var(--text2); }
.det-header-right { display: flex; align-items: center; gap: .75rem; }
.btn-close-x { width: 32px; height: 32px; border: 1px solid var(--border); background: var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text2); transition: all .15s; }
.btn-close-x:hover { background: #fee2e2; color: #ef4444; border-color: #ef4444; }
.btn-close-x .material-symbols-outlined { font-size: 18px; }

.det-meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: .75rem; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.det-meta-item { display: flex; flex-direction: column; gap: 2px; }
.det-meta-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); }
.det-meta-val   { font-size: .9rem; font-weight: 700; color: var(--text); }

.det-loading { display: flex; align-items: center; gap: .75rem; padding: 2rem 1.5rem; color: var(--text2); font-size: .9rem; }
.spinner-sm  { width: 20px; height: 20px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .7s infinite linear; flex-shrink: 0; }

.det-section { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); overflow-y: auto; }
.det-section-title { display: flex; align-items: center; gap: .4rem; font-size: .8rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); margin-bottom: .75rem; }
.det-section-title .material-symbols-outlined { font-size: 16px; }

.det-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.det-table th { padding: .4rem .5rem; text-align: left; font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); border-bottom: 1px solid var(--border); }
.det-table td { padding: .6rem .5rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.det-table tr:last-child td { border-bottom: none; }
.det-item-nome { font-weight: 700; display: block; }
.det-disc { font-size: .75rem; color: #ef4444; font-weight: 700; margin-left: .25rem; }
.tr   { text-align: right; }
.mono { font-family: monospace; font-size: .85rem; }
.bold { font-weight: 800; }

.det-pags { display: flex; flex-direction: column; gap: .4rem; margin-bottom: .75rem; }
.det-pag-row  { display: flex; justify-content: space-between; font-size: .9rem; }
.det-pag-forma { text-transform: capitalize; color: var(--text); font-weight: 600; }
.det-pag-val   { font-weight: 700; color: var(--text); font-family: monospace; }
.det-total-row { display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 800; color: var(--text); padding-top: .6rem; border-top: 2px solid var(--border); }

.det-actions { display: flex; gap: .75rem; padding: 1rem 1.5rem; background: var(--bg3); flex-shrink: 0; flex-wrap: wrap; }
.det-btn-fechar { padding: .6rem 1.2rem; border: 1px solid var(--border); background: var(--bg2); color: var(--text); border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; transition: all .15s; }
.det-btn-fechar:hover { background: var(--bg3); }
.det-btn-print { display: flex; align-items: center; gap: .4rem; padding: .6rem 1.2rem; border: none; background: var(--primary); color: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; transition: opacity .15s; }
.det-btn-print:hover:not(:disabled) { opacity: .88; }
.det-btn-print:disabled { opacity: .5; cursor: not-allowed; }
.det-btn-nfce { display: flex; align-items: center; gap: .4rem; padding: .6rem 1.2rem; border: none; background: #7c3aed; color: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; transition: opacity .15s; }
.det-btn-nfce:hover:not(:disabled) { opacity: .88; }
.det-btn-nfce:disabled { opacity: .5; cursor: not-allowed; }
.det-btn-print .material-symbols-outlined,
.det-btn-nfce  .material-symbols-outlined { font-size: 17px; }

/* NFC-e result modal */
.modal-nfce { text-align: center; padding: 2.5rem 2rem; }
.nfce-ok-icon { font-size: 3rem; color: #10b981; margin-bottom: .5rem; }
.nfce-ok-icon .material-symbols-outlined { font-size: 3.5rem; }
.modal-nfce h3 { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 1.5rem; }
.nfce-actions { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }

/* Devolução */
.dev-modal  { padding: 1.75rem; }
.dev-header { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
.dev-icon   { font-size: 2rem; color: #f59e0b; }
.dev-header h3 { font-size: 1.1rem; font-weight: 800; color: var(--text); }
.dev-alert  { font-size: .85rem; color: #b45309; background: #fef3c7; padding: .75rem 1rem; border-radius: 10px; margin-bottom: 1rem; }
.field label { display: block; font-size: .82rem; font-weight: 700; color: var(--text2); margin-bottom: .4rem; }
.dev-textarea { width: 100%; min-height: 90px; padding: .75rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: .9rem; resize: vertical; outline: none; }
.dev-textarea:focus { border-color: var(--primary); }
.dev-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1rem; }
.btn-confirmar-dev { padding: .6rem 1.4rem; border: none; background: #ef4444; color: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; }
.btn-confirmar-dev:hover { opacity: .88; }
.btn-confirmar-dev:disabled { opacity: .5; cursor: not-allowed; }

/* Toast */
.toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); padding: 1rem 2rem; border-radius: 14px; color: #fff; font-weight: 700; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,.2); white-space: nowrap; }
.toast.ok  { background: #10b981; }
.toast.err { background: #ef4444; }
.toast-enter-active, .toast-leave-active { transition: all .3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
