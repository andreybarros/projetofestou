<template>
  <div class="relatorio-view">
     <div class="header">
       <div class="header-main">
         <h1>💰 Relatório de Vendas</h1>
         <p>Visão geral do desempenho financeiro da loja</p>
       </div>
       <div class="header-filters">
        <div class="filter-group date-picker-group">
          <label>Período do Relatório</label>
          <div class="date-range-native">
            <input type="date" v-model="dataInicio" class="date-native-input" />
            <span class="date-native-sep">até</span>
            <input type="date" v-model="dataFim" class="date-native-input" />
          </div>
        </div>
        <button @click="fetchRelatorio" class="btn-refresh" :disabled="loading">
          <span class="material-symbols-outlined" :class="{ spin: loading }">{{ loading ? 'sync' : 'filter_alt' }}</span>
          Filtrar
        </button>
      </div>
     </div>

    <div v-if="loading && !data.vendasPorDia.length" class="loading-state">
      <div class="spinner"></div>
      <p>Gerando relatórios...</p>
    </div>

    <div v-else class="dashboard">
      <!-- ══ SEÇÃO 1: RESUMO FINANCEIRO ════════════════════════════════ -->
      <div class="dash-section">
        <div class="section-title">
          <span class="material-symbols-outlined">analytics</span>
          <h2>Resumo Financeiro</h2>
        </div>
        <div class="summary-cards">
          <div class="card grad-blue">
            <span class="card-icon material-symbols-outlined">receipt</span>
            <div class="card-info">
              <h3>Qtda Vendas</h3>
              <p class="value">{{ data.totalVendas }}</p>
              <span class="comp-badge" :class="getCompClass(data.totalVendas, data.totalVendasAnterior)">
                {{ getCompPerc(data.totalVendas, data.totalVendasAnterior) }}% vs anterior
              </span>
            </div>
          </div>
          <div class="card grad-emerald">
            <span class="card-icon material-symbols-outlined">payments</span>
            <div class="card-info">
              <h3>Faturamento</h3>
              <p class="value">{{ formatMoeda(data.fatMes) }}</p>
              <span class="comp-badge">{{ getCompPerc(data.fatMes, data.fatAnterior) }}% variação</span>
            </div>
          </div>
          <div class="card" :class="data.lucroMes >= 0 ? 'grad-teal' : 'grad-rose'">
            <span class="card-icon material-symbols-outlined">{{ data.lucroMes >= 0 ? 'trending_up' : 'trending_down' }}</span>
            <div class="card-info">
              <h3>Lucro Estimado</h3>
              <p class="value">{{ formatMoeda(data.lucroMes) }}</p>
              <span class="comp-label">Margem: {{ data.margemLucro.toFixed(1) }}%</span>
            </div>
          </div>
          <div class="card grad-amber">
            <span class="card-icon material-symbols-outlined">warning</span>
            <div class="card-info">
              <h3>Reposição</h3>
              <p class="value">{{ data.produtosRepor.length }}</p>
              <span class="comp-label">Itens Críticos</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ══ SEÇÃO 2: ANÁLISE DE FLUXO ═════════════════════════════════ -->
      <div class="dash-section">
        <div class="section-title">
          <span class="material-symbols-outlined">stacked_line_chart</span>
          <h2>Análise de Fluxo e Sazonalidade</h2>
        </div>
        <div class="charts-row">
          <!-- Gráfico de Vendas por Dia -->
          <div class="content-card chart-container">
            <div class="card-header">
              <span class="material-symbols-outlined">calendar_today</span>
              <h3>Vendas Diárias</h3>
            </div>
            <div class="chart-wrapper">
              <div class="bar-chart">
                <div v-for="dia in data.vendasPorDia" :key="dia.data" class="bar-column">
                  <div class="bar-area">
                    <div class="bar" :style="{ height: (dia.total / maxVenda * 100) + '%' }" :title="dia.diaSemana + ' ' + dia.data + ': ' + formatMoeda(dia.total)">
                      <span class="bar-value">{{ formatMoeda(dia.total) }}</span>
                    </div>
                  </div>
                  <span class="bar-label">{{ dia.diaSemana }}</span>
                  <span class="bar-date">{{ formatDataSimples(dia.data) }}</span>
                </div>
                <div v-if="!data.vendasPorDia.length" class="empty-msg">Nenhuma venda detectada</div>
              </div>
            </div>
          </div>

          <!-- Sazonalidade por Hora -->
          <div class="content-card chart-container">
            <div class="card-header">
              <span class="material-symbols-outlined">schedule</span>
              <h3>Horários com Mais Vendas (Quantidade)</h3>
            </div>
            <div class="chart-wrapper">
              <div class="bar-chart horar-chart">
                <div v-for="(val, hora) in data.sazonalidadeHora" :key="hora" class="bar-column narrow">
                  <div class="bar-area">
                    <div class="bar bar-alt" :style="{ height: (val / maxHora * 100) + '%' }" :title="hora + 'h: ' + val + ' vendas'">
                      <span class="bar-value short">{{ val }}</span>
                    </div>
                  </div>
                  <span class="bar-label">{{ hora }}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ══ SEÇÃO 3: DESEMPENHO E RANKING ═════════════════════════════ -->
      <div class="dash-section">
        <div class="section-title">
          <span class="material-symbols-outlined">workspace_premium</span>
          <h2>Desempenho Comercial</h2>
        </div>
        <div class="tables-row">
          <!-- Produtos Mais Vendidos -->
          <div class="content-card">
            <div class="card-header">
              <span class="material-symbols-outlined">inventory_2</span>
              <h3>Ranking de Produtos</h3>
            </div>
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="text-right">Qtd</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in data.produtosMaisVendidos" :key="idx">
                  <td>{{ p.nome || p.descricao }}</td>
                  <td class="text-right">{{ p.qtd }}</td>
                  <td class="text-right font-bold">{{ formatMoeda(p.total) }}</td>
                </tr>
                <tr v-if="!data.produtosMaisVendidos.length">
                  <td colspan="3" class="text-center py-4 opacity-50">Nenhum produto vendido</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Vendas por Vendedor -->
          <div class="content-card">
            <div class="card-header">
              <span class="material-symbols-outlined">person_pin</span>
              <h3>Vendas por Vendedor</h3>
            </div>
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th class="text-right">Qtd</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(v, idx) in data.vendasPorVendedor" :key="idx">
                  <td>{{ v.nome }}</td>
                  <td class="text-right">{{ v.qtd }}</td>
                  <td class="text-right font-bold">{{ formatMoeda(v.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Melhores Clientes -->
          <div class="content-card">
            <div class="card-header">
              <span class="material-symbols-outlined">stars</span>
              <h3>Melhores Clientes</h3>
            </div>
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th class="text-right">Total Comprado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, idx) in data.melhoresClientes" :key="idx">
                  <td>{{ c.nome }}</td>
                  <td class="text-right font-bold">{{ formatMoeda(c.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ══ SEÇÃO 4: OPERACIONAL E PLANEJAMENTO ═══════════════════════ -->
      <div class="dash-section">
        <div class="section-title">
          <span class="material-symbols-outlined">inventory</span>
          <h2>Operacional e Planejamento</h2>
        </div>
        <div class="tables-row">
          <!-- Produtos para Reposição -->
          <div class="content-card critical-stock">
            <div class="card-header">
              <span class="material-symbols-outlined">warning</span>
              <h3>Estoque Crítico (Ação Imediata)</h3>
            </div>
            <div class="repos-list">
              <div v-for="(p, idx) in data.produtosRepor" :key="idx" class="repos-item">
                 <div class="p-info">
                   <span class="p-code">{{ p.codigo || 'S/C' }}</span>
                   <p class="p-name">{{ p.descricao }}</p>
                 </div>
                 <div class="p-stock" :class="{ 'zero': p.saldo <= 0 }">
                   Saldo: <strong>{{ p.saldo }}</strong>
                 </div>
              </div>
              <div v-if="!data.produtosRepor.length" class="empty-msg">Estoque saudável</div>
            </div>
          </div>

          <!-- Maiores Despesas -->
          <div class="content-card">
            <div class="card-header">
              <span class="material-symbols-outlined">receipt_long</span>
              <h3>Maiores Gastos/Despesas</h3>
            </div>
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th class="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, idx) in data.maioresDespesas" :key="idx">
                  <td>{{ d.descricao }}</td>
                  <td class="text-right text-rose-400 font-bold">{{ formatMoeda(d.valor) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="total-despesas">Total: <span>{{ formatMoeda(data.totalDespesas) }}</span></div>
          </div>

          <!-- Próximas Datas Comemorativas -->
          <div class="content-card">
            <div class="card-header">
              <span class="material-symbols-outlined">event</span>
              <h3>Datas Comemorativas</h3>
            </div>
            <div class="events-list">
              <div v-for="(ev, idx) in data.datasComemorativas" :key="idx" class="event-item">
                <div class="event-date">
                  <span class="day">{{ ev.data.split('-')[2] }}</span>
                  <span class="month">{{ getMesAbrev(ev.data.split('-')[1]) }}</span>
                </div>
                <div class="event-info">
                  <h4>{{ ev.nome }}</h4>
                  <p>Prepare o estoque</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import apiClient from '../services/api';

const sessaoStore = useSessaoStore();
const showToast = inject('showToast');
const loading = ref(false);

const data = ref({
  fatDia: 0, fatSemana: 0, fatMes: 0, fatAnterior: 0,
  totalVendas: 0, totalVendasAnterior: 0, totalDespesas: 0, lucroMes: 0, margemLucro: 0,
  melhoresClientes: [], maioresDespesas: [], produtosMaisVendidos: [],
  vendasPorVendedor: [], produtosRepor: [], datasComemorativas: [],
  vendasPorDia: [], sazonalidadeHora: []
});

const getPrimeiroDiaMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const getHoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dataInicio = ref(getPrimeiroDiaMes());
const dataFim    = ref(getHoje());

const maxVenda = computed(() => Math.max(...data.value.vendasPorDia.map(d => d.total), 1));
const maxHora  = computed(() => Math.max(...(data.value.sazonalidadeHora || []), 1));

const formatMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const getCompPerc = (atual, anterior) => {
  if (!anterior) return '+100';
  const diff = ((atual - anterior) / anterior) * 100;
  return (diff > 0 ? '+' : '') + diff.toFixed(1);
};

const getCompClass = (atual, anterior) => {
  if (atual >= anterior) return 'up';
  return 'down';
};

const formatDataSimples = (iso) => {
  if (!iso) return '';
  const d = iso.split('-');
  return `${d[2]}/${d[1]}`;
};

const getMesAbrev = (m) => {
  const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return meses[parseInt(m)];
};

const fetchRelatorio = async () => {
  if (!sessaoStore.filial?.pk) { loading.value = false; return; }
  loading.value = true;
  try {
    const res = await apiClient.get(`/api/relatorios/vendas/${sessaoStore.filial.pk}`, {
      params: { inicio: dataInicio.value, fim: dataFim.value }
    });
    data.value = res.data;
  } catch (err) {
    console.error('Relatorio:', err);
    const msg = err.response?.data?.erro || 'Erro desconhecido ao carregar dados.';
    showToast(`Erro ao carregar dados do relatório: ${msg}`, 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchRelatorio);
</script>

<style scoped>
.relatorio-view {
  padding: 1rem;
  color: var(--text);
  min-height: 100%;
}

@media (min-width: 1024px) {
  .relatorio-view { padding: 0.5rem; }
}

.header {
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header h1 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.header-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text2);
}

.date-input {
  background: var(--bg2);
  border: 1.5px solid var(--border);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.date-input:focus {
  border-color: var(--primary);
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  border: none;
  color: #fff;
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(96, 158, 252, 0.2);
}

.btn-refresh:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

/* Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.card {
  padding: 1.25rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 2.25rem;
  opacity: 0.9;
}

.card-info h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.9;
  margin-bottom: 0.15rem;
}

.card-info .value {
  font-size: 1.35rem;
  font-weight: 700;
}

/* Gradients */
.grad-blue { background: linear-gradient(135deg, #2563eb, #3b82f6); }
.grad-indigo { background: linear-gradient(135deg, #4f46e5, #6366f1); }
.grad-emerald { background: linear-gradient(135deg, #059669, #10b981); }
.grad-teal { background: linear-gradient(135deg, #0d9488, #14b8a6); }
.grad-rose { background: linear-gradient(135deg, #e11d48, #f43f5e); }

/* Conteúdo */
.charts-row, .tables-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.content-card {
  background: var(--bg2);
  border-radius: 1.25rem;
  padding: 1.5rem;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem; /* Reduzi de 1.25rem */
  color: var(--text2);
}

.card-header h3 {
  color: var(--text);
  font-size: 1.05rem;
  font-weight: 700;
}

/* Gráfico de Barras */
.chart-wrapper {
  margin-top: 0.5rem; /* Reduzi de 1.5rem */
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  height: 250px;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.bar-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 45px;
  height: 100%;
}

.bar-area {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  margin-bottom: 4px; /* Reduzi de 8px */
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, var(--primary), #93c5fd);
  border-radius: 4px 4px 2px 2px;
  position: relative;
  transition: height 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.bar:hover {
  filter: brightness(1.2);
  transform: scaleX(1.05);
}

.bar-value {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  color: var(--text);
}

.bar-column:hover .bar-value {
  opacity: 1;
  transform: translateX(-50%) translateY(-2px);
}

.bar-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  margin-top: 4px;
}

.bar-date {
  font-size: 0.6rem;
  color: var(--text2);
  text-align: center;
}

.bar-value.short {
  top: -18px;
  font-size: 0.6rem;
}

.narrow {
  min-width: 30px !important;
}

.chart-container {
  display: flex;
  flex-direction: column;
}

.chart-wrapper {
  margin-top: auto; /* Empurra o gráfico para o fundo da div caso ela estique */
  padding-top: 1rem;
}

/* Eventos */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg3);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.event-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--primary);
  color: #fff;
  padding: 8px;
  border-radius: 8px;
  min-width: 50px;
}

.event-date .day { font-size: 1.1rem; font-weight: 800; }
.event-date .month { font-size: 0.65rem; text-transform: uppercase; font-weight: 700; opacity: 0.9; }

.event-info h4 { font-size: 0.9rem; font-weight: 700; margin-bottom: 2px; color: var(--text); }
.event-info p { font-size: 0.75rem; color: var(--text2); }
.grad-amber { background: linear-gradient(135deg, #f59e0b, #fbbf24); }

.comp-badge {
  font-size: 0.65rem;
  background: rgba(255,255,255,0.2);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
}

.comp-label {
  font-size: 0.7rem;
  opacity: 0.9;
  margin-top: 4px;
  display: block;
}

.bar-alt {
  background: linear-gradient(180deg, #60a5fa, #bfdbfe) !important;
}

.horar-chart {
  height: 150px !important;
}

/* Reposição */
.repos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.repos-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg3);
  padding: 10px;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.p-code { font-size: 0.6rem; color: var(--text2); display: block; }
.p-name { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.p-stock { font-size: 0.8rem; background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 4px; }
.p-stock.zero { color: #e11d48; font-weight: 800; }
[data-theme="dark"] .p-stock { background: rgba(255,255,255,0.05); }

.critical-stock { border-left: 4px solid #f43f5e; }

/* Tabelas */
.modern-table {
  width: 100%;
  border-collapse: collapse;
}

.modern-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  color: var(--text2);
  font-size: 0.7rem;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0.05em;
}

.modern-table td {
  padding: 0.875rem 0.75rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.text-rose-400 { color: #f43f5e; }
.font-bold { font-weight: 700; }

.total-despesas {
  margin-top: 1.25rem;
  text-align: right;
  font-size: 0.85rem;
  color: var(--text2);
}

.total-despesas span {
  color: #f43f5e;
  font-weight: 800;
  font-size: 1.1rem;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 4px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .header h1 { font-size: 1.5rem; }
  .charts-row, .tables-row { grid-template-columns: 1fr; }
}

/* Divisões do Relatório */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.dash-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary);
  width: fit-content;
  margin-bottom: 0.5rem;
}

.section-title h2 {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.section-title span {
  color: var(--primary);
  font-size: 1.4rem;
}

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, var(--border) 0%, transparent 100%);
  margin: 1rem 0;
  opacity: 0.5;
}
.date-range-native {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg2);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 0 12px;
  height: 42px;
}
.date-native-input {
  background: transparent;
  border: none;
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  cursor: pointer;
}
.date-native-sep {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text2);
  opacity: 0.6;
}
</style>
