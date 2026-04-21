<template>
  <div class="page-wrap">
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">💳 Gestão Financeira</h2>
        <p class="page-sub">Acompanhe contas bancárias, caixa e movimentações financeiras</p>
      </div>
    </div>

    <!-- Abas -->
    <div class="tabs">
      <button :class="['tab-btn', { active: tabAtiva === 'contas' }]" @click="mudarTab('contas')">
        <span class="material-symbols-outlined">account_balance</span> 🏥 Minhas Contas
      </button>
      <button :class="['tab-btn', { active: tabAtiva === 'nova-conta' }]" @click="mudarTab('nova-conta')">
        <span class="material-symbols-outlined">add_circle</span> ➕ Nova Conta
      </button>
      <button :class="['tab-btn', { active: tabAtiva === 'extrato' }]" @click="mudarTab('extrato')">
        <span class="material-symbols-outlined">receipt_long</span> 🧾 Extrato Geral
      </button>
      <button :class="['tab-btn', { active: tabAtiva === 'formas' }]" @click="mudarTab('formas')">
        <span class="material-symbols-outlined">payments</span> 💳 Formas de Pagamento
      </button>
    </div>

    <!-- CONTEÚDO DAS ABAS -->
    <div class="card tab-content">
      
      <!-- ABA: MINHAS CONTAS -->
      <div v-if="tabAtiva === 'contas'" class="animate-fade">
        <div class="tab-header">
          <h3>Visão Geral de Saldos</h3>
          <button @click="carregarContas" class="btn-ghost sm">🔄 Atualizar</button>
        </div>

        <div v-if="carregandoContas" class="vazio">⏳ Carregando contas financeiras...</div>
        <div v-else-if="contas.length === 0" class="vazio-state">
           <span class="material-symbols-outlined large">account_balance_wallet</span>
           <p>Nenhuma conta financeira cadastrada.</p>
           <button @click="tabAtiva = 'nova-conta'" class="btn-primary sm">Cadastrar Agora</button>
        </div>
        <div v-else class="contas-grid">
          <div v-for="c in contas" :key="c.pk" class="conta-card">
            <div class="conta-main">
              <div class="conta-icon-wrap">
                <span class="material-symbols-outlined">{{ getContaIcon(c.tipo) }}</span>
              </div>
              <div class="conta-info">
                <span class="conta-nome">{{ c.nome }}</span>
                <span class="conta-tipo">{{ c.tipo.toUpperCase() }}</span>
              </div>
              <button @click="excluirConta(c)" class="del-btn" title="Excluir conta">🗑️</button>
            </div>
            <div class="conta-footer">
              <span class="label">Saldo Atual</span>
              <span :class="['saldo', { neg: c.saldo < 0 }]">{{ fmt(c.saldo) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ABA: NOVA CONTA -->
      <div v-if="tabAtiva === 'nova-conta'" class="animate-fade">
        <div class="form-container">
          <h3 class="mb-4">Cadastrar Nova Conta</h3>
          <div class="field mb-3">
            <label>Nome da Conta</label>
            <input v-model="formConta.nome" type="text" placeholder="Ex: Caixa Diário, NuBank, Itaú..." />
          </div>
          <div class="field mb-3">
            <label>Tipo de Conta</label>
            <select v-model="formConta.tipo">
              <option value="pix">📱 Pix</option>
              <option value="debito">💳 Cartão de Débito</option>
              <option value="credito">💳 Cartão de Crédito</option>
              <option value="dinheiro">💵 Dinheiro em Espécie (Caixa)</option>
            </select>
          </div>
          <div class="field mb-4">
            <label>Saldo Inicial (R$)</label>
            <input v-model.number="formConta.saldo" type="number" step="0.01" />
          </div>
          <div class="actions">
            <button @click="salvarConta" class="btn-primary" :disabled="!formConta.nome || processando">
              {{ processando ? 'Salvando...' : 'Salvar Conta' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ABA: EXTRATO -->
      <div v-if="tabAtiva === 'extrato'" class="animate-fade">
        <div class="mov-filters mb-4">
          <div class="field mw-200">
            <label>Filtrar por Conta</label>
            <select v-model="filtroContaPk" @change="carregarExtrato">
              <option :value="null">Todas as Contas</option>
              <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
            </select>
          </div>
          <button @click="carregarExtrato" class="btn-ghost sm">🔄 Atualizar Extrato</button>
        </div>

        <div class="table-wrap overflow-x">
          <table class="tabela">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Conta</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in extrato" :key="m.pk">
                <td class="muted">{{ dtFmt(m.data_movimento) }}</td>
                <td class="bold">{{ m.contas_bancarias?.nome || '—' }}</td>
                <td>
                  <span :class="['tag-tipo', m.tipo_movimento]">
                    {{ m.tipo_movimento === 'entrada' ? 'Entrada' : 'Saída' }}
                  </span>
                </td>
                <td class="desc-cell">
                  {{ m.descricao || '—' }}
                  <span v-if="m.venda_pk" class="ref">Venda #{{ m.venda_pk }}</span>
                </td>
                <td :class="['text-right bold mono', m.tipo_movimento]">
                  {{ m.tipo_movimento === 'entrada' ? '+' : '-' }} {{ fmt(m.valor) }}
                </td>
              </tr>
              <tr v-if="carregandoExtrato">
                <td colspan="5" class="vazio">⏳ Carregando movimentações...</td>
              </tr>
              <tr v-else-if="extrato.length === 0">
                <td colspan="5" class="vazio">Nenhuma movimentação registrada.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ABA: FORMAS DE PAGAMENTO -->
      <div v-if="tabAtiva === 'formas'" class="animate-fade">
        <div class="tab-header align-start mb-4">
          <div>
            <h3>Formas de Pagamento no PDV</h3>
            <p class="muted sm">Ative ou desative quais formas aparecem no PDV.</p>
          </div>
          <button @click="abrirNovaForma" class="btn-primary sm">+ Nova Forma</button>
        </div>

        <div v-if="carregandoFormas" class="vazio">⏳ Carregando...</div>
        <div v-else class="formas-grid">
          <div v-for="f in formas" :key="f.pk" :class="['forma-card', { inativo: !f.ativo }]">
            <span class="forma-icon">{{ f.icone }}</span>
            <div class="forma-info">
              <span class="forma-label">{{ f.label }}</span>
              <span class="forma-id">{{ f.forma }}</span>
            </div>
            <div class="forma-actions">
               <span :class="['status-chip', { active: f.ativo }]">
                 {{ f.ativo ? 'Ativo' : 'Inativo' }}
               </span>
               <button @click="toggleForma(f)" class="btn-toggle">
                 {{ f.ativo ? 'Desativar' : 'Ativar' }}
               </button>
               <button @click="excluirForma(f)" class="del-ico">🗑️</button>
            </div>
          </div>
        </div>

        <!-- FORM NOVA FORMA -->
        <div v-if="mostrandoNovaForma" class="modal-overlay" @click.self="mostrandoNovaForma = false">
           <div class="modal-card mini animate-slide-up">
              <div class="modal-header">
                <h3>Adicionar Nova Forma</h3>
                <button @click="mostrandoNovaForma = false" class="close-btn">×</button>
              </div>
              <div class="modal-body">
                <div class="field mb-3">
                  <label>Identificador Interno (sem espaços, ex: vale)</label>
                  <input v-model="formForma.forma" type="text" placeholder="vale" />
                </div>
                <div class="field mb-3">
                  <label>Nome Exibido</label>
                  <input v-model="formForma.label" type="text" placeholder="Vale" />
                </div>
                <div class="field">
                  <label>Ícone (emoji)</label>
                  <input v-model="formForma.icone" type="text" placeholder="🎟️" style="max-width: 80px" />
                </div>
              </div>
              <div class="modal-footer">
                <button @click="mostrandoNovaForma = false" class="btn-ghost">Cancelar</button>
                <button @click="salvarNovaForma" class="btn-primary" :disabled="!formForma.forma || !formForma.label || processando">
                  Salvar
                </button>
              </div>
           </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const sessaoStore = useSessaoStore();
const showToast = inject('showToast');

const tabAtiva = ref('contas');
const contas = ref([]);
const extrato = ref([]);
const formas = ref([]);
const carregandoContas = ref(false);
const carregandoExtrato = ref(false);
const carregandoFormas = ref(false);
const processando = ref(false);

const filtroContaPk = ref(null);

const formConta = reactive({
  nome: '',
  tipo: 'pix',
  saldo: 0
});

const formForma = reactive({
  forma: '',
  label: '',
  icone: '💳'
});
const mostrandoNovaForma = ref(false);

onMounted(() => {
  carregarContas();
});

function mudarTab(tab) {
  tabAtiva.value = tab;
  if (tab === 'contas') carregarContas();
  if (tab === 'extrato') carregarExtrato();
  if (tab === 'formas') carregarFormas();
}

async function carregarContas() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  carregandoContas.value = true;
  try {
    const { data, error } = await supabase.from('contas_bancarias').select('*').eq('filial_pk', fil).order('nome');
    if (error) throw error;
    contas.value = data || [];
  } catch (e) {
    showToast('Erro ao carregar contas: ' + e.message, 'error');
  } finally {
    carregandoContas.value = false;
  }
}

async function salvarConta() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  processando.value = true;
  try {
    const { error } = await supabase.from('contas_bancarias').insert([{
      filial_pk: fil,
      nome: formConta.nome,
      tipo: formConta.tipo,
      saldo: formConta.saldo
    }]);
    if (error) throw error;
    showToast('Conta bancária cadastrada!');
    formConta.nome = '';
    formConta.saldo = 0;
    mudarTab('contas');
  } catch (e) {
    showToast('Erro ao salvar conta: ' + e.message, 'error');
  } finally {
    processando.value = false;
  }
}

async function carregarExtrato() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  carregandoExtrato.value = true;
  try {
    let q = supabase.from('movimentacoes_financeiras')
      .select('*, contas_bancarias(nome, filial_pk)')
      .order('data_movimento', { ascending: false })
      .limit(100);

    if (filtroContaPk.value) {
      q = q.eq('conta_pk', filtroContaPk.value);
    } else {
      // Filtrar apenas contas da filial logada
      const { data: contasFilial } = await supabase.from('contas_bancarias').select('pk').eq('filial_pk', fil);
      const pks = (contasFilial || []).map(c => c.pk);
      if (pks.length) q = q.in('conta_pk', pks);
      else { extrato.value = []; return; }
    }

    const { data, error } = await q;
    if (error) throw error;
    extrato.value = data || [];
  } catch (e) {
    showToast('Erro ao carregar extrato: ' + e.message, 'error');
  } finally {
    carregandoExtrato.value = false;
  }
}

async function carregarFormas() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  carregandoFormas.value = true;
  try {
    const { data, error } = await supabase.from('formas_pagamento').select('*').eq('filial_pk', fil).order('ordem');
    if (error) throw error;
    
    if (!data || data.length === 0) {
      // Seed default forms if none
      const defaults = [
        { forma: 'dinheiro', label: 'Dinheiro', icone: '💵', ordem: 0, ativo: true, filial_pk: fil },
        { forma: 'pix', label: 'Pix', icone: '📱', ordem: 1, ativo: true, filial_pk: fil },
        { forma: 'credito', label: 'Crédito', icone: '💳', ordem: 2, ativo: true, filial_pk: fil },
        { forma: 'debito', label: 'Débito', icone: '💳', ordem: 3, ativo: true, filial_pk: fil },
        { forma: 'crediario', label: 'Crediário', icone: '📒', ordem: 4, ativo: true, filial_pk: fil }
      ];
      await supabase.from('formas_pagamento').insert(defaults);
      const { data: fresh } = await supabase.from('formas_pagamento').select('*').eq('filial_pk', fil).order('ordem');
      formas.value = fresh || [];
    } else {
      formas.value = data;
    }
  } catch (e) {
    showToast('Erro ao carregar formas: ' + e.message, 'error');
  } finally {
    carregandoFormas.value = false;
  }
}

