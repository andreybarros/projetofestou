<template>
  <div class="sk-page">

    <!-- ── Topbar ── -->
    <div class="sk-topbar">
      <div class="sk-topbar-left">
        <button class="sk-btn-back" @click="$router.push('/clientes')" title="Voltar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <nav class="sk-breadcrumb">
          <span class="sk-bread-root" @click="$router.push('/clientes')">Clientes</span>
          <span class="sk-bread-sep">›</span>
          <span class="sk-bread-cur">{{ pk ? 'Editar Cliente' : 'Novo Cliente' }}</span>
        </nav>
      </div>
      <div class="sk-topbar-right">
        <button class="sk-btn-ghost" @click="$router.push('/clientes')">Cancelar</button>
        <button class="sk-btn-solid" :disabled="salvando" @click="salvar">
          <span v-if="salvando" class="sk-spin"></span>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{ salvando ? 'Salvando…' : 'Salvar Cliente' }}
        </button>
      </div>
    </div>

    <!-- ── Heading ── -->
    <div class="sk-hero">
      <h1 class="sk-hero-title">{{ pk ? 'Editar Cliente' : 'Novo Cliente' }}</h1>
      <p class="sk-hero-sub">{{ pk ? 'Atualize as informações do cadastro' : 'Preencha os dados para registrar um novo cliente' }}</p>
    </div>

    <!-- ── Loading ── -->
    <div v-if="carregando" class="sk-loading">
      <span class="sk-spin sk-spin--lg"></span>
    </div>

    <!-- ── Body ── -->
    <div v-else class="sk-body">

      <!-- Form Column -->
      <form class="sk-form-col" @submit.prevent="salvar" @keydown.enter.prevent="onEnterForm" ref="formRef">

        <!-- Seção 01 · Identificação -->
        <div class="sk-section">
          <div class="sk-sec-head">
            <div class="sk-sec-badge">01</div>
            <div>
              <div class="sk-sec-title">Identificação</div>
              <div class="sk-sec-sub">Dados principais do cliente</div>
            </div>
          </div>

          <div class="sk-grid">
            <div class="sk-field sk-span-1">
              <label class="sk-lbl">Código</label>
              <input :value="form.codigo || '—'" type="text" class="sk-inp sk-inp--ro" readonly />
            </div>
            <div class="sk-field sk-span-3">
              <label class="sk-lbl">Nome <span class="sk-req">*</span></label>
              <input v-model="form.nome" type="text" class="sk-inp" required autofocus placeholder="Nome completo" />
            </div>
            <div class="sk-field sk-span-4">
              <label class="sk-lbl">Razão Social</label>
              <input v-model="form.razao_social" type="text" class="sk-inp" placeholder="Para pessoa jurídica" />
            </div>
            <div class="sk-field sk-span-2">
              <label class="sk-lbl">CPF / CNPJ</label>
              <input v-model="form.cpf" type="text" class="sk-inp" placeholder="000.000.000-00" maxlength="18" @input="maskDocumento" />
            </div>
            <div class="sk-field sk-span-2">
              <label class="sk-lbl">Telefone</label>
              <input v-model="form.telefone" type="text" class="sk-inp" placeholder="(92) 99999-9999" />
            </div>
            <div class="sk-field sk-span-2">
              <label class="sk-lbl">Data de Nascimento</label>
              <input v-model="form.data_nascimento" type="date" class="sk-inp" />
            </div>
            <div class="sk-field sk-span-2">
              <label class="sk-lbl">E-mail</label>
              <input v-model="form.email" type="email" class="sk-inp" placeholder="email@exemplo.com" />
            </div>
            <div class="sk-field sk-span-4">
              <label class="sk-toggle-label">
                <input type="checkbox" v-model="form.decorador" class="sk-native-cb" />
                <div :class="['sk-check-box', form.decorador && 'sk-check-box--on']">
                  <svg v-if="form.decorador" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div class="sk-toggle-text">
                  <span class="sk-toggle-name">Decorador</span>
                  <span class="sk-toggle-desc">Recebe desconto especial no PDV</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Seção 02 · Endereço -->
        <div class="sk-section">
          <div class="sk-sec-head">
            <div class="sk-sec-badge">02</div>
            <div>
              <div class="sk-sec-title">Endereço e Localização</div>
              <div class="sk-sec-sub">Informe o CEP para preenchimento automático</div>
            </div>
          </div>

          <div class="sk-grid">
            <div class="sk-field sk-span-2">
              <label class="sk-lbl">CEP</label>
              <div class="sk-cep-wrap">
                <input v-model="form.cep" type="text" class="sk-inp" maxlength="9" placeholder="00000-000"
                  @input="onCepInput" @blur="buscarCep" data-cep />
                <span v-if="buscandoCep" class="sk-cep-spin"></span>
              </div>
            </div>
            <div class="sk-field sk-span-4">
              <label class="sk-lbl">Logradouro</label>
              <input v-model="form.logradouro" type="text" class="sk-inp" placeholder="Rua, Avenida, Travessa…" />
            </div>
            <div class="sk-field sk-span-1">
              <label class="sk-lbl">Número</label>
              <input v-model="form.numero" type="text" class="sk-inp" @change="atualizarMapa" />
            </div>
            <div class="sk-field sk-span-3">
              <label class="sk-lbl">Bairro</label>
              <input v-model="form.bairro" type="text" class="sk-inp" />
            </div>
            <div class="sk-field sk-span-3">
              <label class="sk-lbl">Cidade</label>
              <input v-model="form.cidade" type="text" class="sk-inp" />
            </div>
            <div class="sk-field sk-span-1">
              <label class="sk-lbl">UF</label>
              <input v-model="form.uf" type="text" class="sk-inp" maxlength="2" placeholder="AM" />
            </div>
          </div>
        </div>

        <!-- Erro -->
        <Transition name="sk-slide">
          <div v-if="erro" class="sk-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ erro }}
          </div>
        </Transition>

      </form>

      <!-- ── Sidebar ── -->
      <aside class="sk-sidebar">

        <!-- Mapa -->
        <div class="sk-card">
          <div class="sk-card-hd">
            <div class="sk-ico sk-ico--map">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <span class="sk-card-title">Localização</span>
          </div>
          <div class="sk-map-body">
            <div v-if="hasAddress" class="sk-map-info">
              <div class="sk-map-addr-row">
                <div class="sk-map-pin-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div class="sk-map-addr-text">
                  <div class="sk-map-street">{{ [form.logradouro, form.numero].filter(Boolean).join(', ') || form.cep }}</div>
                  <div class="sk-map-city">{{ [form.bairro, form.cidade, form.uf].filter(Boolean).join(' · ') }}</div>
                </div>
              </div>
              <a :href="mapUrl" target="_blank" rel="noopener" class="sk-map-open-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Abrir no Google Maps
              </a>
            </div>
            <div v-else class="sk-map-empty">
              <div class="sk-map-pin">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <p>Informe o CEP<br>para ver o mapa</p>
            </div>
          </div>
        </div>

        <!-- Contas a receber -->
        <div class="sk-card">
          <div class="sk-card-hd">
            <div class="sk-ico sk-ico--cr">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <span class="sk-card-title">Contas a Receber</span>
          </div>
          <div class="sk-cr-body">
            <div v-if="!pk" class="sk-cr-empty">
              <div class="sk-cr-empty-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              Salve o cliente para ver as contas.
            </div>
            <div v-else-if="crCarregando" class="sk-cr-empty"><span class="sk-spin"></span></div>
            <div v-else-if="!contasAReceber.length" class="sk-cr-empty">
              <div class="sk-cr-empty-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              Nenhuma conta pendente.
            </div>
            <div v-else class="sk-cr-list">
              <div v-for="c in contasAReceber" :key="c.pk" :class="['sk-cr-item', c.vencida ? 'sk-cr-item--red' : 'sk-cr-item--green']">
                <div class="sk-cr-row">
                  <span class="sk-cr-id">#{{ c.pk }}</span>
                  <span :class="['sk-badge', c.vencida ? 'sk-badge--red' : 'sk-badge--green']">
                    {{ c.vencida ? 'Vencida' : 'A vencer' }}
                  </span>
                </div>
                <div class="sk-cr-row">
                  <span class="sk-cr-val">R$ {{ fmt(c.total) }}</span>
                  <span class="sk-cr-date">{{ fmtData(c.data_vencimento_crediario) }}</span>
                </div>
              </div>
              <div class="sk-cr-footer">
                <span>Total pendente</span>
                <span class="sk-cr-total">R$ {{ fmt(contasAReceber.reduce((s,c) => s + Number(c.total||0), 0)) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Dica -->
        <div class="sk-tip">
          <div class="sk-tip-ico">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>
            </svg>
          </div>
          <p class="sk-tip-text">Preencha o CEP para auto-completar o endereço e ativar a visualização no mapa.</p>
        </div>

      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';
import api from '../services/api';
import { useFormatacao } from '../composables/useFormatacao';

const route       = useRoute();
const router      = useRouter();
const sessaoStore = useSessaoStore();
const { fmtData, fmtNum } = useFormatacao();

const pk         = route.params.pk || null;
const carregando = ref(!!pk);
const salvando   = ref(false);
const erro       = ref('');
const buscandoCep      = ref(false);
const formRef          = ref(null);
const crCarregando     = ref(false);
const contasAReceber   = ref([]);

function fmt(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }

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
  codigo: '', nome: '', razao_social: '', cpf: '', telefone: '', data_nascimento: '', email: '',
  cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '',
  decorador: false,
});

