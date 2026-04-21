<template>
  <div class="cv-wrap animate-fade">

    <!-- Header -->
    <div class="cv-header">
      <div>
        <h2 class="page-title">
          <span class="material-symbols-outlined">account_balance</span>
          Consolidação de Recebimentos
        </h2>
        <p class="cv-sub">Confirme quando o dinheiro de cada venda entrou na conta.</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="cv-filters card-glass">
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
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">PIX</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
          <option value="crediario">Crediário</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select v-model="filtro.status" class="f-input">
          <option value="pendente">Pendentes</option>
          <option value="confirmado">Confirmados</option>
          <option value="">Todos</option>
        </select>
      </div>
      <button class="btn-buscar" @click="carregar" :disabled="carregando">
        <span class="material-symbols-outlined">search</span>
        Buscar
      </button>
    </div>

    <!-- Totalizadores -->
    <div v-if="!carregando && lista.length" class="cv-totals">
      <div v-for="card in totaisPorForma" :key="card.forma" class="total-card">
        <span class="material-symbols-outlined tc-icon" :style="{ color: corForma(card.forma) }">
          {{ iconeForma(card.forma) }}
        </span>
        <div>
          <p class="tc-label">{{ labelForma(card.forma) }}</p>
          <strong class="tc-val">{{ fmt(card.total) }}</strong>
          <span class="tc-count">{{ card.qtd }} lançamento{{ card.qtd !== 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- Estado -->
    <div v-if="carregando" class="state-center">
      <span class="spin"></span> Buscando lançamentos…
    </div>
    <div v-else-if="!lista.length" class="state-center muted">
      <span class="material-symbols-outlined" style="font-size:40px;opacity:.3">check_circle</span>
      {{ filtro.status === 'pendente' ? 'Nenhum recebimento pendente neste período.' : 'Nenhum lançamento encontrado.' }}
    </div>

    <!-- Lista -->
    <div v-else class="cv-lista card-glass">
      <div v-for="p in lista" :key="p.pk" :class="['cv-row', { confirmed: p.confirmado, expanded: expandido === p.pk }]">

        <!-- Info principal -->
        <div class="cv-row-main" @click="toggleExpand(p)">
          <div class="cv-col-data">
            <span class="data-venda">{{ fmtData(p.vendas?.criado_em) }}</span>
            <span class="hora-venda">{{ fmtHora(p.vendas?.criado_em) }}</span>
          </div>

          <div class="cv-col-venda">
            <span class="num-venda">#{{ p.vendas?.numero || p.venda_pk }}</span>
            <span class="cliente-nome">{{ p.vendas?.cliente || 'Sem cliente' }}</span>
          </div>

          <div class="cv-col-forma">
            <span class="badge-forma" :style="{ background: bgForma(p.forma), color: corForma(p.forma) }">
              <span class="material-symbols-outlined" style="font-size:14px">{{ iconeForma(p.forma) }}</span>
              {{ labelForma(p.forma) }}
            </span>
          </div>

          <div class="cv-col-valor">
            <strong class="valor-pag">{{ fmt(p.valor) }}</strong>
          </div>

          <div class="cv-col-prev">
            <span class="prev-label">Prev. recebimento</span>
            <span class="prev-data">{{ fmtDataSimples(dataPrevisao(p)) }}</span>
          </div>

          <div class="cv-col-status">
            <span v-if="p.confirmado" class="badge-ok">
              <span class="material-symbols-outlined">check_circle</span>
              {{ fmtDataSimples(p.data_recebimento) }}
            </span>
            <span v-else class="badge-pend">Pendente</span>
          </div>

          <div class="cv-col-action">
            <span class="material-symbols-outlined exp-ico">
              {{ expandido === p.pk ? 'expand_less' : 'expand_more' }}
            </span>
          </div>
        </div>

        <!-- Painel de confirmação (expansível) -->
        <div v-if="expandido === p.pk" class="cv-confirm-panel">
          <div class="confirm-fields">
            <div class="cf-group">
              <label>Data de recebimento</label>
              <input type="date" v-model="form[p.pk].data_recebimento" class="cf-input" />
            </div>
            <div class="cf-group">
              <label>Conta</label>
              <select v-model="form[p.pk].conta_pk" class="cf-input">
                <option :value="null">Selecionar conta…</option>
                <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
              </select>
            </div>
            <div class="cf-group cf-group-obs">
              <label>Observação</label>
              <input type="text" v-model="form[p.pk].obs" class="cf-input" placeholder="Opcional…" />
            </div>
          </div>
          <div class="confirm-actions">
            <button v-if="p.confirmado" class="btn-desfazer" @click="desfazer(p)" :disabled="salvando[p.pk]">
              <span class="material-symbols-outlined">undo</span>
              Desfazer
            </button>
            <button class="btn-confirmar" @click="confirmar(p)" :disabled="salvando[p.pk] || !form[p.pk].data_recebimento">
              <span v-if="salvando[p.pk]" class="spin-sm"></span>
              <span class="material-symbols-outlined" v-else>check</span>
              {{ p.confirmado ? 'Atualizar' : 'Confirmar recebimento' }}
            </button>
          </div>
        </div>

      </div>
    </div>

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
import { ref, computed, reactive, onMounted } from 'vue';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const sessaoStore = useSessaoStore();

// ── Estado ────────────────────────────────────────────────────
const hoje = new Date().toISOString().slice(0, 10);
const inicioMes = hoje.slice(0, 8) + '01';
const filtro    = ref({ de: inicioMes, ate: hoje, forma: '', status: 'pendente' });

const carregando = ref(false);
const lista      = ref([]);
const contas     = ref([]);
const expandido  = ref(null);
const salvando   = reactive({});
const form       = reactive({});
const toastMsg   = ref('');
const toastTipo  = ref('ok');
let toastTimer   = null;

// ── Totais por forma ─────────────────────────────────────────
const totaisPorForma = computed(() => {
  const mapa = {};
  lista.value.forEach(p => {
    if (!mapa[p.forma]) mapa[p.forma] = { forma: p.forma, total: 0, qtd: 0 };
    mapa[p.forma].total += parseFloat(p.valor || 0);
    mapa[p.forma].qtd++;
  });
  return Object.values(mapa).sort((a, b) => b.total - a.total);
});

onMounted(() => {
  carregarContas();
  carregar();
});

async function carregarContas() {
  const { data } = await supabase
    .from('contas_bancarias')
    .select('pk, nome')
    .eq('filial_pk', sessaoStore.filial?.pk)
    .order('nome');
  contas.value = data || [];
}

async function carregar() {
  carregando.value = true;
  try {
    const de  = filtro.value.de  + 'T00:00:00';
    const ate = filtro.value.ate + 'T23:59:59';

    let q = supabase
      .from('pagamentos_venda')
      .select('*, vendas!inner(pk, numero, criado_em, cliente, filial_pk)')
      .eq('vendas.filial_pk', sessaoStore.filial?.pk)
      .gte('vendas.criado_em', de)
      .lte('vendas.criado_em', ate)
      .order('vendas(criado_em)', { ascending: false });

    if (filtro.value.forma)  q = q.eq('forma', filtro.value.forma);
    if (filtro.value.status === 'pendente')   q = q.eq('confirmado', false);
    if (filtro.value.status === 'confirmado') q = q.eq('confirmado', true);

    const { data, error } = await q;
    if (error) throw error;

    lista.value = data || [];

    // Inicializa formulário para cada item
    lista.value.forEach(p => {
      if (!form[p.pk]) {
        form[p.pk] = {
          data_recebimento: p.data_recebimento || dataPrevisao(p),
          conta_pk: p.conta_pk || null,
          obs: p.obs_recebimento || '',
        };
      }
    });
  } catch (e) {
    console.error(e);
    showToast('Erro ao carregar lançamentos.', 'err');
  } finally {
    carregando.value = false;
  }
}

function toggleExpand(p) {
  expandido.value = expandido.value === p.pk ? null : p.pk;
  if (!form[p.pk]) {
    form[p.pk] = {
      data_recebimento: p.data_recebimento || dataPrevisao(p),
      conta_pk: p.conta_pk || null,
      obs: p.obs_recebimento || '',
    };
  }
}

async function confirmar(p) {
  const f = form[p.pk];
  if (!f.data_recebimento) return;
  salvando[p.pk] = true;
  try {
    const { error } = await supabase
      .from('pagamentos_venda')
      .update({
        confirmado:       true,
        data_recebimento: f.data_recebimento,
        conta_pk:         f.conta_pk || null,
        obs_recebimento:  f.obs || null,
        confirmado_em:    new Date().toISOString(),
      })
      .eq('pk', p.pk);
    if (error) throw error;
    showToast('Recebimento confirmado!', 'ok');
    expandido.value = null;
    await carregar();
  } catch (e) {
    showToast('Erro ao confirmar: ' + e.message, 'err');
  } finally {
    salvando[p.pk] = false;
  }
}

async function desfazer(p) {
  salvando[p.pk] = true;
  try {
    const { error } = await supabase
      .from('pagamentos_venda')
      .update({ confirmado: false, data_recebimento: null, confirmado_em: null })
      .eq('pk', p.pk);
    if (error) throw error;
    showToast('Confirmação desfeita.', 'ok');
    expandido.value = null;
    await carregar();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    salvando[p.pk] = false;
  }
}

// ── Previsão de recebimento ───────────────────────────────────
function dataPrevisao(p) {
  const forma = p.forma?.toLowerCase();
  const base  = p.vendas?.criado_em ? new Date(p.vendas.criado_em) : new Date();
  const data  = new Date(base);

  if (forma === 'dinheiro' || forma === 'pix') {
    return toDateStr(data);
  }
  if (forma === 'debito') {
    return toDateStr(proximoDiaUtil(data, 1));
  }
  if (forma === 'credito') {
    return toDateStr(proximoDiaUtil(data, 1));
  }
  return toDateStr(data);
}

function proximoDiaUtil(base, dias) {
  const d = new Date(base);
  let adicionados = 0;
  while (adicionados < dias) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) adicionados++; // pula sábado e domingo
  }
  return d;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// ── Helpers visuais ───────────────────────────────────────────
function labelForma(f) {
  const m = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito', crediario: 'Crediário' };
  return m[f?.toLowerCase()] || f || '—';
}
function iconeForma(f) {
  const m = { dinheiro: 'payments', pix: 'qr_code', debito: 'credit_card', credito: 'add_card', crediario: 'receipt_long' };
  return m[f?.toLowerCase()] || 'attach_money';
}
function corForma(f) {
  const m = { dinheiro: '#4ade80', pix: '#60a5fa', debito: '#f59e0b', credito: '#c084fc', crediario: '#f87171' };
  return m[f?.toLowerCase()] || '#94a3b8';
}
function bgForma(f) {
  const m = { dinheiro: 'rgba(74,222,128,.12)', pix: 'rgba(96,165,250,.12)', debito: 'rgba(245,158,11,.12)', credito: 'rgba(192,132,252,.12)', crediario: 'rgba(248,113,113,.12)' };
  return m[f?.toLowerCase()] || 'rgba(148,163,184,.1)';
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtHora(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDataSimples(s) {
  if (!s) return '—';
  const [y, m, dia] = s.split('-');
  return `${dia}/${m}/${y}`;
}

function showToast(msg, tipo = 'ok') {
  toastMsg.value = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3000);
}
</script>

<style scoped>
.cv-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 80px; display: flex; flex-direction: column; gap: 20px; }

.cv-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.cv-sub { color: var(--text2); font-size: 13px; margin: 0; }

/* Filtros */
.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; }
.cv-filters { display: flex; align-items: flex-end; gap: 12px; padding: 16px 20px; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 5px; }
.filter-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.f-input { padding: 7px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 120px; }
.f-input:focus { outline: none; border-color: var(--accent); }
.btn-buscar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: var(--accent); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; height: 35px; }
.btn-buscar:disabled { opacity: .5; cursor: not-allowed; }

