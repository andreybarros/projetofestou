<template>
  <div class="page-wrap">
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">Fechamento de Caixa</h2>
        <p class="page-sub">Relatório detalhado de entradas e saídas do período</p>
      </div>
      <div class="header-actions">
        <button v-if="resultado" @click="exportar" class="btn-ghost">📥 Exportar Excel</button>
        <button @click="gerar" :disabled="carregando" class="btn-primary">
          {{ carregando ? '⏳ Processando...' : '📊 Gerar Relatório' }}
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card filters-card">
      <div class="filters-grid">
        <div class="field">
          <label>Data Início</label>
          <input v-model="filtros.ini" type="date" />
        </div>
        <div class="field">
          <label>Data Fim</label>
          <input v-model="filtros.fim" type="date" />
        </div>
        <div class="field">
          <label>Operador</label>
          <select v-model="filtros.operador">
            <option value="">Todos os Operadores</option>
            <option v-for="op in operadores" :key="op.pk" :value="op.nome">{{ op.nome }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Resultados -->
    <div v-if="resultado" class="report-content">
      <!-- Cards de Resumo -->
      <div class="resumo-grid">
        <div class="res-card">
          <span class="res-lbl">Entradas (Vendas)</span>
          <span class="res-val positive">{{ fmt(resumo.totalEntradas) }}</span>
        </div>
        <div class="res-card">
          <span class="res-lbl">Saídas (Despesas)</span>
          <span class="res-val negative">{{ fmt(resumo.totalSaidas) }}</span>
        </div>
        <div class="res-card highlight">
          <span class="res-lbl">Saldo Líquido</span>
          <span class="res-val" :class="resumo.saldo >= 0 ? 'positive' : 'negative'">{{ fmt(resumo.saldo) }}</span>
        </div>
        <div class="res-card">
          <span class="res-lbl">Saídas Pagas</span>
          <span class="res-val">{{ fmt(resumo.saidasPagas) }}</span>
        </div>
        <div class="res-card">
          <span class="res-lbl">Vendas Realizadas</span>
          <span class="res-val">{{ resumo.qtdVendas }}</span>
        </div>
      </div>

      <div class="details-grid">
        <!-- Resumo por Forma de Pagamento -->
        <div class="card table-card">
          <h3 class="card-title">💳 Por Forma de Pagamento</h3>
          <table class="tabela">
            <thead>
              <tr>
                <th>Forma</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(val, forma) in resumo.formas" :key="forma">
                <td>{{ FORMA_LABELS[forma] || forma }}</td>
                <td class="text-right mono">{{ fmt(val) }}</td>
              </tr>
              <tr v-if="Object.keys(resumo.formas).length === 0">
                <td colspan="2" class="vazio">Nenhum pagamento registrado</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Detalhamento de Movimentações -->
        <div class="card table-card full-width">
          <h3 class="card-title">📝 Detalhamento de Movimentações</h3>
          <div class="scroll-wrap">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Tipo</th>
                  <th>Descrição / Cliente</th>
                  <th>Operador</th>
                  <th>Pagamento</th>
                  <th>Canal</th>
                  <th class="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in movimentos" :key="m.id">
                  <td class="mono small">{{ new Date(m.data).toLocaleString('pt-BR') }}</td>
                  <td>
                    <span :class="['badge', m.tipo.includes('ENTRADA') ? 'ok' : (m.tipo.includes('SAÍDA') ? 'err' : 'muted')]">
                      {{ m.tipo }}
                    </span>
                  </td>
                  <td>{{ m.desc }}</td>
                  <td>{{ m.op || '—' }}</td>
                  <td class="small opacity-7">{{ m.pag }}</td>
                  <td class="small">{{ m.canal }}</td>
                  <td class="text-right mono bold" :class="m.val >= 0 ? 'positive' : 'negative'">
                    {{ fmt(m.val) }}
                  </td>
                </tr>
                <tr v-if="movimentos.length === 0">
                  <td colspan="7" class="vazio">Nenhuma movimentação no período</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado Vazio / Inicial -->
    <div v-else-if="!carregando" class="empty-state">
      <div class="icon">📊</div>
      <h3>Nenhum relatório gerado</h3>
      <p>Selecione o filtro desejado e clique em "Gerar Relatório".</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';
import * as XLSX from 'xlsx';

const sessaoStore = useSessaoStore();
const carregando = ref(false);
const resultado = ref(false);
const operadores = ref([]);

const filtros = reactive({
  ini: new Date().toISOString().split('T')[0],
  fim: new Date().toISOString().split('T')[0],
  operador: ''
});

const resumo = reactive({
  totalEntradas: 0,
  totalSaidas: 0,
  saldo: 0,
  saidasPagas: 0,
  qtdVendas: 0,
  formas: {}
});

const movimentos = ref([]);

const FORMA_LABELS = {
  dinheiro: '💵 Dinheiro',
  pix: '📱 PIX',
  debito: '💳 Débito',
  credito: '💳 Crédito',
  crediario: '📒 Crediário',
  vale: '🎟️ Vale'
};

onMounted(async () => {
  await carregarOperadores();
});

async function carregarOperadores() {
  const { data } = await supabase.from('operadores').select('pk, nome').order('nome');
  operadores.value = data || [];
}

async function gerar() {
  carregando.value = true;
  resultado.value = false;
  
  const filial_pk = sessaoStore.filial?.pk;
  if (!filial_pk) {
    alert('Erro: Nenhuma filial selecionada.');
    carregando.value = false;
    return;
  }

  try {
    // 1. Buscar Vendas
    let qv = supabase.from('vendas')
      .select('pk, numero, criado_em, cliente, operador, total, status, canal_venda')
      .eq('filial_pk', filial_pk)
      .eq('status', 'finalizada')
      .gte('criado_em', `${filtros.ini}T00:00:00`)
      .lte('criado_em', `${filtros.fim}T23:59:59`);
    
    if (filtros.operador) qv = qv.eq('operador', filtros.operador);
    const { data: vendas, error: ev } = await qv;
    if (ev) throw ev;

    // 2. Buscar Despesas
    let qd = supabase.from('despesas')
      .select('*, contas_bancarias(nome)')
      .eq('filial_pk', filial_pk)
      .gte('vencimento', filtros.ini)
      .lte('vencimento', filtros.fim);
    
    if (filtros.operador) qd = qd.eq('operador', filtros.operador);
    const { data: despesas, error: ed } = await qd;
    if (ed) throw ed;

    // 3. Buscar Pagamentos das Vendas
    const vPks = (vendas || []).map(v => v.pk);
    let pagamentos = [];
    if (vPks.length > 0) {
      const { data: pags, error: ep } = await supabase.from('pagamentos_venda')
        .select('*, contas_bancarias(nome)')
        .in('venda_pk', vPks);
      if (ep) throw ep;
      pagamentos = pags || [];
    }

    // ProcessarDados
    processarRelatorio(vendas || [], despesas || [], pagamentos);
    resultado.value = true;

  } catch (e) {
    alert('Erro ao gerar relatório: ' + e.message);
  } finally {
    carregando.value = false;
  }
}

function processarRelatorio(vendas, despesas, pagamentos) {
  resumo.totalEntradas = vendas.reduce((a, b) => a + (b.total || 0), 0);
  resumo.totalSaidas = despesas.reduce((a, b) => a + (b.valor || 0), 0);
  resumo.saldo = resumo.totalEntradas - resumo.totalSaidas;
  resumo.saidasPagas = despesas.filter(d => d.status === 'pago').reduce((a, b) => a + (b.valor || 0), 0);
  resumo.qtdVendas = vendas.length;

  const formasMap = {};
  pagamentos.forEach(p => {
    formasMap[p.forma] = (formasMap[p.forma] || 0) + (p.valor || 0);
  });
  resumo.formas = formasMap;

  // Montar movimentos
  const list = [
    ...vendas.map(v => {
      const pags = pagamentos.filter(p => p.venda_pk === v.pk);
      const descPags = pags.map(p => {
        const l = FORMA_LABELS[p.forma] || p.forma;
        return p.contas_bancarias ? `${l} (${p.contas_bancarias.nome})` : l;
      }).join(', ');
      
      const canal = v.canal_venda === 'whatsapp' ? '💬 WhatsApp' : '🏪 Presencial';
      
      return {
        id: 'v-' + v.pk,
        data: v.criado_em,
        tipo: '✅ ENTRADA',
        desc: `Venda #${v.numero} - ${v.cliente || 'Consumidor'}`,
        op: v.operador,
        pag: descPags,
        canal: canal,
        val: v.total
      };
    }),
    ...despesas.map(d => ({
      id: 'd-' + d.pk,
      data: d.vencimento + 'T12:00:00', // Despesas geralmente só tem data
      tipo: d.status === 'pago' ? '❌ SAÍDA' : '⏳ A PAGAR',
      desc: `${d.descricao} (${d.categoria || 'Sem categoria'})`,
      op: d.operador,
      pag: d.contas_bancarias ? `🏦 ${d.contas_bancarias.nome}` : (d.status === 'pago' ? '—' : 'Pendente'),
      canal: '—',
      val: -d.valor
    }))
  ];

  movimentos.value = list.sort((a, b) => new Date(b.data) - new Date(a.data));
}

function exportar() {
  if (!movimentos.value.length) return;

  const wb = XLSX.utils.book_new();

  // ABA 1: Resumo
  const resData = [
    ['RELATÓRIO DE FECHAMENTO DE CAIXA'],
    ['Período:', filtros.ini, 'até', filtros.fim],
    ['Operador:', filtros.operador || 'Todos'],
    [''],
    ['RESUMO FINANCEIRO'],
    ['Total Entradas', resumo.totalEntradas],
    ['Total Saídas', resumo.totalSaidas],
    ['Saldo Líquido', resumo.saldo],
    ['Efetivado (Saídas Pagas)', resumo.saidasPagas],
    ['Qtd Vendas', resumo.qtdVendas],
    [''],
    ['POR FORMA DE PAGAMENTO'],
    ...Object.entries(resumo.formas).map(([f, v]) => [FORMA_LABELS[f] || f, v])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resData), "Resumo");

  // ABA 2: Detalhamento
  const detData = [
    ['Data/Hora', 'Tipo', 'Descrição', 'Operador', 'Pagamento', 'Canal', 'Valor'],
    ...movimentos.value.map(m => [
      new Date(m.data).toLocaleString(),
      m.tipo,
      m.desc,
      m.op,
      m.pag,
      m.canal,
      m.val
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detData), "Movimentações");

  XLSX.writeFile(wb, `Fechamento_${filtros.ini}_a_${filtros.fim}.xlsx`);
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { margin: 0; font-size: 1.5rem; color: var(--text); }
.page-sub { margin: 0; font-size: 0.9rem; color: var(--text2); }

.header-actions { display: flex; gap: 0.75rem; }

.card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }

.filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.75rem; font-weight: 700; color: var(--text2); text-transform: uppercase; }
.field input, .field select { padding: 0.6rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); outline: none; }

