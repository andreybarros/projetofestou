<template>
  <div class="pc-wrap">

    <!-- Header -->
    <div class="pc-header">
      <div>
        <h2 class="pc-title">
          <span class="material-symbols-outlined">shopping_cart</span>
          Pedidos de Compra
        </h2>
        <p class="pc-sub">Gerencie solicitações de compra e acompanhe o recebimento das mercadorias</p>
      </div>
      <button class="btn-primary" @click="$router.push('/pedidos-compra/novo')">
        <span class="material-symbols-outlined">add</span>
        Novo Pedido
      </button>
    </div>

    <!-- Filtros de status -->
    <div class="status-tabs">
      <button
        v-for="s in STATUS_TABS" :key="s.val"
        :class="['stab', { active: filtroStatus === s.val }]"
        @click="filtroStatus = s.val; carregar()"
      >
        <span :class="['stab-dot', s.cor]"></span>
        {{ s.label }}
        <span v-if="contagemStatus[s.val]" class="stab-count">{{ contagemStatus[s.val] }}</span>
      </button>
    </div>

    <!-- Alerta: produtos com estoque zerado -->
    <div v-if="produtosZerados.length" class="alerta-estoque" :class="{ collapsed: alertaRecolhido }">
      <div class="alerta-header" @click="alertaRecolhido = !alertaRecolhido">
        <span class="material-symbols-outlined alerta-ico">warning</span>
        <span class="alerta-titulo">
          {{ produtosZerados.length }} produto{{ produtosZerados.length !== 1 ? 's' : '' }} com estoque zerado ou negativo
        </span>
        <span class="material-symbols-outlined alerta-chevron">
          {{ alertaRecolhido ? 'expand_more' : 'expand_less' }}
        </span>
      </div>
      <div v-if="!alertaRecolhido" class="alerta-lista">
        <div v-for="p in produtosZerados" :key="p.pk" class="alerta-item">
          <span class="alerta-cod">{{ p.codigo || '—' }}</span>
          <span class="alerta-desc">{{ p.descricao }}</span>
          <span :class="['alerta-saldo', p.saldo < 0 ? 'negativo' : 'zero']">{{ p.saldo }}</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="carregando" class="state-center"><span class="spin"></span></div>

    <!-- Vazio -->
    <div v-else-if="!lista.length" class="state-center muted">
      <span class="material-symbols-outlined" style="font-size:40px;opacity:.25">shopping_cart</span>
      Nenhum pedido encontrado.
    </div>

    <!-- Tabela -->
    <div v-else class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>Nº Pedido</th>
            <th>Fornecedor</th>
            <th class="text-center">Itens</th>
            <th>Status</th>
            <th>NF Entrada</th>
            <th>Data</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in lista" :key="p.pk">
            <td class="mono bold accent">#{{ p.numero }}</td>
            <td>{{ p.fornecedores?.nome || '—' }}</td>
            <td class="text-center">
              <span class="badge-count">{{ p.qtd_itens }}</span>
            </td>
            <td>
              <span :class="['badge-status', `bs-${p.status}`]">
                {{ labelStatus(p.status) }}
              </span>
            </td>
            <td class="td-nf">
              <template v-if="p.nf_numero">
                <span class="nf-num">NF {{ p.nf_numero }}</span>
                <span class="nf-forn">{{ p.nf_fornecedor || '—' }}</span>
              </template>
              <span v-else class="muted-dash">—</span>
            </td>
            <td class="text-muted">{{ fmtData(p.criado_em) }}</td>
            <td class="text-right">
              <div class="acoes">
                <!-- Alterar status rápido -->
                <div class="status-menu-wrap">
                  <button class="btn-act" title="Alterar status" @click.stop="toggleStatusMenu(p.pk)">
                    <span class="material-symbols-outlined">tune</span>
                  </button>
                  <div v-if="statusMenuAberto === p.pk" class="status-dropdown" @click.stop>
                    <button
                      v-for="s in STATUS_OPCOES" :key="s.val"
                      :class="['sdrop-item', { active: p.status === s.val }]"
                      @click="atualizarStatus(p, s.val)"
                    >
                      <span :class="['sdrop-dot', s.cor]"></span>
                      {{ s.label }}
                    </button>
                  </div>
                </div>
                <button class="btn-act" title="Editar" @click="$router.push(`/pedidos-compra/${p.pk}/editar`)">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-act del" title="Excluir" @click="excluir(p)">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="pc-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import api from '../services/api';
