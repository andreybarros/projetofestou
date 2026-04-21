<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">Vendedores</h2>
      <div class="header-actions">
        <input v-model="busca" type="text" placeholder="🔍 Buscar por nome..." class="busca-input" />
        <button @click="$router.push('/vendedores/novo')" class="btn-primary">+ Novo Vendedor</button>
      </div>
    </div>

    <div v-if="carregando" class="loading">⏳ Carregando...</div>
    <div v-else-if="filtrados.length === 0" class="vazio">Nenhum vendedor encontrado.</div>
    <div v-else class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Ativo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in filtrados" :key="v.pk">
            <td>{{ v.nome }}</td>
            <td class="mono">{{ v.telefone || '—' }}</td>
            <td><span :class="['badge', v.ativo ? 'ok' : 'muted']">{{ v.ativo ? 'Sim' : 'Não' }}</span></td>
            <td class="acoes">
              <button @click="$router.push(`/vendedores/${v.pk}/editar`)" class="btn-edit" title="Editar">✏️</button>
              <button @click="excluir(v)" class="btn-del" title="Excluir">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="resumo">{{ filtrados.length }} vendedor(es)</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';

const sessaoStore = useSessaoStore();
const lista      = ref([]);
const carregando = ref(true);
const busca      = ref('');

const filtrados = computed(() => {
  const q = busca.value.trim().toLowerCase();
  if (!q) return lista.value;
  return lista.value.filter(v => (v.nome || '').toLowerCase().includes(q));
});

onMounted(carregar);

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase.from('vendedores').select('pk, nome, telefone, ativo').order('nome');
    if (sessaoStore.filial?.pk) q = q.eq('filial_pk', sessaoStore.filial.pk);
    const { data, error } = await q;
    if (error) throw error;
    lista.value = data || [];
  } catch (e) {
    console.error(e.message);
  } finally {
    carregando.value = false;
  }
}

async function excluir(v) {
  if (!confirm(`Excluir vendedor "${v.nome}"?`)) return;
  const { error } = await supabase.from('vendedores').delete().eq('pk', v.pk);
  if (error) return alert('Erro: ' + error.message);
  await carregar();
}
</script>

<style scoped>
.page-wrap    { display: flex; flex-direction: column; gap: 1rem; }
.page-header  { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .75rem; }
.page-title   { margin: 0; font-size: 1.3rem; color: var(--text); }
.header-actions { display: flex; gap: .75rem; align-items: center; }
.busca-input  { padding: .5rem .9rem; border: 1px solid var(--border); border-radius: 6px; min-width: 260px; font-size: .9rem; background: var(--bg3); color: var(--text); }
.tabela-wrap  { overflow-x: auto; background: var(--bg2); border-radius: 10px; border: 1px solid var(--border); }
.tabela       { width: 100%; border-collapse: collapse; font-size: .87rem; color: var(--text); }
.tabela th    { background: var(--bg3); padding: .6rem .8rem; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border); color: var(--text2); }
.tabela td    { padding: .55rem .8rem; border-bottom: 1px solid var(--border); color: var(--text); }
.tabela tr:hover td { background: var(--bg3); }
.mono         { font-family: monospace; font-size: .82rem; }
.badge        { padding: .2rem .55rem; border-radius: 10px; font-size: .75rem; font-weight: 600; }
.badge.ok     { background: #d1fae5; color: #065f46; }
.badge.muted  { background: var(--bg3); color: var(--text2); }
.acoes        { white-space: nowrap; display: flex; gap: .25rem; }
.btn-edit, .btn-del { border: none; background: none; cursor: pointer; font-size: .95rem; padding: .15rem .3rem; border-radius: 4px; }
.btn-edit:hover { background: rgba(102,126,234,.15); }
.btn-del:hover  { background: rgba(220,38,38,.15); }
.resumo       { font-size: .82rem; color: var(--text2); padding: .5rem .8rem; text-align: right; }
.loading, .vazio { color: var(--text2); text-align: center; padding: 3rem; }
.btn-primary  { padding: .5rem 1.1rem; background: #667eea; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: .9rem; }
</style>
