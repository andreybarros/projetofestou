<template>
  <div class="page-wrap">

    <!-- ── Cabeçalho ───────────────────────────────────────────── -->
    <div class="page-header">
      <div class="header-info">
        <div class="title-row">
          <span class="material-symbols-outlined title-icon">receipt_long</span>
          <div>
            <h2 class="page-title">Despesas</h2>
            <p class="page-sub">Controle de contas a pagar e pagamentos efetuados</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button @click="carregar" class="btn-refresh" :disabled="carregando">
          <span class="material-symbols-outlined" :class="{ 'spin-icon': carregando }">refresh</span>
          <span class="btn-label">Atualizar</span>
        </button>
        <button @click="abrirNovo" class="btn-nova">
          <span class="material-symbols-outlined">add</span>
          Nova Despesa
        </button>
      </div>
    </div>

    <!-- ── Cards de resumo ────────────────────────────────────── -->
    <div class="resumo-grid">

      <div class="resumo-card danger">
        <div class="rc-top">
          <div class="rc-icon-wrap danger">
            <span class="material-symbols-outlined">pending_actions</span>
          </div>
          <div class="rc-badge" :class="totalPendente > 0 ? 'up' : 'ok'">
            <span class="material-symbols-outlined">{{ totalPendente > 0 ? 'trending_up' : 'check_circle' }}</span>
            {{ countPendente }} {{ countPendente === 1 ? 'conta' : 'contas' }}
          </div>
        </div>
        <div class="rc-value">{{ fmt(totalPendente) }}</div>
        <div class="rc-label">Total Pendente</div>
        <div class="rc-sub">{{ countVencidas }} vencida{{ countVencidas !== 1 ? 's' : '' }} em atraso</div>
      </div>

      <div class="resumo-card success">
        <div class="rc-top">
          <div class="rc-icon-wrap success">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <div class="rc-badge ok">
            <span class="material-symbols-outlined">receipt</span>
            {{ countPagoMes }} transaç{{ countPagoMes === 1 ? 'ão' : 'ões' }}
          </div>
        </div>
        <div class="rc-value green">{{ fmt(totalPagoMes) }}</div>
        <div class="rc-label">Pago este Mês</div>
        <div class="rc-sub">No período filtrado</div>
      </div>

      <div class="resumo-card neutral">
        <div class="rc-top">
          <div class="rc-icon-wrap neutral">
            <span class="material-symbols-outlined">event_upcoming</span>
          </div>
          <div class="rc-badge neutral-badge">
            <span class="material-symbols-outlined">calendar_today</span>
            7 dias
          </div>
        </div>
        <div class="rc-value">{{ fmt(previsao7Dias) }}</div>
        <div class="rc-label">Previsão Próximos 7 Dias</div>
        <div class="rc-progress-area">
          <div class="rc-progress-bar">
            <div class="rc-progress-fill" :style="{ width: previsao7Pct + '%' }"></div>
          </div>
          <span class="rc-pct">{{ previsao7Pct }}% do total pendente</span>
        </div>
      </div>

    </div>

    <!-- ── Filtros ─────────────────────────────────────────────── -->
    <div class="filter-bar">
      <div class="filter-group">
        <span class="material-symbols-outlined filter-icon">calendar_month</span>
        <div class="filter-field">
          <label>Vencimento de</label>
          <input v-model="filtros.ini" type="date" />
        </div>
        <span class="filter-sep">—</span>
        <div class="filter-field">
          <label>Até</label>
          <input v-model="filtros.fim" type="date" />
        </div>
      </div>
      <div class="filter-group">
        <span class="material-symbols-outlined filter-icon">filter_list</span>
        <div class="filter-field">
          <label>Status</label>
          <select v-model="filtros.status">
            <option value="">Todos os Status</option>
            <option value="pendente">Pendentes / Vencidas</option>
            <option value="pago">Pagas</option>
          </select>
        </div>
        <div class="filter-field">
          <label>Categoria</label>
          <select v-model="filtroCatPk">
            <option :value="null">Todas</option>
            <option v-for="c in categoriasDespesa" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── Tabela ──────────────────────────────────────────────── -->
    <div class="table-card">
      <div class="table-header">
        <span class="table-count">
          {{ listaFiltrada.length }} registro{{ listaFiltrada.length !== 1 ? 's' : '' }}
          <span v-if="filtroCatPk" class="table-page-info"> (filtrado por categoria)</span>
          <span v-if="totalPaginas > 1" class="table-page-info"> — página {{ paginaAtual }} de {{ totalPaginas }}</span>
        </span>
      </div>
      <div class="overflow-x">
        <table class="tabela">
          <thead>
            <tr>
              <th style="width:90px">Vencimento</th>
              <th>Descrição</th>
              <th>Fornecedor</th>
              <th class="text-right" style="width:130px">Valor</th>
              <th style="width:110px">Status</th>
              <th class="text-right" style="width:120px">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="carregando">
              <td colspan="6" class="vazio">
                <div class="spinner-inline"></div>
                Carregando despesas...
              </td>
            </tr>
            <tr v-else-if="lista.length === 0">
              <td colspan="6" class="vazio">
                <span class="material-symbols-outlined vazio-icon">inbox</span>
                <p>Nenhuma despesa encontrada para os filtros aplicados.</p>
              </td>
            </tr>
            <tr v-else v-for="d in listaPaginada" :key="d.pk" :class="{ 'row-vencida': getStatusKey(d) === 'vencido' }">
              <td>
                <div class="date-cell" :class="getStatusKey(d)">
                  <span class="day">{{ vencDia(d.vencimento) }}</span>
                  <span class="month-yr">{{ vencMesAno(d.vencimento) }}</span>
                </div>
              </td>
              <td>
                <div class="desc-cell">
                  <span class="desc-text">{{ d.descricao }}</span>
                  <span v-if="d.categorias_despesa" class="cat-tag" :style="{ background: d.categorias_despesa.cor + '22', color: d.categorias_despesa.cor }">{{ d.categorias_despesa.nome }}</span>
                </div>
              </td>
              <td class="fornecedor-cell">{{ d.fornecedores?.nome || '—' }}</td>
              <td class="text-right">
                <span :class="['valor-cell', getStatusKey(d) !== 'pago' ? 'valor-danger' : 'valor-ok']">
                  {{ fmt(d.valor) }}
                </span>
              </td>
              <td>
                <span :class="['status-badge', getStatusKey(d)]">
                  <span class="material-symbols-outlined status-icon">{{ statusIcon(d) }}</span>
                  {{ getStatusLabel(d) }}
                </span>
              </td>
              <td class="text-right">
                <div class="actions">
                  <button v-if="d.status !== 'pago'" @click="abrirBaixar(d)" class="act-btn pay" title="Confirmar Pagamento">
                    <span class="material-symbols-outlined">payments</span>
                  </button>
                  <button @click="abrirEditar(d)" class="act-btn edit" title="Editar">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button @click="excluir(d)" class="act-btn del" title="Excluir">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Paginação ──────────────────────────────────────────── -->
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

        <span class="pg-info">{{ itensDe }}–{{ itensAte }} de {{ lista.length }}</span>
      </div>
    </div>

    <!-- ── MODAL: NOVA / EDITAR ───────────────────────────────── -->
    <Teleport to=".festou-root">
      <div v-if="modalAberto" class="modal-backdrop" @click.self="modalAberto = false">
        <div class="modal-box animate-slide-up">

          <!-- Cabeçalho do modal -->
          <div class="modal-header">
            <div class="modal-title-row">
              <div class="modal-header-icon">
                <span class="material-symbols-outlined">{{ f.pk ? 'edit_note' : 'receipt' }}</span>
              </div>
              <div>
                <h3 class="modal-title">{{ f.pk ? 'Editar Despesa' : 'Nova Despesa' }}</h3>
                <p class="modal-subtitle">{{ f.pk ? 'Atualize os dados da despesa' : 'Preencha os dados para registrar uma nova despesa' }}</p>
              </div>
            </div>
            <button @click="modalAberto = false" class="close-btn" title="Fechar">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Corpo do formulário -->
          <div class="modal-body">

            <!-- Linha 1: Descrição (largura total) -->
            <div class="form-section">
              <div class="field full-width">
                <label>
                  <span class="material-symbols-outlined field-icon">description</span>
                  Descrição da Despesa *
                </label>
                <input v-model="f.descricao" type="text" placeholder="Ex: Aluguel, Conta de Luz, Fornecedor X..." class="input-lg" />
              </div>
            </div>

            <!-- Linha 2: Valor | Vencimento -->
            <div class="form-row">
              <div class="field">
                <label>
                  <span class="material-symbols-outlined field-icon">attach_money</span>
                  Valor (R$) *
                </label>
                <input :value="valorDisplay" @input="onValorInput" type="text" inputmode="decimal" placeholder="0,00" />
              </div>
              <div class="field">
                <label>
                  <span class="material-symbols-outlined field-icon">event</span>
                  Data de Vencimento *
                </label>
                <input v-model="f.vencimento" type="date" />
              </div>
            </div>

            <!-- Linha 3: Fornecedor | Categoria -->
            <div class="form-row">
              <div class="field">
                <label>
                  <span class="material-symbols-outlined field-icon">store</span>
                  Fornecedor
                </label>
                <select v-model="f.fornecedor_pk">
                  <option :value="null">Sem Fornecedor</option>
                  <option v-for="fo in fornecedores" :key="fo.pk" :value="fo.pk">{{ fo.nome }}</option>
                </select>
              </div>
              <div class="field">
                <label>
                  <span class="material-symbols-outlined field-icon">label</span>
                  Categoria
                </label>
                <select v-model="f.categoria_pk">
                  <option :value="null">Sem categoria</option>
                  <option v-for="c in categoriasDespesa" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
                </select>
              </div>
            </div>

            <!-- Linha 4: Status | Conta da Saída -->
            <div class="form-row">
              <div class="field">
                <label>
                  <span class="material-symbols-outlined field-icon">flag</span>
                  {{ f.pk ? 'Status' : 'Status Inicial' }}
                </label>
                <select v-model="f.status">
                  <option value="pendente">Pendente (A Pagar)</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
              <div class="field" :class="{ 'field-disabled': f.status !== 'pago' }">
                <label>
                  <span class="material-symbols-outlined field-icon">account_balance_wallet</span>
                  Conta da Saída {{ f.status === 'pago' ? '*' : '' }}
                </label>
                <select v-model="f.conta_pk" :disabled="f.status !== 'pago'">
                  <option :value="null">{{ f.status !== 'pago' ? 'Selecione "Pago" primeiro' : 'Escolha a conta' }}</option>
                  <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
                </select>
              </div>
            </div>

          </div>

          <!-- Rodapé do modal -->
          <div class="modal-footer">
            <div class="footer-hint">
              <span class="material-symbols-outlined">info</span>
              Campos marcados com * são obrigatórios
            </div>
            <div class="footer-actions">
              <button @click="modalAberto = false" class="btn-ghost" :disabled="salvando">Cancelar</button>
              <button @click="salvar" class="btn-salvar" :disabled="salvando || !podeSalvar">
                <span class="material-symbols-outlined">{{ salvando ? 'hourglass_empty' : 'save' }}</span>
                {{ salvando ? 'Salvando...' : (f.pk ? 'Atualizar' : 'Salvar Despesa') }}
              </button>
            </div>
          </div>

          <!-- Banner mobile decorativo -->
          <div class="modal-banner mobile-only">
            <span class="material-symbols-outlined banner-icon">trending_up</span>
            <span>Mantenha seu fluxo de caixa atualizado</span>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- ── MODAL: BAIXAR PAGAMENTO ────────────────────────────── -->
    <Teleport to=".festou-root">
      <div v-if="modalBaixar" class="modal-backdrop" @click.self="modalBaixar = false">
        <div class="modal-box animate-slide-up" style="max-width:440px">
          <div class="modal-header pay-header">
            <div class="modal-title-row">
              <div class="modal-header-icon pay-icon">
                <span class="material-symbols-outlined">payments</span>
              </div>
              <div>
                <h3 class="modal-title">Confirmar Pagamento</h3>
                <p class="modal-subtitle">Registre a baixa desta despesa</p>
              </div>
            </div>
            <button @click="modalBaixar = false" class="close-btn">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="p-info-box">
              <p class="p-info-title">Você está confirmando o pagamento de:</p>
              <div class="p-card">
                <div class="p-card-left">
                  <span class="material-symbols-outlined">receipt_long</span>
                  <div>
                    <span class="p-desc">{{ despesaBaixar?.descricao }}</span>
                    <span v-if="despesaBaixar?.categoria" class="p-cat">{{ despesaBaixar.categoria }}</span>
                  </div>
                </div>
                <span class="p-val">{{ fmt(despesaBaixar?.valor) }}</span>
              </div>
            </div>
            <div class="field">
              <label>
                <span class="material-symbols-outlined field-icon">account_balance_wallet</span>
                Conta de Origem (Saída de fundos) *
              </label>
              <select v-model="contaBaixarPk">
                <option :value="null" disabled>Selecione a conta</option>
                <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
              </select>
              <span class="field-help">O valor será debitado do saldo desta conta.</span>
            </div>
          </div>
          <div class="modal-footer">
            <div class="footer-actions" style="width:100%">
              <button @click="modalBaixar = false" class="btn-ghost" :disabled="salvando">Cancelar</button>
              <button @click="confirmarPagamento" class="btn-salvar" :disabled="salvando || !contaBaixarPk">
                <span class="material-symbols-outlined">{{ salvando ? 'hourglass_empty' : 'check_circle' }}</span>
                {{ salvando ? 'Processando...' : 'Confirmar Pagamento' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>


  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, inject, watch } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import apiClient from '../services/api';

const sessaoStore = useSessaoStore();
const showToast = inject('showToast');

const lista      = ref([]);
const carregando = ref(true);
const salvando   = ref(false);
const modalAberto = ref(false);
const modalBaixar = ref(false);


const fornecedores      = ref([]);
const contas            = ref([]);
const categoriasDespesa = ref([]);

const filtros = reactive({ ini: '', fim: '', status: '' });

const f = reactive({
  pk: null, descricao: '', fornecedor_pk: null,
  valor: 0, vencimento: new Date().toISOString().split('T')[0],
  categoria_pk: null, status: 'pendente', conta_pk: null,
});

const despesaBaixar = ref(null);
const contaBaixarPk = ref(null);

// ── Paginação ───────────────────────────────────────────────────
const ITEMS_POR_PAGINA = 15;
const filtroCatPk = ref(null);

let _filterTimer = null;
watch(() => ({ ...filtros }), () => {
  clearTimeout(_filterTimer);
  _filterTimer = setTimeout(carregar, 350);
});
watch(filtroCatPk, () => { paginaAtual.value = 1; });
const paginaAtual = ref(1);

const listaFiltrada = computed(() => {
  if (!filtroCatPk.value) return lista.value;
  return lista.value.filter(d => d.categoria_pk === filtroCatPk.value);
});

const totalPaginas = computed(() => Math.max(1, Math.ceil(listaFiltrada.value.length / ITEMS_POR_PAGINA)));
const itensDe = computed(() => (paginaAtual.value - 1) * ITEMS_POR_PAGINA + 1);
const itensAte = computed(() => Math.min(paginaAtual.value * ITEMS_POR_PAGINA, listaFiltrada.value.length));

const listaPaginada = computed(() => {
  const ini = (paginaAtual.value - 1) * ITEMS_POR_PAGINA;
  return listaFiltrada.value.slice(ini, ini + ITEMS_POR_PAGINA);
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

// ── Computed de resumo ──────────────────────────────────────────
const hojeStr = computed(() => new Date().toLocaleDateString('en-CA'));
const hoje7 = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-CA');
});

const totalPendente  = computed(() => lista.value.filter(d => d.status !== 'pago').reduce((s, d) => s + (d.valor || 0), 0));
const countPendente  = computed(() => lista.value.filter(d => d.status !== 'pago').length);
const countVencidas  = computed(() => lista.value.filter(d => d.status !== 'pago' && d.vencimento < hojeStr.value).length);
const totalPagoMes   = computed(() => lista.value.filter(d => d.status === 'pago').reduce((s, d) => s + (d.valor || 0), 0));
const countPagoMes   = computed(() => lista.value.filter(d => d.status === 'pago').length);
const previsao7Dias  = computed(() => lista.value.filter(d => d.status !== 'pago' && d.vencimento >= hojeStr.value && d.vencimento <= hoje7.value).reduce((s, d) => s + (d.valor || 0), 0));
const previsao7Pct   = computed(() => {
  if (!totalPendente.value) return 0;
  return Math.min(100, Math.round((previsao7Dias.value / totalPendente.value) * 100));
});

onMounted(async () => {
  const hj = new Date();
  const y = hj.getFullYear(), m = hj.getMonth();
  filtros.ini = new Date(y, m, 1).toISOString().split('T')[0];
  filtros.fim = new Date(y, m + 1, 0).toISOString().split('T')[0];
  await Promise.all([carregar(), carregarAuxiliares()]);
});

async function carregarAuxiliares() {
  const filial_pk = sessaoStore.filial?.pk;
  try {
    const { data } = await apiClient.get('/api/despesas/auxiliares', { params: { filial_pk } });
    fornecedores.value      = data.fornecedores || [];
    contas.value            = data.contas       || [];
    categoriasDespesa.value = data.categorias   || [];
  } catch (e) {
    showToast('Erro ao carregar auxiliares: ' + (e.response?.data?.erro || e.message), 'error');
  }
}

async function carregar() {
  carregando.value = true;
  paginaAtual.value = 1;
  const filial_pk = sessaoStore.filial?.pk;
  if (!filial_pk) return;
  try {
    const params = { filial_pk };
    if (filtros.ini)    params.ini    = filtros.ini;
    if (filtros.fim)    params.fim    = filtros.fim;
    if (filtros.status) params.status = filtros.status;
    const { data } = await apiClient.get('/api/despesas', { params });
    lista.value = data.data || [];
  } catch (e) {
    showToast('Erro ao carregar despesas: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    carregando.value = false;
  }
}

const valorDisplay = computed(() => {
  if (!f.valor) return '';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(f.valor);
});

function onValorInput(e) {
  const digits = e.target.value.replace(/\D/g, '');
  if (!digits) { f.valor = 0; e.target.value = ''; return; }
  const num = parseInt(digits, 10) / 100;
  f.valor = num;
  e.target.value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

const podeSalvar = computed(() => {
  if (!f.descricao || !f.vencimento || f.valor <= 0) return false;
  if (f.status === 'pago' && !f.conta_pk) return false;
  return true;
});

function abrirNovo() {
  Object.assign(f, { pk: null, descricao: '', fornecedor_pk: null, valor: 0, vencimento: new Date().toISOString().split('T')[0], categoria_pk: null, status: 'pendente', conta_pk: null });
  modalAberto.value = true;
}

function abrirEditar(d) {
  Object.assign(f, { pk: d.pk, descricao: d.descricao, fornecedor_pk: d.fornecedor_pk, valor: d.valor, vencimento: d.vencimento, categoria_pk: d.categoria_pk || null, status: d.status, conta_pk: d.conta_pk });
  modalAberto.value = true;
}

async function salvar() {
  if (!podeSalvar.value) return;
  salvando.value = true;
  try {
    if (f.pk) {
      await apiClient.put(`/api/despesas/${f.pk}`, {
        descricao: f.descricao, fornecedor_pk: f.fornecedor_pk,
        valor: f.valor, vencimento: f.vencimento, categoria_pk: f.categoria_pk || null,
        status: f.status, conta_pk: f.status === 'pago' ? f.conta_pk : null,
      });
      showToast('Despesa atualizada com sucesso!');
    } else {
      await apiClient.post('/api/despesas', {
        filial_pk: sessaoStore.filial.pk,
        descricao: f.descricao, fornecedor_pk: f.fornecedor_pk,
        valor: f.valor, vencimento: f.vencimento,
        categoria_pk: f.categoria_pk || null, status: f.status,
        conta_pk: f.status === 'pago' ? f.conta_pk : null,
      });
      showToast('Despesa cadastrada!');
    }
    modalAberto.value = false;
    carregar();
  } catch (e) {
    showToast('Erro ao salvar: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    salvando.value = false;
  }
}

function abrirBaixar(d) {
  despesaBaixar.value = d;
  contaBaixarPk.value = null;
  modalBaixar.value = true;
}

async function confirmarPagamento() {
  if (!despesaBaixar.value || !contaBaixarPk.value) return;
  salvando.value = true;
  try {
    await apiClient.patch(`/api/despesas/${despesaBaixar.value.pk}/baixar`, {
      conta_pk: contaBaixarPk.value,
      descricao: despesaBaixar.value.descricao,
      valor: despesaBaixar.value.valor,
    });
    showToast('Baixa de despesa efetuada com sucesso!');
    modalBaixar.value = false;
    carregar();
  } catch (e) {
    showToast('Erro ao processar baixa: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    salvando.value = false;
  }
}

async function excluir(d) {
  if (!confirm(`Deseja realmente excluir a despesa "${d.descricao}"?`)) return;
  try {
    await apiClient.delete(`/api/despesas/${d.pk}`);
    showToast('Despesa excluída.');
    carregar();
  } catch (e) {
    showToast('Erro ao excluir: ' + (e.response?.data?.erro || e.message), 'error');
  }
}

function getStatusKey(d) {
  if (d.status === 'pago') return 'pago';
  const hoje = new Date().toISOString().split('T')[0];
  return d.vencimento < hoje ? 'vencido' : 'pendente';
}

function getStatusLabel(d) {
  const k = getStatusKey(d);
  if (k === 'pago')    return 'Paga';
  if (k === 'vencido') return 'Atrasada';
  return 'Pendente';
}

function statusIcon(d) {
  const k = getStatusKey(d);
  if (k === 'pago')    return 'check_circle';
  if (k === 'vencido') return 'error';
  return 'schedule';
}

function vencDia(v) {
  return new Date(v + 'T12:00:00').getDate().toString().padStart(2, '0');
}
function vencMesAno(v) {
  return new Date(v + 'T12:00:00').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
</script>

<style scoped>
/* ── Base ──────────────────────────────────────────────────────── */
.page-wrap { display: flex; flex-direction: column; gap: 1.5rem; }

/* ── Cabeçalho ─────────────────────────────────────────────────── */
.page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.title-row { display: flex; align-items: center; gap: 0.75rem; }
.title-icon { font-size: 2rem; color: var(--primary); }
.page-title { margin: 0; font-size: 1.6rem; font-weight: 800; color: var(--text); }
.page-sub { margin: 0; font-size: 0.85rem; color: var(--text2); }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.btn-refresh {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 1.1rem; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text); cursor: pointer; font-size: 0.87rem; font-weight: 600;
  transition: background 0.15s;
}
.btn-refresh:hover { background: var(--bg3); }
.btn-refresh .material-symbols-outlined { font-size: 1.1rem; }

.btn-nova {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.65rem 1.3rem; border-radius: 8px;
  border: none; background: #00c853; color: white;
  cursor: pointer; font-size: 0.9rem; font-weight: 700;
  transition: background 0.15s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(0,200,83,.3);
}
.btn-nova:hover { background: #00b548; box-shadow: 0 4px 14px rgba(0,200,83,.4); }
.btn-nova .material-symbols-outlined { font-size: 1.2rem; }

.spin-icon { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Cards de Resumo ───────────────────────────────────────────── */
.resumo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }

.resumo-card {
  background: white; border-radius: 14px; padding: 1.4rem 1.5rem;
  border: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.6rem;
  transition: box-shadow 0.2s;
}
.resumo-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.07); }
[data-theme="dark"] .resumo-card { background: var(--bg2); }

.rc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }

.rc-icon-wrap {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.rc-icon-wrap .material-symbols-outlined { font-size: 1.4rem; }
.rc-icon-wrap.danger  { background: #fff0f0; color: #ef4444; }
.rc-icon-wrap.success { background: #f0fdf4; color: #10b981; }
.rc-icon-wrap.neutral { background: #f0f4ff; color: #6366f1; }
[data-theme="dark"] .rc-icon-wrap.danger  { background: rgba(239,68,68,.15); }
[data-theme="dark"] .rc-icon-wrap.success { background: rgba(16,185,129,.15); }
[data-theme="dark"] .rc-icon-wrap.neutral { background: rgba(99,102,241,.15); }

.rc-badge {
  display: flex; align-items: center; gap: 4px;
  font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 20px;
}
.rc-badge .material-symbols-outlined { font-size: 0.85rem; }
.rc-badge.up { background: #fff0f0; color: #dc2626; }
.rc-badge.ok { background: #f0fdf4; color: #059669; }
.rc-badge.neutral-badge { background: #eff6ff; color: #3b82f6; }
[data-theme="dark"] .rc-badge.up { background: rgba(239,68,68,.15); color: #f87171; }
[data-theme="dark"] .rc-badge.ok { background: rgba(16,185,129,.15); color: #34d399; }
[data-theme="dark"] .rc-badge.neutral-badge { background: rgba(59,130,246,.15); color: #60a5fa; }

.rc-value { font-size: 1.65rem; font-weight: 800; color: var(--text); line-height: 1; }
.rc-value.green { color: #10b981; }
.rc-label { font-size: 0.8rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.04em; }
.rc-sub { font-size: 0.78rem; color: var(--text2); }

.rc-progress-area { margin-top: 0.2rem; }
.rc-progress-bar { height: 6px; background: var(--bg3); border-radius: 10px; overflow: hidden; margin-bottom: 5px; }
.rc-progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #a78bfa); border-radius: 10px; transition: width 0.5s ease; }
.rc-pct { font-size: 0.72rem; color: var(--text2); }

/* ── Filtros ───────────────────────────────────────────────────── */
.filter-bar {
  background: white; border: 1px solid var(--border); border-radius: 12px;
  padding: 1rem 1.4rem; display: flex; gap: 2rem; align-items: flex-end; flex-wrap: wrap;
}
[data-theme="dark"] .filter-bar { background: var(--bg2); }

.filter-group { display: flex; align-items: flex-end; gap: 0.75rem; }
.filter-icon { font-size: 1.2rem; color: var(--text2); margin-bottom: 6px; }
.filter-sep { color: var(--text2); font-size: 0.85rem; margin-bottom: 8px; }

.filter-field { display: flex; flex-direction: column; gap: 0.3rem; }
.filter-field label { font-size: 0.72rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.04em; }
.filter-field input, .filter-field select {
  padding: 0.55rem 0.8rem; border: 1px solid var(--border); border-radius: 8px;
  background: white; color: var(--text); outline: none; font-size: 0.87rem;
  transition: border-color 0.15s;
}
[data-theme="dark"] .filter-field input,
[data-theme="dark"] .filter-field select { background: var(--bg3); }
.filter-field input:focus, .filter-field select:focus { border-color: var(--primary); }

/* ── Tabela ────────────────────────────────────────────────────── */
.table-card {
  background: white; border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
}
[data-theme="dark"] .table-card { background: var(--bg2); }

.table-header { padding: 1rem 1.4rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; }
.table-count { font-size: 0.8rem; color: var(--text2); font-weight: 600; }
.table-page-info { color: var(--text2); opacity: 0.7; }

.overflow-x { overflow-x: auto; padding-bottom: 1.5rem; }
.tabela { width: 100%; border-collapse: collapse; font-size: 0.875rem; min-width: 680px; }
.tabela th {
  text-align: left; padding: 0.8rem 1rem;
  background: white; color: var(--text2);
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 2px solid var(--border);
}
[data-theme="dark"] .tabela th { background: var(--bg2); }
.tabela td { padding: 0.9rem 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tabela tr:last-child td { border-bottom: none; }
.tabela tbody tr { transition: background 0.12s; }
.tabela tbody tr:hover { background: var(--bg3); }
.tabela tbody tr.row-vencida { background: rgba(239,68,68,.03); }
[data-theme="dark"] .tabela tbody tr.row-vencida { background: rgba(239,68,68,.06); }

.date-cell { display: flex; flex-direction: column; align-items: flex-start; line-height: 1; }
.date-cell .day { font-size: 1.2rem; font-weight: 800; color: var(--text); }
.date-cell .month-yr { font-size: 0.65rem; font-weight: 700; color: var(--text2); }
.date-cell.vencido .day, .date-cell.vencido .month-yr { color: #ef4444; }

.desc-cell { display: flex; flex-direction: column; gap: 5px; }
.desc-text { font-weight: 600; color: var(--text); line-height: 1.3; }
.cat-tag {
  display: inline-block; font-size: 0.68rem; font-weight: 700;
  padding: 2px 9px; border-radius: 20px; width: fit-content;
  /* cor vem via style inline — background e color definidos pelo campo cor da categoria */
}

.fornecedor-cell { color: var(--text2); font-size: 0.85rem; }

.valor-cell { font-weight: 700; font-size: 0.95rem; font-family: 'Courier New', monospace; }
.valor-danger { color: #ef4444; }
.valor-ok { color: #10b981; }

.status-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
}
.status-badge .status-icon { font-size: 0.9rem; }
.status-badge.pago     { background: #d1fae5; color: #065f46; }
.status-badge.pendente { background: #fef9c3; color: #a16207; }
.status-badge.vencido  { background: #fee2e2; color: #991b1b; }
[data-theme="dark"] .status-badge.pago     { background: rgba(16,185,129,.2); color: #34d399; }
[data-theme="dark"] .status-badge.pendente { background: rgba(234,179,8,.15); color: #fbbf24; }
[data-theme="dark"] .status-badge.vencido  { background: rgba(239,68,68,.2); color: #f87171; }

.actions { display: flex; gap: 5px; justify-content: flex-end; }
.act-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; color: var(--text2);
}
.act-btn .material-symbols-outlined { font-size: 1rem; }
.act-btn:hover { background: var(--bg3); }
.act-btn.pay  { color: #10b981; border-color: rgba(16,185,129,.3); }
.act-btn.pay:hover  { background: rgba(16,185,129,.08); }
.act-btn.edit { color: #6366f1; border-color: rgba(99,102,241,.3); }
.act-btn.edit:hover { background: rgba(99,102,241,.08); }
.act-btn.del  { color: #ef4444; border-color: rgba(239,68,68,.3); }
.act-btn.del:hover  { background: rgba(239,68,68,.08); }

.vazio { text-align: center; padding: 4rem 2rem; color: var(--text2); }
.vazio-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
.vazio p { margin: 0; font-size: 0.9rem; }
.spinner-inline { display: inline-block; width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 8px; }

/* ── Paginação ─────────────────────────────────────────────────── */
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 1rem 1.4rem; border-top: 1px solid var(--border);
  flex-wrap: wrap;
}
.pg-btn {
  min-width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border);
  background: transparent; color: var(--text); cursor: pointer; display: flex;
  align-items: center; justify-content: center; font-size: 0.87rem; font-weight: 600;
  transition: all 0.15s; padding: 0 4px;
}
.pg-btn:hover:not(:disabled) { background: var(--bg3); border-color: var(--primary); }
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-btn .material-symbols-outlined { font-size: 1.1rem; }
.pg-num.active { background: var(--primary); color: white; border-color: var(--primary); }
.pg-ellipsis { padding: 0 4px; color: var(--text2); font-size: 0.9rem; letter-spacing: 2px; }
.pg-info { margin-left: 8px; font-size: 0.78rem; color: var(--text2); font-weight: 600; white-space: nowrap; }

/* ── Modais ────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(6px);
  z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;
}

.modal-box {
  background: white; border-radius: 16px; border: 1px solid var(--border);
  display: flex; flex-direction: column; width: 100%; max-width: 600px; max-height: 92vh; overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.18);
}
[data-theme="dark"] .modal-box { background: var(--bg2); }

/* Modal header */
.modal-header {
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: flex-start;
}
.pay-header { background: linear-gradient(135deg, rgba(16,185,129,.06) 0%, rgba(5,150,105,.04) 100%); }
[data-theme="dark"] .pay-header { background: rgba(16,185,129,.08); }

.modal-title-row { display: flex; align-items: center; gap: 0.85rem; }
.modal-header-icon {
  width: 46px; height: 46px; border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.modal-header-icon .material-symbols-outlined { font-size: 1.3rem; }
.pay-icon { background: linear-gradient(135deg, #10b981, #059669); }

.modal-title { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text); }
.modal-subtitle { margin: 2px 0 0; font-size: 0.78rem; color: var(--text2); }

.close-btn {
  background: none; border: none; cursor: pointer; color: var(--text2);
  display: flex; align-items: center; padding: 6px; border-radius: 8px;
  transition: background 0.15s; flex-shrink: 0;
}
.close-btn:hover { background: var(--bg3); }
.close-btn .material-symbols-outlined { font-size: 1.2rem; }

/* Modal body */
.modal-body { padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.1rem; }

.form-section { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.full-width { grid-column: 1 / -1; }

/* Fields */
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.73rem; font-weight: 700; color: var(--text2);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.field-icon { font-size: 0.95rem !important; }

.field input, .field select, .input-with-prefix {
  padding: 0.7rem 0.9rem; border: 1.5px solid var(--border); border-radius: 8px;
  background: white; color: var(--text); outline: none; font-size: 0.9rem;
  transition: border-color 0.15s, box-shadow 0.15s; width: 100%; box-sizing: border-box;
}
[data-theme="dark"] .field input,
[data-theme="dark"] .field select,
[data-theme="dark"] .input-with-prefix { background: var(--bg3); }
.field input:focus, .field select:focus, .input-with-prefix:focus {
  border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.12);
}

.input-lg { font-size: 0.95rem; }


/* Campo desabilitado */
.field-disabled { opacity: 0.55; }
.field-disabled .field { opacity: 1; }

.field-help { font-size: 0.73rem; color: var(--text2); margin-top: 2px; }

/* Modal footer */
.modal-footer {
  padding: 1rem 1.5rem; border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  background: #f8fafc; border-radius: 0 0 16px 16px; flex-wrap: wrap;
}
[data-theme="dark"] .modal-footer { background: var(--bg3); }

.footer-hint {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.73rem; color: var(--text2);
}
.footer-hint .material-symbols-outlined { font-size: 0.9rem; }

.footer-actions { display: flex; gap: 0.75rem; align-items: center; }

/* Botões do modal */
.btn-ghost {
  background: transparent; border: 1.5px solid var(--border); color: var(--text);
  padding: 0.65rem 1.4rem; border-radius: 8px; cursor: pointer;
  font-size: 0.875rem; font-weight: 600; transition: background 0.15s;
}
.btn-ghost:hover:not(:disabled) { background: var(--bg3); }
.btn-ghost:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-salvar {
  display: flex; align-items: center; gap: 0.45rem;
  background: #00c853; color: white; border: none;
  padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 700; cursor: pointer;
  font-size: 0.875rem; transition: background 0.15s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(0,200,83,.25);
}
.btn-salvar:hover:not(:disabled) { background: #00b548; box-shadow: 0 4px 12px rgba(0,200,83,.35); }
.btn-salvar:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
.btn-salvar .material-symbols-outlined { font-size: 1.05rem; }

/* Banner mobile decorativo */
.modal-banner {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: white; padding: 0.85rem 1.5rem;
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.82rem; font-weight: 600;
}
.banner-icon { font-size: 1rem; color: #00c853; }
.mobile-only { display: none; }

/* Card de pagamento */
.p-info-box { background: var(--bg3); border-radius: 10px; padding: 1rem; }
.p-info-title { margin: 0 0 0.75rem; font-size: 0.85rem; color: var(--text2); }
.p-card {
  display: flex; justify-content: space-between; align-items: center;
  background: white; border-radius: 8px; padding: 0.85rem 1rem;
  border-left: 4px solid #10b981; gap: 1rem;
}
[data-theme="dark"] .p-card { background: var(--bg2); }
.p-card-left { display: flex; align-items: center; gap: 0.6rem; }
.p-card-left .material-symbols-outlined { font-size: 1.1rem; color: #10b981; flex-shrink: 0; }
.p-desc { font-weight: 600; color: var(--text); font-size: 0.9rem; display: block; }
.p-cat { font-size: 0.72rem; color: var(--text2); display: block; margin-top: 2px; }
.p-val { font-family: monospace; font-size: 1.1rem; font-weight: 800; color: #10b981; white-space: nowrap; flex-shrink: 0; }

/* Animações */
.animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.text-right { text-align: right; }

/* ── Responsivo Mobile ─────────────────────────────────────────── */
@media (max-width: 768px) {
  .resumo-grid { grid-template-columns: 1fr; }
  .filter-bar { flex-direction: column; align-items: flex-start; gap: 0.75rem; padding: 0.9rem 1rem; }
  .filter-group { flex-wrap: wrap; }
  .btn-label { display: none; }

  /* Modal vira bottom sheet no mobile */
  .modal-backdrop { align-items: flex-end; padding: 0; }
  .modal-box {
    max-width: 100%; border-radius: 20px 20px 0 0; max-height: 96vh;
    border-bottom: none;
  }
  .form-row { grid-template-columns: 1fr; }
  .mobile-only { display: flex; }
  .footer-hint { display: none; }
  .footer-actions { width: 100%; }
  .footer-actions .btn-ghost,
  .footer-actions .btn-salvar { flex: 1; justify-content: center; }
  .modal-footer { flex-direction: column; }
}

@media (max-width: 560px) {
  .page-title { font-size: 1.3rem; }
  .resumo-grid { gap: 0.75rem; }
  .resumo-card { padding: 1rem 1.1rem; }
  .rc-value { font-size: 1.35rem; }
}
</style>
