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
                <button
                  v-if="p.status === 'em_andamento' || p.status === 'comprado'"
                  class="btn-act btn-act-receber"
                  title="Receber Materiais"
                  @click="abrirReceber(p)"
                >
                  <span class="material-symbols-outlined">inventory</span>
                </button>
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

    <!-- Modal Receber Materiais -->
    <Teleport to="body">
      <div v-if="modalReceber" class="rec-overlay" @click.self="fecharReceber">
        <div class="rec-modal">
          <div class="rec-header">
            <div>
              <div class="rec-title">
                <span class="material-symbols-outlined">inventory</span>
                Receber Materiais
              </div>
              <div class="rec-sub">Pedido #{{ modalReceber.numero }} · {{ modalReceber.fornecedores?.nome || 'Sem fornecedor' }}</div>
            </div>
            <button class="rec-close" @click="fecharReceber">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div v-if="receberCarregando" class="rec-state">
            <span class="spin"></span> Carregando itens...
          </div>

          <template v-else>
            <!-- Aviso de itens sem produto -->
            <div v-if="itensSemProduto.length" class="rec-alerta">
              <span class="material-symbols-outlined">warning</span>
              <div>
                <strong>{{ itensSemProduto.length }} item(s) sem produto vinculado.</strong>
                <p>Edite o pedido e vincule todos os itens a produtos cadastrados antes de dar entrada.</p>
              </div>
            </div>

            <!-- Lista de itens -->
            <div class="rec-itens">
              <div v-for="it in receberItens" :key="it.pk" :class="['rec-item', !it.produto_pk ? 'rec-item--erro' : '']">
                <span class="material-symbols-outlined rec-item-ico">
                  {{ it.produto_pk ? 'check_circle' : 'cancel' }}
                </span>
                <div class="rec-item-info">
                  <span class="rec-item-nome">{{ it.produtos?.descricao || it.descricao_livre || 'Item avulso' }}</span>
                  <span class="rec-item-cod" v-if="it.produtos?.codigo">{{ it.produtos.codigo }}</span>
                </div>
                <div class="rec-item-nums">
                  <span class="rec-item-qtd">{{ it.quantidade }} un.</span>
                  <span v-if="!it.produto_pk" class="rec-item-warn">Não cadastrado</span>
                </div>
              </div>
            </div>

            <!-- NF opcional (apenas se todos ok) -->
            <div v-if="!itensSemProduto.length" class="rec-nf">
              <div class="rec-nf-title">
                <span class="material-symbols-outlined" style="font-size:16px">receipt_long</span>
                Dados da Nota Fiscal <span class="rec-nf-opt">(opcional)</span>
              </div>
              <div class="rec-nf-grid">
                <div class="rec-nf-field">
                  <label>Nº NF</label>
                  <input v-model="nfForm.numero" type="text" class="rec-input" placeholder="000001" />
                </div>
                <div class="rec-nf-field">
                  <label>Série</label>
                  <input v-model="nfForm.serie" type="text" class="rec-input" placeholder="1" />
                </div>
                <div class="rec-nf-field">
                  <label>Data entrada</label>
                  <input v-model="nfForm.data_entrada" type="date" class="rec-input" />
                </div>
                <div class="rec-nf-field">
                  <label>Valor total NF</label>
                  <input v-model="nfForm.valor" type="number" step="0.01" class="rec-input" placeholder="0,00" />
                </div>
                <div class="rec-nf-field rec-nf-full">
                  <label>Chave NF-e</label>
                  <input v-model="nfForm.chave" type="text" class="rec-input" placeholder="44 dígitos" maxlength="44" />
                </div>
              </div>
            </div>
          </template>

          <div class="rec-footer">
            <button class="rec-btn-cancel" @click="fecharReceber">Cancelar</button>
            <button
              class="rec-btn-confirm"
              :disabled="receberCarregando || itensSemProduto.length > 0 || receberSalvando"
              @click="confirmarReceber"
            >
              <span v-if="receberSalvando" class="spin-sm"></span>
              <span v-else class="material-symbols-outlined" style="font-size:17px">move_to_inbox</span>
              {{ receberSalvando ? 'Registrando...' : 'Confirmar Entrada' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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

const lista            = ref([]);
const carregando       = ref(true);
const filtroStatus     = ref('');
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

// ── Receber Materiais ─────────────────────────────────────────
const modalReceber     = ref(null);
const receberItens     = ref([]);
const receberCarregando = ref(false);
const receberSalvando  = ref(false);
const nfForm = ref({ numero: '', serie: '', data_entrada: '', valor: '', chave: '' });

const itensSemProduto = computed(() =>
  receberItens.value.filter(it => !it.produto_pk)
);

async function abrirReceber(pedido) {
  modalReceber.value   = pedido;
  receberItens.value   = [];
  receberCarregando.value = true;
  nfForm.value = { numero: '', serie: '', data_entrada: new Date().toLocaleDateString('en-CA'), valor: '', chave: '' };
  try {
    const { data } = await api.get(`/api/pedidos-compra/${pedido.pk}`);
    receberItens.value = data.data?.itens || [];
  } catch (e) {
    showToast('Erro ao carregar itens: ' + (e.response?.data?.erro || e.message), 'err');
    modalReceber.value = null;
  } finally {
    receberCarregando.value = false;
  }
}

function fecharReceber() {
  if (receberSalvando.value) return;
  modalReceber.value = null;
  receberItens.value = [];
}

async function confirmarReceber() {
  if (itensSemProduto.value.length || receberSalvando.value) return;
  receberSalvando.value = true;
  try {
    const temNf = nfForm.value.numero || nfForm.value.chave;
    const payload = { modo: temNf ? 'com_nf' : 'sem_nf' };
    if (temNf) {
      payload.nf_numero      = nfForm.value.numero      || null;
      payload.nf_serie       = nfForm.value.serie       || null;
      payload.nf_chave       = nfForm.value.chave       || null;
      payload.nf_data_entrada = nfForm.value.data_entrada || null;
      payload.nf_valor       = nfForm.value.valor ? parseFloat(nfForm.value.valor) : null;
    }
    const { data } = await api.post(`/api/pedidos-compra/${modalReceber.value.pk}/entrada`, payload);
    showToast(`Entrada registrada! ${data.qtd_itens} produto(s) atualizados.`, 'ok');
    fecharReceber();
    await carregar();
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao registrar entrada.', 'err');
  } finally {
    receberSalvando.value = false;
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

/* Tabela */
.tabela-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; overflow: visible; }
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

/* Ações */
.acoes { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.btn-act { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: none; border: 1px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; transition: all .15s; }
.btn-act:hover { background: var(--bg3); color: var(--text); border-color: var(--primary); }
.btn-act.del:hover { background: rgba(239,68,68,.1); border-color: #ef4444; color: #ef4444; }
.btn-act .material-symbols-outlined { font-size: 16px; }
.btn-act-receber:hover { background: rgba(0,200,83,.1); border-color: #00c853; color: #00a846; }

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

/* ── Modal Receber Materiais ── */
.rec-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.rec-modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; width: 540px; max-width: 100%; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
.rec-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid var(--border); gap: 12px; }
.rec-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text); }
.rec-title .material-symbols-outlined { font-size: 20px; color: #00c853; }
.rec-sub { font-size: 12px; color: var(--text2); margin-top: 3px; }
.rec-close { background: none; border: none; cursor: pointer; color: var(--text2); display: flex; padding: 4px; border-radius: 6px; }
.rec-close:hover { background: var(--bg3); color: var(--text); }

.rec-state { display: flex; align-items: center; gap: 10px; padding: 36px 20px; color: var(--text2); font-size: 13px; justify-content: center; }

.rec-alerta { display: flex; align-items: flex-start; gap: 10px; margin: 14px 20px 0; padding: 12px 14px; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.25); border-radius: 10px; color: var(--text); }
.rec-alerta .material-symbols-outlined { font-size: 20px; color: #ef4444; flex-shrink: 0; margin-top: 1px; }
.rec-alerta strong { font-size: 13px; font-weight: 700; color: #ef4444; display: block; margin-bottom: 3px; }
.rec-alerta p { font-size: 12px; color: var(--text2); margin: 0; }

.rec-itens { flex: 1; overflow-y: auto; padding: 12px 20px; display: flex; flex-direction: column; gap: 6px; }
.rec-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg3); }
.rec-item--erro { border-color: rgba(239,68,68,.3); background: rgba(239,68,68,.05); }
.rec-item-ico { font-size: 18px; flex-shrink: 0; }
.rec-item:not(.rec-item--erro) .rec-item-ico { color: #00c853; }
.rec-item--erro .rec-item-ico { color: #ef4444; }
.rec-item-info { flex: 1; min-width: 0; }
.rec-item-nome { display: block; font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-item-cod  { display: block; font-size: 11px; color: var(--text2); font-family: monospace; }
.rec-item-nums { text-align: right; flex-shrink: 0; }
.rec-item-qtd  { display: block; font-size: 13px; font-weight: 700; color: var(--text); }
.rec-item-warn { display: block; font-size: 10px; font-weight: 700; color: #ef4444; margin-top: 2px; }

.rec-nf { margin: 0 20px 4px; padding: 12px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; }
.rec-nf-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text2); margin-bottom: 10px; }
.rec-nf-opt { font-weight: 400; opacity: .7; }
.rec-nf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rec-nf-full { grid-column: 1 / -1; }
.rec-nf-field { display: flex; flex-direction: column; gap: 4px; }
.rec-nf-field label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.rec-input { padding: 7px 10px; background: var(--bg2); border: 1px solid var(--border); border-radius: 7px; color: var(--text); font-size: 13px; width: 100%; }
.rec-input:focus { outline: none; border-color: var(--primary); }

.rec-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border); }
.rec-btn-cancel  { padding: 8px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; }
.rec-btn-cancel:hover { background: var(--bg2); }
.rec-btn-confirm { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #00c853; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s; }
.rec-btn-confirm:hover:not(:disabled) { background: #00a846; }
.rec-btn-confirm:disabled { opacity: .4; cursor: not-allowed; }
.spin-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
</style>
