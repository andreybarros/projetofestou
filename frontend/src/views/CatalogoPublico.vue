<template>
  <div :class="['cp-page', { 'cp-dark': tema === 'dark' }]">

    <div v-if="carregando" class="cp-loading">
      <div class="cp-spin"></div>
      <p>Carregando catálogo…</p>
    </div>

    <div v-else-if="erro" class="cp-erro">
      <span class="cp-erro-ico">😕</span>
      <h2>{{ erro }}</h2>
      <p>Verifique o link ou entre em contato com a loja.</p>
    </div>

    <!-- Tela de login (exibida antes do catálogo se não autenticado) -->
    <Transition name="cl-fade">
      <CatalogoLogin
        v-if="!carregando && !erro && mostrarLogin"
        :catalogo="catalogo"
        :token="token"
        @loginOk="onLoginOk"
        @pular="mostrarLogin = false"
      />
    </Transition>

    <template v-if="!carregando && !erro && !mostrarLogin">

      <!-- Banner modo edição -->
      <div v-if="modoEditar" class="cp-subst-banner" style="background:#6366f1">
        <div class="cp-subst-banner-top">
          <span class="material-symbols-outlined">edit</span>
          <div class="cp-subst-banner-txt">
            <strong>Editando pedido</strong>
            <span>Adicione ou remova produtos do carrinho e clique em Salvar Alterações</span>
          </div>
          <button class="cp-subst-banner-cancel" @click="cancelarEdicao">
            <span class="material-symbols-outlined">close</span>
            Cancelar
          </button>
        </div>
      </div>

      <!-- Banner modo substituição -->
      <div v-if="modoSubstituir" class="cp-subst-banner">
        <div class="cp-subst-banner-top">
          <span class="material-symbols-outlined">swap_horiz</span>
          <div class="cp-subst-banner-txt">
            <strong>Selecione o produto substituto</strong>
            <span>Substituindo: {{ substProdNome }}</span>
          </div>
          <button class="cp-subst-banner-cancel" @click="router.push(`/catalogo/${token}/aprovacaoped/${substPedidoTk}`)">
            <span class="material-symbols-outlined">close</span>
            Cancelar
          </button>
        </div>
        <div class="cp-subst-banner-evento">
          <div class="cp-subst-campo">
            <label>Data do evento</label>
            <input v-model="substDataEvento" type="date" class="cp-subst-input" />
          </div>
          <div class="cp-subst-campo">
            <label>Horário</label>
            <input v-model="substHoraEvento" type="time" class="cp-subst-input" />
          </div>
        </div>
      </div>

      <!-- Header da loja -->
      <header class="cp-header">
        <div class="cp-header-inner">
          <img src="/img/logo_fundo_transp.png" alt="BarroStock" class="cp-logo" />
          <div class="cp-header-info">
            <h1 class="cp-catalogo-nome">{{ catalogo.nome }}</h1>
            <p v-if="catalogo.descricao" class="cp-catalogo-desc">{{ catalogo.descricao }}</p>
          </div>
          <!-- Cliente logado -->
          <div v-if="clienteLogado" class="cp-cliente-wrap" v-click-outside="() => menuCliente = false">
            <div class="cp-cliente-pill" @click="menuCliente = !menuCliente">
              <div class="cp-cliente-avatar">{{ clienteLogado.nome?.charAt(0)?.toUpperCase() }}</div>
              <span class="cp-cliente-nome">{{ clienteLogado.nome?.split(' ')[0] }}</span>
              <span class="material-symbols-outlined cp-cliente-chevron">expand_more</span>
            </div>
            <Transition name="cp-menu">
              <div v-if="menuCliente" class="cp-cliente-menu">
                <div class="cp-cliente-menu-info">
                  <div class="cp-cliente-menu-avatar">{{ clienteLogado.nome?.charAt(0)?.toUpperCase() }}</div>
                  <div>
                    <div class="cp-cliente-menu-nome">{{ clienteLogado.nome }}</div>
                    <div class="cp-cliente-menu-email">{{ clienteLogado.email }}</div>
                  </div>
                </div>
                <div class="cp-cliente-menu-divider"></div>
                <button class="cp-cliente-menu-sair" @click="sair">
                  <span class="material-symbols-outlined">logout</span>
                  Sair
                </button>
              </div>
            </Transition>
          </div>
          <button v-if="clienteLogado" class="cp-btn-meus-pedidos" @click="mostrarMeusPedidos = true">
            <span class="material-symbols-outlined">receipt_long</span>
            <span class="cp-btn-mp-txt">Meus Pedidos</span>
            <span v-if="qtdPendentes" class="cp-btn-mp-badge">{{ qtdPendentes }}</span>
          </button>
          <button v-else class="cp-btn-login" @click="mostrarLogin = true">
            <span class="material-symbols-outlined">person</span>
            Entrar
          </button>

          <button class="cp-cart-btn" @click="mostrarCarrinho = !mostrarCarrinho">
            <span class="material-symbols-outlined">shopping_bag</span>
            <span v-if="totalItens" class="cp-cart-badge">{{ totalItens }}</span>
          </button>

          <button class="cp-btn-tema" @click="alternarTema" :title="tema === 'dark' ? 'Modo claro' : 'Modo escuro'">
            <span class="material-symbols-outlined">{{ tema === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
          </button>
        </div>
      </header>

      <!-- Barra de busca abaixo do header -->
      <div class="cp-search-strip">
        <div class="cp-search-inner">
          <span class="material-symbols-outlined cp-s-ico">search</span>
          <input v-model="busca" type="search" class="cp-s-input" placeholder="Buscar produto…" />
          <button v-if="busca" class="cp-s-clear" @click="busca = ''">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div class="cp-body">
        <!-- Grid de produtos -->
        <main class="cp-produtos">
          <div v-if="!produtos.length" class="cp-vazio">
            <span style="font-size:48px">📦</span>
            <p>Nenhum produto disponível no momento.</p>
          </div>
          <div v-else class="cp-grid">
            <div v-for="p in produtosVisiveis" :key="p.pk" class="cp-card">
              <div class="cp-card-foto" :class="p.foto_url ? 'cp-card-foto--clicavel' : ''" @click.stop="p.foto_url && abrirFoto(p)">
                <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" loading="lazy" />
                <div v-else class="cp-card-avatar">{{ p.descricao?.charAt(0)?.toUpperCase() }}</div>
                <div v-if="p.foto_url" class="cp-foto-lupa">
                  <span class="material-symbols-outlined">zoom_in</span>
                </div>
              </div>
              <div class="cp-card-body">
                <div class="cp-card-nome">{{ p.descricao }}</div>
                <div v-if="p.codigo" class="cp-card-cod">Ref: {{ p.codigo }}</div>
              </div>
              <div class="cp-card-footer">
                <div v-if="!modoSubstituir" class="cp-qty-ctrl">
                  <button class="cp-qty-btn" @click="decrementar(p)">−</button>
                  <span class="cp-qty-val">{{ quantidade(p.pk) }}</span>
                  <button
                    class="cp-qty-btn"
                    :disabled="p.saldo != null && quantidade(p.pk) >= p.saldo"
                    @click="incrementar(p)"
                  >+</button>
                </div>
                <div class="cp-card-footer-right">
                  <!-- Modo substituição: qty própria + botão Substituir -->
                  <template v-if="modoSubstituir">
                    <div v-if="p.saldo !== 0" class="cp-subst-qty-row">
                      <div class="cp-qty-ctrl">
                        <button class="cp-qty-btn" @click.stop="substDec(p.pk)">−</button>
                        <span class="cp-qty-val">{{ substQtd(p.pk) }}</span>
                        <button class="cp-qty-btn" :disabled="p.saldo != null && substQtd(p.pk) >= p.saldo" @click.stop="substInc(p)">+</button>
                      </div>
                      <button
                        class="cp-add-btn cp-add-btn--subst"
                        :disabled="substituindoSubst"
                        @click.stop="confirmarSubstituto(p)"
                      >
                        <span class="material-symbols-outlined">swap_horiz</span>
                        Substituir
                      </button>
                    </div>
                    <button v-else class="cp-add-btn cp-add-btn--off" disabled>
                      <span class="material-symbols-outlined">block</span>
                      Indisponível
                    </button>
                  </template>
                  <!-- Modo normal / edição: carrinho padrão -->
                  <template v-else>
                    <button
                      :class="['cp-add-btn', noCarrinho(p.pk) ? 'cp-add-btn--in' : '', p.saldo === 0 ? 'cp-add-btn--off' : '']"
                      :disabled="p.saldo === 0"
                      @click="toggleCarrinho(p)"
                    >
                      <span class="material-symbols-outlined">
                        {{ p.saldo === 0 ? 'block' : noCarrinho(p.pk) ? 'check' : 'add_shopping_cart' }}
                      </span>
                      {{ p.saldo === 0 ? 'Indisponível' : noCarrinho(p.pk) ? 'Adicionado' : 'Adicionar' }}
                    </button>
                  </template>
                  <div v-if="p.saldo != null && p.saldo > 0" class="cp-saldo-hint">
                    {{ p.saldo }} disponível
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ver mais -->
          <div v-if="temMais" class="cp-ver-mais">
            <button class="cp-ver-mais-btn" @click="verMais">
              <span class="material-symbols-outlined">expand_more</span>
              Ver mais produtos ({{ produtos.length - visiveis }} restantes)
            </button>
          </div>
        </main>

        <!-- Sidebar do carrinho (desktop) -->
        <aside class="cp-sidebar">
          <div class="cp-sidebar-inner">
            <h3 class="cp-sidebar-title">
              <span class="material-symbols-outlined">shopping_bag</span>
              Meu Pedido
            </h3>
            <div v-if="!carrinho.length" class="cp-sidebar-vazio">
              Adicione produtos ao pedido
            </div>
            <div v-else class="cp-sidebar-itens">
              <div
                v-for="item in carrinho"
                :key="item.pk"
                :class="['cp-sidebar-item', produtosIndisponiveis.includes(item.pk) && 'cp-sidebar-item--indisp']"
              >
                <div class="cp-sidebar-item-info">
                  <span class="cp-sidebar-item-nome">{{ item.descricao }}</span>
                  <span v-if="produtosIndisponiveis.includes(item.pk)" class="cp-indisp-tag">Indisponível</span>
                  <span v-else class="cp-sidebar-item-qty">{{ item.quantidade }}×</span>
                </div>
                <button class="cp-sidebar-rem" @click="removerDoCarrinho(item.pk)">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div v-if="carrinho.length" class="cp-form">
              <h4 class="cp-form-title">Seus dados</h4>
              <div class="cp-form-field">
                <label>Nome *</label>
                <input v-model="form.nome" type="text" placeholder="Seu nome completo" class="cp-input" />
              </div>
              <div class="cp-form-field">
                <label>WhatsApp / Telefone</label>
                <input v-model="form.telefone" type="tel" placeholder="(92) 99999-9999" class="cp-input" />
              </div>
              <div class="cp-form-field">
                <label>E-mail *</label>
                <input v-model="form.email" type="email" placeholder="seu@email.com" class="cp-input" :class="{ 'cp-input--erro': formErro && !form.email?.trim() }" />
              </div>
              <div class="cp-form-row">
                <div class="cp-form-field">
                  <label>Data do Evento *</label>
                  <input v-model="form.data_evento" type="date" class="cp-input" :class="{ 'cp-input--erro': formErro && !form.data_evento }" />
                </div>
                <div class="cp-form-field">
                  <label>Horário do Evento</label>
                  <input v-model="form.hora_evento" type="time" class="cp-input" />
                </div>
              </div>
              <div class="cp-form-field">
                <label>Como prefere receber?</label>
                <div class="cp-radio-group">
                  <label class="cp-radio-opt" :class="{ active: form.tipo_entrega === 'retirada' }">
                    <input type="radio" v-model="form.tipo_entrega" value="retirada" />
                    <span class="material-symbols-outlined">store</span>
                    Retirar na loja
                  </label>
                  <label class="cp-radio-opt" :class="{ active: form.tipo_entrega === 'entrega' }">
                    <input type="radio" v-model="form.tipo_entrega" value="entrega" />
                    <span class="material-symbols-outlined">local_shipping</span>
                    Quero entrega
                  </label>
                </div>
              </div>
              <div v-if="form.tipo_entrega === 'entrega'" class="cp-form-field">
                <label>Endereço do Evento *</label>
                <input v-model="form.endereco_evento" type="text" class="cp-input" placeholder="Rua, número, bairro, cidade…" />
              </div>
              <div class="cp-form-field">
                <label>Observações</label>
                <textarea v-model="form.obs" class="cp-input cp-textarea" rows="2" placeholder="Detalhes adicionais…"></textarea>
              </div>
              <div v-if="formErro" class="cp-form-erro">{{ formErro }}</div>
              <button v-if="modoEditar" class="cp-enviar-btn" :disabled="editandoPedido" @click="salvarEdicao">
                <span v-if="editandoPedido" class="cp-spin-sm"></span>
                <span v-else class="material-symbols-outlined">save</span>
                {{ editandoPedido ? 'Salvando…' : 'Salvar Alterações' }}
              </button>
              <button v-else class="cp-enviar-btn" :disabled="enviando" @click="enviarPedido">
                <span v-if="enviando" class="cp-spin-sm"></span>
                <span v-else class="material-symbols-outlined">send</span>
                {{ enviando ? 'Enviando…' : 'Solicitar Orçamento' }}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <!-- Carrinho mobile (drawer) -->
      <Transition name="drawer">
        <div v-if="mostrarCarrinho" class="cp-drawer-overlay" @click.self="mostrarCarrinho = false">
          <div :class="['cp-drawer', { 'cp-drawer--dark': tema === 'dark' }]">
            <div class="cp-drawer-header">
              <h3>Meu Pedido</h3>
              <button @click="mostrarCarrinho = false" class="cp-drawer-close">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="cp-drawer-body">
              <div v-if="!carrinho.length" class="cp-sidebar-vazio">
                Adicione produtos ao pedido
              </div>
              <div v-else>
                <div
                  v-for="item in carrinho"
                  :key="item.pk"
                  :class="['cp-sidebar-item', produtosIndisponiveis.includes(item.pk) && 'cp-sidebar-item--indisp']"
                >
                  <div class="cp-sidebar-item-info">
                    <span class="cp-sidebar-item-nome">{{ item.descricao }}</span>
                    <span v-if="produtosIndisponiveis.includes(item.pk)" class="cp-indisp-tag">Indisponível</span>
                    <span v-else class="cp-sidebar-item-qty">{{ item.quantidade }}×</span>
                  </div>
                  <button class="cp-sidebar-rem" @click="removerDoCarrinho(item.pk)">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div class="cp-form" style="margin-top:16px">
                  <h4 class="cp-form-title">Seus dados</h4>
                  <div class="cp-form-field">
                    <label>Nome *</label>
                    <input v-model="form.nome" type="text" placeholder="Seu nome completo" class="cp-input" />
                  </div>
                  <div class="cp-form-field">
                    <label>WhatsApp / Telefone</label>
                    <input v-model="form.telefone" type="tel" placeholder="(92) 99999-9999" class="cp-input" />
                  </div>
                  <div class="cp-form-field">
                    <label>E-mail</label>
                    <input v-model="form.email" type="email" placeholder="seu@email.com" class="cp-input" />
                  </div>
                  <div class="cp-form-row">
                    <div class="cp-form-field">
                      <label>Data do Evento</label>
                      <input v-model="form.data_evento" type="date" class="cp-input" />
                    </div>
                    <div class="cp-form-field">
                      <label>Horário</label>
                      <input v-model="form.hora_evento" type="time" class="cp-input" />
                    </div>
                  </div>
                  <div class="cp-form-field">
                    <label>Como prefere receber?</label>
                    <div class="cp-radio-group">
                      <label class="cp-radio-opt" :class="{ active: form.tipo_entrega === 'retirada' }">
                        <input type="radio" v-model="form.tipo_entrega" value="retirada" />
                        <span class="material-symbols-outlined">store</span>
                        Retirar na loja
                      </label>
                      <label class="cp-radio-opt" :class="{ active: form.tipo_entrega === 'entrega' }">
                        <input type="radio" v-model="form.tipo_entrega" value="entrega" />
                        <span class="material-symbols-outlined">local_shipping</span>
                        Quero entrega
                      </label>
                    </div>
                  </div>
                  <div v-if="form.tipo_entrega === 'entrega'" class="cp-form-field">
                    <label>Endereço do Evento *</label>
                    <input v-model="form.endereco_evento" type="text" class="cp-input" placeholder="Rua, número, bairro…" />
                  </div>
                  <div class="cp-form-field">
                    <label>Observações</label>
                    <textarea v-model="form.obs" class="cp-input cp-textarea" rows="2" placeholder="Detalhes adicionais…"></textarea>
                  </div>
                  <div v-if="formErro" class="cp-form-erro">{{ formErro }}</div>
                  <button v-if="modoEditar" class="cp-enviar-btn" :disabled="editandoPedido" @click="salvarEdicao">
                    <span v-if="editandoPedido" class="cp-spin-sm"></span>
                    <span v-else class="material-symbols-outlined">save</span>
                    {{ editandoPedido ? 'Salvando…' : 'Salvar Alterações' }}
                  </button>
                  <button v-else class="cp-enviar-btn" :disabled="enviando" @click="enviarPedido">
                    <span v-if="enviando" class="cp-spin-sm"></span>
                    <span v-else class="material-symbols-outlined">send</span>
                    {{ enviando ? 'Enviando…' : 'Solicitar Orçamento' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Meus Pedidos drawer -->
      <Transition name="drawer">
        <MeusPedidosCatalogo
          v-if="mostrarMeusPedidos"
          :token="token"
          :sessao-token="sessaoToken"
          :catalogo="catalogo"
          :tema="tema"
          @fechar="mostrarMeusPedidos = false"
          @pedido-aprovado="onPedidoAprovado"
          @editar-pedido="iniciarEdicao"
        />
      </Transition>

      <!-- Lightbox foto -->
      <Transition name="fade">
        <div v-if="fotoLightbox" class="cp-lightbox" @click="fotoLightbox = null">
          <button class="cp-lightbox-close" @click="fotoLightbox = null">
            <span class="material-symbols-outlined">close</span>
          </button>
          <img :src="fotoLightbox.url" :alt="fotoLightbox.nome" class="cp-lightbox-img" @click.stop />
          <div class="cp-lightbox-nome">{{ fotoLightbox.nome }}</div>
        </div>
      </Transition>

      <!-- Tela de sucesso -->
      <Transition name="fade">
        <div v-if="enviado" class="cp-sucesso-overlay">
          <div class="cp-sucesso-box">
            <div class="cp-sucesso-ico">🎉</div>
            <h2>Pedido enviado!</h2>
            <p>Recebemos sua solicitação. Quando o orçamento estiver pronto, você poderá acompanhar e aprovar em <strong>Meus Pedidos</strong>.</p>
            <button class="cp-enviar-btn" style="margin-top:16px" @click="reiniciar">Fazer novo pedido</button>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import CatalogoLogin      from './CatalogoLogin.vue';
import MeusPedidosCatalogo from './MeusPedidosCatalogo.vue';

// Diretiva click-outside
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e); };
    document.addEventListener('click', el._clickOutside, true);
  },
  unmounted(el) { document.removeEventListener('click', el._clickOutside, true); },
};

