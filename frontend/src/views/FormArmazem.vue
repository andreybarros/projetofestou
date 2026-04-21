<template>
  <div class="form-page">
    <div class="form-header">
      <button class="btn-back" @click="$router.push('/armazens')">
        <span class="material-symbols-outlined">arrow_back</span>
        Armazéns
      </button>
      <div>
        <h1 class="page-title">{{ pk ? 'Editar Armazém' : 'Novo Armazém' }}</h1>
        <p class="page-sub">Configure o armazém e seus endereços internos.</p>
      </div>
    </div>

    <div v-if="carregando" class="loading"><div class="spin"></div> Carregando...</div>

    <form v-else @submit.prevent="salvar" class="form-body">

      <!-- Dados do Armazém -->
      <div class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined" style="color:#f59e0b;font-size:22px">warehouse</span>
          <h3 class="section-title">Dados do Armazém</h3>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Código *</label>
            <input v-model="form.id" type="text" maxlength="10" placeholder="Ex: ARM-01" required autofocus />
          </div>
          <div class="field">
            <label>Descrição / Localização *</label>
            <input v-model="form.localizacao" type="text" placeholder="Ex: Galpão Principal" required />
          </div>
        </div>
      </div>

      <!-- Endereços do Armazém (só exibe se estiver editando) -->
      <div v-if="pk" class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined" style="color:#6366f1;font-size:22px">shelves</span>
          <h3 class="section-title">Endereços Internos</h3>
          <span class="badge-count">{{ enderecos.length }}</span>
        </div>

        <div class="enderecos-lista" v-if="enderecos.length > 0">
          <div v-for="e in enderecos" :key="e.pk" class="endereco-item">
            <div class="end-info">
              <strong class="end-cod">{{ e.codigo }}</strong>
              <span class="end-desc">{{ e.descricao }}</span>
            </div>
            <button type="button" class="btn-del-end" @click="confirmarRemocao(e)" title="Remover">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        <div v-else class="end-vazio">Nenhum endereço cadastrado neste arm azém.</div>

        <!-- Adicionar novo endereço -->
        <div class="end-add-form">
          <input v-model="novoEnd.codigo"  type="text" placeholder="Código (ex: A-03-02)" class="end-input" />
          <input v-model="novoEnd.descricao" type="text" placeholder="Descrição (ex: Corredor A, Prateleira 3, Vão 2)" class="end-input end-input-long" />
          <button type="button" class="btn-add-end" @click="adicionarEndereco" :disabled="!novoEnd.codigo.trim()">
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>

      <!-- Modal de confirmação de remoção -->
      <Teleport to="body">
        <div v-if="endToRemover" style="position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
          <div style="background:var(--bg2,#1e1e2e);border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:380px;padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:42px;height:42px;border-radius:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <span class="material-symbols-outlined" style="color:#ef4444;">delete</span>
              </div>
              <div>
                <p style="margin:0;font-weight:700;font-size:.95rem;color:var(--text,#fff);">Remover Endereço</p>
                <p style="margin:3px 0 0;font-size:.82rem;color:rgba(255,255,255,.5);">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 14px;">
              <p style="margin:0;font-size:.9rem;color:var(--text,#fff);">Deseja remover o endereço <strong style="color:#ef4444;">{{ endToRemover.codigo }}</strong>?</p>
              <p v-if="endToRemover.descricao" style="margin:4px 0 0;font-size:.8rem;color:rgba(255,255,255,.5);">{{ endToRemover.descricao }}</p>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <button type="button" @click="endToRemover = null" style="padding:9px 18px;border-radius:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.8);font-size:.875rem;font-weight:600;cursor:pointer;">Cancelar</button>
              <button type="button" @click="confirmarRemover" style="padding:9px 18px;border-radius:9px;background:#ef4444;border:none;color:#fff;font-size:.875rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">Remover</button>
            </div>
          </div>
        </div>
      </Teleport>

      <div v-if="pk" class="info-new">
        <span class="material-symbols-outlined" style="font-size:16px;color:#6366f1">info</span>
        Os endereços são salvos automaticamente ao clicar em adicionar.
      </div>

      <div v-if="erro" class="erro">{{ erro }}</div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="$router.push('/armazens')">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="salvando">
          <span v-if="salvando" class="spin-xs"></span>
          {{ salvando ? 'Salvando...' : (pk ? 'Salvar Alterações' : 'Criar Armazém') }}
        </button>
      </div>
    </form>

    <div v-if="toast" class="toast">{{ toast }}</div>
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
const toast      = ref('');
const enderecos  = ref([]);
const novoEnd    = ref({ codigo: '', descricao: '' });
const endToRemover = ref(null);

const form = ref({ id: '', localizacao: '' });

function showToast(msg) {
  toast.value = msg;
  setTimeout(() => { toast.value = ''; }, 2500);
}

onMounted(async () => {
  if (!pk) return;
  const { data, error } = await supabase.from('armazem').select('*').eq('pk', pk).single();
  if (error || !data) { erro.value = 'Armazém não encontrado.'; carregando.value = false; return; }
  form.value = { ...data };
  await carregarEnderecos();
  carregando.value = false;
});

async function carregarEnderecos() {
  const { data } = await supabase
    .from('endereco_armazem')
    .select('*')
    .eq('armazem_pk', String(pk))
    .order('codigo');
  enderecos.value = data || [];
}

