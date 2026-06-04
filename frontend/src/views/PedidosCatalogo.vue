<template>
  <div class="pc-wrap">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="pc-header">
      <button class="pc-back" @click="$router.push('/catalogos')">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="pc-header-info">
        <div class="pc-breadcrumb">
          <span @click="$router.push('/catalogos')" class="pc-bread-link">Catálogos</span>
          <span class="material-symbols-outlined pc-bread-sep">chevron_right</span>
          <span class="pc-bread-cur">{{ catalogo?.nome || '…' }}</span>
        </div>
        <h2 class="pc-title">Pedidos do Catálogo</h2>
      </div>
      <div class="pc-header-actions">
        <div class="pc-status-pill" :class="catalogo?.ativo ? 'pill--on' : 'pill--off'">
          <span class="pill-dot"></span>
          {{ catalogo?.ativo ? 'Ativo' : 'Inativo' }}
        </div>
        <button class="btn-sec" @click="$router.push(`/catalogos/${pk}/editar`)">
          <span class="material-symbols-outlined">settings</span>
          Gerenciar Catálogo
        </button>
      </div>
    </div>

    <!-- ── Métricas ──────────────────────────────────────────── -->
    <div class="pc-metricas">
      <div class="pm-card">
        <div class="pm-num">{{ pedidos.length }}</div>
        <div class="pm-label">Total de Pedidos</div>
      </div>
      <div class="pm-card">
        <div class="pm-num pm-num--amber">{{ pedidos.filter(p => p.status === 'aguardando').length }}</div>
        <div class="pm-label">Aguardando</div>
      </div>
      <div class="pm-card">
        <div class="pm-num pm-num--blue">{{ pedidos.filter(p => p.status === 'orcamento_enviado').length }}</div>
        <div class="pm-label">Orç. Enviado</div>
      </div>
      <div class="pm-card">
        <div class="pm-num pm-num--green">{{ pedidos.filter(p => p.status === 'aprovado').length }}</div>
        <div class="pm-label">Aprovados</div>
      </div>
    </div>

    <!-- ── Abas + busca ──────────────────────────────────────── -->
    <div class="pc-controls">
      <div class="pc-tabs">
        <button
          v-for="tab in abas"
          :key="tab.key"
          :class="['pc-tab', abaAtiva === tab.key && 'pc-tab--active']"
          @click="abaAtiva = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count" class="pc-tab-count">{{ tab.count }}</span>
        </button>
      </div>
      <div class="pc-busca-wrap">
        <span class="material-symbols-outlined pc-busca-ico">search</span>
        <input v-model="busca" type="text" class="pc-busca" placeholder="Buscar por cliente…" />
      </div>
    </div>

    <!-- ── Conteúdo ───────────────────────────────────────────── -->
    <div v-if="carregando" class="state-center"><span class="spin"></span></div>

    <div v-else-if="!pedidosFiltrados.length" class="state-center muted">
      <span class="material-symbols-outlined" style="font-size:44px;opacity:.2">inbox</span>
      Nenhum pedido encontrado.
    </div>

    <div v-else class="pc-table-wrap">
      <table class="pc-table">
        <thead>
          <tr>
            <th>Nº Pedido</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Evento</th>
            <th>Entrega</th>
            <th>Itens</th>
            <th>Valor</th>
            <th>Status</th>
            <th style="width:80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in pedidosFiltrados"
            :key="p.pk"
            class="pc-row"
            @click="abrirPedido(p)"
          >
            <td><span class="td-num">#{{ String(p.pk).padStart(4,'0') }}</span></td>
            <td class="td-data">{{ fmtData(p.criado_em) }}</td>
            <td>
              <div class="td-cliente">
                <div class="td-avatar">{{ p.nome_cliente?.charAt(0)?.toUpperCase() }}</div>
                <div>
                  <div class="td-nome">{{ p.nome_cliente }}</div>
                  <div v-if="p.telefone" class="td-sub">{{ p.telefone }}</div>
                </div>
              </div>
            </td>
            <td>
              <div v-if="p.data_evento" class="td-nome">{{ fmtDataLocal(p.data_evento) }}</div>
              <div v-if="p.hora_evento" class="td-sub">{{ p.hora_evento }}</div>
              <div v-else class="td-sub">—</div>
            </td>
            <td>
              <div class="td-entrega">
                <span class="material-symbols-outlined">{{ p.tipo_entrega === 'entrega' ? 'local_shipping' : 'store' }}</span>
                {{ p.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada' }}
              </div>
            </td>
            <td>
              <div class="td-chips">
                <span v-for="it in p.itens.slice(0,2)" :key="it.nome" class="item-chip">
                  {{ it.quantidade }}× {{ it.nome }}
                </span>
                <span v-if="p.itens.length > 2" class="item-chip item-chip--more">+{{ p.itens.length - 2 }}</span>
              </div>
            </td>
            <td>
              <strong v-if="p.valor_orcamento" class="td-valor">{{ fmtMoeda(p.valor_orcamento) }}</strong>
              <span v-else class="td-sub">—</span>
            </td>
            <td><span :class="['ps-badge', `ps-${p.status}`]">{{ labelStatus(p.status) }}</span></td>
            <td>
              <div class="td-acoes">
                <span class="td-arrow material-symbols-outlined">chevron_right</span>
                <button class="td-del-btn" @click.stop="pedirExclusao(p)" title="Excluir pedido">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pc-table-footer">
        Mostrando {{ pedidosFiltrados.length }} de {{ pedidos.length }} pedido(s)
      </div>
    </div>

    <!-- ── Modal do pedido ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="pedidoSelecionado" class="modal-overlay" @click.self="fecharPedido">
          <div class="modal-box">

            <!-- Cabeçalho com faixa verde -->
            <div class="modal-hero">
              <div class="modal-hero-left">
                <div class="modal-order-num">
                  <span class="material-symbols-outlined">receipt_long</span>
                  Pedido #{{ String(pedidoSelecionado.pk).padStart(4,'0') }}
                </div>
                <div class="modal-hero-avatar">{{ pedidoSelecionado.nome_cliente?.charAt(0)?.toUpperCase() }}</div>
                <div>
                  <div class="modal-hero-name">{{ pedidoSelecionado.nome_cliente }}</div>
                  <div v-if="pedidoSelecionado.email" class="modal-hero-sub">{{ pedidoSelecionado.email }}</div>
                  <div v-if="pedidoSelecionado.telefone" class="modal-hero-sub">{{ pedidoSelecionado.telefone }}</div>
                </div>
              </div>
              <div class="modal-hero-right">
                <Transition name="del-conf">
                  <div v-if="confirmandoExclusao" class="mh-del-confirm">
                    <span class="mh-del-confirm-txt">Excluir pedido de <strong>{{ pedidoSelecionado.nome_cliente }}</strong>?</span>
                    <button class="mh-del-cancel" @click="confirmandoExclusao = false">Cancelar</button>
                    <button class="mh-del-ok" :disabled="excluindo" @click="confirmarExclusao">
                      <span v-if="excluindo" class="spin-sm"></span>
                      <span v-else class="material-symbols-outlined">delete</span>
                      {{ excluindo ? 'Excluindo…' : 'Excluir' }}
                    </button>
                  </div>
                  <div v-else class="mh-del-actions">
                    <span :class="['mh-badge', `mh-${pedidoSelecionado.status}`]">{{ labelStatus(pedidoSelecionado.status) }}</span>
                    <button class="mh-del-btn" @click="pedirExclusao(pedidoSelecionado)" title="Excluir pedido">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                    <button class="modal-close" @click="fecharPedido">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Corpo em duas colunas -->
            <div class="modal-cols">

              <!-- Coluna esquerda: info do pedido -->
              <div class="modal-col modal-col--info">

                <!-- Evento -->
                <div class="mc-block">
                  <div class="mc-block-title">
                    <span class="material-symbols-outlined">event</span>
                    Dados do Evento
                  </div>
                  <div class="mc-fields">
                    <div v-if="pedidoSelecionado.data_evento" class="mc-field">
                      <div class="mc-label">Data</div>
                      <div class="mc-val">{{ fmtDataLocal(pedidoSelecionado.data_evento) }}</div>
                    </div>
                    <div v-if="pedidoSelecionado.hora_evento" class="mc-field">
                      <div class="mc-label">Horário</div>
                      <div class="mc-val">{{ pedidoSelecionado.hora_evento }}</div>
                    </div>
                    <div class="mc-field">
                      <div class="mc-label">Entrega</div>
                      <div class="mc-val mc-entrega">
                        <span class="material-symbols-outlined">{{ pedidoSelecionado.tipo_entrega === 'entrega' ? 'local_shipping' : 'store' }}</span>
                        {{ pedidoSelecionado.tipo_entrega === 'entrega' ? 'Entrega no endereço' : 'Retirada na loja' }}
                      </div>
                    </div>
                    <div v-if="pedidoSelecionado.endereco_evento" class="mc-field mc-field--full">
                      <div class="mc-label">Endereço</div>
                      <div class="mc-val">{{ pedidoSelecionado.endereco_evento }}</div>
                    </div>
                    <div class="mc-field">
                      <div class="mc-label">Pedido em</div>
                      <div class="mc-val">{{ fmtData(pedidoSelecionado.criado_em) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Aviso de orçamento recusado -->
                <div v-if="pedidoSelecionado.recusado_em" class="mc-recusa-strip">
                  <span class="material-symbols-outlined">thumb_down</span>
                  <div>
                    <div class="mc-recusa-titulo">Orçamento recusado pelo cliente</div>
                    <div class="mc-recusa-sub">
                      Em {{ fmtData(pedidoSelecionado.recusado_em) }}
                      <span v-if="pedidoSelecionado.valor_orcamento_recusado">
                        — valor recusado: <strong>{{ fmtMoeda(pedidoSelecionado.valor_orcamento_recusado) }}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Itens -->
                <div class="mc-block">
                  <div class="mc-block-title">
                    <span class="material-symbols-outlined">inventory_2</span>
                    Itens Solicitados
                    <span class="mc-count">{{ pedidoSelecionado.itens.length }}</span>
                  </div>
                  <div class="mc-itens">
                    <div v-for="(it, i) in pedidoSelecionado.itens" :key="it.pk || i" class="mc-item">
                      <!-- Foto -->
                      <img v-if="it.foto_url" :src="it.foto_url" class="mc-item-foto" />
                      <div v-else class="mc-item-foto mc-item-foto--vazio">
                        <span class="material-symbols-outlined">image_not_supported</span>
                      </div>
                      <div class="mc-item-body">
                        <div class="mc-item-row">
                          <!-- Controle de quantidade inline -->
                          <div class="mc-item-qty-ctrl">
                            <button class="mc-qty-mini" @click.stop="alterarQtdItem(it, i, -1)" :disabled="it.quantidade <= 1">−</button>
                            <span class="mc-item-qty">{{ it.quantidade }}</span>
                            <button class="mc-qty-mini" @click.stop="alterarQtdItem(it, i, 1)">+</button>
                          </div>
                          <div class="mc-item-nome">{{ it.nome }}</div>
                          <span :class="['mc-saldo', saldoCls(it.saldo)]" :title="`Saldo: ${it.saldo ?? 'N/D'}`">
                            {{ it.saldo === null ? '—' : it.saldo <= 0 ? 'Sem estoque' : `${it.saldo} disp.` }}
                          </span>
                          <button class="mc-item-del" @click.stop="removerItemPedido(it, i)" title="Remover item">
                            <span class="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <!-- Substituto atual -->
                        <div v-if="it.nome_produto_substituto" class="mc-subst-atual">
                          <span class="material-symbols-outlined">swap_horiz</span>
                          <img v-if="it.foto_url_substituto" :src="it.foto_url_substituto" class="mc-subst-thumb" />
                          <span class="mc-subst-nome-txt">{{ it.nome_produto_substituto }}</span>
                          <button class="mc-subst-rm" @click.stop="removerSubstituto(it)" title="Remover substituição">
                            <span class="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <!-- Botão substituir -->
                        <button class="mc-subst-btn" @click.stop="abrirPicker(it, i)">
                          <span class="material-symbols-outlined">swap_horiz</span>
                          {{ it.nome_produto_substituto ? 'Alterar substituto' : 'Substituir produto' }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button class="mc-add-item-btn" @click="abrirPickerAdicionar">
                    <span class="material-symbols-outlined">add_circle</span>
                    Adicionar produto ao pedido
                  </button>
                </div>

                <!-- Observações -->
                <div v-if="pedidoSelecionado.observacao" class="mc-block">
                  <div class="mc-block-title">
                    <span class="material-symbols-outlined">notes</span>
                    Observações
                  </div>
                  <div class="mc-obs">{{ pedidoSelecionado.observacao }}</div>
                </div>

              </div>

              <!-- Coluna direita: orçamento -->
              <div class="modal-col modal-col--orc">

                <!-- Aviso de conflito de disponibilidade -->
                <div v-if="carregandoConflitos" class="mc-conflito-load">
                  <span class="spin-sm" style="border-top-color:#f59e0b"></span>
                  Verificando disponibilidade…
                </div>
                <div v-else-if="conflitos.length" class="mc-conflito-card">
                  <div class="mc-conflito-titulo">
                    <span class="material-symbols-outlined">warning</span>
                    Produto(s) indisponível(is) nesta data
                  </div>
                  <div class="mc-conflito-lista">
                    <div v-for="c in conflitos" :key="c.produto_pk" class="mc-conflito-item">
                      <div class="mc-conflito-prod">
                        <span class="material-symbols-outlined">inventory_2</span>
                        {{ c.nome_produto }}
                      </div>
                      <div v-for="p in c.pedidos" :key="p.pk" class="mc-conflito-ref">
                        <span class="material-symbols-outlined">person</span>
                        {{ p.nome_cliente }} — Pedido #{{ String(p.pk).padStart(4,'0') }}
                        <span :class="['ps-badge', `ps-${p.status}`]" style="font-size:9px;padding:2px 7px">{{ labelStatus(p.status) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="mc-conflito-hint">
                    Considere substituir os produtos conflitantes antes de enviar o orçamento.
                  </div>
                </div>

                <!-- Orçamento -->
                <div class="mc-orc-card">
                  <div class="mc-orc-header">
                    <div class="mc-orc-title">
                      <span class="material-symbols-outlined">request_quote</span>
                      Orçamento
                    </div>
                    <button
                      v-if="pedidoSelecionado.valor_orcamento && !editandoOrc"
                      class="mc-orc-edit"
                      @click="editandoOrc = true"
                    >
                      <span class="material-symbols-outlined">edit</span>
                      Editar
                    </button>
                  </div>

                  <!-- Valor exibido -->
                  <div v-if="pedidoSelecionado.valor_orcamento && !editandoOrc" class="mc-orc-valor-display">
                    <div class="mc-orc-num">{{ fmtMoeda(pedidoSelecionado.valor_orcamento) }}</div>
                    <div v-if="pedidoSelecionado.obs_orcamento" class="mc-orc-desc">{{ pedidoSelecionado.obs_orcamento }}</div>
                  </div>

                  <!-- Bloqueio por conflito -->
                  <div v-if="conflitos.length && (!pedidoSelecionado.valor_orcamento || editandoOrc)" class="mc-orc-bloqueado">
                    <span class="material-symbols-outlined">block</span>
                    Resolva os conflitos de disponibilidade acima antes de enviar o orçamento.
                  </div>

                  <!-- Formulário -->
                  <div v-if="(!pedidoSelecionado.valor_orcamento || editandoOrc) && !conflitos.length" class="mc-orc-form">
                    <div v-if="!pedidoSelecionado.valor_orcamento" class="mc-orc-empty">
                      <span class="material-symbols-outlined" style="font-size:28px;opacity:.3">request_quote</span>
                      <span>Nenhum orçamento enviado ainda</span>
                    </div>
                    <div class="mc-field-group">
                      <label>Valor total (R$) *</label>
                      <input
                        :value="orcForm.valorDisplay"
                        @input="mascaraMoeda"
                        inputmode="numeric"
                        class="m-input"
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div class="mc-field-group">
                      <label>Observações</label>
                      <textarea v-model="orcForm.obs" class="m-input m-textarea" rows="3" placeholder="Condições, prazo, instruções…"></textarea>
                    </div>
                    <div class="mc-orc-btns">
                      <button v-if="editandoOrc" class="btn-cancel" @click="editandoOrc = false">Cancelar</button>
                      <button class="btn-orc-send" :disabled="orcSalvando || conflitos.length > 0" @click="enviarOrcamento">
                        <span v-if="orcSalvando" class="spin-sm"></span>
                        <span v-else class="material-symbols-outlined">send</span>
                        {{ pedidoSelecionado.valor_orcamento ? 'Salvar' : 'Enviar Orçamento' }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Ação: marcar retirado -->
                <div v-if="pedidoSelecionado.status === 'aprovado'" class="mc-status-acao">
                  <div class="mc-status-acao-title">
                    <span class="material-symbols-outlined">local_shipping</span>
                    Entrega / Retirada
                  </div>
                  <Transition name="acao-conf">
                    <div v-if="confirmandoStatus === 'retirado'" class="mc-status-confirm">
                      <p class="mc-status-confirm-msg">Confirmar que o material foi retirado pelo cliente?</p>
                      <div class="mc-status-confirm-btns">
                        <button class="btn-conf-cancel" @click="confirmandoStatus = null">Cancelar</button>
                        <button class="btn-retirado" :disabled="marcandoStatus" @click="marcarStatus('retirado')">
                          <span v-if="marcandoStatus" class="spin-sm"></span>
                          <span v-else class="material-symbols-outlined">check_circle</span>
                          {{ marcandoStatus ? 'Salvando…' : 'Confirmar Retirada' }}
                        </button>
                      </div>
                    </div>
                    <button v-else class="btn-retirado" @click="confirmandoStatus = 'retirado'">
                      <span class="material-symbols-outlined">check_circle</span>
                      Marcar como Retirado
                    </button>
                  </Transition>
                </div>

                <!-- Ação: marcar devolvido -->
                <div v-if="pedidoSelecionado.status === 'retirado'" class="mc-status-acao mc-status-acao--dev">
                  <div class="mc-status-acao-title">
                    <span class="material-symbols-outlined">assignment_return</span>
                    Devolução
                  </div>
                  <Transition name="acao-conf">
                    <div v-if="confirmandoStatus === 'devolvido'" class="mc-status-confirm mc-status-confirm--dev">
                      <p class="mc-status-confirm-msg">O material voltou? O estoque dos produtos será restaurado automaticamente.</p>
                      <div class="mc-status-confirm-btns">
                        <button class="btn-conf-cancel" @click="confirmandoStatus = null">Cancelar</button>
                        <button class="btn-devolvido" :disabled="marcandoStatus" @click="marcarStatus('devolvido')">
                          <span v-if="marcandoStatus" class="spin-sm"></span>
                          <span v-else class="material-symbols-outlined">undo</span>
                          {{ marcandoStatus ? 'Salvando…' : 'Confirmar Devolução' }}
                        </button>
                      </div>
                    </div>
                    <button v-else class="btn-devolvido" @click="confirmandoStatus = 'devolvido'">
                      <span class="material-symbols-outlined">undo</span>
                      Confirmar Devolução
                    </button>
                  </Transition>
                </div>

              </div>
            </div>

            <!-- ── Picker de substituição ─────────────────────── -->
            <Transition name="picker">
              <div v-if="pickerAberto" class="subst-picker">
                <div class="subst-picker-hd">
                  <div class="subst-picker-hd-left">
                    <div class="subst-picker-titulo">{{ pickerModo === 'adicionar' ? 'Adicionar produto' : 'Substituir produto' }}</div>
                    <div class="subst-picker-sub">
                      <template v-if="pickerModo === 'adicionar'">Selecione o produto a adicionar ao pedido</template>
                      <template v-else>Substituindo: <strong>{{ itemParaSubstituir?.nome }}</strong></template>
                    </div>
                    <div class="subst-picker-qty-row">
                      <span class="subst-picker-qty-label">Quantidade:</span>
                      <div class="subst-picker-qty-ctrl">
                        <button class="subst-qty-btn" @click="pickerQtd > 1 && pickerQtd--">−</button>
                        <span class="subst-qty-val">{{ pickerQtd }}</span>
                        <button class="subst-qty-btn" @click="pickerQtd++">+</button>
                      </div>
                    </div>
                  </div>
                  <button class="subst-picker-close" @click="fecharPicker">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div class="subst-picker-busca-wrap">
                  <span class="material-symbols-outlined subst-picker-busca-ico">search</span>
                  <input v-model="pickerBusca" type="text" placeholder="Buscar produto…" class="subst-picker-busca" autofocus />
                </div>
                <div v-if="pickerCarregando" class="subst-picker-load">
                  <span class="spin"></span>
                </div>
                <div v-else class="subst-picker-lista">
                  <div
                    v-for="p in produtosFiltradosPicker"
                    :key="p.pk"
                    class="subst-picker-item"
                    :class="{ 'subst-picker-item--sel': itemParaSubstituir?.produto_substituto_pk === p.pk }"
                    @click="selecionarSubstituto(p)"
                  >
                    <img v-if="p.foto_url" :src="p.foto_url" class="subst-picker-foto" />
                    <div v-else class="subst-picker-foto subst-picker-foto--vazio">
                      <span class="material-symbols-outlined">image_not_supported</span>
                    </div>
                    <div class="subst-picker-info">
                      <div class="subst-picker-nome">{{ p.descricao }}</div>
                      <div v-if="p.codigo" class="subst-picker-cod">{{ p.codigo }}</div>
                    </div>
                    <span :class="['subst-saldo', saldoCls(p.saldo)]">
                      {{ p.saldo === null ? '—' : p.saldo <= 0 ? 'Indisponível' : `${p.saldo} disp.` }}
                    </span>
                  </div>
                  <div v-if="!produtosFiltradosPicker.length" class="subst-picker-vazio">
                    Nenhum produto encontrado.
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="pc-toast" :class="toastTipo">
        <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import { supabase } from '../composables/useSupabase';

const route  = useRoute();
const router = useRouter();
const pk     = route.params.pk;

const catalogo        = ref(null);
const pedidos         = ref([]);
const carregando      = ref(true);
const abaAtiva        = ref('todos');
const busca           = ref('');
const pedidoSelecionado  = ref(null);
const editandoOrc        = ref(false);
const orcForm            = ref({ valor: '', obs: '' });
const orcSalvando        = ref(false);
const marcandoStatus      = ref(false);
const confirmandoStatus   = ref(null);
const conflitos           = ref([]);
const carregandoConflitos = ref(false);
const confirmandoExclusao = ref(false);
const excluindo           = ref(false);
const produtosCatalogo   = ref([]);
const pickerAberto       = ref(false);
const pickerCarregando   = ref(false);
const pickerBusca        = ref('');
const pickerQtd          = ref(1);
const pickerModo         = ref('substituir'); // 'substituir' | 'adicionar'
const itemParaSubstituir = ref(null);  // { pk, nome, idxLocal, produto_substituto_pk }
const toastMsg        = ref('');
const toastTipo       = ref('ok');
let   toastTimer      = null;

const abas = computed(() => [
  { key: 'todos',             label: 'Todos',             count: pedidos.value.length },
  { key: 'aguardando',        label: 'Aguardando',        count: pedidos.value.filter(p => p.status === 'aguardando').length },
  { key: 'orcamento_enviado', label: 'Orç. enviado',      count: pedidos.value.filter(p => p.status === 'orcamento_enviado').length },
  { key: 'aprovado',          label: 'Aprovados',         count: pedidos.value.filter(p => p.status === 'aprovado').length },
  { key: 'retirado',          label: 'Retirados',         count: pedidos.value.filter(p => p.status === 'retirado').length },
  { key: 'devolvido',         label: 'Devolvidos',        count: pedidos.value.filter(p => p.status === 'devolvido').length },
  { key: 'cancelado',         label: 'Cancelados',        count: pedidos.value.filter(p => p.status === 'cancelado').length },
]);

const pedidosFiltrados = computed(() => {
  let lista = abaAtiva.value === 'todos'
    ? pedidos.value
    : pedidos.value.filter(p => p.status === abaAtiva.value);
  if (busca.value.trim()) {
    const q = busca.value.toLowerCase();
    lista = lista.filter(p => p.nome_cliente?.toLowerCase().includes(q) || p.telefone?.includes(q));
  }
  return lista;
});

onMounted(async () => {
  carregando.value = true;
  try {
    const [resCat, resPed] = await Promise.all([
      api.get(`/api/catalogos/${pk}`),
      api.get(`/api/catalogos/${pk}/pedidos`),
    ]);
    catalogo.value = resCat.data.data;
    pedidos.value  = resPed.data.data || [];
  } catch (e) {
    showToast('Erro ao carregar: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    carregando.value = false;
  }

  // Fallback de foco
  document.addEventListener('visibilitychange', onFoco);

  // Realtime: atualiza pedidos em tempo real (novos e atualizados)
  realtimeChannel = supabase
    .channel(`pedidos-catalogo-${pk}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pedidos_catalogo', filter: `catalogo_pk=eq.${pk}` },
      ({ new: novo }) => {
        const idx = pedidos.value.findIndex(p => p.pk === novo.pk);
        if (idx !== -1) {
          pedidos.value[idx] = { ...pedidos.value[idx], ...novo };
          if (pedidoSelecionado.value?.pk === novo.pk)
            pedidoSelecionado.value = { ...pedidoSelecionado.value, ...novo };
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pedidos_catalogo', filter: `catalogo_pk=eq.${pk}` },
      async ({ new: novo }) => {
        // Evita duplicata (pode já ter sido carregado antes)
        if (pedidos.value.some(p => p.pk === novo.pk)) return;
        // Busca os itens do novo pedido
        try {
          const { data: res } = await api.get(`/api/catalogos/${pk}/pedidos`);
          const novoPedido = (res.data || []).find(p => p.pk === novo.pk);
          if (novoPedido) pedidos.value.unshift(novoPedido);
        } catch { /* silencioso */ }
      }
    )
    .subscribe();
});

let realtimeChannel = null;

// Fallback: recarrega pedidos quando a aba volta ao foco
function onFoco() {
  if (document.visibilityState === 'visible') recarregarStatus();
}
async function recarregarStatus() {
  try {
    const { data } = await api.get(`/api/catalogos/${pk}/pedidos`);
    const novos = data.data || [];
    // Atualiza somente status e valor dos pedidos já carregados
    novos.forEach(n => {
      const idx = pedidos.value.findIndex(p => p.pk === n.pk);
      if (idx !== -1) {
        pedidos.value[idx] = { ...pedidos.value[idx], status: n.status, valor_orcamento: n.valor_orcamento };
        if (pedidoSelecionado.value?.pk === n.pk) {
          pedidoSelecionado.value = { ...pedidoSelecionado.value, status: n.status, valor_orcamento: n.valor_orcamento };
        }
      }
    });
  } catch { /* silencioso */ }
}

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  document.removeEventListener('visibilitychange', onFoco);
});

function abrirPedido(p) {
  pedidoSelecionado.value  = p;
  editandoOrc.value        = false;
  confirmandoStatus.value  = null;
  conflitos.value          = [];
  const v = p.valor_orcamento ? Number(p.valor_orcamento).toFixed(2).replace('.', ',') : '';
  orcForm.value = { valor: p.valor_orcamento || '', valorDisplay: v ? `R$ ${v}` : '', obs: p.obs_orcamento || '' };
  if (p.data_evento) verificarConflitos(p.pk);
}

async function verificarConflitos(pedidoPk) {
  carregandoConflitos.value = true;
  try {
    const { data } = await api.get(`/api/catalogos/pedidos/${pedidoPk}/conflitos`);
    conflitos.value = data.conflitos || [];
  } catch { /* silencioso */ } finally {
    carregandoConflitos.value = false;
  }
}

function mascaraMoeda(e) {
  const raw = e.target.value.replace(/\D/g, '');
  const num = parseInt(raw || '0', 10) / 100;
  const display = num === 0 ? '' : `R$ ${num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  orcForm.value.valorDisplay = display;
  orcForm.value.valor = num || '';
  e.target.value = display;
}

function fecharPedido() {
  pedidoSelecionado.value   = null;
  editandoOrc.value         = false;
  confirmandoStatus.value   = null;
  confirmandoExclusao.value = false;
}

function pedirExclusao(p) {
  if (!pedidoSelecionado.value || pedidoSelecionado.value.pk !== p.pk) abrirPedido(p);
  confirmandoExclusao.value = true;
}

async function confirmarExclusao() {
  const p = pedidoSelecionado.value;
  if (!p) return;
  excluindo.value = true;
  try {
    await api.delete(`/api/catalogos/pedidos/${p.pk}`);
    pedidos.value = pedidos.value.filter(x => x.pk !== p.pk);
    fecharPedido();
    showToast('Pedido excluído.');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao excluir.', 'err');
  } finally {
    excluindo.value = false;
    confirmandoExclusao.value = false;
  }
}

async function enviarOrcamento() {
  if (!orcForm.value.valor) { showToast('Informe o valor do orçamento.', 'err'); return; }
  const foiEdicao = !!pedidoSelecionado.value.valor_orcamento;
  orcSalvando.value = true;
  try {
    await api.patch(`/api/catalogos/pedidos/${pedidoSelecionado.value.pk}/orcamento`, {
      valor_orcamento: orcForm.value.valor,
      obs_orcamento:   orcForm.value.obs,
      status:          'orcamento_enviado',
    });
    const idx = pedidos.value.findIndex(p => p.pk === pedidoSelecionado.value.pk);
    if (idx !== -1) {
      pedidos.value[idx].valor_orcamento = parseFloat(orcForm.value.valor);
      pedidos.value[idx].obs_orcamento   = orcForm.value.obs;
      pedidos.value[idx].status          = 'orcamento_enviado';
      pedidoSelecionado.value = { ...pedidos.value[idx] };
    }
    editandoOrc.value = false;
    showToast(foiEdicao ? 'Orçamento atualizado!' : 'Orçamento registrado!');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao salvar.', 'err');
  } finally {
    orcSalvando.value = false;
  }
}

const produtosFiltradosPicker = computed(() => {
  const q = pickerBusca.value.toLowerCase().trim();
  return produtosCatalogo.value
    .filter(p => !q || p.descricao?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q))
    .sort((a, b) => (b.saldo ?? -1) - (a.saldo ?? -1));
});

async function abrirPickerAdicionar() {
  pickerModo.value  = 'adicionar';
  pickerBusca.value = '';
  pickerQtd.value   = 1;
  pickerAberto.value = true;
  await _carregarProdutosCatalogo();
}

async function abrirPicker(item, idxLocal) {
  pickerModo.value  = 'substituir';
  itemParaSubstituir.value = { ...item, idxLocal };
  pickerBusca.value = '';
  pickerQtd.value   = item.quantidade || 1;
  pickerAberto.value = true;
  await _carregarProdutosCatalogo();
}

async function _carregarProdutosCatalogo() {
  if (produtosCatalogo.value.length) return;
  pickerCarregando.value = true;
  try {
    const { data } = await api.get(`/api/catalogos/${pk}/produtos`);
    produtosCatalogo.value = data.data || [];
  } catch { /* silencioso */ } finally {
    pickerCarregando.value = false;
  }
}

function fecharPicker() {
  pickerAberto.value = false;
  itemParaSubstituir.value = null;
}

async function selecionarSubstituto(produto) {
  if (pickerModo.value === 'adicionar') {
    // Adiciona novo item ao pedido
    try {
      const { data } = await api.post(`/api/catalogos/pedidos/${pedidoSelecionado.value.pk}/itens`, {
        produto_pk: produto.pk,
        quantidade: pickerQtd.value,
      });
      pedidoSelecionado.value = {
        ...pedidoSelecionado.value,
        itens: [...pedidoSelecionado.value.itens, data.item],
      };
      fecharPicker();
      await verificarConflitos(pedidoSelecionado.value.pk);
      showToast(`"${produto.descricao}" adicionado ao pedido.`);
    } catch (e) {
      showToast(e.response?.data?.erro || 'Erro ao adicionar produto.', 'err');
    }
    return;
  }

  const item = itemParaSubstituir.value;
  if (!item) return;
  try {
    const { data } = await api.patch(`/api/catalogos/pedidos/itens/${item.pk}/substituir`, {
      produto_substituto_pk: produto.pk,
      quantidade: pickerQtd.value,
    });
    const itens = pedidoSelecionado.value.itens;
    itens[item.idxLocal] = {
      ...itens[item.idxLocal],
      quantidade:              pickerQtd.value,
      produto_substituto_pk:   produto.pk,
      nome_produto_substituto: data.nome_produto_substituto,
      foto_url_substituto:     produto.foto_url || null,
    };
    pedidoSelecionado.value = { ...pedidoSelecionado.value, itens: [...itens] };
    fecharPicker();
    await verificarConflitos(pedidoSelecionado.value.pk);
    showToast(`Substituído por "${data.nome_produto_substituto}".`);
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao substituir.', 'err');
  }
}

async function alterarQtdItem(it, idx, delta) {
  const novaQtd = (it.quantidade || 1) + delta;
  if (novaQtd < 1) return;
  try {
    await api.patch(`/api/catalogos/pedidos/itens/${it.pk}/quantidade`, { quantidade: novaQtd });
    const itens = pedidoSelecionado.value.itens;
    itens[idx] = { ...itens[idx], quantidade: novaQtd };
    pedidoSelecionado.value = { ...pedidoSelecionado.value, itens: [...itens] };
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao alterar quantidade.', 'err');
  }
}

async function removerItemPedido(it, idx) {
  try {
    await api.delete(`/api/catalogos/pedidos/itens/${it.pk}`);
    const itens = [...pedidoSelecionado.value.itens];
    itens.splice(idx, 1);
    pedidoSelecionado.value = { ...pedidoSelecionado.value, itens };
    await verificarConflitos(pedidoSelecionado.value.pk);
    showToast('Item removido.');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao remover item.', 'err');
  }
}

async function removerSubstituto(it) {
  const idx = pedidoSelecionado.value.itens.indexOf(it);
  if (idx === -1) return;
  try {
    await api.patch(`/api/catalogos/pedidos/itens/${it.pk}/substituir`, { produto_substituto_pk: null });
    const itens = pedidoSelecionado.value.itens;
    itens[idx] = { ...itens[idx], produto_substituto_pk: null, nome_produto_substituto: null, foto_url_substituto: null };
    pedidoSelecionado.value = { ...pedidoSelecionado.value, itens: [...itens] };
    showToast('Substituição removida.');
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao remover substituição.', 'err');
  }
}

function saldoCls(saldo) {
  if (saldo === null || saldo === undefined) return 'saldo--nd';
  if (saldo <= 0) return 'saldo--zero';
  if (saldo <= 2)  return 'saldo--baixo';
  return 'saldo--ok';
}

async function marcarStatus(novoStatus) {
  marcandoStatus.value = true;
  try {
    await api.patch(`/api/catalogos/pedidos/${pedidoSelecionado.value.pk}/status`, { status: novoStatus });
    const idx = pedidos.value.findIndex(p => p.pk === pedidoSelecionado.value.pk);
    if (idx !== -1) {
      pedidos.value[idx].status = novoStatus;
      pedidoSelecionado.value = { ...pedidos.value[idx] };
    }
    const label = novoStatus === 'devolvido' ? 'Devolução registrada e estoque restaurado!' : 'Pedido marcado como retirado!';
    showToast(label);
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao atualizar status.', 'err');
  } finally {
    marcandoStatus.value  = false;
    confirmandoStatus.value = null;
  }
}


function labelStatus(s) {
  const m = {
    aguardando: 'Aguardando', orcamento_enviado: 'Orç. enviado',
    aprovado: 'Aprovado', retirado: 'Retirado', devolvido: 'Devolvido', cancelado: 'Cancelado',
  };
  return m[s] || s;
}
function fmtData(dt)      { return dt ? new Date(dt).toLocaleDateString('pt-BR') : '—'; }
function fmtDataLocal(dt) { return dt ? dt.split('-').reverse().join('/') : '—'; }
function fmtMoeda(v)      { return Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function showToast(msg, tipo = 'ok') {
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 3000);
}
</script>

<style scoped>
.pc-wrap {
  --g: #6366f1;
  --g-dim: rgba(99,102,241,.12);
  --g-soft: rgba(99,102,241,.06);
}
.pc-wrap { display: flex; flex-direction: column; gap: 20px; padding-bottom: 60px; }

/* ── Header ── */
.pc-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.pc-back   { width: 40px; height: 40px; background: var(--bg2); border: 1px solid var(--border); border-radius: 50%; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
.pc-back:hover { background: var(--g-dim); color: var(--g); border-color: rgba(0,200,83,.3); }
.pc-back .material-symbols-outlined { font-size: 20px; }
.pc-header-info { flex: 1; }
.pc-breadcrumb  { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text2); margin-bottom: 3px; }
.pc-bread-link  { cursor: pointer; transition: color .12s; }
.pc-bread-link:hover { color: var(--g); }
.pc-bread-sep   { font-size: 16px; opacity: .5; }
.pc-bread-cur   { color: var(--text); font-weight: 600; }
.pc-title       { font-size: 20px; font-weight: 800; color: var(--text); margin: 0; letter-spacing: -.2px; }
.pc-header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.pc-status-pill { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 20px; }
.pill-dot       { width: 7px; height: 7px; border-radius: 50%; }
.pill--on  { background: var(--g-dim); color: var(--g); }
.pill--on .pill-dot  { background: var(--g); }
.pill--off { background: rgba(248,113,113,.12); color: #f87171; }
.pill--off .pill-dot { background: #f87171; }
.btn-sec { display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; font-family: inherit; }
.btn-sec:hover { border-color: var(--g); color: var(--g); }
.btn-sec .material-symbols-outlined { font-size: 16px; }

/* ── Métricas ── */
.pc-metricas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.pm-card     { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
.pm-num      { font-size: 28px; font-weight: 900; color: var(--text); letter-spacing: -.5px; line-height: 1; }
.pm-num--amber { color: #f59e0b; }
.pm-num--blue  { color: #609efc; }
.pm-num--green { color: var(--g); }
.pm-label    { font-size: 11px; color: var(--text2); font-weight: 500; }

/* ── Controls ── */
.pc-controls  { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.pc-tabs      { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
.pc-tab       { padding: 7px 14px; border-radius: 8px; border: 1px solid transparent; background: none; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; transition: all .15s; }
.pc-tab:hover { background: var(--bg2); color: var(--text); }
.pc-tab--active { background: var(--g-dim); border-color: rgba(0,200,83,.2); color: var(--g); }
.pc-tab-count { background: var(--bg3); border-radius: 10px; font-size: 10px; padding: 1px 6px; }
.pc-tab--active .pc-tab-count { background: rgba(0,200,83,.15); color: var(--g); }
.pc-busca-wrap { position: relative; display: flex; align-items: center; }
.pc-busca-ico  { position: absolute; left: 10px; font-size: 18px; color: var(--text2); pointer-events: none; }
.pc-busca { padding: 8px 12px 8px 36px; background: var(--bg2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; width: 220px; transition: border-color .15s; }
.pc-busca:focus { border-color: var(--g); }
.pc-busca::placeholder { color: var(--text2); }

/* ── Table ── */
.pc-table-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.pc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pc-table th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); background: var(--bg3); border-bottom: 1px solid var(--border); white-space: nowrap; }
.pc-table td { padding: 13px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.pc-table tr:last-child td { border-bottom: none; }
.pc-row { cursor: pointer; transition: background .12s; }
.pc-row:hover { background: var(--bg3); }
.pc-row:hover .td-arrow { opacity: 1; transform: translateX(2px); }

.td-num    { font-size: 12px; font-weight: 800; color: var(--g); font-family: monospace; background: var(--g-dim); padding: 3px 8px; border-radius: 6px; }
.td-data   { font-size: 12px; color: var(--text2); white-space: nowrap; }
.td-cliente { display: flex; align-items: center; gap: 10px; }
.td-avatar  { width: 34px; height: 34px; border-radius: 50%; background: var(--g-dim); color: var(--g); font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.td-nome   { font-size: 13px; font-weight: 600; color: var(--text); }
.td-sub    { font-size: 11px; color: var(--text2); margin-top: 1px; }
.td-entrega { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text2); font-weight: 500; }
.td-entrega .material-symbols-outlined { font-size: 15px; }
.td-chips  { display: flex; gap: 4px; flex-wrap: wrap; max-width: 200px; }
.item-chip { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 2px 7px; font-size: 11px; font-weight: 600; color: var(--text); white-space: nowrap; }
.item-chip--more { color: var(--text2); }
.td-valor  { color: var(--g); font-size: 13px; font-weight: 700; white-space: nowrap; }
.ps-badge  { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; display: inline-block; }
.ps-aguardando        { background: rgba(245,158,11,.12); color: #f59e0b; }
.ps-orcamento_enviado { background: rgba(96,158,252,.12); color: #609efc; }
.ps-aprovado          { background: var(--g-dim); color: var(--g); }
.ps-retirado          { background: rgba(14,165,233,.15); color: #38bdf8; }
.ps-devolvido         { background: rgba(168,85,247,.15); color: #c084fc; }
.ps-cancelado         { background: rgba(248,113,113,.12); color: #f87171; }
.td-acoes   { display: flex; align-items: center; gap: 6px; }
.td-arrow   { font-size: 18px; color: var(--text2); opacity: .4; transition: all .15s; display: flex; }
.td-del-btn { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; padding: 4px; border-radius: 6px; opacity: 0; transition: all .15s; }
.pc-row:hover .td-del-btn { opacity: 1; }
.td-del-btn:hover { color: #ef4444; background: rgba(239,68,68,.1); }
.td-del-btn .material-symbols-outlined { font-size: 16px; }

.mh-del-btn { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.25); border-radius: 8px; color: #fca5a5; cursor: pointer; display: flex; padding: 5px; transition: all .15s; }
.mh-del-btn:hover { background: rgba(239,68,68,.3); color: #fff; }
.mh-del-btn .material-symbols-outlined { font-size: 17px; }

.pc-table-footer { padding: 12px 16px; font-size: 12px; color: var(--text2); background: var(--bg3); border-top: 1px solid var(--border); }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px; }
.modal-box     { position: relative; background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; width: 100%; max-width: min(1160px, 96vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 32px 100px rgba(0,0,0,.6); }
.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box { transition: transform .28s cubic-bezier(.32,.72,0,1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-box, .modal-leave-to .modal-box { transform: scale(.95) translateY(12px); }

/* Hero header */
.modal-hero        { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 16px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-bottom: 1px solid rgba(99,102,241,.2); flex-shrink: 0; gap: 12px; }
.modal-hero-left   { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.modal-order-num   { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #a5b4fc; white-space: nowrap; }
.modal-order-num .material-symbols-outlined { font-size: 14px; }
.modal-hero-avatar { width: 44px; height: 44px; border-radius: 50%; background: rgba(99,102,241,.25); border: 2px solid rgba(99,102,241,.4); color: #a5b4fc; font-size: 18px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-hero-name   { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 1px; }
.modal-hero-sub    { font-size: 12px; color: rgba(255,255,255,.55); }
.modal-hero-right  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.mh-badge  { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
.mh-aguardando        { background: rgba(245,158,11,.2); color: #fbbf24; border: 1px solid rgba(245,158,11,.3); }
.mh-orcamento_enviado { background: rgba(96,158,252,.2); color: #93c5fd; border: 1px solid rgba(96,158,252,.3); }
.mh-aprovado          { background: rgba(99,102,241,.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,.3); }
.mh-retirado          { background: rgba(14,165,233,.2); color: #7dd3fc; border: 1px solid rgba(14,165,233,.3); }
.mh-devolvido         { background: rgba(168,85,247,.2); color: #d8b4fe; border: 1px solid rgba(168,85,247,.3); }
.mh-cancelado         { background: rgba(248,113,113,.2); color: #fca5a5; border: 1px solid rgba(248,113,113,.3); }
.modal-close { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; color: rgba(255,255,255,.6); cursor: pointer; display: flex; padding: 4px; transition: all .15s; }
.modal-close:hover { background: rgba(255,255,255,.15); color: #fff; }
.modal-close .material-symbols-outlined { font-size: 20px; }
.mh-del-actions { display: flex; align-items: center; gap: 10px; }
.mh-del-confirm { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.mh-del-confirm-txt { font-size: 12px; color: rgba(255,255,255,.8); }
.mh-del-confirm-txt strong { color: #fff; }
.mh-del-cancel { padding: 6px 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); border-radius: 7px; color: rgba(255,255,255,.7); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; }
.mh-del-cancel:hover { background: rgba(255,255,255,.15); color: #fff; }
.mh-del-ok { display: flex; align-items: center; gap: 5px; padding: 6px 12px; background: rgba(239,68,68,.25); border: 1px solid rgba(239,68,68,.4); border-radius: 7px; color: #fca5a5; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; }
.mh-del-ok:hover:not(:disabled) { background: rgba(239,68,68,.4); color: #fff; }
.mh-del-ok:disabled { opacity: .5; cursor: not-allowed; }
.mh-del-ok .material-symbols-outlined { font-size: 14px; }
.del-conf-enter-active, .del-conf-leave-active { transition: opacity .15s; }
.del-conf-enter-from, .del-conf-leave-to { opacity: 0; }

/* Two-column body */
.modal-cols { display: grid; grid-template-columns: 1fr 420px; overflow: hidden; flex: 1; }
.modal-col  { overflow-y: auto; }
.modal-col--info { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; border-right: 1px solid var(--border); }
.modal-col--orc  { padding: 20px 18px; display: flex; flex-direction: column; gap: 14px; background: var(--bg3); }

/* Info blocks */
.mc-block { display: flex; flex-direction: column; gap: 10px; }
.mc-block-title { display: flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text2); }
.mc-block-title .material-symbols-outlined { font-size: 15px; color: var(--g); }
.mc-count { background: var(--g-dim); color: var(--g); font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 10px; }
.mc-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.mc-field  { display: flex; flex-direction: column; gap: 2px; }
.mc-field--full { grid-column: 1 / -1; }
.mc-label  { font-size: 10px; color: var(--text2); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.mc-val    { font-size: 13px; font-weight: 600; color: var(--text); }
.mc-entrega { display: flex; align-items: center; gap: 5px; }
.mc-entrega .material-symbols-outlined { font-size: 15px; color: var(--g); }

.mc-itens { display: flex; flex-direction: column; gap: 8px; }
.mc-item  { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; transition: border-color .12s; }
.mc-item:hover { border-color: rgba(0,200,83,.15); }
.mc-item-foto { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
.mc-item-foto--vazio { width: 48px; height: 48px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mc-item-foto--vazio .material-symbols-outlined { font-size: 18px; color: var(--text2); opacity: .4; }
.mc-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.mc-item-row  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mc-item-qty  { width: 26px; height: 26px; border-radius: 7px; background: var(--g-dim); color: var(--g); font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mc-item-nome { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; min-width: 0; }

/* Strip de orçamento recusado */
.mc-recusa-strip { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); border-radius: 10px; }
.mc-recusa-strip .material-symbols-outlined { font-size: 18px; color: #ef4444; flex-shrink: 0; margin-top: 1px; }
.mc-recusa-titulo { font-size: 12px; font-weight: 800; color: #ef4444; }
.mc-recusa-sub { font-size: 11px; color: var(--text2); margin-top: 2px; }
.mc-recusa-sub strong { color: var(--text); }

/* Controle de quantidade inline nos itens */
.mc-item-qty-ctrl { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
.mc-qty-mini { background: var(--bg2); border: 1px solid var(--border); border-radius: 5px; color: var(--text); font-size: 13px; font-weight: 700; cursor: pointer; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; line-height: 1; transition: all .12s; padding: 0; }
.mc-qty-mini:hover:not(:disabled) { border-color: var(--g); color: var(--g); }
.mc-qty-mini:disabled { opacity: .35; cursor: not-allowed; }
.mc-item-del { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; padding: 2px; border-radius: 5px; transition: all .12s; flex-shrink: 0; margin-left: auto; }
.mc-item-del:hover { color: #ef4444; background: rgba(239,68,68,.1); }
.mc-item-del .material-symbols-outlined { font-size: 15px; }

/* Botão adicionar produto */
.mc-add-item-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 8px; background: none; border: 1px dashed var(--border); border-radius: 9px; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 4px; transition: all .15s; }
.mc-add-item-btn:hover { border-color: var(--g); color: var(--g); background: var(--g-soft); }
.mc-add-item-btn .material-symbols-outlined { font-size: 16px; }

/* Saldo badge */
.mc-saldo { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; white-space: nowrap; flex-shrink: 0; }
.saldo--ok   { background: rgba(0,200,83,.12); color: #00c853; }
.saldo--baixo{ background: rgba(245,158,11,.12); color: #f59e0b; }
.saldo--zero { background: rgba(239,68,68,.12); color: #ef4444; }
.saldo--nd   { background: var(--bg2); color: var(--text2); }

/* Substituto atual no item */
.mc-subst-atual { display: flex; align-items: center; gap: 6px; background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.2); border-radius: 7px; padding: 5px 8px; flex-wrap: wrap; }
.mc-subst-atual .material-symbols-outlined { font-size: 14px; color: var(--g); flex-shrink: 0; }
.mc-subst-thumb { width: 22px; height: 22px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
.mc-subst-nome-txt { font-size: 11px; font-weight: 600; color: var(--text); flex: 1; min-width: 0; }
.mc-subst-rm { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; padding: 1px; border-radius: 4px; transition: all .12s; }
.mc-subst-rm:hover { color: #ef4444; }
.mc-subst-rm .material-symbols-outlined { font-size: 14px; }

/* Botão substituir */
.mc-subst-btn { display: flex; align-items: center; gap: 5px; padding: 5px 9px; background: none; border: 1px dashed var(--border); border-radius: 7px; color: var(--text2); font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; align-self: flex-start; }
.mc-subst-btn:hover { border-color: var(--g); color: var(--g); background: var(--g-dim); }
.mc-subst-btn .material-symbols-outlined { font-size: 14px; }

/* ── Picker de substituição ── */
.subst-picker { position: absolute; inset: 0; z-index: 20; background: var(--bg2); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; }
.subst-picker-hd { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 22px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 10px; }
.subst-picker-hd-left { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.subst-picker-qty-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.subst-picker-qty-label { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .05em; }
.subst-picker-qty-ctrl { display: flex; align-items: center; gap: 6px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 4px 8px; }
.subst-qty-btn { background: none; border: none; color: var(--text); font-size: 16px; font-weight: 700; cursor: pointer; padding: 0 4px; line-height: 1; transition: color .12s; }
.subst-qty-btn:hover { color: var(--g); }
.subst-qty-val { font-size: 14px; font-weight: 800; color: var(--text); min-width: 20px; text-align: center; }
.subst-picker-titulo { font-size: 15px; font-weight: 800; color: var(--text); }
.subst-picker-sub { font-size: 12px; color: var(--text2); margin-top: 3px; }
.subst-picker-sub strong { color: var(--text); }
.subst-picker-close { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); cursor: pointer; display: flex; padding: 4px; transition: all .15s; }
.subst-picker-close:hover { color: var(--text); }
.subst-picker-close .material-symbols-outlined { font-size: 18px; }
.subst-picker-busca-wrap { position: relative; padding: 12px 22px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.subst-picker-busca-ico { position: absolute; left: 34px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--text2); pointer-events: none; }
.subst-picker-busca { width: 100%; padding: 9px 12px 9px 38px; background: var(--bg3); border: 1px solid var(--border); border-radius: 9px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color .15s; }
.subst-picker-busca:focus { border-color: var(--g); }
.subst-picker-load { display: flex; align-items: center; justify-content: center; padding: 40px; }
.subst-picker-lista { flex: 1; overflow-y: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; }
.subst-picker-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: all .15s; }
.subst-picker-item:hover { border-color: var(--g); background: var(--g-soft); }
.subst-picker-item--sel { border-color: var(--g); background: var(--g-dim); }
.subst-picker-foto { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
.subst-picker-foto--vazio { width: 44px; height: 44px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.subst-picker-foto--vazio .material-symbols-outlined { font-size: 18px; color: var(--text2); opacity: .4; }
.subst-picker-info { flex: 1; min-width: 0; }
.subst-picker-nome { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.subst-picker-cod  { font-size: 11px; color: var(--text2); margin-top: 2px; }
.subst-saldo { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px; white-space: nowrap; flex-shrink: 0; }
.subst-picker-vazio { text-align: center; padding: 40px 20px; font-size: 13px; color: var(--text2); opacity: .6; }
.picker-enter-active, .picker-leave-active { transition: opacity .18s; }
.picker-enter-from, .picker-leave-to { opacity: 0; }

.mc-obs { font-size: 13px; color: var(--text2); background: var(--bg3); border-radius: 8px; padding: 10px 12px; font-style: italic; border: 1px solid var(--border); }



/* Orçamento card */
.mc-orc-card { flex: 1; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.mc-orc-header { display: flex; align-items: center; justify-content: space-between; }
.mc-orc-title  { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); }
.mc-orc-title .material-symbols-outlined { font-size: 14px; color: var(--g); }
.mc-orc-edit   { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 7px; color: var(--text2); font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .12s; }
.mc-orc-edit:hover { color: var(--g); border-color: rgba(0,200,83,.3); }
.mc-orc-edit .material-symbols-outlined { font-size: 13px; }

.mc-orc-valor-display { display: flex; flex-direction: column; gap: 6px; background: var(--g-dim); border: 1px solid rgba(0,200,83,.2); border-radius: 10px; padding: 14px; }
.mc-orc-num  { font-size: 28px; font-weight: 900; color: var(--g); letter-spacing: -.5px; }
.mc-orc-desc { font-size: 12px; color: var(--text2); font-style: italic; }

.mc-orc-bloqueado { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); border-radius: 9px; font-size: 12px; font-weight: 600; color: #ef4444; }
.mc-orc-bloqueado .material-symbols-outlined { font-size: 16px; flex-shrink: 0; }
.mc-orc-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px; text-align: center; font-size: 12px; color: var(--text2); }
.mc-orc-form  { display: flex; flex-direction: column; gap: 10px; }
.mc-field-group { display: flex; flex-direction: column; gap: 4px; }
.mc-field-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text2); }
.mc-orc-btns { display: flex; gap: 8px; justify-content: flex-end; }
.m-input   { padding: 9px 11px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; transition: border-color .15s; }
.m-input:focus { border-color: var(--g); }
.m-textarea { resize: vertical; }
.btn-cancel  { padding: 8px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-orc-send { display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1; padding: 10px; background: var(--g); border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: filter .15s; }
.btn-orc-send:hover:not(:disabled) { filter: brightness(1.1); }
.btn-orc-send:disabled { opacity: .5; cursor: not-allowed; }
.btn-orc-send .material-symbols-outlined { font-size: 16px; }

/* Aviso de conflito de disponibilidade */
.mc-conflito-load { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #f59e0b; padding: 8px 12px; background: rgba(245,158,11,.08); border-radius: 9px; border: 1px solid rgba(245,158,11,.2); }
.mc-conflito-card { background: rgba(239,68,68,.06); border: 1px solid rgba(239,68,68,.3); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.mc-conflito-titulo { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #ef4444; text-transform: uppercase; letter-spacing: .05em; }
.mc-conflito-titulo .material-symbols-outlined { font-size: 16px; }
.mc-conflito-lista { display: flex; flex-direction: column; gap: 8px; }
.mc-conflito-item { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; background: rgba(239,68,68,.06); border-radius: 8px; border: 1px solid rgba(239,68,68,.15); }
.mc-conflito-prod { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--text); }
.mc-conflito-prod .material-symbols-outlined { font-size: 14px; color: #ef4444; }
.mc-conflito-ref  { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text2); flex-wrap: wrap; padding-left: 19px; }
.mc-conflito-ref  .material-symbols-outlined { font-size: 13px; flex-shrink: 0; }
.mc-conflito-hint { font-size: 11px; color: #f87171; font-style: italic; line-height: 1.4; }

/* Ações de status (retirado / devolvido) */
.mc-status-acao {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;
  padding: 14px; display: flex; flex-direction: column; gap: 8px;
}
.mc-status-acao--dev { border-color: rgba(168,85,247,.3); background: rgba(168,85,247,.05); }
.mc-status-acao-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2);
}
.mc-status-acao-title .material-symbols-outlined { font-size: 14px; color: var(--g); }
.mc-status-acao--dev .mc-status-acao-title .material-symbols-outlined { color: #c084fc; }
.mc-status-acao-desc { font-size: 11px; color: var(--text2); line-height: 1.4; margin: 0; }
.mc-status-confirm { display: flex; flex-direction: column; gap: 8px; }
.mc-status-confirm--dev { }
.mc-status-confirm-msg { font-size: 12px; color: var(--text); font-weight: 500; margin: 0; line-height: 1.5; padding: 8px 10px; background: var(--bg3); border-radius: 8px; border: 1px solid var(--border); }
.mc-status-confirm-btns { display: flex; gap: 6px; }
.btn-conf-cancel { padding: 8px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .12s; }
.btn-conf-cancel:hover { color: var(--text); border-color: var(--text2); }
.acao-conf-enter-active, .acao-conf-leave-active { transition: opacity .15s, transform .15s; }
.acao-conf-enter-from, .acao-conf-leave-to { opacity: 0; transform: translateY(-4px); }
.btn-retirado {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; background: rgba(14,165,233,.15); border: 1px solid rgba(14,165,233,.3);
  border-radius: 9px; color: #38bdf8; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-retirado:hover:not(:disabled) { background: rgba(14,165,233,.25); }
.btn-retirado:disabled { opacity: .5; cursor: not-allowed; }
.btn-retirado .material-symbols-outlined { font-size: 15px; }
.btn-devolvido {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; background: rgba(168,85,247,.2); border: 1px solid rgba(168,85,247,.35);
  border-radius: 9px; color: #c084fc; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-devolvido:hover:not(:disabled) { background: rgba(168,85,247,.3); }
.btn-devolvido:disabled { opacity: .5; cursor: not-allowed; }
.btn-devolvido .material-symbols-outlined { font-size: 15px; }

/* ── Shared ── */
.state-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 20px; color: var(--text2); font-size: 13px; }
.muted { opacity: .6; }
.spin    { display: inline-block; width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--g); border-radius: 50%; animation: spin .7s linear infinite; }
.spin-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.pc-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 9999; box-shadow: 0 6px 24px rgba(0,0,0,.35); white-space: nowrap; }
.pc-toast .material-symbols-outlined { font-size: 18px; }
.pc-toast.ok  { background: #064e2a; color: #86efac; border: 1px solid rgba(0,200,83,.2); }
.pc-toast.err { background: #7f1d1d; color: #fecaca; }
.toast-enter-active, .toast-leave-active { transition: all .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

@media (max-width: 860px) {
  .pc-metricas { grid-template-columns: repeat(2,1fr); }
  .modal-cols  { grid-template-columns: 1fr; }
  .modal-col--orc { border-right: none; border-top: 1px solid var(--border); }
  .mc-ref-lista { max-height: 180px; }
}

</style>

<!-- Bloco não-escopado: usa .pc-wrap como namespace para não vazar -->
<style>
[data-theme="light"] .pc-wrap { background: #fff; }

/* Cards de métrica */
[data-theme="light"] .pc-wrap .pc-back         { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .pc-wrap .btn-sec         { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .pc-wrap .pm-card         { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .pc-wrap .pc-busca        { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .pc-wrap .pc-tab-count    { background: rgba(0,0,0,.06); color: #374151; }
[data-theme="light"] .pc-wrap .pc-tab:hover    { background: rgba(0,0,0,.04); }

/* Tabela — tudo branco */
[data-theme="light"] .pc-wrap .pc-table-wrap   { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .pc-wrap .pc-table th     { background: #fff; border-bottom: 1px solid rgba(0,0,0,.08); color: #374151; }
[data-theme="light"] .pc-wrap .pc-table td     { border-bottom-color: rgba(0,0,0,.06); }
[data-theme="light"] .pc-wrap .pc-row:hover    { background: rgba(99,102,241,.04); }
[data-theme="light"] .pc-wrap .item-chip       { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
[data-theme="light"] .pc-wrap .pc-table-footer { background: #fff; border-top-color: rgba(0,0,0,.08); }
[data-theme="light"] .pc-wrap .td-num          { background: rgba(0,200,83,.1); }
[data-theme="light"] .pc-wrap .td-avatar       { background: rgba(0,200,83,.1); }

/* Modal — tudo branco */
[data-theme="light"] .modal-box               { background: #fff; box-shadow: 0 32px 100px rgba(0,0,0,.15); border-color: rgba(0,0,0,.1); }
[data-theme="light"] .modal-col--info         { background: #fff; border-right-color: rgba(0,0,0,.08); }
[data-theme="light"] .modal-col--orc          { background: #fff; }
[data-theme="light"] .mc-orc-card             { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .mc-orc-edit             { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
[data-theme="light"] .mc-item                 { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .mc-obs                  { background: #fff; border-color: rgba(0,0,0,.1); }
[data-theme="light"] .m-input                 { background: #fff; border-color: rgba(0,0,0,.15); }
[data-theme="light"] .btn-cancel              { background: #fff; border-color: rgba(0,0,0,.12); color: #374151; }
</style>
