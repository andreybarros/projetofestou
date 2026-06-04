<template>
  <div class="mp-overlay" @click.self="$emit('fechar')">
    <div class="mp-drawer">

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
});

const emit   = defineEmits(['fechar']);
const router = useRouter();

const carregando = ref(true);
const pedidos    = ref([]);
const toast      = ref('');
const toastTipo  = ref('ok');
let   toastTimer = null;

const headers = computed(() =>
  props.sessaoToken ? { 'x-sessao-token': props.sessaoToken } : {}
);

const pendentes  = computed(() => pedidos.value.filter(p => p.status === 'orcamento_enviado'));
const historico  = computed(() => pedidos.value.filter(p => p.status !== 'orcamento_enviado'));

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
</style>
