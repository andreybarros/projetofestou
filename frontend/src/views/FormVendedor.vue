<template>
  <div class="form-page">
    <div class="form-header">
      <button @click="$router.push('/vendedores')" class="btn-back">← Voltar</button>
      <h2 class="page-title">{{ pk ? 'Editar Vendedor' : 'Novo Vendedor' }}</h2>
    </div>

    <div class="form-card">
      <div class="form-grid">
        <div class="field full">
          <label>Nome *</label>
          <input v-model="form.nome" type="text" placeholder="Nome do vendedor" />
        </div>
        <div class="field">
          <label>Telefone</label>
          <input v-model="form.telefone" type="text" placeholder="(92) 99999-9999" />
        </div>
        <div class="field">
          <label>Ativo</label>
          <select v-model="form.ativo">
            <option :value="true">Sim</option>
            <option :value="false">Não</option>
          </select>
        </div>
      </div>

      <div v-if="erro" class="erro">{{ erro }}</div>

      <div class="form-actions">
        <button @click="$router.push('/vendedores')" class="btn-cancel">Cancelar</button>
        <button @click="salvar" class="btn-primary" :disabled="salvando">
          {{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';

const route        = useRoute();
const router       = useRouter();
const sessaoStore  = useSessaoStore();
const pk           = route.params.pk;
const salvando     = ref(false);
const erro         = ref('');

const form = ref({ nome: '', telefone: '', ativo: true });

onMounted(async () => {
  if (!pk) return;
  const { data, error } = await supabase.from('vendedores').select('*').eq('pk', pk).single();
  if (error) { erro.value = error.message; return; }
  form.value = { nome: data.nome, telefone: data.telefone || '', ativo: data.ativo ?? true };
});

async function salvar() {
  if (!form.value.nome?.trim()) { erro.value = 'Nome obrigatório.'; return; }
  salvando.value = true;
  erro.value = '';
  try {
    const payload = {
      nome:      form.value.nome.trim(),
      telefone:  form.value.telefone?.trim() || null,
      ativo:     form.value.ativo,
      filial_pk: sessaoStore.filial?.pk || null,
    };
    let error;
    if (pk) {
      ({ error } = await supabase.from('vendedores').update(payload).eq('pk', pk));
    } else {
      ({ error } = await supabase.from('vendedores').insert(payload));
    }
    if (error) throw error;
    router.push('/vendedores');
  } catch (e) {
    erro.value = e.message;
  } finally {
    salvando.value = false;
  }
}
</script>

<style scoped>
.form-page   { display: flex; flex-direction: column; gap: 1rem; }
.form-header { display: flex; align-items: center; gap: 1rem; }
.page-title  { margin: 0; font-size: 1.3rem; color: var(--text); }
.btn-back    { padding: .4rem .9rem; background: var(--bg3); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: .9rem; }
.form-card   { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 560px; }
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.field       { display: flex; flex-direction: column; gap: .3rem; }
.field.full  { grid-column: 1 / -1; }
.field label { font-size: .82rem; font-weight: 600; color: var(--text2); }
.field input, .field select { padding: .5rem; border: 1px solid var(--border); border-radius: 5px; font-size: .9rem; background: var(--bg3); color: var(--text); }
.form-actions { display: flex; justify-content: flex-end; gap: .75rem; }
.btn-primary  { padding: .5rem 1.4rem; background: #667eea; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-cancel   { padding: .5rem 1.1rem; background: var(--bg3); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
.erro         { color: #f87171; font-size: .85rem; background: rgba(220,38,38,.1); padding: .5rem; border-radius: 5px; }
</style>
