<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSupabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';
import api from '../services/api';

const route   = useRoute();
const router  = useRouter();
const { supabase } = useSupabase();
const sessao  = useSessaoStore();

const venda_pk = parseInt(route.params.pk);

const carregando = ref(true);
const salvando   = ref(false);
const venda      = ref(null);

const cliente        = ref('');
const cliente_pk     = ref(null);
const cliente_codigo = ref(null);
const vendedor   = ref('');
const vendedor_pk = ref(null);
const tipoVenda  = ref('venda');
const canalVenda = ref('presencial');
const dataLocacao     = ref('');
const dataDevolucao   = ref('');
const dataVencCrediario = ref('');

const itens          = ref([]);
const pagamentos     = ref([]);
const formasPagamento = ref([]);

const busca            = ref('');
const todosProdutos    = ref([]);
const buscaCliente     = ref('');
const clientesRes      = ref([]);
const buscaVendedor    = ref('');
const vendedoresRes    = ref([]);

const categorias       = ref([]);
const clienteDecorador = ref(false);

function normalizar(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const buscaResultados = computed(() => {
  const q = busca.value.trim();
  if (!q) return [];
  const palavras = normalizar(q).split(/\s+/).filter(Boolean);
  return todosProdutos.value.filter(p => {
    const desc = normalizar(p.descricao);
    const cod  = normalizar(p.codigo || '');
    return palavras.every(w => desc.includes(w) || cod.includes(w));
  }).slice(0, 20);
});

const toastMsg  = ref('');
const toastTipo = ref('ok');
let toastTimer  = null;
function toast(msg, tipo = 'ok', dur = 3500) {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMsg.value = ''), dur);
}

const acrescimo = ref(0);
const acrescimoDisplay = ref('');

const subtotal = computed(() =>
  itens.value.reduce((s, i) => s + parseFloat(i.qtd || 0) * parseFloat(i.preco_unit || 0), 0)
);
const descontoTotal = computed(() =>
  itens.value.reduce((s, i) => s + parseFloat(i.desconto_val || 0), 0)
);
const total = computed(() => subtotal.value - descontoTotal.value + parseFloat(acrescimo.value || 0));

function onAcrescimoInput(e) {
  const digits = e.target.value.replace(/\D/g, '');
  if (!digits || digits === '0') {
    acrescimo.value = 0;
    acrescimoDisplay.value = '';
    e.target.value = '';
    return;
  }
  const cents = parseInt(digits, 10);
  acrescimo.value = cents / 100;
  const fmt2 = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  acrescimoDisplay.value = fmt2;
  e.target.value = fmt2;
}
const totalPagamentos = computed(() =>
  pagamentos.value.reduce((s, p) => s + parseFloat(p.valor || 0), 0)
);
const diffPagamentos  = computed(() => totalPagamentos.value - total.value);
const temCrediario    = computed(() =>
  pagamentos.value.some(p => String(p.forma).toLowerCase() === 'crediario')
);

