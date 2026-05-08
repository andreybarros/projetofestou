<template>
  <div class="page-wrap">

    <!-- Header -->
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">Projetos</h2>
        <p class="page-sub">Gerencie projetos de decoração e emita NF-e modelo 55</p>
      </div>
      <div class="header-actions">
        <select v-model="filtroStatus" class="sel-status">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
          <option value="realizado">Realizado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button @click="carregar" class="btn-ghost" title="Atualizar">
          <span class="material-symbols-outlined" style="font-size:16px">refresh</span>
        </button>
        <button @click="$router.push('/projetos/novo')" class="btn-primary">
          + Novo Projeto
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="carregando" class="loading-state">
      <span class="spinner-ring"></span>
      Carregando projetos...
    </div>

    <!-- Vazio -->
    <div v-else-if="listaFiltrada.length === 0" class="vazio-state">
      <span class="material-symbols-outlined vazio-icon">design_services</span>
      <p>Nenhum projeto encontrado.</p>
      <button class="btn-primary" @click="$router.push('/projetos/novo')">Criar primeiro projeto</button>
    </div>

    <!-- Tabela -->
    <div v-else class="card table-card overflow-x">
      <table class="tabela">
        <thead>
          <tr>
            <th>Título</th>
            <th>Cliente</th>
            <th>Data decoração</th>
            <th class="text-right">Valor</th>
            <th class="text-center">Status</th>
            <th class="text-center">NF-e</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in listaFiltrada" :key="p.pk" class="tabela-row">
            <td class="bold">{{ p.titulo }}</td>
            <td>{{ p.clientes?.nome || '—' }}</td>
            <td>{{ p.data_decoracao ? p.data_decoracao.split('-').reverse().join('/') : '—' }}</td>
            <td class="text-right mono">{{ fmtMoeda(p.valor) }}</td>
            <td class="text-center">
              <span :class="['status-pill', `st-${p.status}`]">{{ labelStatus(p.status) }}</span>
            </td>
            <td class="text-center">
              <span v-if="p.nfe_chave" class="status-pill st-nfe-ok" :title="p.nfe_chave">
                {{ p.nfe_numero ? `NF ${p.nfe_numero}` : 'Autorizada' }}
              </span>
              <span v-else class="status-pill st-nfe-pend">Pendente</span>
            </td>
            <td class="text-right">
              <div class="actions">
                <!-- Recibo -->
                <button
                  class="btn-action"
                  @click="imprimirRecibo(p)"
                  title="Imprimir Recibo"
                >
                  <span class="material-symbols-outlined" style="font-size:15px">print</span>
                </button>

                <!-- Emitir NF-e -->
                <button
                  v-if="!p.nfe_chave"
                  class="btn-action btn-nfe"
                  @click="emitirNfe(p)"
                  :disabled="emitindoPk === p.pk"
                  title="Emitir NF-e"
                >
                  <span v-if="emitindoPk === p.pk" class="spinner-xs"></span>
                  <span v-else class="material-symbols-outlined" style="font-size:15px">receipt</span>
                </button>

                <!-- Ver DANFE -->
                <a
                  v-if="p.nfe_danfe"
                  :href="p.nfe_danfe"
                  target="_blank"
                  class="btn-action"
                  title="Visualizar DANFE"
                >
                  <span class="material-symbols-outlined" style="font-size:15px">open_in_new</span>
                </a>

                <!-- Editar -->
                <button class="btn-action" @click="$router.push(`/projetos/${p.pk}/editar`)" title="Editar">
                  <span class="material-symbols-outlined" style="font-size:15px">edit</span>
                </button>

                <!-- Excluir -->
                <button class="btn-action err" @click="excluir(p)" title="Excluir">
                  <span class="material-symbols-outlined" style="font-size:15px">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { imprimirReciboProj } from '../utils/recibo';
import apiClient from '../services/api';

const sessao    = useSessaoStore();
const showToast = inject('showToast');

const lista        = ref([]);
const carregando   = ref(true);
const filtroStatus = ref('');
const emitindoPk   = ref(null);

const listaFiltrada = computed(() =>
  filtroStatus.value ? lista.value.filter(p => p.status === filtroStatus.value) : lista.value
);