const route   = useRoute();
const router  = useRouter();
const token   = route.params.token;

// Modo substituição
const modoSubstituir    = computed(() => route.query.modo === 'substituir');
const substItemPk       = computed(() => route.query.item);
const substPedidoTk     = computed(() => route.query.pedido);
const substProdNome     = computed(() => route.query.produto || '');
const substituindoSubst = ref(false);
const substDataEvento   = ref(route.query.data_evento || '');
const substHoraEvento   = ref(route.query.hora_evento || '');
// Quantidade por produto no modo substituição (pk → qty)
const substQtds = ref({});
function substQtd(pk) { return substQtds.value[pk] ?? 1; }
function substInc(p) {
  const max = p.saldo != null ? p.saldo : Infinity;
  const q   = substQtd(p.pk);
  if (q < max) substQtds.value[p.pk] = q + 1;
}
function substDec(pk) {
  const q = substQtd(pk);
  if (q > 1) substQtds.value[pk] = q - 1;
}

// Modo edição — controlado por refs locais (sem depender da URL)
const editModo         = ref(false);
const editPedidoTk     = ref('');
const modoEditar       = computed(() => editModo.value || route.query.modo === 'editar');
const editandoPedido   = ref(false);

const carregando      = ref(true);
const erro            = ref('');
const catalogo        = ref(null);
const mostrarLogin      = ref(false);
const mostrarMeusPedidos = ref(false);
const clienteLogado     = ref(null);   // { nome, email, pk }
const sessaoToken       = ref('');
const qtdPendentes      = ref(0);
const menuCliente       = ref(false);
const tema              = ref(localStorage.getItem('cp_tema') || 'light');

