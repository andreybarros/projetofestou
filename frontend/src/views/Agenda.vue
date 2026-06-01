<template>
  <div class="ag-wrap">

    <!-- ══ HEADER ══ -->
    <div class="ag-header">
      <div class="ag-brand">
        <div class="ag-brand-icon">
          <span class="material-symbols-outlined">calendar_month</span>
        </div>
        <div>
          <h1 class="ag-title">Agenda</h1>
          <p class="ag-sub">Eventos, locações e montagens</p>
        </div>
      </div>

      <div class="ag-nav-center">
        <button class="ag-nav-btn" @click="mesAnterior">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <span class="ag-mes-label">{{ mesLabel }}</span>
        <button class="ag-nav-btn" @click="proximoMes">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
        <button class="ag-hoje-pill" @click="irHoje">Hoje</button>
        <div class="ag-view-toggle">
          <button :class="['ag-vt-btn', viewMode === 'month' ? 'active' : '']" @click="viewMode = 'month'">Mês</button>
          <button :class="['ag-vt-btn', viewMode === 'week'  ? 'active' : '']" @click="viewMode = 'week'">Semana</button>
        </div>
      </div>

      <div class="ag-actions">
        <div class="ag-search-wrap">
          <svg class="ag-search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <input v-model="agBusca" type="text" placeholder="Buscar evento..." class="ag-search-input" />
          <button v-if="agBusca" class="ag-search-clear" @click="agBusca = ''">×</button>
        </div>
        <button class="ag-btn-novo" @click="abrirModal()">
          <span class="material-symbols-outlined">add</span>
          Novo Evento
        </button>
      </div>
    </div>

    <!-- ══ LAYOUT ══ -->
    <div class="ag-layout">

      <!-- ── CALENDÁRIO ── -->
      <div class="ag-calendar-wrap">

        <!-- Mês -->
        <div v-if="viewMode === 'month'" class="ag-month">
          <div class="ag-dow-row">
            <div v-for="d in diasSemana" :key="d" class="ag-dow">{{ d }}</div>
          </div>
          <div class="ag-days-grid">
            <div
              v-for="dia in diasCalendario"
              :key="dia.key"
              :class="['ag-day', {
                'ag-day--out':      !dia.doMes,
                'ag-day--today':    dia.isHoje,
                'ag-day--selected': diaSelected === dia.dateStr,
              }]"
              @click="selecionarDia(dia.dateStr)"
            >
              <div class="ag-day-head">
                <span class="ag-day-num">{{ dia.dia }}</span>
              </div>
              <div class="ag-day-pills">
                <div
                  v-for="(ev, i) in eventosDodia(dia.dateStr).slice(0, 3)"
                  :key="i"
                  class="ag-pill"
                  :style="{ background: ev.cor }"
                  :title="ev.titulo"
                  @click.stop="selecionarDia(dia.dateStr); abrirDetalheEvento(ev)"
                >{{ ev.titulo }}</div>
                <div v-if="eventosDodia(dia.dateStr).length > 3" class="ag-pill-more">
                  +{{ eventosDodia(dia.dateStr).length - 3 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Semana -->
        <div v-else class="ag-week">
          <div class="ag-dow-row">
            <div v-for="d in diasSemana" :key="d" class="ag-dow">{{ d }}</div>
          </div>
          <div class="ag-week-cols">
            <div
              v-for="dia in diasSemana7"
              :key="dia.dateStr"
              :class="['ag-week-col', {
                'ag-day--today':    dia.isHoje,
                'ag-day--selected': diaSelected === dia.dateStr,
              }]"
              @click="selecionarDia(dia.dateStr)"
            >
              <div class="ag-week-head">
                <span class="ag-day-num">{{ dia.dia }}</span>
              </div>
              <div class="ag-week-events">
                <div
                  v-for="ev in eventosDodia(dia.dateStr)"
                  :key="ev.pk || ev.id"
                  class="ag-week-pill"
                  :style="{ background: ev.cor }"
                  @click.stop="abrirDetalheEvento(ev)"
                >
                  <span v-if="ev.hora" class="ag-week-hora">{{ ev.hora }}</span>
                  {{ ev.titulo }}
                </div>
                <div v-if="eventosDodia(dia.dateStr).length === 0" class="ag-week-empty"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Legenda -->
        <div class="ag-legenda">
          <div v-for="leg in legenda" :key="leg.tipo" class="ag-leg-item">
            <span class="ag-leg-dot" :style="{ background: leg.cor }"></span>
            <span>{{ leg.label }}</span>
          </div>
        </div>
      </div>

      <!-- ── PAINEL LATERAL ── -->
      <div class="ag-sidebar">

        <template v-if="diaSelected">
          <!-- Header do dia -->
          <div class="ag-sb-header">
            <div>
              <div class="ag-sb-label">Resumo do Dia</div>
              <div class="ag-sb-date">{{ fmtDataExtenso(diaSelected) }}</div>
            </div>
            <button class="ag-sb-add-btn" @click="abrirModal(diaSelected)" title="Novo evento neste dia">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>

          <!-- Métricas -->
          <div class="ag-metrics">
            <div class="ag-metric-card ag-metric--green">
              <span class="ag-metric-num">{{ metricasDia.retiradas }}</span>
              <span class="ag-metric-lbl">Retiradas</span>
            </div>
            <div class="ag-metric-card ag-metric--yellow">
              <span class="ag-metric-num">{{ metricasDia.devolucoes }}</span>
              <span class="ag-metric-lbl">Devoluções</span>
            </div>
            <div class="ag-metric-card ag-metric--purple">
              <span class="ag-metric-num">{{ metricasDia.montagens }}</span>
              <span class="ag-metric-lbl">Montagens</span>
            </div>
          </div>

          <!-- Próximos eventos -->
          <div class="ag-sb-section-title">
            <span class="material-symbols-outlined" style="font-size:15px">schedule</span>
            Eventos do dia
          </div>

          <div v-if="carregando" class="ag-sb-state">
            <span class="ag-spin"></span>
          </div>

          <div v-else-if="eventosDodiaSel.length === 0" class="ag-sb-state">
            <span class="material-symbols-outlined" style="font-size:36px;opacity:.2">event_available</span>
            <p>Sem eventos neste dia</p>
          </div>

          <div v-else class="ag-timeline">
            <div
              v-for="ev in eventosDodiaSel"
              :key="ev.pk || ev.id"
              class="ag-tl-item"
            >
              <div class="ag-tl-track">
                <div class="ag-tl-dot" :style="{ background: ev.cor }"></div>
                <div class="ag-tl-line"></div>
              </div>
              <div class="ag-tl-card" @click="abrirDetalheEvento(ev)">
                <div class="ag-tl-card-top">
                  <span class="ag-tl-hora">{{ ev.hora || 'Dia todo' }}</span>
                  <div class="ag-tl-btns" @click.stop>
                    <template v-if="ev.source === 'agenda'">
                      <button class="ag-tl-btn" @click="abrirModal(ev.date, ev)" title="Editar">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button class="ag-tl-btn ag-tl-btn--del" @click="confirmarExclusao(ev)" title="Excluir">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </template>
                  </div>
                </div>
                <div class="ag-tl-titulo">{{ ev.titulo }}</div>
                <div v-if="ev.venda_info?.cliente" class="ag-tl-cliente">
                  <span class="material-symbols-outlined" style="font-size:12px">person</span>
                  {{ ev.venda_info.cliente }}
                </div>
                <span class="ag-tl-tipo" :style="{ background: ev.cor + '20', color: ev.cor }">
                  {{ labelTipo(ev.tipo) }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="ag-sb-state ag-sb-state--big">
            <span class="material-symbols-outlined">touch_app</span>
            <p>Selecione um dia para ver o resumo</p>
          </div>
        </template>

        <!-- ── Botões de impressão ── -->
        <div class="ag-print-footer">
          <button class="ag-print-btn ag-print-btn--outline" :disabled="!diaSelected" @click="imprimirDia">
            <span class="material-symbols-outlined">print</span>
            Imprimir Agenda do Dia
          </button>
          <button class="ag-print-btn ag-print-btn--filled" @click="viewMode === 'month' ? imprimirMes() : imprimirSemana()">
            <span class="material-symbols-outlined">print</span>
            {{ viewMode === 'month' ? 'Imprimir Agenda do Mês' : 'Imprimir Agenda da Semana' }}
          </button>
        </div>

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
              <textarea v-model="modalForm.descricao" class="m-input m-textarea" rows="2" placeholder="Detalhes, observações…"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="fecharModal">Cancelar</button>
            <button class="btn-salvar" @click="salvarEvento" :disabled="salvando || !modalForm.titulo || !modalForm.data_evento">
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
              <div class="det-field"><span class="det-label">Cliente</span><span class="det-val">{{ vendaDetalhe.cliente || '—' }}</span></div>
              <div class="det-field"><span class="det-label">Data</span><span class="det-val">{{ fmtDataSimples(vendaDetalhe.criado_em?.slice(0,10)) }}</span></div>
              <div class="det-field"><span class="det-label">Tipo</span><span class="det-val">{{ vendaDetalhe.tipo_venda === 'locacao' ? 'Locação' : 'Venda' }}</span></div>
              <div class="det-field"><span class="det-label">Total</span><span class="det-val bold">{{ fmtMoeda(vendaDetalhe.total) }}</span></div>
            </div>
            <div class="det-itens-titulo">Itens da venda</div>
            <div v-if="!vendaDetalhe.itens_venda?.length" class="det-vazio">Nenhum item encontrado.</div>
            <table v-else class="det-table">
              <thead><tr><th>Produto</th><th class="ta-r">Qtd</th><th class="ta-r">Unit.</th><th class="ta-r">Total</th></tr></thead>
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
          <div v-else class="state-center"><span class="ag-spin"></span></div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="vendaDetalhe = null">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal detalhe do evento -->
    <Teleport to="body">
      <div v-if="eventoDetalhe" class="modal-overlay" @click.self="eventoDetalhe = null">
        <div class="modal-box modal-ev-det">
          <div class="modal-header" :style="{ borderBottom: '3px solid ' + eventoDetalhe.cor }">
            <div class="ev-det-header-info">
              <span class="tipo-chip" :style="{ background: eventoDetalhe.cor + '22', color: eventoDetalhe.cor }">{{ labelTipo(eventoDetalhe.tipo) }}</span>
              <h3 class="ev-det-titulo">{{ eventoDetalhe.titulo }}</h3>
            </div>
            <button class="modal-close" @click="eventoDetalhe = null">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="ev-det-meta">
              <div class="ev-det-meta-item">
                <span class="material-symbols-outlined ev-det-icon">calendar_today</span>
                <div><div class="ev-det-label">Data</div><div class="ev-det-val">{{ fmtDataExtenso(eventoDetalhe.date) }}</div></div>
              </div>
              <div v-if="eventoDetalhe.hora" class="ev-det-meta-item">
                <span class="material-symbols-outlined ev-det-icon">schedule</span>
                <div><div class="ev-det-label">Horário</div><div class="ev-det-val">{{ eventoDetalhe.hora }}</div></div>
              </div>
            </div>
            <div v-if="eventoDetalhe.descricao" class="ev-det-desc-box">
              <span class="material-symbols-outlined ev-det-icon" style="flex-shrink:0">notes</span>
              <p class="ev-det-desc-text">{{ eventoDetalhe.descricao }}</p>
            </div>
            <div v-if="eventoDetalhe.venda_info" class="ev-det-venda-box">
              <div class="ev-det-venda-header"><span class="material-symbols-outlined" style="font-size:16px">receipt_long</span> Venda vinculada</div>
              <div class="ev-det-venda-info">
                <span class="ev-det-venda-num">#{{ eventoDetalhe.venda_info.numero }}</span>
                <span v-if="eventoDetalhe.venda_info.cliente" class="ev-det-venda-cliente">{{ eventoDetalhe.venda_info.cliente }}</span>
                <button class="btn-ver-venda-det" @click="abrirDetalheVenda(eventoDetalhe.venda_pk); eventoDetalhe = null">
                  <span class="material-symbols-outlined" style="font-size:14px">open_in_new</span> Ver detalhes
                </button>
                <button class="btn-ver-venda-det btn-historico" @click="router.push('/historico-vendas?abrir=' + eventoDetalhe.venda_pk); eventoDetalhe = null">
                  <span class="material-symbols-outlined" style="font-size:14px">history</span> Abrir no Histórico
                </button>
              </div>
            </div>
            <div v-if="eventoDetalhe.projeto_pk" class="ev-det-venda-box" style="border-left: 3px solid #a855f7;">
              <div class="ev-det-venda-header"><span class="material-symbols-outlined" style="font-size:16px;color:#a855f7">design_services</span> Projeto de decoração</div>
              <div class="ev-det-venda-info">
                <button class="btn-ver-venda-det btn-historico" style="color:#a855f7;border-color:rgba(168,85,247,.3);" @click="router.push('/projetos/' + eventoDetalhe.projeto_pk + '/editar'); eventoDetalhe = null">
                  <span class="material-symbols-outlined" style="font-size:14px">open_in_new</span> Abrir Projeto
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="eventoDetalhe = null">Fechar</button>
            <template v-if="eventoDetalhe.source === 'agenda'">
              <button class="btn-icon-action del" @click="confirmarExclusao(eventoDetalhe); eventoDetalhe = null">
                <span class="material-symbols-outlined">delete</span> Excluir
              </button>
              <button class="btn-salvar" @click="abrirModal(eventoDetalhe.date, eventoDetalhe); eventoDetalhe = null">
                <span class="material-symbols-outlined">edit</span> Editar
              </button>
            </template>
            <template v-else-if="eventoDetalhe.source === 'locacao'">
              <button class="btn-salvar" @click="abrirModalObs(eventoDetalhe); eventoDetalhe = null">
                <span class="material-symbols-outlined">edit_note</span> Observação
              </button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal exclusão -->
    <Teleport to="body">
      <div v-if="excluindo" class="modal-overlay" @click.self="excluindo = null">
        <div class="modal-box modal-sm">
          <div class="modal-header"><h3>Excluir Evento</h3></div>
          <div class="modal-body"><p>Excluir "<strong>{{ excluindo.titulo }}</strong>"?</p></div>
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

    <!-- Modal observação de locação -->
    <Teleport to="body">
      <div v-if="modalObsLocacao" class="modal-overlay" @click.self="modalObsLocacao = null">
        <div class="modal-box modal-sm">
          <div class="modal-header">
            <h3><span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">edit_note</span> Observação</h3>
            <button class="modal-close" @click="modalObsLocacao = null"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="obs-ev-titulo">{{ modalObsLocacao.titulo }}</div>
            <div class="mf-group mf-full" style="margin-top:12px">
              <label>Observação</label>
              <textarea v-model="obsLocacaoTexto" class="m-input m-textarea" rows="4" placeholder="Ex: Cliente confirmou retirada às 14h…" autofocus></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="modalObsLocacao = null">Cancelar</button>
            <button class="btn-salvar" @click="salvarObsLocacao" :disabled="salvandoObs">
              <span v-if="salvandoObs" class="spin-sm"></span>
              <span v-else class="material-symbols-outlined">save</span>
              Salvar
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useSessaoStore } from '../stores/sessao';

