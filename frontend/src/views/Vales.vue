<template>
  <div class="vl-wrap animate-fade">

    <div class="vl-header">
      <div>
        <h2 class="vl-title">Vales</h2>
        <p class="vl-sub">Solicitações de adiantamento salarial</p>
      </div>
      <button class="btn-solicitar" @click="abrirSolicitar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Solicitar Vale
      </button>
    </div>

    <!-- Cards de status -->
    <div class="vl-stats">
      <div v-for="s in statusOpts" :key="s.v" :class="['stat-card', s.v, { active: filtroStatus === s.v }]" @click="filtroStatus = s.v">
        <span class="stat-count">{{ contagem(s.v) }}</span>
        <span class="stat-label">{{ s.label }}</span>
      </div>
      <div :class="['stat-card', 'todos', { active: filtroStatus === '' }]" @click="filtroStatus = ''">
        <span class="stat-count">{{ vales.length }}</span>
        <span class="stat-label">Todos</span>
      </div>
    </div>

    <!-- Aviso gestor não configurado -->
    <div v-if="op?.admin && !gestorPk" class="vl-aviso">
      <span class="material-symbols-outlined">warning</span>
      Nenhum gestor configurado para aprovação de vales. Configure em <strong>Parâmetros → Vales</strong>.
    </div>

    <!-- Tabela -->
    <div v-if="carregando" class="vl-state">
      <span class="spin"></span> Carregando…
    </div>
    <div v-else-if="!filtrados.length" class="vl-state muted">
      Nenhum vale encontrado
    </div>
    <div v-else class="vl-table-wrap">
      <table class="vl-table">
        <thead>
          <tr>
            <th>Funcionário</th>
            <th>Valor</th>
            <th>Motivo</th>
            <th>Data</th>
            <th>Status</th>
            <th style="text-align:center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in filtrados" :key="v.pk">
            <td class="vl-func">{{ v.funcionario_nome }}</td>
            <td class="vl-valor">{{ fmt(v.valor) }}</td>
            <td class="vl-motivo">{{ v.motivo || '—' }}</td>
            <td class="vl-data">{{ fmtData(v.solicitado_em) }}</td>
            <td>
              <span :class="['vl-badge', v.status]">{{ labelStatus(v.status) }}</span>
              <div v-if="v.observacao && v.status === 'rejeitado'" class="vl-obs">{{ v.observacao }}</div>
            </td>
            <td class="vl-acoes">
              <div class="vl-acoes-inner">
                <template v-if="ehGestor && v.status === 'pendente'">
                  <button class="btn-act aprovar" @click="aprovar(v)" :disabled="processando === v.pk">Aprovar</button>
                  <button class="btn-act rejeitar" @click="iniciarRejeitar(v)" :disabled="processando === v.pk">Rejeitar</button>
                </template>
                <button v-if="ehGestor && v.status === 'aprovado'" class="btn-act pagar" @click="pagar(v)" :disabled="processando === v.pk">
                  <span v-if="processando === v.pk" class="spin-xs"></span>
                  <span v-else>Marcar Pago</span>
                </button>
                <span v-if="v.status === 'descontado'" class="vl-disc-info">
                  <span class="material-symbols-outlined" style="font-size:14px">check_circle</span>
                  Descontado
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Solicitar Vale -->
    <Teleport to="body">
      <div v-if="modalAberto" class="modal-backdrop" @click.self="fecharModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Solicitar Vale</h3>
            <button class="modal-close" @click="fecharModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="vl-form-field">
              <label>Solicitante</label>
              <input :value="form.funcionario_nome" type="text" readonly class="vl-input readonly" />
            </div>
            <div class="vl-form-field">
              <label>Valor (R$) <span class="obrig">*</span></label>
              <input v-model.number="form.valor" type="number" min="0.01" step="0.01" placeholder="0,00" class="vl-input" />
            </div>
            <div class="vl-form-field">
              <label>Motivo <span class="opt">(opcional)</span></label>
              <textarea v-model="form.motivo" class="vl-input" rows="3" placeholder="Descreva o motivo do adiantamento…"></textarea>
            </div>
            <div v-if="!gestorPk && !op?.admin" class="vl-aviso-modal">
              <span class="material-symbols-outlined">info</span>
              Nenhum gestor configurado. O vale ficará pendente até ser avaliado por um administrador.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancelar" @click="fecharModal">Cancelar</button>
            <button class="btn-salvar-modal" @click="solicitar" :disabled="salvando || !form.valor || form.valor <= 0">
              <span v-if="salvando" class="spin-xs"></span>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Enviar Solicitação
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Confirmar Pagamento -->
    <Teleport to="body">
      <div v-if="modalPagar" class="modal-backdrop" @click.self="modalPagar = null">
        <div class="modal-box modal-box-sm">
          <div class="modal-header">
            <h3 class="modal-title">Confirmar Pagamento</h3>
            <button class="modal-close" @click="modalPagar = null">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="pagar-info">
              Confirmar pagamento de <strong>{{ fmt(modalPagar.valor) }}</strong> para <strong>{{ modalPagar.funcionario_nome }}</strong>?
            </p>
            <p class="pagar-sub">Esta ação marcará o vale como pago e não poderá ser desfeita.</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancelar" @click="modalPagar = null">Cancelar</button>
            <button class="btn-pagar-confirm" @click="confirmarPagar" :disabled="processando === modalPagar?.pk">
              <span v-if="processando === modalPagar?.pk" class="spin-xs"></span>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Confirmar Pagamento
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Rejeitar -->
    <Teleport to="body">
      <div v-if="modalRejeitar" class="modal-backdrop" @click.self="modalRejeitar = null">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Rejeitar Vale</h3>
            <button class="modal-close" @click="modalRejeitar = null">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="rej-info">Vale de <strong>{{ modalRejeitar.funcionario_nome }}</strong> no valor de <strong>{{ fmt(modalRejeitar.valor) }}</strong>.</p>
            <div class="vl-form-field">
              <label>Motivo da rejeição <span class="opt">(opcional)</span></label>
              <textarea v-model="rejObs" class="vl-input" rows="3" placeholder="Informe o motivo para o funcionário…"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancelar" @click="modalRejeitar = null">Cancelar</button>
            <button class="btn-rejeitar-confirm" @click="confirmarRejeitar" :disabled="processando === modalRejeitar?.pk">
              <span v-if="processando === modalRejeitar?.pk" class="spin-xs"></span>
              Confirmar Rejeição
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Transition name="toast">
      <div v-if="toastMsg" :class="['vl-toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessaoStore }     from '../stores/sessao';
