<template>
  <div class="page-wrap">
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">{{ editando ? 'Alterar Filial' : 'Nova Filial' }}</h2>
        <p class="page-sub">{{ editando ? 'Edite os dados da unidade e salve as alterações' : 'Adicione uma nova unidade ao sistema' }}</p>
      </div>
      <button @click="$router.push('/filiais')" class="btn-cancel">← Voltar</button>
    </div>

    <div v-if="carregando" class="loading">⏳ Carregando dados...</div>
    
    <div v-else class="content-grid">
      <!-- Formulário Principal -->
      <div class="card form-card">
        <div class="form-grid">
          <div class="field col-2">
            <label>Código Interno</label>
            <input v-model="form.codigo" type="text" maxlength="2" placeholder="Ex: 01" class="input-code" />
            <span class="hint">Identificador curto (Ex: 01, SP, Matriz)</span>
          </div>

          <div class="field col-10">
            <label>Nome Fantasia</label>
            <input v-model="form.nome" type="text" placeholder="Nome para exibição no sistema" />
          </div>

          <div class="field full">
            <label>Razão Social</label>
            <input v-model="form.razao_social" type="text" placeholder="Razão Social completa" />
          </div>

          <div class="field col-6">
            <label>CNPJ</label>
            <input v-model="form.cnpj" type="text" placeholder="00.000.000/0000-00" v-maska="'##.###.###/####-##'" />
          </div>

          <div class="field col-6">
            <label>Status</label>
            <select v-model="form.ativo">
              <option :value="true">✅ Ativa</option>
              <option :value="false">❌ Inativa</option>
            </select>
          </div>

          <div class="field col-8">
            <label>Endereço de Contato</label>
            <input v-model="form.endereco" type="text" placeholder="Endereço para o rodapé/contato" />
          </div>

          <div class="field col-4">
            <label>Telefone / WhatsApp</label>
            <input v-model="form.telefone" type="text" placeholder="(00) 00000-0000" v-maska="'(##) #####-####'" />
          </div>
        </div>

        <div class="divider"><span>📍 Endereço Fiscal (NF-e/NFC-e)</span></div>

        <div class="form-grid">
          <div class="field col-3">
            <label>CEP</label>
            <input v-model="form.cep" type="text" placeholder="00000-000" v-maska="'#####-###'" @blur="buscarCEP" />
          </div>
          <div class="field col-7">
            <label>Logradouro</label>
            <input v-model="form.logradouro" type="text" placeholder="Rua, Av..." />
          </div>
          <div class="field col-2">
            <label>Nº</label>
            <input v-model="form.numero_end" type="text" placeholder="123" />
          </div>
          <div class="field col-5">
            <label>Bairro</label>
            <input v-model="form.bairro" type="text" placeholder="Ex: Centro" />
          </div>
          <div class="field col-5">
            <label>Cidade</label>
            <input v-model="form.cidade" type="text" placeholder="Ex: Manaus" />
          </div>
          <div class="field col-2">
            <label>UF</label>
            <input v-model="form.uf" type="text" maxlength="2" placeholder="AM" />
          </div>
        </div>

        <div class="divider"><span>🧾 Dados Fiscais / NFC-e</span></div>

        <div class="form-grid">
          <div class="field col-6">
            <label>Inscrição Estadual (IE)</label>
            <input v-model="form.ie" type="text" placeholder="Apenas números" />
          </div>
          <div class="field col-3">
            <label>Série NFC-e</label>
            <input v-model="form.nfce_serie" type="number" min="1" />
          </div>
          <div class="field col-3">
            <label>Ambiente</label>
            <select v-model="form.nfce_ambiente">
              <option value="2">Homologação</option>
              <option value="1">Produção</option>
            </select>
          </div>
          <div class="field col-9">
            <label>CSC (Token)</label>
            <input v-model="form.nfce_csc" type="password" placeholder="Código de Segurança do Contribuinte" />
          </div>
          <div class="field col-3">
            <label>CSC-ID</label>
            <input v-model="form.nfce_csc_id" type="text" placeholder="000001" />
          </div>

          <div class="field full">
            <label>Certificado Digital A1 (.pfx / .p12)</label>
            <div 
              class="cert-dropzone" 
              :class="{ active: certB64 }"
              @click="$refs.fileInput.click()"
              @dragover.prevent
              @drop.prevent="onCertDrop"
            >
              <input ref="fileInput" type="file" accept=".pfx,.p12" @change="onCertSelected" style="display:none" />
              
              <div v-if="!certB64" class="drop-msg">
                <span class="icon">🔐</span>
                <p>Clique ou arraste o arquivo do certificado aqui</p>
                <small>Apenas formato .pfx ou .p12</small>
              </div>
              <div v-else class="cert-info">
                <span class="icon">✅</span>
                <p>Certificado carregado: <strong>{{ certFileName }}</strong></p>
                <button type="button" @click.stop="limparCert" class="btn-clear-cert">✕ Remover</button>
              </div>
            </div>
          </div>

          <div class="field col-6">
            <label>Senha do Certificado</label>
            <input v-model="form.nfce_cert_senha" type="password" placeholder="Senha definida na exportação" />
            <span class="hint" v-if="editando">Deixe vazio para manter a senha atual</span>
          </div>

          <div v-if="form.nfce_cert_venc" class="field full">
            <div class="cert-validity-banner">
              ✅ Certificado válido até {{ new Date(form.nfce_cert_venc).toLocaleDateString('pt-BR') }}
              <br><small>{{ form.nfce_cert_titular }}</small>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button @click="salvar" :disabled="salvando" class="btn-primary">
            {{ salvando ? '💾 Salvando...' : '💾 Salvar Filial' }}
          </button>
        </div>
      </div>

      <!-- Módulos / Rotinas -->
       <div class="card rotinas-card">
          <h3>🔧 Módulos / Rotinas</h3>
          <p class="sub">Selecione quais rotinas estarão disponíveis para esta filial.</p>
          
          <div class="rotinas-grid">
            <label v-for="r in ROTINAS" :key="r.id" class="rotina-item" :class="{ selected: selectedRotinas.has(r.id) }">
              <input type="checkbox" :value="r.id" :checked="selectedRotinas.has(r.id)" @change="toggleRotina(r.id)" />
              <div class="rotina-content">
                <span class="rotina-icon">{{ r.icon }}</span>
                <span class="rotina-label">{{ r.label }}</span>
              </div>
            </label>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../composables/useSupabase';
