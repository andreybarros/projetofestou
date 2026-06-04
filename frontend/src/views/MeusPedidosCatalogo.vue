<template>
  <div class="mp-overlay" @click.self="$emit('fechar')">
    <div :class="['mp-drawer', { 'mp-dark': tema === 'dark' }]">

      <!-- Header do drawer -->
      <div class="mp-header">
        <div class="mp-header-left">
          <div class="mp-header-icon">
            <span class="material-symbols-outlined">receipt_long</span>
          </div>
          <div>
            <h2 class="mp-title">Meus Pedidos</h2>
            <p class="mp-sub">{{ catalogo?.nome }}</p>
          </div>
        </div>
        <div class="mp-header-right">
          <button class="mp-refresh-btn" @click="carregar" :disabled="carregando" title="Atualizar">
            <span class="material-symbols-outlined" :class="{ 'mp-spin-ico': carregando }">refresh</span>
          </button>
          <button class="mp-close-btn" @click="$emit('fechar')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Conteúdo -->
      <div class="mp-body">

        <!-- Loading -->
        <div v-if="carregando" class="mp-state">
          <div class="mp-spinner"></div>
          <span>Carregando seus pedidos…</span>
        </div>

        <!-- Sem pedidos -->
        <div v-else-if="!pedidos.length" class="mp-state mp-state--vazio">
          <div class="mp-vazio-ico">
            <span class="material-symbols-outlined">inventory_2</span>
          </div>
          <div class="mp-vazio-txt">Nenhum pedido ainda</div>
          <div class="mp-vazio-sub">Adicione produtos ao carrinho para solicitar seu primeiro orçamento.</div>
          <button class="mp-btn-novo" @click="$emit('fechar')">
            <span class="material-symbols-outlined">storefront</span>
            Ver produtos
          </button>
        </div>

        <!-- Lista de pedidos -->
        <div v-else class="mp-lista">

          <!-- Pedidos aguardando orçamento — editáveis -->
          <div v-if="editaveis.length" class="mp-secao">
            <div class="mp-secao-titulo">
              <span class="material-symbols-outlined">hourglass_empty</span>
              Aguardando orçamento
              <span class="mp-secao-badge" style="background:#f59e0b">{{ editaveis.length }}</span>
            </div>
            <div v-for="p in editaveis" :key="p.pk" class="mp-card mp-card--editavel">
              <div class="mp-card-top">
                <div class="mp-card-num">#{{ String(p.pk).padStart(4,'0') }}</div>
                <span class="mp-badge mp-badge--aguardando">Aguardando orçamento</span>
              </div>
              <div class="mp-card-itens">
                <span v-for="it in p.itens.slice(0,3)" :key="it.nome" class="mp-item-tag">
                  {{ it.quantidade }}× {{ it.nome }}
                </span>
                <span v-if="p.itens.length > 3" class="mp-item-tag mp-item-tag--more">+{{ p.itens.length - 3 }}</span>
              </div>
              <div v-if="p.data_evento" class="mp-card-info">
                <span class="material-symbols-outlined">event</span>
                {{ fmtDataLocal(p.data_evento) }}
                <span v-if="p.hora_evento"> · {{ p.hora_evento }}</span>
              </div>
              <button class="mp-btn-editar" @click="editarPedido(p)">
                <span class="material-symbols-outlined">edit</span>
                Editar Pedido
              </button>

              <!-- Cancelamento inline -->
              <div v-if="cancelandoPk === p.pk" class="mp-cancel-confirm">
                <span>Cancelar este pedido?</span>
                <div class="mp-cancel-confirm-btns">
                  <button class="mp-cancel-sim" :disabled="cancelando" @click="confirmarCancelamento(p)">
                    <span v-if="cancelando" class="mp-spin-xs"></span>
                    <span v-else class="material-symbols-outlined">check</span>
                    Sim, cancelar
                  </button>
                  <button class="mp-cancel-nao" @click="cancelandoPk = null">Não</button>
                </div>
              </div>
              <button v-else class="mp-btn-cancelar" @click="cancelandoPk = p.pk">
                <span class="material-symbols-outlined">cancel</span>
                Cancelar Pedido
              </button>
            </div>
          </div>

          <!-- Pedidos com orçamento pendente de aprovação - destaque -->
          <div v-if="pendentes.length" class="mp-secao">
            <div class="mp-secao-titulo">
              <span class="material-symbols-outlined">pending_actions</span>
              Aguardando sua aprovação
              <span class="mp-secao-badge">{{ pendentes.length }}</span>
            </div>
            <div
              v-for="p in pendentes"
              :key="p.pk"
              class="mp-card mp-card--pendente"
            >
              <div class="mp-card-top">
                <div class="mp-card-num">#{{ String(p.pk).padStart(4,'0') }}</div>
                <span class="mp-badge mp-badge--orc">Orçamento pronto</span>
              </div>

              <div class="mp-card-itens">
                <span v-for="it in p.itens.slice(0,3)" :key="it.nome" class="mp-item-tag">
                  {{ it.quantidade }}× {{ it.nome }}
                </span>
                <span v-if="p.itens.length > 3" class="mp-item-tag mp-item-tag--more">
                  +{{ p.itens.length - 3 }} itens
                </span>
              </div>

              <div v-if="p.data_evento" class="mp-card-info">
                <span class="material-symbols-outlined">event</span>
                {{ fmtDataLocal(p.data_evento) }}
                <span v-if="p.hora_evento"> · {{ p.hora_evento }}</span>
              </div>

              <div class="mp-valor-box">
                <div class="mp-valor-num">{{ fmtMoeda(p.valor_orcamento) }}</div>
                <div v-if="p.obs_orcamento" class="mp-valor-obs">{{ p.obs_orcamento }}</div>
              </div>

              <button class="mp-btn-ver-orc mp-btn-ver-orc--destaque" @click="verOrcamento(p.pedido_token)">
                <span class="material-symbols-outlined">visibility</span>
                Visualizar Orçamento
              </button>
            </div>
          </div>

          <!-- Histórico de pedidos -->
          <div class="mp-secao">
            <div class="mp-secao-titulo">
              <span class="material-symbols-outlined">history</span>
              Histórico
            </div>
            <div
              v-for="p in historico"
              :key="p.pk"
              class="mp-card"
              :class="`mp-card--${p.status}`"
            >
              <div class="mp-card-top">
                <div class="mp-card-num">#{{ String(p.pk).padStart(4,'0') }}</div>
                <span :class="['mp-badge', `mp-badge--${p.status}`]">{{ labelStatus(p.status) }}</span>
              </div>

              <div class="mp-card-itens">
                <span v-for="it in p.itens.slice(0,2)" :key="it.nome" class="mp-item-tag">
                  {{ it.quantidade }}× {{ it.nome }}
                </span>
                <span v-if="p.itens.length > 2" class="mp-item-tag mp-item-tag--more">
                  +{{ p.itens.length - 2 }}
                </span>
              </div>

              <div class="mp-card-footer">
                <div v-if="p.data_evento" class="mp-card-info">
                  <span class="material-symbols-outlined">event</span>
                  {{ fmtDataLocal(p.data_evento) }}
                </div>
                <strong v-if="p.valor_orcamento" class="mp-valor-inline">
                  {{ fmtMoeda(p.valor_orcamento) }}
                </strong>
                <span class="mp-card-data">{{ fmtData(p.criado_em) }}</span>
              </div>

              <button class="mp-btn-ver-orc" @click="verOrcamento(p.pedido_token)">
                <span class="material-symbols-outlined">visibility</span>
                Visualizar Orçamento
              </button>

              <!-- Aprovado: aviso de sucesso -->
              <div v-if="p.status === 'aprovado'" class="mp-aprovado-strip">
                <span class="material-symbols-outlined">check_circle</span>
                Pedido confirmado
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Rodapé: novo pedido -->
      <div class="mp-footer">
        <button class="mp-btn-novo-pedido" @click="$emit('fechar')">
          <span class="material-symbols-outlined">add_shopping_cart</span>
          Fazer Novo Pedido
        </button>
      </div>

      <!-- Toast interno -->
      <Transition name="toast">
        <div v-if="toast" class="mp-toast" :class="toastTipo">
          <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
          {{ toast }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const props = defineProps({
  token:        String,
  sessaoToken:  String,
  catalogo:     Object,
  tema:         { type: String, default: 'light' },
});

const emit   = defineEmits(['fechar', 'editar-pedido']);
const router = useRouter();

const carregando    = ref(true);
const pedidos       = ref([]);
const toast         = ref('');
const toastTipo     = ref('ok');
const cancelandoPk  = ref(null);
const cancelando    = ref(false);
let   toastTimer    = null;

const headers = computed(() =>
  props.sessaoToken ? { 'x-sessao-token': props.sessaoToken } : {}
);

const editaveis  = computed(() => pedidos.value.filter(p => p.status === 'aguardando'));
const pendentes  = computed(() => pedidos.value.filter(p => p.status === 'orcamento_enviado'));
const historico  = computed(() => pedidos.value.filter(p => !['aguardando','orcamento_enviado'].includes(p.status)));

onMounted(() => carregar());

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await axios.get(
      `/api/catalogo-publico/${props.token}/cliente/pedidos`,
      { headers: headers.value }
    );
    pedidos.value = data.data || [];
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao carregar pedidos.', 'err');
  } finally {
    carregando.value = false;
  }
}

