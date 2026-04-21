<template>
  <div class="ep-wrap">

    <div class="ep-header">
      <div>
        <h1 class="ep-title">Espelho de Ponto</h1>
        <span class="ep-sub">Revise e aprove seus fechamentos de folha</span>
      </div>
    </div>

    <!-- Lista de Fechamentos -->
    <div v-if="!itemSelecionado" class="ep-main">
      <div v-if="loading" class="estado-msg"><div class="spin"></div> Carregando...</div>
      <div v-else-if="fechamentos.length === 0" class="estado-msg">Nenhum espelho de ponto disponível para revisão.</div>
      
      <div v-else class="grid-fechamentos">
        <div v-for="f in fechamentos" :key="f.pk" class="f-card" @click="selecionar(f)">
          <div class="f-status">
            <span :class="['badge-status', f.espelho_status]">
              {{ statusTexto(f.espelho_status) }}
            </span>
          </div>
          <div class="f-periodo">
            <span class="f-qnz">{{ f.quinzena }}ª Quinzena</span>
            <span class="f-mes-ano">{{ meses[f.mes - 1] }} / {{ f.ano }}</span>
          </div>
          <div class="f-resumo">
            <div class="f-stat">
              <span class="f-label">Saldo Acumulado</span>
              <span class="f-val">{{ f.saldo_acumulado.toFixed(2) }}h</span>
            </div>
            <div class="f-stat">
              <span class="f-label">Trabalhado</span>
              <span class="f-val">{{ f.horas_trabalhadas.toFixed(1) }}h</span>
            </div>
          </div>
          <button class="btn-detalhes">
            Ver Detalhes e Revisar
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Detalhes do Fechamento -->
    <template v-else>
      <div class="detalhes-header">
        <button class="btn-voltar" @click="itemSelecionado = null">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          Voltar para lista
        </button>
        <div class="status-periodo">
          <span :class="['badge-status', itemSelecionado.espelho_status]">
            {{ statusTexto(itemSelecionado.espelho_status) }}
          </span>
          <h2>{{ itemSelecionado.quinzena }}ª Quinzena de {{ meses[itemSelecionado.mes - 1] }} / {{ itemSelecionado.ano }}</h2>
        </div>
      </div>

      <div class="det-layout">
        <div class="det-left">
          
          <!-- Cards de Stats -->
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Previsto</div>
              <div class="stat-val">{{ itemSelecionado.horas_previstas.toFixed(1) }}h</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Trabalhado</div>
              <div class="stat-val">{{ itemSelecionado.horas_trabalhadas.toFixed(1) }}h</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Saldo do Período</div>
              <div :class="['stat-val', itemSelecionado.saldo_mes >= 0 ? 'pos' : 'neg']">
                {{ (itemSelecionado.saldo_mes >= 0 ? '+' : '') + itemSelecionado.saldo_mes.toFixed(2) }}h
              </div>
            </div>
            <div class="stat-box stat-destaque">
              <div class="stat-label">Saldo Acumulado</div>
              <div class="stat-val">{{ itemSelecionado.saldo_acumulado.toFixed(2) }}h</div>
            </div>
          </div>

          <!-- Tabela de Dias -->
          <div class="table-card">
            <div class="table-header">Espelho Diário</div>
            <div v-if="loadingDias" class="table-loading"><div class="spin-sm"></div> Carregando dias...</div>
            <table v-else class="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Jornada</th>
                  <th>Batidas</th>
                  <th>Líquido</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in dias" :key="d.dtStr" :class="{ 'row-dom': d.isDomingo }">
                  <td>{{ d.dia }}/{{ itemSelecionado.mes }} ({{ d.dayName }})</td>
                  <td>
                    <span v-if="d.just" class="just-badge">{{ d.just.tipo }}</span>
                    <span v-else-if="d.previsto > 0">{{ formatSec(d.previsto) }}</span>
                    <span v-else class="td-muted">—</span>
                  </td>
                  <td class="td-mono td-muted">{{ d.batidas.join(' | ') || '—' }}</td>
                  <td>{{ d.trabalhado > 0 ? formatSec(d.trabalhado) : '—' }}</td>
                  <td :class="d.diff > 0 ? 'pos' : d.diff < 0 ? 'neg' : ''">
                    {{ d.diff === 0 ? '—' : (d.diff > 0 ? '+' : '-') + formatSec(Math.abs(d.diff)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="det-right">
          <!-- Card Financeiro -->
          <div class="fin-card">
            <h3 class="fin-title">Resumo de Pagamento</h3>
            <div class="fin-row">
              <span>Salário Proporcional</span>
              <strong>{{ fmt(salarioProp) }}</strong>
            </div>
            <div v-if="itemSelecionado.valor_horas_extras > 0" class="fin-row">
              <span>Horas Extras Pagas</span>
              <div class="fin-col">
                <strong>{{ fmt(itemSelecionado.valor_horas_extras) }}</strong>
                <small v-if="itemSelecionado.qtd_horas_extras_normais">{{ itemSelecionado.qtd_horas_extras_normais }}h normais</small>
                <small v-if="itemSelecionado.qtd_horas_extras_domingo">{{ itemSelecionado.qtd_horas_extras_domingo }}h domingo</small>
              </div>
            </div>
            <div v-if="itemSelecionado.valor_descontos > 0" class="fin-row">
              <span>Descontos</span>
              <strong class="neg">- {{ fmt(itemSelecionado.valor_descontos) }}</strong>
            </div>
            <div class="divider"></div>
            <div class="total-row">
              <span>LÍQUIDO ESTIMADO</span>
              <strong>{{ fmt(itemSelecionado.total_liquido) }}</strong>
            </div>

            <!-- Botões de Ação -->
            <div v-if="itemSelecionado.espelho_status === 'enviado'" class="acoes-espelho">
              <button class="btn-aprovar" :disabled="processando" @click="aprovar">
                <span v-if="processando" class="spin-xs"></span>
                ✅ Aprovar Espelho
              </button>
              <button class="btn-rejeitar" :disabled="processando" @click="modalRejeitar = true">
                ❌ Rejeitar / Contestar
              </button>
              <p class="aviso-acao">Ao aprovar, você confirma a exatidão das batidas e valores apresentados acima.</p>
            </div>
            <div v-else-if="itemSelecionado.espelho_status === 'rejeitado'" class="motivo-rejeicao">
               <strong>Você rejeitou este espelho:</strong>
               <p>{{ itemSelecionado.espelho_observacao || 'Nenhum motivo informado.' }}</p>
               <small>Aguarde a revisão da administração.</small>
            </div>
            <div v-else-if="itemSelecionado.espelho_status === 'aprovado'" class="msg-aprovado">
               ✅ Este espelho foi aprovado por você em {{ fmtData(itemSelecionado.espelho_aprovado_em) }}.
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal Rejeição -->
    <Teleport to="body">
      <div v-if="modalRejeitar" class="modal-backdrop" @click.self="modalRejeitar = false">
        <div class="modal-box">
          <div class="modal-header">
            <h2 class="modal-title">Contestar Fechamento</h2>
            <button class="modal-close" @click="modalRejeitar = false">×</button>
          </div>
          <div class="modal-body">
            <p class="modal-desc">Por favor, informe o motivo da contestação (ex: batida esquecida, falta não abonada, etc.):</p>
            <textarea v-model="motivoRejeicao" class="ep-textarea" rows="4" placeholder="Escreva aqui seu comentário..."></textarea>
          </div>
          <div class="modal-footer">
            <button class="modal-btn cancel" @click="modalRejeitar = false">Cancelar</button>
            <button class="modal-btn save" :disabled="!motivoRejeicao.trim() || processando" @click="rejeitar">
              <span v-if="processando" class="spin-xs"></span>
              Enviar Contestação
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" :class="['ep-toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';

const sessao = useSessaoStore();
const meses  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const loading      = ref(true);
const processando  = ref(false);
const fechamentos  = ref([]);
const funcionario  = ref(null);
const itemSelecionado = ref(null);
const loadingDias  = ref(false);
const dias         = ref([]);

const modalRejeitar   = ref(false);
const motivoRejeicao  = ref('');
const toastMsg        = ref('');
const toastTipo       = ref('ok');

function toast(msg, tipo = 'ok') {
  toastMsg.value = msg;
  toastTipo.value = tipo;
  setTimeout(() => { toastMsg.value = ''; }, 3500);
}

function statusTexto(s) {
  if (s === 'enviado')   return 'Pendente';
  if (s === 'aprovado')  return 'Aprovado';
  if (s === 'rejeitado') return 'Rejeitado';
  return s;
}

const salarioProp = computed(() => {
  if (!itemSelecionado.value) return 0;
  // O valor total líquido e extras já vêm calculados do banco
  // Calculamos apenas visualmente o salário proporcional para o funcionário ver
  return itemSelecionado.value.salario_base / 2; 
});

async function carregar() {
  loading.value = true;
  try {
    const mat = sessao.operador?.matricula;
    if (!mat) {
      toast('Login sem matrícula vinculada.', 'err');
      loading.value = false;
      return;
    }

    // 1. Acha o funcionário
    const { data: func, error: errF } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('matricula', mat)
      .eq('ativo', true)
      .single();
    
    if (errF || !func) throw new Error('Funcionário não localizado.');
    funcionario.value = func;

    // 2. Acha fechamentos (os últimos 6 meses)
    const { data: list, error: errL } = await supabase
      .from('fechamento_ponto')
      .select('*')
      .eq('funcionario_pk', func.pk)
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
      .order('quinzena', { ascending: false })
      .limit(10);
    
    if (errL) throw errL;
    fechamentos.value = list || [];

  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  } finally {
    loading.value = false;
  }
}

async function selecionar(f) {
  itemSelecionado.value = f;
  loadingDias.value = true;
  dias.value = [];
  
  try {
    const dataIni = f.quinzena === 1 
      ? `${f.ano}-${String(f.mes).padStart(2,'0')}-01`
      : `${f.ano}-${String(f.mes).padStart(2,'0')}-16`;
    const dataFim = f.quinzena === 1
      ? `${f.ano}-${String(f.mes).padStart(2,'0')}-15`
      : new Date(f.ano, f.mes, 0).toISOString().split('T')[0];

    const [resP, resJ] = await Promise.all([
      supabase.from('registro_ponto').select('*').eq('funcionario_pk', f.funcionario_pk)
        .gte('data', dataIni).lte('data', dataFim).order('data').order('hora'),
      supabase.from('justificativas_ponto').select('*').eq('funcionario_pk', f.funcionario_pk)
        .gte('data', dataIni).lte('data', dataFim),
    ]);

    processarDias(f, resP.data || [], resJ.data || [], dataIni, dataFim);

  } catch (e) {
    toast('Erro ao carregar detalhes: ' + e.message, 'err');
  } finally {
    loadingDias.value = false;
  }
}

function processarDias(fech, punches, justifications, dataIni, dataFim) {
  const func = funcionario.value;
  const cargaSec = (func.carga_horaria_diaria || 8) * 3600;
  const intSec   = (func.minutos_intervalo || 60) * 60;
  const DAYS     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const diasMap = {};
  punches.forEach(p => {
    if (!diasMap[p.data]) diasMap[p.data] = [];
    diasMap[p.data].push(p.hora.substring(0, 5));
  });

  const list = [];
  const dIni = new Date(dataIni + 'T00:00:00');
  const dFim = new Date(dataFim + 'T00:00:00');

  for (let dt = new Date(dIni); dt <= dFim; dt.setDate(dt.getDate() + 1)) {
    const dtStr = dt.toISOString().split('T')[0];
    const bats  = diasMap[dtStr] || [];
    const isDomingo = dt.getDay() === 0;
    const just = justifications.find(j => j.data === dtStr) || null;
    
    let previsto = (func.diarista || isDomingo || just) ? 0 : cargaSec;
    let trabalhado = 0;
    
    if (bats.length >= 2) {
      let ent = timeToSec(bats[0]);
      let sai = timeToSec(bats[bats.length - 1]);
      trabalhado = Math.max(0, sai - ent - intSec);
    }

    list.push({
      dtStr, dia: dt.getDate(), dayName: DAYS[dt.getDay()],
      isDomingo, previsto, trabalhado, just,
      batidas: bats,
      diff: trabalhado - previsto
    });
  }
  dias.value = list;
}

async function aprovar() {
  if (!confirm('Confirmar aprovação deste espelho?')) return;
  processando.value = true;
  try {
    const { error } = await supabase.from('fechamento_ponto')
      .update({ 
        espelho_status: 'aprovado', 
        espelho_aprovado_em: new Date().toISOString() 
      })
      .eq('pk', itemSelecionado.value.pk);
    
    if (error) throw error;
    itemSelecionado.value.espelho_status = 'aprovado';
    itemSelecionado.value.espelho_aprovado_em = new Date().toISOString();
    toast('Espelho aprovado com sucesso!');
    await carregar();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  } finally {
    processando.value = false;
  }
}

async function rejeitar() {
  processando.value = true;
  try {
    const { error } = await supabase.from('fechamento_ponto')
      .update({ 
        espelho_status: 'rejeitado', 
        espelho_observacao: motivoRejeicao.value 
      })
      .eq('pk', itemSelecionado.value.pk);
    
    if (error) throw error;
    itemSelecionado.value.espelho_status = 'rejeitado';
    itemSelecionado.value.espelho_observacao = motivoRejeicao.value;
    modalRejeitar.value = false;
    toast('Contestação enviada.');
    await carregar();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  } finally {
    processando.value = false;
  }
}

// Helpers
function timeToSec(t) { const [h, m] = t.split(':'); return +h * 3600 + +m * 60; }
function formatSec(s) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}h${String(m).padStart(2,'0')}`; }
function fmt(v) { return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0); }
function fmtData(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }

onMounted(carregar);
</script>

<style scoped>
.ep-wrap { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }

.ep-title { font-size: 1.6rem; font-weight: 800; color: var(--text); margin: 0; }
.ep-sub   { font-size: 0.9rem; color: var(--text2); }

.estado-msg { padding: 80px 20px; text-align: center; color: var(--text2); font-size: 1rem; }

/* Grid de Fechamentos */
.grid-fechamentos { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }

.f-card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; padding: 20px; cursor: pointer;
  transition: transform .2s, border-color .2s;
  display: flex; flex-direction: column; gap: 16px;
}
.f-card:hover { border-color: var(--primary, #6366f1); transform: translateY(-3px); }

.f-periodo { display: flex; flex-direction: column; }
.f-qnz { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: 0.5px; }
.f-mes-ano { font-size: 1.25rem; font-weight: 800; color: var(--text); }

.f-resumo { display: flex; gap: 24px; }
.f-stat   { display: flex; flex-direction: column; gap: 2px; }
.f-label  { font-size: 0.65rem; color: var(--text2); text-transform: uppercase; }
.f-val    { font-size: 0.95rem; font-weight: 700; color: var(--text); }

.btn-detalhes {
  margin-top: 8px; width: 100%; padding: 10px;
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 10px; color: var(--text2); font-weight: 600; font-size: 0.85rem;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

/* Detalhes */
.detalhes-header { display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.btn-voltar {
  background: var(--bg3); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 14px; color: var(--text2); font-size: 0.8rem; font-weight: 600;
  display: flex; align-items: center; gap: 6px; cursor: pointer;
}

.status-periodo h2 { margin: 8px 0 0; font-size: 1.5rem; font-weight: 800; }

.det-layout { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }
@media (max-width: 1000px) { .det-layout { grid-template-columns: 1fr; } }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr 1fr; } }

.stat-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
.stat-destaque { border-color: var(--primary, #6366f1); }
.stat-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--text2); margin-bottom: 4px; }
.stat-val   { font-size: 1.15rem; font-weight: 800; font-family: monospace; }

.table-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-top: 20px; }
.table-header { padding: 16px 20px; font-weight: 700; border-bottom: 1px solid var(--border); background: var(--bg3); }
.tabela { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.tabela th { padding: 12px 20px; text-align: left; font-size: 0.7rem; color: var(--text2); text-transform: uppercase; background: var(--bg3); border-bottom: 2px solid var(--border); }
.tabela td { padding: 12px 20px; border-bottom: 1px solid var(--border); }
.row-dom td:first-child { color: #ea580c; font-weight: 700; }

.fin-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 24px; position: sticky; top: 20px; display: flex; flex-direction: column; gap: 16px; }
.fin-title { margin: 0; font-size: 1rem; font-weight: 800; }
.fin-row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 0.9rem; }
.fin-row span { color: var(--text2); }
.fin-col { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.fin-col small { font-size: 0.75rem; color: #6366f1; }

.divider { height: 1px; background: var(--border); margin: 4px 0; }
.total-row { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px; background: rgba(99,102,241,0.08); border-radius: 12px; border: 1px solid rgba(99,102,241,0.2); }
.total-row span { font-size: 0.7rem; font-weight: 700; color: #6366f1; }
.total-row strong { font-size: 1.6rem; font-weight: 800; color: #4338ca; }

.acoes-espelho { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
.btn-aprovar { background: #10b981; color: #fff; padding: 14px; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; font-size: 0.95rem; }
.btn-rejeitar { background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
.aviso-acao { font-size: 0.72rem; color: var(--text2); text-align: center; font-style: italic; }

.motivo-rejeicao { background: #fef2f2; border: 1px solid #fca5a5; padding: 16px; border-radius: 12px; color: #991b1b; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; }
.msg-aprovado { background: #ecfdf5; border: 1px solid #10b981; padding: 16px; border-radius: 12px; color: #065f46; font-weight: 700; text-align: center; }

/* Status Badges */
.badge-status { padding: 4px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-status.enviado { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; }
.badge-status.aprovado { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; }
.badge-status.rejeitado { background: #fef2f2; color: #ef4444; border: 1px solid #fecdd3; }

.ep-textarea { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: 12px; color: var(--text); font-family: inherit; outline: none; }
.ep-textarea:focus { border-color: #6366f1; }

.modal-desc { font-size: 0.9rem; color: var(--text2); margin-bottom: 12px; }

.ep-toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.ep-toast.ok { background: #10b981; }
.ep-toast.err { background: #ef4444; }

.pos { color: #10b981 !important; }
.neg { color: #ef4444 !important; }
.td-mono { font-family: monospace; }
.td-muted { color: var(--text2); opacity: 0.8; }
.just-badge { background: var(--bg3); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }

.spin { width: 22px; height: 22px; border: 2px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { width: 16px; height: 16px; border: 2px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.spin-xs { width: 13px; height: 13px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
