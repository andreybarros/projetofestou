<template>
  <div class="cat-wrap">

    <!-- ── Header ───────────────────────────────────────────── -->
    <div class="cat-header">
      <div class="cat-header-text">
        <div class="cat-title-row">
          <div class="cat-title-icon">
            <span class="material-symbols-outlined">link</span>
          </div>
          <h2 class="cat-title">Catálogos Públicos</h2>
        </div>
        <p class="cat-sub">Gerencie a visibilidade dos seus produtos e acesse os pedidos realizados por clientes externos em tempo real.</p>
      </div>
      <button class="btn-novo" @click="abrirNovo">
        <span class="material-symbols-outlined">add</span>
        Novo Catálogo
      </button>
    </div>

    <!-- ── Métricas ──────────────────────────────────────────── -->
    <div class="cat-metricas">
      <div class="metrica-card">
        <div class="metrica-icon mi--green"><span class="material-symbols-outlined">link</span></div>
        <div class="metrica-info">
          <div class="metrica-val">{{ lista.length }}</div>
          <div class="metrica-label">Total de Catálogos</div>
        </div>
        <div class="metrica-chip mi-chip--green">+{{ lista.filter(c => c.ativo).length }} ativos</div>
      </div>
      <div class="metrica-card">
        <div class="metrica-icon mi--blue"><span class="material-symbols-outlined">inventory_2</span></div>
        <div class="metrica-info">
          <div class="metrica-val">{{ totalProdutos }}</div>
          <div class="metrica-label">Produtos Cadastrados</div>
        </div>
        <div class="metrica-chip mi-chip--blue">nos catálogos</div>
      </div>
      <div class="metrica-card">
        <div class="metrica-icon mi--amber"><span class="material-symbols-outlined">shopping_cart</span></div>
        <div class="metrica-info">
          <div class="metrica-val">{{ totalPedidos }}</div>
          <div class="metrica-label">Pedidos Recebidos</div>
        </div>
        <div class="metrica-chip mi-chip--amber">total</div>
      </div>
      <div class="metrica-card">
        <div class="metrica-icon mi--purple"><span class="material-symbols-outlined">check_circle</span></div>
        <div class="metrica-info">
          <div class="metrica-val">{{ lista.filter(c => c.ativo).length }}</div>
          <div class="metrica-label">Catálogos Ativos</div>
        </div>
        <div class="metrica-chip mi-chip--purple">publicados</div>
      </div>
    </div>

    <!-- ── Loading ───────────────────────────────────────────── -->
    <div v-if="carregando" class="state-center"><span class="spin"></span></div>

    <!-- ── Grid ─────────────────────────────────────────────── -->
    <div v-else class="cat-grid">

      <!-- Card de catálogo -->
      <div v-for="(c, idx) in lista" :key="c.pk" class="cat-card">
        <div class="cat-card-cover" :style="{ background: coverGradients[idx % coverGradients.length] }">
          <span :class="['cover-badge', c.ativo ? 'cover-badge--on' : 'cover-badge--off']">
            {{ c.ativo ? 'ATIVO' : 'INATIVO' }}
          </span>
          <button class="cover-del" @click.stop="excluir(c)" title="Excluir catálogo">
            <span class="material-symbols-outlined">delete</span>
          </button>
          <div class="cover-icon-wrap">
            <span class="material-symbols-outlined cover-icon">link</span>
          </div>
        </div>

        <div class="cat-card-body">
          <div class="cat-card-nome">{{ c.nome }}</div>
          <div v-if="c.descricao" class="cat-card-desc">{{ c.descricao }}</div>

          <div class="cat-card-stats">
            <div class="cat-stat">
              <span class="material-symbols-outlined">shopping_bag</span>
              {{ c.qtd_itens }} produto(s)
            </div>
            <div class="cat-stat">
              <span class="material-symbols-outlined">shopping_cart</span>
              {{ c.qtd_pedidos }} pedido(s)
            </div>
          </div>

          <div class="cat-card-link">
            <input :value="linkPublico(c.token)" readonly class="cat-link-input" @click="copiarLink(c.token)" />
            <button class="cat-link-copy" @click="copiarLink(c.token)" title="Copiar link">
              <span class="material-symbols-outlined">content_copy</span>
            </button>
          </div>

          <div class="cat-card-actions">
            <button class="cat-btn cat-btn--outline" @click="$router.push(`/catalogos/${c.pk}/pedidos`)">
              <span class="material-symbols-outlined">inbox</span>
              Pedidos
              <span v-if="c.qtd_pedidos" class="badge-count">{{ c.qtd_pedidos }}</span>
            </button>
            <button class="cat-btn cat-btn--solid" @click="$router.push(`/catalogos/${c.pk}/editar`)">
              <span class="material-symbols-outlined">settings</span>
              Gerenciar
            </button>
          </div>
        </div>
      </div>

      <!-- Card criar novo -->
      <button class="cat-novo-card" @click="abrirNovo">
        <div class="novo-plus"><span class="material-symbols-outlined">add</span></div>
        <div class="novo-label">Criar novo catálogo</div>
        <div class="novo-hint">Gere um link público de produtos</div>
      </button>
    </div>

    <!-- ── Modal: novo catálogo ──────────────────────────────── -->
    <Teleport to="body">
      <div v-if="modalNovo" class="modal-overlay" @click.self="modalNovo = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Novo Catálogo</h3>
            <button class="modal-close" @click="modalNovo = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="mf-group">
              <label>Nome *</label>
              <input v-model="novoForm.nome" type="text" class="m-input" placeholder="Ex: Catálogo Festa Infantil" autofocus />
            </div>
            <div class="mf-group">
              <label>Descrição <span class="opt">(opcional)</span></label>
              <textarea v-model="novoForm.descricao" class="m-input m-textarea" rows="2" placeholder="Descrição exibida ao cliente…"></textarea>
            </div>
            <div v-if="novoErro" class="form-erro">{{ novoErro }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="modalNovo = false">Cancelar</button>
            <button class="btn-salvar" :disabled="novoSalvando" @click="criarCatalogo">
              <span v-if="novoSalvando" class="spin-sm"></span>
              <span v-else class="material-symbols-outlined" style="font-size:16px">add</span>
              Criar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Sheet: pedidos ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="modalPedidos" class="sheet-overlay" @click.self="modalPedidos = null">
          <div class="sheet-box">

            <div class="sheet-header">
              <div class="sheet-header-info">
                <div class="sheet-tag">
                  <span class="material-symbols-outlined">inbox</span>
                  Pedidos recebidos
                </div>
                <h3 class="sheet-title">{{ modalPedidos.nome }}</h3>
              </div>
              <button class="modal-close" @click="modalPedidos = null">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Abas -->
            <div class="sheet-tabs">
              <button
                v-for="tab in abas"
                :key="tab.key"
                :class="['sheet-tab', abaAtiva === tab.key && 'sheet-tab--active']"
                @click="abaAtiva = tab.key; pedidoExpandido = null"
              >
                {{ tab.label }}
                <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
              </button>
            </div>

            <div class="sheet-body">
              <div v-if="pedidosCarregando" class="state-center"><span class="spin"></span></div>
              <div v-else-if="!pedidosFiltrados.length" class="state-center muted">
                <span class="material-symbols-outlined" style="font-size:40px;opacity:.25">inbox</span>
                Nenhum pedido nesta categoria.
              </div>

              <div v-else class="pedidos-table-wrap">
                <table class="pedidos-table">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Evento</th>
                      <th>Itens</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="p in pedidosFiltrados" :key="p.pk">
                      <tr
                        :class="['pr', pedidoExpandido === p.pk && 'pr--open']"
                        @click="toggleExpand(p.pk)"
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
                          <div v-if="p.data_evento" class="td-nome">{{ fmtData(p.data_evento) }}</div>
                          <div class="td-sub td-entrega">
                            <span class="material-symbols-outlined" style="font-size:12px">{{ p.tipo_entrega === 'entrega' ? 'local_shipping' : 'store' }}</span>
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
                          <span class="expand-chevron material-symbols-outlined">
                            {{ pedidoExpandido === p.pk ? 'expand_less' : 'expand_more' }}
                          </span>
                        </td>
                      </tr>

                      <!-- Linha expandida -->
                      <tr v-if="pedidoExpandido === p.pk" class="pr-detail">
                        <td colspan="8">
                          <div class="detail-panel">
                            <div class="detail-cols">
                              <div class="detail-col">
                                <div class="detail-label">Itens do Pedido</div>
                                <div class="detail-itens">
                                  <div v-for="it in p.itens" :key="it.nome" class="detail-item">
                                    <span class="detail-qty">{{ it.quantidade }}×</span>
                                    {{ it.nome }}
                                  </div>
                                </div>
                              </div>
                              <div class="detail-col">
                                <div class="detail-label">Entrega</div>
                                <div class="detail-val">{{ p.tipo_entrega === 'entrega' ? 'Entrega no endereço' : 'Retirada na loja' }}</div>
                                <div v-if="p.endereco_evento" class="detail-sub">{{ p.endereco_evento }}</div>
                              </div>
                              <div v-if="p.observacao" class="detail-col">
                                <div class="detail-label">Observações</div>
                                <div class="detail-sub">{{ p.observacao }}</div>
                              </div>
                              <div v-if="p.pedido_token" class="detail-col detail-col--full">
                                <div class="detail-label">Link do Orçamento (enviar ao cliente)</div>
                                <div class="detail-link-row">
                                  <input :value="linkOrcamento(p.pedido_token)" readonly class="detail-link-input" />
                                  <button class="detail-link-copy" @click.stop="copiarLinkOrcamento(p.pedido_token)">
                                    <span class="material-symbols-outlined">content_copy</span>
                                    Copiar
                                  </button>
                                </div>
                              </div>
                            </div>

                            <!-- Orçamento -->
                            <div class="detail-orc-zone">
                              <div v-if="orcandoPk === p.pk" class="orc-form">
                                <div class="orc-form-title">
                                  <span class="material-symbols-outlined">request_quote</span>
                                  {{ p.valor_orcamento ? 'Editar orçamento' : 'Registrar orçamento' }}
                                </div>
                                <div class="orc-form-fields">
                                  <input v-model="orcForm.valor" type="number" step="0.01" class="m-input" placeholder="Valor total R$" @click.stop />
                                  <textarea v-model="orcForm.obs" class="m-input m-textarea" rows="2" placeholder="Observações do orçamento…" @click.stop></textarea>
                                </div>
                                <div class="orc-form-btns">
                                  <button class="btn-cancel" @click.stop="orcandoPk = null">Cancelar</button>
                                  <button class="btn-salvar" :disabled="orcSalvando" @click.stop="enviarOrcamento(p)">
                                    <span v-if="orcSalvando" class="spin-sm"></span>
                                    Enviar Orçamento
                                  </button>
                                </div>
                              </div>
                              <div v-else class="orc-display">
                                <div v-if="p.valor_orcamento" class="orc-valor-box">
                                  <span class="material-symbols-outlined" style="color:#00c853">request_quote</span>
                                  <div>
                                    <div class="orc-valor">{{ fmtMoeda(p.valor_orcamento) }}</div>
                                    <div v-if="p.obs_orcamento" class="orc-obs">{{ p.obs_orcamento }}</div>
                                  </div>
                                </div>
                                <button class="btn-orc" @click.stop="abrirOrcamento(p)">
                                  <span class="material-symbols-outlined">request_quote</span>
                                  {{ p.valor_orcamento ? 'Editar Orçamento' : 'Registrar Orçamento' }}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>

                <div class="table-footer">
                  Mostrando {{ pedidosFiltrados.length }} de {{ pedidos.length }} pedidos
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="cat-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import api from '../services/api';

const router      = useRouter();
const sessaoStore = useSessaoStore();

const lista             = ref([]);
const carregando        = ref(true);
const modalNovo         = ref(false);
const novoForm          = ref({ nome: '', descricao: '' });
const novoErro          = ref('');
const novoSalvando      = ref(false);
const modalPedidos      = ref(null);
const pedidos           = ref([]);
const pedidosCarregando = ref(false);
const orcandoPk         = ref(null);
const orcForm           = ref({ valor: '', obs: '' });
const orcSalvando       = ref(false);
const toastMsg          = ref('');
const toastTipo         = ref('ok');
const abaAtiva          = ref('todos');
const pedidoExpandido   = ref(null);
let   toastTimer        = null;

const coverGradients = [
  'linear-gradient(135deg,#0e1f3d 0%,#609efc 100%)',
  'linear-gradient(135deg,#3b1364 0%,#9333ea 100%)',
  'linear-gradient(135deg,#7c1d1d 0%,#f97316 100%)',
  'linear-gradient(135deg,#064e3b 0%,#06b6d4 100%)',
  'linear-gradient(135deg,#1a2f1a 0%,#4ade80 100%)',
];

const totalProdutos  = computed(() => lista.value.reduce((s, c) => s + (c.qtd_itens  || 0), 0));
const totalPedidos   = computed(() => lista.value.reduce((s, c) => s + (c.qtd_pedidos || 0), 0));

const abas = computed(() => [
  { key: 'todos',             label: 'Todos',              count: pedidos.value.length },
  { key: 'aguardando',        label: 'Aguardando',         count: pedidos.value.filter(p => p.status === 'aguardando').length },
  { key: 'orcamento_enviado', label: 'Orçamento enviado',  count: pedidos.value.filter(p => p.status === 'orcamento_enviado').length },
  { key: 'aprovado',          label: 'Aprovados',          count: pedidos.value.filter(p => p.status === 'aprovado').length },
]);

const pedidosFiltrados = computed(() =>
  abaAtiva.value === 'todos' ? pedidos.value : pedidos.value.filter(p => p.status === abaAtiva.value)
);

function toggleExpand(pk) {
  if (pedidoExpandido.value === pk) { pedidoExpandido.value = null; orcandoPk.value = null; }
  else { pedidoExpandido.value = pk; orcandoPk.value = null; }
}

onMounted(() => carregar());

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get('/api/catalogos', { params: { filial_pk: sessaoStore.filial?.pk } });
    lista.value = data.data || [];
  } catch (e) {
    showToast('Erro ao carregar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function abrirNovo() {
  novoForm.value = { nome: '', descricao: '' };
  novoErro.value = '';
  modalNovo.value = true;
}

async function criarCatalogo() {
  if (!novoForm.value.nome?.trim()) { novoErro.value = 'Nome obrigatório.'; return; }
  novoSalvando.value = true;
  try {
    const { data } = await api.post('/api/catalogos', {
      filial_pk: sessaoStore.filial?.pk,
      nome:      novoForm.value.nome,
      descricao: novoForm.value.descricao,
    });
    modalNovo.value = false;
    showToast('Catálogo criado!');
    router.push(`/catalogos/${data.data.pk}/editar`);
  } catch (e) {
    novoErro.value = e.response?.data?.erro || e.message;
  } finally {
    novoSalvando.value = false;
  }
}

async function excluir(c) {
  if (!confirm(`Excluir catálogo "${c.nome}"?`)) return;
  try {
    await api.delete(`/api/catalogos/${c.pk}`);
    showToast('Excluído.');
    await carregar();
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao excluir.', 'err');
  }
}

async function verPedidos(c) {
  modalPedidos.value = c;
  pedidos.value = [];
  abaAtiva.value = 'todos';
  pedidoExpandido.value = null;
  pedidosCarregando.value = true;
  try {
    const { data } = await api.get(`/api/catalogos/${c.pk}/pedidos`);
    pedidos.value = data.data || [];
  } catch (e) {
    showToast('Erro ao carregar pedidos.', 'err');
  } finally {
    pedidosCarregando.value = false;
  }
}

function abrirOrcamento(p) {
  orcandoPk.value = p.pk;
  orcForm.value   = { valor: p.valor_orcamento || '', obs: p.obs_orcamento || '' };
}

async function enviarOrcamento(p) {
  orcSalvando.value = true;
  try {
    await api.patch(`/api/catalogos/pedidos/${p.pk}/orcamento`, {
      valor_orcamento: orcForm.value.valor,
      obs_orcamento:   orcForm.value.obs,
      status:          'orcamento_enviado',
    });
    orcandoPk.value = null;
    showToast('Orçamento registrado!');
    await verPedidos(modalPedidos.value);
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro.', 'err');
  } finally {
    orcSalvando.value = false;
  }
}

function linkPublico(token)    { return `${window.location.origin}/catalogo/${token}`; }
function linkOrcamento(t)      { return `${window.location.origin}/orcamento/${t}`; }
function copiarLink(token)     { navigator.clipboard.writeText(linkPublico(token)); showToast('Link copiado!'); }
function copiarLinkOrcamento(t){ navigator.clipboard.writeText(linkOrcamento(t)); showToast('Link do orçamento copiado!'); }

function labelStatus(s) {
  const m = { aguardando:'Aguardando', orcamento_enviado:'Orç. enviado', aprovado:'Aprovado', cancelado:'Cancelado' };
  return m[s] || s;
}
function fmtData(dt) { return dt ? new Date(dt).toLocaleDateString('pt-BR') : '—'; }
function fmtMoeda(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3000);
}
</script>

