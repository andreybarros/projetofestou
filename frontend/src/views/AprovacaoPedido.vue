<template>
  <div class="ap-page">

    <!-- Header dark igual ao catálogo -->
    <header class="ap-header">
      <div class="ap-header-inner">
        <img src="/img/logo_fundo_transp.png" alt="BarroStock" class="ap-logo" />
        <div class="ap-header-info">
          <div v-if="catalogo" class="ap-catalogo-nome">{{ catalogo.nome }}</div>
          <div class="ap-catalogo-desc">Aprovação de Orçamento</div>
        </div>
        <button class="ap-voltar-btn" @click="voltarCatalogo">
          <span class="material-symbols-outlined">storefront</span>
          <span class="ap-voltar-txt">Voltar ao catálogo</span>
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="carregando" class="ap-loading">
      <div class="ap-spin"></div>
      <p>Carregando orçamento…</p>
    </div>

    <!-- Erro -->
    <div v-else-if="erro" class="ap-erro">
      <span class="ap-erro-ico">😕</span>
      <h2>{{ erro }}</h2>
      <button class="ap-btn-voltar" @click="voltarCatalogo">Voltar ao catálogo</button>
    </div>

    <div v-else class="ap-body">
      <div class="ap-card">

        <!-- Número e status -->
        <div class="ap-card-hero">
          <div class="ap-order-ref">
            <span class="material-symbols-outlined">receipt_long</span>
            Pedido #{{ String(pedido.pk).padStart(4,'0') }}
          </div>
          <span :class="['ap-status', `ap-status--${pedido.status}`]">
            {{ labelStatus(pedido.status) }}
          </span>
        </div>

        <!-- Dados do evento -->
        <section v-if="pedido.data_evento || pedido.tipo_entrega" class="ap-section">
          <div class="ap-section-title">
            <span class="material-symbols-outlined">event</span>
            Dados do Evento
          </div>
          <div class="ap-info-grid">
            <div v-if="pedido.data_evento" class="ap-info-item">
              <div class="ap-info-label">Data</div>
              <div class="ap-info-val">{{ fmtDataLocal(pedido.data_evento) }}</div>
            </div>
            <div v-if="pedido.hora_evento" class="ap-info-item">
              <div class="ap-info-label">Horário</div>
              <div class="ap-info-val">{{ pedido.hora_evento }}</div>
            </div>
            <div class="ap-info-item">
              <div class="ap-info-label">Entrega</div>
              <div class="ap-info-entrega">
                <span class="material-symbols-outlined">
                  {{ pedido.tipo_entrega === 'entrega' ? 'local_shipping' : 'store' }}
                </span>
                {{ pedido.tipo_entrega === 'entrega' ? 'Entrega no endereço' : 'Retirada na loja' }}
              </div>
            </div>
            <div v-if="pedido.endereco_evento" class="ap-info-item ap-info-item--full">
              <div class="ap-info-label">Endereço</div>
              <div class="ap-info-val">{{ pedido.endereco_evento }}</div>
            </div>
          </div>
        </section>

        <!-- Itens -->
        <section class="ap-section">
          <div class="ap-section-title">
            <span class="material-symbols-outlined">inventory_2</span>
            Itens Solicitados
          </div>
          <div class="ap-itens">
            <div v-for="it in pedido.itens" :key="it.nome_produto" class="ap-item">
              <!-- Foto do produto (substituto se houver) — clicável para ampliar -->
              <div
                class="ap-item-foto-wrap"
                :class="{ 'ap-item-foto-wrap--zoom': it.nome_produto_substituto ? it.foto_url_substituto : it.foto_url }"
                @click="abrirFoto(it)"
              >
                <img
                  v-if="it.nome_produto_substituto ? it.foto_url_substituto : it.foto_url"
                  :src="it.nome_produto_substituto ? it.foto_url_substituto : it.foto_url"
                  class="ap-item-foto"
                />
                <div v-else class="ap-item-foto ap-item-foto--vazio">
                  <span class="material-symbols-outlined">image_not_supported</span>
                </div>
                <div v-if="it.nome_produto_substituto ? it.foto_url_substituto : it.foto_url" class="ap-item-foto-lupa">
                  <span class="material-symbols-outlined">zoom_in</span>
                </div>
              </div>
              <div class="ap-item-info">
                <div class="ap-item-row">
                  <div class="ap-item-qty">{{ it.quantidade }}</div>
                  <div class="ap-item-nome">{{ it.nome_produto_substituto || it.nome_produto || it.nome }}</div>
                </div>
                <!-- Badge de substituição -->
                <div v-if="it.nome_produto_substituto" class="ap-item-subst">
                  <span class="material-symbols-outlined">swap_horiz</span>
                  <span>substituído por <strong>{{ it.nome_produto_substituto }}</strong></span>
                  <span class="ap-item-orig">(original: {{ it.nome_produto }})</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Observações -->
        <section v-if="pedido.observacao" class="ap-section">
          <div class="ap-section-title">
            <span class="material-symbols-outlined">notes</span>
            Suas Observações
          </div>
          <div class="ap-obs">{{ pedido.observacao }}</div>
        </section>

        <!-- Orçamento -->
        <section v-if="pedido.valor_orcamento" class="ap-section ap-section--valor">
          <div class="ap-section-title">
            <span class="material-symbols-outlined">request_quote</span>
            Valor do Orçamento
          </div>
          <div class="ap-valor">{{ fmtMoeda(pedido.valor_orcamento) }}</div>
          <div v-if="pedido.obs_orcamento" class="ap-valor-obs">{{ pedido.obs_orcamento }}</div>
        </section>

        <!-- Sem orçamento ainda / aguardando novo após recusa ou substituição -->
        <section v-else class="ap-section ap-section--aguardando">
          <span class="material-symbols-outlined">hourglass_empty</span>
          <p v-if="pedido.recusado_em">Orçamento recusado. Aguardando nova proposta da loja.</p>
          <p v-else>O orçamento ainda não foi preparado. Em breve a loja entrará em contato.</p>
        </section>

        <!-- Conflitos de disponibilidade -->
        <div v-if="pedido.status === 'orcamento_enviado' && temConflito" class="ap-conflito-zone">
          <div class="ap-conflito-titulo">
            <span class="material-symbols-outlined">warning</span>
            Produtos indisponíveis para a data do seu evento
          </div>
          <p class="ap-conflito-desc">
            Os produtos abaixo foram reservados por outro pedido. Escolha um substituto para cada um para continuar.
          </p>
          <div class="ap-conflito-lista">
            <div v-for="c in conflitos" :key="c.item_pk" class="ap-conflito-item">
              <div class="ap-conflito-prod">
                <span class="material-symbols-outlined">block</span>
                {{ c.nome_produto }}
              </div>
              <button class="ap-conflito-btn" @click="irParaCatalogo(c)">
                <span class="material-symbols-outlined">storefront</span>
                Escolher no catálogo
              </button>
            </div>
          </div>
        </div>

        <!-- Ação de aprovação -->
        <div v-if="pedido.status === 'orcamento_enviado' && !temConflito" class="ap-aprovar-zone">
          <p class="ap-aprovar-msg">
            Está de acordo com o valor? Confirme abaixo para que possamos prosseguir!
          </p>
          <div v-if="erroAprovar" class="ap-erro-inline">
            <span class="material-symbols-outlined">error</span>
            {{ erroAprovar }}
          </div>
          <button class="ap-btn-confirmar" :disabled="aprovando || recusando" @click="aprovar">
            <span v-if="aprovando" class="ap-spinner"></span>
            <span v-else class="material-symbols-outlined">check_circle</span>
            {{ aprovando ? 'Confirmando…' : 'Confirmar Pedido' }}
          </button>
          <!-- Recusar -->
          <Transition name="ap-fade">
            <div v-if="confirmandoRecusa" class="ap-recusar-confirm">
              <p>Tem certeza? O orçamento será recusado e a loja será notificada para enviar uma nova proposta.</p>
              <div class="ap-recusar-btns">
                <button class="ap-btn-recusar-cancel" @click="confirmandoRecusa = false">Cancelar</button>
                <button class="ap-btn-recusar-ok" :disabled="recusando" @click="recusar">
                  <span v-if="recusando" class="ap-spinner" style="width:16px;height:16px"></span>
                  <span v-else class="material-symbols-outlined">thumb_down</span>
                  {{ recusando ? 'Recusando…' : 'Recusar Orçamento' }}
                </button>
              </div>
            </div>
            <button v-else class="ap-btn-recusar" @click="confirmandoRecusa = true">
              <span class="material-symbols-outlined">thumb_down</span>
              Não aceito este valor
            </button>
          </Transition>
        </div>

        <!-- Aprovado -->
        <div v-if="pedido.status === 'aprovado'" class="ap-confirmado">
          <span class="material-symbols-outlined">check_circle</span>
          <div>
            <div class="ap-confirmado-titulo">Pedido confirmado!</div>
            <div class="ap-confirmado-sub">A loja entrará em contato para finalizar os detalhes.</div>
          </div>
        </div>

        <!-- Botão voltar ao catálogo -->
        <button class="ap-btn-catalogo" @click="voltarCatalogo">
          <span class="material-symbols-outlined">storefront</span>
          Voltar ao Catálogo
        </button>

      </div>
    </div>
  </div>

  <!-- Lightbox -->
  <Transition name="ap-fade">
    <div v-if="fotoLightbox" class="ap-lightbox" @click="fotoLightbox = null">
      <button class="ap-lightbox-close" @click="fotoLightbox = null">
        <span class="material-symbols-outlined">close</span>
      </button>
      <img :src="fotoLightbox.url" :alt="fotoLightbox.nome" class="ap-lightbox-img" @click.stop />
      <div class="ap-lightbox-nome">{{ fotoLightbox.nome }}</div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route  = useRoute();