const mapUrl = ref('');
const hasAddress = computed(() => !!(form.value.logradouro || form.value.cep));

function buildMapUrl() {
  const partes = [form.value.logradouro, form.value.numero, form.value.bairro, form.value.cidade, form.value.uf].filter(Boolean);
  if (!partes.length && !form.value.cep) return '';
  const q = encodeURIComponent(partes.length >= 2 ? partes.join(', ') : form.value.cep);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function atualizarMapa() {
  mapUrl.value = buildMapUrl();
}

function onCepInput(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  form.value.cep = v;
  if (v.replace(/\D/g, '').length === 8) buscarCep();
}

async function buscarCep() {
  const cep = form.value.cep?.replace(/\D/g, '');
  if (cep?.length !== 8) return;
  buscandoCep.value = true;
  try {
    const { data } = await api.get(`/api/clientes/cep/${cep}`);
    if (data?.data) {
      form.value.logradouro = data.data.logradouro || form.value.logradouro;
      form.value.bairro     = data.data.bairro     || form.value.bairro;
      form.value.cidade     = data.data.cidade     || form.value.cidade;
      form.value.uf         = data.data.uf         || form.value.uf;
      atualizarMapa();
    }
  } catch (e) {
    if (e.response?.status === 404) {
      erro.value = 'CEP não encontrado.';
      setTimeout(() => { erro.value = ''; }, 3000);
    }
  } finally {
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
      codigo:          form.value.codigo || null,
      nome:            nomeNovo,
      razao_social:    form.value.razao_social?.trim() || null,
      cpf:             form.value.cpf?.trim() || null,
      telefone:        form.value.telefone?.trim() || null,
      data_nascimento: form.value.data_nascimento || null,
      email:           form.value.email?.trim() || null,
      decorador:       form.value.decorador || false,
      cep:             form.value.cep?.trim() || null,
      logradouro:      form.value.logradouro?.trim() || null,
      numero:          form.value.numero?.trim() || null,
      bairro:          form.value.bairro?.trim() || null,
      cidade:          form.value.cidade?.trim() || null,
      uf:              form.value.uf?.trim()?.toUpperCase() || null,
      filial_pk:       sessaoStore.filial?.pk || null,
    };
    let error;
    if (pk) {
      ({ error } = await supabase.from('clientes').update(payload).eq('pk', pk));
      if (!error) {
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
/* ────────────────────────────────────────────────────────────
   SILK — Neomorphic Design System · FormCliente
   ──────────────────────────────────────────────────────────── */
.sk-page {
  --sk-raise:       0 2px 18px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.05);
  --sk-raise-md:    0 1px 10px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.04);
  --sk-raise-sm:    0 1px 6px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --sk-primary:     var(--primary);
  --sk-primary-dim: rgba(99,102,241,.13);
  --sk-primary-soft:rgba(99,102,241,.07);
  --sk-primary-glow:rgba(99,102,241,.28);
  --sk-font:        'Plus Jakarta Sans', sans-serif;

  font-family: var(--sk-font);
  padding-bottom: 64px;
  color: var(--text);
  animation: skIn .35s ease both;
}
@keyframes skIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }

/* ── Topbar ── */
.sk-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px 32px 0;
}
.sk-topbar-left  { display: flex; align-items: center; gap: 16px; }
.sk-topbar-right { display: flex; align-items: center; gap: 10px; }

