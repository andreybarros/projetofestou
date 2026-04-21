<template>
  <div class="cr-wrap">

    <!-- Cabeçalho -->
    <div class="cr-header">
      <div class="cr-header-left">
        <h1 class="cr-title">Contas a Receber</h1>
        <span class="cr-subtitle">Crediário e pagamentos pendentes</span>
      </div>
      <div class="cr-header-right">
        <div class="search-wrap">
          <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <input v-model="busca" type="text" placeholder="Cliente ou nº venda…" class="cr-input search-input" />
        </div>
        <select v-model="filtroStatus" class="cr-select">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="vencido">Vencido</option>
          <option value="recebido">Recebido</option>
        </select>
        <button class="btn-refresh" @click="carregar" :disabled="carregando" title="Atualizar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" :class="{ spinning: carregando }"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </div>
    </div>

    <!-- Cards de totais -->
    <div v-if="lista.length" class="totais-grid">
      <div class="total-card pend">
        <div class="tc-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <span class="tc-label">Pendente</span>
          <span class="tc-val">{{ fmt(totalPendente) }}</span>
          <span class="tc-count">{{ contPendente }} conta(s)</span>
        </div>
      </div>
      <div class="total-card venc">
        <div class="tc-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
          <span class="tc-label">Vencido</span>
          <span class="tc-val">{{ fmt(totalVencido) }}</span>
          <span class="tc-count">{{ contVencido }} conta(s)</span>
        </div>
      </div>
      <div class="total-card rec">
        <div class="tc-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
          <span class="tc-label">Recebido</span>
          <span class="tc-val">{{ fmt(totalRecebido) }}</span>
          <span class="tc-count">{{ contRecebido }} conta(s)</span>
        </div>
      </div>
    </div>

    <!-- Estado vazio / loading -->
    <div v-if="carregando" class="estado-msg">
      <span class="spin"></span> Carregando…
    </div>
    <div v-else-if="!filtrados.length" class="estado-msg muted">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".3"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
      <p>Nenhuma conta encontrada</p>
    </div>

    <!-- Tabela -->
    <div v-else class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Data venda</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th v-if="temFormaRecebimento">Recebido via</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in filtrados" :key="v.pk" :class="['cr-row', statusConta(v)]">
            <td class="td-num">#{{ v.numero }}</td>
            <td class="td-cliente">{{ v.cliente || '—' }}</td>
            <td class="td-muted">{{ v.vendedor || '—' }}</td>
            <td class="td-muted td-mono">{{ fmtDate(v.criado_em) }}</td>
            <td class="td-mono" :class="{ 'td-venc': statusConta(v) === 'vencido' }">
              {{ fmtDateOnly(v.data_vencimento_crediario) }}
            </td>
            <td class="td-val">{{ fmt(v.total) }}</td>
            <td>
              <span :class="['badge', statusConta(v)]">{{ labelStatus(statusConta(v)) }}</span>
            </td>
            <td v-if="temFormaRecebimento" class="td-muted td-forma">
              {{ v.forma_recebimento ? v.forma_recebimento.charAt(0).toUpperCase() + v.forma_recebimento.slice(1) : '—' }}
            </td>
            <td class="td-acoes">
              <button
                v-if="v.status_crediario === 'pendente'"
                class="btn-receber"
                :disabled="recebendoPk === v.pk"
                @click="receber(v)"
              >
                <span v-if="recebendoPk === v.pk" class="spin-xs"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Receber
              </button>
              <button
                v-if="v.status_crediario === 'recebido'"
                class="btn-desfazer"
                @click="desfazer(v)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                Desfazer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="tabela-rodape">{{ filtrados.length }} conta(s) exibida(s)</div>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="cr-toast" :class="toastTipo">
        <svg v-if="toastTipo === 'ok'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toastMsg }}
      </div>
    </Transition>

    <!-- Modal: Receber pagamento -->
    <Teleport to="body">
      <div v-if="recebModal" class="modal-backdrop" @click.self="recebModal = null">
        <div class="modal-box">
          <div class="modal-icon receber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="modal-info">
            <span class="modal-label">Venda #{{ recebModal.numero }}</span>
            <span class="modal-valor">{{ fmt(recebModal.total) }}</span>
            <span class="modal-cliente">{{ recebModal.cliente || 'Cliente não informado' }}</span>
          </div>
          <div class="modal-field">
            <label class="modal-field-label">Forma de recebimento</label>
            <div class="forma-grid">
              <button
                v-for="f in formas"
                :key="f.val"
                :class="['forma-btn', { active: formaRecebimento === f.val }]"
                @click="formaRecebimento = f.val"
              >
                <span class="forma-ico">{{ f.ico }}</span>
                {{ f.label }}
              </button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn cancel" @click="recebModal = null">Cancelar</button>
            <button class="modal-btn confirm receber" :disabled="!formaRecebimento" @click="confirmarReceber">
              Confirmar Recebimento
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Desfazer -->
    <Teleport to="body">
      <div v-if="desfazModal" class="modal-backdrop" @click.self="desfazModal = null">
        <div class="modal-box">
          <div class="modal-icon desfazer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
          </div>
          <p class="modal-msg">Desfazer recebimento da venda <strong>#{{ desfazModal.numero }}</strong>?</p>
          <div class="modal-actions">
            <button class="modal-btn cancel" @click="desfazModal = null">Cancelar</button>
            <button class="modal-btn confirm desfazer" @click="confirmarDesfazer">Confirmar</button>
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

