<template>
  <div class="fpc-root">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="fpc-header">
      <button class="fpc-back" @click="$router.push('/pedidos-compra')">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="fpc-header-info">
        <h1 class="fpc-title">{{ editando ? `Pedido #${form.numero}` : 'Novo Pedido de Compra' }}</h1>
        <p class="fpc-subtitle">{{ editando ? 'Edite os dados e itens do pedido' : 'Preencha os dados e adicione os produtos' }}</p>
      </div>
      <div class="fpc-header-right">
        <span v-if="editando" :class="['fpc-sc', `fpc-sc--${form.status}`]">{{ labelStatus(form.status) }}</span>
        <button class="fpc-btn-outline" @click="$router.push('/pedidos-compra')">Cancelar</button>
        <button class="fpc-btn-green" :disabled="salvando" @click="salvar">
          <span v-if="salvando" class="fpc-spin"></span>
          <span v-else class="material-symbols-outlined">save</span>
          {{ salvando ? 'Salvando...' : 'Salvar Pedido' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="carregando" class="fpc-loading">
      <span class="fpc-spin-lg"></span>
      Carregando...
    </div>

    <template v-else>

      <!-- ── Dados do Pedido ──────────────────────────────────── -->
      <div class="fpc-card">
        <h2 class="fpc-card-title">Dados do Pedido</h2>
        <div class="fpc-dados-grid">
          <div class="fpc-field">
            <label class="fpc-label">Nº do Pedido</label>
            <input :value="form.numero || '—'" readonly class="fpc-input fpc-input--locked" />
          </div>
          <div class="fpc-field">
            <label class="fpc-label">Status</label>
            <select v-model="form.status" class="fpc-input fpc-select">
              <option value="em_andamento">Em Andamento</option>
              <option value="comprado">Comprado</option>
              <option value="cancelado">Cancelado</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
          <div class="fpc-field fpc-field--span2">
            <label class="fpc-label">Fornecedor</label>
            <div class="fpc-forn-wrap">
              <span class="material-symbols-outlined fpc-forn-ico">search</span>
              <input
                v-model="fornecedorBusca"
                type="text"
                class="fpc-input fpc-input--search"
                :placeholder="nomeFornecedorSelecionado || 'Buscar fornecedor...'"
                @focus="fornDropOpen = true"
                @blur="fecharFornDrop"
              />
              <button v-if="form.fornecedor_pk" class="fpc-forn-clear" @mousedown.prevent="selecionarFornecedor(null)">
                <span class="material-symbols-outlined">close</span>
              </button>
              <div v-if="fornDropOpen" class="fpc-forn-drop">
                <div class="fpc-forn-item fpc-forn-item--none" @mousedown.prevent="selecionarFornecedor(null)">
                  <span class="material-symbols-outlined" style="font-size:14px;color:var(--text2)">remove_circle_outline</span>
                  Sem fornecedor
                </div>
                <div
                  v-for="f in fornecedoresFiltrados" :key="f.pk"
                  class="fpc-forn-item"
                  @mousedown.prevent="selecionarFornecedor(f)"
                >{{ f.nome }}</div>
                <div v-if="!fornecedoresFiltrados.length && fornecedorBusca.trim()" class="fpc-forn-empty">
                  Nenhum fornecedor encontrado
                </div>
              </div>
            </div>
          </div>
          <div class="fpc-field fpc-field--full">
            <label class="fpc-label">Observação</label>
            <textarea v-model="form.observacao" class="fpc-input fpc-textarea" rows="3" placeholder="Observações gerais sobre o pedido..."></textarea>
          </div>
        </div>
      </div>

      <!-- ── Item Avulso (Não Cadastrado) ────────────────────── -->
      <div class="fpc-card fpc-card--livre">
        <div class="fpc-card-top-row">
          <h2 class="fpc-card-title" style="margin:0;color:#6366f1">
            <span class="material-symbols-outlined">add_circle_outline</span>
            Item Não Cadastrado
          </h2>
          <span class="fpc-tag-opcional">Opcional</span>
        </div>
        <p class="fpc-card-sub">Adicione produtos que ainda não estão no catálogo. Poderão ser cadastrados depois diretamente pelo pedido.</p>
        <div class="fpc-livre-campos">
          <div class="fpc-field fpc-field--desc">
            <label class="fpc-label">Descrição do Produto</label>
            <input v-model="livreDesc" type="text" class="fpc-input" placeholder="Ex: Balão metalizado coração dourado 45cm" />
          </div>
          <div class="fpc-field fpc-field--qtd-sm">
            <label class="fpc-label">Qtd</label>
            <input v-model.number="livreQtd" type="number" min="1" step="1" class="fpc-input" placeholder="1" />
          </div>
          <div class="fpc-field fpc-field--preco-sm">
            <label class="fpc-label">Preço Un.</label>
            <div class="fpc-prefix-wrap">
              <span class="fpc-prefix">R$</span>
              <input :value="livrePrecoDisplay" @input="mascaraLivrePreco" type="text" inputmode="numeric" class="fpc-input fpc-input--prefixed" placeholder="0,00" />
            </div>
          </div>
        </div>
        <div class="fpc-livre-btn-row">
          <button class="fpc-btn-avulso" @click="adicionarLivre" :disabled="!livreDesc.trim()">
            <span class="material-symbols-outlined">add</span>
            ADICIONAR ITEM AVULSO
          </button>
        </div>
      </div>

      <!-- ── Catálogo de Produtos ────────────────────────────── -->
      <div class="fpc-card">
        <div class="fpc-cat-top">
          <h2 class="fpc-card-title" style="margin:0">
            <span class="material-symbols-outlined" style="color:#00c853">inventory_2</span>
            Catálogo de Produtos
            <span class="fpc-count-badge">{{ produtosCatalogo.length }}</span>
          </h2>
          <button :class="['fpc-btn-baixo', somenteBaixo ? 'active' : '']" @click="somenteBaixo = !somenteBaixo">
            <span class="material-symbols-outlined">warning</span>
            Estoque Baixo
          </button>
        </div>

        <div class="fpc-cat-filtros">
          <div class="fpc-search-wrap">
            <span class="material-symbols-outlined fpc-search-ico">search</span>
            <input v-model="buscaCatalogo" type="text" class="fpc-input fpc-search-input" placeholder="Buscar por nome ou código..." />
          </div>
          <div v-if="categorias.length" class="fpc-cat-tabs">
            <button :class="['fpc-cat-tab', categoriaFiltro === null ? 'active' : '']" @click="categoriaFiltro = null">Todas</button>
            <button
              v-for="cat in categorias" :key="cat.pk"
              :class="['fpc-cat-tab', categoriaFiltro === cat.pk ? 'active' : '']"
              @click="categoriaFiltro = categoriaFiltro === cat.pk ? null : cat.pk"
            >{{ cat.nome }}</button>
          </div>
        </div>

        <div v-if="!produtosCatalogo.length" class="fpc-empty">
          <span class="material-symbols-outlined">search_off</span>
          <span>Nenhum produto encontrado com os filtros selecionados.</span>
        </div>

        <div v-else class="fpc-tabela-scroll">
          <table class="fpc-tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th class="fpc-tc">Saldo</th>
                <th class="fpc-tr">Preço Un.</th>
                <th class="fpc-tc">Qtd. a Pedir</th>
                <th class="fpc-tc">Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in produtosPagina" :key="p.pk" :class="{ 'fpc-tr-baixo': p.saldo <= 0 }">
                <td class="fpc-td-mono">{{ p.codigo || '—' }}</td>
                <td><strong class="fpc-td-nome">{{ p.descricao }}</strong></td>
                <td>
                  <span v-if="categoriasMap[p.categoria_pk]" class="fpc-cat-tag">{{ categoriasMap[p.categoria_pk] }}</span>
                  <span v-else class="fpc-muted">—</span>
                </td>
                <td class="fpc-tc">
                  <span :class="['fpc-saldo', p.saldo <= 0 ? 'fpc-saldo--zero' : 'fpc-saldo--ok']">
                    <span v-if="p.saldo <= 0" class="material-symbols-outlined fpc-ico-warn">warning</span>
                    {{ p.saldo ?? 0 }}
                  </span>
                </td>
                <td class="fpc-tr fpc-td-mono">{{ fmt(p.preco_custo || 0) }}</td>
                <td class="fpc-tc">
                  <input v-model.number="qtdTemp[p.pk]" type="number" min="1" class="fpc-qtd-input" placeholder="1" @keyup.enter="adicionarItem(p)" />
                </td>
                <td class="fpc-tc">
                  <button class="fpc-btn-add-row" @click="adicionarItem(p)" title="Adicionar ao pedido">
                    <span class="material-symbols-outlined">add</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPaginas > 1" class="fpc-pag">
          <button class="fpc-pag-btn" :disabled="paginaAtual === 1" @click="paginaAtual = 1"><span class="material-symbols-outlined">first_page</span></button>
          <button class="fpc-pag-btn" :disabled="paginaAtual === 1" @click="paginaAtual--"><span class="material-symbols-outlined">chevron_left</span></button>
          <span class="fpc-pag-info">{{ paginaAtual }} / {{ totalPaginas }}</span>
          <button class="fpc-pag-btn" :disabled="paginaAtual === totalPaginas" @click="paginaAtual++"><span class="material-symbols-outlined">chevron_right</span></button>
          <button class="fpc-pag-btn" :disabled="paginaAtual === totalPaginas" @click="paginaAtual = totalPaginas"><span class="material-symbols-outlined">last_page</span></button>
          <span class="fpc-pag-count">{{ produtosCatalogo.length }} produto{{ produtosCatalogo.length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- ── Itens do Pedido ─────────────────────────────────── -->
      <div class="fpc-card">
        <h2 class="fpc-card-title">
          <span class="material-symbols-outlined" style="color:#f59e0b">shopping_cart</span>
          Itens do Pedido
          <span class="fpc-count-badge">{{ itens.length }}</span>
        </h2>

        <div v-if="!itens.length" class="fpc-empty">
          <span class="material-symbols-outlined">shopping_cart</span>
          <span>Nenhum item adicionado. Use o catálogo acima ou adicione itens avulsos.</span>
        </div>

        <div v-else class="fpc-itens">
          <div v-for="(it, idx) in itens" :key="idx" :class="['fpc-item', it.livre ? 'fpc-item--livre' : '']">
            <div class="fpc-item-id">
              <span class="fpc-item-nome">
                {{ it.descricao }}
                <span v-if="it.livre" class="fpc-badge-livre">Avulso</span>
              </span>
              <span class="fpc-item-cod">{{ it.livre ? 'Não cadastrado' : (it.codigo || '—') }}</span>
            </div>
            <div class="fpc-item-controles">
              <div class="fpc-ic">
                <label class="fpc-ic-label">Qtd</label>
                <input v-model.number="it.quantidade" type="number" min="0.001" step="1" class="fpc-ic-input" />
              </div>
              <div class="fpc-ic">
                <label class="fpc-ic-label">Preço Un.</label>
                <input v-model.number="it.preco_unitario" type="number" min="0" step="0.01" class="fpc-ic-input fpc-ic-input--w" />
              </div>
              <div class="fpc-ic">
                <label class="fpc-ic-label">Total</label>
                <span class="fpc-ic-total">{{ fmt((it.quantidade || 0) * (it.preco_unitario || 0)) }}</span>
              </div>
              <button
                v-if="it.livre && editando && it.item_pk"
                class="fpc-btn-cadastrar"
                @click="irCadastrarItem(it)"
                title="Cadastrar produto no sistema"
              >
                <span class="material-symbols-outlined">add_box</span>
                Cadastrar
              </button>
              <span v-else-if="it.livre" class="fpc-save-hint">Salve primeiro</span>
              <button class="fpc-btn-del" @click="removerItem(idx)" title="Remover">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Resumo / Bottom Bar ─────────────────────────────── -->
      <div class="fpc-resumo">
        <div class="fpc-resumo-bloco fpc-resumo-bloco--total">
          <span class="fpc-resumo-label">TOTAL DO PEDIDO</span>
          <span class="fpc-resumo-total">{{ fmt(totalPedido) }}</span>
        </div>
        <button class="fpc-btn-concluir" :disabled="salvando || !itens.length" @click="salvar">
          <span v-if="salvando" class="fpc-spin fpc-spin--dark"></span>
          <span v-else class="material-symbols-outlined">check_circle</span>
          {{ salvando ? 'Salvando...' : 'CONCLUIR PEDIDO' }}
        </button>
      </div>

    </template>

    <!-- Toast -->
    <Transition name="fpc-toast">
      <div v-if="toastMsg" class="fpc-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';
import api from '../services/api';
import { useFormatacao } from '../composables/useFormatacao';

const route = useRoute();
const router = useRouter();
const sessaoStore = useSessaoStore();
const { fmt, fmtData, fmtNum } = useFormatacao();

const pk = route.params.pk;
const editando = !!pk;

const carregando   = ref(true);
const salvando     = ref(false);
const fornecedores = ref([]);
const categorias   = ref([]);
const todosProdutos = ref([]);
const itens        = ref([]);
const qtdTemp      = ref({});
const buscaCatalogo   = ref('');
const somenteBaixo    = ref(false);
const categoriaFiltro = ref(null);
const paginaAtual     = ref(1);
const POR_PAGINA = 10;

const fornecedorBusca = ref('');
const fornDropOpen    = ref(false);

const livreDesc        = ref('');
const livreQtd         = ref(1);
const livrePreco       = ref(0);
const livrePrecoDisplay = ref('');


const form = ref({
  numero: '',
  fornecedor_pk: null,
  observacao: '',
  status: 'em_andamento',
  nf_numero: '',
  nf_serie: '',
  nf_chave: '',
  nf_fornecedor: '',
  nf_data_entrada: '',
  nf_valor: '',
});

const toastMsg  = ref('');
const toastTipo = ref('ok');
let toastTimer  = null;

const totalPedido = computed(() =>
  itens.value.reduce((s, it) => s + (it.quantidade || 0) * (it.preco_unitario || 0), 0)
);
const itensPendentes  = computed(() => itens.value.filter(i => i.livre));

const nomeFornecedorSelecionado = computed(() => {
  if (!form.value.fornecedor_pk) return '';
  return fornecedores.value.find(f => f.pk === form.value.fornecedor_pk)?.nome || '';
});

const fornecedoresFiltrados = computed(() => {
  const q = fornecedorBusca.value.trim().toLowerCase();
  if (!q) return fornecedores.value;
  return fornecedores.value.filter(f => f.nome.toLowerCase().includes(q));
});

const categoriasMap = computed(() =>
  Object.fromEntries(categorias.value.map(c => [c.pk, c.nome]))
);

function semAcento(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const produtosCatalogo = computed(() => {
  const q = semAcento(buscaCatalogo.value.trim());
  const palavras = q ? q.split(/\s+/) : [];
  const jaAdicionados = new Set(itens.value.map(i => i.produto_pk).filter(Boolean));

  return todosProdutos.value.filter(p => {
    if (jaAdicionados.has(p.pk)) return false;
    if (somenteBaixo.value && (p.saldo ?? 0) > 0) return false;
    if (categoriaFiltro.value !== null && p.categoria_pk !== categoriaFiltro.value) return false;
    if (!q) return true;
    const desc = semAcento(p.descricao);
    const cod  = semAcento(p.codigo);
    if (cod.includes(q)) return true;
    return palavras.every(w => desc.includes(w));
  }).sort((a, b) => {
    const aZ = (a.saldo ?? 0) <= 0 ? 0 : 1;
    const bZ = (b.saldo ?? 0) <= 0 ? 0 : 1;
    if (aZ !== bZ) return aZ - bZ;
    return (a.descricao || '').localeCompare(b.descricao || '');
  });
});

const totalPaginas = computed(() => Math.max(1, Math.ceil(produtosCatalogo.value.length / POR_PAGINA)));
const produtosPagina = computed(() => {
  const inicio = (paginaAtual.value - 1) * POR_PAGINA;
  return produtosCatalogo.value.slice(inicio, inicio + POR_PAGINA);
});

watch(produtosCatalogo, () => { paginaAtual.value = 1; });

onMounted(async () => {
  try {
    const fil = sessaoStore.filial?.pk;
    await Promise.all([carregarFornecedores(fil), carregarProdutos(fil), carregarCategorias(fil)]);

    if (editando) {
      await carregarPedido();
    } else {
      const { data: num } = await supabase.rpc('proximo_numero_pedido_compra', { p_filial_pk: fil });
      form.value.numero = num || '000001';
    }
  } catch (e) {
    console.error('[FormPedidoCompra/onMounted]', e);
  } finally {
    carregando.value = false;
  }
});

async function carregarFornecedores(fil) {
  const { data } = await supabase
    .from('fornecedores')
    .select('pk, nome')
    .eq('filial_pk', fil)
    .eq('ativo', true)
    .order('nome');
  fornecedores.value = data || [];
}

async function carregarCategorias(fil) {
  const { data } = await supabase
    .from('categorias')
    .select('pk, nome')
    .or(`filial_pk.is.null,filial_pk.eq.${fil}`)
    .eq('ativo', true)
    .order('nome');
  categorias.value = data || [];
}

async function carregarProdutos(fil) {
  const { data, error } = await supabase
    .from('produtos')
    .select('pk, codigo, descricao, saldo, categoria_pk, preco_custo')
    .eq('filial_pk', fil)
    .order('descricao');
  if (error) console.error('[FormPedidoCompra/carregarProdutos]', error);
  todosProdutos.value = data || [];
}

async function carregarPedido() {
  try {
    const { data } = await api.get(`/api/pedidos-compra/${pk}`);
    const p = data.data;
    form.value = {
      numero:          p.numero,
      fornecedor_pk:   p.fornecedor_pk   || null,
      observacao:      p.observacao      || '',
      status:          p.status          || 'em_andamento',
      nf_numero:       p.nf_numero       || '',
      nf_serie:        p.nf_serie        || '',
      nf_chave:        p.nf_chave        || '',
      nf_fornecedor:   p.nf_fornecedor   || '',
      nf_data_entrada: p.nf_data_entrada || '',
      nf_valor:        p.nf_valor        || '',
    };
    if (p.fornecedor_pk) {
      const forn = fornecedores.value.find(f => f.pk === p.fornecedor_pk);
      if (forn) fornecedorBusca.value = forn.nome;
    }
    itens.value = (p.itens || []).map(it => {
      if (it.descricao_livre) {
        return {
          item_pk:         it.pk,
          produto_pk:      null,
          livre:           true,
          descricao:       it.descricao_livre,
          descricao_livre: it.descricao_livre,
          codigo:          null,
          saldo:           0,
          quantidade:      it.quantidade,
          preco_unitario:  it.preco_unitario,
        };
      }
      return {
        item_pk:        it.pk,
        produto_pk:     it.produto_pk,
        livre:          false,
        codigo:         it.produtos?.codigo,
        descricao:      it.produtos?.descricao,
        saldo:          it.produtos?.saldo ?? 0,
        quantidade:     it.quantidade,
        preco_unitario: it.preco_unitario,
      };
    });
  } catch (e) {
    showToast('Erro ao carregar pedido: ' + (e.response?.data?.erro || e.message), 'err');
  }
}

function selecionarFornecedor(f) {
  form.value.fornecedor_pk = f ? f.pk : null;
  fornecedorBusca.value    = f ? f.nome : '';
  fornDropOpen.value       = false;
}

function fecharFornDrop() {
  setTimeout(() => { fornDropOpen.value = false; }, 200);
}

function mascaraLivrePreco(e) {
  const digits = e.target.value.replace(/\D/g, '');
  livrePreco.value = parseInt(digits || '0', 10) / 100;
  livrePrecoDisplay.value = livrePreco.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function adicionarItem(prod) {
  const qty = Number(qtdTemp.value[prod.pk]) || 1;
  itens.value.push({
    produto_pk:     prod.pk,
    livre:          false,
    codigo:         prod.codigo,
    descricao:      prod.descricao,
    saldo:          prod.saldo ?? 0,
    quantidade:     qty,
    preco_unitario: prod.preco_custo || 0,
  });
  delete qtdTemp.value[prod.pk];
}

function removerItem(idx) {
  itens.value.splice(idx, 1);
}

function adicionarLivre() {
  const desc = livreDesc.value.trim();
  if (!desc) return;
  itens.value.push({
    produto_pk:      null,
    livre:           true,
    descricao:       desc,
    descricao_livre: desc,
    codigo:          null,
    saldo:           0,
    quantidade:      livreQtd.value || 1,
    preco_unitario:  livrePreco.value || 0,
  });
  livreDesc.value         = '';
  livreQtd.value          = 1;
  livrePreco.value        = 0;
  livrePrecoDisplay.value = '';
}

function irCadastrarItem(it) {
  const params = new URLSearchParams({
    descricao:      it.descricao_livre,
    pedido_item_pk: it.item_pk,
    pedido_pk:      pk,
  });
  router.push(`/produtos/novo?${params.toString()}`);
}

async function salvar() {
  if (!itens.value.length) {
    showToast('Adicione pelo menos um produto.', 'err');
    return;
  }
  salvando.value = true;
  try {
    const fil = sessaoStore.filial?.pk;
    const payload = {
      filial_pk:       fil,
      fornecedor_pk:   form.value.fornecedor_pk  || null,
      observacao:      form.value.observacao      || null,
      status:          form.value.status,
      nf_numero:       form.value.nf_numero       || null,
      nf_serie:        form.value.nf_serie        || null,
      nf_chave:        form.value.nf_chave        || null,
      nf_fornecedor:   form.value.nf_fornecedor   || null,
      nf_data_entrada: form.value.nf_data_entrada || null,
      nf_valor:        form.value.nf_valor        || null,
      itens: itens.value.map(it => ({
        produto_pk:      it.livre ? null : it.produto_pk,
        descricao_livre: it.livre ? it.descricao_livre : null,
        quantidade:      it.quantidade,
        preco_unitario:  it.preco_unitario,
      })),
    };

    if (editando) {
      await api.put(`/api/pedidos-compra/${pk}`, payload);
    } else {
      await api.post('/api/pedidos-compra', payload);
    }

    showToast('Pedido salvo!');
    setTimeout(() => router.push('/pedidos-compra'), 1000);
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    salvando.value = false;
  }
}

function labelStatus(s) {
  const m = { em_andamento: 'Em Andamento', comprado: 'Comprado', cancelado: 'Cancelado', finalizado: 'Finalizado' };
  return m[s] || s;
}

function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3500);
}

onUnmounted(() => { clearTimeout(toastTimer); });
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
</style>

<style scoped>
/* ─── Root ──────────────────────────────────────────────────── */
.fpc-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 120px;
  max-width: 1200px;
  font-family: 'Hanken Grotesk', var(--font, sans-serif);
}

/* ─── Header ────────────────────────────────────────────────── */
.fpc-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.fpc-back {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  background: var(--bg2); border: 1.5px solid var(--border);
  border-radius: 8px; color: var(--text2); cursor: pointer;
  flex-shrink: 0; transition: all .15s;
}
.fpc-back:hover { border-color: #00c853; color: #00c853; }
.fpc-header-info { flex: 1; min-width: 0; }
.fpc-title { font-size: 22px; font-weight: 800; color: var(--text); margin: 0 0 2px; letter-spacing: -.3px; }
.fpc-subtitle { font-size: 13px; color: var(--text2); margin: 0; }
.fpc-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-left: auto; }

.fpc-btn-outline {
  padding: 9px 18px; background: transparent;
  border: 1.5px solid var(--border); border-radius: 8px;
  color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.fpc-btn-outline:hover { border-color: #00c853; color: #00c853; }

.fpc-btn-green {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 20px; background: #00c853;
  border: none; border-radius: 8px; color: #fff;
  font-size: 13px; font-weight: 700; cursor: pointer;
  font-family: inherit; transition: opacity .15s;
}
.fpc-btn-green:hover:not(:disabled) { opacity: .88; }
.fpc-btn-green:disabled { opacity: .45; cursor: not-allowed; }
.fpc-btn-green .material-symbols-outlined { font-size: 17px; }

/* Status chip */
.fpc-sc { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.fpc-sc--em_andamento { background: rgba(96,165,250,.15); color: #60a5fa; }
.fpc-sc--comprado     { background: rgba(251,146,60,.15);  color: #fb923c; }
.fpc-sc--cancelado    { background: rgba(248,113,113,.15); color: #f87171; }
.fpc-sc--finalizado   { background: rgba(0,200,83,.15);    color: #00c853; }
[data-theme="light"] .fpc-sc--em_andamento { color: #1d4ed8; }
[data-theme="light"] .fpc-sc--comprado     { color: #9a3412; }
[data-theme="light"] .fpc-sc--cancelado    { color: #b91c1c; }
[data-theme="light"] .fpc-sc--finalizado   { color: #15803d; }

/* ─── Cards ─────────────────────────────────────────────────── */
.fpc-card {
  background: var(--bg2);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 24px;
}
[data-theme="light"] .fpc-card { background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.06); }

.fpc-card-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: var(--text);
  margin: 0 0 18px; letter-spacing: -.1px;
}
.fpc-card-title .material-symbols-outlined { font-size: 18px; }
.fpc-card-sub { font-size: 12px; color: var(--text2); margin: -10px 0 16px; line-height: 1.5; }
.fpc-card-top-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.fpc-tag-opcional { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 6px; background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.2); color: #6366f1; text-transform: uppercase; letter-spacing: .4px; }

.fpc-card--livre  { border-color: rgba(99,102,241,.25); background: rgba(99,102,241,.03); }
[data-theme="light"] .fpc-card--livre { background: rgba(99,102,241,.03); }

.fpc-count-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--bg3); color: var(--text2); margin-left: 4px; }

/* ─── Formulário ─────────────────────────────────────────────── */
.fpc-field { display: flex; flex-direction: column; gap: 5px; }
.fpc-field--span2 { grid-column: span 2; }
.fpc-field--full  { grid-column: 1 / -1; }
.fpc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text2); }

.fpc-input {
  padding: 9px 11px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg3);
  color: var(--text);
  outline: none;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color .15s;
}
[data-theme="light"] .fpc-input { background: #f7f9fb; }
.fpc-input:focus { border-color: #00c853; }
.fpc-input--locked { opacity: .55; cursor: not-allowed; font-family: monospace; }
.fpc-select { cursor: pointer; }
.fpc-textarea { resize: vertical; font-family: inherit; }
.fpc-input--prefixed { padding-left: 30px; }

.fpc-dados-grid { display: grid; grid-template-columns: 160px 1fr 1fr 1fr; gap: 14px; }

/* Fornecedor search */
.fpc-forn-wrap { position: relative; }
.fpc-forn-ico { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 17px; color: var(--text2); pointer-events: none; z-index: 1; }
.fpc-input--search { padding-left: 36px; padding-right: 34px; }
.fpc-forn-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: none; border: none; color: var(--text2); cursor: pointer; border-radius: 4px; }
.fpc-forn-clear:hover { color: var(--text); }
.fpc-forn-clear .material-symbols-outlined { font-size: 14px; }
.fpc-forn-drop {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg2); border: 1.5px solid var(--border);
  border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.18);
  z-index: 200; overflow: hidden; max-height: 220px; overflow-y: auto;
}
[data-theme="light"] .fpc-forn-drop { background: #fff; }
.fpc-forn-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; cursor: pointer; font-size: 13px; color: var(--text); }
.fpc-forn-item:hover { background: var(--bg3); }
.fpc-forn-item--none { color: var(--text2); font-style: italic; }
.fpc-forn-empty { padding: 10px 14px; font-size: 12px; color: var(--text2); }

/* ─── Item Avulso ────────────────────────────────────────────── */
.fpc-livre-campos { display: flex; gap: 12px; align-items: flex-end; }
.fpc-field--desc { flex: 1; min-width: 0; }
.fpc-field--qtd-sm { width: 88px; flex-shrink: 0; }
.fpc-field--preco-sm { width: 150px; flex-shrink: 0; }
.fpc-prefix-wrap { position: relative; display: flex; align-items: center; }
.fpc-prefix { position: absolute; left: 10px; font-size: 12px; font-weight: 700; color: var(--text2); pointer-events: none; z-index: 1; }
.fpc-livre-btn-row { display: flex; justify-content: center; margin-top: 16px; }
.fpc-btn-avulso {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 28px;
  background: #6366f1; color: #fff;
  border: none; border-radius: 8px;
  font-size: 13px; font-weight: 700; letter-spacing: .04em;
  cursor: pointer; font-family: inherit; transition: opacity .15s;
}
.fpc-btn-avulso:hover:not(:disabled) { opacity: .85; }
.fpc-btn-avulso:disabled { opacity: .4; cursor: not-allowed; }
.fpc-btn-avulso .material-symbols-outlined { font-size: 17px; }

/* ─── Catálogo ───────────────────────────────────────────────── */
.fpc-cat-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.fpc-cat-filtros { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.fpc-search-wrap { position: relative; display: flex; align-items: center; }
.fpc-search-ico { position: absolute; left: 10px; font-size: 17px; color: var(--text2); pointer-events: none; }
.fpc-search-input { padding-left: 36px; }
.fpc-cat-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.fpc-cat-tab {
  padding: 5px 14px; border: 1.5px solid var(--border);
  border-radius: 20px; background: var(--bg3);
  color: var(--text2); font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .15s;
  white-space: nowrap;
}
.fpc-cat-tab:hover { border-color: #00c853; color: #00c853; }
.fpc-cat-tab.active { background: #00c853; border-color: #00c853; color: #fff; }

.fpc-btn-baixo {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border: 1.5px solid var(--border);
  border-radius: 20px; background: var(--bg3);
  color: var(--text2); font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap;
}
.fpc-btn-baixo .material-symbols-outlined { font-size: 15px; }
.fpc-btn-baixo:hover { border-color: #fbbf24; color: #fbbf24; }
.fpc-btn-baixo.active { background: rgba(251,191,36,.15); border-color: #fbbf24; color: #fbbf24; }

/* Tabela catálogo */
.fpc-tabela-scroll { overflow-x: auto; border-radius: 8px; border: 1.5px solid var(--border); }
.fpc-tabela { width: 100%; border-collapse: collapse; font-size: 14px; }
.fpc-tabela th {
  padding: 12px 16px; text-align: left;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
  color: var(--text2); background: var(--bg3); border-bottom: 1.5px solid var(--border);
  white-space: nowrap;
}
[data-theme="light"] .fpc-tabela th { background: #f7f9fb; }
.fpc-tabela td { padding: 14px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.fpc-tabela tbody tr:last-child td { border-bottom: none; }
.fpc-tabela tbody tr:hover td { background: rgba(0,200,83,.04); }
.fpc-tr-baixo td:first-child { border-left: 3px solid #fbbf24; }
.fpc-tc { text-align: center !important; }
.fpc-tr { text-align: right !important; }
.fpc-td-mono { font-family: monospace; font-size: 13px; color: var(--text2); }
.fpc-td-nome { font-weight: 600; }
.fpc-muted { color: var(--text2); opacity: .5; }
.fpc-cat-tag { display: inline-flex; padding: 3px 9px; border-radius: 6px; background: var(--bg3); border: 1px solid var(--border); font-size: 11px; font-weight: 600; color: var(--text2); white-space: nowrap; }
[data-theme="light"] .fpc-cat-tag { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
.fpc-saldo { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; font-weight: 700; font-family: monospace; padding: 2px 8px; border-radius: 6px; }
.fpc-saldo--ok   { background: rgba(0,200,83,.1);   color: #00c853; }
.fpc-saldo--zero { background: rgba(248,113,113,.1); color: #f87171; }
[data-theme="light"] .fpc-saldo--ok   { color: #15803d; }
[data-theme="light"] .fpc-saldo--zero { color: #b91c1c; }
.fpc-ico-warn { font-size: 12px; vertical-align: middle; }
.fpc-qtd-input {
  width: 70px; padding: 7px 8px; border: 1.5px solid var(--border);
  border-radius: 6px; font-size: 13px; background: var(--bg3);
  color: var(--text); text-align: center; outline: none; font-family: monospace;
}
.fpc-qtd-input:focus { border-color: #00c853; }
.fpc-btn-add-row {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  background: #00c853; border: none; border-radius: 8px;
  color: #fff; cursor: pointer; transition: opacity .15s;
}
.fpc-btn-add-row:hover { opacity: .8; }
.fpc-btn-add-row .material-symbols-outlined { font-size: 18px; }

/* Paginação */
.fpc-pag { display: flex; align-items: center; gap: 4px; padding: 12px 16px; border-top: 1px solid var(--border); }
.fpc-pag-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; }
.fpc-pag-btn:hover:not(:disabled) { border-color: #00c853; color: #00c853; }
.fpc-pag-btn:disabled { opacity: .3; cursor: not-allowed; }
.fpc-pag-btn .material-symbols-outlined { font-size: 18px; }
.fpc-pag-info { padding: 0 12px; font-size: 13px; font-weight: 700; color: var(--text); }
.fpc-pag-count { margin-left: auto; font-size: 12px; color: var(--text2); }

/* ─── Itens do Pedido ────────────────────────────────────────── */
.fpc-itens { display: flex; flex-direction: column; gap: 8px; }
.fpc-item {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 16px;
  background: var(--bg3); border: 1.5px solid var(--border);
  border-radius: 8px; flex-wrap: wrap;
}
[data-theme="light"] .fpc-item { background: #f7f9fb; }
.fpc-item--livre { border-color: rgba(99,102,241,.3); background: rgba(99,102,241,.04); }
.fpc-item-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.fpc-item-nome { font-size: 14px; font-weight: 700; color: var(--text); }
.fpc-item-cod  { font-size: 12px; color: var(--text2); font-family: monospace; }
.fpc-badge-livre { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 6px; font-size: 10px; font-weight: 700; background: rgba(99,102,241,.15); color: #6366f1; border: 1px solid rgba(99,102,241,.3); margin-left: 6px; vertical-align: middle; }
.fpc-item-controles { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.fpc-ic { display: flex; flex-direction: column; gap: 3px; }
.fpc-ic-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text2); }
.fpc-ic-input {
  width: 72px; padding: 7px 8px;
  border: 1.5px solid var(--border); border-radius: 7px;
  font-size: 13px; background: var(--bg2); color: var(--text);
  text-align: right; outline: none; font-family: monospace;
}
[data-theme="light"] .fpc-ic-input { background: #fff; }
.fpc-ic-input:focus { border-color: #00c853; }
.fpc-ic-input--w { width: 96px; }
.fpc-ic-total { font-size: 14px; font-weight: 800; color: #00c853; font-family: monospace; display: block; padding: 7px 0; }
.fpc-btn-del {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; background: none;
  border: 1.5px solid var(--border); border-radius: 7px;
  color: var(--text2); cursor: pointer; align-self: flex-end;
}
.fpc-btn-del:hover { background: rgba(239,68,68,.1); border-color: #ef4444; color: #ef4444; }
.fpc-btn-del .material-symbols-outlined { font-size: 16px; }

.fpc-btn-cadastrar {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px; background: rgba(167,139,250,.12);
  border: 1.5px solid rgba(167,139,250,.35); border-radius: 7px;
  color: #a78bfa; font-size: 12px; font-weight: 700;
  cursor: pointer; white-space: nowrap; font-family: inherit;
  align-self: flex-end;
}
.fpc-btn-cadastrar:hover { background: #a78bfa; color: #fff; border-color: #a78bfa; }
.fpc-btn-cadastrar .material-symbols-outlined { font-size: 15px; }
.fpc-save-hint { font-size: 11px; color: var(--text2); font-style: italic; white-space: nowrap; align-self: flex-end; }

/* ─── Resumo Bar ─────────────────────────────────────────────── */
.fpc-resumo {
  display: flex; align-items: center; gap: 0;
  background: var(--bg2); border: 1.5px solid var(--border);
  border-radius: 8px; padding: 20px 24px;
  flex-wrap: wrap; gap: 16px;
}
[data-theme="light"] .fpc-resumo { background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
.fpc-resumo-bloco { display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
.fpc-resumo-bloco--total { min-width: 160px; }
.fpc-resumo-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); }
.fpc-resumo-val { font-size: 17px; font-weight: 700; color: var(--text); font-family: monospace; }
.fpc-resumo-total { font-size: 22px; font-weight: 800; color: #00c853; font-family: monospace; }

.fpc-btn-concluir {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 28px; background: #00c853; color: #fff;
  border: none; border-radius: 8px;
  font-size: 13px; font-weight: 800; letter-spacing: .05em;
  cursor: pointer; margin-left: auto; font-family: inherit;
  transition: opacity .15s, transform .1s;
}
.fpc-btn-concluir:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.fpc-btn-concluir:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.fpc-btn-concluir .material-symbols-outlined { font-size: 18px; }

/* ─── Estados ────────────────────────────────────────────────── */
.fpc-loading {
  display: flex; align-items: center; gap: 12px;
  padding: 60px 20px; color: var(--text2); font-size: 14px;
}
.fpc-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px 20px; color: var(--text2); font-size: 13px;
}
.fpc-empty .material-symbols-outlined { font-size: 36px; opacity: .25; }

/* ─── Spinners ───────────────────────────────────────────────── */
.fpc-spin {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: fpc-spin .7s linear infinite;
}
.fpc-spin--dark { border-color: rgba(0,0,0,.2); border-top-color: #000; }
.fpc-spin-lg {
  display: inline-block; width: 22px; height: 22px;
  border: 2.5px solid var(--border); border-top-color: #00c853;
  border-radius: 50%; animation: fpc-spin .7s linear infinite;
}
@keyframes fpc-spin { to { transform: rotate(360deg); } }

/* ─── Toast ──────────────────────────────────────────────────── */
.fpc-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  padding: 11px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 600; z-index: 9999;
  box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap;
  font-family: inherit;
}
.fpc-toast.ok  { background: #166534; color: #bbf7d0; }
.fpc-toast.err { background: #7f1d1d; color: #fecaca; }
.fpc-toast-enter-active, .fpc-toast-leave-active { transition: all .25s; }
.fpc-toast-enter-from, .fpc-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* ─── Responsivo ─────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .fpc-dados-grid { grid-template-columns: 1fr 1fr; }
  .fpc-field--span2 { grid-column: span 2; }
}
@media (max-width: 700px) {
  .fpc-dados-grid { grid-template-columns: 1fr; }
  .fpc-field--span2 { grid-column: span 1; }
  .fpc-livre-campos { flex-wrap: wrap; }
  .fpc-field--qtd-sm,
  .fpc-field--preco-sm { width: calc(50% - 6px); }
  .fpc-resumo { flex-direction: column; align-items: stretch; }
  .fpc-btn-concluir { margin-left: 0; justify-content: center; }
  .fpc-header-right { width: 100%; }
}
</style>