function fmtMoeda(v) {
  return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const LABELS = { pendente: 'Pendente', confirmado: 'Confirmado', realizado: 'Realizado', cancelado: 'Cancelado' };
function labelStatus(s) { return LABELS[s] || s; }

// ── Carregar ──────────────────────────────────────────────────────
async function carregar() {
  carregando.value = true;
  try {
    const { data } = await apiClient.get('/api/projetos', {
      params: { filial_pk: sessao.filial.pk },
    });
    lista.value = data.data || [];
  } catch (e) {
    showToast('Erro ao carregar projetos: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    carregando.value = false;
  }
}

onMounted(carregar);

// ── Recibo ────────────────────────────────────────────────────────
async function imprimirRecibo(p) {
  try {
    await imprimirReciboProj({ projetoPk: p.pk, filialPk: sessao.filial.pk });
  } catch (e) {
    showToast('Erro ao gerar recibo: ' + e.message, 'error');
  }
}

// ── Excluir ───────────────────────────────────────────────────────
async function excluir(p) {
  if (!confirm(`Excluir o projeto "${p.titulo}"?\nO evento da agenda também será removido.`)) return;
  try {
    await apiClient.delete(`/api/projetos/${p.pk}`);
    showToast('Projeto excluído.');
    await carregar();
  } catch (e) {
    showToast(e.response?.data?.erro || e.message, 'error');
  }
}

// ── Emitir NF-e ───────────────────────────────────────────────────
async function emitirNfe(p) {
  if (!confirm(`Emitir NF-e para "${p.titulo}"?\nValor: ${fmtMoeda(p.valor)}`)) return;
  emitindoPk.value = p.pk;
  try {
    const { data } = await apiClient.post(`/api/projetos/${p.pk}/emitir-nfe`, { ambiente: 2 });
    if (data.ok) {
      showToast(`NF-e autorizada! Número: ${data.numero || ''}`, 'success');
      await carregar();
    } else {
      showToast(data.erro || 'Erro ao emitir NF-e', 'error');
    }
  } catch (e) {
    showToast(e.response?.data?.erro || e.message, 'error');
  } finally {
    emitindoPk.value = null;
  }
}
</script>

<style scoped>
/* ── Container ─────────────────────────────────────────────── */
.page-wrap   { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.header-info {}
.page-title  { margin: 0; font-size: 1.6rem; font-weight: 800; color: var(--text); }
.page-sub    { margin: 4px 0 0; font-size: 0.9rem; color: var(--text2); }
.header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.sel-status {
  background: var(--bg2); border: 1.5px solid var(--border);
  color: var(--text); padding: 8px 12px; border-radius: 10px;
  font-size: 13px; cursor: pointer; outline: none;
}
.sel-status:focus { border-color: #6366f1; }

/* ── Estados ───────────────────────────────────────────────── */
.loading-state {
  display: flex; align-items: center; gap: 12px;
  color: var(--text2); padding: 60px 0; justify-content: center; font-size: 14px;
}
.vazio-state {
  text-align: center; padding: 80px 20px; color: var(--text2);
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}
.vazio-icon { font-size: 56px; opacity: .35; display: block; }

/* ── Card / Tabela ─────────────────────────────────────────── */
.card       { background: var(--bg2); border: 2px solid var(--border); border-radius: 16px; }
.table-card { overflow: hidden; }
.overflow-x { overflow-x: auto; }

.tabela { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.tabela th {
  text-align: left; padding: 1rem 1.1rem;
  background: var(--bg3); color: var(--text);
  font-weight: 800; border-bottom: 2px solid var(--border); white-space: nowrap;
}
.tabela td { padding: 1rem 1.1rem; border-bottom: 1px solid var(--border); color: var(--text); }
.tabela-row:hover td { background: var(--bg3); }
.tabela-row:last-child td { border-bottom: none; }
.text-right  { text-align: right; }
.text-center { text-align: center; }
.bold        { font-weight: 700; }
.mono        { font-variant-numeric: tabular-nums; }

/* ── Status pills ──────────────────────────────────────────── */
.status-pill {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 800; white-space: nowrap;
}
.st-pendente   { background: rgba(234,179,8,.15);   color: #ca8a04; }
.st-confirmado { background: rgba(59,130,246,.15);  color: #3b82f6; }
.st-realizado  { background: rgba(34,197,94,.15);   color: #16a34a; }
.st-cancelado  { background: rgba(239,68,68,.15);   color: #dc2626; }
.st-nfe-ok     { background: rgba(34,197,94,.15);   color: #16a34a; }
.st-nfe-pend   { background: rgba(148,163,184,.12); color: var(--text2); }

/* ── Ações ─────────────────────────────────────────────────── */
.actions { display: flex; gap: 6px; justify-content: flex-end; }
.btn-action {
  background: var(--bg3); border: 2px solid var(--border); border-radius: 8px;
  width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
  color: var(--text); cursor: pointer; text-decoration: none; transition: background .13s, border-color .13s;
}
.btn-action:hover     { background: var(--bg4); border-color: rgba(255,255,255,.15); }
.btn-action.err:hover { border-color: #ef4444; color: #ef4444; }
.btn-action.btn-nfe   { color: #a855f7; border-color: rgba(168,85,247,.3); }
.btn-action.btn-nfe:hover { background: rgba(168,85,247,.1); border-color: #a855f7; }
.btn-action:disabled  { opacity: .4; cursor: not-allowed; }

/* ── Botões ────────────────────────────────────────────────── */
.btn-primary {
  background: #6366f1; color: #fff; border: none;
  padding: 0.8rem 1.6rem; border-radius: 12px;
  font-weight: 700; cursor: pointer; font-size: 13.5px;
  display: flex; align-items: center; gap: 6px; transition: opacity .15s;
}
.btn-primary:hover { opacity: .88; }
.btn-ghost {
  background: var(--bg2); border: 2px solid var(--border); color: var(--text);
  padding: 0.8rem 1rem; border-radius: 12px;
  font-weight: 700; cursor: pointer; font-size: 13.5px;
  display: flex; align-items: center; gap: 6px; transition: background .13s;
}
.btn-ghost:hover { background: var(--bg3); }

/* ── Spinners ──────────────────────────────────────────────── */
.spinner-ring {
  width: 20px; height: 20px; flex-shrink: 0;
  border: 2px solid var(--border); border-top-color: var(--primary);
  border-radius: 50%; animation: spin .7s linear infinite; display: inline-block;
}
.spinner-xs {
  width: 13px; height: 13px; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
