<template>
  <div class="fp-wrap">

    <!-- Header -->
    <div class="fp-header">
      <button class="btn-back" @click="$router.push('/pedidos-compra')">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div>
        <h2 class="fp-title">{{ editando ? `Pedido #${form.numero}` : 'Novo Pedido de Compra' }}</h2>
        <p class="fp-sub">{{ editando ? 'Edite os dados do pedido' : 'Crie um novo pedido de compra para o fornecedor' }}</p>
      </div>
      <div v-if="editando" class="fp-status-wrap">
        <span :class="['badge-status', `bs-${form.status}`]">{{ labelStatus(form.status) }}</span>
      </div>
    </div>

    <div v-if="carregando" class="state-center"><span class="spin"></span></div>

    <template v-else>
      <div class="fp-grid">

        <!-- ── Dados do Pedido ─── -->
        <div class="fp-card">
          <h3 class="card-title">Dados do Pedido</h3>
          <div class="form-grid">

            <div class="field">
              <label>Nº do Pedido</label>
              <input :value="form.numero || '—'" type="text" readonly class="input-readonly mono" />
            </div>

            <div class="field">
              <label>Status</label>
              <select v-model="form.status" class="f-input">
                <option value="em_andamento">Em Andamento</option>
                <option value="comprado">Comprado</option>
                <option value="cancelado">Cancelado</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>

            <div class="field full">
              <label>Fornecedor</label>
              <select v-model="form.fornecedor_pk" class="f-input">
                <option :value="null">Sem fornecedor</option>
                <option v-for="f in fornecedores" :key="f.pk" :value="f.pk">{{ f.nome }}</option>
              </select>
            </div>

            <div class="field full">
              <label>Observação</label>
              <textarea v-model="form.observacao" class="f-input f-textarea" rows="3" placeholder="Observações gerais sobre o pedido..."></textarea>
            </div>
          </div>
        </div>

        <!-- ── Nota Fiscal de Entrada (quando finalizado) ── -->
        <div v-if="form.status === 'finalizado'" class="fp-card nf-card">
          <h3 class="card-title">
            <span class="material-symbols-outlined" style="font-size:18px;color:#4ade80">receipt_long</span>
            Nota Fiscal de Entrada
          </h3>
          <div class="form-grid">
            <div class="field">
              <label>Nº da NF</label>
              <input v-model="form.nf_numero" type="text" class="f-input mono" placeholder="000000" />
            </div>
            <div class="field">
              <label>Série</label>
              <input v-model="form.nf_serie" type="text" class="f-input mono" placeholder="1" />
            </div>
            <div class="field">
              <label>Data de Entrada</label>
              <input v-model="form.nf_data_entrada" type="date" class="f-input" />
            </div>
            <div class="field">
              <label>Valor Total NF</label>
              <input v-model="form.nf_valor" type="number" step="0.01" class="f-input" placeholder="0,00" />
            </div>
            <div class="field full">
              <label>Fornecedor na NF</label>
              <input v-model="form.nf_fornecedor" type="text" class="f-input" placeholder="Nome do fornecedor conforme NF" />
            </div>
            <div class="field full">
              <label>Chave de Acesso</label>
              <input v-model="form.nf_chave" type="text" class="f-input mono" placeholder="44 dígitos da chave NF-e" maxlength="44" />
            </div>
          </div>
        </div>

      </div><!-- /fp-grid -->

      <!-- ── Catálogo de Produtos ── -->
      <div class="fp-card">
        <div class="cat-header">
          <div class="cat-header-top">
            <h3 class="card-title" style="margin:0">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary)">inventory_2</span>
              Catálogo de Produtos
              <span class="cat-count">{{ produtosCatalogo.length }} produto{{ produtosCatalogo.length !== 1 ? 's' : '' }}</span>
            </h3>
            <button
              :class="['btn-toggle-baixo', somenteBaixo ? 'ativo' : '']"
              @click="somenteBaixo = !somenteBaixo"
            >
              <span class="material-symbols-outlined">warning</span>
              Estoque Baixo
            </button>
          </div>
          <div class="cat-filtros">
            <div class="cat-search-wrap">
              <span class="material-symbols-outlined cat-search-ico">search</span>
              <input
                v-model="buscaCatalogo"
                type="text"
                class="cat-search-input"
                placeholder="Buscar por nome ou código..."
              />
            </div>
            <div v-if="categorias.length" class="cat-chips">
              <button
                :class="['cat-chip', categoriaFiltro === null ? 'active' : '']"
                @click="categoriaFiltro = null"
              >Todas</button>
              <button
                v-for="cat in categorias" :key="cat.pk"
                :class="['cat-chip', categoriaFiltro === cat.pk ? 'active' : '']"
                @click="categoriaFiltro = (categoriaFiltro === cat.pk ? null : cat.pk)"
              >{{ cat.nome }}</button>
            </div>
          </div>
        </div>

        <div v-if="!produtosCatalogo.length" class="state-center muted" style="padding:24px">
          <span class="material-symbols-outlined" style="font-size:28px;opacity:.25">search_off</span>
          Nenhum produto encontrado com os filtros selecionados.
        </div>

        <div v-else class="cat-tabela-wrap">
          <table class="cat-tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th class="text-right">Saldo</th>
                <th class="text-right">Qtd. a Pedir</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in produtosPagina" :key="p.pk"
                :class="{ 'row-baixo': p.saldo <= 0 }"
              >
                <td class="mono text-muted">{{ p.codigo || '—' }}</td>
                <td>
                  <span class="prod-nome">{{ p.descricao }}</span>
                </td>
                <td class="text-muted">{{ categoriasMap[p.categoria_pk] || '—' }}</td>
                <td class="text-right">
                  <span :class="['saldo-chip', p.saldo <= 0 ? 'zero' : 'ok']">
                    <span v-if="p.saldo <= 0" class="material-symbols-outlined" style="font-size:11px;vertical-align:middle">warning</span>
                    {{ p.saldo ?? 0 }}
                  </span>
                </td>
                <td class="text-right">
                  <input
                    v-model.number="qtdTemp[p.pk]"
                    type="number"
                    min="1"
                    step="1"
                    class="input-qtd"
                    placeholder="1"
                    @keyup.enter="adicionarItem(p)"
                  />
                </td>
                <td class="text-right">
                  <button class="btn-add-item" @click="adicionarItem(p)" title="Adicionar ao pedido">
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                    Adicionar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPaginas > 1" class="pag-bar">
          <button class="pag-btn" :disabled="paginaAtual === 1" @click="paginaAtual = 1">
            <span class="material-symbols-outlined">first_page</span>
          </button>
          <button class="pag-btn" :disabled="paginaAtual === 1" @click="paginaAtual--">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="pag-info">{{ paginaAtual }} / {{ totalPaginas }}</span>
          <button class="pag-btn" :disabled="paginaAtual === totalPaginas" @click="paginaAtual++">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
          <button class="pag-btn" :disabled="paginaAtual === totalPaginas" @click="paginaAtual = totalPaginas">
            <span class="material-symbols-outlined">last_page</span>
          </button>
          <span class="pag-total">{{ produtosCatalogo.length }} produto{{ produtosCatalogo.length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- ── Produtos do Pedido ── -->
      <div class="fp-card">
        <h3 class="card-title">
          <span class="material-symbols-outlined" style="font-size:18px;color:#f59e0b">shopping_cart</span>
          Produtos do Pedido
          <span class="cat-count">{{ itens.length }} item{{ itens.length !== 1 ? 'ns' : '' }}</span>
        </h3>

        <div v-if="!itens.length" class="state-center muted" style="padding:32px">
          <span class="material-symbols-outlined" style="font-size:32px;opacity:.2">shopping_cart</span>
          Nenhum produto adicionado. Clique em "Adicionar" no catálogo acima.
        </div>

        <table v-else class="tabela-itens">
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto</th>
              <th class="text-right">Saldo Atual</th>
              <th class="text-right">Qtd. a Comprar</th>
              <th class="text-right">Preço Unit.</th>
              <th class="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, idx) in itens" :key="idx">
              <td class="mono text-muted">{{ it.codigo || '—' }}</td>
              <td class="bold">{{ it.descricao }}</td>
              <td class="text-right">
                <span :class="['saldo-chip', it.saldo <= 0 ? 'zero' : 'ok']">{{ it.saldo }}</span>
              </td>
              <td class="text-right">
                <input
                  v-model.number="it.quantidade"
                  type="number"
                  min="0.001"
                  step="1"
                  class="input-inline"
                />
              </td>
              <td class="text-right">
                <input
                  v-model.number="it.preco_unitario"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input-inline"
                />
              </td>
              <td class="text-right mono bold">
                {{ fmt(it.quantidade * it.preco_unitario) }}
              </td>
              <td>
                <button class="btn-remover" @click="removerItem(idx)" title="Remover">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right bold" style="padding:10px 14px;font-size:13px;color:var(--text2)">Total do Pedido</td>
              <td class="text-right mono bold" style="padding:10px 14px;font-size:15px;color:var(--text)">{{ fmt(totalPedido) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Ações -->
      <div class="fp-actions">
        <button class="btn-cancel" @click="$router.push('/pedidos-compra')">Cancelar</button>
        <button class="btn-primary" :disabled="salvando" @click="salvar">
          <span v-if="salvando" class="spin-sm"></span>
          <span v-else class="material-symbols-outlined">save</span>
          {{ salvando ? 'Salvando...' : 'Salvar Pedido' }}
        </button>
      </div>
    </template>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="fp-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';
import api from '../services/api';

const route = useRoute();
const router = useRouter();
const sessaoStore = useSessaoStore();

const pk = route.params.pk;
const editando = !!pk;

const carregando = ref(true);
const salvando   = ref(false);
const fornecedores = ref([]);
const categorias = ref([]);
const todosProdutos = ref([]);
const itens = ref([]);
const qtdTemp = ref({});
const buscaCatalogo = ref('');
const somenteBaixo = ref(false);
const categoriaFiltro = ref(null);
const paginaAtual = ref(1);
const POR_PAGINA = 10;

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

const categoriasMap = computed(() =>
  Object.fromEntries(categorias.value.map(c => [c.pk, c.nome]))
);

const produtosCatalogo = computed(() => {
  const q = buscaCatalogo.value.trim().toLowerCase();
  const palavras = q ? q.split(/\s+/) : [];
  const jaAdicionados = new Set(itens.value.map(i => i.produto_pk));

  return todosProdutos.value.filter(p => {
    if (jaAdicionados.has(p.pk)) return false;
    if (somenteBaixo.value && (p.saldo ?? 0) > 0) return false;
    if (categoriaFiltro.value !== null && p.categoria_pk !== categoriaFiltro.value) return false;
    if (!q) return true;
    const desc = (p.descricao || '').toLowerCase();
    const cod  = (p.codigo   || '').toLowerCase();
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
    .select('pk, codigo, descricao, saldo, categoria_pk')
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
    itens.value = (p.itens || []).map(it => ({
      item_pk:        it.pk,
      produto_pk:     it.produtos?.pk    || it.produto_pk,
      codigo:         it.produtos?.codigo,
      descricao:      it.produtos?.descricao,
      saldo:          it.produtos?.saldo ?? 0,
      quantidade:     it.quantidade,
      preco_unitario: it.preco_unitario,
    }));
  } catch (e) {
    showToast('Erro ao carregar pedido: ' + (e.response?.data?.erro || e.message), 'err');
  }
}

function adicionarItem(prod) {
  const qty = Number(qtdTemp.value[prod.pk]) || 1;
  itens.value.push({
    produto_pk:     prod.pk,
    codigo:         prod.codigo,
    descricao:      prod.descricao,
    saldo:          prod.saldo ?? 0,
    quantidade:     qty,
    preco_unitario: 0,
  });
  delete qtdTemp.value[prod.pk];
}

function removerItem(idx) {
  itens.value.splice(idx, 1);
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
      filial_pk:      fil,
      fornecedor_pk:  form.value.fornecedor_pk  || null,
      observacao:     form.value.observacao      || null,
      status:         form.value.status,
      nf_numero:      form.value.nf_numero      || null,
      nf_serie:       form.value.nf_serie       || null,
      nf_chave:       form.value.nf_chave       || null,
      nf_fornecedor:  form.value.nf_fornecedor  || null,
      nf_data_entrada: form.value.nf_data_entrada || null,
      nf_valor:       form.value.nf_valor        || null,
      itens: itens.value.map(it => ({
        produto_pk:     it.produto_pk,
        quantidade:     it.quantidade,
        preco_unitario: it.preco_unitario,
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

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3500);
}
</script>

<style scoped>
.fp-wrap { display: flex; flex-direction: column; gap: 16px; padding-bottom: 80px; max-width: 1100px; }

.fp-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.btn-back { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); cursor: pointer; flex-shrink: 0; }
.btn-back:hover { color: var(--text); border-color: var(--primary); }
.fp-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0 0 3px; }
.fp-sub { font-size: 13px; color: var(--text2); margin: 0; }
.fp-status-wrap { margin-left: auto; }

/* Cards */
.fp-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
.fp-card.mt { margin-top: 0; }
.nf-card { border-color: rgba(74,222,128,.3); background: rgba(74,222,128,.04); }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--text); margin: 0 0 16px; }

.fp-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; align-items: start; }

/* Formulário */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field.full { grid-column: 1 / -1; }
.field label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text2); }
.f-input { padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; background: var(--bg3); color: var(--text); outline: none; }
.f-input:focus { border-color: var(--primary); }
.f-textarea { resize: vertical; font-family: inherit; }
.input-readonly { opacity: .6; cursor: not-allowed; background: var(--bg3); }
.mono { font-family: monospace; }

/* Catálogo de Produtos */
.cat-header { margin-bottom: 14px; display: flex; flex-direction: column; gap: 12px; }
.cat-header-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.cat-count { font-size: 12px; font-weight: 500; color: var(--text2); margin-left: 6px; }
.btn-toggle-baixo { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg3); color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap; }
.btn-toggle-baixo .material-symbols-outlined { font-size: 15px; }
.btn-toggle-baixo:hover { border-color: #fbbf24; color: #fbbf24; }
.btn-toggle-baixo.ativo { background: rgba(251,191,36,.15); border-color: #fbbf24; color: #fbbf24; }

.cat-filtros { display: flex; flex-direction: column; gap: 8px; }
.cat-search-wrap { position: relative; display: flex; align-items: center; }
.cat-search-ico { position: absolute; left: 10px; font-size: 18px; color: var(--text2); pointer-events: none; }
.cat-search-input { padding: 8px 12px 8px 36px; border: 1px solid var(--border); border-radius: 9px; background: var(--bg3); color: var(--text); font-size: 13px; width: 100%; outline: none; }
.cat-search-input:focus { border-color: var(--primary); }

.cat-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cat-chip { padding: 4px 12px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg3); color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap; }
.cat-chip:hover { border-color: var(--primary); color: var(--text); }
.cat-chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }

