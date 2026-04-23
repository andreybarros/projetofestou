<template>
  <div class="dash-wrap">

    <!-- Cabeçalho -->
    <div class="dash-header">
      <div>
        <h1 class="dash-title">{{ saudacao }}, {{ sessaoStore.operador?.nome?.split(' ')[0] || 'bem-vindo' }}</h1>
        <p class="dash-sub">{{ dataHoje }} · {{ sessaoStore.filial?.nome || 'Filial não definida' }}</p>
      </div>
      <button class="btn-refresh" @click="recarregar" :class="{ spinning: carregando }" title="Atualizar">
        <span class="material-symbols-outlined">refresh</span>
      </button>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon kpi-indigo">
          <span class="material-symbols-outlined">shopping_cart</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-label">Vendas Hoje</span>
          <span class="kpi-value">{{ carregando ? '—' : totalHoje }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon kpi-green">
          <span class="material-symbols-outlined">payments</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-label">Faturamento Hoje</span>
          <span class="kpi-value kpi-green-text">{{ carregando ? '—' : fmt(faturamentoHoje) }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon kpi-amber">
          <span class="material-symbols-outlined">inventory_2</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-label">Produtos Cadastrados</span>
          <span class="kpi-value">{{ carregando ? '—' : totalProdutos }}</span>
        </div>
      </div>

      <div class="kpi-card" :class="{ 'kpi-card-alert': semEstoque > 0 }">
        <div class="kpi-icon kpi-red">
          <span class="material-symbols-outlined">warning</span>
        </div>
        <div class="kpi-body">
          <span class="kpi-label">Estoque Zerado</span>
          <span class="kpi-value kpi-red-text">{{ carregando ? '—' : semEstoque }}</span>
        </div>
      </div>
    </div>

    <!-- Painéis inferiores -->
    <div class="bottom-grid">

      <!-- Últimas Vendas -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="material-symbols-outlined">receipt_long</span>
            Últimas Vendas
          </div>
          <router-link to="/historico-vendas" class="panel-link">
            Ver todas
            <span class="material-symbols-outlined">arrow_forward</span>
          </router-link>
        </div>

        <div v-if="carregando" class="panel-loading">
          <div class="spinner"></div>
        </div>

        <div v-else-if="ultimasVendas.length === 0" class="panel-vazio">
          <span class="material-symbols-outlined">inbox</span>
          <p>Nenhuma venda registrada</p>
        </div>

        <table v-else class="mini-table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in ultimasVendas" :key="v.pk">
              <td class="col-num">#{{ v.numero }}</td>
              <td class="col-cliente">{{ v.cliente || 'Consumidor Final' }}</td>
              <td class="col-op">{{ v.vendedor || v.operador || '—' }}</td>
              <td class="col-total">{{ fmt(v.total) }}</td>
              <td>
                <span :class="['mini-badge', statusCls(v.status)]">{{ v.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Caixa -->
      <div class="panel caixa-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="material-symbols-outlined">point_of_sale</span>
            Caixa Atual
          </div>
        </div>

        <div v-if="caixaStore.caixaAberto" class="caixa-aberto">
          <div class="caixa-status-row">
            <div class="caixa-dot open"></div>
            <span class="caixa-status-txt">Aberto</span>
          </div>

          <div class="caixa-rows">
            <div class="ci-row">
              <span class="ci-label">Abertura</span>
              <span class="ci-val">{{ fmt(caixaStore.caixaAberto.valor_abertura) }}</span>
            </div>
            <div class="ci-row highlight">
              <span class="ci-label">Saldo em Dinheiro</span>
              <span class="ci-val green">{{ fmt(caixaStore.saldoDinheiro) }}</span>
            </div>
            <div v-if="caixaStore.caixaAberto.operador" class="ci-row">
              <span class="ci-label">Operador</span>
              <span class="ci-val">{{ caixaStore.caixaAberto.operador }}</span>
            </div>
          </div>

          <router-link to="/caixa" class="btn-ir-caixa">
            <span class="material-symbols-outlined">open_in_new</span>
            Gerenciar Caixa
          </router-link>
        </div>

        <div v-else class="caixa-fechado">
          <div class="caixa-status-row">
            <div class="caixa-dot closed"></div>
            <span class="caixa-status-txt">Fechado</span>
          </div>
          <p class="caixa-fechado-msg">Nenhum caixa aberto nesta filial.</p>
          <router-link to="/caixa" class="btn-ir-caixa">
            <span class="material-symbols-outlined">lock_open</span>
            Abrir Caixa
          </router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useSessaoStore } from "../stores/sessao";
import { useCaixaStore }  from "../stores/caixa";
import { supabase }       from "../composables/useSupabase";

const sessaoStore   = useSessaoStore();
const caixaStore    = useCaixaStore();
const carregando    = ref(true);
const ultimasVendas = ref([]);
const totalHoje         = ref(0);
const faturamentoHoje   = ref(0);
const totalProdutos     = ref(0);
const semEstoque        = ref(0);

const agora = new Date();
const saudacao = computed(() => {
  const h = agora.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
});
const dataHoje = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

onMounted(recarregar);

async function recarregar() {
  carregando.value = true;
  await Promise.all([carregarVendas(), carregarProdutos(), verificarCaixa()]);
  carregando.value = false;
}

async function verificarCaixa() {
  if (sessaoStore.filial?.pk) await caixaStore.verificarStatus(sessaoStore.filial.pk);
}

async function carregarVendas() {
  const hoje = new Date().toLocaleDateString('en-CA');
  let q = supabase
    .from("vendas")
    .select("pk, numero, cliente, operador, vendedor, total, status, criado_em")
    .order("criado_em", { ascending: false })
    .limit(10);
  if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
  const { data } = await q;
  ultimasVendas.value = data || [];
  const hoje_vendas = (data || []).filter(v => v.criado_em?.startsWith(hoje) && v.status === "finalizada");
  totalHoje.value       = hoje_vendas.length;
  faturamentoHoje.value = hoje_vendas.reduce((s, v) => s + parseFloat(v.total || 0), 0);
}

async function carregarProdutos() {
  let q = supabase.from("produtos").select("pk, saldo", { count: "exact" });
  if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
  const { data, count } = await q;
  totalProdutos.value = count || 0;
  semEstoque.value    = (data || []).filter(p => parseFloat(p.saldo || 0) <= 0).length;
}

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function statusCls(s) {
  if (s === "finalizada") return "ok";
  if (s === "devolvida")  return "warn";
  if (s === "cancelada")  return "err";
  return "muted";
}
</script>

<style scoped>
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes fadeUp  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

.dash-wrap { display: flex; flex-direction: column; gap: 1.75rem; animation: fadeUp .35s ease-out; }

/* ── Cabeçalho ──────────────────────────────── */
.dash-header  { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.dash-title   { margin: 0; font-size: 1.55rem; font-weight: 800; color: var(--text); letter-spacing: -.5px; }
.dash-sub     { margin: 4px 0 0; font-size: .85rem; color: var(--text2); text-transform: capitalize; }
.btn-refresh  { width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg2); color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; flex-shrink: 0; }
.btn-refresh:hover { background: var(--bg3); color: var(--primary); border-color: var(--primary); }
.btn-refresh.spinning .material-symbols-outlined { animation: spin .7s linear infinite; }

/* ── KPIs ───────────────────────────────────── */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }

.kpi-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.35rem 1.4rem;
  display: flex;
  align-items: center;
  gap: 1.1rem;
  transition: box-shadow .2s, transform .2s;
}
.kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12); }
.kpi-card-alert { border-color: rgba(239,68,68,.3); }

