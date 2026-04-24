<template>
  <div class="form-page">
    <div class="form-header">
      <button class="btn-back" @click="$router.push('/produtos')">
        <span class="material-symbols-outlined">arrow_back</span>
        Produtos
      </button>
      <div>
        <h1 class="page-title">{{ pk ? 'Editar Produto' : 'Novo Produto' }}</h1>
        <p class="page-sub">{{ pk ? 'Atualize as informações do produto' : 'Preencha os dados para cadastrar um novo produto' }}</p>
      </div>
    </div>

    <div v-if="carregando" class="loading">
      <div class="spin"></div>
      <span>Carregando...</span>
    </div>

    <form v-else @submit.prevent="salvar" class="form-body">

      <!-- ── Seção: Identificação ────────────────────────────── -->
      <div class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon" style="color:#6366f1">label</span>
          <h3 class="section-title">Identificação</h3>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Código Interno</label>
            <input v-model="form.codigo" type="text" placeholder="Ex: PROD001" />
          </div>
          <div class="field">
            <label>Código de Barras (EAN)</label>
            <input v-model="form.codigo_barras" type="text" placeholder="Ex: 7891234567890" />
          </div>
          <div class="field full">
            <label>Descrição *</label>
            <input v-model="form.descricao" type="text" required autofocus placeholder="Nome completo do produto" />
          </div>
          <div class="field">
            <label>Categoria</label>
            <select v-model="form.categoria_pk">
              <option value="">— Sem categoria —</option>
              <option v-for="c in categorias" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
            </select>
          </div>
          <div class="field">
            <label>Unidade</label>
            <input v-model="form.unidade_comercial" type="text" placeholder="UN" />
          </div>
        </div>
      </div>

      <!-- ── Seção: Preços e Estoque ───────────────────────── -->
      <div class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon" style="color:#10b981">payments</span>
          <h3 class="section-title">Preços & Estoque</h3>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Preço de Venda (R$)</label>
            <input v-model.number="form.valor_venda" type="number" step="0.01" min="0" />
          </div>
          <div class="field">
            <label>Preço de Custo (R$)</label>
            <input v-model.number="form.preco_custo" type="number" step="0.01" min="0" />
          </div>
          <div class="field">
            <label>Saldo em Estoque</label>
            <input v-model.number="form.saldo" type="number" step="0.01" />
          </div>
          <div class="field" v-if="form.valor_venda > 0 && form.preco_custo > 0">
            <label>Margem Lucro</label>
            <div class="margem-display" :class="margemClass">
              {{ margem }}%
            </div>
          </div>
        </div>
      </div>

      <!-- ── Seção: Promoção Relâmpago (NOVO) ──────────────── -->
      <div class="form-section promo-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon" style="color:#ef4444">bolt</span>
          <h3 class="section-title">Promoção Relâmpago</h3>
          <span class="badge-novo">OPCIONAL</span>
        </div>
        <p class="section-sub">Defina um preço especial que entrará em vigor automaticamente no período selecionado.</p>
        
        <div class="form-grid">
          <div class="field">
            <label>Preço Promocional (R$)</label>
            <input v-model.number="form.preco_promo" type="number" step="0.01" min="0" placeholder="0.00" />
          </div>
          <div class="field">
            <label>Início da Promoção</label>
            <input v-model="form.promo_inicio" type="datetime-local" />
          </div>
          <div class="field">
            <label>Fim da Promoção</label>
            <input v-model="form.promo_fim" type="datetime-local" />
          </div>
          <div class="field" v-if="form.preco_promo > 0">
            <label>Economia para o Cliente</label>
            <div class="economy-display" v-if="form.valor_venda > form.preco_promo">
              {{ Math.round((1 - form.preco_promo / form.valor_venda) * 100) }}% de desconto
            </div>
          </div>
        </div>
      </div>

      <!-- ── Seção: Localização no Estoque (NOVO) ──────────── -->
      <div class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon" style="color:#f59e0b">warehouse</span>
          <h3 class="section-title">Localização no Estoque</h3>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Armazém</label>
            <select v-model="form.armazem_pk" @change="form.endereco_armazem_pk = ''">
              <option value="">— Selecionar armazém —</option>
              <option v-for="a in armazens" :key="a.pk" :value="a.pk">
                {{ a.id }} — {{ a.localizacao }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>Endereço (Posição)</label>
            <select v-model="form.endereco_armazem_pk" :disabled="!form.armazem_pk || enderecosFiltrados.length === 0">
              <option value="">— Selecionar endereço —</option>
              <option v-for="e in enderecosFiltrados" :key="e.pk" :value="e.pk">
                {{ e.codigo }}{{ e.descricao ? ` — ${e.descricao}` : '' }}
              </option>
            </select>
            <small v-if="form.armazem_pk && enderecosFiltrados.length === 0" class="field-hint">
              Nenhum endereço cadastrado. 
              <router-link :to="`/armazens/${form.armazem_pk}/editar`" class="link-cadastrar">Cadastrar agora</router-link>
            </small>
          </div>
        </div>
        <!-- Preview -->
        <div v-if="enderecoPreview" class="armazem-preview">
          <span class="material-symbols-outlined" style="font-size:18px;color:#f59e0b">location_on</span>
          <span>
            <strong>{{ enderecoPreview.armazem_id }}</strong>
            <span style="color:var(--text2)"> / {{ enderecoPreview.codigo }}</span>
            <span v-if="enderecoPreview.descricao" class="preview-addr"> — {{ enderecoPreview.descricao }}</span>
          </span>
        </div>
      </div>

      <!-- ── Seção: Fiscal ──────────────────────────────────── -->
      <div class="form-section">
        <div class="section-header">
          <span class="material-symbols-outlined section-icon" style="color:#818cf8">receipt_long</span>
          <h3 class="section-title">Dados Fiscais</h3>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>NCM</label>
            <input v-model="form.ncm" type="text" maxlength="8" placeholder="00000000" />
          </div>
          <div class="field">
            <label>CFOP</label>
            <input v-model="form.cfop" type="text" maxlength="4" placeholder="5102" />
          </div>
          <div class="field">
            <label>CSOSN</label>
            <input v-model="form.csosn" type="text" maxlength="3" placeholder="400" />
          </div>
        </div>
      </div>

      <div v-if="erro" class="erro">{{ erro }}</div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="$router.push('/produtos')">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="salvando">
          <span v-if="salvando" class="spin-xs"></span>
          {{ salvando ? 'Salvando...' : (pk ? 'Salvar Alterações' : 'Cadastrar Produto') }}
        </button>
      </div>
      <div 
          style="margin-bottom: 20px;">
      </div>
    </form>
  </div>
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
const categorias = ref([]);
const armazens   = ref([]);
const todosEnderecos = ref([]);

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
});

