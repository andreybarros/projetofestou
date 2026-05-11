<template>
  <div class="page-wrap">

    <!-- Header -->
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">Projetos</h2>
        <p class="page-sub">Gerencie projetos de decoração e emita NF-e modelo 55</p>
      </div>
      <div class="header-actions">
        <select v-model="filtroStatus" class="sel-status" @change="paginaAtual = 1">
          <option value="">Todos os status</option>
          <option value="a_montar">À montar</option>
          <option value="montado">Montado</option>
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
            <th class="text-center">Título</th>
            <th class="text-center">Cliente</th>
            <th class="text-center">Data</th>
            <th class="text-center">Valor</th>
            <th class="text-center">Status</th>
            <th class="text-center">NF-e</th>
            <th class="text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in listaPaginada" :key="p.pk" class="tabela-row">
            <td class="text-center bold">{{ p.titulo }}</td>
            <td class="text-center">{{ p.clientes?.nome || '—' }}</td>
            <td class="text-center">{{ p.data_decoracao ? p.data_decoracao.split('-').reverse().join('/') : '—' }}</td>
            <td class="text-center mono">{{ fmtMoeda(p.valor) }}</td>
            <td class="text-center">
              <button :class="['status-pill', `st-${p.status}`, 'status-btn']" @click="abrirMudarStatus(p)" :title="'Clique para mudar status'">
                {{ labelStatus(p.status) }}
                <span class="material-symbols-outlined" style="font-size:11px;opacity:.6">expand_more</span>
              </button>
            </td>
            <td class="text-center">
              <span v-if="p.nfe_chave" class="status-pill st-nfe-ok" :title="p.nfe_chave">
                {{ p.nfe_numero ? `NF ${p.nfe_numero}` : 'Autorizada' }}
              </span>
              <span v-else class="status-pill st-nfe-pend">Pendente</span>
            </td>
            <td class="text-center">
              <div class="actions">
                <button class="btn-action" @click="imprimirRecibo(p)" title="Imprimir Recibo">
                  <span class="material-symbols-outlined" style="font-size:15px">print</span>
                </button>
                <button v-if="!p.nfe_chave" class="btn-action btn-nfe" @click="emitirNfe(p)" :disabled="emitindoPk === p.pk" title="Emitir NF-e">
                  <span v-if="emitindoPk === p.pk" class="spinner-xs"></span>
                  <span v-else class="material-symbols-outlined" style="font-size:15px">receipt</span>
                </button>
                <a v-if="p.nfe_danfe" :href="p.nfe_danfe" target="_blank" class="btn-action" title="Visualizar DANFE">
                  <span class="material-symbols-outlined" style="font-size:15px">open_in_new</span>
                </a>
                <button class="btn-action" @click="$router.push(`/projetos/${p.pk}/editar`)" title="Editar">
                  <span class="material-symbols-outlined" style="font-size:15px">edit</span>
                </button>
                <button class="btn-action err" @click="excluir(p)" title="Excluir">
                  <span class="material-symbols-outlined" style="font-size:15px">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginação -->
      <div v-if="totalPaginas > 1" class="paginacao">
        <button class="pg-btn" :disabled="paginaAtual === 1" @click="paginaAtual--">
          <span class="material-symbols-outlined" style="font-size:16px">chevron_left</span>
        </button>
        <span class="pg-info">{{ paginaAtual }} / {{ totalPaginas }}</span>
        <button class="pg-btn" :disabled="paginaAtual === totalPaginas" @click="paginaAtual++">
          <span class="material-symbols-outlined" style="font-size:16px">chevron_right</span>
        </button>
      </div>
    </div>

    <!-- Totalizadores -->
    <div v-if="!carregando" class="totais-grid">
      <div class="total-card">
        <span class="material-symbols-outlined total-icon" style="color:#6366f1">payments</span>
        <div>
          <p class="total-label">Total faturado</p>
          <p class="total-val">{{ fmtMoeda(totalFaturado) }}</p>
        </div>
      </div>
      <div class="total-card">
        <span class="material-symbols-outlined total-icon" style="color:#f59e0b">receipt</span>
        <div>
          <p class="total-label">Total de custo</p>
          <p class="total-val">{{ fmtMoeda(totalCusto) }}</p>
        </div>
      </div>
      <div class="total-card">
        <span class="material-symbols-outlined total-icon" :style="{ color: totalLucro >= 0 ? '#16a34a' : '#dc2626' }">trending_up</span>
        <div>
          <p class="total-label">Lucro estimado</p>
          <p class="total-val" :style="{ color: totalLucro >= 0 ? 'var(--text)' : '#dc2626' }">{{ fmtMoeda(totalLucro) }}</p>
          <p class="total-sub">{{ totalLucro >= 0 ? fmtPct(margemLucro) + ' de margem' : 'prejuízo' }}</p>
        </div>
      </div>
    </div>

    <!-- Modal mudar status -->
    <Teleport to="body">
      <div v-if="statusModal.visivel" class="modal-backdrop" @click.self="statusModal.visivel = false">
        <div class="modal-box modal-sm">
          <div class="modal-header">
            <span class="material-symbols-outlined" style="color:#6366f1">swap_horiz</span>
            <h3>Alterar Status</h3>
            <button class="modal-close" @click="statusModal.visivel = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <p class="confirm-msg">Projeto: <strong>{{ statusModal.projeto?.titulo }}</strong></p>
            <p class="confirm-msg" style="margin-bottom:14px">Selecione o novo status:</p>
            <div class="status-opcoes">
              <button
                v-for="s in STATUS_LIST"
                :key="s.value"
                :class="['status-opcao', `st-${s.value}`, { ativo: statusModal.projeto?.status === s.value }]"
                @click="confirmarMudarStatus(s.value)"
                :disabled="salvandoStatus || statusModal.projeto?.status === s.value"
              >
                <span v-if="salvandoStatus && statusModal.novoStatus === s.value" class="spinner-xs-dark"></span>
                {{ s.label }}
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="statusModal.visivel = false">Cancelar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal confirmação NF-e -->
    <Teleport to="body">
      <div v-if="nfeConfirm.visivel" class="modal-backdrop" @click.self="nfeConfirm.visivel = false">
        <div class="modal-box">
          <div class="modal-header">
            <span class="material-symbols-outlined" style="color:#a855f7">receipt_long</span>
            <h3>Emitir NF-e</h3>
            <button class="modal-close" @click="nfeConfirm.visivel = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <p class="confirm-msg">Deseja emitir a Nota Fiscal para o projeto:</p>
            <p class="confirm-titulo">{{ nfeConfirm.projeto?.titulo }}</p>
            <p class="confirm-valor">{{ fmtMoeda(nfeConfirm.projeto?.valor) }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="nfeConfirm.visivel = false">Cancelar</button>
            <button class="btn-nfe-confirm" @click="confirmarEmissao">
              <span class="material-symbols-outlined" style="font-size:15px">receipt</span>
              Emitir NF-e
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal resultado NF-e -->
    <Teleport to="body">
      <div v-if="nfeModal.visivel" class="modal-backdrop" @click.self="nfeModal.visivel = false">
        <div class="modal-box">
          <div class="modal-header">
            <span class="material-symbols-outlined" :style="{ color: nfeModal.ok ? '#16a34a' : '#dc2626' }">
              {{ nfeModal.ok ? 'check_circle' : 'cancel' }}
            </span>
            <h3>{{ nfeModal.ok ? 'NF-e Autorizada' : 'Erro na emissão da NF-e' }}</h3>
            <button class="modal-close" @click="nfeModal.visivel = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div v-if="nfeModal.ok" class="nfe-info-grid">
              <div class="nfe-info-item">
                <span class="nfe-info-label">Número</span>
                <span class="nfe-info-val">{{ nfeModal.numero || '—' }}</span>
              </div>
              <div class="nfe-info-item">
                <span class="nfe-info-label">Protocolo</span>
                <span class="nfe-info-val mono">{{ nfeModal.protocolo || '—' }}</span>
              </div>
              <div class="nfe-info-item full">
                <span class="nfe-info-label">Chave de Acesso</span>
                <span class="nfe-info-val mono small">{{ nfeModal.chave || '—' }}</span>
              </div>
            </div>
            <div v-else class="nfe-erro-box">
              <p class="nfe-erro-msg">{{ nfeModal.erro }}</p>
              <ul v-if="nfeModal.detalhes?.length" class="nfe-detalhes-list">
                <li v-for="(d, i) in nfeModal.detalhes" :key="i">{{ d }}</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <a v-if="nfeModal.danfe" :href="nfeModal.danfe" target="_blank" class="btn-primary">
              <span class="material-symbols-outlined" style="font-size:15px">open_in_new</span>
              Abrir DANFE
            </a>
            <button class="btn-ghost" @click="nfeModal.visivel = false">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { useParametrosStore } from '../stores/parametros';
import { imprimirReciboProj } from '../utils/recibo';
import { supabase } from '../composables/useSupabase';
import apiClient from '../services/api';

const sessao          = useSessaoStore();
const parametrosStore = useParametrosStore();
const showToast       = inject('showToast');

const POR_PAGINA = 20;

const STATUS_LIST = [
  { value: 'a_montar',  label: 'À montar' },
  { value: 'montado',   label: 'Montado'  },
  { value: 'cancelado', label: 'Cancelado' },
];

const LABELS = { a_montar: 'À montar', montado: 'Montado', cancelado: 'Cancelado' };
function labelStatus(s) { return LABELS[s] || s; }

const lista        = ref([]);
const carregando   = ref(true);
const filtroStatus = ref('');
const emitindoPk   = ref(null);
const paginaAtual  = ref(1);

const salvandoStatus = ref(false);
const statusModal    = ref({ visivel: false, projeto: null, novoStatus: null });
const nfeConfirm     = ref({ visivel: false, projeto: null });
const nfeModal       = ref({
  visivel: false, ok: false, numero: null, protocolo: null,
  chave: null, danfe: null, erro: null, detalhes: [],
});

const listaFiltrada = computed(() =>
  filtroStatus.value ? lista.value.filter(p => p.status === filtroStatus.value) : lista.value
);

const totalPaginas  = computed(() => Math.max(1, Math.ceil(listaFiltrada.value.length / POR_PAGINA)));
const listaPaginada = computed(() => {
  const ini = (paginaAtual.value - 1) * POR_PAGINA;
  return listaFiltrada.value.slice(ini, ini + POR_PAGINA);
});

const totalFaturado = computed(() =>
  lista.value.filter(p => p.status !== 'cancelado').reduce((s, p) => s + parseFloat(p.valor || 0), 0)
);
const totalCusto = computed(() =>
  lista.value.filter(p => p.status !== 'cancelado').reduce((s, p) => s + parseFloat(p.custo || 0), 0)
);
const totalLucro  = computed(() => totalFaturado.value - totalCusto.value);
const margemLucro = computed(() => totalFaturado.value > 0 ? (totalLucro.value / totalFaturado.value) * 100 : 0);

function fmtPct(v) { return v.toFixed(1).replace('.', ',') + '%'; }

function fmtMoeda(v) {
  return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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

// ── Mudar status ──────────────────────────────────────────────────
function abrirMudarStatus(p) {
  statusModal.value = { visivel: true, projeto: p, novoStatus: null };
}

async function confirmarMudarStatus(novoStatus) {
  const p = statusModal.value.projeto;
  statusModal.value.novoStatus = novoStatus;
  salvandoStatus.value = true;
  try {
    const { error } = await supabase
      .from('projetos')
      .update({ status: novoStatus })
      .eq('pk', p.pk);
    if (error) throw error;
    p.status = novoStatus;
    statusModal.value.visivel = false;
    showToast(`Status alterado para "${labelStatus(novoStatus)}".`);
  } catch (e) {
    showToast('Erro ao alterar status: ' + e.message, 'error');
  } finally {
    salvandoStatus.value = false;
  }
}

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
function emitirNfe(p) {
  if (!p.clientes) {
    nfeModal.value = { visivel: true, ok: false, erro: 'Este projeto não possui cliente vinculado. Vincule um cliente antes de emitir a NF-e.', detalhes: [], numero: null, protocolo: null, chave: null, danfe: null };
    return;
  }
  const cli = p.clientes;
  const faltando = [];
  if (!String(cli.logradouro || '').trim()) faltando.push('Logradouro');
  if (!String(cli.cidade     || '').trim()) faltando.push('Município (cidade)');
  if (!String(cli.uf         || '').trim()) faltando.push('UF (estado)');
  if (faltando.length) {
    nfeModal.value = { visivel: true, ok: false,
      erro: `O cadastro do cliente "${cli.nome}" está incompleto. Complete o endereço antes de emitir a NF-e.`,
      detalhes: faltando.map(f => `Campo obrigatório faltando: ${f}`),
      numero: null, protocolo: null, chave: null, danfe: null };
    return;
  }
  nfeConfirm.value = { visivel: true, projeto: p };
}

async function confirmarEmissao() {
  const p = nfeConfirm.value.projeto;
  nfeConfirm.value.visivel = false;
  emitindoPk.value = p.pk;
  try {
    const amb = Number(parametrosStore.getParam('nfe_ambiente', 2));
    const { data } = await apiClient.post(`/api/projetos/${p.pk}/emitir-nfe`, { ambiente: amb });

    nfeModal.value = {
      visivel:   true,
      ok:        !!data.ok,
      numero:    data.numero    || null,
      protocolo: data.protocolo || null,
      chave:     data.chave     || null,
      danfe:     data.danfe     || null,
      erro:      data.erro      || (data.ok ? null : 'Erro ao emitir NF-e'),
      detalhes:  data.detalhes  || [],
    };

    if (data.ok) await carregar();
  } catch (e) {
    const resp = e.response?.data;
    nfeModal.value = {
      visivel:  true,
      ok:       false,
      erro:     resp?.erro || e.message,
      detalhes: resp?.detalhes || [],
      numero: null, protocolo: null, chave: null, danfe: null,
    };
  } finally {
    emitindoPk.value = null;
  }
}
</script>

<style scoped>
/* ── Container ─────────────────────────────────────────────── */
.page-wrap   { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
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
  text-align: center; padding: 1rem 1.1rem;
  background: var(--bg3); color: var(--text);
  font-weight: 800; border-bottom: 2px solid var(--border); white-space: nowrap;
}
.tabela td { padding: 0.85rem 1.1rem; border-bottom: 1px solid var(--border); color: var(--text); }
.tabela-row:hover td { background: var(--bg3); }
.tabela-row:last-child td { border-bottom: none; }
.text-center { text-align: center; }
.bold  { font-weight: 700; }
.mono  { font-variant-numeric: tabular-nums; }

/* ── Paginação ─────────────────────────────────────────────── */
.paginacao {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 12px; border-top: 1.5px solid var(--border);
}
.pg-btn {
  background: var(--bg3); border: 1.5px solid var(--border); border-radius: 8px;
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  color: var(--text); cursor: pointer; transition: background .13s;
}
.pg-btn:hover:not(:disabled) { background: var(--bg4); }
.pg-btn:disabled { opacity: .35; cursor: not-allowed; }
.pg-info { font-size: 13px; font-weight: 700; color: var(--text2); }

/* ── Totalizadores ─────────────────────────────────────────── */
.totais-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
}
.total-card {
  background: var(--bg2); border: 1.5px solid var(--border); border-radius: 14px;
  padding: 16px 20px; display: flex; align-items: center; gap: 14px;
}
.total-icon   { font-size: 32px; flex-shrink: 0; }
.total-label  { margin: 0 0 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--text2); }
.total-val    { margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--text); }
.total-sub    { margin: 2px 0 0; font-size: 11px; color: var(--text2); }