onMounted(async () => {
  try {
    const { data: v } = await supabase.from('vendas').select('*').eq('pk', venda_pk).single();
    if (!v) { toast('Venda não encontrada', 'err'); carregando.value = false; return; }

    venda.value          = v;
    cliente_pk.value     = v.cliente_pk   || null;
    cliente_codigo.value = v.cliente_codigo || null;
    // Busca nome atualizado do cadastro; fallback para o nome salvo na venda
    if (v.cliente_pk) {
      const { data: cli } = await supabase.from('clientes').select('nome, codigo').eq('pk', v.cliente_pk).single();
      cliente.value        = cli?.nome   || v.cliente || '';
      cliente_codigo.value = cli?.codigo || v.cliente_codigo || null;
    } else {
      cliente.value = v.cliente || '';
    }
    vendedor.value     = v.vendedor || '';
    vendedor_pk.value  = v.vendedor_pk || null;
    tipoVenda.value    = v.tipo_venda   || 'venda';
    canalVenda.value   = v.canal_venda  || 'presencial';
    dataLocacao.value    = v.data_locacao            ? v.data_locacao.slice(0, 16)            : '';
    dataDevolucao.value  = v.data_devolucao_prevista ? v.data_devolucao_prevista.slice(0, 16) : '';
    dataVencCrediario.value = v.data_vencimento_crediario || '';
    acrescimo.value = parseFloat(v.acrescimo || 0);
    if (acrescimo.value > 0)
      acrescimoDisplay.value = acrescimo.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const [{ data: iData }, { data: pData }, { data: fData }, { data: cats }, { data: prods }] = await Promise.all([
      supabase.from('itens_venda').select('*').eq('venda_pk', venda_pk),
      supabase.from('pagamentos_venda').select('*').eq('venda_pk', venda_pk),
      supabase.from('formas_pagamento').select('forma, label, icone').eq('filial_pk', sessao.filial?.pk).order('label'),
      supabase.from('categorias').select('pk, nome, desconto_somente_decorador').eq('filial_pk', sessao.filial?.pk),
      supabase.from('produtos').select('pk, descricao, codigo, valor_venda, saldo, categoria_pk').eq('filial_pk', sessao.filial?.pk).order('descricao'),
    ]);
    todosProdutos.value = prods || [];
    formasPagamento.value = fData || [];
    categorias.value = (cats || []).filter(c => c.desconto_somente_decorador);

    itens.value = (iData || []).map(i => {
      const bruto = parseFloat(i.qtd || 0) * parseFloat(i.preco_unit || 0);
      const pct   = bruto > 0 ? Math.round(parseFloat(i.desconto_val || 0) / bruto * 10000) / 100 : 0;
      return { ...i, desconto_pct: pct, modo_desc: 'val', categoria_pk: null };
    });
    pagamentos.value = (pData || []).map(p => ({ ...p }));

    // Busca categoria_pk dos produtos nos itens
    const pksItens = [...new Set(itens.value.filter(i => i.produto_pk).map(i => i.produto_pk))];
    if (pksItens.length) {
      const { data: prods } = await supabase.from('produtos').select('pk, categoria_pk').in('pk', pksItens);
      const prodMap = {};
      (prods || []).forEach(p => { prodMap[p.pk] = p.categoria_pk; });
      itens.value.forEach(item => { if (item.produto_pk) item.categoria_pk = prodMap[item.produto_pk] || null; });
    }

    // Verifica se o cliente já carregado é decorador
    if (v.cliente_pk) {
      const { data: cli } = await supabase.from('clientes').select('decorador').eq('pk', v.cliente_pk).single();
      clienteDecorador.value = cli?.decorador || false;
    }
  } catch (e) {
    toast('Erro ao carregar: ' + e.message, 'err');
  } finally {
    carregando.value = false;
  }
});


function adicionarProduto(p) {
  const existente = itens.value.find(i => i.produto_pk === p.pk);
  if (existente) {
    existente.qtd += 1;
    recalcularItem(existente);
  } else {
    const preco = parseFloat(p.valor_venda || 0);
    itens.value.push({ produto_pk: p.pk, descricao: p.descricao, codigo: p.codigo || '', qtd: 1, preco_unit: preco, desconto_pct: 0, desconto_val: 0, total_item: preco, modo_desc: 'val', categoria_pk: p.categoria_pk || null });
  }
  busca.value = '';
  buscaResultados.value = [];
}

function recalcularItem(item) {
  const bruto = parseFloat(item.qtd || 0) * parseFloat(item.preco_unit || 0);
  if (item.modo_desc === 'pct') {
    const pct = Math.min(Math.max(0, parseFloat(item.desconto_pct || 0)), 100);
    item.desconto_pct = pct;
    item.desconto_val = Math.round(bruto * pct / 100 * 100) / 100;
  } else {
    item.desconto_val = Math.min(Math.max(0, parseFloat(item.desconto_val || 0)), bruto);
    item.desconto_pct = bruto > 0 ? Math.round(item.desconto_val / bruto * 10000) / 100 : 0;
  }
  item.total_item = Math.max(0, bruto - item.desconto_val);
}

