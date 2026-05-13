<template>
  <div class="hist-wrap">
    <div class="hist-header">
      <div class="header-main">
        <h2 class="page-title">Histórico de Vendas</h2>
        <div class="stats-pills">
          <span class="stat-pill"><strong>{{ totalRegistros }}</strong> vendas</span>
        </div>
      </div>

      <div class="filtros-bar">
        <div class="search-group">
          <span class="material-symbols-outlined search-icon">search</span>
          <input v-model="busca" type="text" placeholder="Número, cliente ou operador..." class="busca-input-v2" @keyup.enter="carregar(0)" />
        </div>

        <div class="filter-group">
          <div class="date-range-group">
            <input type="date" v-model="dataInicio" class="date-input-v2" title="Data inicial" />
            <span class="date-sep">até</span>
            <input type="date" v-model="dataFim" class="date-input-v2" title="Data final" />
          </div>

          <select v-model="filtroStatus" class="sel-input-v2">
            <option value="">Todos Status</option>
            <option value="finalizada">Finalizadas</option>
            <option value="devolvida">Devolvidas</option>
            <option value="cancelada">Canceladas</option>
          </select>

          <button @click="carregar(0)" class="btn-refresh" title="Atualizar">
            <span class="material-symbols-outlined">refresh</span>
          </button>
          <button @click="limparFiltros" class="btn-clear" title="Limpar Filtros">
            <span class="material-symbols-outlined">filter_alt_off</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="carregando" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando histórico...</p>
    </div>

    <div v-else-if="vendas.length === 0" class="vazio">
      <span class="material-symbols-outlined empty-icon">inventory_2</span>
      <p>Nenhuma venda encontrada para os filtros selecionados.</p>
    </div>

    <div v-else class="tabela-container custom-scroll">
      <table class="tabela-v2">
        <thead>
          <tr>
            <th>Nº Venda</th>
            <th>Data / Hora</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Tipo</th>
            <th>Total</th>
            <th>Status</th>
            <th>NFC-e</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in vendas" :key="v.pk" @click="abrirDetalhe(v)">
            <td class="col-num">#{{ v.numero }}</td>
            <td class="col-date">{{ fmtDate(v.criado_em) }}</td>
            <td class="col-client">{{ v.cliente || "Consumidor Final" }}</td>
            <td class="col-op">{{ v.vendedor || v.operador || "—" }}</td>
            <td>
              <span :class="['type-pill', v.tipo_venda === 'locacao' ? 'loc' : 'vnd']">
                {{ v.tipo_venda === 'locacao' ? 'Locação' : 'Venda' }}
              </span>
            </td>
            <td class="col-total">{{ fmt(v.total) }}</td>
            <td>
              <span :class="['status-badge', statusCls(v.status)]">{{ v.status }}</span>
            </td>
            <td>
              <div v-if="v.nfce_chave" class="nfce-status authorized">
                <span class="material-symbols-outlined">check_circle</span>
                <span>Emitida</span>
              </div>
              <div v-else class="nfce-status pending">
                <span class="material-symbols-outlined">hourglass_empty</span>
                <span>Pendente</span>
              </div>
            </td>
            <td @click.stop class="text-right">
              <div class="actions-group">
                <button v-if="v.tipo_venda !== 'locacao'"
                  @click="abrirDetalheEImprimir(v)" class="action-btn print" title="Reimprimir Recibo">
                  <span class="material-symbols-outlined">print</span>
                </button>
                <button v-if="v.status === 'finalizada'"
                  @click="confirmarDevolucao(v)" class="action-btn return" title="Devolução">
                  <span class="material-symbols-outlined">settings_backup_restore</span>
                </button>
                <button @click="confirmarExclusao(v)" class="action-btn delete" title="Excluir Venda">
                  <span class="material-symbols-outlined">delete</span>
                </button>
                <button @click="abrirDetalhe(v)" class="action-btn view" title="Ver Detalhes">
                  <span class="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination-bar">
        <button :disabled="paginaAtual === 0" @click="carregar(paginaAtual - 1)" class="pag-btn">
          <span class="material-symbols-outlined">chevron_left</span> Anterior
        </button>
        <span class="pag-info">Página {{ paginaAtual + 1 }} de {{ totalPaginas }}</span>
        <button :disabled="paginaAtual + 1 >= totalPaginas" @click="carregar(paginaAtual + 1)" class="pag-btn">
          Próxima <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>

    <!-- Modal Detalhe -->
    <Teleport to="body">
      <div v-if="detalhe" class="modal-bg" @click.self="fecharDetalhe">
        <div class="modal det-modal">

          <!-- ── CABEÇALHO ── -->
          <div class="det-modal-header">
            <div class="det-header-left">
              <div class="det-venda-num">Venda #{{ detalhe.numero }}</div>
              <div class="det-header-meta">
                <span class="det-sub-item">
                  <span class="material-symbols-outlined">calendar_today</span>
                  {{ fmtDate(detalhe.criado_em) }}
                </span>
                <span class="det-sub-item">
                  <span class="material-symbols-outlined">person</span>
                  {{ detalhe.cliente || 'Consumidor Final' }}
                </span>
                <span v-if="detalhe.vendedor || detalhe.operador" class="det-sub-item">
                  <span class="material-symbols-outlined">badge</span>
                  {{ detalhe.vendedor || detalhe.operador }}
                </span>
              </div>
            </div>
            <div class="det-header-right">
              <span :class="['status-badge lg', statusCls(detalhe.status)]">{{ detalhe.status }}</span>
              <span :class="['type-pill', detalhe.tipo_venda === 'locacao' ? 'loc' : 'vnd']">
                {{ detalhe.tipo_venda === 'locacao' ? 'Locação' : 'Venda' }}
              </span>
              <button @click="fecharDetalhe" class="btn-close-x">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <!-- ── INFORMAÇÕES DA LOCAÇÃO ── -->
          <div v-if="detalhe.tipo_venda === 'locacao'" class="det-loc-bar">
            <div class="det-loc-item">
              <span class="det-loc-label">Retirada</span>
              <span class="det-loc-val">{{ fmtDataHora(detalhe.data_locacao) }}</span>
            </div>
            <span class="det-loc-arrow material-symbols-outlined">arrow_forward</span>
            <div class="det-loc-item">
              <span class="det-loc-label">Devolução prevista</span>
              <span :class="['det-loc-val', locacaoVencida(detalhe) && detalhe.status_locacao !== 'devolvida' ? 'loc-vencida' : '']">
                {{ fmtDataHora(detalhe.data_devolucao_prevista) }}
                <span v-if="locacaoVencida(detalhe) && detalhe.status_locacao !== 'devolvida'" class="loc-atrasada-badge">Atrasada</span>
              </span>
            </div>
            <div v-if="detalhe.data_devolucao_real" class="det-loc-item">
              <span class="det-loc-label">Devolvido em</span>
              <span class="det-loc-val" style="color:#34d399">{{ fmtDataHora(detalhe.data_devolucao_real) }}</span>
            </div>
            <div class="det-loc-item">
              <span class="det-loc-label">Status</span>
              <span :class="['det-loc-val', 'loc-status-' + (detalhe.status_locacao || 'pendente')]">
                {{ { pendente: 'Pendente', devolvida: 'Devolvida', taxa_cobrada: 'Taxa cobrada' }[detalhe.status_locacao] || 'Pendente' }}
              </span>
            </div>
            <div v-if="detalhe.status_locacao === 'taxa_cobrada' && detalhe.taxa_realocacao_cobrada != null" class="det-loc-item">
              <span class="det-loc-label">Taxa cobrada</span>
              <span class="det-loc-val" style="color:#a78bfa">R$ {{ fmtVal(detalhe.taxa_realocacao_cobrada) }}</span>
            </div>
            <div v-if="detalhe.nfce_chave" class="det-loc-item">
              <span class="det-loc-label">NFC-e</span>
              <span class="det-loc-val" style="color:#059669">Autorizada</span>
            </div>
          </div>
          <div v-else-if="detalhe.nfce_chave" class="det-nfce-bar">
            <span class="material-symbols-outlined" style="color:#059669;font-size:18px">verified</span>
            NFC-e Autorizada
          </div>

          <!-- ── CORPO ROLÁVEL ── -->
          <div class="det-body">

            <!-- Itens -->
            <div class="det-section-block">
              <div class="det-section-hd">
                <span class="material-symbols-outlined">shopping_bag</span>
                <span>Itens</span>
                <span class="det-section-count">{{ detalheItens.length }}</span>
              </div>
              <div v-if="detalheCarregando" class="det-loading">
                <div class="spinner-sm"></div> Carregando...
              </div>
              <table v-else class="det-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th class="tr">Qtd</th>
                    <th class="tr">Unit.</th>
                    <th class="tr">Desconto</th>
                    <th class="tr">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in detalheItens" :key="it.pk">
                    <td><span class="det-item-nome">{{ it.descricao }}</span></td>
                    <td class="tr mono">{{ it.qtd }}</td>
                    <td class="tr mono">{{ fmt(it.preco_unit) }}</td>
                    <td class="tr mono det-disc-cell">{{ it.desconto_val > 0 ? '− ' + fmt(it.desconto_val) : '—' }}</td>
                    <td class="tr mono bold">{{ fmt(it.total_item) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagamentos -->
            <div v-if="!detalheCarregando" class="det-section-block det-pag-block">
              <div class="det-section-hd">
                <span class="material-symbols-outlined">payments</span>
                <span>Pagamentos</span>
              </div>
              <div class="det-pag-lista">
                <div v-for="p in detalhePagamentos" :key="p.pk" class="det-pag-row">
                  <span class="det-pag-forma">
                    <span class="material-symbols-outlined det-pag-ico">credit_card</span>
                    {{ formasMap[p.forma] || p.forma }}
                  </span>
                  <span class="det-pag-val">{{ fmt(p.valor) }}</span>
                </div>
              </div>
              <div v-if="parseFloat(detalhe.acrescimo) > 0" class="det-pag-row det-acrescimo-row">
                <span class="det-pag-forma">Acréscimo</span>
                <span class="det-pag-val det-acrescimo-val">+ {{ fmt(detalhe.acrescimo) }}</span>
              </div>
              <div class="det-total-row">
                <span>TOTAL DA VENDA</span>
                <span class="det-total-val">{{ fmt(detalhe.total) }}</span>
              </div>
            </div>

          </div>

          <!-- ── AÇÕES ── -->
          <div class="det-actions">
            <button @click="fecharDetalhe" class="det-btn-fechar">Fechar</button>
            <div class="det-actions-right">
              <button
                v-if="detalhe.status === 'finalizada'"
                @click="router.push('/historico-vendas/' + detalhe.pk + '/editar')"
                class="det-btn-editar"
              >
                <span class="material-symbols-outlined">edit</span>
                Editar
              </button>
              <template v-if="detalhe.tipo_venda === 'locacao'">
                <button
                  v-if="detalhe.status_locacao !== 'devolvida'"
                  @click="confirmarDevolucaoLocacao"
                  class="det-btn-loc-dev"
                  :disabled="salvandoLocacao"
                >
                  <span class="material-symbols-outlined">inventory</span>
                  {{ salvandoLocacao ? 'Salvando...' : 'Confirmar Devolução' }}
                </button>
                <button
                  v-if="detalhe.status_locacao !== 'devolvida' && detalhe.status_locacao !== 'taxa_cobrada'"
                  @click="cobrarTaxaRealocacao"
                  class="det-btn-loc-taxa"
                  :disabled="salvandoLocacao"
                >
                  <span class="material-symbols-outlined">payments</span>
                  Cobrar Taxa
                </button>
              </template>
              <button v-if="detalhe.tipo_venda !== 'locacao'" @click="reimprimirRecibo" class="det-btn-print" :disabled="detalheCarregando">
                <span class="material-symbols-outlined">print</span>
                Reimprimir
              </button>
              <button v-if="!detalhe.nfce_chave && detalhe.status === 'finalizada'"
                @click="emitirNFCeDetalhe" class="det-btn-nfce" :disabled="emitindoPk === detalhe.pk">
                <span class="material-symbols-outlined" :style="emitindoPk === detalhe.pk ? 'animation:spin 1s linear infinite' : ''">
                  {{ emitindoPk === detalhe.pk ? 'sync' : 'receipt_long' }}
                </span>
                {{ emitindoPk === detalhe.pk ? 'Emitindo...' : 'Emitir NFC-e' }}
              </button>
              <button v-if="detalhe.nfce_chave" @click="reimprimirNFCe" class="det-btn-nfce" :disabled="reimprimindoPk === detalhe.pk">
                <span class="material-symbols-outlined" :style="reimprimindoPk === detalhe.pk ? 'animation:spin 1s linear infinite' : ''">
                  {{ reimprimindoPk === detalhe.pk ? 'sync' : 'print' }}
                </span>
                {{ reimprimindoPk === detalhe.pk ? 'Buscando...' : 'Reimprimir NFC-e' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- Modal NFC-e autorizada -->
    <Teleport to="body">
      <div v-if="nfceResult" class="modal-bg" @click.self="nfceResult = null">
        <div class="modal modal-nfce">
          <div class="nfce-ok-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <h3>NFC-e Autorizada</h3>
          <div class="nfce-actions">
            <button v-if="nfceResult.danfe" @click="imprimirDanfe(nfceResult.danfe)" class="det-btn-print">
              <span class="material-symbols-outlined">print</span>
              Imprimir DANFE
            </button>
            <button @click="nfceResult = null" class="det-btn-fechar">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Exclusão -->
    <Teleport to="body">
      <div v-if="vendaParaExcluir" class="modal-bg" @click.self="vendaParaExcluir = null">
        <div class="modal excl-modal">
          <div class="excl-icon-wrap">
            <span class="material-symbols-outlined excl-icon">delete_forever</span>
          </div>
          <h3 class="excl-titulo">Excluir venda #{{ vendaParaExcluir.numero }}?</h3>
          <p class="excl-msg">Esta ação retornará os produtos ao estoque e <strong>NÃO pode ser desfeita</strong>.</p>
          <div class="dev-actions">
            <button @click="vendaParaExcluir = null" class="det-btn-fechar" :disabled="carregando">Cancelar</button>
            <button @click="executarExclusao" class="btn-confirmar-excl" :disabled="carregando">
              <span v-if="carregando" class="spin-xs"></span>
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Devolução -->
    <Teleport to="body">
      <div v-if="showModalDevolucao" class="modal-bg" @click.self="showModalDevolucao = false">
        <div class="modal dev-modal">
          <div class="dev-header">
            <span class="material-symbols-outlined dev-icon">settings_backup_restore</span>
            <h3>Devolução de Venda #{{ vendaParaDevolver?.numero }}</h3>
          </div>
          <p class="dev-alert">Esta ação irá estornar o estoque dos produtos e registrar a saída no caixa.</p>
          <div class="field">
            <label>Motivo da Devolução</label>
            <textarea v-model="motivoDevolucao" placeholder="Ex: Cliente desistiu da compra..." class="dev-textarea"></textarea>
          </div>
          <div class="dev-actions">
            <button @click="showModalDevolucao = false" class="det-btn-fechar" :disabled="carregando">Voltar</button>
            <button @click="processarDevolucao" class="btn-confirmar-dev" :disabled="carregando">Confirmar Devolução</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal confirmação devolução locação -->
    <Teleport to="body">
      <div v-if="modalLocacao.show" class="modal-bg" @click.self="modalLocacao.show = false">
        <div class="modal modal-loc">
          <div class="modal-header">
            <h3>{{ modalLocacao.forcaTaxa ? 'Cobrar Taxa de Realocação' : 'Confirmar Devolução' }} — Locação #{{ detalhe?.numero }}</h3>
          </div>
          <div class="modal-body">
            <div v-if="modalLocacao.diasAtraso > 0 || modalLocacao.forcaTaxa" class="loc-atraso-box">
              <div class="loc-atraso-top">
                <span class="material-symbols-outlined" style="color:#f59e0b;font-size:22px;flex-shrink:0">warning</span>
                <p class="loc-atraso-titulo">{{ modalLocacao.diasAtraso > 0 ? 'Material devolvido com atraso' : 'Cobrar taxa de realocação' }}</p>
              </div>
              <p v-if="modalLocacao.diasAtraso > 0" class="loc-atraso-info">
                <strong>{{ modalLocacao.diasAtraso }} dia{{ modalLocacao.diasAtraso > 1 ? 's' : '' }}</strong> de atraso ·
                Taxa por dia: <strong>R$ {{ fmtVal(modalLocacao.taxaDiaria) }}</strong>
              </p>
              <div class="loc-taxa-row">
                <label class="loc-taxa-label">Taxa total a cobrar (editável)</label>
                <div class="loc-taxa-edit-wrap">
                  <span class="loc-taxa-prefix">R$</span>
                  <input
                    v-model.number="modalLocacao.taxaTotal"
                    type="number" min="0" step="0.01"
                    class="loc-taxa-input"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div v-else class="loc-ok-box">
              <span class="material-symbols-outlined" style="color:#34d399;font-size:28px">check_circle</span>
              <p>Material devolvido dentro do prazo.</p>
            </div>
          </div>
          <div class="modal-footer" style="gap:8px;flex-wrap:wrap">
            <button class="det-btn-fechar" @click="modalLocacao.show = false">Cancelar</button>
            <button
              v-if="!modalLocacao.forcaTaxa && modalLocacao.diasAtraso > 0"
              class="det-btn-loc-dev"
              :disabled="salvandoLocacao"
              @click="executarDevolucaoLocacao(false)"
            >
              <span class="material-symbols-outlined">inventory</span>
              Só confirmar recebimento
            </button>
            <button
              class="det-btn-loc-taxa"
              :disabled="salvandoLocacao"
              @click="executarDevolucaoLocacao(true)"
            >
              <span class="material-symbols-outlined">payments</span>
              {{ (modalLocacao.diasAtraso > 0 || modalLocacao.forcaTaxa) ? `Cobrar R$ ${fmtVal(modalLocacao.taxaTotal)}` : 'Confirmar recebimento' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Transition name="toast">
      <div v-if="toastShow" :class="['toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessaoStore }     from "../stores/sessao";
import { useParametrosStore } from "../stores/parametros";
import { supabase }           from "../composables/useSupabase";
import apiClient              from "../services/api";

const route           = useRoute();
const router          = useRouter();
const sessaoStore     = useSessaoStore();
const parametrosStore = useParametrosStore();

const vendas         = ref([]);
const carregando     = ref(false);
const formasMap      = ref({});
const busca          = ref("");
const filtroStatus   = ref("");
const emitindoPk     = ref(null);
const detalhe        = ref(null);
const detalheItens       = ref([]);
const detalhePagamentos  = ref([]);
const detalheCarregando  = ref(false);
const vendaParaExcluir   = ref(null);
const nfceResult     = ref(null);
const toastMsg   = ref('');
const toastTipo  = ref('ok');
const toastShow  = ref(false);

const dataInicio = ref('');
const dataFim    = ref('');

const limit          = 20;
const totalRegistros = ref(0);
const paginaAtual    = ref(0);
const totalPaginas   = computed(() => Math.ceil(totalRegistros.value / limit) || 1);

const showModalDevolucao = ref(false);
const vendaParaDevolver  = ref(null);
const motivoDevolucao    = ref("");

let toastTimer = null;
function toast(msg, tipo = 'ok', ms = 4000) {
  toastMsg.value = msg; toastTipo.value = tipo; toastShow.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastShow.value = false; }, ms);
}

const salvandoLocacao = ref(false);
const modalLocacao    = ref({ show: false, diasAtraso: 0, taxaDiaria: 0, taxaTotal: 0 });

function fmtVal(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }

onMounted(async () => {
  const fil = sessaoStore.filial?.pk;
  if (fil) {
    const { data: formas } = await supabase.from('formas_pagamento').select('forma, label').eq('filial_pk', fil);
    if (formas) formas.forEach(f => { formasMap.value[f.forma] = f.label; });
  }
  await carregar(0);
  const abrirPk = route.query.abrir ? parseInt(route.query.abrir) : null;
  if (abrirPk) {
    let v = vendas.value.find(x => x.pk === abrirPk);
    if (!v) {
      const { data } = await supabase
        .from('vendas')
        .select('pk, numero, criado_em, cliente, operador, vendedor, total, status, tipo_venda, data_locacao, data_devolucao_prevista, data_devolucao_real, status_locacao, taxa_realocacao_cobrada, nfce_chave, nfce_protocolo, nfce_ref, nfce_danfe')
        .eq('pk', abrirPk)
        .eq('ativo', true)
        .single();
      v = data;
    }
    if (v) abrirDetalhe(v);
  }
});

async function carregar(pagina = 0) {
  carregando.value = true;
  paginaAtual.value = pagina;
  try {
    const params = {
      filial_pk: sessaoStore.filial?.pk,
      inicio:    dataInicio.value,
      fim:       dataFim.value,
      status:    filtroStatus.value,
      busca:     busca.value,
      limit,
      offset:    pagina * limit
    };
    const resp = await apiClient.get("/api/vendas", { params });
    vendas.value         = resp.data.data || [];
    totalRegistros.value = resp.data.count || 0;
  } catch (e) {
    toast("Erro ao carregar: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

function limparFiltros() {
  busca.value = ""; filtroStatus.value = "";
  dataInicio.value = ''; dataFim.value = '';
  carregar(0);
}

function confirmarExclusao(v) {
  vendaParaExcluir.value = v;
}

async function executarExclusao() {
  const v = vendaParaExcluir.value;
  if (!v) return;
  carregando.value = true;
  try {
    const resp = await apiClient.delete(`/api/vendas/${v.pk}`);
    if (resp.data.ok) {
      vendaParaExcluir.value = null;
      toast("Venda excluída e estoque estornado.");
      await carregar(paginaAtual.value);
    }
  } catch (e) {
    toast("Erro ao excluir: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

async function abrirDetalhe(v) {
  detalhe.value = v;
  detalheItens.value = [];
  detalhePagamentos.value = [];
  detalheCarregando.value = true;
  try {
    const [ri, rp] = await Promise.all([
      supabase.from('itens_venda').select('*').eq('venda_pk', v.pk).order('pk'),
      supabase.from('pagamentos_venda').select('*').eq('venda_pk', v.pk).order('pk'),
    ]);
    detalheItens.value      = ri.data || [];
    detalhePagamentos.value = rp.data || [];
  } catch (e) {
    toast('Erro ao carregar detalhes.', 'err');
  } finally {
    detalheCarregando.value = false;
  }
}

async function abrirDetalheEImprimir(v) {
  await abrirDetalhe(v);
  reimprimirRecibo();
}

function fecharDetalhe() { detalhe.value = null; }

function fmtDataHora(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR') + ' ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function locacaoVencida(v) {
  if (!v?.data_devolucao_prevista) return false;
  const prevista = new Date(v.data_devolucao_prevista).toLocaleDateString('en-CA');
  const hoje     = new Date().toLocaleDateString('en-CA');
  return prevista < hoje;
}

function confirmarDevolucaoLocacao() {
  const v = detalhe.value;
  if (!v) return;
  const taxaDiaria  = parseFloat(parametrosStore.getParam('locacao_taxa_realocacao', 0));
  const prevista    = v.data_devolucao_prevista ? new Date(v.data_devolucao_prevista) : null;
  const agora       = new Date();
  const diasAtraso  = prevista && agora > prevista
    ? Math.ceil((agora - prevista) / (1000 * 60 * 60 * 24))
    : 0;
  modalLocacao.value = {
    show: true,
    diasAtraso,
    taxaDiaria,
    taxaTotal: diasAtraso * taxaDiaria,
  };
}

async function executarDevolucaoLocacao(cobrarTaxa) {
  const v = detalhe.value;
  if (!v) return;
  salvandoLocacao.value = true;
  try {
    const acao = (cobrarTaxa && (modalLocacao.value.diasAtraso > 0 || modalLocacao.value.forcaTaxa)) ? 'taxa_cobrada' : 'devolvida';
    const taxaValor = acao === 'taxa_cobrada' ? (modalLocacao.value.taxaTotal || 0) : null;
    const body = { acao };
    if (taxaValor !== null) body.taxa_cobrada_valor = taxaValor;
    await apiClient.patch(`/api/vendas/${v.pk}/locacao`, body);
    const agora = new Date().toISOString();
    detalhe.value = { ...v, status_locacao: acao, data_devolucao_real: agora, taxa_realocacao_cobrada: taxaValor };
    const idx = vendas.value.findIndex(x => x.pk === v.pk);
    if (idx >= 0) vendas.value[idx] = { ...vendas.value[idx], status_locacao: acao };
    modalLocacao.value.show = false;
    toast(acao === 'taxa_cobrada'
      ? `Devolução confirmada e taxa de R$ ${fmtVal(modalLocacao.value.taxaTotal)} registrada.`
      : 'Devolução confirmada com sucesso.');
  } catch (e) {
    toast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    salvandoLocacao.value = false;
  }
}

function cobrarTaxaRealocacao() {
  const v = detalhe.value;
  if (!v) return;
  const taxaDiaria = parseFloat(parametrosStore.getParam('locacao_taxa_realocacao', 0));
  const prevista   = v.data_devolucao_prevista ? new Date(v.data_devolucao_prevista) : null;
  const agora      = new Date();
  const diasAtraso = prevista && agora > prevista
    ? Math.ceil((agora - prevista) / (1000 * 60 * 60 * 24))
    : 0;
  modalLocacao.value = {
    show: true,
    forcaTaxa: true,
    diasAtraso,
    taxaDiaria,
    taxaTotal: diasAtraso * taxaDiaria || taxaDiaria,
  };
}

function reimprimirRecibo() {
  const v          = detalhe.value;
  const itens      = detalheItens.value;
  const pags       = detalhePagamentos.value;
  const totalQtd   = itens.reduce((s, i) => s + parseFloat(i.qtd || 1), 0);
  const totalProds = itens.length;
  const fmtDt = (d) => new Date(d).toLocaleDateString('pt-BR') + ' ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const linhaItens = itens.map(it => {
    const disc = it.desconto_val > 0 ? ` (-${fmt(it.desconto_val)})` : '';
    return `
      <tr>
        <td>${it.descricao}${disc}<br/><span style="font-size:13px;font-weight:bold">${it.qtd} × ${fmt(it.preco_unit)}</span></td>
        <td style="text-align:right;white-space:nowrap;font-weight:bold">${fmt(it.total_item)}</td>
      </tr>`;
  }).join('');

  const linhaPags = pags.map(p =>
    `<tr><td style="text-transform:capitalize">${p.forma}</td><td style="text-align:right">${fmt(p.valor)}</td></tr>`
  ).join('');

  const totalPago = pags.reduce((s, p) => s + parseFloat(p.valor || 0), 0);
  const troco     = Math.max(0, totalPago - parseFloat(v.total || 0));

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Recibo #${v.numero}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 13px; color: #000; width: 320px; margin: 0 auto; padding: 20px 10px; }
  .center { text-align: center; }
  .sep    { border: none; border-top: 1px dashed #555; margin: 8px 0; }
  h1 { font-size: 16px; text-align: center; font-family: Arial, sans-serif; font-weight: 900; letter-spacing: 1px; }
  h2 { font-size: 11px; text-align: center; font-weight: bold; color: #000; margin-bottom: 2px; }
  .dnf { font-size: 11px; text-align: center; border: 1px solid #000; padding: 3px 8px; display: inline-block; margin: 6px auto 2px; letter-spacing: .5px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 2px; vertical-align: top; font-size: 13px; font-weight: bold; }
  .total-line { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 4px; }
  .sub-line   { display: flex; justify-content: space-between; font-size: 12px; color: #000; font-weight: bold; margin-top: 2px; }
  .qtd-total  { font-size: 12px; font-weight: bold; text-align: right; border-top: 1px dotted #000; padding-top: 3px; margin-top: 4px; }
  .rodape { font-size: 11px; text-align: center; color: #000; font-weight: bold; margin-top: 10px; line-height: 1.7; }
  @media print { body { padding: 4px; } }
</style>
</head>
<body>
<h1>FESTOU</h1>
<h2>Locações e Decorações</h2>
<h2>CNPJ: 56.918.133/0001-04</h2>
<h2>Alameda Cosme Ferreira 6893 — Manaus/AM</h2>
<div class="center"><span class="dnf">DOCUMENTO NÃO FISCAL</span></div>
<hr class="sep"/>
<div class="sub-line"><span>Nº da venda</span><span>#${v.numero}</span></div>
<div class="sub-line"><span>Data/hora</span><span>${fmtDt(new Date(v.criado_em))}</span></div>
${v.cliente ? `<div class="sub-line"><span>Cliente</span><span>${v.cliente}</span></div>` : ''}
<div class="sub-line"><span>Vendedor</span><span>${v.vendedor || v.operador || '—'}</span></div>
<hr class="sep"/>
<table>${linhaItens}</table>
<div class="qtd-total">Total: ${totalProds} produto${totalProds !== 1 ? 's' : ''} / ${totalQtd} un.</div>
<hr class="sep"/>
<div class="total-line"><span>TOTAL</span><span>${fmt(v.total)}</span></div>
<hr class="sep"/>
<table>${linhaPags}</table>
${troco > 0.009 ? `<div class="sub-line"><span>Troco</span><span>${fmt(troco)}</span></div>` : ''}
<hr class="sep"/>
<div class="rodape">Obrigado pela preferência!<br/>Este documento não tem valor fiscal.</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 10_000);
}

async function emitirNFCeDetalhe() {
  const v = detalhe.value;
  emitindoPk.value = v.pk;
  try {
    const resp = await apiClient.post("/api/nfce/emitir", {
      venda_pk: v.pk,
      ambiente: Number(parametrosStore.getParam('nfce_ambiente', 2)),
    });
    if (resp.data.ok) {
      nfceResult.value = resp.data;
      detalhe.value = { ...v, nfce_chave: resp.data.chave || 'emitida', nfce_danfe: resp.data.danfe || null };
      await carregar(paginaAtual.value);
      if (resp.data.danfe) imprimirDanfe(resp.data.danfe);
    } else {
      toast(resp.data.erro || 'NFC-e rejeitada', 'err');
    }
  } catch (e) {
    toast("Erro: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    emitindoPk.value = null;
  }
}

const reimprimindoPk = ref(null);
async function reimprimirNFCe() {
  const v = detalhe.value;
  if (!v) return;
  if (v.nfce_danfe) { imprimirDanfe(v.nfce_danfe); return; }
  reimprimindoPk.value = v.pk;
  try {
    const resp = await apiClient.post('/api/nfce/consultar', { venda_pk: v.pk });
    if (resp.data.danfe) {
      detalhe.value = { ...v, nfce_danfe: resp.data.danfe };
      imprimirDanfe(resp.data.danfe);
    } else {
      toast('DANFE não disponível para esta nota.', 'err');
    }
  } catch (e) {
    toast('Erro ao buscar DANFE: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    reimprimindoPk.value = null;
  }
}

function confirmarDevolucao(v) {
  vendaParaDevolver.value = v;
  motivoDevolucao.value = "";
  showModalDevolucao.value = true;
}

async function processarDevolucao() {
  const v = vendaParaDevolver.value;
  if (!v) return;
  carregando.value = true;
  try {
    const resp = await apiClient.post("/api/vendas/devolver", { venda_pk: v.pk, motivo: motivoDevolucao.value });
    if (resp.data.ok) {
      toast(`Venda #${v.numero} devolvida com sucesso!`);
      showModalDevolucao.value = false;
      await carregar(paginaAtual.value);
    }
  } catch (e) {
    toast("Erro: " + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

async function imprimirDanfe(url) {
  try {
    const resp = await apiClient.get('/api/nfce/danfe-html', { params: { url } });
    const html = resp.data;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(
      html + '<script>window.onload=function(){window.print()}<\/script>'
    );
    iframe.contentWindow.document.close();
    iframe.contentWindow.addEventListener('afterprint', () => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    });
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 30000);
  } catch {
    window.open(url, '_blank');
  }
}

function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function statusCls(s) {
  if (s === "finalizada") return "ok";
  if (s === "devolvida")  return "warn";
  if (s === "cancelada")  return "err";
  return "muted";
}
</script>

<style scoped>
.hist-wrap { display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 0.3s ease-out; color: var(--text); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.hist-header  { display: flex; flex-direction: column; gap: 1.25rem; }
.header-main  { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.page-title   { margin: 0; font-size: 1.6rem; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.stats-pills  { display: flex; gap: .75rem; }
.stat-pill    { padding: .4rem 1.2rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 50px; font-size: .85rem; color: var(--text); font-weight: 600; }
.stat-pill strong { color: var(--primary); }

.filtros-bar  { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--bg2); padding: 1rem; border-radius: 16px; border: 1px solid var(--border); flex-wrap: wrap; }
.search-group { position: relative; flex: 1; min-width: 280px; }
.search-icon  { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 20px; color: var(--primary); opacity: .7; }
.busca-input-v2 { width: 100%; padding: .75rem 1rem .75rem 2.8rem; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text); font-size: .95rem; transition: all .2s; outline: none; }
.busca-input-v2:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.filter-group { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.date-range-group { display: flex; align-items: center; gap: 6px; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; padding: 0 12px; height: 48px; }
.date-input-v2 { background: transparent; border: none; color: var(--text); font-size: .85rem; outline: none; cursor: pointer; font-weight: 600; width: 130px; }
.date-sep { font-size: .75rem; color: var(--text2); font-weight: 800; opacity: .5; }
.sel-input-v2 { padding: .75rem 1rem; background: var(--bg3); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text); font-size: .9rem; outline: none; cursor: pointer; min-width: 160px; font-weight: 600; }
.btn-refresh  { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--primary); color: #fff; border: none; border-radius: 12px; cursor: pointer; transition: all .2s; }
.btn-refresh:hover { filter: brightness(1.1); transform: rotate(45deg); }
.btn-clear    { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--bg3); color: var(--text2); border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all .2s; }
.btn-clear:hover { background: #fee2e2; color: #ef4444; border-color: #ef4444; }

/* Tabela */
.tabela-container { background: var(--bg2); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; }
.tabela-v2 { width: 100%; border-collapse: collapse; }
.tabela-v2 th { background: var(--bg3); padding: 1rem; text-align: left; font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; color: var(--text2); border-bottom: 2px solid var(--border); }
.tabela-v2 td { padding: 1rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.tabela-v2 tr:last-child td { border-bottom: none; }
.tabela-v2 tr:hover td { background: var(--bg3); cursor: pointer; }
.col-num    { font-weight: 800; color: var(--primary); }
.col-date   { font-size: .85rem; }
.col-total  { font-weight: 800; color: #10b981; }
.text-right { text-align: right; }

.type-pill  { padding: 3px 10px; border-radius: 20px; font-size: .7rem; font-weight: 800; }
.type-pill.vnd { background: rgba(99,102,241,.1); color: var(--primary); }
.type-pill.loc { background: rgba(245,158,11,.1); color: #d97706; }

.status-badge { padding: .35rem .9rem; border-radius: 8px; font-size: .7rem; font-weight: 800; text-transform: uppercase; display: inline-flex; }
.status-badge.ok   { background: #d1fae5; color: #065f46; }
.status-badge.warn { background: #fef3c7; color: #92400e; }
.status-badge.err  { background: #fee2e2; color: #991b1b; }

.nfce-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }
.nfce-status .material-symbols-outlined { font-size: 13px; }
.nfce-status.authorized { background: #d1fae5; color: #065f46; }
.nfce-status.pending    { background: var(--bg3); color: var(--text2); }

.actions-group { display: flex; gap: .5rem; justify-content: flex-end; }
.action-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--border); background: var(--bg3); color: var(--text2); cursor: pointer; transition: all .18s; display: flex; align-items: center; justify-content: center; }
.action-btn .material-symbols-outlined { font-size: 17px; }
.action-btn:hover { transform: scale(1.08); }
.action-btn.delete:hover { border-color: #ef4444; color: #ef4444; background: #fee2e2; }
.action-btn.print:hover  { border-color: var(--primary); color: var(--primary); background: rgba(99,102,241,.1); }
.action-btn.view:hover   { border-color: #06b6d4; color: #06b6d4; background: rgba(6,182,212,.1); }
.action-btn.return:hover { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,.1); }

/* Paginação */
.pagination-bar { display: flex; align-items: center; justify-content: center; gap: 2rem; padding: 1.25rem; background: var(--bg3); border-top: 1px solid var(--border); }
.pag-btn { display: flex; align-items: center; gap: 6px; padding: .55rem 1.1rem; border-radius: 10px; border: 1px solid var(--border); background: var(--bg2); color: var(--text); font-weight: 700; cursor: pointer; transition: all .2s; font-size: .85rem; }
.pag-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.pag-btn:disabled { opacity: .4; cursor: not-allowed; }
.pag-info { font-weight: 700; font-size: .9rem; color: var(--text2); }

/* Loading / Empty */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem; color: var(--text2); }
.vazio { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem; color: var(--text2); }
.empty-icon { font-size: 3rem; opacity: .3; }
.spinner { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s infinite linear; }

/* ── Modal Detalhe ─────────────────────────── */
.modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; width: 100%; max-width: 600px; box-shadow: 0 24px 60px rgba(0,0,0,.4); overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 14px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 1rem; font-weight: 700; color: var(--text); margin: 0; }
.modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px; border-top: 1px solid var(--border); flex-wrap: wrap; }

/* Det modal — maior e estruturado */
.det-modal { max-width: 860px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; }

/* Cabeçalho */
.det-modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.5rem 1.75rem 1.25rem; border-bottom: 2px solid var(--border); flex-shrink: 0; background: var(--bg2); gap: 1rem; }
.det-header-left { display: flex; flex-direction: column; gap: .5rem; }
.det-venda-num { font-size: 1.6rem; font-weight: 900; color: var(--text); letter-spacing: -1px; }
.det-header-meta { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
.det-sub-item { display: flex; align-items: center; gap: 4px; font-size: .82rem; color: var(--text2); font-weight: 600; }
.det-sub-item .material-symbols-outlined { font-size: 15px; }
.det-header-right { display: flex; align-items: center; gap: .6rem; flex-shrink: 0; }
.status-badge.lg { font-size: .8rem; padding: .45rem 1rem; }
.btn-close-x { width: 36px; height: 36px; border: 1px solid var(--border); background: var(--bg3); border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text2); transition: all .15s; }
.btn-close-x:hover { background: #fee2e2; color: #ef4444; border-color: #ef4444; }
.btn-close-x .material-symbols-outlined { font-size: 18px; }

/* Barra de locação */
.det-loc-bar { display: flex; align-items: center; gap: 1.5rem; padding: .9rem 1.75rem; background: rgba(245,158,11,.07); border-bottom: 1px solid rgba(245,158,11,.2); flex-shrink: 0; flex-wrap: wrap; }
.det-loc-item { display: flex; flex-direction: column; gap: 2px; }
.det-loc-label { font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #d97706; }
.det-loc-val { font-size: .88rem; font-weight: 700; color: var(--text); }
.det-loc-arrow { font-size: 18px; color: rgba(245,158,11,.5); }
.det-nfce-bar { display: flex; align-items: center; gap: 6px; padding: .65rem 1.75rem; background: rgba(5,150,105,.07); border-bottom: 1px solid rgba(5,150,105,.2); font-size: .82rem; font-weight: 700; color: #059669; flex-shrink: 0; }

/* Corpo com duas colunas — itens rolam, pagamentos ficam fixos */
.det-body { flex: 1; display: grid; grid-template-columns: 1fr 300px; min-height: 0; overflow: hidden; }
.det-section-block { padding: 1.25rem 1.75rem; display: flex; flex-direction: column; gap: .75rem; overflow-y: auto; }
.det-section-block + .det-section-block { border-left: 1px solid var(--border); overflow-y: visible; }
.det-pag-block { background: var(--bg3); overflow-y: visible; }

.det-section-hd { display: flex; align-items: center; gap: .5rem; font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; color: var(--text2); padding-bottom: .5rem; border-bottom: 1px solid var(--border); }
.det-section-hd .material-symbols-outlined { font-size: 16px; color: var(--primary); }
.det-section-count { margin-left: auto; background: var(--primary); color: #fff; font-size: .7rem; font-weight: 800; padding: 1px 7px; border-radius: 20px; }

.det-loading { display: flex; align-items: center; gap: .75rem; padding: 1.5rem 0; color: var(--text2); font-size: .9rem; }
.spinner-sm  { width: 20px; height: 20px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .7s infinite linear; flex-shrink: 0; }

.det-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
.det-table th { padding: .4rem .5rem; text-align: left; font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); border-bottom: 1px solid var(--border); }
.det-table td { padding: .65rem .5rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.det-table tr:last-child td { border-bottom: none; }
.det-table tr:hover td { background: var(--bg3); }
.det-item-nome { font-weight: 700; display: block; }
.det-disc-cell { color: #f87171; font-weight: 700; }
.tr   { text-align: right; }
.mono { font-family: monospace; font-size: .85rem; }
.bold { font-weight: 800; }

.det-pag-lista { display: flex; flex-direction: column; gap: .5rem; flex: 1; }
.det-pag-row  { display: flex; justify-content: space-between; align-items: center; padding: .6rem .75rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
.det-pag-forma { display: flex; align-items: center; gap: 6px; text-transform: capitalize; color: var(--text); font-weight: 700; font-size: .88rem; }
.det-pag-ico { font-size: 15px; color: var(--primary); }
.det-pag-val  { font-weight: 800; color: #10b981; font-family: monospace; font-size: .95rem; }
.det-acrescimo-row { background: rgba(52,211,153,.06); border-color: rgba(52,211,153,.2); }
.det-acrescimo-val { color: #34d399 !important; }
.det-total-row { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); padding-top: .75rem; border-top: 2px solid var(--border); margin-top: auto; }
.det-total-val { font-size: 1.3rem; font-weight: 900; color: var(--text); font-family: monospace; letter-spacing: -1px; }

/* Ações */
.det-actions { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: 1rem 1.75rem; background: var(--bg3); border-top: 1px solid var(--border); flex-shrink: 0; flex-wrap: wrap; }
.det-actions-right { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
.det-btn-fechar { padding: .6rem 1.2rem; border: 1px solid var(--border); background: var(--bg2); color: var(--text); border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .85rem; transition: all .15s; }
.det-btn-fechar:hover { background: var(--bg3); }
.det-btn-editar { display: flex; align-items: center; gap: 5px; padding: .6rem 1.1rem; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.35); color: var(--primary); border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .85rem; transition: all .15s; }
.det-btn-editar:hover { background: rgba(99,102,241,.22); }
.det-btn-loc-dev { display: flex; align-items: center; gap: 5px; padding: .6rem 1.1rem; background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.35); color: #34d399; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .85rem; transition: all .15s; }
.det-btn-loc-dev:hover:not(:disabled) { background: rgba(16,185,129,.22); }
.det-btn-loc-taxa { display: flex; align-items: center; gap: 5px; padding: .6rem 1.1rem; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.35); color: #f59e0b; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .85rem; transition: all .15s; }
.det-btn-loc-taxa:hover:not(:disabled) { background: rgba(245,158,11,.22); }
.det-btn-loc-dev:disabled, .det-btn-loc-taxa:disabled { opacity: .5; cursor: not-allowed; }
.loc-vencida { color: #f87171 !important; }
.loc-atrasada-badge { display: inline-block; margin-left: 6px; font-size: .7rem; background: rgba(239,68,68,.2); color: #f87171; border-radius: 4px; padding: 1px 6px; font-weight: 700; }
.loc-status-pendente   { color: #f59e0b; font-weight: 700; }
.loc-status-devolvida  { color: #34d399; font-weight: 700; }
.loc-status-taxa_cobrada { color: #a78bfa; font-weight: 700; }
.modal-loc { max-width: 460px; }
.loc-atraso-box { display: flex; flex-direction: column; gap: 10px; background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.3); border-radius: 12px; padding: 16px 18px; width: 100%; box-sizing: border-box; }
.loc-atraso-top { display: flex; align-items: center; gap: 8px; }
.loc-atraso-titulo { font-weight: 700; color: #f59e0b; font-size: .95rem; margin: 0; }
.loc-atraso-info { font-size: .86rem; color: var(--text2); margin: 0; }
.loc-taxa-row { display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px solid rgba(245,158,11,.2); }
.loc-taxa-label { font-size: .75rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; }
.loc-taxa-edit-wrap { display: flex; align-items: center; gap: 8px; background: var(--bg3); border: 2px solid rgba(245,158,11,.5); border-radius: 10px; padding: 4px 12px 4px 14px; width: 100%; box-sizing: border-box; }
.loc-taxa-prefix { font-size: 1rem; font-weight: 700; color: #f59e0b; flex-shrink: 0; }
.loc-taxa-input { flex: 1; padding: 8px 0; border: none; background: transparent; color: var(--text); font-size: 1.3rem; font-weight: 800; text-align: right; min-width: 0; outline: none; width: 100%; }
.loc-ok-box { display: flex; align-items: center; gap: 12px; background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.25); border-radius: 12px; padding: 16px 18px; font-size: .9rem; color: var(--text); }
.det-btn-print { display: flex; align-items: center; gap: .4rem; padding: .6rem 1.2rem; border: none; background: var(--primary); color: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; transition: opacity .15s; }
.det-btn-print:hover:not(:disabled) { opacity: .88; }
.det-btn-print:disabled { opacity: .5; cursor: not-allowed; }
.det-btn-nfce { display: flex; align-items: center; gap: .4rem; padding: .6rem 1.2rem; border: none; background: #7c3aed; color: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; transition: opacity .15s; }
.det-btn-nfce:hover:not(:disabled) { opacity: .88; }
.det-btn-nfce:disabled { opacity: .5; cursor: not-allowed; }
.det-btn-print .material-symbols-outlined,
.det-btn-nfce  .material-symbols-outlined { font-size: 17px; }

/* NFC-e result modal */
.modal-nfce { text-align: center; padding: 2.5rem 2rem; }
.nfce-ok-icon { font-size: 3rem; color: #10b981; margin-bottom: .5rem; }
.nfce-ok-icon .material-symbols-outlined { font-size: 3.5rem; }
.modal-nfce h3 { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 1.5rem; }
.nfce-actions { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }

/* Devolução */
.dev-modal  { padding: 1.75rem; }
.dev-header { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
.dev-icon   { font-size: 2rem; color: #f59e0b; }
.dev-header h3 { font-size: 1.1rem; font-weight: 800; color: var(--text); }
.dev-alert  { font-size: .85rem; color: #b45309; background: #fef3c7; padding: .75rem 1rem; border-radius: 10px; margin-bottom: 1rem; }
.field label { display: block; font-size: .82rem; font-weight: 700; color: var(--text2); margin-bottom: .4rem; }
.dev-textarea { width: 100%; min-height: 90px; padding: .75rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: .9rem; resize: vertical; outline: none; }
.dev-textarea:focus { border-color: var(--primary); }
.dev-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1rem; }
.btn-confirmar-dev { padding: .6rem 1.4rem; border: none; background: #ef4444; color: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; }
.btn-confirmar-dev:hover { opacity: .88; }
.btn-confirmar-dev:disabled { opacity: .5; cursor: not-allowed; }

.excl-modal { padding: 2rem; text-align: center; max-width: 420px; }
.excl-icon-wrap { width: 64px; height: 64px; border-radius: 50%; background: rgba(239,68,68,.12); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
.excl-icon { font-size: 32px; color: #ef4444; }
.excl-titulo { font-size: 1.15rem; font-weight: 800; color: var(--text); margin: 0 0 .6rem; }
.excl-msg { font-size: .88rem; color: var(--text2); margin: 0 0 1.5rem; line-height: 1.5; }
.btn-confirmar-excl { display: inline-flex; align-items: center; gap: 6px; padding: .6rem 1.6rem; border: none; background: #ef4444; color: #fff; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .88rem; }
.btn-confirmar-excl:hover:not(:disabled) { opacity: .88; }
.btn-confirmar-excl:disabled { opacity: .5; cursor: not-allowed; }

/* Toast */
.toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); padding: 1rem 2rem; border-radius: 14px; color: #fff; font-weight: 700; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,.2); white-space: nowrap; }
.toast.ok  { background: #10b981; }
.toast.err { background: #ef4444; }
.toast-enter-active, .toast-leave-active { transition: all .3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }

[data-theme="light"] .busca-input-v2,
[data-theme="light"] .date-range-group,
[data-theme="light"] .sel-input-v2 { background: #fff; border-color: #d1d5db; }
[data-theme="light"] .busca-input-v2:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
[data-theme="light"] .sel-input-v2:focus { border-color: #6366f1; }
[data-theme="light"] .date-input-v2 { color: #111827; }

/* ── MOBILE ──────────────────────────────────── */
@media (max-width: 700px) {

  /* Filtros */
  .filtros-bar { flex-direction: column; gap: .75rem; padding: .75rem; }
  .search-group { min-width: unset; }
  .filter-group { gap: .5rem; }
  .date-range-group { flex: 1; padding: 0 8px; height: 42px; }
  .date-input-v2 { width: 90px; font-size: .78rem; }
  .sel-input-v2 { flex: 1; min-width: unset; font-size: .82rem; padding: .6rem .75rem; }
  .btn-refresh, .btn-clear { width: 42px; height: 42px; border-radius: 10px; }

  /* Lista de vendas → cards */
  .tabela-container { background: transparent; border: none; border-radius: 0; gap: 10px; }
  .tabela-v2 { display: flex; flex-direction: column; gap: 10px; }
  .tabela-v2 thead { display: none; }
  .tabela-v2 tbody { display: flex; flex-direction: column; gap: 10px; }
  .tabela-v2 tr { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto auto; gap: 4px 8px;
    background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; padding: 14px; cursor: pointer; }
  .tabela-v2 tr:hover td { background: transparent; }
  .tabela-v2 tr:hover { background: var(--bg3); }
  .tabela-v2 td { padding: 0; border: none; font-size: .88rem; }

  .col-num  { font-size: 1rem; font-weight: 900; grid-column: 1; grid-row: 1; }
  .col-date { font-size: .78rem; color: var(--text2); grid-column: 1; grid-row: 2; }
  .col-client { font-size: .85rem; grid-column: 1; grid-row: 3; color: var(--text2); }
  .col-op   { display: none; }
  .col-total { font-size: 1rem; font-weight: 900; color: #10b981; grid-column: 2; grid-row: 1; text-align: right; }

  /* type-pill e status-badge ficam na linha 2, coluna 2 */
  .tabela-v2 td:has(.type-pill)   { grid-column: 2; grid-row: 2; text-align: right; }
  .tabela-v2 td:has(.status-badge){ grid-column: 2; grid-row: 3; text-align: right; }
  .tabela-v2 td:has(.nfce-status) { display: none; }
  .tabela-v2 td:has(.actions-group) { grid-column: 1 / -1; grid-row: 4; border-top: 1px solid var(--border); margin-top: 6px; padding-top: 10px; }
  .actions-group { justify-content: flex-start; }

  /* Paginação */
  .pagination-bar { gap: 1rem; padding: 1rem; }
  .pag-btn { padding: .5rem .9rem; font-size: .8rem; }

  /* Modal de detalhe — full screen bottom sheet */
  .modal-bg { padding: 0; align-items: flex-end; }
  .det-modal { max-width: 100%; width: 100%; max-height: 95vh; border-radius: 20px 20px 0 0; }

  /* Cabeçalho do modal */
  .det-modal-header { padding: 1.1rem 1.1rem .9rem; flex-wrap: wrap; gap: .6rem; }
  .det-venda-num { font-size: 1.3rem; }
  .det-header-meta { gap: .6rem; }
  .det-sub-item { font-size: .78rem; }
  .det-header-right { gap: .4rem; flex-wrap: wrap; }

  /* Barra locação */
  .det-loc-bar { padding: .75rem 1rem; gap: 1rem; }
  .det-nfce-bar { padding: .5rem 1rem; }

  /* Corpo: coluna única */
  .det-body { grid-template-columns: 1fr; overflow-y: auto; display: flex; flex-direction: column; }
  .det-section-block { padding: 1rem; overflow-y: visible; }
  .det-section-block + .det-section-block { border-left: none; border-top: 1px solid var(--border); }
  .det-pag-block { background: var(--bg3); }

  /* Tabela de itens → cards empilhados */
  .det-table { display: block; }
  .det-table thead { display: none; }
  .det-table tbody { display: flex; flex-direction: column; gap: 8px; }
  .det-table tr { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px;
    background: var(--bg3); border-radius: 10px; padding: 10px 12px; border: none; }
  .det-table tr:hover td { background: transparent; }
  .det-table td { padding: 0; border: none; }
  /* Produto — largura total */
  .det-table td:nth-child(1) { grid-column: 1 / -1; margin-bottom: 4px; }
  /* Qtd × Unit → linha 2 col 1 */
  .det-table td:nth-child(2)::before { content: 'Qtd: '; font-size: .72rem; color: var(--text2); font-weight: 600; }
  .det-table td:nth-child(2) { grid-column: 1; font-size: .82rem; text-align: left; }
  .det-table td:nth-child(3)::before { content: 'Unit.: '; font-size: .72rem; color: var(--text2); font-weight: 600; }
  .det-table td:nth-child(3) { grid-column: 1; font-size: .82rem; text-align: left; }
  /* Desconto → linha 3 col 1 */
  .det-table td:nth-child(4) { grid-column: 1; font-size: .82rem; text-align: left; }
  /* Total → coluna 2, linhas 2-4 */
  .det-table td:nth-child(5) { grid-column: 2; grid-row: 2 / 5; align-self: center; font-size: 1rem; }

  /* Ações do modal */
  .det-actions { padding: .75rem 1rem; gap: .5rem; }
  .det-actions-right { gap: .4rem; width: 100%; justify-content: flex-end; flex-wrap: wrap; }
  .det-btn-fechar, .det-btn-editar, .det-btn-loc-dev, .det-btn-loc-taxa,
  .det-btn-print, .det-btn-nfce { font-size: .78rem; padding: .5rem .85rem; }

  /* Outros modais */
  .modal { max-width: 100%; width: 100%; border-radius: 20px 20px 0 0; }
  .modal-bg:has(.excl-modal),
  .modal-bg:has(.dev-modal),
  .modal-bg:has(.modal-nfce),
  .modal-bg:has(.modal-loc) { align-items: flex-end; padding: 0; }
}
</style>
