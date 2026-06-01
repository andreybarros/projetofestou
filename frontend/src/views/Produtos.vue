<template>
  <div class="prod-wrap">
    <div class="prod-header">
      <div>
        <h1 class="page-title">Produtos</h1>
        <p class="page-sub">{{ produtosFiltrados.length }} produto(s) cadastrado(s)</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input v-model="busca" type="text" placeholder="Buscar por nome, código ou barras..." class="busca-input" />
          <button class="btn-scan-prod" @click="abrirScanner" title="Ler código de barras">
            <span class="material-symbols-outlined">barcode_scanner</span>
          </button>
        </div>
        <div class="view-toggle">
          <button :class="['btn-view', viewMode === 'grid' ? 'active' : '']" @click="viewMode = 'grid'" title="Grade">
            <span class="material-symbols-outlined">grid_view</span>
          </button>
          <button :class="['btn-view', viewMode === 'table' ? 'active' : '']" @click="viewMode = 'table'" title="Lista">
            <span class="material-symbols-outlined">table_rows</span>
          </button>
        </div>
        <button @click="$router.push('/produtos/novo')" class="btn-primary">
          <span class="material-symbols-outlined">add</span>
          Novo Produto
        </button>

        <!-- Dropdown Outras Ações -->
        <div class="dropdown-wrap">
          <button @click="showAcoes = !showAcoes" :class="['btn-secondary', showAcoes ? 'active' : '']">
            <span class="material-symbols-outlined">{{ showAcoes ? 'expand_less' : 'more_vert' }}</span>
            Outras Ações
          </button>
          
          <Transition name="drop">
            <div v-if="showAcoes" class="dropdown-menu card-glass">
              <button class="drop-item" @click="$router.push('/produtos/importar'); showAcoes = false">
                <span class="material-symbols-outlined">upload_file</span>
                Importar CSV
              </button>
              <button class="drop-item" @click="$router.push('/produtos/reajuste'); showAcoes = false">
                <span class="material-symbols-outlined">payments</span>
                Reajuste em Massa
              </button>
              <button class="drop-item" @click="exportarProdutos">
                <span class="material-symbols-outlined">download</span>
                Exportar Excel
              </button>
              <div class="drop-sep"></div>
              <button class="drop-item" @click="abrirEtiquetas">
                <span class="material-symbols-outlined">label</span>
                Imprimir Etiquetas
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Filtros rápidos -->
    <div class="filtros-rapidos">
      <button :class="['filtro-chip', { active: filtroPromo }]" @click="filtroPromo = !filtroPromo">
        <span class="material-symbols-outlined">local_offer</span>
        Em Promoção
      </button>
    </div>

    <div v-if="carregando" class="loading">
      <div class="spin"></div>
      <span>Carregando produtos...</span>
    </div>

    <div v-else-if="produtosFiltrados.length === 0" class="vazio">
      <span class="material-symbols-outlined" style="font-size:3rem;opacity:.3">inventory_2</span>
      <p>Nenhum produto encontrado.</p>
    </div>

    <template v-else>
      <!-- Grade de Cards -->
      <div v-if="viewMode === 'grid'" class="cards-grid">
        <div v-for="p in produtosPaginados" :key="p.pk" class="prod-card" @click="$router.push(`/produtos/${p.pk}/editar`)">
          <div class="card-foto">
            <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" class="card-img" loading="lazy" />
            <div v-else class="card-avatar">{{ p.descricao?.charAt(0)?.toUpperCase() }}</div>
            <span :class="['saldo-badge', p.saldo <= 0 ? 'zero' : p.saldo < 5 ? 'baixo' : 'ok']">
              {{ p.saldo != null ? p.saldo : '∞' }}
            </span>
            <button class="btn-del-card" title="Excluir" @click.stop="produtoParaExcluir = p">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
          <div class="card-info">
            <p class="card-desc">{{ p.descricao }}</p>
            <p class="card-cat">{{ p.categoria_nome || '—' }}</p>
            <div class="card-footer">
              <div v-if="p.em_promo" class="card-promo-area">
                <span class="card-preco-antigo">{{ fmt(p.valor_venda) }}</span>
                <span class="card-preco-novo">{{ fmt(p.preco_promo) }}</span>
              </div>
              <span v-else class="card-preco">{{ fmt(p.valor_venda) }}</span>
              <span v-if="p.codigo" class="card-cod">{{ p.codigo }}</span>
            </div>
          </div>
          <div v-if="p.em_promo" class="promo-badge-tag">PROMO</div>
        </div>
      </div>

      <!-- Tabela -->
      <div v-if="viewMode === 'table'" class="tabela-wrap">
        <table class="tabela">
          <thead>
            <tr>
              <th style="width:52px"></th>
              <th>Código</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Preço Venda</th>
              <th>Saldo</th>
              <th>NCM</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in produtosPaginados" :key="p.pk" @click="$router.push(`/produtos/${p.pk}/editar`)">
              <td>
                <div class="table-thumb">
                  <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" class="thumb-img" loading="lazy" />
                  <div v-else class="thumb-avatar">{{ p.descricao?.charAt(0)?.toUpperCase() }}</div>
                </div>
              </td>
              <td class="mono">{{ p.codigo || "—" }}</td>
              <td>{{ p.descricao }}</td>
              <td>{{ p.categoria_nome || "—" }}</td>
              <td class="mono">
                <div v-if="p.em_promo" class="table-promo">
                  <span class="table-old-price">{{ fmt(p.valor_venda) }}</span>
                  <span class="table-new-price">{{ fmt(p.preco_promo) }}</span>
                </div>
                <span v-else>{{ fmt(p.valor_venda) }}</span>
              </td>
              <td :class="['saldo', (p.saldo || 0) <= 0 ? 'zero' : (p.saldo || 0) < 5 ? 'baixo' : 'ok']">{{ p.saldo ?? '∞' }}</td>
              <td class="mono">{{ p.ncm || '—' }}</td>
              <td class="acoes">
                <button class="btn-edit" title="Editar">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-del" title="Excluir" @click.stop="produtoParaExcluir = p">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="resumo">
          {{ (pagina - 1) * POR_PAGINA + 1 }}–{{ Math.min(pagina * POR_PAGINA, produtosFiltrados.length) }} de {{ produtosFiltrados.length }} produto(s)
          <span v-if="totalPaginas > 1" class="resumo-paginas">
            &nbsp;·&nbsp;
            <button class="pg-btn" :disabled="pagina === 1" @click="pagina--">‹</button>
            {{ pagina }} / {{ totalPaginas }}
            <button class="pg-btn" :disabled="pagina === totalPaginas" @click="pagina++">›</button>
          </span>
        </div>
      </div>

      <!-- Paginação Geral -->
      <div v-if="totalPaginas > 1 && viewMode === 'grid'" class="paginacao">
        <button class="pg-btn" :disabled="pagina === 1" @click="pagina--">‹</button>
        <span class="pg-info">{{ pagina }} / {{ totalPaginas }}</span>
        <button class="pg-btn" :disabled="pagina === totalPaginas" @click="pagina++">›</button>
      </div>
    </template>

    <!-- Totalizadores -->
    <div v-if="!carregando && produtos.length" class="totalizadores card-glass">
      <div class="total-item">
        <span class="total-label">Total de produtos cadastrados</span>
        <span class="total-val">{{ produtos.length.toLocaleString('pt-BR') }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">Total de produtos em estoque</span>
        <span class="total-val">{{ (totais.qtd || 0).toLocaleString('pt-BR') }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">Valor de custo em estoque</span>
        <span class="total-val">{{ fmt(totais.custo) }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">Valor de venda em estoque</span>
        <span class="total-val venda">{{ fmt(totais.venda) }}</span>
      </div>
    </div>
  </div>

  <!-- Modal confirmação exclusão -->
  <Teleport to="body">
    <div v-if="produtoParaExcluir" class="modal-backdrop" @click.self="produtoParaExcluir = null">
      <div class="modal-box" style="max-width:420px">
        <div class="modal-header">
          <span class="material-symbols-outlined" style="color:#ef4444">delete</span>
          <h3>Excluir produto</h3>
          <button class="modal-close" @click="produtoParaExcluir = null">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p>Tem certeza que deseja excluir <strong>{{ produtoParaExcluir.descricao }}</strong>?</p>
          <p style="font-size:.85rem;color:var(--text2);margin-top:6px">O produto não aparecerá mais no sistema, mas o histórico de vendas será preservado.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="produtoParaExcluir = null" :disabled="excluindo">Cancelar</button>
          <button class="btn-danger" @click="confirmarExclusao" :disabled="excluindo">
            <span v-if="excluindo" class="spin" style="width:14px;height:14px"></span>
            <span v-else class="material-symbols-outlined" style="font-size:18px">delete</span>
            Excluir
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal Imprimir Etiquetas -->
  <Teleport to="body">
    <div v-if="showEtiquetas" class="etq-bg" @click.self="showEtiquetas = false">
      <div class="etq-modal">
        <div class="etq-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="material-symbols-outlined" style="color:var(--primary)">label</span>
            <h3 style="font-size:1rem;font-weight:700">Imprimir Etiquetas</h3>
          </div>
          <button class="etq-close" @click="showEtiquetas = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="etq-toolbar">
          <div class="etq-search-wrap">
            <svg class="etq-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="etqBusca" type="text" placeholder="Buscar produto, código ou barras..." class="etq-search" autofocus />
            <button v-if="etqBusca" class="etq-search-clear" @click="etqBusca = ''">×</button>
          </div>
          <button class="etq-btn-all" @click="selecionarTodosEtq">
            {{ produtosEtq.length && produtosEtq.every(p => etqSelecao[p.pk] !== undefined) ? 'Desmarcar todos' : 'Selecionar todos' }}
          </button>
        </div>
        <div class="etq-lista">
          <div
            v-for="p in produtosEtq" :key="p.pk"
            :class="['etq-item', etqSelecao[p.pk] !== undefined ? 'etq-item--sel' : '']"
            @click="toggleEtq(p)"
          >
            <span class="material-symbols-outlined etq-chk">
              {{ etqSelecao[p.pk] !== undefined ? 'check_box' : 'check_box_outline_blank' }}
            </span>
            <div class="etq-info">
              <span class="etq-desc">{{ p.descricao }}</span>
              <span class="etq-sub">{{ p.codigo || '—' }} · {{ p.codigo_barras || 'sem código de barras' }}</span>
            </div>
            <span class="etq-preco">{{ fmt(p.em_promo && p.preco_promo ? p.preco_promo : p.valor_venda) }}</span>
            <div v-if="etqSelecao[p.pk] !== undefined" class="etq-qty" @click.stop>
              <button class="etq-qty-btn" @click="ajustarQtyEtq(p.pk, -1)">−</button>
              <span class="etq-qty-val">{{ etqSelecao[p.pk] }}</span>
              <button class="etq-qty-btn" @click="ajustarQtyEtq(p.pk, +1)">+</button>
            </div>
            <div v-else class="etq-qty-ph"></div>
          </div>
          <div v-if="produtosEtq.length === 0" class="etq-vazio">Nenhum produto encontrado.</div>
        </div>
        <div class="etq-footer">
          <span class="etq-footer-info">
            {{ Object.keys(etqSelecao).length }} produto(s) selecionado(s) · <strong>{{ totalEtiquetas }} etiqueta(s)</strong>
          </span>
          <button class="etq-btn-print" :disabled="totalEtiquetas === 0" @click="imprimirEtiquetas">
            <span class="material-symbols-outlined">print</span>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Scanner de código de barras -->
  <Teleport to="body">
    <div v-if="scannerAberto" class="prod-scanner-overlay">
      <div class="prod-scanner-box">
        <div class="prod-scanner-header">
          <span class="material-symbols-outlined" style="font-size:22px;color:#6366f1">barcode_scanner</span>
          <span class="prod-scanner-title">Aponte para o código de barras</span>
          <button class="prod-scanner-close" @click="fecharScanner">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="prod-scanner-viewport">
          <video id="prod-scanner-video" class="prod-scanner-video" playsinline muted></video>
          <div class="prod-scanner-frame">
            <span class="psf-corner tl"></span>
            <span class="psf-corner tr"></span>
            <span class="psf-corner bl"></span>
            <span class="psf-corner br"></span>
          </div>
          <div class="prod-scanner-line"></div>
        </div>
        <p v-if="scannerStatus" class="prod-scanner-status" :class="scannerStatusTipo">{{ scannerStatus }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useSessaoStore } from "../stores/sessao";
import { supabase } from "../composables/useSupabase";
import apiClient from "../services/api";
import * as XLSX from "xlsx";

const router      = useRouter();
const sessaoStore = useSessaoStore();
const produtos    = ref([]);
const categorias  = ref([]);
const carregando  = ref(true);
const busca        = ref(sessionStorage.getItem('produtos_busca') || "");
const viewMode     = ref("grid");
const pagina       = ref(1);
const POR_PAGINA   = 48;
const showAcoes    = ref(false);
const filtroPromo  = ref(false);
const produtoParaExcluir = ref(null);
const excluindo          = ref(false);
const scannerAberto     = ref(false);
const scannerStatus     = ref('');
const scannerStatusTipo = ref('');
let zxingReader     = null;
let scannerControls = null;
let scannerDetectado = false;

async function abrirScanner() {
  scannerAberto.value = true;
  scannerDetectado = false;
  scannerStatus.value = '';
  scannerStatusTipo.value = '';
  await nextTick();
  await nextTick();
  if (!navigator.mediaDevices?.getUserMedia) {
    scannerStatus.value = 'Câmera requer conexão segura (HTTPS).';
    scannerStatusTipo.value = 'err';
    return;
  }
  const videoEl = document.getElementById('prod-scanner-video');
  if (!videoEl) { scannerStatus.value = 'Erro: vídeo não encontrado.'; scannerStatusTipo.value = 'err'; return; }
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
    const hints = new Map([
      [DecodeHintType.TRY_HARDER, true],
      [DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      ]],
    ]);
    zxingReader = new BrowserMultiFormatReader(hints);
    scannerControls = await zxingReader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      videoEl,
      (result, error) => {
        if (!result || scannerDetectado) return;
        scannerDetectado = true;
        const codigo = result.getText();
        fecharScanner();
        busca.value = codigo;
        pagina.value = 1;
      }
    );
  } catch (e) {
    const msg = e?.message || '';
    if (/permission|denied|notallowed/i.test(msg)) {
      scannerStatus.value = 'Permissão de câmera negada. Libere nas configurações do navegador.';
    } else if (/notfound|devicenotfound/i.test(msg)) {
      scannerStatus.value = 'Nenhuma câmera encontrada neste dispositivo.';
    } else {
      scannerStatus.value = msg || 'Não foi possível iniciar o scanner.';
    }
    scannerStatusTipo.value = 'err';
  }
}