const sessaoStore = useSessaoStore();
const router      = useRouter();

// ── Estado ────────────────────────────────────────────────────
const hoje       = new Date();
const anoAtual   = ref(hoje.getFullYear());
const mesAtual   = ref(hoje.getMonth());
const diaSelected = ref(hoje.toISOString().slice(0, 10));
const carregando  = ref(false);
const eventos     = ref([]);
const viewMode    = ref('month');
const agBusca     = ref('');

// Modal
const modalAberto     = ref(false);
const salvando        = ref(false);
const modalForm       = ref({});
const vendaBusca      = ref('');
const vendaResultados = ref([]);

// Exclusão
const excluindo = ref(null);
const removendo = ref(false);

// Detalhe do evento
const eventoDetalhe = ref(null);
function abrirDetalheEvento(ev) { eventoDetalhe.value = ev; }

// Observação de locação
const modalObsLocacao = ref(null);
const obsLocacaoTexto = ref('');
const salvandoObs     = ref(false);

function abrirModalObs(ev) {
  modalObsLocacao.value = ev;
  obsLocacaoTexto.value = ev.observacao || '';
}

async function salvarObsLocacao() {
  if (!modalObsLocacao.value?.venda_pk) return;
  salvandoObs.value = true;
  try {
    await api.patch(`/api/agenda/obs-locacao/${modalObsLocacao.value.venda_pk}`, { observacao: obsLocacaoTexto.value || null });
    showToast('Observação salva!', 'ok');
    modalObsLocacao.value = null;
    await carregarEventos();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    salvandoObs.value = false;
  }
}

