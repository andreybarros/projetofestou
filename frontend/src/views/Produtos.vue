<template>
  <div class="prod-wrap">
    <div class="prod-header">
      <div>
        <h1 class="page-title">Produtos</h1>
        <p class="page-sub">{{ produtosFiltrados.length }} produto(s) cadastrado(s)</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input v-model="busca" type="text" placeholder="Buscar por nome, código ou barras..." class="busca-input" />
        </div>
        <div class="view-toggle">
          <button :class="['btn-view', viewMode === 'grid' ? 'active' : '']" @click="viewMode = 'grid'" title="Grade">
            <span class="material-symbols-outlined">grid_view</span>
          </button>
          <button :class="['btn-view', viewMode === 'table' ? 'active' : '']" @click="viewMode = 'table'" title="Lista">
            <span class="material-symbols-outlined">table_rows</span>
          </button>
        </div>
        <button @click="$router.push('/produtos/novo')" class="btn-primary">
          <span class="material-symbols-outlined">add</span>
          Novo Produto
        </button>

        <!-- Dropdown Outras Ações -->
        <div class="dropdown-wrap">
          <button @click="showAcoes = !showAcoes" :class="['btn-secondary', showAcoes ? 'active' : '']">
            <span class="material-symbols-outlined">{{ showAcoes ? 'expand_less' : 'more_vert' }}</span>
            Outras Ações
          </button>
          
          <Transition name="drop">
            <div v-if="showAcoes" class="dropdown-menu card-glass">
              <button class="drop-item" @click="$router.push('/produtos/importar'); showAcoes = false">
                <span class="material-symbols-outlined">upload_file</span>
                Importar CSV
              </button>
              <button class="drop-item" @click="$router.push('/produtos/reajuste'); showAcoes = false">
                <span class="material-symbols-outlined">payments</span>
                Reajuste em Massa
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Filtros rápidos -->
    <div class="filtros-rapidos">
      <button :class="['filtro-chip', { active: filtroPromo }]" @click="filtroPromo = !filtroPromo">
        <span class="material-symbols-outlined">local_offer</span>
        Em Promoção
      </button>
    </div>

    <div v-if="carregando" class="loading">
      <div class="spin"></div>
      <span>Carregando produtos...</span>
    </div>

    <div v-else-if="produtosFiltrados.length === 0" class="vazio">
      <span class="material-symbols-outlined" style="font-size:3rem;opacity:.3">inventory_2</span>
      <p>Nenhum produto encontrado.</p>
    </div>

    <template v-else>
      <!-- Grade de Cards -->
      <div v-if="viewMode === 'grid'" class="cards-grid">
        <div v-for="p in produtosPaginados" :key="p.pk" class="prod-card" @click="$router.push(`/produtos/${p.pk}/editar`)">
          <div class="card-foto">
            <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" class="card-img" loading="lazy" />
            <div v-else class="card-avatar">{{ p.descricao?.charAt(0)?.toUpperCase() }}</div>
            <span :class="['saldo-badge', p.saldo <= 0 ? 'zero' : p.saldo < 5 ? 'baixo' : 'ok']">
              {{ p.saldo != null ? p.saldo : '∞' }}
            </span>
          </div>
          <div class="card-info">
            <p class="card-desc">{{ p.descricao }}</p>
            <p class="card-cat">{{ p.categoria_nome || '—' }}</p>
            <div class="card-footer">
              <div v-if="p.em_promo" class="card-promo-area">
                <span class="card-preco-antigo">{{ fmt(p.valor_venda) }}</span>
                <span class="card-preco-novo">{{ fmt(p.preco_promo) }}</span>
              </div>
              <span v-else class="card-preco">{{ fmt(p.valor_venda) }}</span>
              <span v-if="p.codigo" class="card-cod">{{ p.codigo }}</span>
            </div>
          </div>
          <div v-if="p.em_promo" class="promo-badge-tag">PROMO</div>
        </div>
      </div>

      <!-- Tabela -->
      <div v-if="viewMode === 'table'" class="tabela-wrap">
        <table class="tabela">
          <thead>
            <tr>
              <th style="width:52px"></th>
              <th>Código</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Preço Venda</th>
              <th>Saldo</th>
              <th>NCM</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in produtosPaginados" :key="p.pk" @click="$router.push(`/produtos/${p.pk}/editar`)">
              <td>
                <div class="table-thumb">
                  <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" class="thumb-img" loading="lazy" />
                  <div v-else class="thumb-avatar">{{ p.descricao?.charAt(0)?.toUpperCase() }}</div>
                </div>
              </td>
              <td class="mono">{{ p.codigo || "—" }}</td>
              <td>{{ p.descricao }}</td>
              <td>{{ p.categoria_nome || "—" }}</td>
              <td class="mono">
                <div v-if="p.em_promo" class="table-promo">
                  <span class="table-old-price">{{ fmt(p.valor_venda) }}</span>
                  <span class="table-new-price">{{ fmt(p.preco_promo) }}</span>
                </div>
                <span v-else>{{ fmt(p.valor_venda) }}</span>
              </td>
              <td :class="['saldo', (p.saldo || 0) <= 0 ? 'zero' : (p.saldo || 0) < 5 ? 'baixo' : 'ok']">{{ p.saldo ?? '∞' }}</td>
              <td class="mono">{{ p.ncm || '—' }}</td>
              <td class="acoes">
                <button class="btn-edit" title="Editar">
                  <span class="material-symbols-outlined">edit</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="resumo">
          {{ (pagina - 1) * POR_PAGINA + 1 }}–{{ Math.min(pagina * POR_PAGINA, produtosFiltrados.length) }} de {{ produtosFiltrados.length }} produto(s)
          <span v-if="totalPaginas > 1" class="resumo-paginas">
            &nbsp;·&nbsp;
            <button class="pg-btn" :disabled="pagina === 1" @click="pagina--">‹</button>
            {{ pagina }} / {{ totalPaginas }}
            <button class="pg-btn" :disabled="pagina === totalPaginas" @click="pagina++">›</button>
          </span>
        </div>
      </div>

      <!-- Paginação Geral -->
      <div v-if="totalPaginas > 1 && viewMode === 'grid'" class="paginacao">
        <button class="pg-btn" :disabled="pagina === 1" @click="pagina--">‹</button>
        <span class="pg-info">{{ pagina }} / {{ totalPaginas }}</span>
        <button class="pg-btn" :disabled="pagina === totalPaginas" @click="pagina++">›</button>
      </div>
    </template>

    <!-- Totalizadores -->
    <div v-if="!carregando && produtos.length" class="totalizadores card-glass">
      <div class="total-item">
        <span class="total-label">Total de produtos cadastrados</span>
        <span class="total-val">{{ produtos.length.toLocaleString('pt-BR') }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">Total de produtos em estoque</span>
        <span class="total-val">{{ (totais.qtd || 0).toLocaleString('pt-BR') }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">Valor de custo em estoque</span>
        <span class="total-val">{{ fmt(totais.custo) }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">Valor de venda em estoque</span>
        <span class="total-val venda">{{ fmt(totais.venda) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useSessaoStore } from "../stores/sessao";
import { supabase } from "../composables/useSupabase";

const router      = useRouter();
const sessaoStore = useSessaoStore();
const produtos    = ref([]);
const categorias  = ref([]);
const carregando  = ref(true);
const busca        = ref("");
const viewMode     = ref("grid");
const pagina       = ref(1);
const POR_PAGINA   = 48;
const showAcoes    = ref(false);
const filtroPromo  = ref(false);

const produtosFiltrados = computed(() => {
  const q = (busca.value || "").trim().toLowerCase();
  return produtos.value.filter(p => {
    if (filtroPromo.value && !p.em_promo) return false;
    if (!q) return true;
    const palavras = q.split(/\s+/).filter(Boolean);
    const desc   = (p.descricao     || '').toLowerCase();
    const codigo = (p.codigo        || '').toLowerCase();
    const barras = (p.codigo_barras || '').toLowerCase();
    if (barras.includes(q) || codigo.includes(q)) return true;
    return palavras.every(w => desc.includes(w));
  });
});

const totalPaginas    = computed(() => Math.max(1, Math.ceil(produtosFiltrados.value.length / POR_PAGINA)));
const produtosPaginados = computed(() => {
  const ini = (pagina.value - 1) * POR_PAGINA;
  return produtosFiltrados.value.slice(ini, ini + POR_PAGINA);
});

const totais = computed(() => {
  try {
    return produtos.value.reduce((acc, p) => {
      const s = parseFloat(p.saldo || 0) || 0;
      acc.qtd   += s;
      acc.custo += s * (parseFloat(p.preco_custo || 0) || 0);
      acc.venda += s * (parseFloat(p.valor_venda || 0) || 0);
      return acc;
    }, { qtd: 0, custo: 0, venda: 0 });
  } catch (err) {
    console.error("Erro calcular totais:", err);
    return { qtd: 0, custo: 0, venda: 0 };
  }
});

watch(busca,       () => { pagina.value = 1; });
watch(filtroPromo, () => { pagina.value = 1; });

onMounted(async () => { 
  try {
    await carregarCategorias(); 
    await carregar(); 
  } catch (err) {
    console.error("Erro onMounted Produtos:", err);
  }
});

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase
      .from("produtos")
      .select("pk, codigo, codigo_barras, descricao, valor_venda, preco_custo, saldo, ncm, cfop, csosn, unidade_comercial, categoria_pk, foto_url, preco_promo, promo_inicio, promo_fim")
      .order("descricao");
    if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
    const { data, error } = await q;
    if (error) throw error;
    
    const catMap = {};
    categorias.value.forEach(c => { if (c && c.pk) catMap[c.pk] = c.nome; });
    const agora = new Date();
    produtos.value = (data || []).map(p => ({
      ...p,
      categoria_nome: catMap[p.categoria_pk] || "",
      em_promo: !!(p.preco_promo > 0 && p.promo_inicio && p.promo_fim &&
                   agora >= new Date(p.promo_inicio) && agora <= new Date(p.promo_fim)),
    }));
  } catch (e) {
    console.error("Erro carregar produtos:", e.message);
  } finally {
    carregando.value = false;
  }
}

async function carregarCategorias() {
  try {
    let q = supabase.from("categorias").select("pk, nome").order("nome");
    if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
    const { data } = await q;
    categorias.value = data || [];
  } catch (err) {
    console.error("Erro carregar categorias:", err);
  }
}

function fmt(v) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  } catch (err) {
    return "R$ 0,00";
  }
}
</script>

