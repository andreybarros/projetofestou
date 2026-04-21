<template>
  <div class="dash-wrap">
    <h2 class="page-title">Dashboard</h2>
    <div class="cards-grid">
      <div class="card">
        <div class="card-icon" style="background:#667eea20;color:#667eea">🛒</div>
        <div class="card-info">
          <div class="card-label">Vendas Hoje</div>
          <div class="card-value">{{ totalHoje }}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-icon" style="background:#10b98120;color:#10b981">💰</div>
        <div class="card-info">
          <div class="card-label">Faturamento Hoje</div>
          <div class="card-value">{{ fmt(faturamentoHoje) }}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-icon" style="background:#f59e0b20;color:#f59e0b">📦</div>
        <div class="card-info">
          <div class="card-label">Produtos Cadastrados</div>
          <div class="card-value">{{ totalProdutos }}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-icon" style="background:#ef444420;color:#ef4444">⚠️</div>
        <div class="card-info">
          <div class="card-label">Estoque Zerado</div>
          <div class="card-value">{{ semEstoque }}</div>
        </div>
      </div>
    </div>

    <div class="bottom-grid">
      <div class="panel">
        <h3>Últimas Vendas</h3>
        <div v-if="carregando" class="loading">⏳</div>
        <table v-else class="mini-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="v in ultimasVendas" :key="v.pk">
              <td class="mono">{{ v.numero }}</td>
              <td>{{ v.cliente || "—" }}</td>
              <td class="mono">{{ fmt(v.total) }}</td>
              <td><span :class="['badge', v.status === 'finalizada' ? 'ok' : 'err']">{{ v.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="panel">
        <h3>Caixa Atual</h3>
        <div v-if="caixaStore.caixaAberto" class="caixa-info">
          <div class="ci-row"><span>Abertura</span><strong>{{ fmt(caixaStore.caixaAberto.valor_abertura) }}</strong></div>
          <div class="ci-row"><span>Saldo Dinheiro</span><strong style="color:#090">{{ fmt(caixaStore.saldoDinheiro) }}</strong></div>
          <div class="ci-row"><span>Status</span><span class="badge ok">Aberto</span></div>
        </div>
        <div v-else class="caixa-fechado"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useSessaoStore } from "../stores/sessao";
import { useCaixaStore }  from "../stores/caixa";
import { supabase }       from "../composables/useSupabase";

const sessaoStore  = useSessaoStore();
const caixaStore   = useCaixaStore();
const carregando   = ref(true);
const ultimasVendas = ref([]);
const totalHoje       = ref(0);
const faturamentoHoje = ref(0);
const totalProdutos   = ref(0);
const semEstoque      = ref(0);

onMounted(async () => {
  await Promise.all([carregarVendas(), carregarProdutos(), verificarCaixa()]);
  carregando.value = false;
});

async function verificarCaixa() {
  if (sessaoStore.filial?.pk) await caixaStore.verificarStatus(sessaoStore.filial.pk);
}

async function carregarVendas() {
  const hoje = new Date().toISOString().slice(0, 10);
  let q = supabase
    .from("vendas")
    .select("pk, numero, cliente, total, status, criado_em")
    .order("criado_em", { ascending: false })
    .limit(10);
  if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
  const { data } = await q;
  ultimasVendas.value = data || [];
  const vendas_hoje = (data || []).filter(v => v.criado_em?.startsWith(hoje) && v.status === "finalizada");
  totalHoje.value       = vendas_hoje.length;
  faturamentoHoje.value = vendas_hoje.reduce((s, v) => s + parseFloat(v.total || 0), 0);
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
</script>

<style scoped>
.dash-wrap    { display: flex; flex-direction: column; gap: 1.5rem; }
.page-title   { margin: 0; font-size: 1.3rem; }
.cards-grid   { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.card         { background: #fff; border-radius: 10px; padding: 1.2rem; box-shadow: 0 2px 8px rgba(0,0,0,.07); display: flex; align-items: center; gap: 1rem; }
.card-icon    { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
.card-label   { font-size: .8rem; color: #666; }
.card-value   { font-size: 1.4rem; font-weight: 700; color: #111; }
.bottom-grid  { display: grid; grid-template-columns: 1fr 320px; gap: 1rem; }
.panel        { background: #fff; border-radius: 10px; padding: 1.2rem; box-shadow: 0 2px 8px rgba(0,0,0,.07); }
.panel h3     { margin: 0 0 1rem 0; font-size: 1rem; }
.mini-table   { width: 100%; border-collapse: collapse; font-size: .85rem; }
.mini-table th { text-align: left; padding: .4rem .5rem; background: #f5f5f5; border-bottom: 1px solid #eee; font-size: .78rem; }
.mini-table td { padding: .45rem .5rem; border-bottom: 1px solid #f8f8f8; }
.mono         { font-family: monospace; }
.badge        { padding: .15rem .5rem; border-radius: 8px; font-size: .72rem; font-weight: 600; }
.badge.ok     { background: #d1fae5; color: #065f46; }
.badge.err    { background: #fee2e2; color: #991b1b; }
.caixa-info   { display: flex; flex-direction: column; gap: .6rem; }
.ci-row       { display: flex; justify-content: space-between; font-size: .9rem; padding: .4rem 0; border-bottom: 1px solid #f0f0f0; }
.caixa-fechado { color: #c33; font-size: .9rem; padding: 1rem 0; }
.loading      { color: #888; padding: 1rem; text-align: center; }
@media (max-width: 700px) { .bottom-grid { grid-template-columns: 1fr; } }
</style>
