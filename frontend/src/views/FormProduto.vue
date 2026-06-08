<template>
  <div class="fp-root">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="fp-header">
      <div class="fp-breadcrumb">
        <button class="fp-back" @click="$router.push(rotaVoltar)">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <span class="fp-crumb-sep">/</span>
        <span class="fp-crumb-link" @click="$router.push(rotaVoltar)">{{ route.query.pedido_pk ? 'Pedido de Compra' : 'Produtos' }}</span>
        <span class="fp-crumb-sep">/</span>
        <span class="fp-crumb-current">{{ pk ? form.descricao || 'Editar Produto' : 'Novo Produto' }}</span>
      </div>
      <div class="fp-header-right">
        <span v-if="pk" class="fp-badge-edit">Editando</span>
        <span v-else class="fp-badge-new">Novo</span>
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────────────── -->
    <div v-if="carregando" class="fp-loading">
      <div class="fp-spinner"></div>
      <span>Carregando produto…</span>
    </div>

    <!-- ── Formulário ─────────────────────────────────────────── -->
    <form v-else @submit.prevent="salvar" @keydown.enter.prevent="focusProximo" class="fp-form">

      <div class="fp-cols">

        <!-- Coluna principal -->
        <div class="fp-col-main">

          <!-- Identificação -->
          <div class="fp-card fp-card--indigo">
            <div class="fp-card-head">
              <span class="material-symbols-outlined fp-card-icon">label</span>
              <h3 class="fp-card-title">Identificação</h3>
            </div>
            <div class="fp-card-body">
              <div class="fp-grid fp-grid--3">
                <div class="fp-field">
                  <label class="fp-label">Código Interno</label>
                  <input v-model="form.codigo" type="text" :readonly="!pk" class="fp-input" :class="{ 'fp-input--locked': !pk }" />
                </div>
                <div class="fp-field">
                  <label class="fp-label">Código de Barras (EAN)</label>
                  <div class="fp-barcode-wrap">
                    <input v-model="form.codigo_barras" type="text" placeholder="7891234567890" class="fp-input" />
                    <button type="button" class="fp-btn-gen-barcode" @click="gerarCodigoBarras" :disabled="gerandoBarcode" title="Gerar EAN-13 automático">
                      <span v-if="gerandoBarcode" class="fp-spin-xs"></span>
                      <span v-else class="material-symbols-outlined" style="font-size:18px">barcode</span>
                    </button>
                  </div>
                </div>
                <div class="fp-field">
                  <label class="fp-label">Unidade</label>
                  <input v-model="form.unidade_comercial" type="text" placeholder="UN" class="fp-input" />
                </div>
              </div>
              <div class="fp-field">
                <label class="fp-label">Descrição <span class="fp-required">*</span></label>
                <input v-model="form.descricao" type="text" required autofocus placeholder="Nome completo do produto" class="fp-input fp-input--lg" />
              </div>
              <div class="fp-field">
                <label class="fp-label">Categoria</label>
                <select v-model="form.categoria_pk" class="fp-input">
                  <option value="">— Sem categoria —</option>
                  <option v-for="c in categorias" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Preços -->
          <div class="fp-card fp-card--emerald">
            <div class="fp-card-head">
              <span class="material-symbols-outlined fp-card-icon">payments</span>
              <h3 class="fp-card-title">Preços & Estoque</h3>
            </div>
            <div class="fp-card-body">
              <div class="fp-grid fp-grid--3">
                <div class="fp-field">
                  <label class="fp-label">Preço de Venda</label>
                  <div class="fp-input-prefix-wrap">
                    <span class="fp-prefix">R$</span>
                    <input :value="valorVendaDisplay" @input="mascaraPreco($event, 'valor_venda')" type="text" inputmode="numeric" placeholder="0,00" class="fp-input fp-input--has-prefix" />
                  </div>
                </div>
                <div class="fp-field">
                  <label class="fp-label">Preço de Custo</label>
                  <div class="fp-input-prefix-wrap">
                    <span class="fp-prefix">R$</span>
                    <input :value="precoCustoDisplay" @input="mascaraPreco($event, 'preco_custo')" type="text" inputmode="numeric" placeholder="0,00" class="fp-input fp-input--has-prefix" />
                  </div>
                </div>
                <div class="fp-field">
                  <label class="fp-label">Saldo em Estoque</label>
                  <input :value="form.saldo" @input="e => form.saldo = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)" type="text" inputmode="numeric" placeholder="0" class="fp-input" />
                </div>
              </div>
              <div v-if="form.valor_venda > 0 && form.preco_custo > 0" class="fp-margem" :class="margemClass">
                <span class="fp-margem-label">Margem de lucro</span>
                <span class="fp-margem-val">{{ margem }}%</span>
                <span class="fp-margem-hint">{{ parseFloat(margem) >= 30 ? 'Excelente' : parseFloat(margem) >= 10 ? 'Moderada' : 'Baixa' }}</span>
              </div>
            </div>
          </div>

          <!-- Promoção -->
          <div class="fp-card fp-card--rose">
            <div class="fp-card-head">
              <span class="material-symbols-outlined fp-card-icon">bolt</span>
              <h3 class="fp-card-title">Promoção Relâmpago</h3>
              <span class="fp-tag">Opcional</span>
            </div>
            <div class="fp-card-body">
              <p class="fp-card-sub">Preço especial ativado automaticamente no período selecionado.</p>
              <div class="fp-grid fp-grid--3">
                <div class="fp-field">
                  <label class="fp-label">Preço Promocional</label>
                  <div class="fp-input-prefix-wrap">
                    <span class="fp-prefix">R$</span>
                    <input :value="precoPromoDisplay" @input="mascaraPreco($event, 'preco_promo')" type="text" inputmode="numeric" placeholder="0,00" class="fp-input fp-input--has-prefix" />
                  </div>
                </div>
                <div class="fp-field">
                  <label class="fp-label">Início</label>
                  <input v-model="form.promo_inicio" type="datetime-local" class="fp-input" />
                </div>
                <div class="fp-field">
                  <label class="fp-label">Fim</label>
                  <input v-model="form.promo_fim" type="datetime-local" class="fp-input" />
                </div>
              </div>
              <div v-if="form.preco_promo > 0 && form.valor_venda > form.preco_promo" class="fp-economy">
                <span class="material-symbols-outlined" style="font-size:16px">local_offer</span>
                Cliente economiza <strong>{{ Math.round((1 - form.preco_promo / form.valor_venda) * 100) }}%</strong> em relação ao preço normal
              </div>
            </div>
          </div>

          <!-- Foto do Produto -->
          <div class="fp-card fp-card--teal">
            <div class="fp-card-head">
              <span class="material-symbols-outlined fp-card-icon">photo_camera</span>
              <h3 class="fp-card-title">Foto do Produto</h3>
              <span class="fp-tag">Opcional</span>
            </div>
            <div class="fp-card-body fp-foto-body">

              <!-- Zona principal de drop/preview -->
              <div
                class="fp-foto-zone"
                :class="{
                  'fp-foto-zone--has':      form.foto_url || fotoPreview,
                  'fp-foto-zone--drag':     arrastando,
                  'fp-foto-zone--uploading': uploadandoFoto
                }"
                @click="!uploadandoFoto && !(form.foto_url || fotoPreview) && inputFoto.click()"
                @dragover.prevent="arrastando = true"
                @dragleave="arrastando = false"
                @drop.prevent="e => { arrastando = false; onFotoDrop(e); }"
              >
                <!-- Imagem -->
                <img
                  v-if="form.foto_url || fotoPreview"
                  :src="fotoPreview || form.foto_url"
                  class="fp-foto-img"
                  alt="Foto do produto"
                />

                <!-- Estado vazio -->
                <div v-else class="fp-foto-empty">
                  <div class="fp-foto-empty-icon">
                    <span class="material-symbols-outlined">add_photo_alternate</span>
                  </div>
                  <div class="fp-foto-empty-text">
                    <span class="fp-foto-empty-title">Arraste ou clique para adicionar</span>
                    <span class="fp-foto-empty-hint">JPG, PNG, WEBP — máx. 5 MB</span>
                  </div>
                </div>

                <!-- Overlay de upload -->
                <div v-if="uploadandoFoto" class="fp-foto-uploading">
                  <div class="fp-foto-upload-spinner"></div>
                  <span>Enviando…</span>
                </div>

                <!-- Overlay de hover quando tem imagem -->
                <div v-else-if="form.foto_url || fotoPreview" class="fp-foto-hover-overlay">
                  <button type="button" class="fp-foto-action-btn" @click.stop="inputFoto.click()" title="Trocar foto">
                    <span class="material-symbols-outlined">photo_library</span>
                  </button>
                  <button type="button" class="fp-foto-action-btn fp-foto-action-btn--del" @click.stop="removerFoto" title="Remover foto">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <!-- Botões inferiores -->
              <div class="fp-foto-actions">
                <button type="button" class="fp-btn-foto-gallery" @click="inputFoto.click()" :disabled="uploadandoFoto">
                  <span class="material-symbols-outlined">photo_library</span>
                  {{ form.foto_url || fotoPreview ? 'Trocar foto' : 'Galeria' }}
                </button>
                <button type="button" class="fp-btn-foto-cam" @click="inputCamera.click()" :disabled="uploadandoFoto">
                  <span class="material-symbols-outlined">camera_alt</span>
                  Câmera
                </button>
                <button v-if="form.foto_url || fotoPreview" type="button" class="fp-btn-foto-rem" @click="removerFoto" :disabled="uploadandoFoto">
                  <span class="material-symbols-outlined">delete</span>
                  Remover
                </button>
              </div>

              <!-- Inputs ocultos -->
              <input ref="inputFoto"   type="file" accept="image/*"                    class="fp-foto-input-hidden" @change="onFotoSelecionada" />
              <input ref="inputCamera" type="file" accept="image/*" capture="environment" class="fp-foto-input-hidden" @change="onFotoSelecionada" />
            </div>
          </div>

        </div>

        <!-- Coluna secundária -->
        <div class="fp-col-side">

          <!-- Localização -->
          <div class="fp-card fp-card--amber">
            <div class="fp-card-head">
              <span class="material-symbols-outlined fp-card-icon">warehouse</span>
              <h3 class="fp-card-title">Localização no Estoque</h3>
            </div>
            <div class="fp-card-body">
              <div class="fp-field">
                <label class="fp-label">Armazém</label>
                <select v-model="form.armazem_pk" @change="form.endereco_armazem_pk = ''" class="fp-input">
                  <option value="">— Selecionar —</option>
                  <option v-for="a in armazens" :key="a.pk" :value="a.pk">{{ a.id }} — {{ a.localizacao }}</option>
                </select>
              </div>
              <div class="fp-field">
                <label class="fp-label">Posição</label>
                <select v-model="form.endereco_armazem_pk" :disabled="!form.armazem_pk || enderecosFiltrados.length === 0" class="fp-input">
                  <option value="">— Selecionar —</option>
                  <option v-for="e in enderecosFiltrados" :key="e.pk" :value="e.pk">
                    {{ e.codigo }}{{ e.descricao ? ` — ${e.descricao}` : '' }}
                  </option>
                </select>
                <small v-if="form.armazem_pk && enderecosFiltrados.length === 0" class="fp-hint">
                  Nenhum endereço cadastrado.
                  <router-link :to="`/armazens/${form.armazem_pk}/editar`" class="fp-link">Cadastrar agora</router-link>
                </small>
              </div>
              <div v-if="enderecoPreview" class="fp-location-preview">
                <span class="material-symbols-outlined" style="font-size:16px;color:#f59e0b">location_on</span>
                <span>
                  <strong>{{ enderecoPreview.armazem_id }}</strong>
                  <span class="fp-location-sep"> / </span>
                  <span>{{ enderecoPreview.codigo }}</span>
                  <span v-if="enderecoPreview.descricao" class="fp-location-desc"> — {{ enderecoPreview.descricao }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Fiscal -->
          <div class="fp-card fp-card--violet">
            <div class="fp-card-head">
              <span class="material-symbols-outlined fp-card-icon">receipt_long</span>
              <h3 class="fp-card-title">Dados Fiscais</h3>
            </div>
            <div class="fp-card-body">
              <div class="fp-field">
                <label class="fp-label">NCM</label>
                <input v-model="form.ncm" type="text" maxlength="8" placeholder="00000000" class="fp-input fp-input--mono" />
              </div>
              <div class="fp-grid fp-grid--2">
                <div class="fp-field">
                  <label class="fp-label">CFOP</label>
                  <input v-model="form.cfop" type="text" maxlength="4" placeholder="5102" class="fp-input fp-input--mono" />
                </div>
                <div class="fp-field">
                  <label class="fp-label">CSOSN</label>
                  <input v-model="form.csosn" type="text" maxlength="3" placeholder="400" class="fp-input fp-input--mono" />
                </div>
              </div>
              <details class="fp-ncm-details">
                <summary class="fp-ncm-summary">NCMs padrão da loja</summary>
                <div class="fp-ncm-list">
                  <button v-for="n in ncmsPadrao" :key="n.ncm" type="button" class="fp-ncm-item" @click="usarNcm(n)">
                    <span class="fp-ncm-cod">{{ n.ncm }}</span>
                    <span class="fp-ncm-desc">{{ n.descricao }}</span>
                    <span class="fp-ncm-use">Usar</span>
                  </button>
                </div>
              </details>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Erro ──────────────────────────────────────────────── -->
      <div v-if="erro" class="fp-erro">
        <span class="material-symbols-outlined" style="font-size:18px">error</span>
        {{ erro }}
      </div>

      <!-- ── Ações ─────────────────────────────────────────────── -->
      <div class="fp-actions">
        <button type="button" class="fp-btn-cancel" @click="$router.push(rotaVoltar)">Cancelar</button>
        <button type="submit" class="fp-btn-save" :disabled="salvando">
          <span v-if="salvando" class="fp-spin-xs"></span>
          <span class="material-symbols-outlined" v-else style="font-size:18px">save</span>
          {{ salvando ? 'Salvando…' : (pk ? 'Salvar Alterações' : 'Cadastrar Produto') }}
        </button>
      </div>

    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';
import api from '../services/api';

const route       = useRoute();
const router      = useRouter();
const sessaoStore = useSessaoStore();

const pk             = route.params.pk || null;
const carregando     = ref(!!pk);
const salvando        = ref(false);
const gerandoBarcode  = ref(false);
const saldoOriginal   = ref(null);
const inputFoto       = ref(null);
const inputCamera     = ref(null);
const fotoPreview     = ref('');
const uploadandoFoto  = ref(false);
const arrastando      = ref(false);

function calcEAN13(cod12) {
  const sum = [...cod12].reduce((acc, d, i) => acc + parseInt(d) * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

async function gerarCodigoBarras() {
  gerandoBarcode.value = true;
  try {
    for (let i = 0; i < 10; i++) {
      const parte = '789' + String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0');
      const codigo = parte + calcEAN13(parte);
      const { data } = await supabase.from('produtos').select('pk').eq('codigo_barras', codigo).maybeSingle();
      if (!data) { form.value.codigo_barras = codigo; return; }
    }
  } finally {
    gerandoBarcode.value = false;
  }
}

const rotaVoltar = route.query.pedido_pk
  ? `/pedidos-compra/${route.query.pedido_pk}/editar`
  : '/produtos';
const erro       = ref('');
const categorias = ref([]);
const armazens   = ref([]);
const todosEnderecos = ref([]);

const ncmsPadrao = [
  { ncm: '95059000', descricao: 'Artigos para festas, carnaval e diversões (balões, decorações)' },
  { ncm: '95030000', descricao: 'Brinquedos e jogos' },
  { ncm: '62114200', descricao: 'Fantasias e roupas especiais (fibras sintéticas)' },
  { ncm: '61149000', descricao: 'Fantasias e artigos de malha' },
  { ncm: '39269090', descricao: 'Artigos de plástico (acessórios, bijuterias plásticas)' },
  { ncm: '63079000', descricao: 'Outros artefatos têxteis (tiaras, laços, fitas)' },
  { ncm: '71179000', descricao: 'Bijuterias e adereços' },
  { ncm: '48192090', descricao: 'Embalagens de papel e papelão' },
  { ncm: '96170000', descricao: 'Garrafas térmicas e vasilhas para bebidas' },
];

function usarNcm(n) { form.value.ncm = n.ncm; }

async function comprimirImagem(file, maxPx = 900) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxPx) { h = Math.round(h * maxPx / w); w = maxPx; }
      if (h > maxPx) { w = Math.round(w * maxPx / h); h = maxPx; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(blob => resolve(blob), 'image/webp', 0.82);
    };
    img.src = url;
  });
}