import { vMaska } from 'maska/vue';

const ROTINAS = [
  { id: 'produtos', icon: '📦', label: 'Produtos / Estoque' },
  { id: 'armazens', icon: '🏭', label: 'Armazéns' },
  { id: 'clientes', icon: '👥', label: 'Clientes' },
  { id: 'agenda', icon: '📅', label: 'Agenda' },
  { id: 'separacao', icon: '📋', label: 'Separação' },
  { id: 'pdv', icon: '🛒', label: 'PDV (Ponto de Venda)' },
  { id: 'historico', icon: '📊', label: 'Histórico de Vendas' },
  { id: 'receitas', icon: '📒', label: 'Contas a Receber' },
  { id: 'categorias', icon: '🏷️', label: 'Categorias' },
  { id: 'despesas', icon: '📉', label: 'Despesas' },
  { id: 'financeiro', icon: '💳', label: 'Financeiro' },
  { id: 'fechamento', icon: '💰', label: 'Fechamento de Caixa' },
  { id: 'vendedores', icon: '👤', label: 'Vendedores' },
  { id: 'funcionarios', icon: '👥', label: 'Funcionários' },
  { id: 'ponto', icon: '⏰', label: 'Ponto Eletrônico' },
];

const route = useRoute();
const router = useRouter();
const editando = ref(false);
const carregando = ref(false);
const salvando = ref(false);