.cat-tabela-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); }
.cat-tabela { width: 100%; border-collapse: collapse; font-size: 13px; }
.cat-tabela th { padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text2); background: var(--bg3); position: sticky; top: 0; z-index: 1; border-bottom: 1px solid var(--border); }
.cat-tabela td { padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.cat-tabela tr:last-child td { border-bottom: none; }
.cat-tabela tbody tr:hover { background: var(--bg3); }
.cat-tabela tr.row-baixo td:first-child { border-left: 3px solid #fbbf24; }
.prod-nome { font-weight: 600; color: var(--text); }

.input-qtd { width: 70px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg3); color: var(--text); text-align: right; outline: none; }
.input-qtd:focus { border-color: var(--primary); }

.btn-add-item { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.3); border-radius: 7px; color: var(--primary); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all .15s; }
.btn-add-item:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
.btn-add-item .material-symbols-outlined { font-size: 15px; }

.pag-bar { display: flex; align-items: center; gap: 4px; padding: 10px 14px; border-top: 1px solid var(--border); }
.pag-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--bg3); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; transition: all .15s; }
.pag-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.pag-btn:disabled { opacity: .35; cursor: not-allowed; }
.pag-btn .material-symbols-outlined { font-size: 18px; }
.pag-info { padding: 0 10px; font-size: 13px; font-weight: 600; color: var(--text); min-width: 60px; text-align: center; }
.pag-total { margin-left: auto; font-size: 12px; color: var(--text2); }