// Detalhe da venda
const vendaDetalhe      = ref(null);
const carregandoDetalhe = ref(false);

async function abrirDetalheVenda(venda_pk) {
  if (!venda_pk) return;
  vendaDetalhe.value      = { carregando: true };
  carregandoDetalhe.value = true;
  try {
    const resp = await api.get(`/api/agenda/venda-detalhe/${venda_pk}`);
    vendaDetalhe.value = resp.data.data;
  } catch (e) {
    showToast('Erro ao carregar detalhes da venda.', 'err');
    vendaDetalhe.value = null;
  } finally {
    carregandoDetalhe.value = false;
  }
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
  montagem:           '#673ab7',
  entrega:            '#fb923c',
  outro:              '#94a3b8',
  locacao_retirada:   '#00c853',
  locacao_devolucao:  '#ffc107',
  projeto:            '#a855f7',
};

const legenda = [
  { tipo: 'locacao_retirada',  cor: COR_TIPOS.locacao_retirada,  label: 'Retirada'        },
  { tipo: 'locacao_devolucao', cor: COR_TIPOS.locacao_devolucao, label: 'Devolução'       },
  { tipo: 'montagem',          cor: COR_TIPOS.montagem,          label: 'Montagem'         },
  { tipo: 'entrega',           cor: COR_TIPOS.entrega,           label: 'Entrega'          },
  { tipo: 'projeto',           cor: COR_TIPOS.projeto,           label: 'Projeto'          },
  { tipo: 'manual',            cor: COR_TIPOS.manual,            label: 'Evento geral'     },
];