async function uploadFoto(file) {
  if (file.size > 5 * 1024 * 1024) { erro.value = 'Foto maior que 5 MB.'; return; }
  fotoPreview.value = URL.createObjectURL(file);
  uploadandoFoto.value = true;
  try {
    const blob    = await comprimirImagem(file);
    const caminho = `${sessaoStore.filial?.pk || 0}/${Date.now()}.webp`;
    const { error: upErr } = await supabase.storage
      .from('produto-fotos')
      .upload(caminho, blob, { contentType: 'image/webp', upsert: true });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('produto-fotos').getPublicUrl(caminho);
    form.value.foto_url = data.publicUrl;
    fotoPreview.value   = data.publicUrl;
  } catch (e) {
    erro.value = 'Erro ao enviar foto: ' + e.message;
    fotoPreview.value = '';
  } finally {
    uploadandoFoto.value = false;
  }
}

function onFotoSelecionada(e) {
  const file = e.target.files[0];
  if (file) uploadFoto(file);
  e.target.value = '';
}

function onFotoDrop(e) {
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) uploadFoto(file);
}

function removerFoto() {
  form.value.foto_url = '';
  fotoPreview.value   = '';
}

const valorVendaDisplay = ref('');
const precoCustoDisplay = ref('');
const precoPromoDisplay = ref('');