import { useParametrosStore } from '../stores/parametros';
import { supabase }           from '../composables/useSupabase';
import apiClient              from '../services/api';

const sessao     = useSessaoStore();
const parametros = useParametrosStore();

const op = computed(() => sessao.operador);

const vales        = ref([]);
const carregando   = ref(true);
const filtroStatus = ref('');
const processando  = ref(null);
const salvando     = ref(false);

const modalAberto   = ref(false);
const modalRejeitar = ref(null);
const modalPagar    = ref(null);
const rejObs        = ref('');

const form = ref({ funcionario_nome: '', funcionario_pk: null, valor: null, motivo: '' });

const toastMsg  = ref('');
const toastTipo = ref('ok');
let _timer = null;
function toast(msg, tipo = 'ok', dur = 3500) {
  clearTimeout(_timer);
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  _timer = setTimeout(() => { toastMsg.value = ''; }, dur);
}

const gestorPk = computed(() => parametros.getParam('vale_gestor_pk', null));

const ehGestor = computed(() => {
  const gPk = gestorPk.value;
  if (!gPk) return op.value?.admin === true;
  return String(op.value?.id) === String(gPk);
});

const meuFuncionarioPk   = ref(null);
const meuFuncionarioNome = ref('');

async function resolverFuncionario() {
  meuFuncionarioNome.value = op.value?.nome || '';
  const matricula = op.value?.matricula;
  if (!matricula) return;
  const { data } = await supabase
    .from('funcionarios').select('pk, nome').eq('matricula', matricula).maybeSingle();
  if (data) {
    meuFuncionarioPk.value   = data.pk;
    meuFuncionarioNome.value = data.nome;
  }
}