function alternarTema() {
  tema.value = tema.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('cp_tema', tema.value);
}

function onLoginOk({ cliente, sessaoToken: st }) {
  clienteLogado.value = cliente;
  sessaoToken.value   = st;
  mostrarLogin.value  = false;
  form.value.nome     = cliente.nome      || '';
  form.value.telefone = cliente.telefone  || '';
  form.value.email    = cliente.email     || '';
  // Abre Meus Pedidos automaticamente após login
  mostrarMeusPedidos.value = true;
}

function onPedidoAprovado(p) {
  if (qtdPendentes.value > 0) qtdPendentes.value--;
}

function sair() {
  menuCliente.value = false;
  localStorage.removeItem(`cl_sessao_${token}`);
  clienteLogado.value = null;
  sessaoToken.value   = '';
  qtdPendentes.value  = 0;
  cancelarEdicao();
  mostrarLogin.value  = true;
}

function cancelarEdicao() {
  editModo.value = false;
  editPedidoTk.value = '';
  reiniciar();
}

function iniciarEdicao(p) {
  // Ativa modo edição via refs locais (sem router.replace)
  editModo.value     = true;
  editPedidoTk.value = p.pedido_token || '';

  // Limpa carrinho e preenche com os itens do pedido
  carrinho.value = [];
  for (const it of (p.itens || [])) {
    const pkBuscar = it.produto_substituto_pk || it.produto_pk;
    if (!pkBuscar) continue;
    const prod = produtos.value.find(x => Number(x.pk) === Number(pkBuscar));
    if (prod) carrinho.value.push({ ...prod, quantidade: it.quantidade });
  }

  // Preenche o formulário com os dados do pedido
  form.value.data_evento     = p.data_evento     || '';
  form.value.hora_evento     = p.hora_evento ? String(p.hora_evento).substring(0, 5) : '';
  form.value.tipo_entrega    = p.tipo_entrega    || 'retirada';
  form.value.endereco_evento = p.endereco_evento || '';
  form.value.obs             = p.observacao      || '';

  // Mobile: abre o drawer do carrinho; desktop: sidebar já exibe o carrinho
  if (window.innerWidth < 900) mostrarCarrinho.value = true;
}
const produtos         = ref([]);
const busca            = ref('');
const visiveis         = ref(24);