/* Tabela itens */
.tabela-itens { width: 100%; border-collapse: collapse; font-size: 13px; }
.tabela-itens th { padding: 8px 14px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text2); border-bottom: 1px solid var(--border); }
.tabela-itens td { padding: 9px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tabela-itens tr:last-child td { border-bottom: none; }
.tabela-itens tfoot td { background: var(--bg3); border-top: 1px solid var(--border); }
.text-right { text-align: right; }
.bold { font-weight: 700; }
.text-muted { color: var(--text2); }

.saldo-chip { font-size: 12px; font-weight: 700; font-family: monospace; padding: 2px 8px; border-radius: 8px; }
.saldo-chip.ok   { background: rgba(74,222,128,.1);  color: #4ade80; }
.saldo-chip.zero { background: rgba(248,113,113,.1); color: #f87171; }
[data-theme="light"] .saldo-chip.ok   { color: #15803d; }
[data-theme="light"] .saldo-chip.zero { color: #b91c1c; }

.input-inline { width: 80px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg3); color: var(--text); text-align: right; outline: none; }
.input-inline:focus { border-color: var(--primary); }

.btn-remover { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: none; border: 1px solid var(--border); border-radius: 6px; color: var(--text2); cursor: pointer; }
.btn-remover:hover { background: rgba(239,68,68,.1); border-color: #ef4444; color: #ef4444; }
.btn-remover .material-symbols-outlined { font-size: 15px; }

/* Status badge */
.badge-status { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.bs-em_andamento { background: rgba(96,165,250,.15); color: #60a5fa; }
.bs-comprado     { background: rgba(251,146,60,.15); color: #fb923c; }
.bs-cancelado    { background: rgba(248,113,113,.15); color: #f87171; }
.bs-finalizado   { background: rgba(74,222,128,.15);  color: #4ade80; }
[data-theme="light"] .bs-em_andamento { color: #1d4ed8; }
[data-theme="light"] .bs-comprado     { color: #9a3412; }
[data-theme="light"] .bs-cancelado    { color: #b91c1c; }
[data-theme="light"] .bs-finalizado   { color: #15803d; }

/* Ações */
.fp-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn-cancel  { padding: 9px 20px; background: var(--bg3); border: 1px solid var(--border); border-radius: 9px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-primary { display: flex; align-items: center; gap: 6px; padding: 9px 20px; background: var(--primary); color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary .material-symbols-outlined { font-size: 18px; }

.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; color: var(--text2); font-size: 13px; }
.muted { opacity: .6; }
.spin { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.fp-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap; }
.fp-toast.ok  { background: #166534; color: #bbf7d0; }
.fp-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

@media (max-width: 800px) {
  .fp-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
  .busca-prod-input { min-width: 200px; }
}
</style>