<style scoped>
.prod-wrap    { display: flex; flex-direction: column; gap: 1.5rem; }
.prod-header  { margin-bottom: -1rem; }
.filtros-rapidos { margin-bottom: -1rem; }
.paginacao    { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1rem; }

/* Dropdown Outras Ações */
.dropdown-wrap { position: relative; }
.dropdown-menu {
  position: absolute; top: calc(100% + 8px); right: 0; min-width: 220px;
  background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;
  padding: 8px; z-index: 100; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; gap: 4px;
}
.drop-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 10px 12px; border-radius: 8px; background: none; border: none;
  color: var(--text); font-size: 13.5px; font-weight: 500; cursor: pointer;
  transition: all .15s; text-align: left;
}
.drop-item:hover { background: rgba(99,102,241, 0.1); color: var(--primary); }
.drop-item .material-symbols-outlined { font-size: 20px; color: var(--text2); }
.drop-item:hover .material-symbols-outlined { color: var(--primary); }

/* Animação Drop */
.drop-enter-active, .drop-leave-active { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.95); }

.page-title   { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--text); }
.page-sub     { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }

.header-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }

.search-box  { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; font-size: 20px; color: var(--text2); pointer-events: none; }
.busca-input { padding: .55rem .9rem .55rem 2.4rem; border: 1px solid var(--border); border-radius: 10px; width: 320px; background: var(--bg2); color: var(--text); font-size: .9rem; transition: border-color .2s; outline: none; }
.busca-input:focus { border-color: #6366f1; }

.view-toggle { display: flex; gap: 3px; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 4px; }
.btn-view { background: none; border: none; color: var(--text2); cursor: pointer; padding: 5px 8px; border-radius: 7px; display: flex; align-items: center; transition: all .15s; }
.btn-view.active { background: #6366f1; color: #fff; }
.btn-view:hover:not(.active) { background: var(--bg3); }

.btn-primary { display: flex; align-items: center; gap: 5px; padding: .55rem 1.1rem; background: #6366f1; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .9rem; transition: opacity .15s; white-space: nowrap; }
.btn-primary:hover { opacity: .88; }

.btn-secondary { display: flex; align-items: center; gap: 5px; padding: .55rem 1.1rem; background: var(--bg2); color: var(--text); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .9rem; transition: all .15s; white-space: nowrap; }
.btn-secondary:hover:not(:disabled) { background: var(--bg3); border-color: var(--accent); }
.btn-secondary:disabled { opacity: .5; cursor: default; }

/* Filtros rápidos */
.filtros-rapidos { display: flex; gap: 6px; flex-wrap: wrap; }
.filtro-chip { display: flex; align-items: center; gap: 5px; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid var(--border); background: var(--bg2); color: var(--text2); cursor: pointer; transition: all .15s; white-space: nowrap; }
.filtro-chip .material-symbols-outlined { font-size: 15px; }
.filtro-chip.active { background: rgba(239,68,68,.12); color: #ef4444; border-color: rgba(239,68,68,.35); }
.filtro-chip:not(.active):hover { background: var(--bg3); color: var(--text); }

/* ── Cards ────────────────────────────────── */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; }
.prod-card  { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all .2s ease; position: relative; }
.prod-card:hover { transform: translateY(-4px); border-color: #6366f1; box-shadow: 0 10px 20px rgba(0,0,0,.1); }

.card-foto { height: 165px; background: var(--bg3); position: relative; display: flex; align-items: center; justify-content: center; }
.card-img  { width: 100%; height: 100%; object-fit: cover; }
.card-avatar { width: 60px; height: 60px; border-radius: 50%; background: #6366f1; color: #fff; font-size: 24px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.saldo-badge { position: absolute; top: 10px; right: 10px; padding: 4px 10px; border-radius: 20px; font-size: .75rem; font-weight: 800; color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,.2); }
.saldo-badge.ok    { background: #10b981; }
.saldo-badge.baixo { background: #f59e0b; }
.saldo-badge.zero  { background: #ef4444; }

.card-info { padding: 12px; }
.card-desc { margin: 0; font-size: .9rem; font-weight: 700; color: var(--text); line-height: 1.3; height: 2.6rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-cat  { margin: 4px 0 10px; font-size: .75rem; color: var(--text2); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.card-preco  { font-size: 1.1rem; font-weight: 800; color: #6366f1; }
.card-cod    { font-size: .7rem; color: var(--text2); font-family: monospace; }

/* ── Tabela ───────────────────────────────── */
.tabela-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,.05); }
.tabela { width: 100%; border-collapse: collapse; }
.tabela th { background: var(--bg3); padding: .8rem 1rem; text-align: left; font-size: .75rem; color: var(--text2); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid var(--border); }
.tabela td { padding: .7rem 1rem; border-bottom: 1px solid var(--border); font-size: .9rem; color: var(--text); }
.tabela tr { cursor: pointer; transition: background .1s; }
.tabela tr:hover { background: rgba(99,102,241,.03); }

.table-thumb { width: 42px; height: 42px; border-radius: 9px; overflow: hidden; background: var(--bg3); display: flex; align-items: center; justify-content: center; }
.thumb-img   { width: 100%; height: 100%; object-fit: cover; }
.thumb-avatar { width: 24px; height: 24px; border-radius: 50%; background: #6366f1; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.mono { font-family: monospace; font-weight: 600; color: var(--text2); }
.saldo.ok    { color: #10b981; font-weight: 700; }
.saldo.baixo { color: #f59e0b; font-weight: 700; }
.saldo.zero  { color: #ef4444; font-weight: 700; }

.acoes     { text-align: right !important; }
.btn-edit  { background: none; border: none; color: var(--text2); cursor: pointer; padding: 6px; border-radius: 8px; transition: all .2s; }
.btn-edit:hover { background: rgba(99,102,241,.1); color: #6366f1; }
.resumo { font-size: .82rem; color: var(--text2); padding: .6rem .9rem; text-align: right; }

/* ── Loading / Vazio ──────────────────────── */
.loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 4rem; color: var(--text2); }
.vazio   { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text2); padding: 4rem; }
.spin { width: 26px; height: 26px; border: 3px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Paginação ────────────────────────────── */
.paginacao { display: flex; align-items: center; justify-content: center; gap: .5rem; }
.pg-btn { background: var(--bg2); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 4px 12px; cursor: pointer; font-size: 1rem; line-height: 1; transition: background .15s; }
.pg-btn:hover:not(:disabled) { background: var(--bg3); }
.pg-btn:disabled { opacity: .35; cursor: default; }
.pg-info { font-size: .85rem; color: var(--text2); min-width: 60px; text-align: center; }
.resumo-paginas { display: inline-flex; align-items: center; gap: .35rem; }

/* ── Totalizadores ─────────────────────────── */
.totalizadores {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;
  background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 24px;
  margin-top: 1rem;
  margin-bottom: 3rem;
}
.total-item { display: flex; flex-direction: column; gap: 4px; }
.total-label { font-size: .75rem; color: var(--text2); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.total-val { font-size: 1.25rem; font-weight: 800; color: var(--text); }
.total-val.venda { color: #6366f1; }

.card-glass { box-shadow: 0 8px 32px rgba(0,0,0,.08); }

/* Promoções */
.promo-badge-tag { position: absolute; top: 10px; left: 10px; background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 8px rgba(239,68,68,0.4); }
.card-promo-area { display: flex; flex-direction: column; gap: 0; }
.card-preco-antigo { font-size: 0.75rem; color: var(--text2); text-decoration: line-through; opacity: 0.7; margin-bottom: -2px; }
.card-preco-novo { font-size: 1.1rem; color: #ef4444; font-weight: 800; font-family: var(--mono); }
.table-promo { display: flex; flex-direction: column; line-height: 1.2; }
.table-old-price { font-size: 0.7rem; color: var(--text2); text-decoration: line-through; }
.table-new-price { color: #ef4444; font-weight: 800; }

@media (max-width: 600px) {
  .busca-input { width: 100%; }
  .cards-grid  { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .card-foto   { height: 130px; }
  .totalizadores { grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; }
  .total-val { font-size: 1.1rem; }
}
</style>
