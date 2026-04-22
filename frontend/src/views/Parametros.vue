<template>
  <div class="params-wrap animate-fade">

    <div class="params-header">
      <h2 class="page-title">
        <span class="material-symbols-outlined">tune</span>
        Parâmetros do Sistema
      </h2>
      <p class="params-sub">Configure o comportamento do sistema. Alterações são salvas automaticamente.</p>
    </div>

    <div v-if="carregando" class="state-msg">
      <span class="spin"></span> Carregando parâmetros…
    </div>

    <div v-else class="params-body">

      <!-- ── PDV & Caixa ──────────────────────────────────────── -->
      <section class="param-group">
        <div class="group-header">
          <span class="material-symbols-outlined group-icon" style="color:#4ade80">point_of_sale</span>
          <div>
            <h3>PDV &amp; Caixa</h3>
            <p>Comportamento do ponto de venda e controle de caixa.</p>
          </div>
        </div>
        <div class="param-list">
          <div v-for="p in grupos.pdv" :key="p.chave" class="param-row">
            <div class="param-info">
              <div class="param-label">{{ p.label }}</div>
              <div class="param-desc">{{ p.desc }}</div>
            </div>
            <div class="param-ctrl">
              <template v-if="p.tipo === 'boolean'">
                <button class="toggle-wrap" @click="toggleBool(p.chave)">
                  <div :class="['toggle-track', { on: isTrue(p.chave) }]">
                    <div class="toggle-thumb"></div>
                  </div>
                  <span class="toggle-label">{{ isTrue(p.chave) ? '.T.' : '.F.' }}</span>
                </button>
              </template>
              <template v-else-if="p.tipo === 'number'">
                <input
                  type="number" class="param-number"
                  :min="p.min ?? 0" :max="p.max ?? 9999"
                  :value="vals[p.chave]"
                  @change="e => salvar(p.chave, e.target.value)"
                />
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Ponto Eletrônico ─────────────────────────────────── -->
      <section class="param-group">
        <div class="group-header">
          <span class="material-symbols-outlined group-icon" style="color:#60a5fa">schedule</span>
          <div>
            <h3>Ponto Eletrônico</h3>
            <p>Regras de batida de ponto e fechamento de folha.</p>
          </div>
        </div>
        <div class="param-list">
          <div v-for="p in grupos.ponto" :key="p.chave" class="param-row">
            <div class="param-info">
              <div class="param-label">{{ p.label }}</div>
              <div class="param-desc">{{ p.desc }}</div>
            </div>
            <div class="param-ctrl">
              <template v-if="p.tipo === 'boolean'">
                <button class="toggle-wrap" @click="toggleBool(p.chave)">
                  <div :class="['toggle-track', { on: isTrue(p.chave) }]">
                    <div class="toggle-thumb"></div>
                  </div>
                  <span class="toggle-label">{{ isTrue(p.chave) ? '.T.' : '.F.' }}</span>
                </button>
              </template>
              <template v-else-if="p.tipo === 'number'">
                <input
                  type="number" class="param-number"
                  :min="p.min ?? 0" :max="p.max ?? 9999"
                  :value="vals[p.chave]"
                  @change="e => salvar(p.chave, e.target.value)"
                />
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Fiscal / NFC-e ───────────────────────────────────── -->
      <section class="param-group">
        <div class="group-header">
          <span class="material-symbols-outlined group-icon" style="color:#fbbf24">receipt_long</span>
          <div>
            <h3>Fiscal / NFC-e</h3>
            <p>Emissão de nota fiscal de consumidor eletrônica.</p>
          </div>
        </div>
        <div class="param-list">
          <div v-for="p in grupos.fiscal" :key="p.chave" class="param-row">
            <div class="param-info">
              <div class="param-label">{{ p.label }}</div>
              <div class="param-desc">{{ p.desc }}</div>
            </div>
            <div class="param-ctrl">
              <template v-if="p.tipo === 'boolean'">
                <button class="toggle-wrap" @click="toggleBool(p.chave)">
                  <div :class="['toggle-track', { on: isTrue(p.chave) }]">
                    <div class="toggle-thumb"></div>
                  </div>
                  <span class="toggle-label">{{ isTrue(p.chave) ? '.T.' : '.F.' }}</span>
                </button>
              </template>
              <template v-else-if="p.tipo === 'select'">
                <select class="param-select" :value="vals[p.chave]" @change="e => salvar(p.chave, e.target.value)">
                  <option v-for="op in p.opcoes" :key="op.value" :value="op.value">{{ op.label }}</option>
                </select>
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Vendas ────────────────────────────────────────────── -->
      <section class="param-group">
        <div class="group-header">
          <span class="material-symbols-outlined group-icon" style="color:#c084fc">shopping_cart</span>
          <div>
            <h3>Vendas</h3>
            <p>Regras gerais do processo de venda.</p>
          </div>
        </div>
        <div class="param-list">
          <div v-for="p in grupos.vendas" :key="p.chave" class="param-row">
            <div class="param-info">
              <div class="param-label">{{ p.label }}</div>
              <div class="param-desc">{{ p.desc }}</div>
            </div>
            <div class="param-ctrl">
              <template v-if="p.tipo === 'boolean'">
                <button class="toggle-wrap" @click="toggleBool(p.chave)">
                  <div :class="['toggle-track', { on: isTrue(p.chave) }]">
                    <div class="toggle-thumb"></div>
                  </div>
                  <span class="toggle-label">{{ isTrue(p.chave) ? '.T.' : '.F.' }}</span>
                </button>
              </template>
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="params-toast" :class="toastTipo">
        <span class="material-symbols-outlined" style="font-size:18px">
          {{ toastTipo === 'ok' ? 'check_circle' : 'error' }}
        </span>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useParametrosStore } from '../stores/parametros';
