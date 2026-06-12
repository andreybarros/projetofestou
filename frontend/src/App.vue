<template>
  <div :data-theme="tema" :class="['festou-root', tema]">

    <!-- ══ ROTA PÚBLICA (catálogo) ══════════════════════════════ -->
    <RouterView v-if="isPublicRoute" />

    <!-- ══ LOGIN ══════════════════════════════════════════════════ -->
    <div v-else-if="!sessao.isAutenticado" class="login-screen">
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

        <!-- Brand Header -->
        <div class="drawer-header">
          <div class="drawer-brand" @click="$router.push('/')" style="cursor:pointer">
            <img src="/img/logo_fundo_transp.png" alt="BarroStock" class="brand-logo-img" />
          </div>
          <button class="drawer-close lg-hide" @click="fecharSidebar">
            <span class="material-symbols-outlined">close</span>
          </button>
          <button class="drawer-collapse sm-hide" @click="toggleCollapse" :title="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'">
            <span class="material-symbols-outlined">{{ sidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
          </button>
        </div>

        <nav class="drawer-nav">

          <!-- PRINCIPAL -->
          <div class="nav-section nav-section-first">
            <p class="section-title">Principal</p>
            <RouterLink to="/" class="nav-btn" @click="fecharSidebar">
              <span class="material-symbols-outlined nav-icon" style="color:#60a5fa">home</span>
              <span class="nav-label">Início</span>
            </RouterLink>
            <RouterLink v-if="pode('pdv') && op?.acesso_dashboard" to="/dashboard" class="nav-btn" @click="fecharSidebar">
              <span class="material-symbols-outlined nav-icon" style="color:#fb7185">bar_chart</span>
              <span class="nav-label">Dashboard</span>
            </RouterLink>
            <RouterLink v-if="pode('pdv')" to="/pdv" class="nav-btn" @click="fecharSidebar">
              <span class="material-symbols-outlined nav-icon" style="color:#4ade80">point_of_sale</span>
              <span class="nav-label">Ponto de Venda</span>
            </RouterLink>
            <RouterLink v-if="pode('agenda')" to="/agenda" class="nav-btn" @click="fecharSidebar">
              <span class="material-symbols-outlined nav-icon" style="color:#38bdf8">calendar_month</span>
              <span class="nav-label">Agenda</span>
            </RouterLink>
          </div>

          <!-- ESTOQUE -->
          <div v-if="pode('produtos') || pode('categorias') || pode('clientes') || pode('fornecedores') || pode('armazens') || pode('entrada_nfe') || pode('pedidos_compra')" class="nav-section">
            <p class="section-title">Estoque</p>
            <RouterLink v-if="pode('produtos')"       to="/produtos"       class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fb923c">inventory_2</span><span class="nav-label">Produtos</span></RouterLink>
            <RouterLink v-if="pode('categorias')"     to="/categorias"     class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#facc15">label</span><span class="nav-label">Categorias</span></RouterLink>
            <RouterLink v-if="pode('clientes')"       to="/clientes"       class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#c084fc">group</span><span class="nav-label">Clientes</span></RouterLink>
            <RouterLink v-if="pode('fornecedores')"   to="/fornecedores"   class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#f59e0b">handshake</span><span class="nav-label">Fornecedores</span></RouterLink>
            <RouterLink v-if="pode('armazens')"       to="/armazens"       class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#22d3ee">warehouse</span><span class="nav-label">Armazéns</span></RouterLink>
            <RouterLink v-if="pode('entrada_nfe')"    to="/entrada-nfe"    class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#4ade80">move_to_inbox</span><span class="nav-label">Entrada de NF-e</span></RouterLink>
            <RouterLink v-if="pode('pedidos_compra')" to="/pedidos-compra" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fbbf24">shopping_cart</span><span class="nav-label">Pedidos de Compra</span></RouterLink>
          </div>

          <!-- CATÁLOGOS -->
          <div v-if="pode('catalogos')" class="nav-section">
            <p class="section-title">Catálogo</p>
            <RouterLink to="/catalogos" class="nav-btn" @click="fecharSidebar">
              <span class="material-symbols-outlined nav-icon" style="color:#a78bfa">link</span>
              <span class="nav-label">Catálogos Públicos</span>
            </RouterLink>
          </div>

          <!-- VENDAS -->
          <div v-if="pode('vendedores') || pode('historico') || pode('projetos')" class="nav-section">
            <p class="section-title">Vendas</p>
            <RouterLink v-if="pode('vendedores')" to="/vendedores"       class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#818cf8">person</span><span class="nav-label">Vendedores</span></RouterLink>
            <RouterLink v-if="pode('historico')"  to="/historico-vendas" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#94a3b8">history</span><span class="nav-label">Histórico de Vendas</span></RouterLink>
            <RouterLink v-if="pode('projetos')"   to="/projetos"         class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#a855f7">design_services</span><span class="nav-label">Projetos</span></RouterLink>
          </div>

          <!-- FINANCEIRO -->
          <div v-if="pode('caixa') || (pode('pdv') && op?.acesso_dashboard) || pode('receitas') || pode('despesas') || pode('financeiro')" class="nav-section">
            <p class="section-title">Financeiro</p>
            <RouterLink v-if="pode('caixa')"                       to="/caixa"          class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#10b981">payments</span><span class="nav-label">Caixa (Operação)</span></RouterLink>
            <RouterLink v-if="pode('receitas')"                    to="/contas-receber" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#34d399">receipt_long</span><span class="nav-label">Contas a Receber</span></RouterLink>
            <RouterLink v-if="pode('despesas')"                    to="/despesas"       class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#f87171">money_off</span><span class="nav-label">Contas a Pagar</span></RouterLink>
            <RouterLink v-if="pode('financeiro')"                  to="/financeiro"     class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#a3e635">account_balance_wallet</span><span class="nav-label">Cadastro de Contas</span></RouterLink>
          </div>

          <!-- RECURSOS HUMANOS -->
          <div v-if="podeRH" class="nav-section">
            <p class="section-title">Recursos Humanos</p>
            <RouterLink v-if="pode('funcionarios')"             to="/funcionarios"    class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#2dd4bf">badge</span><span class="nav-label">Funcionários</span></RouterLink>
            <RouterLink v-if="pode('ponto')"                    to="/ponto"           class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#60a5fa">schedule</span><span class="nav-label">Ponto Eletrônico</span></RouterLink>
            <RouterLink v-if="pode('holerite')"                 to="/holerites"       class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#a78bfa">description</span><span class="nav-label">Meus Holerites</span></RouterLink>
            <RouterLink v-if="op?.matricula || pode('espelho')" to="/espelho-ponto"   class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#f472b6">calendar_view_month</span><span class="nav-label">Espelho de Ponto</span></RouterLink>
            <RouterLink v-if="pode('gestao_ponto')"             to="/ajuste-batidas"  class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fb7185">location_on</span><span class="nav-label">Gestão de Batidas</span></RouterLink>
            <RouterLink v-if="pode('fech_ponto')"               to="/fechamento-ponto" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fb923c">lock_clock</span><span class="nav-label">Fechamento de Ponto</span></RouterLink>
            <RouterLink v-if="pode('vales')"                    to="/vales"           class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#a78bfa">request_quote</span><span class="nav-label">Vales</span></RouterLink>
          </div>

          <!-- OPERAÇÃO -->
          <div v-if="pode('separacao')" class="nav-section">
            <p class="section-title">Operação</p>
            <RouterLink to="/separacao" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fdba74">inventory</span><span class="nav-label">Separação</span></RouterLink>
          </div>

          <!-- RELATÓRIOS -->
          <div v-if="op?.admin || pode('fechamento') || pode('rel_vendas') || pode('rel_caixa') || pode('financeiro')" class="nav-section">
            <p class="section-title">Relatórios</p>
            <RouterLink v-if="pode('financeiro')" to="/consolidacao-vendas" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#34d399">account_balance</span><span class="nav-label">Consolidação</span></RouterLink>
            <RouterLink v-if="pode('rel_vendas')" to="/relatorio-vendas"    class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fbbf24">analytics</span><span class="nav-label">Rel. Vendas</span></RouterLink>
            <RouterLink v-if="pode('rel_caixa')"  to="/relatorio-caixa"     class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#38bdf8">summarize</span><span class="nav-label">Rel. Caixa</span></RouterLink>
            <RouterLink v-if="pode('fechamento')" to="/fechamento-caixa"    class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#fde047">lock</span><span class="nav-label">Fechamento de Caixa</span></RouterLink>
          </div>

          <!-- ADMINISTRAÇÃO -->
          <div v-if="op?.admin" class="nav-section">
            <p class="section-title">Administração</p>
            <RouterLink to="/parametros" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#94a3b8">tune</span><span class="nav-label">Parâmetros</span></RouterLink>
            <RouterLink to="/filiais"    class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#60a5fa">corporate_fare</span><span class="nav-label">Filiais</span></RouterLink>
            <RouterLink to="/operadores" class="nav-btn" @click="fecharSidebar"><span class="material-symbols-outlined nav-icon" style="color:#a5b4fc">manage_accounts</span><span class="nav-label">Operadores</span></RouterLink>
          </div>

        </nav>

        <!-- Sidebar Footer: Filial + Usuário -->
        <div class="drawer-footer">

          <!-- Seletor de filial -->
          <div class="sf-filial-wrap" v-if="sessao.filial" ref="sidebarFilialRef">
            <button class="sf-filial-btn" @click="sidebarFilialAberto = !sidebarFilialAberto">
              <div class="sf-filial-icon-wrap">
                <span class="material-symbols-outlined">corporate_fare</span>
              </div>
              <div class="sf-filial-text">
                <span class="sf-filial-code">Filial {{ sessao.filial.codigo }}</span>
                <span class="sf-filial-nome">{{ sessao.filial.nome }}</span>
              </div>
              <span class="material-symbols-outlined sf-filial-arrow">unfold_more</span>
            </button>
            <Transition name="dropdown">
              <div v-if="sidebarFilialAberto" class="sf-filial-dropdown">
                <div class="sf-drop-title">Trocar Filial</div>
                <button
                  v-for="f in todasFiliais"
                  :key="f.pk"
                  :class="['sf-drop-item', { active: f.pk === sessao.filial?.pk }]"
                  @click="trocarFilial(f); sidebarFilialAberto = false"
                >
                  <span class="material-symbols-outlined" style="font-size:14px">{{ f.pk === sessao.filial?.pk ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                  [{{ f.codigo }}] {{ f.nome }}
                </button>
              </div>
            </Transition>
          </div>

          <!-- Toggle tema -->
          <div class="sil-theme-row">
            <span class="sil-theme-label">
              <span class="material-symbols-outlined">{{ tema === 'dark' ? 'dark_mode' : 'light_mode' }}</span>
              {{ tema === 'dark' ? 'Modo Escuro' : 'Modo Claro' }}
            </span>
            <button :class="['sil-switch', { active: tema === 'dark' }]" @click="toggleTema" :title="tema === 'dark' ? 'Mudar para Light' : 'Mudar para Dark'"></button>
          </div>

          <!-- Usuário -->
          <div class="sf-user" v-if="op">
            <button class="sf-user-info-btn" @click="abrirModalSenha" title="Configurações da conta">
              <div class="sf-avatar" :style="{ background: navAvatarColor(op.nome) }">{{ navInitials(op.nome) }}</div>
              <div class="sf-user-info">
                <span class="sf-user-name">{{ op.nome }}</span>
                <span class="sf-user-role">{{ op.admin ? 'Administrador' : 'Operador' }}</span>
              </div>
            </button>
            <button class="sf-logout-btn" @click="doLogout" title="Sair do sistema">
              <span class="material-symbols-outlined">logout</span>
            </button>
          </div>

        </div>

      </aside>

      <!-- Mini Sidebar (desktop, collapsed mode) -->
      <aside v-if="sidebarCollapsed" class="mini-sidebar">

        <div class="mini-header">
          <button class="mini-btn mini-expand-btn" @click="toggleCollapse" data-tip="Expandir menu">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <nav class="mini-nav">
          <RouterLink to="/" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'home' }]" data-tip="Início">
            <span class="material-symbols-outlined">home</span>
            <span class="mini-label">Início</span>
          </RouterLink>
          <RouterLink v-if="pode('produtos') || pode('clientes') || pode('armazens')" to="/produtos" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'estoque' }]" data-tip="Estoque">
            <span class="material-symbols-outlined">inventory_2</span>
            <span class="mini-label">Estoque</span>
          </RouterLink>
          <RouterLink v-if="pode('pdv') || pode('vendedores') || pode('historico')" to="/pdv" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'vendas' }]" data-tip="Vendas">
            <span class="material-symbols-outlined">point_of_sale</span>
            <span class="mini-label">PDV</span>
          </RouterLink>
          <RouterLink v-if="pode('agenda') || pode('projetos')" to="/agenda" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'agenda' }]" data-tip="Agenda">
            <span class="material-symbols-outlined">calendar_month</span>
            <span class="mini-label">Agenda</span>
          </RouterLink>
          <RouterLink v-if="pode('caixa') || pode('receitas') || pode('despesas') || pode('financeiro')" to="/caixa" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'financeiro' }]" data-tip="Financeiro">
            <span class="material-symbols-outlined">payments</span>
            <span class="mini-label">Financeiro</span>
          </RouterLink>
          <RouterLink v-if="podeRH" to="/funcionarios" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'rh' }]" data-tip="Recursos Humanos">
            <span class="material-symbols-outlined">badge</span>
            <span class="mini-label">RH</span>
          </RouterLink>
          <RouterLink v-if="pode('separacao')" to="/separacao" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'operacao' }]" data-tip="Operação">
            <span class="material-symbols-outlined">inventory</span>
            <span class="mini-label">Operação</span>
          </RouterLink>
          <RouterLink v-if="op?.admin || pode('rel_vendas') || pode('rel_caixa') || pode('financeiro')" to="/relatorio-vendas" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'relatorios' }]" data-tip="Relatórios">
            <span class="material-symbols-outlined">analytics</span>
            <span class="mini-label">Relatórios</span>
          </RouterLink>
          <RouterLink v-if="op?.admin" to="/parametros" :class="['mini-btn', { 'mini-active': miniActiveGroup === 'admin' }]" data-tip="Administração">
            <span class="material-symbols-outlined">tune</span>
            <span class="mini-label">Parâmetros</span>
          </RouterLink>
        </nav>

        <div class="mini-footer">
          <div class="mini-avatar-wrap" v-if="op">
            <div class="mini-avatar" :style="{ background: navAvatarColor(op.nome) }">{{ navInitials(op.nome) }}</div>
          </div>
          <button class="mini-btn mini-logout-btn" @click="doLogout" data-tip="Sair do sistema">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>

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
          <div v-if="route.name === 'PDV'" class="topbar-shortcuts sm-hide">
            <span class="shortcut-chip"><kbd>Esc</kbd> Limpar</span>
            <span class="shortcut-chip"><kbd>F1</kbd> Orçamento</span>
            <span class="shortcut-chip"><kbd>F2</kbd> Itens</span>
            <span class="shortcut-chip"><kbd>F3</kbd> Detalhes</span>
            <span class="shortcut-chip"><kbd>F4</kbd> Pagamento</span>
          </div>
          <div class="topbar-right">
            <!-- Badge de filial + toggle tema -->
            <div class="filial-area" v-if="sessao.filial">
              <button class="tema-toggle" @click="toggleTema" :title="tema === 'dark' ? 'Mudar para Light' : 'Mudar para Dark'">
                <span class="material-symbols-outlined">{{ tema === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
              </button>
              <button v-if="updateDisponivel" class="update-topbar-btn" @click="atualizarAgora" title="Nova atualização disponível — clique para atualizar">
                <span class="material-symbols-outlined">system_update_alt</span>
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

    <!-- ══ MODAL: ALTERAR SENHA ══════════════════════════════════ -->
    <Transition name="modal-fade">
      <div v-if="modalSenha" class="gs-backdrop" @click.self="fecharModalSenha">
        <div class="gs-box">
          <div class="gs-header">
            <div class="gs-header-icon">
              <span class="material-symbols-outlined">lock</span>
            </div>
            <div>
              <h3 class="gs-title">Alterar Senha</h3>
              <p class="gs-sub">{{ op?.nome }}</p>
            </div>
            <button class="gs-close" @click="fecharModalSenha">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="gs-body">
            <div class="gs-field">
              <label>Senha Atual</label>
              <div class="gs-input-wrap">
                <span class="material-symbols-outlined gs-input-icon">lock_open</span>
                <input
                  :type="mostrarSenha.atual ? 'text' : 'password'"
                  v-model="formSenha.atual"
                  placeholder="Digite sua senha atual"
                  autocomplete="current-password"
                />
                <button type="button" class="gs-eye" @click="mostrarSenha.atual = !mostrarSenha.atual">
                  <span class="material-symbols-outlined">{{ mostrarSenha.atual ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>
            <div class="gs-field">
              <label>Nova Senha</label>
              <div class="gs-input-wrap">
                <span class="material-symbols-outlined gs-input-icon">lock</span>
                <input
                  :type="mostrarSenha.nova ? 'text' : 'password'"
                  v-model="formSenha.nova"
                  placeholder="Mínimo 4 caracteres"
                  autocomplete="new-password"
                />
                <button type="button" class="gs-eye" @click="mostrarSenha.nova = !mostrarSenha.nova">
                  <span class="material-symbols-outlined">{{ mostrarSenha.nova ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>
            <div class="gs-field">
              <label>Confirmar Nova Senha</label>
              <div class="gs-input-wrap" :class="{ 'gs-mismatch': formSenha.confirmar && formSenha.nova !== formSenha.confirmar }">
                <span class="material-symbols-outlined gs-input-icon">lock</span>
                <input
                  :type="mostrarSenha.confirmar ? 'text' : 'password'"
                  v-model="formSenha.confirmar"
                  placeholder="Repita a nova senha"
                  autocomplete="new-password"
                  @keydown.enter="salvarSenha"
                />
                <button type="button" class="gs-eye" @click="mostrarSenha.confirmar = !mostrarSenha.confirmar">
                  <span class="material-symbols-outlined">{{ mostrarSenha.confirmar ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              <span v-if="formSenha.confirmar && formSenha.nova !== formSenha.confirmar" class="gs-hint-err">As senhas não coincidem</span>
            </div>
          </div>
          <div class="gs-footer">
            <button class="gs-btn-cancel" @click="fecharModalSenha" :disabled="salvandoSenha">Cancelar</button>
            <button
              class="gs-btn-save"
              @click="salvarSenha"
              :disabled="salvandoSenha || !formSenha.atual || !formSenha.nova || formSenha.nova !== formSenha.confirmar"
            >
              <span class="material-symbols-outlined">{{ salvandoSenha ? 'hourglass_empty' : 'save' }}</span>
              {{ salvandoSenha ? 'Salvando...' : 'Salvar Senha' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast global -->
    <div id="toast" :class="['toast', { show: toast.visible, success: toast.tipo === 'success', error: toast.tipo === 'error' }]">
      {{ toast.tipo === 'success' ? '✅' : '❌' }} {{ toast.msg }}
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, provide, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSessaoStore } from './stores/sessao';
import { useAuthStore }   from './stores/auth';
import { useParametrosStore } from './stores/parametros';
import { useVendaStore } from './stores/venda';
import apiClient from './services/api';
import LoginView from './views/Login.vue';

const sessao      = useSessaoStore();
const authStore   = useAuthStore();
const parametros  = useParametrosStore();
const vendaStore  = useVendaStore();
const router      = useRouter();
const route       = useRoute();
const isPDV         = computed(() => route.name === 'PDV');
const isPublicRoute = computed(() => route.meta?.public === true);

const miniActiveGroup = computed(() => {
  const p = route.path;
  if (p === '/') return 'home';
  if (['/pdv','/vendedores','/historico-vendas','/dashboard'].some(x => p.startsWith(x))) return 'vendas';
  if (['/produtos','/categorias','/clientes','/fornecedores','/armazens','/entrada-nfe','/pedidos-compra'].some(x => p.startsWith(x))) return 'estoque';
  if (['/agenda','/projetos'].some(x => p.startsWith(x))) return 'agenda';
  if (['/caixa','/contas-receber','/despesas','/financeiro'].some(x => p.startsWith(x))) return 'financeiro';
  if (['/funcionarios','/ponto','/holerites','/espelho-ponto','/ajuste-batidas','/fechamento-ponto','/vales'].some(x => p.startsWith(x))) return 'rh';
  if (p.startsWith('/separacao')) return 'operacao';
  if (['/relatorio-vendas','/relatorio-caixa','/fechamento-caixa','/consolidacao-vendas'].some(x => p.startsWith(x))) return 'relatorios';
  if (['/parametros','/filiais','/operadores'].some(x => p.startsWith(x))) return 'admin';
  return '';
});
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
const filialMenuAberto    = ref(false);
const filialMenuRef       = ref(null);
const sidebarFilialAberto = ref(false);
const sidebarFilialRef    = ref(null);
const todasFiliais        = ref([]);

const NAV_AVATAR_COLORS = ['#00c853','#2563eb','#7c3aed','#db2777','#ea580c','#0891b2','#d97706'];
function navInitials(nome) {
  if (!nome) return '?';
  const parts = nome.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function navAvatarColor(nome) {
  if (!nome) return NAV_AVATAR_COLORS[0];
  let sum = 0; for (const c of nome) sum += c.charCodeAt(0);
  return NAV_AVATAR_COLORS[sum % NAV_AVATAR_COLORS.length];
}

let _carregandoFiliais = false;
async function carregarFiliais() {
  if (todasFiliais.value.length > 0 || _carregandoFiliais) return;
  _carregandoFiliais = true;
  try {
    const { data } = await apiClient.get('/api/auth/filiais');
    todasFiliais.value = data || [];
  } catch { /* silencioso */ } finally {
    _carregandoFiliais = false;
  }
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
  if (sidebarFilialRef.value && !sidebarFilialRef.value.contains(e.target)) {
    sidebarFilialAberto.value = false;
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
  checarVersao();
  _updatePollInterval = setInterval(checarVersao, 5 * 60 * 1000);
});
onUnmounted(() => {
  document.removeEventListener('click', fecharMenus, true);
  clearInterval(_updatePollInterval);
  clearTimeout(_toastTimer);
});

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
    criar_ordem: 'separacao', vales: 'funcionarios', holerite: 'ponto',
    entrada_nfe:    'produtos',
    projetos:       'agenda',
    pedidos_compra: 'produtos',
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
    rel_vendas:   o.acesso_relatorio_vendas || o.acesso_historico || o.acesso_pdv,
    vales:        o.acesso_vales,
    holerite:     o.acesso_holerite,
    entrada_nfe:    o.acesso_entrada_nfe,
    projetos:       o.acesso_projetos,
    pedidos_compra: o.acesso_pedidos_compra,
    catalogos:      o.acesso_admin || o.admin || true, // todos os operadores podem ver catálogos
  };
  return !!mapa[modulo];
}

const podeVendas = computed(() => pode('pdv') || pode('receitas') || pode('historico') || pode('despesas') || pode('financeiro'));
const podeAdmin  = computed(() => !!op.value?.admin);
const podeRH     = computed(() => {
  const temRHnaFilial = sessao.temModulo('ponto') || sessao.temModulo('funcionarios');
  if (!temRHnaFilial) return false;
  return pode('funcionarios') || pode('ponto') || pode('holerite') || !!op.value?.acesso_espelho_ponto;
});

// Modal: alterar senha
const modalSenha    = ref(false);
const salvandoSenha = ref(false);
const formSenha     = reactive({ atual: '', nova: '', confirmar: '' });
const mostrarSenha  = reactive({ atual: false, nova: false, confirmar: false });

function abrirModalSenha() {
  Object.assign(formSenha, { atual: '', nova: '', confirmar: '' });
  Object.assign(mostrarSenha, { atual: false, nova: false, confirmar: false });
  modalSenha.value = true;
}
function fecharModalSenha() { modalSenha.value = false; }

async function salvarSenha() {
  if (!formSenha.atual || !formSenha.nova || formSenha.nova !== formSenha.confirmar) return;
  if (formSenha.nova.length < 4) { showToast('Nova senha deve ter pelo menos 4 caracteres.', 'error'); return; }
  salvandoSenha.value = true;
  try {
    await apiClient.put('/api/auth/minha-senha', { senha_atual: formSenha.atual, nova_senha: formSenha.nova });
    showToast('Senha alterada com sucesso!');
    fecharModalSenha();
  } catch (e) {
    showToast(e.response?.data?.erro || 'Erro ao alterar senha.', 'error');
  } finally {
    salvandoSenha.value = false;
  }
}

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

// Verificação de atualização
const updateDisponivel = ref(false);
let _versaoAtual = null;
let _updatePollInterval = null;

async function checarVersao() {
  try {
    const r = await fetch('/version.json?t=' + Date.now());
    if (!r.ok) return;
    const { v } = await r.json();
    if (_versaoAtual === null) { _versaoAtual = v; return; }
    if (v !== _versaoAtual) updateDisponivel.value = true;
  } catch {}
}

function atualizarAgora() {
  window.location.reload();
}

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
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
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

/* ── SILK Sidebar ──────────────────────────────────────── */
.nav-drawer {
  position: fixed; top: 0; left: 0; height: 100dvh; width: 268px;
  display: flex; flex-direction: column; z-index: 65;
  transform: translateX(-100%); transition: transform .3s cubic-bezier(.4,0,.2,1);
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', 'Hanken Grotesk', sans-serif;
  background: #0e1019;
  border-right: 1px solid rgba(255,255,255,.04);
  color: rgba(255,255,255,.88);
}
/* sidebar sempre escura — contraste intencional com o conteúdo light */
.nav-drawer.open { transform: translateX(0); }
@media(min-width:1024px) {
  .nav-drawer { width: 260px; transform: translateX(0) !important; }
  .nav-drawer.collapsed { display: none; }
}

/* ── SILK Mini Sidebar ─────────────────────────────────── */
.mini-sidebar { display: none; }
@media(min-width:1024px) {
  .mini-sidebar {
    display: flex;
    position: fixed; top: 0; left: 0;
    width: 72px; height: 100dvh;
    background: #0e1019;
    border-right: 1px solid rgba(255,255,255,.04);
    flex-direction: column; align-items: center;
    z-index: 65; overflow: hidden;
  }
  /* mini-sidebar sempre escura */
}

.mini-header {
  width: 100%; display: flex; flex-direction: column; align-items: center;
  padding: 18px 0 14px; gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,.05); flex-shrink: 0;
}

.mini-nav {
  flex: 1; width: 100%; display: flex; flex-direction: column;
  align-items: center; padding: 12px 0; gap: 6px;
  overflow-y: auto; overflow-x: hidden; scrollbar-width: none;
}
.mini-nav::-webkit-scrollbar { display: none; }

/* ── Mini button — Silk neomórfico ── */
.mini-btn {
  position: relative;
  width: 48px; height: 48px; border-radius: 14px;
  background: transparent;
  border: none; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; flex-shrink: 0;
  color: rgba(255,255,255,.32);
  text-decoration: none; transition: all .2s;
}
.mini-btn .material-symbols-outlined { font-size: 22px; color: inherit; }
.mini-label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 8.5px; font-weight: 700; color: inherit; line-height: 1;
  text-align: center; max-width: 56px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mini-btn:hover {
  background: rgba(255,255,255,.07);
  color: rgba(255,255,255,.8);
}
.mini-btn.mini-active {
  background: rgba(99,102,241,.18);
  box-shadow: inset 2px 2px 5px rgba(0,0,0,.3);
  color: #a5b4fc;
}
/* Tooltip neomórfico */
.mini-btn::after {
  content: attr(data-tip);
  position: absolute; left: calc(100% + 14px); top: 50%;
  transform: translateY(-50%) translateX(-4px);
  background: #161d2e; border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.92);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px; font-weight: 600;
  padding: 5px 12px; border-radius: 9px;
  white-space: nowrap; pointer-events: none; opacity: 0; z-index: 2000;
  box-shadow: 0 4px 20px rgba(0,0,0,.55);
  transition: opacity .18s, transform .18s;
}
.mini-btn:hover::after { opacity: 1; transform: translateY(-50%) translateX(0); }

/* Mini footer */
.mini-footer {
  width: 100%; display: flex; flex-direction: column;
  align-items: center; padding: 10px 0 18px; gap: 8px;
  border-top: 1px solid rgba(255,255,255,.05); flex-shrink: 0;
}
.mini-expand-btn { color: rgba(255,255,255,.3); }
.mini-expand-btn .material-symbols-outlined { font-size: 20px; }

.mini-avatar-wrap { position: relative; width: 36px; height: 36px; }
.mini-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 800; color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,.35);
}
.mini-avatar-wrap::after {
  content: ''; position: absolute; bottom: 0; right: 0;
  width: 9px; height: 9px; background: #22c55e;
  border: 2px solid #0e1019; border-radius: 50%;
}
[data-theme="light"] .mini-avatar-wrap::after { border-color: #0e1019; }
.mini-logout-btn { color: rgba(255,255,255,.28); }
.mini-logout-btn .material-symbols-outlined { font-size: 19px; }
.mini-logout-btn:hover { color: #f87171; background: rgba(248,113,113,.1); }

/* ── SILK Brand header ─────────────────────────────────── */
.drawer-header {
  padding: 18px 14px 15px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,.05);
  flex-shrink: 0;
}
.drawer-brand { display: flex; align-items: center; gap: 10px; }
.brand-logo-img {
  height: 46px; width: auto; max-width: 160px;
  object-fit: contain; flex-shrink: 0;
}
.drawer-close, .drawer-collapse {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,.04);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,.32); transition: all .18s;
}

.drawer-close:hover, .drawer-collapse:hover {
  color: #6366f1;
  background: rgba(255,255,255,.07);
}
.drawer-close .material-symbols-outlined,
.drawer-collapse .material-symbols-outlined { font-size: 18px; }

/* ── SILK Nav ──────────────────────────────────────────── */
.drawer-nav {
  flex: 1; overflow-y: auto;
  padding: 8px 12px 16px;
  display: flex; flex-direction: column;
  scrollbar-width: none;
}
.drawer-nav::-webkit-scrollbar { display: none; }
.nav-section { margin-top: 22px; }
.nav-section-first { margin-top: 6px; }
.section-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 9.5px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 1.4px;
  color: rgba(255,255,255,.28);
  padding: 0 12px 6px;
}

.nav-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 10px 14px;
  border-radius: 12px; margin-bottom: 3px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,.48);
  text-decoration: none; border: none; background: transparent; cursor: pointer;
  transition: all .18s;
}
.nav-btn:hover {
  background: rgba(255,255,255,.07);
  color: rgba(255,255,255,.88);
}
.nav-btn.router-link-active {
  background: rgba(99,102,241,.16);
  box-shadow: inset 2px 2px 5px rgba(0,0,0,.25);
  color: #a5b4fc;
  font-weight: 700;
}
.nav-icon { font-size: 18px; flex-shrink: 0; }

/* ── SILK Drawer Footer ────────────────────────────────── */
.drawer-footer {
  border-top: 1px solid rgba(255,255,255,.05);
  padding: 12px 12px 16px;
  display: flex; flex-direction: column; gap: 8px;
  flex-shrink: 0;
}

/* Theme toggle switch — Silk */
.sil-theme-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; border-radius: 12px;
  background: rgba(255,255,255,.03);
}
.sil-theme-label {
  display: flex; align-items: center; gap: 7px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11.5px; font-weight: 600;
  color: rgba(255,255,255,.48);
  pointer-events: none;
}
[data-theme="light"] .sil-theme-label { color: #363a5c; font-weight: 700; }
.sil-theme-label .material-symbols-outlined { font-size: 16px; }
.sil-switch {
  position: relative; width: 40px; height: 22px;
  border-radius: 11px; border: none; cursor: pointer;
  background: rgba(255,255,255,.09);
  box-shadow: inset 2px 2px 4px rgba(0,0,0,.3);
  transition: all .22s; flex-shrink: 0;
}
.sil-switch::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(255,255,255,.35);
  transition: left .22s cubic-bezier(.4,0,.2,1), background .22s;
}
.sil-switch.active::after {
  left: 21px; background: #6366f1;
}

