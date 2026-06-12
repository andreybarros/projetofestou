<template>
  <div class="page-wrap">
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">Gestão Financeira</h2>
        <p class="page-sub">Acompanhe contas bancárias, movimentações e despesas</p>
      </div>
    </div>

    <!-- Abas -->
    <div class="tabs">
      <button :class="['tab-btn', { active: tabAtiva === 'contas' }]" @click="mudarTab('contas')">
        <span class="material-symbols-outlined">account_balance</span>
        <span class="tab-label">Minhas Contas</span>
      </button>
      <button :class="['tab-btn', { active: tabAtiva === 'extrato' }]" @click="mudarTab('extrato')">
        <span class="material-symbols-outlined">receipt_long</span>
        <span class="tab-label">Extrato Geral</span>
      </button>
      <button :class="['tab-btn', { active: tabAtiva === 'formas' }]" @click="mudarTab('formas')">
        <span class="material-symbols-outlined">payments</span>
        <span class="tab-label">Formas de Pagamento</span>
      </button>
      <button :class="['tab-btn', { active: tabAtiva === 'categorias' }]" @click="mudarTab('categorias')">
        <span class="material-symbols-outlined">label</span>
        <span class="tab-label">Cat. Despesa</span>
      </button>
    </div>

    <div class="tab-content card">

      <!-- ══ ABA: MINHAS CONTAS ══════════════════════════════════ -->
      <div v-if="tabAtiva === 'contas'" class="animate-fade">

        <div class="section-header">
          <div>
            <h3 class="section-title">Visão Geral de Saldos</h3>
            <p class="section-sub">{{ contas.length }} conta{{ contas.length !== 1 ? 's' : '' }} cadastrada{{ contas.length !== 1 ? 's' : '' }}</p>
          </div>
          <button @click="carregarContas" class="btn-ghost sm" :disabled="carregandoContas">
            <span class="material-symbols-outlined" :class="{ 'spin-icon': carregandoContas }">refresh</span>
            Atualizar
          </button>
        </div>

        <div v-if="carregandoContas" class="loading-state">
          <div class="spinner-md"></div>
          <span>Carregando contas...</span>
        </div>

        <div v-else class="contas-grid">
          <div v-for="c in contas" :key="c.pk" class="conta-card">
            <div class="conta-card-top">
              <div :class="['conta-icon', getTipoClass(c.tipo)]">
                <span class="material-symbols-outlined">{{ getContaIcon(c.tipo) }}</span>
              </div>
              <div class="conta-actions">
                <button @click="abrirEditSaldo(c)" class="icon-btn" title="Editar saldo">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button @click="excluirConta(c)" class="icon-btn danger" title="Excluir">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
            <div class="conta-card-mid">
              <span class="conta-nome">{{ c.nome }}</span>
              <span class="conta-tipo-badge">{{ tipoLabel(c.tipo) }}</span>
            </div>
            <div class="conta-card-bot">
              <span class="saldo-label">Saldo Atual</span>
              <span :class="['saldo-valor', { neg: c.saldo < 0 }]">{{ fmt(c.saldo) }}</span>
            </div>
          </div>

          <!-- Card adicionar nova conta -->
          <div class="conta-card add-card" @click="abrirModalNovaConta">
            <span class="material-symbols-outlined add-icon">add_circle</span>
            <span class="add-label">Adicionar Nova Conta</span>
          </div>
        </div>

        <!-- Resumo consolidado -->
        <div v-if="contas.length > 0" class="resumo-section">
          <div class="resumo-card total">
            <div class="resumo-icon"><span class="material-symbols-outlined">account_balance_wallet</span></div>
            <div class="resumo-info">
              <span class="resumo-label">Total Disponível</span>
              <span :class="['resumo-valor', { neg: totalDisponivel < 0 }]">{{ fmt(totalDisponivel) }}</span>
            </div>
          </div>
          <div class="resumo-card pendencias">
            <div class="resumo-icon warn"><span class="material-symbols-outlined">pending_actions</span></div>
            <div class="resumo-info">
              <span class="resumo-label">Despesas Vencendo Hoje</span>
              <span class="resumo-num">{{ pendenciasHoje.length }}</span>
              <span class="resumo-sub" v-if="pendenciasHoje.length > 0">{{ fmt(totalPendenciasHoje) }}</span>
            </div>
          </div>
          <div class="resumo-card info">
            <div class="resumo-icon blue"><span class="material-symbols-outlined">trending_up</span></div>
            <div class="resumo-info">
              <span class="resumo-label">Contas Ativas</span>
              <span class="resumo-num">{{ contas.length }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ══ ABA: EXTRATO ════════════════════════════════════════ -->
      <div v-if="tabAtiva === 'extrato'" class="animate-fade">

        <!-- Filtros -->
        <div class="ex-filters">
          <div class="ex-filters-left">
            <div class="field">
              <label>Período</label>
              <select v-model="filtroPeriodo" @change="aplicarPeriodo" class="ex-select-periodo">
                <option value="hoje">Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="mes">Este mês</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="mes_ant">Mês anterior</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <template v-if="filtroPeriodo === 'custom'">
              <div class="field mw-150">
                <label>De</label>
                <input type="date" v-model="filtroDE" />
              </div>
              <div class="field mw-150">
                <label>Até</label>
                <input type="date" v-model="filtroATE" />
              </div>
            </template>
            <div class="field mw-200">
              <label>Conta</label>
              <select v-model="filtroContaPk">
                <option :value="null">Todas as Contas</option>
                <option v-for="c in contas" :key="c.pk" :value="c.pk">{{ c.nome }}</option>
              </select>
            </div>
            <div class="field mw-200">
              <label>Categoria</label>
              <select v-model="filtroCategoria">
                <option value="">Todas as Categorias</option>
                <option v-for="c in categorias" :key="c.pk" :value="c.nome">{{ c.nome }}</option>
              </select>
            </div>
          </div>
          <div class="ex-filters-right">
            <button @click="carregarExtrato" class="btn-primary" :disabled="carregandoExtrato">
              <span v-if="carregandoExtrato" class="spinner-sm"></span>
              <span v-else class="material-symbols-outlined" style="font-size:16px">search</span>
              {{ carregandoExtrato ? 'Carregando...' : 'Filtrar' }}
            </button>
            <button @click="exportarCSV" class="btn-ghost" :disabled="extratoFiltrado.length === 0">
              <span class="material-symbols-outlined" style="font-size:16px">download</span>
              Exportar
            </button>
          </div>
        </div>

        <!-- Tabela -->
        <div class="ex-table-wrap">
          <table class="ex-tabela">
            <thead>
              <tr>
                <th class="th-data">Data / Hora</th>
                <th>Descrição</th>
                <th>Conta</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="carregandoExtrato">
                <tr><td colspan="6" class="ex-empty"><div class="spinner-md mx-auto"></div></td></tr>
              </template>
              <template v-else-if="extratoPaginado.length === 0">
                <tr><td colspan="6" class="ex-empty">Nenhuma movimentação no período.</td></tr>
              </template>
              <template v-else>
                <tr v-for="m in extratoPaginado" :key="m.pk" class="ex-row">
                  <td class="ex-data-cell">
                    <span class="ex-dia">{{ dtDia(m.data_movimento) }}</span>
                    <span class="ex-hora">{{ dtHora(m.data_movimento) }}</span>
                  </td>
                  <td class="ex-desc-cell">
                    <div :class="['ex-tipo-dot', m.tipo_movimento]">
                      <span class="material-symbols-outlined">
                        {{ m.tipo_movimento === 'entrada' ? 'arrow_upward' : m.tipo_movimento === 'previsto' ? 'schedule' : 'arrow_downward' }}
                      </span>
                    </div>
                    <span class="ex-desc-txt">{{ m.descricao || '—' }}</span>
                  </td>
                  <td class="ex-conta-cell">{{ m.contas_bancarias?.nome || '—' }}</td>
                  <td>
                    <span v-if="m.categoria" class="ex-cat-tag">{{ m.categoria }}</span>
                    <span v-else class="muted">—</span>
                  </td>
                  <td>
                    <span :class="['ex-badge', m.tipo_movimento]">{{ tipoMovLabel(m.tipo_movimento) }}</span>
                  </td>
                  <td :class="['ex-valor-cell', m.tipo_movimento]">
                    {{ m.tipo_movimento === 'entrada' ? '+' : m.tipo_movimento === 'previsto' ? '' : '−' }}
                    {{ fmt(m.valor) }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>

          <!-- Paginação -->
          <div v-if="extratoTotalPaginas > 1" class="ex-paginacao">
            <button @click="extratoPagina = 1" :disabled="extratoPagina === 1" class="pag-btn">
              <span class="material-symbols-outlined">first_page</span>
            </button>
            <button @click="extratoPagina--" :disabled="extratoPagina === 1" class="pag-btn">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              v-for="p in paginasVisiveis" :key="p"
              @click="extratoPagina = p"
              :class="['pag-num', { active: extratoPagina === p }]"
            >{{ p }}</button>
            <button @click="extratoPagina++" :disabled="extratoPagina === extratoTotalPaginas" class="pag-btn">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
            <button @click="extratoPagina = extratoTotalPaginas" :disabled="extratoPagina === extratoTotalPaginas" class="pag-btn">
              <span class="material-symbols-outlined">last_page</span>
            </button>
            <span class="pag-info">
              {{ (extratoPagina - 1) * EXTRATO_POR_PAGINA + 1 }}–{{ Math.min(extratoPagina * EXTRATO_POR_PAGINA, extratoFiltrado.length) }}
              de {{ extratoFiltrado.length }}
            </span>
          </div>
        </div>

        <!-- Summary cards (bottom) -->
        <div class="ex-summary">
          <div class="ex-sum-card entrada">
            <div class="ex-sum-icon">
              <span class="material-symbols-outlined">arrow_circle_down</span>
            </div>
            <div class="ex-sum-body">
              <span class="ex-sum-label">Total de Entradas</span>
              <span class="ex-sum-valor">{{ fmt(totalEntradas) }}</span>
              <div v-if="totalEntradasAnt > 0" class="ex-sum-comp">
                <span :class="['ex-comp-badge', totalEntradas >= totalEntradasAnt ? 'badge-up' : 'badge-down']">
                  <span class="material-symbols-outlined">{{ totalEntradas >= totalEntradasAnt ? 'trending_up' : 'trending_down' }}</span>
                  {{ variacaoPct(totalEntradas, totalEntradasAnt) }}%
                </span>
                <span class="ex-comp-ref">vs. mês anterior</span>
              </div>
            </div>
          </div>

          <div class="ex-sum-card saida">
            <div class="ex-sum-icon">
              <span class="material-symbols-outlined">arrow_circle_up</span>
            </div>
            <div class="ex-sum-body">
              <span class="ex-sum-label">Total de Saídas</span>
              <span class="ex-sum-valor">{{ fmt(totalSaidas) }}</span>
              <div v-if="totalSaidasAnt > 0" class="ex-sum-comp">
                <span :class="['ex-comp-badge', totalSaidas <= totalSaidasAnt ? 'badge-up' : 'badge-down']">
                  <span class="material-symbols-outlined">{{ totalSaidas <= totalSaidasAnt ? 'trending_down' : 'trending_up' }}</span>
                  {{ variacaoPct(totalSaidas, totalSaidasAnt) }}%
                </span>
                <span class="ex-comp-ref">vs. mês anterior</span>
              </div>
            </div>
          </div>

          <div :class="['ex-sum-card', saldoPeriodo >= 0 ? 'saldo-pos' : 'saldo-neg']">
            <div class="ex-sum-icon">
              <span class="material-symbols-outlined">{{ saldoPeriodo >= 0 ? 'trending_up' : 'trending_down' }}</span>
            </div>
            <div class="ex-sum-body">
              <span class="ex-sum-label">Saldo do Período</span>
              <span class="ex-sum-valor">{{ fmt(saldoPeriodo) }}</span>
              <div v-if="saldoAnt !== 0" class="ex-sum-comp">
                <span :class="['ex-comp-badge', saldoPeriodo >= saldoAnt ? 'badge-up' : 'badge-down']">
                  <span class="material-symbols-outlined">{{ saldoPeriodo >= saldoAnt ? 'trending_up' : 'trending_down' }}</span>
                  {{ variacaoPct(saldoPeriodo, saldoAnt) }}%
                </span>
                <span class="ex-comp-ref">vs. mês anterior</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ══ ABA: FORMAS DE PAGAMENTO ════════════════════════════ -->
      <div v-if="tabAtiva === 'formas'" class="animate-fade">
        <div class="section-header">
          <div>
            <h3 class="section-title">Formas de Pagamento</h3>
            <p class="section-sub">Configure os métodos aceitos no PDV</p>
          </div>
          <button @click="abrirNovaForma" class="btn-primary sm">
            <span class="material-symbols-outlined" style="font-size:16px">add</span>
            Nova Forma
          </button>
        </div>

        <div class="formas-layout">
          <!-- Lista de formas -->
          <div class="formas-main">
            <div v-if="carregandoFormas" class="loading-state"><div class="spinner-md"></div></div>
            <div v-else class="formas-hcards">
              <div v-for="f in formas" :key="f.pk" :class="['forma-hcard', { inativo: !f.ativo }]">
                <div class="fh-icon">{{ f.icone }}</div>
                <div class="fh-info">
                  <span class="fh-nome">{{ f.label }}</span>
                  <span class="fh-id">{{ f.forma }}</span>
                </div>
                <div class="fh-uso">
                  <div class="fh-bar-track">
                    <div class="fh-bar-fill" :style="{ width: formaUso(f.forma) + '%' }"></div>
                  </div>
                  <span class="fh-pct">{{ formaUso(f.forma) }}% das vendas</span>
                </div>
                <div class="fh-right">
                  <span :class="['fh-status', f.ativo ? 'ativo' : 'pausado']">
                    <span class="material-symbols-outlined" style="font-size:13px">{{ f.ativo ? 'check_circle' : 'pause_circle' }}</span>
                    {{ f.ativo ? 'Ativo' : 'Pausado' }}
                  </span>
                  <div class="fh-actions">
                    <button @click="toggleForma(f)" class="btn-toggle">{{ f.ativo ? 'Pausar' : 'Ativar' }}</button>
                    <button @click="abrirEditarForma(f)" class="icon-btn"><span class="material-symbols-outlined">edit</span></button>
                    <button @click="excluirForma(f)" class="icon-btn danger"><span class="material-symbols-outlined">delete</span></button>
                  </div>
                </div>
              </div>
              <div v-if="formas.length === 0" class="vazio">Nenhuma forma cadastrada.</div>
            </div>
          </div>

          <!-- Sidebar: uso + banner -->
          <div class="formas-sidebar">
            <div class="fu-card">
              <h4 class="fu-title">Uso por Canal</h4>
              <p class="fu-sub">Volume de recebimentos no mês</p>
              <div v-if="carregandoFormaUso" class="loading-state" style="padding:0.75rem 0"><div class="spinner-md"></div></div>
              <div v-else class="fu-lista">
                <div v-for="(f, i) in formasUsoPorcentagem" :key="f.forma" class="fu-row">
                  <span class="fu-icon">{{ f.icone }}</span>
                  <div class="fu-info">
                    <span class="fu-label">{{ f.label }}</span>
                    <div class="fu-bar-track">
                      <div class="fu-bar-fill" :style="{ width: f.pct + '%', background: FU_COLORS[i % FU_COLORS.length] }"></div>
                    </div>
                  </div>
                  <span class="fu-pct-val">{{ f.pct }}%</span>
                </div>
                <div v-if="formasUsoPorcentagem.length === 0" style="font-size:0.8rem; color:var(--text2); text-align:center; padding:1rem 0">Sem movimentações no mês.</div>
              </div>
            </div>

            <div class="formas-banner">
              <div class="banner-overlay">
                <span class="material-symbols-outlined banner-big-icon">credit_card</span>
              </div>
              <div class="banner-body">
                <span class="banner-badge-top">Destaque</span>
                <h4 class="banner-title">Condição Especial</h4>
                <p class="banner-desc">Receba via PIX com confirmação instantânea e zero taxa para o seu negócio.</p>
                <span class="banner-chip">PIX Gratuito</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ ABA: CATEGORIAS ═════════════════════════════════════ -->
      <div v-if="tabAtiva === 'categorias'" class="animate-fade">
        <div class="section-header">
          <div>
            <h3 class="section-title">Categorias de Despesa</h3>
            <p class="section-sub">Organize e analise seus gastos por categoria</p>
          </div>
          <button @click="abrirModalNovaCategoria" class="btn-primary sm">
            <span class="material-symbols-outlined" style="font-size:16px">add</span>
            Nova Categoria
          </button>
        </div>

        <div v-if="carregandoCats" class="loading-state"><div class="spinner-md"></div><span>Carregando...</span></div>
        <div v-else class="cat-layout">
          <!-- Grid de cards -->
          <div class="cat-main">
            <div class="cats-grid">
              <div v-for="(c, i) in categorias" :key="c.pk" class="cat-card" :style="{ '--cat-clr': catColor(c.cor, i) }">
                <div class="cat-card-top">
                  <div class="cat-icon-circle">
                    <span class="material-symbols-outlined">{{ catIcon(c.nome) }}</span>
                  </div>
                  <div class="cat-card-actions">
                    <button class="icon-btn cat-edit-btn" @click="abrirEditarCategoria(c)" title="Editar">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="icon-btn danger cat-del-btn" @click="excluirCategoria(c)" title="Excluir">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
                <div class="cat-card-mid">
                  <h4 class="cat-card-nome">{{ c.nome }}</h4>
                </div>
                <div class="cat-card-bot">
                  <div class="cat-stat-row">
                    <div class="cat-stat">
                      <span class="cat-stat-val">{{ catStats[c.nome]?.count || 0 }}</span>
                      <span class="cat-stat-lbl">lançamentos</span>
                    </div>
                    <div class="cat-stat">
                      <span class="cat-stat-val money">{{ fmt(catStats[c.nome]?.total || 0) }}</span>
                      <span class="cat-stat-lbl">no mês</span>
                    </div>
                  </div>
                  <div class="cat-progress-track">
                    <div class="cat-progress-fill" :style="{ width: catPercent(c.nome) + '%' }"></div>
                  </div>
                </div>
              </div>

              <div class="cat-card cat-add-card" @click="abrirModalNovaCategoria">
                <span class="material-symbols-outlined cat-add-icon">add_circle</span>
                <span class="cat-add-label">Nova Categoria</span>
              </div>
            </div>
          </div>

          <!-- Sidebar: resumo + insight -->
          <div class="cat-sidebar">
            <div class="cat-resumo-card">
              <h4 class="cat-resumo-title">Resumo Mensal</h4>
              <div class="cat-resumo-bars">
                <div v-for="(c, i) in categoriasSorted" :key="c.pk" class="cat-bar-row">
                  <span class="cat-bar-nome">{{ c.nome }}</span>
                  <div class="cat-bar-track">
                    <div class="cat-bar-fill" :style="{ width: catPercent(c.nome) + '%', background: catColor(c.cor, i) }"></div>
                  </div>
                  <span class="cat-bar-val">{{ fmt(catStats[c.nome]?.total || 0) }}</span>
                </div>
                <div v-if="categorias.length === 0" style="font-size:0.8rem; color:var(--text2); text-align:center; padding:1.5rem 0">Nenhuma categoria cadastrada.</div>
              </div>
            </div>

            <div class="cat-insight-card">
              <span class="material-symbols-outlined" style="font-size:2rem; opacity:.85">lightbulb</span>
              <h4 style="margin:0.5rem 0 0.25rem; font-size:0.95rem; font-weight:800">Insight do Mês</h4>
              <p style="margin:0; font-size:0.8rem; line-height:1.6; opacity:.9">{{ insightMes }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ══ MODAL: NOVA CONTA ══════════════════════════════════════ -->
    <Teleport to=".festou-root">
      <div v-if="modalNovaConta" class="modal-backdrop" @click.self="modalNovaConta = false">
        <div class="modal-box animate-slide-up">
          <div class="modal-header">
            <h3>Nova Conta</h3>
            <button @click="modalNovaConta = false" class="close-btn"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="field mb-3">
              <label>Nome da Conta *</label>
              <input v-model="formConta.nome" type="text" placeholder="Ex: Caixa Diário, NuBank, Itaú..." />
            </div>
            <div class="field mb-3">
              <label>Tipo de Conta</label>
              <select v-model="formConta.tipo">
                <option value="pix">Pix</option>
                <option value="debito">Cartão de Débito</option>
                <option value="credito">Cartão de Crédito</option>
                <option value="dinheiro">Dinheiro em Espécie</option>
              </select>
            </div>
            <div class="field">
              <label>Saldo Inicial (R$)</label>
              <input v-model.number="formConta.saldo" type="number" step="0.01" />
            </div>
          </div>
          <div class="modal-footer">
            <button @click="modalNovaConta = false" class="btn-ghost" :disabled="processando">Cancelar</button>
            <button @click="salvarConta" class="btn-primary" :disabled="!formConta.nome || processando">
              {{ processando ? 'Salvando...' : 'Salvar Conta' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ MODAL: EDITAR SALDO ════════════════════════════════════ -->
    <Teleport to=".festou-root">
      <div v-if="modalEditSaldo" class="modal-backdrop" @click.self="modalEditSaldo = false">
        <div class="modal-box animate-slide-up" style="max-width:380px">
          <div class="modal-header">
            <h3>Editar Saldo — {{ contaEditando?.nome }}</h3>
            <button @click="modalEditSaldo = false" class="close-btn"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Novo Saldo (R$)</label>
              <input v-model.number="novoSaldo" type="number" step="0.01" class="input-saldo" />
            </div>
          </div>
          <div class="modal-footer">
            <button @click="modalEditSaldo = false" class="btn-ghost">Cancelar</button>
            <button @click="salvarSaldo" class="btn-primary" :disabled="processando">Salvar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ MODAL: NOVA CATEGORIA ════════════════════════════════════ -->
    <Teleport to=".festou-root">
      <div v-if="modalNovaCategoria" class="modal-backdrop" @click.self="modalNovaCategoria = false">
        <div class="modal-box animate-slide-up" style="max-width:420px">
          <div class="modal-header">
            <h3>Nova Categoria</h3>
            <button @click="modalNovaCategoria = false" class="close-btn"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Nome da Categoria *</label>
              <input v-model="novaCategoria" type="text" placeholder="Ex: Energia, Aluguel, Transporte..." @keydown.enter="salvarCategoria" autofocus />
            </div>
            <div class="field">
              <label>Cor</label>
              <div class="cat-color-row">
                <input type="color" v-model="novaCategoriaCor" class="cat-color-picker" />
                <span class="cat-color-preview" :style="{ background: novaCategoriaCor + '22', color: novaCategoriaCor }">{{ novaCategoria || 'Prévia' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="modalNovaCategoria = false" class="btn-ghost">Cancelar</button>
            <button @click="salvarCategoria" class="btn-primary" :disabled="!novaCategoria.trim() || processando">
              {{ processando ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ MODAL: EDITAR CATEGORIA ═══════════════════════════════════ -->
    <Teleport to=".festou-root">
      <div v-if="modalEditCategoria" class="modal-backdrop" @click.self="modalEditCategoria = false">
        <div class="modal-box animate-slide-up" style="max-width:420px">
          <div class="modal-header">
            <h3>Editar Categoria</h3>
            <button @click="modalEditCategoria = false" class="close-btn"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Nome da Categoria *</label>
              <input v-model="formEditCat.nome" type="text" placeholder="Nome da categoria..." @keydown.enter="salvarEdicaoCategoria" autofocus />
            </div>
            <div class="field">
              <label>Cor</label>
              <div class="cat-color-row">
                <input type="color" v-model="formEditCat.cor" class="cat-color-picker" />
                <span class="cat-color-preview" :style="{ background: formEditCat.cor + '22', color: formEditCat.cor }">{{ formEditCat.nome || 'Prévia' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="modalEditCategoria = false" class="btn-ghost">Cancelar</button>
            <button @click="salvarEdicaoCategoria" class="btn-primary" :disabled="!formEditCat.nome.trim() || processando">
              {{ processando ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ MODAL: EDITAR FORMA ════════════════════════════════════ -->
    <Teleport to=".festou-root">
      <div v-if="mostrandoEditForma" class="modal-backdrop" @click.self="mostrandoEditForma = false">
        <div class="modal-box animate-slide-up">
          <div class="modal-header">
            <h3>Editar Forma de Pagamento</h3>
            <button @click="mostrandoEditForma = false" class="close-btn"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="field mb-3">
              <label>Identificador (sem espaços)</label>
              <input v-model="formEditar.forma" type="text" />
            </div>
            <div class="field mb-3">
              <label>Nome Exibido</label>
              <input v-model="formEditar.label" type="text" />
            </div>
            <div class="field">
              <label>Ícone</label>
              <div class="emoji-preview-row">
                <span class="emoji-selected">{{ formEditar.icone || '?' }}</span>
                <input v-model="formEditar.icone" type="text" class="emoji-input-text" maxlength="4" />
              </div>
              <div class="emoji-grid">
                <button v-for="e in emojisDisponiveis" :key="e" type="button" :class="['emoji-opt', { active: formEditar.icone === e }]" @click="formEditar.icone = e">{{ e }}</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="mostrandoEditForma = false" class="btn-ghost">Cancelar</button>
            <button @click="salvarEdicaoForma" class="btn-primary" :disabled="processando">Salvar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ MODAL: NOVA FORMA ══════════════════════════════════════ -->
    <Teleport to=".festou-root">
      <div v-if="mostrandoNovaForma" class="modal-backdrop" @click.self="mostrandoNovaForma = false">
        <div class="modal-box animate-slide-up">
          <div class="modal-header">
            <h3>Nova Forma de Pagamento</h3>
            <button @click="mostrandoNovaForma = false" class="close-btn"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="modal-body">
            <div class="field mb-3">
              <label>Identificador (sem espaços, ex: vale)</label>
              <input v-model="formForma.forma" type="text" placeholder="vale" />
            </div>
            <div class="field mb-3">
              <label>Nome Exibido</label>
              <input v-model="formForma.label" type="text" placeholder="Vale" />
            </div>
            <div class="field">
              <label>Ícone</label>
              <div class="emoji-preview-row">
                <span class="emoji-selected">{{ formForma.icone || '?' }}</span>
                <input v-model="formForma.icone" type="text" class="emoji-input-text" maxlength="4" />
              </div>
              <div class="emoji-grid">
                <button v-for="e in emojisDisponiveis" :key="e" type="button" :class="['emoji-opt', { active: formForma.icone === e }]" @click="formForma.icone = e">{{ e }}</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="mostrandoNovaForma = false" class="btn-ghost">Cancelar</button>
            <button @click="salvarNovaForma" class="btn-primary" :disabled="processando">Salvar</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, inject } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import apiClient from '../services/api';
import { useFormatacao } from '../composables/useFormatacao';

const sessaoStore = useSessaoStore();
const showToast   = inject('showToast');
const { fmt, fmtData, fmtNum } = useFormatacao();

const tabAtiva = ref('contas');
const contas   = ref([]);
const extrato  = ref([]);
const formas   = ref([]);

const emojisDisponiveis = [
  '💵','💴','💶','💷','💰','🪙','💳','📱','🏧','🏦',
  '💸','💱','🤑','💹','📲','🔄','🧾','📒','📝','✅',
  '🤝','💼','🏷️','🎟️','🎫','🛒','📊','📈','🏪','🔑',
];

const carregandoContas  = ref(false);
const carregandoExtrato = ref(false);
const carregandoFormas  = ref(false);
const carregandoCats    = ref(false);
const processando       = ref(false);

const categorias         = ref([]);
const novaCategoria      = ref('');
const novaCategoriaCor   = ref('#6366f1');
const pendenciasHoje     = ref([]);
const catStats           = ref({});
const modalNovaCategoria = ref(false);
const modalEditCategoria = ref(false);
const catEditando        = ref(null);
const formEditCat        = reactive({ nome: '', cor: '#6366f1' });
const formaUsageData   = ref({});
const carregandoFormaUso = ref(false);

const CAT_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316','#84cc16','#14b8a6'];
const FU_COLORS  = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];

const modalEditSaldo = ref(false);
const modalNovaConta = ref(false);
const contaEditando  = ref(null);
const novoSaldo      = ref(0);

const filtroContaPk    = ref(null);
const filtroCategoria  = ref('');
const filtroPeriodo    = ref('mes');
const extratoPagina    = ref(1);
const extratoMesAnt    = ref([]);
const EXTRATO_POR_PAGINA = 15;
const _hoje            = new Date().toLocaleDateString('en-CA');
const filtroDE         = ref(_hoje.slice(0, 8) + '01');
const filtroATE        = ref(_hoje);

const formConta = reactive({ nome: '', tipo: 'pix', saldo: 0 });
const formForma = reactive({ forma: '', label: '', icone: '💳' });
const formEditar = reactive({ pk: null, forma: '', label: '', icone: '💳' });
const mostrandoNovaForma = ref(false);
const mostrandoEditForma = ref(false);

// Computados da aba contas
const totalDisponivel     = computed(() => contas.value.reduce((s, c) => s + (c.saldo || 0), 0));
const totalPendenciasHoje = computed(() => pendenciasHoje.value.reduce((s, d) => s + (d.valor || 0), 0));

// Computados de categorias
const maxCatTotal = computed(() => Math.max(...categorias.value.map(c => catStats.value[c.nome]?.total || 0), 1));
const categoriasSorted = computed(() => [...categorias.value].sort((a, b) => (catStats.value[b.nome]?.total || 0) - (catStats.value[a.nome]?.total || 0)));
const insightMes = computed(() => {
  const sorted = categoriasSorted.value;
  if (!sorted.length) return 'Cadastre categorias para ver insights dos seus gastos.';
  const top = sorted[0];
  const total = catStats.value[top.nome]?.total || 0;
  if (!total) return 'Nenhuma despesa lançada neste mês. Continue monitorando!';
  return `Sua maior despesa este mês é em "${top.nome}" com ${fmt(total)}. Fique de olho nessa categoria!`;
});

// Computados de formas
const formasUsoPorcentagem = computed(() => {
  const totalGeral = Object.values(formaUsageData.value).reduce((s, v) => s + (v.total || 0), 0);
  return formas.value
    .filter(f => f.ativo)
    .map(f => ({ ...f, pct: totalGeral > 0 ? Math.round(((formaUsageData.value[f.forma]?.total || 0) / totalGeral) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);
});

// Computados do extrato
const extratoFiltrado = computed(() => {
  if (!filtroCategoria.value) return extrato.value;
  return extrato.value.filter(m => m.categoria === filtroCategoria.value);
});
const extratoTotalPaginas = computed(() => Math.max(1, Math.ceil(extratoFiltrado.value.length / EXTRATO_POR_PAGINA)));
const extratoPaginado = computed(() => {
  const ini = (extratoPagina.value - 1) * EXTRATO_POR_PAGINA;
  return extratoFiltrado.value.slice(ini, ini + EXTRATO_POR_PAGINA);
});
const paginasVisiveis = computed(() => {
  const total = extratoTotalPaginas.value;
  const cur   = extratoPagina.value;
  const pages = [];
  for (let p = Math.max(1, cur - 2); p <= Math.min(total, cur + 2); p++) pages.push(p);
  return pages;
});
const totalEntradas    = computed(() => extratoFiltrado.value.filter(m => m.tipo_movimento === 'entrada').reduce((s, m) => s + (m.valor || 0), 0));
const totalSaidas      = computed(() => extratoFiltrado.value.filter(m => m.tipo_movimento === 'saida').reduce((s, m) => s + (m.valor || 0), 0));
const totalPrevisto    = computed(() => extratoFiltrado.value.filter(m => m.tipo_movimento === 'previsto').reduce((s, m) => s + (m.valor || 0), 0));
const saldoPeriodo     = computed(() => totalEntradas.value - totalSaidas.value);
const totalEntradasAnt = computed(() => extratoMesAnt.value.filter(m => m.tipo_movimento === 'entrada').reduce((s, m) => s + (m.valor || 0), 0));
const totalSaidasAnt   = computed(() => extratoMesAnt.value.filter(m => m.tipo_movimento === 'saida').reduce((s, m) => s + (m.valor || 0), 0));
const saldoAnt         = computed(() => totalEntradasAnt.value - totalSaidasAnt.value);

let _toastTimer = null;

onMounted(() => { carregarContas(); carregarPendenciasHoje(); });
onUnmounted(() => { clearTimeout(_toastTimer); });

function mudarTab(tab) {
  tabAtiva.value = tab;
  if (tab === 'contas')     { carregarContas(); carregarPendenciasHoje(); }
  if (tab === 'extrato')    { carregarExtrato(); if (!categorias.value.length) carregarCategorias(); }
  if (tab === 'formas')     { carregarFormas(); carregarFormaUso(); }
  if (tab === 'categorias') { carregarCategorias(); carregarCatStats(); }
}

function abrirModalNovaCategoria() {
  novaCategoria.value    = '';
  novaCategoriaCor.value = '#6366f1';
  modalNovaCategoria.value = true;
}

function abrirModalNovaConta() {
  formConta.nome  = '';
  formConta.tipo  = 'pix';
  formConta.saldo = 0;
  modalNovaConta.value = true;
}

async function carregarContas() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  carregandoContas.value = true;
  try {
    const { data } = await apiClient.get('/api/financeiro/contas', { params: { filial_pk: fil } });
    contas.value = data.data || [];
  } catch (e) {
    showToast('Erro ao carregar contas: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    carregandoContas.value = false;
  }
}

async function carregarPendenciasHoje() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  try {
    const { data } = await apiClient.get('/api/despesas', { params: { filial_pk: fil, ini: _hoje, fim: _hoje, status: 'pendente' } });
    pendenciasHoje.value = data.data || [];
  } catch { pendenciasHoje.value = []; }
}

async function salvarConta() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  processando.value = true;
  try {
    await apiClient.post('/api/financeiro/contas', { filial_pk: fil, nome: formConta.nome, tipo: formConta.tipo, saldo: formConta.saldo });
    showToast('Conta cadastrada!');
    modalNovaConta.value = false;
    carregarContas();
  } catch (e) {
    showToast('Erro ao salvar: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    processando.value = false;
  }
}

function aplicarPeriodo() {
  const hoje = new Date().toLocaleDateString('en-CA');
  const d    = new Date();
  if (filtroPeriodo.value === 'hoje') {
    filtroDE.value = filtroATE.value = hoje;
  } else if (filtroPeriodo.value === '7d') {
    const ini = new Date(d); ini.setDate(ini.getDate() - 6);
    filtroDE.value = ini.toLocaleDateString('en-CA'); filtroATE.value = hoje;
  } else if (filtroPeriodo.value === 'mes') {
    filtroDE.value = hoje.slice(0, 8) + '01'; filtroATE.value = hoje;
  } else if (filtroPeriodo.value === '30d') {
    const ini = new Date(d); ini.setDate(ini.getDate() - 29);
    filtroDE.value = ini.toLocaleDateString('en-CA'); filtroATE.value = hoje;
  } else if (filtroPeriodo.value === 'mes_ant') {
    filtroDE.value  = new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleDateString('en-CA');
    filtroATE.value = new Date(d.getFullYear(), d.getMonth(), 0).toLocaleDateString('en-CA');
  }
  if (filtroPeriodo.value !== 'custom') carregarExtrato();
}

async function carregarExtrato() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  extratoPagina.value = 1;
  carregandoExtrato.value = true;
  try {
    const params = { filial_pk: fil, de: filtroDE.value, ate: filtroATE.value };
    if (filtroContaPk.value) params.conta_pk = filtroContaPk.value;
    const { data } = await apiClient.get('/api/financeiro/extrato', { params });
    extrato.value = data.data || [];
    carregarExtratoMesAnterior();
  } catch (e) {
    showToast('Erro ao carregar extrato: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    carregandoExtrato.value = false;
  }
}

async function carregarExtratoMesAnterior() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  const d   = new Date();
  const de  = new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleDateString('en-CA');
  const ate = new Date(d.getFullYear(), d.getMonth(), 0).toLocaleDateString('en-CA');
  try {
    const params = { filial_pk: fil, de, ate };
    if (filtroContaPk.value) params.conta_pk = filtroContaPk.value;
    const { data } = await apiClient.get('/api/financeiro/extrato', { params });
    extratoMesAnt.value = data.data || [];
  } catch { extratoMesAnt.value = []; }
}

function variacaoPct(atual, anterior) {
  if (!anterior) return 0;
  return Math.abs(Math.round(((atual - anterior) / Math.abs(anterior)) * 100));
}

function dtDia(dStr) {
  if (!dStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(dStr).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' });
}

function dtHora(dStr) {
  if (!dStr || /^\d{4}-\d{2}-\d{2}$/.test(dStr)) return '';
  return new Date(dStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Manaus' });
}

function exportarCSV() {
  const linhas = [['Data', 'Descrição', 'Conta', 'Categoria', 'Tipo', 'Valor']];
  for (const m of extratoFiltrado.value) {
    linhas.push([
      dtFmt(m.data_movimento),
      m.descricao || '',
      m.contas_bancarias?.nome || '',
      m.categoria || '',
      tipoMovLabel(m.tipo_movimento),
      (m.valor || 0).toFixed(2).replace('.', ','),
    ]);
  }
  const csv  = linhas.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `extrato_${filtroDE.value}_${filtroATE.value}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

async function carregarFormas() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  carregandoFormas.value = true;
  try {
    const { data } = await apiClient.get('/api/financeiro/formas', { params: { filial_pk: fil } });
    formas.value = data.data || [];
  } catch (e) {
    showToast('Erro ao carregar formas: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    carregandoFormas.value = false;
  }
}

async function toggleForma(f) {
  try {
    await apiClient.patch(`/api/financeiro/formas/${f.pk}`, { ativo: !f.ativo });
    f.ativo = !f.ativo;
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  }
}

async function excluirForma(f) {
  if (!confirm(`Deseja excluir a forma "${f.label}"?`)) return;
  try {
    await apiClient.delete(`/api/financeiro/formas/${f.pk}`);
    formas.value = formas.value.filter(i => i.pk !== f.pk);
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  }
}

function abrirEditarForma(f) {
  Object.assign(formEditar, { pk: f.pk, forma: f.forma, label: f.label, icone: f.icone });
  mostrandoEditForma.value = true;
}

async function salvarEdicaoForma() {
  processando.value = true;
  try {
    await apiClient.patch(`/api/financeiro/formas/${formEditar.pk}`, { forma: formEditar.forma, label: formEditar.label, icone: formEditar.icone });
    const f = formas.value.find(x => x.pk === formEditar.pk);
    if (f) Object.assign(f, { forma: formEditar.forma.trim().toLowerCase().replace(/\s+/g, '_'), label: formEditar.label, icone: formEditar.icone });
    mostrandoEditForma.value = false;
    showToast('Forma atualizada!');
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    processando.value = false;
  }
}

function abrirNovaForma() {
  Object.assign(formForma, { forma: '', label: '', icone: '💳' });
  mostrandoNovaForma.value = true;
}

async function salvarNovaForma() {
  const fil = sessaoStore.filial?.pk;
  processando.value = true;
  try {
    await apiClient.post('/api/financeiro/formas', { filial_pk: fil, forma: formForma.forma, label: formForma.label, icone: formForma.icone, ordem: formas.value.length });
    showToast('Forma adicionada!');
    mostrandoNovaForma.value = false;
    carregarFormas();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    processando.value = false;
  }
}

function abrirEditSaldo(c) {
  contaEditando.value  = c;
  novoSaldo.value      = c.saldo;
  modalEditSaldo.value = true;
}

async function salvarSaldo() {
  processando.value = true;
  try {
    await apiClient.patch(`/api/financeiro/contas/${contaEditando.value.pk}/saldo`, { saldo: novoSaldo.value });
    contaEditando.value.saldo = novoSaldo.value;
    modalEditSaldo.value = false;
    showToast('Saldo atualizado!');
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    processando.value = false;
  }
}

async function carregarCategorias() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  carregandoCats.value = true;
  try {
    const { data } = await apiClient.get('/api/financeiro/categorias', { params: { filial_pk: fil } });
    categorias.value = data.data || [];
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    carregandoCats.value = false;
  }
}

async function salvarCategoria() {
  const fil  = sessaoStore.filial?.pk;
  const nome = novaCategoria.value.trim();
  if (!nome || !fil) return;
  processando.value = true;
  try {
    const { data } = await apiClient.post('/api/financeiro/categorias', { filial_pk: fil, nome, cor: novaCategoriaCor.value });
    novaCategoria.value    = '';
    novaCategoriaCor.value = '#6366f1';
    modalNovaCategoria.value = false;
    categorias.value.push(data.data);
    categorias.value.sort((a, b) => a.nome.localeCompare(b.nome));
    showToast('Categoria adicionada!');
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    processando.value = false;
  }
}

function abrirEditarCategoria(c) {
  catEditando.value  = c;
  formEditCat.nome   = c.nome;
  formEditCat.cor    = c.cor || '#6366f1';
  modalEditCategoria.value = true;
}

async function salvarEdicaoCategoria() {
  if (!formEditCat.nome.trim()) return;
  processando.value = true;
  try {
    await apiClient.put(`/api/financeiro/categorias/${catEditando.value.pk}`, {
      nome: formEditCat.nome.trim(),
      cor:  formEditCat.cor,
    });
    catEditando.value.nome = formEditCat.nome.trim();
    catEditando.value.cor  = formEditCat.cor;
    modalEditCategoria.value = false;
    showToast('Categoria atualizada!');
    carregarCategorias();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  } finally {
    processando.value = false;
  }
}

async function excluirCategoria(c) {
  if (!confirm(`Excluir categoria "${c.nome}"?`)) return;
  try {
    await apiClient.delete(`/api/financeiro/categorias/${c.pk}`);
    categorias.value = categorias.value.filter(x => x.pk !== c.pk);
    showToast('Categoria excluída.');
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  }
}

async function excluirConta(c) {
  if (!confirm(`Deseja excluir a conta "${c.nome}"?`)) return;
  try {
    await apiClient.delete(`/api/financeiro/contas/${c.pk}`);
    showToast('Conta excluída.');
    carregarContas();
  } catch (e) {
    showToast('Erro: ' + (e.response?.data?.erro || e.message), 'error');
  }
}

function getContaIcon(tipo) {
  const map = { pix: 'qr_code', dinheiro: 'payments', debito: 'credit_card', credito: 'add_card', caixa: 'point_of_sale' };
  return map[tipo] || 'account_balance_wallet';
}

function getTipoClass(tipo) {
  const map = { pix: 'icon-pix', dinheiro: 'icon-din', debito: 'icon-deb', credito: 'icon-cred' };
  return map[tipo] || 'icon-default';
}

function tipoLabel(tipo) {
  const map = { pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', caixa: 'Caixa' };
  return map[tipo] || tipo?.toUpperCase();
}

function tipoMovLabel(tipo) {
  if (tipo === 'entrada')  return 'Entrada';
  if (tipo === 'previsto') return 'Previsto';
  return 'Saída';
}

function catPercent(nome) {
  return Math.round(((catStats.value[nome]?.total || 0) / maxCatTotal.value) * 100);
}

function catColor(cor, idx) {
  return cor || CAT_COLORS[idx % CAT_COLORS.length];
}

function catIcon(nome) {
  const n = (nome || '').toLowerCase();
  if (n.includes('aliment') || n.includes('comida') || n.includes('refei')) return 'restaurant';
  if (n.includes('transporte') || n.includes('combustiv') || n.includes('uber')) return 'directions_car';
  if (n.includes('aluguel') || n.includes('moradia') || n.includes('imov')) return 'home';
  if (n.includes('energia') || n.includes('luz')) return 'bolt';
  if (n.includes('agua') || n.includes('água')) return 'water_drop';
  if (n.includes('internet') || n.includes('telefone') || n.includes('celular')) return 'wifi';
  if (n.includes('salario') || n.includes('salário') || n.includes('funcionario')) return 'badge';
  if (n.includes('saude') || n.includes('saúde') || n.includes('medic')) return 'health_and_safety';
  if (n.includes('produto') || n.includes('estoque') || n.includes('compra')) return 'inventory_2';
  if (n.includes('marketing') || n.includes('publicidade')) return 'campaign';
  if (n.includes('seguro')) return 'shield';
  if (n.includes('conta') || n.includes('banco')) return 'account_balance';
  return 'label';
}

async function carregarCatStats() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  const hoje = new Date().toLocaleDateString('en-CA');
  const ini  = hoje.slice(0, 8) + '01';
  try {
    const { data } = await apiClient.get('/api/despesas', { params: { filial_pk: fil, ini, fim: hoje } });
    const map = {};
    for (const d of (data.data || [])) {
      const nome = d.categorias_despesa?.nome;
      if (nome) {
        if (!map[nome]) map[nome] = { count: 0, total: 0 };
        map[nome].count++;
        map[nome].total += d.valor || 0;
      }
    }
    catStats.value = map;
  } catch { catStats.value = {}; }
}

function formaUso(forma) {
  const totalGeral = Object.values(formaUsageData.value).reduce((s, v) => s + (v.total || 0), 0);
  if (!totalGeral) return 0;
  return Math.round(((formaUsageData.value[forma]?.total || 0) / totalGeral) * 100);
}

async function carregarFormaUso() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  carregandoFormaUso.value = true;
  const hoje = new Date().toLocaleDateString('en-CA');
  const ini  = hoje.slice(0, 8) + '01';
  try {
    const { data } = await apiClient.get('/api/consolidacao/recebimentos', { params: { filial_pk: fil, de: ini, ate: hoje } });
    const map = {};
    for (const r of (data.data || [])) {
      if (r.forma) {
        if (!map[r.forma]) map[r.forma] = { total: 0, count: 0 };
        map[r.forma].total += r.valor || 0;
        map[r.forma].count++;
      }
    }
    formaUsageData.value = map;
  } catch { formaUsageData.value = {}; }
  finally { carregandoFormaUso.value = false; }
}

function dtFmt(dStr) {
  if (!dStr) return '—';
  // Se for só uma data (YYYY-MM-DD), exibe sem hora
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(dStr);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Manaus' });
}

</script>

<style scoped>
/* ── Layout geral ──────────────────────────────────────────── */
.page-wrap   { display: flex; flex-direction: column; gap: 1rem; }
.page-header { margin-bottom: 0.25rem; }
.page-title  { margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--text); }
.page-sub    { margin: 4px 0 0; font-size: 0.85rem; color: var(--text2); }

/* ── Abas ──────────────────────────────────────────────────── */
.tabs { display: flex; gap: 2px; border-bottom: 2px solid var(--border); overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 10px 20px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; color: var(--text2); cursor: pointer; font-weight: 600; font-size: 0.85rem; white-space: nowrap; transition: all 0.2s; }
.tab-btn .material-symbols-outlined { font-size: 18px; }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
.tab-btn:hover:not(.active) { color: var(--text); background: var(--bg3); border-radius: 6px 6px 0 0; }

/* ── Conteúdo ──────────────────────────────────────────────── */
.card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; }
.tab-content { padding: 1.5rem; min-height: 420px; }
.animate-fade { animation: fadeIn 0.25s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* ── Section header ────────────────────────────────────────── */
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.section-title  { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text); }
.section-sub    { margin: 4px 0 0; font-size: 0.8rem; color: var(--text2); }

/* ── Cards de contas ───────────────────────────────────────── */
.contas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }

.conta-card { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; cursor: default; }
[data-theme="dark"] .conta-card { background: var(--bg3); }
.conta-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.12); border-color: var(--primary); }

.conta-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.conta-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.conta-icon .material-symbols-outlined { font-size: 22px; }
.icon-pix     { background: #ecfdf5; color: #059669; }
.icon-din     { background: #fef9c3; color: #ca8a04; }
.icon-deb     { background: #eff6ff; color: #2563eb; }
.icon-cred    { background: #fdf4ff; color: #9333ea; }
.icon-default { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }

.conta-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.18s; }
.conta-card:hover .conta-actions { opacity: 1; }

.conta-card-mid { display: flex; flex-direction: column; gap: 4px; }
.conta-nome      { font-size: 1rem; font-weight: 700; color: var(--text); }
.conta-tipo-badge { display: inline-block; font-size: 0.65rem; font-weight: 800; letter-spacing: .5px; padding: 2px 8px; border-radius: 20px; background: var(--bg); border: 1px solid var(--border); color: var(--text2); width: fit-content; }

.conta-card-bot { display: flex; flex-direction: column; gap: 2px; padding-top: 0.5rem; border-top: 1px solid var(--border); }
.saldo-label { font-size: 0.7rem; color: var(--text2); text-transform: uppercase; letter-spacing: .5px; }
.saldo-valor { font-size: 1.5rem; font-weight: 800; font-family: monospace; color: #10b981; }
.saldo-valor.neg { color: #ef4444; }

/* Card adicionar */
.add-card { border: 2px dashed var(--border); background: transparent; align-items: center; justify-content: center; gap: 0.75rem; cursor: pointer; min-height: 150px; }
.add-card:hover { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 5%, transparent); transform: translateY(-3px); }
.add-icon { font-size: 2rem; color: var(--text2); transition: color 0.18s; }
.add-card:hover .add-icon { color: var(--primary); }
.add-label { font-size: 0.85rem; font-weight: 600; color: var(--text2); transition: color 0.18s; }
.add-card:hover .add-label { color: var(--primary); }

/* ── Resumo de saldos ──────────────────────────────────────── */
.resumo-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }

.resumo-card { display: flex; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem; border-radius: 12px; border: 1px solid var(--border); background: white; }
[data-theme="dark"] .resumo-card { background: var(--bg3); }
.resumo-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); flex-shrink: 0; }
.resumo-icon .material-symbols-outlined { font-size: 22px; }
.resumo-icon.warn { background: #fef3c7; color: #d97706; }
.resumo-icon.blue { background: #eff6ff; color: #2563eb; }
.resumo-info { display: flex; flex-direction: column; gap: 2px; }
.resumo-label { font-size: 0.72rem; color: var(--text2); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
.resumo-valor { font-size: 1.3rem; font-weight: 800; font-family: monospace; color: #10b981; }
.resumo-valor.neg { color: #ef4444; }
.resumo-num  { font-size: 1.5rem; font-weight: 800; color: var(--text); }
.resumo-sub  { font-size: 0.75rem; color: #d97706; font-weight: 600; }

/* ── Extrato resumo ────────────────────────────────────────── */
.extrato-resumo { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; }

.er-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; border-radius: 10px; border: 1px solid var(--border); }
.er-card .material-symbols-outlined { font-size: 26px; flex-shrink: 0; }
.er-card > div { display: flex; flex-direction: column; gap: 2px; }
.er-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text2); }
.er-valor { font-size: 1.05rem; font-weight: 800; font-family: monospace; }

.er-card.entrada   { background: #ecfdf5; border-color: #6ee7b7; }
.er-card.entrada .material-symbols-outlined { color: #059669; }
.er-card.entrada .er-valor { color: #059669; }

.er-card.saida     { background: #fef2f2; border-color: #fca5a5; }
.er-card.saida .material-symbols-outlined { color: #dc2626; }
.er-card.saida .er-valor { color: #dc2626; }

.er-card.previsto  { background: #fefce8; border-color: #fde047; }
.er-card.previsto .material-symbols-outlined { color: #ca8a04; }
.er-card.previsto .er-valor { color: #ca8a04; }

.er-card.saldo-pos { background: #f0fdf4; border-color: #86efac; }
.er-card.saldo-pos .material-symbols-outlined { color: #16a34a; }
.er-card.saldo-pos .er-valor { color: #16a34a; }

.er-card.saldo-neg { background: #fff1f2; border-color: #fda4af; }
.er-card.saldo-neg .material-symbols-outlined { color: #e11d48; }
.er-card.saldo-neg .er-valor { color: #e11d48; }

[data-theme="dark"] .er-card.entrada  { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.25); }
[data-theme="dark"] .er-card.saida    { background: rgba(239,68,68,.08);  border-color: rgba(239,68,68,.25); }
[data-theme="dark"] .er-card.previsto { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.25); }
[data-theme="dark"] .er-card.saldo-pos { background: rgba(22,163,74,.08); border-color: rgba(22,163,74,.25); }
[data-theme="dark"] .er-card.saldo-neg { background: rgba(225,29,72,.08); border-color: rgba(225,29,72,.25); }

/* ── Filtros extrato ───────────────────────────────────────── */
.mov-filters { display: flex; align-items: flex-end; gap: 0.75rem; padding: 1rem; background: var(--bg3); border-radius: 10px; border: 1px solid var(--border); flex-wrap: wrap; margin-bottom: 1rem; }
.mw-160 { max-width: 160px; }
.mw-220 { max-width: 220px; }

/* ── Tabela ────────────────────────────────────────────────── */
.tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.tabela th { text-align: left; padding: 0.65rem 0.75rem; background: var(--bg3); color: var(--text2); font-size: 0.72rem; text-transform: uppercase; letter-spacing: .4px; border-bottom: 2px solid var(--border); }
.tabela td { padding: 0.7rem 0.75rem; border-bottom: 1px solid var(--border); }
.tabela-row:hover td { background: var(--bg3); }
.nowrap { white-space: nowrap; }

.tag-tipo { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; }
.tag-tipo.entrada  { background: #d1fae5; color: #065f46; }
.tag-tipo.saida    { background: #fee2e2; color: #991b1b; }
.tag-tipo.previsto { background: #fef3c7; color: #92400e; }
[data-theme="dark"] .tag-tipo.entrada  { background: rgba(16,185,129,.2); color: #6ee7b7; }
[data-theme="dark"] .tag-tipo.saida    { background: rgba(239,68,68,.2);  color: #fca5a5; }
[data-theme="dark"] .tag-tipo.previsto { background: rgba(245,158,11,.2); color: #fde68a; }

.text-right.entrada  { color: #10b981; }
.text-right.saida    { color: #ef4444; }
.text-right.previsto { color: #f59e0b; }

/* ── Formas de pagamento ───────────────────────────────────── */
.formas-grid  { display: flex; flex-direction: column; gap: 8px; max-width: 680px; }
.forma-card   { display: flex; align-items: center; gap: 12px; padding: 0.9rem 1rem; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; transition: border-color 0.15s; }
.forma-card:hover { border-color: var(--primary); }
.forma-card.inativo { opacity: 0.55; }
.forma-icon   { font-size: 22px; width: 36px; text-align: center; }
.forma-info   { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.forma-label  { font-weight: 700; color: var(--text); font-size: 0.9rem; }
.forma-id     { font-size: 10px; font-family: monospace; color: var(--text2); }
.forma-actions { display: flex; align-items: center; gap: 8px; }
.status-chip  { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; background: var(--border); color: var(--text2); }
.status-chip.active { background: #d1fae5; color: #065f46; }
.btn-toggle   { background: var(--bg2); border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; color: var(--text); white-space: nowrap; }

/* ── Categorias ────────────────────────────────────────────── */
.cat-add-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cat-input   { flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); color: var(--text); font-size: 13px; outline: none; }
.cat-input:focus { border-color: var(--primary); }
.cats-lista  { display: flex; flex-direction: column; gap: 6px; max-width: 520px; }
.cat-row     { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; }
.cat-nome    { flex: 1; font-size: 14px; font-weight: 600; color: var(--text); }

/* ── Botões comuns ─────────────────────────────────────────── */
.btn-primary { background: var(--primary); color: white; border: none; padding: 0.7rem 1.4rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-primary.sm { padding: 0.4rem 1rem; font-size: 0.82rem; }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-ghost  { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 0.7rem 1.4rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-ghost.sm { padding: 0.4rem 1rem; font-size: 0.82rem; }
.btn-ghost:disabled { opacity: 0.55; cursor: not-allowed; }

.icon-btn { background: none; border: 1px solid transparent; border-radius: 7px; padding: 5px; cursor: pointer; color: var(--text2); display: flex; align-items: center; transition: all 0.15s; }
.icon-btn .material-symbols-outlined { font-size: 18px; }
.icon-btn:hover { background: var(--bg); border-color: var(--border); color: var(--text); }
.icon-btn.danger:hover { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #ef4444; }

/* ── Formulários ───────────────────────────────────────────── */
.field         { display: flex; flex-direction: column; gap: 5px; }
.field label   { font-size: 0.72rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; }
.field input, .field select { padding: 0.65rem 0.85rem; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--text); outline: none; font-size: 0.9rem; transition: border-color 0.15s; }
.field input:focus, .field select:focus { border-color: var(--primary); }
.input-saldo  { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--text); font-size: 1.1rem; font-weight: 700; width: 100%; outline: none; }
[data-theme="dark"] .field input,
[data-theme="dark"] .field select,
[data-theme="dark"] .input-saldo { background: var(--bg3); }

/* ── Estados ───────────────────────────────────────────────── */
.loading-state { display: flex; align-items: center; gap: 10px; justify-content: center; padding: 3rem; color: var(--text2); }
.vazio         { text-align: center; padding: 3rem; color: var(--text2); }

.spinner-sm { display: inline-block; width: 12px; height: 12px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; }
.spinner-md { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
.mx-auto    { margin: auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon  { animation: spin 0.7s linear infinite; }

/* ── Modais ────────────────────────────────────────────────── */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-box      { background: white; border-radius: 16px; border: 1px solid var(--border); display: flex; flex-direction: column; width: 100%; max-width: 460px; max-height: 90vh; overflow: hidden; }
[data-theme="dark"] .modal-box { background: var(--bg2); }
.modal-header   { padding: 1.1rem 1.4rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); }
.modal-body     { padding: 1.4rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
.modal-footer   { padding: 1rem 1.4rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.75rem; background: #f8fafc; border-radius: 0 0 16px 16px; }
[data-theme="dark"] .modal-footer { background: var(--bg3); }
.close-btn      { background: none; border: none; cursor: pointer; color: var(--text2); display: flex; align-items: center; padding: 4px; border-radius: 6px; transition: background 0.15s; }
.close-btn:hover { background: var(--bg3); color: var(--text); }

.animate-slide-up { animation: slideUp 0.2s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }

/* ── Emoji picker ──────────────────────────────────────────── */
.emoji-preview-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.emoji-selected    { font-size: 26px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border: 1px solid var(--border); border-radius: 8px; }
[data-theme="dark"] .emoji-selected { background: var(--bg3); }
.emoji-input-text  { width: 58px; padding: 6px 8px; font-size: 18px; text-align: center; background: #f1f5f9; border: 1px solid var(--border); border-radius: 8px; color: var(--text); outline: none; }
[data-theme="dark"] .emoji-input-text { background: var(--bg3); }
.emoji-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; }
.emoji-opt  { background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; font-size: 17px; padding: 3px; cursor: pointer; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; transition: all .15s; }
[data-theme="dark"] .emoji-opt { background: var(--bg); }
.emoji-opt:hover  { transform: scale(1.15); border-color: var(--primary); }
.emoji-opt.active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 15%, transparent); }

/* ── Extrato (novo design) ─────────────────────────────────── */
.ex-filters { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; padding: 1rem 1.25rem; background: white; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 1rem; flex-wrap: wrap; }
.ex-filters-left  { display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.ex-filters-right { display: flex; gap: 0.5rem; align-items: flex-end; }
.ex-select-periodo { min-width: 160px; }
.mw-150 { max-width: 150px; }
.mw-200 { max-width: 200px; }
[data-theme="dark"] .ex-filters { background: var(--bg3); }

.ex-table-wrap { background: white; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem; }
[data-theme="dark"] .ex-table-wrap { background: var(--bg3); }

.ex-tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.ex-tabela th { text-align: left; padding: 0.7rem 1rem; background: white; color: var(--text2); font-size: 0.7rem; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid var(--border); font-weight: 700; white-space: nowrap; }
[data-theme="dark"] .ex-tabela th { background: var(--bg3); }
.ex-tabela td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
.ex-tabela tbody tr:last-child td { border-bottom: none; }
.ex-row:hover td { background: color-mix(in srgb, var(--primary) 3%, transparent); }
.th-data { width: 130px; }

.ex-data-cell { white-space: nowrap; }
.ex-dia  { display: block; font-weight: 600; color: var(--text); font-size: 0.82rem; }
.ex-hora { display: block; font-size: 0.72rem; color: var(--text2); }

.ex-desc-cell { display: flex; align-items: flex-start; gap: 10px; }
.ex-tipo-dot  { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
.ex-tipo-dot .material-symbols-outlined { font-size: 16px; }
.ex-tipo-dot.entrada  { background: #d1fae5; color: #059669; }
.ex-tipo-dot.saida    { background: #fee2e2; color: #dc2626; }
.ex-tipo-dot.previsto { background: #fef3c7; color: #d97706; }
[data-theme="dark"] .ex-tipo-dot.entrada  { background: rgba(16,185,129,.18); color: #6ee7b7; }
[data-theme="dark"] .ex-tipo-dot.saida    { background: rgba(239,68,68,.18);  color: #fca5a5; }
[data-theme="dark"] .ex-tipo-dot.previsto { background: rgba(245,158,11,.18); color: #fde68a; }
.ex-desc-txt { color: var(--text); font-size: 0.85rem; white-space: normal; word-break: break-word; line-height: 1.4; }

.ex-conta-cell { color: var(--text2); font-size: 0.82rem; }

.ex-cat-tag { font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); white-space: nowrap; }

.ex-badge { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
.ex-badge.entrada  { background: #d1fae5; color: #065f46; }
.ex-badge.saida    { background: #fee2e2; color: #991b1b; }
.ex-badge.previsto { background: #fef3c7; color: #92400e; }
[data-theme="dark"] .ex-badge.entrada  { background: rgba(16,185,129,.2); color: #6ee7b7; }
[data-theme="dark"] .ex-badge.saida    { background: rgba(239,68,68,.2);  color: #fca5a5; }
[data-theme="dark"] .ex-badge.previsto { background: rgba(245,158,11,.2); color: #fde68a; }

.ex-valor-cell { text-align: right; font-weight: 800; font-family: monospace; font-size: 0.9rem; white-space: nowrap; }
.ex-valor-cell.entrada  { color: #10b981; }
.ex-valor-cell.saida    { color: #ef4444; }
.ex-valor-cell.previsto { color: #f59e0b; }

.ex-empty { text-align: center; padding: 3rem; color: var(--text2); }

/* Paginação */
.ex-paginacao { display: flex; align-items: center; gap: 4px; padding: 0.85rem 1rem; border-top: 1px solid var(--border); }
.pag-btn { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 4px 6px; cursor: pointer; color: var(--text2); display: flex; align-items: center; transition: all 0.15s; }
.pag-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.pag-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pag-btn .material-symbols-outlined { font-size: 18px; }
.pag-num { min-width: 34px; height: 34px; background: none; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; color: var(--text2); font-size: 0.82rem; font-weight: 600; transition: all 0.15s; }
.pag-num:hover { border-color: var(--primary); color: var(--primary); }
.pag-num.active { background: var(--primary); border-color: var(--primary); color: white; }
.pag-info { margin-left: auto; font-size: 0.78rem; color: var(--text2); }

/* Summary cards (bottom) */
.ex-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
@media (max-width: 800px) { .ex-summary { grid-template-columns: 1fr; } }

.ex-sum-card { display: flex; align-items: flex-start; gap: 1.25rem; padding: 1.5rem 1.75rem; border-radius: 16px; border: 2px solid; }
.ex-sum-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ex-sum-icon .material-symbols-outlined { font-size: 28px; }
.ex-sum-body { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.ex-sum-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.ex-sum-valor { font-size: 1.6rem; font-weight: 900; font-family: monospace; line-height: 1.15; }
.ex-sum-comp  { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.ex-comp-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 20px; }
.ex-comp-badge .material-symbols-outlined { font-size: 13px; }
.ex-comp-badge.badge-up   { background: #d1fae5; color: #065f46; }
.ex-comp-badge.badge-down { background: #fee2e2; color: #991b1b; }
[data-theme="dark"] .ex-comp-badge.badge-up   { background: rgba(16,185,129,.2); color: #6ee7b7; }
[data-theme="dark"] .ex-comp-badge.badge-down { background: rgba(239,68,68,.2); color: #fca5a5; }
.ex-comp-ref { font-size: 0.7rem; color: var(--text2); }

.ex-sum-card.entrada { background: #f0fdf4; border-color: #86efac; }
.ex-sum-card.entrada .ex-sum-icon { background: #dcfce7; color: #16a34a; }
.ex-sum-card.entrada .ex-sum-label { color: #166534; }
.ex-sum-card.entrada .ex-sum-valor { color: #15803d; }
.ex-sum-card.saida { background: #fff1f2; border-color: #fda4af; }
.ex-sum-card.saida .ex-sum-icon { background: #ffe4e6; color: #e11d48; }
.ex-sum-card.saida .ex-sum-label { color: #881337; }
.ex-sum-card.saida .ex-sum-valor { color: #be123c; }
.ex-sum-card.saldo-pos { background: #f0fdf4; border-color: #4ade80; }
.ex-sum-card.saldo-pos .ex-sum-icon { background: #dcfce7; color: #16a34a; }
.ex-sum-card.saldo-pos .ex-sum-label { color: #166534; }
.ex-sum-card.saldo-pos .ex-sum-valor { color: #15803d; }
.ex-sum-card.saldo-neg { background: #fff1f2; border-color: #fda4af; }
.ex-sum-card.saldo-neg .ex-sum-icon { background: #ffe4e6; color: #e11d48; }
.ex-sum-card.saldo-neg .ex-sum-label { color: #881337; }
.ex-sum-card.saldo-neg .ex-sum-valor { color: #be123c; }

[data-theme="dark"] .ex-sum-card.entrada  { background: rgba(16,185,129,.07); border-color: rgba(16,185,129,.3); }
[data-theme="dark"] .ex-sum-card.entrada .ex-sum-icon { background: rgba(16,185,129,.15); color: #6ee7b7; }
[data-theme="dark"] .ex-sum-card.entrada .ex-sum-label,
[data-theme="dark"] .ex-sum-card.entrada .ex-sum-valor { color: #6ee7b7; }
[data-theme="dark"] .ex-sum-card.saida    { background: rgba(239,68,68,.07);  border-color: rgba(239,68,68,.3); }
[data-theme="dark"] .ex-sum-card.saida .ex-sum-icon { background: rgba(239,68,68,.15); color: #fca5a5; }
[data-theme="dark"] .ex-sum-card.saida .ex-sum-label,
[data-theme="dark"] .ex-sum-card.saida .ex-sum-valor { color: #fca5a5; }
[data-theme="dark"] .ex-sum-card.saldo-pos { background: rgba(16,185,129,.07); border-color: rgba(16,185,129,.3); }
[data-theme="dark"] .ex-sum-card.saldo-pos .ex-sum-icon { background: rgba(16,185,129,.15); color: #6ee7b7; }
[data-theme="dark"] .ex-sum-card.saldo-pos .ex-sum-label,
[data-theme="dark"] .ex-sum-card.saldo-pos .ex-sum-valor { color: #6ee7b7; }
[data-theme="dark"] .ex-sum-card.saldo-neg { background: rgba(239,68,68,.07); border-color: rgba(239,68,68,.3); }
[data-theme="dark"] .ex-sum-card.saldo-neg .ex-sum-icon { background: rgba(239,68,68,.15); color: #fca5a5; }
[data-theme="dark"] .ex-sum-card.saldo-neg .ex-sum-label,
[data-theme="dark"] .ex-sum-card.saldo-neg .ex-sum-valor { color: #fca5a5; }

/* ── Formas de pagamento (novo layout) ─────────────────────── */
.formas-layout { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
@media (max-width: 900px) { .formas-layout { grid-template-columns: 1fr; } }

.formas-main   { display: flex; flex-direction: column; gap: 0; }
.formas-hcards { display: flex; flex-direction: column; gap: 8px; }

.forma-hcard { display: flex; align-items: center; gap: 14px; padding: 1rem 1.1rem; background: white; border: 1px solid var(--border); border-radius: 12px; transition: border-color 0.15s, box-shadow 0.15s; }
.forma-hcard:hover { border-color: var(--primary); box-shadow: 0 2px 12px rgba(0,0,0,.07); }
.forma-hcard.inativo { opacity: 0.55; }
[data-theme="dark"] .forma-hcard { background: var(--bg3); }

.fh-icon  { font-size: 24px; width: 40px; text-align: center; flex-shrink: 0; }
.fh-info  { display: flex; flex-direction: column; gap: 2px; min-width: 110px; }
.fh-nome  { font-weight: 700; color: var(--text); font-size: 0.9rem; }
.fh-id    { font-size: 0.7rem; font-family: monospace; color: var(--text2); }

.fh-uso { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
.fh-bar-track { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
.fh-bar-fill  { height: 100%; background: var(--primary); border-radius: 99px; transition: width 0.5s; }
.fh-pct { font-size: 0.7rem; color: var(--text2); }

.fh-right   { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.fh-status  { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
.fh-status.ativo   { background: #d1fae5; color: #065f46; }
.fh-status.pausado { background: var(--border); color: var(--text2); }
[data-theme="dark"] .fh-status.ativo { background: rgba(16,185,129,.2); color: #6ee7b7; }
.fh-actions { display: flex; gap: 4px; }

/* Formas sidebar */
.formas-sidebar { display: flex; flex-direction: column; gap: 1rem; }

.fu-card  { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 1.1rem 1.25rem; }
[data-theme="dark"] .fu-card { background: var(--bg3); }
.fu-title { margin: 0 0 2px; font-size: 0.9rem; font-weight: 800; color: var(--text); }
.fu-sub   { margin: 0 0 0.9rem; font-size: 0.75rem; color: var(--text2); }
.fu-lista { display: flex; flex-direction: column; gap: 10px; }

.fu-row   { display: flex; align-items: center; gap: 8px; }
.fu-icon  { font-size: 18px; width: 26px; text-align: center; flex-shrink: 0; }
.fu-info  { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.fu-label { font-size: 0.78rem; font-weight: 600; color: var(--text); }
.fu-bar-track { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
.fu-bar-fill  { height: 100%; border-radius: 99px; transition: width 0.5s; }
.fu-pct-val   { font-size: 0.75rem; font-weight: 800; color: var(--text2); min-width: 30px; text-align: right; }

.formas-banner { background: linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%); border-radius: 14px; padding: 1.4rem; color: white; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 0.5rem; }
.banner-overlay { position: absolute; right: -8px; bottom: -10px; opacity: 0.12; }
.banner-big-icon { font-size: 5rem !important; }
.banner-badge-top { font-size: 0.65rem; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; opacity: .75; }
.banner-title { margin: 0; font-size: 1rem; font-weight: 800; }
.banner-desc  { margin: 0; font-size: 0.78rem; line-height: 1.55; opacity: .85; }
.banner-chip  { display: inline-block; background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.35); border-radius: 20px; font-size: 0.72rem; font-weight: 800; padding: 3px 10px; width: fit-content; }

/* ── Categorias (novo layout) ──────────────────────────────── */
.cat-layout { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
@media (max-width: 900px) { .cat-layout { grid-template-columns: 1fr; } }

.cat-main { display: flex; flex-direction: column; }
.cats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }

.cat-card { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 1.1rem; display: flex; flex-direction: column; gap: 0.85rem; transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; }
.cat-card:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,.10); border-color: var(--cat-clr, var(--primary)); }
[data-theme="dark"] .cat-card { background: var(--bg3); }

.cat-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.cat-icon-circle { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--cat-clr, var(--primary)) 15%, transparent); color: var(--cat-clr, var(--primary)); }
.cat-icon-circle .material-symbols-outlined { font-size: 22px; }
.cat-card-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.18s; }
.cat-card:hover .cat-card-actions { opacity: 1; }
.cat-edit-btn:hover { background: rgba(99,102,241,.12); color: #818cf8; border-color: rgba(99,102,241,.25) !important; }

.cat-color-row { display: flex; align-items: center; gap: 0.75rem; }
.cat-color-picker { width: 42px; height: 38px; border-radius: 8px; border: 1px solid var(--border); padding: 2px; cursor: pointer; background: none; flex-shrink: 0; }
.cat-color-preview { font-size: 0.82rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; }

.cat-card-mid { flex: 1; }
.cat-card-nome { margin: 0; font-size: 0.95rem; font-weight: 800; color: var(--text); }

.cat-card-bot { display: flex; flex-direction: column; gap: 8px; padding-top: 0.75rem; border-top: 1px solid var(--border); }
.cat-stat-row { display: flex; justify-content: space-between; }
.cat-stat { display: flex; flex-direction: column; gap: 1px; }
.cat-stat-val { font-size: 1rem; font-weight: 800; color: var(--text); }
.cat-stat-val.money { font-size: 0.85rem; }
.cat-stat-lbl { font-size: 0.65rem; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; }

.cat-progress-track { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; }
.cat-progress-fill  { height: 100%; background: var(--cat-clr, var(--primary)); border-radius: 99px; transition: width 0.5s; }

/* Cat add card */
.cat-add-card { align-items: center; justify-content: center; gap: 0.6rem; cursor: pointer; min-height: 160px; background: transparent !important; border: 2px dashed var(--border) !important; }
.cat-add-card:hover { border-color: var(--primary) !important; background: color-mix(in srgb, var(--primary) 5%, transparent) !important; }
.cat-add-icon { font-size: 2rem; color: var(--text2); transition: color 0.18s; }
.cat-add-label { font-size: 0.85rem; font-weight: 600; color: var(--text2); transition: color 0.18s; }
.cat-add-card:hover .cat-add-icon,
.cat-add-card:hover .cat-add-label { color: var(--primary); }

/* Cat sidebar */
.cat-sidebar { display: flex; flex-direction: column; gap: 1rem; }

.cat-resumo-card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 1.1rem 1.25rem; }
[data-theme="dark"] .cat-resumo-card { background: var(--bg3); }
.cat-resumo-title { margin: 0 0 1rem; font-size: 0.9rem; font-weight: 800; color: var(--text); }
.cat-resumo-bars  { display: flex; flex-direction: column; gap: 10px; }

.cat-bar-row  { display: flex; align-items: center; gap: 8px; }
.cat-bar-nome { font-size: 0.78rem; font-weight: 600; color: var(--text); min-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-bar-track { flex: 1; height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
.cat-bar-fill  { height: 100%; border-radius: 99px; transition: width 0.5s; }
.cat-bar-val   { font-size: 0.7rem; font-weight: 700; color: var(--text2); min-width: 64px; text-align: right; }

.cat-insight-card { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); color: white; border-radius: 14px; padding: 1.4rem; display: flex; flex-direction: column; }

/* ── Misc ──────────────────────────────────────────────────── */
.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }
.text-right { text-align: right; }
.bold  { font-weight: 700; }
.mono  { font-family: monospace; }
.muted { color: var(--text2); }
.overflow-x { overflow-x: auto; }
</style>