.sk-btn-back {
  width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  background: var(--bg2); box-shadow: var(--sk-raise-sm);
  border: 1px solid var(--border); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--text2); transition: box-shadow .18s, color .15s;
}
.sk-btn-back:hover  { box-shadow: var(--sk-raise); color: var(--sk-primary); }
.sk-btn-back:active { box-shadow: var(--sk-raise-sm); }

.sk-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.sk-bread-root { color: var(--text2); cursor: pointer; transition: color .15s; }
.sk-bread-root:hover { color: var(--sk-primary); }
.sk-bread-sep  { color: var(--text2); font-size: 15px; }
.sk-bread-cur  { color: var(--text); font-weight: 700; }

.sk-btn-ghost {
  padding: 9px 20px; border-radius: 10px;
  background: var(--bg2); box-shadow: var(--sk-raise-sm);
  border: 1px solid var(--border); color: var(--text2); font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: var(--sk-font); transition: all .18s;
}
.sk-btn-ghost:hover  { box-shadow: var(--sk-raise); color: var(--text); }
.sk-btn-ghost:active { box-shadow: var(--sk-raise-sm); }

.sk-btn-solid {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 22px; border-radius: 10px;
  background: var(--sk-primary);
  box-shadow: 4px 4px 12px var(--sk-primary-glow), -2px -2px 6px rgba(255,255,255,.25);
  border: none; color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: var(--sk-font); transition: all .18s;
}
.sk-btn-solid:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 6px 6px 18px var(--sk-primary-glow), -3px -3px 8px rgba(255,255,255,.3); }
.sk-btn-solid:active:not(:disabled) { transform: none; box-shadow: inset 2px 2px 5px rgba(0,0,0,.18); }
.sk-btn-solid:disabled              { opacity: .5; cursor: not-allowed; }

