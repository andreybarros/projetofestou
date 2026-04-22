<template>
  <div class="cv-wrap animate-fade">

    <!-- Header -->
    <div class="cv-header">
      <div>
        <h2 class="page-title">
          <span class="material-symbols-outlined">account_balance</span>
          Consolidação de Recebimentos
        </h2>
        <p class="cv-sub">Confirme recebimentos por venda e registre entradas avulsas no banco.</p>
      </div>
    </div>

    <!-- Filtros globais -->
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
          <option v-for="f in formas" :key="f.val" :value="f.val">{{ f.label }}</option>
        </select>
      </div>
      <button class="btn-buscar" @click="carregar" :disabled="carregando">
        <span class="material-symbols-outlined">search</span>
        Buscar
      </button>
    </div>

    <!-- Layout duas colunas -->
    <div class="cv-cols">

      <!-- ══ ESQUERDA: Vendas pendentes ══ -->
      <div class="cv-col-left">
        <div class="col-header">
          <span class="material-symbols-outlined col-ico" style="color:#f59e0b">pending_actions</span>
          <div>
            <h3 class="col-title">Vendas Pendentes</h3>
            <p class="col-sub">Confirme em qual conta o dinheiro entrou</p>
          </div>
          <span v-if="listaPendentes.length" class="col-badge">{{ listaPendentes.length }}</span>
        </div>

        <div v-if="carregando" class="state-center"><span class="spin"></span></div>
        <div v-else-if="!listaPendentes.length" class="state-center muted">
          <span class="material-symbols-outlined" style="font-size:36px;opacity:.25">check_circle</span>
          Nenhum pagamento pendente.
        </div>

        <div v-else class="pend-lista">
          <div v-for="p in listaPendentes" :key="p.pk" :class="['pend-row', { expanded: expandido === p.pk }]">

            <!-- Linha principal -->
            <div class="pend-main" @click="toggleExpand(p)">
              <div class="pend-data">
                <span>{{ p.venda_data }}</span>
                <span class="pend-hora">{{ p.venda_hora }}</span>
              </div>
              <div class="pend-info">
                <span class="pend-num">#{{ p.venda_numero }}</span>
                <span class="pend-cliente">{{ p.venda_cliente || 'Sem cliente' }}</span>
              </div>
              <span class="badge-forma" :style="{ background: bgForma(p.forma), color: corForma(p.forma) }">
                {{ labelForma(p.forma) }}
              </span>
              <strong class="pend-valor">{{ fmt(p.valor) }}</strong>
              <div class="pend-prev">
                <span class="prev-label">Prev.</span>
                <span>{{ p.data_prevista }}</span>
              </div>
              <span class="material-symbols-outlined exp-ico">{{ expandido === p.pk ? 'expand_less' : 'expand_more' }}</span>
            </div>

            <!-- Painel inline de confirmação -->
            <div v-if="expandido === p.pk" class="pend-confirm">
              <div class="confirm-row">
                <div class="cf-group">
                  <label>Data recebida</label>
                  <input type="date" v-model="formPend[p.pk].data_recebimento" class="cf-input" />
                </div>
                <div class="cf-group">
                  <label>Conta</label>
                  <select v-model="formPend[p.pk].conta_pk" class="cf-input">
                    <option :value="null">Selecionar…</option>
                    <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
                  </select>
                </div>
                <div class="cf-group cf-obs">
                  <label>Obs.</label>
                  <input type="text" v-model="formPend[p.pk].descricao" class="cf-input" placeholder="Opcional" />
                </div>
              </div>
              <div class="confirm-actions">
                <button class="btn-confirmar" @click="confirmarPendente(p)"
                  :disabled="salvando[p.pk] || !formPend[p.pk].data_recebimento">
                  <span v-if="salvando[p.pk]" class="spin-sm"></span>
                  <span class="material-symbols-outlined" v-else>check</span>
                  Confirmar recebimento
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- ══ DIREITA: Lançamento avulso ══ -->
      <div class="cv-col-right">

        <!-- Formulário de lançamento manual -->
        <div class="col-header">
          <span class="material-symbols-outlined col-ico" style="color:#60a5fa">add_circle</span>
          <div>
            <h3 class="col-title">Lançamento Avulso</h3>
            <p class="col-sub">Entrada no banco sem venda vinculada</p>
          </div>
        </div>

        <div class="manual-form card-glass">
          <div class="mf-row">
            <div class="mf-group">
              <label>Data recebida <span class="obrig">*</span></label>
              <input type="date" v-model="manual.data_recebimento" class="cf-input" />
            </div>
            <div class="mf-group">
              <label>Valor <span class="obrig">*</span></label>
              <input type="number" v-model="manual.valor" class="cf-input" step="0.01" min="0" placeholder="0,00" />
            </div>
          </div>
          <div class="mf-row">
            <div class="mf-group">
              <label>Forma</label>
              <select v-model="manual.forma" class="cf-input">
                <option value="">Selecionar…</option>
                <option v-for="f in formas" :key="f.val" :value="f.val">{{ f.label }}</option>
              </select>
            </div>
            <div class="mf-group">
              <label>Conta</label>
              <select v-model="manual.conta_pk" class="cf-input">
                <option :value="null">Selecionar…</option>
                <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
              </select>
            </div>
          </div>
          <div class="mf-group mf-full">
            <label>Descrição</label>
            <input type="text" v-model="manual.descricao" class="cf-input"
              placeholder="Ex: Crédito Cielo 3 vendas 22/04…" />
          </div>
          <button class="btn-lancar" @click="salvarManual"
            :disabled="salvandoManual || !manual.data_recebimento || !manual.valor">
            <span v-if="salvandoManual" class="spin-sm"></span>
            <span class="material-symbols-outlined" v-else>add</span>
            Lançar Recebimento
          </button>
        </div>

        <!-- Lista de lançamentos avulsos -->
        <div class="col-header" style="margin-top:20px">
          <span class="material-symbols-outlined col-ico" style="color:#4ade80">receipt_long</span>
          <div>
            <h3 class="col-title">Recebimentos Lançados</h3>
            <p class="col-sub">{{ periodoLabel }}</p>
          </div>
        </div>

        <div v-if="!listaRec.length" class="state-center muted" style="padding:24px">
          <span class="material-symbols-outlined" style="font-size:32px;opacity:.25">account_balance_wallet</span>
          Nenhum lançamento no período.
        </div>

        <div v-else class="rec-lista card-glass">
          <div v-for="r in listaRec" :key="r.pk" class="rec-row">
            <div class="rec-data">{{ fmtDataSimples(r.data_recebimento) }}</div>
            <div class="rec-info">
              <span v-if="r.pagamento_pk" class="rec-venda">#{{ r.venda_numero || '—' }}</span>
              <span v-else class="badge-manual">Avulso</span>
              <span class="rec-desc">{{ r.descricao || r.venda_cliente || '—' }}</span>
            </div>
            <span class="badge-forma sm" :style="{ background: bgForma(r.forma), color: corForma(r.forma) }">
              {{ labelForma(r.forma) }}
            </span>
            <strong class="rec-valor">{{ fmt(r.valor) }}</strong>
            <div class="rec-actions">
              <button class="btn-icon" @click="excluirRec(r)" title="Excluir">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <!-- Total -->
          <div class="rec-total">
            <span>Total do período</span>
            <strong>{{ fmt(totalRec) }}</strong>
          </div>
        </div>

      </div>
    </div><!-- /cv-cols -->

    <!-- Modal confirmar exclusão -->
    <Teleport to="body">
      <div v-if="excluindo" class="modal-overlay" @click.self="excluindo = null">
        <div class="modal-box modal-sm">
          <div class="modal-header">
            <h3>Excluir Recebimento</h3>
          </div>
          <div class="modal-body">
            <p>Excluir o recebimento de <strong>{{ fmt(excluindo.valor) }}</strong> em
              <strong>{{ fmtDataSimples(excluindo.data_recebimento) }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="excluindo = null">Cancelar</button>
            <button class="btn-danger" @click="confirmarExclusao" :disabled="removendo">
              <span v-if="removendo" class="spin-sm"></span>
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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

const hoje      = new Date().toISOString().slice(0, 10);
const inicioMes = hoje.slice(0, 8) + '01';

const filtro    = ref({ de: inicioMes, ate: hoje, forma: '' });
const carregando = ref(false);

const listaPendentes = ref([]);
const listaRec       = ref([]);
const contas         = ref([]);
const expandido      = ref(null);
const salvando       = reactive({});
const formPend       = reactive({});

// Formulário manual
const manual       = ref({ data_recebimento: hoje, valor: '', forma: '', conta_pk: null, descricao: '' });
const salvandoManual = ref(false);

// Exclusão
const excluindo  = ref(null);
const removendo  = ref(false);

// Toast
const toastMsg  = ref('');
const toastTipo = ref('ok');
let toastTimer  = null;

const formas = [
  { val: 'dinheiro',  label: 'Dinheiro'  },
  { val: 'pix',       label: 'PIX'       },
  { val: 'debito',    label: 'Débito'    },
  { val: 'credito',   label: 'Crédito'   },
  { val: 'crediario', label: 'Crediário' },
];

const totalRec = computed(() =>
  listaRec.value.reduce((s, r) => s + parseFloat(r.valor || 0), 0)
);

const periodoLabel = computed(() =>
  `${fmtDataSimples(filtro.value.de)} a ${fmtDataSimples(filtro.value.ate)}`
);

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
  expandido.value  = null;
  try {
    await Promise.all([carregarPendentes(), carregarRecebimentos()]);
  } finally {
    carregando.value = false;
  }
}