import { useSessaoStore } from '../stores/sessao';

const parametrosStore = useParametrosStore();
const sessaoStore     = useSessaoStore();

const carregando = ref(true);
const toastMsg   = ref('');
const toastTipo  = ref('ok');
let toastTimer   = null;

// Definição dos grupos/parâmetros
const grupos = {
  pdv: [
    { chave: 'pdv_bloquear_sem_caixa',        tipo: 'boolean', label: 'Bloquear PDV sem caixa aberto',        desc: 'Impede vendas quando nenhum caixa está aberto na filial.' },
    { chave: 'pdv_exigir_vendedor',            tipo: 'boolean', label: 'Exigir vendedor na venda',            desc: 'Obriga selecionar um vendedor antes de finalizar qualquer venda.' },
    { chave: 'pdv_permitir_estoque_negativo',  tipo: 'boolean', label: 'Permitir venda sem estoque',          desc: 'Permite adicionar produtos com saldo zero ou negativo ao carrinho.' },
    { chave: 'pdv_desconto_maximo',            tipo: 'number',  label: 'Desconto máximo sem aprovação (%)',   desc: 'Limite de desconto que o operador pode aplicar livremente. 0 = sem limite.', min: 0, max: 100 },
    { chave: 'crediario_exige_cliente',        tipo: 'boolean', label: 'Crediário exige cliente selecionado', desc: 'Quando ativo, não permite finalizar venda em crediário sem selecionar um cliente.' },
  ],
  ponto: [
    { chave: 'ponto_exigir_gps',               tipo: 'boolean', label: 'Exigir localização GPS',              desc: 'Bloqueia a batida de ponto se o GPS do dispositivo não estiver disponível.' },
    { chave: 'ponto_tolerancia_minutos',        tipo: 'number',  label: 'Tolerância de ponto (minutos)',       desc: 'Minutos de tolerância na entrada e saída sem gerar banco de horas — CLT Art. 58 §1º.', min: 0, max: 60 },
    { chave: 'ponto_fechamento_exige_espelho',  tipo: 'boolean', label: 'Fechar folha exige espelho aprovado', desc: 'Impede salvar o fechamento de ponto sem que o espelho esteja como "Aprovado".' },
  ],
  fiscal: [
    { chave: 'nfce_ativa',    tipo: 'boolean', label: 'Emissão de NFC-e ativa',  desc: 'Habilita a emissão automática de NFC-e ao finalizar uma venda no PDV.' },
    { chave: 'nfce_ambiente', tipo: 'select',  label: 'Ambiente NFC-e',          desc: 'Homologação para testes; Produção para emissões com validade fiscal.',
      opcoes: [{ value: '2', label: 'Homologação (Testes)' }, { value: '1', label: 'Produção' }] },
  ],
  vendas: [
    { chave: 'venda_permite_desconto_sem_aprovacao', tipo: 'boolean', label: 'Desconto sem aprovação de supervisor', desc: 'Quando ativo, qualquer operador pode aplicar descontos sem autorização prévia.' },
    { chave: 'venda_imprime_cupom',                  tipo: 'boolean', label: 'Imprimir cupom ao finalizar venda',    desc: 'Abre automaticamente o diálogo de impressão após confirmar a venda no PDV.' },
  ],
};

