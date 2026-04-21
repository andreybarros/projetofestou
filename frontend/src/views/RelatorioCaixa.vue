<template>
  <div class="rc-wrap animate-fade">

    <!-- Header -->
    <div class="rc-header">
      <div>
        <h2 class="page-title">
          <span class="material-symbols-outlined">summarize</span>
          Relatório de Caixa
        </h2>
        <p class="rc-sub">Histórico de sessões, sangrias, reforços e fechamentos.</p>
      </div>
      <button class="btn-print" @click="imprimir">
        <span class="material-symbols-outlined">print</span>
        Imprimir
      </button>
    </div>

    <!-- Filtros -->
    <div class="rc-filters card-glass no-print">
      <div class="filter-group">
        <label>De</label>
        <input type="date" v-model="filtro.de" class="f-input" />
      </div>
      <div class="filter-group">
        <label>Até</label>
        <input type="date" v-model="filtro.ate" class="f-input" />
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select v-model="filtro.status" class="f-input">
          <option value="">Todos</option>
          <option value="aberto">Aberto</option>
          <option value="fechado">Fechado</option>
        </select>
      </div>
      <button class="btn-buscar" @click="buscar" :disabled="carregando">
        <span v-if="carregando" class="spin-sm"></span>
        <span class="material-symbols-outlined" v-else>search</span>
        Buscar
      </button>
    </div>

    <!-- Totalizadores -->
    <div v-if="!carregando && sessoes.length" class="rc-totals">
      <div class="total-card">
        <span class="material-symbols-outlined tc-icon" style="color:#60a5fa">receipt</span>
        <div>
          <p class="tc-label">Sessões</p>
          <strong class="tc-val">{{ sessoes.length }}</strong>
        </div>
      </div>
      <div class="total-card">
        <span class="material-symbols-outlined tc-icon" style="color:#4ade80">payments</span>
        <div>
          <p class="tc-label">Total Abertura</p>
          <strong class="tc-val">{{ fmt(totalAbertura) }}</strong>
        </div>
      </div>
      <div class="total-card">
        <span class="material-symbols-outlined tc-icon" style="color:#f87171">remove_circle</span>
        <div>
          <p class="tc-label">Total Sangrias</p>
          <strong class="tc-val" style="color:#f87171">{{ fmt(totalSangrias) }}</strong>
        </div>
      </div>
      <div class="total-card">
        <span class="material-symbols-outlined tc-icon" style="color:#34d399">add_circle</span>
        <div>
          <p class="tc-label">Total Reforços</p>
          <strong class="tc-val" style="color:#34d399">{{ fmt(totalReforcos) }}</strong>
        </div>
      </div>
      <div class="total-card">
        <span class="material-symbols-outlined tc-icon" :style="{ color: totalDiferenca >= 0 ? '#4ade80' : '#f87171' }">balance</span>
        <div>
          <p class="tc-label">Diferença Total</p>
          <strong class="tc-val" :style="{ color: totalDiferenca >= 0 ? '#4ade80' : '#f87171' }">
            {{ totalDiferenca >= 0 ? '+' : '' }}{{ fmt(totalDiferenca) }}
          </strong>
        </div>
      </div>
    </div>

    <!-- Estado vazio / carregando -->
    <div v-if="carregando" class="state-center">
      <span class="spin"></span> Buscando registros…
    </div>
    <div v-else-if="!sessoes.length && buscou" class="state-center muted">
      <span class="material-symbols-outlined" style="font-size:40px;opacity:.3">search_off</span>
      Nenhuma sessão encontrada para o período.
    </div>
    <div v-else-if="!buscou" class="state-center muted">
      <span class="material-symbols-outlined" style="font-size:40px;opacity:.3">filter_alt</span>
      Selecione o período e clique em Buscar.
    </div>

    <!-- Tabela -->
    <div v-else class="rc-table-wrap card-glass">
      <table class="rc-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Abertura</th>
            <th>Fechamento</th>
            <th>Operador</th>
            <th class="num">Vl. Abertura</th>
            <th class="num">Sangrias</th>
            <th class="num">Reforços</th>
            <th class="num">Vl. Fechado</th>
            <th class="num">Diferença</th>
            <th>Status</th>
            <th class="no-print"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="s in sessoes" :key="s.pk">
            <tr class="sess-row" @click="toggleDetalhe(s.pk)">
              <td>{{ fmtData(s.dt_abertura) }}</td>
              <td class="mono">{{ fmtHora(s.dt_abertura) }}</td>
              <td class="mono">{{ s.dt_fechamento ? fmtHora(s.dt_fechamento) : '—' }}</td>
              <td>{{ s.nome_operador || '—' }}</td>
              <td class="num mono">{{ fmt(s.valor_abertura) }}</td>
              <td class="num mono red">{{ s.sangrias?.length ? fmt(somarValores(s.sangrias)) : '—' }}</td>
              <td class="num mono green">{{ s.reforcos?.length ? fmt(somarValores(s.reforcos)) : '—' }}</td>
              <td class="num mono">{{ s.valor_fechado != null ? fmt(s.valor_fechado) : '—' }}</td>
              <td class="num mono" :class="diferencaClass(s)">
                {{ s.valor_fechado != null ? fmtDif(diferenca(s)) : '—' }}
              </td>
              <td>
                <span :class="['badge-status', s.status]">
                  {{ s.status === 'aberto' ? 'Aberto' : 'Fechado' }}
                </span>
              </td>
              <td class="no-print expand-cell">
                <span class="material-symbols-outlined exp-icon">
                  {{ detalheAberto === s.pk ? 'expand_less' : 'expand_more' }}
                </span>
              </td>
            </tr>

            <!-- Detalhe expandido -->
            <tr v-if="detalheAberto === s.pk" class="detail-row no-print">
              <td colspan="11">
                <div class="detail-box">

                  <div class="detail-cols">
                    <!-- Sangrias -->
                    <div class="detail-col">
                      <h4 class="detail-title red">
                        <span class="material-symbols-outlined">remove_circle</span>
                        Sangrias ({{ s.sangrias?.length || 0 }})
                      </h4>
                      <div v-if="!s.sangrias?.length" class="detail-empty">Nenhuma sangria nesta sessão.</div>
                      <table v-else class="inner-table">
                        <thead><tr><th>Horário</th><th>Observação</th><th class="num">Valor</th></tr></thead>
                        <tbody>
                          <tr v-for="sg in s.sangrias" :key="sg.pk">
                            <td class="mono">{{ fmtHora(sg.dt_criacao) }}</td>
                            <td>{{ sg.observacoes || '—' }}</td>
                            <td class="num mono red">{{ fmt(sg.valor) }}</td>
                          </tr>
                          <tr class="inner-total">
                            <td colspan="2"><strong>Total</strong></td>
                            <td class="num mono red"><strong>{{ fmt(somarValores(s.sangrias)) }}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- Reforços -->
                    <div class="detail-col">
                      <h4 class="detail-title green">
                        <span class="material-symbols-outlined">add_circle</span>
                        Reforços ({{ s.reforcos?.length || 0 }})
                      </h4>
                      <div v-if="!s.reforcos?.length" class="detail-empty">Nenhum reforço nesta sessão.</div>
                      <table v-else class="inner-table">
                        <thead><tr><th>Horário</th><th>Observação</th><th class="num">Valor</th></tr></thead>
                        <tbody>
                          <tr v-for="rf in s.reforcos" :key="rf.pk">
                            <td class="mono">{{ fmtHora(rf.dt_criacao) }}</td>
                            <td>{{ rf.observacoes || '—' }}</td>
                            <td class="num mono green">{{ fmt(rf.valor) }}</td>
                          </tr>
                          <tr class="inner-total">
                            <td colspan="2"><strong>Total</strong></td>
                            <td class="num mono green"><strong>{{ fmt(somarValores(s.reforcos)) }}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- Resumo do fechamento -->
                    <div class="detail-col summary-col">
                      <h4 class="detail-title">
                        <span class="material-symbols-outlined">summarize</span>
                        Resumo
                      </h4>
                      <div class="summary-rows">
                        <div class="sum-row"><span>Saldo de abertura</span><strong>{{ fmt(s.valor_abertura) }}</strong></div>
                        <div class="sum-row red"><span>(-) Sangrias</span><strong>{{ fmt(somarValores(s.sangrias || [])) }}</strong></div>
                        <div class="sum-row green"><span>(+) Reforços</span><strong>{{ fmt(somarValores(s.reforcos || [])) }}</strong></div>
                        <div class="sum-row bold"><span>Saldo esperado</span><strong>{{ fmt(saldoEsperado(s)) }}</strong></div>
                        <div class="sum-row" v-if="s.valor_fechado != null"><span>Valor contado</span><strong>{{ fmt(s.valor_fechado) }}</strong></div>
                        <div class="sum-row bold" :class="diferencaClass(s)" v-if="s.valor_fechado != null">
                          <span>Diferença</span>
                          <strong>{{ fmtDif(diferenca(s)) }}</strong>
                        </div>
                        <div class="sum-row muted" v-if="s.status === 'aberto'"><span>Caixa ainda aberto</span></div>
                      </div>
                    </div>
                  </div>

                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';