/* ── Status pill / btn ─────────────────────────────────────── */
.status-pill {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 800; white-space: nowrap;
}
.status-btn {
  border: none; cursor: pointer; transition: opacity .13s;
}
.status-btn:hover { opacity: .8; }
.st-a_montar  { background: rgba(234,179,8,.15);   color: #ca8a04; }
.st-montado   { background: rgba(34,197,94,.15);   color: #16a34a; }
.st-cancelado { background: rgba(239,68,68,.15);   color: #dc2626; }
.st-nfe-ok    { background: rgba(34,197,94,.15);   color: #16a34a; }
.st-nfe-pend  { background: rgba(148,163,184,.12); color: var(--text2); }

/* ── Modal status opcoes ───────────────────────────────────── */
.modal-sm { max-width: 380px; }
.status-opcoes { display: flex; flex-direction: column; gap: 8px; }
.status-opcao {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px; border-radius: 10px; border: 2px solid transparent;
  font-size: 13.5px; font-weight: 700; cursor: pointer; transition: opacity .13s, border-color .13s;
}
.status-opcao:hover:not(:disabled) { opacity: .85; border-color: currentColor; }
.status-opcao:disabled { opacity: .4; cursor: not-allowed; }
.status-opcao.ativo { border-color: currentColor; opacity: .5; cursor: default; }

/* ── Ações ─────────────────────────────────────────────────── */
.actions { display: flex; gap: 6px; justify-content: center; }
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

/* ── Modal ─────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 16px;
}
.modal-box {
  background: var(--bg2); border: 1.5px solid var(--border);
  border-radius: 18px; width: 100%; max-width: 540px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.4);
}
.modal-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; border-bottom: 1.5px solid var(--border);
  background: var(--bg3);
}
.modal-header h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text); flex: 1; }
.modal-header .material-symbols-outlined { font-size: 26px; }
.modal-close {
  background: none; border: none; color: var(--text2);
  cursor: pointer; padding: 4px; display: flex; align-items: center;
}
.modal-close:hover { color: var(--text); }
.modal-body   { padding: 20px; }
.modal-footer {
  padding: 14px 20px; border-top: 1.5px solid var(--border);
  display: flex; justify-content: flex-end; gap: 10px;
  background: var(--bg3);
}

.confirm-msg    { margin: 0 0 4px; font-size: 13.5px; color: var(--text2); }
.confirm-titulo { margin: 0 0 4px; font-size: 1rem; font-weight: 800; color: var(--text); }
.confirm-valor  { margin: 0; font-size: 1.1rem; font-weight: 700; color: #a855f7; }
.btn-nfe-confirm {
  background: #a855f7; color: #fff; border: none;
  padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 700;
  cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 7px;
  transition: opacity .15s;
}
.btn-nfe-confirm:hover { opacity: .88; }

.nfe-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.nfe-info-item { display: flex; flex-direction: column; gap: 4px; }
.nfe-info-item.full { grid-column: 1 / -1; }
.nfe-info-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; color: var(--text2); }
.nfe-info-val   { font-size: 13.5px; font-weight: 600; color: var(--text); }
.nfe-info-val.mono  { font-family: monospace; font-size: 12px; word-break: break-all; }
.nfe-info-val.small { font-size: 11px; }

.nfe-erro-box  { background: rgba(239,68,68,.08); border: 1.5px solid rgba(239,68,68,.25); border-radius: 10px; padding: 14px 16px; }
.nfe-erro-msg  { margin: 0; font-size: 13.5px; color: #dc2626; font-weight: 600; line-height: 1.5; }
.nfe-detalhes-list { margin: 10px 0 0; padding: 0 0 0 18px; font-size: 12.5px; color: #b91c1c; line-height: 1.6; }

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
.spinner-xs-dark {
  width: 13px; height: 13px; flex-shrink: 0;
  border: 2px solid rgba(0,0,0,.15); border-top-color: currentColor;
  border-radius: 50%; animation: spin .7s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media(max-width: 900px) {
  .totais-grid { grid-template-columns: repeat(2, 1fr); }
}
@media(max-width: 480px) {
  .totais-grid { grid-template-columns: 1fr; }
}
</style>