async function toggleForma(f) {
  try {
    const { error } = await supabase.from('formas_pagamento').update({ ativo: !f.ativo }).eq('pk', f.pk);
    if (error) throw error;
    f.ativo = !f.ativo;
  } catch (e) {
    showToast('Erro ao atualizar forma: ' + e.message, 'error');
  }
}

async function excluirForma(f) {
  if (!confirm(`Deseja excluir a forma "${f.label}"?`)) return;
  try {
    const { error } = await supabase.from('formas_pagamento').delete().eq('pk', f.pk);
    if (error) throw error;
    formas.value = formas.value.filter(item => item.pk !== f.pk);
  } catch (e) {
    showToast('Erro ao excluir: ' + e.message, 'error');
  }
}

function abrirNovaForma() {
  formForma.forma = '';
  formForma.label = '';
  formForma.icone = '💳';
  mostrandoNovaForma.value = true;
}

async function salvarNovaForma() {
  const fil = sessaoStore.filial?.pk;
  processando.value = true;
  try {
    const formaId = formForma.forma.trim().toLowerCase().replace(/\s+/g,'_');
    const { error } = await supabase.from('formas_pagamento').insert([{
      filial_pk: fil,
      forma: formaId,
      label: formForma.label,
      icone: formForma.icone,
      ativo: true,
      ordem: formas.value.length
    }]);
    if (error) throw error;
    showToast('Nova forma adicionada!');
    mostrandoNovaForma.value = false;
    carregarFormas();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  } finally {
    processando.value = false;
  }
}

