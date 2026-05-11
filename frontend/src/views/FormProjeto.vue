<template>
  <div class="form-page">

    <!-- Header -->
    <div class="form-header">
      <button class="btn-back" @click="$router.push('/projetos')">
        <span class="material-symbols-outlined">arrow_back</span>
        Projetos
      </button>
      <div>
        <h1 class="page-title">{{ pk ? 'Editar Projeto' : 'Novo Projeto' }}</h1>
        <p class="page-sub">{{ pk ? 'Atualize as informações do projeto' : 'Cadastre um novo projeto de decoração' }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="carregando" class="fp-loading">
      <div class="spin"></div>
      <span>Carregando...</span>
    </div>

    <form v-else @submit.prevent="salvar" class="form-body">

      <!-- ── Seção: Dados Principais ─────────────────────── -->
      <div class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon" style="color:#a855f7">design_services</span>
          <h3 class="section-title">Dados do Projeto</h3>
        </div>
        <div class="form-grid">

          <div class="field full">
            <label>Título do Projeto *</label>
            <input v-model="form.titulo" type="text" placeholder="Ex: Decoração Casamento João e Maria" required autofocus />
          </div>

          <div class="field full">
            <label>Cliente</label>
            <div class="autocomplete-wrap">
              <input
                v-model="clienteBusca"
                type="text"
                placeholder="Digite para buscar..."
                @input="buscarClientes"
                @focus="buscarClientes"
                autocomplete="off"
              />
              <div v-if="clienteOpcoes.length > 0" class="autocomplete-list">
                <button
                  v-for="c in clienteOpcoes"
                  :key="c.pk"
                  type="button"
                  class="autocomplete-item"
                  @mousedown.prevent="selecionarCliente(c)"
                >
                  <span class="ac-nome">{{ c.nome }}</span>
                  <span v-if="c.cpf" class="ac-cpf">{{ c.cpf }}</span>
                </button>
              </div>
            </div>
            <div v-if="avisoEndereco" class="field-aviso">
              <span class="material-symbols-outlined" style="font-size:14px">warning</span>
              Cliente sem endereço completo. Para emitir NF-e, complete o cadastro.
              <router-link :to="`/clientes/${form.cliente_pk}/editar`" target="_blank" class="aviso-link">Completar agora</router-link>
            </div>
          </div>

          <div class="field">
            <label>Data da Decoração</label>
            <input v-model="form.data_decoracao" type="date" />
          </div>

          <div class="field">
            <label>Status</label>
            <select v-model="form.status">
              <option value="a_montar">À montar</option>
              <option value="montado">Montado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div class="field">
            <label>Valor Total (R$)</label>
            <input
              :value="valorDisplay"
              @input="onValorInput"
              type="text"
              inputmode="numeric"
              placeholder="0,00"
            />
          </div>

          <div class="field">
            <label>Custo (R$)</label>
            <input
              :value="custoDisplay"
              @input="onCustoInput"
              type="text"
              inputmode="numeric"
              placeholder="0,00"
            />
          </div>

          <div class="field">
            <label>Forma de Pagamento</label>
            <select v-model="form.forma_pagamento">
              <option value="">Não definida</option>
              <option v-for="f in formasPagamento" :key="f.pk" :value="f.forma">
                {{ f.icone }} {{ f.label }}
              </option>
            </select>
          </div>

        </div>
      </div>

      <!-- ── Seção: Informações Fiscais ─────────────────── -->
      <div class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon" style="color:#10b981">receipt_long</span>
          <h3 class="section-title">Informações Fiscais (NF-e)</h3>
        </div>
        <p class="section-sub">Necessário para emissão de Nota Fiscal modelo 55 pela Focus NFe.</p>
        <div class="form-grid">
          <div v-if="cnpjsFilial.length >= 1" class="field full">
            <label>CNPJ Emitente</label>
            <select v-model="form.cnpj_pk">
              <option :value="null">— Selecione o CNPJ emitente —</option>
              <option v-for="c in cnpjsFilial" :key="c.pk" :value="c.pk">
                {{ c.razao_social || c.nome_fantasia || 'Sem razão social' }} — {{ c.cnpj }}
              </option>
            </select>
            <small class="field-hint">Selecione a razão social / CNPJ que será usado para emitir a NF-e deste projeto.</small>
          </div>
          <div class="field">
            <label>CFOP</label>
            <input v-model="form.cfop" type="text" placeholder="5102" maxlength="10" />
            <small class="field-hint">Código Fiscal de Operações. Ex: 5102 (venda), 5933 (serviços)</small>
          </div>
          <div class="field">
            <label>NCM</label>
            <input v-model="form.ncm" type="text" placeholder="00000000" maxlength="15" />
            <small class="field-hint">Nomenclatura Comum do Mercosul (8 dígitos)</small>
          </div>
        </div>
      </div>

      <!-- ── Seção: Observações ──────────────────────────── -->
      <div class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon" style="color:#f59e0b">notes</span>
          <h3 class="section-title">Observações</h3>
        </div>
        <div class="form-grid">
          <div class="field full">
            <label>Observação</label>
            <textarea v-model="form.observacao" rows="4" placeholder="Detalhes, instruções ou anotações sobre o projeto..."></textarea>
          </div>
        </div>
      </div>

      <!-- Footer fixo -->
      <div class="form-footer">
        <button type="button" class="btn-ghost" @click="$router.push('/projetos')" :disabled="salvando">
          Cancelar
        </button>
        <button type="submit" class="btn-primary" :disabled="salvando || !form.titulo">
          <span v-if="salvando" class="spin-xs"></span>
          <span class="material-symbols-outlined" style="font-size:16px">{{ pk ? 'save' : 'add_circle' }}</span>
          {{ pk ? 'Salvar Alterações' : 'Criar Projeto' }}
        </button>
      </div>

    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';
import apiClient from '../services/api';

const route     = useRoute();
const router    = useRouter();
const sessao    = useSessaoStore();
const showToast = inject('showToast');

const pk = computed(() => route.params.pk ? Number(route.params.pk) : null);

const carregando      = ref(true);
const salvando        = ref(false);
const formasPagamento = ref([]);
const cnpjsFilial     = ref([]);

const form = ref({
  titulo: '', cliente_pk: null, valor: 0, custo: 0, data_decoracao: '',
  cfop: '5102', ncm: '', forma_pagamento: '',
  status: 'a_montar', observacao: '', cnpj_pk: null,
});

const valorDisplay       = ref('');
const custoDisplay       = ref('');
const clienteBusca       = ref('');
const clienteOpcoes      = ref([]);
const clienteSelecionado = ref(null);
let buscarTimer = null;

const avisoEndereco = computed(() => {
  const c = clienteSelecionado.value;
  if (!c) return false;
  return !c.logradouro || !c.cidade || !c.uf;
});

function onValorInput(e) {
  const num = parseInt(e.target.value.replace(/\D/g, '') || '0', 10) / 100;
  form.value.valor = num;
  valorDisplay.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function onCustoInput(e) {
  const num = parseInt(e.target.value.replace(/\D/g, '') || '0', 10) / 100;
  form.value.custo = num;
  custoDisplay.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

async function buscarClientes() {
  clearTimeout(buscarTimer);
  buscarTimer = setTimeout(async () => {
    const q = clienteBusca.value.trim();
    if (!q) { clienteOpcoes.value = []; return; }
    const { data } = await supabase
      .from('clientes')
      .select('pk, nome, cpf, logradouro, bairro, cep, cidade, uf')
      .or(`filial_pk.is.null,filial_pk.eq.${sessao.filial.pk}`)
      .ilike('nome', `%${q}%`)
      .limit(8);
    clienteOpcoes.value = data || [];
  }, 250);
}

function selecionarCliente(c) {
  form.value.cliente_pk    = c.pk;
  clienteBusca.value       = c.nome;
  clienteSelecionado.value = c;
  clienteOpcoes.value      = [];
}

async function carregarFormasPagamento() {
  const { data } = await supabase
    .from('formas_pagamento')
    .select('pk, forma, label, icone')
    .eq('filial_pk', sessao.filial.pk)
    .eq('ativo', true)
    .order('ordem');
  formasPagamento.value = data || [];
}

async function carregarCnpjsFilial() {
  const { data } = await supabase
    .from('filial_cnpjs')
    .select('pk, cnpj, razao_social, nome_fantasia')
    .eq('filial_pk', sessao.filial.pk)
    .eq('ativo', true)
    .order('pk');
  cnpjsFilial.value = data || [];
}

async function carregarProjeto() {
  if (!pk.value) return;
  try {
    const { data } = await apiClient.get(`/api/projetos/${pk.value}`);
    const p = data.data;
    form.value = {
      titulo:          p.titulo,
      cliente_pk:      p.cliente_pk,
      valor:           parseFloat(p.valor || 0),
      custo:           parseFloat(p.custo || 0),
      data_decoracao:  p.data_decoracao || '',
      cfop:            p.cfop || '5102',
      ncm:             p.ncm || '',
      forma_pagamento: p.forma_pagamento || '',
      status:          p.status || 'a_montar',
      observacao:      p.observacao || '',
      cnpj_pk:         p.cnpj_pk || null,
    };
    const num = parseFloat(p.valor || 0);
    valorDisplay.value       = num.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const custo = parseFloat(p.custo || 0);
    custoDisplay.value       = custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    clienteBusca.value       = p.clientes?.nome || '';
    clienteSelecionado.value = p.clientes || null;
  } catch (e) {
    showToast('Erro ao carregar projeto: ' + (e.response?.data?.erro || e.message), 'error');
    router.push('/projetos');
  }
}

onMounted(async () => {
  await Promise.all([carregarFormasPagamento(), carregarCnpjsFilial(), carregarProjeto()]);
  carregando.value = false;
});

async function salvar() {
  if (!form.value.titulo) return;
  salvando.value = true;
  try {
    const payload = {
      filial_pk:       sessao.filial.pk,
      titulo:          form.value.titulo,
      cliente_pk:      form.value.cliente_pk || null,
      valor:           form.value.valor,
      custo:           form.value.custo,
      data_decoracao:  form.value.data_decoracao || null,
      cfop:            form.value.cfop || '5102',
      ncm:             form.value.ncm || null,
      forma_pagamento: form.value.forma_pagamento || null,
      status:          form.value.status,
      observacao:      form.value.observacao || null,
      cnpj_pk:         form.value.cnpj_pk || null,
    };

    if (pk.value) {
      await apiClient.put(`/api/projetos/${pk.value}`, payload);
      showToast('Projeto atualizado com sucesso.');
    } else {
      await apiClient.post('/api/projetos', payload);
      showToast('Projeto criado com sucesso.');
    }

    router.push('/projetos');
  } catch (e) {
    showToast(e.response?.data?.erro || e.message, 'error');
  } finally {
    salvando.value = false;
  }
}
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────── */
.form-page { display: flex; flex-direction: column; gap: 0; min-height: 100%; }
.form-header {
  display: flex; align-items: center; gap: 16px;
  padding: 0 0 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px;
}
.page-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin: 0; }
.page-sub   { font-size: 0.875rem; color: var(--text2); margin: 2px 0 0; }

.btn-back {
  display: flex; align-items: center; gap: 6px; padding: 8px 14px;
  background: var(--bg2); border: 1.5px solid var(--border); border-radius: 10px;
  color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all .15s; white-space: nowrap; flex-shrink: 0;
}
.btn-back:hover { background: var(--bg3); color: var(--text); }
.btn-back .material-symbols-outlined { font-size: 18px; }

/* ── Loading ────────────────────────────────────────────────── */
.fp-loading {
  display: flex; align-items: center; gap: 12px;
  justify-content: center; padding: 80px 0; color: var(--text2);
}

/* ── Form body ──────────────────────────────────────────────── */
.form-body { display: flex; flex-direction: column; gap: 20px; padding-bottom: 100px; }

.form-section {
  background: var(--bg2); border: 1.5px solid var(--border);
  border-radius: 16px; overflow: hidden;
}
.section-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; background: var(--bg3);
  border-bottom: 1.5px solid var(--border);
}
.section-icon { font-size: 20px; }
.section-title { font-size: 0.95rem; font-weight: 800; color: var(--text); margin: 0; }
.section-sub { font-size: 12px; color: var(--text2); padding: 10px 20px 0; margin: 0; }

.form-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 1.2rem; padding: 20px;
}
.field.full { grid-column: 1 / -1; }

