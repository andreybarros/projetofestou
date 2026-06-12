<template>
  <div class="ajuste-wrap animate-fade">
    
    <div class="ajuste-header">
      <div class="header-left">
        <button @click="$router.push('/produtos')" class="btn-back">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 class="page-title">Reajuste de Preços em Massa</h1>
          <p class="page-sub">Selecione os produtos e aplique alterações de preço em lote.</p>
        </div>
      </div>
      <div class="header-right" v-if="selecionados.length > 0">
        <span class="selecionados-badge">{{ selecionados.length }} selecionados</span>
        <button class="btn-clear" @click="limparSelecao">Limpar</button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filtros-card card-glass">
      <div class="search-box">
        <span class="material-symbols-outlined">search</span>
        <input v-model="busca" type="text" placeholder="Buscar por nome ou código..." @input="pagina = 1" />
      </div>
      <select v-model="categoriaFiltro" class="select-cat" @change="pagina = 1">
        <option value="">Todas as Categorias</option>
        <option v-for="c in categorias" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
      </select>
      <button :class="['btn-filtro-promo', { active: filtroPromo }]" @click="filtroPromo = !filtroPromo; pagina = 1">
        <span class="material-symbols-outlined">local_offer</span>
        Em Promoção
      </button>
    </div>

    <!-- Tabela de Produtos -->
    <div class="table-container card-glass">
      <div v-if="carregando" class="loading-state">
        <div class="spin"></div>
        <span>Carregando produtos...</span>
      </div>
      
      <table v-else-if="produtosFiltrados.length > 0" class="ajuste-table">
        <thead>
          <tr>
            <th style="width: 40px">
              <input type="checkbox" :checked="todosSelecionados" @change="toggleTodos" />
            </th>
            <th>Produto</th>
            <th>Categoria</th>
            <th class="text-right">Custo Atual</th>
            <th class="text-right">Venda Atual</th>
            <th class="text-right">Margem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in produtosPaginados" :key="p.pk" :class="{ 'row-selected': estaSelecionado(p.pk), 'row-em-promo': estaEmPromo(p) }" @click="toggleProduto(p.pk)">
            <td>
              <input type="checkbox" :checked="estaSelecionado(p.pk)" @click.stop="toggleProduto(p.pk)" />
            </td>
            <td>
              <div class="prod-info">
                <div class="prod-desc-row">
                  <span class="prod-desc">{{ p.descricao }}</span>
                  <span v-if="estaEmPromo(p)" class="chip-promo">PROMO ATIVA</span>
                </div>
                <span class="prod-cod">{{ p.codigo || '—' }}</span>
                <span v-if="estaEmPromo(p)" class="prod-promo-detalhe">
                  Promo: {{ fmt(p.preco_promo) }} · até {{ new Date(p.promo_fim).toLocaleDateString('pt-BR') }}
                </span>
              </div>
            </td>
            <td>{{ p.categoria_nome || '—' }}</td>
            <td class="text-right mono">{{ fmt(p.preco_custo) }}</td>
            <td class="text-right mono bold">{{ fmt(p.valor_venda) }}</td>
            <td class="text-right">
              <span class="badge-margem" :class="getMargemClass(p)">
                {{ calcularMargem(p) }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="vazio">
        <span class="material-symbols-outlined">search_off</span>
        <p>Nenhum produto encontrado com os filtros atuais.</p>
      </div>

      <!-- Paginação -->
      <div v-if="totalPaginas > 1" class="paginacao">
        <button :disabled="pagina === 1" @click="pagina--">‹</button>
        <span>{{ pagina }} / {{ totalPaginas }}</span>
        <button :disabled="pagina === totalPaginas" @click="pagina++">›</button>
      </div>
    </div>

    <!-- Barra de Ações (Aparece quando há selecionados) -->
    <Transition name="slide-up">
      <div v-if="selecionados.length > 0" class="actions-bar">
        <div class="bar-mode-toggle">
          <button :class="['mode-btn', { active: modoAcao === 'permanente' }]" @click="modoAcao = 'permanente'">
            <span class="material-symbols-outlined">edit</span> Reajuste Permanente
          </button>
          <button :class="['mode-btn', { active: modoAcao === 'promo' }]" @click="modoAcao = 'promo'">
            <span class="material-symbols-outlined">local_offer</span> Promoção Relâmpago
          </button>
        </div>

        <div class="bar-content">

          <!-- Modo permanente -->
          <template v-if="modoAcao === 'permanente'">
            <div class="action-group">
              <label>Alterar Preço de:</label>
              <select v-model="tipoAlvo" class="action-select">
                <option value="venda">Venda</option>
                <option value="custo">Custo</option>
                <option value="ambos">Ambos (Venda e Custo)</option>
              </select>
            </div>
            <div class="action-group">
              <label>Tipo de Reajuste:</label>
              <select v-model="metodo" class="action-select">
                <option value="percentual_aumento">Aumentar %</option>
                <option value="percentual_desconto">Diminuir %</option>
                <option value="valor_fixo">Valor Fixo (R$)</option>
              </select>
            </div>
            <div class="action-group">
              <label>Valor:</label>
              <div class="input-prefix">
                <span v-if="metodo === 'valor_fixo'">R$</span>
                <input v-model.number="valorAjuste" type="number" step="0.01" class="action-input" placeholder="0.00" />
                <span v-if="metodo !== 'valor_fixo'">%</span>
              </div>
            </div>
            <button class="btn-aplicar" @click="confirmarReajuste" :disabled="atualizando || !valorAjuste">
              <span v-if="atualizando" class="spin-sm"></span>
              <span v-else class="material-symbols-outlined">check</span>
              Aplicar em {{ selecionados.length }} itens
            </button>
          </template>

          <!-- Modo promoção relâmpago -->
          <template v-else>
            <div class="action-group">
              <label>Preço Promocional (R$)</label>
              <div class="input-prefix">
                <span>R$</span>
                <input v-model.number="promoPreco" type="number" step="0.01" min="0.01" class="action-input" placeholder="0.00" />
              </div>
            </div>
            <div class="action-group">
              <label>Início</label>
              <input v-model="promoInicio" type="datetime-local" class="action-input" />
            </div>
            <div class="action-group">
              <label>Fim</label>
              <input v-model="promoFim" type="datetime-local" class="action-input" />
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn-aplicar" @click="aplicarPromo" :disabled="atualizando || !promoPreco || !promoInicio || !promoFim">
                <span v-if="atualizando" class="spin-sm"></span>
                <span v-else class="material-symbols-outlined">local_offer</span>
                Criar Promoção ({{ selecionados.length }} itens)
              </button>
              <button class="btn-limpar-promo" @click="limparPromo" :disabled="atualizando">
                Remover Promoção dos Selecionados
              </button>
            </div>
          </template>

        </div>
      </div>
    </Transition>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" :class="['aj-toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>

    <!-- Modal de Confirmação -->
    <div v-if="showConfirm" class="modal-overlay">
      <div class="modal-card card-glass animate-pop">
        <h3 class="modal-title">Confirmar Reajuste</h3>
        <p class="modal-text">
          Você está prestes a alterar o preço de <b>{{ selecionados.length }}</b> produtos. 
          Essa operação não pode ser desfeita facilmente.
        </p>
        <div class="resumo-ajuste">
          <span>{{ metodoLabel }} de <b>{{ valorAjuste }}{{ metodo === 'valor_fixo' ? '' : '%' }}</b> no preço de <b>{{ tipoAlvoLabel }}</b>.</span>
        </div>
        <div class="modal-actions">
          <button class="btn-modal-cancel" @click="showConfirm = false">Cancelar</button>
          <button class="btn-modal-confirm" @click="executarReajuste">Confirmar e Aplicar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../services/api';
import { useSessaoStore } from '../stores/sessao';
import { useFormatacao } from '../composables/useFormatacao';

const sessaoStore = useSessaoStore();
const { fmt, fmtData, fmtNum } = useFormatacao();
const carregando  = ref(true);
const atualizando = ref(false);
const produtos    = ref([]);
const categorias  = ref([]);
const selecionados = ref([]);
const showConfirm  = ref(false);
const toastMsg    = ref('');
const toastTipo   = ref('ok');
let   toastTimer  = null;

function toast(msg, tipo = 'ok', dur = 3500) {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, dur);
}

// Filtros e Paginação
const busca           = ref('');
const categoriaFiltro = ref('');
const filtroPromo     = ref(false);
const pagina          = ref(1);
const POR_PAGINA      = 15;

// Parâmetros de Ajuste
const tipoAlvo    = ref('venda');
const metodo      = ref('percentual_aumento');
const valorAjuste = ref(null);
const modoAcao    = ref('permanente');

// Promoção Relâmpago
const promoPreco  = ref(null);
const promoInicio = ref('');
const promoFim    = ref('');

onMounted(carregarProdutos);

async function carregarProdutos() {
  carregando.value = true;
  try {
    const resp = await api.get('/api/ajuste-precos/produtos', {
      params: { filial_pk: sessaoStore.filial?.pk },
    });
    produtos.value   = resp.data.produtos   || [];
    categorias.value = resp.data.categorias || [];
  } catch (e) {
    toast('Erro ao carregar produtos: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function estaEmPromo(p) {
  return !!p.em_promo;
}

// Lógica de Filtro e Seleção
const produtosFiltrados = computed(() => {
  const q = (busca.value || "").trim().toLowerCase();
  const palavras = q.split(/\s+/).filter(Boolean);

  return produtos.value.filter(p => {
    const matchCat = !categoriaFiltro.value || p.categoria_pk === categoriaFiltro.value;
    if (!matchCat) return false;

    if (filtroPromo.value && !estaEmPromo(p)) return false;

    if (!q) return true;
    const desc   = (p.descricao || '').toLowerCase();
    const codigo = (p.codigo    || '').toLowerCase();
    if (codigo.includes(q)) return true;
    return palavras.every(w => desc.includes(w));
  });
});

const totalPaginas = computed(() => Math.ceil(produtosFiltrados.value.length / POR_PAGINA));

const produtosPaginados = computed(() => {
  const ini = (pagina.value - 1) * POR_PAGINA;
  return produtosFiltrados.value.slice(ini, ini + POR_PAGINA);
});

const todosSelecionados = computed(() => {
  if (produtosPaginados.value.length === 0) return false;
  return produtosPaginados.value.every(p => estaSelecionado(p.pk));
});

function toggleTodos() {
  if (todosSelecionados.value) {
    const pks = produtosPaginados.value.map(p => p.pk);
    selecionados.value = selecionados.value.filter(id => !pks.includes(id));
  } else {
    produtosPaginados.value.forEach(p => {
      if (!estaSelecionado(p.pk)) selecionados.value.push(p.pk);
    });
  }
}

function toggleProduto(pk) {
  const idx = selecionados.value.indexOf(pk);
  if (idx > -1) selecionados.value.splice(idx, 1);
  else selecionados.value.push(pk);
}

function estaSelecionado(pk) {
  return selecionados.value.includes(pk);
}

function limparSelecao() {
  selecionados.value = [];
}

// Labels para o Modal
const metodoLabel = computed(() => {
  if (metodo.value === 'percentual_aumento') return 'Aumento Percentual';
  if (metodo.value === 'percentual_desconto') return 'Desconto Percentual';
  return 'Alteração para Valor Fixo';
});

const tipoAlvoLabel = computed(() => {
  if (tipoAlvo.value === 'venda') return 'Venda';
  if (tipoAlvo.value === 'custo') return 'Custo';
  return 'Venda e Custo';
});

// Ação de Reajuste
function confirmarReajuste() {
  if (!valorAjuste.value || selecionados.value.length === 0) return;
  showConfirm.value = true;
}

async function executarReajuste() {
  showConfirm.value = false;
  atualizando.value = true;
  try {
    await api.post('/api/ajuste-precos/reajuste', {
      pks:        selecionados.value,
      tipoAlvo:   tipoAlvo.value,
      metodo:     metodo.value,
      valorAjuste: valorAjuste.value,
    });
    await carregarProdutos();
    limparSelecao();
    toast('Preços atualizados com sucesso!');
  } catch (err) {
    toast('Erro ao atualizar preços: ' + (err.response?.data?.erro || err.message), 'err');
  } finally {
    atualizando.value = false;
  }
}

async function aplicarPromo() {
  if (!promoPreco.value || !promoInicio.value || !promoFim.value) return;
  atualizando.value = true;
  try {
    await api.post('/api/ajuste-precos/promo', {
      pks:         selecionados.value,
      preco_promo:  promoPreco.value,
      promo_inicio: promoInicio.value,
      promo_fim:    promoFim.value,
    });
    await carregarProdutos();
    limparSelecao();
    toast(`Promoção aplicada em ${selecionados.value.length} produto(s)!`);
  } catch (err) {
    toast('Erro ao aplicar promoção: ' + (err.response?.data?.erro || err.message), 'err');
  } finally {
    atualizando.value = false;
  }
}

async function limparPromo() {
  atualizando.value = true;
  try {
    await api.delete('/api/ajuste-precos/promo', { data: { pks: selecionados.value } });
    await carregarProdutos();
    limparSelecao();
    toast('Promoção removida com sucesso!');
  } catch (err) {
    toast('Erro ao remover promoção: ' + (err.response?.data?.erro || err.message), 'err');
  } finally {
    atualizando.value = false;
  }
}

// Helpers Visuais
function calcularMargem(p) {
  if (!p.valor_venda || !p.preco_custo) return 0;
  const lucro = p.valor_venda - p.preco_custo;
  return Math.round((lucro / p.valor_venda) * 100);
}

function getMargemClass(p) {
  const m = calcularMargem(p);
  if (m < 20) return 'margem-baixa';
  if (m < 50) return 'margem-media';
  return 'margem-alta';
}

onUnmounted(() => { clearTimeout(toastTimer); });
</script>

<style scoped>
.ajuste-wrap { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 4rem; }

.ajuste-header { display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 1.25rem; }
.btn-back { background: var(--bg2); border: 1px solid var(--border); padding: 8px; border-radius: 12px; cursor: pointer; color: var(--text); display: flex; align-items: center; justify-content: center; transition: all .2s; }
.btn-back:hover { background: var(--bg3); border-color: var(--primary); }

.page-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--text); }
.page-sub { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }

.selecionados-badge { background: var(--primary); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
.btn-clear { background: none; border: none; color: var(--red); font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 4px 8px; }

/* Filtros */
.filtros-card { display: flex; gap: 1rem; padding: 1rem; border-radius: 16px; align-items: center; background: var(--bg2); border: 1px solid var(--border); flex-wrap: wrap; }
.search-box { flex: 1; min-width: 200px; position: relative; display: flex; align-items: center; }
.search-box span { position: absolute; left: 12px; color: var(--text2); font-size: 20px; pointer-events: none; }
.search-box input { width: 100%; padding: 10px 12px 10px 40px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg1); color: var(--text); outline: none; transition: border-color .2s; }
.search-box input:focus { border-color: var(--primary); }

.select-cat { padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg1); color: var(--text); outline: none; min-width: 200px; }

