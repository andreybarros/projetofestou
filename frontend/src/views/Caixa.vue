<template>
  <div class="caixa-wrap animate-fade">
    <div class="caixa-header">
      <h2 class="page-title">💰 Operação de Caixa</h2>
      <div v-if="caixaStore.caixaAberto" class="badge-aberto">
        <span class="blob green"></span> Caixa Aberto por {{ caixaStore.caixaAberto.nome_operador || 'Operador' }}
      </div>
    </div>

    <!---- ── ABRIR CAIXA ─────────────────────────────── -->
    <div v-if="!caixaStore.caixaAberto" class="card-glass opening-card">
      <div class="card-header">
        <span class="material-symbols-outlined icon">key</span>
        <h3>Abertura de Caixa</h3>
      </div>
      
      <p class="instr">Preencha os dados abaixo para iniciar o turno.</p>

      <div class="field-op mb-opening">
        <label>Vendedor Responsável (Abertura)</label>
        <select v-model="vendedorPkSel" class="op-input">
          <option :value="null">Selecione um vendedor...</option>
          <option v-for="v in vendedores" :key="v.pk" :value="v.pk">{{ v.nome }}</option>
        </select>
        <p v-if="vendedores.length === 0" class="sm-alert">⚠️ Nenhum vendedor cadastrado nesta filial.</p>
      </div>

      <div class="section-divider">
        <span class="material-symbols-outlined">payments</span>
        <h4>Saldos Iniciais</h4>
      </div>

      <div v-if="contas.length === 0" class="no-accounts-alert">
        <span class="material-symbols-outlined">warning</span>
        <div>
          <p><strong>Nenhuma conta financeira encontrada!</strong></p>
          <p>Você precisa cadastrar ao menos uma conta (ex: Caixa Dinheiro) no menu <strong>Financeiro</strong> antes de abrir o caixa.</p>
        </div>
      </div>

      <div v-else class="accounts-grid">
        <div v-for="cta in contas" :key="cta.pk" class="account-field">
          <div class="acc-info">
            <span class="material-symbols-outlined acc-icon">{{ getContaIcon(cta.tipo) }}</span>
            <span class="acc-name">{{ cta.nome }}</span>
          </div>
          <div class="acc-input-wrap">
            <span class="prefix">R$</span>
            <input v-model.number="saldosAbertura[cta.pk]" type="number" step="0.01" class="acc-input" placeholder="0,00" />
          </div>
        </div>
      </div>

      <div class="opening-footer">
        <div class="total-preview">
          <span class="label">Total de Abertura</span>
          <strong class="value">{{ fmt(totalAbertura) }}</strong>
        </div>
        <button @click="abrirCaixa" :disabled="processando || contas.length === 0 || !vendedorPkSel" class="btn-open-caixa">
          <span v-if="processando" class="spinner-sm"></span>
          {{ processando ? "Abrindo..." : "Confirmar Abertura" }}
        </button>
      </div>
      <div v-if="erro" class="erro-msg">{{ erro }}</div>
    </div>

    <!---- ── CAIXA ABERTO ────────────────────────────── -->
    <div v-else class="opened-caixa-layout">
      <div class="caixa-stats">
        <div class="stat-card highlight">
          <span class="label">Total Abertura</span>
          <strong class="val">{{ fmt(caixaStore.caixaAberto.valor_abertura) }}</strong>
        </div>
        <div class="stat-card">
          <span class="label">Fundo Dinheiro (Estimado)</span>
          <strong class="val">{{ fmt(caixaStore.saldoDinheiro) }}</strong>
        </div>
        <div class="stat-card">
          <span class="label">Aberto em</span>
          <strong class="val">{{ fmtTime(caixaStore.caixaAberto.dt_abertura) }}</strong>
        </div>
      </div>

      <div class="ops-row">
        <div class="card-glass op-card">
          <div class="card-header"><span class="material-symbols-outlined icon">remove_circle</span> <h4>Sangria</h4></div>
          <p class="sm muted">Retirada de dinheiro do caixa</p>
          <div class="op-fields">
            <input v-model.number="valorSangria" type="number" step="0.01" placeholder="R$ 0,00" />
            <input v-model="obsSangria" type="text" placeholder="Motivo/Obs" />
            <button @click="registrarSangria" :disabled="processando" class="btn-op red">Sangria</button>
          </div>
        </div>

        <div class="card-glass op-card">
          <div class="card-header"><span class="material-symbols-outlined icon">add_circle</span> <h4>Reforço</h4></div>
          <p class="sm muted">Entrada manual de dinheiro/troco</p>
          <div class="op-fields">
            <input v-model.number="valorReforco" type="number" step="0.01" placeholder="R$ 0,00" />
            <input v-model="obsReforco" type="text" placeholder="Motivo/Obs" />
            <button @click="registrarReforco" :disabled="processando" class="btn-op green">Reforço</button>
          </div>
        </div>
      </div>

      <div class="card-glass closing-card">
        <div class="card-header">
          <span class="material-symbols-outlined icon">lock</span>
          <h3>Fechamento de Caixa</h3>
        </div>
        <p class="instr">Conte o dinheiro e confira os saldos das contas para encerrar.</p>

        <div class="accounts-grid">
          <div v-for="cta in contas" :key="cta.pk" class="account-field">
            <div class="acc-info">
              <span class="material-symbols-outlined acc-icon">{{ getContaIcon(cta.tipo) }}</span>
              <span class="acc-name">{{ cta.nome }}</span>
            </div>
            <div class="acc-input-wrap">
              <span class="prefix">R$</span>
              <input v-model.number="saldosFechamento[cta.pk]" type="number" step="0.01" class="acc-input" placeholder="0,00" />
            </div>
          </div>
        </div>

        <div class="closing-footer">
          <div class="total-preview">
            <span class="label">Total Contado</span>
            <strong class="value">{{ fmt(totalContado) }}</strong>
          </div>
          <button @click="fecharCaixa" :disabled="processando" class="btn-close-caixa">
            <span v-if="processando" class="spinner-sm"></span>
            {{ processando ? "Encerrando..." : "Fechar Caixa Agora" }}
          </button>
        </div>
        <div v-if="erro" class="erro-msg">{{ erro }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from "vue";
import { useCaixaStore }  from "../stores/caixa";
import { useSessaoStore } from "../stores/sessao";
import { supabase } from "../composables/useSupabase";
import apiClient from "../services/api";

const caixaStore  = useCaixaStore();
const sessaoStore = useSessaoStore();
const showToast   = inject("showToast");

const contas           = ref([]);
const vendedores       = ref([]);
const saldosAbertura   = ref({});
const saldosFechamento = ref({});
const vendedorPkSel    = ref(null);
const valorSangria     = ref(0);
const obsSangria       = ref("");
const valorReforco     = ref(0);
const obsReforco       = ref("");
const processando      = ref(false);
const erro             = ref("");

const totalAbertura = computed(() => {
  return Object.values(saldosAbertura.value).reduce((s, v) => s + (parseFloat(v) || 0), 0);
});

const totalContado = computed(() => {
  return Object.values(saldosFechamento.value).reduce((s, v) => s + (parseFloat(v) || 0), 0);
});

onMounted(async () => {
  if (sessaoStore.filial?.pk) {
    await carregarContas();
    await carregarVendedores();
    await caixaStore.verificarStatus(sessaoStore.filial.pk);
  }
});

async function carregarVendedores() {
  try {
    const { data } = await supabase
      .from('vendedores')
      .select('pk, nome')
      .eq('filial_pk', sessaoStore.filial.pk)
      .eq('ativo', true)
      .order('nome');
    vendedores.value = data || [];
  } catch (e) {
    console.error("Erro ao carregar vendedores:", e);
  }
}

async function carregarContas() {
  try {
    const { data, error } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('filial_pk', sessaoStore.filial.pk)
      .order('nome');
    if (error) throw error;
    contas.value = data || [];
    const iniA = {};
    const iniF = {};
    contas.value.forEach(c => {
      iniA[c.pk] = 0;
      iniF[c.pk] = 0;
    });
    saldosAbertura.value = iniA;
    saldosFechamento.value = iniF;
  } catch (e) {
    console.error("Erro ao carregar contas:", e);
  }
}

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getContaIcon(tipo) {
  const map = { pix: 'qr_code', dinheiro: 'payments', debito: 'credit_card', credito: 'add_card' };
  return map[tipo] || 'account_balance_wallet';
}

async function abrirCaixa() {
  if (!vendedorPkSel.value) { erro.value = "Selecione o vendedor responsável."; return; }
  if (totalAbertura.value < 0) { erro.value = "O valor total não pode ser negativo."; return; }
  erro.value = "";
  processando.value = true;
  try {
    const vSel = vendedores.value.find(v => v.pk === vendedorPkSel.value);
    const { data } = await apiClient.post("/api/caixa/abrir", {
      filial_pk:      sessaoStore.filial?.pk,
      operador:       vSel?.nome || "Vendedor",
      vendedor_pk:    vendedorPkSel.value,
      valor_abertura: totalAbertura.value,
      detalhe_saldos: saldosAbertura.value
    });
    caixaStore.setCaixaAberto(data.caixa);
    showToast("Caixa aberto com sucesso!");
  } catch (e) {
    erro.value = e.response?.data?.erro || "Erro ao abrir caixa.";
  } finally {
    processando.value = false;
  }
}

async function fecharCaixa() {
  if (totalContado.value < 0) { erro.value = "O valor contado não pode ser negativo."; return; }
  erro.value = "";
  processando.value = true;
  try {
    await apiClient.post("/api/caixa/fechar", {
      caixa_pk:       caixaStore.caixaAberto.pk,
      valor_contado:  totalContado.value,
      detalhe_saldos: saldosFechamento.value
    });
    caixaStore.resetar();
    showToast("Caixa fechado com sucesso!");
    await carregarContas();
  } catch (e) {
    erro.value = e.response?.data?.erro || "Erro ao fechar caixa.";
  } finally {
    processando.value = false;
  }
}

async function registrarSangria() {
  if (valorSangria.value <= 0) { showToast("Informe um valor válido.", "error"); return; }
  processando.value = true;
  try {
    const { data } = await apiClient.post("/api/caixa/sangria", {
      caixa_pk:    caixaStore.caixaAberto.pk,
      valor:       valorSangria.value,
      observacoes: obsSangria.value,
    });
    caixaStore.adicionarSangria(data.sangria);
    valorSangria.value = 0;
    obsSangria.value   = "";
    showToast("Sangria registrada.");
  } catch (e) {
    showToast(e.response?.data?.erro || "Erro na sangria.", "error");
  } finally {
    processando.value = false;
  }
}

async function registrarReforco() {
  if (valorReforco.value <= 0) { showToast("Informe um valor válido.", "error"); return; }
  processando.value = true;
  try {
    const { data } = await apiClient.post("/api/caixa/reforco", {
      caixa_pk:    caixaStore.caixaAberto.pk,
      valor:       valorReforco.value,
      observacoes: obsReforco.value,
    });
    caixaStore.adicionarReforco(data.reforco);
    valorReforco.value = 0;
    obsReforco.value   = "";
    showToast("Reforço registrado.");
  } catch (e) {
    showToast(e.response?.data?.erro || "Erro no reforço.", "error");
  } finally {
    processando.value = false;
  }
}
</script>

<style scoped>
.caixa-wrap { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
.caixa-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.page-title { margin: 0; font-size: 1.6rem; color: var(--text); }

.badge-aberto { display: flex; align-items: center; gap: 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.5rem 1rem; border-radius: 50px; color: #10b981; font-weight: 600; font-size: 0.85rem; }
.blob { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 0 rgba(16, 185, 129, 1); animation: pulse-green 2s infinite; }
.blob.green { background: #10b981; }

@keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); backdrop-filter: blur(10px); }
.card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
.card-header h3, .card-header h4 { margin: 0; font-size: 1.2rem; color: var(--text); }
.card-header .icon { color: var(--accent); font-size: 24px; }

.field-op { display: flex; flex-direction: column; gap: 8px; }
.mb-opening { margin-bottom: 2.5rem; }
.field-op label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text2); letter-spacing: 0.5px; }
.op-input { padding: 0.85rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; color: var(--text); font-weight: 600; font-size: 1rem; outline: none; transition: border-color 0.2s; }
.op-input:focus { border-color: var(--accent); }
.sm-alert { font-size: 0.7rem; color: #f59e0b; margin-top: 5px; font-weight: 600; }

.section-divider { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 8px; color: var(--text2); }
.section-divider h4 { margin: 0; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
.section-divider span { font-size: 20px; opacity: 0.7; }

.no-accounts-alert { display: flex; align-items: flex-start; gap: 15px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 16px; padding: 1.5rem; color: #f59e0b; margin-bottom: 2rem; }
.no-accounts-alert .material-symbols-outlined { font-size: 32px; }
.no-accounts-alert p { margin: 0; font-size: 0.9rem; line-height: 1.4; }

.instr { font-size: 0.9rem; color: var(--text2); margin-top: -0.5rem; margin-bottom: 1.5rem; }

/* Accounts Grid */
.accounts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.account-field { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; transition: border-color 0.2s; }
.account-field:focus-within { border-color: var(--accent); }
.acc-info { display: flex; align-items: center; gap: 10px; }
.acc-icon { font-size: 18px; color: var(--text2); opacity: 0.6; }
.acc-name { font-size: 0.85rem; font-weight: 700; color: var(--text); }

.acc-input-wrap { display: flex; align-items: center; gap: 8px; background: var(--bg); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border); }
.prefix { font-size: 0.75rem; font-weight: 700; color: var(--text2); }
.acc-input { flex: 1; min-width: 0; background: transparent; border: none; color: var(--text); font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 1.1rem; outline: none; }

/* Footer info */
.opening-footer, .closing-footer { border-top: 1px solid var(--border); padding-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 2rem; flex-wrap: wrap; }
.total-preview { display: flex; flex-direction: column; }
.total-preview .label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text2); }
.total-preview .value { font-size: 1.8rem; font-weight: 800; color: #10b981; font-family: 'IBM Plex Mono', monospace; }

.btn-open-caixa, .btn-close-caixa { padding: 1rem 2.5rem; border: none; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; }
.btn-open-caixa { background: var(--accent); color: white; }
.btn-close-caixa { background: #ef4444; color: white; }
.btn-open-caixa:hover, .btn-close-caixa:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.2); opacity: 0.9; }
.btn-open-caixa:disabled, .btn-close-caixa:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* Layout Aberto */
.opened-caixa-layout { display: flex; flex-direction: column; gap: 1.5rem; }
.caixa-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; display: flex; flex-direction: column; gap: 4px; }
.stat-card .label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text2); opacity: 0.7; }
.stat-card .val { font-size: 1.2rem; font-weight: 800; color: var(--text); font-family: 'IBM Plex Mono', monospace; }
.stat-card.highlight .val { color: #10b981; font-size: 1.4rem; }

.ops-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.op-card { display: flex; flex-direction: column; gap: 0.5rem; }
.op-fields { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem; }
.op-fields input { padding: 0.75rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; color: var(--text); outline: none; }
.op-fields input[type="number"] { font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 1.1rem; }
.btn-op { padding: 0.75rem; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; color: white; }
.btn-op.red { background: #dc2626; }
.btn-op.green { background: #059669; }

.erro-msg { margin-top: 1rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; color: #ef4444; font-size: 0.85rem; font-weight: 600; text-align: center; }

@media (max-width: 600px) {
  .caixa-stats, .ops-row { grid-template-columns: 1fr; }
  .caixa-header { flex-direction: column; align-items: flex-start; }
}
</style>