async function excluirConta(c) {
  if (!confirm(`Deseja realmente excluir a conta "${c.nome}"? Movimentações antigas não serão apagadas.`)) return;
  try {
    const { error } = await supabase.from('contas_bancarias').delete().eq('pk', c.pk);
    if (error) throw error;
    showToast('Conta excluída.');
    carregarContas();
  } catch (e) {
    showToast('Erro ao excluir: ' + e.message, 'error');
  }
}

function getContaIcon(tipo) {
  const map = {
    pix: 'qr_code',
    dinheiro: 'payments',
    debito: 'credit_card',
    credito: 'add_card',
    caixa: 'point_of_sale'
  };
  return map[tipo] || 'account_balance_wallet';
}

function dtFmt(dStr) {
  if (!dStr) return '—';
  const d = new Date(dStr);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 1rem; }
.page-header { margin-bottom: 1rem; }
.page-title { margin: 0; font-size: 1.5rem; color: var(--text); }
.page-sub { margin: 0; font-size: 0.9rem; color: var(--text2); }

.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border); overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab-btn { padding: 12px 24px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text2); cursor: pointer; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; white-space: nowrap; transition: all 0.2s; }
.tab-btn .material-symbols-outlined { font-size: 18px; }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-btn:hover { color: var(--text); }