const armazemSelecionado = computed(() =>
  armazens.value.find(a => a.pk === form.value.armazem_pk) || null
);

const enderecosFiltrados = computed(() =>
  // usa == para tolerar diferença de tipo (integer do banco vs string do select)
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
  if (m >= 30) return 'margem-ok';
  if (m >= 10) return 'margem-med';
  return 'margem-baixa';
});

onMounted(async () => {
  // Carrega categorias
  let qCat = supabase.from('categorias').select('pk, nome').order('nome');
  if (sessaoStore.filial?.pk) qCat = qCat.eq('filial_pk', sessaoStore.filial.pk);
  const { data: cats } = await qCat;
  categorias.value = cats || [];

  // Carrega armazéns e seus endereços
  let qArm = supabase.from('armazem').select('pk, id, localizacao').order('id');
  if (sessaoStore.filial?.codigo) qArm = qArm.eq('filial', sessaoStore.filial.codigo);
  const { data: arms } = await qArm;
  armazens.value = arms || [];

  const { data: ends } = await supabase.from('endereco_armazem').select('pk, armazem_pk, codigo, descricao').order('codigo');
  todosEnderecos.value = ends || [];

  // Carrega produto se edição
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
      saldo:             parseFloat(form.value.saldo        || 0),
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
    };

    let error;
    if (pk) {
      ({ error } = await supabase.from('produtos').update(payload).eq('pk', Number(pk)));
    } else {
      ({ error } = await supabase.from('produtos').insert(payload));
    }
    if (error) throw error;
    router.push('/produtos');
  } catch (e) {
    erro.value = e.message;
  } finally {
    salvando.value = false;
  }
}
</script>