const sessaoStore  = useSessaoStore();
const lista        = ref([]);
const carregando   = ref(true);
const busca        = ref('');
const filtroStatus = ref('');
const recebendoPk       = ref(null);
const temFormaRecebimento = ref(false);
const recebModal     = ref(null);
const desfazModal    = ref(null);
const formaRecebimento = ref('');
const toastMsg       = ref('');
const toastTipo      = ref('ok');
let   _toastTimer    = null;

const formas = [
  { val: 'dinheiro', label: 'Dinheiro', ico: '💵' },
  { val: 'pix',      label: 'PIX',      ico: '📲' },
  { val: 'credito',  label: 'Crédito',  ico: '💳' },
  { val: 'debito',   label: 'Débito',   ico: '🏧' },
  { val: 'vale',     label: 'Vale',     ico: '🎫' },
];

const hoje = new Date().toISOString().slice(0, 10);

function toast(msg, tipo = 'ok', dur = 3500) {
  clearTimeout(_toastTimer);
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  _toastTimer = setTimeout(() => { toastMsg.value = ''; }, dur);
}

function statusConta(v) {
  if (v.status_crediario === 'recebido') return 'recebido';
  if (v.data_vencimento_crediario && v.data_vencimento_crediario < hoje) return 'vencido';
  return 'pendente';
}

function labelStatus(s) {
  return { recebido: 'Recebido', vencido: 'Vencido', pendente: 'Pendente' }[s];
}

const filtrados = computed(() => {
  let l = lista.value;
  const q = busca.value.trim().toLowerCase();
  if (q) l = l.filter(v =>
    (v.cliente || '').toLowerCase().includes(q) ||
    String(v.numero).includes(q)
  );
  if (filtroStatus.value) l = l.filter(v => statusConta(v) === filtroStatus.value);
  return l;
});

const totalPendente  = computed(() => lista.value.filter(v => statusConta(v) === 'pendente').reduce((s, v) => s + parseFloat(v.total || 0), 0));
const totalVencido   = computed(() => lista.value.filter(v => statusConta(v) === 'vencido').reduce((s, v) => s + parseFloat(v.total || 0), 0));
const totalRecebido  = computed(() => lista.value.filter(v => statusConta(v) === 'recebido').reduce((s, v) => s + parseFloat(v.total || 0), 0));
const contPendente   = computed(() => lista.value.filter(v => statusConta(v) === 'pendente').length);
const contVencido    = computed(() => lista.value.filter(v => statusConta(v) === 'vencido').length);
const contRecebido   = computed(() => lista.value.filter(v => statusConta(v) === 'recebido').length);

onMounted(carregar);

async function carregar() {
  carregando.value = true;
  try {
    const resultado = await tentarCarregar(true);
    if (resultado.error?.code === '42703') {
      // coluna forma_recebimento ainda não existe — busca sem ela
      const fallback = await tentarCarregar(false);
      if (fallback.error) throw fallback.error;
      lista.value = fallback.data || [];
      temFormaRecebimento.value = false;
    } else {
      if (resultado.error) throw resultado.error;
      lista.value = resultado.data || [];
      temFormaRecebimento.value = true;
    }
  } catch (e) {
    toast('Erro ao carregar: ' + e.message, 'err');
  } finally {
    carregando.value = false;
  }
}

async function tentarCarregar(comForma) {
  const campos = comForma
    ? 'pk, numero, criado_em, cliente, vendedor, total, status_crediario, data_vencimento_crediario, forma_recebimento'
    : 'pk, numero, criado_em, cliente, vendedor, total, status_crediario, data_vencimento_crediario';
  let q = supabase
    .from('vendas')
    .select(campos)
    .not('data_vencimento_crediario', 'is', null)
    .order('data_vencimento_crediario', { ascending: true });
  if (sessaoStore.filial?.pk) q = q.eq('filial_pk', sessaoStore.filial.pk);
  return await q;
}