/* Filial selector */
.sf-filial-wrap { position: relative; }
.sf-filial-btn {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 9px 10px;
  background: rgba(255,255,255,.03);
  border: none; border-radius: 12px; cursor: pointer; text-align: left;
  transition: all .18s;
}
.sf-filial-btn:hover {
  background: rgba(255,255,255,.06);
}
.sf-filial-icon-wrap {
  width: 28px; height: 28px; background: rgba(99,102,241,.15);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.sf-filial-icon-wrap .material-symbols-outlined { font-size: 15px; color: #818cf8; }
[data-theme="light"] .sf-filial-icon-wrap .material-symbols-outlined { color: #6366f1; }
.sf-filial-text { flex: 1; min-width: 0; }
.sf-filial-code {
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 9.5px; font-weight: 700;
  color: rgba(255,255,255,.28); text-transform: uppercase; letter-spacing: 0.8px;
}
[data-theme="light"] .sf-filial-code { color: #565a80; font-weight: 800; }
.sf-filial-nome {
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: rgba(255,255,255,.68);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
[data-theme="light"] .sf-filial-nome { color: #1e2030; font-weight: 700; }
.sf-filial-arrow { font-size: 16px; color: rgba(255,255,255,.22); flex-shrink: 0; }
[data-theme="light"] .sf-filial-arrow { color: #4a4f6a; }
.sf-filial-dropdown {
  position: absolute; bottom: calc(100% + 6px); left: 0; right: 0;
  background: #161b22; border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px; padding: 6px; z-index: 300;
  box-shadow: 0 -8px 32px rgba(0,0,0,.5);
}
[data-theme="light"] .sf-filial-dropdown {
  background: #ffffff; border-color: rgba(0,0,0,.1);
  box-shadow: 0 -8px 32px rgba(0,0,0,.1), 4px 4px 14px #d0d2dc;
}
.sf-drop-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 9.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.9px; color: rgba(255,255,255,.28);
  padding: 4px 10px 7px;
}
[data-theme="light"] .sf-drop-title { color: #4a4f6a; font-weight: 900; }
.sf-drop-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 7px 10px; border-radius: 8px;
  background: none; border: none; cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px; font-weight: 500;
  color: rgba(255,255,255,.55);
  transition: background .13s; text-align: left;
}
.sf-drop-item:hover { background: rgba(255,255,255,.06); color: rgba(255,255,255,.9); }
.sf-drop-item.active { color: #818cf8; font-weight: 700; }
[data-theme="light"] .sf-drop-item { color: #1e2030; font-weight: 600; }
[data-theme="light"] .sf-drop-item:hover { background: rgba(0,0,0,.05); }
[data-theme="light"] .sf-drop-item.active { color: #4f46e5; }

/* User row */
.sf-user { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.sf-user-info-btn {
  display: flex; align-items: center; gap: 9px;
  flex: 1; min-width: 0; padding: 7px 8px; border-radius: 10px;
  background: none; border: none; cursor: pointer; text-align: left;
  transition: all .18s;
}
.sf-user-info-btn:hover {
  background: rgba(255,255,255,.06);
}
.sf-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11.5px; font-weight: 800; color: #fff;
  flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,.4);
}
.sf-user-info { flex: 1; min-width: 0; }
.sf-user-name {
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: rgba(255,255,255,.78);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
[data-theme="light"] .sf-user-name { color: #1e2030; font-weight: 700; }
.sf-user-role {
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 9.5px; font-weight: 600;
  color: rgba(255,255,255,.28); text-transform: uppercase; letter-spacing: 0.6px;
}
[data-theme="light"] .sf-user-role { color: #565a80; font-weight: 700; }
.sf-logout-btn {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255,255,255,.03);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,.28); transition: all .18s; flex-shrink: 0;
}
.sf-logout-btn:hover { color: #f87171; background: rgba(248,113,113,.08); }
.sf-logout-btn .material-symbols-outlined { font-size: 17px; }
[data-theme="light"] .topbar { background: #f0f2fa; border-bottom-color: rgba(0,0,0,.12); }
[data-theme="light"] .filial-badge { background: rgba(0,0,0,.06); border-color: rgba(0,0,0,.12); color: var(--text2); }
[data-theme="light"] .user-chip { color: var(--text); }
[data-theme="light"] .user-dropdown { background: #fff; }
[data-theme="light"] .udrop-item:hover { background: rgba(0,0,0,.05); }
[data-theme="light"] .content-area { background: #fff; }
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
[data-theme="light"] .filial-badge-btn { background: #fff; border-color: rgba(0,0,0,.18); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
[data-theme="light"] .filial-badge-btn:hover { background: #fff; border-color: var(--primary); color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,.12); }

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
  .app-main   { margin-left: 260px; }
  .app-main.sidebar-collapsed { margin-left: 72px; }
}

/* ── Topbar ────────────────────────────────────────────── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: var(--bg); border-bottom: 1px solid var(--border);
  flex-shrink: 0; z-index: 40; position: relative;
}
.topbar-left   { display: flex; align-items: center; gap: 12px; }
.topbar-right  { display: flex; align-items: center; gap: 10px; }
.topbar-logo   { max-height: 36px; max-width: 120px; object-fit: contain; }
/* ── Botão de atualização na topbar ─────────────────────────── */
.update-topbar-btn {
  display: flex; align-items: center; justify-content: center;
  background: rgba(99,102,241,.15); border: 1px solid #6366f1;
  border-radius: 8px; color: #a5b4fc; cursor: pointer;
  padding: 4px 7px; transition: all .15s;
  animation: update-pulse 2s ease-in-out infinite;
}
.update-topbar-btn:hover { background: #6366f1; color: #fff; }
.update-topbar-btn .material-symbols-outlined { font-size: 18px; }
@keyframes update-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,.5); }
  50%       { box-shadow: 0 0 0 5px rgba(99,102,241,0); }
}

.topbar-shortcuts {
  display: flex;
  align-items: center;
  gap: 8px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.shortcut-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text2);
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 3px 8px;
}
.shortcut-chip kbd {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  border-radius: 3px;
  padding: 1px 4px;
}
.hamburger     { background: none; border: none; color: var(--text2); cursor: pointer; padding: 6px; border-radius: 10px; }
.hamburger:hover { background: rgba(255,255,255,.06); color: var(--text); }

/* Filial + tema */
.filial-area   { display: flex; align-items: center; gap: 6px; }
.filial-badge  { padding: 4px 12px; background: rgba(255,255,255,.06); border: 1px solid var(--border); border-radius: 20px; font-size: 11px; font-weight: 700; color: var(--text2); }
.tema-toggle { background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text2); cursor: pointer; padding: 4px 6px; display: flex; align-items: center; transition: all .15s; }
.tema-toggle:hover { background: rgba(255,255,255,.06); color: var(--text); border-color: var(--primary); }
.tema-toggle .material-symbols-outlined { font-size: 18px; }
[data-theme="light"] .tema-toggle { background: #fff; border-color: rgba(0,0,0,.15); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.07); }
[data-theme="light"] .tema-toggle:hover { background: #fff; border-color: var(--primary); color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,.12); }

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
.content-area:has(.pdv-wrap), .content-area:has(.pdv) {
  padding: 0 !important;
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

/* ── Modal Alterar Senha ───────────────────────────────── */
.gs-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.gs-box {
  background: #111318; border: 1px solid rgba(255,255,255,0.09);
  border-radius: 18px; width: 100%; max-width: 420px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.55);
  display: flex; flex-direction: column; overflow: hidden;
  font-family: 'Hanken Grotesk', sans-serif;
}
[data-theme="light"] .gs-box { background: #ffffff; border-color: rgba(0,0,0,0.1); }

.gs-header {
  display: flex; align-items: center; gap: 12px;
  padding: 1.25rem 1.4rem; border-bottom: 1px solid rgba(255,255,255,0.06);
}
[data-theme="light"] .gs-header { border-bottom-color: rgba(0,0,0,0.08); }
.gs-header-icon {
  width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
  background: rgba(0,200,83,0.14); color: #00c853;
  display: flex; align-items: center; justify-content: center;
}
.gs-header-icon .material-symbols-outlined { font-size: 22px; }
.gs-title { margin: 0; font-size: 1rem; font-weight: 800; color: #e3e5ef; }
[data-theme="light"] .gs-title { color: #0f172a; }
.gs-sub   { margin: 2px 0 0; font-size: 0.78rem; color: rgba(255,255,255,0.38); }
[data-theme="light"] .gs-sub { color: #64748b; }
.gs-close {
  margin-left: auto; background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.3); padding: 5px; border-radius: 7px;
  display: flex; align-items: center; transition: all .15s; flex-shrink: 0;
}
.gs-close:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.75); }
[data-theme="light"] .gs-close { color: #94a3b8; }
[data-theme="light"] .gs-close:hover { background: rgba(0,0,0,0.06); color: #374151; }
.gs-close .material-symbols-outlined { font-size: 20px; }

.gs-body {
  padding: 1.4rem; display: flex; flex-direction: column; gap: 1rem;
}
.gs-field { display: flex; flex-direction: column; gap: 6px; }
.gs-field label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.6px; color: rgba(255,255,255,0.38);
}
[data-theme="light"] .gs-field label { color: #64748b; }

.gs-input-wrap {
  display: flex; align-items: center; gap: 0;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; overflow: hidden; transition: border-color .15s;
}
.gs-input-wrap:focus-within { border-color: #00c853; box-shadow: 0 0 0 3px rgba(0,200,83,0.12); }
.gs-input-wrap.gs-mismatch { border-color: #f87171; }
.gs-input-wrap.gs-mismatch:focus-within { box-shadow: 0 0 0 3px rgba(248,113,113,0.15); }
[data-theme="light"] .gs-input-wrap { background: #f8fafc; border-color: rgba(0,0,0,0.12); }

.gs-input-icon {
  font-size: 18px; padding: 0 10px; color: rgba(255,255,255,0.28); flex-shrink: 0;
}
[data-theme="light"] .gs-input-icon { color: #94a3b8; }

.gs-input-wrap input {
  flex: 1; background: none; border: none; outline: none;
  padding: 0.7rem 0.25rem; font-size: 0.9rem; font-weight: 500;
  color: #e3e5ef; font-family: 'Hanken Grotesk', sans-serif;
}
[data-theme="light"] .gs-input-wrap input { color: #0f172a; }
.gs-input-wrap input::placeholder { color: rgba(255,255,255,0.2); }
[data-theme="light"] .gs-input-wrap input::placeholder { color: #94a3b8; }

.gs-eye {
  background: none; border: none; cursor: pointer; padding: 0 12px;
  color: rgba(255,255,255,0.28); display: flex; align-items: center;
  transition: color .15s; flex-shrink: 0;
}
.gs-eye:hover { color: rgba(255,255,255,0.7); }
.gs-eye .material-symbols-outlined { font-size: 18px; }
[data-theme="light"] .gs-eye { color: #94a3b8; }
[data-theme="light"] .gs-eye:hover { color: #374151; }

.gs-hint-err {
  font-size: 0.72rem; color: #f87171; font-weight: 600; padding-left: 2px;
}

.gs-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding: 1rem 1.4rem; border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}
[data-theme="light"] .gs-footer { border-top-color: rgba(0,0,0,0.08); background: #f8fafc; }

.gs-btn-cancel {
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); padding: 0.6rem 1.2rem;
  border-radius: 9px; cursor: pointer; font-size: 0.875rem;
  font-weight: 600; font-family: 'Hanken Grotesk', sans-serif;
  transition: all .15s;
}
.gs-btn-cancel:hover:not(:disabled) { background: rgba(255,255,255,0.06); color: #e3e5ef; }
.gs-btn-cancel:disabled { opacity: 0.45; cursor: not-allowed; }
[data-theme="light"] .gs-btn-cancel { border-color: rgba(0,0,0,0.15); color: #374151; }
[data-theme="light"] .gs-btn-cancel:hover:not(:disabled) { background: rgba(0,0,0,0.05); }

.gs-btn-save {
  display: flex; align-items: center; gap: 6px;
  background: #00c853; color: #fff; border: none;
  padding: 0.6rem 1.3rem; border-radius: 9px; cursor: pointer;
  font-size: 0.875rem; font-weight: 700;
  font-family: 'Hanken Grotesk', sans-serif;
  box-shadow: 0 2px 10px rgba(0,200,83,0.3);
  transition: background .15s, box-shadow .15s;
}
.gs-btn-save:hover:not(:disabled) { background: #00b548; box-shadow: 0 4px 14px rgba(0,200,83,0.4); }
.gs-btn-save:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.gs-btn-save .material-symbols-outlined { font-size: 17px; }

/* Transição modal */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .gs-box, .modal-fade-leave-to .gs-box { transform: scale(0.95) translateY(12px); }
</style>
