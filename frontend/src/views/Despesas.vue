<template>
  <div class="page-wrap">
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">📉 Despesas</h2>
        <p class="page-sub">Gerencia as contas a pagar e controle o financeiro</p>
      </div>
      <div class="header-actions">
        <button @click="carregar" class="btn-ghost">🔄 Atualizar</button>
        <button @click="abrirNovo" class="btn-primary">+ Nova Despesa</button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card filters-card">
      <div class="filters-grid">
        <div class="field">
          <label>Vencimento De</label>
          <input v-model="filtros.ini" type="date" @change="carregar" />
        </div>
        <div class="field">
          <label>Até</label>
          <input v-model="filtros.fim" type="date" @change="carregar" />
        </div>
        <div class="field">
          <label>Status</label>
          <select v-model="filtros.status" @change="carregar">
            <option value="">Todos os Status</option>
            <option value="pendente">Pendentes / Vencidas</option>
            <option value="pago">Pagas</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tabela de Despesas -->
    <div class="card table-card overflow-x">
      <table class="tabela">
        <thead>
          <tr>
            <th>Vencimento</th>
            <th>Descrição</th>
            <th>Fornecedor</th>
            <th>Valor</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in lista" :key="d.pk">
            <td>
              <div class="date-cell">
                <span class="day">{{ new Date(d.vencimento + 'T12:00:00').getDate() }}</span>
                <span class="month">{{ new Date(d.vencimento + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).toUpperCase() }}</span>
              </div>
            </td>
            <td>
              <div class="desc-cell">
                <span class="desc-text">{{ d.descricao }}</span>
                <span v-if="d.categoria" class="category-tag">{{ d.categoria }}</span>
              </div>
            </td>
            <td class="muted">{{ d.fornecedores?.nome || '—' }}</td>
            <td class="bold mono">{{ fmt(d.valor) }}</td>
            <td>
              <span :class="['badge-status', getStatusClass(d)]">
                {{ getStatusLabel(d) }}
              </span>
            </td>
            <td class="text-right">
              <div class="actions">
                <button v-if="d.status !== 'pago'" @click="abrirBaixar(d)" class="btn-action ok" title="Pagar">✔️</button>
                <button @click="abrirEditar(d)" class="btn-action" title="Editar">✏️</button>
                <button @click="excluir(d)" class="btn-action err" title="Excluir">🗑️</button>
              </div>
            </td>
          </tr>
          <tr v-if="carregando">
            <td colspan="6" class="vazio">⏳ Carregando despesas...</td>
          </tr>
          <tr v-else-if="lista.length === 0">
            <td colspan="6" class="vazio">📭 Nenhuma despesa encontrada para os filtros aplicados.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL: NOVA / EDITAR -->
    <div v-if="modalAberto" class="modal-overlay" @click.self="modalAberto = false">
      <div class="modal-card mini">
        <div class="modal-header">
          <h3>{{ f.pk ? 'Editar Despesa' : 'Nova Despesa' }}</h3>
          <button @click="modalAberto = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="field mb-3">
            <label>Descrição *</label>
            <input v-model="f.descricao" type="text" placeholder="Ex: Aluguel, Luz, Fornecedor X" />
          </div>

          <div class="field mb-3">
            <label>Fornecedor (Opcional)</label>
            <select v-model="f.fornecedor_pk">
              <option :value="null">-- Sem Fornecedor --</option>
              <option v-for="fo in fornecedores" :key="fo.pk" :value="fo.pk">{{ fo.nome }}</option>
            </select>
          </div>

          <div class="two-cols mb-3">
            <div class="field">
              <label>Valor (R$) *</label>
              <input v-model.number="f.valor" type="number" step="0.01" />
            </div>
            <div class="field">
              <label>Vencimento *</label>
              <input v-model="f.vencimento" type="date" />
            </div>
          </div>

          <div class="field mb-3">
            <label>Categoria</label>
            <input v-model="f.categoria" type="text" list="cats-list" placeholder="Ex: Energia, Aluguel, Compras" />
            <datalist id="cats-list">
              <option value="Energia" />
              <option value="Aluguel" />
              <option value="Internet" />
              <option value="Salários" />
              <option value="Marketing" />
              <option value="Manutenção" />
            </datalist>
          </div>

          <template v-if="!f.pk">
            <div class="two-cols">
              <div class="field">
                <label>Status Inicial</label>
                <select v-model="f.status">
                  <option value="pendente">Pendente (A Pagar)</option>
                  <option value="pago">Já Pago (Baixar Agora)</option>
                </select>
              </div>
              <div v-if="f.status === 'pago'" class="field animate-fade-in">
                <label>Conta da Saída *</label>
                <select v-model="f.conta_pk">
                  <option :value="null" disabled>-- Escolha a Conta --</option>
                  <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
                </select>
              </div>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button @click="modalAberto = false" class="btn-ghost" :disabled="salvando">Cancelar</button>
          <button @click="salvar" class="btn-primary" :disabled="salvando || !podeSalvar">
            {{ salvando ? 'Salvando...' : (f.pk ? 'Atualizar' : 'Salvar Despesa') }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: BAIXAR PAGAMENTO -->
    <div v-if="modalBaixar" class="modal-overlay" @click.self="modalBaixar = false">
      <div class="modal-card mini">
        <div class="modal-header green">
          <h3>✔️ Baixar Despesa</h3>
          <button @click="modalBaixar = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="p-info mb-3">
            <p>Você está confirmando o pagamento de:</p>
            <div class="p-card">
              <span class="p-desc">{{ despesaBaixar.descricao }}</span>
              <span class="p-val">{{ fmt(despesaBaixar.valor) }}</span>
            </div>
          </div>
          <div class="field">
            <label>Conta de Origem (Saída de fundos) *</label>
            <select v-model="contaBaixarPk">
              <option :value="null" disabled>-- Selecione a conta --</option>
              <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
            </select>
            <p class="help">O valor será debitado do saldo desta conta no financeiro.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="modalBaixar = false" class="btn-ghost" :disabled="salvando">Cancelar</button>
          <button @click="confirmarPagamento" class="btn-primary ok" :disabled="salvando || !contaBaixarPk">
            {{ salvando ? 'Processando...' : 'Confirmar Pagamento' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, inject } from 'vue';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const sessaoStore = useSessaoStore();
const showToast = inject('showToast');

const lista = ref([]);
const carregando = ref(true);
const salvando = ref(false);
const modalAberto = ref(false);
const modalBaixar = ref(false);

const fornecedores = ref([]);
const contas = ref([]);

const filtros = reactive({
  ini: '',
  fim: '',
  status: ''
});

// Formulário
const f = reactive({
  pk: null,
  descricao: '',
  fornecedor_pk: null,
  valor: 0,
  vencimento: new Date().toISOString().split('T')[0],
  categoria: '',
  status: 'pendente',
  conta_pk: null
});

// Baixar
const despesaBaixar = ref(null);
const contaBaixarPk = ref(null);

onMounted(async () => {
  // Set default filter: current month
  const hj = new Date();
  const y = hj.getFullYear(), m = hj.getMonth();
  filtros.ini = new Date(y, m, 1).toISOString().split('T')[0];
  filtros.fim = new Date(y, m + 1, 0).toISOString().split('T')[0];

  await Promise.all([carregar(), carregarAuxiliares()]);
});

async function carregarAuxiliares() {
  const filial_pk = sessaoStore.filial?.pk;
  
  const { data: forn } = await supabase.from('fornecedores').select('pk, nome').eq('ativo', true).order('nome');
  fornecedores.value = forn || [];

  const { data: ct } = await supabase.from('contas_bancarias').select('pk, nome').eq('ativo', true).order('nome');
  contas.value = ct || [];
}

async function carregar() {
  carregando.value = true;
  const filial_pk = sessaoStore.filial?.pk;
  if (!filial_pk) return;

  try {
    let q = supabase.from('despesas').select('*, fornecedores(nome)').eq('filial_pk', filial_pk).order('vencimento', { ascending: true });
    
    if (filtros.ini) q = q.gte('vencimento', filtros.ini);
    if (filtros.fim) q = q.lte('vencimento', filtros.fim);
    if (filtros.status) q = q.eq('status', filtros.status);

    const { data, error } = await q;
    if (error) throw error;
    lista.value = data || [];
  } catch (e) {
    showToast('Erro ao carregar despesas: ' + e.message, 'error');
  } finally {
    carregando.value = false;
  }
}

const podeSalvar = computed(() => {
  if (!f.descricao || !f.vencimento || f.valor <= 0) return false;
  if (!f.pk && f.status === 'pago' && !f.conta_pk) return false;
  return true;
});

function abrirNovo() {
  Object.assign(f, {
    pk: null,
    descricao: '',
    fornecedor_pk: null,
    valor: 0,
    vencimento: new Date().toISOString().split('T')[0],
    categoria: '',
    status: 'pendente',
    conta_pk: null
  });
  modalAberto.value = true;
}

function abrirEditar(d) {
  Object.assign(f, {
    pk: d.pk,
    descricao: d.descricao,
    fornecedor_pk: d.fornecedor_pk,
    valor: d.valor,
    vencimento: d.vencimento,
    categoria: d.categoria || '',
    status: d.status,
    conta_pk: d.conta_pk
  });
  modalAberto.value = true;
}

async function salvar() {
  if (!podeSalvar.value) return;
  salvando.value = true;

  const payload = {
    descricao: f.descricao,
    fornecedor_pk: f.fornecedor_pk,
    valor: f.valor,
    vencimento: f.vencimento,
    categoria: f.categoria || null,
    filial_pk: sessaoStore.filial.pk
  };

  const isoNow = new Date().toISOString();

  try {
    if (f.pk) {
      const { error } = await supabase.from('despesas').update(payload).eq('pk', f.pk);
      if (error) throw error;
      showToast('Despesa atualizada com sucesso!');
    } else {
      payload.status = f.status;
      if (f.status === 'pago') {
        payload.conta_pk = f.conta_pk;
        payload.data_pagamento = isoNow;
      }
      
      const { data, error } = await supabase.from('despesas').insert([payload]).select();
      if (error) throw error;

      // Se já marcou como pago, gera movimentação financeira
      if (f.status === 'pago') {
        await supabase.from('movimentacoes_financeiras').insert([{
          conta_pk: f.conta_pk,
          tipo_movimento: 'saida',
          valor: f.valor,
          descricao: 'Pagamento de Despesa: ' + f.descricao,
          data_movimento: isoNow
        }]);
      }
      showToast('Despesa cadastrada!');
    }
    modalAberto.value = false;
    carregar();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
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

  const isoNow = new Date().toISOString();
  try {
    // 1. Criar saída no financeiro
    const { error: em } = await supabase.from('movimentacoes_financeiras').insert([{
      conta_pk: contaBaixarPk.value,
      tipo_movimento: 'saida',
      valor: despesaBaixar.value.valor,
      descricao: 'Pagamento de Despesa: ' + despesaBaixar.value.descricao,
      data_movimento: isoNow
    }]);
    if (em) throw em;

    // 2. Atualizar status da despesa
    const { error: ed } = await supabase.from('despesas').update({
      status: 'pago',
      conta_pk: contaBaixarPk.value,
      data_pagamento: isoNow
    }).eq('pk', despesaBaixar.value.pk);
    if (ed) throw ed;

    showToast('Baixa de despesa efetuada com sucesso!');
    modalBaixar.value = false;
    carregar();
  } catch (e) {
    showToast('Erro ao processar baixa: ' + e.message, 'error');
  } finally {
    salvando.value = false;
  }
}

async function excluir(d) {
  if (!confirm(`Deseja realmente excluir a despesa "${d.descricao}"?`)) return;
  try {
    const { error } = await supabase.from('despesas').delete().eq('pk', d.pk);
    if (error) throw error;
    showToast('Despesa excluída.');
    carregar();
  } catch (e) {
    showToast('Erro ao excluir: ' + e.message, 'error');
  }
}

function getStatusClass(d) {
  if (d.status === 'pago') return 'pago';
  const venc = d.vencimento;
  const hoje = new Date().toISOString().split('T')[0];
  return venc < hoje ? 'vencido' : 'pendente';
}

function getStatusLabel(d) {
  if (d.status === 'pago') return '✔️ Paga';
  const venc = d.vencimento;
  const hoje = new Date().toISOString().split('T')[0];
  return venc < hoje ? '⚠️ Vencida' : '⏳ Pendente';
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { margin: 0; font-size: 1.5rem; color: var(--text); }
.page-sub { margin: 0; font-size: 0.9rem; color: var(--text2); }

.header-actions { display: flex; gap: 0.75rem; }

.card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }

.filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.75rem; font-weight: 700; color: var(--text2); text-transform: uppercase; }
.field input, .field select { padding: 0.6rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); outline: none; }
.field .help { font-size: 0.7rem; color: var(--text2); margin-top: 4px; }

.overflow-x { overflow-x: auto; }
.tabela { width: 100%; border-collapse: collapse; font-size: 0.87rem; min-width: 700px; }
.tabela th { text-align: left; padding: 0.75rem; background: var(--bg3); color: var(--text2); font-weight: 600; border-bottom: 2px solid var(--border); }
.tabela td { padding: 0.75rem; border-bottom: 1px solid var(--border); vertical-align: middle; }

.date-cell { display: flex; flex-direction: column; line-height: 1; }
.date-cell .day { font-size: 1.1rem; font-weight: 800; color: var(--text); }
.date-cell .month { font-size: 0.65rem; color: var(--text2); font-weight: 700; }

.desc-cell { display: flex; flex-direction: column; gap: 4px; }
.desc-text { font-weight: 600; color: var(--text); }
.category-tag { font-size: 0.7rem; background: var(--bg3); padding: 2px 8px; border-radius: 4px; width: fit-content; color: var(--text2); }

.badge-status { padding: 0.25rem 0.65rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: inline-flex; }
.badge-status.pago { background: #d1fae5; color: #065f46; }
.badge-status.pendente { background: #fef3c7; color: #d97706; }
.badge-status.vencido { background: #fee2e2; color: #991b1b; }

.actions { display: flex; gap: 4px; justify-content: flex-end; }
.btn-action { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
.btn-action:hover { background: var(--border); }
.btn-action.ok { color: #10b981; border-color: rgba(16,185,129,0.3); }
.btn-action.err { color: #ef4444; border-color: rgba(239,68,68,0.3); }

.vazio { text-align: center; padding: 4rem; color: var(--text2); font-style: italic; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-card { background: var(--bg2); border-radius: 16px; border: 1px solid var(--border); display: flex; flex-direction: column; width: 100%; max-height: 90vh; }
.modal-card.mini { max-width: 500px; }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.modal-header.green { background: rgba(16,185,129,0.05); color: #10b981; }
.modal-header h3 { margin: 0; font-size: 1.1rem; }
.close-btn { background: none; border: none; color: var(--text2); font-size: 1.5rem; cursor: pointer; }
.modal-body { padding: 1.5rem; overflow-y: auto; }
.modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.75rem; background: var(--bg3); border-radius: 0 0 16px 16px; }

.two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.mb-3 { margin-bottom: 1rem; }

.p-card { background: var(--bg3); padding: 1rem; border-radius: 8px; border-left: 4px solid #10b981; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.p-desc { font-weight: 600; }
.p-val { font-family: monospace; font-size: 1.1rem; font-weight: 700; color: #10b981; }

.btn-primary { background: #667eea; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-primary.ok { background: #10b981; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 0.6rem 1.5rem; border-radius: 8px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

.text-right { text-align: right; }
.bold { font-weight: 700; }
.mono { font-family: monospace; }
.muted { color: var(--text2); }
</style>