async function carregarPendentes() {
  const de  = filtro.value.de  + 'T00:00:00';
  const ate = filtro.value.ate + 'T23:59:59';

  let q = supabase
    .from('pagamentos_venda')
    .select('pk, venda_pk, forma, valor, vendas!inner(pk, numero, criado_em, cliente, filial_pk)')
    .eq('vendas.filial_pk', sessaoStore.filial?.pk)
    .gte('vendas.criado_em', de)
    .lte('vendas.criado_em', ate);

  if (filtro.value.forma) q = q.eq('forma', filtro.value.forma);

  const { data: pagamentos, error } = await q;
  if (error) throw error;

  const pks = (pagamentos || []).map(p => p.pk);
  let jaConfirmados = new Set();
  if (pks.length) {
    const { data: recExist } = await supabase
      .from('recebimentos')
      .select('pagamento_pk')
      .in('pagamento_pk', pks);
    jaConfirmados = new Set((recExist || []).map(r => r.pagamento_pk));
  }

  const pendentes = (pagamentos || [])
    .filter(p => !jaConfirmados.has(p.pk))
    .map(p => {
      const v  = p.vendas;
      const dt = v?.criado_em ? new Date(v.criado_em) : new Date();
      return {
        pk:            p.pk,
        venda_pk:      p.venda_pk,
        venda_numero:  v?.numero,
        venda_cliente: v?.cliente,
        venda_data:    fmtDataSimples(dt.toISOString().slice(0, 10)),
        venda_hora:    dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        forma:         p.forma,
        valor:         p.valor,
        data_prevista: fmtDataSimples(dataPrevisao(p.forma, dt)),
      };
    })
    .sort((a, b) => b.venda_data.localeCompare(a.venda_data));

  listaPendentes.value = pendentes;

  pendentes.forEach(p => {
    if (!formPend[p.pk]) {
      formPend[p.pk] = {
        data_recebimento: dataPrevisao(p.forma, new Date()),
        conta_pk: null,
        descricao: '',
      };
    }
  });
}