// ── Computed ──────────────────────────────────────────────────
const mesLabel = computed(() =>
  new Date(anoAtual.value, mesAtual.value, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
);

const diasCalendario = computed(() => {
  const primeiro = new Date(anoAtual.value, mesAtual.value, 1);
  const ultimo   = new Date(anoAtual.value, mesAtual.value + 1, 0);
  const dias = [];
  for (let i = 0; i < primeiro.getDay(); i++) {
    const d = new Date(primeiro);
    d.setDate(d.getDate() - (primeiro.getDay() - i));
    dias.push(mkDia(d, false));
  }
  for (let d = 1; d <= ultimo.getDate(); d++) {
    dias.push(mkDia(new Date(anoAtual.value, mesAtual.value, d), true));
  }
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

const diasSemana7 = computed(() => {
  const sel = diaSelected.value ? new Date(diaSelected.value + 'T12:00:00') : new Date();
  const dow = sel.getDay();
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sel);
    d.setDate(d.getDate() - dow + i);
    dias.push(mkDia(d, true));
  }
  return dias;
});

const eventosDodiaSel = computed(() => {
  if (!diaSelected.value) return [];
  const evs = eventosDodia(diaSelected.value);
  if (!agBusca.value.trim()) return evs;
  const q = agBusca.value.trim().toLowerCase();
  return evs.filter(e =>
    e.titulo?.toLowerCase().includes(q) ||
    e.venda_info?.cliente?.toLowerCase().includes(q)
  );
});

const metricasDia = computed(() => {
  const evs = eventosDodiaSel.value;
  return {
    retiradas:  evs.filter(e => e.tipo === 'locacao_retirada').length,
    devolucoes: evs.filter(e => e.tipo === 'locacao_devolucao').length,
    montagens:  evs.filter(e => e.tipo === 'montagem').length,
  };
});

function mkDia(date, doMes) {
  const ds = date.toISOString().slice(0, 10);
  const hj = hoje.toISOString().slice(0, 10);
  return { dia: date.getDate(), dateStr: ds, doMes, isHoje: ds === hj, key: ds + doMes };
}

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
    const resp = await api.get('/api/agenda/eventos', {
      params: { filial_pk: sessaoStore.filial?.pk, ano: anoAtual.value, mes: mesAtual.value + 1 },
    });
    eventos.value = resp.data.data || [];
  } catch (e) {
    showToast('Erro ao carregar agenda: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }
}

// ── Navegação ─────────────────────────────────────────────────
function mesAnterior() {
  if (mesAtual.value === 0) { mesAtual.value = 11; anoAtual.value--; } else mesAtual.value--;
}
function proximoMes() {
  if (mesAtual.value === 11) { mesAtual.value = 0; anoAtual.value++; } else mesAtual.value++;
}
function irHoje() {
  anoAtual.value   = hoje.getFullYear();
  mesAtual.value   = hoje.getMonth();
  diaSelected.value = hoje.toISOString().slice(0, 10);
}
function selecionarDia(dateStr) { diaSelected.value = dateStr; }

// ── Modal ─────────────────────────────────────────────────────
function abrirModal(dateStr = null, ev = null) {
  vendaBusca.value      = '';
  vendaResultados.value = [];
  if (ev) {
    modalForm.value = { pk: ev.pk, titulo: ev.titulo, tipo: ev.tipo, data_evento: ev.date, hora_inicio: ev.hora || '', descricao: ev.descricao || '', venda_pk: ev.venda_pk || null, venda_sel: ev.venda_info || null };
  } else {
    modalForm.value = { pk: null, titulo: '', tipo: 'manual', data_evento: dateStr || diaSelected.value || hoje.toISOString().slice(0, 10), hora_inicio: '', descricao: '', venda_pk: null, venda_sel: null };
  }
  modalAberto.value = true;
}

function fecharModal() { modalAberto.value = false; vendaResultados.value = []; }

async function salvarEvento() {
  const f = modalForm.value;
  if (!f.titulo || !f.data_evento) return;
  salvando.value = true;
  try {
    const payload = { filial_pk: sessaoStore.filial?.pk, titulo: f.titulo, tipo: f.tipo || 'manual', data_evento: f.data_evento, hora_inicio: f.hora_inicio || null, descricao: f.descricao || null, venda_pk: f.venda_pk || null };
    if (f.pk) await api.put(`/api/agenda/${f.pk}`, payload);
    else      await api.post('/api/agenda', payload);
    showToast(f.pk ? 'Evento atualizado!' : 'Evento criado!', 'ok');
    fecharModal();
    await carregarEventos();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    salvando.value = false;
  }
}

function confirmarExclusao(ev) { excluindo.value = ev; }

async function deletarEvento() {
  removendo.value = true;
  try {
    await api.delete(`/api/agenda/${excluindo.value.pk}`);
    showToast('Evento excluído.', 'ok');
    excluindo.value = null;
    await carregarEventos();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'err');
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
    try {
      const resp = await api.get('/api/agenda/buscar-vendas', { params: { filial_pk: sessaoStore.filial?.pk, q } });
      vendaResultados.value = resp.data.data || [];
    } catch { vendaResultados.value = []; }
  }, 300);
}

function selecionarVenda(v) {
  modalForm.value.venda_pk  = v.pk;
  modalForm.value.venda_sel = v;
  vendaBusca.value          = '';
  vendaResultados.value     = [];
}

