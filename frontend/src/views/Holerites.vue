<template>
  <div class="mh-wrap">

    <!-- ── LISTA ─────────────────────────────────────────── -->
    <template v-if="!selectedPk">
      <div class="mh-header">
        <div>
          <h1 class="page-title">Meus Holerites</h1>
          <p class="page-sub" v-if="funcionario">{{ funcionario.nome }}</p>
        </div>
      </div>

      <div v-if="carregando" class="mh-loading">
        <div class="spin"></div>
        <span>Carregando holerites...</span>
      </div>

      <div v-else-if="erro" class="mh-aviso">
        <span class="material-symbols-outlined" style="font-size:2.5rem;opacity:.4">error</span>
        <p>{{ erro }}</p>
      </div>

      <div v-else-if="!holerites.length" class="mh-aviso">
        <span class="material-symbols-outlined" style="font-size:2.5rem;opacity:.3">description</span>
        <p>Nenhum holerite disponível ainda.</p>
        <p style="font-size:.82rem;color:var(--text2)">Os holerites aparecem aqui após o fechamento de cada quinzena.</p>
      </div>

      <div v-else class="mh-grid">
        <div v-for="h in holerites" :key="h.pk" class="mh-card" @click="abrirDetalhe(h.pk)">
          <div class="mh-card-top">
            <div class="mh-periodo">{{ labelPeriodo(h.mes, h.ano, h.quinzena) }}</div>
            <span :class="['mh-status', statusClass(h.espelho_status)]">{{ statusLabel(h.espelho_status) }}</span>
          </div>
          <div class="mh-card-metrics">
            <div class="mh-metric">
              <span class="mh-metric-val">{{ fmt2(h.horas_trabalhadas) }}h</span>
              <span class="mh-metric-lbl">Trabalhadas</span>
            </div>
            <div class="mh-metric">
              <span class="mh-metric-val" :style="h.horas_extras > 0 ? 'color:#10b981' : ''">{{ fmt2(h.horas_extras) }}h</span>
              <span class="mh-metric-lbl">Extras</span>
            </div>
            <div class="mh-metric">
              <span class="mh-metric-val" style="color:#ef4444">{{ fmtR(h.valor_descontos) }}</span>
              <span class="mh-metric-lbl">Descontos</span>
            </div>
          </div>
          <div class="mh-card-bottom">
            <div class="mh-valor-bruto">
              <span class="mh-vb-label">Bruto</span>
              <span class="mh-vb-val">{{ fmtR(h.total_bruto) }}</span>
            </div>
            <div class="mh-valor-liq">
              <span class="mh-vl-label">Líquido</span>
              <span class="mh-vl-val">{{ fmtR(h.total_liquido) }}</span>
            </div>
          </div>
          <div class="mh-card-arrow">
            <span class="material-symbols-outlined">chevron_right</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── DETALHE ─────────────────────────────────────── -->
    <template v-else>
      <div class="mh-header">
        <button class="btn-back" @click="fecharDetalhe">
          <span class="material-symbols-outlined">arrow_back</span>
          Voltar
        </button>
        <div class="mh-det-title">
          <h1 class="page-title">Holerite</h1>
          <p class="page-sub" v-if="detalhe">{{ labelPeriodo(detalhe.fechamento.mes, detalhe.fechamento.ano, detalhe.fechamento.quinzena) }}</p>
        </div>
        <button class="btn-print" @click="imprimir" title="Imprimir">
          <span class="material-symbols-outlined">print</span>
        </button>
      </div>

      <div v-if="carregandoDetalhe" class="mh-loading">
        <div class="spin"></div>
        <span>Carregando detalhes...</span>
      </div>

      <div v-else-if="detalhe" class="mh-det-wrap" id="mh-print-area">

        <!-- Cabeçalho do holerite -->
        <div class="mh-det-head card-glass">
          <div class="mh-det-head-info">
            <div class="mh-det-avatar">{{ detalhe.funcionario.nome.charAt(0).toUpperCase() }}</div>
            <div>
              <p class="mh-det-nome">{{ detalhe.funcionario.nome }}</p>
              <p class="mh-det-mat">Matrícula {{ detalhe.funcionario.matricula }}</p>
            </div>
          </div>
          <div class="mh-det-head-right">
            <div class="mh-det-periodo-box">
              <span class="material-symbols-outlined" style="font-size:18px;color:#a78bfa">calendar_today</span>
              <span>{{ fmtData(detalhe.dataIni) }} a {{ fmtData(detalhe.dataFim) }}</span>
            </div>
            <span :class="['mh-status', statusClass(detalhe.fechamento.espelho_status)]">
              {{ statusLabel(detalhe.fechamento.espelho_status) }}
            </span>
          </div>
        </div>

        <!-- Métricas resumo -->
        <div class="mh-stats-grid">
          <div class="mh-stat violet">
            <span class="material-symbols-outlined mh-stat-icon">schedule</span>
            <span class="mh-stat-val">{{ fmt2(detalhe.fechamento.horas_previstas) }}h</span>
            <span class="mh-stat-lbl">Horas Previstas</span>
          </div>
          <div class="mh-stat blue">
            <span class="material-symbols-outlined mh-stat-icon">task_alt</span>
            <span class="mh-stat-val">{{ fmt2(detalhe.fechamento.horas_trabalhadas) }}h</span>
            <span class="mh-stat-lbl">Horas Trabalhadas</span>
          </div>
          <div class="mh-stat green">
            <span class="material-symbols-outlined mh-stat-icon">add_circle</span>
            <span class="mh-stat-val">{{ fmt2(detalhe.fechamento.qtd_horas_pagas || detalhe.fechamento.horas_extras) }}h</span>
            <span class="mh-stat-lbl">Horas Extras Pagas</span>
          </div>
          <div class="mh-stat red" v-if="detalhe.faltas.length">
            <span class="material-symbols-outlined mh-stat-icon">event_busy</span>
            <span class="mh-stat-val">{{ detalhe.faltas.length }}</span>
            <span class="mh-stat-lbl">{{ detalhe.faltas.length === 1 ? 'Falta' : 'Faltas' }}</span>
          </div>
          <div class="mh-stat green" v-else>
            <span class="material-symbols-outlined mh-stat-icon">event_available</span>
            <span class="mh-stat-val">0</span>
            <span class="mh-stat-lbl">Faltas</span>
          </div>
          <div class="mh-stat amber" v-if="detalhe.atrasos.length">
            <span class="material-symbols-outlined mh-stat-icon">running_with_errors</span>
            <span class="mh-stat-val">{{ detalhe.atrasos.length }}</span>
            <span class="mh-stat-lbl">{{ detalhe.atrasos.length === 1 ? 'Dia de Atraso' : 'Dias de Atraso' }}</span>
          </div>
          <div class="mh-stat green" v-else>
            <span class="material-symbols-outlined mh-stat-icon">verified</span>
            <span class="mh-stat-val">0</span>
            <span class="mh-stat-lbl">Atrasos</span>
          </div>
        </div>

        <!-- Apuração financeira -->
        <div class="mh-financeiro card-glass">
          <h3 class="mh-section-title">
            <span class="material-symbols-outlined">payments</span>
            Apuração Financeira
          </h3>

          <div class="mh-fin-rows">
            <div class="mh-fin-row">
              <span class="mh-fin-desc">Salário base ({{ labelPeriodo(detalhe.fechamento.mes, detalhe.fechamento.ano, detalhe.fechamento.quinzena) }})</span>
              <span class="mh-fin-val">{{ fmtR(detalhe.salarioBaseQuinzena) }}</span>
            </div>
            <div class="mh-fin-row" v-if="detalhe.fechamento.valor_horas_extras > 0">
              <span class="mh-fin-desc">
                Horas extras
                <small v-if="detalhe.fechamento.qtd_horas_pagas > 0">({{ fmt2(detalhe.fechamento.qtd_horas_pagas) }}h × {{ fmtR(detalhe.fechamento.valor_hora_extra_pago) }})</small>
              </span>
              <span class="mh-fin-val positive">+ {{ fmtR(detalhe.fechamento.valor_horas_extras) }}</span>
            </div>
            <div class="mh-fin-row mh-fin-total-bruto">
              <span class="mh-fin-desc"><strong>Total Bruto</strong></span>
              <span class="mh-fin-val"><strong>{{ fmtR(detalhe.totalBruto) }}</strong></span>
            </div>

            <!-- Descontos -->
            <div v-if="detalhe.descontos.length" class="mh-fin-group-title">Descontos</div>
            <div v-for="d in detalhe.descontos" :key="d.pk" class="mh-fin-row desconto">
              <span class="mh-fin-desc">{{ d.descricao }}</span>
              <span class="mh-fin-val negative">- {{ fmtR(d.valor) }}</span>
            </div>
            <div class="mh-fin-row desconto" v-if="detalhe.faltas.length">
              <span class="mh-fin-desc">Desconto faltas ({{ detalhe.faltas.length }} {{ detalhe.faltas.length === 1 ? 'dia' : 'dias' }})</span>
              <span class="mh-fin-val negative">incluso nos descontos acima</span>
            </div>

            <div class="mh-fin-divider"></div>
            <div class="mh-fin-row mh-fin-liq">
              <span class="mh-fin-desc">
                <strong>Total Líquido</strong>
              </span>
              <span class="mh-fin-val liq">{{ fmtR(detalhe.fechamento.total_liquido) }}</span>
            </div>
          </div>
        </div>

        <!-- Faltas detalhadas -->
        <div class="mh-detail-card card-glass" v-if="detalhe.faltas.length">
          <button class="mh-accordion" @click="showFaltas = !showFaltas">
            <div class="mh-acc-title">
              <span class="material-symbols-outlined" style="color:#ef4444">event_busy</span>
              Faltas ({{ detalhe.faltas.length }})
            </div>
            <span class="material-symbols-outlined mh-acc-icon">{{ showFaltas ? 'expand_less' : 'expand_more' }}</span>
          </button>
          <div v-if="showFaltas" class="mh-acc-body">
            <div v-for="f in detalhe.faltas" :key="f.data" class="mh-row-item red">
              <span class="material-symbols-outlined" style="font-size:18px">event_busy</span>
              <span>{{ f.dayName }}, {{ fmtData(f.data) }}</span>
              <span v-if="f.just" class="mh-row-tag">{{ f.just.tipo }}</span>
            </div>
          </div>
        </div>

        <!-- Atrasos detalhados -->
        <div class="mh-detail-card card-glass" v-if="detalhe.atrasos.length">
          <button class="mh-accordion" @click="showAtrasos = !showAtrasos">
            <div class="mh-acc-title">
              <span class="material-symbols-outlined" style="color:#f59e0b">running_with_errors</span>
              Atrasos ({{ detalhe.atrasos.length }})
            </div>
            <span class="material-symbols-outlined mh-acc-icon">{{ showAtrasos ? 'expand_less' : 'expand_more' }}</span>
          </button>
          <div v-if="showAtrasos" class="mh-acc-body">
            <div v-for="a in detalhe.atrasos" :key="a.data" class="mh-row-item amber">
              <span class="material-symbols-outlined" style="font-size:18px">schedule</span>
              <span>{{ a.dayName }}, {{ fmtData(a.data) }}</span>
              <span class="mh-row-tag">{{ a.minutos }} min de atraso · Entrada: {{ a.batidas[0] }}</span>
            </div>
          </div>
        </div>

        <!-- Espelho dia a dia -->
        <div class="mh-detail-card card-glass">
          <button class="mh-accordion" @click="showDias = !showDias">
            <div class="mh-acc-title">
              <span class="material-symbols-outlined" style="color:#818cf8">calendar_view_month</span>
              Espelho dia a dia
            </div>
            <span class="material-symbols-outlined mh-acc-icon">{{ showDias ? 'expand_less' : 'expand_more' }}</span>
          </button>
          <div v-if="showDias" class="mh-acc-body mh-dias-body">
            <table class="mh-dias-table">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Batidas</th>
                  <th>Previsto</th>
                  <th>Trabalhado</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in detalhe.dias" :key="d.dtStr" :class="diaClass(d)">
                  <td>
                    <span class="mh-dia-num">{{ d.dia }}</span>
                    <span class="mh-dia-name">{{ d.dayName }}</span>
                  </td>
                  <td class="mh-batidas">
                    <span v-if="d.just" class="mh-just-tag">{{ d.just.tipo }}</span>
                    <span v-else-if="d.batidas.length" class="mh-bats">{{ d.batidas.join(' · ') }}</span>
                    <span v-else class="mh-no-bat">—</span>
                  </td>
                  <td>{{ d.previsto ? fmtHoras(d.previsto) : '—' }}</td>
                  <td>{{ d.trabalhado ? fmtHoras(d.trabalhado) : '—' }}</td>
                  <td :class="['mh-saldo', d.diff > 0 ? 'pos' : d.diff < 0 ? 'neg' : '']">
                    {{ d.previsto === 0 && d.trabalhado === 0 ? '—' : fmtSaldo(d.diff) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Observações -->
        <div class="mh-obs card-glass" v-if="detalhe.fechamento.observacoes">
          <span class="material-symbols-outlined" style="font-size:18px;color:var(--text2)">notes</span>
          <p>{{ detalhe.fechamento.observacoes }}</p>
        </div>

      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../services/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const carregando        = ref(true);
const carregandoDetalhe = ref(false);
const erro              = ref('');
const funcionario       = ref(null);
const holerites         = ref([]);
const selectedPk        = ref(null);
const detalhe           = ref(null);
const showFaltas        = ref(true);
const showAtrasos       = ref(true);
const showDias          = ref(false);


onMounted(carregar);

async function carregar() {
  carregando.value = true;
  erro.value = '';
  try {
    const { data } = await apiClient.get('/api/ponto/meus-holerites');
    funcionario.value = data.funcionario;
    holerites.value   = data.data || [];
  } catch (e) {
    erro.value = e.response?.data?.erro || 'Erro ao carregar holerites.';
  } finally {
    carregando.value = false;
  }
}

async function abrirDetalhe(pk) {
  selectedPk.value        = pk;
  detalhe.value           = null;
  carregandoDetalhe.value = true;
  showFaltas.value        = true;
  showAtrasos.value       = true;
  showDias.value          = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try {
    const { data } = await apiClient.get(`/api/ponto/meus-holerites/${pk}`);
    detalhe.value = data;
  } catch (e) {
    detalhe.value = null;
    selectedPk.value = null;
  } finally {
    carregandoDetalhe.value = false;
  }
}

function fecharDetalhe() {
  selectedPk.value = null;
  detalhe.value    = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function imprimir() {
  window.print();
}

// ── Formatações ────────────────────────────────────────────

function labelPeriodo(mes, ano, quinzena) {
  return `${quinzena === 1 ? '1ª' : '2ª'} Quinzena de ${MESES[mes - 1]} ${ano}`;
}

function fmtR(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmt2(v) {
  return parseFloat(v || 0).toFixed(2).replace('.', ',');
}

function fmtData(d) {
  if (!d) return '—';
  return d.split('-').reverse().join('/');
}

function fmtHoras(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function fmtSaldo(diff) {
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  return diff > 0 ? `+${s}` : diff < 0 ? `-${s}` : s;
}

function statusLabel(s) {
  return { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', rejeitado: 'Rejeitado' }[s] || s;
}

function statusClass(s) {
  return { rascunho: 'gray', enviado: 'blue', aprovado: 'green', rejeitado: 'red' }[s] || 'gray';
}

function diaClass(d) {
  if (d.isDomingo) return 'dia-domingo';
  if (!d.previsto && !d.trabalhado) return 'dia-neutro';
  if (d.trabalhado === 0 && d.previsto > 0 && !d.just) return 'dia-falta';
  if (d.just) return 'dia-just';
  return '';
}
</script>

<style scoped>
.mh-wrap { display: flex; flex-direction: column; gap: 1.25rem; }

/* Header */
.mh-header { display: flex; align-items: center; gap: 12px; }
.mh-det-title { flex: 1; }
.page-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--text); }
.page-sub   { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }

.btn-back {
  display: flex; align-items: center; gap: 5px; padding: .45rem .9rem;
  background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
  color: var(--text); font-weight: 600; font-size: .9rem; cursor: pointer; transition: all .15s;
  white-space: nowrap;
}
.btn-back:hover { background: var(--bg3); }
.btn-back .material-symbols-outlined { font-size: 20px; }

.btn-print {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--bg2); border: 1px solid var(--border);
  color: var(--text2); cursor: pointer; transition: all .15s;
}
.btn-print:hover { background: var(--bg3); color: var(--text); }

/* Loading / aviso */
.mh-loading { display: flex; align-items: center; gap: 12px; padding: 4rem; color: var(--text2); justify-content: center; }
.mh-aviso   { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 4rem; color: var(--text2); text-align: center; }
.spin { width: 26px; height: 26px; border: 3px solid rgba(167,139,250,.2); border-top-color: #a78bfa; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Lista de holerites ── */
.mh-grid { display: flex; flex-direction: column; gap: 12px; }

.mh-card {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 16px;
  padding: 18px 20px; cursor: pointer; transition: all .2s;
  position: relative; overflow: hidden;
}
.mh-card:hover { border-color: #a78bfa; box-shadow: 0 4px 20px rgba(167,139,250,.12); transform: translateY(-1px); }
.mh-card:hover .mh-card-arrow { color: #a78bfa; }

.mh-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.mh-periodo  { font-size: .95rem; font-weight: 800; color: var(--text); }

.mh-status { padding: 3px 10px; border-radius: 20px; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.mh-status.gray   { background: rgba(148,163,184,.15); color: #94a3b8; }
.mh-status.blue   { background: rgba(99,102,241,.12);  color: #6366f1; }
.mh-status.green  { background: rgba(16,185,129,.12);  color: #10b981; }
.mh-status.red    { background: rgba(239,68,68,.12);   color: #ef4444; }

.mh-card-metrics { display: flex; gap: 20px; margin-bottom: 16px; }
.mh-metric { display: flex; flex-direction: column; gap: 2px; }
.mh-metric-val { font-size: 1rem; font-weight: 800; color: var(--text); font-family: monospace; }
.mh-metric-lbl { font-size: .72rem; color: var(--text2); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }

.mh-card-bottom { display: flex; gap: 24px; border-top: 1px solid var(--border); padding-top: 14px; }
.mh-valor-bruto, .mh-valor-liq { display: flex; flex-direction: column; gap: 2px; }
.mh-vb-label, .mh-vl-label { font-size: .72rem; color: var(--text2); font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
.mh-vb-val { font-size: 1rem; font-weight: 700; color: var(--text); font-family: monospace; }
.mh-vl-val { font-size: 1.2rem; font-weight: 900; color: #a78bfa; font-family: monospace; }

.mh-card-arrow {
  position: absolute; right: 20px; top: 50%; transform: translateY(-50%);
  color: var(--text2); transition: color .2s;
}
.mh-card-arrow .material-symbols-outlined { font-size: 24px; }

/* ── Detalhe ── */
.mh-det-wrap { display: flex; flex-direction: column; gap: 14px; padding-bottom: 3rem; }

.mh-det-head {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 18px 20px; border-radius: 16px;
  background: var(--bg2); border: 1px solid var(--border);
  flex-wrap: wrap;
}
.mh-det-head-info { display: flex; align-items: center; gap: 14px; }
.mh-det-avatar {
  width: 48px; height: 48px; border-radius: 50%; background: #a78bfa; color: #fff;
  font-size: 22px; font-weight: 900; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.mh-det-nome { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text); }
.mh-det-mat  { margin: 3px 0 0; font-size: .8rem; color: var(--text2); }
.mh-det-head-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.mh-det-periodo-box { display: flex; align-items: center; gap: 6px; font-size: .85rem; color: var(--text2); }

/* Stats */
.mh-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.mh-stat {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 16px 12px; border-radius: 14px; gap: 6px;
  border: 1px solid transparent;
}
.mh-stat.violet { background: rgba(167,139,250,.08); border-color: rgba(167,139,250,.2); }
.mh-stat.blue   { background: rgba(99,102,241,.08);  border-color: rgba(99,102,241,.2); }
.mh-stat.green  { background: rgba(16,185,129,.08);  border-color: rgba(16,185,129,.2); }
.mh-stat.red    { background: rgba(239,68,68,.08);   border-color: rgba(239,68,68,.2); }
.mh-stat.amber  { background: rgba(245,158,11,.08);  border-color: rgba(245,158,11,.2); }

.mh-stat-icon { font-size: 22px; }
.mh-stat.violet .mh-stat-icon { color: #a78bfa; }
.mh-stat.blue   .mh-stat-icon { color: #6366f1; }
.mh-stat.green  .mh-stat-icon { color: #10b981; }
.mh-stat.red    .mh-stat-icon { color: #ef4444; }
.mh-stat.amber  .mh-stat-icon { color: #f59e0b; }

.mh-stat-val { font-size: 1.4rem; font-weight: 900; color: var(--text); font-family: monospace; }
.mh-stat-lbl { font-size: .72rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; }

/* Financeiro */
.mh-financeiro { padding: 20px; border-radius: 16px; background: var(--bg2); border: 1px solid var(--border); }
.mh-section-title {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 18px; font-size: 1rem; font-weight: 800; color: var(--text);
}
.mh-section-title .material-symbols-outlined { color: #a78bfa; font-size: 20px; }

.mh-fin-rows { display: flex; flex-direction: column; gap: 0; }
.mh-fin-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px dashed var(--border); gap: 12px;
}
.mh-fin-row:last-child { border-bottom: none; }
.mh-fin-desc { font-size: .9rem; color: var(--text2); }
.mh-fin-desc small { font-size: .78rem; display: block; margin-top: 2px; color: var(--text2); opacity: .7; }
.mh-fin-val { font-size: .95rem; font-weight: 700; color: var(--text); font-family: monospace; white-space: nowrap; }
.mh-fin-val.positive { color: #10b981; }
.mh-fin-val.negative { color: #ef4444; }
.mh-fin-val.liq { color: #a78bfa; font-size: 1.15rem; font-weight: 900; }

.mh-fin-group-title {
  font-size: .72rem; font-weight: 800; color: var(--text2); text-transform: uppercase;
  letter-spacing: .5px; padding: 10px 0 4px; border-bottom: none;
}
.mh-fin-row.desconto .mh-fin-desc { color: var(--text); }

.mh-fin-total-bruto { background: var(--bg3); margin: 4px -20px; padding: 10px 20px !important; }
.mh-fin-divider { height: 2px; background: var(--border); margin: 6px 0; }
.mh-fin-liq { padding: 14px 0 !important; }

/* Accordion cards */
.mh-detail-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.mh-accordion {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; background: none; border: none; cursor: pointer;
  color: var(--text); transition: background .15s;
}
.mh-accordion:hover { background: var(--bg3); }
.mh-acc-title { display: flex; align-items: center; gap: 8px; font-size: .95rem; font-weight: 700; }
.mh-acc-icon { font-size: 22px; color: var(--text2); }
.mh-acc-body { padding: 4px 20px 16px; }

.mh-row-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 0;
  border-bottom: 1px solid var(--border); font-size: .88rem; color: var(--text);
}
.mh-row-item:last-child { border-bottom: none; }
.mh-row-item.red  .material-symbols-outlined { color: #ef4444; }
.mh-row-item.amber .material-symbols-outlined { color: #f59e0b; }
.mh-row-tag {
  margin-left: auto; padding: 2px 9px; border-radius: 20px; font-size: .72rem;
  font-weight: 700; background: var(--bg3); color: var(--text2); white-space: nowrap;
}

/* Tabela dias */
.mh-dias-body { padding: 0 0 12px !important; overflow-x: auto; }
.mh-dias-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
.mh-dias-table th {
  background: var(--bg3); padding: .6rem .9rem; text-align: left;
  font-size: .72rem; color: var(--text2); font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px; white-space: nowrap;
}
.mh-dias-table td { padding: .6rem .9rem; border-bottom: 1px solid var(--border); color: var(--text); }
.mh-dias-table tr:last-child td { border-bottom: none; }

.mh-dia-num  { font-weight: 800; margin-right: 5px; }
.mh-dia-name { color: var(--text2); font-size: .8rem; }
.mh-batidas  { font-family: monospace; font-size: .8rem; }
.mh-bats     { color: var(--text2); }
.mh-no-bat   { color: var(--text2); opacity: .4; }
.mh-just-tag { padding: 1px 8px; border-radius: 10px; font-size: .72rem; font-weight: 700; background: rgba(99,102,241,.1); color: #6366f1; }

.mh-saldo        { font-family: monospace; font-weight: 700; }
.mh-saldo.pos    { color: #10b981; }
.mh-saldo.neg    { color: #ef4444; }

.dia-domingo td { background: rgba(248,113,130,.04); }
.dia-falta   td { background: rgba(239,68,68,.06); }
.dia-just    td { background: rgba(99,102,241,.05); }
.dia-neutro  td { opacity: .5; }

/* Observações */
.mh-obs {
  display: flex; gap: 10px; align-items: flex-start; padding: 14px 18px;
  background: var(--bg2); border: 1px solid var(--border); border-radius: 14px;
  font-size: .88rem; color: var(--text2);
}

/* Impressão */
@media print {
  .btn-back, .btn-print, .mh-header .btn-back { display: none !important; }
  .mh-wrap { background: #fff; color: #000; }
  .mh-det-head, .mh-financeiro, .mh-detail-card, .mh-obs { box-shadow: none; border: 1px solid #ddd; }
  .mh-acc-body { display: block !important; }
  .mh-dias-table th, .mh-dias-table td { font-size: .75rem; padding: .4rem .5rem; }
}

@media (max-width: 600px) {
  .mh-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .mh-det-head { flex-direction: column; align-items: flex-start; }
  .mh-det-head-right { align-items: flex-start; }
  .mh-fin-total-bruto { margin: 4px -16px; padding: 10px 16px !important; }
}
</style>
