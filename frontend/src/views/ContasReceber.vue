<template>
  <div class="cr-wrap">

    <!-- ── Cabeçalho ────────────────────────────────────────────── -->
    <div class="cr-header-wrap">
      <div class="cr-header">
        <div class="title-row">
          <div class="title-icon-wrap">
            <span class="material-symbols-outlined title-icon">account_balance_wallet</span>
          </div>
          <div>
            <h2 class="cr-title">Contas a Receber</h2>
            <p class="cr-sub">Crediário e pagamentos pendentes de clientes</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" @click="carregar" :disabled="carregando">
            <span class="material-symbols-outlined" :class="{ 'spin-icon': carregando }">refresh</span>
            <span class="btn-label">Atualizar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Cards de resumo ────────────────────────────────────────── -->
    <div class="resumo-scroll-wrap">
    <div class="resumo-grid">

      <!-- Pendente -->
      <div class="resumo-card">
        <div class="rc-stripe pendente"></div>
        <div class="rc-body">
          <div class="rc-top">
            <div class="rc-icon pendente">
              <span class="material-symbols-outlined">schedule</span>
            </div>
            <div class="rc-badge pendente-badge">
              <span class="material-symbols-outlined">trending_up</span>
              {{ contPendente }} conta{{ contPendente !== 1 ? 's' : '' }}
            </div>
          </div>
          <div class="rc-value">{{ fmt(totalPendente) }}</div>
          <div class="rc-label">PENDENTE</div>
        </div>
      </div>

      <!-- Vencido -->
      <div class="resumo-card">
        <div class="rc-stripe vencido"></div>
        <div class="rc-body">
          <div class="rc-top">
            <div class="rc-icon vencido">
              <span class="material-symbols-outlined">error</span>
            </div>
            <div class="rc-badge vencido-badge">
              <span class="material-symbols-outlined">warning</span>
              {{ contVencido }} em atraso
            </div>
          </div>
          <div class="rc-value danger">{{ fmt(totalVencido) }}</div>
          <div class="rc-label">VENCIDO</div>
        </div>
      </div>

      <!-- Recebido -->
      <div class="resumo-card">
        <div class="rc-stripe recebido"></div>
        <div class="rc-body">
          <div class="rc-top">
            <div class="rc-icon recebido">
              <span class="material-symbols-outlined">check_circle</span>
            </div>
            <div class="rc-badge recebido-badge">
              <span class="material-symbols-outlined">check</span>
              {{ contRecebido }} recebida{{ contRecebido !== 1 ? 's' : '' }}
            </div>
          </div>
          <div class="rc-value success">{{ fmt(totalRecebido) }}</div>
          <div class="rc-label">RECEBIDO</div>
        </div>
      </div>

    </div>
    </div>

    <!-- ── Barra de filtros ──────────────────────────────────────── -->
    <div class="filter-bar">
      <div class="search-wrap">
        <span class="material-symbols-outlined search-icon">search</span>
        <input v-model="busca" type="text" placeholder="Procurar cliente ou nº da venda..." class="search-input" />
        <button v-if="busca" class="search-clear" @click="busca = ''" title="Limpar">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="filter-right">
        <div class="filter-field">
          <span class="material-symbols-outlined filter-sel-icon">filter_list</span>
          <select v-model="filtroStatus" class="status-select">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
            <option value="recebido">Recebido</option>
          </select>
        </div>
        <button class="btn-export" @click="exportarCSV" title="Exportar CSV">
          <span class="material-symbols-outlined">download</span>
          <span class="btn-label">Exportar</span>
        </button>
      </div>
    </div>

    <!-- ── Estado: carregando ────────────────────────────────────── -->
    <div v-if="carregando" class="estado-vazio">
      <div class="spinner-lg"></div>
      <p>Carregando contas a receber...</p>
    </div>

    <!-- ── Estado: vazio ─────────────────────────────────────────── -->
    <div v-else-if="filtrados.length === 0" class="estado-vazio">
      <span class="material-symbols-outlined estado-icon">inbox</span>
      <p>Nenhuma conta encontrada para os filtros aplicados.</p>
    </div>

    <!-- ── Tabela (desktop) ──────────────────────────────────────── -->
    <div v-else class="table-card">
      <div class="table-header-bar">
        <span class="table-count">
          {{ filtrados.length }} conta{{ filtrados.length !== 1 ? 's' : '' }}
          <span v-if="totalPaginas > 1" class="page-info"> — pág. {{ paginaAtual }}/{{ totalPaginas }}</span>
        </span>
      </div>

      <!-- Tabela desktop -->
      <div class="overflow-x desktop-table">
        <table class="tabela">
          <thead>
            <tr>
              <th style="width:70px">Nº</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th style="width:110px">Data Venda</th>
              <th style="width:110px">Vencimento</th>
              <th class="text-right" style="width:120px">Valor</th>
              <th style="width:105px">Status</th>
              <th v-if="temFormaRecebimento" style="width:100px">Recebido via</th>
              <th class="text-right" style="width:120px">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in paginados" :key="v.pk" :class="['cr-row', v.status_calc]">
              <td class="td-num">
                <span class="num-badge">#{{ v.numero }}</span>
              </td>
              <td>
                <div class="cliente-cell">
                  <div class="avatar" :style="{ background: avatarColor(v.cliente_nome) }">
                    {{ initials(v.cliente_nome) }}
                  </div>
                  <span class="cliente-nome">{{ v.cliente_nome || 'Sem cliente' }}</span>
                </div>
              </td>
              <td class="td-muted">{{ v.vendedor || '—' }}</td>
              <td class="td-date">{{ fmtDate(v.criado_em) }}</td>
              <td>
                <div class="venc-cell" :class="{ 'venc-danger': v.status_calc === 'vencido' }">
                  <span class="material-symbols-outlined venc-ico" v-if="v.status_calc === 'vencido'">warning</span>
                  {{ fmtDateOnly(v.data_vencimento_crediario) }}
                </div>
              </td>
              <td class="text-right td-val">{{ fmt(v.valor_crediario) }}</td>
              <td>
                <span :class="['status-tag', v.status_calc]">
                  <span class="material-symbols-outlined tag-icon">{{ statusIcon(v.status_calc) }}</span>
                  {{ labelStatus(v.status_calc) }}
                </span>
              </td>
              <td v-if="temFormaRecebimento" class="td-muted td-forma">
                {{ v.forma_recebimento ? (formaLabel[v.forma_recebimento] || v.forma_recebimento) : '—' }}
              </td>
              <td class="text-right">
                <button v-if="v.status_crediario === 'pendente'" class="btn-receber" :disabled="recebendoPk === v.pk" @click="receber(v)">
                  <span class="material-symbols-outlined">payments</span>
                  Receber
                </button>
                <button v-if="v.status_crediario === 'recebido'" class="btn-desfazer" @click="desfazer(v)">
                  <span class="material-symbols-outlined">undo</span>
                  Desfazer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Cards mobile -->
      <div class="mobile-cards">
        <div v-for="v in paginados" :key="v.pk" class="mob-card" :class="v.status_calc">
          <div class="mob-card-header">
            <div class="mob-cliente-row">
              <div class="avatar" :style="{ background: avatarColor(v.cliente_nome) }">
                {{ initials(v.cliente_nome) }}
              </div>
              <div class="mob-cliente-info">
                <span class="mob-nome">{{ v.cliente_nome || 'Sem cliente' }}</span>
                <span class="mob-num">#{{ v.numero }}</span>
              </div>
            </div>
            <span :class="['status-tag', v.status_calc]">
              <span class="material-symbols-outlined tag-icon">{{ statusIcon(v.status_calc) }}</span>
              {{ labelStatus(v.status_calc) }}
            </span>
          </div>
          <div class="mob-details">
            <div class="mob-detail">
              <span class="mob-det-label">Vencimento</span>
              <span class="mob-det-val" :class="{ 'text-danger': v.status_calc === 'vencido' }">
                {{ fmtDateOnly(v.data_vencimento_crediario) }}
              </span>
            </div>
            <div class="mob-detail">
              <span class="mob-det-label">Valor</span>
              <span class="mob-det-val mob-valor">{{ fmt(v.valor_crediario) }}</span>
            </div>
          </div>
          <button v-if="v.status_crediario === 'pendente'" class="btn-receber full-width" :disabled="recebendoPk === v.pk" @click="receber(v)">
            <span class="material-symbols-outlined">payments</span>
            Receber
          </button>
          <button v-if="v.status_crediario === 'recebido'" class="btn-desfazer full-width" @click="desfazer(v)">
            <span class="material-symbols-outlined">undo</span>
            Desfazer Recebimento
          </button>
        </div>
      </div>

      <!-- Paginação -->
      <div v-if="totalPaginas > 1" class="pagination">
        <button class="pg-btn" :disabled="paginaAtual === 1" @click="paginaAtual = 1">
          <span class="material-symbols-outlined">first_page</span>
        </button>
        <button class="pg-btn" :disabled="paginaAtual === 1" @click="paginaAtual--">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <template v-for="p in paginasVisiveis" :key="p">
          <span v-if="p === '...'" class="pg-ellipsis">···</span>
          <button v-else :class="['pg-btn', 'pg-num', { active: p === paginaAtual }]" @click="paginaAtual = p">{{ p }}</button>
        </template>
        <button class="pg-btn" :disabled="paginaAtual === totalPaginas" @click="paginaAtual++">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
        <button class="pg-btn" :disabled="paginaAtual === totalPaginas" @click="paginaAtual = totalPaginas">
          <span class="material-symbols-outlined">last_page</span>
        </button>
        <span class="pg-info">{{ itensDe }}–{{ itensAte }} de {{ filtrados.length }}</span>
      </div>

      <div class="table-footer-bar">
        <span>{{ filtrados.length }} conta{{ filtrados.length !== 1 ? 's' : '' }} exibida{{ filtrados.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- ── MODAL: Confirmar Recebimento ────────────────────────────── -->
    <Teleport to=".festou-root">
      <div v-if="recebModal" class="modal-backdrop" @click.self="recebModal = null">
        <div class="receb-modal animate-slide-up">

          <!-- Botão fechar (canto) -->
          <button class="receb-close" @click="recebModal = null" title="Fechar">
            <span class="material-symbols-outlined">close</span>
          </button>

          <!-- Ícone de check no topo -->
          <div class="receb-check-circle">
            <span class="material-symbols-outlined">check_circle</span>
          </div>

          <!-- Identificador da venda -->
          <div class="receb-tag">VENDA #{{ recebModal.numero }}</div>

          <!-- Valor em destaque -->
          <div class="receb-valor">{{ fmt(recebModal.total) }}</div>

          <!-- Nome do cliente -->
          <div class="receb-cliente">
            <div class="avatar" :style="{ background: avatarColor(recebModal.cliente_nome) }">
              {{ initials(recebModal.cliente_nome) }}
            </div>
            <span class="receb-nome">{{ recebModal.cliente_nome || 'Cliente não informado' }}</span>
          </div>

          <!-- Divisor -->
          <div class="receb-divider">
            <span>Selecione a forma de recebimento</span>
          </div>

          <!-- Grid de formas -->
          <div v-if="!formas.length" class="sem-formas">
            Nenhuma forma de pagamento cadastrada.
          </div>
          <div v-else class="receb-forma-grid">
            <button
              v-for="f in formas"
              :key="f.val"
              :class="['receb-forma-btn', { active: formaRecebimento === f.val }]"
              @click="formaRecebimento = f.val"
            >
              <span class="receb-forma-ico">{{ f.ico || '💳' }}</span>
              <span class="receb-forma-nome">{{ f.label }}</span>
              <span v-if="formaRecebimento === f.val" class="receb-forma-check">
                <span class="material-symbols-outlined">check</span>
              </span>
            </button>
          </div>

          <!-- Card informativo mobile -->
          <div class="receb-info-banner">
            <span class="material-symbols-outlined banner-info-icon">info</span>
            <div>
              <span class="banner-info-title">Comprovante Digital</span>
              <span class="banner-info-sub">Registro salvo automaticamente no sistema.</span>
            </div>
          </div>

          <!-- Rodapé -->
          <div class="receb-footer">
            <button class="receb-btn-cancel" @click="recebModal = null">Cancelar</button>
            <button class="receb-btn-confirm" :disabled="!formaRecebimento" @click="confirmarReceber">
              <span class="material-symbols-outlined">check_circle</span>
              Confirmar Recebimento
            </button>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- ── MODAL: Desfazer ───────────────────────────────────────── -->
    <Teleport to=".festou-root">
      <div v-if="desfazModal" class="modal-backdrop" @click.self="desfazModal = null">
        <div class="modal-box animate-slide-up" style="max-width:400px">
          <div class="modal-header">
            <div class="modal-title-row">
              <div class="modal-hdr-icon desfazer-icon">
                <span class="material-symbols-outlined">undo</span>
              </div>
              <div>
                <h3 class="modal-title">Desfazer Recebimento</h3>
                <p class="modal-subtitle">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <button class="modal-close" @click="desfazModal = null">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="desfazer-info">
              <span class="material-symbols-outlined desfazer-warn-icon">warning</span>
              <p>Você está desfazendo o recebimento da <strong>Venda #{{ desfazModal.numero }}</strong>. O status voltará para pendente.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="desfazModal = null">Cancelar</button>
            <button class="btn-desfazer-confirm" @click="confirmarDesfazer">
              <span class="material-symbols-outlined">undo</span>
              Desfazer
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="cr-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';
import apiClient from '../services/api';

const sessaoStore      = useSessaoStore();
const lista            = ref([]);
const carregando       = ref(true);
const busca            = ref('');
const filtroStatus     = ref('');
const recebendoPk      = ref(null);
const recebModal       = ref(null);
const desfazModal      = ref(null);
const formaRecebimento = ref('');
const toastMsg         = ref('');
const toastTipo        = ref('ok');
let   _toastTimer      = null;

const totais = ref({ totalPendente: 0, totalVencido: 0, totalRecebido: 0 });
const formas = ref([]);

// ── Paginação ───────────────────────────────────────────────────
const ITEMS_POR_PAGINA = 15;
const paginaAtual = ref(1);

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / ITEMS_POR_PAGINA)));
const itensDe = computed(() => (paginaAtual.value - 1) * ITEMS_POR_PAGINA + 1);
const itensAte = computed(() => Math.min(paginaAtual.value * ITEMS_POR_PAGINA, filtrados.value.length));