function mascaraPreco(e, campo) {
  const digits = e.target.value.replace(/\D/g, '');
  const cents = parseInt(digits || '0', 10);
  const valor = cents / 100;
  form.value[campo] = valor;
  const display = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (campo === 'valor_venda') valorVendaDisplay.value = display;
  else if (campo === 'preco_custo') precoCustoDisplay.value = display;
  else if (campo === 'preco_promo') precoPromoDisplay.value = display;
}

function focusProximo(e) {
  const campos = Array.from(document.querySelectorAll('input:not([readonly]):not([disabled]), select, textarea'));
  const idx = campos.indexOf(e.target);
  if (idx >= 0 && idx < campos.length - 1) campos[idx + 1].focus();
}

const form = ref({
  codigo: '', codigo_barras: '', descricao: '',
  valor_venda: 0, preco_custo: 0, saldo: 0,
  ncm: '', cfop: '5102', csosn: '400', unidade_comercial: 'UN',
  categoria_pk: '',
  preco_promo: 0,
  promo_inicio: '',
  promo_fim: '',
  armazem_pk: '',
  endereco_armazem_pk: '',
  foto_url: '',
});

const enderecosFiltrados = computed(() =>
  todosEnderecos.value.filter(e => e.armazem_pk == form.value.armazem_pk)
);

