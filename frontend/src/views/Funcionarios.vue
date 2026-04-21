<template>
  <div class="fn-wrap">

    <!-- Cabeçalho -->
    <div class="fn-header">
      <div>
        <h1 class="fn-title">Funcionários</h1>
        <span class="fn-sub">Cadastro e gestão de colaboradores</span>
      </div>
      <button class="btn-novo" @click="abrirNovo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Funcionário
      </button>
    </div>

    <!-- Filtros -->
    <div class="fn-filtros">
      <div class="search-wrap">
        <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
        <input v-model="busca" type="text" placeholder="Buscar por nome, CPF ou matrícula…" class="fn-input search-input" />
      </div>
      <div class="filtro-tabs">
        <button :class="['ftab', { active: filtro === 'todos' }]"    @click="filtro = 'todos'">Todos</button>
        <button :class="['ftab', { active: filtro === 'ativos' }]"   @click="filtro = 'ativos'">Ativos</button>
        <button :class="['ftab', { active: filtro === 'inativos' }]" @click="filtro = 'inativos'">Inativos</button>
        <button :class="['ftab', { active: filtro === 'diaristas' }]" @click="filtro = 'diaristas'">Diaristas</button>
      </div>
    </div>

    <!-- Cards resumo -->
    <div class="resumo-grid" v-if="lista.length">
      <div class="resumo-card">
        <span class="rc-num">{{ lista.filter(f => f.ativo).length }}</span>
        <span class="rc-label">Ativos</span>
      </div>
      <div class="resumo-card">
        <span class="rc-num">{{ lista.filter(f => !f.ativo).length }}</span>
        <span class="rc-label">Inativos</span>
      </div>
      <div class="resumo-card">
        <span class="rc-num">{{ lista.filter(f => f.diarista).length }}</span>
        <span class="rc-label">Diaristas</span>
      </div>
      <div class="resumo-card">
        <span class="rc-num">{{ fmt(lista.filter(f => f.ativo && !f.diarista).reduce((s,f) => s + parseFloat(f.salario_mensal||0), 0)) }}</span>
        <span class="rc-label">Folha mensal</span>
      </div>
    </div>

    <!-- Loading / vazio -->
    <div v-if="carregando" class="estado-msg">
      <span class="spin"></span> Carregando…
    </div>
    <div v-else-if="!filtrados.length" class="estado-msg muted">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".3"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      <p>Nenhum funcionário encontrado</p>
    </div>

    <!-- Tabela -->
    <div v-else class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Matrícula</th>
            <th>CPF</th>
            <th>Tipo</th>
            <th>Salário / Diária</th>
            <th>Horário</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in filtrados" :key="f.pk" class="fn-row">
            <td>
              <div class="fn-nome-cell">
                <div class="fn-avatar">{{ f.nome[0].toUpperCase() }}</div>
                <div>
                  <span class="fn-nome">{{ f.nome }}</span>
                  <span v-if="f.data_nascimento" class="fn-nasc">{{ fmtDate(f.data_nascimento) }}</span>
                </div>
              </div>
            </td>
            <td class="td-mono">{{ f.matricula || '—' }}</td>
            <td class="td-mono td-muted">{{ f.cpf || '—' }}</td>
            <td>
              <span :class="['badge-tipo', f.diarista ? 'diarista' : 'mensalista']">
                {{ f.diarista ? 'Diarista' : 'Mensalista' }}
              </span>
            </td>
            <td class="td-mono">
              {{ f.diarista ? fmt(f.valor_diaria) + '/dia' : fmt(f.salario_mensal) + '/mês' }}
            </td>
            <td class="td-muted td-mono">{{ f.hora_entrada?.slice(0,5) }} – {{ f.hora_saida?.slice(0,5) }}</td>
            <td>
              <span :class="['badge-status', f.ativo ? 'ativo' : 'inativo']">
                {{ f.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="td-acoes">
              <button class="btn-editar" @click="abrirEditar(f)" title="Editar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-toggle" @click="toggleAtivo(f)" :title="f.ativo ? 'Desativar' : 'Ativar'">
                <svg v-if="f.ativo" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="tabela-rodape">{{ filtrados.length }} funcionário(s)</div>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="fn-toast" :class="toastTipo">
        <svg v-if="toastTipo==='ok'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toastMsg }}
      </div>
    </Transition>

    <!-- Modal cadastro/edição -->
    <Teleport to="body">
      <div v-if="modal" class="modal-backdrop" @click.self="fecharModal">
        <div class="modal-box">

          <div class="modal-header">
            <h2 class="modal-title">{{ form.pk ? 'Editar Funcionário' : 'Novo Funcionário' }}</h2>
            <button class="modal-close" @click="fecharModal">×</button>
          </div>

          <div class="modal-body">

            <!-- Seção: Identificação -->
            <div class="form-section">
              <span class="form-section-title">Identificação</span>
              <div class="form-grid">
                <div class="form-field span2">
                  <label>Nome completo *</label>
                  <input v-model="form.nome" type="text" class="fn-input" placeholder="Nome do funcionário" />
                </div>
                <div class="form-field">
                  <label>CPF</label>
                  <input v-model="form.cpf" type="text" class="fn-input" placeholder="000.000.000-00" maxlength="14" @input="maskCpf" />
                </div>
                <div class="form-field">
                  <label>Matrícula</label>
                  <input v-model="form.matricula" type="text" class="fn-input" placeholder="001" />
                </div>
                <div class="form-field">
                  <label>Data de nascimento</label>
                  <input v-model="form.data_nascimento" type="date" class="fn-input" />
                </div>
                <div class="form-field">
                  <label>Nome da mãe</label>
                  <input v-model="form.nome_mae" type="text" class="fn-input" placeholder="Nome da mãe" />
                </div>
                <div class="form-field">
                  <label>Nome do pai</label>
                  <input v-model="form.nome_pai" type="text" class="fn-input" placeholder="Nome do pai" />
                </div>
              </div>
            </div>

            <!-- Seção: Tipo de contrato -->
            <div class="form-section">
              <span class="form-section-title">Tipo de contrato</span>
              <div class="tipo-toggle">
                <button :class="['tipo-btn', { active: !form.diarista }]" @click="form.diarista = false">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  Mensalista
                </button>
                <button :class="['tipo-btn', { active: form.diarista }]" @click="form.diarista = true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Diarista
                </button>
              </div>
              <div class="form-grid" style="margin-top:12px">
                <div v-if="!form.diarista" class="form-field">
                  <label>Salário mensal (R$)</label>
                  <input v-model.number="form.salario_mensal" type="number" min="0" step="0.01" class="fn-input" placeholder="0,00" />
                </div>
                <div v-if="form.diarista" class="form-field">
                  <label>Valor da diária (R$)</label>
                  <input v-model.number="form.valor_diaria" type="number" min="0" step="0.01" class="fn-input" placeholder="0,00" />
                </div>
              </div>
            </div>

            <!-- Seção: Horário -->
            <div class="form-section">
              <span class="form-section-title">Horário de trabalho</span>
              <div class="form-grid">
                <div class="form-field">
                  <label>Entrada</label>
                  <input v-model="form.hora_entrada" type="time" class="fn-input" />
                </div>
                <div class="form-field">
                  <label>Saída</label>
                  <input v-model="form.hora_saida" type="time" class="fn-input" />
                </div>
                <div class="form-field">
                  <label>Carga horária/dia (h)</label>
                  <input v-model.number="form.carga_horaria_diaria" type="number" min="0" step="0.5" class="fn-input" placeholder="8" />
                </div>
                <div class="form-field">
                  <label>Intervalo (min)</label>
                  <input v-model.number="form.minutos_intervalo" type="number" min="0" class="fn-input" placeholder="60" />
                </div>
              </div>
            </div>

            <!-- Seção: Banco de horas -->
            <div class="form-section" v-if="!form.diarista">
              <span class="form-section-title">Banco de horas</span>
              <div class="form-grid">
                <div class="form-field">
                  <label>Saldo inicial (horas)</label>
                  <input v-model.number="form.saldo_inicial_banco" type="number" step="0.01" class="fn-input" placeholder="0" />
                </div>
                <div class="form-field">
                  <label>Horas p/ fechamento</label>
                  <input v-model.number="form.horas_fechamento" type="number" step="0.01" class="fn-input" placeholder="220" />
                </div>
              </div>
            </div>

            <!-- Ativo -->
            <div class="form-section">
              <label class="check-label">
                <input v-model="form.ativo" type="checkbox" class="fn-check" />
                <span>Funcionário ativo</span>
              </label>
            </div>

          </div>

          <div class="modal-footer">
            <button class="modal-btn cancel" @click="fecharModal">Cancelar</button>
            <button class="modal-btn save" :disabled="salvando || !form.nome?.trim()" @click="salvar">
              <span v-if="salvando" class="spin-xs"></span>
              {{ salvando ? 'Salvando…' : (form.pk ? 'Salvar alterações' : 'Cadastrar') }}
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';

const sessaoStore = useSessaoStore();
const lista       = ref([]);
const carregando  = ref(true);
const busca       = ref('');
const filtro      = ref('todos');
const modal       = ref(false);
const salvando    = ref(false);
const toastMsg    = ref('');
const toastTipo   = ref('ok');
let   _toastTimer = null;

const formVazio = () => ({
  pk: null, nome: '', cpf: '', matricula: '', data_nascimento: '',
  nome_mae: '', nome_pai: '', salario_mensal: 0, valor_diaria: 0,
  hora_entrada: '08:00', hora_saida: '17:00', carga_horaria_diaria: 8,
  minutos_intervalo: 60, saldo_inicial_banco: 0, horas_fechamento: 220,
  diarista: false, ativo: true,
});
const form = ref(formVazio());

function toast(msg, tipo = 'ok', dur = 3500) {
  clearTimeout(_toastTimer);
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  _toastTimer = setTimeout(() => { toastMsg.value = ''; }, dur);
}

const filtrados = computed(() => {
  let l = lista.value;
  const q = busca.value.trim().toLowerCase();
  if (q) l = l.filter(f =>
    f.nome.toLowerCase().includes(q) ||
    (f.cpf || '').includes(q) ||
    (f.matricula || '').toLowerCase().includes(q)
  );
  if (filtro.value === 'ativos')    l = l.filter(f => f.ativo);
  if (filtro.value === 'inativos')  l = l.filter(f => !f.ativo);
  if (filtro.value === 'diaristas') l = l.filter(f => f.diarista);
  return l;
});

onMounted(carregar);

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase.from('funcionarios').select('*').order('nome');
    if (sessaoStore.filial?.pk) {
      q = q.or(`filial_pk.eq.${sessaoStore.filial.pk},filial_pk.is.null`);
    }
    const { data, error } = await q;
    if (error) throw error;
    lista.value = data || [];
  } catch (e) {
    toast('Erro ao carregar: ' + e.message, 'err');
  } finally {
    carregando.value = false;
  }
}