function toggleModoDesc(item) {
  item.modo_desc = item.modo_desc === 'pct' ? 'val' : 'pct';
}

function removerItem(idx) { itens.value.splice(idx, 1); }


let cliTimer = null;
async function buscarClientes() {
  const q = buscaCliente.value.trim();
  if (!q) { clientesRes.value = []; return; }
  clearTimeout(cliTimer);
  cliTimer = setTimeout(async () => {
    const { data } = await supabase.from('clientes').select('pk, nome, codigo, decorador').eq('filial_pk', sessao.filial.pk).eq('ativo', true).ilike('nome', `%${q}%`).limit(8);
    clientesRes.value = data || [];
  }, 280);
}
function selecionarCliente(c) { cliente.value = c.nome; cliente_pk.value = c.pk; cliente_codigo.value = c.codigo || null; clienteDecorador.value = c.decorador || false; buscaCliente.value = ''; clientesRes.value = []; }
function limparCliente()       { cliente.value = ''; cliente_pk.value = null; cliente_codigo.value = null; clienteDecorador.value = false; }

let vendTimer = null;
async function buscarVendedores() {
  const q = buscaVendedor.value.trim();
  if (!q) { vendedoresRes.value = []; return; }
  clearTimeout(vendTimer);
  vendTimer = setTimeout(async () => {
    const { data } = await supabase.from('vendedores').select('pk, nome').eq('filial_pk', sessao.filial.pk).ilike('nome', `%${q}%`).limit(8);
    vendedoresRes.value = data || [];
  }, 280);
}
function selecionarVendedor(v) { vendedor.value = v.nome; vendedor_pk.value = v.pk; buscaVendedor.value = ''; vendedoresRes.value = []; }
function limparVendedor()       { vendedor.value = ''; vendedor_pk.value = null; }

function adicionarPagamento() {
  const forma = formasPagamento.value[0]?.forma || 'dinheiro';
  pagamentos.value.push({ forma, valor: 0 });
}
function removerPagamento(idx) { pagamentos.value.splice(idx, 1); }

async function salvar() {
  if (!itens.value.length)      return toast('Adicione pelo menos um item', 'err');
  if (!pagamentos.value.length) return toast('Adicione pelo menos um pagamento', 'err');

  salvando.value = true;
  try {
    const payload = {
      cliente:        cliente.value        || null,
      cliente_pk:     cliente_pk.value     || null,
      cliente_codigo: cliente_codigo.value || null,
      vendedor:     vendedor.value     || null,
      vendedor_pk:  vendedor_pk.value  || null,
      tipo_venda:   tipoVenda.value,
      canal_venda:  canalVenda.value,
      subtotal:     subtotal.value,
      desconto_total: descontoTotal.value,
      acrescimo:    acrescimo.value,
      total:        total.value,
      itens: itens.value.map(i => ({
        produto_pk:   i.produto_pk   || null,
        descricao:    i.descricao    || '',
        codigo:       i.codigo       || null,
        qtd:          parseFloat(i.qtd          || 1),
        preco_unit:   parseFloat(i.preco_unit   || 0),
        total_item:   parseFloat(i.total_item   || 0),
        desconto_val: parseFloat(i.desconto_val || 0),
      })),
      pagamentos: pagamentos.value.map(p => ({
        forma: p.forma,
        valor: parseFloat(p.valor || 0),
      })),
    };

    if (tipoVenda.value === 'locacao') {
      payload.data_locacao = dataLocacao.value || null;
      payload.data_devolucao_prevista = dataDevolucao.value || null;
    }
    if (temCrediario.value) {
      payload.data_vencimento_crediario = dataVencCrediario.value || null;
    }

    await api.put(`/api/vendas/${venda_pk}`, payload);
    toast('Venda atualizada com sucesso!');
    setTimeout(() => router.push('/historico-vendas?abrir=' + venda_pk), 1200);
  } catch (e) {
    toast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    salvando.value = false;
  }
}