function fecharScanner() {
  try { scannerControls?.stop(); } catch {}
  try { zxingReader?.reset(); } catch {}
  const videoEl = document.getElementById('prod-scanner-video');
  if (videoEl?.srcObject) { videoEl.srcObject.getTracks().forEach(t => t.stop()); videoEl.srcObject = null; }
  scannerControls = null;
  zxingReader = null;
  scannerAberto.value = false;
  scannerStatus.value = '';
}

function semAcento(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const produtosFiltrados = computed(() => {
  const q = semAcento((busca.value || '').trim());
  return produtos.value.filter(p => {
    if (filtroPromo.value && !p.em_promo) return false;
    if (!q) return true;
    const palavras = q.split(/\s+/).filter(Boolean);
    const desc   = semAcento(p.descricao);
    const codigo = semAcento(p.codigo);
    const barras = (p.codigo_barras || '').toLowerCase();
    if (barras.includes(q) || codigo.includes(q)) return true;
    return palavras.every(w => desc.includes(w));
  });
});

const totalPaginas    = computed(() => Math.max(1, Math.ceil(produtosFiltrados.value.length / POR_PAGINA)));
const produtosPaginados = computed(() => {
  const ini = (pagina.value - 1) * POR_PAGINA;
  return produtosFiltrados.value.slice(ini, ini + POR_PAGINA);
});

const totais = computed(() => {
  try {
    return produtos.value.reduce((acc, p) => {
      const s = parseFloat(p.saldo || 0) || 0;
      acc.qtd   += s;
      acc.custo += s * (parseFloat(p.preco_custo || 0) || 0);
      acc.venda += s * (parseFloat(p.valor_venda || 0) || 0);
      return acc;
    }, { qtd: 0, custo: 0, venda: 0 });
  } catch (err) {
    console.error("Erro calcular totais:", err);
    return { qtd: 0, custo: 0, venda: 0 };
  }
});

watch(busca, (v) => { pagina.value = 1; sessionStorage.setItem('produtos_busca', v); });
watch(filtroPromo, () => { pagina.value = 1; });

onMounted(async () => { 
  try {
    await carregarCategorias(); 
    await carregar(); 
  } catch (err) {
    console.error("Erro onMounted Produtos:", err);
  }
});

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase
      .from("produtos")
      .select("pk, codigo, codigo_barras, descricao, valor_venda, preco_custo, saldo, ncm, cfop, csosn, unidade_comercial, categoria_pk, foto_url, preco_promo, promo_inicio, promo_fim")
      .eq("ativo", true)
      .order("descricao");
    if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
    const { data, error } = await q;
    if (error) throw error;
    
    const catMap = {};
    categorias.value.forEach(c => { if (c && c.pk) catMap[c.pk] = c.nome; });
    const agora = new Date();
    produtos.value = (data || []).map(p => ({
      ...p,
      categoria_nome: catMap[p.categoria_pk] || "",
      em_promo: !!(p.preco_promo > 0 && p.promo_inicio && p.promo_fim &&
                   agora >= new Date(p.promo_inicio) && agora <= new Date(p.promo_fim)),
    }));
  } catch (e) {
    console.error("Erro carregar produtos:", e.message);
  } finally {
    carregando.value = false;
  }
}