<style scoped>
/* ── Variables ── */
.cat-wrap {
  --g: #6366f1;
  --g-dim: rgba(99,102,241,.12);
  --g-soft: rgba(99,102,241,.06);
}

/* ── Layout ── */
.cat-wrap  { display: flex; flex-direction: column; gap: 22px; padding-bottom: 60px; }

/* ── Header ── */
.cat-header      { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; }
.cat-header-text { flex: 1; }
.cat-title-row   { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.cat-title-icon  { width: 38px; height: 38px; background: var(--g-dim); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--g); flex-shrink: 0; }
.cat-title-icon .material-symbols-outlined { font-size: 20px; }
.cat-title  { font-size: 22px; font-weight: 800; color: var(--text); margin: 0; letter-spacing: -.3px; }
.cat-sub    { font-size: 13px; color: var(--text2); margin: 0; max-width: 600px; line-height: 1.5; }
.btn-novo   { display: flex; align-items: center; gap: 7px; padding: 10px 20px; background: var(--g); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; transition: filter .15s; white-space: nowrap; font-family: inherit; }
.btn-novo:hover { filter: brightness(1.1); }
.btn-novo .material-symbols-outlined { font-size: 18px; }

/* ── Métricas ── */
.cat-metricas  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.metrica-card  { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; position: relative; overflow: hidden; }
.metrica-icon  { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.metrica-icon .material-symbols-outlined { font-size: 22px; }
.mi--green  { background: rgba(0,200,83,.12); color: #00c853; }
.mi--blue   { background: rgba(96,158,252,.12); color: #609efc; }
.mi--amber  { background: rgba(245,158,11,.12); color: #f59e0b; }
.mi--purple { background: rgba(168,85,247,.12); color: #a855f7; }
.metrica-info { flex: 1; }
.metrica-val  { font-size: 26px; font-weight: 800; color: var(--text); line-height: 1; }
.metrica-label{ font-size: 11px; color: var(--text2); margin-top: 3px; font-weight: 500; }
.metrica-chip { position: absolute; bottom: 10px; right: 12px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
.mi-chip--green  { background: rgba(0,200,83,.12); color: #00c853; }
.mi-chip--blue   { background: rgba(96,158,252,.12); color: #609efc; }
.mi-chip--amber  { background: rgba(245,158,11,.12); color: #f59e0b; }
.mi-chip--purple { background: rgba(168,85,247,.12); color: #a855f7; }

/* ── Grid ── */
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }

/* ── Catalog card ── */
.cat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: box-shadow .2s; }
.cat-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,.2); }

.cat-card-cover { height: 130px; position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cover-badge { position: absolute; top: 10px; left: 12px; font-size: 10px; font-weight: 800; letter-spacing: .06em; padding: 3px 10px; border-radius: 20px; }
.cover-badge--on  { background: rgba(0,200,83,.25); color: #00e676; border: 1px solid rgba(0,200,83,.3); }
.cover-badge--off { background: rgba(248,113,113,.2); color: #f87171; border: 1px solid rgba(248,113,113,.3); }
.cover-del { position: absolute; top: 8px; right: 10px; width: 30px; height: 30px; background: rgba(0,0,0,.35); border: none; border-radius: 8px; color: rgba(255,255,255,.7); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.cover-del:hover { background: rgba(239,68,68,.7); color: #fff; }
.cover-del .material-symbols-outlined { font-size: 16px; }
.cover-icon-wrap { width: 54px; height: 54px; background: rgba(255,255,255,.15); border-radius: 14px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.cover-icon { font-size: 28px; color: rgba(255,255,255,.9); }

.cat-card-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.cat-card-nome { font-size: 15px; font-weight: 700; color: var(--text); }
.cat-card-desc { font-size: 12px; color: var(--text2); line-height: 1.4; }

.cat-card-stats { display: flex; gap: 16px; }
.cat-stat { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text2); font-weight: 500; }
.cat-stat .material-symbols-outlined { font-size: 15px; color: var(--text2); }

.cat-card-link { display: flex; gap: 6px; }
.cat-link-input { flex: 1; padding: 7px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); font-size: 11px; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; outline: none; }
.cat-link-copy  { width: 32px; height: 32px; background: none; border: 1px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0; }
.cat-link-copy:hover { background: var(--g); color: #fff; border-color: var(--g); }
.cat-link-copy .material-symbols-outlined { font-size: 15px; }

.cat-card-actions { display: flex; gap: 7px; margin-top: auto; }
.cat-btn { display: flex; align-items: center; gap: 5px; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; font-family: inherit; flex: 1; justify-content: center; }
.cat-btn .material-symbols-outlined { font-size: 15px; }
.cat-btn--outline { background: var(--bg3); border: 1px solid var(--border); color: var(--text); }
.cat-btn--outline:hover { border-color: var(--g); color: var(--g); }
.cat-btn--solid   { background: var(--g); border: 1px solid var(--g); color: #fff; }
.cat-btn--solid:hover { filter: brightness(1.1); }
.badge-count { background: rgba(255,255,255,.2); color: #fff; border-radius: 10px; font-size: 10px; padding: 1px 6px; }
.cat-btn--outline .badge-count { background: var(--g); color: #fff; }

/* ── New card ── */
.cat-novo-card { background: var(--bg2); border: 2px dashed var(--border); border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 20px; cursor: pointer; transition: all .2s; color: var(--text2); font-family: inherit; min-height: 280px; }
.cat-novo-card:hover { border-color: var(--g); color: var(--g); background: var(--g-soft); }
.novo-plus { width: 54px; height: 54px; border-radius: 14px; background: var(--bg3); display: flex; align-items: center; justify-content: center; transition: background .2s; }
.cat-novo-card:hover .novo-plus { background: var(--g-dim); }
.novo-plus .material-symbols-outlined { font-size: 28px; }
.novo-label { font-size: 14px; font-weight: 700; }
.novo-hint  { font-size: 12px; opacity: .6; }

/* ── Sheet pedidos ── */
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 2000; display: flex; align-items: flex-end; }
.sheet-box { width: 100%; max-height: 90vh; background: var(--bg2); border-radius: 20px 20px 0 0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -20px 60px rgba(0,0,0,.4); }
.sheet-enter-active, .sheet-leave-active { transition: opacity .25s; }
.sheet-enter-active .sheet-box, .sheet-leave-active .sheet-box { transition: transform .3s cubic-bezier(.32,.72,0,1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-box, .sheet-leave-to .sheet-box { transform: translateY(100%); }

.sheet-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 22px 24px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.sheet-tag    { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--g); margin-bottom: 4px; }
.sheet-tag .material-symbols-outlined { font-size: 14px; }
.sheet-title  { font-size: 18px; font-weight: 800; color: var(--text); margin: 0; }

.sheet-tabs  { display: flex; gap: 4px; padding: 12px 24px; border-bottom: 1px solid var(--border); overflow-x: auto; flex-shrink: 0; }
.sheet-tab   { padding: 6px 14px; border-radius: 8px; border: 1px solid transparent; background: none; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; font-family: inherit; transition: all .15s; }
.sheet-tab:hover { background: var(--bg3); color: var(--text); }
.sheet-tab--active { background: var(--g-dim); border-color: rgba(0,200,83,.2); color: var(--g); }
.tab-count { background: var(--bg3); border-radius: 10px; font-size: 10px; padding: 1px 6px; }
.sheet-tab--active .tab-count { background: rgba(0,200,83,.15); color: var(--g); }

.sheet-body { flex: 1; overflow-y: auto; padding: 0; }

/* ── Pedidos table ── */
.pedidos-table-wrap { overflow-x: auto; }
.pedidos-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pedidos-table th { padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); background: var(--bg3); border-bottom: 1px solid var(--border); white-space: nowrap; }
.pedidos-table th:first-child { padding-left: 24px; }
.pedidos-table th:last-child  { padding-right: 24px; }
.pedidos-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.pedidos-table td:first-child { padding-left: 24px; }
.pedidos-table td:last-child  { padding-right: 24px; }

.pr { cursor: pointer; transition: background .12s; }
.pr:hover { background: var(--bg3); }
.pr--open { background: var(--bg3); }
.pr--open td { border-bottom: none; }

.td-num    { font-size: 12px; font-weight: 800; color: var(--g); font-family: monospace; }
.td-data   { font-size: 12px; color: var(--text2); white-space: nowrap; }
.td-cliente { display: flex; align-items: center; gap: 10px; }
.td-avatar  { width: 32px; height: 32px; border-radius: 50%; background: var(--g-dim); color: var(--g); font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.td-nome   { font-size: 13px; font-weight: 600; color: var(--text); }
.td-sub    { font-size: 11px; color: var(--text2); margin-top: 1px; }
.td-entrega { display: flex; align-items: center; gap: 3px; }
.td-chips  { display: flex; gap: 4px; flex-wrap: wrap; max-width: 220px; }
.item-chip { background: var(--bg4); border: 1px solid var(--border); border-radius: 6px; padding: 2px 7px; font-size: 11px; font-weight: 600; color: var(--text); white-space: nowrap; }
.item-chip--more { color: var(--text2); }
.td-valor  { color: var(--g); font-size: 13px; font-weight: 700; white-space: nowrap; }

.ps-badge  { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; display: inline-block; }
.ps-aguardando        { background: rgba(245,158,11,.12); color: #f59e0b; }
.ps-orcamento_enviado { background: rgba(96,158,252,.12); color: #609efc; }
.ps-aprovado          { background: rgba(0,200,83,.12); color: #00c853; }
.ps-cancelado         { background: rgba(248,113,113,.12); color: #f87171; }

.expand-chevron { font-size: 18px; color: var(--text2); display: flex; }

/* Linha expandida */
.pr-detail { background: var(--bg3); }
.pr-detail td { padding: 0; border-bottom: 1px solid var(--border); }
.detail-panel { padding: 18px 24px; display: flex; gap: 24px; flex-wrap: wrap; }
.detail-cols  { flex: 1; display: flex; gap: 20px; flex-wrap: wrap; }
.detail-col   { display: flex; flex-direction: column; gap: 5px; min-width: 140px; }
.detail-col--full { flex: 100%; }
.detail-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); }
.detail-val   { font-size: 13px; font-weight: 600; color: var(--text); }
.detail-sub   { font-size: 12px; color: var(--text2); font-style: italic; }
.detail-itens { display: flex; flex-direction: column; gap: 3px; }
.detail-item  { font-size: 12px; color: var(--text); display: flex; gap: 6px; }
.detail-qty   { color: var(--g); font-weight: 700; }
.detail-link-row  { display: flex; gap: 6px; margin-top: 2px; }
.detail-link-input { flex: 1; padding: 7px 10px; background: var(--bg2); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); font-size: 11px; font-family: monospace; outline: none; }
.detail-link-copy  { display: flex; align-items: center; gap: 5px; padding: 7px 12px; background: var(--g); border: none; border-radius: 7px; color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: inherit; }
.detail-link-copy .material-symbols-outlined { font-size: 14px; }

.detail-orc-zone { flex-shrink: 0; min-width: 260px; }
.orc-form { display: flex; flex-direction: column; gap: 8px; }
.orc-form-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.orc-form-title .material-symbols-outlined { font-size: 16px; color: var(--g); }
.orc-form-fields { display: flex; flex-direction: column; gap: 6px; }
.orc-form-btns { display: flex; gap: 8px; justify-content: flex-end; }
.orc-display  { display: flex; flex-direction: column; gap: 10px; }
.orc-valor-box { display: flex; align-items: center; gap: 10px; background: var(--g-dim); border-radius: 8px; padding: 10px 14px; }
.orc-valor-box .material-symbols-outlined { font-size: 20px; }
.orc-valor { font-size: 18px; font-weight: 800; color: var(--g); }
.orc-obs   { font-size: 11px; color: var(--text2); margin-top: 2px; }
.btn-orc   { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; background: var(--g); border: none; border-radius: 9px; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: filter .15s; }
.btn-orc:hover { filter: brightness(1.1); }
.btn-orc .material-symbols-outlined { font-size: 16px; }

.table-footer { padding: 12px 24px; font-size: 12px; color: var(--text2); border-top: 1px solid var(--border); background: var(--bg3); }

/* ── Modal novo ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 16px; }
.modal-box     { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 460px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-header  { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 14px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
.modal-close   { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; }
.modal-close .material-symbols-outlined { font-size: 20px; }
.modal-body    { padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer  { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--border); }
.mf-group      { display: flex; flex-direction: column; gap: 5px; }
.mf-group label{ font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text2); }
.opt           { font-weight: 400; }
.m-input       { padding: 9px 11px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; width: 100%; font-family: inherit; outline: none; }
.m-input:focus { border-color: var(--g); }
.m-textarea    { resize: vertical; }
.form-erro     { color: #f87171; font-size: 12px; }
.btn-cancel    { padding: 8px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-salvar    { display: flex; align-items: center; gap: 6px; padding: 9px 20px; background: var(--g); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-salvar:disabled { opacity: .5; cursor: not-allowed; }

/* ── Shared ── */
.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 50px 20px; color: var(--text2); font-size: 13px; }
.muted        { opacity: .6; }
.spin     { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--g); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm  { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.cat-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 6px 24px rgba(0,0,0,.35); white-space: nowrap; }
.cat-toast .material-symbols-outlined { font-size: 18px; }
.cat-toast.ok  { background: #064e2a; color: #86efac; border: 1px solid rgba(0,200,83,.2); }
.cat-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

@media (max-width: 900px) {
  .cat-metricas { grid-template-columns: repeat(2,1fr); }
  .metrica-chip { display: none; }
}
@media (max-width: 600px) {
  .cat-metricas { grid-template-columns: 1fr 1fr; gap: 8px; }
  .sheet-box { max-height: 95vh; border-radius: 16px 16px 0 0; }
}

</style>

<style>
[data-theme="light"] .cat-wrap .cat-btn--outline   { background: #fff; border-color: rgba(0,0,0,.15); }
[data-theme="light"] .cat-wrap .cat-link-input     { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .cat-wrap .item-chip          { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .cat-wrap .btn-cancel         { background: #fff; border-color: rgba(0,0,0,.15); }
[data-theme="light"] .cat-wrap .m-input            { background: #fff; border-color: rgba(0,0,0,.15); }
[data-theme="light"] .cat-wrap .detail-link-input  { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .cat-wrap .cat-novo-card      { border-color: rgba(0,0,0,.12); }
[data-theme="light"] .sheet-box                    { background: #fff; }
[data-theme="light"] .sheet-header                 { background: #fff; }
[data-theme="light"] .sheet-tabs                   { background: #fff; border-bottom-color: rgba(0,0,0,.08); }
[data-theme="light"] .sheet-tab:hover              { background: rgba(0,0,0,.04); }
[data-theme="light"] .pedidos-table-wrap           { background: #fff; }
[data-theme="light"] .pedidos-table th             { background: #fff; border-bottom-color: rgba(0,0,0,.08); color: #374151; }
[data-theme="light"] .pedidos-table td             { border-bottom-color: rgba(0,0,0,.06); }
[data-theme="light"] .pr:hover                     { background: rgba(99,102,241,.04); }
[data-theme="light"] .pr-detail                    { background: #fff; }
[data-theme="light"] .detail-panel                 { background: #fff; }
[data-theme="light"] .table-footer                 { background: #fff; border-top-color: rgba(0,0,0,.08); }
[data-theme="light"] .item-chip                    { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
</style>