const catsDecorador = computed(() => {
  const pksNoCarrinho = new Set(itens.value.filter(i => i.categoria_pk).map(i => i.categoria_pk));
  return categorias.value.filter(c => pksNoCarrinho.has(c.pk));
});

function aplicarDescCat(cat) {
  if (!clienteDecorador.value) {
    toast(`Desconto em "${cat.nome}" é exclusivo para clientes decoradores.`, 'err');
    return;
  }
  itens.value.forEach(item => {
    if (item.categoria_pk === cat.pk) {
      item.modo_desc = 'pct';
      item.desconto_pct = 10;
      recalcularItem(item);
    }
  });
  toast(`Desconto 10% aplicado em ${cat.nome}.`);
}

function removerDescCat(cat) {
  itens.value.forEach(item => {
    if (item.categoria_pk === cat.pk) {
      item.modo_desc = 'pct';
      item.desconto_pct = 0;
      recalcularItem(item);
    }
  });
}

function cancelar() { router.push('/historico-vendas?abrir=' + venda_pk); }

function fmtVal(v) {
  return parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="ev-page">

    <div class="ev-header">
      <button @click="cancelar" class="ev-back-btn">
        <span class="material-symbols-outlined">arrow_back</span>
        Histórico
      </button>
      <div class="ev-title">
        <h1 class="ev-h1">Editando Venda <span class="ev-num">#{{ venda?.numero }}</span></h1>
        <span class="ev-sub">{{ sessao.filial?.nome }}</span>
      </div>
      <div class="ev-header-actions">
        <button @click="cancelar" class="ev-btn-cancel">Cancelar</button>
        <button @click="salvar" class="ev-btn-save" :disabled="salvando">
          <span class="material-symbols-outlined" :style="salvando ? 'animation:spin 1s linear infinite' : ''">
            {{ salvando ? 'sync' : 'save' }}
          </span>
          {{ salvando ? 'Salvando...' : 'Salvar Alterações' }}
        </button>
      </div>
    </div>

    <div v-if="carregando" class="ev-loading">
      <div class="ev-spinner"></div>
    </div>

    <div v-else class="ev-main">

      <!-- LEFT: itens -->
      <div class="ev-left">
        <div class="ev-section-label">Produtos / Itens</div>

        <div class="ev-search-wrap">
          <span class="material-symbols-outlined ev-search-icon">search</span>
          <input
            v-model="busca"
            class="ev-search-input"
            placeholder="Buscar produto por nome ou código..."
            autocomplete="off"
          />
          <div v-if="buscaResultados.length" class="ev-dropdown">
            <div
              v-for="p in buscaResultados"
              :key="p.pk"
              @click="adicionarProduto(p)"
              class="ev-dropdown-item"
            >
              <span class="ev-di-nome">{{ p.descricao }}</span>
              <span class="ev-di-preco">R$ {{ fmtVal(p.valor_venda) }}</span>
            </div>
          </div>
        </div>

        <!-- Desconto decorador -->
        <div v-if="catsDecorador.length" class="ev-dec-section">
          <div class="ev-section-label">Desconto decorador</div>
          <div v-for="cd in catsDecorador" :key="cd.pk" class="ev-dec-row">
            <span class="ev-dec-nome">🎈 {{ cd.nome }}</span>
            <span class="ev-dec-pct">10%</span>
            <button class="ev-btn-apply-dec" @click="aplicarDescCat(cd)">Aplicar</button>
            <button class="ev-btn-remove-dec" @click="removerDescCat(cd)" title="Remover desconto">
              <span class="material-symbols-outlined" style="font-size:13px">close</span>
              Tirar
            </button>
          </div>
        </div>

        <div class="ev-items-wrap">
          <table v-if="itens.length" class="ev-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th class="ev-th-c">Qtd</th>
                <th class="ev-th-c">P. Unit</th>
                <th class="ev-th-c">Desconto</th>
                <th class="ev-th-c">Total</th>
                <th class="ev-th-c"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in itens" :key="idx" class="ev-tr">
                <td>
                  <input v-model="item.descricao" class="ev-td-input" placeholder="Descrição" />
                </td>
                <td>
                  <input v-model.number="item.qtd" @input="recalcularItem(item)" type="number" min="1" step="1" class="ev-td-input ev-td-num" />
                </td>
                <td>
                  <input v-model.number="item.preco_unit" @input="recalcularItem(item)" type="number" min="0" step="0.01" class="ev-td-input ev-td-num" />
                </td>
                <td>
                  <div class="ev-desc-cell">
                    <button @click="toggleModoDesc(item)" class="ev-desc-toggle" :title="item.modo_desc === 'pct' ? 'Mudar para R$' : 'Mudar para %'">
                      {{ item.modo_desc === 'pct' ? '%' : 'R$' }}
                    </button>
                    <input
                      v-if="item.modo_desc === 'pct'"
                      v-model.number="item.desconto_pct"
                      @input="recalcularItem(item)"
                      type="number" min="0" max="100" step="0.1"
                      class="ev-td-input ev-td-num"
                      placeholder="0"
                    />
                    <input
                      v-else
                      v-model.number="item.desconto_val"
                      @input="recalcularItem(item)"
                      type="number" min="0" step="0.01"
                      class="ev-td-input ev-td-num"
                      placeholder="0,00"
                    />
                  </div>
                </td>
                <td class="ev-td-total">R$ {{ fmtVal(item.total_item) }}</td>
                <td>
                  <button @click="removerItem(idx)" class="ev-remove-btn" title="Remover">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="ev-empty">Nenhum item — use a busca acima para adicionar produtos</div>
        </div>

        <div class="ev-totals">
          <div class="ev-tot-row">
            <span>Subtotal</span>
            <span>R$ {{ fmtVal(subtotal) }}</span>
          </div>
          <div class="ev-tot-row ev-tot-desc">
            <span>Desconto total</span>
            <span>- R$ {{ fmtVal(descontoTotal) }}</span>
          </div>
          <div class="ev-tot-row ev-tot-acrescimo">
            <span>Acréscimo</span>
            <input
              :value="acrescimoDisplay"
              @input="onAcrescimoInput"
              type="text"
              inputmode="numeric"
              placeholder="0,00"
              class="ev-acrescimo-input"
            />
          </div>
          <div class="ev-tot-row ev-tot-final">
            <span>Total da venda</span>
            <span>R$ {{ fmtVal(total) }}</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: info -->
      <div class="ev-right">

        <!-- Cliente -->
        <div class="ev-card">
          <div class="ev-card-title">Cliente</div>
          <div v-if="cliente" class="ev-tag">
            <span>{{ cliente }}</span>
            <button @click="limparCliente" class="ev-tag-clear"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div v-else class="ev-search-wrap">
            <span class="material-symbols-outlined ev-search-icon">person_search</span>
            <input v-model="buscaCliente" @input="buscarClientes" class="ev-search-input" placeholder="Buscar cliente..." />
            <div v-if="clientesRes.length" class="ev-dropdown">
              <div v-for="c in clientesRes" :key="c.pk" @click="selecionarCliente(c)" class="ev-dropdown-item">{{ c.nome }}</div>
            </div>
          </div>
        </div>

        <!-- Vendedor -->
        <div class="ev-card">
          <div class="ev-card-title">Vendedor</div>
          <div v-if="vendedor" class="ev-tag">
            <span>{{ vendedor }}</span>
            <button @click="limparVendedor" class="ev-tag-clear"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div v-else class="ev-search-wrap">
            <span class="material-symbols-outlined ev-search-icon">badge</span>
            <input v-model="buscaVendedor" @input="buscarVendedores" class="ev-search-input" placeholder="Buscar vendedor..." />
            <div v-if="vendedoresRes.length" class="ev-dropdown">
              <div v-for="v in vendedoresRes" :key="v.pk" @click="selecionarVendedor(v)" class="ev-dropdown-item">{{ v.nome }}</div>
            </div>
          </div>
        </div>

        <!-- Tipo e Canal -->
        <div class="ev-card">
          <div class="ev-card-title">Tipo de Venda</div>
          <div class="ev-row2">
            <div class="ev-field">
              <label class="ev-label">Tipo</label>
              <select v-model="tipoVenda" class="ev-select">
                <option value="venda">Venda</option>
                <option value="locacao">Locação</option>
                <option value="orcamento">Orçamento</option>
              </select>
            </div>
            <div class="ev-field">
              <label class="ev-label">Canal</label>
              <select v-model="canalVenda" class="ev-select">
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
                <option value="telefone">Telefone</option>
              </select>
            </div>
          </div>
          <template v-if="tipoVenda === 'locacao'">
            <div class="ev-field" style="margin-top:4px">
              <label class="ev-label">Retirada</label>
              <input v-model="dataLocacao" type="datetime-local" class="ev-input" />
            </div>
            <div class="ev-field">
              <label class="ev-label">Devolução prevista</label>
              <input v-model="dataDevolucao" type="datetime-local" class="ev-input" />
            </div>
          </template>
        </div>

        <!-- Pagamentos -->
        <div class="ev-card">
          <div class="ev-card-title-row">
            <span class="ev-card-title">Pagamentos</span>
            <button @click="adicionarPagamento" class="ev-add-pag-btn">
              <span class="material-symbols-outlined">add</span>
              Adicionar
            </button>
          </div>

          <div v-if="!pagamentos.length" class="ev-pag-empty">Nenhum pagamento</div>

          <div v-for="(pag, idx) in pagamentos" :key="idx" class="ev-pag-row">
            <select v-model="pag.forma" class="ev-select ev-pag-forma">
              <option v-for="f in formasPagamento" :key="f.forma" :value="f.forma">{{ f.icone }} {{ f.label }}</option>
            </select>
            <input v-model.number="pag.valor" type="number" min="0" step="0.01" class="ev-input ev-pag-valor" placeholder="0,00" />
            <button type="button" @click="removerPagamento(idx)" class="ev-remove-btn">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>

          <div v-if="temCrediario" class="ev-field" style="margin-top:10px">
            <label class="ev-label">Vencimento do crediário</label>
            <input v-model="dataVencCrediario" type="date" class="ev-input" />
          </div>

          <div v-if="pagamentos.length" class="ev-pag-diff" :class="Math.abs(diffPagamentos) < 0.01 ? 'ev-pag-ok' : 'ev-pag-err'">
            <span>Total pago: R$ {{ fmtVal(totalPagamentos) }}</span>
            <span v-if="Math.abs(diffPagamentos) >= 0.01" class="ev-pag-diff-info">
              {{ diffPagamentos > 0 ? 'Troco: R$ ' + fmtVal(diffPagamentos) : 'Faltam: R$ ' + fmtVal(-diffPagamentos) }}
            </span>
          </div>
        </div>

      </div>
    </div>

    <Transition name="toast">
      <div v-if="toastMsg" class="ev-toast" :class="'ev-toast-' + toastTipo">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }

