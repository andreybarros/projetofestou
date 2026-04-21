<template>
  <div class="cv-wrap animate-fade">

    <!-- Header -->
    <div class="cv-header">
      <div>
        <h2 class="page-title">
          <span class="material-symbols-outlined">account_balance</span>
          Consolidação de Recebimentos
        </h2>
        <p class="cv-sub">Confirme pagamentos de vendas e registre recebimentos na conta.</p>
      </div>
      <button v-if="abaAtiva === 'recebimentos'" class="btn-novo" @click="abrirModalNovo">
        <span class="material-symbols-outlined">add</span>
        Novo Recebimento
      </button>
    </div>

    <!-- Tabs -->
    <div class="cv-tabs">
      <button :class="['tab-btn', { active: abaAtiva === 'pendentes' }]" @click="trocarAba('pendentes')">
        <span class="material-symbols-outlined">pending_actions</span>
        Vendas Pendentes
        <span v-if="totalPendentes > 0" class="tab-badge">{{ totalPendentes }}</span>
      </button>
      <button :class="['tab-btn', { active: abaAtiva === 'recebimentos' }]" @click="trocarAba('recebimentos')">
        <span class="material-symbols-outlined">account_balance_wallet</span>
        Extrato de Recebimentos
      </button>
      <div class="tab-spacer"></div>
      <div class="cv-search-global">
        <span class="material-symbols-outlined search-ico">search</span>
        <input type="text" v-model="buscaGlobal" placeholder="Pesquisar venda ou cliente..." />
      </div>
    </div>

    <!-- ─── ABA PENDENTES ─── -->
    <template v-if="abaAtiva === 'pendentes'">
      <div class="cv-filters card-glass">
        <div class="filter-group">
          <label>De (venda)</label>
          <input type="date" v-model="filtroPend.de" class="f-input" />
        </div>
        <div class="filter-group">
          <label>Até (venda)</label>
          <input type="date" v-model="filtroPend.ate" class="f-input" />
        </div>
        <div class="filter-group">
          <label>Forma</label>
          <select v-model="filtroPend.forma" class="f-input">
            <option value="">Todas</option>
            <option v-for="f in formas" :key="f.val" :value="f.val">{{ f.label }}</option>
          </select>
        </div>
        <button class="btn-buscar" @click="carregarPendentes" :disabled="carregandoPend">
          <span class="material-symbols-outlined">search</span>
          Buscar
        </button>
      </div>

      <div v-if="!carregandoPend && listaPendentes.length" class="cv-totals">
        <div v-for="card in totaisPendentes" :key="card.forma" class="total-card">
          <span class="material-symbols-outlined tc-icon" :style="{ color: corForma(card.forma) }">{{ iconeForma(card.forma) }}</span>
          <div>
            <p class="tc-label">{{ labelForma(card.forma) }}</p>
            <strong class="tc-val">{{ fmt(card.total) }}</strong>
            <span class="tc-count">{{ card.qtd }} lançamento{{ card.qtd !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <div v-if="carregandoPend" class="state-center"><span class="spin"></span> Buscando…</div>
      <div v-else-if="!listaPendentes.length" class="state-center muted">
        <span class="material-symbols-outlined" style="font-size:40px;opacity:.3">check_circle</span>
        Nenhum pagamento pendente neste período.
      </div>

      <div v-else class="cv-lista card-glass">
        <div v-for="p in listaPendentes" :key="p.pk" :class="['cv-row', { expanded: expandido === p.pk }]">
          <div class="cv-row-main" @click="toggleExpand(p)">
            <div class="cv-col-data">
              <span class="data-venda">{{ p.venda_data }}</span>
              <span class="hora-venda">{{ p.venda_hora }}</span>
            </div>
            <div class="cv-col-venda">
              <span class="num-venda">#{{ p.venda_numero }}</span>
              <span class="cliente-nome">{{ p.venda_cliente || 'Sem cliente' }}</span>
            </div>
            <div class="cv-col-forma">
              <span class="badge-forma" :style="{ background: bgForma(p.forma), color: corForma(p.forma) }">
                <span class="material-symbols-outlined" style="font-size:14px">{{ iconeForma(p.forma) }}</span>
                {{ labelForma(p.forma) }}
              </span>
            </div>
            <div class="cv-col-valor">
              <strong class="valor-pag">{{ fmt(p.valor) }}</strong>
            </div>
            <div class="cv-col-prev">
              <span class="prev-label">Prev. receb.</span>
              <span class="prev-data">{{ p.data_prevista }}</span>
            </div>
            <div class="cv-col-action">
              <span class="material-symbols-outlined exp-ico">{{ expandido === p.pk ? 'expand_less' : 'expand_more' }}</span>
            </div>
          </div>

          <div v-if="expandido === p.pk" class="cv-confirm-panel">
            <div class="confirm-fields">
              <div class="cf-group">
                <label>Data de recebimento</label>
                <input type="date" v-model="formPend[p.pk].data_recebimento" class="cf-input" />
              </div>
              <div class="cf-group">
                <label>Conta</label>
                <select v-model="formPend[p.pk].conta_pk" class="cf-input">
                  <option :value="null">Selecionar conta…</option>
                  <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
                </select>
              </div>
              <div class="cf-group cf-group-obs">
                <label>Descrição</label>
                <input type="text" v-model="formPend[p.pk].descricao" class="cf-input" placeholder="Opcional…" />
              </div>
            </div>
            <div class="confirm-actions">
              <button class="btn-confirmar" @click="confirmarPendente(p)" :disabled="salvando[p.pk] || !formPend[p.pk].data_recebimento">
                <span v-if="salvando[p.pk]" class="spin-sm"></span>
                <span class="material-symbols-outlined" v-else>check</span>
                Confirmar recebimento
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ─── ABA RECEBIMENTOS ─── -->
    <template v-if="abaAtiva === 'recebimentos'">
      <div class="cv-filters card-glass">
        <div class="filter-group">
          <label>De (receb.)</label>
          <input type="date" v-model="filtroRec.de" class="f-input" />
        </div>
        <div class="filter-group">
          <label>Até (receb.)</label>
          <input type="date" v-model="filtroRec.ate" class="f-input" />
        </div>
        <div class="filter-group">
          <label>Conta</label>
          <select v-model="filtroRec.conta_pk" class="f-input">
            <option value="">Todas</option>
            <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Forma</label>
          <select v-model="filtroRec.forma" class="f-input">
            <option value="">Todas</option>
            <option v-for="f in formas" :key="f.val" :value="f.val">{{ f.label }}</option>
          </select>
        </div>
        <button class="btn-buscar" @click="carregarRecebimentos" :disabled="carregandoRec">
          <span class="material-symbols-outlined">search</span>
          Buscar
        </button>
      </div>

      <div v-if="!carregandoRec && listaRec.length" class="cv-totals">
        <div class="total-card total-geral">
          <span class="material-symbols-outlined tc-icon" style="color:#4ade80">account_balance</span>
          <div>
            <p class="tc-label">Total Recebido</p>
            <strong class="tc-val">{{ fmt(totalRecebido) }}</strong>
            <span class="tc-count">{{ listaRec.length }} lançamento{{ listaRec.length !== 1 ? 's' : '' }}</span>
          </div>
        </div>
        <div v-for="card in totaisRecPorForma" :key="card.forma" class="total-card">
          <span class="material-symbols-outlined tc-icon" :style="{ color: corForma(card.forma) }">{{ iconeForma(card.forma) }}</span>
          <div>
            <p class="tc-label">{{ labelForma(card.forma) }}</p>
            <strong class="tc-val">{{ fmt(card.total) }}</strong>
            <span class="tc-count">{{ card.qtd }}</span>
          </div>
        </div>
      </div>

      <div v-if="carregandoRec" class="state-center"><span class="spin"></span> Buscando…</div>
      <div v-else-if="!listaRec.length" class="state-center muted">
        <span class="material-symbols-outlined" style="font-size:40px;opacity:.3">account_balance_wallet</span>
        Nenhum recebimento encontrado.
      </div>

      <div v-else class="cv-lista card-glass">
        <div v-for="r in listaRec" :key="r.pk" class="cv-row">
          <div class="cv-row-main cv-row-rec">
            <div class="cv-col-data">
              <span class="data-venda">{{ fmtDataSimples(r.data_recebimento) }}</span>
            </div>
            <div class="cv-col-venda">
              <span v-if="r.pagamento_pk" class="num-venda">#{{ r.venda_numero || '—' }}</span>
              <span v-else class="badge-manual">Manual</span>
              <span class="cliente-nome">{{ r.descricao || r.venda_cliente || '—' }}</span>
            </div>
            <div class="cv-col-forma">
              <span class="badge-forma" :style="{ background: bgForma(r.forma), color: corForma(r.forma) }">
                <span class="material-symbols-outlined" style="font-size:14px">{{ iconeForma(r.forma) }}</span>
                {{ labelForma(r.forma) }}
              </span>
            </div>
            <div class="cv-col-valor">
              <strong class="valor-pag">{{ fmt(r.valor) }}</strong>
            </div>
            <div class="cv-col-conta">
              <span class="conta-nome">{{ nomeContaPk(r.conta_pk) || '—' }}</span>
            </div>
            <div class="cv-col-btns">
              <button v-if="!r.pagamento_pk" class="btn-match" @click="abrirConciliacao(r)" title="Conciliar com Venda">
                <span class="material-symbols-outlined">link</span>
              </button>
              <button class="btn-icon" @click="editarRecebimento(r)" title="Editar">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon btn-icon-del" @click="excluirRecebimento(r)" title="Excluir">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ─── MODAL RECEBIMENTO ─── -->
    <Teleport to="body">
      <div v-if="modalAberto" class="modal-overlay" @click.self="fecharModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3>{{ modalForm.pk ? 'Editar Recebimento' : 'Novo Recebimento' }}</h3>
            <button class="modal-close" @click="fecharModal">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="mf-row">
              <div class="mf-group">
                <label>Data de recebimento *</label>
                <input type="date" v-model="modalForm.data_recebimento" class="cf-input" />
              </div>
              <div class="mf-group">
                <label>Valor *</label>
                <input type="number" v-model="modalForm.valor" class="cf-input" step="0.01" min="0" placeholder="0,00" />
              </div>
            </div>
            <div class="mf-row">
              <div class="mf-group">
                <label>Forma de pagamento</label>
                <select v-model="modalForm.forma" class="cf-input">
                  <option value="">Selecionar…</option>
                  <option v-for="f in formas" :key="f.val" :value="f.val">{{ f.label }}</option>
                </select>
              </div>
              <div class="mf-group">
                <label>Conta</label>
                <select v-model="modalForm.conta_pk" class="cf-input">
                  <option :value="null">Selecionar conta…</option>
                  <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
                </select>
              </div>
            </div>
            <div class="mf-group mf-full">
              <label>Descrição</label>
              <input type="text" v-model="modalForm.descricao" class="cf-input" placeholder="Ex: Depósito bancário, transferência recebida…" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="fecharModal">Cancelar</button>
            <button class="btn-confirmar" @click="salvarModal" :disabled="salvandoModal || !modalForm.data_recebimento || !modalForm.valor">
              <span v-if="salvandoModal" class="spin-sm"></span>
              <span class="material-symbols-outlined" v-else>save</span>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── MODAL CONCILIAR (MATCH) ─── -->
    <Teleport to="body">
      <div v-if="modalConciliarAberto" class="modal-overlay" @click.self="modalConciliarAberto = false">
        <div class="modal-box modal-match">
          <div class="modal-header">
            <h3>Vincular Recebimento a Venda</h3>
            <button class="modal-close" @click="modalConciliarAberto = false">×</button>
          </div>
          <div class="modal-body custom-scroll">
            <div class="match-rec-summary">
              <div class="mr-label">Recebimento selecionado:</div>
              <div class="mr-val">
                <strong>{{ fmt(recParaConciliar.valor) }}</strong> em {{ fmtDataSimples(recParaConciliar.data_recebimento) }} 
                ({{ labelForma(recParaConciliar.forma) }})
              </div>
            </div>

            <div class="match-title">Selecione a venda correspondente:</div>
            
            <div v-if="buscandoMatch" class="state-center"><span class="spin"></span> Buscando vendas…</div>
            <div v-else-if="!pendentesParaMatch.length" class="state-center muted">
              Nenhuma venda pendente encontrada para conciliação.
            </div>
            <div v-else class="match-list">
              <div v-for="p in pendentesParaMatch" :key="p.pk" class="match-item" @click="confirmarMatch(p)">
                <div class="mi-info">
                  <span class="mi-venda">#{{ p.venda_numero }} — {{ p.venda_cliente || 'Sem cliente' }}</span>
                  <span class="mi-meta">{{ p.venda_data }} | Forma: {{ labelForma(p.forma) }}</span>
                </div>
                <div class="mi-valor">
                   <span v-if="Math.abs(p.valor - recParaConciliar.valor) < 0.01" class="badge-match">Valor Exato</span>
                   <strong>{{ fmt(p.valor) }}</strong>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="modalConciliarAberto = false">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── MODAL CONFIRMAR EXCLUSÃO ─── -->
    <Teleport to="body">
      <div v-if="excluindoRec" class="modal-overlay" @click.self="excluindoRec = null">
        <div class="modal-box modal-sm">
          <div class="modal-header">
            <h3>Excluir Recebimento</h3>
          </div>
          <div class="modal-body">
            <p>Deseja excluir o recebimento de <strong>{{ fmt(excluindoRec.valor) }}</strong>
            em <strong>{{ fmtDataSimples(excluindoRec.data_recebimento) }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="excluindoRec = null">Cancelar</button>
            <button class="btn-danger" @click="confirmarExclusao" :disabled="removendo">
              <span v-if="removendo" class="spin-sm"></span>
              <span class="material-symbols-outlined" v-else>delete</span>
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="cv-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const sessaoStore = useSessaoStore();

const hoje     = new Date().toISOString().slice(0, 10);
const inicioMes = hoje.slice(0, 8) + '01';

const abaAtiva    = ref('pendentes');
const filtroPend  = ref({ de: inicioMes, ate: hoje, forma: '' });
const filtroRec   = ref({ de: inicioMes, ate: hoje, forma: '', conta_pk: '' });
const buscaGlobal = ref('');

const carregandoPend = ref(false);
const carregandoRec  = ref(false);
const listaPendentes = ref([]);
const listaRec       = ref([]);
const contas         = ref([]);
const expandido      = ref(null);
const salvando       = reactive({});
const formPend       = reactive({});

const modalAberto   = ref(false);
const salvandoModal = ref(false);
const modalForm     = ref({});
const excluindoRec  = ref(null);
const removendo     = ref(false);

const modalConciliarAberto = ref(false);
const recParaConciliar      = ref(null);
const pendentesParaMatch    = ref([]);
const buscandoMatch        = ref(false);

const toastMsg  = ref('');
const toastTipo = ref('ok');
let toastTimer  = null;

const formas = [
  { val: 'dinheiro',  label: 'Dinheiro'   },
  { val: 'pix',       label: 'PIX'        },
  { val: 'debito',    label: 'Débito'     },
  { val: 'credito',   label: 'Crédito'    },
  { val: 'crediario', label: 'Crediário'  },
];

const totalPendentes  = computed(() => listaPendentes.value.length);
const totalRecebido   = computed(() => listaRec.value.reduce((s, r) => s + parseFloat(r.valor || 0), 0));

const totaisPendentes = computed(() => {
  const mapa = {};
  listaPendentes.value.forEach(p => {
    const k = p.forma || 'outros';
    if (!mapa[k]) mapa[k] = { forma: k, total: 0, qtd: 0 };
    mapa[k].total += parseFloat(p.valor || 0);
    mapa[k].qtd++;
  });
  return Object.values(mapa).sort((a, b) => b.total - a.total);
});

const totaisRecPorForma = computed(() => {
  const mapa = {};
  listaRec.value.forEach(r => {
    const k = r.forma || 'outros';
    if (!mapa[k]) mapa[k] = { forma: k, total: 0, qtd: 0 };
    mapa[k].total += parseFloat(r.valor || 0);
    mapa[k].qtd++;
  });
  return Object.values(mapa).sort((a, b) => b.total - a.total);
});

onMounted(() => {
  carregarContas();
  carregarPendentes();
});

function trocarAba(aba) {
  abaAtiva.value  = aba;
  expandido.value = null;
  if (aba === 'recebimentos' && !listaRec.value.length) carregarRecebimentos();
}

async function carregarContas() {
  const { data } = await supabase
    .from('contas_bancarias')
    .select('pk, nome')
    .eq('filial_pk', sessaoStore.filial?.pk)
    .order('nome');
  contas.value = data || [];
}

async function carregarPendentes() {
  carregandoPend.value = true;
  expandido.value = null;
  try {
    const de  = filtroPend.value.de  + 'T00:00:00';
    const ate = filtroPend.value.ate + 'T23:59:59';

    let q = supabase
      .from('pagamentos_venda')
      .select('pk, venda_pk, forma, valor, vendas!inner(pk, numero, criado_em, cliente, filial_pk)')
      .eq('vendas.filial_pk', sessaoStore.filial?.pk)
      .gte('vendas.criado_em', de)
      .lte('vendas.criado_em', ate);

    if (filtroPend.value.forma) q = q.eq('forma', filtroPend.value.forma);

    const { data: pagamentos, error } = await q;
    if (error) throw error;

    // Descobre quais pagamentos já têm recebimento registrado
    const pks = (pagamentos || []).map(p => p.pk);
    let jaConfirmados = new Set();
    if (pks.length) {
      const { data: recExist } = await supabase
        .from('recebimentos')
        .select('pagamento_pk')
        .in('pagamento_pk', pks);
      jaConfirmados = new Set((recExist || []).map(r => r.pagamento_pk));
    }

    const pendentes = (pagamentos || [])
      .filter(p => !jaConfirmados.has(p.pk))
      .map(p => {
        const v  = p.vendas;
        const dt = v?.criado_em ? new Date(v.criado_em) : new Date();
        return {
          pk:            p.pk,
          venda_pk:      p.venda_pk,
          venda_numero:  v?.numero,
          venda_cliente: v?.cliente,
          venda_data:    fmtDataSimples(dt.toISOString().slice(0, 10)),
          venda_hora:    dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          forma:         p.forma,
          valor:         p.valor,
          data_prevista: fmtDataSimples(dataPrevisao(p.forma, dt)),
        };
      })
      .sort((a, b) => b.venda_data.localeCompare(a.venda_data));

    listaPendentes.value = pendentes;

    pendentes.forEach(p => {
      if (!formPend[p.pk]) {
        formPend[p.pk] = {
          data_recebimento: dataPrevisao(p.forma, new Date()),
          conta_pk: null,
          descricao: '',
        };
      }
    });
  } catch (e) {
    showToast('Erro ao carregar pendentes: ' + e.message, 'err');
  } finally {
    carregandoPend.value = false;
  }
}

async function carregarRecebimentos() {
  carregandoRec.value = true;
  try {
    let q = supabase
      .from('recebimentos')
      .select('*')
      .eq('filial_pk', sessaoStore.filial?.pk)
      .gte('data_recebimento', filtroRec.value.de)
      .lte('data_recebimento', filtroRec.value.ate)
      .order('data_recebimento', { ascending: false });

    if (filtroRec.value.forma)    q = q.eq('forma', filtroRec.value.forma);
    if (filtroRec.value.conta_pk) q = q.eq('conta_pk', filtroRec.value.conta_pk);

    const { data, error } = await q;
    if (error) throw error;

    const items    = data || [];
    const vendaPks = [...new Set(items.filter(r => r.venda_pk).map(r => r.venda_pk))];

    if (vendaPks.length) {
      const { data: vendas } = await supabase
        .from('vendas')
        .select('pk, numero, cliente')
        .in('pk', vendaPks);
      const vendaMap = {};
      (vendas || []).forEach(v => { vendaMap[v.pk] = v; });
      items.forEach(r => {
        if (r.venda_pk && vendaMap[r.venda_pk]) {
          r.venda_numero  = vendaMap[r.venda_pk].numero;
          r.venda_cliente = vendaMap[r.venda_pk].cliente;
        }
      });
    }

    listaRec.value = items;
  } catch (e) {
    showToast('Erro ao carregar recebimentos: ' + e.message, 'err');
  } finally {
    carregandoRec.value = false;
  }
}

function toggleExpand(p) {
  expandido.value = expandido.value === p.pk ? null : p.pk;
}

async function confirmarPendente(p) {
  const f = formPend[p.pk];
  if (!f?.data_recebimento) return;
  salvando[p.pk] = true;
  try {
    const { error } = await supabase.from('recebimentos').insert({
      filial_pk:        sessaoStore.filial?.pk,
      pagamento_pk:     p.pk,
      venda_pk:         p.venda_pk,
      conta_pk:         f.conta_pk || null,
      data_recebimento: f.data_recebimento,
      valor:            p.valor,
      forma:            p.forma,
      descricao:        f.descricao || null,
    });
    if (error) throw error;
    showToast('Recebimento confirmado!', 'ok');
    expandido.value = null;
    await carregarPendentes();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    salvando[p.pk] = false;
  }
}

function abrirModalNovo() {
  modalForm.value = {
    pk: null, data_recebimento: hoje,
    valor: '', forma: '', conta_pk: null, descricao: '',
  };
  modalAberto.value = true;
}

function editarRecebimento(r) {
  modalForm.value   = { ...r };
  modalAberto.value = true;
}

function fecharModal() {
  modalAberto.value = false;
}

async function salvarModal() {
  const f = modalForm.value;
  if (!f.data_recebimento || !f.valor) return;
  salvandoModal.value = true;
  try {
    const payload = {
      filial_pk:        sessaoStore.filial?.pk,
      pagamento_pk:     f.pagamento_pk || null,
      venda_pk:         f.venda_pk     || null,
      conta_pk:         f.conta_pk     || null,
      data_recebimento: f.data_recebimento,
      valor:            parseFloat(f.valor),
      forma:            f.forma    || null,
      descricao:        f.descricao || null,
    };
    let error;
    if (f.pk) {
      ({ error } = await supabase.from('recebimentos').update(payload).eq('pk', f.pk));
    } else {
      ({ error } = await supabase.from('recebimentos').insert(payload));
    }
    if (error) throw error;
    showToast(f.pk ? 'Atualizado!' : 'Recebimento registrado!', 'ok');
    fecharModal();
    await carregarRecebimentos();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    salvandoModal.value = false;
  }
}

function excluirRecebimento(r) {
  excluindoRec.value = r;
}

async function confirmarExclusao() {
  removendo.value = true;
  try {
    const { error } = await supabase.from('recebimentos').delete().eq('pk', excluindoRec.value.pk);
    if (error) throw error;
    showToast('Excluído com sucesso.', 'ok');
    excluindoRec.value = null;
    await carregarRecebimentos();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    removendo.value = false;
  }
}

async function abrirConciliacao(r) {
  recParaConciliar.value = r;
  modalConciliarAberto.value = true;
  buscandoMatch.value = true;
  try {
    // Busca pendentes que não têm recebido e que sejam da mesma filial
    // Filtramos um período amplo para dar margem de encontro
    const de  = '2020-01-01T00:00:00'; 
    const ate = '2030-12-31T23:59:59';

    let q = supabase
      .from('pagamentos_venda')
      .select('pk, venda_pk, forma, valor, vendas!inner(pk, numero, criado_em, cliente, filial_pk)')
      .eq('vendas.filial_pk', sessaoStore.filial?.pk)
      .order('vendas(criado_em)', { ascending: false });

    const { data: pagamentos, error } = await q;
    if (error) throw error;

    // Descobre quais já estão confirmados
    const pks = (pagamentos || []).map(p => p.pk);
    let jaConfirmados = new Set();
    if (pks.length) {
      const { data: recExist } = await supabase.from('recebimentos').select('pagamento_pk').in('pagamento_pk', pks);
      jaConfirmados = new Set((recExist || []).map(re => re.pagamento_pk));
    }

    pendentesParaMatch.value = (pagamentos || [])
      .filter(p => !jaConfirmados.has(p.pk))
      .map(p => {
        const v = p.vendas;
        return {
          pk: p.pk,
          venda_pk: p.venda_pk,
          venda_numero: v?.numero,
          venda_cliente: v?.cliente,
          venda_data: fmtDataSimples(v?.criado_em.slice(0, 10)),
          forma: p.forma,
          valor: p.valor
        };
      });
  } catch (e) {
    showToast('Erro ao buscar vendas: ' + e.message, 'err');
  } finally {
    buscandoMatch.value = false;
  }
}

async function confirmarMatch(pend) {
  if (!confirm(`Deseja vincular este recebimento à venda #${pend.venda_numero}?`)) return;
  const rec = recParaConciliar.value;
  try {
    const { error } = await supabase.from('recebimentos')
      .update({
        pagamento_pk: pend.pk,
        venda_pk:     pend.venda_pk,
        descricao:    `Vínculo Venda #${pend.venda_numero}` + (rec.descricao ? ' - ' + rec.descricao : '')
      })
      .eq('pk', rec.pk);
    
    if (error) throw error;
    showToast('Venda vinculada com sucesso!', 'ok');
    modalConciliarAberto.value = false;
    await carregarRecebimentos();
  } catch (e) {
    showToast('Erro ao vincular: ' + e.message, 'err');
  }
}

// ── Helpers ───────────────────────────────────────────────────
function dataPrevisao(forma, base) {
  const f = forma?.toLowerCase();
  const d = new Date(base);
  if (f === 'dinheiro' || f === 'pix') return d.toISOString().slice(0, 10);
  if (f === 'debito' || f === 'credito') return proximoDiaUtil(d, 1).toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function proximoDiaUtil(base, dias) {
  const d = new Date(base);
  let n = 0;
  while (n < dias) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return d;
}

function nomeContaPk(pk) {
  if (!pk) return '';
  return contas.value.find(c => c.pk === pk)?.nome || '';
}

function labelForma(f) {
  const m = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito', crediario: 'Crediário' };
  return m[f?.toLowerCase()] || f || '—';
}
function iconeForma(f) {
  const m = { dinheiro: 'payments', pix: 'qr_code', debito: 'credit_card', credito: 'add_card', crediario: 'receipt_long' };
  return m[f?.toLowerCase()] || 'attach_money';
}
function corForma(f) {
  const m = { dinheiro: '#4ade80', pix: '#60a5fa', debito: '#f59e0b', credito: '#c084fc', crediario: '#f87171' };
  return m[f?.toLowerCase()] || '#94a3b8';
}
function bgForma(f) {
  const m = { dinheiro: 'rgba(74,222,128,.12)', pix: 'rgba(96,165,250,.12)', debito: 'rgba(245,158,11,.12)', credito: 'rgba(192,132,252,.12)', crediario: 'rgba(248,113,113,.12)' };
  return m[f?.toLowerCase()] || 'rgba(148,163,184,.1)';
}
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtDataSimples(s) {
  if (!s) return '—';
  const [y, m, dia] = String(s).split('-');
  return `${dia}/${m}/${y}`;
}
function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3500);
}
</script>

<style scoped>
.cv-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 80px; display: flex; flex-direction: column; gap: 20px; }

.cv-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.cv-sub { color: var(--text2); font-size: 13px; margin: 0; }
.btn-novo { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: var(--accent); border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }

/* Tabs */
.cv-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); }
.tab-btn { display: flex; align-items: center; gap: 7px; padding: 10px 18px; background: none; border: none; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .15s; }
.tab-btn:hover { color: var(--text); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-btn .material-symbols-outlined { font-size: 18px; }
.tab-badge { background: var(--accent); color: #fff; border-radius: 10px; font-size: 11px; font-weight: 700; padding: 1px 7px; min-width: 20px; text-align: center; }

/* Filtros */
.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; }
.cv-filters { display: flex; align-items: flex-end; gap: 12px; padding: 16px 20px; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 5px; }
.filter-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.f-input { padding: 7px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 120px; }
.f-input:focus { outline: none; border-color: var(--accent); }
.btn-buscar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: var(--accent); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; height: 35px; }
.btn-buscar:disabled { opacity: .5; cursor: not-allowed; }
.tab-spacer { flex: 1; }
.cv-search-global { display: flex; align-items: center; gap: 8px; background: var(--bg3); border: 1px solid var(--border); padding: 4px 12px; border-radius: 20px; min-width: 260px; }
.cv-search-global input { border: none; background: none; font-size: 13px; color: var(--text); width: 100%; outline: none; }
.cv-search-global .search-ico { font-size: 18px; color: var(--text2); }

