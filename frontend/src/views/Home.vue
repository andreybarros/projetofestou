<template>
  <div class="home-wrap">

    <!-- Hero cards -->
    <div class="hero-grid">
      <RouterLink v-if="pode('pdv')" to="/pdv" class="hero-card hero-pdv">
        <span class="material-symbols-outlined hero-icon">point_of_sale</span>
        <div>
          <div class="hero-label">Módulo principal</div>
          <div class="hero-title">Ponto de Venda</div>
        </div>
        <span class="material-symbols-outlined hero-arrow">arrow_forward</span>
      </RouterLink>

      <RouterLink v-if="pode('produtos')" to="/produtos" class="hero-card hero-produtos">
        <span class="material-symbols-outlined hero-icon">inventory_2</span>
        <div>
          <div class="hero-label">Estoque</div>
          <div class="hero-title">Produtos</div>
        </div>
        <span class="material-symbols-outlined hero-arrow">arrow_forward</span>
      </RouterLink>

      <RouterLink v-if="pode('clientes')" to="/clientes" class="hero-card hero-clientes">
        <span class="material-symbols-outlined hero-icon">group</span>
        <div>
          <div class="hero-label">Cadastro</div>
          <div class="hero-title">Clientes</div>
        </div>
        <span class="material-symbols-outlined hero-arrow">arrow_forward</span>
      </RouterLink>
    </div>

    <!-- Vendas & Financeiro -->
    <template v-if="podeVendas">
      <div class="section-label">Vendas &amp; Financeiro</div>
      <div class="small-grid">
        <RouterLink v-if="pode('pdv') && op?.acesso_dashboard" to="/dashboard" class="small-card">
          <div class="sc-icon" style="background:rgba(251,113,133,.12);color:#fb7185"><span class="material-symbols-outlined">bar_chart</span></div>
          <div><div class="sc-name">Dashboard</div><div class="sc-desc">Resumo de vendas</div></div>
        </RouterLink>
        <RouterLink v-if="pode('historico') || pode('pdv')" to="/historico-vendas" class="small-card">
          <div class="sc-icon" style="background:rgba(59,130,246,.12);color:#60A5FA"><span class="material-symbols-outlined">receipt_long</span></div>
          <div><div class="sc-name">Hist. Vendas</div><div class="sc-desc">Histórico e estornos</div></div>
        </RouterLink>
        <RouterLink v-if="pode('receitas')" to="/contas-receber" class="small-card">
          <div class="sc-icon" style="background:rgba(16,185,129,.12);color:#34D399"><span class="material-symbols-outlined">payments</span></div>
          <div><div class="sc-name">Contas a Receber</div><div class="sc-desc">Crediários pendentes</div></div>
        </RouterLink>
        <RouterLink v-if="op?.admin && pode('fechamento')" to="/fechamento-caixa" class="small-card">
          <div class="sc-icon" style="background:rgba(234,179,8,.12);color:#FBBF24"><span class="material-symbols-outlined">local_atm</span></div>
          <div><div class="sc-name">Fech. de Caixa</div><div class="sc-desc">Fechamento diário</div></div>
        </RouterLink>
        <RouterLink v-if="pode('financeiro')" to="/financeiro" class="small-card">
          <div class="sc-icon" style="background:rgba(163,230,53,.12);color:#a3e635"><span class="material-symbols-outlined">account_balance_wallet</span></div>
          <div><div class="sc-name">Financeiro</div><div class="sc-desc">Contas e extratos</div></div>
        </RouterLink>
        <RouterLink v-if="pode('despesas')" to="/despesas" class="small-card">
          <div class="sc-icon" style="background:rgba(239,68,68,.12);color:#F87171"><span class="material-symbols-outlined">trending_down</span></div>
          <div><div class="sc-name">Despesas</div><div class="sc-desc">Contas a pagar</div></div>
        </RouterLink>
      </div>
    </template>

    <!-- Estoque & Operações -->
    <template v-if="podeEstoque">
      <div class="section-label">Estoque &amp; Operações</div>
      <div class="small-grid">
        <RouterLink v-if="pode('armazens')" to="/armazens" class="small-card">
          <div class="sc-icon" style="background:rgba(245,158,11,.12);color:#FCD34D"><span class="material-symbols-outlined">warehouse</span></div>
          <div><div class="sc-name">Armazéns</div><div class="sc-desc">Endereçamento</div></div>
        </RouterLink>
        <RouterLink v-if="pode('separacao')" to="/separacao" class="small-card">
          <div class="sc-icon" style="background:rgba(99,102,241,.12);color:#A5B4FC"><span class="material-symbols-outlined">inventory</span></div>
          <div><div class="sc-name">Separação</div><div class="sc-desc">Ordens de saída</div></div>
        </RouterLink>
        <RouterLink v-if="pode('agenda')" to="/agenda" class="small-card">
          <div class="sc-icon" style="background:rgba(236,72,153,.12);color:#F472B6"><span class="material-symbols-outlined">event</span></div>
          <div><div class="sc-name">Agenda</div><div class="sc-desc">Eventos e datas</div></div>
        </RouterLink>
        <RouterLink v-if="pode('categorias')" to="/categorias" class="small-card">
          <div class="sc-icon" style="background:rgba(251,146,60,.12);color:#FB923C"><span class="material-symbols-outlined">label</span></div>
          <div><div class="sc-name">Categorias</div><div class="sc-desc">Grupos de produto</div></div>
        </RouterLink>
        <RouterLink v-if="pode('clientes')" to="/fornecedores" class="small-card">
          <div class="sc-icon" style="background:rgba(20,184,166,.12);color:#2DD4BF"><span class="material-symbols-outlined">handshake</span></div>
          <div><div class="sc-name">Fornecedores</div><div class="sc-desc">Empresas parceiras</div></div>
        </RouterLink>
      </div>
    </template>

    <!-- RH & Pessoas -->
    <template v-if="podeRH">
      <div class="section-label">RH &amp; Pessoas</div>
      <div class="small-grid">
        <RouterLink v-if="pode('funcionarios')" to="/funcionarios" class="small-card">
          <div class="sc-icon" style="background:rgba(59,130,246,.12);color:#93C5FD"><span class="material-symbols-outlined">badge</span></div>
          <div><div class="sc-name">Funcionários</div><div class="sc-desc">Contratos e salários</div></div>
        </RouterLink>
        <RouterLink v-if="pode('pdv')" to="/vendedores" class="small-card">
          <div class="sc-icon" style="background:rgba(139,92,246,.12);color:#C4B5FD"><span class="material-symbols-outlined">sell</span></div>
          <div><div class="sc-name">Vendedores</div><div class="sc-desc">Vinculados ao PDV</div></div>
        </RouterLink>
        <RouterLink v-if="pode('ponto')" to="/ponto" class="small-card">
          <div class="sc-icon" style="background:rgba(234,179,8,.12);color:#FDE047"><span class="material-symbols-outlined">fingerprint</span></div>
          <div><div class="sc-name">Ponto</div><div class="sc-desc">Batidas e registros</div></div>
        </RouterLink>
        <RouterLink v-if="op?.matricula" to="/holerites" class="small-card">
          <div class="sc-icon" style="background:rgba(16,185,129,.12);color:#6EE7B7"><span class="material-symbols-outlined">description</span></div>
          <div><div class="sc-name">Holerites</div><div class="sc-desc">Contracheques</div></div>
        </RouterLink>
        <RouterLink v-if="op?.matricula || op?.acesso_espelho_ponto" to="/espelho-ponto" class="small-card">
          <div class="sc-icon" style="background:rgba(99,102,241,.12);color:#A5B4FC"><span class="material-symbols-outlined">calendar_view_month</span></div>
          <div><div class="sc-name">Espelho de Ponto</div><div class="sc-desc">Aprovação de ponto</div></div>
        </RouterLink>
        <RouterLink v-if="op?.admin || pode('ponto')" to="/ajuste-batidas" class="small-card">
          <div class="sc-icon" style="background:rgba(251,113,133,.12);color:#fb7185"><span class="material-symbols-outlined">location_on</span></div>
          <div><div class="sc-name">Gestão de Batidas</div><div class="sc-desc">Ajuste de registros</div></div>
        </RouterLink>
        <RouterLink v-if="op?.admin || pode('funcionarios')" to="/fechamento-ponto" class="small-card">
          <div class="sc-icon" style="background:rgba(251,146,60,.12);color:#fb923c"><span class="material-symbols-outlined">lock_clock</span></div>
          <div><div class="sc-name">Fechamento Ponto</div><div class="sc-desc">Fechamento mensal</div></div>
        </RouterLink>
      </div>
    </template>

    <!-- Admin -->
    <template v-if="op?.admin">
      <div class="section-label">Administração</div>
      <div class="small-grid">
        <RouterLink to="/filiais" class="small-card">
          <div class="sc-icon" style="background:rgba(239,68,68,.12);color:#FCA5A5"><span class="material-symbols-outlined">corporate_fare</span></div>
          <div><div class="sc-name">Filiais</div><div class="sc-desc">Unidades da empresa</div></div>
        </RouterLink>
        <RouterLink to="/operadores" class="small-card">
          <div class="sc-icon" style="background:rgba(107,114,128,.12);color:#9CA3AF"><span class="material-symbols-outlined">manage_accounts</span></div>
          <div><div class="sc-name">Operadores</div><div class="sc-desc">Permissões e acesso</div></div>
        </RouterLink>
      </div>
    </template>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useSessaoStore } from '../stores/sessao';

