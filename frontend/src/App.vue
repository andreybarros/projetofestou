<template>
  <div :data-theme="tema" :class="['festou-root', tema]">

    <!-- ══ LOGIN ══════════════════════════════════════════════════ -->
    <div v-if="!sessao.isAutenticado" class="login-screen">
      <LoginView @login-ok="onLoginOk" />
    </div>

    <!-- ══ APP ════════════════════════════════════════════════════ -->
    <div v-else class="app-wrap">

      <!-- Overlay mobile sidebar -->
      <div v-show="sidebarAberta" class="nav-overlay" @click="fecharSidebar">
        <div class="nav-backdrop"></div>
      </div>

      <!-- Sidebar -->
      <aside :class="['nav-drawer', { open: sidebarAberta, collapsed: sidebarCollapsed }]">
        <div class="drawer-header">
          <img src="/img/logo_fundo_transp.png" alt="Logo" class="drawer-logo" />
          <button class="drawer-close lg-hide" @click="fecharSidebar">
            <span class="material-symbols-outlined">close</span>
          </button>
          <button class="drawer-collapse sm-hide" @click="toggleCollapse" :title="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'">
            <span class="material-symbols-outlined">{{ sidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
          </button>
        </div>

        <nav class="drawer-nav">

          <!-- Início -->
          <RouterLink to="/" class="nav-btn" @click="fecharSidebar">
            <span class="material-symbols-outlined nav-icon home-icon">home</span>
            <span class="nav-label">Início</span>
          </RouterLink>

          <!-- Estoque -->
          <div class="nav-section">
            <p class="section-title">Estoque</p>
            <RouterLink v-if="pode('produtos')"     to="/produtos"     class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fb923c">inventory_2</span><span class="nav-label">Produtos</span></RouterLink>
            <RouterLink v-if="pode('categorias')"   to="/categorias"   class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#facc15">label</span><span class="nav-label">Categorias</span></RouterLink>
            <RouterLink v-if="pode('clientes')"     to="/clientes"     class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#c084fc">group</span><span class="nav-label">Clientes</span></RouterLink>
            <RouterLink v-if="pode('fornecedores')" to="/fornecedores" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#f59e0b">handshake</span><span class="nav-label">Fornecedores</span></RouterLink>
            <RouterLink v-if="pode('armazens')"     to="/armazens"     class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#22d3ee">warehouse</span><span class="nav-label">Armazéns</span></RouterLink>
          </div>

          <!-- Agenda -->
          <div v-if="pode('agenda')" class="nav-section">
            <p class="section-title">Agenda</p>
            <RouterLink to="/agenda" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#38bdf8">calendar_month</span><span class="nav-label">Eventos</span></RouterLink>
          </div>

          <!-- Vendas -->
          <div v-if="podeVendas" class="nav-section">
            <p class="section-title">Vendas</p>
            <RouterLink v-if="pode('caixa')"                         to="/caixa"            class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#10b981">payments</span><span class="nav-label">Caixa (Operação)</span></RouterLink>
            <RouterLink v-if="pode('pdv') && op?.acesso_dashboard"  to="/dashboard"        class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fb7185">bar_chart</span><span class="nav-label">Dashboard</span></RouterLink>
            <RouterLink v-if="pode('pdv')"                          to="/pdv"              class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#4ade80">point_of_sale</span><span class="nav-label">Ponto de Venda</span></RouterLink>
            <RouterLink v-if="pode('vendedores')"                   to="/vendedores"       class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#818cf8">person</span><span class="nav-label">Vendedores</span></RouterLink>
            <RouterLink v-if="pode('receitas')"                     to="/contas-receber"   class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#34d399">receipt_long</span><span class="nav-label">Contas a Receber</span></RouterLink>
            <RouterLink v-if="pode('historico')"                    to="/historico-vendas" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#94a3b8">history</span><span class="nav-label">Histórico de Vendas</span></RouterLink>
          </div>

          <!-- RH -->
          <div v-if="podeRH" class="nav-section">
            <p class="section-title">Recursos Humanos</p>
            <RouterLink v-if="pode('funcionarios')" to="/funcionarios"   class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#2dd4bf">badge</span><span class="nav-label">Funcionários</span></RouterLink>
            <RouterLink v-if="pode('ponto')"        to="/ponto"          class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#60a5fa">schedule</span><span class="nav-label">Ponto Eletrônico</span></RouterLink>
            <RouterLink v-if="op?.matricula"        to="/holerites"      class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#a78bfa">description</span><span class="nav-label">Meus Holerites</span></RouterLink>
            <RouterLink v-if="op?.matricula || pode('espelho')" to="/espelho-ponto" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#f472b6">calendar_view_month</span><span class="nav-label">Espelho de Ponto</span></RouterLink>
            <RouterLink v-if="pode('gestao_ponto')" to="/ajuste-batidas" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fb7185">location_on</span><span class="nav-label">Gestão de Batidas</span></RouterLink>
            <RouterLink v-if="pode('fech_ponto')" to="/fechamento-ponto" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fb923c">lock_clock</span><span class="nav-label">Fechamento de Ponto</span></RouterLink>
          </div>

          <!-- Operação -->
          <div v-if="pode('separacao')" class="nav-section">
            <p class="section-title">Operação</p>
            <RouterLink to="/separacao" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fdba74">inventory</span><span class="nav-label">Separação</span></RouterLink>
          </div>

          <!-- Admin -->
          <div v-if="podeAdmin" class="nav-section">
            <p class="section-title">Administração</p>
            <RouterLink v-if="op?.admin"           to="/parametros"        class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#94a3b8">tune</span><span class="nav-label">Parâmetros</span></RouterLink>
            <RouterLink v-if="pode('despesas')"   to="/despesas"          class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#f87171">money_off</span><span class="nav-label">Despesas</span></RouterLink>
            <RouterLink v-if="pode('financeiro')" to="/financeiro"        class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#a3e635">account_balance_wallet</span><span class="nav-label">Financeiro</span></RouterLink>
            <RouterLink v-if="op?.admin"           to="/filiais"           class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#60a5fa">corporate_fare</span><span class="nav-label">Filiais</span></RouterLink>
            <RouterLink v-if="op?.admin"           to="/operadores"        class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#a5b4fc">manage_accounts</span><span class="nav-label">Operadores</span></RouterLink>
          </div>

          <!-- Relatórios -->
          <div v-if="op?.admin || pode('fechamento') || pode('rel_vendas') || pode('rel_caixa') || pode('financeiro')" class="nav-section">
            <p class="section-title">Relatórios</p>
            <RouterLink v-if="pode('financeiro')" to="/consolidacao-vendas" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#34d399">account_balance</span><span class="nav-label">Consolidação de Recebimentos</span></RouterLink>
            <RouterLink v-if="pode('rel_vendas')" to="/relatorio-vendas"   class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fbbf24">analytics</span><span class="nav-label">Relatório de Vendas</span></RouterLink>
            <RouterLink v-if="pode('rel_caixa')" to="/relatorio-caixa"     class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#38bdf8">summarize</span><span class="nav-label">Relatório de Caixa</span></RouterLink>
            <RouterLink v-if="pode('fechamento')" to="/fechamento-caixa"    class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fde047">lock</span><span class="nav-label">Fechamento de Caixa</span></RouterLink>
          </div>
        </nav>

        <!-- Drawer footer vazio (logout/manual movidos para o topbar) -->
      </aside>

      <!-- Main -->
      <div :class="['app-main', { 'sidebar-collapsed': sidebarCollapsed }]">

        <!-- Topbar (sempre visível conforme pedido do usuário) -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="hamburger lg-hide" @click="abrirSidebar">
              <span class="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div class="topbar-right">
            <!-- Badge de filial + toggle tema -->
            <div class="filial-area" v-if="sessao.filial">
              <div class="filial-switch-wrap" ref="filialMenuRef">
                <button class="filial-badge filial-badge-btn" @click="filialMenuAberto = !filialMenuAberto" :title="'Trocar filial'">
                  <span class="sm-hide">{{ sessao.filial.codigo }} · {{ sessao.filial.nome }}</span>
                  <span class="lg-hide">{{ sessao.filial.codigo }}</span>
                  <span class="material-symbols-outlined" style="font-size:14px;opacity:.6;margin-left:4px">unfold_more</span>
                </button>
                <Transition name="dropdown">
                  <div v-if="filialMenuAberto" class="filial-dropdown">
                    <div class="filial-drop-title">Trocar Filial</div>
                    <button
                      v-for="f in todasFiliais"
                      :key="f.pk"
                      :class="['filial-drop-item', { active: f.pk === sessao.filial?.pk }]"
                      @click="trocarFilial(f)"
                    >
                      <span class="material-symbols-outlined" style="font-size:16px">{{ f.pk === sessao.filial?.pk ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                      [{{ f.codigo }}] {{ f.nome }}
                    </button>
                  </div>
                </Transition>
              </div>
              <button class="tema-toggle" @click="toggleTema" :title="tema === 'dark' ? 'Mudar para Light' : 'Mudar para Dark'">
                <span class="material-symbols-outlined">{{ tema === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
              </button>
            </div>

            <!-- Menu do usuário -->
            <div class="user-menu-wrap" v-if="op" ref="userMenuRef">
              <button class="user-chip" @click="userMenuAberto = !userMenuAberto">
                <span class="material-symbols-outlined" style="font-size:20px">account_circle</span>
                <span class="sm-hide">{{ op.nome }}</span>
                <span class="material-symbols-outlined sm-hide" style="font-size:16px;opacity:.6">{{ userMenuAberto ? 'expand_less' : 'expand_more' }}</span>
              </button>
              <Transition name="dropdown">
                <div v-if="userMenuAberto" class="user-dropdown">
                  <button class="udrop-item" @click="abrirManual">
                    <span class="material-symbols-outlined">menu_book</span>
                    Manual
                  </button>
                  <div class="udrop-divider"></div>
                  <button class="udrop-item udrop-sair" @click="doLogout">
                    <span class="material-symbols-outlined">logout</span>
                    Sair do Sistema
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </header>

        <!-- Content via router -->
        <main class="content-area" id="content">
          <RouterView />
        </main>

        <!-- Bottom Nav (mobile) -->
        <nav class="bottom-nav" id="bottom-nav">
          <RouterLink to="/" class="bnav-btn"><span class="material-symbols-outlined">home</span><span>Início</span></RouterLink>
          <RouterLink v-if="pode('produtos')" to="/produtos" class="bnav-btn"><span class="material-symbols-outlined">inventory_2</span><span>Produtos</span></RouterLink>
          <RouterLink v-if="pode('clientes')" to="/clientes" class="bnav-btn"><span class="material-symbols-outlined">group</span><span>Clientes</span></RouterLink>
          <RouterLink v-if="pode('pdv')"      to="/pdv"      class="bnav-btn"><span class="material-symbols-outlined">point_of_sale</span><span>PDV</span></RouterLink>
          <button class="bnav-btn" @click="abrirSidebar"><span class="material-symbols-outlined">menu</span><span>Menu</span></button>
        </nav>
      </div>
    </div>

    <!-- Toast global -->
    <div id="toast" :class="['toast', { show: toast.visible, success: toast.tipo === 'success', error: toast.tipo === 'error' }]">
      {{ toast.tipo === 'success' ? '✅' : '❌' }} {{ toast.msg }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSessaoStore } from './stores/sessao';
import { useParametrosStore } from './stores/parametros';
import apiClient from './services/api';
import LoginView from './views/Login.vue';

const sessao      = useSessaoStore();
const parametros  = useParametrosStore();
const router      = useRouter();
const route       = useRoute();
const isPDV       = computed(() => route.name === 'PDV');
const op          = computed(() => sessao.operador);

// Carrega parâmetros assim que a sessão estiver autenticada
watch(() => sessao.isAutenticado, (ok) => {
  if (ok && sessao.filial?.pk) parametros.carregar(sessao.filial.pk);
}, { immediate: true });

// Tema
const tema = ref(localStorage.getItem('tema') || 'dark');
function toggleTema() {
  tema.value = tema.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tema', tema.value);
}

// Sidebar
const sidebarAberta    = ref(false);
const sidebarCollapsed = ref(localStorage.getItem('sidebar_collapsed') === '1');
function abrirSidebar()    { sidebarAberta.value = true; }
function fecharSidebar()   { sidebarAberta.value = false; }
function toggleCollapse()  {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem('sidebar_collapsed', sidebarCollapsed.value ? '1' : '0');
}

// Menu do usuário (dropdown)
const userMenuAberto = ref(false);
const userMenuRef    = ref(null);

// Dropdown de filial
const filialMenuAberto = ref(false);
const filialMenuRef    = ref(null);
const todasFiliais     = ref([]);

async function carregarFiliais() {
  try {
    const { data } = await apiClient.get('/api/auth/filiais');
    todasFiliais.value = data || [];
  } catch { /* silencioso */ }
}

async function trocarFilial(f) {
  if (f.pk === sessao.filial?.pk) { filialMenuAberto.value = false; return; }
  sessao.trocarFilial(f);
  parametros.carregar(f.pk);
  filialMenuAberto.value = false;
  try {
    const { data } = await apiClient.get(`/api/auth/modulos/${f.pk}`);
    sessao.setModulos(data || []);
  } catch(e) { console.error('Erro ao recarregar modulos', e); }
}

function fecharMenus(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    userMenuAberto.value = false;
  }
  if (filialMenuRef.value && !filialMenuRef.value.contains(e.target)) {
    filialMenuAberto.value = false;
  }
}
onMounted(async () => {
  document.addEventListener('click', fecharMenus, true);
  if (sessao.isAutenticado) {
    await carregarFiliais();
    // Recarregar módulos da filial atual para refletir alterações feitas no cadastro
    if (sessao.filial?.pk) {
      try {
        const { data } = await apiClient.get(`/api/auth/modulos/${sessao.filial.pk}`);
        sessao.setModulos(data || []);
      } catch(e) { console.error('Erro ao recarregar modulos', e); }
    }
  }
});
onUnmounted(() => document.removeEventListener('click', fecharMenus, true));

watch(() => sessao.isAutenticado, (ok) => { if (ok) carregarFiliais(); });

// Permissões
function pode(modulo) {
  if (!sessao.isAutenticado) return false;
  const o = op.value;
  if (!o) return false;

  // Mapeamento: qual módulo da filial libera cada item do menu
  const FILIAL_MAP = {
    produtos: 'produtos', armazens: 'armazens', clientes: 'clientes',
    agenda: 'agenda', separacao: 'separacao', pdv: 'pdv',
    historico: 'historico', receitas: 'receitas', categorias: 'categorias',
    despesas: 'despesas', financeiro: 'financeiro', fechamento: 'fechamento',
    vendedores: 'vendedores', funcionarios: 'funcionarios', ponto: 'ponto',
    // Derivados: dependem do módulo-pai na filial
    caixa: 'pdv', rel_vendas: 'historico', rel_caixa: 'fechamento',
    dashboard: 'pdv', fornecedores: 'clientes',
    espelho: 'ponto', gestao_ponto: 'ponto', fech_ponto: 'funcionarios',
    criar_ordem: 'separacao',
  };

  // 1. FILIAL: bloqueia se a filial não tem o módulo (mesmo para admin)
  const filialModulo = FILIAL_MAP[modulo];
  if (filialModulo && !sessao.temModulo(filialModulo)) {
    return false;
  }

  // 2. OPERADOR: admin tem acesso total (já passou pelo filtro da filial)
  if (o.admin) return true;

  // 3. OPERADOR: verificar permissão individual
  const mapa = {
    produtos:     o.acesso_produtos,
    categorias:   o.acesso_categorias,
    clientes:     o.acesso_clientes,
    fornecedores: o.acesso_fornecedores,
    armazens:     o.acesso_armazens,
    agenda:       o.acesso_agenda,
    pdv:          o.acesso_pdv,
    caixa:        o.acesso_caixa,
    vendedores:   o.acesso_vendedores,
    receitas:     o.acesso_receitas,
    historico:    o.acesso_historico    || o.acesso_pdv,
    funcionarios: o.acesso_funcionarios,
    ponto:        o.acesso_ponto,
    separacao:    o.acesso_separacao    || o.acesso_criar_ordem,
    criar_ordem:  o.acesso_criar_ordem,
    despesas:     o.acesso_despesas,
    financeiro:   o.acesso_financeiro,
    fechamento:   o.acesso_fechamento,
    rel_caixa:    o.acesso_relatorio_caixa  || o.acesso_fechamento,
    dashboard:    o.acesso_dashboard,
    espelho:      o.acesso_espelho_ponto,
    gestao_ponto: o.acesso_gestao_ponto || o.acesso_ponto,
    fech_ponto:   o.acesso_fechamento_ponto || o.acesso_funcionarios,
    rel_vendas:   o.acesso_relatorio_vendas || o.acesso_historico || o.acesso_pdv
  };
  return !!mapa[modulo];
}

const podeVendas = computed(() => pode('pdv') || pode('receitas') || pode('historico') || pode('despesas') || pode('financeiro'));
const podeAdmin  = computed(() => op.value?.admin || pode('despesas') || pode('financeiro'));
const podeRH     = computed(() => {
  const temRHnaFilial = sessao.temModulo('ponto') || sessao.temModulo('funcionarios');
  if (!temRHnaFilial) return false;
  return pode('funcionarios') || pode('ponto') || !!op.value?.matricula || !!op.value?.acesso_espelho_ponto;
});

// Toast
const toast = ref({ visible: false, msg: '', tipo: 'success' });
let _toastTimer = null;
function showToast(msg, tipo = 'success') {
  toast.value = { visible: true, msg, tipo };
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { toast.value.visible = false; }, 3500);
}
provide('showToast', showToast);
provide('abrirSidebar', abrirSidebar);

// Login callback
function onLoginOk({ filial, operador, modulos }) {
  sessao.setSessao(filial, operador, modulos);
  router.push('/');
}

// Logout
function doLogout() {
  sessao.logout();
  router.push('/login');
}

function abrirManual() { window.open('/manual.html', '_blank'); }
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block');

/* ── Reset e base ──────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0c0e12; --bg2: #111318; --bg3: #171a1f; --bg4: #1d2026;
  --border: rgba(255,255,255,.07);
  --text: #e3e5ef; --text2: #a8abb5;
  --primary: #609efc; --primary-c: #0560ba;
  --radius: 12px;
}
.material-symbols-outlined { 
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; 
  display: inline-block;
  width: 1em;
  height: 1em;
  overflow: hidden;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  line-height: 1;
  color: inherit; /* Garante que cor seja herdada após o reset base */
}
[data-theme="light"] {
  --bg: #eaecf4; --bg2: #ffffff; --bg3: #dde0ed; --bg4: #cfd3e6;
  --border: rgba(0,0,0,.14);
  --text: #0f172a; --text2: #374151;
  color: var(--text);
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
  height: 100dvh;
}

/* ── Screen: login ─────────────────────────────────────── */
.login-screen { display: flex; align-items: center; justify-content: center; min-height: 100dvh; background: var(--bg); }

/* ── App shell ─────────────────────────────────────────── */
.app-wrap { display: flex; height: 100dvh; overflow: hidden; position: relative; }

/* ── Overlay mobile ────────────────────────────────────── */
.nav-overlay { position: fixed; inset: 0; z-index: 60; }
.nav-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); }

/* ── Sidebar ───────────────────────────────────────────── */
.nav-drawer {
  position: fixed; top: 0; left: 0; height: 100dvh; width: 280px;
  background: #111318; border-right: 1px solid rgba(255,255,255,.07);
  display: flex; flex-direction: column; z-index: 65;
  transform: translateX(-100%); transition: transform .3s cubic-bezier(.4,0,.2,1);
  overflow: hidden;
  color: #e3e5ef;
}
.nav-drawer.open { transform: translateX(0); }
@media(min-width:1024px) {
  .nav-drawer { width: 256px; transform: translateX(0) !important; }
  .nav-drawer.collapsed { width: 64px; }
  .nav-drawer.collapsed .nav-label,
  .nav-drawer.collapsed .section-title { display: none; }
  .nav-drawer.collapsed .nav-btn { justify-content: center; padding: 8px; }
  .nav-drawer.collapsed .drawer-logo { display: none; }
  .nav-drawer.collapsed .drawer-header { justify-content: center; }
  .nav-drawer.collapsed .drawer-footer { display: none; }
}

.drawer-header {
  padding: 16px; display: flex; align-items: center;
  justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.07); flex-shrink: 0;
}
.drawer-logo  { max-height: 42px; max-width: 120px; object-fit: contain; }
.drawer-close, .drawer-collapse {
  background: none; border: none; color: var(--text2);
  cursor: pointer; padding: 4px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.drawer-close:hover, .drawer-collapse:hover { background: rgba(255,255,255,.06); color: var(--text); }

.drawer-nav   { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.nav-section  { margin-top: 16px; }
.section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a8abb5; padding: 0 8px 6px; }

.nav-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 9px 10px; border-radius: 8px;
  font-size: 13.5px; font-weight: 500; color: #a8abb5;
  text-decoration: none; border: none; background: none; cursor: pointer;
  transition: background .15s, color .15s;
}
.nav-btn:hover { background: rgba(255,255,255,.05); color: #e3e5ef; }
.nav-btn.router-link-active { background: rgba(255,255,255,.1); color: #fff; font-weight: 600; }
[data-theme="light"] .topbar { background: #f0f2fa; border-bottom-color: rgba(0,0,0,.12); }
[data-theme="light"] .filial-badge { background: rgba(0,0,0,.06); border-color: rgba(0,0,0,.12); color: var(--text2); }
[data-theme="light"] .user-chip { color: var(--text); }
[data-theme="light"] .user-dropdown { background: #fff; }
[data-theme="light"] .udrop-item:hover { background: rgba(0,0,0,.05); }
[data-theme="light"] .content-area { background: var(--bg); }
[data-theme="light"] .toast.success { background: #065f46; }
[data-theme="light"] .toast.error   { background: #991b1b; }

/* Filial switch */
.filial-switch-wrap { position: relative; }
.filial-badge-btn {
  display: flex; align-items: center;
  padding: 4px 12px; background: rgba(255,255,255,.06); border: 1px solid var(--border);
  border-radius: 20px; font-size: 11px; font-weight: 700; color: var(--text2);
  cursor: pointer; transition: all .15s;
}
.filial-badge-btn:hover { background: rgba(255,255,255,.1); color: var(--text); border-color: var(--primary); }
[data-theme="light"] .filial-badge-btn { background: rgba(0,0,0,.06); border-color: rgba(0,0,0,.12); color: var(--text); }
[data-theme="light"] .filial-badge-btn:hover { background: rgba(0,0,0,.1); color: var(--text); border-color: var(--primary-c); }

.filial-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  min-width: 220px; background: var(--bg2); border: 1px solid var(--border);
  border-radius: 12px; padding: 6px; z-index: 200;
  box-shadow: 0 8px 32px rgba(0,0,0,.3);
}
.filial-drop-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px;
  color: var(--text2); padding: 4px 10px 8px;
}
.filial-drop-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 10px; border-radius: 8px; background: none; border: none;
  color: var(--text); font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background .13s; text-align: left;
}
.filial-drop-item:hover { background: rgba(255,255,255,.07); }
.filial-drop-item.active { color: var(--primary); font-weight: 700; }
[data-theme="light"] .filial-drop-item:hover { background: rgba(0,0,0,.05); }
[data-theme="light"] .filial-drop-item.active { color: var(--primary-c); }
[data-theme="light"] .filial-drop-title { color: #64748b; }
.nav-icon { font-size: 20px; }

/* ── Drawer footer ─────────────────────────────────────── */
/* Footer do sidebar foi simplificado — ações movidas para topbar */

/* ── Main area ─────────────────────────────────────────── */
.app-main   { display: flex; flex-direction: column; flex: 1; min-width: 0; height: 100dvh; overflow: hidden; }
@media(min-width:1024px) {
  .app-main   { margin-left: 256px; }
  .app-main.sidebar-collapsed { margin-left: 64px; }
}

/* ── Topbar ────────────────────────────────────────────── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: var(--bg); border-bottom: 1px solid var(--border);
  flex-shrink: 0; z-index: 40;
}
.topbar-left   { display: flex; align-items: center; gap: 12px; }
.topbar-right  { display: flex; align-items: center; gap: 10px; }
.topbar-logo   { max-height: 36px; max-width: 120px; object-fit: contain; }
.hamburger     { background: none; border: none; color: var(--text2); cursor: pointer; padding: 6px; border-radius: 10px; }
.hamburger:hover { background: rgba(255,255,255,.06); color: var(--text); }

/* Filial + tema */
.filial-area   { display: flex; align-items: center; gap: 6px; }
.filial-badge  { padding: 4px 12px; background: rgba(255,255,255,.06); border: 1px solid var(--border); border-radius: 20px; font-size: 11px; font-weight: 700; color: var(--text2); }
.tema-toggle   { background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text2); cursor: pointer; padding: 4px 6px; display: flex; align-items: center; transition: all .15s; }
.tema-toggle:hover { background: rgba(255,255,255,.06); color: var(--text); border-color: var(--primary); }
.tema-toggle .material-symbols-outlined { font-size: 18px; }

/* User menu */
.user-menu-wrap { position: relative; }
.user-chip  { display: flex; align-items: center; gap: 6px; color: var(--text); font-size: 13px; font-weight: 600; padding: 5px 10px; padding-left: 12px; border-left: 1px solid var(--border); background: none; border-top: none; border-right: none; border-bottom: none; cursor: pointer; border-radius: 0; transition: color .15s; }
.user-chip:hover { color: var(--primary); }

/* Dropdown */
.user-dropdown {
  position: absolute; top: calc(100% + 10px); right: 0;
  min-width: 180px; background: var(--bg2); border: 1px solid var(--border);
  border-radius: 12px; padding: 6px; z-index: 200;
  box-shadow: 0 8px 32px rgba(0,0,0,.35);
}
.udrop-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 9px 12px; border-radius: 8px; background: none; border: none;
  color: var(--text); font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background .13s, color .13s; text-align: left;
}
.udrop-item:hover { background: rgba(255,255,255,.07); }
.udrop-item .material-symbols-outlined { font-size: 18px; color: var(--text2); }
.udrop-sair { color: #f87171; }
.udrop-sair .material-symbols-outlined { color: #f87171; }
.udrop-sair:hover { background: rgba(248,113,113,.08); }
.udrop-divider { height: 1px; background: var(--border); margin: 4px 0; }

/* Animacao dropdown */
.dropdown-enter-active, .dropdown-leave-active { transition: opacity .15s, transform .15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Content ───────────────────────────────────────────── */
.content-area {
  flex: 1; overflow-y: auto; background: var(--bg);
  padding: 16px 16px 80px;
  -webkit-overflow-scrolling: touch;
}
@media(min-width:1024px) { .content-area { padding: 28px 40px 0; } }

/* PDV ocupa 100% sem padding — evita scroll para ver os botões de ação */
.content-area:has(.pdv-wrap) {
  padding: 0;
  overflow: hidden;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 4px; }
[data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); }

/* ── Bottom nav ────────────────────────────────────────── */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  z-index: 50; display: flex; justify-content: space-around; align-items: center;
  padding: 8px 8px 20px; background: rgba(17,19,24,.92); backdrop-filter: blur(12px);
  border-top: 1px solid var(--border); border-radius: 16px 16px 0 0;
}
@media(min-width:1024px) { .bottom-nav { display: none !important; } }
.bnav-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 10px; background: none; border: none; color: var(--text2); font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; cursor: pointer; text-decoration: none; transition: color .15s; }
.bnav-btn .material-symbols-outlined { font-size: 24px; }
.bnav-btn:hover, .bnav-btn.router-link-active { color: #fff; }

/* ── Helpers responsive ────────────────────────────────── */
@media(max-width:1024px) { 
  .lg-hide { display: flex; } 
  .sm-hide { display: none !important; } 
}
@media(min-width:1024px) { 
  .lg-hide { display: none !important; } 
  .sm-hide { display: flex !important; } 
}

/* Ajustes finos Topbar Mobile */
@media(max-width: 600px) {
  .topbar { padding: 8px 12px; }
  .topbar-right { gap: 6px; }
  .filial-badge { padding: 4px 8px; font-size: 10px; }
  .user-chip { padding: 4px; border-left: none; }
}

/* ── Toast ─────────────────────────────────────────────── */
.toast {
  position: fixed; bottom: 88px; right: 16px; left: 16px;
  max-width: 420px; margin: 0 auto;
  background: #333; color: #fff; padding: 12px 16px; border-radius: 10px;
  font-size: 13px; display: none; align-items: center; gap: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,.4); z-index: 9999;
}
@media(min-width:480px) { .toast { left: auto; width: auto; } }
@media(min-width:1024px) { .toast { bottom: 16px; } }
.toast.show    { display: flex; }
.toast.success { background: #065f46; }
.toast.error   { background: #991b1b; }

.material-symbols-outlined { 
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; 
  display: inline-block;
  width: 1em;
  height: 1em;
  overflow: hidden;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  line-height: 1;
}
</style>