const sessaoStore = useSessaoStore();

// ── Filtros ───────────────────────────────────────────────────
const hoje = new Date().toISOString().slice(0, 10);
const primeiroDia = hoje.slice(0, 8) + '01';
const filtro = ref({ de: primeiroDia, ate: hoje, status: '' });

const carregando  = ref(false);
const buscou      = ref(false);
const sessoes     = ref([]);
const detalheAberto = ref(null);

// ── Totalizadores ─────────────────────────────────────────────
const totalAbertura  = computed(() => sessoes.value.reduce((s, c) => s + parseFloat(c.valor_abertura || 0), 0));
const totalSangrias  = computed(() => sessoes.value.reduce((s, c) => s + somarValores(c.sangrias || []), 0));
const totalReforcos  = computed(() => sessoes.value.reduce((s, c) => s + somarValores(c.reforcos || []), 0));
const totalDiferenca = computed(() => sessoes.value
  .filter(c => c.valor_fechado != null)
  .reduce((s, c) => s + diferenca(c), 0));

onMounted(() => buscar());

async function buscar() {
  carregando.value = true;
  buscou.value = true;
  try {
    const filial = sessaoStore.filial?.pk;
    const de  = filtro.value.de  + 'T00:00:00';
    const ate = filtro.value.ate + 'T23:59:59';

    let q = supabase
      .from('caixas')
      .select('*, caixa_sangrias(*), caixa_reforcos(*)')
      .eq('filial_pk', filial)
      .gte('dt_abertura', de)
      .lte('dt_abertura', ate)
      .order('dt_abertura', { ascending: false });

    if (filtro.value.status) q = q.eq('status', filtro.value.status);

    const { data, error } = await q;
    if (error) throw error;

    sessoes.value = (data || []).map(s => ({
      ...s,
      sangrias: s.caixa_sangrias || [],
      reforcos: s.caixa_reforcos || [],
    }));
  } catch (e) {
    console.error(e);
  } finally {
    carregando.value = false;
  }
}