const router = useRouter();

// Ao voltar do catálogo após substituir, recarrega pedido e conflitos
onActivated(async () => {
  if (pedido.value && route.query.substituido) {
    const { data } = await axios.get(`/api/catalogo-publico/orcamento/${pedidoToken}`).catch(() => ({ data: null }));
    if (data?.pedido) pedido.value = data.pedido;
    await verificarConflitos();
  }
});

const catalogoToken = route.params.token;
const pedidoToken   = route.params.pedidoToken;

const carregando  = ref(true);
const erro        = ref('');
const pedido      = ref(null);
const catalogo    = ref(null);
const aprovando          = ref(false);
const erroAprovar        = ref('');
const recusando          = ref(false);
const confirmandoRecusa  = ref(false);
const fotoLightbox       = ref(null);

// Conflitos
const conflitos  = ref([]);
const temConflito = computed(() => conflitos.value.length > 0);

function abrirFoto(it) {
  const url  = it.nome_produto_substituto ? it.foto_url_substituto : it.foto_url;
  const nome = it.nome_produto_substituto || it.nome_produto || it.nome;
  if (url) fotoLightbox.value = { url, nome };
}

onMounted(async () => {
  try {
    const [resCatalogo, resPedido] = await Promise.allSettled([
      axios.get(`/api/catalogo-publico/${catalogoToken}`),
      axios.get(`/api/catalogo-publico/orcamento/${pedidoToken}`),
    ]);

    if (resCatalogo.status === 'fulfilled') {
      catalogo.value = resCatalogo.value.data.catalogo;
    }
    if (resPedido.status === 'rejected') {
      erro.value = resPedido.reason.response?.data?.erro || 'Orçamento não encontrado';
    } else {
      pedido.value = resPedido.value.data.pedido;
      if (pedido.value?.status === 'orcamento_enviado') await verificarConflitos();
    }
  } catch (e) {
    erro.value = 'Erro ao carregar. Tente novamente.';
  } finally {
    carregando.value = false;
  }
});

