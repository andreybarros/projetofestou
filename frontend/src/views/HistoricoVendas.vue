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
            <th>Operador</th>
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
            <td class="col-op">{{ v.operador || "—" }}</td>
            <td>
              <span :class="['type-pill', v.tipo_venda === 'locacao' ? 'loc' : 'vnd']">
                {{ v.tipo_venda === 'locacao' ? 'Locação' : 'Venda' }}
              </span>
            </td>
            <td class="col-total">{{ fmt(v.total) }}</td>
            <td>
              <span :class="['status-badge', statusCls(v.status)]">
                {{ v.status }}
              </span>
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
                <button v-if="!v.nfce_chave && v.status === 'finalizada'"
                  @click="emitirNFCe(v)" class="action-btn nfce" title="Emitir NFC-e" :disabled="emitindoPk === v.pk">
                  <span class="material-symbols-outlined">{{ emitindoPk === v.pk ? 'sync' : 'receipt_long' }}</span>
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

      <!-- Paginação -->
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

    <!-- Modais (Mesma lógica mas com ajustes de estilo) -->
    <!-- Modal detalhe -->
    <div v-if="detalhe" class="modal-bg" @click.self="detalhe = null">
      <div class="modal">
        <h3>Venda #{{ detalhe.numero }}</h3>
        <div class="det-row"><span>Data</span><span>{{ fmtDate(detalhe.criado_em) }}</span></div>
        <div class="det-row"><span>Cliente</span><span>{{ detalhe.cliente || "—" }}</span></div>
        <div class="det-row"><span>Operador</span><span>{{ detalhe.operador || "—" }}</span></div>
        <div class="det-row"><span>Status</span><span>{{ detalhe.status }}</span></div>
        <div class="det-row"><span>Total</span><strong>{{ fmt(detalhe.total) }}</strong></div>
        <button @click="detalhe = null" class="btn-fechar">Fechar</button>
      </div>
    </div>

    <!-- Modal NFC-e emitida -->
    <div v-if="nfceResult" class="modal-bg" @click.self="nfceResult = null">
      <div class="modal modal-nfce">
        <div class="nfce-icon">✅</div>
        <h3>NFC-e Autorizada</h3>
        <div class="nfce-actions">
          <button v-if="nfceResult.danfe" @click="imprimirDanfe(nfceResult.danfe)" class="btn-imprimir">🖨️ Imprimir DANFE</button>
          <button @click="nfceResult = null" class="btn-fechar">Fechar</button>
        </div>
      </div>
    </div>

    <!-- Modal Motivo Devolução -->
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
          <button @click="showModalDevolucao = false" class="btn-cancelar-modal" :disabled="carregando">Voltar</button>
          <button @click="processarDevolucao" class="btn-confirmar-dev" :disabled="carregando">Confirmar Devolução</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast.show" :class="['toast', toast.tipo]">{{ toast.msg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useSessaoStore } from "../stores/sessao";
import apiClient          from "../services/api";
const sessaoStore = useSessaoStore();

const vendas         = ref([]);
const carregando     = ref(false);
const busca          = ref("");
const filtroStatus   = ref("");
const emitindoPk     = ref(null);
const detalhe        = ref(null);
const nfceResult     = ref(null);
const toast          = ref({ show: false, msg: '', tipo: 'ok' });

const dataInicio = ref('');
const dataFim    = ref('');

// Paginação
const limit          = 20;
const totalRegistros = ref(0);
const paginaAtual    = ref(0);
const totalPaginas   = computed(() => Math.ceil(totalRegistros.value / limit) || 1);

// Devolução
const showModalDevolucao = ref(false);
const vendaParaDevolver  = ref(null);
const motivoDevolucao    = ref("");

function mostrarToast(msg, tipo = 'ok', ms = 4000) {
  toast.value = { show: true, msg, tipo };
  setTimeout(() => { toast.value.show = false; }, ms);
}