const paginados = computed(() => {
  const ini = (paginaAtual.value - 1) * ITEMS_POR_PAGINA;
  return filtrados.value.slice(ini, ini + ITEMS_POR_PAGINA);
});

const paginasVisiveis = computed(() => {
  const total = totalPaginas.value;
  const cur = paginaAtual.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (cur > 3) pages.push(1, '...');
  for (let p = Math.max(1, cur - 2); p <= Math.min(total, cur + 2); p++) pages.push(p);
  if (cur < total - 2) pages.push('...', total);
  return pages;
});

// ── Computed ────────────────────────────────────────────────────
const formaLabel = computed(() => {
  const m = {};
  formas.value.forEach(f => { m[f.val] = f.label; });
  return m;
});

const filtrados = computed(() => {
  let l = lista.value;
  const q = busca.value.trim().toLowerCase();
  if (q) l = l.filter(v => (v.cliente_nome || '').toLowerCase().includes(q) || String(v.numero).includes(q));
  if (filtroStatus.value) l = l.filter(v => v.status_calc === filtroStatus.value);
  return l;
});

watch([busca, filtroStatus], () => { paginaAtual.value = 1; });

const totalPendente = computed(() => totais.value.totalPendente);
const totalVencido  = computed(() => totais.value.totalVencido);
const totalRecebido = computed(() => totais.value.totalRecebido);
const contPendente  = computed(() => lista.value.filter(v => v.status_calc === 'pendente').length);
const contVencido   = computed(() => lista.value.filter(v => v.status_calc === 'vencido').length);
const contRecebido  = computed(() => lista.value.filter(v => v.status_calc === 'recebido').length);
const temFormaRecebimento = computed(() => lista.value.some(v => v.forma_recebimento));