const enderecoPreview = computed(() => {
  const e = todosEnderecos.value.find(e => e.pk == form.value.endereco_armazem_pk);
  if (!e) return null;
  const arm = armazens.value.find(a => a.pk == e.armazem_pk);
  return { ...e, armazem_id: arm?.id || '' };
});

const margem = computed(() => {
  const v = parseFloat(form.value.valor_venda || 0);
  const c = parseFloat(form.value.preco_custo || 0);
  if (!c || !v) return 0;
  return (((v - c) / c) * 100).toFixed(1);
});

const margemClass = computed(() => {
  const m = parseFloat(margem.value);
  if (m >= 30) return 'fp-margem--ok';
  if (m >= 10) return 'fp-margem--med';
  return 'fp-margem--baixa';
});

onMounted(async () => {
  let qCat = supabase.from('categorias').select('pk, nome').order('nome');
  if (sessaoStore.filial?.pk) qCat = qCat.eq('filial_pk', sessaoStore.filial.pk);
  const { data: cats } = await qCat;
  categorias.value = cats || [];

  let qArm = supabase.from('armazem').select('pk, id, localizacao').order('id');
  if (sessaoStore.filial?.codigo) qArm = qArm.eq('filial', sessaoStore.filial.codigo);
  const { data: arms } = await qArm;
  armazens.value = arms || [];

  const { data: ends } = await supabase.from('endereco_armazem').select('pk, armazem_pk, codigo, descricao').order('codigo');
  todosEnderecos.value = ends || [];

  if (!pk) {
    const filialPk = sessaoStore.filial?.pk || null;
    const { data: cod } = await supabase.rpc('proximo_codigo_produto', { p_filial_pk: filialPk });
    form.value.codigo = cod || '0001';
    if (route.query.descricao) {
      form.value.descricao = String(route.query.descricao);
    }
  }

  if (pk) {
    const { data, error } = await supabase.from('produtos').select('*').eq('pk', Number(pk)).single();
    if (error || !data) { erro.value = 'Produto não encontrado.'; carregando.value = false; return; }
    form.value = {
      ...data,
      categoria_pk:        data.categoria_pk        || '',
      armazem_pk:          data.armazem_pk          || '',
      endereco_armazem_pk: data.endereco_armazem_pk || '',
      promo_inicio:        isoParaDT(data.promo_inicio),
      promo_fim:           isoParaDT(data.promo_fim),
    };
    saldoOriginal.value = parseFloat(data.saldo || 0);
    const fmtBRL = v => parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    valorVendaDisplay.value = fmtBRL(data.valor_venda);
    precoCustoDisplay.value = fmtBRL(data.preco_custo);
    if (data.preco_promo) precoPromoDisplay.value = fmtBRL(data.preco_promo);
  }
  carregando.value = false;
});

