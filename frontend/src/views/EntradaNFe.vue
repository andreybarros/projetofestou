<template>
  <div class="en-wrap">

    <!-- Cabeçalho -->
    <div class="en-header">
      <div class="en-header-left">
        <button @click="$router.push('/produtos')" class="btn-back">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 class="en-title">Entrada de NF-e</h1>
          <p class="en-sub">Importe o XML da nota fiscal para dar entrada no estoque automaticamente</p>
        </div>
      </div>
      <!-- Abas -->
      <div class="en-tabs">
        <button :class="['tab-btn', { active: aba === 'nova' }]" @click="aba = 'nova'">
          <span class="material-symbols-outlined">add_circle</span>
          Nova Entrada
        </button>
        <button :class="['tab-btn', { active: aba === 'historico' }]" @click="abrirHistorico">
          <span class="material-symbols-outlined">history</span>
          Histórico
        </button>
      </div>
    </div>

    <!-- ─── ABA: NOVA ENTRADA ─── -->
    <template v-if="aba === 'nova'">

      <!-- Steps indicator -->
      <div class="en-steps-bar">
        <div v-for="(s, i) in steps" :key="i" :class="['step-item', { active: step === i + 1, done: step > i + 1 }]">
          <div class="step-circle">
            <span v-if="step > i + 1" class="material-symbols-outlined" style="font-size:16px">check</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="step-label">{{ s }}</span>
          <div v-if="i < steps.length - 1" class="step-line"></div>
        </div>
      </div>

      <!-- STEP 1: Upload XML -->
      <div v-if="step === 1" class="animate-fade">
        <div
          class="upload-zone"
          :class="{ 'drag-over': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
          @click="$refs.fileInput.click()"
        >
          <input ref="fileInput" type="file" accept=".xml" @change="onFile" hidden />
          <span class="material-symbols-outlined upload-ico">upload_file</span>
          <p class="upload-title">Arraste o XML aqui ou clique para selecionar</p>
          <p class="upload-sub">Arquivo .xml da NF-e enviado pelo fornecedor</p>
        </div>

        <div v-if="erroXml" class="en-alert err" style="margin-top:1rem">
          <span class="material-symbols-outlined">error</span>
          {{ erroXml }}
        </div>

        <div v-if="parseando" class="en-info" style="margin-top:1rem">
          <div class="spin-sm"></div>
          Lendo XML...
        </div>
      </div>

      <!-- STEP 2: Conferência de itens -->
      <div v-if="step === 2" class="animate-fade">

        <!-- Info da NF -->
        <div class="nf-info-card en-card">
          <div class="nf-info-grid">
            <div class="nf-info-item">
              <span class="nf-info-label">Fornecedor</span>
              <span class="nf-info-val">{{ nf.fornecedor_nome || '—' }}</span>
            </div>
            <div class="nf-info-item">
              <span class="nf-info-label">CNPJ</span>
              <span class="nf-info-val mono">{{ fmtCnpj(nf.fornecedor_cnpj) }}</span>
            </div>
            <div class="nf-info-item">
              <span class="nf-info-label">Número NF</span>
              <span class="nf-info-val mono">{{ nf.numero_nf || '—' }}</span>
            </div>
            <div class="nf-info-item">
              <span class="nf-info-label">Data Emissão</span>
              <span class="nf-info-val">{{ fmtData(nf.data_emissao) }}</span>
            </div>
            <div class="nf-info-item">
              <span class="nf-info-label">Total NF</span>
              <span class="nf-info-val bold green">{{ fmt(nf.total_nf) }}</span>
            </div>
            <div class="nf-info-item">
              <span class="nf-info-label">Itens</span>
              <span class="nf-info-val">{{ itens.length }}</span>
            </div>
          </div>
        </div>

        <!-- Contador de vínculos -->
        <div class="en-progress-bar">
          <div class="prog-item green">
            <span class="material-symbols-outlined">check_circle</span>
            {{ itensVinculados }} vinculados
          </div>
          <div class="prog-item amber">
            <span class="material-symbols-outlined">link_off</span>
            {{ itensPendentes }} sem vínculo
          </div>
          <div v-if="itensPendentes > 0" class="prog-hint">
            Selecione o produto correspondente para os itens pendentes
          </div>
        </div>

        <!-- Tabela de itens -->
        <div class="en-card table-card">
          <table class="en-table">
            <thead>
              <tr>
                <th>Cód. Fornecedor</th>
                <th>Descrição na NF</th>
                <th class="text-right">Qtd</th>
                <th class="text-right">Preço Unit.</th>
                <th>Produto no Sistema</th>
                <th class="text-right">Saldo Atual</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in itens" :key="idx" :class="it.produto_pk ? 'row-ok' : 'row-pendente'">
                <td class="mono td-cod">{{ it.codigo_fornecedor }}</td>
                <td class="td-desc">{{ it.descricao_fornecedor }}</td>
                <td class="text-right mono bold">{{ it.qtd }}</td>
                <td class="text-right mono">{{ fmt(it.preco_unit) }}</td>
                <td class="td-produto">
                  <div v-if="it.produto_pk" class="prod-vinculado">
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span class="prod-nome">{{ it.produto_descricao }}</span>
                    <button class="btn-desvincular" @click="desvincular(idx)" title="Trocar produto">
                      <span class="material-symbols-outlined">swap_horiz</span>
                    </button>
                  </div>
                  <div v-else class="prod-busca">
                    <input
                      v-model="it._busca"
                      type="text"
                      placeholder="Buscar produto..."
                      class="busca-prod"
                      @input="filtrarProdutos(idx)"
                      @focus="it._dropOpen = true"
                      @blur="fecharDrop(idx)"
                    />
                    <div v-if="it._dropOpen && it._resultados?.length" class="prod-drop">
                      <button
                        v-for="p in it._resultados"
                        :key="p.pk"
                        class="prod-drop-item"
                        @mousedown.prevent="vincular(idx, p)"
                      >
                        <span class="drop-desc">{{ p.descricao }}</span>
                        <span class="drop-cod">{{ p.codigo || '—' }}</span>
                        <span class="drop-saldo">Saldo: {{ p.saldo }}</span>
                      </button>
                    </div>
                  </div>
                </td>
                <td class="text-right">
                  <span v-if="it.produto_pk !== null" :class="['saldo-chip', (it.saldo_atual || 0) <= 0 ? 'zero' : 'ok']">
                    {{ it.saldo_atual ?? '—' }}
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vínculo com Pedido de Compra -->
        <div class="en-card pedido-link-card">
          <div class="pedido-link-header">
            <span class="material-symbols-outlined" style="color:#f59e0b;font-size:20px">shopping_cart</span>
            <span class="pedido-link-title">Vincular a Pedido de Compra</span>
            <span class="pedido-link-hint">(opcional)</span>
          </div>
          <select v-model="pedidoLinkPk" class="pedido-link-select">
            <option :value="null">Nenhum — entrada avulsa</option>
            <option v-for="p in pedidosAbertos" :key="p.pk" :value="p.pk">
              #{{ p.numero }} — {{ p.fornecedores?.nome || 'Sem fornecedor' }}
              ({{ labelStatusPedido(p.status) }})
            </option>
          </select>
        </div>

        <!-- Ações -->
        <div class="en-actions">
          <button class="btn-ghost" @click="step = 1">Voltar</button>
          <button
            class="btn-primary"
            :disabled="itensVinculados === 0 || confirmando"
            @click="confirmar"
          >
            <span v-if="confirmando" class="spin-sm"></span>
            <span v-else class="material-symbols-outlined">inventory</span>
            Confirmar Entrada ({{ itensVinculados }} {{ itensVinculados === 1 ? 'item' : 'itens' }})
          </button>
        </div>

        <div v-if="itensPendentes > 0" class="en-alert warn">
          <span class="material-symbols-outlined">warning</span>
          {{ itensPendentes }} {{ itensPendentes === 1 ? 'item não vinculado será ignorado' : 'itens não vinculados serão ignorados' }} na entrada.
        </div>
      </div>

      <!-- STEP 3: Sucesso -->
      <div v-if="step === 3" class="en-card en-sucesso animate-fade">
        <span class="material-symbols-outlined sucesso-icon">check_circle</span>
        <h2>Entrada registrada!</h2>
        <p>O estoque foi atualizado com sucesso.</p>
        <div class="sucesso-stats">
          <div class="stat-box">
            <span class="stat-val">{{ resultado.itens_atualizados }}</span>
            <span class="stat-label">Produtos atualizados</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">{{ nf.numero_nf || '—' }}</span>
            <span class="stat-label">Número da NF</span>
          </div>
          <div class="stat-box">
            <span class="stat-val green">{{ fmt(nf.total_nf) }}</span>
            <span class="stat-label">Total da NF</span>
          </div>
        </div>
        <div class="sucesso-actions">
          <button class="btn-ghost" @click="abrirHistorico">Ver Histórico</button>
          <button class="btn-primary" @click="reiniciar">Nova Entrada</button>
        </div>
      </div>

    </template>

    <!-- ─── ABA: HISTÓRICO ─── -->
    <template v-if="aba === 'historico'">
      <div v-if="carregandoHist" class="en-info" style="margin-top:2rem; justify-content:center">
        <div class="spin-sm" style="border-top-color:var(--primary)"></div>
        Carregando histórico...
      </div>

      <div v-else-if="historico.length === 0" class="en-card" style="text-align:center;padding:3rem;color:var(--text2)">
        <span class="material-symbols-outlined" style="font-size:3rem;opacity:.3;display:block;margin-bottom:.75rem">inbox</span>
        <p>Nenhuma entrada registrada ainda.</p>
      </div>

      <div v-else class="en-card table-card animate-fade">
        <table class="en-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Fornecedor</th>
              <th>CNPJ</th>
              <th>NF</th>
              <th class="text-right">Itens</th>
              <th class="text-right">Total NF</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in historico" :key="e.pk">
              <td class="mono" style="white-space:nowrap">{{ fmtDataHora(e.criado_em) }}</td>
              <td>
                <span class="fornec-nome">{{ e.fornecedor_nome || '—' }}</span>
              </td>
              <td class="mono td-cod">{{ fmtCnpj(e.fornecedor_cnpj) }}</td>
              <td class="mono">{{ e.numero_nf || '—' }}</td>
              <td class="text-right">
                <span class="badge-itens">{{ e.qtd_itens }}</span>
              </td>
              <td class="text-right mono bold green">{{ fmt(e.total_nf) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" :class="['en-toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';
import api from '../services/api';

const router      = useRouter();
const sessao      = useSessaoStore();

const aba         = ref('nova');
const step        = ref(1);
const isDragging  = ref(false);
const parseando   = ref(false);
const confirmando = ref(false);
const erroXml     = ref('');
const toastMsg    = ref('');
const toastTipo   = ref('ok');
let   toastTimer  = null;

const carregandoHist = ref(false);
const historico      = ref([]);
const pedidoLinkPk   = ref(null);
const pedidosAbertos = ref([]);

const steps = ['Upload XML', 'Conferência', 'Concluído'];

const nf = ref({
  fornecedor_cnpj: '',
  fornecedor_nome: '',
  numero_nf: '',
  chave_nfe: '',
  data_emissao: '',
  total_nf: 0,
});

const itens       = ref([]);
const resultado   = ref({});
const todosProdos = ref([]);

const itensVinculados = computed(() => itens.value.filter(i => i.produto_pk).length);
const itensPendentes  = computed(() => itens.value.filter(i => !i.produto_pk).length);

onMounted(carregarProdutos);

async function carregarProdutos() {
  const fil = sessao.filial?.pk;
  if (!fil) return;
  const { data } = await supabase
    .from('produtos')
    .select('pk, descricao, codigo, saldo')
    .eq('filial_pk', fil)
    .order('descricao');
  todosProdos.value = data || [];
}

async function abrirHistorico() {
  aba.value = 'historico';
  carregandoHist.value = true;
  try {
    const { data } = await api.get(`/api/estoque/entrada-nf/historico/${sessao.filial.pk}`);
    historico.value = data.entradas || [];
  } catch (err) {
    toast('Erro ao carregar histórico: ' + (err.response?.data?.erro || err.message), 'err');
  } finally {
    carregandoHist.value = false;
  }
}

function toast(msg, tipo = 'ok', dur = 4000) {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, dur);
}

function onDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files[0];
  if (file) processarArquivo(file);
}

function onFile(e) {
  const file = e.target.files[0];
  if (file) processarArquivo(file);
}

function processarArquivo(file) {
  if (!file.name.endsWith('.xml')) {
    erroXml.value = 'Selecione um arquivo .xml válido.';
    return;
  }
  erroXml.value = '';
  parseando.value = true;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const xmlStr = e.target.result;
      const dados  = parseNFeXML(xmlStr);
      nf.value = {
        fornecedor_cnpj: dados.fornecedor_cnpj,
        fornecedor_nome: dados.fornecedor_nome,
        numero_nf:       dados.numero_nf,
        chave_nfe:       dados.chave_nfe,
        data_emissao:    dados.data_emissao,
        total_nf:        dados.total_nf,
      };
      await buscarPreview(dados.itens);
      step.value = 2;
    } catch (err) {
      erroXml.value = 'Erro ao ler XML: ' + err.message;
    } finally {
      parseando.value = false;
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function parseNFeXML(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  const gt  = (el, tag) => el?.querySelector(tag)?.textContent?.trim() || '';

  const infNFe = doc.querySelector('infNFe');
  if (!infNFe) throw new Error('infNFe não encontrado — verifique se o arquivo é uma NF-e válida.');

  const emit = infNFe.querySelector('emit');
  const ide  = infNFe.querySelector('ide');
  const tot  = infNFe.querySelector('total ICMSTot');

  const dhEmi = gt(ide, 'dhEmi') || gt(ide, 'dEmi');
  const dataEmissao = dhEmi ? dhEmi.split('T')[0] : '';

  const chaveEl = doc.querySelector('infProt chNFe') || doc.querySelector('chNFe');

  const dets  = Array.from(infNFe.querySelectorAll('det'));
  const itens = dets.map(det => {
    const prod = det.querySelector('prod');
    return {
      codigo_fornecedor:    gt(prod, 'cProd'),
      cean:                 gt(prod, 'cEAN'),
      descricao_fornecedor: gt(prod, 'xProd'),
      qtd:                  parseFloat(gt(prod, 'qCom') || '0'),
      preco_unit:           parseFloat(gt(prod, 'vUnCom') || '0'),
      total_item:           parseFloat(gt(prod, 'vProd') || '0'),
    };
  });

  return {
    fornecedor_cnpj: gt(emit, 'CNPJ'),
    fornecedor_nome: gt(emit, 'xNome'),
    numero_nf:       gt(ide, 'nNF'),
    chave_nfe:       chaveEl?.textContent?.trim() || '',
    data_emissao:    dataEmissao,
    total_nf:        parseFloat(gt(tot, 'vNF') || '0'),
    itens,
  };
}

async function carregarPedidosAbertos() {
  try {
    const { data } = await api.get('/api/pedidos-compra', {
      params: { filial_pk: sessao.filial?.pk },
    });
    pedidosAbertos.value = (data.data || []).filter(p =>
      p.status === 'em_andamento' || p.status === 'comprado'
    );
  } catch { pedidosAbertos.value = []; }
}

function labelStatusPedido(s) {
  const m = { em_andamento: 'Em Andamento', comprado: 'Comprado' };
  return m[s] || s;
}

async function buscarPreview(itensXml) {
  carregarPedidosAbertos();
  try {
    const { data } = await api.post('/api/estoque/entrada-nf/preview', {
      filial_pk:       sessao.filial.pk,
      fornecedor_cnpj: nf.value.fornecedor_cnpj,
      itens:           itensXml,
    });
    itens.value = (data.itens || []).map(it => ({
      ...it,
      _busca:     '',
      _resultados: [],
      _dropOpen:  false,
    }));
  } catch (err) {
    throw new Error('Erro ao buscar vínculos: ' + (err.response?.data?.erro || err.message));
  }
}

function filtrarProdutos(idx) {
  const it  = itens.value[idx];
  const q   = (it._busca || '').trim().toLowerCase();
  if (!q) { it._resultados = []; return; }
  const palavras = q.split(/\s+/).filter(Boolean);
  it._resultados = todosProdos.value.filter(p => {
    const desc = (p.descricao || '').toLowerCase();
    const cod  = (p.codigo   || '').toLowerCase();
    if (cod.includes(q)) return true;
    return palavras.every(w => desc.includes(w));
  }).slice(0, 8);
}

function vincular(idx, produto) {
  const it = itens.value[idx];
  it.produto_pk        = produto.pk;
  it.produto_descricao = produto.descricao;
  it.saldo_atual       = produto.saldo;
  it._busca            = '';
  it._resultados       = [];
  it._dropOpen         = false;
}

function desvincular(idx) {
  const it = itens.value[idx];
  it.produto_pk        = null;
  it.produto_descricao = null;
  it.saldo_atual       = null;
  it._busca            = '';
}

function fecharDrop(idx) {
  setTimeout(() => {
    if (itens.value[idx]) itens.value[idx]._dropOpen = false;
  }, 150);
}

async function confirmar() {
  const vinculados = itens.value.filter(i => i.produto_pk);
  if (!vinculados.length) return;

  confirmando.value = true;
  try {
    const { data } = await api.post('/api/estoque/entrada-nf/confirmar', {
      filial_pk:       sessao.filial.pk,
      fornecedor_cnpj: nf.value.fornecedor_cnpj,
      fornecedor_nome: nf.value.fornecedor_nome,
      numero_nf:       nf.value.numero_nf,
      chave_nfe:       nf.value.chave_nfe,
      data_emissao:    nf.value.data_emissao,
      total_nf:        nf.value.total_nf,
      itens:           vinculados.map(it => ({
        codigo_fornecedor:    it.codigo_fornecedor,
        descricao_fornecedor: it.descricao_fornecedor,
        qtd:                  it.qtd,
        preco_custo:          it.preco_unit,
        total_item:           it.total_item,
        produto_pk:           it.produto_pk,
      })),
    });
    resultado.value = data;

    if (pedidoLinkPk.value) {
      try {
        await api.patch(`/api/pedidos-compra/${pedidoLinkPk.value}/status`, {
          status:          'finalizado',
          nf_numero:       nf.value.numero_nf       || null,
          nf_chave:        nf.value.chave_nfe        || null,
          nf_fornecedor:   nf.value.fornecedor_nome  || null,
          nf_data_entrada: nf.value.data_emissao     || null,
          nf_valor:        nf.value.total_nf         || null,
        });
      } catch { /* vínculo falhou silenciosamente — não impede a entrada */ }
    }

    step.value = 3;
  } catch (err) {
    toast('Erro ao confirmar: ' + (err.response?.data?.erro || err.message), 'err');
  } finally {
    confirmando.value = false;
  }
}

function reiniciar() {
  step.value       = 1;
  itens.value      = [];
  resultado.value  = {};
  erroXml.value    = '';
  pedidoLinkPk.value = null;
  pedidosAbertos.value = [];
  nf.value = { fornecedor_cnpj: '', fornecedor_nome: '', numero_nf: '', chave_nfe: '', data_emissao: '', total_nf: 0 };
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmtCnpj(v) {
  if (!v || v.length < 14) return v || '—';
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function fmtData(d) {
  if (!d) return '—';
  return d.split('-').reverse().join('/');
}

function fmtDataHora(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.en-wrap { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 4rem; }

/* Header */
.en-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.en-header-left { display: flex; align-items: center; gap: 1.25rem; }
.btn-back { background: var(--bg2); border: 1px solid var(--border); padding: 8px; border-radius: 12px; cursor: pointer; color: var(--text); display: flex; align-items: center; justify-content: center; transition: all .2s; }
.btn-back:hover { background: var(--bg3); border-color: var(--primary); }
.en-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--text); }
.en-sub   { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }

/* Abas */
.en-tabs { display: flex; gap: .5rem; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: .55rem 1.1rem; border-radius: 10px; border: 1px solid var(--border); background: var(--bg2); color: var(--text2); font-size: .85rem; font-weight: 600; cursor: pointer; transition: all .2s; }
.tab-btn .material-symbols-outlined { font-size: 18px; }
.tab-btn:hover { background: var(--bg3); color: var(--text); }
.tab-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; }

/* Steps */
.en-steps-bar { display: flex; align-items: center; gap: 0; }
.step-item { display: flex; align-items: center; gap: 8px; position: relative; }
.step-line { width: 40px; height: 2px; background: var(--border); margin: 0 4px; }
.step-circle { width: 28px; height: 28px; border-radius: 50%; background: var(--bg3); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 800; color: var(--text2); flex-shrink: 0; }
.step-item.active .step-circle { background: var(--primary); border-color: var(--primary); color: #fff; }
.step-item.done .step-circle { background: #10b981; border-color: #10b981; color: #fff; }
.step-label { font-size: .75rem; font-weight: 600; color: var(--text2); white-space: nowrap; }
.step-item.active .step-label { color: var(--primary); font-weight: 700; }

/* Card base */
.en-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; }

/* Upload zone */
.upload-zone { background: var(--bg2); border: 2px dashed var(--border); border-radius: 16px; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 12px; cursor: pointer; transition: all .2s; text-align: center; }
.upload-zone:hover, .upload-zone.drag-over { border-color: var(--primary); background: rgba(99,102,241,.04); }
.upload-ico { font-size: 3.5rem; color: var(--primary); opacity: .7; }
.upload-title { font-size: 1.1rem; font-weight: 700; color: var(--text); margin: 0; }
.upload-sub   { font-size: .82rem; color: var(--text2); margin: 0; }

/* NF info */
.nf-info-card { padding: 1.25rem 1.5rem; }
.nf-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
.nf-info-item { display: flex; flex-direction: column; gap: 3px; }
.nf-info-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text2); }
.nf-info-val { font-size: .95rem; font-weight: 700; color: var(--text); }
.nf-info-val.green { color: #10b981; }

/* Progress bar */
.en-progress-bar { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; padding: .75rem 1rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; }
.prog-item { display: flex; align-items: center; gap: 6px; font-size: .85rem; font-weight: 700; }
.prog-item .material-symbols-outlined { font-size: 18px; }
.prog-item.green { color: #10b981; }
.prog-item.amber { color: #f59e0b; }
.prog-hint { font-size: .78rem; color: var(--text2); margin-left: auto; }

/* Table */
.table-card { padding: 0; overflow: hidden; }
.en-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
.en-table th { padding: .75rem 1rem; background: var(--bg3); font-size: .7rem; text-transform: uppercase; font-weight: 700; letter-spacing: .4px; color: var(--text2); border-bottom: 2px solid var(--border); text-align: left; }
.en-table td { padding: .7rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.en-table tr:last-child td { border-bottom: none; }
.en-table tbody tr:hover td { background: var(--bg3); }
.row-ok      { background: rgba(16,185,129,.04); }
.row-pendente { background: rgba(245,158,11,.04); }

.td-cod  { font-family: monospace; color: var(--text2); font-size: .8rem; white-space: nowrap; }
.td-desc { max-width: 200px; }
.td-produto { min-width: 240px; }

/* Produto vinculado */
.prod-vinculado { display: flex; align-items: center; gap: 8px; }
.check-icon { font-size: 18px; color: #10b981; flex-shrink: 0; }
.prod-nome { font-weight: 600; color: var(--text); flex: 1; font-size: .85rem; }
.btn-desvincular { background: none; border: none; cursor: pointer; color: var(--text2); display: flex; align-items: center; padding: 2px; border-radius: 4px; transition: color .15s; }
.btn-desvincular:hover { color: var(--primary); }
.btn-desvincular .material-symbols-outlined { font-size: 16px; }

/* Produto busca */
.prod-busca { position: relative; }
.busca-prod { width: 100%; padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); font-size: .85rem; outline: none; transition: border-color .15s; }
.busca-prod:focus { border-color: var(--primary); }
.prod-drop { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.18); z-index: 50; max-height: 220px; overflow-y: auto; }
.prod-drop-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: none; border: none; cursor: pointer; text-align: left; transition: background .1s; border-bottom: 1px solid var(--border); }
.prod-drop-item:last-child { border-bottom: none; }
.prod-drop-item:hover { background: rgba(99,102,241,.08); }
.drop-desc { flex: 1; font-size: .83rem; font-weight: 600; color: var(--text); }
.drop-cod  { font-size: .72rem; font-family: monospace; color: var(--text2); }
.drop-saldo { font-size: .72rem; color: var(--text2); white-space: nowrap; }

/* Saldo chip */
.saldo-chip { padding: 2px 8px; border-radius: 6px; font-size: .75rem; font-weight: 700; }
.saldo-chip.ok   { background: rgba(16,185,129,.12); color: #10b981; }
.saldo-chip.zero { background: rgba(239,68,68,.12); color: #ef4444; }

/* Histórico */
.fornec-nome { font-weight: 600; color: var(--text); font-size: .85rem; }
.badge-itens { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; font-size: .75rem; font-weight: 700; color: var(--text2); }

/* Ações */
.en-actions { display: flex; justify-content: flex-end; gap: 1rem; }

/* Alertas */
.en-alert { display: flex; align-items: center; gap: 10px; padding: .85rem 1.2rem; border-radius: 10px; font-size: .85rem; font-weight: 600; }
.en-alert .material-symbols-outlined { font-size: 20px; }
.en-alert.err  { background: rgba(239,68,68,.1); color: #ef4444; border: 1px solid rgba(239,68,68,.25); }
.en-alert.warn { background: rgba(245,158,11,.1); color: #d97706; border: 1px solid rgba(245,158,11,.25); }

/* Vínculo pedido de compra */
.pedido-link-card { padding: 14px 18px; }
.pedido-link-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.pedido-link-title { font-size: 13px; font-weight: 700; color: var(--text); }
.pedido-link-hint  { font-size: 12px; color: var(--text2); }
.pedido-link-select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); font-size: 13px; outline: none; }
.pedido-link-select:focus { border-color: var(--primary); }

.en-info { display: flex; align-items: center; gap: 10px; color: var(--text2); font-size: .85rem; }

/* Sucesso */
.en-sucesso { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 2rem; text-align: center; }
.sucesso-icon { font-size: 4rem; color: #10b981; }
.en-sucesso h2 { margin: 0; font-size: 1.75rem; font-weight: 800; color: var(--text); }
.en-sucesso p  { margin: 0; color: var(--text2); }
.sucesso-stats { display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center; margin: 1rem 0; }
.stat-box { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stat-val  { font-size: 1.5rem; font-weight: 800; color: var(--text); }
.stat-val.green { color: #10b981; }
.stat-label { font-size: .75rem; color: var(--text2); font-weight: 600; text-transform: uppercase; }
.sucesso-actions { display: flex; gap: 1rem; }

/* Botões */
.btn-primary { display: flex; align-items: center; gap: 8px; background: var(--primary); color: #fff; border: none; padding: .7rem 1.5rem; border-radius: 10px; font-weight: 700; font-size: .9rem; cursor: pointer; transition: opacity .15s; }
.btn-primary:hover:not(:disabled) { opacity: .88; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); padding: .7rem 1.5rem; border-radius: 10px; font-weight: 600; font-size: .9rem; cursor: pointer; transition: background .15s; }
.btn-ghost:hover { background: var(--bg3); }

/* Helpers */
.mono { font-family: monospace; }
.bold { font-weight: 800; }
.text-right { text-align: right; }
.text-muted { color: var(--text2); }
.green { color: #10b981; }

/* Spinners */
.spin-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.en-toast { position: fixed; bottom: 2.5rem; left: 50%; transform: translateX(-50%); background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: .9rem; box-shadow: 0 8px 24px rgba(0,0,0,.2); z-index: 300; white-space: nowrap; }
.en-toast.err { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #ef4444; }
.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

.animate-fade { animation: fadeIn .3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .en-steps-bar { display: none; }
  .nf-info-grid { grid-template-columns: 1fr 1fr; }
  .en-table th:nth-child(3), .en-table td:nth-child(3) { display: none; }
}
</style>