// ── Impressão ─────────────────────────────────────────────────
function gerarHtmlImpressao(titulo, linhas) {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>${titulo}</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:14mm 12mm}
body{font-family:'Hanken Grotesk',Arial,sans-serif;font-size:11pt;color:#111;background:#fff}
h1{font-size:18pt;font-weight:800;color:#00c853;margin-bottom:4px}
.sub{font-size:9pt;color:#666;margin-bottom:14px;border-bottom:1.5px solid #e0e0e0;padding-bottom:10px}
.item{display:flex;gap:14px;padding:10px 0;border-bottom:1px solid #f0f0f0;align-items:flex-start}
.item:last-child{border-bottom:none}
.item-hora{font-size:9pt;font-weight:700;color:#666;width:50px;flex-shrink:0;margin-top:2px}
.item-body{flex:1}
.item-titulo{font-size:11pt;font-weight:700;color:#111}
.item-cliente{font-size:9.5pt;color:#555;margin-top:3px}
.item-tipo{display:inline-block;font-size:8pt;font-weight:700;padding:2px 8px;border-radius:20px;margin-top:4px}
.dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:5px}
.footer{margin-top:20px;font-size:8pt;color:#999;text-align:center;border-top:1px solid #e0e0e0;padding-top:8px}
</style></head><body>
<h1>${titulo}</h1>
<div class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
${linhas}
<div class="footer">BarroStock — Agenda de Eventos</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  iframe.contentWindow.addEventListener('afterprint', () => { if (iframe.parentNode) document.body.removeChild(iframe); });
  setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 20_000);
}

function evLinhas(evList) {
  if (!evList.length) return '<p style="color:#999;padding:12px 0">Nenhum evento</p>';
  return evList.map(ev => `
    <div class="item">
      <div class="dot" style="background:${ev.cor}"></div>
      <div class="item-hora">${ev.hora || '—'}</div>
      <div class="item-body">
        <div class="item-titulo">${ev.titulo}</div>
        ${ev.venda_info?.cliente ? `<div class="item-cliente">Cliente: ${ev.venda_info.cliente}</div>` : ''}
        <span class="item-tipo" style="background:${ev.cor}20;color:${ev.cor}">${labelTipo(ev.tipo)}</span>
      </div>
    </div>`).join('');
}

function imprimirDia() {
  if (!diaSelected.value) return;
  const evs = eventosDodia(diaSelected.value);
  gerarHtmlImpressao(`Agenda — ${fmtDataExtenso(diaSelected.value)}`, evLinhas(evs));
}

function imprimirMes() {
  const diasMes = diasCalendario.value.filter(d => d.doMes);
  const linhas = diasMes
    .filter(d => eventosDodia(d.dateStr).length > 0)
    .map(d => `<div style="margin-bottom:16px"><div style="font-size:11pt;font-weight:800;color:#333;margin-bottom:6px;border-left:3px solid #00c853;padding-left:8px">${fmtDataExtenso(d.dateStr)}</div>${evLinhas(eventosDodia(d.dateStr))}</div>`)
    .join('');
  gerarHtmlImpressao(`Agenda — ${mesLabel.value}`, linhas || '<p style="color:#999;padding:12px 0">Nenhum evento no mês</p>');
}

function imprimirSemana() {
  const linhas = diasSemana7.value
    .filter(d => eventosDodia(d.dateStr).length > 0)
    .map(d => `<div style="margin-bottom:16px"><div style="font-size:11pt;font-weight:800;color:#333;margin-bottom:6px;border-left:3px solid #00c853;padding-left:8px">${fmtDataExtenso(d.dateStr)}</div>${evLinhas(eventosDodia(d.dateStr))}</div>`)
    .join('');
  gerarHtmlImpressao('Agenda da Semana', linhas || '<p style="color:#999;padding:12px 0">Nenhum evento na semana</p>');
}

// ── Helpers ───────────────────────────────────────────────────
function labelTipo(tipo) {
  const m = { manual: 'Evento', montagem: 'Montagem', entrega: 'Entrega', outro: 'Outro', locacao_retirada: 'Retirada', locacao_devolucao: 'Devolução', projeto: 'Projeto' };
  return m[tipo] || tipo;
}
function fmtMoeda(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtDataSimples(s) { if (!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtDataExtenso(s) {
  if (!s) return '';
  const [y,m,d] = s.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
}
function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3500);
}
onUnmounted(() => { clearTimeout(toastTimer); });
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');

/* ── Root ── */
.ag-wrap {
  font-family: 'Hanken Grotesk', var(--sans, sans-serif);
  max-width: 1440px; margin: 0 auto;
  padding: 24px 20px 80px;
  display: flex; flex-direction: column; gap: 18px;
}

/* ── Header ── */
.ag-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.ag-brand { display: flex; align-items: center; gap: 12px; }
.ag-brand-icon {
  width: 42px; height: 42px; border-radius: 12px;
  background: rgba(0,200,83,.12); color: #00c853;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
}
.ag-title { font-size: 22px; font-weight: 800; color: var(--text); margin: 0 0 2px; letter-spacing: -.3px; }
.ag-sub   { font-size: 12px; color: var(--text2); margin: 0; }

/* Nav Center */
.ag-nav-center {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 14px; padding: 6px 10px;
}
.ag-nav-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: 8px;
  color: var(--text2); cursor: pointer; transition: all .15s;
}
.ag-nav-btn:hover { background: var(--bg3); color: var(--text); }
.ag-mes-label {
  font-size: 15px; font-weight: 700; color: var(--text);
  min-width: 175px; text-align: center; text-transform: capitalize;
}
.ag-hoje-pill {
  padding: 5px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: none; color: var(--text2); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.ag-hoje-pill:hover { color: #00c853; border-color: #00c853; }
.ag-view-toggle { display: flex; background: var(--bg3); border-radius: 8px; padding: 2px; }
.ag-vt-btn {
  padding: 5px 14px; border: none; border-radius: 6px;
  background: none; color: var(--text2); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.ag-vt-btn.active { background: var(--bg2); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,.1); }

/* Actions */
.ag-actions { display: flex; align-items: center; gap: 10px; }
.ag-search-wrap {
  position: relative; display: flex; align-items: center;
}
.ag-search-ico {
  position: absolute; left: 11px;
  color: var(--text2); pointer-events: none;
}
.ag-search-input {
  width: 210px; padding: 9px 32px 9px 36px;
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 10px; color: var(--text); font-size: 13px;
  font-family: inherit; outline: none; transition: border-color .15s;
}
.ag-search-input::placeholder { color: var(--text2); }
.ag-search-input:focus { border-color: #00c853; }
.ag-search-clear {
  position: absolute; right: 10px;
  background: none; border: none; cursor: pointer;
  color: var(--text2); font-size: 16px; line-height: 1; padding: 2px;
}
.ag-btn-novo {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 18px; border: none; border-radius: 10px;
  background: #00c853; color: #fff;
  font-family: inherit; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all .15s;
  box-shadow: 0 4px 12px rgba(0,200,83,.3);
}
.ag-btn-novo:hover { background: #00a846; box-shadow: 0 6px 18px rgba(0,200,83,.4); }

/* ── Layout ── */
.ag-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 18px; align-items: start;
}

/* ── Calendário ── */
.ag-calendar-wrap {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden;
}

.ag-dow-row {
  display: grid; grid-template-columns: repeat(7, 1fr);
  background: var(--bg3); border-bottom: 1px solid var(--border);
}
.ag-dow {
  text-align: center; padding: 10px 0;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; color: var(--text2);
  letter-spacing: .05em;
}

/* Month grid */
.ag-days-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
}
.ag-day {
  min-height: 90px; padding: 8px 7px 6px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  cursor: pointer; transition: background .12s;
  display: flex; flex-direction: column; gap: 4px; overflow: hidden;
}
.ag-day:hover { background: var(--bg3); }
.ag-day:nth-child(7n) { border-right: none; }
.ag-days-grid .ag-day:nth-last-child(-n+7) { border-bottom: none; }
.ag-day--out { opacity: .28; pointer-events: none; }
.ag-day--today .ag-day-num {
  width: 26px; height: 26px;
  background: #00c853; color: #fff;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 13px;
}
.ag-day--selected { background: rgba(0,200,83,.06); outline: 2px solid #00c853; outline-offset: -2px; }
.ag-day-head { display: flex; align-items: center; justify-content: space-between; }
.ag-day-num  { font-size: 13px; font-weight: 600; color: var(--text); }
.ag-day-pills { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.ag-pill {
  font-size: 10px; font-weight: 600; color: #fff;
  padding: 2px 6px; border-radius: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer; transition: opacity .12s;
}
.ag-pill:hover { opacity: .85; }
.ag-pill-more { font-size: 10px; color: var(--text2); padding-left: 4px; font-weight: 600; }

/* Week grid */
.ag-week-cols {
  display: grid; grid-template-columns: repeat(7, 1fr);
  min-height: 320px;
}
.ag-week-col {
  padding: 10px 7px; border-right: 1px solid var(--border);
  cursor: pointer; transition: background .12s; min-height: 240px;
  display: flex; flex-direction: column; gap: 6px;
}
.ag-week-col:last-child { border-right: none; }
.ag-week-col:hover { background: var(--bg3); }
.ag-week-head { display: flex; justify-content: center; margin-bottom: 4px; }
.ag-week-events { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.ag-week-pill {
  font-size: 10px; font-weight: 600; color: #fff;
  padding: 3px 6px; border-radius: 5px;
  cursor: pointer; transition: opacity .12s; line-height: 1.3;
}
.ag-week-pill:hover { opacity: .85; }
.ag-week-hora { display: block; font-size: 9px; opacity: .85; margin-bottom: 1px; }

/* Legenda */
.ag-legenda {
  display: flex; gap: 12px; flex-wrap: wrap;
  padding: 12px 16px; border-top: 1px solid var(--border);
  background: var(--bg3);
}
.ag-leg-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text2); }
.ag-leg-dot  { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

/* ── Sidebar ── */
.ag-sidebar {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden; position: sticky; top: 16px;
  display: flex; flex-direction: column;
}

.ag-sb-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 16px 18px 14px; border-bottom: 1px solid var(--border);
  gap: 8px;
}
.ag-sb-label {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .08em; color: #00c853; margin-bottom: 3px;
}
.ag-sb-date {
  font-size: 13px; font-weight: 700; color: var(--text);
  text-transform: capitalize; line-height: 1.3;
}
.ag-sb-add-btn {
  width: 30px; height: 30px; border-radius: 8px;
  background: #00c853; border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .15s; flex-shrink: 0;
}
.ag-sb-add-btn:hover { background: #00a846; }

/* Metrics */
.ag-metrics {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 0; border-bottom: 1px solid var(--border);
}
.ag-metric-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 12px 8px; border-right: 1px solid var(--border);
  text-align: center;
}
.ag-metric-card:last-child { border-right: none; }
.ag-metric-num { font-size: 22px; font-weight: 900; line-height: 1; margin-bottom: 3px; }
.ag-metric-lbl { font-size: 10px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .04em; }
.ag-metric--green .ag-metric-num { color: #00c853; }
.ag-metric--yellow .ag-metric-num { color: #f59e0b; }
.ag-metric--purple .ag-metric-num { color: #673ab7; }

.ag-sb-section-title {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 18px 8px;
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .07em; color: var(--text2);
  border-bottom: 1px solid var(--border);
}

/* Timeline */
.ag-timeline { flex: 1; overflow-y: auto; padding: 8px 0; }
.ag-tl-item  { display: flex; gap: 0; padding: 0 14px 0 16px; }
.ag-tl-track {
  display: flex; flex-direction: column; align-items: center;
  width: 20px; flex-shrink: 0; padding-top: 14px;
}
.ag-tl-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.ag-tl-line { flex: 1; width: 2px; background: var(--border); margin-top: 4px; min-height: 16px; }
.ag-tl-item:last-child .ag-tl-line { display: none; }

.ag-tl-card {
  flex: 1; padding: 10px 0 12px 12px; cursor: pointer;
  transition: none;
}
.ag-tl-card-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 3px;
}
.ag-tl-hora   { font-size: 11px; font-weight: 700; color: var(--text2); }
.ag-tl-titulo { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.3; margin-bottom: 4px; }
.ag-tl-cliente {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--text2); margin-bottom: 5px;
}
.ag-tl-tipo {
  display: inline-block; font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 20px;
}
.ag-tl-btns { display: flex; gap: 3px; }
.ag-tl-btn {
  width: 24px; height: 24px; border-radius: 6px;
  border: 1px solid var(--border); background: none;
  color: var(--text2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .12s;
}
.ag-tl-btn .material-symbols-outlined { font-size: 14px; }
.ag-tl-btn:hover { color: var(--text); background: var(--bg3); }
.ag-tl-btn--del:hover { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,.08); }

/* Print footer */
.ag-print-footer {
  display: flex; flex-direction: column; gap: 8px;
  padding: 14px 16px; border-top: 1px solid var(--border);
  background: var(--bg3);
}
.ag-print-btn {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  width: 100%; padding: 10px 14px; border-radius: 10px;
  font-family: inherit; font-size: 12.5px; font-weight: 700;
  cursor: pointer; transition: all .15s;
}
.ag-print-btn .material-symbols-outlined { font-size: 17px; }
.ag-print-btn--outline {
  background: transparent; border: 1.5px solid var(--border); color: var(--text2);
}
.ag-print-btn--outline:hover:not(:disabled) { border-color: #00c853; color: #00c853; }
.ag-print-btn--filled {
  background: #00c853; border: none; color: #fff;
  box-shadow: 0 3px 10px rgba(0,200,83,.25);
}
.ag-print-btn--filled:hover { background: #00a846; }
.ag-print-btn:disabled { opacity: .4; cursor: not-allowed; }

/* Sidebar states */
.ag-sb-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 36px 20px; color: var(--text2);
  font-size: 13px; text-align: center;
}
.ag-sb-state p { margin: 0; }
.ag-sb-state--big .material-symbols-outlined { font-size: 48px; opacity: .15; }
.ag-spin {
  display: inline-block; width: 22px; height: 22px;
  border: 2.5px solid var(--border); border-top-color: #00c853;
  border-radius: 50%; animation: ag-spin .7s linear infinite;
}
@keyframes ag-spin { to { transform: rotate(360deg); } }

/* ══ LIGHT MODE — eliminação total de cinza ══
   Superfícies: #fff (cards) · #f4fbf6 (fundos sutis)
   Acentos: #00c853 (verde) · #f59e0b (âmbar) · #673ab7 (roxo)
   Texto: #0f172a (primário) · #374151 (secundário)
   Bordas: rgba(0,200,83,.18) onde possível, rgba(0,0,0,.08) onde neutro
   ══════════════════════════════════════════════════════════════ */

/* Estrutura principal */
[data-theme="light"] .ag-wrap { background: #f4fbf6; }
[data-theme="light"] .ag-calendar-wrap {
  background: #fff;
  border-color: rgba(0,200,83,.2);
  box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 0 0 1px rgba(0,200,83,.08);
}
[data-theme="light"] .ag-sidebar {
  background: #fff;
  border-color: rgba(0,200,83,.2);
  box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 0 0 1px rgba(0,200,83,.08);
}

/* Header */
[data-theme="light"] .ag-title { color: #0f172a; }
[data-theme="light"] .ag-sub   { color: #4b5563; }
[data-theme="light"] .ag-nav-center {
  background: #fff;
  border-color: rgba(0,200,83,.25);
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
}
[data-theme="light"] .ag-nav-btn { color: #374151; }
[data-theme="light"] .ag-nav-btn:hover { background: #f0faf4; color: #00a846; }
[data-theme="light"] .ag-mes-label { color: #0f172a; }
[data-theme="light"] .ag-hoje-pill {
  background: #fff; border-color: rgba(0,200,83,.35); color: #00a846;
}
[data-theme="light"] .ag-hoje-pill:hover { background: #f0faf4; }
[data-theme="light"] .ag-view-toggle { background: #f0faf4; }
[data-theme="light"] .ag-vt-btn { color: #4b5563; }
[data-theme="light"] .ag-vt-btn.active {
  background: #00c853; color: #fff;
  box-shadow: 0 2px 8px rgba(0,200,83,.35);
}
[data-theme="light"] .ag-search-ico { color: #9ca3af; }
[data-theme="light"] .ag-search-input {
  background: #fff; border-color: rgba(0,0,0,.16);
  color: #0f172a;
}
[data-theme="light"] .ag-search-input::placeholder { color: #9ca3af; }
[data-theme="light"] .ag-search-input:focus { border-color: #00c853; box-shadow: 0 0 0 3px rgba(0,200,83,.12); }
[data-theme="light"] .ag-search-clear { color: #9ca3af; }

/* Calendário — header dos dias */
[data-theme="light"] .ag-dow-row { background: #f0faf4; border-color: rgba(0,200,83,.15); }
[data-theme="light"] .ag-dow { color: #00a846; }

/* Células dos dias */
[data-theme="light"] .ag-day {
  background: #fff;
  border-color: rgba(0,0,0,.07);
}
[data-theme="light"] .ag-day:hover { background: #f0faf4; }
[data-theme="light"] .ag-day--out { opacity: .22; }
[data-theme="light"] .ag-day--today .ag-day-num {
  background: #00c853; color: #fff;
  box-shadow: 0 3px 10px rgba(0,200,83,.45);
}
[data-theme="light"] .ag-day--selected {
  background: rgba(0,200,83,.07);
  outline-color: #00c853;
}
[data-theme="light"] .ag-day-num { color: #0f172a; }
[data-theme="light"] .ag-pill-more { color: #00a846; font-weight: 700; }

/* Week */
[data-theme="light"] .ag-week-col { border-color: rgba(0,0,0,.07); background: #fff; }
[data-theme="light"] .ag-week-col:hover { background: #f0faf4; }
[data-theme="light"] .ag-week-head .ag-day-num { color: #0f172a; }
[data-theme="light"] .ag-day--today.ag-week-col .ag-day-num {
  background: #00c853; color: #fff; border-radius: 50%;
  width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 10px rgba(0,200,83,.45);
}

/* Legenda */
[data-theme="light"] .ag-legenda {
  background: #f0faf4;
  border-color: rgba(0,200,83,.15);
}
[data-theme="light"] .ag-leg-item { color: #374151; }

/* Sidebar header */
[data-theme="light"] .ag-sb-header { border-color: rgba(0,200,83,.15); background: #fff; }
[data-theme="light"] .ag-sb-date   { color: #0f172a; }

/* Metric cards — tints coloridos, sem cinza */
[data-theme="light"] .ag-metrics { border-color: rgba(0,200,83,.15); }
[data-theme="light"] .ag-metric-card { border-color: rgba(0,0,0,.07); background: #fff; }
[data-theme="light"] .ag-metric--green { background: rgba(0,200,83,.07); }
[data-theme="light"] .ag-metric--yellow { background: rgba(245,158,11,.07); }
[data-theme="light"] .ag-metric--purple { background: rgba(103,58,183,.07); }
[data-theme="light"] .ag-metric-lbl { color: #4b5563; }

/* Section title */
[data-theme="light"] .ag-sb-section-title {
  background: #f4fbf6;
  border-color: rgba(0,200,83,.12);
  color: #00a846;
}

/* Timeline */
[data-theme="light"] .ag-tl-line { background: rgba(0,200,83,.2); }
[data-theme="light"] .ag-tl-hora { color: #00a846; font-weight: 700; }
[data-theme="light"] .ag-tl-titulo { color: #0f172a; }
[data-theme="light"] .ag-tl-cliente { color: #4b5563; }
[data-theme="light"] .ag-tl-btn {
  border-color: rgba(0,0,0,.12); color: #6b7280; background: #fff;
}
[data-theme="light"] .ag-tl-btn:hover { background: #f0faf4; color: #00a846; border-color: #00c853; }
[data-theme="light"] .ag-tl-btn--del:hover { background: #fef2f2; color: #ef4444; border-color: #ef4444; }

/* Print footer */
[data-theme="light"] .ag-print-footer { background: #f4fbf6; border-color: rgba(0,200,83,.15); }
[data-theme="light"] .ag-print-btn--outline {
  border-color: #00c853; color: #00a846; background: #fff;
}
[data-theme="light"] .ag-print-btn--outline:hover:not(:disabled) {
  background: #f0faf4;
}

/* Sidebar empty state */
[data-theme="light"] .ag-sb-state { color: #6b7280; }
[data-theme="light"] .ag-spin { border-color: rgba(0,200,83,.2); border-top-color: #00c853; }

/* Modais */
[data-theme="light"] .modal-box {
  background: #fff;
  border-color: rgba(0,0,0,.1);
  box-shadow: 0 20px 60px rgba(0,0,0,.15);
}
[data-theme="light"] .modal-header { border-color: rgba(0,0,0,.08); }
[data-theme="light"] .modal-header h3 { color: #0f172a; }
[data-theme="light"] .modal-close { color: #6b7280; }
[data-theme="light"] .modal-close:hover { color: #0f172a; }
[data-theme="light"] .modal-footer { border-color: rgba(0,0,0,.08); }
[data-theme="light"] .modal-body { background: #fff; }
[data-theme="light"] .mf-group label { color: #374151; }
[data-theme="light"] .m-input {
  background: #f7faf8; border-color: rgba(0,0,0,.15); color: #0f172a;
}
[data-theme="light"] .m-input:focus { border-color: #00c853; box-shadow: 0 0 0 3px rgba(0,200,83,.1); }
[data-theme="light"] .venda-chip {
  background: #f0faf4; border-color: rgba(0,200,83,.25); color: #0f172a;
}
[data-theme="light"] .chip-del { color: #6b7280; }
[data-theme="light"] .venda-drop {
  background: #fff; border-color: rgba(0,0,0,.12);
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
}
[data-theme="light"] .venda-drop-item { color: #0f172a; }
[data-theme="light"] .venda-drop-item:hover { background: #f0faf4; }
[data-theme="light"] .vd-info { color: #4b5563; }
[data-theme="light"] .btn-cancel {
  background: #f7faf8; border-color: rgba(0,0,0,.15); color: #374151;
}
[data-theme="light"] .btn-cancel:hover { background: #f0faf4; border-color: rgba(0,200,83,.3); color: #00a846; }

/* Detalhe de evento */
[data-theme="light"] .ev-det-titulo { color: #0f172a; }
[data-theme="light"] .ev-det-icon   { color: #4b5563; }
[data-theme="light"] .ev-det-label  { color: #6b7280; }
[data-theme="light"] .ev-det-val    { color: #0f172a; }
[data-theme="light"] .ev-det-desc-box {
  background: #f4fbf6; border: 1px solid rgba(0,200,83,.15);
}
[data-theme="light"] .ev-det-desc-text { color: #374151; }
[data-theme="light"] .ev-det-venda-box {
  background: #f4fbf6; border: 1px solid rgba(0,200,83,.15);
}
[data-theme="light"] .ev-det-venda-header { color: #374151; }
[data-theme="light"] .ev-det-venda-cliente { color: #0f172a; }
[data-theme="light"] .btn-ver-venda-det {
  background: #fff; border-color: rgba(0,200,83,.3); color: #00a846;
}
[data-theme="light"] .btn-ver-venda-det:hover { background: #f0faf4; }
[data-theme="light"] .btn-historico { color: #7c3aed; border-color: rgba(124,58,237,.25); }
[data-theme="light"] .obs-ev-titulo { background: #f4fbf6; color: #374151; border-left-color: #00c853; }

/* Detalhe de venda */
[data-theme="light"] .det-meta { background: #f4fbf6; border: 1px solid rgba(0,200,83,.15); border-radius: 10px; }
[data-theme="light"] .det-label { color: #6b7280; }
[data-theme="light"] .det-val   { color: #0f172a; }
[data-theme="light"] .det-itens-titulo { color: #374151; }
[data-theme="light"] .det-vazio { color: #6b7280; }
[data-theme="light"] .det-table th {
  background: #f4fbf6; color: #374151; border-color: rgba(0,200,83,.15);
}
[data-theme="light"] .det-table td { border-color: rgba(0,0,0,.07); color: #0f172a; }
[data-theme="light"] .btn-icon-action.del { background: #fef2f2; color: #dc2626; }
[data-theme="light"] .btn-icon-action.del:hover { background: #fee2e2; }

/* Toast light */
[data-theme="light"] .ag-toast.ok  { background: #dcfce7; color: #166534; box-shadow: 0 4px 18px rgba(0,200,83,.2); }
[data-theme="light"] .ag-toast.err { background: #fee2e2; color: #991b1b; box-shadow: 0 4px 18px rgba(239,68,68,.2); }

/* ── Modais (preservados) ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 16px; }
.modal-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 520px; box-shadow: 0 20px 60px rgba(0,0,0,.4); display: flex; flex-direction: column; max-height: 90vh; overflow: hidden; }
.modal-sm  { max-width: 380px; }
.modal-det { max-width: 580px; }
.modal-ev-det { max-width: 480px; }
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
.obrig { color: #00c853; }
.opt   { color: var(--text2); font-weight: 400; }
.m-input { padding: 8px 11px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; width: 100%; font-family: inherit; }
.m-input:focus { outline: none; border-color: #00c853; }
.m-textarea { resize: vertical; }
.venda-chip { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--text); }
.chip-del { background: none; border: none; color: var(--text2); cursor: pointer; font-size: 18px; line-height: 1; margin-left: auto; }
.venda-search-wrap { position: relative; }
.s-ico { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text2); font-size: 16px; pointer-events: none; }
.venda-search-wrap .m-input { padding-left: 32px; }
.venda-drop { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; z-index: 100; max-height: 200px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.venda-drop-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; background: none; border: none; color: var(--text); cursor: pointer; text-align: left; }
.venda-drop-item:hover { background: var(--bg3); }
.vd-num  { font-size: 13px; font-weight: 700; color: #00c853; flex-shrink: 0; }
.vd-info { font-size: 12px; color: var(--text2); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.vd-tipo { color: #00c853; font-weight: 600; }
.vd-data { opacity: .6; }
.btn-cancel { padding: 8px 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-salvar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #00c853; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s; font-family: inherit; }
.btn-salvar:hover:not(:disabled) { background: #00a846; }
.btn-salvar:disabled { opacity: .5; cursor: not-allowed; }
.btn-danger { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #991b1b; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-danger:disabled { opacity: .5; cursor: not-allowed; }
.btn-icon-action { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s; font-family: inherit; }
.btn-icon-action.del { background: rgba(239,68,68,.12); color: #f87171; }
.btn-icon-action.del:hover { background: rgba(239,68,68,.22); }
.btn-icon-action .material-symbols-outlined { font-size: 16px; }
.ev-det-header-info { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; padding-right: 12px; }
.ev-det-titulo { font-size: 17px; font-weight: 800; color: var(--text); margin: 0; line-height: 1.3; }
.ev-det-meta { display: flex; flex-direction: column; gap: 12px; }
.ev-det-meta-item { display: flex; align-items: flex-start; gap: 10px; }
.ev-det-icon { font-size: 20px; color: var(--text2); flex-shrink: 0; margin-top: 1px; }
.ev-det-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; margin-bottom: 2px; }
.ev-det-val { font-size: 14px; font-weight: 600; color: var(--text); text-transform: capitalize; }
.ev-det-desc-box { display: flex; align-items: flex-start; gap: 10px; background: var(--bg3); border-radius: 10px; padding: 12px 14px; }
.ev-det-desc-text { font-size: 13px; color: var(--text2); margin: 0; line-height: 1.6; white-space: pre-wrap; }
.ev-det-venda-box { background: var(--bg3); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.ev-det-venda-header { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.ev-det-venda-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ev-det-venda-num { font-size: 15px; font-weight: 800; color: #00c853; }
.ev-det-venda-cliente { font-size: 13px; color: var(--text); font-weight: 600; }
.btn-ver-venda-det { display: flex; align-items: center; gap: 4px; padding: 5px 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 7px; color: #00c853; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s; }
.btn-ver-venda-det:hover { background: var(--bg2); }
.btn-historico { color: #a78bfa; border-color: rgba(167,139,250,.3); }
.obs-ev-titulo { font-size: 13px; font-weight: 600; color: var(--text2); padding: 8px 12px; background: var(--bg3); border-radius: 8px; border-left: 3px solid #00c853; }
.det-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; padding: 10px 14px; background: var(--bg3); border-radius: 10px; margin-bottom: 14px; }
.det-field { display: flex; flex-direction: column; gap: 2px; }
.det-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; }
.det-val { font-size: 13px; color: var(--text); font-weight: 600; }
.det-val.bold { font-weight: 800; color: #00c853; }
.bold { font-weight: 700; }
.det-itens-titulo { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text2); letter-spacing: .04em; margin-bottom: 8px; }
.det-vazio { font-size: 13px; color: var(--text2); padding: 12px; text-align: center; }
.det-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.det-table th { text-align: left; padding: 7px 10px; background: var(--bg3); color: var(--text2); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; border-bottom: 1px solid var(--border); }
.det-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--text); }
.det-table tr:last-child td { border-bottom: none; }
.ta-r { text-align: right; }
.tipo-chip { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; color: var(--text2); font-size: 13px; }
.spin-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: ag-spin .7s linear infinite; }

/* Toast */
.ag-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 4px 18px rgba(0,0,0,.3); white-space: nowrap; }
.ag-toast.ok  { background: #166534; color: #bbf7d0; }
.ag-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* Responsive */
@media (max-width: 1024px) {
  .ag-layout { grid-template-columns: 1fr; }
  .ag-sidebar { position: static; }
  .ag-day { min-height: 70px; }
}
@media (max-width: 700px) {
  .ag-header { flex-direction: column; align-items: stretch; }
  .ag-nav-center { justify-content: center; }
  .ag-actions { justify-content: space-between; }
  .ag-search-input { width: 140px; }
  .ag-day { min-height: 56px; }
  .ag-pill { display: none; }
  .ag-day-num { font-size: 12px; }
}
</style>