const produtosFiltrados = computed(() => {
  if (!busca.value.trim()) return produtos.value;
  const q = busca.value.toLowerCase();
  return produtos.value.filter(p =>
    p.descricao?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q)
  );
});
const produtosVisiveis = computed(() => produtosFiltrados.value.slice(0, visiveis.value));
const temMais          = computed(() => visiveis.value < produtosFiltrados.value.length);
function verMais() { visiveis.value = Math.min(visiveis.value + 24, produtosFiltrados.value.length); }

watch(busca, () => { visiveis.value = 24; });
const carrinho        = ref([]); // [{ pk, descricao, foto_url, quantidade }]
const mostrarCarrinho = ref(false);
const enviando        = ref(false);
const enviado         = ref(false);
const pedidoToken     = ref('');
const formErro        = ref('');
const form = ref({ nome: '', telefone: '', email: '', obs: '', data_evento: '', hora_evento: '', tipo_entrega: 'retirada', endereco_evento: '' });
const fotoLightbox           = ref(null);
const produtosIndisponiveis  = ref([]);

// Watch deve ficar DEPOIS das declarações que usa
watch(() => form.value.data_evento, () => { produtosIndisponiveis.value = []; });

function abrirFoto(p) {
  fotoLightbox.value = { url: p.foto_url, nome: p.descricao };
}

onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/catalogo-publico/${token}`);
    catalogo.value = data.catalogo;
    produtos.value = data.produtos || [];


    // Verifica sessão salva
    const st = localStorage.getItem(`cl_sessao_${token}`);
    if (st) {
      try {
        const { data: sd } = await axios.get(
          `/api/catalogo-publico/${token}/cliente/sessao`,
          { headers: { 'x-sessao-token': st } }
        );
        clienteLogado.value = sd.cliente;
        sessaoToken.value   = st;
        form.value.nome     = sd.cliente.nome      || '';
        form.value.telefone = sd.cliente.telefone  || '';
        form.value.email    = sd.cliente.email     || '';
        mostrarLogin.value  = false;
      } catch {
        // Sessão expirada — remove e mostra login
        localStorage.removeItem(`cl_sessao_${token}`);
        mostrarLogin.value = true;
      }
    } else {
      mostrarLogin.value = true;
    }
  } catch (e) {
    erro.value = e.response?.data?.erro || 'Catálogo não encontrado';
  } finally {
    carregando.value = false;
  }
});

const totalItens = computed(() => carrinho.value.reduce((s, i) => s + i.quantidade, 0));

function quantidade(pk) {
  return carrinho.value.find(i => i.pk === pk)?.quantidade || 0;
}
function noCarrinho(pk) { return carrinho.value.some(i => i.pk === pk); }

function incrementar(p) {
  const saldoMax = p.saldo != null ? parseInt(p.saldo, 10) : Infinity;
  const item = carrinho.value.find(i => i.pk === p.pk);
  if (item) {
    if (item.quantidade >= saldoMax) return; // já no limite do estoque
    item.quantidade++;
  } else {
    if (saldoMax <= 0) return;
    carrinho.value.push({ ...p, quantidade: 1 });
  }
}
function decrementar(p) {
  const idx = carrinho.value.findIndex(i => i.pk === p.pk);
  if (idx === -1) return;
  if (carrinho.value[idx].quantidade <= 1) carrinho.value.splice(idx, 1);
  else carrinho.value[idx].quantidade--;
}
function toggleCarrinho(p) {
  if (noCarrinho(p.pk)) removerDoCarrinho(p.pk);
  else incrementar(p);
}
function removerDoCarrinho(pk) {
  carrinho.value = carrinho.value.filter(i => i.pk !== pk);
}

async function enviarPedido() {
  if (modoEditar.value) { salvarEdicao(); return; }
  formErro.value = '';
  if (!form.value.nome?.trim())        { formErro.value = 'Informe seu nome.'; return; }
  if (!form.value.email?.trim())       { formErro.value = 'Informe seu e-mail.'; return; }
  if (!form.value.data_evento)         { formErro.value = 'Informe a data do evento.'; return; }
  if (!carrinho.value.length)          { formErro.value = 'Adicione ao menos um produto.'; return; }
  if (form.value.tipo_entrega === 'entrega' && !form.value.endereco_evento?.trim()) {
    formErro.value = 'Informe o endereço do evento para entrega.'; return;
  }
  enviando.value = true;
  try {
    const headers = sessaoToken.value ? { 'x-sessao-token': sessaoToken.value } : {};
    const { data } = await axios.post(`/api/catalogo-publico/${token}/pedido`, {
      nome_cliente:    form.value.nome,
      telefone:        form.value.telefone        || null,
      email:           form.value.email           || null,
      observacao:      form.value.obs             || null,
      data_evento:     form.value.data_evento     || null,
      hora_evento:     form.value.hora_evento     || null,
      tipo_entrega:    form.value.tipo_entrega,
      endereco_evento: form.value.endereco_evento || null,
      itens: carrinho.value.map(i => ({
        produto_pk: i.pk,
        nome:       i.descricao,
        quantidade: i.quantidade,
      })),
    }, { headers });
    pedidoToken.value = data.pedido_token || '';
    enviado.value = true;
    mostrarCarrinho.value = false;
  } catch (e) {
    const resp = e.response?.data;
    formErro.value = resp?.erro || 'Erro ao enviar. Tente novamente.';
    // Destaca produtos indisponíveis no carrinho
    if (resp?.produtos_indisponiveis?.length) {
      produtosIndisponiveis.value = resp.produtos_indisponiveis;
    }
  } finally {
    enviando.value = false;
  }
}

async function confirmarSubstituto(p) {
  if (!modoSubstituir.value) return;
  substituindoSubst.value = true;
  try {
    await axios.patch(
      `/api/catalogo-publico/orcamento/${substPedidoTk.value}/itens/${substItemPk.value}/substituir`,
      {
        produto_substituto_pk: p.pk,
        quantidade:   substQtd(p.pk),
        data_evento:  substDataEvento.value || null,
        hora_evento:  substHoraEvento.value || null,
      }
    );
    router.push(`/catalogo/${token}/aprovacaoped/${substPedidoTk.value}?substituido=1`);
  } catch (e) {
    alert(e.response?.data?.erro || 'Erro ao confirmar substituição.');
  } finally {
    substituindoSubst.value = false;
  }
}

async function salvarEdicao() {
  if (!modoEditar.value) return;
  if (!form.value.data_evento) { formErro.value = 'Informe a data do evento.'; return; }
  if (!carrinho.value.length)  { formErro.value = 'Adicione ao menos um produto.'; return; }
  editandoPedido.value = true;
  formErro.value = '';
  const pedidoTk = editPedidoTk.value || route.query.pedido;
  try {
    await axios.patch(`/api/catalogo-publico/orcamento/${pedidoTk}/editar-itens`, {
      itens:       carrinho.value.map(i => ({ produto_pk: i.pk, quantidade: i.quantidade })),
      data_evento: form.value.data_evento || null,
      hora_evento: form.value.hora_evento || null,
    });
    // Sai do modo edição e volta para o pedido
    editModo.value = false;
    router.push(`/catalogo/${token}/aprovacaoped/${pedidoTk}`);
  } catch (e) {
    const resp = e.response?.data;
    formErro.value = resp?.erro || 'Erro ao salvar. Tente novamente.';
  } finally {
    editandoPedido.value = false;
  }
}

function reiniciar() {
  carrinho.value = [];
  const c = clienteLogado.value;
  form.value = {
    nome:           c?.nome      || '',
    telefone:       c?.telefone  || '',
    email:          c?.email     || '',
    obs:            '',
    data_evento:    '',
    hora_evento:    '',
    tipo_entrega:   'retirada',
    endereco_evento: '',
  };
  pedidoToken.value = '';
  enviado.value = false;
}

</script>

<style scoped>
/* ── Tema ── */
.cp-page { height: 100dvh; overflow-y: auto; background: #f8f9fa; font-family: 'Hanken Grotesk', system-ui, sans-serif; color: #0f172a; transition: background .2s, color .2s; }
.cp-dark { background: #0f172a; color: #f1f5f9; }

/* Header — sempre escuro */
.cp-header { background: #111318; border-bottom: 1px solid rgba(255,255,255,.06); position: sticky; top: 0; z-index: 100; overflow: visible; }
.cp-header-inner { max-width: 1200px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.cp-logo { height: 36px; object-fit: contain; }
.cp-header-info { flex: 0 0 auto; }
.cp-catalogo-nome { font-size: 16px; font-weight: 800; color: #fff; margin: 0; }
.cp-catalogo-desc { font-size: 11px; color: rgba(255,255,255,.5); margin: 2px 0 0; }

/* Botão de tema no header */
.cp-btn-tema {
  width: 38px; height: 38px; flex-shrink: 0;
  margin-left: auto;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
  border-radius: 10px; color: rgba(255,255,255,.7);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.cp-btn-tema:hover { background: rgba(255,255,255,.16); color: #fff; }
.cp-btn-tema .material-symbols-outlined { font-size: 20px; }

/* Barra de busca abaixo do header */
.cp-search-strip {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 62px;
  z-index: 90;
  transition: background .2s, border-color .2s;
}
.cp-dark .cp-search-strip { background: #1e293b; border-bottom-color: #334155; }
.cp-search-inner {
  max-width: 1200px; margin: 0 auto;
  padding: 10px 20px;
  position: relative; display: flex; align-items: center;
}
.cp-s-ico {
  position: absolute; left: 31px;
  font-size: 20px; color: #9ca3af; pointer-events: none;
}
.cp-dark .cp-s-ico { color: #64748b; }
.cp-s-input {
  width: 100%; padding: 10px 36px 10px 44px;
  background: #f3f4f6; border: 1.5px solid #e5e7eb;
  border-radius: 12px; color: #0f172a;
  font-size: 14px; font-family: inherit; outline: none;
  transition: border-color .15s, background .15s;
}
.cp-s-input:focus { border-color: #6366f1; background: #fff; }
.cp-s-input::placeholder { color: #9ca3af; }
.cp-dark .cp-s-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
.cp-dark .cp-s-input:focus { border-color: #6366f1; background: #1e293b; }
.cp-dark .cp-s-input::placeholder { color: #475569; }
.cp-s-clear {
  position: absolute; right: 30px;
  background: none; border: none; color: #9ca3af;
  cursor: pointer; display: flex; padding: 2px;
}
.cp-s-clear:hover { color: #374151; }
.cp-dark .cp-s-clear:hover { color: #f1f5f9; }
.cp-s-clear .material-symbols-outlined { font-size: 18px; }

/* Cliente logado no header */
.cp-btn-login { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); border-radius: 10px; color: rgba(255,255,255,.8); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; margin-left: auto; }
.cp-btn-login:hover { background: rgba(255,255,255,.14); color: #fff; }
.cp-btn-login .material-symbols-outlined { font-size: 17px; }
.cp-cliente-wrap { position: relative; margin-left: auto; }
.cp-cliente-pill { display: flex; align-items: center; gap: 8px; padding: 5px 10px 5px 5px; background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.3); border-radius: 20px; cursor: pointer; transition: background .15s; user-select: none; }
.cp-cliente-pill:hover { background: rgba(99,102,241,.3); }
.cp-cliente-avatar { width: 28px; height: 28px; border-radius: 50%; background: #6366f1; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cp-cliente-nome { font-size: 12px; font-weight: 700; color: #c7d2fe; white-space: nowrap; max-width: 80px; overflow: hidden; text-overflow: ellipsis; }
.cp-cliente-chevron { font-size: 16px; color: rgba(199,210,254,.7); }

/* Dropdown menu */
.cp-cliente-menu {
  position: absolute; top: calc(100% + 8px); right: 0;
  min-width: 220px;
  background: #1e2030; border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,.4);
  z-index: 300; overflow: hidden;
}
.cp-cliente-menu-info { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
.cp-cliente-menu-avatar { width: 36px; height: 36px; border-radius: 50%; background: #6366f1; color: #fff; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cp-cliente-menu-nome  { font-size: 13px; font-weight: 700; color: #f1f5f9; }
.cp-cliente-menu-email { font-size: 11px; color: rgba(255,255,255,.45); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 155px; }
.cp-cliente-menu-divider { height: 1px; background: rgba(255,255,255,.08); margin: 0 12px; }
.cp-cliente-menu-sair {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 12px 16px;
  background: none; border: none;
  color: #f87171; font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: inherit; text-align: left;
  transition: background .15s;
}
.cp-cliente-menu-sair:hover { background: rgba(248,113,113,.1); }
.cp-cliente-menu-sair .material-symbols-outlined { font-size: 18px; }

/* Transição do menu */
.cp-menu-enter-active, .cp-menu-leave-active { transition: opacity .15s, transform .15s; }
.cp-menu-enter-from, .cp-menu-leave-to { opacity: 0; transform: translateY(-6px); }

/* Dropdown em mobile: posição fixa para não ser cortado */
@media (max-width: 600px) {
  .cp-cliente-menu {
    position: fixed;
    top: 62px;
    left: 12px;
    right: 12px;
    min-width: unset;
  }
}

.cp-btn-meus-pedidos { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); border-radius: 10px; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; position: relative; }
.cp-btn-meus-pedidos:hover { background: rgba(255,255,255,.18); }
.cp-btn-meus-pedidos .material-symbols-outlined { font-size: 17px; }
.cp-btn-mp-txt { display: none; }
.cp-btn-mp-badge { position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid #111318; }
@media (min-width: 500px) {
  .cp-btn-mp-txt { display: inline; }
}

.cp-cart-btn { position: relative; width: 44px; height: 44px; background: #6366f1; border: none; border-radius: 12px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cp-cart-btn .material-symbols-outlined { font-size: 22px; }
.cp-cart-badge { position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid #111318; }

/* Body layout */
.cp-body { max-width: 1200px; margin: 0 auto; padding: 24px 20px; display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }

/* Grid de produtos */
.cp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.cp-vazio { text-align: center; padding: 60px 20px; color: #6b7280; }
.cp-vazio p { margin-top: 12px; font-size: 15px; }
.cp-ver-mais { display: flex; justify-content: center; margin-top: 20px; }
.cp-ver-mais-btn { display: flex; align-items: center; gap: 8px; padding: 12px 28px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; color: #374151; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.cp-ver-mais-btn:hover { border-color: #6366f1; color: #6366f1; }
.cp-ver-mais-btn .material-symbols-outlined { font-size: 20px; }
.cp-dark .cp-ver-mais-btn { background: #1e293b; border-color: #334155; color: #cbd5e1; box-shadow: none; }
.cp-dark .cp-ver-mais-btn:hover { border-color: #6366f1; color: #a5b4fc; }

.cp-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.07); transition: background .2s, box-shadow .15s; display: flex; flex-direction: column; }
.cp-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,.1); }
.cp-dark .cp-card { background: #1e293b; box-shadow: 0 1px 6px rgba(0,0,0,.3); }
.cp-dark .cp-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,.4); }

.cp-card-foto { height: 150px; background: #f3f4f6; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; }
.cp-dark .cp-card-foto { background: #2d3748; }
.cp-card-foto img { width: 100%; height: 100%; object-fit: cover; }
.cp-card-foto--clicavel { cursor: zoom-in; }
.cp-card-foto--clicavel:hover .cp-foto-lupa { opacity: 1; }
.cp-foto-lupa { position: absolute; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; }
.cp-foto-lupa .material-symbols-outlined { font-size: 36px; color: #fff; }
.cp-card-avatar { font-size: 40px; font-weight: 800; color: #d1d5db; }
.cp-dark .cp-card-avatar { color: #475569; }
.cp-card-body { padding: 12px 12px 6px; flex: 1; }
.cp-card-nome { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3; }
.cp-dark .cp-card-nome { color: #f1f5f9; }
.cp-card-cod  { font-size: 11px; color: #9ca3af; margin-top: 3px; }
.cp-card-footer { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.cp-qty-ctrl    { justify-content: center; }
.cp-card-footer-right { display: flex; flex-direction: column; align-items: stretch; gap: 4px; }
.cp-saldo-hint  { font-size: 10px; color: #9ca3af; font-weight: 500; text-align: center; }
.cp-qty-ctrl { display: flex; align-items: center; gap: 6px; }
.cp-qty-btn { width: 26px; height: 26px; border-radius: 7px; border: 1px solid #e5e7eb; background: #f9fafb; color: #374151; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; transition: all .12s; }
.cp-qty-btn:hover:not(:disabled) { background: #6366f1; color: #fff; border-color: #6366f1; }
.cp-qty-btn:disabled { opacity: .35; cursor: not-allowed; }
.cp-dark .cp-qty-btn { background: #2d3748; border-color: #475569; color: #cbd5e1; }
.cp-qty-val { font-size: 14px; font-weight: 700; min-width: 20px; text-align: center; }
/* Banner modo substituição */
.cp-subst-banner { display: flex; flex-direction: column; gap: 10px; padding: 14px 20px; background: #f97316; color: #fff; position: sticky; top: 0; z-index: 200; }
.cp-subst-banner-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.cp-subst-banner-top .material-symbols-outlined { font-size: 22px; flex-shrink: 0; }
.cp-subst-banner-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cp-subst-banner-txt strong { font-size: 14px; font-weight: 800; }
.cp-subst-banner-txt span { font-size: 12px; opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-subst-banner-cancel { display: flex; align-items: center; gap: 5px; padding: 6px 14px; background: rgba(0,0,0,.2); border: none; border-radius: 8px; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; }
.cp-subst-banner-cancel:hover { background: rgba(0,0,0,.35); }
.cp-subst-banner-cancel .material-symbols-outlined { font-size: 16px; }
.cp-subst-banner-evento { display: flex; gap: 12px; flex-wrap: wrap; }
.cp-subst-campo { display: flex; flex-direction: column; gap: 4px; }
.cp-subst-campo label { font-size: 11px; font-weight: 700; opacity: .85; }
.cp-subst-input { padding: 7px 10px; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.35); border-radius: 8px; color: #fff; font-size: 13px; font-family: inherit; outline: none; }
.cp-subst-input:focus { background: rgba(255,255,255,.25); border-color: rgba(255,255,255,.7); }
.cp-subst-input::-webkit-calendar-picker-indicator { filter: invert(1); opacity: .8; cursor: pointer; }

.cp-add-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; background: #6366f1; border: none; border-radius: 8px; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s; width: 100%; }
.cp-add-btn:hover:not(:disabled) { background: #4f46e5; }
.cp-add-btn--in    { background: #16a34a; }
.cp-add-btn--subst { background: #f97316; }
.cp-add-btn--subst:hover:not(:disabled) { background: #ea6c0a; }
.cp-subst-qty-row { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.cp-add-btn--in:hover:not(:disabled) { background: #15803d; }
.cp-add-btn--off { background: #9ca3af; cursor: not-allowed; }
.cp-add-btn:disabled { opacity: .65; cursor: not-allowed; }
.cp-add-btn .material-symbols-outlined { font-size: 14px; }

/* Sidebar */
.cp-sidebar { position: sticky; top: 110px; max-height: calc(100dvh - 126px); }
.cp-sidebar-inner { background: #fff; border-radius: 16px; border: 1px solid #e5e7eb; overflow-y: auto; max-height: calc(100dvh - 126px); transition: background .2s, border-color .2s; }
.cp-dark .cp-sidebar-inner { background: #1e293b; border-color: #334155; }
.cp-sidebar-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #0f172a; padding: 16px 18px 14px; border-bottom: 1px solid #e5e7eb; margin: 0; }
.cp-dark .cp-sidebar-title { color: #f1f5f9; border-bottom-color: #334155; }
.cp-sidebar-title .material-symbols-outlined { font-size: 20px; color: #6366f1; }
.cp-sidebar-vazio { padding: 24px 18px; text-align: center; color: #9ca3af; font-size: 13px; }
.cp-sidebar-itens { padding: 8px 0; max-height: 220px; overflow-y: auto; }
.cp-sidebar-item { display: flex; align-items: center; gap: 8px; padding: 8px 18px; border-bottom: 1px solid #f3f4f6; }
.cp-sidebar-item:last-child { border-bottom: none; }
.cp-dark .cp-sidebar-item { border-bottom-color: #2d3748; }
.cp-sidebar-item--indisp { background: #fff5f5; }
.cp-dark .cp-sidebar-item--indisp { background: rgba(239,68,68,.08); }
.cp-indisp-tag { font-size: 10px; font-weight: 700; color: #ef4444; background: #fee2e2; border-radius: 5px; padding: 1px 6px; }
.cp-sidebar-item-info { flex: 1; }
.cp-sidebar-item-nome { display: block; font-size: 12px; font-weight: 600; color: #0f172a; }
.cp-dark .cp-sidebar-item-nome { color: #e2e8f0; }
.cp-sidebar-item-qty  { font-size: 11px; color: #6b7280; }
.cp-sidebar-rem { background: none; border: none; color: #9ca3af; cursor: pointer; display: flex; padding: 2px; }
.cp-sidebar-rem:hover { color: #ef4444; }
.cp-sidebar-rem .material-symbols-outlined { font-size: 16px; }

/* Formulário */
.cp-form { padding: 14px 18px; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 10px; }
.cp-dark .cp-form { border-top-color: #334155; }
.cp-form-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin: 0; }
.cp-dark .cp-form-title { color: #64748b; }
.cp-form-field { display: flex; flex-direction: column; gap: 4px; }
.cp-form-field label { font-size: 11px; font-weight: 600; color: #374151; }
.cp-dark .cp-form-field label { color: #94a3b8; }
.cp-input { padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px; color: #0f172a; font-size: 13px; font-family: inherit; outline: none; background: #f9fafb; width: 100%; box-sizing: border-box; }
.cp-input:focus { border-color: #6366f1; background: #fff; }
.cp-input--erro { border-color: #ef4444 !important; background: #fff5f5 !important; }
.cp-dark .cp-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
.cp-dark .cp-input:focus { background: #1e293b; border-color: #6366f1; }
.cp-textarea { resize: vertical; }
.cp-form-erro { color: #ef4444; font-size: 12px; }
.cp-enviar-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #6366f1; border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .15s; font-family: inherit; margin-top: 4px; }
.cp-enviar-btn:hover:not(:disabled) { background: #4f46e5; }
.cp-enviar-btn:disabled { opacity: .5; cursor: not-allowed; }
.cp-enviar-btn .material-symbols-outlined { font-size: 18px; }

/* Drawer mobile */
.cp-cart-btn { display: none; }
.cp-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 500; display: flex; justify-content: flex-end; }
.cp-drawer { width: 340px; max-width: 100%; background: #fff; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; transition: background .2s; }
.cp-drawer--dark { background: #1e293b !important; color: #f1f5f9; }
.cp-drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; background: #fff; transition: background .2s, border-color .2s; }
.cp-drawer--dark .cp-drawer-header { background: #1e293b; border-bottom-color: #334155; }
.cp-drawer-header h3 { font-size: 16px; font-weight: 700; margin: 0; }
.cp-drawer--dark .cp-drawer-header h3 { color: #f1f5f9; }
.cp-drawer-close { background: none; border: none; cursor: pointer; color: #6b7280; display: flex; }
.cp-drawer--dark .cp-drawer-close { color: #64748b; }
.cp-drawer-body { flex: 1; padding: 12px 18px; }
.cp-drawer--dark .cp-sidebar-item-nome { color: #e2e8f0; }
.cp-drawer--dark .cp-sidebar-item { border-bottom-color: #2d3748; }
.cp-drawer--dark .cp-form-field label { color: #94a3b8; }
.cp-drawer--dark .cp-form-title { color: #64748b; }
.cp-drawer--dark .cp-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
.cp-drawer--dark .cp-input:focus { background: #1e293b; border-color: #6366f1; }
.cp-drawer--dark .cp-form { border-top-color: #334155; }

/* Loading / erro */
.cp-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 16px; color: #6b7280; }
.cp-spin { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.cp-spin-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.cp-erro { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 12px; text-align: center; padding: 20px; color: #374151; }
.cp-erro-ico { font-size: 60px; }
.cp-erro h2  { font-size: 22px; font-weight: 700; margin: 0; }
.cp-erro p   { color: #6b7280; margin: 0; }

/* Sucesso */
.cp-sucesso-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.cp-sucesso-box { background: #fff; border-radius: 20px; padding: 40px 32px; max-width: 440px; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.cp-sucesso-ico { font-size: 60px; }
.cp-sucesso-box h2 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
.cp-sucesso-box p  { color: #6b7280; font-size: 14px; margin: 0; }

/* Lightbox */
.cp-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.9); z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; cursor: zoom-out; }
.cp-lightbox-img  { max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,.5); cursor: default; }
.cp-lightbox-nome { margin-top: 14px; color: rgba(255,255,255,.8); font-size: 14px; font-weight: 600; text-align: center; }
.cp-lightbox-close { position: absolute; top: 16px; right: 16px; width: 44px; height: 44px; background: rgba(255,255,255,.15); border: none; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 22px; transition: background .15s; }
.cp-lightbox-close:hover { background: rgba(255,255,255,.28); }
.cp-lightbox-close .material-symbols-outlined { font-size: 22px; }

/* Transição login */
.cl-fade-enter-active, .cl-fade-leave-active { transition: opacity .25s; }
.cl-fade-enter-from, .cl-fade-leave-to { opacity: 0; }

/* Transitions */
.drawer-enter-active, .drawer-leave-active { transition: opacity .2s; }
.drawer-enter-active .cp-drawer, .drawer-leave-active .cp-drawer { transition: transform .25s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .cp-drawer, .drawer-leave-to .cp-drawer { transform: translateX(100%); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Responsive */
@media (max-width: 900px) {
  .cp-body    { grid-template-columns: 1fr; }
  .cp-sidebar { display: none; }
  .cp-cart-btn { display: flex; }
}
@media (max-width: 500px) {
  .cp-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