async function carregarCategorias() {
  try {
    let q = supabase.from("categorias").select("pk, nome").order("nome");
    if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
    const { data } = await q;
    categorias.value = data || [];
  } catch (err) {
    console.error("Erro carregar categorias:", err);
  }
}

function exportarProdutos() {
  if (!produtos.value.length) return;
  const rows = produtos.value.map(p => ({
    'Código':       p.codigo || '',
    'Descrição':    p.descricao || '',
    'Qtd Estoque':  parseFloat(p.saldo || 0),
    'Preço Venda':  parseFloat(p.valor_venda || 0),
    'Preço Custo':  parseFloat(p.preco_custo || 0),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  const data = new Date().toLocaleDateString('en-CA');
  XLSX.writeFile(wb, `produtos_${data}.xlsx`);
  showAcoes.value = false;
}

async function confirmarExclusao() {
  if (!produtoParaExcluir.value) return;
  excluindo.value = true;
  try {
    await apiClient.delete(`/api/pdv/produto/${produtoParaExcluir.value.pk}`);
    produtos.value = produtos.value.filter(p => p.pk !== produtoParaExcluir.value.pk);
    produtoParaExcluir.value = null;
  } catch (e) {
    console.error("Erro ao excluir produto:", e.message);
  } finally {
    excluindo.value = false;
  }
}

function fmt(v) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  } catch (err) {
    return "R$ 0,00";
  }
}

// ── Etiquetas ─────────────────────────────────────────────────
const showEtiquetas = ref(false);
const etqBusca      = ref('');
const etqSelecao    = ref({});

const produtosEtq = computed(() => {
  const q = semAcento(etqBusca.value.trim());
  if (!q) return produtos.value;
  return produtos.value.filter(p =>
    semAcento(p.descricao).includes(q) ||
    (p.codigo || '').toLowerCase().includes(q) ||
    (p.codigo_barras || '').includes(q)
  );
});

const totalEtiquetas = computed(() =>
  Object.values(etqSelecao.value).reduce((s, q) => s + (q || 0), 0)
);

function abrirEtiquetas() {
  etqBusca.value = '';
  etqSelecao.value = {};
  showEtiquetas.value = true;
  showAcoes.value = false;
}

function toggleEtq(p) {
  const novo = { ...etqSelecao.value };
  if (novo[p.pk] !== undefined) delete novo[p.pk];
  else novo[p.pk] = 1;
  etqSelecao.value = novo;
}

function ajustarQtyEtq(pk, delta) {
  const atual = etqSelecao.value[pk] || 1;
  etqSelecao.value = { ...etqSelecao.value, [pk]: Math.max(1, atual + delta) };
}

function selecionarTodosEtq() {
  const visiveis = produtosEtq.value;
  const todosAtivos = visiveis.length > 0 && visiveis.every(p => etqSelecao.value[p.pk] !== undefined);
  const novo = { ...etqSelecao.value };
  if (todosAtivos) {
    visiveis.forEach(p => delete novo[p.pk]);
  } else {
    visiveis.forEach(p => { if (novo[p.pk] === undefined) novo[p.pk] = 1; });
  }
  etqSelecao.value = novo;
}

function imprimirEtiquetas() {
  const selecionados = [];
  produtos.value.forEach(p => {
    const qty = etqSelecao.value[p.pk] || 0;
    for (let i = 0; i < qty; i++) selecionados.push(p);
  });
  if (!selecionados.length) return;

  const labels = selecionados.map((p, i) => {
    const preco = p.em_promo && p.preco_promo ? p.preco_promo : p.valor_venda;
    return {
      id:      `bc${i}`,
      nome:    (p.descricao || '').replace(/</g, '&lt;'),
      preco:   parseFloat(preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      barcode: p.codigo_barras || '',
    };
  });

  const barcodeInits = labels
    .filter(l => l.barcode)
    .map(l => {
      const f = l.barcode.length === 13 ? 'EAN13' : l.barcode.length === 8 ? 'EAN8' : 'CODE128';
      return `try{JsBarcode('#${l.id}','${l.barcode}',{format:'${f}',width:1.2,height:28,displayValue:true,fontSize:7,margin:0,textMargin:1});}catch(e){}`;
    }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Etiquetas BarroStock</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;700;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4;margin:8mm}
  body{font-family:'Hanken Grotesk',Arial,sans-serif;background:#fff}
  .grid{display:flex;flex-wrap:wrap;gap:2mm}
  .label{
    width:50mm;height:50mm;
    border:.3mm solid #ccc;border-radius:2mm;
    display:flex;flex-direction:column;align-items:center;
    padding:2mm 1.5mm 1mm;background:#fff;
    page-break-inside:avoid;overflow:hidden;
  }
  .lbl-brand{
    font-weight:900;font-size:7.5pt;color:#444;
    text-transform:uppercase;letter-spacing:1.5px;
    border-bottom:.2mm solid #e0e0e0;
    width:100%;text-align:center;padding-bottom:1mm;margin-bottom:1.5mm;
  }
  .lbl-nome{
    font-weight:700;font-size:7pt;color:#000;
    text-align:center;line-height:1.25;
    flex:1;display:flex;align-items:center;justify-content:center;
    max-height:14mm;overflow:hidden;
  }
  .lbl-preco{
    font-weight:900;font-size:13pt;color:#00c853;
    text-align:center;margin:1.5mm 0 1mm;
  }
  .lbl-bc{max-width:46mm;display:block}
</style>
</head>
<body>
<div class="grid">
${labels.map(l => `
  <div class="label">
    <div class="lbl-brand">BarroStock</div>
    <div class="lbl-nome">${l.nome}</div>
    <div class="lbl-preco">R$ ${l.preco}</div>
    ${l.barcode ? `<svg class="lbl-bc" id="${l.id}"></svg>` : ''}
  </div>`).join('')}
</div>
<script>
window.addEventListener('load',function(){
  ${barcodeInits}
  setTimeout(function(){window.print();},800);
});
<\/script>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  iframe.contentWindow.addEventListener('afterprint', () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  });
  setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 30_000);
}
</script>

<style scoped>
.prod-wrap    { display: flex; flex-direction: column; gap: 1.5rem; }
.prod-header  { margin-bottom: -1rem; }
.filtros-rapidos { margin-bottom: -1rem; }
.paginacao    { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1rem; }

/* Dropdown Outras Ações */
.dropdown-wrap { position: relative; }
.dropdown-menu {
  position: absolute; top: calc(100% + 8px); right: 0; min-width: 220px;
  background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;
  padding: 8px; z-index: 100; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; gap: 4px;
}
.drop-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 10px 12px; border-radius: 8px; background: none; border: none;
  color: var(--text); font-size: 13.5px; font-weight: 500; cursor: pointer;
  transition: all .15s; text-align: left;
}
.drop-item:hover { background: rgba(99,102,241, 0.1); color: var(--primary); }
.drop-item .material-symbols-outlined { font-size: 20px; color: var(--text2); }
.drop-item:hover .material-symbols-outlined { color: var(--primary); }