const statusOpts = [
  { v: 'pendente',   label: 'Pendente' },
  { v: 'aprovado',   label: 'Aprovado' },
  { v: 'pago',       label: 'Pago' },
  { v: 'rejeitado',  label: 'Rejeitado' },
  { v: 'descontado', label: 'Descontado' },
];

function labelStatus(s) {
  return statusOpts.find(x => x.v === s)?.label || s;
}

function contagem(s) {
  return vales.value.filter(v => v.status === s).length;
}

const filtrados = computed(() =>
  filtroStatus.value ? vales.value.filter(v => v.status === filtroStatus.value) : vales.value
);

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function carregar() {
  carregando.value = true;
  try {
    const filial_pk = sessao.filial?.pk;
    const params = { filial_pk };

    if (!ehGestor.value && !op.value?.admin) {
      if (meuFuncionarioPk.value) {
        params.funcionario_pk = meuFuncionarioPk.value;
      }
    }

    const { data } = await apiClient.get('/api/vales', { params });

    // Filtro extra client-side: garante que operadores sem vínculo de matrícula
    // só vejam vales com seu nome (quando funcionario_pk é null no registro)
    if (!ehGestor.value && !op.value?.admin) {
      const nome = meuFuncionarioNome.value.toLowerCase();
      vales.value = (data || []).filter(v =>
        (meuFuncionarioPk.value && v.funcionario_pk === meuFuncionarioPk.value) ||
        (!v.funcionario_pk && v.funcionario_nome?.toLowerCase() === nome)
      );
    } else {
      vales.value = data || [];
    }
  } catch (e) {
    toast('Erro ao carregar vales: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function abrirSolicitar() {
  form.value = {
    funcionario_nome: meuFuncionarioNome.value,
    funcionario_pk:   meuFuncionarioPk.value,
    valor: null,
    motivo: '',
  };
  modalAberto.value = true;
}

function fecharModal() {
  modalAberto.value = false;
}

async function solicitar() {
  if (!form.value.valor || form.value.valor <= 0) return;
  salvando.value = true;
  try {
    await apiClient.post('/api/vales', {
      filial_pk:        sessao.filial?.pk,
      funcionario_pk:   form.value.funcionario_pk,
      funcionario_nome: form.value.funcionario_nome,
      valor:            form.value.valor,
      motivo:           form.value.motivo || null,
    });
    toast('Solicitação enviada com sucesso!');
    fecharModal();
    await carregar();
  } catch (e) {
    toast('Erro ao solicitar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    salvando.value = false;
  }
}

async function aprovar(v) {
  processando.value = v.pk;
  try {
    await apiClient.patch(`/api/vales/${v.pk}/aprovar`, { aprovado_por: op.value?.nome });
    toast('Vale aprovado!');
    await carregar();
  } catch (e) {
    toast('Erro ao aprovar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    processando.value = null;
  }
}

function iniciarRejeitar(v) {
  rejObs.value    = '';
  modalRejeitar.value = v;
}

async function confirmarRejeitar() {
  const v = modalRejeitar.value;
  if (!v) return;
  processando.value = v.pk;
  try {
    await apiClient.patch(`/api/vales/${v.pk}/rejeitar`, { observacao: rejObs.value });
    toast('Vale rejeitado.');
    modalRejeitar.value = null;
    await carregar();
  } catch (e) {
    toast('Erro ao rejeitar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    processando.value = null;
  }
}

function pagar(v) {
  modalPagar.value = v;
}

async function confirmarPagar() {
  const v = modalPagar.value;
  if (!v) return;
  processando.value = v.pk;
  try {
    await apiClient.patch(`/api/vales/${v.pk}/pagar`);
    toast('Vale marcado como pago!');
    modalPagar.value = null;
    await carregar();
  } catch (e) {
    toast('Erro ao registrar pagamento: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    processando.value = null;
  }
}

onMounted(async () => {
  await parametros.carregar(sessao.filial?.pk);
  await resolverFuncionario();
  await carregar();
});
</script>

<style scoped>
.vl-wrap { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }

/* Header */
.vl-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.vl-title { margin: 0; font-size: 1.4rem; font-weight: 700; color: var(--text); }
.vl-sub   { margin: 2px 0 0; font-size: .8rem; color: var(--text2); }

.btn-solicitar {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 18px; background: var(--primary); color: #fff;
  border: none; border-radius: 10px; font-size: .85rem; font-weight: 700;
  cursor: pointer; transition: opacity .15s; white-space: nowrap;
}
.btn-solicitar:hover { opacity: .88; }

/* Stats */
.vl-stats {
  display: flex; gap: 10px; flex-wrap: wrap;
}
.stat-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 12px 20px; background: var(--bg2); border: 2px solid var(--border);
  border-radius: 12px; cursor: pointer; transition: all .15s; min-width: 80px;
}
.stat-card:hover  { border-color: var(--primary); }
.stat-card.active { background: rgba(99,102,241,.1); border-color: var(--primary); }
.stat-card.pendente.active   { border-color: #f59e0b; background: rgba(245,158,11,.08); }
.stat-card.aprovado.active   { border-color: #10b981; background: rgba(16,185,129,.08); }
.stat-card.pago.active       { border-color: #6366f1; background: rgba(99,102,241,.08); }
.stat-card.rejeitado.active  { border-color: #ef4444; background: rgba(239,68,68,.08); }
.stat-card.descontado.active { border-color: #94a3b8; background: rgba(148,163,184,.08); }
.stat-count { font-size: 1.5rem; font-weight: 700; color: var(--text); line-height: 1; }
.stat-label { font-size: .7rem; font-weight: 600; color: var(--text2); margin-top: 3px; text-transform: uppercase; letter-spacing: .4px; }

/* Aviso */
.vl-aviso {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: rgba(245,158,11,.08);
  border: 1px solid rgba(245,158,11,.25); border-radius: 10px;
  font-size: .82rem; color: #d97706;
}
.vl-aviso .material-symbols-outlined { font-size: 18px; }

/* Estado */
.vl-state { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 40px; font-size: .9rem; color: var(--text); }
.vl-state.muted { color: var(--text2); }

/* Tabela */
.vl-table-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.vl-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
.vl-table thead tr { background: var(--bg3); }
.vl-table th { padding: 10px 14px; text-align: left; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); border-bottom: 1px solid var(--border); }
.vl-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.vl-table tbody tr:last-child td { border-bottom: none; }
.vl-table tbody tr:hover td { background: var(--bg3); }

.vl-func  { font-weight: 600; }
.vl-valor { font-family: monospace; font-weight: 700; color: var(--primary); }
.vl-motivo { color: var(--text2); font-size: .82rem; max-width: 200px; }
.vl-data  { color: var(--text2); font-size: .8rem; white-space: nowrap; }
.vl-obs   { font-size: .73rem; color: #ef4444; margin-top: 3px; font-style: italic; }

/* Badge de status */
.vl-badge {
  display: inline-block; padding: 3px 9px; border-radius: 20px;
  font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
}
.vl-badge.pendente   { background: rgba(245,158,11,.15); color: #d97706; }
.vl-badge.aprovado   { background: rgba(16,185,129,.15); color: #059669; }
.vl-badge.pago       { background: rgba(99,102,241,.15); color: #6366f1; }
.vl-badge.rejeitado  { background: rgba(239,68,68,.15);  color: #dc2626; }
.vl-badge.descontado { background: rgba(148,163,184,.15);color: #64748b; }

/* Ações */
.vl-acoes { width: 1%; white-space: nowrap; }
.vl-acoes-inner { display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-act {
  padding: 5px 12px; border-radius: 7px; font-size: .78rem; font-weight: 600;
  cursor: pointer; border: 1px solid; transition: all .15s;
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
}
.btn-act:disabled { opacity: .4; cursor: not-allowed; }
.btn-act.aprovar  { background: rgba(16,185,129,.1); border-color: rgba(16,185,129,.3); color: #059669; }
.btn-act.aprovar:hover:not(:disabled) { background: rgba(16,185,129,.2); }
.btn-act.rejeitar { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #dc2626; }
.btn-act.rejeitar:hover:not(:disabled) { background: rgba(239,68,68,.2); }
.btn-act.pagar    { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.3); color: #6366f1; }
.btn-act.pagar:hover:not(:disabled) { background: rgba(99,102,241,.2); }
.vl-disc-info { display: inline-flex; align-items: center; gap: 4px; font-size: .78rem; color: var(--text2); }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 16px;
}
.modal-box {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; width: 100%; max-width: 460px;
  display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.4);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--border);
}
.modal-title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); }
.modal-close {
  background: none; border: none; cursor: pointer; color: var(--text2);
  padding: 4px; border-radius: 6px; display: flex; align-items: center;
  transition: color .15s;
}
.modal-close:hover { color: var(--text); }
.modal-body  { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer {
  padding: 14px 20px 18px; display: flex; gap: 8px; justify-content: flex-end;
  border-top: 1px solid var(--border);
}

.vl-form-field { display: flex; flex-direction: column; gap: 5px; }
.vl-form-field label { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text2); }
.vl-input {
  width: 100%; padding: 9px 12px; background: var(--bg3); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-family: inherit; font-size: .9rem;
  outline: none; transition: border-color .15s; box-sizing: border-box; resize: vertical;
}
.vl-input:focus { border-color: var(--primary); }
.vl-input.readonly { opacity: .65; cursor: default; }
.obrig { color: #ef4444; }
.opt   { font-weight: 400; text-transform: none; letter-spacing: 0; }

.vl-aviso-modal {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px; background: rgba(99,102,241,.08);
  border: 1px solid rgba(99,102,241,.2); border-radius: 8px;
  font-size: .8rem; color: var(--text2);
}
.vl-aviso-modal .material-symbols-outlined { font-size: 17px; flex-shrink: 0; margin-top: 1px; }
.rej-info { margin: 0; font-size: .88rem; color: var(--text2); }
.rej-info strong { color: var(--text); }

.modal-box-sm { max-width: 400px; }
.pagar-info { margin: 0; font-size: .92rem; color: var(--text); }
.pagar-info strong { color: var(--primary); }
.pagar-sub  { margin: 8px 0 0; font-size: .78rem; color: var(--text2); }

.btn-pagar-confirm {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 18px; background: #059669; color: #fff;
  border: none; border-radius: 8px; font-size: .85rem; font-weight: 700;
  cursor: pointer; transition: opacity .15s;
}
.btn-pagar-confirm:disabled { opacity: .4; cursor: not-allowed; }
.btn-pagar-confirm:hover:not(:disabled) { opacity: .88; }

.btn-cancelar {
  padding: 8px 16px; background: var(--bg3); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text2); font-size: .85rem; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.btn-cancelar:hover { color: var(--text); border-color: var(--primary); }
.btn-salvar-modal {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 18px; background: var(--primary); color: #fff;
  border: none; border-radius: 8px; font-size: .85rem; font-weight: 700;
  cursor: pointer; transition: opacity .15s;
}
.btn-salvar-modal:disabled { opacity: .4; cursor: not-allowed; }
.btn-salvar-modal:hover:not(:disabled) { opacity: .88; }
.btn-rejeitar-confirm {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 18px; background: #dc2626; color: #fff;
  border: none; border-radius: 8px; font-size: .85rem; font-weight: 700;
  cursor: pointer; transition: opacity .15s;
}
.btn-rejeitar-confirm:disabled { opacity: .4; cursor: not-allowed; }
.btn-rejeitar-confirm:hover:not(:disabled) { opacity: .88; }

/* Spinner */
.spin { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.2); border-top-color: var(--primary); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-xs { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.vl-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  z-index: 9999; padding: 12px 22px; border-radius: 10px;
  font-size: .85rem; font-weight: 600; white-space: nowrap;
  pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,.3);
}
.vl-toast.ok  { background: #052e16; color: #6ee7b7; border: 1px solid rgba(16,185,129,.3); }
.vl-toast.err { background: #1f0707; color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
.toast-enter-active { transition: all .25s ease; }
.toast-leave-active { transition: all .3s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(12px); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(12px); }

@media (max-width: 700px) {
  .vl-stats { gap: 8px; }
  .stat-card { padding: 10px 14px; min-width: 60px; }
  .vl-table th:nth-child(3),
  .vl-table td:nth-child(3) { display: none; }
}
</style>
