<template>
  <div class="cv-wrap animate-fade">

    <!-- Header compacto com filtros -->
    <div class="cv-hero card-glass">
      <div class="cv-hero-row">
        <div class="cv-hero-title-row">
          <div class="cv-hero-ico">
            <span class="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h2 class="cv-hero-title">Consolidação de Recebimentos</h2>
          </div>
        </div>

        <div class="cv-hero-filters">
          <div class="filter-group">
            <label>De</label>
            <input type="date" v-model="filtro.de" class="f-input" />
          </div>
          <div class="filter-group">
            <label>Até</label>
            <input type="date" v-model="filtro.ate" class="f-input" />
          </div>
          <div class="filter-group">
            <label>Forma</label>
            <select v-model="filtro.forma" class="f-input">
              <option value="">Todas</option>
              <option v-for="f in formas" :key="f.pk" :value="f.forma">{{ f.label }}</option>
            </select>
          </div>
          <button class="btn-buscar" @click="carregar" :disabled="carregando">
            <span class="material-symbols-outlined">{{ carregando ? 'hourglass_empty' : 'search' }}</span>
            Buscar
          </button>
        </div>

        <div v-if="!carregando && listaRec.length" class="cv-hero-total">
          <span class="cv-hero-total-label">Total</span>
          <strong class="cv-hero-total-val">{{ fmt(totalRec) }}</strong>
        </div>
      </div>
    </div>

    <!-- Abas -->
    <div class="cv-tabs">
      <button :class="['cv-tab', { active: abaAtiva === 'lancamentos' }]" @click="abaAtiva = 'lancamentos'">
        <span class="material-symbols-outlined">pending_actions</span>
        Pendentes
        <span v-if="listaPendentes.length" class="tab-badge">{{ listaPendentes.length }}</span>
      </button>
      <button :class="['cv-tab', { active: abaAtiva === 'recebimentos' }]" @click="abaAtiva = 'recebimentos'">
        <span class="material-symbols-outlined">payments</span>
        Recebimentos Lançados
        <span v-if="listaRec.length" class="tab-badge">{{ listaRec.length }}</span>
      </button>
      <button :class="['cv-tab', { active: abaAtiva === 'avulso' }]" @click="abaAtiva = 'avulso'">
        <span class="material-symbols-outlined">add_circle</span>
        Lançamento Avulso
      </button>
      <button :class="['cv-tab', { active: abaAtiva === 'por_conta' }]" @click="abaAtiva = 'por_conta'">
        <span class="material-symbols-outlined">account_balance_wallet</span>
        Por Conta
      </button>
    </div>

    <!-- ══ ABA: Pendentes ══ -->
    <div v-if="abaAtiva === 'lancamentos'">
      <div v-if="carregando" class="state-center"><span class="spin"></span></div>
      <div v-else-if="!listaPendentes.length" class="state-center muted">
        <span class="material-symbols-outlined" style="font-size:36px;opacity:.25">check_circle</span>
        Nenhum pagamento pendente.
      </div>

      <div v-else class="pend-lista">
        <div v-for="p in pendentesPagina" :key="p.pk" :class="['pend-row', { expanded: expandido === p.pk }]">
          <div class="pend-main" @click="toggleExpand(p)">
            <div class="pend-data">
              <span>{{ p.venda_data }}</span>
              <span class="pend-hora">{{ p.venda_hora }}</span>
            </div>
            <div class="pend-info">
              <span class="pend-num">#{{ p.venda_numero }}</span>
              <span class="pend-cliente">{{ p.venda_cliente || 'Sem cliente' }}</span>
            </div>
            <span :class="['badge-forma', `bf-${normForma(p.forma)}`]">{{ labelForma(p.forma) }}</span>
            <strong class="pend-valor">{{ fmt(p.valor) }}</strong>
            <div class="pend-prev">
              <span class="prev-label">Prev.</span>
              <span>{{ p.data_prevista }}</span>
            </div>
            <span class="material-symbols-outlined exp-ico">{{ expandido === p.pk ? 'expand_less' : 'expand_more' }}</span>
          </div>

          <div v-if="expandido === p.pk" class="pend-confirm">
            <div class="confirm-row">
              <div class="cf-group">
                <label>Data recebida</label>
                <input type="date" v-model="formPend[p.pk].data_recebimento" class="cf-input" />
              </div>
              <div class="cf-group">
                <label>Conta</label>
                <select v-model="formPend[p.pk].conta_pk" class="cf-input">
                  <option :value="null">Selecionar…</option>
                  <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
                </select>
              </div>
              <div class="cf-group cf-obs">
                <label>Obs.</label>
                <input type="text" v-model="formPend[p.pk].descricao" class="cf-input" placeholder="Opcional" />
              </div>
            </div>
            <div class="confirm-actions">
              <button class="btn-confirmar" @click="confirmarPendente(p)"
                :disabled="salvando[p.pk] || !formPend[p.pk].data_recebimento">
                <span v-if="salvando[p.pk]" class="spin-sm"></span>
                <span class="material-symbols-outlined" v-else>check</span>
                Confirmar recebimento
              </button>
            </div>
          </div>
        </div>

        <div v-if="totalPagPend > 1" class="pag-bar">
          <button class="pag-btn" :disabled="pagPend === 1" @click="pagPend = 1"><span class="material-symbols-outlined">first_page</span></button>
          <button class="pag-btn" :disabled="pagPend === 1" @click="pagPend--"><span class="material-symbols-outlined">chevron_left</span></button>
          <span class="pag-info">{{ pagPend }} / {{ totalPagPend }}</span>
          <button class="pag-btn" :disabled="pagPend === totalPagPend" @click="pagPend++"><span class="material-symbols-outlined">chevron_right</span></button>
          <button class="pag-btn" :disabled="pagPend === totalPagPend" @click="pagPend = totalPagPend"><span class="material-symbols-outlined">last_page</span></button>
          <span class="pag-total">{{ listaPendentes.length }} registros</span>
        </div>
      </div>
    </div>

    <!-- ══ ABA: Lançamento Avulso ══ -->
    <div v-if="abaAtiva === 'avulso'" class="avulso-wrap">
      <div class="manual-form card-glass">
        <div class="mf-row">
          <div class="mf-group">
            <label>Data recebida <span class="obrig">*</span></label>
            <input type="date" v-model="manual.data_recebimento" class="cf-input" />
          </div>
          <div class="mf-group">
            <label>Valor <span class="obrig">*</span></label>
            <input type="number" v-model="manual.valor" class="cf-input" step="0.01" min="0" placeholder="0,00" />
          </div>
          <div class="mf-group">
            <label>Forma</label>
            <select v-model="manual.forma" class="cf-input">
              <option value="">Selecionar…</option>
              <option v-for="f in formas" :key="f.pk" :value="f.forma">{{ f.label }}</option>
            </select>
          </div>
          <div class="mf-group">
            <label>Conta</label>
            <select v-model="manual.conta_pk" class="cf-input">
              <option :value="null">Selecionar…</option>
              <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
            </select>
          </div>
          <div class="mf-group mf-desc">
            <label>Descrição</label>
            <input type="text" v-model="manual.descricao" class="cf-input" placeholder="Ex: Crédito Cielo 3 vendas 22/04…" />
          </div>
          <button class="btn-lancar" @click="salvarManual"
            :disabled="salvandoManual || !manual.data_recebimento || !manual.valor">
            <span v-if="salvandoManual" class="spin-sm"></span>
            <span class="material-symbols-outlined" v-else>add</span>
            Lançar
          </button>
        </div>
      </div>
    </div>

    <!-- ══ ABA: Recebimentos Lançados ══ -->
    <div v-if="abaAtiva === 'recebimentos'">
      <div v-if="carregando" class="state-center"><span class="spin"></span></div>
      <div v-else-if="!listaRec.length" class="state-center muted" style="padding:48px">
        <span class="material-symbols-outlined" style="font-size:36px;opacity:.25">account_balance_wallet</span>
        Nenhum lançamento no período.
      </div>
      <div v-else>
        <div class="rl-header-bar">
          <span class="rl-total-label">Total do período: <strong>{{ fmt(totalRec) }}</strong></span>
          <span class="rl-count">{{ listaRec.length }} registros</span>
        </div>
        <div class="rec-lista card-glass">
          <div v-for="r in recPagina" :key="r.pk" class="rec-row">
            <div class="rec-data">{{ fmtDataSimples(r.data_recebimento) }}</div>
            <div class="rec-info">
              <span v-if="r.pagamento_pk" class="rec-venda">#{{ r.venda_numero || '—' }}</span>
              <span v-else class="badge-manual">Avulso</span>
              <span class="rec-desc">{{ r.descricao || r.venda_cliente || '—' }}</span>
            </div>
            <div class="rec-conta">
              <span class="material-symbols-outlined" style="font-size:13px;opacity:.5">account_balance</span>
              {{ nomeContaPk(r.conta_pk) }}
            </div>
            <span :class="['badge-forma sm', `bf-${normForma(r.forma)}`]">
              {{ labelForma(r.forma) }}
            </span>
            <strong class="rec-valor">{{ fmt(r.valor) }}</strong>
            <div class="rec-actions">
              <button class="btn-icon" @click="excluirRec(r)" title="Excluir">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <div class="rec-total">
            <span>Total do período</span>
            <strong>{{ fmt(totalRec) }}</strong>
          </div>
        </div>

        <!-- Paginação recebimentos -->
        <div v-if="totalPagRec > 1" class="pag-bar pag-bar-bottom">
          <button class="pag-btn" :disabled="pagRec === 1" @click="pagRec = 1">
            <span class="material-symbols-outlined">first_page</span>
          </button>
          <button class="pag-btn" :disabled="pagRec === 1" @click="pagRec--">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="pag-info">{{ pagRec }} / {{ totalPagRec }}</span>
          <button class="pag-btn" :disabled="pagRec === totalPagRec" @click="pagRec++">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
          <button class="pag-btn" :disabled="pagRec === totalPagRec" @click="pagRec = totalPagRec">
            <span class="material-symbols-outlined">last_page</span>
          </button>
          <span class="pag-total">{{ listaRec.length }} registros</span>
        </div>
      </div>
    </div>

    <!-- ══ ABA: Por Conta ══ -->
    <div v-if="abaAtiva === 'por_conta'">
      <div v-if="carregando" class="state-center"><span class="spin"></span></div>
      <div v-else-if="!resumoPorConta.length" class="state-center muted">
        <span class="material-symbols-outlined" style="font-size:36px;opacity:.25">account_balance_wallet</span>
        Nenhum recebimento lançado no período.
      </div>
      <div v-else>
        <div class="pc-total-header">
          <span class="pc-total-label">Total do período</span>
          <strong class="pc-total-valor">{{ fmt(totalRec) }}</strong>
        </div>

        <!-- Cards das contas -->
        <div class="pc-grid">
          <div
            v-for="item in resumoPorConta"
            :key="item.conta_pk || '__sem__'"
            :class="['pc-card', 'pc-card-clickable', { 'pc-card-ativo': contaSelecionada && contaSelecionada.conta_pk === item.conta_pk && contaSelecionada.nome === item.nome }]"
            @click="abrirDetalhesConta(item)"
          >
            <div class="pc-card-header">
              <span class="material-symbols-outlined pc-card-ico">{{ item.conta_pk ? 'account_balance' : 'money_off' }}</span>
              <div class="pc-card-info">
                <span class="pc-card-nome">{{ item.nome }}</span>
                <span class="pc-card-count">{{ item.count }} lançamento{{ item.count !== 1 ? 's' : '' }}</span>
              </div>
              <strong class="pc-card-total">{{ fmt(item.total) }}</strong>
              <span class="material-symbols-outlined pc-ver-ico">
                {{ (contaSelecionada && contaSelecionada.conta_pk === item.conta_pk && contaSelecionada.nome === item.nome) ? 'expand_less' : 'expand_more' }}
              </span>
            </div>
            <div class="pc-formas">
              <div v-for="(val, forma) in item.porForma" :key="forma" class="pc-forma-row">
                <span :class="['badge-forma sm', `bf-${normForma(forma)}`]">{{ labelForma(forma) }}</span>
                <span class="pc-forma-valor">{{ fmt(val) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Painel inline de detalhe da conta selecionada -->
        <Transition name="det-slide">
          <div v-if="contaSelecionada" class="pc-detalhe card-glass">

            <!-- Cabeçalho do painel -->
            <div class="pcd-header">
              <span class="material-symbols-outlined pcd-ico">account_balance</span>
              <div class="pcd-titulo">
                <h3 class="pcd-nome">{{ contaSelecionada.nome }}</h3>
                <span class="pcd-sub">{{ recsDaConta.length }} lançamento{{ recsDaConta.length !== 1 ? 's' : '' }} no período</span>
              </div>
              <div class="pcd-formas-resumo">
                <span
                  v-for="(val, forma) in contaSelecionada.porForma"
                  :key="forma"
                  :class="['badge-forma sm', `bf-${normForma(forma)}`]"
                  style="margin-right:4px"
                >
                  {{ labelForma(forma) }}: {{ fmt(val) }}
                </span>
              </div>
              <strong class="pcd-total">{{ fmt(contaSelecionada.total) }}</strong>
              <button class="btn-icon pcd-fechar" @click="contaSelecionada = null" title="Fechar">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Tabela de lançamentos -->
            <div v-if="!recsDaConta.length" class="state-center muted" style="padding:32px">
              Nenhum lançamento.
            </div>
            <div v-else>
              <table class="pcd-tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Venda / Tipo</th>
                    <th>Cliente / Descrição</th>
                    <th>Forma</th>
                    <th style="text-align:right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in recsDaContaPagina" :key="r.pk">
                    <td class="pcd-col-data">{{ fmtDataSimples(r.data_recebimento) }}</td>
                    <td>
                      <span v-if="r.pagamento_pk" class="rec-venda">#{{ r.venda_numero || '—' }}</span>
                      <span v-else class="badge-manual">Avulso</span>
                    </td>
                    <td class="pcd-col-desc">{{ r.descricao || r.venda_cliente || '—' }}</td>
                    <td>
                      <span :class="['badge-forma sm', `bf-${normForma(r.forma)}`]">{{ labelForma(r.forma) }}</span>
                    </td>
                    <td class="pcd-col-valor">{{ fmt(r.valor) }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Paginação -->
              <div class="pcd-footer">
                <div v-if="totalPagModal > 1" class="pag-bar" style="margin:0">
                  <button class="pag-btn" :disabled="pagModal === 1" @click="pagModal = 1">
                    <span class="material-symbols-outlined">first_page</span>
                  </button>
                  <button class="pag-btn" :disabled="pagModal === 1" @click="pagModal--">
                    <span class="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span class="pag-info">{{ pagModal }} / {{ totalPagModal }}</span>
                  <button class="pag-btn" :disabled="pagModal === totalPagModal" @click="pagModal++">
                    <span class="material-symbols-outlined">chevron_right</span>
                  </button>
                  <button class="pag-btn" :disabled="pagModal === totalPagModal" @click="pagModal = totalPagModal">
                    <span class="material-symbols-outlined">last_page</span>
                  </button>
                  <span class="pag-total">{{ recsDaConta.length }} registros</span>
                </div>
                <div class="pcd-total-rodape">
                  <span>Total</span>
                  <strong>{{ fmt(contaSelecionada.total) }}</strong>
                </div>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </div>

    <!-- Modal confirmar exclusão -->
    <Teleport to="body">
      <div v-if="excluindo" class="modal-overlay" @click.self="excluindo = null">
        <div class="modal-box modal-sm">
          <div class="modal-header">
            <h3>Excluir Recebimento</h3>
          </div>
          <div class="modal-body">
            <p>Excluir o recebimento de <strong>{{ fmt(excluindo.valor) }}</strong> em
              <strong>{{ fmtDataSimples(excluindo.data_recebimento) }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="excluindo = null">Cancelar</button>
            <button class="btn-danger" @click="confirmarExclusao" :disabled="removendo">
              <span v-if="removendo" class="spin-sm"></span>
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="cv-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import api from '../services/api';

const sessaoStore = useSessaoStore();

const hoje      = new Date().toISOString().slice(0, 10);
const inicioMes = hoje.slice(0, 8) + '01';

const POR_PAG = 20;

const filtro    = ref({ de: inicioMes, ate: hoje, forma: '' });
const carregando = ref(false);
const abaAtiva  = ref('lancamentos');

const listaPendentes = ref([]);
const listaRec       = ref([]);
const contas         = ref([]);
const expandido      = ref(null);
const salvando       = reactive({});
const formPend       = reactive({});

// Paginação pendentes
const pagPend = ref(1);
const totalPagPend = computed(() => Math.max(1, Math.ceil(listaPendentes.value.length / POR_PAG)));
const pendentesPagina = computed(() => {
  const ini = (pagPend.value - 1) * POR_PAG;
  return listaPendentes.value.slice(ini, ini + POR_PAG);
});

// Paginação recebimentos
const pagRec = ref(1);
const totalPagRec = computed(() => Math.max(1, Math.ceil(listaRec.value.length / POR_PAG)));
const recPagina = computed(() => {
  const ini = (pagRec.value - 1) * POR_PAG;
  return listaRec.value.slice(ini, ini + POR_PAG);
});

// Detalhe por conta
const contaSelecionada = ref(null);
const pagModal = ref(1);
const recsDaConta = computed(() => {
  if (!contaSelecionada.value) return [];
  const cpk = contaSelecionada.value.conta_pk;
  return listaRec.value.filter(r => (r.conta_pk ?? null) === (cpk ?? null));
});
const totalPagModal = computed(() => Math.max(1, Math.ceil(recsDaConta.value.length / POR_PAG)));
const recsDaContaPagina = computed(() => {
  const ini = (pagModal.value - 1) * POR_PAG;
  return recsDaConta.value.slice(ini, ini + POR_PAG);
});

watch(recsDaConta, () => { pagModal.value = 1; });
watch(listaPendentes, () => { pagPend.value = 1; });
watch(listaRec, () => { pagRec.value = 1; });

// Formulário manual
const manual       = ref({ data_recebimento: hoje, valor: '', forma: '', conta_pk: null, descricao: '' });
const salvandoManual = ref(false);

// Exclusão
const excluindo  = ref(null);
const removendo  = ref(false);

// Toast
const toastMsg  = ref('');
const toastTipo = ref('ok');
let toastTimer  = null;

const formas = ref([]);

const totalRec = computed(() =>
  listaRec.value.reduce((s, r) => s + parseFloat(r.valor || 0), 0)
);

const resumoPorConta = computed(() => {
  const map = {};
  listaRec.value.forEach(r => {
    const key = r.conta_pk ?? '__sem__';
    if (!map[key]) {
      const conta = contas.value.find(c => c.pk === r.conta_pk);
      map[key] = { conta_pk: r.conta_pk, nome: conta?.nome || 'Sem conta', total: 0, count: 0, porForma: {} };
    }
    map[key].total += parseFloat(r.valor || 0);
    map[key].count++;
    const f = r.forma || 'outro';
    map[key].porForma[f] = (map[key].porForma[f] || 0) + parseFloat(r.valor || 0);
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
});

onMounted(() => {
  carregarContas();
  carregar();
});

async function carregarContas() {
  const { data } = await api.get('/api/consolidacao/auxiliares', { params: { filial_pk: sessaoStore.filial?.pk } });
  contas.value = data.contas || [];
  formas.value = data.formas || [];
}

async function carregar() {
  carregando.value = true;
  expandido.value  = null;
  try {
    await Promise.all([carregarPendentes(), carregarRecebimentos()]);
  } finally {
    carregando.value = false;
  }
}

async function carregarPendentes() {
  const { data } = await api.get('/api/consolidacao/pendentes', {
    params: { filial_pk: sessaoStore.filial?.pk, de: filtro.value.de, ate: filtro.value.ate, forma: filtro.value.forma || undefined },
  });
  const raw = data.data || [];
  listaPendentes.value = raw.map(p => ({
    ...p,
    venda_data:    fmtDataSimples(p.venda_data),
    data_prevista: fmtDataSimples(p.data_prevista),
  }));
  raw.forEach(p => {
    if (!formPend[p.pk]) {
      formPend[p.pk] = { data_recebimento: p.data_prevista, conta_pk: null, descricao: '' };
    }
  });
}

async function carregarRecebimentos() {
  const { data } = await api.get('/api/consolidacao/recebimentos', {
    params: { filial_pk: sessaoStore.filial?.pk, de: filtro.value.de, ate: filtro.value.ate, forma: filtro.value.forma || undefined },
  });
  listaRec.value = data.data || [];
}

function toggleExpand(p) {
  expandido.value = expandido.value === p.pk ? null : p.pk;
}

function abrirDetalhesConta(item) {
  const igual = contaSelecionada.value &&
    contaSelecionada.value.conta_pk === item.conta_pk &&
    contaSelecionada.value.nome === item.nome;
  contaSelecionada.value = igual ? null : item;
  pagModal.value = 1;
}

function nomeContaPk(pk) {
  if (!pk) return 'Sem conta';
  const c = contas.value.find(x => x.pk === pk);
  return c?.nome || '—';
}

async function confirmarPendente(p) {
  const f = formPend[p.pk];
  if (!f?.data_recebimento) return;
  salvando[p.pk] = true;
  try {
    await api.post('/api/consolidacao/confirmar', {
      filial_pk:        sessaoStore.filial?.pk,
      pagamento_pk:     p.pk,
      venda_pk:         p.venda_pk,
      conta_pk:         f.conta_pk || null,
      data_recebimento: f.data_recebimento,
      valor:            p.valor,
      forma:            p.forma,
      descricao:        f.descricao || null,
    });
    showToast('Recebimento confirmado!', 'ok');
    expandido.value = null;
    await carregar();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    salvando[p.pk] = false;
  }
}

async function salvarManual() {
  const m = manual.value;
  if (!m.data_recebimento || !m.valor) return;
  salvandoManual.value = true;
  try {
    await api.post('/api/consolidacao/avulso', {
      filial_pk:        sessaoStore.filial?.pk,
      conta_pk:         m.conta_pk || null,
      data_recebimento: m.data_recebimento,
      valor:            parseFloat(m.valor),
      forma:            m.forma || null,
      descricao:        m.descricao || null,
    });
    showToast('Recebimento lançado!', 'ok');
    manual.value = { data_recebimento: hoje, valor: '', forma: '', conta_pk: null, descricao: '' };
    await carregarRecebimentos();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    salvandoManual.value = false;
  }
}

function excluirRec(r) { excluindo.value = r; }

async function confirmarExclusao() {
  removendo.value = true;
  try {
    await api.delete(`/api/consolidacao/${excluindo.value.pk}`);
    showToast('Excluído.', 'ok');
    excluindo.value = null;
    await carregar();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    removendo.value = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────
const FORMAS_SLUG = ['dinheiro', 'pix', 'debito', 'credito', 'crediario'];
function normForma(f) {
  const slug = (f || '').toLowerCase().replace(/\s+/g, '-');
  return FORMAS_SLUG.includes(slug) ? slug : 'outro';
}
function labelForma(f) {
  if (!f) return '—';
  const found = formas.value.find(x => x.forma === f);
  if (found) return found.label || found.forma;
  const fallback = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito', crediario: 'Crediário' };
  return fallback[f.toLowerCase()] || f;
}
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtDataSimples(s) {
  if (!s) return '—';
  const [y, m, dia] = String(s).split('-');
  return `${dia}/${m}/${y}`;
}
function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3500);
}
</script>

<style scoped>
.cv-wrap { max-width: 1300px; margin: 0 auto; padding: 24px 16px 80px; display: flex; flex-direction: column; gap: 18px; }

/* Hero header */
.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; }

.cv-hero { padding: 12px 16px; }
.cv-hero-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

.cv-hero-title-row { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.cv-hero-ico {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #60a5fa));
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cv-hero-ico .material-symbols-outlined { font-size: 18px; color: #fff; }
.cv-hero-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; white-space: nowrap; }

.cv-hero-filters { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; flex: 1; }
.filter-group { display: flex; flex-direction: column; gap: 3px; }
.filter-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.f-input { padding: 6px 9px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 110px; height: 32px; }
.f-input:focus { outline: none; border-color: var(--primary); }
.btn-buscar { display: flex; align-items: center; gap: 6px; padding: 0 14px; background: var(--primary); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; height: 32px; align-self: flex-end; transition: opacity .15s; white-space: nowrap; }
.btn-buscar:hover:not(:disabled) { opacity: .88; }
.btn-buscar:disabled { opacity: .6; cursor: not-allowed; }

.cv-hero-total { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; margin-left: auto; flex-shrink: 0; }
.cv-hero-total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text2); }
.cv-hero-total-val   { font-size: 18px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); line-height: 1; }

/* Aba avulso — formulário em linha */
.avulso-wrap { max-width: 900px; }
.avulso-wrap .mf-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.avulso-wrap .mf-desc { flex: 1; min-width: 200px; }
.avulso-wrap .btn-lancar { align-self: flex-end; white-space: nowrap; }

/* ══ LISTA PENDENTES ══ */
.pend-lista { display: flex; flex-direction: column; gap: 4px; }
.pend-row { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: border-color .15s; }
.pend-row.expanded { border-color: var(--primary); }
.pend-main { display: grid; grid-template-columns: 70px 1fr 90px 90px 80px 24px; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; }
.pend-main:hover { background: var(--bg3); }

.pend-data { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; color: var(--text); }
.pend-hora { font-size: 11px; color: var(--text2); font-weight: 400; }
.pend-info { display: flex; flex-direction: column; min-width: 0; }
.pend-num { font-size: 11px; font-weight: 700; color: var(--primary); }
.pend-cliente { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge-forma { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.badge-forma.sm { font-size: 10px; padding: 2px 7px; }

/* Badges dark mode (padrão) */
.bf-dinheiro  { background: rgba(74,222,128,.12);  color: #4ade80; }
.bf-pix       { background: rgba(96,165,250,.12);  color: #60a5fa; }
.bf-debito    { background: rgba(245,158,11,.12);  color: #f59e0b; }
.bf-credito   { background: rgba(192,132,252,.12); color: #c084fc; }
.bf-crediario { background: rgba(248,113,113,.12); color: #f87171; }
.bf-outro     { background: rgba(148,163,184,.1);  color: #94a3b8; }

/* Badges light mode */
[data-theme="light"] .bf-dinheiro  { background: rgba(22,163,74,.12);  color: #15803d; }
[data-theme="light"] .bf-pix       { background: rgba(37,99,235,.12);  color: #1d4ed8; }
[data-theme="light"] .bf-debito    { background: rgba(180,83,9,.12);   color: #92400e; }
[data-theme="light"] .bf-credito   { background: rgba(126,34,206,.12); color: #7e22ce; }
[data-theme="light"] .bf-crediario { background: rgba(185,28,28,.12);  color: #b91c1c; }
[data-theme="light"] .bf-outro     { background: rgba(100,116,139,.12);color: #475569; }
.pend-valor { font-size: 14px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); text-align: right; }
.pend-prev { display: flex; flex-direction: column; font-size: 11px; color: var(--text2); }
.prev-label { font-size: 10px; text-transform: uppercase; letter-spacing: .03em; opacity: .6; }
.exp-ico { font-size: 18px; color: var(--text2); }

/* Painel de confirmação */
.pend-confirm { padding: 12px 14px 14px; background: var(--bg3); border-top: 1px solid var(--border); }
.confirm-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.cf-group { display: flex; flex-direction: column; gap: 4px; }
.cf-obs { flex: 1; min-width: 140px; }
.cf-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.cf-input { padding: 7px 10px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 130px; }
.cf-input:focus { outline: none; border-color: var(--primary); }
.confirm-actions { display: flex; justify-content: flex-end; }
.btn-confirmar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #16a34a; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-confirmar:disabled { opacity: .5; cursor: not-allowed; }

/* ══ PAGINAÇÃO ══ */
.pag-bar { display: flex; align-items: center; gap: 6px; padding: 12px 0 4px; justify-content: center; }
.pag-bar-bottom { padding: 14px 0 4px; }
.pag-bar-modal { padding: 10px 0; border-top: 1px solid var(--border); margin-top: 4px; }
.pag-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: var(--bg3); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; transition: all .15s; }
.pag-btn:disabled { opacity: .3; cursor: not-allowed; }
.pag-btn:not(:disabled):hover { background: var(--bg4, var(--border)); color: var(--text); }
.pag-btn .material-symbols-outlined { font-size: 16px; }
.pag-info { font-size: 13px; font-weight: 700; color: var(--text); padding: 0 6px; min-width: 60px; text-align: center; }
.pag-total { font-size: 11px; color: var(--text2); margin-left: 6px; }

/* ══ ABA RECEBIMENTOS LANÇADOS ══ */
.rl-header-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px 10px; }
.rl-total-label { font-size: 13px; color: var(--text2); }
.rl-total-label strong { color: var(--text); font-family: var(--mono, monospace); }
.rl-count { font-size: 12px; color: var(--text2); }

/* Formulário manual */
.manual-form { padding: 16px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 0; }
.mf-row { display: flex; gap: 10px; }
.mf-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 110px; }
.mf-full { flex: unset; }
.mf-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.obrig { color: var(--primary); }
.btn-lancar { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: var(--primary); border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; width: 100%; }
.btn-lancar:disabled { opacity: .5; cursor: not-allowed; }

/* Lista recebimentos */
.rec-lista { overflow: hidden; }
.rec-lista-modal { overflow: hidden; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 0; }
.rec-row { display: grid; grid-template-columns: 68px 1fr auto 76px 80px 32px; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--border); }
.rec-lista-modal .rec-row { grid-template-columns: 68px 1fr 76px 80px; }
.rec-row:last-of-type { border-bottom: none; }
.rec-data { font-size: 12px; font-weight: 600; color: var(--text); }
.rec-info { display: flex; flex-direction: column; min-width: 0; }
.rec-venda { font-size: 11px; font-weight: 700; color: var(--primary); }
.badge-manual { font-size: 10px; font-weight: 700; color: #60a5fa; background: rgba(96,165,250,.1); padding: 2px 6px; border-radius: 8px; display: inline-block; width: fit-content; }
[data-theme="light"] .badge-manual { color: #1d4ed8; background: rgba(37,99,235,.1); }
.rec-desc { font-size: 12px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-conta { font-size: 11px; color: var(--text2); display: flex; align-items: center; gap: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-valor { font-size: 13px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); text-align: right; }
.rec-actions { display: flex; justify-content: flex-end; }
.btn-icon { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: none; border: 1px solid var(--border); border-radius: 6px; color: var(--text2); cursor: pointer; }
.btn-icon:hover { color: #f87171; border-color: #f87171; }
.btn-icon .material-symbols-outlined { font-size: 14px; }
.rec-total { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-top: 1px solid var(--border); font-size: 13px; background: var(--bg3); }
.rec-total strong { font-family: var(--mono, monospace); font-size: 15px; color: var(--text); }

/* Modal confirmação exclusão */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 16px; }
.modal-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 520px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-sm { max-width: 380px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 14px; border-bottom: 1px solid var(--border); gap: 12px; }
.modal-header h3 { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.modal-body { padding: 18px 22px; }
.modal-body p { color: var(--text); font-size: 14px; margin: 0; line-height: 1.5; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px; border-top: 1px solid var(--border); }
.btn-cancel { padding: 8px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-danger { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #991b1b; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-danger:disabled { opacity: .5; cursor: not-allowed; }

/* ══ PAINEL DETALHE CONTA ══ */
.pc-card-ativo { border-color: var(--primary); }
.pc-card-ativo .pc-ver-ico { color: var(--primary); }

.pc-detalhe { margin-top: 20px; border-radius: 16px; overflow: hidden; }

.pcd-header {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--bg3);
}
.pcd-ico { font-size: 26px; color: var(--primary); flex-shrink: 0; }
.pcd-titulo { display: flex; flex-direction: column; }
.pcd-nome { font-size: 16px; font-weight: 700; color: var(--text); margin: 0 0 2px; }
.pcd-sub { font-size: 12px; color: var(--text2); }
.pcd-formas-resumo { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.pcd-total { font-size: 18px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); white-space: nowrap; margin-left: auto; }
.pcd-fechar { margin-left: 8px; flex-shrink: 0; }

.pcd-tabela { width: 100%; border-collapse: collapse; }
.pcd-tabela thead th {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  color: var(--text2); padding: 10px 16px; text-align: left;
  border-bottom: 1px solid var(--border); background: var(--bg2);
}
.pcd-tabela tbody tr { border-bottom: 1px solid var(--border); transition: background .12s; }
.pcd-tabela tbody tr:last-child { border-bottom: none; }
.pcd-tabela tbody tr:hover { background: var(--bg3); }
.pcd-tabela tbody td { padding: 10px 16px; font-size: 13px; color: var(--text); }
.pcd-col-data { font-weight: 600; white-space: nowrap; width: 90px; }
.pcd-col-desc { color: var(--text2); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pcd-col-valor { text-align: right; font-weight: 800; font-family: var(--mono, monospace); white-space: nowrap; }

.pcd-footer {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg3);
}
.pcd-total-rodape { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text2); margin-left: auto; }
.pcd-total-rodape strong { font-size: 16px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); }

/* Animação do painel */
.det-slide-enter-active { transition: all .25s ease; }
.det-slide-leave-active { transition: all .2s ease; }
.det-slide-enter-from { opacity: 0; transform: translateY(-10px); }
.det-slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* Toast */
.cv-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap; }
.cv-toast.ok  { background: #166534; color: #bbf7d0; }
.cv-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; color: var(--text2); font-size: 13px; }
.muted { opacity: .6; }
.spin { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ══ ABAS ══ */
.cv-tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border); padding-bottom: 0; }
.cv-tab { display: flex; align-items: center; gap: 7px; padding: 9px 18px; background: none; border: none; border-radius: 8px 8px 0 0; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; margin-bottom: -2px; border-bottom: 2px solid transparent; }
.cv-tab:hover { background: var(--bg3); color: var(--text); }
.cv-tab.active { color: var(--primary); border-bottom-color: var(--primary); background: var(--bg2); }
.cv-tab .material-symbols-outlined { font-size: 18px; }
.tab-badge { background: var(--primary); color: #fff; border-radius: 10px; font-size: 10px; font-weight: 700; padding: 1px 7px; }

/* ══ POR CONTA ══ */
.pc-total-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 4px; margin-bottom: 4px; }
.pc-total-label { font-size: 13px; color: var(--text2); font-weight: 600; }
.pc-total-valor { font-size: 20px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); }

.pc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

.pc-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.pc-card-clickable { cursor: pointer; transition: border-color .15s, transform .12s; }
.pc-card-clickable:hover { border-color: var(--primary); transform: translateY(-2px); }
.pc-card-header { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border); background: var(--bg3); }
.pc-card-ico { font-size: 22px; color: var(--primary); flex-shrink: 0; }
.pc-card-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.pc-card-nome { font-size: 14px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-card-count { font-size: 11px; color: var(--text2); }
.pc-card-total { font-size: 16px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); white-space: nowrap; }
.pc-ver-ico { font-size: 18px; color: var(--text2); flex-shrink: 0; }

.pc-formas { display: flex; flex-direction: column; gap: 1px; padding: 8px 0; }
.pc-forma-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 16px; }
.pc-forma-row:hover { background: var(--bg3); }
.pc-forma-valor { font-size: 13px; font-weight: 700; color: var(--text); font-family: var(--mono, monospace); }

@media (max-width: 900px) {
  .cv-hero-row { gap: 10px; }
  .cv-hero-title { display: none; }
  .cv-hero-total { margin-left: 0; }
  .pend-main { grid-template-columns: 60px 1fr 80px 80px; }
  .pend-prev { display: none; }
  .pc-grid { grid-template-columns: 1fr; }
  .cv-tabs { overflow-x: auto; }
  .cv-tab { white-space: nowrap; padding: 9px 12px; }
  .rec-row { grid-template-columns: 60px 1fr 60px 70px 26px; gap: 6px; }
  .pcd-header { gap: 10px; }
  .pcd-formas-resumo { display: none; }
  .pcd-tabela thead th:nth-child(3) { display: none; }
  .pcd-tabela tbody td:nth-child(3) { display: none; }
}
</style>