/* Totais */
.cv-totals { display: flex; gap: 12px; flex-wrap: wrap; }
.total-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; flex: 1; min-width: 160px; }
.tc-icon { font-size: 28px; flex-shrink: 0; }
.tc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); margin: 0 0 2px; }
.tc-val { font-size: 16px; font-weight: 800; color: var(--text); display: block; font-family: var(--mono, monospace); }
.tc-count { font-size: 11px; color: var(--text2); }

/* Lista */
.cv-lista { overflow: hidden; }
.cv-row { border-bottom: 1px solid var(--border); transition: background .15s; }
.cv-row:last-child { border-bottom: none; }
.cv-row.confirmed { background: rgba(74,222,128,.03); }
.cv-row-main { display: grid; grid-template-columns: 80px 1fr 130px 110px 140px 130px 36px; align-items: center; gap: 12px; padding: 14px 20px; cursor: pointer; }
.cv-row-main:hover { background: var(--bg3); }

.cv-col-data { display: flex; flex-direction: column; }
.data-venda { font-size: 13px; font-weight: 600; color: var(--text); }
.hora-venda { font-size: 11px; color: var(--text2); }

.cv-col-venda { display: flex; flex-direction: column; min-width: 0; }
.num-venda { font-size: 12px; font-weight: 700; color: var(--accent); }
.cliente-nome { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.badge-forma { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }

.valor-pag { font-size: 15px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); }

