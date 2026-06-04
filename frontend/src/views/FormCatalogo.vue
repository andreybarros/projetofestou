<template>
  <div class="fc-wrap">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="fc-header">
      <div class="fc-header-top">
        <button class="fc-back" @click="$router.push('/catalogos')" title="Voltar">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="fc-breadcrumbs">
          <span class="fc-bread-link" @click="$router.push('/catalogos')">Catálogos</span>
          <span class="material-symbols-outlined fc-bread-arrow">chevron_right</span>
          <span class="fc-bread-cur">Gerenciar Catálogo</span>
        </div>
      </div>

      <div class="fc-header-main">
        <div class="fc-header-info">
          <h1 class="fc-title">{{ catalogo?.nome || '…' }}</h1>
          <div v-if="catalogo" class="fc-meta">
            <span class="fc-meta-item">
              <span class="material-symbols-outlined">schedule</span>
              Criado em {{ fmtData(catalogo.criado_em) }}
            </span>
            <span class="fc-meta-sep">·</span>
            <span :class="['fc-meta-status', catalogo.ativo ? 'fms--on' : 'fms--off']">
              <span class="fms-dot"></span>
              {{ catalogo.ativo ? 'Publicado' : 'Inativo' }}
            </span>
          </div>
        </div>
        <div class="fc-header-actions">
          <button class="btn-sec" @click="copiarLink">
            <span class="material-symbols-outlined">content_copy</span>
            Copiar Link
          </button>
          <button class="btn-sec" @click="$router.push(`/catalogos/${pk}/pedidos`)">
            <span class="material-symbols-outlined">inbox</span>
            Ver Pedidos
          </button>
          <button
            :class="['btn-toggle', catalogo?.ativo ? 'btn-toggle--off' : 'btn-toggle--on']"
            @click="alternarAtivo"
          >
            <span class="material-symbols-outlined">{{ catalogo?.ativo ? 'visibility_off' : 'visibility' }}</span>
            {{ catalogo?.ativo ? 'Desativar' : 'Ativar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────────────── -->
    <div v-if="carregando" class="state-center"><span class="spin"></span></div>

    <template v-else>

      <!-- ── Produtos no catálogo ───────────────────────────── -->
      <div class="fc-panel">
        <div class="fc-panel-header">
          <div class="fc-panel-title-row">
            <div class="fc-panel-icon">
              <span class="material-symbols-outlined">inventory_2</span>
            </div>
            <div>
              <div class="fc-panel-title">Produtos no Catálogo</div>
              <div class="fc-panel-sub">{{ produtosCatalogo.length }} produto(s) sendo exibido(s) no link público</div>
            </div>
          </div>
          <span class="fc-count-pill">{{ produtosCatalogo.length }}</span>
        </div>

        <div v-if="!produtosCatalogo.length" class="fc-empty">
          <span class="material-symbols-outlined fc-empty-ico">inventory_2</span>
          <div class="fc-empty-txt">Catálogo vazio</div>
          <div class="fc-empty-sub">Adicione produtos usando os filtros abaixo.</div>
        </div>
        <template v-else>
          <div class="fc-prod-grid">
            <div v-for="p in produtosCatPagina" :key="p.pk" class="fc-prod-card">
              <div class="fc-prod-img">
                <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" loading="lazy" decoding="async" />
                <span v-else class="fc-prod-letra">{{ p.descricao?.charAt(0) }}</span>
              </div>
              <div class="fc-prod-info">
                <div class="fc-prod-nome" :title="p.descricao">{{ p.descricao }}</div>
                <div class="fc-prod-sku">{{ p.codigo || '—' }}</div>
              </div>
              <button class="fc-prod-rem" @click="removerProduto(p)" title="Remover">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <!-- Paginação do catálogo -->
          <div v-if="totalPaginasCat > 1" class="fc-cat-pag">
            <span class="fc-cat-pag-info">
              Página {{ paginaCat }} de {{ totalPaginasCat }} · {{ produtosCatalogo.length }} produto(s)
            </span>
            <div class="fc-paginacao">
              <button class="fc-pg-btn" :disabled="paginaCat === 1" @click="paginaCat--">
                <span class="material-symbols-outlined">chevron_left</span>
              </button>
              <template v-for="(pg, idx) in paginasCatVisiveis" :key="pg">
                <span v-if="idx > 0 && pg - paginasCatVisiveis[idx-1] > 1" class="fc-pg-ellipsis">…</span>
                <button :class="['fc-pg-num', paginaCat === pg && 'fc-pg-num--active']" @click="paginaCat = pg">{{ pg }}</button>
              </template>
              <button class="fc-pg-btn" :disabled="paginaCat === totalPaginasCat" @click="paginaCat++">
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- ── Adicionar produtos ─────────────────────────────── -->
      <div class="fc-panel">
        <div class="fc-panel-header">
          <div class="fc-panel-title-row">
            <div class="fc-panel-icon fc-panel-icon--blue">
              <span class="material-symbols-outlined">manage_search</span>
            </div>
            <div>
              <div class="fc-panel-title">Adicionar do Estoque</div>
              <div class="fc-panel-sub">{{ resultados.length }} produto(s) encontrado(s) — {{ resultados.filter(p => !jaAdicionado(p.pk)).length }} ainda não adicionado(s)</div>
            </div>
          </div>
          <!-- Botão Adicionar Todos sempre visível -->
          <button
            v-if="resultados.some(p => !jaAdicionado(p.pk))"
            class="btn-add-all"
            :disabled="adicionandoTodos"
            @click="adicionarTodos"
          >
            <span v-if="adicionandoTodos" class="spin-sm"></span>
            <span v-else class="material-symbols-outlined">playlist_add</span>
            Adicionar Todos ({{ resultados.filter(p => !jaAdicionado(p.pk)).length }})
          </button>
        </div>

        <div class="fc-add-body">

          <!-- Filtros: busca + categorias -->
          <div class="fc-filtros">
            <!-- Busca -->
            <div class="fc-search-bar">
              <span class="material-symbols-outlined fc-search-ico">search</span>
              <input
                v-model="busca"
                type="text"
                class="fc-search-input"
                placeholder="Buscar por nome ou código SKU…"
              />
              <button v-if="busca" class="fc-search-clear" @click="busca = ''">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Chips de categoria -->
            <div class="fc-cats">
              <button
                :class="['fc-cat-chip', categoriaSelecionada === null && 'fc-cat-chip--active']"
                @click="categoriaSelecionada = null"
              >
                <span class="material-symbols-outlined">apps</span>
                Todos
              </button>
              <button
                v-for="cat in categorias"
                :key="cat.pk"
                :class="['fc-cat-chip', categoriaSelecionada === cat.pk && 'fc-cat-chip--active']"
                @click="categoriaSelecionada = cat.pk"
              >
                {{ cat.nome }}
              </button>
            </div>
          </div>

          <!-- Loading produtos -->
          <div v-if="carregandoProdutos" class="state-center" style="padding:30px">
            <span class="spin"></span>
            <span>Carregando produtos…</span>
          </div>

          <!-- Vazio -->
          <div v-else-if="!resultados.length" class="fc-empty">
            <span class="material-symbols-outlined fc-empty-ico">search_off</span>
            <div class="fc-empty-txt">Nenhum produto encontrado</div>
            <div class="fc-empty-sub">Tente outra categoria ou termo de busca.</div>
          </div>

          <!-- Tabela de produtos -->
          <div v-else class="fc-table-wrap">
            <table class="fc-table">
              <thead>
                <tr>
                  <th style="width:46px"></th>
                  <th>Produto</th>
                  <th>Código SKU</th>
                  <th>Categoria</th>
                  <th>Saldo</th>
                  <th style="width:140px">Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in resultadosPagina" :key="p.pk" :class="['fc-tr', jaAdicionado(p.pk) && 'fc-tr--added']">
                  <td>
                    <div class="td-img">
                      <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" loading="lazy" decoding="async" />
                      <span v-else class="td-letra">{{ p.descricao?.charAt(0) }}</span>
                    </div>
                  </td>
                  <td><div class="td-nome">{{ p.descricao }}</div></td>
                  <td><span class="td-sku">{{ p.codigo || '—' }}</span></td>
                  <td><span class="td-cat">{{ p.categorias?.nome || '—' }}</span></td>
                  <td><span class="td-saldo">{{ p.saldo ?? '—' }}</span></td>
                  <td>
                    <button
                      :class="['fc-add-btn', jaAdicionado(p.pk) && 'fc-add-btn--done']"
                      :disabled="jaAdicionado(p.pk)"
                      @click="adicionarProduto(p)"
                    >
                      <span class="material-symbols-outlined">{{ jaAdicionado(p.pk) ? 'check_circle' : 'add' }}</span>
                      {{ jaAdicionado(p.pk) ? 'Adicionado' : 'Adicionar' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="fc-table-footer">
              <span class="fc-footer-info">
                {{ resultados.length }} produto(s) ·
                {{ resultados.filter(p => jaAdicionado(p.pk)).length }} já no catálogo ·
                Página {{ paginaAtual }} de {{ totalPaginas }}
              </span>
              <div v-if="totalPaginas > 1" class="fc-paginacao">
                <button
                  class="fc-pg-btn"
                  :disabled="paginaAtual === 1"
                  @click="paginaAtual--"
                  title="Anterior"
                >
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>

                <template v-for="(pg, idx) in paginasVisiveis" :key="pg">
                  <span
                    v-if="idx > 0 && pg - paginasVisiveis[idx - 1] > 1"
                    class="fc-pg-ellipsis"
                  >…</span>
                  <button
                    :class="['fc-pg-num', paginaAtual === pg && 'fc-pg-num--active']"
                    @click="paginaAtual = pg"
                  >{{ pg }}</button>
                </template>

                <button
                  class="fc-pg-btn"
                  :disabled="paginaAtual === totalPaginas"
                  @click="paginaAtual++"
                  title="Próxima"
                >
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="fc-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';
import api from '../services/api';

const route       = useRoute();
const router      = useRouter();
const sessaoStore = useSessaoStore();
const pk          = route.params.pk;

const catalogo           = ref(null);
const produtosCatalogo   = ref([]);
const carregando         = ref(true);
const carregandoProdutos = ref(false);
const todosProdutos      = ref([]);
const categorias         = ref([]);
const categoriaSelecionada = ref(null);
const busca              = ref('');
const adicionandoTodos   = ref(false);
const toastMsg           = ref('');
const toastTipo          = ref('ok');
const paginaAtual        = ref(1);
const POR_PAGINA         = 20;
const paginaCat          = ref(1);
const POR_PAGINA_CAT     = 24;
let   toastTimer         = null;

// Filtro client-side: categoria + texto
const resultados = computed(() => {
  let lista = todosProdutos.value;
  if (categoriaSelecionada.value !== null) {
    lista = lista.filter(p => p.categoria_pk === categoriaSelecionada.value);
  }
  if (busca.value.trim().length >= 1) {
    const q = busca.value.toLowerCase();
    lista = lista.filter(p =>
      p.descricao?.toLowerCase().includes(q) ||
      p.codigo?.toLowerCase().includes(q)
    );
  }
  return lista;
});

const totalPaginas    = computed(() => Math.max(1, Math.ceil(resultados.value.length / POR_PAGINA)));
const resultadosPagina = computed(() => {
  const inicio = (paginaAtual.value - 1) * POR_PAGINA;
  return resultados.value.slice(inicio, inicio + POR_PAGINA);
});
const paginasVisiveis = computed(() => buildPages(paginaAtual.value, totalPaginas.value));

const totalPaginasCat   = computed(() => Math.max(1, Math.ceil(produtosCatalogo.value.length / POR_PAGINA_CAT)));
const produtosCatPagina = computed(() => {
  const inicio = (paginaCat.value - 1) * POR_PAGINA_CAT;
  return produtosCatalogo.value.slice(inicio, inicio + POR_PAGINA_CAT);
});
const paginasCatVisiveis = computed(() => buildPages(paginaCat.value, totalPaginasCat.value));

function buildPages(atual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, atual]);
  if (atual > 1) pages.add(atual - 1);
  if (atual < total) pages.add(atual + 1);
  return [...pages].sort((a, b) => a - b);
}

// Volta para página 1 ao mudar filtros
watch([busca, categoriaSelecionada], () => { paginaAtual.value = 1; });

onMounted(() => carregar());

async function carregar() {
  carregando.value = true;
  try {
    const [resCat, resProd] = await Promise.all([
      api.get(`/api/catalogos/${pk}`),
      api.get(`/api/catalogos/${pk}/produtos`),
    ]);
    catalogo.value         = resCat.data.data;
    produtosCatalogo.value = resProd.data.data || [];
  } catch (e) {
    showToast('Erro ao carregar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
  await carregarEstoque();
}

async function carregarEstoque() {
  carregandoProdutos.value = true;
  const filialPk = sessaoStore.filial?.pk;
  try {
    // Carrega categorias e produtos em paralelo — sem JOIN para máximo desempenho
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase
        .from('categorias')
        .select('pk, nome')
        .or(`filial_pk.is.null,filial_pk.eq.${filialPk}`)
        .order('nome'),
      supabase
        .from('produtos')
        .select('pk, descricao, codigo, saldo, categoria_pk')
        .eq('filial_pk', filialPk)
        .order('descricao')
        .limit(1000),
    ]);
    categorias.value = cats || [];

    // Monta mapa de categorias para lookup O(1)
    const catMap = Object.fromEntries((cats || []).map(c => [c.pk, c]));
    todosProdutos.value = (prods || []).map(p => ({
      ...p,
      categorias: catMap[p.categoria_pk] || null,
    }));
  } catch (e) {
    showToast('Erro ao carregar estoque.', 'err');
  } finally {
    carregandoProdutos.value = false;
  }
}

function jaAdicionado(produtoPk) {
  return produtosCatalogo.value.some(p => p.pk === produtoPk);
}

async function adicionarProduto(p) {
  if (jaAdicionado(p.pk)) return;
  try {
    await api.post(`/api/catalogos/${pk}/produtos`, { produto_pk: p.pk });
    produtosCatalogo.value.push(p);
    showToast('Produto adicionado!');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro.', 'err');
  }
}

async function adicionarTodos() {
  const novos = resultados.value.filter(p => !jaAdicionado(p.pk));
  if (!novos.length) { showToast('Todos os produtos já foram adicionados.'); return; }
  adicionandoTodos.value = true;

  // Envia em lotes paralelos de 8 para não sobrecarregar o servidor
  const LOTE = 8;
  let count = 0;
  for (let i = 0; i < novos.length; i += LOTE) {
    const lote = novos.slice(i, i + LOTE);
    await Promise.allSettled(
      lote.map(async p => {
        try {
          await api.post(`/api/catalogos/${pk}/produtos`, { produto_pk: p.pk });
          produtosCatalogo.value.push(p);
          count++;
        } catch { /* ignora duplicatas */ }
      })
    );
  }

  adicionandoTodos.value = false;
  showToast(`${count} produto(s) adicionado(s)!`);
}

async function removerProduto(p) {
  try {
    await api.delete(`/api/catalogos/${pk}/produtos/${p.pk}`);
    produtosCatalogo.value = produtosCatalogo.value.filter(x => x.pk !== p.pk);
    showToast('Produto removido.');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro.', 'err');
  }
}

async function alternarAtivo() {
  try {
    await api.put(`/api/catalogos/${pk}`, { ativo: !catalogo.value.ativo });
    catalogo.value.ativo = !catalogo.value.ativo;
    showToast(catalogo.value.ativo ? 'Catálogo ativado!' : 'Catálogo desativado.');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro.', 'err');
  }
}

function copiarLink() {
  if (!catalogo.value?.token) return;
  navigator.clipboard.writeText(`${window.location.origin}/catalogo/${catalogo.value.token}`);
  showToast('Link copiado!');
}

function fmtData(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3000);
}
</script>

<style scoped>
.fc-wrap {
  --g: #00c853;
  --g-dim: rgba(0,200,83,.12);
  --g-soft: rgba(0,200,83,.06);
}
.fc-wrap { display: flex; flex-direction: column; gap: 22px; padding-bottom: 60px; max-width: 1020px; }

/* ── Header ── */
.fc-header        { display: flex; flex-direction: column; gap: 14px; }
.fc-header-top    { display: flex; align-items: center; gap: 12px; }
.fc-back          { width: 38px; height: 38px; background: var(--bg2); border: 1px solid var(--border); border-radius: 50%; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
.fc-back:hover    { background: var(--g-dim); color: var(--g); border-color: rgba(0,200,83,.3); }
.fc-back .material-symbols-outlined { font-size: 18px; }
.fc-breadcrumbs   { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text2); }
.fc-bread-link    { cursor: pointer; transition: color .12s; }
.fc-bread-link:hover { color: var(--g); }
.fc-bread-arrow   { font-size: 16px; opacity: .4; }
.fc-bread-cur     { font-weight: 600; color: var(--text); }

.fc-header-main   { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.fc-header-info   { flex: 1; }
.fc-title         { font-size: 24px; font-weight: 900; color: var(--text); margin: 0 0 6px; letter-spacing: -.4px; }
.fc-meta          { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.fc-meta-item     { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text2); }
.fc-meta-item .material-symbols-outlined { font-size: 14px; }
.fc-meta-sep      { color: var(--border); }
.fc-meta-status   { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.fms-dot          { width: 6px; height: 6px; border-radius: 50%; }
.fms--on          { background: var(--g-dim); color: var(--g); }
.fms--on .fms-dot { background: var(--g); }
.fms--off         { background: rgba(248,113,113,.12); color: #f87171; }
.fms--off .fms-dot{ background: #f87171; }

.fc-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-sec    { display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; }
.btn-sec:hover { border-color: var(--g); color: var(--g); }
.btn-sec .material-symbols-outlined { font-size: 16px; }
.btn-toggle { display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; border: 1px solid transparent; white-space: nowrap; }
.btn-toggle .material-symbols-outlined { font-size: 16px; }
.btn-toggle--on  { background: var(--g); color: #fff; border-color: var(--g); }
.btn-toggle--on:hover  { filter: brightness(1.1); }
.btn-toggle--off { background: rgba(239,68,68,.1); color: #ef4444; border-color: rgba(239,68,68,.3); }
.btn-toggle--off:hover { background: rgba(239,68,68,.18); }

/* ── Panels ── */
.fc-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.fc-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--bg3); gap: 12px; flex-wrap: wrap; }
.fc-panel-title-row { display: flex; align-items: center; gap: 12px; flex: 1; }
.fc-panel-icon { width: 36px; height: 36px; background: var(--g-dim); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--g); flex-shrink: 0; }
.fc-panel-icon .material-symbols-outlined { font-size: 19px; }
.fc-panel-icon--blue { background: rgba(96,158,252,.12); color: #609efc; }
.fc-panel-title { font-size: 14px; font-weight: 700; color: var(--text); }
.fc-panel-sub   { font-size: 11px; color: var(--text2); margin-top: 1px; }
.fc-count-pill  { background: var(--g-dim); color: var(--g); font-size: 12px; font-weight: 800; padding: 3px 12px; border-radius: 20px; white-space: nowrap; }

/* Btn Adicionar Todos */
.btn-add-all { display: flex; align-items: center; gap: 7px; padding: 9px 18px; background: linear-gradient(135deg,#004d20,#00c853); border: none; border-radius: 9px; color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; font-family: inherit; transition: filter .15s; white-space: nowrap; }
.btn-add-all:hover:not(:disabled) { filter: brightness(1.12); }
.btn-add-all:disabled { opacity: .5; cursor: not-allowed; }
.btn-add-all .material-symbols-outlined { font-size: 17px; }

/* ── Products grid (catalog) ── */
.fc-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 20px; }
.fc-empty-ico { font-size: 38px; color: var(--text2); opacity: .2; }
.fc-empty-txt { font-size: 14px; font-weight: 700; color: var(--text2); }
.fc-empty-sub { font-size: 12px; color: var(--text2); opacity: .65; text-align: center; }

.fc-prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1px; background: var(--border); }
.fc-prod-card { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg2); transition: background .12s; }
.fc-prod-card:hover { background: var(--bg3); }
.fc-prod-img  { width: 36px; height: 36px; border-radius: 8px; overflow: hidden; background: var(--bg4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fc-prod-img img { width: 100%; height: 100%; object-fit: cover; }
.fc-prod-letra { font-size: 14px; font-weight: 800; color: var(--text2); }
.fc-prod-info { flex: 1; min-width: 0; }
.fc-prod-nome { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-prod-sku  { font-size: 10px; color: var(--text2); font-family: monospace; margin-top: 1px; }
.fc-prod-rem  { background: none; border: none; cursor: pointer; color: var(--text2); display: flex; padding: 3px; transition: color .12s; border-radius: 6px; flex-shrink: 0; }
.fc-prod-rem:hover { color: #ef4444; background: rgba(239,68,68,.1); }
.fc-prod-rem .material-symbols-outlined { font-size: 15px; }

.fc-cat-pag      { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--border); flex-wrap: wrap; }
.fc-cat-pag-info { font-size: 11px; color: var(--text2); }

/* ── Add body ── */
.fc-add-body { display: flex; flex-direction: column; }
.fc-filtros  { display: flex; flex-direction: column; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border); }

/* Busca */
.fc-search-bar   { position: relative; display: flex; align-items: center; }
.fc-search-ico   { position: absolute; left: 13px; font-size: 19px; color: var(--text2); pointer-events: none; }
.fc-search-input { width: 100%; padding: 10px 40px 10px 44px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; transition: border-color .15s, box-shadow .15s; }
.fc-search-input:focus { border-color: var(--g); box-shadow: 0 0 0 3px var(--g-soft); }
.fc-search-input::placeholder { color: var(--text2); }
.fc-search-clear { position: absolute; right: 12px; background: var(--bg4); border: none; border-radius: 6px; color: var(--text2); cursor: pointer; display: flex; padding: 3px; }
.fc-search-clear:hover { color: var(--text); }
.fc-search-clear .material-symbols-outlined { font-size: 16px; }

/* Categoria chips */
.fc-cats { display: flex; flex-wrap: wrap; gap: 6px; }
.fc-cat-chip { display: flex; align-items: center; gap: 5px; padding: 5px 13px; background: var(--bg3); border: 1px solid var(--border); border-radius: 20px; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; }
.fc-cat-chip:hover { border-color: var(--g); color: var(--g); }
.fc-cat-chip--active { background: var(--g-dim); border-color: rgba(0,200,83,.3); color: var(--g); }
.fc-cat-chip .material-symbols-outlined { font-size: 14px; }

/* ── Table ── */
.fc-table-wrap { overflow-x: auto; }
.fc-table      { width: 100%; border-collapse: collapse; font-size: 13px; }
.fc-table th   { padding: 9px 16px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text2); background: var(--bg3); border-bottom: 1px solid var(--border); white-space: nowrap; }
.fc-table td   { padding: 10px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.fc-table tr:last-child td { border-bottom: none; }
.fc-tr { transition: background .1s; }
.fc-tr:hover { background: var(--bg3); }
.fc-tr--added { opacity: .5; }

.td-img   { width: 36px; height: 36px; border-radius: 8px; overflow: hidden; background: var(--bg4); display: flex; align-items: center; justify-content: center; }
.td-img img { width: 100%; height: 100%; object-fit: cover; }
.td-letra { font-size: 14px; font-weight: 800; color: var(--text2); }
.td-nome  { font-size: 13px; font-weight: 600; color: var(--text); }
.td-sku   { font-size: 11px; font-family: monospace; color: var(--text2); background: var(--bg4); padding: 2px 7px; border-radius: 5px; border: 1px solid var(--border); }
.td-cat   { font-size: 11px; color: var(--text2); background: rgba(96,158,252,.1); border: 1px solid rgba(96,158,252,.2); padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
.td-saldo { font-size: 12px; font-weight: 600; color: var(--text); }

.fc-add-btn { display: flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; }
.fc-add-btn:not(.fc-add-btn--done) { background: var(--g); border: 1px solid var(--g); color: #fff; }
.fc-add-btn:not(.fc-add-btn--done):hover { filter: brightness(1.1); }
.fc-add-btn--done { background: var(--bg3); border: 1px solid var(--border); color: var(--text2); cursor: default; }
.fc-add-btn .material-symbols-outlined { font-size: 15px; }

.fc-table-footer  { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; font-size: 11px; color: var(--text2); background: var(--bg3); border-top: 1px solid var(--border); flex-wrap: wrap; }
.fc-footer-info   { flex: 1; }
.fc-paginacao     { display: flex; align-items: center; gap: 4px; }
.fc-pg-btn        { width: 30px; height: 30px; background: var(--bg2); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .12s; }
.fc-pg-btn:hover:not(:disabled) { border-color: var(--g); color: var(--g); }
.fc-pg-btn:disabled { opacity: .35; cursor: not-allowed; }
.fc-pg-btn .material-symbols-outlined { font-size: 18px; }
.fc-pg-num        { min-width: 30px; height: 30px; padding: 0 6px; background: var(--bg2); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; display: flex; align-items: center; justify-content: center; transition: all .12s; }
.fc-pg-num:hover  { border-color: var(--g); color: var(--g); }
.fc-pg-num--active { background: var(--g); border-color: var(--g); color: #fff; }
.fc-pg-ellipsis   { font-size: 12px; color: var(--text2); padding: 0 2px; }

/* ── Shared ── */
.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 50px 20px; color: var(--text2); font-size: 13px; }
.spin    { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--g); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.fc-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 6px 24px rgba(0,0,0,.35); white-space: nowrap; }
.fc-toast .material-symbols-outlined { font-size: 18px; }
.fc-toast.ok  { background: #064e2a; color: #86efac; border: 1px solid rgba(0,200,83,.2); }
.fc-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

</style>

<style>
[data-theme="light"] .fc-wrap                   { background: #fff; }
[data-theme="light"] .fc-wrap .btn-sec          { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .fc-wrap .btn-toggle--off  { background: rgba(239,68,68,.08); }
[data-theme="light"] .fc-wrap .fc-panel         { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .fc-wrap .fc-panel-header  { background: #fff; border-bottom-color: rgba(0,0,0,.08); }
[data-theme="light"] .fc-wrap .fc-cat-chip      { background: #fff; border-color: rgba(0,0,0,.15); }
[data-theme="light"] .fc-wrap .fc-search-input  { background: #fff; border-color: rgba(0,0,0,.15); }
[data-theme="light"] .fc-wrap .fc-search-clear  { background: rgba(0,0,0,.05); }
[data-theme="light"] .fc-wrap .fc-prod-grid     { background: rgba(0,0,0,.04); }
[data-theme="light"] .fc-wrap .fc-prod-card     { background: #fff; }
[data-theme="light"] .fc-wrap .fc-prod-card:hover { background: #f8fafc; }
[data-theme="light"] .fc-wrap .fc-add-btn--done { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
[data-theme="light"] .fc-wrap .fc-table th      { background: #fff; border-bottom-color: rgba(0,0,0,.08); color: #374151; }
[data-theme="light"] .fc-wrap .fc-table td      { border-bottom-color: rgba(0,0,0,.06); }
[data-theme="light"] .fc-wrap .fc-tr:hover      { background: rgba(99,102,241,.04); }
[data-theme="light"] .fc-wrap .fc-table-footer  { background: #fff; border-top-color: rgba(0,0,0,.08); }
[data-theme="light"] .fc-wrap .td-sku           { background: #f0f2f8; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .fc-wrap .fc-pg-btn        { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .fc-wrap .fc-pg-num        { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .fc-wrap .fc-cat-pag       { border-top-color: rgba(0,0,0,.08); }
[data-theme="light"] .fc-wrap .fc-empty         { background: #fff; }
[data-theme="light"] .fc-wrap .fc-search-hint   { background: #fff; border-color: rgba(0,0,0,.1); }
</style>