.tab-content { min-height: 400px; padding: 1.5rem; margin-top: -2px; }

.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.tab-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text); }

.contas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.conta-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; transition: transform 0.2s, box-shadow 0.2s; }
.conta-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: var(--accent); }

.conta-main { display: flex; align-items: center; gap: 12px; }
.conta-icon-wrap { width: 44px; height: 44px; background: rgba(99,102,241,0.1); color: var(--accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.conta-icon-wrap .material-symbols-outlined { font-size: 24px; }
.conta-info { flex: 1; display: flex; flex-direction: column; }
.conta-nome { font-weight: 700; color: var(--text); font-size: 1rem; }
.conta-tipo { font-size: 0.7rem; color: var(--text2); letter-spacing: 0.5px; }

.del-btn { background: none; border: none; font-size: 14px; cursor: pointer; opacity: 0.3; transition: opacity 0.2s; }
.del-btn:hover { opacity: 1; }

.conta-footer { display: flex; flex-direction: column; gap: 2px; }
.conta-footer .label { font-size: 0.75rem; color: var(--text2); }
.conta-footer .saldo { font-family: monospace; font-size: 1.5rem; font-weight: 700; color: #10b981; }
.conta-footer .saldo.neg { color: #ef4444; }

.form-container { max-width: 500px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.75rem; font-weight: 700; color: var(--text2); text-transform: uppercase; }
.field input, .field select { padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); outline: none; }
.field .help { font-size: 0.7rem; color: var(--text2); }
.mw-200 { max-width: 250px; }

.mov-filters { display: flex; align-items: flex-end; gap: 1rem; padding: 1rem; background: var(--bg3); border-radius: 10px; border: 1px solid var(--border); flex-wrap: wrap; }

.tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.tabela th { text-align: left; padding: 0.75rem; background: var(--bg3); color: var(--text2); border-bottom: 2px solid var(--border); }
.tabela td { padding: 0.75rem; border-bottom: 1px solid var(--border); }

.tag-tipo { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
.tag-tipo.entrada { background: #d1fae5; color: #065f46; }
.tag-tipo.saida { background: #fee2e2; color: #991b1b; }

.desc-cell { color: var(--text); }
.desc-cell .ref { display: block; font-size: 10px; color: var(--text2); }

.text-right.entrada { color: #10b981; }
.text-right.saida { color: #ef4444; }

.formas-grid { display: flex; flex-direction: column; gap: 8px; max-width: 600px; }
.forma-card { display: flex; align-items: center; gap: 12px; padding: 1rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; transition: all 0.2s; }
.forma-card.inativo { opacity: 0.6; grayscale: 100%; }
.forma-icon { font-size: 24px; }
.forma-info { flex: 1; display: flex; flex-direction: column; }
.forma-label { font-weight: 700; color: var(--text); }
.forma-id { font-size: 10px; font-family: monospace; color: var(--text2); }

.forma-actions { display: flex; align-items: center; gap: 10px; }
.status-chip { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; background: var(--border); color: var(--text2); }
.status-chip.active { background: #d1fae5; color: #065f46; }
.btn-toggle { background: var(--bg2); border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; color: var(--text); }
.del-ico { background: none; border: none; cursor: pointer; opacity: 0.3; }
.del-ico:hover { opacity: 1; }

.vazio-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; color: var(--text2); gap: 1rem; }
.vazio-state .large { font-size: 3rem; opacity: 0.3; }

.vazio { text-align: center; padding: 3rem; color: var(--text2); }

.btn-primary { background: var(--accent); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
.btn-primary.sm { padding: 0.4rem 1rem; font-size: 0.8rem; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-ghost.sm { padding: 0.4rem 1rem; font-size: 0.8rem; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }
.text-right { text-align: right; }
.bold { font-weight: 700; }
.mono { font-family: monospace; }
.muted { color: var(--text2); }
.sm { font-size: 0.75rem; }

.animate-fade { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-card { background: var(--bg2); border-radius: 16px; border: 1px solid var(--border); display: flex; flex-direction: column; width: 100%; max-height: 90vh; }
.modal-card.mini { max-width: 450px; }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.75rem; background: var(--bg3); border-radius: 0 0 16px 16px; }
.close-btn { background: none; border: none; color: var(--text2); font-size: 1.5rem; cursor: pointer; }

.overflow-x { overflow-x: auto; }
</style>
