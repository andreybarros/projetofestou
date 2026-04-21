<template>
  <div class="form-page">
    <div class="form-header">
      <button class="btn-back" @click="$router.push('/clientes')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Clientes
      </button>
      <h2 class="page-title">{{ pk ? 'Editar Cliente' : 'Novo Cliente' }}</h2>
    </div>

    <div v-if="carregando" class="loading">⏳ Carregando...</div>
    <form v-else @submit.prevent="salvar" class="form-card">
      <div class="form-grid">
        <div class="field full"><label>Nome *</label><input v-model="form.nome" type="text" required autofocus /></div>
        <div class="field"><label>CPF</label><input v-model="form.cpf" type="text" placeholder="000.000.000-00" /></div>
        <div class="field"><label>Telefone</label><input v-model="form.telefone" type="text" placeholder="(92) 99999-9999" /></div>
        <div class="field full"><label>E-mail</label><input v-model="form.email" type="email" /></div>

        <div class="field"><label>CEP</label><input v-model="form.cep" type="text" maxlength="9" placeholder="00000-000" /></div>
        <div class="field full"><label>Logradouro</label><input v-model="form.logradouro" type="text" /></div>
        <div class="field"><label>Número</label><input v-model="form.numero" type="text" /></div>
        <div class="field"><label>Bairro</label><input v-model="form.bairro" type="text" /></div>
        <div class="field"><label>Cidade</label><input v-model="form.cidade" type="text" /></div>
        <div class="field"><label>UF</label><input v-model="form.uf" type="text" maxlength="2" placeholder="AM" /></div>

        <div class="field full check-field">
          <label class="check-label">
            <input type="checkbox" v-model="form.decorador" />
            É decorador (recebe desconto especial no PDV)
          </label>
        </div>
      </div>

      <div v-if="erro" class="erro">{{ erro }}</div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="$router.push('/clientes')">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="salvando">
          {{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';

const route       = useRoute();
const router      = useRouter();
const sessaoStore = useSessaoStore();

const pk         = route.params.pk || null;
const carregando = ref(!!pk);
const salvando   = ref(false);
const erro       = ref('');

const form = ref({
  nome: '', cpf: '', telefone: '', email: '',
  cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '',
  decorador: false,
});

onMounted(async () => {
  if (!pk) return;
  const { data, error } = await supabase.from('clientes').select('*').eq('pk', pk).single();
  if (error || !data) { erro.value = 'Cliente não encontrado.'; carregando.value = false; return; }
  form.value = { ...data };
  carregando.value = false;
});

async function salvar() {
  if (!form.value.nome?.trim()) { erro.value = 'Nome obrigatório.'; return; }
  salvando.value = true;
  erro.value = '';
  try {
    const payload = {
      nome:       form.value.nome.trim(),
      cpf:        form.value.cpf?.trim() || null,
      telefone:   form.value.telefone?.trim() || null,
      email:      form.value.email?.trim() || null,
      decorador:  form.value.decorador || false,
      cep:        form.value.cep?.trim() || null,
      logradouro: form.value.logradouro?.trim() || null,
      numero:     form.value.numero?.trim() || null,
      bairro:     form.value.bairro?.trim() || null,
      cidade:     form.value.cidade?.trim() || null,
      uf:         form.value.uf?.trim()?.toUpperCase() || null,
      filial_pk:  sessaoStore.filial?.pk || null,
    };
    let error;
    if (pk) {
      ({ error } = await supabase.from('clientes').update(payload).eq('pk', pk));
    } else {
      ({ error } = await supabase.from('clientes').insert(payload));
    }
    if (error) throw error;
    router.push('/clientes');
  } catch (e) {
    erro.value = e.message;
  } finally {
    salvando.value = false;
  }
}
</script>

<style scoped>
.form-page   { display: flex; flex-direction: column; gap: 1.25rem; max-width: 760px; }
.form-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.page-title  { margin: 0; font-size: 1.3rem; color: var(--text); }
.btn-back    { display: flex; align-items: center; gap: .4rem; padding: .4rem .8rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text2); font-size: .85rem; cursor: pointer; }
.btn-back:hover { color: var(--text); }
.loading     { color: var(--text2); padding: 2rem; }
.form-card   { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: .85rem; }
.field       { display: flex; flex-direction: column; gap: .3rem; }
.field.full  { grid-column: 1 / -1; }
.field label { font-size: .82rem; font-weight: 600; color: var(--text2); }
.field input { padding: .55rem .7rem; border: 1px solid var(--border); border-radius: 6px; font-size: .9rem; background: var(--bg3); color: var(--text); outline: none; transition: border-color .15s; }
.field input:focus { border-color: #667eea; }
.check-field { justify-content: center; }
.check-label { display: flex; align-items: center; gap: .5rem; font-size: .9rem; font-weight: normal; color: var(--text); cursor: pointer; }
.check-label input { width: auto; }
.form-actions { display: flex; justify-content: flex-end; gap: .75rem; padding-top: .5rem; border-top: 1px solid var(--border); }
.btn-primary  { padding: .55rem 1.4rem; background: #667eea; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: .9rem; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-cancel   { padding: .55rem 1.1rem; background: var(--bg3); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
.erro        { color: #f87171; font-size: .85rem; background: rgba(220,38,38,.1); padding: .5rem .75rem; border-radius: 6px; }
</style>