.btn-filtro-promo { display: flex; align-items: center; gap: 6px; padding: 9px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg1); color: var(--text2); font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap; }
.btn-filtro-promo .material-symbols-outlined { font-size: 18px; }
.btn-filtro-promo.active { background: rgba(239,68,68,.12); color: #ef4444; border-color: rgba(239,68,68,.4); }
.btn-filtro-promo:not(.active):hover { background: var(--bg3); color: var(--text); }

/* Toast */
.aj-toast { position: fixed; bottom: 9rem; left: 50%; transform: translateX(-50%); background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: .9rem; box-shadow: 0 8px 24px rgba(0,0,0,.2); z-index: 300; white-space: nowrap; }
.aj-toast.err { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #ef4444; }
.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* Tabela */
.table-container { border-radius: 16px; overflow: hidden; background: var(--bg2); border: 1px solid var(--border); min-height: 400px; }
.ajuste-table { width: 100%; border-collapse: collapse; text-align: left; }
.ajuste-table th { padding: 1rem; background: var(--bg3); color: var(--text2); font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; border-bottom: 2px solid var(--border); }
.ajuste-table td { padding: 1rem; border-bottom: 1px solid var(--border); font-size: 0.9rem; color: var(--text); }
.ajuste-table tr { cursor: pointer; transition: background .15s; }
.ajuste-table tr:hover { background: rgba(99,102,241, 0.05); }
.ajuste-table tr.row-selected { background: rgba(99,102,241, 0.08); }

.prod-info { display: flex; flex-direction: column; gap: 1px; }
.prod-desc-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.prod-desc { font-weight: 700; color: var(--text); }
.prod-cod { font-size: 0.75rem; color: var(--text2); font-family: monospace; }
.prod-promo-detalhe { font-size: 0.7rem; color: #f59e0b; font-weight: 600; }

.chip-promo { font-size: 0.6rem; font-weight: 800; background: rgba(245,158,11,.18); color: #d97706; border: 1px solid rgba(245,158,11,.4); padding: 2px 7px; border-radius: 20px; white-space: nowrap; text-transform: uppercase; letter-spacing: .4px; }

.ajuste-table tr.row-em-promo { background: rgba(245,158,11,.04); }
.ajuste-table tr.row-em-promo:hover { background: rgba(245,158,11,.09); }
.ajuste-table tr.row-selected.row-em-promo { background: rgba(99,102,241,.08); }
.text-right { text-align: right; }
.mono { font-family: monospace; }
.bold { font-weight: 800; color: var(--primary); }

.badge-margem { padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
.margem-baixa { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.margem-media { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.margem-alta { background: rgba(16, 185, 129, 0.15); color: #10b981; }

.loading-state, .vazio { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; gap: 1rem; color: var(--text2); }
.spin { width: 30px; height: 30px; border: 3px solid rgba(99,102,241, 0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(3600deg); } }

.paginacao { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; background: var(--bg3); }
.paginacao button { background: var(--bg2); border: 1px solid var(--border); padding: 5px 12px; border-radius: 8px; cursor: pointer; color: var(--text); transition: all .2s; }
.paginacao button:hover:not(:disabled) { background: var(--primary); color: white; }
.paginacao button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Barra de Ações */
.actions-bar { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); width: 90%; max-width: 1000px; background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border: 1px solid rgba(99,102,241, 0.3); border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 100; padding: 1rem 1.25rem 1.25rem; }
[data-theme="dark"] .actions-bar { background: rgba(30,32,40,0.92); border-color: rgba(99,102,241, 0.5); }

.bar-mode-toggle { display: flex; gap: 8px; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: .75rem; }
.mode-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 10px; border: 1px solid var(--border); background: transparent; color: var(--text2); font-size: .8rem; font-weight: 600; cursor: pointer; transition: all .15s; }
.mode-btn .material-symbols-outlined { font-size: 16px; }
.mode-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.mode-btn:not(.active):hover { background: var(--bg3); color: var(--text); }

.bar-content { display: flex; align-items: flex-end; gap: 1.5rem; flex-wrap: wrap; }

.btn-limpar-promo { background: transparent; border: 1px solid rgba(239,68,68,.4); color: #ef4444; padding: 8px 14px; border-radius: 10px; font-size: .78rem; font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap; }
.btn-limpar-promo:hover:not(:disabled) { background: rgba(239,68,68,.08); }
.btn-limpar-promo:disabled { opacity: .4; cursor: not-allowed; }
.action-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 150px; }
.action-group label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text2); }
.action-select, .action-input { padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg1); color: var(--text); outline: none; width: 100%; transition: all .2s; }
.action-select:focus, .action-input:focus { border-color: var(--primary); }

.input-prefix { position: relative; display: flex; align-items: center; }
.input-prefix span { position: absolute; padding: 0 12px; color: var(--text2); font-weight: 700; }
.input-prefix input { padding-left: 36px; padding-right: 36px; }
.input-prefix span:last-child { right: 0; }

.btn-aplicar { background: var(--primary); color: white; border: none; padding: 0 2rem; height: 46px; border-radius: 14px; font-weight: 800; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: transform .2s, box-shadow .2s; box-shadow: 0 4px 15px rgba(99,102,241, 0.4); }
.btn-aplicar:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241, 0.6); }
.btn-aplicar:disabled { opacity: 0.6; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-card { width: 90%; max-width: 450px; padding: 2rem; border-radius: 24px; text-align: center; border: 1px solid var(--border); }
.modal-title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 900; }
.modal-text { color: var(--text2); margin-bottom: 1.5rem; line-height: 1.5; }
.resumo-ajuste { background: rgba(99,102,241, 0.1); padding: 1rem; border-radius: 12px; margin-bottom: 2rem; color: var(--primary); font-size: 0.95rem; }
.modal-actions { display: flex; gap: 1rem; }
.modal-actions button { flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all .2s; }
.btn-modal-cancel { background: var(--bg3); border: 1px solid var(--border); color: var(--text); }
.btn-modal-confirm { background: var(--primary); border: none; color: white; }

/* Animações */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translate(-50%, 100%); opacity: 0; }

.animate-pop { animation: pop 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
@keyframes pop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
</style>