// Defaults (fallback antes de carregar)
const vals = reactive({
  pdv_bloquear_sem_caixa:               'true',
  pdv_exigir_vendedor:                  'false',
  pdv_permitir_estoque_negativo:        'false',
  pdv_desconto_maximo:                  '0',
  crediario_exige_cliente:              'true',
  ponto_exigir_gps:                     'true',
  ponto_tolerancia_minutos:             '15',
  ponto_fechamento_exige_espelho:        'true',
  nfce_ativa:                           'false',
  nfce_ambiente:                        '2',
  venda_permite_desconto_sem_aprovacao: 'true',
  venda_imprime_cupom:                  'false',
});

onMounted(async () => {
  await parametrosStore.carregar(sessaoStore.filial?.pk);
  Object.keys(vals).forEach(k => {
    if (parametrosStore.mapa[k] !== undefined) vals[k] = parametrosStore.mapa[k];
  });
  carregando.value = false;
});

function isTrue(chave) {
  return vals[chave] === 'true' || vals[chave] === true;
}

async function toggleBool(chave) {
  const novo = !isTrue(chave);
  await salvar(chave, novo ? 'true' : 'false');
}

async function salvar(chave, valor) {
  vals[chave] = String(valor);
  try {
    await parametrosStore.salvar(chave, String(valor), null);
    showToast('Parâmetro salvo com sucesso!', 'ok');
  } catch {
    showToast('Erro ao salvar parâmetro.', 'err');
  }
}

function showToast(msg, tipo = 'ok') {
  toastMsg.value = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 2500);
}
</script>

<style scoped>
.params-wrap {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 80px;
}
.params-header { margin-bottom: 28px; }
.page-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 22px; font-weight: 700; color: var(--text);
  margin: 0 0 6px;
}
.params-sub { color: var(--text2); font-size: 14px; margin: 0; }

.params-body { display: flex; flex-direction: column; gap: 20px; }

.param-group {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}
.group-header {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg3);
}
.group-icon { font-size: 26px; flex-shrink: 0; margin-top: 2px; }
.group-header h3 { font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 3px; }
.group-header p  { font-size: 13px; color: var(--text2); margin: 0; }

.param-list { display: flex; flex-direction: column; }
.param-row {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  transition: background .15s;
}
.param-row:last-child { border-bottom: none; }
.param-row:hover { background: var(--bg3); }

.param-info { flex: 1; min-width: 0; }
.param-label { font-size: 14px; font-weight: 600; color: var(--text); }
.param-desc  { font-size: 12px; color: var(--text2); margin-top: 3px; line-height: 1.5; }

.param-ctrl { flex-shrink: 0; }

/* Toggle */
.toggle-wrap {
  display: flex; align-items: center; gap: 8px;
  background: none; border: none; cursor: pointer; padding: 0;
}
.toggle-track {
  position: relative; width: 46px; height: 26px;
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 13px; transition: background .2s, border-color .2s;
}
.toggle-track.on  { background: var(--accent); border-color: var(--accent); }
.toggle-thumb {
  position: absolute; top: 4px; left: 4px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; transition: transform .2s;
  box-shadow: 0 1px 4px rgba(0,0,0,.35);
}
.toggle-track.on .toggle-thumb { transform: translateX(20px); }
.toggle-label {
  font-size: 11px; font-weight: 700; font-family: var(--mono, monospace);
  color: var(--text2); min-width: 26px; letter-spacing: .02em;
}

/* Number */
.param-number {
  width: 84px; padding: 7px 10px;
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: 14px;
  text-align: center; transition: border-color .15s;
}
.param-number:focus { outline: none; border-color: var(--accent); }

/* Select */
.param-select {
  padding: 7px 12px; min-width: 200px;
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: 13px;
  transition: border-color .15s;
}
.param-select:focus { outline: none; border-color: var(--accent); }

/* Toast */
.params-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 10px;
  font-size: 13px; font-weight: 600; z-index: 9999;
  box-shadow: 0 4px 18px rgba(0,0,0,.3);
  white-space: nowrap;
}
.params-toast.ok  { background: #166534; color: #bbf7d0; }
.params-toast.err { background: #7f1d1d; color: #fecaca; }

.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

.state-msg { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 60px; color: var(--text2); }
.spin {
  display: inline-block; width: 20px; height: 20px; flex-shrink: 0;
  border: 2px solid var(--border); border-top-color: var(--accent);
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .param-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .param-ctrl { align-self: flex-start; }
  .param-select { min-width: 100%; }
}
</style>