async function verificarConflitos() {
  try {
    const { data } = await axios.get(`/api/catalogo-publico/orcamento/${pedidoToken}/conflitos`);
    conflitos.value = data.conflitos || [];
  } catch { /* silencioso */ }
}

function irParaCatalogo(c) {
  router.push({
    path: `/catalogo/${catalogoToken}`,
    query: {
      modo:        'substituir',
      item:        c.item_pk,
      pedido:      pedidoToken,
      produto:     c.nome_produto,
      data_evento: pedido.value?.data_evento  || '',
      hora_evento: pedido.value?.hora_evento  || '',
    },
  });
}

async function aprovar() {
  erroAprovar.value = '';
  aprovando.value = true;
  try {
    await axios.post(`/api/catalogo-publico/orcamento/${pedidoToken}/aprovar`);
    pedido.value.status = 'aprovado';
    conflitos.value = [];
  } catch (e) {
    erroAprovar.value = e.response?.data?.erro || 'Erro ao confirmar. Tente novamente.';
  } finally {
    aprovando.value = false;
  }
}

async function recusar() {
  recusando.value = true;
  try {
    await axios.post(`/api/catalogo-publico/orcamento/${pedidoToken}/recusar`);
    pedido.value.status        = 'aguardando';
    pedido.value.valor_orcamento = null;
    pedido.value.obs_orcamento   = null;
    confirmandoRecusa.value = false;
  } catch (e) {
    erroAprovar.value = e.response?.data?.erro || 'Erro ao recusar. Tente novamente.';
  } finally {
    recusando.value = false;
  }
}