function toggleDetalhe(pk) {
  detalheAberto.value = detalheAberto.value === pk ? null : pk;
}

// ── Cálculos ──────────────────────────────────────────────────
function somarValores(arr) {
  return (arr || []).reduce((s, i) => s + parseFloat(i.valor || 0), 0);
}

function saldoEsperado(s) {
  return parseFloat(s.valor_abertura || 0)
    - somarValores(s.sangrias)
    + somarValores(s.reforcos);
}

function diferenca(s) {
  if (s.valor_fechado == null) return 0;
  return parseFloat(s.valor_fechado) - saldoEsperado(s);
}

function diferencaClass(s) {
  if (s.valor_fechado == null) return '';
  const d = diferenca(s);
  if (d > 0.009) return 'green';
  if (d < -0.009) return 'red';
  return 'neutral';
}

// ── Formatação ────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtDif(v) {
  return (v >= 0 ? '+' : '') + fmt(v);
}
function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtHora(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function imprimir() { window.print(); }
</script>

<style scoped>
.rc-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 60px; display: flex; flex-direction: column; gap: 20px; }

/* Header */
.rc-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.rc-sub { color: var(--text2); font-size: 13px; margin: 0; }
.btn-print { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-print:hover { border-color: var(--accent); }

/* Filtros */
.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; }
.rc-filters { display: flex; align-items: flex-end; gap: 12px; padding: 16px 20px; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 5px; }
.filter-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.f-input { padding: 7px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 130px; }
.f-input:focus { outline: none; border-color: var(--accent); }
.btn-buscar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: var(--accent); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; height: 35px; }
.btn-buscar:disabled { opacity: .5; cursor: not-allowed; }