/* Animação Drop */
.drop-enter-active, .drop-leave-active { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.95); }

.page-title   { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--text); }
.page-sub     { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }

.header-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }

.search-box  { position: relative; display: flex; align-items: center; gap: 4px; }
.search-icon { position: absolute; left: 10px; font-size: 20px; color: var(--text2); pointer-events: none; }
.busca-input { padding: .55rem 2.6rem .55rem 2.4rem; border: 1px solid var(--border); border-radius: 10px; width: 320px; background: var(--bg2); color: var(--text); font-size: .9rem; transition: border-color .2s; outline: none; }
.busca-input:focus { border-color: #6366f1; }
.btn-scan-prod { position: absolute; right: 6px; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: transparent; border: none; color: var(--text2); border-radius: 7px; cursor: pointer; transition: all .15s; }
.btn-scan-prod:hover { background: rgba(99,102,241,.12); color: #6366f1; }
.btn-scan-prod .material-symbols-outlined { font-size: 20px; }

/* Scanner */
.prod-scanner-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.92); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.prod-scanner-box { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: .75rem; }
.prod-scanner-header { display: flex; align-items: center; gap: .5rem; color: #fff; }
.prod-scanner-title { flex: 1; font-size: .95rem; font-weight: 700; }
.prod-scanner-close { width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.prod-scanner-close:hover { background: rgba(255,255,255,.18); }
.prod-scanner-close .material-symbols-outlined { font-size: 18px; }
.prod-scanner-viewport { position: relative; width: 100%; aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: #000; }
.prod-scanner-video { width: 100%; height: 100%; object-fit: cover; display: block; }
.prod-scanner-frame { position: absolute; inset: 0; }
.psf-corner { position: absolute; width: 28px; height: 28px; border-color: #6366f1; border-style: solid; }
.psf-corner.tl { top: 16px;    left: 16px;    border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.psf-corner.tr { top: 16px;    right: 16px;   border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.psf-corner.bl { bottom: 16px; left: 16px;    border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.psf-corner.br { bottom: 16px; right: 16px;   border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
.prod-scanner-line { position: absolute; left: 16px; right: 16px; height: 2px; background: linear-gradient(90deg, transparent, #6366f1, transparent); animation: prodScanLine 2s ease-in-out infinite; box-shadow: 0 0 8px #6366f1; }
@keyframes prodScanLine { 0%, 100% { top: 20%; } 50% { top: 78%; } }
.prod-scanner-status { text-align: center; font-size: .85rem; font-weight: 700; padding: .5rem; border-radius: 8px; }
.prod-scanner-status.err { background: rgba(239,68,68,.2); color: #fca5a5; }
.prod-scanner-status.ok  { background: rgba(16,185,129,.2); color: #6ee7b7; }

.view-toggle { display: flex; gap: 3px; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 4px; }
.btn-view { background: none; border: none; color: var(--text2); cursor: pointer; padding: 5px 8px; border-radius: 7px; display: flex; align-items: center; transition: all .15s; }
.btn-view.active { background: #6366f1; color: #fff; }
.btn-view:hover:not(.active) { background: var(--bg3); }

.btn-primary { display: flex; align-items: center; gap: 5px; padding: .55rem 1.1rem; background: #6366f1; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .9rem; transition: opacity .15s; white-space: nowrap; }
.btn-primary:hover { opacity: .88; }

.btn-secondary { display: flex; align-items: center; gap: 5px; padding: .55rem 1.1rem; background: var(--bg2); color: var(--text); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .9rem; transition: all .15s; white-space: nowrap; }
.btn-secondary:hover:not(:disabled) { background: var(--bg3); border-color: var(--accent); }
.btn-secondary:disabled { opacity: .5; cursor: default; }

/* Filtros rápidos */
.filtros-rapidos { display: flex; gap: 6px; flex-wrap: wrap; }
.filtro-chip { display: flex; align-items: center; gap: 5px; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid var(--border); background: var(--bg2); color: var(--text2); cursor: pointer; transition: all .15s; white-space: nowrap; }
.filtro-chip .material-symbols-outlined { font-size: 15px; }
.filtro-chip.active { background: rgba(239,68,68,.12); color: #ef4444; border-color: rgba(239,68,68,.35); }
.filtro-chip:not(.active):hover { background: var(--bg3); color: var(--text); }

/* ── Cards ────────────────────────────────── */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; }
.prod-card  { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all .2s ease; position: relative; }
.prod-card:hover { transform: translateY(-4px); border-color: #6366f1; box-shadow: 0 10px 20px rgba(0,0,0,.1); }

.card-foto { height: 165px; background: var(--bg3); position: relative; display: flex; align-items: center; justify-content: center; }
.card-img  { width: 100%; height: 100%; object-fit: cover; }
.card-avatar { width: 60px; height: 60px; border-radius: 50%; background: #6366f1; color: #fff; font-size: 24px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.saldo-badge { position: absolute; top: 10px; right: 10px; padding: 4px 10px; border-radius: 20px; font-size: .75rem; font-weight: 800; color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,.2); }
.saldo-badge.ok    { background: #10b981; }
.saldo-badge.baixo { background: #f59e0b; }
.saldo-badge.zero  { background: #ef4444; }

.card-info { padding: 12px; }
.card-desc { margin: 0; font-size: .9rem; font-weight: 700; color: var(--text); line-height: 1.3; height: 2.6rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-cat  { margin: 4px 0 10px; font-size: .75rem; color: var(--text2); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.card-preco  { font-size: 1.1rem; font-weight: 800; color: #6366f1; }
.card-cod    { font-size: .7rem; color: var(--text2); font-family: monospace; }

/* ── Tabela ───────────────────────────────── */
.tabela-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,.05); }
.tabela { width: 100%; border-collapse: collapse; }
.tabela th { background: var(--bg3); padding: .8rem 1rem; text-align: left; font-size: .75rem; color: var(--text2); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid var(--border); }
.tabela td { padding: .7rem 1rem; border-bottom: 1px solid var(--border); font-size: .9rem; color: var(--text); }
.tabela tr { cursor: pointer; transition: background .1s; }
.tabela tr:hover { background: rgba(99,102,241,.03); }

.table-thumb { width: 42px; height: 42px; border-radius: 9px; overflow: hidden; background: var(--bg3); display: flex; align-items: center; justify-content: center; }
.thumb-img   { width: 100%; height: 100%; object-fit: cover; }
.thumb-avatar { width: 24px; height: 24px; border-radius: 50%; background: #6366f1; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.mono { font-family: monospace; font-weight: 600; color: var(--text2); }
.saldo.ok    { color: #10b981; font-weight: 700; }
.saldo.baixo { color: #f59e0b; font-weight: 700; }
.saldo.zero  { color: #ef4444; font-weight: 700; }

/* ── Modal Etiquetas ─────────────────────────────────────────── */
.etq-bg {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.etq-modal {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 16px;
  width: 700px; max-width: 100%; max-height: 90vh;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.35);
}
.etq-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px 16px; border-bottom: 1px solid var(--border);
  gap: 12px;
}
.etq-close {
  background: none; border: none; cursor: pointer;
  color: var(--text2); padding: 6px; border-radius: 8px;
  display: flex; align-items: center; transition: all .15s; flex-shrink: 0;
}
.etq-close:hover { background: var(--bg3); color: var(--text); }

/* toolbar / search — igual ao PDV */
.etq-toolbar {
  display: flex; gap: 10px; align-items: center;
  padding: 12px 22px; border-bottom: 1px solid var(--border);
  background: var(--bg3);
}
.etq-search-wrap { position: relative; flex: 1; display: flex; align-items: center; }
.etq-search-ico {
  position: absolute; left: 11px;
  color: var(--muted, var(--text2)); pointer-events: none; flex-shrink: 0;
}
.etq-search {
  width: 100%; padding: 11px 36px 11px 40px;
  background: var(--bg3); border: 1px solid var(--line, var(--border));
  border-radius: var(--radius, 10px); color: var(--text);
  font-size: 15px; outline: none; transition: border-color .15s;
}
.etq-search::placeholder { color: var(--muted, var(--text2)); }
.etq-search:focus { border-color: rgba(99,102,241,.5); }
.etq-search-clear {
  position: absolute; right: 10px;
  background: none; border: none; cursor: pointer;
  color: var(--text2); font-size: 18px; line-height: 1; padding: 2px 4px;
  border-radius: 4px; transition: color .15s;
}
.etq-search-clear:hover { color: var(--text); }
.etq-btn-all {
  white-space: nowrap; padding: 10px 16px; border: 1px solid var(--border);
  border-radius: 8px; background: var(--bg); color: var(--text2);
  cursor: pointer; font-size: .83rem; font-weight: 600; transition: all .15s;
}
.etq-btn-all:hover { border-color: var(--primary); color: var(--primary); }

/* lista */
.etq-lista { flex: 1; overflow-y: auto; }
.etq-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 22px; cursor: pointer; transition: background .12s;
  border-bottom: 1px solid var(--border);
}
.etq-item:last-child { border-bottom: none; }
.etq-item:hover { background: var(--bg3); }
.etq-item--sel { background: rgba(99,102,241,.07); }
.etq-item--sel:hover { background: rgba(99,102,241,.12); }
.etq-chk { font-size: 21px; color: var(--text2); flex-shrink: 0; transition: color .12s; }
.etq-item--sel .etq-chk { color: var(--primary); }
.etq-info { flex: 1; min-width: 0; }
.etq-desc { display: block; font-size: .9rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.etq-sub  { display: block; font-size: .76rem; color: var(--text2); margin-top: 2px; font-family: monospace; }
.etq-preco { font-size: .88rem; font-weight: 700; color: var(--text); white-space: nowrap; min-width: 80px; text-align: right; }
.etq-qty { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.etq-qty-btn {
  width: 28px; height: 28px; border-radius: 7px;
  border: 1px solid var(--border); background: var(--bg3);
  color: var(--text); cursor: pointer; font-size: 1.1rem; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  transition: all .12s; font-weight: 700;
}
.etq-qty-btn:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
.etq-qty-val { min-width: 26px; text-align: center; font-weight: 700; font-size: .9rem; }
.etq-qty-ph { width: 90px; flex-shrink: 0; }
.etq-vazio { text-align: center; padding: 40px 20px; color: var(--text2); font-size: .9rem; }

/* footer */
.etq-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 22px; border-top: 1px solid var(--border); gap: 12px;
  background: var(--bg3);
}
.etq-footer-info { font-size: .85rem; color: var(--text2); }
.etq-footer-info strong { color: var(--text); font-weight: 700; }
.etq-btn-print {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 22px; border: none; border-radius: 10px;
  background: var(--primary); color: #fff;
  font-weight: 700; font-size: .9rem; cursor: pointer; transition: opacity .15s;
}
.etq-btn-print:hover:not(:disabled) { opacity: .88; }
.etq-btn-print:disabled { opacity: .35; cursor: not-allowed; }

/* light mode overrides */
[data-theme="light"] .etq-modal   { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .etq-header  { border-color: rgba(0,0,0,.1); }
[data-theme="light"] .etq-toolbar { background: #f8f9fa; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .etq-search  { background: #fff; border-color: rgba(0,0,0,.2); color: #0f172a; }
[data-theme="light"] .etq-search:focus { border-color: #4338ca; }
[data-theme="light"] .etq-search::placeholder { color: #9ca3af; }
[data-theme="light"] .etq-search-ico { color: #9ca3af; }
[data-theme="light"] .etq-btn-all { background: #fff; border-color: rgba(0,0,0,.2); color: #374151; }
[data-theme="light"] .etq-item    { border-color: rgba(0,0,0,.07); }
[data-theme="light"] .etq-item:hover { background: rgba(0,0,0,.035); }
[data-theme="light"] .etq-item--sel { background: rgba(67,56,202,.06); }
[data-theme="light"] .etq-item--sel:hover { background: rgba(67,56,202,.1); }
[data-theme="light"] .etq-chk     { color: #9ca3af; }
[data-theme="light"] .etq-item--sel .etq-chk { color: #4338ca; }
[data-theme="light"] .etq-desc    { color: #0f172a; }
[data-theme="light"] .etq-sub     { color: #6b7280; }
[data-theme="light"] .etq-preco   { color: #0f172a; }
[data-theme="light"] .etq-qty-btn { background: #f3f4f6; border-color: rgba(0,0,0,.2); color: #374151; }
[data-theme="light"] .etq-footer  { background: #f8f9fa; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .etq-footer-info { color: #6b7280; }
[data-theme="light"] .etq-footer-info strong { color: #0f172a; }

.drop-sep { height: 1px; background: var(--border); margin: 4px 0; }

.acoes     { text-align: right !important; white-space: nowrap; }
.btn-edit  { background: none; border: none; color: var(--text2); cursor: pointer; padding: 6px; border-radius: 8px; transition: all .2s; }
.btn-edit:hover { background: rgba(99,102,241,.1); color: #6366f1; }
.btn-del   { background: none; border: none; color: var(--text2); cursor: pointer; padding: 6px; border-radius: 8px; transition: all .2s; }
.btn-del:hover { background: rgba(239,68,68,.1); color: #ef4444; }
.btn-del-card {
  position: absolute; bottom: 8px; left: 8px; opacity: 0;
  background: rgba(239,68,68,.88); border: none; color: #fff;
  width: 28px; height: 28px; border-radius: 8px; display: flex;
  align-items: center; justify-content: center; cursor: pointer;
  transition: opacity .2s;
}
.btn-del-card .material-symbols-outlined { font-size: 16px; }
.btn-del-card:hover { background: #ef4444; }
.prod-card:hover .btn-del-card { opacity: 1; }
.btn-danger { display: flex; align-items: center; gap: 5px; padding: .55rem 1.1rem; background: #ef4444; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .9rem; transition: opacity .15s; }
.btn-danger:hover:not(:disabled) { opacity: .88; }
.btn-danger:disabled { opacity: .5; cursor: default; }
/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 18px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.25); display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; gap: 10px; padding: 18px 20px 14px; border-bottom: 1px solid var(--border); }
.modal-header h3 { flex: 1; margin: 0; font-size: 1rem; font-weight: 800; color: var(--text); }
.modal-close { background: none; border: none; color: var(--text2); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; }
.modal-close:hover { background: var(--bg3); }
.modal-body { padding: 18px 20px; font-size: .9rem; color: var(--text); }
.modal-footer { padding: 14px 20px 18px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border); }
.resumo { font-size: .82rem; color: var(--text2); padding: .6rem .9rem; text-align: right; }

/* ── Loading / Vazio ──────────────────────── */
.loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 4rem; color: var(--text2); }
.vazio   { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text2); padding: 4rem; }
.spin { width: 26px; height: 26px; border: 3px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Paginação ────────────────────────────── */
.paginacao { display: flex; align-items: center; justify-content: center; gap: .5rem; }
.pg-btn { background: var(--bg2); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 4px 12px; cursor: pointer; font-size: 1rem; line-height: 1; transition: background .15s; }
.pg-btn:hover:not(:disabled) { background: var(--bg3); }
.pg-btn:disabled { opacity: .35; cursor: default; }
.pg-info { font-size: .85rem; color: var(--text2); min-width: 60px; text-align: center; }
.resumo-paginas { display: inline-flex; align-items: center; gap: .35rem; }

/* ── Totalizadores ─────────────────────────── */
.totalizadores {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;
  background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 24px;
  margin-top: 1rem;
  margin-bottom: 3rem;
}
.total-item { display: flex; flex-direction: column; gap: 4px; }
.total-label { font-size: .75rem; color: var(--text2); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.total-val { font-size: 1.25rem; font-weight: 800; color: var(--text); }
.total-val.venda { color: #6366f1; }

.card-glass { box-shadow: 0 8px 32px rgba(0,0,0,.08); }

/* Promoções */
.promo-badge-tag { position: absolute; top: 10px; left: 10px; background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 8px rgba(239,68,68,0.4); }
.card-promo-area { display: flex; flex-direction: column; gap: 0; }
.card-preco-antigo { font-size: 0.75rem; color: var(--text2); text-decoration: line-through; opacity: 0.7; margin-bottom: -2px; }
.card-preco-novo { font-size: 1.1rem; color: #ef4444; font-weight: 800; font-family: var(--mono); }
.table-promo { display: flex; flex-direction: column; line-height: 1.2; }
.table-old-price { font-size: 0.7rem; color: var(--text2); text-decoration: line-through; }
.table-new-price { color: #ef4444; font-weight: 800; }

@media (max-width: 600px) {
  .busca-input { width: 100%; }
  .cards-grid  { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .card-foto   { height: 130px; }
  .totalizadores { grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; }
  .total-val { font-size: 1.1rem; }
}
</style>