.kpi-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kpi-icon .material-symbols-outlined { font-size: 26px; }
.kpi-indigo { background: rgba(99,102,241,.12); color: var(--primary); }
.kpi-green  { background: rgba(16,185,129,.12); color: #10b981; }
.kpi-amber  { background: rgba(245,158,11,.12); color: #f59e0b; }
.kpi-red    { background: rgba(239,68,68,.12);  color: #ef4444; }

.kpi-body   { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.kpi-label  { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); }
.kpi-value  { font-size: 1.55rem; font-weight: 800; color: var(--text); line-height: 1.1; }
.kpi-green-text { color: #10b981; }
.kpi-red-text   { color: #ef4444; }

/* ── Painéis ────────────────────────────────── */
.bottom-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1rem; align-items: start; }

.panel {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border); }
.panel-title  { display: flex; align-items: center; gap: .5rem; font-size: .95rem; font-weight: 800; color: var(--text); }
.panel-title .material-symbols-outlined { font-size: 18px; color: var(--primary); }
.panel-link   { display: flex; align-items: center; gap: 3px; font-size: .78rem; font-weight: 700; color: var(--primary); text-decoration: none; transition: opacity .15s; }
.panel-link:hover { opacity: .75; }
.panel-link .material-symbols-outlined { font-size: 14px; }

.panel-loading { display: flex; justify-content: center; padding: 2.5rem; }
.panel-vazio   { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 2.5rem; color: var(--text2); font-size: .88rem; }
.panel-vazio .material-symbols-outlined { font-size: 2rem; opacity: .3; }

.spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; }

/* ── Tabela mini ────────────────────────────── */
.mini-table  { width: 100%; border-collapse: collapse; font-size: .85rem; }
.mini-table th { padding: .6rem 1rem; background: var(--bg3); font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); text-align: left; border-bottom: 1px solid var(--border); }
.mini-table td { padding: .7rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.mini-table tr:last-child td { border-bottom: none; }
.mini-table tr:hover td { background: var(--bg3); }

.col-num    { font-weight: 800; color: var(--primary); font-family: monospace; }
.col-total  { font-weight: 700; font-family: monospace; }
.col-cliente { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-op     { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text2); font-size: .82rem; }

.mini-badge { padding: 2px 9px; border-radius: 20px; font-size: .68rem; font-weight: 800; text-transform: uppercase; display: inline-block; }
.mini-badge.ok   { background: #d1fae5; color: #065f46; }
.mini-badge.warn { background: #fef3c7; color: #92400e; }
.mini-badge.err  { background: #fee2e2; color: #991b1b; }
.mini-badge.muted { background: var(--bg3); color: var(--text2); }

/* ── Caixa ──────────────────────────────────── */
.caixa-panel { display: flex; flex-direction: column; }

.caixa-aberto, .caixa-fechado { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

.caixa-status-row { display: flex; align-items: center; gap: .5rem; }
.caixa-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.caixa-dot.open   { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.2); }
.caixa-dot.closed { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.2); }
.caixa-status-txt { font-weight: 800; font-size: .95rem; color: var(--text); }

.caixa-rows { display: flex; flex-direction: column; gap: .1rem; }
.ci-row { display: flex; justify-content: space-between; align-items: center; padding: .6rem .75rem; border-radius: 10px; }
.ci-row.highlight { background: rgba(16,185,129,.07); }
.ci-label { font-size: .8rem; color: var(--text2); font-weight: 600; }
.ci-val   { font-size: .9rem; font-weight: 800; color: var(--text); font-family: monospace; }
.ci-val.green { color: #10b981; }

.caixa-fechado-msg { font-size: .85rem; color: var(--text2); margin: 0; }

.btn-ir-caixa {
  display: flex; align-items: center; justify-content: center; gap: .4rem;
  padding: .65rem 1rem; border-radius: 10px;
  background: var(--primary); color: #fff;
  font-size: .85rem; font-weight: 700; text-decoration: none;
  transition: opacity .15s;
}
.btn-ir-caixa:hover { opacity: .88; }
.btn-ir-caixa .material-symbols-outlined { font-size: 16px; }

/* ── Responsivo ─────────────────────────────── */
@media (max-width: 900px) {
  .bottom-grid { grid-template-columns: 1fr; }
  .caixa-panel { order: -1; }
}
@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .kpi-value { font-size: 1.25rem; }
  .dash-title { font-size: 1.25rem; }
  .col-op { display: none; }
}
</style>