/* ── Hero ── */
.sk-hero { padding: 28px 32px 16px; }
.sk-hero-title {
  margin: 0 0 6px;
  font-size: 28px; font-weight: 800; color: var(--text);
  letter-spacing: -.5px;
}
.sk-hero-sub { margin: 0; font-size: 13.5px; color: var(--text2); }

/* ── Loading ── */
.sk-loading { display: flex; align-items: center; justify-content: center; padding: 80px; }

/* ── Layout ── */
.sk-body {
  display: flex; gap: 22px;
  padding: 0 32px; align-items: flex-start;
}

/* ── Form column ── */
.sk-form-col {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 28px;
}

.sk-section {
  display: flex; flex-direction: column; gap: 22px;
  padding: 0 0 10px;
  border-bottom: 1px solid var(--border);
}
.sk-section:last-of-type { border-bottom: none; }

.sk-sec-head { display: flex; align-items: flex-start; gap: 14px; }
.sk-sec-badge {
  width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: var(--sk-primary);
  box-shadow: 3px 3px 9px var(--sk-primary-glow), -2px -2px 5px rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #fff; letter-spacing: .06em;
}
.sk-sec-title { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 3px; }
.sk-sec-sub   { font-size: 12px; color: var(--text2); }

/* ── Grid 4 colunas ── */
.sk-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.sk-field  { display: flex; flex-direction: column; gap: 7px; }
.sk-span-1 { grid-column: span 1; }
.sk-span-2 { grid-column: span 2; }
.sk-span-3 { grid-column: span 3; }
.sk-span-4 { grid-column: 1 / -1; }

