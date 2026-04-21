<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">Clientes</h2>
      <div class="header-actions">
        <input v-model="busca" type="text" placeholder="🔍 Buscar por nome, CPF ou telefone..." class="busca-input" />
        <button @click="$router.push('/clientes/novo')" class="btn-primary">+ Novo Cliente</button>
      </div>
    </div>

    <div v-if="carregando" class="loading">⏳ Carregando...</div>
    <div v-else-if="filtrados.length === 0" class="vazio">Nenhum cliente encontrado.</div>
    <div v-else class="tabela-wrap">
      <table class="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>CPF</th>
            <th>Telefone</th>
            <th>E-mail</th>
            <th>Cidade/UF</th>
            <th>Decorador</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filtrados" :key="c.pk">
            <td>{{ c.nome }}</td>
            <td class="mono">{{ c.cpf || '—' }}</td>
            <td class="mono">{{ c.telefone || '—' }}</td>
            <td>{{ c.email || '—' }}</td>
            <td>{{ [c.cidade, c.uf].filter(Boolean).join('/') || '—' }}</td>
            <td><span :class="['badge', c.decorador ? 'ok' : 'muted']">{{ c.decorador ? 'Sim' : 'Não' }}</span></td>
            <td class="acoes">
              <button @click="$router.push(`/clientes/${c.pk}/editar`)" class="btn-edit" title="Editar">✏️</button>
              <button @click="excluir(c)" class="btn-del" title="Excluir">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="resumo">{{ filtrados.length }} cliente(s)</div>
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
  return lista.value.filter(c =>
    (c.nome || '').toLowerCase().includes(q) ||
    (c.cpf  || '').includes(q) ||
    (c.telefone || '').includes(q)
  );
});

onMounted(carregar);

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase.from('clientes').select('pk, nome, cpf, telefone, email, decorador, cep, logradouro, numero, bairro, cidade, uf').order('nome');
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

function novoRegistro() {
  form.value = { ...VAZIO };
  erroModal.value = '';
  modal.value = true;
}

async function excluir(c) {
  if (!confirm(`Excluir cliente "${c.nome}"?`)) return;
  const { error } = await supabase.from('clientes').delete().eq('pk', c.pk);
  if (error) return alert('Erro: ' + error.message);
  await carregar();
}
</script>

<style scoped>
.page-wrap    { display: flex; flex-direction: column; gap: 1rem; }
.page-header  { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .75rem; }
.page-title   { margin: 0; font-size: 1.3rem; color: var(--text); }
.header-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
.busca-input  { padding: .5rem .9rem; border: 1px solid var(--border); border-radius: 6px; min-width: 600px; font-size: .9rem; background: var(--bg3); color: var(--text); }
.tabela-wrap  { overflow-x: auto; background: var(--bg2); border-radius: 10px; border: 1px solid var(--border); }
.tabela       { width: 100%; border-collapse: collapse; font-size: .87rem; color: var(--text); }
.tabela th    { background: var(--bg3); padding: .6rem .8rem; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border); white-space: nowrap; color: var(--text2); }
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
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-cancel   { padding: .5rem 1.1rem; background: var(--bg3); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
.modal-bg     { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal        { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 1.75rem; width: 660px; max-width: 96vw; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
.modal h3     { margin: 0; font-size: 1.1rem; color: var(--text); }
.form-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.field        { display: flex; flex-direction: column; gap: .3rem; }
.field.full   { grid-column: 1 / -1; }
.field label  { font-size: .82rem; font-weight: 600; color: var(--text2); }
.field input, .field select { padding: .5rem; border: 1px solid var(--border); border-radius: 5px; font-size: .9rem; background: var(--bg3); color: var(--text); }
.check-field  { justify-content: center; }
.check-label  { display: flex; align-items: center; gap: .5rem; font-size: .9rem; font-weight: normal; color: var(--text); cursor: pointer; }
.check-label input { width: auto; }
.modal-btns   { display: flex; justify-content: flex-end; gap: .75rem; }
.erro         { color: #f87171; font-size: .85rem; background: rgba(220,38,38,.1); padding: .5rem; border-radius: 5px; }
</style>
