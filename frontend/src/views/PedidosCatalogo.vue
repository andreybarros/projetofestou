<template>
  <div class="pc-wrap">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="pc-header">
      <button class="pc-back" @click="$router.push('/catalogos')">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="pc-header-info">
        <div class="pc-breadcrumb">
          <span @click="$router.push('/catalogos')" class="pc-bread-link">Catálogos</span>
          <span class="material-symbols-outlined pc-bread-sep">chevron_right</span>
          <span class="pc-bread-cur">{{ catalogo?.nome || '…' }}</span>
        </div>
        <h2 class="pc-title">Pedidos do Catálogo</h2>
      </div>
      <div class="pc-header-actions">
        <div class="pc-status-pill" :class="catalogo?.ativo ? 'pill--on' : 'pill--off'">
          <span class="pill-dot"></span>
          {{ catalogo?.ativo ? 'Ativo' : 'Inativo' }}
        </div>
        <button class="btn-sec" @click="$router.push(`/catalogos/${pk}/editar`)">
          <span class="material-symbols-outlined">settings</span>
          Gerenciar Catálogo
        </button>
      </div>
    </div>

    <!-- ── Métricas ──────────────────────────────────────────── -->
    <div class="pc-metricas">
      <div class="pm-card">
        <div class="pm-num">{{ pedidos.length }}</div>
        <div class="pm-label">Total de Pedidos</div>
      </div>
      <div class="pm-card">
        <div class="pm-num pm-num--amber">{{ pedidos.filter(p => p.status === 'aguardando').length }}</div>
        <div class="pm-label">Aguardando</div>
      </div>
      <div class="pm-card">
        <div class="pm-num pm-num--blue">{{ pedidos.filter(p => p.status === 'orcamento_enviado').length }}</div>
        <div class="pm-label">Orç. Enviado</div>
      </div>
      <div class="pm-card">
        <div class="pm-num pm-num--green">{{ pedidos.filter(p => p.status === 'aprovado').length }}</div>
        <div class="pm-label">Aprovados</div>
      </div>
    </div>

    <!-- ── Abas + busca ──────────────────────────────────────── -->
    <div class="pc-controls">
      <div class="pc-tabs">
        <button
          v-for="tab in abas"
          :key="tab.key"
          :class="['pc-tab', abaAtiva === tab.key && 'pc-tab--active']"
          @click="abaAtiva = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count" class="pc-tab-count">{{ tab.count }}</span>
        </button>
      </div>
      <div class="pc-busca-wrap">
        <span class="material-symbols-outlined pc-busca-ico">search</span>
        <input v-model="busca" type="text" class="pc-busca" placeholder="Buscar por cliente…" />
      </div>
    </div>

    <!-- ── Conteúdo ───────────────────────────────────────────── -->
    <div v-if="carregando" class="state-center"><span class="spin"></span></div>

    <div v-else-if="!pedidosFiltrados.length" class="state-center muted">
      <span class="material-symbols-outlined" style="font-size:44px;opacity:.2">inbox</span>
      Nenhum pedido encontrado.
    </div>

    <div v-else class="pc-table-wrap">
      <table class="pc-table">
        <thead>
          <tr>
            <th>Nº Pedido</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Evento</th>
            <th>Entrega</th>
            <th>Itens</th>
            <th>Valor</th>
            <th>Status</th>
            <th style="width:80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in pedidosFiltrados"
            :key="p.pk"
            class="pc-row"
            @click="abrirPedido(p)"
          >
            <td><span class="td-num">#{{ String(p.pk).padStart(4,'0') }}</span></td>
            <td class="td-data">{{ fmtData(p.criado_em) }}</td>
            <td>
              <div class="td-cliente">
                <div class="td-avatar">{{ p.nome_cliente?.charAt(0)?.toUpperCase() }}</div>
                <div>
                  <div class="td-nome">{{ p.nome_cliente }}</div>
                  <div v-if="p.telefone" class="td-sub">{{ p.telefone }}</div>
                </div>
              </div>
            </td>
            <td>
              <div v-if="p.data_evento" class="td-nome">{{ fmtDataLocal(p.data_evento) }}</div>
              <div v-if="p.hora_evento" class="td-sub">{{ p.hora_evento }}</div>
              <div v-else class="td-sub">—</div>
            </td>
            <td>
              <div class="td-entrega">
                <span class="material-symbols-outlined">{{ p.tipo_entrega === 'entrega' ? 'local_shipping' : 'store' }}</span>
                {{ p.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada' }}
              </div>
            </td>
            <td>
              <div class="td-chips">
                <span v-for="it in p.itens.slice(0,2)" :key="it.nome" class="item-chip">
                  {{ it.quantidade }}× {{ it.nome }}
                </span>
                <span v-if="p.itens.length > 2" class="item-chip item-chip--more">+{{ p.itens.length - 2 }}</span>
              </div>
            </td>
            <td>
              <strong v-if="p.valor_orcamento" class="td-valor">{{ fmtMoeda(p.valor_orcamento) }}</strong>
              <span v-else class="td-sub">—</span>
            </td>
            <td><span :class="['ps-badge', `ps-${p.status}`]">{{ labelStatus(p.status) }}</span></td>
            <td>
              <div class="td-acoes">
                <span class="td-arrow material-symbols-outlined">chevron_right</span>
                <button class="td-del-btn" @click.stop="excluirPedido(p)" title="Excluir pedido">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pc-table-footer">
        Mostrando {{ pedidosFiltrados.length }} de {{ pedidos.length }} pedido(s)
      </div>
    </div>

    <!-- ── Modal do pedido ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="pedidoSelecionado" class="modal-overlay" @click.self="fecharPedido">
          <div class="modal-box">

            <!-- Cabeçalho com faixa verde -->
            <div class="modal-hero">
              <div class="modal-hero-left">
                <div class="modal-order-num">
                  <span class="material-symbols-outlined">receipt_long</span>
                  Pedido #{{ String(pedidoSelecionado.pk).padStart(4,'0') }}
                </div>
                <div class="modal-hero-avatar">{{ pedidoSelecionado.nome_cliente?.charAt(0)?.toUpperCase() }}</div>
                <div>
                  <div class="modal-hero-name">{{ pedidoSelecionado.nome_cliente }}</div>
                  <div v-if="pedidoSelecionado.email" class="modal-hero-sub">{{ pedidoSelecionado.email }}</div>
                  <div v-if="pedidoSelecionado.telefone" class="modal-hero-sub">{{ pedidoSelecionado.telefone }}</div>
                </div>
              </div>
              <div class="modal-hero-right">
                <span :class="['mh-badge', `mh-${pedidoSelecionado.status}`]">{{ labelStatus(pedidoSelecionado.status) }}</span>
                <button class="mh-del-btn" @click="excluirPedido(pedidoSelecionado)" title="Excluir pedido">
                  <span class="material-symbols-outlined">delete</span>
                </button>
                <button class="modal-close" @click="fecharPedido">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <!-- Corpo em duas colunas -->
            <div class="modal-cols">

              <!-- Coluna esquerda: info do pedido -->
              <div class="modal-col modal-col--info">

                <!-- Evento -->
                <div class="mc-block">
                  <div class="mc-block-title">
                    <span class="material-symbols-outlined">event</span>
                    Dados do Evento
                  </div>
                  <div class="mc-fields">
                    <div v-if="pedidoSelecionado.data_evento" class="mc-field">
                      <div class="mc-label">Data</div>
                      <div class="mc-val">{{ fmtDataLocal(pedidoSelecionado.data_evento) }}</div>
                    </div>
                    <div v-if="pedidoSelecionado.hora_evento" class="mc-field">
                      <div class="mc-label">Horário</div>
                      <div class="mc-val">{{ pedidoSelecionado.hora_evento }}</div>
                    </div>
                    <div class="mc-field">
                      <div class="mc-label">Entrega</div>
                      <div class="mc-val mc-entrega">
                        <span class="material-symbols-outlined">{{ pedidoSelecionado.tipo_entrega === 'entrega' ? 'local_shipping' : 'store' }}</span>
                        {{ pedidoSelecionado.tipo_entrega === 'entrega' ? 'Entrega no endereço' : 'Retirada na loja' }}
                      </div>
                    </div>
                    <div v-if="pedidoSelecionado.endereco_evento" class="mc-field mc-field--full">
                      <div class="mc-label">Endereço</div>
                      <div class="mc-val">{{ pedidoSelecionado.endereco_evento }}</div>
                    </div>
                    <div class="mc-field">
                      <div class="mc-label">Pedido em</div>
                      <div class="mc-val">{{ fmtData(pedidoSelecionado.criado_em) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Itens -->
                <div class="mc-block">
                  <div class="mc-block-title">
                    <span class="material-symbols-outlined">inventory_2</span>
                    Itens Solicitados
                    <span class="mc-count">{{ pedidoSelecionado.itens.length }}</span>
                  </div>
                  <div class="mc-itens">
                    <div v-for="(it, i) in pedidoSelecionado.itens" :key="i" class="mc-item">
                      <div class="mc-item-qty">{{ it.quantidade }}</div>
                      <div class="mc-item-nome">{{ it.nome }}</div>
                    </div>
                  </div>
                </div>

                <!-- Observações -->
                <div v-if="pedidoSelecionado.observacao" class="mc-block">
                  <div class="mc-block-title">
                    <span class="material-symbols-outlined">notes</span>
                    Observações
                  </div>
                  <div class="mc-obs">{{ pedidoSelecionado.observacao }}</div>
                </div>

              </div>

              <!-- Coluna direita: link + orçamento -->
              <div class="modal-col modal-col--orc">

                <!-- Alerta: reenviar link após edição -->
                <Transition name="alerta">
                  <div v-if="linkPendenteEnvio" class="mc-alerta">
                    <span class="material-symbols-outlined mc-alerta-ico">campaign</span>
                    <div>
                      <div class="mc-alerta-title">Orçamento atualizado!</div>
                      <div class="mc-alerta-sub">Copie o link abaixo e reenvie ao cliente para que ele aprove o novo valor.</div>
                    </div>
                  </div>
                </Transition>

                <!-- Link do orçamento -->
                <div
                  v-if="pedidoSelecionado.pedido_token"
                  :class="['mc-link-card', linkPendenteEnvio && 'mc-link-card--destaque']"
                >
                  <div class="mc-link-label">
                    <span class="material-symbols-outlined">link</span>
                    Link para o cliente
                  </div>
                  <div class="mc-link-sub">Envie este link ao cliente para que ele veja e aprove o orçamento.</div>
                  <div class="mc-link-row">
                    <input :value="linkOrcamento(pedidoSelecionado.pedido_token)" readonly class="mc-link-input" />
                  </div>
                  <button
                    :class="['mc-link-copy-btn', linkPendenteEnvio && 'mc-link-copy-btn--pulse']"
                    @click="copiarLink(pedidoSelecionado.pedido_token)"
                  >
                    <span class="material-symbols-outlined">content_copy</span>
                    {{ linkPendenteEnvio ? 'Copiar e Reenviar ao Cliente' : 'Copiar Link' }}
                  </button>
                </div>

                <!-- Orçamento -->
                <div class="mc-orc-card">
                  <div class="mc-orc-header">
                    <div class="mc-orc-title">
                      <span class="material-symbols-outlined">request_quote</span>
                      Orçamento
                    </div>
                    <button
                      v-if="pedidoSelecionado.valor_orcamento && !editandoOrc"
                      class="mc-orc-edit"
                      @click="editandoOrc = true"
                    >
                      <span class="material-symbols-outlined">edit</span>
                      Editar
                    </button>
                  </div>

                  <!-- Valor exibido -->
                  <div v-if="pedidoSelecionado.valor_orcamento && !editandoOrc" class="mc-orc-valor-display">
                    <div class="mc-orc-num">{{ fmtMoeda(pedidoSelecionado.valor_orcamento) }}</div>
                    <div v-if="pedidoSelecionado.obs_orcamento" class="mc-orc-desc">{{ pedidoSelecionado.obs_orcamento }}</div>
                  </div>

                  <!-- Formulário -->
                  <div v-if="!pedidoSelecionado.valor_orcamento || editandoOrc" class="mc-orc-form">
                    <div v-if="!pedidoSelecionado.valor_orcamento" class="mc-orc-empty">
                      <span class="material-symbols-outlined" style="font-size:28px;opacity:.3">request_quote</span>
                      <span>Nenhum orçamento enviado ainda</span>
                    </div>
                    <div class="mc-field-group">
                      <label>Valor total (R$) *</label>
                      <input v-model="orcForm.valor" type="number" step="0.01" class="m-input" placeholder="0,00" />
                    </div>
                    <div class="mc-field-group">
                      <label>Observações</label>
                      <textarea v-model="orcForm.obs" class="m-input m-textarea" rows="3" placeholder="Condições, prazo, instruções…"></textarea>
                    </div>
                    <div class="mc-orc-btns">
                      <button v-if="editandoOrc" class="btn-cancel" @click="editandoOrc = false">Cancelar</button>
                      <button class="btn-orc-send" :disabled="orcSalvando" @click="enviarOrcamento">
                        <span v-if="orcSalvando" class="spin-sm"></span>
                        <span v-else class="material-symbols-outlined">send</span>
                        {{ pedidoSelecionado.valor_orcamento ? 'Salvar' : 'Enviar Orçamento' }}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </Transition>
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';

const route  = useRoute();
const router = useRouter();
const pk     = route.params.pk;

const catalogo        = ref(null);
const pedidos         = ref([]);
const carregando      = ref(true);
const abaAtiva        = ref('todos');
const busca           = ref('');
const pedidoSelecionado  = ref(null);
const editandoOrc        = ref(false);
const orcForm            = ref({ valor: '', obs: '' });
const orcSalvando        = ref(false);
const linkPendenteEnvio  = ref(false);
const toastMsg        = ref('');
const toastTipo       = ref('ok');
let   toastTimer      = null;

const abas = computed(() => [
  { key: 'todos',             label: 'Todos',             count: pedidos.value.length },
  { key: 'aguardando',        label: 'Aguardando',        count: pedidos.value.filter(p => p.status === 'aguardando').length },
  { key: 'orcamento_enviado', label: 'Orç. enviado',      count: pedidos.value.filter(p => p.status === 'orcamento_enviado').length },
  { key: 'aprovado',          label: 'Aprovados',         count: pedidos.value.filter(p => p.status === 'aprovado').length },
  { key: 'cancelado',         label: 'Cancelados',        count: pedidos.value.filter(p => p.status === 'cancelado').length },
]);

const pedidosFiltrados = computed(() => {
  let lista = abaAtiva.value === 'todos'
    ? pedidos.value
    : pedidos.value.filter(p => p.status === abaAtiva.value);
  if (busca.value.trim()) {
    const q = busca.value.toLowerCase();
    lista = lista.filter(p => p.nome_cliente?.toLowerCase().includes(q) || p.telefone?.includes(q));
  }
  return lista;
});

onMounted(async () => {
  carregando.value = true;
  try {
    const [resCat, resPed] = await Promise.all([
      api.get(`/api/catalogos/${pk}`),
      api.get(`/api/catalogos/${pk}/pedidos`),
    ]);
    catalogo.value = resCat.data.data;
    pedidos.value  = resPed.data.data || [];
  } catch (e) {
    showToast('Erro ao carregar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
});

function abrirPedido(p) {
  pedidoSelecionado.value = p;
  editandoOrc.value      = false;
  linkPendenteEnvio.value = false;
  orcForm.value = { valor: p.valor_orcamento || '', obs: p.obs_orcamento || '' };
}

function fecharPedido() {
  pedidoSelecionado.value = null;
  editandoOrc.value       = false;
  linkPendenteEnvio.value = false;
}

async function excluirPedido(p) {
  if (!confirm(`Excluir pedido de "${p.nome_cliente}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await api.delete(`/api/catalogos/pedidos/${p.pk}`);
    pedidos.value = pedidos.value.filter(x => x.pk !== p.pk);
    if (pedidoSelecionado.value?.pk === p.pk) fecharPedido();
    showToast('Pedido excluído.');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao excluir.', 'err');
  }
}

async function enviarOrcamento() {
  if (!orcForm.value.valor) { showToast('Informe o valor do orçamento.', 'err'); return; }
  const foiEdicao = !!pedidoSelecionado.value.valor_orcamento;
  orcSalvando.value = true;
  try {
    await api.patch(`/api/catalogos/pedidos/${pedidoSelecionado.value.pk}/orcamento`, {
      valor_orcamento: orcForm.value.valor,
      obs_orcamento:   orcForm.value.obs,
      status:          'orcamento_enviado',
    });
    const idx = pedidos.value.findIndex(p => p.pk === pedidoSelecionado.value.pk);
    if (idx !== -1) {
      pedidos.value[idx].valor_orcamento = parseFloat(orcForm.value.valor);
      pedidos.value[idx].obs_orcamento   = orcForm.value.obs;
      pedidos.value[idx].status          = 'orcamento_enviado';
      pedidoSelecionado.value = { ...pedidos.value[idx] };
    }
    editandoOrc.value       = false;
    linkPendenteEnvio.value = true;
    showToast(foiEdicao ? 'Orçamento atualizado! Reenvie o link ao cliente.' : 'Orçamento registrado!');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao salvar.', 'err');
  } finally {
    orcSalvando.value = false;
  }
}

function linkOrcamento(token) { return `${window.location.origin}/orcamento/${token}`; }
function copiarLink(token) {
  navigator.clipboard.writeText(linkOrcamento(token));
  linkPendenteEnvio.value = false;
  showToast('Link copiado! Envie ao cliente.');
}

function labelStatus(s) {
  const m = { aguardando: 'Aguardando', orcamento_enviado: 'Orç. enviado', aprovado: 'Aprovado', cancelado: 'Cancelado' };
  return m[s] || s;
}
function fmtData(dt)      { return dt ? new Date(dt).toLocaleDateString('pt-BR') : '—'; }
function fmtDataLocal(dt) { return dt ? dt.split('-').reverse().join('/') : '—'; }
function fmtMoeda(v)      { return Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3000);
}
</script>

<style scoped>
.pc-wrap {
  --g: #6366f1;
  --g-dim: rgba(99,102,241,.12);
  --g-soft: rgba(99,102,241,.06);
}
.pc-wrap { display: flex; flex-direction: column; gap: 20px; padding-bottom: 60px; }

/* ── Header ── */
.pc-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.pc-back   { width: 40px; height: 40px; background: var(--bg2); border: 1px solid var(--border); border-radius: 50%; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
.pc-back:hover { background: var(--g-dim); color: var(--g); border-color: rgba(0,200,83,.3); }
.pc-back .material-symbols-outlined { font-size: 20px; }
.pc-header-info { flex: 1; }
.pc-breadcrumb  { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text2); margin-bottom: 3px; }
.pc-bread-link  { cursor: pointer; transition: color .12s; }
.pc-bread-link:hover { color: var(--g); }
.pc-bread-sep   { font-size: 16px; opacity: .5; }
.pc-bread-cur   { color: var(--text); font-weight: 600; }
.pc-title       { font-size: 20px; font-weight: 800; color: var(--text); margin: 0; letter-spacing: -.2px; }
.pc-header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.pc-status-pill { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 20px; }
.pill-dot       { width: 7px; height: 7px; border-radius: 50%; }
.pill--on  { background: var(--g-dim); color: var(--g); }
.pill--on .pill-dot  { background: var(--g); }
.pill--off { background: rgba(248,113,113,.12); color: #f87171; }
.pill--off .pill-dot { background: #f87171; }
.btn-sec { display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; font-family: inherit; }
.btn-sec:hover { border-color: var(--g); color: var(--g); }
.btn-sec .material-symbols-outlined { font-size: 16px; }

/* ── Métricas ── */
.pc-metricas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.pm-card     { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
.pm-num      { font-size: 28px; font-weight: 900; color: var(--text); letter-spacing: -.5px; line-height: 1; }
.pm-num--amber { color: #f59e0b; }
.pm-num--blue  { color: #609efc; }
.pm-num--green { color: var(--g); }
.pm-label    { font-size: 11px; color: var(--text2); font-weight: 500; }

/* ── Controls ── */
.pc-controls  { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.pc-tabs      { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
.pc-tab       { padding: 7px 14px; border-radius: 8px; border: 1px solid transparent; background: none; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; transition: all .15s; }
.pc-tab:hover { background: var(--bg2); color: var(--text); }
.pc-tab--active { background: var(--g-dim); border-color: rgba(0,200,83,.2); color: var(--g); }
.pc-tab-count { background: var(--bg3); border-radius: 10px; font-size: 10px; padding: 1px 6px; }
.pc-tab--active .pc-tab-count { background: rgba(0,200,83,.15); color: var(--g); }
.pc-busca-wrap { position: relative; display: flex; align-items: center; }
.pc-busca-ico  { position: absolute; left: 10px; font-size: 18px; color: var(--text2); pointer-events: none; }
.pc-busca { padding: 8px 12px 8px 36px; background: var(--bg2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; width: 220px; transition: border-color .15s; }
.pc-busca:focus { border-color: var(--g); }
.pc-busca::placeholder { color: var(--text2); }

/* ── Table ── */
.pc-table-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.pc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pc-table th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); background: var(--bg3); border-bottom: 1px solid var(--border); white-space: nowrap; }
.pc-table td { padding: 13px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.pc-table tr:last-child td { border-bottom: none; }
.pc-row { cursor: pointer; transition: background .12s; }
.pc-row:hover { background: var(--bg3); }
.pc-row:hover .td-arrow { opacity: 1; transform: translateX(2px); }

.td-num    { font-size: 12px; font-weight: 800; color: var(--g); font-family: monospace; background: var(--g-dim); padding: 3px 8px; border-radius: 6px; }
.td-data   { font-size: 12px; color: var(--text2); white-space: nowrap; }
.td-cliente { display: flex; align-items: center; gap: 10px; }
.td-avatar  { width: 34px; height: 34px; border-radius: 50%; background: var(--g-dim); color: var(--g); font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.td-nome   { font-size: 13px; font-weight: 600; color: var(--text); }
.td-sub    { font-size: 11px; color: var(--text2); margin-top: 1px; }
.td-entrega { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text2); font-weight: 500; }
.td-entrega .material-symbols-outlined { font-size: 15px; }
.td-chips  { display: flex; gap: 4px; flex-wrap: wrap; max-width: 200px; }
.item-chip { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 2px 7px; font-size: 11px; font-weight: 600; color: var(--text); white-space: nowrap; }
.item-chip--more { color: var(--text2); }
.td-valor  { color: var(--g); font-size: 13px; font-weight: 700; white-space: nowrap; }
.ps-badge  { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; display: inline-block; }
.ps-aguardando        { background: rgba(245,158,11,.12); color: #f59e0b; }
.ps-orcamento_enviado { background: rgba(96,158,252,.12); color: #609efc; }
.ps-aprovado          { background: var(--g-dim); color: var(--g); }
.ps-cancelado         { background: rgba(248,113,113,.12); color: #f87171; }
.td-acoes   { display: flex; align-items: center; gap: 6px; }
.td-arrow   { font-size: 18px; color: var(--text2); opacity: .4; transition: all .15s; display: flex; }
.td-del-btn { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; padding: 4px; border-radius: 6px; opacity: 0; transition: all .15s; }
.pc-row:hover .td-del-btn { opacity: 1; }
.td-del-btn:hover { color: #ef4444; background: rgba(239,68,68,.1); }
.td-del-btn .material-symbols-outlined { font-size: 16px; }

.mh-del-btn { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.25); border-radius: 8px; color: #fca5a5; cursor: pointer; display: flex; padding: 5px; transition: all .15s; }
.mh-del-btn:hover { background: rgba(239,68,68,.3); color: #fff; }
.mh-del-btn .material-symbols-outlined { font-size: 17px; }

.pc-table-footer { padding: 12px 16px; font-size: 12px; color: var(--text2); background: var(--bg3); border-top: 1px solid var(--border); }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px; }
.modal-box     { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; width: 100%; max-width: 820px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 32px 100px rgba(0,0,0,.6); }
.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box { transition: transform .28s cubic-bezier(.32,.72,0,1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-box, .modal-leave-to .modal-box { transform: scale(.95) translateY(12px); }

/* Hero header */
.modal-hero        { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 16px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-bottom: 1px solid rgba(99,102,241,.2); flex-shrink: 0; gap: 12px; }
.modal-hero-left   { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.modal-order-num   { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #a5b4fc; white-space: nowrap; }
.modal-order-num .material-symbols-outlined { font-size: 14px; }
.modal-hero-avatar { width: 44px; height: 44px; border-radius: 50%; background: rgba(99,102,241,.25); border: 2px solid rgba(99,102,241,.4); color: #a5b4fc; font-size: 18px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-hero-name   { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 1px; }
.modal-hero-sub    { font-size: 12px; color: rgba(255,255,255,.55); }
.modal-hero-right  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.mh-badge  { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
.mh-aguardando        { background: rgba(245,158,11,.2); color: #fbbf24; border: 1px solid rgba(245,158,11,.3); }
.mh-orcamento_enviado { background: rgba(96,158,252,.2); color: #93c5fd; border: 1px solid rgba(96,158,252,.3); }
.mh-aprovado          { background: rgba(99,102,241,.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,.3); }
.mh-cancelado         { background: rgba(248,113,113,.2); color: #fca5a5; border: 1px solid rgba(248,113,113,.3); }
.modal-close { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; color: rgba(255,255,255,.6); cursor: pointer; display: flex; padding: 4px; transition: all .15s; }
.modal-close:hover { background: rgba(255,255,255,.15); color: #fff; }
.modal-close .material-symbols-outlined { font-size: 20px; }

/* Two-column body */
.modal-cols { display: grid; grid-template-columns: 1fr 300px; overflow: hidden; flex: 1; }
.modal-col  { overflow-y: auto; }
.modal-col--info { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; border-right: 1px solid var(--border); }
.modal-col--orc  { padding: 20px 18px; display: flex; flex-direction: column; gap: 14px; background: var(--bg3); }

/* Info blocks */
.mc-block { display: flex; flex-direction: column; gap: 10px; }
.mc-block-title { display: flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text2); }
.mc-block-title .material-symbols-outlined { font-size: 15px; color: var(--g); }
.mc-count { background: var(--g-dim); color: var(--g); font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 10px; }
.mc-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.mc-field  { display: flex; flex-direction: column; gap: 2px; }
.mc-field--full { grid-column: 1 / -1; }
.mc-label  { font-size: 10px; color: var(--text2); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.mc-val    { font-size: 13px; font-weight: 600; color: var(--text); }
.mc-entrega { display: flex; align-items: center; gap: 5px; }
.mc-entrega .material-symbols-outlined { font-size: 15px; color: var(--g); }

.mc-itens { display: flex; flex-direction: column; gap: 6px; }
.mc-item  { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: 9px; transition: border-color .12s; }
.mc-item:hover { border-color: rgba(0,200,83,.2); }
.mc-item-qty  { width: 28px; height: 28px; border-radius: 8px; background: var(--g-dim); color: var(--g); font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mc-item-nome { font-size: 13px; font-weight: 600; color: var(--text); }

.mc-obs { font-size: 13px; color: var(--text2); background: var(--bg3); border-radius: 8px; padding: 10px 12px; font-style: italic; border: 1px solid var(--border); }

/* Alerta reenvio */
.mc-alerta { display: flex; align-items: flex-start; gap: 10px; background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.3); border-radius: 10px; padding: 12px 14px; }
.mc-alerta-ico { font-size: 20px; color: #f59e0b; flex-shrink: 0; margin-top: 1px; }
.mc-alerta-title { font-size: 12px; font-weight: 800; color: #fbbf24; margin-bottom: 2px; }
.mc-alerta-sub   { font-size: 11px; color: rgba(251,191,36,.8); line-height: 1.4; }
.alerta-enter-active, .alerta-leave-active { transition: all .3s; }
.alerta-enter-from, .alerta-leave-to { opacity: 0; transform: translateY(-6px); }

/* Link card */
.mc-link-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; transition: border-color .3s, box-shadow .3s; }
.mc-link-card--destaque { border-color: rgba(0,200,83,.4); box-shadow: 0 0 0 3px rgba(0,200,83,.08); }
.mc-link-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--g); }
.mc-link-label .material-symbols-outlined { font-size: 14px; }
.mc-link-sub   { font-size: 11px; color: var(--text2); line-height: 1.4; margin-top: -4px; }
.mc-link-row   { display: flex; }
.mc-link-input { flex: 1; padding: 7px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); font-size: 10px; font-family: monospace; outline: none; width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-link-copy-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 9px; background: var(--g); border: none; border-radius: 9px; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: filter .15s; }
.mc-link-copy-btn:hover { filter: brightness(1.1); }
.mc-link-copy-btn .material-symbols-outlined { font-size: 15px; }
.mc-link-copy-btn--pulse { animation: pulse-green 1.6s ease-in-out infinite; }
@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,200,83,.5); }
  50%       { box-shadow: 0 0 0 8px rgba(0,200,83,0); }
}

/* Orçamento card */
.mc-orc-card { flex: 1; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.mc-orc-header { display: flex; align-items: center; justify-content: space-between; }
.mc-orc-title  { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); }
.mc-orc-title .material-symbols-outlined { font-size: 14px; color: var(--g); }
.mc-orc-edit   { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .12s; }
.mc-orc-edit:hover { color: var(--g); border-color: rgba(0,200,83,.3); }
.mc-orc-edit .material-symbols-outlined { font-size: 13px; }

.mc-orc-valor-display { display: flex; flex-direction: column; gap: 6px; background: var(--g-dim); border: 1px solid rgba(0,200,83,.2); border-radius: 10px; padding: 14px; }
.mc-orc-num  { font-size: 28px; font-weight: 900; color: var(--g); letter-spacing: -.5px; }
.mc-orc-desc { font-size: 12px; color: var(--text2); font-style: italic; }

.mc-orc-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px; text-align: center; font-size: 12px; color: var(--text2); }
.mc-orc-form  { display: flex; flex-direction: column; gap: 10px; }
.mc-field-group { display: flex; flex-direction: column; gap: 4px; }
.mc-field-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text2); }
.mc-orc-btns { display: flex; gap: 8px; justify-content: flex-end; }
.m-input   { padding: 9px 11px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; transition: border-color .15s; }
.m-input:focus { border-color: var(--g); }
.m-textarea { resize: vertical; }
.btn-cancel  { padding: 8px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-orc-send { display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1; padding: 10px; background: var(--g); border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: filter .15s; }
.btn-orc-send:hover:not(:disabled) { filter: brightness(1.1); }
.btn-orc-send:disabled { opacity: .5; cursor: not-allowed; }
.btn-orc-send .material-symbols-outlined { font-size: 16px; }

/* ── Shared ── */
.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 20px; color: var(--text2); font-size: 13px; }
.muted { opacity: .6; }
.spin    { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--g); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.pc-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 6px 24px rgba(0,0,0,.35); white-space: nowrap; }
.pc-toast .material-symbols-outlined { font-size: 18px; }
.pc-toast.ok  { background: #064e2a; color: #86efac; border: 1px solid rgba(0,200,83,.2); }
.pc-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

@media (max-width: 700px) {
  .pc-metricas { grid-template-columns: repeat(2,1fr); }
  .modal-cols  { grid-template-columns: 1fr; }
  .modal-col--orc { border-right: none; border-top: 1px solid var(--border); }
}

</style>

<!-- Bloco não-escopado: usa .pc-wrap como namespace para não vazar -->
<style>
[data-theme="light"] .pc-wrap { background: #fff; }

/* Cards de métrica */
[data-theme="light"] .pc-wrap .pc-back         { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .pc-wrap .btn-sec         { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .pc-wrap .pm-card         { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .pc-wrap .pc-busca        { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .pc-wrap .pc-tab-count    { background: rgba(0,0,0,.06); color: #374151; }
[data-theme="light"] .pc-wrap .pc-tab:hover    { background: rgba(0,0,0,.04); }

/* Tabela — tudo branco */
[data-theme="light"] .pc-wrap .pc-table-wrap   { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .pc-wrap .pc-table th     { background: #fff; border-bottom: 1px solid rgba(0,0,0,.08); color: #374151; }
[data-theme="light"] .pc-wrap .pc-table td     { border-bottom-color: rgba(0,0,0,.06); }
[data-theme="light"] .pc-wrap .pc-row:hover    { background: rgba(99,102,241,.04); }
[data-theme="light"] .pc-wrap .item-chip       { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
[data-theme="light"] .pc-wrap .pc-table-footer { background: #fff; border-top-color: rgba(0,0,0,.08); }
[data-theme="light"] .pc-wrap .td-num          { background: rgba(0,200,83,.1); }
[data-theme="light"] .pc-wrap .td-avatar       { background: rgba(0,200,83,.1); }

/* Modal — tudo branco */
[data-theme="light"] .modal-box               { background: #fff; box-shadow: 0 32px 100px rgba(0,0,0,.15); border-color: rgba(0,0,0,.1); }
[data-theme="light"] .modal-col--info         { background: #fff; border-right-color: rgba(0,0,0,.08); }
[data-theme="light"] .modal-col--orc          { background: #fff; }
[data-theme="light"] .mc-orc-card             { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .mc-link-card            { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .mc-link-input           { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
[data-theme="light"] .mc-orc-edit             { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
[data-theme="light"] .mc-item                 { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .mc-obs                  { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .m-input                 { background: #fff; border-color: rgba(0,0,0,.15); }
[data-theme="light"] .btn-cancel              { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
[data-theme="light"] .mc-alerta               { background: rgba(245,158,11,.08); }
</style>