.field label {
  display: block; font-size: 0.72rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: .7px;
  color: var(--text2); margin-bottom: 6px;
}
.field input, .field select, .field textarea {
  width: 100%; padding: 0.75rem 1rem; font-size: 13.5px;
  color: var(--text); background: var(--bg3); border: 1.5px solid var(--border);
  border-radius: 10px; outline: none; font-family: inherit; resize: vertical;
  transition: border-color .13s, background .13s;
}
.field input:focus, .field select:focus, .field textarea:focus {
  border-color: #6366f1; background: var(--bg2);
}
.field-hint {
  display: block; font-size: 11px; color: var(--text2); margin-top: 5px;
}

/* ── Aviso endereço ─────────────────────────────────────────── */
.field-aviso {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-top: 6px; padding: 8px 12px; font-size: 12px; color: #b45309;
  background: rgba(234,179,8,.1); border: 1px solid rgba(234,179,8,.3);
  border-radius: 8px; line-height: 1.4;
}
.aviso-link { color: #3b82f6; text-decoration: underline; margin-left: auto; white-space: nowrap; font-size: 11.5px; }

/* ── Autocomplete ───────────────────────────────────────────── */
.autocomplete-wrap { position: relative; }
.autocomplete-list {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg2); border: 1.5px solid var(--border); border-radius: 10px;
  z-index: 300; max-height: 200px; overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,.3);
}
.autocomplete-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 14px; width: 100%; background: none; border: none;
  color: var(--text); font-size: 13px; cursor: pointer; text-align: left; gap: 8px;
  transition: background .12s;
}
.autocomplete-item:hover { background: var(--bg3); }
.ac-nome { font-weight: 600; }
.ac-cpf  { font-size: 11px; color: var(--text2); white-space: nowrap; }