.sk-lbl {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em;
  color: var(--sk-primary); opacity: .75;
}
.sk-req { color: var(--sk-primary); }

/* ── Inputs neomórficos ── */
.sk-inp {
  padding: 11px 14px;
  background: var(--bg2);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  color: var(--text); font-size: 13.5px; font-family: var(--sk-font);
  outline: none; width: 100%; box-sizing: border-box;
  transition: border-color .18s, box-shadow .18s;
}
.sk-inp::placeholder { color: var(--text2); opacity: .5; }
.sk-inp:focus {
  border-color: var(--sk-primary);
  box-shadow: 0 0 0 3px var(--sk-primary-dim);
}
.sk-inp--ro { opacity: .5; cursor: not-allowed; }
.sk-inp[type="date"] { color-scheme: light; }

/* CEP */
.sk-cep-wrap { position: relative; display: flex; align-items: center; }
.sk-cep-wrap .sk-inp { padding-right: 38px; }
.sk-cep-spin {
  position: absolute; right: 12px;
  width: 14px; height: 14px;
  border: 2px solid var(--sk-primary-dim); border-top-color: var(--sk-primary);
  border-radius: 50%; animation: skSpin .7s linear infinite;
}

/* Spinner */
.sk-spin {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
  border-radius: 50%; animation: skSpin .7s linear infinite;
}
.sk-spin--lg { width: 30px; height: 30px; border-width: 3px; border-color: var(--sk-primary-dim); border-top-color: var(--sk-primary); }
@keyframes skSpin { to { transform: rotate(360deg); } }

/* ── Toggle (decorador) ── */
.sk-toggle-label {
  display: flex; align-items: center; gap: 14px; cursor: pointer; user-select: none;
  padding: 14px 18px; border-radius: 12px;
  background: var(--sk-primary-soft);
  border: 1.5px dashed rgba(99,102,241,.22);
  transition: background .15s;
}
.sk-toggle-label:hover { background: var(--sk-primary-dim); }
.sk-native-cb { position: absolute; opacity: 0; width: 0; height: 0; }
.sk-check-box {
  width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
  background: var(--bg2);
  border: 1.5px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  transition: all .18s;
}
.sk-check-box--on {
  background: var(--sk-primary);
  border-color: var(--sk-primary);
  box-shadow: 2px 2px 7px var(--sk-primary-glow);
  color: #fff;
}
.sk-toggle-name { display: block; font-size: 13px; font-weight: 700; color: var(--text); }
.sk-toggle-desc { display: block; font-size: 11.5px; color: var(--text2); margin-top: 2px; }

/* ── Erro ── */
.sk-error {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 16px; border-radius: 10px;
  background: rgba(239,68,68,.07);
  border: 1px solid rgba(239,68,68,.2);
  font-size: 13px; color: #dc2626;
}
.sk-slide-enter-active, .sk-slide-leave-active { transition: opacity .2s, transform .2s; }
.sk-slide-enter-from, .sk-slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Sidebar ── */
.sk-sidebar {
  width: 296px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 16px;
}

.sk-card {
  background: var(--bg);
  box-shadow: var(--sk-raise);
  border: 1px solid var(--border);
  border-radius: 18px; overflow: hidden;
}