function receber(v) {
  formaRecebimento.value = '';
  recebModal.value = v;
}

function desfazer(v) {
  desfazModal.value = v;
}

async function confirmarReceber() {
  const v = recebModal.value;
  recebModal.value = null;
  recebendoPk.value = v.pk;
  const { error } = await supabase.from('vendas')
    .update({ status_crediario: 'recebido', forma_recebimento: formaRecebimento.value })
    .eq('pk', v.pk);
  recebendoPk.value = null;
  if (error) { toast('Erro: ' + error.message, 'err'); return; }
  toast(`Venda #${v.numero} recebida via ${formaRecebimento.value}.`);
  await carregar();
}

async function confirmarDesfazer() {
  const v = desfazModal.value;
  desfazModal.value = null;
  const { error } = await supabase.from('vendas')
    .update({ status_crediario: 'pendente', forma_recebimento: null })
    .eq('pk', v.pk);
  if (error) { toast('Erro: ' + error.message, 'err'); return; }
  toast(`Venda #${v.numero} voltou para pendente.`);
  await carregar();
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtDateOnly(d) {
  if (!d) return '—';
  const [y, m, dia] = d.split('-');
  return `${dia}/${m}/${y}`;
}
</script>

<style scoped>
.cr-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 40px;
}

/* Cabeçalho */
.cr-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
}
.cr-header-left { display: flex; flex-direction: column; gap: 3px; }
.cr-title   { margin: 0; font-size: 1.4rem; font-weight: 700; color: var(--text); }
.cr-subtitle { font-size: .8rem; color: var(--text2); }
.cr-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.search-wrap   { position: relative; display: flex; align-items: center; }
.search-ico    { position: absolute; left: 10px; color: var(--text2); pointer-events: none; }
.search-input  { padding: 8px 12px 8px 32px !important; min-width: 220px; }