function isoParaDT(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function salvar() {
  if (!form.value.descricao?.trim()) { erro.value = 'Descrição obrigatória.'; return; }
  salvando.value = true;
  erro.value = '';
  try {
    const payload = {
      codigo:            form.value.codigo            || null,
      codigo_barras:     form.value.codigo_barras     || null,
      descricao:         form.value.descricao.trim(),
      valor_venda:       parseFloat(form.value.valor_venda  || 0),
      preco_custo:       parseFloat(form.value.preco_custo  || 0),
      saldo:             parseInt(form.value.saldo           || 0, 10),
      ncm:               form.value.ncm               || null,
      cfop:              form.value.cfop              || '5102',
      csosn:             form.value.csosn             || '400',
      unidade_comercial: form.value.unidade_comercial || 'UN',
      categoria_pk:      form.value.categoria_pk      || null,
      armazem_pk:          form.value.armazem_pk          || null,
      endereco_armazem_pk: form.value.endereco_armazem_pk || null,
      filial_pk:           sessaoStore.filial?.pk         || null,
      preco_promo:  form.value.preco_promo > 0 ? parseFloat(form.value.preco_promo) : null,
      promo_inicio: form.value.promo_inicio ? new Date(form.value.promo_inicio).toISOString() : null,
      promo_fim:    form.value.promo_fim    ? new Date(form.value.promo_fim).toISOString()    : null,
      foto_url:     form.value.foto_url     || null,
    };

    let error, novoPk;
    if (pk) {
      // Update via backend para garantir auditoria de estoque no servidor
      try {
        await api.put(`/api/pdv/produto/${pk}`, payload);
      } catch (e) {
        error = e.response?.data || e;
      }
    } else {
      let inserted;
      ({ data: inserted, error } = await supabase.from('produtos').insert(payload).select('pk').single());
      if (error?.code === '23505' && error.message.includes('codigo')) {
        const filialPk = sessaoStore.filial?.pk || null;
        const { data: novoCod } = await supabase.rpc('proximo_codigo_produto', { p_filial_pk: filialPk });
        payload.codigo = novoCod || payload.codigo;
        form.value.codigo = payload.codigo;
        ({ data: inserted, error } = await supabase.from('produtos').insert(payload).select('pk').single());
      }
      novoPk = inserted?.pk;
    }
    if (error) throw error;

    const pedidoItemPk = route.query.pedido_item_pk;
    const pedidoPk    = route.query.pedido_pk;
    if (!pk && novoPk && pedidoItemPk) {
      await supabase
        .from('pedidos_compra_itens')
        .update({ produto_pk: novoPk, descricao_livre: null })
        .eq('pk', Number(pedidoItemPk));
      router.push(pedidoPk ? `/pedidos-compra/${pedidoPk}/editar` : '/pedidos-compra');
    } else {
      router.push('/produtos');
    }
  } catch (e) {
    erro.value = e.message;
  } finally {
    salvando.value = false;
  }
}
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────── */
.fp-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1060px;
}

