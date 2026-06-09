<template>
  <div class="cat-wrap">
    <div class="cat-header">
      <div>
        <h1 class="page-title">Categorias</h1>
        <p class="page-sub">{{ filtrados.length }} categoria(s) cadastrada(s)</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input v-model="busca" type="text" placeholder="Buscar categoria..." class="busca-input" />
        </div>
        <button @click="$router.push('/categorias/novo')" class="btn-primary">
          <span class="material-symbols-outlined">add</span>
          Nova Categoria
        </button>
      </div>
    </div>

    <div v-if="carregando" class="loading">
      <div class="spin"></div>
      <span>Carregando categorias...</span>
    </div>

    <div v-else-if="filtrados.length === 0" class="vazio">
      <span class="material-symbols-outlined" style="font-size:3rem;opacity:.3">category</span>
      <p>Nenhuma categoria encontrada.</p>
    </div>

    <template v-else>
      <!-- Desktop: tabela -->
      <div class="tabela-wrap">
        <table class="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th class="hide-sm">Descrição</th>
              <th>Desconto Decorador</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in paginados" :key="c.pk" @click="$router.push(`/categorias/${c.pk}/editar`)">
              <td><strong>{{ c.nome }}</strong></td>
              <td class="hide-sm text2">{{ c.descricao || '—' }}</td>
              <td>
                <span :class="['badge', c.desconto_somente_decorador ? 'dec' : 'muted']">
                  {{ c.desconto_somente_decorador ? '🎈 Sim (10%)' : 'Não' }}
                </span>
              </td>
              <td class="acoes" @click.stop>
                <button @click="$router.push(`/categorias/${c.pk}/editar`)" class="btn-icon" title="Editar">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button @click="confirmarExclusao(c)" class="btn-icon danger" title="Excluir">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="resumo">
          {{ resumoInfo }} de {{ filtrados.length }} categoria(s)
          <span v-if="totalPaginas > 1" class="paginacao-inline">
            &nbsp;·&nbsp;
            <button class="pg-btn" :disabled="pagina === 1" @click="pagina--">‹</button>
            {{ pagina }} / {{ totalPaginas }}
            <button class="pg-btn" :disabled="pagina === totalPaginas" @click="pagina++">›</button>
          </span>
        </div>
      </div>
    </template>
  </div>

  <!-- Modal confirmação exclusão -->
  <Teleport to="body">
    <div v-if="paraExcluir" class="modal-backdrop" @click.self="paraExcluir = null">
      <div class="modal-box">
        <div class="modal-header">
          <span class="material-symbols-outlined" style="color:#ef4444">delete</span>
          <h3>Excluir categoria</h3>
          <button class="modal-close" @click="paraExcluir = null">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p>Tem certeza que deseja excluir <strong>{{ paraExcluir.nome }}</strong>?</p>
          <p class="modal-hint">Os produtos vinculados a esta categoria não serão afetados.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="paraExcluir = null" :disabled="excluindo">Cancelar</button>
          <button class="btn-danger" @click="excluir" :disabled="excluindo">
            <span v-if="excluindo" class="spin sm"></span>
            <span v-else class="material-symbols-outlined" style="font-size:18px">delete</span>
            Excluir
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';

const sessaoStore = useSessaoStore();
const lista       = ref([]);
const carregando  = ref(true);
const busca       = ref('');
const pagina      = ref(1);
const POR_PAGINA  = 20;
const paraExcluir = ref(null);
const excluindo   = ref(false);

const filtrados = computed(() => {
  const q = busca.value.trim().toLowerCase();
  if (!q) return lista.value;
  return lista.value.filter(c => (c.nome || '').toLowerCase().includes(q));
});

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / POR_PAGINA)));
const paginados    = computed(() => {
  const ini = (pagina.value - 1) * POR_PAGINA;
  return filtrados.value.slice(ini, ini + POR_PAGINA);
});
const resumoInfo = computed(() => {
  const ini = (pagina.value - 1) * POR_PAGINA + 1;
  const fim = Math.min(pagina.value * POR_PAGINA, filtrados.value.length);
  return `${ini}–${fim}`;
});

watch(busca, () => { pagina.value = 1; });

onMounted(carregar);

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase
      .from('categorias')
      .select('pk, nome, descricao, desconto_somente_decorador')
      .eq('ativo', true)
      .order('nome');
    if (sessaoStore.filial?.pk) q = q.eq('filial_pk', sessaoStore.filial.pk);
    const { data, error } = await q;
    if (error) throw error;
    lista.value = data || [];
  } catch (e) {
    console.error('[Categorias]', e.message);
  } finally {
    carregando.value = false;
  }
}

function confirmarExclusao(c) {
  paraExcluir.value = c;
}

async function excluir() {
  if (!paraExcluir.value) return;
  excluindo.value = true;
  try {
    const { error } = await supabase
      .from('categorias')
      .update({ ativo: false })
      .eq('pk', paraExcluir.value.pk);
    if (error) throw error;
    lista.value = lista.value.filter(c => c.pk !== paraExcluir.value.pk);
    paraExcluir.value = null;
  } catch (e) {
    console.error('[Categorias/Excluir]', e.message);
  } finally {
    excluindo.value = false;
  }
}
</script>

<style scoped>
.cat-wrap   { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 3rem; }
.cat-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: .75rem; }