.sk-card-hd {
  display: flex; align-items: center; gap: 11px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.sk-ico {
  width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--sk-raise-sm);
}
.sk-ico--map { background: var(--sk-primary); color: #fff; }
.sk-ico--cr  { background: rgba(16,185,129,.12); color: #059669; }

.sk-card-title { font-size: 12.5px; font-weight: 700; color: var(--text); }

/* Mapa */
.sk-map-body { padding: 16px; min-height: 130px; }
.sk-map-info { display: flex; flex-direction: column; gap: 14px; }
.sk-map-addr-row { display: flex; align-items: flex-start; gap: 10px; }
.sk-map-pin-sm {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: var(--sk-primary-soft); color: var(--sk-primary);
  display: flex; align-items: center; justify-content: center;
}
.sk-map-addr-text { flex: 1; }
.sk-map-street { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.4; }
.sk-map-city   { font-size: 11.5px; color: var(--text2); margin-top: 2px; }
.sk-map-open-btn {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 14px; border-radius: 10px;
  background: var(--sk-primary);
  box-shadow: 0 4px 12px var(--sk-primary-glow);
  color: #fff; font-size: 12.5px; font-weight: 700;
  text-decoration: none; font-family: var(--sk-font);
  transition: transform .18s, box-shadow .18s;
}
.sk-map-open-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px var(--sk-primary-glow); }
.sk-map-empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  font-size: 12px; color: var(--text2); text-align: center; padding: 20px;
}
.sk-map-pin {
  width: 54px; height: 54px; border-radius: 50%;
  background: var(--bg2); box-shadow: var(--sk-raise-sm);
  display: flex; align-items: center; justify-content: center;
  color: var(--text2);
}

/* Contas a receber */
.sk-cr-body { padding: 14px; }
.sk-cr-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 16px 8px; font-size: 12px; color: var(--text2); text-align: center;
}
.sk-cr-empty-ico {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--bg2); box-shadow: var(--sk-raise-sm);
  display: flex; align-items: center; justify-content: center; color: var(--text2);
}
.sk-cr-list { display: flex; flex-direction: column; gap: 8px; }
.sk-cr-item {
  padding: 10px 12px; border-radius: 10px;
  background: var(--bg2);
}
.sk-cr-item--green { border: 1px solid rgba(16,185,129,.18); background: rgba(16,185,129,.03); }
.sk-cr-item--red   { border: 1px solid rgba(239,68,68,.18);  background: rgba(239,68,68,.03); }
.sk-cr-row { display: flex; align-items: center; justify-content: space-between; }
.sk-cr-row + .sk-cr-row { margin-top: 5px; }
.sk-cr-id   { font-size: 11px; color: var(--text2); }
.sk-cr-val  { font-size: 13px; font-weight: 700; color: var(--text); }
.sk-cr-date { font-size: 11px; color: var(--text2); }
.sk-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.sk-badge--green { background: rgba(16,185,129,.1); color: #059669; }
.sk-badge--red   { background: rgba(239,68,68,.1);  color: #dc2626; }
.sk-cr-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 2px 2px; margin-top: 8px;
  border-top: 1px solid var(--border);
  font-size: 11.5px; color: var(--text2);
}
.sk-cr-total { font-weight: 700; color: var(--text); font-size: 13px; }

/* ── Dica ── */
.sk-tip {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px; border-radius: 14px;
  background: var(--sk-primary-soft);
  border: 1.5px solid var(--sk-primary-dim);
}
.sk-tip-ico {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: var(--sk-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 2px 2px 8px var(--sk-primary-glow);
}
.sk-tip-text { margin: 0; font-size: 12px; color: var(--text2); line-height: 1.6; padding-top: 3px; }

/* ── Responsive ── */
@media (max-width: 1060px) {
  .sk-body    { flex-direction: column; }
  .sk-sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; }
  .sk-card    { flex: 1; min-width: 260px; }
  .sk-tip     { width: 100%; box-sizing: border-box; }
}
@media (max-width: 680px) {
  .sk-topbar, .sk-hero, .sk-body { padding-left: 16px; padding-right: 16px; }
  .sk-grid   { grid-template-columns: 1fr 1fr; }
  .sk-span-1, .sk-span-2, .sk-span-3, .sk-span-4 { grid-column: 1 / -1; }
  .sk-section { padding: 20px 18px; }
}
</style>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
</style>