function verOrcamento(pedidoToken) {
  router.push(`/catalogo/${props.token}/aprovacaoped/${pedidoToken}`);
  emit('fechar');
}

function editarPedido(p) {
  emit('editar-pedido', p);
  emit('fechar');
}

async function confirmarCancelamento(p) {
  cancelando.value = true;
  try {
    await axios.patch(
      `/api/catalogo-publico/orcamento/${p.pedido_token}/cancelar`,
      {},
      { headers: headers.value }
    );
    cancelandoPk.value = null;
    showToast('Pedido cancelado.', 'ok');
    await carregar();
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao cancelar pedido.', 'err');
  } finally {
    cancelando.value = false;
  }
}

function labelStatus(s) {
  const m = {
    aguardando:        'Aguardando orçamento',
    orcamento_enviado: 'Orçamento enviado',
    aprovado:          'Confirmado',
    retirado:          'Retirado',
    devolvido:         'Devolvido',
    cancelado:         'Cancelado',
  };
  return m[s] || s;
}

function fmtData(dt)      { return dt ? new Date(dt).toLocaleDateString('pt-BR') : '—'; }
function fmtDataLocal(dt) { return dt ? dt.split('-').reverse().join('/') : '—'; }
function fmtMoeda(v)      { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function showToast(msg, tipo = 'ok') {
  toast.value    = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = ''; }, 3500);
}
</script>