onMounted(carregar);

async function carregar() {
  carregando.value = true;
  paginaAtual.value = 1;
  try {
    const [resLista, resFormas] = await Promise.all([
      apiClient.get('/api/contas-receber', { params: { filial_pk: sessaoStore.filial?.pk } }),
      supabase.from('formas_pagamento').select('pk, forma, label, icone').eq('filial_pk', sessaoStore.filial.pk).eq('ativo', true).order('ordem'),
    ]);
    lista.value  = resLista.data.data || [];
    totais.value = {
      totalPendente: resLista.data.totalPendente || 0,
      totalVencido:  resLista.data.totalVencido  || 0,
      totalRecebido: resLista.data.totalRecebido || 0,
    };
    formas.value = (resFormas.data || []).map(f => ({ val: f.forma, label: f.label, ico: f.icone }));
  } catch (e) {
    toast('Erro ao carregar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function receber(v) { formaRecebimento.value = ''; recebModal.value = v; }
function desfazer(v) { desfazModal.value = v; }

async function confirmarReceber() {
  const v = recebModal.value;
  recebModal.value = null;
  recebendoPk.value = v.pk;
  try {
    await apiClient.patch(`/api/contas-receber/${v.pk}/receber`, { forma_recebimento: formaRecebimento.value });
    toast(`Venda #${v.numero} recebida com sucesso.`);
    await carregar();
  } catch (e) {
    toast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    recebendoPk.value = null;
  }
}

async function confirmarDesfazer() {
  const v = desfazModal.value;
  desfazModal.value = null;
  try {
    await apiClient.patch(`/api/contas-receber/${v.pk}/desfazer`);
    toast(`Venda #${v.numero} voltou para pendente.`);
    await carregar();
  } catch (e) {
    toast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  }
}

function exportarCSV() {
  const bom = '﻿';
  const header = 'Nº,Cliente,Vendedor,Data Venda,Vencimento,Valor,Status';
  const rows = filtrados.value.map(v => [
    v.numero,
    `"${(v.cliente_nome || '').replace(/"/g, '""')}"`,
    `"${(v.vendedor || '').replace(/"/g, '""')}"`,
    fmtDate(v.criado_em),
    fmtDateOnly(v.data_vencimento_crediario),
    (v.valor_crediario || 0).toFixed(2).replace('.', ','),
    labelStatus(v.status_calc),
  ].join(','));
  const csv = bom + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'contas_receber.csv'; a.click();
  URL.revokeObjectURL(url);
}

function toast(msg, tipo = 'ok', dur = 3500) {
  clearTimeout(_toastTimer);
  toastMsg.value = msg; toastTipo.value = tipo;
  _toastTimer = setTimeout(() => { toastMsg.value = ''; }, dur);
}

function labelStatus(s) {
  return { recebido: 'Recebido', vencido: 'Vencido', pendente: 'Pendente' }[s] || s;
}

function statusIcon(s) {
  return { recebido: 'check_circle', vencido: 'error', pendente: 'schedule' }[s] || 'help';
}

function initials(nome) {
  if (!nome) return '?';
  const parts = nome.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#06b6d4','#f97316','#14b8a6'];
function avatarColor(nome) {
  if (!nome) return AVATAR_COLORS[0];
  let sum = 0; for (const c of nome) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtDateOnly(d) {
  if (!d) return '—';
  const [y, m, dia] = d.split('-');
  return `${dia}/${m}/${y}`;
}

onUnmounted(() => { clearTimeout(_toastTimer); });
</script>

<style scoped>
/* ── Base ──────────────────────────────────────────────────────── */
.cr-wrap { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 2rem; }

/* ── Cabeçalho ─────────────────────────────────────────────────── */
.cr-header-wrap {
  background: white; border: 1px solid var(--border); border-radius: 14px;
  overflow: hidden;
}
[data-theme="dark"] .cr-header-wrap { background: var(--bg2); }

.cr-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; padding: 1.2rem 1.5rem; }
.title-row { display: flex; align-items: center; gap: 0.85rem; }
.title-icon-wrap {
  width: 48px; height: 48px; border-radius: 14px;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.title-icon { font-size: 1.5rem; color: white; }
.cr-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--text); }
.cr-sub { margin: 0; font-size: 0.82rem; color: var(--text2); }
.header-actions { display: flex; gap: 0.75rem; }

/* Barra de mini-pills rápida */
.header-accent-bar {
  display: flex; gap: 0; border-top: 1px solid var(--border);
  background: var(--bg3); overflow: hidden;
}
[data-theme="light"] .header-accent-bar { background: #f8fafc; }
.accent-pill {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.55rem 1.2rem; font-size: 0.75rem; font-weight: 700;
  border-right: 1px solid var(--border); white-space: nowrap;
}
.accent-pill:last-child { border-right: none; }
.accent-pill .material-symbols-outlined { font-size: 0.9rem; }
.pendente-pill { color: #d97706; }
.vencido-pill  { color: #ef4444; }
.recebido-pill { color: #10b981; }

.btn-refresh {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 1.1rem; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text); cursor: pointer; font-size: 0.87rem; font-weight: 600;
  transition: background 0.15s;
}
.btn-refresh:hover { background: var(--bg3); }
.btn-refresh .material-symbols-outlined { font-size: 1.1rem; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Cards de resumo ───────────────────────────────────────────── */
.resumo-scroll-wrap { overflow: visible; }
.resumo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }

.resumo-card {
  background: white; border-radius: 14px; border: 1px solid var(--border);
  overflow: hidden; display: flex; flex-direction: row;
  transition: box-shadow 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.resumo-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.09); }
[data-theme="dark"] .resumo-card { background: var(--bg2); }

.rc-stripe { width: 5px; flex-shrink: 0; }
.rc-stripe.pendente { background: #f59e0b; }
.rc-stripe.vencido  { background: #ef4444; }
.rc-stripe.recebido { background: #10b981; }

.rc-body { padding: 1.3rem 1.4rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
.rc-top { display: flex; justify-content: space-between; align-items: center; }

.rc-icon {
  width: 42px; height: 42px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
}
.rc-icon .material-symbols-outlined { font-size: 1.3rem; }
.rc-icon.pendente { background: #fffbeb; color: #d97706; }
.rc-icon.vencido  { background: #fff0f0; color: #ef4444; }
.rc-icon.recebido { background: #f0fdf4; color: #10b981; }
[data-theme="dark"] .rc-icon.pendente { background: rgba(245,158,11,.15); color: #fbbf24; }
[data-theme="dark"] .rc-icon.vencido  { background: rgba(239,68,68,.15); color: #f87171; }
[data-theme="dark"] .rc-icon.recebido { background: rgba(16,185,129,.15); color: #34d399; }

.rc-badge {
  display: flex; align-items: center; gap: 4px;
  font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 20px;
}
.rc-badge .material-symbols-outlined { font-size: 0.85rem; }
.pendente-badge { background: #fffbeb; color: #92400e; }
.vencido-badge  { background: #fff0f0; color: #991b1b; }
.recebido-badge { background: #f0fdf4; color: #065f46; }
[data-theme="dark"] .pendente-badge { background: rgba(245,158,11,.15); color: #fbbf24; }
[data-theme="dark"] .vencido-badge  { background: rgba(239,68,68,.15); color: #f87171; }
[data-theme="dark"] .recebido-badge { background: rgba(16,185,129,.15); color: #34d399; }

.rc-value { font-size: 1.65rem; font-weight: 800; color: var(--text); line-height: 1; }
.rc-value.danger  { color: #ef4444; }
.rc-value.success { color: #10b981; }
.rc-label { font-size: 0.72rem; font-weight: 800; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; }

/* ── Filtros ───────────────────────────────────────────────────── */
.filter-bar {
  background: white; border: 1px solid var(--border); border-radius: 12px;
  padding: 0.9rem 1.2rem; display: flex; align-items: center;
  gap: 1rem; flex-wrap: wrap;
}
[data-theme="dark"] .filter-bar { background: var(--bg2); }

.search-wrap {
  position: relative; display: flex; align-items: center;
  flex: 1; min-width: 200px;
}
.search-icon {
  position: absolute; left: 0.75rem; font-size: 1.1rem;
  color: var(--text2); pointer-events: none;
}
.search-input {
  width: 100%; padding: 0.6rem 2.5rem 0.6rem 2.4rem;
  border: 1.5px solid var(--border); border-radius: 8px;
  background: var(--bg3); color: var(--text); outline: none;
  font-size: 0.875rem; transition: border-color 0.15s, background 0.15s;
}
[data-theme="light"] .search-input { background: white; }
.search-input:focus { border-color: var(--primary); background: white; }
[data-theme="dark"] .search-input:focus { background: var(--bg3); }
.search-clear {
  position: absolute; right: 0.6rem; background: none; border: none;
  cursor: pointer; color: var(--text2); display: flex; align-items: center;
  padding: 2px; border-radius: 4px; transition: color 0.15s;
}
.search-clear:hover { color: var(--text); }
.search-clear .material-symbols-outlined { font-size: 1rem; }

.filter-right { display: flex; align-items: center; gap: 0.75rem; }
.filter-field { display: flex; align-items: center; gap: 0.4rem; }
.filter-sel-icon { font-size: 1.1rem; color: var(--text2); }
.status-select {
  padding: 0.55rem 0.85rem; border: 1.5px solid var(--border); border-radius: 8px;
  background: white; color: var(--text); outline: none; font-size: 0.875rem;
  cursor: pointer; transition: border-color 0.15s;
}
[data-theme="dark"] .status-select { background: var(--bg3); }
.status-select:focus { border-color: var(--primary); }

.btn-export {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 1.1rem; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text2); cursor: pointer; font-size: 0.875rem; font-weight: 600;
  transition: all 0.15s; white-space: nowrap;
}
.btn-export:hover { background: var(--bg3); color: var(--text); border-color: var(--primary); }
.btn-export .material-symbols-outlined { font-size: 1.1rem; }

/* ── Estado vazio ──────────────────────────────────────────────── */
.estado-vazio {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.75rem; padding: 5rem 2rem; color: var(--text2); text-align: center;
}
.estado-icon { font-size: 3rem; opacity: 0.3; }
.estado-vazio p { margin: 0; font-size: 0.9rem; }
.spinner-lg {
  width: 36px; height: 36px; border: 3px solid var(--border);
  border-top-color: var(--primary); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ── Tabela ────────────────────────────────────────────────────── */
.table-card {
  background: white; border: 1px solid var(--border);
  border-radius: 14px; overflow: hidden;
}
[data-theme="dark"] .table-card { background: var(--bg2); }

.table-header-bar {
  padding: 0.9rem 1.2rem; border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
}
.table-count { font-size: 0.8rem; color: var(--text2); font-weight: 600; }
.page-info { opacity: 0.7; }

.overflow-x { overflow-x: auto; }

.tabela { width: 100%; border-collapse: collapse; font-size: 0.875rem; min-width: 780px; }
.tabela th {
  text-align: left; padding: 0.8rem 1rem;
  background: white; color: var(--text2);
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 2px solid var(--border); white-space: nowrap;
}
[data-theme="dark"] .tabela th { background: var(--bg2); }
.tabela td { padding: 0.9rem 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tabela tr:last-child td { border-bottom: none; }
.tabela tbody tr { transition: background 0.12s; }
.tabela tbody tr:hover { background: var(--bg3); }
.tabela tbody tr.vencido { background: rgba(239,68,68,.03); }
[data-theme="dark"] .tabela tbody tr.vencido { background: rgba(239,68,68,.06); }

/* Células */
.td-num { white-space: nowrap; }
.num-badge {
  display: inline-block; padding: 2px 8px; border-radius: 6px;
  background: var(--bg3); color: var(--text2);
  font-family: monospace; font-size: 0.8rem; font-weight: 700;
}

.cliente-cell { display: flex; align-items: center; gap: 0.65rem; }
.avatar {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 0.75rem; font-weight: 800; flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,.15);
  letter-spacing: 0.03em;
}
.avatar.lg { width: 46px; height: 46px; font-size: 1rem; }
.cliente-nome { font-weight: 600; color: var(--text); }

.td-muted { color: var(--text2); font-size: 0.83rem; }
.td-date { color: var(--text2); font-size: 0.83rem; white-space: nowrap; }
.td-val { font-weight: 700; font-family: 'Courier New', monospace; font-size: 0.9rem; }
.td-forma { white-space: nowrap; }

.venc-cell { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; white-space: nowrap; }
.venc-cell.venc-danger { color: #ef4444; font-weight: 700; }
.venc-ico { font-size: 0.9rem; }

/* Status tags */
.status-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 20px; font-size: 0.73rem; font-weight: 700;
}
.status-tag .tag-icon { font-size: 0.85rem; }
.status-tag.pendente { background: #fef9c3; color: #a16207; }
.status-tag.vencido  { background: #fee2e2; color: #991b1b; }
.status-tag.recebido { background: #d1fae5; color: #065f46; }
[data-theme="dark"] .status-tag.pendente { background: rgba(234,179,8,.15); color: #fbbf24; }
[data-theme="dark"] .status-tag.vencido  { background: rgba(239,68,68,.2); color: #f87171; }
[data-theme="dark"] .status-tag.recebido { background: rgba(16,185,129,.2); color: #34d399; }

/* Botões ação */
.btn-receber {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 0.45rem 0.9rem; border: none; border-radius: 8px;
  background: #00c853; color: white;
  font-size: 0.8rem; font-weight: 700; cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  box-shadow: 0 2px 6px rgba(0,200,83,.25);
}
.btn-receber:hover:not(:disabled) { background: #00b548; box-shadow: 0 3px 10px rgba(0,200,83,.35); }
.btn-receber:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.btn-receber .material-symbols-outlined { font-size: 0.95rem; }
.btn-receber.full-width { width: 100%; justify-content: center; padding: 0.65rem; font-size: 0.875rem; }

.btn-desfazer {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 0.45rem 0.9rem; border: 1px solid var(--border); border-radius: 8px;
  background: transparent; color: var(--text2);
  font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.btn-desfazer:hover { color: var(--text); border-color: var(--text2); background: var(--bg3); }
.btn-desfazer .material-symbols-outlined { font-size: 0.95rem; }
.btn-desfazer.full-width { width: 100%; justify-content: center; padding: 0.65rem; font-size: 0.875rem; }

/* Paginação */
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 1rem 1.2rem; border-top: 1px solid var(--border); flex-wrap: wrap;
}
.pg-btn {
  min-width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border);
  background: transparent; color: var(--text); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.87rem; font-weight: 600; transition: all 0.15s; padding: 0 4px;
}
.pg-btn:hover:not(:disabled) { background: var(--bg3); border-color: var(--primary); }
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-btn .material-symbols-outlined { font-size: 1.1rem; }
.pg-num.active { background: var(--primary); color: white; border-color: var(--primary); }
.pg-ellipsis { padding: 0 4px; color: var(--text2); font-size: 0.9rem; letter-spacing: 2px; }
.pg-info { margin-left: 8px; font-size: 0.78rem; color: var(--text2); font-weight: 600; white-space: nowrap; }

.table-footer-bar {
  padding: 0.65rem 1.2rem; border-top: 1px solid var(--border);
  font-size: 0.78rem; color: var(--text2); text-align: right;
}

/* ── Cards Mobile ──────────────────────────────────────────────── */
.mobile-cards { display: none; flex-direction: column; gap: 0; }

.mob-card {
  padding: 1rem 1.2rem; border-bottom: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 0.85rem;
  transition: background 0.12s;
}
.mob-card:last-child { border-bottom: none; }
.mob-card:hover { background: var(--bg3); }
.mob-card.vencido { background: rgba(239,68,68,.03); }

.mob-card-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.mob-cliente-row { display: flex; align-items: center; gap: 0.65rem; }
.mob-cliente-info { display: flex; flex-direction: column; }
.mob-nome { font-weight: 700; color: var(--text); font-size: 0.9rem; }
.mob-num { font-size: 0.72rem; color: var(--text2); font-family: monospace; }

.mob-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.mob-detail { display: flex; flex-direction: column; gap: 2px; }
.mob-det-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: 0.04em; }
.mob-det-val { font-size: 0.88rem; font-weight: 600; color: var(--text); }
.mob-valor { font-family: monospace; font-size: 0.95rem; }
.text-danger { color: #ef4444 !important; }

/* ── Backdrop compartilhado ────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.65); backdrop-filter: blur(8px);
  z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;
}

/* ── Modal Confirmar Recebimento ───────────────────────────────── */
.receb-modal {
  background: white; border-radius: 20px; border: 1px solid var(--border);
  width: 100%; max-width: 500px; max-height: 92vh; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center;
  padding: 2rem 2rem 0; position: relative;
  box-shadow: 0 32px 80px rgba(0,0,0,.22);
}
[data-theme="dark"] .receb-modal { background: var(--bg2); }

.receb-close {
  position: absolute; top: 1rem; right: 1rem;
  background: var(--bg3); border: none; border-radius: 50%;
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text2); transition: all 0.15s;
}
.receb-close:hover { background: var(--border); color: var(--text); }
.receb-close .material-symbols-outlined { font-size: 1.1rem; }

/* Ícone de check */
.receb-check-circle {
  width: 68px; height: 68px; border-radius: 50%;
  background: linear-gradient(135deg, #00c853, #00e676);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(0,200,83,.35);
  margin-bottom: 1rem;
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.receb-check-circle .material-symbols-outlined { font-size: 2.2rem; color: white; }
@keyframes popIn { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* Tag venda */
.receb-tag {
  font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--text2);
  background: var(--bg3); padding: 4px 14px; border-radius: 20px;
  margin-bottom: 0.6rem;
}

/* Valor */
.receb-valor {
  font-size: 2.6rem; font-weight: 900; color: #00c853;
  font-family: 'Courier New', monospace; line-height: 1;
  margin-bottom: 0.85rem;
  text-shadow: 0 2px 12px rgba(0,200,83,.2);
}
[data-theme="dark"] .receb-valor { color: #00e676; }

/* Cliente */
.receb-cliente {
  display: flex; align-items: center; gap: 0.6rem;
  background: var(--bg3); border-radius: 30px;
  padding: 0.5rem 1rem 0.5rem 0.5rem; margin-bottom: 1.5rem;
}
.receb-nome { font-weight: 700; font-size: 0.9rem; color: var(--text); }

/* Divisor */
.receb-divider {
  width: 100%; display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 1rem;
}
.receb-divider::before, .receb-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}
.receb-divider span { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text2); white-space: nowrap; }

/* Grid de formas */
.sem-formas { font-size: 0.85rem; color: var(--text2); padding: 0.5rem 0 1rem; }

.receb-forma-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  width: 100%; margin-bottom: 1.25rem;
}
.receb-forma-btn {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 1rem 0.5rem 0.85rem;
  border: 2px solid var(--border); border-radius: 14px;
  background: white; cursor: pointer; transition: all 0.18s;
  font-size: 0.78rem; font-weight: 700; color: var(--text2);
}
[data-theme="dark"] .receb-forma-btn { background: var(--bg3); }
.receb-forma-btn:hover:not(.active) {
  border-color: rgba(0,200,83,.4); background: rgba(0,200,83,.04);
  transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.08);
}
.receb-forma-btn.active {
  border-color: #00c853; background: rgba(0,200,83,.07); color: #00a844;
  box-shadow: 0 0 0 3px rgba(0,200,83,.15);
}
[data-theme="dark"] .receb-forma-btn.active { background: rgba(0,200,83,.12); color: #00e676; }
.receb-forma-ico { font-size: 1.65rem; line-height: 1; }
.receb-forma-nome { font-size: 0.75rem; font-weight: 700; text-align: center; line-height: 1.2; }
.receb-forma-check {
  position: absolute; top: 6px; right: 6px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #00c853; display: flex; align-items: center; justify-content: center;
}
.receb-forma-check .material-symbols-outlined { font-size: 0.75rem; color: white; }

/* Banner informativo */
.receb-info-banner {
  width: 100%; display: flex; align-items: center; gap: 0.75rem;
  background: #eff6ff; border: 1px solid rgba(59,130,246,.2);
  border-radius: 12px; padding: 0.85rem 1rem;
  margin-bottom: 1.5rem;
}
[data-theme="dark"] .receb-info-banner { background: rgba(59,130,246,.08); border-color: rgba(59,130,246,.15); }
.banner-info-icon { font-size: 1.2rem; color: #3b82f6; flex-shrink: 0; }
.banner-info-title { display: block; font-size: 0.82rem; font-weight: 700; color: var(--text); }
.banner-info-sub { display: block; font-size: 0.73rem; color: var(--text2); margin-top: 1px; }

/* Rodapé fixo do modal */
.receb-footer {
  position: sticky; bottom: 0;
  width: calc(100% + 4rem); margin: 0 -2rem;
  display: flex; gap: 0.75rem;
  padding: 1rem 2rem 1.5rem;
  background: white; border-top: 1px solid var(--border);
}
[data-theme="dark"] .receb-footer { background: var(--bg2); }

.receb-btn-cancel {
  flex: 1; padding: 0.8rem; border-radius: 10px;
  border: 1.5px solid var(--border); background: transparent;
  color: var(--text); font-size: 0.9rem; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.receb-btn-cancel:hover { background: var(--bg3); }

.receb-btn-confirm {
  flex: 2; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.8rem; border-radius: 10px; border: none;
  background: #00c853; color: white;
  font-size: 0.9rem; font-weight: 800; cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 14px rgba(0,200,83,.35);
}
.receb-btn-confirm:hover:not(:disabled) { background: #00b548; box-shadow: 0 6px 18px rgba(0,200,83,.45); }
.receb-btn-confirm:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.receb-btn-confirm .material-symbols-outlined { font-size: 1.1rem; }

/* ── Modal Desfazer (mantido compacto) ─────────────────────────── */
.modal-box {
  background: white; border-radius: 16px; border: 1px solid var(--border);
  display: flex; flex-direction: column; width: 100%; max-width: 400px;
  max-height: 90vh; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,.18);
}
[data-theme="dark"] .modal-box { background: var(--bg2); }
.modal-header {
  padding: 1.2rem 1.4rem; border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: flex-start;
}
.modal-title-row { display: flex; align-items: center; gap: 0.85rem; }
.modal-hdr-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.modal-hdr-icon .material-symbols-outlined { font-size: 1.2rem; color: white; }
.desfazer-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
.modal-title { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text); }
.modal-subtitle { margin: 2px 0 0; font-size: 0.78rem; color: var(--text2); }
.modal-close {
  background: none; border: none; cursor: pointer; color: var(--text2);
  display: flex; align-items: center; padding: 6px; border-radius: 8px; transition: background 0.15s;
}
.modal-close:hover { background: var(--bg3); }
.modal-close .material-symbols-outlined { font-size: 1.2rem; }
.modal-body { padding: 1.4rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.2rem; }
.modal-footer {
  padding: 1rem 1.4rem; border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; gap: 0.75rem;
  background: #f8fafc; border-radius: 0 0 16px 16px;
}
[data-theme="dark"] .modal-footer { background: var(--bg3); }

/* Desfazer info */
.desfazer-info {
  display: flex; align-items: flex-start; gap: 0.75rem;
  background: #fffbeb; border: 1px solid rgba(245,158,11,.3); border-radius: 10px; padding: 1rem;
}
[data-theme="dark"] .desfazer-info { background: rgba(245,158,11,.08); }
.desfazer-warn-icon { font-size: 1.3rem; color: #d97706; flex-shrink: 0; margin-top: 2px; }
.desfazer-info p { margin: 0; font-size: 0.875rem; color: var(--text); line-height: 1.5; }

/* Botões compartilhados */
.btn-ghost {
  background: transparent; border: 1.5px solid var(--border); color: var(--text);
  padding: 0.65rem 1.4rem; border-radius: 8px; cursor: pointer;
  font-size: 0.875rem; font-weight: 600; transition: background 0.15s;
}
.btn-ghost:hover { background: var(--bg3); }

.btn-desfazer-confirm {
  display: flex; align-items: center; gap: 0.45rem;
  background: #f59e0b; color: white; border: none;
  padding: 0.65rem 1.4rem; border-radius: 8px; font-weight: 700; cursor: pointer;
  font-size: 0.875rem; transition: background 0.15s;
}
.btn-desfazer-confirm:hover { background: #d97706; }
.btn-desfazer-confirm .material-symbols-outlined { font-size: 1rem; }

/* Toast */
.cr-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  z-index: 9999; display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; border-radius: 10px;
  font-size: 0.875rem; font-weight: 500; white-space: nowrap;
  pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,.2);
}
.cr-toast .material-symbols-outlined { font-size: 1.1rem; }
.cr-toast.ok  { background: #052e16; color: #6ee7b7; border: 1px solid rgba(16,185,129,.3); }
.cr-toast.err { background: #1f0707; color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* Animação modal */
.animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.text-right { text-align: right; }

/* ── Responsivo Mobile ─────────────────────────────────────────── */
@media (max-width: 768px) {
  /* Carrossel horizontal para os cards de resumo */
  .resumo-scroll-wrap {
    overflow-x: auto; overflow-y: visible;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    display: flex; gap: 0; margin: 0 -1rem; padding: 0 1rem 0.5rem;
    scrollbar-width: none;
  }
  .resumo-scroll-wrap::-webkit-scrollbar { display: none; }
  .resumo-grid {
    display: flex; gap: 0.75rem; flex-wrap: nowrap;
  }
  .resumo-card {
    min-width: 220px; max-width: 220px;
    scroll-snap-align: start; flex-shrink: 0;
  }

  .cr-header { padding: 1rem 1.1rem; }
  .header-accent-bar { display: none; }
  .filter-bar { flex-direction: column; align-items: stretch; gap: 0.75rem; }
  .filter-right { flex-wrap: wrap; }
  .btn-label { display: none; }

  .desktop-table { display: none; }
  .mobile-cards { display: flex; }
  .table-header-bar, .table-footer-bar { display: none; }

  .modal-backdrop { align-items: flex-end; padding: 0; }
  .modal-box { max-width: 100%; border-radius: 20px 20px 0 0; max-height: 95vh; border-bottom: none; }
  .modal-footer { flex-wrap: wrap; }
  .modal-footer .btn-ghost,
  .modal-footer .btn-confirmar,
  .modal-footer .btn-desfazer-confirm { flex: 1; justify-content: center; }
  .forma-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 500px) {
  .rc-stripe { width: 4px; }
  .rc-body { padding: 1rem; }
}
</style>