import { supabase } from '../composables/useSupabase';

const router = useRouter();
const sessaoStore = useSessaoStore();

const STATUS_TABS = [
  { val: '',            label: 'Todos',        cor: 'dot-cinza'   },
  { val: 'em_andamento', label: 'Em Andamento', cor: 'dot-azul'    },
  { val: 'comprado',    label: 'Comprado',     cor: 'dot-laranja' },
  { val: 'cancelado',   label: 'Cancelado',    cor: 'dot-vermelho' },
  { val: 'finalizado',  label: 'Finalizado',   cor: 'dot-verde'   },
];

const STATUS_OPCOES = STATUS_TABS.filter(s => s.val !== '');

const lista          = ref([]);
const produtosZerados = ref([]);
const carregando     = ref(true);
const filtroStatus   = ref('');
const alertaRecolhido = ref(false);
const statusMenuAberto = ref(null);
const toastMsg  = ref('');
const toastTipo = ref('ok');
let   toastTimer = null;

const contagemStatus = computed(() => {
  const m = { '': lista.value.length };
  lista.value.forEach(p => { m[p.status] = (m[p.status] || 0) + 1; });
  return m;
});

onMounted(() => {
  carregar();
  carregarEstoqueZerado();
  document.addEventListener('click', fecharMenus);
});

onUnmounted(() => {
  document.removeEventListener('click', fecharMenus);
  clearTimeout(toastTimer);
});

function fecharMenus() { statusMenuAberto.value = null; }
function toggleStatusMenu(pk) {
  statusMenuAberto.value = statusMenuAberto.value === pk ? null : pk;
}

async function carregar() {
  carregando.value = true;
  try {
    const fil = sessaoStore.filial?.pk;
    if (!fil) return;
    const params = { filial_pk: fil };
    if (filtroStatus.value) params.status = filtroStatus.value;
    const { data } = await api.get('/api/pedidos-compra', { params });
    lista.value = data.data || [];
  } catch (e) {
    showToast('Erro ao carregar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

async function carregarEstoqueZerado() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  const { data } = await supabase
    .from('produtos')
    .select('pk, codigo, descricao, saldo')
    .eq('filial_pk', fil)
    .lte('saldo', 0)
    .order('descricao');
  produtosZerados.value = data || [];
}

async function atualizarStatus(pedido, novoStatus) {
  statusMenuAberto.value = null;
  if (pedido.status === novoStatus) return;
  try {
    await api.patch(`/api/pedidos-compra/${pedido.pk}/status`, { status: novoStatus });
    pedido.status = novoStatus;
    showToast('Status atualizado!');
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  }
}

async function excluir(p) {
  if (!confirm(`Excluir pedido #${p.numero}?`)) return;
  try {
    await api.delete(`/api/pedidos-compra/${p.pk}`);
    showToast('Pedido excluído.');
    await carregar();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  }
}

function labelStatus(s) {
  const m = { em_andamento: 'Em Andamento', comprado: 'Comprado', cancelado: 'Cancelado', finalizado: 'Finalizado' };
  return m[s] || s;
}

function fmtData(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('pt-BR');
}

function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3500);
}
</script>

<style scoped>
.pc-wrap { display: flex; flex-direction: column; gap: 16px; padding-bottom: 60px; }