/* Totais */
.rc-totals { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.total-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
.tc-icon { font-size: 28px; }
.tc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); margin: 0 0 2px; }
.tc-val { font-size: 15px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); }

/* Tabela */
.rc-table-wrap { overflow-x: auto; }
.rc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rc-table thead tr { border-bottom: 1px solid var(--border); }
.rc-table th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; white-space: nowrap; }
.rc-table th.num { text-align: right; }
.sess-row { cursor: pointer; transition: background .15s; border-bottom: 1px solid var(--border); }
.sess-row:hover { background: var(--bg3); }
.sess-row td { padding: 12px 12px; color: var(--text); vertical-align: middle; }
.mono { font-family: var(--mono, monospace); font-weight: 600; }
.num { text-align: right; }
.red  { color: #f87171; }
.green { color: #4ade80; }
.neutral { color: var(--text2); }
.expand-cell { text-align: center; width: 32px; }
.exp-icon { font-size: 18px; color: var(--text2); }

/* Badge */
.badge-status { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
.badge-status.aberto  { background: rgba(74,222,128,.15); color: #4ade80; }
.badge-status.fechado { background: rgba(148,163,184,.12); color: #94a3b8; }

/* Detalhe */
.detail-row td { padding: 0 !important; }
.detail-box { padding: 16px 20px; background: var(--bg3); border-bottom: 1px solid var(--border); }
.detail-cols { display: grid; grid-template-columns: 1fr 1fr 260px; gap: 20px; }
.detail-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; margin: 0 0 10px; color: var(--text); }
.detail-title.red   { color: #f87171; }
.detail-title.green { color: #4ade80; }
.detail-title .material-symbols-outlined { font-size: 16px; }
.detail-empty { font-size: 12px; color: var(--text2); font-style: italic; }

.inner-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.inner-table th { padding: 5px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: var(--text2); border-bottom: 1px solid var(--border); }
.inner-table th.num { text-align: right; }
.inner-table td { padding: 5px 8px; color: var(--text); border-bottom: 1px solid rgba(255,255,255,.04); }
.inner-table td.num { text-align: right; }
.inner-total td { font-size: 12px; border-top: 1px solid var(--border); border-bottom: none; padding-top: 6px; }

.summary-rows { display: flex; flex-direction: column; gap: 6px; }
.sum-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 5px 8px; border-radius: 6px; color: var(--text); }
.sum-row.bold { font-weight: 700; background: var(--bg2); border: 1px solid var(--border); }
.sum-row.red   strong { color: #f87171; }
.sum-row.green strong { color: #4ade80; }
.sum-row.muted { color: var(--text2); font-style: italic; font-size: 11px; }

/* Estado */
.state-center { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px; color: var(--text2); font-size: 14px; }
.muted { color: var(--text2); }

.spin { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Print */
@media print {
  .no-print { display: none !important; }
  .rc-wrap { padding: 0; }
  .rc-table-wrap { border: none; }
  .detail-box { background: none; }
  .badge-status { border: 1px solid currentColor; }
}

@media (max-width: 900px) {
  .rc-totals { grid-template-columns: repeat(2, 1fr); }
  .detail-cols { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .rc-totals { grid-template-columns: 1fr 1fr; }
  .rc-filters { flex-direction: column; }
  .f-input { min-width: 100%; }
}
</style>