async function adicionarEndereco() {
  if (!novoEnd.value.codigo.trim()) return;
  erro.value = '';
  
  // Envia armazem_pk como texto para compatibilidade com coluna TEXT no banco
  const payload = {
    armazem_pk: String(pk),
    codigo:     novoEnd.value.codigo.trim().toUpperCase(),
    descricao:  novoEnd.value.descricao.trim() || null,
  };
  
  console.log('Inserindo endereço:', payload);
  const { error } = await supabase.from('endereco_armazem').insert(payload);
  if (error) { 
    console.error('Erro ao inserir:', error);
    erro.value = error.message; 
    return; 
  }
  novoEnd.value = { codigo: '', descricao: '' };
  await carregarEnderecos();
  showToast('Endereço adicionado!');
}

function confirmarRemocao(e) {
  endToRemover.value = e;
}

async function confirmarRemover() {
  const e = endToRemover.value;
  if (!e) return;
  endToRemover.value = null;
  const { error } = await supabase.from('endereco_armazem').delete().eq('pk', Number(e.pk));
  if (error) { erro.value = error.message; return; }
  await carregarEnderecos();
  showToast('Endereço removido.');
}

async function salvar() {
  if (!form.value.id?.trim()) { erro.value = 'Código obrigatório.'; return; }
  if (!form.value.localizacao?.trim()) { erro.value = 'Descrição obrigatória.'; return; }
  salvando.value = true;
  erro.value = '';
  try {
    const payload = {
      filial:      sessaoStore.filial?.codigo || '01',
      id:          form.value.id.trim().toUpperCase(),
      localizacao: form.value.localizacao.trim(),
    };
    let error;
    if (pk) {
      ({ error } = await supabase.from('armazem').update(payload).eq('pk', pk));
    } else {
      ({ error } = await supabase.from('armazem').insert(payload));
    }
    if (error) throw error;
    router.push('/armazens');
  } catch (e) {
    erro.value = e.message;
  } finally {
    salvando.value = false;
  }
}
</script>

<style scoped>
.form-page   { display: flex; flex-direction: column; gap: 1.5rem; max-width: 720px; }
.form-header { display: flex; align-items: center; gap: 1rem; }
.page-title  { margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--text); }
.page-sub    { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }
.btn-back    { display: flex; align-items: center; gap: .4rem; padding: .5rem .9rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; color: var(--text2); font-size: .85rem; cursor: pointer; flex-shrink: 0; transition: all .15s; }
.btn-back:hover { color: var(--text); border-color: #6366f1; }

.loading  { display: flex; align-items: center; gap: 12px; padding: 3rem; color: var(--text2); }
.form-body { display: flex; flex-direction: column; gap: 16px; }
.form-section { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }

.section-header { display: flex; align-items: center; gap: 10px; }
.section-title  { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); flex: 1; }
.badge-count { background: rgba(99,102,241,.1); color: #6366f1; font-size: .72rem; font-weight: 800; padding: 2px 8px; border-radius: 20px; border: 1px solid rgba(99,102,241,.2); }

.form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field      { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: .73rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .3px; }
.field input, .field select { padding: .55rem .8rem; border: 1px solid var(--border); border-radius: 9px; font-size: .9rem; background: var(--bg3); color: var(--text); outline: none; transition: border-color .15s; }
.field input:focus { border-color: #6366f1; }

/* Endereços */
.enderecos-lista { display: flex; flex-direction: column; gap: 6px; }
.endereco-item   { display: flex; align-items: center; justify-content: space-between; background: var(--bg3); border: 1px solid var(--border); border-radius: 9px; padding: 10px 14px; }
.end-info        { display: flex; align-items: center; gap: 14px; flex: 1; }
.end-cod         { font-family: monospace; font-size: .88rem; font-weight: 800; color: #6366f1; min-width: 90px; }
.end-desc        { font-size: .85rem; color: var(--text2); }
.btn-del-end     { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; transition: background .15s; }
.btn-del-end:hover { background: rgba(239,68,68,.1); }

.end-vazio { font-size: .85rem; color: var(--text2); font-style: italic; padding: 8px 0; }

.end-add-form { display: flex; gap: 8px; align-items: center; padding-top: 4px; border-top: 1px solid var(--border); }
.end-input { padding: .5rem .75rem; border: 1px solid var(--border); border-radius: 8px; font-size: .85rem; background: var(--bg3); color: var(--text); outline: none; }
.end-input:focus { border-color: #6366f1; }
.end-input-long { flex: 1; }
.btn-add-end { background: #6366f1; border: none; color: #fff; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity .15s; }
.btn-add-end:disabled { opacity: .4; cursor: not-allowed; }
.btn-add-end:hover:not(:disabled) { opacity: .85; }

.info-new { font-size: .78rem; color: var(--text2); display: flex; align-items: center; gap: 6px; }

.form-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn-primary  { display: flex; align-items: center; gap: 7px; padding: .6rem 1.6rem; background: #6366f1; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .9rem; transition: opacity .15s; }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { opacity: .88; }
.btn-cancel   { padding: .6rem 1.2rem; background: var(--bg2); color: var(--text); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: .9rem; transition: all .15s; }
.btn-cancel:hover { border-color: #6366f1; color: #6366f1; }

.erro  { color: #f87171; font-size: .85rem; background: rgba(220,38,38,.08); padding: .7rem 1rem; border-radius: 9px; border: 1px solid rgba(220,38,38,.2); }
.toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: #10b981; color: #fff; padding: 10px 24px; border-radius: 12px; font-weight: 600; font-size: .9rem; z-index: 9999; }

.spin { width: 22px; height: 22px; border: 3px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.spin-xs { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