.pc-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.pc-title  { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.pc-title .material-symbols-outlined { color: var(--primary); }
.pc-sub { color: var(--text2); font-size: 13px; margin: 0; }

.btn-primary { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: var(--primary); color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-primary:hover { filter: brightness(1.1); }

/* Status tabs */
.status-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.stab { display: flex; align-items: center; gap: 7px; padding: 7px 14px; background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; }
.stab:hover { border-color: var(--primary); color: var(--text); }
.stab.active { background: var(--primary); border-color: var(--primary); color: #fff; }
.stab.active .stab-dot { background: rgba(255,255,255,.6); }
.stab-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-cinza    { background: #94a3b8; }
.dot-azul     { background: #60a5fa; }
.dot-laranja  { background: #fb923c; }
.dot-vermelho { background: #f87171; }
.dot-verde    { background: #4ade80; }
.stab-count { background: rgba(255,255,255,.2); border-radius: 10px; font-size: 11px; padding: 1px 7px; }
.stab:not(.active) .stab-count { background: var(--bg3); color: var(--text2); }

/* Alerta estoque */
.alerta-estoque { background: rgba(251,146,60,.07); border: 1px solid rgba(251,146,60,.35); border-radius: 12px; overflow: hidden; }
.alerta-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; }
.alerta-ico { color: #fb923c; font-size: 20px; }
.alerta-titulo { flex: 1; font-size: 13px; font-weight: 700; color: var(--text); }
.alerta-chevron { color: var(--text2); font-size: 20px; }
.alerta-lista { border-top: 1px solid rgba(251,146,60,.2); max-height: 240px; overflow-y: auto; }
.alerta-item { display: grid; grid-template-columns: 70px 1fr 60px; align-items: center; gap: 10px; padding: 8px 16px; border-bottom: 1px solid var(--border); font-size: 13px; }
.alerta-item:last-child { border-bottom: none; }
.alerta-cod { font-family: monospace; font-size: 12px; color: var(--text2); }
.alerta-desc { color: var(--text); }
.alerta-saldo { text-align: right; font-weight: 800; font-family: monospace; }
.alerta-saldo.zero { color: #fb923c; }
.alerta-saldo.negativo { color: #f87171; }

/* Tabela */
.tabela-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.tabela { width: 100%; border-collapse: collapse; font-size: 13px; color: var(--text); }
.tabela th { background: var(--bg3); padding: 10px 14px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--text2); border-bottom: 1px solid var(--border); }
.tabela td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tabela tr:last-child td { border-bottom: none; }
.tabela tr:hover td { background: var(--bg3); }
.text-center { text-align: center; }
.text-right  { text-align: right; }
.mono  { font-family: monospace; }
.bold  { font-weight: 700; }
.accent { color: var(--primary); }
.text-muted { color: var(--text2); font-size: 12px; }
.muted-dash { color: var(--text2); opacity: .5; }

.badge-count { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 2px 10px; font-size: 12px; font-weight: 700; }

/* Status badges */
.badge-status { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.bs-em_andamento { background: rgba(96,165,250,.15); color: #60a5fa; }
.bs-comprado     { background: rgba(251,146,60,.15); color: #fb923c; }
.bs-cancelado    { background: rgba(248,113,113,.15); color: #f87171; }
.bs-finalizado   { background: rgba(74,222,128,.15);  color: #4ade80; }
[data-theme="light"] .bs-em_andamento { color: #1d4ed8; }
[data-theme="light"] .bs-comprado     { color: #9a3412; }
[data-theme="light"] .bs-cancelado    { color: #b91c1c; }
[data-theme="light"] .bs-finalizado   { color: #15803d; }

/* NF */
.td-nf { display: flex; flex-direction: column; }
.nf-num  { font-size: 12px; font-weight: 700; color: var(--text); font-family: monospace; }
.nf-forn { font-size: 11px; color: var(--text2); }

/* Ações */
.acoes { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.btn-act { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: none; border: 1px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; transition: all .15s; }
.btn-act:hover { background: var(--bg3); color: var(--text); border-color: var(--primary); }
.btn-act.del:hover { background: rgba(239,68,68,.1); border-color: #ef4444; color: #ef4444; }
.btn-act .material-symbols-outlined { font-size: 16px; }

/* Status dropdown */
.status-menu-wrap { position: relative; }
.status-dropdown { position: absolute; right: 0; top: 34px; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.25); z-index: 100; overflow: hidden; min-width: 160px; }
.sdrop-item { display: flex; align-items: center; gap: 9px; padding: 10px 14px; width: 100%; background: none; border: none; color: var(--text); font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; }
.sdrop-item:hover { background: var(--bg3); }
.sdrop-item.active { background: rgba(102,126,234,.08); font-weight: 700; }
.sdrop-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* States */
.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 20px; color: var(--text2); font-size: 13px; }
.muted { opacity: .6; }
.spin { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.pc-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap; }
.pc-toast.ok  { background: #166534; color: #bbf7d0; }
.pc-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
