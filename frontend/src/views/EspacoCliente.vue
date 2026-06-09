<template>
  <!-- VERIFICANDO SESSÃO (evita flicker de login) -->
  <div v-if="validandoSessao" :class="['ec-root', tema]" style="display:flex;align-items:center;justify-content:center;min-height:100dvh">
    <div class="ec-bg"><div class="ec-glow ec-glow--a"></div><div class="ec-glow ec-glow--b"></div><div class="ec-grid"></div></div>
    <div class="ec-validando-wrap">
      <div class="ec-spin" style="width:36px;height:36px;border-width:4px"></div>
      <span style="font-size:14px">Verificando sessão…</span>
    </div>
  </div>

  <!-- LOGIN -->
  <div v-else-if="tela === 'login'" :class="['ec-root', tema]">
    <div class="ec-bg">
      <div class="ec-glow ec-glow--a"></div>
      <div class="ec-glow ec-glow--b"></div>
      <div class="ec-grid"></div>
    </div>
    <div class="ec-wrap">
      <div class="ec-brand">
        <img src="/img/logo_fundo_transp.png" alt="Logo" class="ec-logo" />
        <div class="ec-divider"></div>
        <div class="ec-tag-label">Minha Conta</div>
        <h1 class="ec-titulo">Espaço do Cliente</h1>
        <p class="ec-subtitulo">Acompanhe suas compras e orçamentos</p>
      </div>

      <div class="ec-card">
        <div class="ec-card-header">
          <div class="ec-card-ico"><span class="material-symbols-outlined">person</span></div>
          <div>
            <h2 class="ec-card-title">Acesse sua conta</h2>
            <p class="ec-card-sub">Use o e-mail e telefone do seu cadastro</p>
          </div>
        </div>

        <div class="ec-form">
          <div class="ec-field" :class="{ error: erros.email }">
            <label class="ec-label">E-mail</label>
            <div class="ec-input-wrap">
              <span class="material-symbols-outlined ec-input-ico">mail</span>
              <input v-model="form.email" type="email" class="ec-input" placeholder="seu@email.com"
                autocomplete="email" @keydown.enter="focarTelefone" />
            </div>
            <span v-if="erros.email" class="ec-err">{{ erros.email }}</span>
          </div>

          <div class="ec-field" :class="{ error: erros.telefone }">
            <label class="ec-label">Telefone cadastrado</label>
            <div class="ec-input-wrap">
              <span class="material-symbols-outlined ec-input-ico">phone</span>
              <input ref="inputTelefone" v-model="form.telefone" type="tel" class="ec-input"
                placeholder="(92) 99999-9999" autocomplete="tel"
                @input="mascaraTelefone" @keydown.enter="entrar" />
            </div>
            <span v-if="erros.telefone" class="ec-err">{{ erros.telefone }}</span>
          </div>

          <div v-if="erroGeral" class="ec-erro-geral">
            <span class="material-symbols-outlined">error</span>{{ erroGeral }}
          </div>

          <button class="ec-btn-primary" :disabled="entrando" @click="entrar">
            <span v-if="entrando" class="ec-spinner"></span>
            <span v-else class="material-symbols-outlined">login</span>
            {{ entrando ? 'Verificando…' : 'Entrar' }}
          </button>
        </div>

        <p class="ec-rodape">
          Não tem cadastro? <span class="ec-link">Entre em contato com a loja</span>
        </p>
      </div>
    </div>

    <button class="ec-tema-btn ec-tema-btn--login" @click="alternarTema" :title="tema === 'dark' ? 'Modo claro' : 'Modo escuro'">
      <span class="material-symbols-outlined">{{ tema === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
    </button>
  </div>

  <!-- SELEÇÃO DE FILIAL -->
  <div v-else-if="!validandoSessao && tela === 'filial'" :class="['ec-root', tema]">
    <div class="ec-bg">
      <div class="ec-glow ec-glow--a"></div>
      <div class="ec-glow ec-glow--b"></div>
      <div class="ec-grid"></div>
    </div>
    <div class="ec-wrap">
      <div class="ec-brand">
        <img src="/img/logo_fundo_transp.png" alt="Logo" class="ec-logo" />
        <div class="ec-divider"></div>
        <div class="ec-tag-label">Minha Conta</div>
        <h1 class="ec-titulo">Selecione a loja</h1>
        <p class="ec-subtitulo">Encontramos seu cadastro em mais de uma loja</p>
      </div>

      <div class="ec-card">
        <div class="ec-filial-lista">
          <button
            v-for="f in filiais"
            :key="f.cliente_pk"
            class="ec-filial-item"
            @click="selecionarFilial(f)"
          >
            <div class="ec-filial-ico"><span class="material-symbols-outlined">store</span></div>
            <span class="ec-filial-nome">{{ f.filial_nome }}</span>
            <span class="material-symbols-outlined ec-filial-seta">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <button class="ec-tema-btn ec-tema-btn--login" @click="alternarTema" :title="tema === 'dark' ? 'Modo claro' : 'Modo escuro'">
      <span class="material-symbols-outlined">{{ tema === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
    </button>
  </div>

  <!-- PORTAL -->
  <div v-else :class="['ec-root', 'ec-portal', tema]">
    <div class="ec-bg ec-bg--fixed">
      <div class="ec-glow ec-glow--a" style="opacity:.12"></div>
      <div class="ec-glow ec-glow--b" style="opacity:.08"></div>
      <div class="ec-grid"></div>
    </div>

    <header class="ec-header">
      <div class="ec-header-inner">
        <div class="ec-header-brand">
          <img src="/img/logo_fundo_transp.png" alt="Logo" class="ec-header-logo" />
          <div class="ec-header-info">
            <span class="ec-header-tag">Minha Conta</span>
            <span class="ec-header-nome">Olá, {{ sessao?.nome || '—' }}</span>
          </div>
        </div>
        <div class="ec-header-acoes">
          <!-- Seletor de filial -->
          <div v-if="filiais.length > 1" class="ec-filial-sel" ref="filialDropRef">
            <button class="ec-filial-sel-btn" @click="filialDropOpen = !filialDropOpen">
              <span class="material-symbols-outlined" style="font-size:16px">store</span>
              {{ filialAtual?.filial_nome || 'Loja' }}
              <span class="material-symbols-outlined" style="font-size:16px">expand_more</span>
            </button>
            <div v-if="filialDropOpen" class="ec-filial-drop">
              <button
                v-for="f in filiais"
                :key="f.cliente_pk"
                :class="['ec-filial-drop-item', { active: f.cliente_pk === filialAtual?.cliente_pk }]"
                @click="trocarFilial(f)"
              >
                <span class="material-symbols-outlined" style="font-size:16px">{{ f.cliente_pk === filialAtual?.cliente_pk ? 'check' : 'store' }}</span>
                {{ f.filial_nome }}
              </button>
            </div>
          </div>

          <button class="ec-tema-btn" @click="alternarTema" :title="tema === 'dark' ? 'Modo claro' : 'Modo escuro'">
            <span class="material-symbols-outlined">{{ tema === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
          </button>
          <button class="ec-btn-sair" @click="sair">
            <span class="material-symbols-outlined">logout</span>
            <span class="ec-btn-sair-txt">Sair</span>
          </button>
        </div>
      </div>
    </header>

    <main class="ec-main">
      <!-- Banner de permissão de notificações -->
      <Transition name="ec-slide">
        <div v-if="mostrarBannerPush" class="ec-push-banner">
          <span class="material-symbols-outlined ec-push-ico">notifications</span>
          <div class="ec-push-txt">
            <strong>Ative as notificações</strong>
            <span>Receba alertas de novas compras e vencimentos de crediários.</span>
          </div>
          <button class="ec-push-btn-ativar" :disabled="ativandoPush" @click="ativarPush">
            <span v-if="ativandoPush" class="ec-spinner sm"></span>
            <span v-else class="material-symbols-outlined" style="font-size:15px">notifications_active</span>
            {{ ativandoPush ? 'Ativando…' : 'Ativar' }}
          </button>
          <button class="ec-push-btn-fechar" @click="dispensarPush" title="Fechar">
            <span class="material-symbols-outlined" style="font-size:18px">close</span>
          </button>
        </div>
      </Transition>

      <!-- Abas -->
      <div class="ec-tabs">
        <button :class="['ec-tab', { active: aba === 'compras' }]" @click="trocarAba('compras')">
          <span class="material-symbols-outlined">receipt_long</span>
          Compras
          <span v-if="vendas.length" class="ec-tab-badge">{{ vendas.length }}</span>
        </button>
        <button :class="['ec-tab', { active: aba === 'pedidos' }]" @click="trocarAba('pedidos')">
          <span class="material-symbols-outlined">event_note</span>
          Orçamentos
          <span v-if="pedidos.length" class="ec-tab-badge">{{ pedidos.length }}</span>
        </button>
        <button :class="['ec-tab', { active: aba === 'crediarios' }]" @click="trocarAba('crediarios')">
          <span class="material-symbols-outlined">payments</span>
          Crediários
          <span v-if="crediarios.length" class="ec-tab-badge">{{ crediarios.length }}</span>
        </button>
      </div>

      <!-- COMPRAS -->
      <template v-if="aba === 'compras'">
        <div v-if="carregandoVendas" class="ec-loading">
          <div class="ec-spin"></div><span>Carregando compras…</span>
        </div>
        <div v-else-if="erroVendas" class="ec-erro-box">
          <span class="material-symbols-outlined">error</span>
          <div>
            <strong>Erro ao carregar compras</strong>
            <p>{{ erroVendas }}</p>
          </div>
          <button class="ec-btn-retry" @click="carregarVendas">Tentar novamente</button>
        </div>
        <div v-else-if="!vendas.length" class="ec-vazio">
          <span class="material-symbols-outlined" style="font-size:2.8rem;opacity:.35">receipt_long</span>
          <p>Nenhuma compra encontrada nesta loja.</p>
        </div>
        <div v-else class="ec-lista">
          <div v-for="v in vendasPaginadas" :key="v.pk" :class="['ec-item', { expanded: expandido === v.pk }]">
            <div class="ec-item-header" @click="toggleExpand(v.pk)">
              <div class="ec-item-left">
                <div class="ec-item-num"># {{ v.numero || v.pk }}</div>
                <div class="ec-item-data">{{ fmtData(v.criado_em) }}</div>
                <div class="ec-item-tipo">{{ tipoLabel(v.tipo_venda) }}</div>
              </div>
              <div class="ec-item-right">
                <span :class="['ec-badge', badgeVenda(v.status)]">{{ statusVendaLabel(v.status) }}</span>
                <span class="ec-item-total">{{ fmtBrl(v.total) }}</span>
                <span class="material-symbols-outlined ec-expand-ico">{{ expandido === v.pk ? 'expand_less' : 'expand_more' }}</span>
              </div>
            </div>

            <div v-if="expandido === v.pk" class="ec-item-body">
              <div class="ec-section">Itens</div>
              <div v-if="v.itens.length" class="ec-itens">
                <div v-for="(it, i) in v.itens" :key="i" class="ec-it-row">
                  <span class="ec-it-desc">{{ it.descricao }}</span>
                  <span class="ec-it-qtd">{{ it.qtd }}x</span>
                  <span class="ec-it-val">{{ fmtBrl(it.total_item) }}</span>
                </div>
              </div>
              <p v-else class="ec-muted">Sem itens detalhados.</p>

              <div class="ec-section" style="margin-top:12px">Pagamento</div>
              <div v-if="v.pagamentos.length" class="ec-pagamentos">
                <div v-for="(pg, i) in v.pagamentos" :key="i" class="ec-pg-row">
                  <span>{{ pg.label }}</span>
                  <span class="ec-pg-val">{{ fmtBrl(pg.valor) }}</span>
                </div>
              </div>
              <p v-else class="ec-muted">Sem pagamentos registrados.</p>

              <!-- Botão NFC-e -->
              <div v-if="v.nfce_protocolo && v.nfce_danfe" class="ec-nfce-box">
                <div class="ec-nfce-info">
                  <span class="material-symbols-outlined" style="font-size:16px;color:#22c55e">verified</span>
                  <span>NFC-e nº {{ v.nfce_numero }}<span v-if="v.nfce_serie"> – Série {{ v.nfce_serie }}</span></span>
                </div>
                <button class="ec-btn-nfce" :disabled="abrindoDanfe === v.pk" @click="verNfce(v)">
                  <span v-if="abrindoDanfe === v.pk" class="ec-spinner sm"></span>
                  <span v-else class="material-symbols-outlined" style="font-size:15px">receipt</span>
                  {{ abrindoDanfe === v.pk ? 'Carregando…' : 'Ver / Baixar NFC-e' }}
                </button>
              </div>

              <div v-if="v.tipo_venda === 'locacao' && v.data_locacao" class="ec-extra-info">
                <span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px">event</span>
                Locação: {{ fmtDataSimples(v.data_locacao) }}
                <span v-if="v.data_devolucao_prevista"> → devolução {{ fmtDataSimples(v.data_devolucao_prevista) }}</span>
              </div>

              <div class="ec-totais">
                <div v-if="Number(v.desconto_total) > 0" class="ec-total-row">
                  <span>Desconto</span><span>- {{ fmtBrl(v.desconto_total) }}</span>
                </div>
                <div class="ec-total-row bold">
                  <span>Total</span><span>{{ fmtBrl(v.total) }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- Paginação compras -->
          <div v-if="totalPagVendas > 1" class="ec-paginacao">
            <button class="ec-pg-btn" :disabled="paginaVendas === 1" @click="paginaVendas--">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <span class="ec-pg-info">{{ paginaVendas }} / {{ totalPagVendas }}</span>
            <button class="ec-pg-btn" :disabled="paginaVendas === totalPagVendas" @click="paginaVendas++">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </template>

      <!-- ORÇAMENTOS -->
      <template v-if="aba === 'pedidos'">
        <div v-if="carregandoPedidos" class="ec-loading">
          <div class="ec-spin"></div><span>Carregando orçamentos…</span>
        </div>
        <div v-else-if="!pedidos.length" class="ec-vazio">
          <span class="material-symbols-outlined" style="font-size:2.8rem;opacity:.35">event_note</span>
          <p>Nenhum orçamento encontrado.</p>
        </div>
        <div v-else class="ec-lista">
          <div v-for="p in pedidosPaginados" :key="p.pk" :class="['ec-item', { expanded: expandido === `ped-${p.pk}` }]">
            <div class="ec-item-header" @click="toggleExpand(`ped-${p.pk}`)">
              <div class="ec-item-left">
                <div class="ec-item-num">Orçamento #{{ p.pk }}</div>
                <div class="ec-item-data">{{ fmtData(p.criado_em) }}</div>
                <div v-if="p.data_evento" class="ec-item-tipo">Evento: {{ fmtDataSimples(p.data_evento) }}</div>
              </div>
              <div class="ec-item-right">
                <span :class="['ec-badge', badgePedido(p.status)]">{{ statusPedidoLabel(p.status) }}</span>
                <span v-if="p.valor_orcamento" class="ec-item-total">{{ fmtBrl(p.valor_orcamento) }}</span>
                <span class="material-symbols-outlined ec-expand-ico">{{ expandido === `ped-${p.pk}` ? 'expand_less' : 'expand_more' }}</span>
              </div>
            </div>

            <div v-if="expandido === `ped-${p.pk}`" class="ec-item-body">
              <!-- Link do catálogo -->
              <div v-if="p.catalogo_token" class="ec-catalogo-link">
                <span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px">storefront</span>
                <span class="ec-catalogo-nome">{{ p.catalogo_nome || 'Catálogo' }}</span>
                <button class="ec-btn-catalogo" :disabled="abrindoCatalogo === p.pk" @click="abrirCatalogo(p)">
                  <span v-if="abrindoCatalogo === p.pk" class="ec-spinner sm"></span>
                  <span v-else class="material-symbols-outlined" style="font-size:14px">open_in_new</span>
                  {{ abrindoCatalogo === p.pk ? 'Abrindo…' : 'Abrir catálogo' }}
                </button>
              </div>

              <div v-if="p.itens.length">
                <div class="ec-section">Itens solicitados</div>
                <div class="ec-itens">
                  <div v-for="(it, i) in p.itens" :key="i" class="ec-it-row">
                    <span class="ec-it-desc">{{ it.nome_produto }}</span>
                    <span class="ec-it-qtd">{{ it.quantidade }}x</span>
                    <span class="ec-it-val"></span>
                  </div>
                </div>
              </div>

              <div v-if="p.observacao" class="ec-obs">
                <span class="material-symbols-outlined" style="font-size:15px">chat_bubble</span>
                {{ p.observacao }}
              </div>
              <div v-if="p.obs_orcamento" class="ec-obs-orc">
                <span class="material-symbols-outlined" style="font-size:15px">description</span>
                {{ p.obs_orcamento }}
              </div>

              <div v-if="p.tipo_entrega" class="ec-extra-info">
                <span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px">local_shipping</span>
                {{ p.tipo_entrega }}
              </div>
            </div>
          </div>

          <!-- Paginação orçamentos -->
          <div v-if="totalPagPedidos > 1" class="ec-paginacao">
            <button class="ec-pg-btn" :disabled="paginaPedidos === 1" @click="paginaPedidos--">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <span class="ec-pg-info">{{ paginaPedidos }} / {{ totalPagPedidos }}</span>
            <button class="ec-pg-btn" :disabled="paginaPedidos === totalPagPedidos" @click="paginaPedidos++">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </template>

      <!-- CREDIÁRIOS -->
      <template v-if="aba === 'crediarios'">
        <div v-if="carregandoVendas" class="ec-loading">
          <div class="ec-spin"></div><span>Carregando crediários…</span>
        </div>
        <div v-else-if="!crediarios.length" class="ec-vazio">
          <span class="material-symbols-outlined" style="font-size:2.8rem;opacity:.35">payments</span>
          <p>Nenhum crediário encontrado.</p>
        </div>
        <div v-else class="ec-lista">
          <div v-for="c in crediariosPaginados" :key="c.pk" :class="['ec-item', { expanded: expandido === `cred-${c.pk}` }]">
            <div class="ec-item-header" @click="toggleExpand(`cred-${c.pk}`)">
              <div class="ec-item-left">
                <div class="ec-item-num">Venda #{{ c.numero || c.pk }}</div>
                <div class="ec-item-data">{{ fmtData(c.criado_em) }}</div>
                <div v-if="c.data_vencimento_crediario" class="ec-item-tipo">
                  Vencimento: {{ fmtDataSimples(c.data_vencimento_crediario) }}
                </div>
              </div>
              <div class="ec-item-right">
                <span :class="['ec-badge', badgeCrediario(c)]">{{ statusCrediarioLabel(c) }}</span>
                <span class="ec-item-total">{{ fmtBrl(valorCrediario(c)) }}</span>
                <span class="material-symbols-outlined ec-expand-ico">{{ expandido === `cred-${c.pk}` ? 'expand_less' : 'expand_more' }}</span>
              </div>
            </div>

            <div v-if="expandido === `cred-${c.pk}`" class="ec-item-body">
              <div class="ec-section">Resumo</div>
              <div class="ec-totais">
                <div class="ec-total-row">
                  <span>Total da venda</span>
                  <span>{{ fmtBrl(c.total) }}</span>
                </div>
                <div class="ec-total-row bold">
                  <span>Valor a prazo</span>
                  <span>{{ fmtBrl(valorCrediario(c)) }}</span>
                </div>
                <div v-if="c.data_vencimento_crediario" class="ec-total-row">
                  <span>Data de vencimento</span>
                  <span>{{ fmtDataSimples(c.data_vencimento_crediario) }}</span>
                </div>
              </div>

              <div v-if="c.itens.length">
                <div class="ec-section">Itens</div>
                <div class="ec-itens">
                  <div v-for="(it, i) in c.itens" :key="i" class="ec-it-row">
                    <span class="ec-it-desc">{{ it.descricao }}</span>
                    <span class="ec-it-qtd">{{ it.qtd }}x</span>
                    <span class="ec-it-val">{{ fmtBrl(it.total_item) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Paginação crediários -->
          <div v-if="totalPagCrediarios > 1" class="ec-paginacao">
            <button class="ec-pg-btn" :disabled="paginaCrediarios === 1" @click="paginaCrediarios--">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <span class="ec-pg-info">{{ paginaCrediarios }} / {{ totalPagCrediarios }}</span>
            <button class="ec-pg-btn" :disabled="paginaCrediarios === totalPagCrediarios" @click="paginaCrediarios++">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import axios from 'axios';

const EC_SESSAO_KEY = 'ec_sessao';
const EC_FILIAIS_KEY = 'ec_filiais';
const EC_FILIAL_KEY  = 'ec_filial';
const EC_TEMA_KEY    = 'ec_tema';

const tela               = ref('login');
const sessao             = ref(null);
const filiais            = ref([]);
const filialAtual        = ref(null);
const filialDropOpen     = ref(false);
const filialDropRef      = ref(null);

const validandoSessao    = ref(false);
const entrando           = ref(false);
const erroGeral          = ref('');
const erros              = ref({ email: '', telefone: '' });
const form               = ref({ email: '', telefone: '' });
const inputTelefone      = ref(null);

const aba                = ref('compras');
const expandido          = ref(null);
const vendas             = ref([]);
const pedidos            = ref([]);
const carregandoVendas   = ref(false);
const carregandoPedidos  = ref(false);
const erroVendas         = ref('');
const abrindoCatalogo    = ref(null);
const abrindoDanfe       = ref(null);

const EC_PUSH_KEY        = 'ec_push_dispensado';
const mostrarBannerPush  = ref(false);
const ativandoPush       = ref(false);

const POR_PAGINA        = 5;
const paginaVendas      = ref(1);
const paginaPedidos     = ref(1);
const paginaCrediarios  = ref(1);
const totalPagVendas    = computed(() => Math.max(1, Math.ceil(vendas.value.length / POR_PAGINA)));
const totalPagPedidos   = computed(() => Math.max(1, Math.ceil(pedidos.value.length / POR_PAGINA)));
const crediarios        = computed(() => vendas.value.filter(v => v.tipo_venda === 'crediario'));
const totalPagCrediarios = computed(() => Math.max(1, Math.ceil(crediarios.value.length / POR_PAGINA)));
const vendasPaginadas    = computed(() => vendas.value.slice((paginaVendas.value - 1) * POR_PAGINA, paginaVendas.value * POR_PAGINA));
const pedidosPaginados   = computed(() => pedidos.value.slice((paginaPedidos.value - 1) * POR_PAGINA, paginaPedidos.value * POR_PAGINA));
const crediariosPaginados = computed(() => crediarios.value.slice((paginaCrediarios.value - 1) * POR_PAGINA, paginaCrediarios.value * POR_PAGINA));

const tema = ref(localStorage.getItem(EC_TEMA_KEY) || 'dark');

function alternarTema() {
  tema.value = tema.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem(EC_TEMA_KEY, tema.value);
}

function ecHeaders() {
  const headers = { 'x-sessao-token': localStorage.getItem(EC_SESSAO_KEY) };
  if (filialAtual.value?.cliente_pk && filialAtual.value.cliente_pk !== sessao.value?.pk) {
    headers['x-cliente-pk'] = String(filialAtual.value.cliente_pk);
  }
  return headers;
}

onMounted(async () => {
  const tok = localStorage.getItem(EC_SESSAO_KEY);
  if (!tok) return;
  validandoSessao.value = true;
  try {
    const { data } = await axios.get('/api/espaco-cliente/sessao', { headers: { 'x-sessao-token': tok } });
    sessao.value  = data.cliente;
    filiais.value = data.filiais || [];

    const savedFilial = JSON.parse(localStorage.getItem(EC_FILIAL_KEY) || 'null');
    filialAtual.value = filiais.value.find(f => f.cliente_pk === savedFilial?.cliente_pk)
                      || filiais.value[0]
                      || null;
    tela.value = 'portal';
    carregarDados();
    iniciarPush();
  } catch {
    localStorage.removeItem(EC_SESSAO_KEY);
  } finally {
    validandoSessao.value = false;
  }

  document.addEventListener('click', fecharDropFilial);
});

onUnmounted(() => {
  document.removeEventListener('click', fecharDropFilial);
});

function fecharDropFilial(e) {
  if (filialDropRef.value && !filialDropRef.value.contains(e.target)) {
    filialDropOpen.value = false;
  }
}

function focarTelefone() { inputTelefone.value?.focus(); }

function mascaraTelefone(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 6)      v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  else if (v.length)     v = `(${v}`;
  form.value.telefone = v;
}

function validar() {
  erros.value = { email: '', telefone: '' };
  let ok = true;
  if (!form.value.email?.trim()) {
    erros.value.email = 'Informe seu e-mail.'; ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    erros.value.email = 'E-mail inválido.'; ok = false;
  }
  if (!form.value.telefone?.replace(/\D/g, '')) {
    erros.value.telefone = 'Informe seu telefone.'; ok = false;
  }
  return ok;
}

async function entrar() {
  erroGeral.value = '';
  if (!validar()) return;
  entrando.value = true;
  try {
    const { data } = await axios.post('/api/espaco-cliente/login', {
      email:    form.value.email.trim().toLowerCase(),
      telefone: form.value.telefone.replace(/\D/g, ''),
    });
    localStorage.setItem(EC_SESSAO_KEY, data.sessao_token);
    sessao.value  = data.cliente;
    filiais.value = data.filiais || [];

    if (filiais.value.length > 1) {
      tela.value = 'filial';
    } else {
      filialAtual.value = filiais.value[0] || null;
      localStorage.setItem(EC_FILIAL_KEY, JSON.stringify(filialAtual.value));
      tela.value = 'portal';
      carregarDados();
      iniciarPush();
    }
  } catch (e) {
    const status = e.response?.status;
    erroGeral.value = (status === 401 || status === 404)
      ? 'E-mail ou telefone não encontrado. Verifique seus dados.'
      : (e.response?.data?.erro || 'Erro ao verificar. Tente novamente.');
  } finally {
    entrando.value = false;
  }
}

function selecionarFilial(f) {
  filialAtual.value = f;
  localStorage.setItem(EC_FILIAL_KEY, JSON.stringify(f));
  tela.value = 'portal';
  carregarDados();
  iniciarPush();
}

function trocarFilial(f) {
  filialDropOpen.value = false;
  filialAtual.value    = f;
  localStorage.setItem(EC_FILIAL_KEY, JSON.stringify(f));
  carregarDados();
}

function carregarDados() {
  vendas.value  = [];
  pedidos.value = [];
  erroVendas.value      = '';
  paginaVendas.value    = 1;
  paginaPedidos.value   = 1;
  paginaCrediarios.value = 1;
  expandido.value     = null;
  carregarVendas();
  carregarPedidos();
}

async function carregarVendas() {
  carregandoVendas.value = true;
  erroVendas.value = '';
  try {
    const { data } = await axios.get('/api/espaco-cliente/vendas', { headers: ecHeaders() });
    vendas.value = data.data || [];
  } catch (e) {
    console.error('[EC] carregarVendas', e.response?.status, e.response?.data, e.message);
    erroVendas.value = e.response?.data?.erro || `Erro ${e.response?.status || ''}: ${e.message}`;
    vendas.value = [];
  } finally {
    carregandoVendas.value = false;
  }
}

async function carregarPedidos() {
  carregandoPedidos.value = true;
  try {
    const { data } = await axios.get('/api/espaco-cliente/pedidos', { headers: ecHeaders() });
    pedidos.value = data.data || [];
  } catch { pedidos.value = []; }
  finally { carregandoPedidos.value = false; }
}

async function abrirCatalogo(p) {
  if (!p.catalogo_token) return;
  abrindoCatalogo.value = p.pk;
  try {
    const { data } = await axios.post('/api/espaco-cliente/catalogo-login',
      { catalogo_token: p.catalogo_token },
      { headers: ecHeaders() }
    );
    localStorage.setItem(`cl_sessao_${p.catalogo_token}`, data.sessao_token);
    window.open(`/catalogo/${p.catalogo_token}`, '_blank');
  } catch {
    window.open(`/catalogo/${p.catalogo_token}`, '_blank');
  } finally {
    abrindoCatalogo.value = null;
  }
}

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function iniciarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const perm = Notification.permission;
  if (perm === 'denied') return;
  if (perm === 'granted') {
    await registrarSubscricao();
    return;
  }
  const dispensado = localStorage.getItem(EC_PUSH_KEY);
  if (dispensado && Date.now() - Number(dispensado) < 7 * 24 * 60 * 60 * 1000) return;
  mostrarBannerPush.value = true;
}

async function registrarSubscricao() {
  try {
    const { data: kd } = await axios.get('/api/espaco-cliente/vapid-public-key');
    // SW já registrado pelo main.js — só aguarda ficar pronto
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(kd.key),
    });
    await axios.post('/api/espaco-cliente/push-subscribe', sub.toJSON(), { headers: ecHeaders() });
    // Verifica crediários vencendo amanhã (não-bloqueante)
    axios.get('/api/espaco-cliente/push-check-crediarios', { headers: ecHeaders() }).catch(() => {});
  } catch (e) {
    console.warn('[EC] push subscribe falhou:', e.message);
  }
}

async function ativarPush() {
  ativandoPush.value = true;
  try {
    const perm = await Notification.requestPermission();
    mostrarBannerPush.value = false;
    if (perm === 'granted') {
      await registrarSubscricao();
    } else {
      localStorage.setItem(EC_PUSH_KEY, String(Date.now()));
    }
  } finally {
    ativandoPush.value = false;
  }
}

function dispensarPush() {
  mostrarBannerPush.value = false;
  localStorage.setItem(EC_PUSH_KEY, String(Date.now()));
}

async function verNfce(venda) {
  abrindoDanfe.value = venda.pk;
  try {
    const resp = await axios.get(`/api/espaco-cliente/danfe/${venda.pk}`, {
      headers: ecHeaders(),
      responseType: 'text',
    });
    const blob = new Blob([resp.data], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    alert('Não foi possível carregar a NFC-e. Tente novamente.');
    console.error('[EC] verNfce', e.message);
  } finally {
    abrindoDanfe.value = null;
  }
}

function valorCrediario(v) {
  const soma = (v.pagamentos || [])
    .filter(p => String(p.forma).toLowerCase() === 'crediario')
    .reduce((s, p) => s + Number(p.valor || 0), 0);
  return soma > 0 ? soma : Number(v.total || 0);
}

function statusCrediarioLabel(v) {
  if (v.status_crediario === 'recebido') return 'Recebido';
  const hoje = new Date().toISOString().slice(0, 10);
  if (v.data_vencimento_crediario && v.data_vencimento_crediario < hoje) return 'Vencido';
  return 'Pendente';
}

function badgeCrediario(v) {
  if (v.status_crediario === 'recebido') return 'verde';
  const hoje = new Date().toISOString().slice(0, 10);
  if (v.data_vencimento_crediario && v.data_vencimento_crediario < hoje) return 'vermelho';
  return 'cinza';
}

function trocarAba(nova) { aba.value = nova; expandido.value = null; paginaVendas.value = 1; paginaPedidos.value = 1; paginaCrediarios.value = 1; }
function toggleExpand(id) { expandido.value = expandido.value === id ? null : id; }

function sair() {
  localStorage.removeItem(EC_SESSAO_KEY);
  localStorage.removeItem(EC_FILIAL_KEY);
  sessao.value = null; filiais.value = []; filialAtual.value = null;
  vendas.value = []; pedidos.value = [];
  tela.value = 'login';
}

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function fmtBrl(v) { return brlFmt.format(Number(v) || 0); }
function fmtData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDataSimples(s) { return s ? s.split('-').reverse().join('/') : ''; }

function tipoLabel(t) {
  return { venda: 'Venda', locacao: 'Locação', orcamento: 'Orçamento', crediario: 'Crediário' }[t] || t || '';
}
function statusVendaLabel(s) {
  return { finalizada: 'Finalizada', aguardando: 'Aguardando', cancelada: 'Cancelada',
           em_separacao: 'Em separação', entregue: 'Entregue', devolvida: 'Devolvida' }[s] || s || '—';
}
function badgeVenda(s) {
  if (['finalizada','entregue'].includes(s)) return 'verde';
  if (['cancelada','devolvida'].includes(s))  return 'vermelho';
  if (s === 'em_separacao')                  return 'roxo';
  return 'cinza';
}
function statusPedidoLabel(s) {
  return { aguardando: 'Aguardando', orcamento_enviado: 'Orçamento enviado',
           aprovado: 'Aprovado', retirado: 'Retirado', cancelado: 'Cancelado' }[s] || s || '—';
}
function badgePedido(s) {
  if (['aprovado','retirado'].includes(s))   return 'verde';
  if (s === 'cancelado')                     return 'vermelho';
  if (s === 'orcamento_enviado')             return 'azul';
  return 'cinza';
}
</script>

<style scoped>
/* ── Variáveis por tema ── */
.ec-root {
  --ec-bg:           #07080d;
  --ec-card-bg:      rgba(255,255,255,.04);
  --ec-card-border:  rgba(255,255,255,.09);
  --ec-card-shadow:  0 24px 64px rgba(0,0,0,.5);
  --ec-text1:        #fff;
  --ec-text2:        rgba(255,255,255,.45);
  --ec-text3:        rgba(255,255,255,.25);
  --ec-border:       rgba(255,255,255,.08);
  --ec-inp-bg:       rgba(255,255,255,.06);
  --ec-inp-border:   rgba(255,255,255,.1);
  --ec-inp-text:     #fff;
  --ec-inp-fill:     #fff;
  --ec-placeholder:  rgba(255,255,255,.25);
  --ec-label-color:  rgba(255,255,255,.45);
  --ec-header-bg:    rgba(7,8,13,.88);
  --ec-header-bdr:   rgba(255,255,255,.07);
  --ec-tab-bg:       rgba(255,255,255,.03);
  --ec-tab-border:   rgba(255,255,255,.07);
  --ec-tab-active:   rgba(99,102,241,.2);
  --ec-tab-text:     rgba(255,255,255,.4);
  --ec-tab-active-text: #a5b4fc;
  --ec-item-bg:      rgba(255,255,255,.03);
  --ec-item-border:  rgba(255,255,255,.08);
  --ec-item-hover:   rgba(99,102,241,.12);
  --ec-body-bdr:     rgba(255,255,255,.06);
  --ec-section-clr:  rgba(255,255,255,.3);
  --ec-item-text:    rgba(255,255,255,.75);
  --ec-muted:        rgba(255,255,255,.35);
  --ec-glow-op:      .35;
  --ec-grid-clr:     rgba(99,102,241,.04);
  --ec-logo-filter:  brightness(0) invert(1);
  --ec-btn-sair-bg:  rgba(255,255,255,.06);
  --ec-btn-sair-bdr: rgba(255,255,255,.1);
  --ec-btn-sair-clr: rgba(255,255,255,.6);
  --ec-drop-bg:      #111827;
  --ec-drop-border:  rgba(255,255,255,.1);
}
.ec-root.light {
  --ec-bg:           #f1f5f9;
  --ec-card-bg:      #fff;
  --ec-card-border:  #e2e8f0;
  --ec-card-shadow:  0 4px 24px rgba(0,0,0,.06);
  --ec-text1:        #1e293b;
  --ec-text2:        #64748b;
  --ec-text3:        #94a3b8;
  --ec-border:       #e2e8f0;
  --ec-inp-bg:       #f8fafc;
  --ec-inp-border:   #cbd5e1;
  --ec-inp-text:     #1e293b;
  --ec-inp-fill:     #1e293b;
  --ec-placeholder:  #94a3b8;
  --ec-label-color:  #64748b;
  --ec-header-bg:    rgba(255,255,255,.92);
  --ec-header-bdr:   #e2e8f0;
  --ec-tab-bg:       #f1f5f9;
  --ec-tab-border:   #e2e8f0;
  --ec-tab-active:   rgba(99,102,241,.1);
  --ec-tab-text:     #64748b;
  --ec-tab-active-text: #4f46e5;
  --ec-item-bg:      #fff;
  --ec-item-border:  #e2e8f0;
  --ec-item-hover:   rgba(99,102,241,.06);
  --ec-body-bdr:     #f1f5f9;
  --ec-section-clr:  #94a3b8;
  --ec-item-text:    #475569;
  --ec-muted:        #94a3b8;
  --ec-glow-op:      .07;
  --ec-grid-clr:     rgba(99,102,241,.05);
  --ec-logo-filter:  none;
  --ec-btn-sair-bg:  #f1f5f9;
  --ec-btn-sair-bdr: #e2e8f0;
  --ec-btn-sair-clr: #475569;
  --ec-drop-bg:      #fff;
  --ec-drop-border:  #e2e8f0;
}

/* ── Base ── */
.ec-root {
  min-height: 100dvh;
  background: var(--ec-bg);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  color: var(--ec-text1);
  position: relative;
  transition: background .2s, color .2s;
}
.ec-root:not(.ec-portal) {
  display: flex; align-items: center; justify-content: center;
  padding: 24px 16px 48px; height: 100dvh; overflow-y: auto;
}
.ec-root.ec-portal {
  height: 100dvh; overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* ── Fundo ── */
.ec-bg { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
.ec-glow {
  position: absolute; border-radius: 50%;
  filter: blur(80px); opacity: var(--ec-glow-op);
  animation: drift 12s ease-in-out infinite alternate;
}
.ec-glow--a { width: 500px; height: 500px; background: radial-gradient(circle, #6366f1 0%, transparent 70%); top: -120px; left: -100px; animation-duration: 14s; }
.ec-glow--b { width: 380px; height: 380px; background: radial-gradient(circle, #4f46e5 0%, transparent 70%); bottom: -80px; right: -80px; animation-duration: 10s; animation-direction: alternate-reverse; }
@keyframes drift {
  from { transform: translate(0,0) scale(1); }
  to   { transform: translate(30px,20px) scale(1.08); }
}
.ec-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(var(--ec-grid-clr) 1px, transparent 1px), linear-gradient(90deg, var(--ec-grid-clr) 1px, transparent 1px);
  background-size: 44px 44px;
}

/* ── Wrap login / filial ── */
.ec-wrap {
  position: relative; z-index: 1;
  width: 100%; max-width: 420px;
  display: flex; flex-direction: column; gap: 28px;
  animation: fadeUp .45s cubic-bezier(.22,.68,0,1.2) both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Brand ── */
.ec-brand { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.ec-logo  { height: 40px; object-fit: contain; filter: var(--ec-logo-filter); opacity: .9; }
.ec-divider { width: 32px; height: 1px; background: linear-gradient(90deg, transparent, rgba(99,102,241,.6), transparent); margin: 4px 0; }
.ec-tag-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .18em; color: rgba(99,102,241,.8); }
.ec-titulo { font-size: clamp(22px,5vw,28px); font-weight: 900; color: var(--ec-text1); margin: 0; letter-spacing: -.4px; text-shadow: 0 0 40px rgba(99,102,241,.3); }
.ec-subtitulo { font-size: 13px; color: var(--ec-text2); margin: 0; }

/* ── Card ── */
.ec-card {
  background: var(--ec-card-bg); border: 1px solid var(--ec-card-border);
  border-radius: 20px; padding: 28px 24px 24px; backdrop-filter: blur(20px);
  box-shadow: var(--ec-card-shadow); display: flex; flex-direction: column; gap: 20px;
}
.ec-card-header { display: flex; align-items: center; gap: 14px; }
.ec-card-ico {
  width: 44px; height: 44px; background: rgba(99,102,241,.15); border: 1px solid rgba(99,102,241,.25);
  border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ec-card-ico .material-symbols-outlined { font-size: 22px; color: #818cf8; }
.ec-card-title { font-size: 17px; font-weight: 800; color: var(--ec-text1); margin: 0 0 2px; }
.ec-card-sub   { font-size: 12px; color: var(--ec-text2); margin: 0; }

/* ── Form ── */
.ec-form { display: flex; flex-direction: column; gap: 14px; }
.ec-field { display: flex; flex-direction: column; gap: 6px; }
.ec-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--ec-label-color); }
.ec-input-wrap { position: relative; display: flex; align-items: center; }
.ec-input-ico  { position: absolute; left: 13px; font-size: 18px; color: var(--ec-text2); pointer-events: none; }
.ec-input {
  width: 100%; padding: 13px 14px 13px 44px; background: var(--ec-inp-bg);
  border: 1px solid var(--ec-inp-border); border-radius: 12px;
  color: var(--ec-inp-text); -webkit-text-fill-color: var(--ec-inp-fill);
  font-size: 15px; font-family: inherit; outline: none; transition: border-color .2s, background .2s, box-shadow .2s;
}
.ec-input::placeholder { color: var(--ec-placeholder); }
.ec-input:focus { border-color: rgba(99,102,241,.6); background: rgba(99,102,241,.07); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
.ec-field.error .ec-input { border-color: rgba(248,113,113,.5); }
.ec-err { font-size: 11px; color: #fca5a5; }
.ec-erro-geral {
  display: flex; align-items: flex-start; gap: 8px; padding: 11px 14px;
  background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2);
  border-radius: 10px; font-size: 13px; color: #fca5a5; line-height: 1.4;
}
.ec-erro-geral .material-symbols-outlined { font-size: 17px; flex-shrink: 0; }

.ec-btn-primary {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 15px; background: #6366f1; border: none; border-radius: 12px;
  color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit;
  transition: transform .15s, box-shadow .15s, opacity .15s;
  box-shadow: 0 4px 20px rgba(99,102,241,.4); margin-top: 4px;
}
.ec-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(99,102,241,.5); }
.ec-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.ec-btn-primary .material-symbols-outlined { font-size: 20px; }
.ec-rodape { text-align: center; font-size: 12px; color: var(--ec-text3); margin: 0; }
.ec-link { color: rgba(99,102,241,.7); cursor: pointer; }

/* ── Seleção de filial ── */
.ec-filial-lista { display: flex; flex-direction: column; gap: 8px; }
.ec-filial-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; background: var(--ec-inp-bg); border: 1px solid var(--ec-inp-border);
  border-radius: 12px; cursor: pointer; text-align: left; font-family: inherit;
  color: var(--ec-text1); font-size: 14px; font-weight: 600; transition: all .15s;
}
.ec-filial-item:hover { border-color: rgba(99,102,241,.4); background: rgba(99,102,241,.08); }
.ec-filial-ico { width: 36px; height: 36px; background: rgba(99,102,241,.15); border-radius: 9px; display: flex; align-items: center; justify-content: center; }
.ec-filial-ico .material-symbols-outlined { font-size: 20px; color: #818cf8; }
.ec-filial-nome { flex: 1; }
.ec-filial-seta { font-size: 20px; color: var(--ec-text2); }

/* ── Botão tema ── */
.ec-tema-btn {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  background: var(--ec-btn-sair-bg); border: 1px solid var(--ec-btn-sair-bdr);
  border-radius: 9px; cursor: pointer; color: var(--ec-text2); transition: all .15s;
}
.ec-tema-btn:hover { color: var(--ec-text1); background: var(--ec-btn-sair-bdr); }
.ec-tema-btn .material-symbols-outlined { font-size: 18px; }
.ec-tema-btn--login { position: fixed; top: 16px; right: 16px; z-index: 100; }

/* ── Portal header ── */
.ec-header {
  position: sticky; top: 0; z-index: 100;
  background: var(--ec-header-bg); border-bottom: 1px solid var(--ec-header-bdr);
  backdrop-filter: blur(16px);
}
.ec-header-inner {
  max-width: 800px; margin: 0 auto; padding: 12px 20px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.ec-header-brand { display: flex; align-items: center; gap: 12px; }
.ec-header-logo  { height: 30px; object-fit: contain; filter: var(--ec-logo-filter); opacity: .85; }
.ec-header-info  { display: flex; flex-direction: column; }
.ec-header-tag   { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: rgba(99,102,241,.7); }
.ec-header-nome  { font-size: 13px; font-weight: 700; color: var(--ec-text1); }
.ec-header-acoes { display: flex; align-items: center; gap: 8px; }

/* ── Seletor de filial no header ── */
.ec-filial-sel { position: relative; }
.ec-filial-sel-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 12px; background: var(--ec-btn-sair-bg); border: 1px solid var(--ec-btn-sair-bdr);
  border-radius: 9px; cursor: pointer; color: var(--ec-text2); font-size: 12px; font-weight: 600;
  font-family: inherit; transition: all .15s; white-space: nowrap;
}
.ec-filial-sel-btn:hover { color: var(--ec-text1); background: var(--ec-btn-sair-bdr); }
.ec-filial-drop {
  position: absolute; top: calc(100% + 6px); right: 0; min-width: 180px;
  background: var(--ec-drop-bg); border: 1px solid var(--ec-drop-border);
  border-radius: 12px; padding: 6px; box-shadow: 0 8px 32px rgba(0,0,0,.2); z-index: 200;
}
.ec-filial-drop-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 9px 12px; background: none; border: none; border-radius: 8px;
  cursor: pointer; font-size: 13px; font-weight: 600; color: var(--ec-text1); font-family: inherit; transition: background .12s;
}
.ec-filial-drop-item:hover { background: rgba(99,102,241,.1); }
.ec-filial-drop-item.active { color: #6366f1; }

.ec-btn-sair {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px;
  background: var(--ec-btn-sair-bg); border: 1px solid var(--ec-btn-sair-bdr);
  border-radius: 9px; color: var(--ec-btn-sair-clr); font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.ec-btn-sair:hover { background: var(--ec-btn-sair-bdr); color: var(--ec-text1); }
.ec-btn-sair .material-symbols-outlined { font-size: 16px; }
.ec-btn-sair-txt { display: none; }

/* ── Portal main ── */
.ec-main { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; padding: 24px 16px 60px; }

/* ── Tabs ── */
.ec-tabs {
  display: flex; gap: 6px; margin-bottom: 20px;
  background: var(--ec-tab-bg); border: 1px solid var(--ec-tab-border);
  border-radius: 14px; padding: 5px;
}
.ec-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 12px; background: transparent; border: none; cursor: pointer;
  border-radius: 10px; font-size: 14px; font-weight: 600; color: var(--ec-tab-text);
  font-family: inherit; transition: all .18s;
}
.ec-tab .material-symbols-outlined { font-size: 18px; }
.ec-tab.active { background: var(--ec-tab-active); color: var(--ec-tab-active-text); }
.ec-tab-badge { background: rgba(99,102,241,.25); color: #c7d2fe; font-size: 11px; font-weight: 700; border-radius: 20px; padding: 1px 7px; }

/* ── Lista ── */
.ec-lista { display: flex; flex-direction: column; gap: 10px; }
.ec-item {
  background: var(--ec-item-bg); border: 1px solid var(--ec-item-border);
  border-radius: 14px; overflow: hidden; transition: border-color .18s;
}
.ec-item:hover { border-color: rgba(99,102,241,.2); }
.ec-item.expanded { border-color: rgba(99,102,241,.35); }

.ec-item-header {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 14px 16px; cursor: pointer; user-select: none;
}
.ec-item-left  { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.ec-item-num   { font-size: 14px; font-weight: 800; color: var(--ec-text1); }
.ec-item-data  { font-size: 12px; color: var(--ec-text2); }
.ec-item-tipo  { font-size: 11px; color: rgba(99,102,241,.7); font-weight: 600; }
.ec-item-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.ec-item-total { font-size: 15px; font-weight: 800; color: var(--ec-text1); white-space: nowrap; }
.ec-expand-ico { font-size: 20px; color: var(--ec-text2); }

/* ── Badge ── */
.ec-badge {
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap;
}
.ec-badge.verde    { background: rgba(34,197,94,.12);  color: #22c55e; border: 1px solid rgba(34,197,94,.25); }
.ec-badge.vermelho { background: rgba(239,68,68,.12);  color: #ef4444; border: 1px solid rgba(239,68,68,.25); }
.ec-badge.azul     { background: rgba(59,130,246,.12); color: #3b82f6; border: 1px solid rgba(59,130,246,.25); }
.ec-badge.roxo     { background: rgba(139,92,246,.12); color: #8b5cf6; border: 1px solid rgba(139,92,246,.25); }
.ec-badge.cinza    { background: var(--ec-border); color: var(--ec-text2); border: 1px solid var(--ec-border); }

/* ── Corpo expandido ── */
.ec-item-body { padding: 0 16px 16px; border-top: 1px solid var(--ec-body-bdr); animation: fadeIn .18s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

.ec-section { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--ec-section-clr); margin: 14px 0 8px; }
.ec-itens   { display: flex; flex-direction: column; gap: 6px; }
.ec-it-row  { display: flex; align-items: baseline; gap: 8px; font-size: 13px; color: var(--ec-item-text); }
.ec-it-desc { flex: 1; min-width: 0; }
.ec-it-qtd  { font-weight: 700; color: var(--ec-text2); white-space: nowrap; }
.ec-it-val  { font-weight: 700; color: #6366f1; white-space: nowrap; }
.ec-muted   { font-size: 12px; color: var(--ec-muted); margin: 4px 0; }

.ec-pagamentos { display: flex; flex-direction: column; gap: 4px; }
.ec-pg-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--ec-item-text); }
.ec-pg-val { font-weight: 700; color: #22c55e; }

.ec-catalogo-link {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin: 14px 0 10px; padding: 10px 12px;
  background: rgba(99,102,241,.07); border: 1px solid rgba(99,102,241,.18); border-radius: 10px;
  font-size: 13px; color: var(--ec-text2);
}
.ec-catalogo-nome { flex: 1; font-weight: 600; color: var(--ec-text1); }
.ec-btn-catalogo {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; background: rgba(99,102,241,.15); border: 1px solid rgba(99,102,241,.3);
  border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700; color: #818cf8;
  font-family: inherit; transition: all .15s; white-space: nowrap;
}
.ec-btn-catalogo:hover:not(:disabled) { background: rgba(99,102,241,.25); }
.ec-btn-catalogo:disabled { opacity: .5; cursor: not-allowed; }

.ec-obs     { display: flex; gap: 6px; margin-top: 10px; font-size: 13px; color: var(--ec-text2); line-height: 1.5; }
.ec-obs-orc { display: flex; gap: 6px; margin-top: 6px; font-size: 13px; color: rgba(99,102,241,.7); font-weight: 600; }
.ec-extra-info { margin-top: 10px; font-size: 12px; color: rgba(99,102,241,.65); font-weight: 600; }

/* ── NFC-e na venda ── */
.ec-nfce-box {
  margin-top: 12px; padding: 10px 14px;
  background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.2);
  border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  flex-wrap: wrap;
}
.ec-nfce-info {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #4ade80; font-weight: 600;
}
.ec-btn-nfce {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(34,197,94,.35);
  background: rgba(34,197,94,.1); color: #4ade80;
  font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all .15s; white-space: nowrap;
}
.ec-btn-nfce:hover:not(:disabled) { background: rgba(34,197,94,.2); border-color: rgba(34,197,94,.5); }
.ec-btn-nfce:disabled { opacity: .5; cursor: not-allowed; }
.ec-root.light .ec-nfce-info { color: #16a34a; }
.ec-root.light .ec-btn-nfce { color: #16a34a; border-color: rgba(22,163,74,.35); background: rgba(22,163,74,.08); }
.ec-root.light .ec-btn-nfce:hover:not(:disabled) { background: rgba(22,163,74,.15); }

.ec-totais { margin-top: 12px; border-top: 1px solid var(--ec-body-bdr); padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.ec-total-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--ec-text2); }
.ec-total-row.bold { font-size: 15px; font-weight: 800; color: var(--ec-text1); }

/* ── Spinner ── */
.ec-spinner {
  display: inline-block; width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite;
}
.ec-spinner.sm { width: 13px; height: 13px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Loading / Vazio ── */
.ec-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 4rem; color: var(--ec-text2); }
.ec-vazio   { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--ec-text2); padding: 4rem 1rem; }
.ec-spin    { width: 26px; height: 26px; border: 3px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }

/* ── Erro ── */
.ec-erro-box {
  display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;
  padding: 16px 18px; background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.2); border-radius: 12px;
  font-size: 13px; color: #ef4444;
}
.ec-erro-box .material-symbols-outlined { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
.ec-erro-box div { flex: 1; }
.ec-erro-box strong { display: block; font-weight: 700; margin-bottom: 2px; }
.ec-erro-box p { margin: 0; opacity: .75; font-size: 12px; word-break: break-all; }
.ec-btn-retry {
  display: flex; align-items: center; gap: 5px; padding: 6px 14px;
  background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.25);
  border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 700;
  color: #ef4444; font-family: inherit; white-space: nowrap; transition: background .15s;
}
.ec-btn-retry:hover { background: rgba(239,68,68,.2); }

/* ── Paginação ── */
.ec-paginacao {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-top: 16px; padding-top: 14px;
  border-top: 1px solid var(--ec-body-bdr);
}
.ec-pg-btn {
  width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
  background: var(--ec-item-bg); border: 1px solid var(--ec-item-border);
  border-radius: 9px; cursor: pointer; color: var(--ec-text2); transition: all .15s;
}
.ec-pg-btn:hover:not(:disabled) { border-color: rgba(99,102,241,.4); color: #6366f1; background: rgba(99,102,241,.08); }
.ec-pg-btn:disabled { opacity: .3; cursor: default; }
.ec-pg-btn .material-symbols-outlined { font-size: 20px; }
.ec-pg-info { font-size: 13px; font-weight: 700; color: var(--ec-text2); min-width: 50px; text-align: center; }

/* ── Spinner de validação de sessão ── */
.ec-validando-wrap {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  color: rgba(255,255,255,.5);
}
.ec-root.light .ec-validando-wrap { color: var(--ec-text2); }

/* ── Spinner de loading → override para light ── */
.ec-root.light .ec-spinner { border-color: rgba(99,102,241,.25); border-top-color: #6366f1; }

/* ── Tab badge ── */
.ec-root.light .ec-tab-badge { background: rgba(99,102,241,.15); color: #4f46e5; }

/* ── Erros de formulário ── */
.ec-root.light .ec-err { color: #dc2626; }
.ec-root.light .ec-erro-geral { color: #b91c1c; }

/* ── Topbar sempre escura ── */
.ec-root.light .ec-header {
  background: rgba(15,23,42,.96) !important;
  border-bottom-color: rgba(255,255,255,.08) !important;
}
.ec-root.light .ec-header-tag  { color: rgba(165,180,252,.75); }
.ec-root.light .ec-header-nome { color: #f1f5f9; }
.ec-root.light .ec-header-logo { filter: brightness(0) invert(1); opacity: .85; }
.ec-root.light .ec-filial-sel-btn {
  background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.75);
}
.ec-root.light .ec-filial-sel-btn .material-symbols-outlined { color: rgba(255,255,255,.6); }
.ec-root.light .ec-filial-sel-btn:hover { background: rgba(255,255,255,.12); color: #fff; }
.ec-root.light .ec-filial-drop {
  background: #1e293b; border-color: rgba(255,255,255,.1);
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
}
.ec-root.light .ec-filial-drop-item { color: #e2e8f0; }
.ec-root.light .ec-filial-drop-item:hover { background: rgba(255,255,255,.08); }
.ec-root.light .ec-filial-drop-item.active { color: #a5b4fc; }
.ec-root.light .ec-btn-sair {
  background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.7);
}
.ec-root.light .ec-btn-sair:hover { background: rgba(255,255,255,.12); color: #fff; }
.ec-root.light .ec-btn-sair .material-symbols-outlined { color: rgba(255,255,255,.6); }
.ec-root.light .ec-tema-btn {
  background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.7);
}
.ec-root.light .ec-tema-btn:hover { background: rgba(255,255,255,.12); color: #fff; }

/* ── Banner push ── */
.ec-push-banner {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 18px; padding: 14px 16px;
  background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.25);
  border-radius: 14px;
}
.ec-push-ico { font-size: 22px; color: #818cf8; flex-shrink: 0; }
.ec-push-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ec-push-txt strong { font-size: 13px; font-weight: 700; color: var(--ec-text1); }
.ec-push-txt span   { font-size: 12px; color: var(--ec-text2); }
.ec-push-btn-ativar {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 9px;
  background: #6366f1; border: none; color: #fff;
  font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: background .15s; white-space: nowrap; flex-shrink: 0;
}
.ec-push-btn-ativar:hover:not(:disabled) { background: #4f46e5; }
.ec-push-btn-ativar:disabled { opacity: .5; cursor: not-allowed; }
.ec-push-btn-fechar {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: none; border: none; color: var(--ec-text2); cursor: pointer;
  border-radius: 7px; transition: background .12s; flex-shrink: 0;
}
.ec-push-btn-fechar:hover { background: rgba(99,102,241,.1); color: var(--ec-text1); }

/* Transição slide do banner */
.ec-slide-enter-active, .ec-slide-leave-active { transition: all .25s ease; }
.ec-slide-enter-from, .ec-slide-leave-to { opacity: 0; transform: translateY(-10px); max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }

/* ── Responsive ── */
@media (min-width: 640px) {
  .ec-wrap { max-width: 480px; gap: 32px; }
  .ec-card { padding: 36px 32px 30px; }
  .ec-main { padding: 32px 24px 60px; }
  .ec-item-header { padding: 16px 20px; }
  .ec-item-body   { padding: 0 20px 20px; }
  .ec-btn-sair-txt { display: inline; }
  .ec-header-inner { padding: 14px 24px; }
}

@media (max-width: 480px) {
  .ec-badge { font-size: 10px; padding: 2px 8px; }
  .ec-item-total { font-size: 13px; }
  .ec-tab { font-size: 13px; padding: 9px 8px; gap: 5px; }
  .ec-tab .material-symbols-outlined { font-size: 16px; }
}
</style>