.cv-col-prev { display: flex; flex-direction: column; }
.prev-label { font-size: 10px; color: var(--text2); text-transform: uppercase; letter-spacing: .04em; }
.prev-data { font-size: 13px; font-weight: 600; color: var(--text2); }

.badge-ok { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #4ade80; }
.badge-ok .material-symbols-outlined { font-size: 15px; }
.badge-pend { font-size: 12px; font-weight: 600; color: #f59e0b; background: rgba(245,158,11,.12); padding: 3px 10px; border-radius: 20px; }

.exp-ico { font-size: 18px; color: var(--text2); }

/* Painel de confirmação */
.cv-confirm-panel { padding: 16px 20px 20px; background: var(--bg3); border-top: 1px solid var(--border); }
.confirm-fields { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.cf-group { display: flex; flex-direction: column; gap: 5px; }
.cf-group-obs { flex: 1; min-width: 200px; }
.cf-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.cf-input { padding: 7px 12px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 150px; }
.cf-input:focus { outline: none; border-color: var(--accent); }
.confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn-confirmar { display: flex; align-items: center; gap: 6px; padding: 9px 20px; background: #16a34a; border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-confirmar:disabled { opacity: .5; cursor: not-allowed; }
.btn-desfazer { display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: 9px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; }

/* Toast */
.cv-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap; }
.cv-toast.ok  { background: #166534; color: #bbf7d0; }
.cv-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

.state-center { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px; color: var(--text2); font-size: 14px; }
.spin { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .cv-row-main { grid-template-columns: 70px 1fr 100px 90px; }
  .cv-col-prev, .cv-col-status { display: none; }
}
</style>
