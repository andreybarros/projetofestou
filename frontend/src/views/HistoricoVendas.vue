<template>
  <div class="hist-wrap">
    <div class="hist-header">
      <div class="header-main">
        <h2 class="page-title">Histórico de Vendas</h2>
        <div class="stats-pills">
          <span class="stat-pill"><strong>{{ vendas.length }}</strong> vendas</span>
          <span class="stat-pill total"><strong>{{ fmt(totalGeral) }}</strong> total</span>
        </div>
      </div>

      <div class="filtros-bar">
        <div class="search-group">
          <span class="material-symbols-outlined search-icon">search</span>
          <input v-model="busca" type="text" placeholder="Número, cliente ou operador..." class="busca-input-v2" />
        </div>
        
        <div class="filter-group">
          <div class="date-fields">
            <input v-model="dataInicio" type="date" class="date-input-v2" />
            <span class="date-sep">até</span>
            <input v-model="dataFim" type="date" class="date-input-v2" />
          </div>
          
          <select v-model="filtroStatus" class="sel-input-v2">
            <option value="">Todos Status</option>
            <option value="finalizada">Finalizadas</option>
            <option value="devolvida">Devolvidas</option>
            <option value="cancelada">Canceladas</option>
            <option value="pendente">Pendentes</option>
          </select>
          
          <button @click="carregar" class="btn-refresh" title="Atualizar">
            <span class="material-symbols-outlined">refresh</span>
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
          <tr v-for="v in vendasFiltradas" :key="v.pk" @click="abrirDetalhe(v)">
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
                <button v-if="v.nfce_chave && podeCancelar(v)"
                  @click="cancelarNFCe(v)" class="action-btn cancel" title="Cancelar NFC-e">
                  <span class="material-symbols-outlined">block</span>
                </button>
                <button @click="abrirDetalhe(v)" class="action-btn view" title="Ver Detalhes">
                  <span class="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal detalhe -->
    <div v-if="detalhe" class="modal-bg" @click.self="detalhe = null">
      <div class="modal">
        <h3>Venda #{{ detalhe.numero }}</h3>
        <div class="det-row"><span>Data</span><span>{{ fmtDate(detalhe.criado_em) }}</span></div>
        <div class="det-row"><span>Cliente</span><span>{{ detalhe.cliente || "—" }}</span></div>
        <div class="det-row"><span>Operador</span><span>{{ detalhe.operador || "—" }}</span></div>
        <div class="det-row"><span>Status</span><span>{{ detalhe.status }}</span></div>
        <div class="det-row"><span>Total</span><strong>{{ fmt(detalhe.total) }}</strong></div>
        <div v-if="detalhe.nfce_chave" class="det-row chave"><span>Chave NFC-e</span><span class="mono small">{{ detalhe.nfce_chave }}</span></div>
        <div v-if="detalhe.nfce_protocolo" class="det-row"><span>Protocolo</span><span class="mono">{{ detalhe.nfce_protocolo }}</span></div>
        <button @click="detalhe = null" class="btn-fechar">Fechar</button>
      </div>
    </div>

    <!-- Modal NFC-e emitida -->
    <div v-if="nfceResult" class="modal-bg" @click.self="nfceResult = null">
      <div class="modal modal-nfce">
        <div class="nfce-icon">✅</div>
        <h3>NFC-e Autorizada</h3>
        <div class="det-row"><span>Número</span><span class="mono">{{ nfceResult.numero }}</span></div>
        <div class="det-row"><span>Protocolo</span><span class="mono">{{ nfceResult.protocolo }}</span></div>
        <div class="det-row chave"><span>Chave</span><span class="mono small">{{ nfceResult.chave }}</span></div>
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
          <textarea v-model="motivoDevolucao" placeholder="Ex: Cliente desistiu da compra / Produto com defeito..." class="dev-textarea"></textarea>
        </div>

        <div class="dev-actions">
          <button @click="showModalDevolucao = false" class="btn-cancelar-modal" :disabled="carregando">Voltar</button>
          <button @click="processarDevolucao" class="btn-confirmar-dev" :disabled="carregando">
            {{ carregando ? 'Processando...' : 'Confirmar Devolução' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast de notificação -->
    <transition name="toast">
      <div v-if="toast.show" :class="['toast', toast.tipo]">{{ toast.msg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useSessaoStore } from "../stores/sessao";
import { supabase }       from "../composables/useSupabase";
import apiClient          from "../services/api";

const sessaoStore = useSessaoStore();

const vendas       = ref([]);
const carregando   = ref(false);
const busca        = ref("");
const filtroStatus = ref("");
const emitindoPk   = ref(null);
const detalhe      = ref(null);
const dataInicio   = ref("");
const dataFim      = ref("");
const nfceResult   = ref(null);
const toast        = ref({ show: false, msg: '', tipo: 'ok' });

// Estado Devolução
const showModalDevolucao = ref(false);
const vendaParaDevolver  = ref(null);
const motivoDevolucao    = ref("");

function mostrarToast(msg, tipo = 'ok', ms = 4000) {
  toast.value = { show: true, msg, tipo };
  setTimeout(() => { toast.value.show = false; }, ms);
}

const vendasFiltradas = computed(() => {
  let l = vendas.value;
  const q = busca.value.trim().toLowerCase();
  if (q) l = l.filter(v =>
    String(v.numero).includes(q) ||
    (v.cliente  || "").toLowerCase().includes(q) ||
    (v.operador || "").toLowerCase().includes(q)
  );
  if (filtroStatus.value) l = l.filter(v => v.status === filtroStatus.value);
  return l;
});

const totalGeral = computed(() =>
  vendasFiltradas.value.reduce((s, v) => s + parseFloat(v.total || 0), 0)
);

onMounted(() => carregar());

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase
      .from("vendas")
      .select("pk, numero, criado_em, cliente, operador, total, status, tipo_venda, nfce_chave, nfce_protocolo, nfce_dh_emissao, filial_pk")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
    if (dataInicio.value) q = q.gte("criado_em", dataInicio.value);
    if (dataFim.value)    q = q.lte("criado_em", dataFim.value + "T23:59:59");
    const { data, error } = await q;
    if (error) throw error;
    vendas.value = data || [];
  } catch (e) {
    console.error(e.message);
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
    const resp = await apiClient.post("/api/vendas/devolver", { 
      venda_pk: v.pk, 
      motivo: motivoDevolucao.value 
    });
    if (resp.data.ok) {
       mostrarToast(`Venda #${v.numero} devolvida com sucesso! Estoque estornado.`);
       showModalDevolucao.value = false;
       await carregar();
    }
  } catch (e) {
    mostrarToast("Erro ao devolver: " + (e.response?.data?.erro || e.message), 'err', 6000);
  } finally {
    carregando.value = false;
  }
}

function podeCancelar(v) {
  if (!v.nfce_dh_emissao) return false;
  return (Date.now() - new Date(v.nfce_dh_emissao).getTime()) < 30 * 60 * 1000;
}

function abrirDetalhe(v) { detalhe.value = v; }

function imprimirDanfe(base64) {
  const blob = base64ToBlob(base64, 'application/pdf');
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function base64ToBlob(b64, mime) {
  const bin  = atob(b64);
  const buf  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

async function emitirNFCe(v) {
  console.log('[NFC-e] iniciando emissão para venda', v.pk);
  emitindoPk.value = v.pk;
  try {
    console.log('[NFC-e] chamando API...');
    const resp = await apiClient.post("/api/nfce/emitir", { venda_pk: v.pk });
    console.log('[NFC-e] resposta:', resp.data);
    const data = resp.data;
    await carregar();
    if (data.ok) {
      nfceResult.value = data;
    } else {
      mostrarToast(data.erro || 'NFC-e rejeitada', 'err', 6000);
    }
  } catch (e) {
    console.error('[NFC-e] erro:', e);
    mostrarToast("Erro: " + (e.response?.data?.erro || e.message), 'err', 6000);
  } finally {
    emitindoPk.value = null;
  }
}

async function cancelarNFCe(v) {
  const just = prompt("Justificativa do cancelamento (min. 15 caracteres):");
  if (!just || just.length < 15) return mostrarToast("Justificativa inválida.", 'err');
  try {
    await apiClient.post("/api/nfce/cancelar", { venda_pk: v.pk, justificativa: just });
    await carregar();
    mostrarToast("NFC-e cancelada com sucesso.");
  } catch (e) {
    mostrarToast("Erro: " + (e.response?.data?.erro || e.message), 'err', 6000);
  }
}
</script>

<style scoped>
.hist-wrap { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Header & Stats */
.hist-header { display: flex; flex-direction: column; gap: 1.25rem; }
.header-main { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.page-title { margin: 0; font-size: 1.6rem; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }

.stats-pills { display: flex; gap: 0.75rem; }
.stat-pill { padding: 0.4rem 1rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 50px; font-size: 0.85rem; color: var(--text2); display: flex; gap: 8px; align-items: center; }
.stat-pill strong { color: var(--text); }
.stat-pill.total { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); }
.stat-pill.total strong { color: #818cf8; }

/* Filtros Bar */
.filtros-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--bg2); padding: 0.75rem 1rem; border-radius: 14px; border: 1px solid var(--border); flex-wrap: wrap; }

.search-group { position: relative; flex: 1; min-width: 280px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 20px; color: var(--text2); opacity: 0.6; }
.busca-input-v2 { width: 100%; padding: 0.6rem 1rem 0.6rem 2.5rem; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 10px; color: var(--text); font-size: 0.9rem; transition: all 0.2s; }
.busca-input-v2:focus { border-color: #6366f1; background: var(--bg); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); outline: none; }

.filter-group { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.date-fields { display: flex; align-items: center; gap: 0.5rem; background: var(--bg3); padding: 0.25rem 0.75rem; border-radius: 10px; border: 1.5px solid var(--border); }
.date-input-v2 { background: transparent; border: none; color: var(--text); font-size: 0.85rem; padding: 0.35rem 0; outline: none; cursor: pointer; }
.date-sep { font-size: 0.75rem; color: var(--text2); font-weight: 700; text-transform: uppercase; opacity: 0.5; }

.sel-input-v2 { padding: 0.6rem 1rem; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 10px; color: var(--text); font-size: 0.85rem; outline: none; cursor: pointer; min-width: 150px; }
.sel-input-v2:focus { border-color: #6366f1; }

.btn-refresh { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: #6366f1; color: #fff; border: none; border-radius: 10px; cursor: pointer; transition: transform 0.2s, background 0.2s; }
.btn-refresh:hover { background: #4f46e5; transform: rotate(180deg); }
.btn-refresh .material-symbols-outlined { font-size: 20px; }

/* Tabela V2 */
.tabela-container { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
.tabela-v2 { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.tabela-v2 th { background: var(--bg3); padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.tabela-v2 td { padding: 1rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; transition: background 0.2s; }
.tabela-v2 tr { transition: background 0.2s; cursor: pointer; }
.tabela-v2 tr:hover td { background: rgba(255,255,255,0.02); }

.col-num { font-family: 'IBM Plex Mono', monospace; font-weight: 700; color: #818cf8; }
.col-date { font-size: 0.8rem; color: var(--text2); }
.col-client { font-weight: 600; color: var(--text); }
.col-op { font-size: 0.85rem; color: var(--text); opacity: 0.9; }
.col-total { font-family: 'IBM Plex Mono', monospace; font-weight: 700; color: #10b981; }

.text-right { text-align: right; }

/* Badges & Pills */
.type-pill { padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
.type-pill.vnd { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.3); }
.type-pill.loc { background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.3); }

.status-badge { padding: 0.35rem 0.8rem; border-radius: 50px; font-size: 0.75rem; font-weight: 800; text-transform: capitalize; display: inline-flex; align-items: center; gap: 6px; }
.status-badge.ok { background: #065f46; color: #d1fae5; }
.status-badge.warn { background: #92400e; color: #fef3c7; }
.status-badge.err { background: #991b1b; color: #fee2e2; }
.status-badge.muted { background: #374151; color: #f3f4f6; }

/* NFC-e Status */
.nfce-status { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; }
.nfce-status .material-symbols-outlined { font-size: 16px; }
.nfce-status.authorized { color: #10b981; }
.nfce-status.pending { color: var(--text2); font-weight: 500; }

/* Actions */
.actions-group { display: flex; gap: 0.5rem; justify-content: flex-end; }
.action-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.action-btn .material-symbols-outlined { font-size: 18px; }
.action-btn:hover { color: var(--text); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

.action-btn.nfce:hover { border-color: #1565c0; color: #2196f3; background: rgba(33, 150, 243, 0.1); }
.action-btn.return:hover { border-color: #f59e0b; color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.action-btn.cancel:hover { border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.action-btn.view:hover { border-color: #616161; color: var(--text); background: rgba(255, 255, 255, 0.1); }
.action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* Modals */
.modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 1.5rem; }
.modal { background: var(--bg1); border: 2px solid var(--border); border-radius: 24px; padding: 2.5rem; width: 100%; max-width: 550px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }

.det-row { display: flex; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid var(--border); font-size: 1rem; }
.det-row span:first-child { color: var(--text); opacity: 0.7; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; }
.det-row span:last-child { color: var(--text); font-weight: 600; }
.det-row strong { color: #818cf8; font-family: 'IBM Plex Mono', monospace; font-size: 1.2rem; }

.btn-fechar { margin-top: 1.5rem; padding: 0.8rem; background: var(--bg3); color: var(--text); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; font-weight: 700; width: 100%; transition: all 0.2s; }
.btn-fechar:hover { background: var(--bg2); border-color: #6366f1; color: #6366f1; }

/* Modal NFC-e Premium */
.modal-nfce { text-align: center; }
.nfce-icon { width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 1.5rem; }
.btn-imprimir { padding: 0.8rem 1.5rem; background: #059669; color: #fff; border: none; border-radius: 12px; cursor: pointer; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1; }
.nfce-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }

/* Modal Devolução */
.dev-modal { gap: 1.25rem !important; }
.dev-header { display: flex; align-items: center; gap: 12px; margin-bottom: 0.5rem; }
.dev-icon { font-size: 2.2rem; color: #f59e0b; }
.dev-alert { font-size: 0.85rem; color: #fef3c7; background: rgba(245, 158, 11, 0.1); padding: 12px 16px; border-radius: 12px; border-left: 4px solid #f59e0b; line-height: 1.5; }
.dev-textarea { width: 100%; min-height: 120px; padding: 12px; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text); font-family: inherit; font-size: 0.9rem; resize: none; transition: border-color 0.2s; outline: none; }
.dev-textarea:focus { border-color: #f59e0b; }
.dev-actions { display: flex; gap: 12px; margin-top: 0.5rem; }
.btn-cancelar-modal { flex: 1; padding: 0.8rem; background: var(--bg3); color: var(--text); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; font-weight: 600; }
.btn-confirmar-dev { flex: 2; padding: 0.8rem; background: #f59e0b; color: #fff; border: none; border-radius: 12px; cursor: pointer; font-weight: 700; transition: background 0.2s; }
.btn-confirmar-dev:hover:not(:disabled) { background: #d97706; }

/* States */
.loading-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: var(--text2); min-height: 300px; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s infinite linear; }
@keyframes spin { to { transform: rotate(360deg); } }

.vazio { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 5rem 2rem; color: var(--text2); text-align: center; }
.empty-icon { font-size: 4rem; opacity: 0.2; }

/* Toast */
.toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); padding: 1rem 2rem; border-radius: 14px; font-size: 0.95rem; font-weight: 700; z-index: 9999; box-shadow: 0 10px 40px rgba(0,0,0,0.3); color: #fff; display: flex; align-items: center; gap: 10px; }
.toast.ok { background: #059669; }
.toast.err { background: #dc2626; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(2rem); }
</style>