async function carregarRecebimentos() {
  let q = supabase
    .from('recebimentos')
    .select('*')
    .eq('filial_pk', sessaoStore.filial?.pk)
    .gte('data_recebimento', filtro.value.de)
    .lte('data_recebimento', filtro.value.ate)
    .order('data_recebimento', { ascending: false });

  if (filtro.value.forma) q = q.eq('forma', filtro.value.forma);

  const { data, error } = await q;
  if (error) throw error;

  const items    = data || [];
  const vendaPks = [...new Set(items.filter(r => r.venda_pk).map(r => r.venda_pk))];
  if (vendaPks.length) {
    const { data: vendas } = await supabase.from('vendas').select('pk, numero, cliente').in('pk', vendaPks);
    const vm = {};
    (vendas || []).forEach(v => { vm[v.pk] = v; });
    items.forEach(r => {
      if (r.venda_pk && vm[r.venda_pk]) {
        r.venda_numero  = vm[r.venda_pk].numero;
        r.venda_cliente = vm[r.venda_pk].cliente;
      }
    });
  }

  listaRec.value = items;
}

function toggleExpand(p) {
  expandido.value = expandido.value === p.pk ? null : p.pk;
}

async function confirmarPendente(p) {
  const f = formPend[p.pk];
  if (!f?.data_recebimento) return;
  salvando[p.pk] = true;
  try {
    const { error } = await supabase.from('recebimentos').insert({
      filial_pk:        sessaoStore.filial?.pk,
      pagamento_pk:     p.pk,
      venda_pk:         p.venda_pk,
      conta_pk:         f.conta_pk || null,
      data_recebimento: f.data_recebimento,
      valor:            p.valor,
      forma:            p.forma,
      descricao:        f.descricao || null,
    });
    if (error) throw error;
    showToast('Recebimento confirmado!', 'ok');
    expandido.value = null;
    await carregar();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    salvando[p.pk] = false;
  }
}