.ev-page { display: flex; flex-direction: column; min-height: 100%; background: var(--bg); }

/* Header */
.ev-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: var(--bg2); border-bottom: 1px solid var(--border); flex-shrink: 0; flex-wrap: wrap; }
.ev-back-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); border-radius: 10px; cursor: pointer; font-size: .88rem; font-weight: 600; transition: all .15s; flex-shrink: 0; }
.ev-back-btn:hover { background: var(--bg4); color: var(--text); }
.ev-title { flex: 1; min-width: 0; }
.ev-h1 { font-size: 1.1rem; font-weight: 800; color: var(--text); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev-num { color: var(--primary); }
.ev-sub { font-size: .8rem; color: var(--text2); }
.ev-header-actions { display: flex; gap: 10px; flex-shrink: 0; }
.ev-btn-cancel { padding: 9px 18px; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; transition: all .15s; }
.ev-btn-cancel:hover { background: var(--bg4); }
.ev-btn-save { display: flex; align-items: center; gap: 7px; padding: 9px 20px; border: none; background: var(--primary); color: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; transition: opacity .15s; }
.ev-btn-save:hover:not(:disabled) { opacity: .88; }
.ev-btn-save:disabled { opacity: .5; cursor: not-allowed; }

/* Loading */
.ev-loading { display: flex; align-items: center; justify-content: center; flex: 1; padding: 80px; }
.ev-spinner { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }

/* Main layout */
.ev-main { display: flex; gap: 20px; padding: 20px 24px; flex: 1; align-items: flex-start; overflow-x: auto; }
.ev-left  { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.ev-right { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }

.ev-section-label { font-size: .75rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .08em; }

/* Search */
.ev-search-wrap { position: relative; display: flex; align-items: center; gap: 8px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 0 12px; }
.ev-search-icon  { font-size: 20px; color: var(--text2); flex-shrink: 0; }
.ev-search-input { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: .95rem; padding: 10px 0; }
.ev-search-input::placeholder { color: var(--text2); }
.ev-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,.25); max-height: 280px; overflow-y: auto; }
.ev-dropdown-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; font-size: .9rem; color: var(--text); transition: background .12s; }
.ev-dropdown-item:hover { background: var(--bg3); }
.ev-di-nome  { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-di-preco { font-weight: 700; color: var(--primary); flex-shrink: 0; margin-left: 12px; }

/* Items table */
.ev-items-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.ev-table { width: 100%; border-collapse: collapse; }
.ev-table thead th { background: var(--bg3); padding: 10px 12px; font-size: .78rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .04em; text-align: left; border-bottom: 1px solid var(--border); }
.ev-th-c { text-align: right; width: 100px; }
.ev-tr { border-bottom: 1px solid var(--border); }
.ev-tr:last-child { border-bottom: none; }
.ev-tr:hover { background: var(--bg3); }
.ev-td-input { width: 100%; background: transparent; border: none; outline: none; color: var(--text); font-size: .9rem; padding: 10px 12px; }
.ev-td-input:focus { background: var(--bg3); border-radius: 6px; }
.ev-td-num { text-align: right; width: 90px; }
.ev-td-total { padding: 10px 12px; font-weight: 700; color: var(--text); text-align: right; white-space: nowrap; font-size: .9rem; }
.ev-remove-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: transparent; color: var(--text2); border-radius: 8px; cursor: pointer; margin: 4px; transition: all .12s; }
.ev-remove-btn:hover { background: rgba(239,68,68,.15); color: #f87171; }
.ev-desc-cell { display: flex; align-items: center; }
.ev-desc-toggle { flex-shrink: 0; width: 32px; height: 28px; border: 1px solid var(--border); background: var(--bg3); color: var(--primary); border-radius: 6px; cursor: pointer; font-size: .78rem; font-weight: 800; transition: all .12s; margin-right: 2px; }
.ev-desc-toggle:hover { background: rgba(99,102,241,.15); border-color: var(--primary); }
.ev-empty { padding: 32px; text-align: center; color: var(--text2); font-size: .9rem; }


/* Totals */
.ev-totals { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; }
.ev-tot-row { display: flex; justify-content: space-between; font-size: .9rem; color: var(--text2); }
.ev-tot-desc { color: #f87171; }
.ev-tot-acrescimo { color: #34d399; align-items: center; }
.ev-acrescimo-input { width: 100px; text-align: right; padding: 3px 8px; border: 1.5px solid var(--border); border-radius: 7px; background: #fff; color: #111827; font-size: .88rem; outline: none; }
.ev-acrescimo-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
[data-theme="dark"] .ev-acrescimo-input { background: var(--bg); border-color: var(--border); color: var(--text); }
.ev-tot-final { font-size: 1.1rem; font-weight: 800; color: var(--text); border-top: 1px solid var(--border); padding-top: 8px; margin-top: 2px; }

/* Cards */
.ev-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.ev-card-title { font-size: .78rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; }
.ev-card-title-row { display: flex; align-items: center; justify-content: space-between; }
.ev-tag { display: flex; align-items: center; justify-content: space-between; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; font-size: .9rem; color: var(--text); font-weight: 600; }
.ev-tag-clear { display: flex; border: none; background: transparent; color: var(--text2); cursor: pointer; border-radius: 6px; padding: 2px; transition: color .12s; }
.ev-tag-clear:hover { color: #f87171; }

/* Fields */
.ev-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-width: 0; }
.ev-row2 .ev-field { min-width: 0; overflow: hidden; }
.ev-field { display: flex; flex-direction: column; gap: 4px; }
.ev-label { font-size: .75rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .05em; }
.ev-select { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 8px 10px; font-size: .9rem; outline: none; width: 100%; }
.ev-select:focus { border-color: var(--primary); }
.ev-input { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 8px 10px; font-size: .9rem; outline: none; width: 100%; box-sizing: border-box; min-width: 0; }
.ev-input:focus { border-color: var(--primary); }

/* Payments */
.ev-add-pag-btn { display: flex; align-items: center; gap: 4px; padding: 5px 12px; border: 1px solid rgba(99,102,241,.4); background: rgba(99,102,241,.1); color: var(--primary); border-radius: 8px; cursor: pointer; font-size: .82rem; font-weight: 700; transition: all .15s; }
.ev-add-pag-btn:hover { background: rgba(99,102,241,.2); }
.ev-pag-empty { font-size: .85rem; color: var(--text2); text-align: center; padding: 8px; }
.ev-pag-row { display: flex; gap: 8px; align-items: center; }
.ev-pag-forma { flex: 1; }
.ev-pag-valor { width: 110px; flex-shrink: 0; text-align: right; }
.ev-pag-diff { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; font-size: .85rem; font-weight: 600; margin-top: 4px; }
.ev-pag-ok  { background: rgba(16,185,129,.1); color: #34d399; }
.ev-pag-err { background: rgba(239,68,68,.1); color: #f87171; }
.ev-pag-diff-info { font-size: .8rem; }

/* Desconto decorador */
.ev-dec-section { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
.ev-dec-row { display: flex; align-items: center; gap: 8px; }
.ev-dec-nome { flex: 1; font-size: 13px; font-weight: 500; color: var(--text); }
.ev-dec-pct { font-family: monospace; font-size: 13px; font-weight: 700; color: #f59e0b; padding: 3px 8px; }
.ev-btn-apply-dec { padding: 5px 12px; border: 1px solid rgba(99,102,241,.4); background: rgba(99,102,241,.1); color: var(--primary); border-radius: 8px; cursor: pointer; font-size: .82rem; font-weight: 700; transition: all .15s; }
.ev-btn-apply-dec:hover { background: rgba(99,102,241,.2); }
.ev-btn-remove-dec { display: flex; align-items: center; gap: 3px; padding: 5px 10px; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); border-radius: 8px; cursor: pointer; font-size: .82rem; font-weight: 600; transition: all .15s; }
.ev-btn-remove-dec:hover { background: rgba(239,68,68,.12); color: #f87171; border-color: rgba(239,68,68,.3); }

/* Toast */
.ev-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: .9rem; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,.3); white-space: nowrap; }
.ev-toast-ok  { background: #065f46; color: #6ee7b7; border: 1px solid #059669; }
.ev-toast-err { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; }
.toast-enter-active, .toast-leave-active { transition: all .3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
</style>
