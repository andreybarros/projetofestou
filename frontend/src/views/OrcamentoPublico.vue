<template>
  <div class="op-page">

    <div v-if="carregando" class="op-loading">
      <div class="op-spin"></div>
      <p>Carregando orçamento…</p>
    </div>

    <div v-else-if="erro" class="op-erro">
      <span class="op-erro-ico">😕</span>
      <h2>{{ erro }}</h2>
      <p>Verifique o link ou entre em contato com a loja.</p>
    </div>

    <template v-else>
      <header class="op-header">
        <div class="op-header-inner">
          <img src="/img/logo_fundo_transp.png" alt="BarroStock" class="op-logo" />
          <div>
            <h1 class="op-titulo">Orçamento</h1>
            <p class="op-subtitulo">Confira os detalhes e aprove se estiver de acordo</p>
          </div>
        </div>
      </header>

      <div class="op-body">
        <div class="op-card">

          <!-- Status -->
          <div class="op-status-bar">
            <span :class="['op-badge', `op-badge--${pedido.status}`]">
              {{ labelStatus(pedido.status) }}
            </span>
            <span class="op-data">Pedido em {{ fmtData(pedido.criado_em) }}</span>
          </div>

          <!-- Dados do cliente / evento -->
          <section class="op-section">
            <h2 class="op-section-title">
              <span class="material-symbols-outlined">person</span>
              Dados do Pedido
            </h2>
            <div class="op-grid2">
              <div class="op-info-item">
                <span class="op-info-label">Cliente</span>
                <span class="op-info-val">{{ pedido.nome_cliente }}</span>
              </div>
              <div v-if="pedido.telefone" class="op-info-item">
                <span class="op-info-label">Telefone</span>
                <span class="op-info-val">{{ pedido.telefone }}</span>
              </div>
              <div v-if="pedido.data_evento" class="op-info-item">
                <span class="op-info-label">Data do Evento</span>
                <span class="op-info-val">{{ fmtData(pedido.data_evento) }}</span>
              </div>
              <div v-if="pedido.hora_evento" class="op-info-item">
                <span class="op-info-label">Horário</span>
                <span class="op-info-val">{{ pedido.hora_evento }}</span>
              </div>
              <div class="op-info-item">
                <span class="op-info-label">Entrega</span>
                <span class="op-info-val op-entrega-val">
                  <span class="material-symbols-outlined">{{ pedido.tipo_entrega === 'entrega' ? 'local_shipping' : 'store' }}</span>
                  {{ pedido.tipo_entrega === 'entrega' ? 'Entrega no endereço' : 'Retirada na loja' }}
                </span>
              </div>
              <div v-if="pedido.endereco_evento" class="op-info-item op-info-item--full">
                <span class="op-info-label">Endereço do Evento</span>
                <span class="op-info-val">{{ pedido.endereco_evento }}</span>
              </div>
              <div v-if="pedido.observacao" class="op-info-item op-info-item--full">
                <span class="op-info-label">Observações</span>
                <span class="op-info-val op-obs">{{ pedido.observacao }}</span>
              </div>
            </div>
          </section>

          <!-- Itens -->
          <section class="op-section">
            <h2 class="op-section-title">
              <span class="material-symbols-outlined">inventory_2</span>
              Itens do Pedido
            </h2>
            <div class="op-itens">
              <div v-for="it in pedido.itens" :key="it.nome_produto" class="op-item">
                <span class="op-item-qty">{{ it.quantidade }}×</span>
                <span class="op-item-nome">{{ it.nome_produto }}</span>
              </div>
            </div>
          </section>

          <!-- Orçamento (só quando disponível) -->
          <section v-if="pedido.valor_orcamento" class="op-section op-section--destaque">
            <h2 class="op-section-title">
              <span class="material-symbols-outlined">request_quote</span>
              Valor do Orçamento
            </h2>
            <div class="op-valor">{{ fmtMoeda(pedido.valor_orcamento) }}</div>
            <div v-if="pedido.obs_orcamento" class="op-obs-orc">{{ pedido.obs_orcamento }}</div>
          </section>

          <!-- Sem orçamento ainda -->
          <section v-else class="op-section op-section--pendente">
            <span class="material-symbols-outlined" style="font-size:32px;color:#9ca3af">hourglass_empty</span>
            <p>O orçamento ainda não foi enviado. Em breve a loja entrará em contato.</p>
          </section>

          <!-- Ação de aprovação -->
          <div v-if="pedido.status === 'orcamento_enviado'" class="op-aprovar-box">
            <p class="op-aprovar-msg">Está de acordo com o valor e deseja confirmar o pedido?</p>
            <div v-if="erroAprovar" class="op-erro-inline">{{ erroAprovar }}</div>
            <button class="op-btn-aprovar" :disabled="aprovando" @click="aprovar">
              <span v-if="aprovando" class="op-spin-sm"></span>
              <span v-else class="material-symbols-outlined">check_circle</span>
              {{ aprovando ? 'Confirmando…' : 'Confirmar Pedido' }}
            </button>
          </div>

          <div v-if="pedido.status === 'aprovado'" class="op-aprovado-box">
            <span class="material-symbols-outlined">check_circle</span>
            Pedido confirmado! A loja entrará em contato com você em breve.
          </div>

          <div v-if="pedido.status === 'cancelado'" class="op-cancelado-box">
            <span class="material-symbols-outlined">cancel</span>
            Este pedido foi cancelado.
          </div>

        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const token = route.params.token;

const carregando  = ref(true);
const erro        = ref('');
const pedido      = ref(null);
const aprovando   = ref(false);
const erroAprovar = ref('');

onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/catalogo-publico/orcamento/${token}`);
    pedido.value = data.pedido;
  } catch (e) {
    erro.value = e.response?.data?.erro || 'Orçamento não encontrado';
  } finally {
    carregando.value = false;
  }
});

async function aprovar() {
  erroAprovar.value = '';
  aprovando.value = true;
  try {
    await axios.post(`/api/catalogo-publico/orcamento/${token}/aprovar`);
    pedido.value.status = 'aprovado';
  } catch (e) {
    erroAprovar.value = e.response?.data?.erro || 'Erro ao confirmar. Tente novamente.';
  } finally {
    aprovando.value = false;
  }
}

function labelStatus(s) {
  const m = { aguardando: 'Aguardando orçamento', orcamento_enviado: 'Orçamento pronto', aprovado: 'Confirmado', cancelado: 'Cancelado' };
  return m[s] || s;
}
function fmtData(dt) {
  if (!dt) return '—';
  if (dt.includes('T')) return new Date(dt).toLocaleDateString('pt-BR');
  return dt.split('-').reverse().join('/');
}
function fmtMoeda(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
</script>

<style scoped>
.op-page { height: 100dvh; overflow-y: auto; background: #f1f5f9; font-family: 'Hanken Grotesk', system-ui, sans-serif; color: #0f172a; }

.op-header { background: #fff; border-bottom: 1px solid #e5e7eb; }
.op-header-inner { max-width: 720px; margin: 0 auto; padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
.op-logo { height: 38px; object-fit: contain; }
.op-titulo { font-size: 18px; font-weight: 800; margin: 0; color: #0f172a; }
.op-subtitulo { font-size: 12px; color: #6b7280; margin: 2px 0 0; }

.op-body { max-width: 720px; margin: 0 auto; padding: 28px 20px 60px; }

.op-card { background: #fff; border-radius: 18px; border: 1px solid #e5e7eb; overflow: hidden; display: flex; flex-direction: column; gap: 0; }

.op-status-bar { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
.op-badge { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
.op-badge--aguardando        { background: rgba(251,191,36,.15); color: #b45309; }
.op-badge--orcamento_enviado { background: rgba(99,102,241,.15); color: #4f46e5; }
.op-badge--aprovado          { background: rgba(74,222,128,.15); color: #16a34a; }
.op-badge--cancelado         { background: rgba(248,113,113,.15); color: #dc2626; }
.op-data { font-size: 12px; color: #9ca3af; }

.op-section { padding: 20px 22px; border-bottom: 1px solid #f1f5f9; }
.op-section:last-child { border-bottom: none; }
.op-section-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin: 0 0 14px; }
.op-section-title .material-symbols-outlined { font-size: 17px; color: #6366f1; }

.op-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.op-info-item { display: flex; flex-direction: column; gap: 3px; }
.op-info-item--full { grid-column: 1 / -1; }
.op-info-label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: .04em; }
.op-info-val { font-size: 14px; font-weight: 600; color: #0f172a; }
.op-entrega-val { display: flex; align-items: center; gap: 5px; }
.op-entrega-val .material-symbols-outlined { font-size: 16px; color: #6366f1; }
.op-obs { font-style: italic; color: #6b7280; font-weight: 400; }

.op-itens { display: flex; flex-direction: column; gap: 8px; }
.op-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; }
.op-item-qty { font-size: 13px; font-weight: 800; color: #6366f1; min-width: 28px; }
.op-item-nome { font-size: 14px; font-weight: 600; color: #0f172a; }

.op-section--destaque { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-top: 1px solid #bae6fd; border-bottom: 1px solid #bae6fd; }
.op-valor { font-size: 36px; font-weight: 900; color: #0369a1; margin: 8px 0 4px; }
.op-obs-orc { font-size: 13px; color: #0369a1; opacity: .8; font-style: italic; }

.op-section--pendente { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 32px 22px; background: #f9fafb; }
.op-section--pendente p { font-size: 14px; color: #6b7280; margin: 0; }

.op-aprovar-box { padding: 20px 22px; background: #f0fdf4; border-top: 1px solid #bbf7d0; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.op-aprovar-msg { font-size: 14px; color: #166534; font-weight: 600; margin: 0; text-align: center; }
.op-erro-inline { color: #dc2626; font-size: 13px; }
.op-btn-aprovar { display: flex; align-items: center; gap: 8px; padding: 13px 32px; background: #16a34a; border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background .15s; }
.op-btn-aprovar:hover:not(:disabled) { background: #15803d; }
.op-btn-aprovar:disabled { opacity: .5; cursor: not-allowed; }
.op-btn-aprovar .material-symbols-outlined { font-size: 20px; }

.op-aprovado-box { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 18px 22px; background: #f0fdf4; border-top: 1px solid #bbf7d0; font-size: 14px; font-weight: 600; color: #166534; }
.op-aprovado-box .material-symbols-outlined { font-size: 22px; color: #16a34a; }

.op-cancelado-box { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 18px 22px; background: #fef2f2; border-top: 1px solid #fecaca; font-size: 14px; font-weight: 600; color: #dc2626; }
.op-cancelado-box .material-symbols-outlined { font-size: 22px; }

.op-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 16px; color: #6b7280; }
.op-spin { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.op-spin-sm { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.op-erro { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 12px; text-align: center; padding: 20px; color: #374151; }
.op-erro-ico { font-size: 60px; }
.op-erro h2  { font-size: 22px; font-weight: 700; margin: 0; }
.op-erro p   { color: #6b7280; margin: 0; }

@media (max-width: 500px) {
  .op-grid2 { grid-template-columns: 1fr; }
  .op-valor { font-size: 28px; }
}
</style>