const sessao = useSessaoStore();
const op     = computed(() => sessao.operador);

function pode(modulo) {
  const o = op.value;
  if (!o) return false;
  if (o.admin) return true;
  const mapa = {
    produtos: o.acesso_produtos, categorias: o.acesso_produtos || o.acesso_categorias,
    clientes: o.acesso_clientes, armazens: o.acesso_armazens, agenda: o.acesso_agenda,
    pdv: o.acesso_pdv, receitas: o.acesso_pdv || o.acesso_receitas,
    historico: o.acesso_pdv || o.acesso_historico, funcionarios: o.acesso_funcionarios,
    ponto: o.acesso_ponto, separacao: o.acesso_separacao || o.acesso_criar_ordem,
    despesas: o.acesso_despesas, financeiro: o.acesso_financeiro, fechamento: o.acesso_fechamento,
  };
  return !!mapa[modulo];
}

const podeVendas  = computed(() => pode('pdv') || pode('receitas') || pode('historico') || pode('despesas') || pode('financeiro'));
const podeEstoque = computed(() => pode('produtos') || pode('armazens') || pode('separacao') || pode('agenda') || pode('categorias') || pode('clientes'));
const podeRH      = computed(() => pode('funcionarios') || pode('ponto') || !!op.value?.matricula || !!op.value?.acesso_espelho_ponto || pode('pdv'));
</script>