onMounted(() => carregar(0));

async function carregar(pagina = 0) {
  carregando.value = true;
  paginaAtual.value = pagina;
  try {
    let inicioStr = "";
    let fimStr = "";
    if (dataInicio.value) inicioStr = dataInicio.value;
    if (dataFim.value)    fimStr    = dataFim.value;

    const params = {
      filial_pk: sessaoStore.filial?.pk,
      inicio:    inicioStr,
      fim:       fimStr,
      status:    filtroStatus.value,
      busca:     busca.value,
      limit:     limit,
      offset:    pagina * limit
    };
    const resp = await apiClient.get("/api/vendas", { params });
    vendas.value         = resp.data.data || [];
    totalRegistros.value = resp.data.count || 0;
  } catch (e) {
    mostrarToast("Erro ao carregar: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function limparFiltros() {
  busca.value = "";
  filtroStatus.value = "";
  dataInicio.value = '';
  dataFim.value = '';
  carregar(0);
}

async function confirmarExclusao(v) {
  if (!confirm(`Deseja EXCLUIR a venda #${v.numero}? Esta ação retornará os produtos ao estoque e NÃO pode ser desfeita.`)) return;
  
  carregando.value = true;
  try {
    const resp = await apiClient.delete(`/api/vendas/${v.pk}`);
    if (resp.data.ok) {
      mostrarToast("Venda excluída e estoque estornado.");
      await carregar(paginaAtual.value);
    }
  } catch (e) {
    mostrarToast("Erro ao excluir: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
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
  if (s === "cancelada")   return "err";
  return "muted";
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
       mostrarToast(`Venda #${v.numero} devolvida com sucesso!`);
       showModalDevolucao.value = false;
       await carregar(paginaAtual.value);
    }
  } catch (e) {
    mostrarToast("Erro: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function abrirDetalhe(v) { detalhe.value = v; }

function imprimirDanfe(base64) {
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

async function emitirNFCe(v) {
  emitindoPk.value = v.pk;
  try {
    const resp = await apiClient.post("/api/nfce/emitir", { venda_pk: v.pk });
    if (resp.data.ok) {
      nfceResult.value = resp.data;
      await carregar(paginaAtual.value);
    } else {
      mostrarToast(resp.data.erro || 'NFC-e rejeitada', 'err');
    }
  } catch (e) {
    mostrarToast("Erro: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    emitindoPk.value = null;
  }
}
</script>

<style scoped>
.hist-wrap { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 0.4s ease-out; color: var(--text); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Light Mode Enhancements */
:root {
  --bg-hist-header: var(--bg2);
  --border-subtle: rgba(0,0,0,0.05);
}

.hist-header { display: flex; flex-direction: column; gap: 1.25rem; }
.header-main { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.page-title { margin: 0; font-size: 1.6rem; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }

.stats-pills { display: flex; gap: 0.75rem; }
.stat-pill { padding: 0.4rem 1.2rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 50px; font-size: 0.85rem; color: var(--text); font-weight: 600; box-shadow: 0 2px 4px var(--border-subtle); }
.stat-pill strong { color: var(--primary); }

/* Filtros Bar */
.filtros-bar { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 1rem; 
  background: var(--bg1); 
  padding: 1rem; 
  border-radius: 16px; 
  border: 1px solid var(--border); 
  flex-wrap: wrap; 
  box-shadow: 0 4px 12px var(--border-subtle);
}

.search-group { position: relative; flex: 1; min-width: 280px; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 20px; color: var(--primary); opacity: 0.7; }
.busca-input-v2 { width: 100%; padding: 0.75rem 1rem 0.75rem 2.8rem; background: var(--bg2); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text); font-size: 0.95rem; transition: all 0.2s; }
.busca-input-v2:focus { border-color: var(--primary); background: var(--bg1); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); outline: none; }

.filter-group { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.date-fields { display: flex; align-items: center; gap: 0.8rem; background: var(--bg2); padding: 0.4rem 1rem; border-radius: 12px; border: 1.5px solid var(--border); }
.date-input-v2 { background: transparent; border: none; color: var(--text); font-size: 0.85rem; outline: none; cursor: pointer; font-weight: 600; }
.date-sep { font-size: 0.75rem; color: var(--text2); font-weight: 800; text-transform: uppercase; opacity: 0.5; }

.sel-input-v2 { padding: 0.75rem 1rem; background: var(--bg2); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text); font-size: 0.9rem; outline: none; cursor: pointer; min-width: 160px; font-weight: 600; }

.btn-refresh { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--primary); color: #fff; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); }
.btn-refresh:hover { transform: rotate(45deg); filter: brightness(1.1); }

.btn-clear { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--bg3); color: var(--text2); border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.btn-clear:hover { background: #fee2e2; color: #ef4444; border-color: #ef4444; }

/* Tabela V2 */
.tabela-container { background: var(--bg1); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; box-shadow: 0 8px 30px var(--border-subtle); display: flex; flex-direction: column; }
.tabela-v2 { width: 100%; border-collapse: collapse; }
.tabela-v2 th { background: var(--bg2); padding: 1.2rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text2); border-bottom: 2px solid var(--border); }
.tabela-v2 td { padding: 1.2rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.tabela-v2 tr:hover td { background: rgba(var(--primary-rgb), 0.02); }

.col-num { font-weight: 800; color: var(--primary); }
.col-date { font-size: 0.85rem; font-weight: 500; }
.col-total { font-weight: 800; color: #10b981; }

.text-right { text-align: right; }

/* Status Styles */
.status-badge { padding: 0.4rem 1rem; border-radius: 8px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; display: inline-flex; }
.status-badge.ok { background: #d1fae5; color: #065f46; }
.status-badge.warn { background: #fef3c7; color: #92400e; }
.status-badge.err { background: #fee2e2; color: #991b1b; }

/* Paginação Bar */
.pagination-bar { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 2rem; 
  padding: 1.5rem; 
  background: var(--bg2); 
  border-top: 1px solid var(--border);
}
.pag-btn { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  padding: 0.6rem 1.2rem; 
  border-radius: 10px; 
  border: 1px solid var(--border); 
  background: var(--bg1); 
  color: var(--text); 
  font-weight: 700; 
  cursor: pointer; 
  transition: all 0.2s;
  font-size: 0.85rem;
}
.pag-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 10px var(--border-subtle); }
.pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pag-info { font-weight: 800; font-size: 0.9rem; color: var(--text2); }

/* Actions */
.actions-group { display: flex; gap: 0.6rem; justify-content: flex-end; }
.action-btn { width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg2); color: var(--text); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.action-btn:hover { transform: scale(1.1); }
.action-btn.delete:hover { border-color: #ef4444; color: #ef4444; background: #fee2e2; }
.action-btn.nfce:hover { border-color: var(--primary); color: var(--primary); background: rgba(99, 102, 241, 0.1); }

/* Modals & Others */
.modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: var(--bg2); border: 1.5px solid var(--border); border-radius: 20px; padding: 2rem; width: 100%; max-width: 500px; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }

/* NFC-e status na tabela */
.nfce-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }
.nfce-status .material-symbols-outlined { font-size: 13px; }
.nfce-status.authorized { background: #d1fae5; color: #065f46; }
.nfce-status.pending    { background: var(--bg3); color: var(--text2); }

/* Spinner & Toast */
.spinner { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s infinite linear; }
.toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); padding: 1rem 2rem; border-radius: 14px; color: #fff; font-weight: 700; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
.toast.ok { background: #10b981; }
.toast.err { background: #ef4444; }
.date-range-group {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg2);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 0 12px;
  height: 48px;
}
.date-range-group .date-input-v2 {
  width: 130px;
}
</style>