/* ── Header ───────────────────────────────────────────────────── */
.fp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.fp-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.fp-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text2);
  cursor: pointer;
  transition: all .15s;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,.06);
}
[data-theme="dark"] .fp-back { background: var(--bg2); }
.fp-back:hover { border-color: #6366f1; color: #6366f1; background: rgba(99,102,241,.06); }
.fp-crumb-sep  { color: var(--border); font-size: .9rem; }
.fp-crumb-link {
  font-size: .875rem;
  color: var(--text2);
  cursor: pointer;
  transition: color .15s;
}
.fp-crumb-link:hover { color: #6366f1; }
.fp-crumb-current {
  font-size: .875rem;
  font-weight: 600;
  color: var(--text);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fp-badge-edit {
  font-size: .7rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(99,102,241,.12);
  color: #6366f1;
  border: 1px solid rgba(99,102,241,.25);
  text-transform: uppercase;
  letter-spacing: .5px;
}
.fp-badge-new {
  font-size: .7rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(16,185,129,.12);
  color: #10b981;
  border: 1px solid rgba(16,185,129,.25);
  text-transform: uppercase;
  letter-spacing: .5px;
}

/* ── Loading ──────────────────────────────────────────────────── */
.fp-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4rem 2rem;
  color: var(--text2);
  font-size: .9rem;
}
.fp-spinner {
  width: 22px; height: 22px;
  border: 2.5px solid rgba(99,102,241,.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: fp-spin .7s linear infinite;
  flex-shrink: 0;
}

/* ── Layout ───────────────────────────────────────────────────── */
.fp-form  { display: flex; flex-direction: column; gap: 16px; }
.fp-cols  { display: grid; grid-template-columns: 1fr 360px; gap: 16px; align-items: start; }
.fp-col-main { display: flex; flex-direction: column; gap: 16px; }
.fp-col-side { display: flex; flex-direction: column; gap: 16px; }

/* ── Foto ── */
.fp-card--teal .fp-card-head { background: rgba(20,184,166,.07); }
.fp-card--teal .fp-card-icon { color: #14b8a6; }
.fp-foto-body { gap: 12px; }

.fp-foto-zone {
  position: relative;
  width: 100%;
  height: 210px;
  border-radius: 12px;
  border: 2px dashed var(--border);
  background: var(--bg);
  overflow: hidden;
  cursor: pointer;
  transition: border-color .2s, background .2s;
}
.fp-foto-zone:hover:not(.fp-foto-zone--uploading):not(.fp-foto-zone--has) {
  border-color: #14b8a6;
  background: rgba(20,184,166,.03);
}
.fp-foto-zone--drag {
  border-color: #14b8a6 !important;
  background: rgba(20,184,166,.06) !important;
  border-style: solid;
}
.fp-foto-zone--has   { border-style: solid; cursor: default; }
.fp-foto-zone--uploading { cursor: not-allowed; }

.fp-foto-img { width: 100%; height: 100%; object-fit: contain; display: block; background: var(--bg2); }

/* Estado vazio */
.fp-foto-empty {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  pointer-events: none;
}
.fp-foto-empty-icon {
  width: 56px; height: 56px; border-radius: 16px;
  background: rgba(20,184,166,.1);
  display: flex; align-items: center; justify-content: center;
  transition: transform .2s;
}
.fp-foto-zone:hover .fp-foto-empty-icon { transform: scale(1.1); }
.fp-foto-empty-icon .material-symbols-outlined { font-size: 28px; color: #14b8a6; }
.fp-foto-empty-text { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.fp-foto-empty-title { font-size: 13.5px; font-weight: 600; color: var(--text2); }
.fp-foto-empty-hint  { font-size: 11.5px; color: var(--text2); opacity: .55; }

/* Overlay de upload */
.fp-foto-uploading {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.52);
  backdrop-filter: blur(4px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  color: #fff; font-size: 13px; font-weight: 600;
}
.fp-foto-upload-spinner {
  width: 32px; height: 32px;
  border: 3px solid rgba(255,255,255,.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: fp-spin .7s linear infinite;
}

/* Overlay de hover (com imagem) */
.fp-foto-hover-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.38);
  backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center; gap: 10px;
  opacity: 0; transition: opacity .2s;
}
.fp-foto-zone:hover .fp-foto-hover-overlay { opacity: 1; }
.fp-foto-action-btn {
  width: 46px; height: 46px; border-radius: 12px;
  background: rgba(255,255,255,.94);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #374151;
  transform: translateY(8px);
  transition: transform .2s, background .15s, color .15s;
}
.fp-foto-zone:hover .fp-foto-action-btn { transform: translateY(0); }
.fp-foto-action-btn .material-symbols-outlined { font-size: 20px; }
.fp-foto-action-btn:hover { background: #fff; transform: scale(1.08) !important; }
.fp-foto-action-btn--del { color: #ef4444; }
.fp-foto-action-btn--del:hover { background: #fff0f0; }

/* Botões inferiores */
.fp-foto-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.fp-btn-foto-gallery {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  background: rgba(20,184,166,.08); border: 1.5px solid rgba(20,184,166,.25); border-radius: 9px;
  color: #0d9488; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.fp-btn-foto-gallery:hover:not(:disabled) { background: rgba(20,184,166,.16); border-color: #14b8a6; }
.fp-btn-foto-gallery:disabled { opacity: .4; cursor: not-allowed; }
.fp-btn-foto-gallery .material-symbols-outlined { font-size: 16px; }

.fp-btn-foto-cam {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  background: rgba(99,102,241,.08); border: 1.5px solid rgba(99,102,241,.25); border-radius: 9px;
  color: #6366f1; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.fp-btn-foto-cam:hover:not(:disabled) { background: rgba(99,102,241,.16); border-color: #6366f1; }
.fp-btn-foto-cam:disabled { opacity: .4; cursor: not-allowed; }
.fp-btn-foto-cam .material-symbols-outlined { font-size: 16px; }

.fp-btn-foto-rem {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  background: rgba(239,68,68,.06); border: 1.5px solid rgba(239,68,68,.2); border-radius: 9px;
  color: #ef4444; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .15s;
  margin-left: auto;
}
.fp-btn-foto-rem:hover:not(:disabled) { background: rgba(239,68,68,.14); border-color: #ef4444; }
.fp-btn-foto-rem:disabled { opacity: .4; cursor: not-allowed; }
.fp-btn-foto-rem .material-symbols-outlined { font-size: 16px; }

.fp-foto-input-hidden { display: none; }

/* ── Cards ────────────────────────────────────────────────────── */
.fp-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
[data-theme="dark"] .fp-card { background: var(--bg2); }

/* Cabeçalho colorido do card */
.fp-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 20px;
  border-bottom: 1px solid var(--border);
}
.fp-card--indigo  .fp-card-head { background: rgba(99,102,241,.07); }
.fp-card--emerald .fp-card-head { background: rgba(16,185,129,.07); }
.fp-card--rose    .fp-card-head { background: rgba(244,63,94,.07); }
.fp-card--amber   .fp-card-head { background: rgba(245,158,11,.07); }
.fp-card--violet  .fp-card-head { background: rgba(139,92,246,.07); }

/* Corpo do card */
.fp-card-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px 20px;
}

.fp-card-icon { font-size: 20px; }
.fp-card--indigo .fp-card-icon  { color: #6366f1; }
.fp-card--emerald .fp-card-icon { color: #10b981; }
.fp-card--rose    .fp-card-icon { color: #f43f5e; }
.fp-card--amber   .fp-card-icon { color: #f59e0b; }
.fp-card--violet  .fp-card-icon { color: #8b5cf6; }

.fp-card-title {
  margin: 0;
  font-size: .92rem;
  font-weight: 700;
  color: var(--text);
}
.fp-card-sub {
  font-size: .8rem;
  color: var(--text2);
  line-height: 1.5;
}
.fp-tag {
  font-size: .62rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(99,102,241,.1);
  border: 1px solid rgba(99,102,241,.2);
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: .4px;
  margin-left: auto;
}

/* ── Grids ────────────────────────────────────────────────────── */
.fp-grid { display: grid; gap: 12px; }
.fp-grid--2 { grid-template-columns: 1fr 1fr; }
.fp-grid--3 { grid-template-columns: 1fr 1fr 1fr; }


/* ── Fields & Inputs ──────────────────────────────────────────── */
.fp-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.fp-label {
  font-size: .72rem;
  font-weight: 700;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: .4px;
}
.fp-required { color: #f43f5e; }
.fp-input {
  padding: .52rem .8rem;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: .88rem;
  background: #fff;
  color: var(--text);
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  width: 100%;
  box-sizing: border-box;
}
[data-theme="dark"] .fp-input { background: var(--bg3); }
.fp-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,.1);
}
.fp-input--lg   { font-size: .95rem; padding: .6rem .85rem; }
.fp-input--mono { font-family: monospace; letter-spacing: .5px; }
.fp-barcode-wrap { display: flex; gap: 6px; align-items: center; }
.fp-barcode-wrap .fp-input { flex: 1; }
.fp-btn-gen-barcode {
  flex-shrink: 0; width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--primary); border-radius: 8px;
  background: transparent; color: var(--primary);
  cursor: pointer; transition: all .15s;
}
.fp-btn-gen-barcode:hover:not(:disabled) { background: var(--primary); color: #fff; }
.fp-btn-gen-barcode:disabled { opacity: .4; cursor: not-allowed; }

.fp-input--locked {
  opacity: .55;
  cursor: not-allowed;
  background: var(--bg2) !important;
}
select.fp-input { cursor: pointer; }
select.fp-input:disabled { opacity: .5; cursor: not-allowed; }

/* Prefix (R$) */
.fp-input-prefix-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.fp-prefix {
  position: absolute;
  left: .75rem;
  font-size: .8rem;
  font-weight: 700;
  color: var(--text2);
  pointer-events: none;
  user-select: none;
}
.fp-input--has-prefix { padding-left: 2.1rem; }

.fp-hint { font-size: .75rem; color: var(--text2); margin-top: 2px; }
.fp-link { color: #6366f1; text-decoration: none; }
.fp-link:hover { text-decoration: underline; }

/* ── Margem de lucro ──────────────────────────────────────────── */
.fp-margem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid;
}
.fp-margem--ok    { background: rgba(16,185,129,.07); border-color: rgba(16,185,129,.25); color: #059669; }
.fp-margem--med   { background: rgba(245,158,11,.07); border-color: rgba(245,158,11,.25); color: #d97706; }
.fp-margem--baixa { background: rgba(244,63,94,.07);  border-color: rgba(244,63,94,.25);  color: #e11d48; }
.fp-margem-label  { font-size: .75rem; font-weight: 600; opacity: .75; flex: 1; }
.fp-margem-val    { font-size: 1.15rem; font-weight: 800; font-family: monospace; }
.fp-margem-hint   { font-size: .75rem; font-weight: 700; }

/* ── Economy display ──────────────────────────────────────────── */
.fp-economy {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  background: rgba(16,185,129,.07);
  border: 1px solid rgba(16,185,129,.2);
  border-radius: 10px;
  font-size: .82rem;
  color: #059669;
}

/* ── Location preview ─────────────────────────────────────────── */
.fp-location-preview {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  background: rgba(245,158,11,.06);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: 10px;
  font-size: .85rem;
  color: var(--text);
}
.fp-location-sep  { color: var(--text2); }
.fp-location-desc { color: #6366f1; font-weight: 600; }

/* ── NCM colapsável ───────────────────────────────────────────── */
.fp-ncm-details { margin-top: 2px; }
.fp-ncm-summary {
  font-size: .78rem;
  font-weight: 700;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: .4px;
  cursor: pointer;
  user-select: none;
  padding: 6px 0;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.fp-ncm-summary::before {
  content: '▸';
  font-size: .7rem;
  transition: transform .15s;
}
details[open] .fp-ncm-summary::before { transform: rotate(90deg); }
.fp-ncm-list  { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.fp-ncm-item  {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  cursor: pointer;
  text-align: left;
  transition: all .15s;
  width: 100%;
}
.fp-ncm-item:hover { border-color: #8b5cf6; background: rgba(139,92,246,.04); }
.fp-ncm-cod  { font-family: monospace; font-size: .8rem; font-weight: 700; color: #8b5cf6; white-space: nowrap; min-width: 72px; }
.fp-ncm-desc { font-size: .78rem; color: var(--text2); flex: 1; line-height: 1.35; }
.fp-ncm-use  { font-size: .7rem; font-weight: 700; color: #8b5cf6; white-space: nowrap; opacity: 0; transition: opacity .15s; }
.fp-ncm-item:hover .fp-ncm-use { opacity: 1; }

/* ── Erro ─────────────────────────────────────────────────────── */
.fp-erro {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e11d48;
  font-size: .85rem;
  background: rgba(244,63,94,.07);
  padding: .75rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(244,63,94,.2);
}

/* ── Ações ────────────────────────────────────────────────────── */
.fp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
  padding-bottom: 24px;
}
.fp-btn-cancel {
  padding: .6rem 1.3rem;
  background: #fff;
  color: var(--text);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  font-size: .88rem;
  font-weight: 600;
  transition: all .15s;
  box-shadow: 0 1px 2px rgba(0,0,0,.06);
}
[data-theme="dark"] .fp-btn-cancel { background: var(--bg2); }
.fp-btn-cancel:hover { border-color: #6366f1; color: #6366f1; }
.fp-btn-save {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: .6rem 1.6rem;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: .88rem;
  transition: opacity .15s, transform .1s;
}
.fp-btn-save:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.fp-btn-save:disabled { opacity: .45; cursor: not-allowed; }

/* ── Spinner ──────────────────────────────────────────────────── */
.fp-spin-xs {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  display: inline-block;
  animation: fp-spin .7s linear infinite;
}
@keyframes fp-spin { to { transform: rotate(360deg); } }

/* ── Responsivo ───────────────────────────────────────────────── */
@media (max-width: 780px) {
  .fp-cols  { grid-template-columns: 1fr; }
  .fp-grid--3 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 500px) {
  .fp-grid--2,
  .fp-grid--3 { grid-template-columns: 1fr; }
}
</style>