function voltarCatalogo() {
  router.push(`/catalogo/${catalogoToken}`);
}

function labelStatus(s) {
  const m = {
    aguardando:        'Aguardando orçamento',
    orcamento_enviado: 'Orçamento pronto',
    aprovado:          'Confirmado',
    retirado:          'Retirado',
    devolvido:         'Devolvido',
    cancelado:         'Cancelado',
  };
  return m[s] || s;
}
function fmtDataLocal(dt) { return dt ? dt.split('-').reverse().join('/') : '—'; }
function fmtMoeda(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
</script>

<style scoped>
/* ── Page ── */
.ap-page { height: 100dvh; overflow-y: auto; background: #f1f5f9; font-family: 'Hanken Grotesk', system-ui, sans-serif; color: #0f172a; }

/* ── Header dark ── */
.ap-header { background: #111318; border-bottom: 1px solid rgba(255,255,255,.06); position: sticky; top: 0; z-index: 100; }
.ap-header-inner { max-width: 720px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; gap: 14px; }
.ap-logo { height: 36px; object-fit: contain; }
.ap-header-info { flex: 1; }
.ap-catalogo-nome { font-size: 14px; font-weight: 800; color: #fff; }
.ap-catalogo-desc { font-size: 11px; color: rgba(255,255,255,.45); }
.ap-voltar-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); border-radius: 9px; color: rgba(255,255,255,.75); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; }
.ap-voltar-btn:hover { background: rgba(255,255,255,.15); color: #fff; }
.ap-voltar-btn .material-symbols-outlined { font-size: 16px; }
.ap-voltar-txt { display: none; }
@media (min-width: 480px) { .ap-voltar-txt { display: inline; } }

/* ── Loading / Erro ── */
.ap-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 14px; color: #6b7280; }
.ap-spin { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.ap-erro  { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; text-align: center; padding: 20px; }
.ap-erro-ico { font-size: 52px; }
.ap-erro h2 { font-size: 20px; font-weight: 700; margin: 0; color: #374151; }
.ap-btn-voltar { padding: 10px 24px; background: #6366f1; border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Body ── */
.ap-body { max-width: 680px; margin: 0 auto; padding: 24px 16px 60px; }

/* ── Card principal ── */
.ap-card { background: #fff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 16px rgba(0,0,0,.06); }

/* Hero com número e status */
.ap-card-hero { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
.ap-order-ref { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; color: #6366f1; }
.ap-order-ref .material-symbols-outlined { font-size: 16px; }
.ap-status { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
.ap-status--aguardando        { background: rgba(245,158,11,.12); color: #b45309; }
.ap-status--orcamento_enviado { background: #eef2ff; color: #6366f1; }
.ap-status--aprovado          { background: #dcfce7; color: #16a34a; }
.ap-status--retirado          { background: rgba(14,165,233,.12); color: #0369a1; }
.ap-status--devolvido         { background: rgba(168,85,247,.12); color: #7e22ce; }
.ap-status--cancelado         { background: #fee2e2; color: #dc2626; }

/* Seções */
.ap-section { padding: 18px 20px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 12px; }
.ap-section:last-child { border-bottom: none; }
.ap-section-title { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #6b7280; }
.ap-section-title .material-symbols-outlined { font-size: 16px; color: #6366f1; }

.ap-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.ap-info-item { display: flex; flex-direction: column; gap: 2px; }
.ap-info-item--full { grid-column: 1 / -1; }
.ap-info-label { font-size: 10px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.ap-info-val { font-size: 13px; font-weight: 600; color: #0f172a; }
.ap-info-entrega { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; color: #0f172a; }
.ap-info-entrega .material-symbols-outlined { font-size: 16px; color: #6366f1; }

/* Itens */
.ap-itens { display: flex; flex-direction: column; gap: 8px; }
.ap-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9; }
.ap-item-foto-wrap { flex-shrink: 0; position: relative; }
.ap-item-foto-wrap--zoom { cursor: zoom-in; }
.ap-item-foto-wrap--zoom:hover .ap-item-foto-lupa { opacity: 1; }
.ap-item-foto-lupa { position: absolute; inset: 0; background: rgba(0,0,0,.38); border-radius: 8px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .18s; }
.ap-item-foto-lupa .material-symbols-outlined { font-size: 22px; color: #fff; }
.ap-item-foto { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; display: flex; }
.ap-item-foto--vazio { width: 52px; height: 52px; border-radius: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; }
.ap-item-foto--vazio .material-symbols-outlined { font-size: 20px; color: #cbd5e1; }

/* Recusar orçamento */
.ap-btn-recusar { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 11px; background: transparent; border: 1px solid #e2e8f0; border-radius: 10px; color: #6b7280; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; width: 100%; margin-top: 4px; }
.ap-btn-recusar:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
.ap-btn-recusar .material-symbols-outlined { font-size: 17px; }
.ap-recusar-confirm { display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; margin-top: 4px; }
.ap-recusar-confirm p { font-size: 13px; color: #7f1d1d; margin: 0; line-height: 1.5; }
.ap-recusar-btns { display: flex; gap: 8px; }
.ap-btn-recusar-cancel { flex: 1; padding: 9px; background: #fff; border: 1px solid #e2e8f0; border-radius: 9px; color: #374151; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.ap-btn-recusar-ok { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; background: #ef4444; border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: filter .15s; }
.ap-btn-recusar-ok:hover:not(:disabled) { filter: brightness(1.08); }
.ap-btn-recusar-ok:disabled { opacity: .5; cursor: not-allowed; }
.ap-btn-recusar-ok .material-symbols-outlined { font-size: 16px; }

/* Lightbox */
.ap-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.92); z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; cursor: zoom-out; }
.ap-lightbox-img { max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 14px; box-shadow: 0 8px 48px rgba(0,0,0,.5); cursor: default; }
.ap-lightbox-nome { margin-top: 16px; color: rgba(255,255,255,.8); font-size: 14px; font-weight: 600; text-align: center; }
.ap-lightbox-close { position: absolute; top: 18px; right: 18px; width: 44px; height: 44px; background: rgba(255,255,255,.15); border: none; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s; }
.ap-lightbox-close:hover { background: rgba(255,255,255,.28); }
.ap-lightbox-close .material-symbols-outlined { font-size: 22px; }
.ap-fade-enter-active, .ap-fade-leave-active { transition: opacity .2s; }
.ap-fade-enter-from, .ap-fade-leave-to { opacity: 0; }
.ap-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.ap-item-row { display: flex; align-items: center; gap: 10px; }
.ap-item-qty { width: 28px; height: 28px; border-radius: 7px; background: #eef2ff; color: #6366f1; font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ap-item-nome { font-size: 13px; font-weight: 600; color: #0f172a; }
.ap-item-subst { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 8px; font-size: 11px; color: #92400e; }
.ap-item-subst .material-symbols-outlined { font-size: 14px; color: #d97706; flex-shrink: 0; }
.ap-item-orig { color: #b45309; font-style: italic; }

/* Observações */
.ap-obs { font-size: 13px; color: #6b7280; background: #f8fafc; border-radius: 8px; padding: 10px 12px; font-style: italic; border: 1px solid #f1f5f9; }

/* Valor */
.ap-section--valor { background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%); border-bottom: 1px solid #e0e7ff; }
.ap-valor { font-size: 36px; font-weight: 900; color: #4338ca; letter-spacing: -.8px; }
.ap-valor-obs { font-size: 13px; color: #6366f1; opacity: .8; font-style: italic; }

/* Aguardando */
.ap-section--aguardando { align-items: center; text-align: center; padding: 32px 20px; background: #f8fafc; }
.ap-section--aguardando .material-symbols-outlined { font-size: 36px; color: #d1d5db; }
.ap-section--aguardando p { font-size: 14px; color: #6b7280; margin: 0; }

/* Conflitos */
.ap-conflito-zone { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; background: #fff7ed; border-top: 1px solid #fed7aa; }
.ap-conflito-titulo { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; color: #c2410c; }
.ap-conflito-titulo .material-symbols-outlined { font-size: 18px; }
.ap-conflito-desc { font-size: 13px; color: #92400e; margin: 0; line-height: 1.5; }
.ap-conflito-lista { display: flex; flex-direction: column; gap: 8px; }
.ap-conflito-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 9px; flex-wrap: wrap; }
.ap-conflito-prod { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #92400e; }
.ap-conflito-prod .material-symbols-outlined { font-size: 16px; color: #ef4444; }
.ap-conflito-btn { display: flex; align-items: center; gap: 5px; padding: 7px 14px; background: #f97316; border: none; border-radius: 8px; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: filter .15s; white-space: nowrap; }
.ap-conflito-btn:hover { filter: brightness(1.1); }
.ap-conflito-btn .material-symbols-outlined { font-size: 15px; }


/* Aprovar */
.ap-aprovar-zone { padding: 20px; display: flex; flex-direction: column; gap: 12px; background: #f0fdf4; border-top: 1px solid #bbf7d0; }
.ap-aprovar-msg { font-size: 14px; color: #166534; font-weight: 600; margin: 0; text-align: center; }
.ap-erro-inline { display: flex; align-items: center; gap: 7px; padding: 10px 14px; background: #fef2f2; border-radius: 9px; font-size: 13px; color: #dc2626; border: 1px solid #fecaca; }
.ap-erro-inline .material-symbols-outlined { font-size: 16px; }
.ap-btn-confirmar { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 15px; background: #16a34a; border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; transition: filter .15s; box-shadow: 0 4px 16px rgba(22,163,74,.3); }
.ap-btn-confirmar:hover:not(:disabled) { filter: brightness(1.08); }
.ap-btn-confirmar:disabled { opacity: .5; cursor: not-allowed; }
.ap-btn-confirmar .material-symbols-outlined { font-size: 22px; }
.ap-spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }

/* Confirmado */
.ap-confirmado { display: flex; align-items: center; gap: 14px; padding: 18px 20px; background: #f0fdf4; border-top: 1px solid #bbf7d0; }
.ap-confirmado .material-symbols-outlined { font-size: 32px; color: #16a34a; flex-shrink: 0; }
.ap-confirmado-titulo { font-size: 15px; font-weight: 800; color: #166534; }
.ap-confirmado-sub    { font-size: 13px; color: #16a34a; margin-top: 2px; }

/* Botão voltar */
.ap-btn-catalogo { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 16px 20px; padding: 13px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; color: #374151; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; }
.ap-btn-catalogo:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
.ap-btn-catalogo .material-symbols-outlined { font-size: 18px; }
</style>