.resumo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.res-card { background: var(--bg2); border: 1px solid var(--border); padding: 1.25rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.25rem; }
.res-card.highlight { border-color: #667eea; background: rgba(102,126,234,0.03); }
.res-lbl { font-size: 0.8rem; color: var(--text2); font-weight: 500; }
.res-val { font-size: 1.25rem; font-weight: 800; color: var(--text); }

.details-grid { display: grid; grid-template-columns: 350px 1fr; gap: 1.5rem; margin-top: 1.5rem; }
.full-width { grid-column: span 2; }

.card-title { font-size: 1rem; margin: 0 0 1.25rem 0; color: var(--text); }

.tabela { width: 100%; border-collapse: collapse; font-size: 0.87rem; }
.tabela th { text-align: left; padding: 0.75rem; background: var(--bg3); color: var(--text2); font-weight: 600; border-bottom: 2px solid var(--border); }
.tabela td { padding: 0.75rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tabela tr:last-child td { border-bottom: none; }

.text-right { text-align: right; }
.mono { font-family: monospace; }
.bold { font-weight: 700; }
.small { font-size: 0.75rem; }
.opacity-7 { opacity: 0.7; }

.positive { color: #10b981; }
.negative { color: #ef4444; }

.badge { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
.badge.ok { background: #d1fae5; color: #065f46; }
.badge.err { background: #fee2e2; color: #991b1b; }
.badge.muted { background: var(--bg3); color: var(--text2); }

.scroll-wrap { overflow-x: auto; }

.btn-primary { background: #667eea; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 0.6rem 1.5rem; border-radius: 8px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.empty-state { padding: 5rem; text-align: center; color: var(--text2); }
.empty-state .icon { font-size: 3rem; margin-bottom: 1rem; }

@media (max-width: 900px) {
  .details-grid { grid-template-columns: 1fr; }
  .full-width { grid-column: span 1; }
}
</style>