const form = reactive({
  codigo: '',
  nome: '',
  razao_social: '',
  cnpj: '',
  endereco: '',
  telefone: '',
  ativo: true,
  logradouro: '',
  numero_end: '',
  bairro: '',
  cep: '',
  cidade: 'Manaus',
  uf: 'AM',
  ie: '',
  nfce_serie: 1,
  nfce_ambiente: '2',
  nfce_csc: '',
  nfce_csc_id: '000001',
  nfce_cert_senha: '',
});

const certB64 = ref('');
const certFileName = ref('');
const selectedRotinas = ref(new Set());

onMounted(async () => {
  if (route.params.pk) {
    editando.value = true;
    await carregar();
  }
});

async function carregar() {
  carregando.value = true;
  try {
    const { data: filial, error } = await supabase.from('filiais').select('*').eq('pk', route.params.pk).single();
    if (error) throw error;

    Object.assign(form, filial);
    // Não carregamos a senha por segurança no input, o backend lida se estiver vazio
    form.nfce_cert_senha = ''; 
    
    if (filial.nfce_cert_b64) {
      certB64.value = filial.nfce_cert_b64;
      certFileName.value = filial.nfce_cert_titular || 'Certificado Cadastrado';
    }

    const { data: mods } = await supabase.from('modulos_filiais')
      .select('modulo')
      .eq('filial_pk', filial.pk)
      .eq('ativo', true);
    
    if (mods) {
      mods.forEach(m => selectedRotinas.value.add(m.modulo));
    }

  } catch (e) {
    alert('Erro ao carregar filial: ' + e.message);
    router.push('/filiais');
  } finally {
    carregando.value = false;
  }
}

function toggleRotina(id) {
  if (selectedRotinas.value.has(id)) {
    selectedRotinas.value.delete(id);
  } else {
    selectedRotinas.value.add(id);
  }
}

async function buscarCEP() {
  const cep = form.cep.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await resp.json();
    if (!data.erro) {
      form.logradouro = data.logradouro;
      form.bairro = data.bairro;
      form.cidade = data.localidade;
      form.uf = data.uf;
    }
  } catch (e) {
    console.error('Erro ao buscar CEP', e);
  }
}

function onCertSelected(e) {
  const file = e.target.files[0];
  if (file) processCert(file);
}

function onCertDrop(e) {
  const file = e.dataTransfer.files[0];
  if (file) processCert(file);
}

function processCert(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const arr = new Uint8Array(e.target.result);
    let binary = '';
    for (let i = 0; i < arr.byteLength; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    certB64.value = btoa(binary);
    certFileName.value = file.name;
  };
  reader.readAsArrayBuffer(file);
}

function limparCert() {
  certB64.value = '';
  certFileName.value = '';
}

async function salvar() {
  if (!form.codigo || !form.nome) return alert('Código e Nome são obrigatórios.');

  salvando.value = true;
  try {
    const payload = { ...form };
    if (certB64.value) {
      payload.nfce_cert_b64 = certB64.value;
      payload.nfce_cert_titular = certFileName.value;
    }
    
    // Se estiver editando e a senha estiver vazia, removemos do payload para não sobrescrever com vazio
    if (editando.value && !form.nfce_cert_senha) {
      delete payload.nfce_cert_senha;
    }

    let filialPk;
    if (editando.value) {
      const { error } = await supabase.from('filiais').update(payload).eq('pk', route.params.pk);
      if (error) throw error;
      filialPk = route.params.pk;
    } else {
      const { data, error } = await supabase.from('filiais').insert([payload]).select('pk').single();
      if (error) throw error;
      filialPk = data.pk;
    }

    // Atualizar módulos
    await supabase.from('modulos_filiais').delete().eq('filial_pk', filialPk);
    if (selectedRotinas.value.size > 0) {
      const rotinaRows = Array.from(selectedRotinas.value).map(m => ({
        filial_pk: filialPk,
        modulo: m,
        ativo: true
      }));
      const { error: errMod } = await supabase.from('modulos_filiais').insert(rotinaRows);
      if (errMod) throw errMod;
    }

    alert('Filial salva com sucesso!');
    router.push('/filiais');
  } catch (e) {
    alert('Erro ao salvar: ' + e.message);
  } finally {
    salvando.value = false;
  }
}
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 1.5rem; max-width: 1200px; margin: 0 auto; padding-bottom: 3rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { margin: 0; font-size: 1.5rem; color: var(--text); }
.page-sub { margin: 0; font-size: 0.9rem; color: var(--text2); }

