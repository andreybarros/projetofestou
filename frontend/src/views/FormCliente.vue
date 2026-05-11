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
    <div v-else class="form-layout">

      <!-- ── Formulário ── -->
      <form @submit.prevent="salvar" @keydown.enter.prevent="onEnterForm" class="form-card" ref="formRef">
        <div class="form-grid">
          <div class="field">
            <label>Código</label>
            <input :value="form.codigo || '—'" type="text" readonly style="opacity:.6;cursor:not-allowed;font-family:monospace" />
          </div>
          <div class="field"><label>Nome *</label><input v-model="form.nome" type="text" required autofocus /></div>
          <div class="field"><label>CPF / CNPJ</label><input v-model="form.cpf" type="text" placeholder="CPF ou CNPJ" maxlength="18" @input="maskDocumento" /></div>
          <div class="field"><label>Telefone</label><input v-model="form.telefone" type="text" placeholder="(92) 99999-9999" /></div>
          <div class="field full"><label>E-mail</label><input v-model="form.email" type="email" /></div>

          <div class="field">
            <label>CEP</label>
            <div class="cep-wrap">
              <input v-model="form.cep" type="text" maxlength="9" placeholder="00000-000" @input="onCepInput" @blur="buscarCep" data-cep />
              <span v-if="buscandoCep" class="cep-spinner"></span>
            </div>
          </div>
          <div class="field full"><label>Endereço</label><input v-model="form.logradouro" type="text" /></div>
          <div class="field"><label>Número</label><input v-model="form.numero" type="text" @change="atualizarMapa" /></div>
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

      <!-- ── Painel direito ── -->
      <div class="right-panel">

        <!-- Mapa -->
        <div class="map-card">
          <div class="map-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Localização
          </div>
          <div class="map-wrap">
            <iframe
              v-if="mapUrl"
              :src="mapUrl"
              class="map-iframe"
              frameborder="0"
              allowfullscreen
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
            <div v-else class="map-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Informe o CEP para<br>visualizar o mapa</span>
            </div>
          </div>
        </div>

        <!-- Contas a receber -->
        <div class="cr-card">
          <div class="cr-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Contas a Receber
          </div>

          <div v-if="!pk" class="cr-empty">Salve o cliente para ver as contas.</div>
          <div v-else-if="crCarregando" class="cr-empty">Carregando...</div>
          <div v-else-if="!contasAReceber.length" class="cr-empty">Nenhuma conta pendente.</div>
          <div v-else class="cr-list">
            <div
              v-for="c in contasAReceber"
              :key="c.pk"
              :class="['cr-item', c.vencida ? 'cr-vencida' : 'cr-ok']"
            >
              <div class="cr-item-top">
                <span class="cr-codigo">#{{ c.pk }}</span>
                <span :class="['cr-status-badge', c.vencida ? 'badge-vencida' : 'badge-ok']">
                  {{ c.vencida ? 'Vencida' : 'A vencer' }}
                </span>
              </div>
              <div class="cr-item-bottom">
                <span class="cr-valor">R$ {{ fmt(c.total) }}</span>
                <span class="cr-venc">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {{ fmtData(c.data_vencimento_crediario) }}
                </span>
              </div>
            </div>

            <div class="cr-total">
              <span>Total pendente</span>
              <span class="cr-total-val">R$ {{ fmt(contasAReceber.reduce((s,c) => s + Number(c.total||0), 0)) }}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
  <div style="margin-bottom: 40px;"></div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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
const buscandoCep      = ref(false);
const formRef          = ref(null);
const crCarregando     = ref(false);
const contasAReceber   = ref([]);

function fmt(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
function fmtData(d) { return d ? d.split('-').reverse().join('/') : '—'; }

function getInputs() {
  if (!formRef.value) return [];
  return Array.from(formRef.value.querySelectorAll('input:not([type="checkbox"])'));
}

async function onEnterForm(e) {
  const inputs = getInputs();
  const idx    = inputs.indexOf(e.target);
  if (idx === -1) return;

  const isCep = e.target.hasAttribute('data-cep');
  if (isCep) {
    await buscarCep();
  }

  const next = inputs[idx + 1];
  if (next) next.focus();
}

const form = ref({
  codigo: '', nome: '', cpf: '', telefone: '', email: '',
  cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '',
  decorador: false,
});

const mapUrl = ref('');

function buildMapUrl() {
  const partes = [form.value.logradouro, form.value.numero, form.value.bairro, form.value.cidade, form.value.uf].filter(Boolean);
  if (!partes.length && !form.value.cep) return '';
  const q = encodeURIComponent(partes.length >= 2 ? partes.join(', ') : form.value.cep);
  return `https://maps.google.com/maps?q=${q}&output=embed&hl=pt-BR`;
}

function atualizarMapa() {
  mapUrl.value = buildMapUrl();
}

function onCepInput(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  form.value.cep = v;
}

async function buscarCep() {
  const cep = form.value.cep?.replace(/\D/g, '');
  if (cep?.length !== 8) return;
  buscandoCep.value = true;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (d.erro) return;
    form.value.logradouro = d.logradouro || form.value.logradouro;
    form.value.bairro     = d.bairro     || form.value.bairro;
    form.value.cidade     = d.localidade || form.value.cidade;
    form.value.uf         = d.uf         || form.value.uf;
    atualizarMapa();
  } catch { /* silencioso */ } finally {
    buscandoCep.value = false;
  }
}