/* ── Footer fixo ────────────────────────────────────────────── */
.form-footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 24px; background: var(--bg2);
  border-top: 1.5px solid var(--border); z-index: 50;
}
@media(min-width: 1024px) {
  .form-footer { left: 256px; }
}

.btn-primary {
  background: #6366f1; color: #fff; border: none;
  padding: 0.8rem 1.8rem; border-radius: 12px; font-weight: 700;
  cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 8px;
  transition: opacity .15s;
}
.btn-primary:hover    { opacity: .88; }
.btn-primary:disabled { opacity: .4; cursor: not-allowed; }

.btn-ghost {
  background: var(--bg3); border: 1.5px solid var(--border); color: var(--text);
  padding: 0.8rem 1.6rem; border-radius: 12px; font-weight: 700;
  cursor: pointer; font-size: 13.5px; transition: background .13s;
}
.btn-ghost:hover    { background: var(--bg4); }
.btn-ghost:disabled { opacity: .4; cursor: not-allowed; }

/* ── Spinners ───────────────────────────────────────────────── */
.spin {
  width: 22px; height: 22px;
  border: 3px solid var(--border); border-top-color: var(--primary);
  border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0;
}
.spin-xs {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Light mode ─────────────────────────────────────────────── */
[data-theme="light"] .field input,
[data-theme="light"] .field select,
[data-theme="light"] .field textarea { background: #fff; }
[data-theme="light"] .field input:focus,
[data-theme="light"] .field select:focus,
[data-theme="light"] .field textarea:focus { background: #fafafa; }

/* ── Responsivo ─────────────────────────────────────────────── */
@media(max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .field.full { grid-column: 1; }
  .form-footer { padding: 12px 16px; padding-bottom: 76px; }
}
</style>