function abrirNovo() {
  form.value = formVazio();
  modal.value = true;
}

function abrirEditar(f) {
  form.value = { ...f };
  // Normaliza horários (remove segundos se vier HH:MM:SS)
  if (form.value.hora_entrada?.length > 5) form.value.hora_entrada = form.value.hora_entrada.slice(0, 5);
  if (form.value.hora_saida?.length   > 5) form.value.hora_saida   = form.value.hora_saida.slice(0, 5);
  modal.value = true;
}

function fecharModal() {
  modal.value = false;
}

async function salvar() {
  if (!form.value.nome?.trim()) return;
  salvando.value = true;
  try {
    const payload = {
      filial_pk:           sessaoStore.filial?.pk || null,
      nome:                form.value.nome.trim(),
      cpf:                 form.value.cpf || null,
      matricula:           form.value.matricula || null,
      data_nascimento:     form.value.data_nascimento || null,
      nome_mae:            form.value.nome_mae || null,
      nome_pai:            form.value.nome_pai || null,
      salario_mensal:      form.value.diarista ? 0 : (form.value.salario_mensal || 0),
      valor_diaria:        form.value.diarista ? (form.value.valor_diaria || 0) : 0,
      hora_entrada:        form.value.hora_entrada || '08:00',
      hora_saida:          form.value.hora_saida   || '17:00',
      carga_horaria_diaria: form.value.carga_horaria_diaria || 8,
      minutos_intervalo:   form.value.minutos_intervalo || 60,
      saldo_inicial_banco: form.value.saldo_inicial_banco || 0,
      horas_fechamento:    form.value.horas_fechamento || 0,
      diarista:            !!form.value.diarista,
      ativo:               !!form.value.ativo,
    };

    let error;
    if (form.value.pk) {
      ({ error } = await supabase.from('funcionarios').update(payload).eq('pk', form.value.pk));
    } else {
      ({ error } = await supabase.from('funcionarios').insert(payload));
    }
    if (error) throw error;

    toast(form.value.pk ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
    fecharModal();
    await carregar();
  } catch (e) {
    toast('Erro: ' + e.message, 'err', 6000);
  } finally {
    salvando.value = false;
  }
}

async function toggleAtivo(f) {
  const { error } = await supabase.from('funcionarios').update({ ativo: !f.ativo }).eq('pk', f.pk);
  if (error) { toast('Erro: ' + error.message, 'err'); return; }
  toast(f.ativo ? `${f.nome} desativado.` : `${f.nome} ativado.`);
  await carregar();
}

function maskCpf() {
  let v = form.value.cpf.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2')
       .replace(/(\d{3})(\d)/, '$1.$2')
       .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  form.value.cpf = v;
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtDate(d) {
  if (!d) return '';
  const [y, m, dia] = d.split('-');
  return `${dia}/${m}/${y}`;
}
</script>

<style scoped>
.fn-wrap { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }

/* Cabeçalho */
.fn-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.fn-title  { margin: 0; font-size: 1.4rem; font-weight: 700; color: var(--text); }
.fn-sub    { font-size: .8rem; color: var(--text2); }

.btn-novo {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 18px;
  background: #6366f1; color: #fff;
  border: none; border-radius: 9px;
  font-size: .875rem; font-weight: 600; cursor: pointer;
  transition: opacity .15s;
}
.btn-novo:hover { opacity: .88; }

/* Filtros */
.fn-filtros { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search-wrap { position: relative; display: flex; align-items: center; flex: 1; min-width: 200px; }
.search-ico  { position: absolute; left: 10px; color: var(--text2); pointer-events: none; }
.search-input { padding-left: 32px !important; width: 100%; }

.fn-input {
  width: 100%; padding: 8px 12px;
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: .875rem;
  outline: none; transition: border-color .15s;
}
.fn-input:focus { border-color: #6366f1; }

.filtro-tabs { display: flex; gap: 4px; }
.ftab {
  padding: 7px 14px; background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text2); font-size: .8rem; font-weight: 600;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.ftab:hover  { color: var(--text); border-color: #6366f1; }
.ftab.active { background: #6366f1; border-color: #6366f1; color: #fff; }

/* Resumo */
.resumo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.resumo-card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 18px;
  display: flex; flex-direction: column; gap: 2px;
}
.rc-num   { font-size: 1.3rem; font-weight: 800; font-family: monospace; color: var(--text); }
.rc-label { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--text2); }

/* Estado */
.estado-msg {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 10px; padding: 60px 20px;
  color: var(--text2); font-size: .9rem;
}

/* Tabela */
.tabela-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.tabela { width: 100%; border-collapse: collapse; font-size: .875rem; }
.tabela thead th {
  padding: 11px 14px; background: var(--bg3);
  text-align: left; font-size: .72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px;
  color: var(--text2); border-bottom: 2px solid var(--border); white-space: nowrap;
}
.tabela tbody td { padding: 12px 14px; border-bottom: 1px solid var(--border); color: var(--text); }
.tabela tbody tr:last-child td { border-bottom: none; }
.tabela tbody tr:hover td { background: var(--bg3); }

.fn-nome-cell { display: flex; align-items: center; gap: 10px; }
.fn-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff; font-weight: 700; font-size: .9rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.fn-nome  { display: block; font-weight: 600; font-size: .875rem; }
.fn-nasc  { display: block; font-size: .75rem; color: var(--text2); }
.td-mono  { font-family: monospace; font-size: .82rem; }
.td-muted { color: var(--text2); }

.badge-tipo {
  display: inline-block; padding: 2px 10px; border-radius: 20px;
  font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
}
.badge-tipo.mensalista { background: rgba(99,102,241,.12); color: #4338ca; border: 1px solid rgba(99,102,241,.25); }
.badge-tipo.diarista   { background: rgba(245,158,11,.12);  color: #92400e; border: 1px solid rgba(245,158,11,.25); }

.badge-status {
  display: inline-block; padding: 2px 10px; border-radius: 20px;
  font-size: .72rem; font-weight: 700; letter-spacing: .3px;
}
.badge-status.ativo   { background: rgba(16,185,129,.12); color: #065f46; border: 1px solid rgba(16,185,129,.25); }
.badge-status.inativo { background: rgba(107,114,128,.12); color: var(--text2); border: 1px solid var(--border); }

.td-acoes { white-space: nowrap; display: flex; gap: 6px; align-items: center; }
.btn-editar, .btn-toggle {
  width: 30px; height: 30px; border-radius: 7px;
  border: 1px solid var(--border); background: var(--bg3);
  color: var(--text2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.btn-editar:hover  { color: #6366f1; border-color: #6366f1; background: rgba(99,102,241,.08); }
.btn-toggle:hover  { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,.08); }

.tabela-rodape { padding: 10px 14px; font-size: .78rem; color: var(--text2); text-align: right; border-top: 1px solid var(--border); }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; width: 100%; max-width: 680px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 24px 60px rgba(0,0,0,.4); overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.modal-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text); }
.modal-close {
  background: none; border: none; color: var(--text2); font-size: 22px;
  line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 6px;
  transition: color .15s;
}
.modal-close:hover { color: var(--text); }

.modal-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }

.form-section { display: flex; flex-direction: column; gap: 12px; }
.form-section-title {
  font-size: .7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .6px; color: var(--text2);
  padding-bottom: 6px; border-bottom: 1px solid var(--border);
}
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-field { display: flex; flex-direction: column; gap: 5px; }
.form-field.span2 { grid-column: span 2; }
.form-field label { font-size: .75rem; font-weight: 600; color: var(--text2); }

.tipo-toggle { display: flex; gap: 8px; }
.tipo-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px; background: var(--bg3); border: 2px solid var(--border);
  border-radius: 10px; color: var(--text2); font-size: .875rem; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.tipo-btn:hover  { border-color: #6366f1; color: var(--text); }
.tipo-btn.active { background: rgba(99,102,241,.1); border-color: #6366f1; color: #4338ca; }

.check-label {
  display: flex; align-items: center; gap: 10px;
  font-size: .875rem; font-weight: 500; color: var(--text); cursor: pointer;
}
.fn-check { width: 16px; height: 16px; cursor: pointer; accent-color: #6366f1; }

.modal-footer {
  display: flex; gap: 10px; padding: 16px 20px;
  border-top: 1px solid var(--border); flex-shrink: 0;
}
.modal-btn {
  flex: 1; padding: 10px; border-radius: 9px;
  font-size: .875rem; font-weight: 600; cursor: pointer;
  border: none; transition: opacity .15s;
}
.modal-btn.cancel { background: var(--bg3); color: var(--text2); border: 1px solid var(--border); }
.modal-btn.cancel:hover { color: var(--text); }
.modal-btn.save   { background: #6366f1; color: #fff; }
.modal-btn.save:hover:not(:disabled) { opacity: .88; }
.modal-btn.save:disabled { opacity: .4; cursor: not-allowed; }

/* Toast */
.fn-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  z-index: 10000; display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; border-radius: 10px; font-size: .875rem; font-weight: 500;
  white-space: nowrap; pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,.25);
}
.fn-toast.ok  { background: #052e16; color: #6ee7b7; border: 1px solid rgba(16,185,129,.3); }
.fn-toast.err { background: #1f0707; color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
.toast-enter-active { transition: all .25s ease; }
.toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* Spinners */
.spin {
  display: inline-block; width: 18px; height: 18px;
  border: 2px solid rgba(99,102,241,.2); border-top-color: #6366f1;
  border-radius: 50%; animation: spin .7s linear infinite;
}
.spin-xs {
  display: inline-block; width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .resumo-grid { grid-template-columns: repeat(2, 1fr); }
  .form-grid   { grid-template-columns: 1fr; }
  .form-field.span2 { grid-column: span 1; }
  .filtro-tabs { overflow-x: auto; }
}
</style>