/* Conciliação Match */
.btn-match { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: rgba(96,165,250,.1); border: 1px solid rgba(96,165,250,.3); border-radius: 7px; color: #60a5fa; cursor: pointer; transition: all .15s; }
.btn-match:hover { background: #60a5fa; color: #fff; }

.modal-match { max-width: 600px; }
.match-rec-summary { background: var(--bg3); padding: 16px; border-radius: 12px; border-left: 4px solid var(--accent); margin-bottom: 20px; }
.mr-label { font-size: 11px; text-transform: uppercase; color: var(--text2); font-weight: 700; margin-bottom: 4px; }
.mr-val { font-size: 14px; color: var(--text); }
.match-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
.match-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
.match-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: all .15s; }
.match-item:hover { border-color: var(--accent); transform: scale(1.01); background: var(--bg2); }
.mi-info { display: flex; flex-direction: column; gap: 2px; }
.mi-venda { font-size: 13px; font-weight: 700; color: var(--text); }
.mi-meta { font-size: 11px; color: var(--text2); }
.mi-valor { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
.mi-valor strong { font-size: 15px; color: var(--text); }
.badge-match { font-size: 10px; font-weight: 800; background: #16a34a; color: #fff; padding: 2px 8px; border-radius: 10px; margin-bottom: 4px; }

/* Totais */
.cv-totals { display: flex; gap: 12px; flex-wrap: wrap; }
.total-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; flex: 1; min-width: 160px; }
.tc-icon { font-size: 28px; flex-shrink: 0; }
.tc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); margin: 0 0 2px; }
.tc-val { font-size: 16px; font-weight: 800; color: var(--text); display: block; font-family: var(--mono, monospace); }
.tc-count { font-size: 11px; color: var(--text2); }