<style scoped>
/* ── Overlay + drawer ── */
.mp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  z-index: 500;
  display: flex;
  justify-content: flex-end;
}
.mp-drawer {
  width: 380px;
  max-width: 100vw;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -8px 0 40px rgba(0,0,0,.2);
  animation: slideIn .28s cubic-bezier(.32,.72,0,1) both;
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

/* ── Header ── */
.mp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  flex-shrink: 0;
}
.mp-header-left { display: flex; align-items: center; gap: 12px; }
.mp-header-right { display: flex; align-items: center; gap: 6px; }
.mp-header-icon {
  width: 40px; height: 40px;
  background: #eef2ff;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.mp-header-icon .material-symbols-outlined { font-size: 20px; color: #6366f1; }
.mp-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
.mp-sub   { font-size: 11px; color: #6b7280; margin: 0; }
.mp-refresh-btn,
.mp-close-btn {
  width: 32px; height: 32px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.mp-refresh-btn:hover, .mp-close-btn:hover { background: #f1f5f9; color: #0f172a; }
.mp-refresh-btn:disabled { opacity: .5; cursor: not-allowed; }
.mp-refresh-btn .material-symbols-outlined,
.mp-close-btn   .material-symbols-outlined { font-size: 18px; }
@keyframes rotate { to { transform: rotate(360deg); } }
.mp-spin-ico { animation: rotate .7s linear infinite; }

/* ── Body ── */
.mp-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 20px; }

.mp-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 20px; text-align: center; }
.mp-state--vazio { color: #6b7280; }
.mp-vazio-ico { width: 60px; height: 60px; background: #f8fafc; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.mp-vazio-ico .material-symbols-outlined { font-size: 30px; color: #d1d5db; }
.mp-vazio-txt { font-size: 15px; font-weight: 700; color: #374151; }
.mp-vazio-sub { font-size: 13px; color: #9ca3af; max-width: 240px; line-height: 1.5; }
.mp-btn-novo  { display: flex; align-items: center; gap: 7px; padding: 10px 20px; background: #6366f1; border: none; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; margin-top: 4px; }

/* ── Seções ── */
.mp-secao { display: flex; flex-direction: column; gap: 10px; }
.mp-secao-titulo {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
  color: #6b7280;
}
.mp-secao-titulo .material-symbols-outlined { font-size: 15px; }
.mp-secao-badge {
  background: #6366f1; color: #fff;
  border-radius: 10px; font-size: 10px; padding: 1px 7px; margin-left: auto;
}

/* ── Cards ── */
.mp-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow .15s;
}
.mp-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.mp-card--pendente {
  border-color: #a5b4fc;
  background: linear-gradient(135deg, #fafbff 0%, #f5f3ff 100%);
  box-shadow: 0 2px 16px rgba(99,102,241,.1);
}
.mp-card--aprovado { border-color: #86efac; background: #f0fdf4; }
.mp-card--cancelado { opacity: .55; }

.mp-card-top { display: flex; align-items: center; justify-content: space-between; }
.mp-card-num { font-size: 13px; font-weight: 800; color: #6366f1; font-family: monospace; }

/* Badges de status */
.mp-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.mp-badge--aguardando        { background: rgba(245,158,11,.12); color: #b45309; }
.mp-badge--orcamento_enviado { background: #eef2ff; color: #6366f1; }
.mp-badge--orc               { background: #eef2ff; color: #6366f1; }
.mp-badge--aprovado          { background: #dcfce7; color: #16a34a; }
.mp-badge--retirado          { background: rgba(14,165,233,.12); color: #0369a1; }
.mp-badge--devolvido         { background: rgba(168,85,247,.12); color: #7e22ce; }
.mp-badge--cancelado         { background: #fee2e2; color: #dc2626; }

.mp-card-itens { display: flex; flex-wrap: wrap; gap: 5px; }
.mp-item-tag {
  background: #f8fafc; border: 1px solid #e5e7eb;
  border-radius: 6px; padding: 3px 8px;
  font-size: 11px; font-weight: 600; color: #374151;
  white-space: nowrap;
}
.mp-item-tag--more { color: #9ca3af; background: transparent; border-color: transparent; }

.mp-card-info {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: #6b7280; font-weight: 500;
}
.mp-card-info .material-symbols-outlined { font-size: 15px; }

/* Valor do orçamento (destaque) */
.mp-valor-box {
  background: #eef2ff;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 3px;
}
.mp-valor-num { font-size: 22px; font-weight: 900; color: #4338ca; letter-spacing: -.4px; }
.mp-valor-obs { font-size: 11px; color: #6b7280; font-style: italic; }


/* Card editável (aguardando) */
.mp-card--editavel { border-color: #fde68a; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
.mp-btn-editar {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 10px;
  background: #f59e0b; border: none; border-radius: 9px;
  color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: filter .15s;
}
.mp-btn-editar:hover { filter: brightness(1.08); }
.mp-btn-editar .material-symbols-outlined { font-size: 16px; }

/* Cancelar pedido */
.mp-btn-cancelar {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 9px;
  background: transparent; border: 1px solid #fca5a5; border-radius: 9px;
  color: #dc2626; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.mp-btn-cancelar:hover { background: #fee2e2; border-color: #dc2626; }
.mp-btn-cancelar .material-symbols-outlined { font-size: 15px; }

/* Confirmação inline de cancelamento */
.mp-cancel-confirm {
  display: flex; flex-direction: column; gap: 8px;
  background: #fff5f5; border: 1px solid #fca5a5;
  border-radius: 10px; padding: 10px 12px;
}
.mp-cancel-confirm > span { font-size: 12px; font-weight: 700; color: #dc2626; text-align: center; }
.mp-cancel-confirm-btns { display: flex; gap: 8px; }
.mp-cancel-sim {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 8px; background: #dc2626; border: none; border-radius: 8px;
  color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: filter .15s;
}
.mp-cancel-sim:hover:not(:disabled) { filter: brightness(1.1); }
.mp-cancel-sim:disabled { opacity: .6; cursor: not-allowed; }
.mp-cancel-sim .material-symbols-outlined { font-size: 14px; }
.mp-cancel-nao {
  flex: 1; padding: 8px; background: #f3f4f6; border: 1px solid #e5e7eb;
  border-radius: 8px; color: #374151; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: background .15s;
}
.mp-cancel-nao:hover { background: #e5e7eb; }

/* Spinner mini */
.mp-spin-xs {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite;
}

/* Botão visualizar orçamento */
.mp-btn-ver-orc {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 9px;
  background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 9px;
  color: #6366f1; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.mp-btn-ver-orc:hover { border-color: #6366f1; background: #eef2ff; }
.mp-btn-ver-orc .material-symbols-outlined { font-size: 16px; }
.mp-btn-ver-orc--destaque {
  padding: 12px;
  font-size: 13px;
  background: #6366f1; border-color: #6366f1; color: #fff;
  box-shadow: 0 3px 12px rgba(99,102,241,.35);
}
.mp-btn-ver-orc--destaque:hover { background: #4f46e5; border-color: #4f46e5; }

/* Rodapé do histórico */
.mp-card-footer {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; flex-wrap: wrap;
}
.mp-valor-inline { color: #374151; font-size: 13px; }
.mp-card-data { margin-left: auto; color: #9ca3af; font-size: 11px; }
.mp-aprovado-strip {
  display: flex; align-items: center; gap: 6px;
  background: #dcfce7; border-radius: 8px; padding: 7px 10px;
  font-size: 12px; font-weight: 700; color: #16a34a;
}
.mp-aprovado-strip .material-symbols-outlined { font-size: 16px; }

/* Spinner */
.mp-spinner {
  width: 22px; height: 22px;
  border: 2px solid #e5e7eb; border-top-color: #6366f1;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Rodapé do drawer */
.mp-footer {
  padding: 14px 16px;
  border-top: 1px solid #f1f5f9;
  background: #fff;
  flex-shrink: 0;
}
.mp-btn-novo-pedido {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 13px;
  background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px;
  color: #374151; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.mp-btn-novo-pedido:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
.mp-btn-novo-pedido .material-symbols-outlined { font-size: 18px; }

/* Toast */
.mp-toast {
  position: absolute; bottom: 76px; left: 50%;
  transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 600;
  white-space: nowrap; z-index: 10;
  box-shadow: 0 4px 20px rgba(0,0,0,.15);
}
.mp-toast.ok  { background: #064e2a; color: #86efac; }
.mp-toast.err { background: #7f1d1d; color: #fecaca; }
.mp-toast .material-symbols-outlined { font-size: 16px; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }

/* ── Dark mode ── */
.mp-dark { background: #1e293b; color: #f1f5f9; }
.mp-dark .mp-header { background: #1e293b; border-bottom-color: #334155; }
.mp-dark .mp-title  { color: #f1f5f9; }
.mp-dark .mp-sub    { color: #64748b; }
.mp-dark .mp-refresh-btn,
.mp-dark .mp-close-btn   { background: #2d3748; border-color: #334155; color: #94a3b8; }
.mp-dark .mp-refresh-btn:hover,
.mp-dark .mp-close-btn:hover { background: #334155; color: #f1f5f9; }
.mp-dark .mp-header-icon { background: #312e81; }
.mp-dark .mp-body   { background: #1e293b; }
.mp-dark .mp-state  { color: #64748b; }
.mp-dark .mp-vazio-ico { background: #2d3748; }
.mp-dark .mp-vazio-txt { color: #e2e8f0; }
.mp-dark .mp-secao-titulo { color: #64748b; }
.mp-dark .mp-card   { background: #2d3748; border-color: #334155; }
.mp-dark .mp-card--editavel { background: linear-gradient(135deg, #422006 0%, #451a03 100%); border-color: #92400e; }
.mp-dark .mp-card--pendente { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-color: #4338ca; }
.mp-dark .mp-card--aprovado { background: #052e16; border-color: #166534; }
.mp-dark .mp-card-num { color: #818cf8; }
.mp-dark .mp-item-tag { background: #1e293b; border-color: #334155; color: #cbd5e1; }
.mp-dark .mp-card-info { color: #64748b; }
.mp-dark .mp-valor-box { background: #1e1b4b; }
.mp-dark .mp-valor-num { color: #a5b4fc; }
.mp-dark .mp-valor-obs { color: #64748b; }
.mp-dark .mp-valor-inline { color: #e2e8f0; }
.mp-dark .mp-card-data { color: #475569; }
.mp-dark .mp-aprovado-strip { background: #052e16; color: #4ade80; }
.mp-dark .mp-btn-ver-orc { background: #2d3748; border-color: #334155; color: #818cf8; }
.mp-dark .mp-btn-ver-orc:hover { border-color: #6366f1; background: #1e1b4b; }
.mp-dark .mp-btn-ver-orc--destaque { background: #6366f1; border-color: #6366f1; color: #fff; }
.mp-dark .mp-footer { background: #1e293b; border-top-color: #334155; }
.mp-dark .mp-btn-novo-pedido { background: #2d3748; border-color: #334155; color: #cbd5e1; }
.mp-dark .mp-btn-novo-pedido:hover { border-color: #6366f1; color: #a5b4fc; background: #1e1b4b; }
.mp-dark .mp-cancel-confirm { background: rgba(127,29,29,.3); border-color: #7f1d1d; }
.mp-dark .mp-cancel-nao { background: #2d3748; border-color: #334155; color: #cbd5e1; }
.mp-dark .mp-cancel-nao:hover { background: #334155; }
</style>