.page-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--text); }
.page-sub   { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }

.header-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }

.search-box  { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; font-size: 20px; color: var(--text2); pointer-events: none; }
.busca-input {
  padding: .55rem 1rem .55rem 2.4rem;
  border: 1px solid var(--border); border-radius: 10px;
  width: 280px; background: var(--bg2); color: var(--text);
  font-size: .9rem; outline: none; transition: border-color .2s;
}
.busca-input:focus { border-color: #6366f1; }

.btn-primary {
  display: flex; align-items: center; gap: 5px;
  padding: .55rem 1.1rem; background: #6366f1; color: #fff;
  border: none; border-radius: 10px; cursor: pointer;
  font-weight: 700; font-size: .9rem; transition: opacity .15s; white-space: nowrap;
}
.btn-primary:hover { opacity: .88; }
.btn-primary .material-symbols-outlined { font-size: 18px; }

/* Tabela */
.tabela-wrap {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden;
}
.tabela { width: 100%; border-collapse: collapse; font-size: .9rem; }
.tabela th {
  background: var(--bg3); padding: .75rem 1rem;
  text-align: left; font-size: .75rem; color: var(--text2);
  font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  border-bottom: 2px solid var(--border);
}
.tabela td   { padding: .7rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
.tabela tr   { cursor: pointer; transition: background .1s; }
.tabela tr:hover td { background: var(--bg3); }
.tabela tbody tr:last-child td { border-bottom: none; }
.text2 { color: var(--text2); font-size: .85rem; }

.badge     { padding: .25rem .6rem; border-radius: 20px; font-size: .75rem; font-weight: 600; white-space: nowrap; }
.badge.dec { background: rgba(245,158,11,.15); color: #d97706; border: 1px solid rgba(245,158,11,.3); }
.badge.muted { background: var(--bg3); color: var(--text2); border: 1px solid var(--border); }

.acoes  { white-space: nowrap; text-align: right; }
.btn-icon {
  background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px;
  color: var(--text2); display: inline-flex; align-items: center; transition: all .15s;
}
.btn-icon .material-symbols-outlined { font-size: 18px; }
.btn-icon:hover { background: rgba(99,102,241,.1); color: #6366f1; }
.btn-icon.danger:hover { background: rgba(239,68,68,.1); color: #ef4444; }

.resumo { font-size: .82rem; color: var(--text2); padding: .6rem .9rem; text-align: right; }
.paginacao-inline { display: inline-flex; align-items: center; gap: .35rem; }
.pg-btn {
  background: var(--bg3); border: 1px solid var(--border); color: var(--text);
  border-radius: 6px; padding: 2px 10px; cursor: pointer; font-size: .85rem;
  transition: background .15s;
}
.pg-btn:hover:not(:disabled) { background: var(--border); }
.pg-btn:disabled { opacity: .35; cursor: default; }

/* Loading / Vazio */
.loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 4rem; color: var(--text2); }
.vazio   { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text2); padding: 4rem; }
.spin { width: 26px; height: 26px; border: 3px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.spin.sm { width: 14px; height: 14px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.modal-box {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 18px;
  width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,.25);
  display: flex; flex-direction: column;
}
.modal-header {
  display: flex; align-items: center; gap: 10px;
  padding: 18px 20px 14px; border-bottom: 1px solid var(--border);
}
.modal-header h3 { flex: 1; margin: 0; font-size: 1rem; font-weight: 800; color: var(--text); }
.modal-close {
  background: none; border: none; color: var(--text2); cursor: pointer;
  padding: 4px; border-radius: 6px; display: flex; align-items: center;
}
.modal-close:hover { background: var(--bg3); }
.modal-body  { padding: 18px 20px; font-size: .9rem; color: var(--text); }
.modal-hint  { font-size: .82rem; color: var(--text2); margin-top: 6px; }
.modal-footer {
  padding: 14px 20px 18px; display: flex; justify-content: flex-end;
  gap: 10px; border-top: 1px solid var(--border);
}
.btn-secondary {
  display: flex; align-items: center; gap: 5px; padding: .5rem 1.1rem;
  background: var(--bg3); color: var(--text); border: 1px solid var(--border);
  border-radius: 10px; cursor: pointer; font-weight: 600; font-size: .9rem; transition: all .15s;
}
.btn-secondary:hover:not(:disabled) { background: var(--border); }
.btn-secondary:disabled { opacity: .5; cursor: default; }
.btn-danger {
  display: flex; align-items: center; gap: 5px; padding: .5rem 1.1rem;
  background: #ef4444; color: #fff; border: none; border-radius: 10px;
  cursor: pointer; font-weight: 700; font-size: .9rem; transition: opacity .15s;
}
.btn-danger:hover:not(:disabled) { opacity: .88; }
.btn-danger:disabled { opacity: .5; cursor: default; }

/* Mobile */
@media (max-width: 640px) {
  .cat-header     { flex-direction: column; align-items: stretch; }
  .header-actions { flex-direction: column; align-items: stretch; }
  .search-box     { width: 100%; }
  .busca-input    { width: 100%; }
  .btn-primary    { justify-content: center; }
  .hide-sm        { display: none; }
  .tabela th, .tabela td { padding: .6rem .75rem; }
  .page-title     { font-size: 1.25rem; }
}
</style>
