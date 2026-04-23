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
      </div>
    </div>

    <div v-if="carregando" class="loading">
      <div class="spin"></div>
      <span>Carregando produtos...</span>
    </div>

    <div v-else-if="produtosFiltrados.length === 0" class="vazio">
      <span class="material-symbols-outlined" style="font-size:3rem;opacity:.3">inventory_2</span>
      <p>Nenhum produto encontrado.</p>
    </div>

    <!-- Grade de Cards -->
    <div v-else-if="viewMode === 'grid'" class="cards-grid">
      <div v-for="p in produtosPaginados" :key="p.pk" class="prod-card" @click="$router.push(`/produtos/${p.pk}/editar`)">
        <div class="card-foto">
          <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" class="card-img" loading="lazy" width="190" height="165" />
          <div v-else class="card-avatar">{{ p.descricao?.charAt(0)?.toUpperCase() }}</div>
          <span :class="['saldo-badge', p.saldo <= 0 ? 'zero' : p.saldo < 5 ? 'baixo' : 'ok']">
            {{ p.saldo != null ? p.saldo : '∞' }}
          </span>
        </div>
        <div class="card-info">
          <p class="card-desc">{{ p.descricao }}</p>
          <p class="card-cat">{{ p.categoria_nome || '—' }}</p>
          <div class="card-footer">
            <span class="card-preco">{{ fmt(p.valor_venda) }}</span>
            <span v-if="p.codigo" class="card-cod">{{ p.codigo }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Paginação Grade -->
    <div v-if="viewMode === 'grid' && totalPaginas > 1 && !carregando && produtosFiltrados.length" class="paginacao">
      <button class="pg-btn" :disabled="pagina === 1" @click="pagina--">‹</button>
      <span class="pg-info">{{ pagina }} / {{ totalPaginas }}</span>
      <button class="pg-btn" :disabled="pagina === totalPaginas" @click="pagina++">›</button>
    </div>

    <!-- Tabela -->
    <div v-if="viewMode === 'table' && !carregando && produtosFiltrados.length" class="tabela-wrap">
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
          <tr v-for="p in produtosPaginados" :key="p.pk">
            <td>
              <div class="table-thumb">
                <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" class="thumb-img" loading="lazy" width="42" height="42" />
                <div v-else class="thumb-avatar">{{ p.descricao?.charAt(0)?.toUpperCase() }}</div>
              </div>
            </td>
            <td class="mono">{{ p.codigo || "—" }}</td>
            <td>{{ p.descricao }}</td>
            <td>{{ p.categoria_nome || "—" }}</td>
            <td class="mono">{{ fmt(p.valor_venda) }}</td>
            <td :class="['saldo', p.saldo <= 0 ? 'zero' : p.saldo < 5 ? 'baixo' : 'ok']">{{ p.saldo ?? '∞' }}</td>
            <td class="mono">{{ p.ncm || '—' }}</td>
            <td class="acoes">
              <button @click.stop="$router.push(`/produtos/${p.pk}/editar`)" class="btn-edit" title="Editar">
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
const busca       = ref("");
const viewMode    = ref("grid");
const pagina      = ref(1);
const POR_PAGINA  = 48;

const produtosFiltrados = computed(() => {
  const q = busca.value.trim().toLowerCase();
  if (!q) return produtos.value;
  const palavras = q.split(/\s+/).filter(Boolean);
  return produtos.value.filter(p => {
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

watch(busca, () => { pagina.value = 1; });

onMounted(async () => { await carregarCategorias(); await carregar(); });

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase
      .from("produtos")
      .select("pk, codigo, codigo_barras, descricao, valor_venda, preco_custo, saldo, ncm, cfop, csosn, unidade_comercial, categoria_pk, foto_url")
      .order("descricao");
    if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
    const { data, error } = await q;
    if (error) throw error;
    const catMap = {};
    categorias.value.forEach(c => { catMap[c.pk] = c.nome; });
    produtos.value = (data || []).map(p => ({ ...p, categoria_nome: catMap[p.categoria_pk] || "" }));
  } catch (e) {
    console.error(e.message);
  } finally {
    carregando.value = false;
  }
}

async function carregarCategorias() {
  let q = supabase.from("categorias").select("pk, nome").order("nome");
  if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
  const { data } = await q;
  categorias.value = data || [];
}

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
</script>

<style scoped>
.prod-wrap    { display: flex; flex-direction: column; gap: 1.5rem; }
.prod-header  { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
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

/* ── Cards ────────────────────────────────── */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; }

.prod-card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden; cursor: pointer;
  transition: transform .2s, box-shadow .2s, border-color .2s;
  display: flex; flex-direction: column;
}
.prod-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 36px rgba(0,0,0,.18);
  border-color: rgba(99,102,241,.4);
}

.card-foto   { position: relative; height: 165px; background: var(--bg3); overflow: hidden; }
.card-img    { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.prod-card:hover .card-img { transform: scale(1.04); }
.card-avatar { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; font-weight: 900; color: var(--text2); opacity: .25; }

.saldo-badge { position: absolute; top: 8px; right: 8px; padding: 2px 9px; border-radius: 20px; font-size: .68rem; font-weight: 800; border: 1px solid transparent; }
.saldo-badge.ok    { background: rgba(74,222,128,.12); color: #4ade80; border-color: rgba(74,222,128,.25); }
.saldo-badge.baixo { background: rgba(251,146,60,.12); color: #fb923c; border-color: rgba(251,146,60,.25); }
.saldo-badge.zero  { background: rgba(248,113,113,.12); color: #f87171; border-color: rgba(248,113,113,.25); }

.card-info   { padding: 12px 14px; display: flex; flex-direction: column; gap: 3px; flex: 1; }
.card-desc   { margin: 0; font-size: .88rem; font-weight: 700; color: var(--text); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-cat    { margin: 0; font-size: .73rem; color: var(--text2); }
.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 9px; border-top: 1px solid var(--border); }
.card-preco  { font-size: .95rem; font-weight: 800; color: #6366f1; }
.card-cod    { font-size: .7rem; color: var(--text2); font-family: monospace; background: var(--bg3); padding: 2px 7px; border-radius: 4px; }

/* ── Tabela ───────────────────────────────── */
.tabela-wrap  { overflow-x: auto; background: var(--bg2); border-radius: 14px; border: 1px solid var(--border); }
.tabela       { width: 100%; border-collapse: collapse; font-size: .87rem; color: var(--text); }
.tabela th    { background: var(--bg3); padding: .65rem .9rem; text-align: left; font-weight: 700; font-size: .68rem; text-transform: uppercase; letter-spacing: .4px; border-bottom: 2px solid var(--border); color: var(--text2); }
.tabela td    { padding: .55rem .9rem; border-bottom: 1px solid var(--border); }
.tabela tr:last-child td { border-bottom: none; }
.tabela tr:hover td { background: var(--bg3); }

.table-thumb  { width: 42px; height: 42px; border-radius: 9px; overflow: hidden; background: var(--bg3); flex-shrink: 0; }
.thumb-img    { width: 100%; height: 100%; object-fit: cover; }
.thumb-avatar { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; color: var(--text2); opacity: .4; }

.mono  { font-family: monospace; font-size: .82rem; }
.saldo { font-weight: 700; }
.saldo.ok    { color: #4ade80; }
.saldo.baixo { color: #fb923c; }
.saldo.zero  { color: #f87171; }
.acoes        { white-space: nowrap; }
.btn-edit { border: none; background: none; cursor: pointer; color: var(--text2); padding: 6px; border-radius: 7px; display: flex; transition: all .15s; }
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

@media (max-width: 600px) {
  .busca-input { width: 100%; }
  .cards-grid  { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .card-foto   { height: 130px; }
}
</style>