.cr-input {
  padding: 8px 12px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: .875rem;
  outline: none;
  transition: border-color .15s;
}
.cr-input:focus { border-color: var(--accent, #6366f1); }

.cr-select {
  padding: 8px 12px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: .875rem;
  cursor: pointer;
  outline: none;
}

.btn-refresh {
  padding: 8px 10px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text2);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color .15s, border-color .15s;
}
.btn-refresh:hover { color: var(--text); border-color: var(--accent, #6366f1); }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }
.spinning { animation: spin .7s linear infinite; }

/* Totais */
.totais-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.total-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  border-left-width: 4px;
}
.total-card.pend { border-left-color: #f59e0b; }
.total-card.venc { border-left-color: #ef4444; }
.total-card.rec  { border-left-color: #10b981; }

.tc-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.total-card.pend .tc-icon { background: rgba(245,158,11,.12); color: #d97706; }
.total-card.venc .tc-icon { background: rgba(239,68,68,.12);  color: #ef4444; }
.total-card.rec  .tc-icon { background: rgba(16,185,129,.12); color: #10b981; }

.tc-label { display: block; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); margin-bottom: 2px; }
.tc-val   { display: block; font-size: 1.2rem; font-weight: 700; font-family: monospace; color: var(--text); }
.tc-count { display: block; font-size: .72rem; color: var(--text2); margin-top: 2px; }

/* Estado */
.estado-msg {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 60px 20px;
  color: var(--text2); font-size: .9rem;
}
.estado-msg.muted { color: var(--text2); opacity: .7; }

/* Tabela */
.tabela-wrap {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
.tabela {
  width: 100%;
  border-collapse: collapse;
  font-size: .875rem;
}
.tabela thead th {
  padding: 11px 14px;
  background: var(--bg3);
  text-align: left;
  font-weight: 600;
  font-size: .75rem;
  text-transform: uppercase;
  letter-spacing: .4px;
  color: var(--text2);
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}
.tabela tbody td { padding: 12px 14px; border-bottom: 1px solid var(--border); color: var(--text); }
.tabela tbody tr:last-child td { border-bottom: none; }
.tabela tbody tr:hover td { background: var(--bg3); }

.cr-row.vencido td { background: rgba(239,68,68,.03); }
.cr-row.vencido:hover td { background: rgba(239,68,68,.07) !important; }

.td-num     { font-family: monospace; font-size: .8rem; font-weight: 600; color: var(--text2); white-space: nowrap; }
.td-cliente { font-weight: 500; }
.td-muted   { color: var(--text2); font-size: .83rem; }
.td-mono    { font-family: monospace; font-size: .82rem; }
.td-val     { font-family: monospace; font-weight: 700; font-size: .9rem; }
.td-venc    { color: #ef4444; font-weight: 700; }
.td-acoes   { white-space: nowrap; }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .3px;
  text-transform: uppercase;
}
.badge.pendente { background: rgba(245,158,11,.15); color: #92400e; border: 1px solid rgba(245,158,11,.3); }
.badge.vencido  { background: rgba(239,68,68,.15);  color: #991b1b; border: 1px solid rgba(239,68,68,.3); }
.badge.recebido { background: rgba(16,185,129,.15); color: #065f46; border: 1px solid rgba(16,185,129,.3); }

/* Botões ação */
.btn-receber {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px;
  background: #10b981; color: #fff;
  border: none; border-radius: 6px;
  font-size: .8rem; font-weight: 600; cursor: pointer;
  transition: opacity .15s;
}
.btn-receber:hover:not(:disabled) { opacity: .85; }
.btn-receber:disabled { opacity: .45; cursor: not-allowed; }

.btn-desfazer {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px;
  background: var(--bg3); color: var(--text2);
  border: 1px solid var(--border); border-radius: 6px;
  font-size: .8rem; font-weight: 600; cursor: pointer;
  transition: color .15s, border-color .15s;
}
.btn-desfazer:hover { color: var(--text); border-color: var(--text2); }

.tabela-rodape {
  padding: 10px 14px;
  font-size: .78rem;
  color: var(--text2);
  text-align: right;
  border-top: 1px solid var(--border);
}

/* Spinners */
.spin {
  display: inline-block; width: 18px; height: 18px;
  border: 2px solid rgba(99,102,241,.2); border-top-color: #6366f1;
  border-radius: 50%; animation: spin .7s linear infinite;
}
.spin-xs {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.cr-toast {
  position: fixed; bottom: 28px; left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; border-radius: 10px;
  font-size: .875rem; font-weight: 500;
  white-space: nowrap; pointer-events: none;
  box-shadow: 0 8px 24px rgba(0,0,0,.2);
}
.cr-toast.ok  { background: #052e16; color: #6ee7b7; border: 1px solid rgba(16,185,129,.3); }
.cr-toast.err { background: #1f0707; color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
.toast-enter-active { transition: all .25s ease; }
.toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* Modal confirmação */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.5); backdrop-filter: blur(4px);
  z-index: 9998;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 28px 28px 24px;
  max-width: 380px; width: 100%;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  box-shadow: 0 20px 50px rgba(0,0,0,.35);
}
.modal-icon {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.modal-icon.receber { background: rgba(16,185,129,.15); color: #10b981; }
.modal-icon.desfazer { background: rgba(245,158,11,.15); color: #f59e0b; }
.modal-msg  { font-size: .95rem; text-align: center; color: var(--text); line-height: 1.5; margin: 0; }
.modal-actions { display: flex; gap: 10px; width: 100%; }
.modal-btn {
  flex: 1; padding: 10px; border-radius: 8px;
  font-size: .875rem; font-weight: 600; cursor: pointer;
  border: none; transition: opacity .15s;
}
.modal-btn.cancel  { background: var(--bg3); color: var(--text2); border: 1px solid var(--border); }
.modal-btn.cancel:hover { color: var(--text); }
.modal-btn.confirm.receber  { background: #10b981; color: #fff; }
.modal-btn.confirm.desfazer { background: #f59e0b; color: #fff; }
.modal-btn.confirm:hover    { opacity: .88; }
.modal-btn.confirm:disabled { opacity: .4; cursor: not-allowed; }

.modal-info {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  text-align: center;
}
.modal-label  { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); }
.modal-valor  { font-size: 1.5rem; font-weight: 800; font-family: monospace; color: var(--text); }
.modal-cliente { font-size: .85rem; color: var(--text2); }

.modal-field { width: 100%; }
.modal-field-label {
  display: block; font-size: .72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px;
  color: var(--text2); margin-bottom: 10px;
}
.forma-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.forma-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 6px;
  background: var(--bg3); border: 2px solid var(--border);
  border-radius: 10px; cursor: pointer; font-size: .78rem; font-weight: 600;
  color: var(--text2); transition: all .15s;
}
.forma-btn:hover { border-color: #10b981; color: var(--text); }
.forma-btn.active { background: rgba(16,185,129,.12); border-color: #10b981; color: #059669; }
.forma-ico { font-size: 1.3rem; }

.td-forma { font-size: .8rem; white-space: nowrap; }

@media (max-width: 700px) {
  .totais-grid { grid-template-columns: 1fr; }
  .cr-header   { flex-direction: column; }
  .cr-header-right { width: 100%; }
  .search-input { min-width: unset; width: 100%; }
}
</style>
