<template>
  <div class="ag-wrap animate-fade">

    <!-- Header -->
    <div class="ag-header">
      <div>
        <h2 class="page-title">
          <span class="material-symbols-outlined">calendar_month</span>
          Agenda
        </h2>
        <p class="ag-sub">Eventos, locações e serviços de montagem</p>
      </div>
      <button class="btn-novo" @click="abrirModal()">
        <span class="material-symbols-outlined">add</span>
        Novo Evento
      </button>
    </div>

    <!-- Layout: calendário + painel lateral -->
    <div class="ag-layout">

      <!-- ══ CALENDÁRIO ══ -->
      <div class="ag-calendar card-glass">

        <!-- Navegação de mês -->
        <div class="cal-nav">
          <button class="cal-nav-btn" @click="mesAnterior">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <h3 class="cal-mes">{{ mesLabel }}</h3>
          <button class="cal-nav-btn" @click="proximoMes">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
          <button class="cal-hoje-btn" @click="irHoje">Hoje</button>
        </div>

        <!-- Semana header -->
        <div class="cal-grid">
          <div v-for="d in diasSemana" :key="d" class="cal-dow">{{ d }}</div>

          <!-- Dias -->
          <div
            v-for="dia in diasCalendario"
            :key="dia.key"
            :class="['cal-day', {
              'out-month': !dia.doMes,
              'today': dia.isHoje,
              'selected': diaSelected === dia.dateStr,
              'has-events': eventosDodia(dia.dateStr).length > 0
            }]"
            @click="selecionarDia(dia.dateStr)"
          >
            <span class="day-num">{{ dia.dia }}</span>
            <div class="day-events">
              <div
                v-for="(ev, i) in eventosDodia(dia.dateStr).slice(0, 3)"
                :key="i"
                class="day-ev-chip"
                :style="{ background: ev.cor + '22', borderLeft: '2px solid ' + ev.cor }"
                :title="ev.titulo"
              >{{ ev.titulo }}</div>
              <div v-if="eventosDodia(dia.dateStr).length > 3" class="day-ev-more">
                +{{ eventosDodia(dia.dateStr).length - 3 }}
              </div>
            </div>
          </div>
        </div>

        <!-- Legenda -->
        <div class="cal-legenda">
          <span v-for="leg in legenda" :key="leg.tipo" class="leg-item">
            <span class="leg-dot" :style="{ background: leg.cor }"></span>
            {{ leg.label }}
          </span>
        </div>
      </div>

      <!-- ══ PAINEL LATERAL ══ -->
      <div class="ag-panel card-glass">
        <template v-if="diaSelected">
          <div class="panel-header">
            <span class="panel-date">{{ fmtDataExtenso(diaSelected) }}</span>
            <button class="btn-add-day" @click="abrirModal(diaSelected)" title="Novo evento neste dia">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>

          <div v-if="carregando" class="state-center"><span class="spin"></span></div>

          <div v-else-if="eventosDodia(diaSelected).length === 0" class="state-center muted">
            <span class="material-symbols-outlined" style="font-size:36px;opacity:.2">event_available</span>
            Sem eventos neste dia
          </div>

          <div v-else class="panel-events">
            <div v-for="ev in eventosDodia(diaSelected)" :key="ev.id" class="panel-ev"
              :style="{ borderLeft: '3px solid ' + ev.cor }">
              <div class="panel-ev-header">
                <span class="panel-ev-titulo">{{ ev.titulo }}</span>
                <span class="panel-ev-hora">{{ ev.hora || '' }}</span>
              </div>
              <div v-if="ev.venda_info" class="panel-ev-venda">
                <span class="material-symbols-outlined" style="font-size:13px">receipt</span>
                Venda #{{ ev.venda_info.numero }}
                <span v-if="ev.venda_info.cliente"> · {{ ev.venda_info.cliente }}</span>
                <button class="btn-ver-venda" @click.stop="abrirDetalheVenda(ev.venda_pk)" title="Ver detalhes da venda">
                  <span class="material-symbols-outlined" style="font-size:13px">open_in_new</span>
                </button>
              </div>
              <div v-if="ev.descricao" class="panel-ev-desc">{{ ev.descricao }}</div>
              <div class="panel-ev-tipo">
                <span class="tipo-chip" :style="{ background: ev.cor + '22', color: ev.cor }">
                  {{ labelTipo(ev.tipo) }}
                </span>
                <!-- Ações apenas para eventos manuais (não de locação) -->
                <div v-if="ev.source === 'agenda'" class="ev-actions">
                  <button class="btn-icon-sm" @click="abrirModal(diaSelected, ev)" title="Editar">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon-sm del" @click="confirmarExclusao(ev)" title="Excluir">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="state-center muted" style="padding: 60px 20px">
            <span class="material-symbols-outlined" style="font-size:48px;opacity:.2">touch_app</span>
            Clique em um dia para ver os eventos
          </div>
        </template>
      </div>
    </div>

    <!-- ══ MODAL EVENTO ══ -->
    <Teleport to="body">
      <div v-if="modalAberto" class="modal-overlay" @click.self="fecharModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3>{{ modalForm.pk ? 'Editar Evento' : 'Novo Evento' }}</h3>
            <button class="modal-close" @click="fecharModal">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="mf-row">
              <div class="mf-group mf-full">
                <label>Título <span class="obrig">*</span></label>
                <input type="text" v-model="modalForm.titulo" class="m-input" placeholder="Ex: Montagem balões festa Ana…" />
              </div>
            </div>
            <div class="mf-row">
              <div class="mf-group">
                <label>Tipo</label>
                <select v-model="modalForm.tipo" class="m-input">
                  <option v-for="t in tipos" :key="t.val" :value="t.val">{{ t.label }}</option>
                </select>
              </div>
              <div class="mf-group">
                <label>Data <span class="obrig">*</span></label>
                <input type="date" v-model="modalForm.data_evento" class="m-input" />
              </div>
              <div class="mf-group">
                <label>Horário</label>
                <input type="time" v-model="modalForm.hora_inicio" class="m-input" />
              </div>
            </div>

            <!-- Vincular à venda -->
            <div class="mf-group mf-full">
              <label>Vincular à venda <span class="opt">(opcional)</span></label>
              <div v-if="modalForm.venda_sel" class="venda-chip">
                <span class="material-symbols-outlined" style="font-size:15px;color:var(--accent)">receipt</span>
                <span>Venda #{{ modalForm.venda_sel.numero }}
                  <span v-if="modalForm.venda_sel.cliente"> · {{ modalForm.venda_sel.cliente }}</span>
                </span>
                <button class="chip-del" @click="modalForm.venda_sel = null; modalForm.venda_pk = null">×</button>
              </div>
              <div v-else class="venda-search-wrap">
                <span class="material-symbols-outlined s-ico">search</span>
                <input type="text" v-model="vendaBusca" class="m-input" placeholder="Buscar por nº ou cliente…"
                  @input="buscarVendas" autocomplete="off" />
              </div>
              <div v-if="vendaResultados.length" class="venda-drop">
                <button v-for="v in vendaResultados" :key="v.pk" class="venda-drop-item"
                  @mousedown.prevent="selecionarVenda(v)">
                  <span class="vd-num">#{{ v.numero }}</span>
                  <span class="vd-info">
                    {{ v.cliente || 'Sem cliente' }}
                    <span class="vd-tipo" v-if="v.tipo_venda === 'locacao'">· Locação</span>
                    <span class="vd-data">{{ fmtDataSimples(v.criado_em?.slice(0,10)) }}</span>
                  </span>
                </button>
              </div>
            </div>

            <div class="mf-group mf-full">
              <label>Descrição</label>
              <textarea v-model="modalForm.descricao" class="m-input m-textarea"
                rows="2" placeholder="Detalhes, observações…"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="fecharModal">Cancelar</button>
            <button class="btn-salvar" @click="salvarEvento"
              :disabled="salvando || !modalForm.titulo || !modalForm.data_evento">
              <span v-if="salvando" class="spin-sm"></span>
              <span class="material-symbols-outlined" v-else>save</span>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal detalhe da venda -->
    <Teleport to="body">
      <div v-if="vendaDetalhe" class="modal-overlay" @click.self="vendaDetalhe = null">
        <div class="modal-box modal-det">
          <div class="modal-header">
            <h3>
              <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">receipt_long</span>
              Venda #{{ vendaDetalhe.numero }}
            </h3>
            <button class="modal-close" @click="vendaDetalhe = null">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body" v-if="!carregandoDetalhe">
            <div class="det-meta">
              <div class="det-field">
                <span class="det-label">Cliente</span>
                <span class="det-val">{{ vendaDetalhe.cliente || '—' }}</span>
              </div>
              <div class="det-field">
                <span class="det-label">Data</span>
                <span class="det-val">{{ fmtDataSimples(vendaDetalhe.criado_em?.slice(0,10)) }}</span>
              </div>
              <div class="det-field">
                <span class="det-label">Tipo</span>
                <span class="det-val">{{ vendaDetalhe.tipo_venda === 'locacao' ? 'Locação' : 'Venda' }}</span>
              </div>
              <div class="det-field">
                <span class="det-label">Total</span>
                <span class="det-val bold">{{ fmtMoeda(vendaDetalhe.total) }}</span>
              </div>
            </div>

            <div class="det-itens-titulo">Itens da venda</div>
            <div v-if="!vendaDetalhe.itens_venda?.length" class="det-vazio">Nenhum item encontrado.</div>
            <table v-else class="det-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="ta-r">Qtd</th>
                  <th class="ta-r">Unit.</th>
                  <th class="ta-r">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in vendaDetalhe.itens_venda" :key="item.pk">
                  <td>{{ item.descricao }}</td>
                  <td class="ta-r">{{ item.qtd }}</td>
                  <td class="ta-r">{{ fmtMoeda(item.preco_unit) }}</td>
                  <td class="ta-r bold">{{ fmtMoeda(item.total_item) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="state-center"><span class="spin"></span></div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="vendaDetalhe = null">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal exclusão -->
    <Teleport to="body">
      <div v-if="excluindo" class="modal-overlay" @click.self="excluindo = null">
        <div class="modal-box modal-sm">
          <div class="modal-header"><h3>Excluir Evento</h3></div>
          <div class="modal-body">
            <p>Excluir "<strong>{{ excluindo.titulo }}</strong>"?</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="excluindo = null">Cancelar</button>
            <button class="btn-danger" @click="deletarEvento" :disabled="removendo">
              <span v-if="removendo" class="spin-sm"></span>
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="ag-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const sessaoStore = useSessaoStore();

// ── Estado ────────────────────────────────────────────────────
const hoje       = new Date();
const anoAtual   = ref(hoje.getFullYear());
const mesAtual   = ref(hoje.getMonth()); // 0-indexed
const diaSelected = ref(hoje.toISOString().slice(0, 10));
const carregando  = ref(false);
const eventos     = ref([]); // todos os eventos do mês visível

// Modal
const modalAberto = ref(false);
const salvando    = ref(false);
const modalForm   = ref({});
const vendaBusca  = ref('');
const vendaResultados = ref([]);

// Exclusão
const excluindo = ref(null);
const removendo = ref(false);

// Detalhe da venda
const vendaDetalhe      = ref(null);
const carregandoDetalhe = ref(false);

async function abrirDetalheVenda(venda_pk) {
  if (!venda_pk) return;
  vendaDetalhe.value      = { carregando: true };
  carregandoDetalhe.value = true;
  const { data, error } = await supabase
    .from('vendas')
    .select('pk, numero, cliente, total, tipo_venda, criado_em, itens_venda(pk, descricao, qtd, preco_unit, total_item)')
    .eq('pk', venda_pk)
    .single();
  carregandoDetalhe.value = false;
  if (error || !data) {
    showToast('Erro ao carregar detalhes da venda.', 'err');
    vendaDetalhe.value = null;
    return;
  }
  vendaDetalhe.value = data;
}

// Toast
const toastMsg  = ref('');
const toastTipo = ref('ok');
let toastTimer  = null;

// ── Constantes ────────────────────────────────────────────────
const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const tipos = [
  { val: 'manual',   label: 'Evento geral'      },
  { val: 'montagem', label: 'Montagem de balões' },
  { val: 'entrega',  label: 'Entrega'            },
  { val: 'outro',    label: 'Outro'              },
];

const COR_TIPOS = {
  manual:             '#60a5fa',
  montagem:           '#c084fc',
  entrega:            '#fb923c',
  outro:              '#94a3b8',
  locacao_retirada:   '#4ade80',
  locacao_devolucao:  '#f59e0b',
};

const legenda = [
  { tipo: 'locacao_retirada',  cor: COR_TIPOS.locacao_retirada,  label: 'Retirada locação'  },
  { tipo: 'locacao_devolucao', cor: COR_TIPOS.locacao_devolucao, label: 'Devolução locação' },
  { tipo: 'montagem',          cor: COR_TIPOS.montagem,          label: 'Montagem balões'   },
  { tipo: 'entrega',           cor: COR_TIPOS.entrega,           label: 'Entrega'           },
  { tipo: 'manual',            cor: COR_TIPOS.manual,            label: 'Evento geral'      },
];

// ── Computed calendário ────────────────────────────────────────
const mesLabel = computed(() => {
  return new Date(anoAtual.value, mesAtual.value, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
});

const diasCalendario = computed(() => {
  const primeiro = new Date(anoAtual.value, mesAtual.value, 1);
  const ultimo   = new Date(anoAtual.value, mesAtual.value + 1, 0);
  const dias = [];

  // Dias do mês anterior para completar a semana
  for (let i = 0; i < primeiro.getDay(); i++) {
    const d = new Date(primeiro);
    d.setDate(d.getDate() - (primeiro.getDay() - i));
    dias.push(mkDia(d, false));
  }
  // Dias do mês
  for (let d = 1; d <= ultimo.getDate(); d++) {
    dias.push(mkDia(new Date(anoAtual.value, mesAtual.value, d), true));
  }
  // Completar última semana
  const restante = 7 - (dias.length % 7);
  if (restante < 7) {
    for (let i = 1; i <= restante; i++) {
      const d = new Date(ultimo);
      d.setDate(d.getDate() + i);
      dias.push(mkDia(d, false));
    }
  }
  return dias;
});

function mkDia(date, doMes) {
  const ds = date.toISOString().slice(0, 10);
  const hj = hoje.toISOString().slice(0, 10);
  return { dia: date.getDate(), dateStr: ds, doMes, isHoje: ds === hj, key: ds + doMes };
}

// ── Eventos por dia ───────────────────────────────────────────
function eventosDodia(dateStr) {
  return eventos.value.filter(e => e.date === dateStr)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
}

// ── Carregamento ──────────────────────────────────────────────
watch([anoAtual, mesAtual], () => carregarEventos(), { immediate: false });

onMounted(() => carregarEventos());

async function carregarEventos() {
  carregando.value = true;
  try {
    const ini = `${anoAtual.value}-${String(mesAtual.value + 1).padStart(2, '0')}-01`;
    const fim = new Date(anoAtual.value, mesAtual.value + 1, 0).toISOString().slice(0, 10);

    const [resAgenda, resLocacoes] = await Promise.all([
      supabase
        .from('agenda')
        .select('*, vendas(pk, numero, cliente)')
        .eq('filial_pk', sessaoStore.filial?.pk)
        .gte('data_evento', ini)
        .lte('data_evento', fim)
        .order('hora_inicio', { nullsFirst: true }),

      supabase
        .from('vendas')
        .select('pk, numero, cliente, data_locacao, data_devolucao_prevista, status_locacao')
        .eq('filial_pk', sessaoStore.filial?.pk)
        .eq('tipo_venda', 'locacao')
        .or(`data_locacao.gte.${ini}T00:00:00,data_devolucao_prevista.gte.${ini}T00:00:00`)
        .lte('data_locacao', fim + 'T23:59:59'),
    ]);

    const evs = [];

    // Eventos da agenda
    for (const ev of resAgenda.data || []) {
      evs.push({
        id:         'ag-' + ev.pk,
        pk:         ev.pk,
        source:     'agenda',
        titulo:     ev.titulo,
        tipo:       ev.tipo || 'manual',
        date:       ev.data_evento || ev.data_inicio,
        hora:       ev.hora_inicio ? ev.hora_inicio.slice(0, 5) : null,
        descricao:  ev.descricao,
        cor:        ev.cor || COR_TIPOS[ev.tipo] || COR_TIPOS.manual,
        venda_pk:   ev.venda_pk,
        venda_info: ev.vendas || null,
      });
    }

    // Locações: retirada
    for (const loc of resLocacoes.data || []) {
      if (loc.data_locacao) {
        const d = loc.data_locacao.slice(0, 10);
        if (d >= ini && d <= fim) {
          evs.push({
            id:         'ret-' + loc.pk,
            source:     'locacao',
            titulo:     `Retirada #${loc.numero}${loc.cliente ? ' · ' + loc.cliente : ''}`,
            tipo:       'locacao_retirada',
            date:       d,
            hora:       loc.data_locacao.slice(11, 16) !== '00:00' ? loc.data_locacao.slice(11, 16) : null,
            descricao:  loc.status_locacao === 'devolvida' ? 'Já devolvida' : null,
            cor:        COR_TIPOS.locacao_retirada,
            venda_pk:   loc.pk,
            venda_info: { numero: loc.numero, cliente: loc.cliente },
          });
        }
      }
      if (loc.data_devolucao_prevista) {
        const d = loc.data_devolucao_prevista.slice(0, 10);
        if (d >= ini && d <= fim) {
          evs.push({
            id:         'dev-' + loc.pk,
            source:     'locacao',
            titulo:     `Devolução #${loc.numero}${loc.cliente ? ' · ' + loc.cliente : ''}`,
            tipo:       'locacao_devolucao',
            date:       d,
            hora:       null,
            descricao:  loc.status_locacao === 'devolvida' ? 'Devolvida' : 'Pendente',
            cor:        COR_TIPOS.locacao_devolucao,
            venda_pk:   loc.pk,
            venda_info: { numero: loc.numero, cliente: loc.cliente },
          });
        }
      }
    }

    eventos.value = evs;
  } catch (e) {
    showToast('Erro ao carregar agenda: ' + e.message, 'err');
  } finally {
    carregando.value = false;
  }
}

// ── Navegação ─────────────────────────────────────────────────
function mesAnterior() {
  if (mesAtual.value === 0) { mesAtual.value = 11; anoAtual.value--; }
  else mesAtual.value--;
}
function proximoMes() {
  if (mesAtual.value === 11) { mesAtual.value = 0; anoAtual.value++; }
  else mesAtual.value++;
}
function irHoje() {
  anoAtual.value  = hoje.getFullYear();
  mesAtual.value  = hoje.getMonth();
  diaSelected.value = hoje.toISOString().slice(0, 10);
}
function selecionarDia(dateStr) {
  diaSelected.value = dateStr;
}

// ── Modal ─────────────────────────────────────────────────────
function abrirModal(dateStr = null, ev = null) {
  vendaBusca.value    = '';
  vendaResultados.value = [];
  if (ev) {
    modalForm.value = {
      pk:           ev.pk,
      titulo:       ev.titulo,
      tipo:         ev.tipo,
      data_evento:  ev.date,
      hora_inicio:  ev.hora || '',
      descricao:    ev.descricao || '',
      venda_pk:     ev.venda_pk || null,
      venda_sel:    ev.venda_info || null,
    };
  } else {
    modalForm.value = {
      pk:           null,
      titulo:       '',
      tipo:         'manual',
      data_evento:  dateStr || diaSelected.value || hoje.toISOString().slice(0, 10),
      hora_inicio:  '',
      descricao:    '',
      venda_pk:     null,
      venda_sel:    null,
    };
  }
  modalAberto.value = true;
}

function fecharModal() {
  modalAberto.value   = false;
  vendaResultados.value = [];
}

async function salvarEvento() {
  const f = modalForm.value;
  if (!f.titulo || !f.data_evento) return;
  salvando.value = true;
  try {
    const payload = {
      filial_pk:   sessaoStore.filial?.pk,
      titulo:      f.titulo,
      tipo:        f.tipo || 'manual',
      data_evento: f.data_evento,
      data_inicio: f.data_evento,
      hora_inicio: f.hora_inicio || null,
      descricao:   f.descricao  || null,
      venda_pk:    f.venda_pk   || null,
      cor:         COR_TIPOS[f.tipo] || COR_TIPOS.manual,
    };
    let error;
    if (f.pk) {
      ({ error } = await supabase.from('agenda').update(payload).eq('pk', f.pk));
    } else {
      ({ error } = await supabase.from('agenda').insert(payload));
    }
    if (error) throw error;
    showToast(f.pk ? 'Evento atualizado!' : 'Evento criado!', 'ok');
    fecharModal();
    await carregarEventos();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    salvando.value = false;
  }
}

function confirmarExclusao(ev) { excluindo.value = ev; }

async function deletarEvento() {
  removendo.value = true;
  try {
    const { error } = await supabase.from('agenda').delete().eq('pk', excluindo.value.pk);
    if (error) throw error;
    showToast('Evento excluído.', 'ok');
    excluindo.value = null;
    await carregarEventos();
  } catch (e) {
    showToast('Erro: ' + e.message, 'err');
  } finally {
    removendo.value = false;
  }
}

// ── Busca de venda ────────────────────────────────────────────
let buscaTimer = null;
async function buscarVendas() {
  clearTimeout(buscaTimer);
  const q = vendaBusca.value.trim();
  if (q.length < 1) { vendaResultados.value = []; return; }
  buscaTimer = setTimeout(async () => {
    const numQ = parseInt(q);
    let query = supabase
      .from('vendas')
      .select('pk, numero, cliente, tipo_venda, criado_em')
      .eq('filial_pk', sessaoStore.filial?.pk)
      .order('numero', { ascending: false })
      .limit(8);
    if (!isNaN(numQ)) {
      query = query.eq('numero', numQ);
    } else {
      query = query.ilike('cliente', `%${q}%`);
    }
    const { data } = await query;
    vendaResultados.value = data || [];
  }, 300);
}

function selecionarVenda(v) {
  modalForm.value.venda_pk  = v.pk;
  modalForm.value.venda_sel = v;
  vendaBusca.value          = '';
  vendaResultados.value     = [];
}

// ── Helpers ───────────────────────────────────────────────────
function labelTipo(tipo) {
  const m = {
    manual: 'Evento geral', montagem: 'Montagem', entrega: 'Entrega',
    outro: 'Outro', locacao_retirada: 'Retirada', locacao_devolucao: 'Devolução',
  };
  return m[tipo] || tipo;
}

function fmtMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDataSimples(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDataExtenso(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());
}

function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3500);
}
</script>

<style scoped>
.ag-wrap { max-width: 1300px; margin: 0 auto; padding: 24px 16px 80px; display: flex; flex-direction: column; gap: 20px; }

.ag-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.ag-sub { color: var(--text2); font-size: 13px; margin: 0; }
.btn-novo { display: flex; align-items: center; gap: 6px; padding: 10px 20px; background: #6366f1; border: none; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s; }
.btn-novo:hover { background: #4f46e5; }

/* Layout */
.ag-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; }

/* Calendário */
.ag-calendar { padding: 20px; }

.cal-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.cal-nav-btn { background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text2); cursor: pointer; display: flex; padding: 4px; }
.cal-nav-btn:hover { color: var(--text); border-color: var(--accent); }
.cal-mes { flex: 1; text-align: center; font-size: 16px; font-weight: 700; color: var(--text); margin: 0; text-transform: capitalize; }
.cal-hoje-btn { padding: 5px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; }
.cal-hoje-btn:hover { color: var(--accent); border-color: var(--accent); }

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }

.cal-dow { text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); padding: 4px 0 8px; letter-spacing: .04em; }

.cal-day { min-height: 80px; padding: 6px 6px 4px; border-radius: 8px; cursor: pointer; transition: background .12s; display: flex; flex-direction: column; gap: 3px; }
.cal-day:hover { background: var(--bg3); }
.cal-day.out-month { opacity: .3; cursor: default; }
.cal-day.today .day-num { background: var(--accent); color: #fff; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.cal-day.selected { background: var(--bg3); outline: 1px solid var(--accent); }

.day-num { font-size: 13px; font-weight: 600; color: var(--text); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
.day-events { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.day-ev-chip { font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.day-ev-more { font-size: 10px; color: var(--text2); padding-left: 5px; }

/* Legenda */
.cal-legenda { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
.leg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text2); }
.leg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Painel lateral */
.ag-panel { padding: 0; overflow: hidden; position: sticky; top: 16px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; border-bottom: 1px solid var(--border); }
.panel-date { font-size: 13px; font-weight: 700; color: var(--text); text-transform: capitalize; }
.btn-add-day { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #6366f1; border: none; border-radius: 7px; color: #fff; cursor: pointer; transition: background .15s; }
.btn-add-day:hover { background: #4f46e5; }
.btn-add-day .material-symbols-outlined { font-size: 18px; }

.panel-events { display: flex; flex-direction: column; gap: 0; max-height: calc(100vh - 280px); overflow-y: auto; }
.panel-ev { padding: 12px 16px; border-bottom: 1px solid var(--border); border-left: 3px solid transparent; transition: background .12s; }
.panel-ev:last-child { border-bottom: none; }
.panel-ev:hover { background: var(--bg3); }
.panel-ev-header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.panel-ev-titulo { font-size: 13px; font-weight: 700; color: var(--text); }
.panel-ev-hora { font-size: 11px; color: var(--text2); flex-shrink: 0; }
.panel-ev-venda { font-size: 11px; color: var(--accent); display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
.panel-ev-desc { font-size: 12px; color: var(--text2); margin-bottom: 6px; }
.panel-ev-tipo { display: flex; align-items: center; justify-content: space-between; }
.tipo-chip { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.ev-actions { display: flex; gap: 4px; }
.btn-icon-sm { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: none; border: 1px solid var(--border); border-radius: 5px; color: var(--text2); cursor: pointer; }
.btn-icon-sm .material-symbols-outlined { font-size: 14px; }
.btn-icon-sm.del:hover { color: #f87171; border-color: #f87171; }
.btn-icon-sm:not(.del):hover { color: var(--accent); border-color: var(--accent); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 16px; }
.modal-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 520px; box-shadow: 0 20px 60px rgba(0,0,0,.4); display: flex; flex-direction: column; max-height: 90vh; overflow: hidden; }
.modal-sm { max-width: 380px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.modal-header h3 { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
.modal-close { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; }
.modal-close:hover { color: var(--text); }
.modal-body { padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.modal-body p { color: var(--text); font-size: 14px; margin: 0; line-height: 1.5; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px; border-top: 1px solid var(--border); flex-shrink: 0; }

.mf-row { display: flex; gap: 10px; flex-wrap: wrap; }
.mf-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 120px; position: relative; }
.mf-full { flex: none; width: 100%; }
.mf-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.obrig { color: var(--accent); }
.opt { color: var(--text2); font-weight: 400; }
.m-input { padding: 8px 11px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; width: 100%; }
.m-input:focus { outline: none; border-color: var(--accent); }
.m-textarea { resize: vertical; font-family: inherit; }

/* Venda search */
.venda-chip { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--text); }
.chip-del { background: none; border: none; color: var(--text2); cursor: pointer; font-size: 18px; line-height: 1; margin-left: auto; }
.venda-search-wrap { position: relative; }
.s-ico { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text2); font-size: 16px; pointer-events: none; }
.venda-search-wrap .m-input { padding-left: 32px; }
.venda-drop { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; z-index: 100; max-height: 200px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.venda-drop-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; background: none; border: none; color: var(--text); cursor: pointer; text-align: left; }
.venda-drop-item:hover { background: var(--bg3); }
.vd-num { font-size: 13px; font-weight: 700; color: var(--accent); flex-shrink: 0; }
.vd-info { font-size: 12px; color: var(--text2); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.vd-tipo { color: var(--accent); font-weight: 600; }
.vd-data { opacity: .6; }

.btn-ver-venda { background: none; border: none; color: var(--accent); cursor: pointer; display: inline-flex; align-items: center; padding: 0 2px; opacity: .8; }
.btn-ver-venda:hover { opacity: 1; }

/* Modal detalhe */
.modal-det { max-width: 580px; }
.det-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; padding: 10px 14px; background: var(--bg3); border-radius: 10px; margin-bottom: 14px; }
.det-field { display: flex; flex-direction: column; gap: 2px; }
.det-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.det-val { font-size: 13px; color: var(--text); font-weight: 600; }
.det-val.bold { font-weight: 800; color: var(--accent); }
.bold { font-weight: 700; }
.det-itens-titulo { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; margin-bottom: 8px; }
.det-vazio { font-size: 13px; color: var(--text2); padding: 12px; text-align: center; }
.det-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.det-table th { text-align: left; padding: 7px 10px; background: var(--bg3); color: var(--text2); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; border-bottom: 1px solid var(--border); }
.det-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--text); }
.det-table tr:last-child td { border-bottom: none; }
.ta-r { text-align: right; }

.btn-cancel { padding: 8px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-salvar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #6366f1; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s; }
.btn-salvar:hover:not(:disabled) { background: #4f46e5; }
.btn-salvar:disabled { opacity: .5; cursor: not-allowed; }
.btn-danger { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #991b1b; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-danger:disabled { opacity: .5; cursor: not-allowed; }

/* Toast */
.ag-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap; }
.ag-toast.ok  { background: #166534; color: #bbf7d0; }
.ag-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; color: var(--text2); font-size: 13px; }
.muted { opacity: .6; }
.spin { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .ag-layout { grid-template-columns: 1fr; }
  .ag-panel { position: static; }
  .cal-day { min-height: 60px; }
  .panel-events { max-height: 400px; }
}
</style>