async function salvarManual() {
  const m = manual.value;
  if (!m.data_recebimento || !m.valor) return;
  salvandoManual.value = true;
  try {
    const { error } = await supabase.from('recebimentos').insert({
      filial_pk:        sessaoStore.filial?.pk,
      pagamento_pk:     null,
      venda_pk:         null,
      conta_pk:         m.conta_pk || null,
      data_recebimento: m.data_recebimento,
      valor:            parseFloat(m.valor),
      forma:            m.forma || null,
      descricao:        m.descricao || null,
    });
    if (error) throw error;
    showToast('Recebimento lançado!', 'ok');
    manual.value = { data_recebimento: hoje, valor: '', forma: '', conta_pk: null, descricao: '' };
    await carregarRecebimentos();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    salvandoManual.value = false;
  }
}

function excluirRec(r) { excluindo.value = r; }

async function confirmarExclusao() {
  removendo.value = true;
  try {
    const { error } = await supabase.from('recebimentos').delete().eq('pk', excluindo.value.pk);
    if (error) throw error;
    showToast('Excluído.', 'ok');
    excluindo.value = null;
    await carregarRecebimentos();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    removendo.value = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────
function dataPrevisao(forma, base) {
  const f = forma?.toLowerCase();
  const d = new Date(base);
  if (f === 'dinheiro' || f === 'pix') return d.toISOString().slice(0, 10);
  if (f === 'debito' || f === 'credito') return proximoDiaUtil(d, 1).toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function proximoDiaUtil(base, dias) {
  const d = new Date(base);
  let n = 0;
  while (n < dias) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return d;
}

function labelForma(f) {
  const m = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito', crediario: 'Crediário' };
  return m[f?.toLowerCase()] || f || '—';
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
function fmtDataSimples(s) {
  if (!s) return '—';
  const [y, m, dia] = String(s).split('-');
  return `${dia}/${m}/${y}`;
}
function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3500);
}
</script>

<style scoped>
.cv-wrap { max-width: 1300px; margin: 0 auto; padding: 24px 16px 80px; display: flex; flex-direction: column; gap: 18px; }

.cv-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.cv-sub { color: var(--text2); font-size: 13px; margin: 0; }

/* Filtros */
.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; }
.cv-filters { display: flex; align-items: flex-end; gap: 12px; padding: 14px 18px; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 5px; }
.filter-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.f-input { padding: 7px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 120px; }
.f-input:focus { outline: none; border-color: var(--accent); }
.btn-buscar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: var(--accent); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; height: 35px; align-self: flex-end; }
.btn-buscar:disabled { opacity: .5; cursor: not-allowed; }

/* Layout duas colunas */
.cv-cols { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }

/* Cabeçalho das colunas */
.col-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.col-ico { font-size: 26px; flex-shrink: 0; }
.col-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 2px; }
.col-sub { font-size: 12px; color: var(--text2); margin: 0; }
.col-badge { background: var(--accent); color: #fff; border-radius: 12px; font-size: 11px; font-weight: 700; padding: 2px 9px; margin-left: auto; }

/* ══ LISTA PENDENTES ══ */
.pend-lista { display: flex; flex-direction: column; gap: 4px; }
.pend-row { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: border-color .15s; }
.pend-row.expanded { border-color: var(--accent); }
.pend-main { display: grid; grid-template-columns: 70px 1fr 90px 90px 80px 24px; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; }
.pend-main:hover { background: var(--bg3); }

.pend-data { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; color: var(--text); }
.pend-hora { font-size: 11px; color: var(--text2); font-weight: 400; }
.pend-info { display: flex; flex-direction: column; min-width: 0; }
.pend-num { font-size: 11px; font-weight: 700; color: var(--accent); }
.pend-cliente { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge-forma { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.badge-forma.sm { font-size: 10px; padding: 2px 7px; }
.pend-valor { font-size: 14px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); text-align: right; }
.pend-prev { display: flex; flex-direction: column; font-size: 11px; color: var(--text2); }
.prev-label { font-size: 10px; text-transform: uppercase; letter-spacing: .03em; opacity: .6; }
.exp-ico { font-size: 18px; color: var(--text2); }

/* Painel de confirmação */
.pend-confirm { padding: 12px 14px 14px; background: var(--bg3); border-top: 1px solid var(--border); }
.confirm-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.cf-group { display: flex; flex-direction: column; gap: 4px; }
.cf-obs { flex: 1; min-width: 140px; }
.cf-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.cf-input { padding: 7px 10px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 130px; }
.cf-input:focus { outline: none; border-color: var(--accent); }
.confirm-actions { display: flex; justify-content: flex-end; }
.btn-confirmar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #16a34a; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-confirmar:disabled { opacity: .5; cursor: not-allowed; }

/* ══ COLUNA DIREITA ══ */
.cv-col-right { position: sticky; top: 16px; }

/* Formulário manual */
.manual-form { padding: 16px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 0; }
.mf-row { display: flex; gap: 10px; }
.mf-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 110px; }
.mf-full { flex: unset; }
.mf-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.obrig { color: var(--accent); }
.btn-lancar { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: var(--accent); border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; width: 100%; }
.btn-lancar:disabled { opacity: .5; cursor: not-allowed; }

/* Lista recebimentos lançados */
.rec-lista { overflow: hidden; }
.rec-row { display: grid; grid-template-columns: 68px 1fr 76px 80px 32px; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--border); }
.rec-row:last-of-type { border-bottom: none; }
.rec-data { font-size: 12px; font-weight: 600; color: var(--text); }
.rec-info { display: flex; flex-direction: column; min-width: 0; }
.rec-venda { font-size: 11px; font-weight: 700; color: var(--accent); }
.badge-manual { font-size: 10px; font-weight: 700; color: #60a5fa; background: rgba(96,165,250,.1); padding: 2px 6px; border-radius: 8px; display: inline-block; width: fit-content; }
.rec-desc { font-size: 12px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-valor { font-size: 13px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); text-align: right; }
.rec-actions { display: flex; justify-content: flex-end; }
.btn-icon { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: none; border: 1px solid var(--border); border-radius: 6px; color: var(--text2); cursor: pointer; }
.btn-icon:hover { color: #f87171; border-color: #f87171; }
.btn-icon .material-symbols-outlined { font-size: 14px; }
.rec-total { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-top: 1px solid var(--border); font-size: 13px; background: var(--bg3); border-radius: 0 0 14px 14px; }
.rec-total strong { font-family: var(--mono, monospace); font-size: 15px; color: var(--text); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 16px; }
.modal-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 520px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-sm { max-width: 380px; }
.modal-header { padding: 18px 22px 14px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.modal-body { padding: 18px 22px; }
.modal-body p { color: var(--text); font-size: 14px; margin: 0; line-height: 1.5; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px; border-top: 1px solid var(--border); }
.btn-cancel { padding: 8px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-danger { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #991b1b; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-danger:disabled { opacity: .5; cursor: not-allowed; }

/* Toast */
.cv-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap; }
.cv-toast.ok  { background: #166534; color: #bbf7d0; }
.cv-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; color: var(--text2); font-size: 13px; }
.muted { opacity: .6; }
.spin { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .cv-cols { grid-template-columns: 1fr; }
  .cv-col-right { position: static; }
  .pend-main { grid-template-columns: 60px 1fr 80px 80px; }
  .pend-prev { display: none; }
}
</style>