<style scoped>
.home-wrap { animation: fadeUp .32s ease both; }
@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }

.hero-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;
}
@media(max-width:480px) { .hero-grid { grid-template-columns: 1fr; } }
@media(min-width:1024px) { .hero-grid { grid-template-columns: repeat(4,1fr); gap:16px; margin-bottom:16px; } }

.hero-card {
  border-radius: 16px; padding: 24px 20px; cursor: pointer;
  display: flex; flex-direction: column; justify-content: space-between;
  min-height: 140px; transition: transform .18s, box-shadow .18s;
  position: relative; overflow: hidden; text-decoration: none;
}
.hero-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.35); }

.hero-pdv      { grid-column: 1 / 3; background: linear-gradient(135deg,#1565C0,#1976D2,#42A5F5); min-height:160px; }
.hero-produtos { background: linear-gradient(135deg,#1B5E20,#2E7D32,#66BB6A); }
.hero-clientes { background: linear-gradient(135deg,#4A148C,#6A1B9A,#AB47BC); }
@media(min-width:1024px) { .hero-pdv { grid-column: 1/3; } .hero-pdv .hero-title { font-size:30px; } }

.hero-icon  { font-size:28px; color:rgba(255,255,255,.85); font-variation-settings:'FILL' 1,'wght' 300,'GRAD' 0,'opsz' 28; }
.hero-label { color:rgba(255,255,255,.6); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; margin-bottom:2px; }
.hero-title { color:#fff; font-size:20px; font-weight:700; line-height:1.2; }
.hero-arrow { position:absolute; bottom:18px; right:18px; color:rgba(255,255,255,.4); font-size:22px; }

.section-label {
  font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.1em;
  color: var(--text2,#6B7280); margin:20px 0 8px;
}
@media(min-width:1024px) { .section-label { margin:28px 0 12px; font-size:12px; } }

.small-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
@media(min-width:1024px) { .small-grid { grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); column-gap:14px; row-gap:20px; } }

.small-card {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px 14px; cursor: pointer;
  display: flex; flex-direction: column; gap: 10px;
  transition: transform .15s, border-color .15s, box-shadow .15s;
  text-decoration: none; color: inherit;
}
.small-card:hover { transform:translateY(-2px); border-color:#3B82F6; box-shadow:0 4px 16px rgba(59,130,246,.15); }

.sc-icon  { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px; font-variation-settings:'FILL' 1,'wght' 400; }
.sc-name  { font-size:13px; font-weight:600; color:var(--text); line-height:1.3; }
.sc-desc  { font-size:11px; color:var(--text2); line-height:1.4; }
</style>