<style scoped>
.form-page   { display: flex; flex-direction: column; gap: 1.5rem; max-width: 820px; }
.form-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.page-title  { margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--text); }
.page-sub    { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }

.btn-back { display: flex; align-items: center; gap: .4rem; padding: .5rem .9rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; color: var(--text2); font-size: .85rem; cursor: pointer; transition: all .15s; flex-shrink: 0; }
.btn-back:hover { color: var(--text); border-color: #6366f1; }

.loading  { display: flex; align-items: center; gap: 12px; padding: 3rem; color: var(--text2); }

/* Seções */
.form-body    { display: flex; flex-direction: column; gap: 16px; }
.form-section { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }

.section-header { display: flex; align-items: center; gap: 10px; }
.section-icon   { font-size: 22px; }
.section-title  { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); }

/* Grid de campos */
.form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field      { display: flex; flex-direction: column; gap: 5px; }
.field.full { grid-column: 1 / -1; }
.field label { font-size: .75rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .3px; }
.field input, .field select {
  padding: .55rem .8rem; border: 1px solid var(--border); border-radius: 9px;
  font-size: .9rem; background: var(--bg3); color: var(--text); outline: none;
  transition: border-color .15s;
}
.field input:focus, .field select:focus { border-color: #6366f1; }

/* Margem de lucro */
.margem-display { padding: .55rem .8rem; border-radius: 9px; font-size: 1rem; font-weight: 800; text-align: center; border: 2px solid; }
.margem-ok    { background: rgba(16,185,129,.1); color: #10b981; border-color: rgba(16,185,129,.3); }
.margem-med   { background: rgba(245,158,11,.1); color: #f59e0b; border-color: rgba(245,158,11,.3); }
.margem-baixa { background: rgba(239,68,68,.1);  color: #ef4444; border-color: rgba(239,68,68,.3); }

/* Preview armazém */
.armazem-preview {
  display: flex; align-items: center; gap: 10px;
  background: rgba(245,158,11,.06); border: 1px solid rgba(245,158,11,.2);
  border-radius: 10px; padding: 10px 14px; font-size: .88rem; color: var(--text);
}
.preview-addr { color: #6366f1; font-weight: 600; }

/* Ações */
.form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.btn-primary  { display: flex; align-items: center; gap: 7px; padding: .6rem 1.6rem; background: #6366f1; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .9rem; transition: opacity .15s; }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { opacity: .88; }
.btn-cancel   { padding: .6rem 1.2rem; background: var(--bg2); color: var(--text); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: .9rem; transition: all .15s; }
.btn-cancel:hover { border-color: #6366f1; color: #6366f1; }

.erro { color: #f87171; font-size: .85rem; background: rgba(220,38,38,.08); padding: .7rem 1rem; border-radius: 9px; border: 1px solid rgba(220,38,38,.2); }

.spin { width: 22px; height: 22px; border: 3px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.spin-xs { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Promoção */
.promo-section { border: 2px solid rgba(239,68,68,.15); background: rgba(239,68,68,.02); }
.section-sub { font-size: .82rem; color: var(--text2); margin: -5px 0 15px 34px; }
.badge-novo { font-size: .65rem; padding: 2px 8px; background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; color: var(--text2); font-weight: 700; margin-left: 8px; }
.economy-display { padding: .55rem .8rem; background: rgba(16,185,129,.1); color: #10b981; border-radius: 9px; font-weight: 800; font-size: .9rem; text-align: center; border: 1px solid rgba(16,185,129,.2); }

@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
  .field.full { grid-column: 1; }
}
</style>