async function carregarContas() {
  if (!pk) return;
  crCarregando.value = true;
  const hoje = new Date().toLocaleDateString('en-CA');
  const { data } = await supabase
    .from('vendas')
    .select('pk, total, data_vencimento_crediario, status_crediario')
    .eq('cliente_pk', pk)
    .eq('ativo', true)
    .eq('status_crediario', 'pendente')
    .order('data_vencimento_crediario', { ascending: true });
  contasAReceber.value = (data || []).map(c => ({
    ...c,
    vencida: c.data_vencimento_crediario && c.data_vencimento_crediario < hoje,
  }));
  crCarregando.value = false;
}

onMounted(async () => {
  const filialPk = sessaoStore.filial?.pk;
  if (!pk) {
    if (filialPk) {
      const { data: cod } = await supabase.rpc('proximo_codigo_cliente', { p_filial_pk: filialPk });
      form.value.codigo = cod || '0001';
    }
    return;
  }
  const { data, error } = await supabase.from('clientes').select('*').eq('pk', pk).single();
  if (error || !data) { erro.value = 'Cliente não encontrado.'; carregando.value = false; return; }
  form.value = { ...data };
  carregando.value = false;
  atualizarMapa();
  carregarContas();
});

function maskDocumento(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    v = v.replace(/(\d{2})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1/$2')
         .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  form.value.cpf = v;
}

async function salvar() {
  if (!form.value.nome?.trim()) { erro.value = 'Nome obrigatório.'; return; }
  salvando.value = true;
  erro.value = '';
  try {
    const nomeNovo = form.value.nome.trim();
    const payload = {
      codigo:     form.value.codigo || null,
      nome:       nomeNovo,
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
      if (!error) {
        // Sincroniza nome e código denormalizados nas vendas vinculadas
        await supabase.from('vendas')
          .update({ cliente: nomeNovo, cliente_codigo: form.value.codigo || null })
          .eq('cliente_pk', pk);
      }
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
.form-page   { display: flex; flex-direction: column; gap: 1.25rem; width: 100%; }
.form-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.page-title  { margin: 0; font-size: 1.3rem; color: var(--text); }
.btn-back    { display: flex; align-items: center; gap: .4rem; padding: .4rem .8rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text2); font-size: .85rem; cursor: pointer; }
.btn-back:hover { color: var(--text); }
.loading     { color: var(--text2); padding: 2rem; }

.form-layout {
  display: flex;
  gap: 1.25rem;
  align-items: stretch;
}

/* ── Formulário ── */
.form-card   { flex: 1; min-width: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 2rem 2.25rem; display: flex; flex-direction: column; gap: 1.4rem; }
.form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field       { display: flex; flex-direction: column; gap: .35rem; }
.field.full  { grid-column: 1 / -1; }
.field label { font-size: .85rem; font-weight: 600; color: var(--text2); }
.field input { padding: .65rem .8rem; border: 1px solid var(--border); border-radius: 8px; font-size: .95rem; background: var(--bg3); color: var(--text); outline: none; transition: border-color .15s; }
.field input:focus { border-color: #667eea; }
.check-field { justify-content: center; }
.check-label { display: flex; align-items: center; gap: .5rem; font-size: .9rem; font-weight: normal; color: var(--text); cursor: pointer; }
.check-label input { width: auto; }
.form-actions { display: flex; justify-content: flex-end; gap: .75rem; padding-top: .75rem; border-top: 1px solid var(--border); }
.btn-primary  { padding: .6rem 1.6rem; background: #667eea; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: .95rem; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-cancel   { padding: .6rem 1.2rem; background: var(--bg3); color: var(--text); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
.erro        { color: #f87171; font-size: .85rem; background: rgba(220,38,38,.1); padding: .5rem .75rem; border-radius: 6px; }

/* CEP */
.cep-wrap { position: relative; display: flex; align-items: center; }
.cep-wrap input { flex: 1; }
.cep-spinner {
  position: absolute; right: 10px;
  width: 14px; height: 14px;
  border: 2px solid var(--border);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Painel direito ── */
.right-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Mapa ── */
.map-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 220px;
}
.map-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: .82rem;
  font-weight: 600;
  color: var(--text2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.map-wrap { flex: 1; overflow: hidden; }
.map-iframe { width: 100%; height: 100%; display: block; border: none; }
.map-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text2);
  font-size: .82rem;
  text-align: center;
  padding: 1.5rem;
}

/* ── Contas a receber ── */
.cr-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.cr-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: .82rem;
  font-weight: 600;
  color: var(--text2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.cr-empty { padding: 1.5rem; font-size: .85rem; color: var(--text2); text-align: center; }
.cr-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }

.cr-item {
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: var(--bg3);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cr-vencida { border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.06); }
.cr-ok      { border-color: rgba(16,185,129,.3); background: rgba(16,185,129,.05); }

.cr-item-top { display: flex; align-items: center; justify-content: space-between; }
.cr-codigo   { font-size: .78rem; color: var(--text2); font-family: var(--mono); }
.cr-status-badge { font-size: .72rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
.badge-vencida { background: rgba(239,68,68,.2); color: #f87171; }
.badge-ok      { background: rgba(16,185,129,.15); color: #34d399; }

.cr-item-bottom { display: flex; align-items: center; justify-content: space-between; }
.cr-valor { font-size: .92rem; font-weight: 700; color: var(--text); font-family: var(--mono); }
.cr-venc  { display: flex; align-items: center; gap: 4px; font-size: .78rem; color: var(--text2); }

.cr-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  font-size: .82rem;
  color: var(--text2);
  flex-shrink: 0;
}
.cr-total-val { font-weight: 700; color: var(--text); font-family: var(--mono); font-size: .9rem; }

@media (max-width: 900px) {
  .form-layout { flex-direction: column; }
  .right-panel { width: 100%; }
  .map-card { height: 260px; }
}
</style>