.content-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem; align-items: start; }

.card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.form-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.8rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; }
.field input, .field select { padding: 0.6rem 0.8rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.95rem; background: var(--bg3); color: var(--text); outline: none; transition: all 0.2s; }
.field input:focus, .field select:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
.hint { font-size: 0.75rem; color: var(--text2); font-style: italic; }

.col-2 { grid-column: span 2; }
.col-3 { grid-column: span 3; }
.col-4 { grid-column: span 4; }
.col-5 { grid-column: span 5; }
.col-6 { grid-column: span 6; }
.col-7 { grid-column: span 7; }
.col-8 { grid-column: span 8; }
.col-9 { grid-column: span 9; }
.col-10 { grid-column: span 10; }
.full { grid-column: span 12; }

.input-code { font-family: monospace; font-weight: bold; text-align: center; font-size: 1.2rem !important; }

.divider { grid-column: span 12; margin: 1.5rem 0 0.5rem; display: flex; align-items: center; gap: 1rem; }
.divider span { font-size: 0.85rem; font-weight: 700; color: #667eea; white-space: nowrap; }
.divider::after { content: ''; height: 1px; width: 100%; background: var(--border); }

.cert-dropzone { border: 2px dashed var(--border); border-radius: 10px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bg3); }
.cert-dropzone:hover { border-color: #667eea; background: rgba(102,126,234,0.05); }
.cert-dropzone.active { border-style: solid; border-color: #10b981; background: rgba(16,185,129,0.05); }

.drop-msg .icon { font-size: 2rem; margin-bottom: 0.5rem; display: block; }
.drop-msg p { margin: 0; font-weight: 500; font-size: 0.9rem; }
.drop-msg small { color: var(--text2); font-size: 0.75rem; }

.cert-validity-banner { background: #ecfdf5; border: 1px solid #10b981; color: #065f46; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; }
.cert-validity-banner small { font-weight: normal; opacity: 0.8; }

.cert-info .icon { font-size: 1.5rem; }
.cert-info p { margin: 0.25rem 0 0.75rem; font-size: 0.9rem; }
.btn-clear-cert { background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
.btn-clear-cert:hover { background: #fee2e2; }

.form-actions { margin-top: 2rem; display: flex; justify-content: flex-end; }
.btn-primary { background: #667eea; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #5a67d8; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-cancel { background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 500; }

.rotinas-card h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
.rotinas-card .sub { margin: 0 0 1.5rem; font-size: 0.85rem; color: var(--text2); }

.rotinas-grid { display: grid; grid-template-columns: 1fr; gap: 0.5rem; }
.rotina-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s; background: var(--bg3); }
.rotina-item input { width: 1.1rem; height: 1.1rem; accent-color: #667eea; }
.rotina-item.selected { border-color: #667eea; background: rgba(102,126,234,0.05); }
.rotina-content { display: flex; align-items: center; gap: 0.75rem; }
.rotina-icon { font-size: 1.25rem; }
.rotina-label { font-size: 0.9rem; font-weight: 500; }

.loading { text-align: center; padding: 5rem; color: var(--text2); font-size: 1.1rem; }

@media (max-width: 900px) {
  .content-grid { grid-template-columns: 1fr; }
}
</style>