/* Lista */
.cv-lista { overflow: hidden; }
.cv-row { border-bottom: 1px solid var(--border); transition: background .15s; }
.cv-row:last-child { border-bottom: none; }
.cv-row-main { display: grid; grid-template-columns: 90px 1fr 130px 110px 140px 36px; align-items: center; gap: 12px; padding: 14px 20px; cursor: pointer; }
.cv-row-main:hover { background: var(--bg3); }
.cv-row-rec { grid-template-columns: 90px 1fr 130px 110px 140px 70px; cursor: default; }
.cv-row-rec:hover { background: var(--bg3); }

.cv-col-data { display: flex; flex-direction: column; }
.data-venda { font-size: 13px; font-weight: 600; color: var(--text); }
.hora-venda { font-size: 11px; color: var(--text2); }

.cv-col-venda { display: flex; flex-direction: column; min-width: 0; }
.num-venda { font-size: 12px; font-weight: 700; color: var(--accent); }
.cliente-nome { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge-manual { font-size: 11px; font-weight: 700; color: #60a5fa; background: rgba(96,165,250,.12); padding: 2px 8px; border-radius: 10px; display: inline-block; width: fit-content; }

.badge-forma { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }

.valor-pag { font-size: 15px; font-weight: 800; color: var(--text); font-family: var(--mono, monospace); }

.cv-col-prev { display: flex; flex-direction: column; }
.prev-label { font-size: 10px; color: var(--text2); text-transform: uppercase; letter-spacing: .04em; }
.prev-data { font-size: 13px; font-weight: 600; color: var(--text2); }

.cv-col-conta { min-width: 0; }
.conta-nome { font-size: 13px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.exp-ico { font-size: 18px; color: var(--text2); }

.cv-col-btns { display: flex; gap: 4px; }
.btn-icon { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: var(--bg3); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); cursor: pointer; transition: all .15s; }
.btn-icon:hover { color: var(--text); border-color: var(--accent); }
.btn-icon .material-symbols-outlined { font-size: 16px; }
.btn-icon-del:hover { color: #f87171; border-color: #f87171; }

/* Painel confirmação */
.cv-confirm-panel { padding: 16px 20px 20px; background: var(--bg3); border-top: 1px solid var(--border); }
.confirm-fields { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.cf-group { display: flex; flex-direction: column; gap: 5px; }
.cf-group-obs { flex: 1; min-width: 200px; }
.cf-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.cf-input { padding: 7px 12px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; min-width: 150px; }
.cf-input:focus { outline: none; border-color: var(--accent); }
.confirm-actions { display: flex; justify-content: flex-end; }
.btn-confirmar { display: flex; align-items: center; gap: 6px; padding: 9px 20px; background: #16a34a; border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-confirmar:disabled { opacity: .5; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 16px; }
.modal-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 0; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-sm { max-width: 380px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
.modal-close { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; }
.modal-close:hover { color: var(--text); }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.modal-body p { color: var(--text); font-size: 14px; margin: 0; line-height: 1.5; }
.mf-row { display: flex; gap: 12px; flex-wrap: wrap; }
.mf-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 140px; }
.mf-full { flex: unset; }
.mf-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px 20px; border-top: 1px solid var(--border); }
.btn-cancel { padding: 9px 18px; background: var(--bg3); border: 1px solid var(--border); border-radius: 9px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-cancel:hover { color: var(--text); }
.btn-danger { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: #991b1b; border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-danger:disabled { opacity: .5; cursor: not-allowed; }

/* Toast */
.cv-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap; }
.cv-toast.ok  { background: #166534; color: #bbf7d0; }
.cv-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

.state-center { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px; color: var(--text2); font-size: 14px; }
.muted { opacity: .6; }
.spin { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .cv-row-main { grid-template-columns: 70px 1fr 100px 90px; }
  .cv-col-prev, .cv-col-conta { display: none; }
  .cv-row-rec { grid-template-columns: 70px 1fr 100px 90px 56px; }
}
</style>
