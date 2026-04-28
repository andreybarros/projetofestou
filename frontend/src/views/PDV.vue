<template>
  <div class="pdv">

    <!-- PDV Topo agora via App.vue (topbar) -->


    <!-- ── CORPO SPLIT ─────────────────────────────────────────── -->
    <div class="pdv-body">

      <!-- ══ ESQUERDA: Catálogo ══════════════════════════════════ -->
      <section :class="['catalog', { 'mobile-hidden': mobileView === 'cart' }]">

        <!-- Busca + categorias -->
        <div class="catalog-controls">
          <div class="search-row">
            <div class="search-wrap">
              <svg class="search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="busca" type="text" placeholder="Buscar… ou 4* para adicionar 4 un." class="search-input" @input="filtrarProdutos" @keydown.esc="busca = ''" />
              <span v-if="qtdMultiplicador > 1" class="qty-multiplier-badge">× {{ qtdMultiplicador }}</span>
              <button v-if="busca" class="search-clear" @click="busca = ''">×</button>
            </div>
            <button class="btn-scan" @click="abrirScanner" title="Ler código de barras">
              <span class="material-symbols-outlined">barcode_scanner</span>
            </button>
          </div>

          <div class="cat-scroll">
            <button
              v-for="cat in [{pk: null, nome: 'Todos'},...categorias]"
              :key="String(cat.pk)"
              :class="['cat-pill', { active: catSel === cat.pk }]"
              @click="catSel = cat.pk"
            >{{ cat.nome }}</button>
          </div>
        </div>

        <!-- Grid de produtos -->
        <div class="products-area">
          <!-- Bloqueio de Caixa Fechado -->
          <div v-if="caixaVerificado && !caixaStore.caixaAberto && parametrosStore.getParam('pdv_bloquear_sem_caixa', true)" class="caixa-closed-overlay">
            <div class="cc-content">
              <span class="material-symbols-outlined cc-icon">lock</span>
              <h3>Caixa Fechado</h3>
              <p>Você precisa abrir o caixa antes de realizar vendas.</p>
              <button @click="$router.push('/caixa')" class="btn-go-caixa">Abrir Caixa Agora</button>
            </div>
          </div>

          <div v-if="carregando" class="state-msg">
            <span class="spin"></span> Carregando produtos…
          </div>
          <div v-else-if="!filtrados.length" class="state-msg muted">
            Nenhum produto encontrado
          </div>
          <div v-else class="products-grid">
            <button
              v-for="p in filtrados"
              :key="p.pk"
              class="prod-card"
              :class="{ 'no-stock': p.saldo !== null && p.saldo <= 0 }"
              @click="add(p)"
            >
              <div class="prod-img">
                <img v-if="p.foto_url" :src="p.foto_url" :alt="p.descricao" loading="lazy" width="90" height="90" />
                <span v-else class="prod-img-icon">{{ (p.descricao||'?')[0].toUpperCase() }}</span>
              </div>
              <div class="prod-info">
                <span class="prod-name">{{ p.descricao }}</span>
                <span class="prod-code">{{ p.codigo || '' }}</span>
              </div>
              <div class="prod-bottom">
                <div class="prod-price-wrap">
                  <span v-if="getPromoAtiva(p)" class="prod-price-original">{{ fmt(p.valor_venda) }}</span>
                  <span :class="['prod-price', { 'prod-price-promo': getPromoAtiva(p) }]">{{ fmt(getPrecoEfetivo(p)) }}</span>
                </div>
                <span :class="['prod-stock', p.saldo <= 0 ? 'zero' : p.saldo <= 5 ? 'low' : '']">
                  {{ p.saldo !== null ? p.saldo : '∞' }}
                </span>
              </div>
              <div v-if="getPromoAtiva(p)" class="prod-promo-badge">PROMO</div>
              <div v-else class="prod-add-badge">+</div>
            </button>
          </div>
        </div>
      </section>

      <!-- ══ DIREITA: Carrinho em abas ════════════════════════════ -->
      <aside :class="['cart', { 'mobile-hidden': mobileView === 'catalog' }]">

        <!-- Botão Voltar Mobile -->
        <button v-if="mobileView === 'cart'" class="cart-back-mobile lg-hide" @click="mobileView = 'catalog'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar ao Catálogo
        </button>

        <!-- Tabs -->
        <div class="cart-tabs">
          <button :class="['cart-tab', { active: cartTab === 0 }]" @click="cartTab = 0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Itens
            <span v-if="vendaStore.itens.length" class="tab-badge">{{ vendaStore.itens.reduce((s,i) => s + parseFloat(i.qtd||1), 0) }}</span>
          </button>
          <button :class="['cart-tab', { active: cartTab === 1 }]" @click="cartTab = 1" :disabled="!vendaStore.itens.length">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Detalhes
          </button>
          <button :class="['cart-tab', { active: cartTab === 2 }]" @click="cartTab = 2" :disabled="!vendaStore.itens.length">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Pagamento
            <span v-if="parseFloat(vendaStore.faltaPagar) <= 0.009 && vendaStore.pagamentos.length" class="tab-badge ok">✓</span>
          </button>
          <button v-if="vendaStore.itens.length" class="cart-clear-btn" @click="limpar" title="Limpar carrinho">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>

        <!-- ── ABA 0: Itens ──────────────────────────────────── -->
        <div v-show="cartTab === 0" class="tab-panel">
          <div class="cart-items" ref="cartItemsEl">
            <div v-if="!vendaStore.itens.length" class="cart-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <p>Adicione produtos ao carrinho</p>
            </div>
            <TransitionGroup name="item" tag="div" class="items-list">
              <div v-for="(it, i) in vendaStore.itens" :key="it.produto_pk" class="cart-item">
                <div class="ci-row ci-top">
                  <div class="item-name-wrap">
                    <span class="item-name">{{ it.nome }}</span>
                    <span class="item-unit-price">{{ fmt(it.preco_unitario) }} / un</span>
                  </div>
                  <button class="item-del" @click="vendaStore.removerItem(i); if(itemDescAberto===i) itemDescAberto=null">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div class="ci-row ci-bottom">
                  <div class="item-controls">
                    <button class="qty-btn" @click="vendaStore.atualizarQuantidade(i, it.qtd - 1)" :disabled="it.qtd <= 1">−</button>
                    <span class="qty-val">{{ it.qtd }}</span>
                    <button class="qty-btn" @click="incrementarItem(i, it)" :disabled="!permitirEstoqueNegativo && it.saldo !== null && it.qtd >= it.saldo">+</button>
                  </div>
                  <div class="item-desc-inline">
                    <div class="desc-type-toggle compact">
                      <button :class="['desc-type-btn', { active: itemDescAberto === i && itemDescTipo === 'pct' }]" @click="toggleDescItem(i, 'pct')">%</button>
                      <button :class="['desc-type-btn', { active: itemDescAberto === i && itemDescTipo === 'brl' }]" @click="toggleDescItem(i, 'brl')">R$</button>
                    </div>
                    <template v-if="itemDescAberto === i">
                      <input v-model.number="itemDescVal" type="number" min="0" step="0.01" :max="itemDescTipo === 'pct' ? 100 : undefined" :placeholder="itemDescTipo === 'pct' ? '%' : '0,00'" class="cart-input item-desc-input" prevent @keydown.enter.prevent="aplicarDescontoItem(i)" />
                      <button class="desc-confirm-btn" @click.stop.prevent="aplicarDescontoItem(i)">✓</button>
                    </template>
                    <span v-else-if="it.desconto_pct > 0" class="item-disc-badge" @click="toggleDescItem(i, 'pct')" style="cursor:pointer">−{{ it.desconto_pct % 1 === 0 ? it.desconto_pct : it.desconto_pct.toFixed(1) }}%</span>
                  </div>
                  <span class="item-total">{{ fmt(it.preco_total) }}</span>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <template v-if="vendaStore.itens.length">
            <div v-if="catsDecorador.length" class="cart-section">
              <label class="section-label">Desconto decorador</label>
              <div v-for="cd in catsDecorador" :key="cd.pk" class="decorador-row">
                <span class="decorador-nome">🎈 {{ cd.nome }}</span>
                <span class="decorador-pct-label">10%</span>
                <button class="btn-apply-dec" @click="aplicarDescCat(cd)">Aplicar</button>
              </div>
            </div>

            <div class="cart-summary">
              <div class="summary-row">
                <span>{{ vendaStore.itens.reduce((s,i) => s + parseFloat(i.qtd||1), 0) }} {{ vendaStore.itens.reduce((s,i) => s + parseFloat(i.qtd||1), 0) === 1 ? 'item' : 'itens' }}</span>
                <span>{{ fmt(vendaStore.subtotal) }}</span>
              </div>
              <div v-if="parseFloat(vendaStore.desconto) > 0" class="summary-row disc">
                <span>Desconto</span><span>− {{ fmt(vendaStore.desconto) }}</span>
              </div>
              <div class="summary-total">
                <span>Total</span><span>{{ fmt(vendaStore.total) }}</span>
              </div>
            </div>

            <div class="cart-actions">
              <button class="btn-avancar" @click="cartTab = 1">
                Detalhes da Venda
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button class="btn-orcamento" :class="{ copiado: orcCopiado }" @click="copiarOrcamento">
                <svg v-if="!orcCopiado" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {{ orcCopiado ? 'Copiado!' : 'Gerar Orçamento' }}
              </button>
            </div>
          </template>
        </div>

        <!-- ── ABA 1: Detalhes da Venda ─────────────────────── -->
        <div v-show="cartTab === 1" class="tab-panel">

          <div class="pag-scroll">
            <!-- Cliente -->
            <div class="cart-section cliente-section">
              <label class="section-label">Cliente <span class="opt">(opcional)</span></label>
              <div v-if="clienteSel" class="cliente-chip">
                <div class="cliente-chip-info">
                  <span class="cliente-chip-nome">{{ clienteSel.nome }}</span>
                  <span class="cliente-chip-sub">
                    <span v-if="clienteSel.cpf">{{ clienteSel.cpf }}</span>
                    <span v-if="clienteSel.telefone"> · {{ clienteSel.telefone }}</span>
                    <span v-if="clienteSel.decorador" class="badge-dec">Decorador</span>
                  </span>
                </div>
                <button class="cliente-chip-del" @click="removerCliente">×</button>
              </div>
              <div v-else class="cliente-search-wrap">
                <svg class="search-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                <input v-model="clienteBusca" type="text" class="cart-input cliente-input" placeholder="Nome, CPF ou telefone…" @input="buscarClientes" @focus="showClienteDrop = true" @blur="onClienteBlur" autocomplete="off" />
                <span v-if="buscandoCliente" class="spin-xs"></span>
              </div>
              <div v-if="showClienteDrop && clienteResultados.length" class="cliente-drop">
                <button v-for="c in clienteResultados" :key="c.pk" class="cliente-drop-item" @mousedown.prevent="selecionarCliente(c)">
                  <span class="drop-nome">{{ c.nome }}</span>
                  <span class="drop-sub">
                    <span v-if="c.cpf">{{ c.cpf }}</span>
                    <span v-if="c.telefone"> · {{ c.telefone }}</span>
                    <span v-if="c.decorador" class="badge-dec">Decorador</span>
                  </span>
                </button>
              </div>
              <div v-else-if="showClienteDrop && clienteBusca.length >= 2 && !buscandoCliente && !clienteResultados.length" class="cliente-drop">
                <span class="drop-empty">Nenhum cliente encontrado</span>
              </div>
            </div>

            <!-- Vendedor -->
            <div class="cart-section vendedor-section">
              <label class="section-label">Vendedor <span v-if="exigeVendedor" class="obrig">*</span></label>
              <select v-model="vendedorSel" class="cart-select vendedor-select">
                <option :value="null" disabled>— Selecione o vendedor —</option>
                <option v-for="v in vendedores" :key="v.pk" :value="v">{{ v.nome }}</option>
              </select>
              <span v-if="exigeVendedor && !vendedorSel" class="vendedor-aviso">Selecione um vendedor para finalizar</span>
            </div>

            <!-- Tipo de venda -->
            <div class="cart-section">
              <label class="section-label">Tipo de venda</label>
              <select v-model="tipoVenda" class="cart-select">
                <option value="venda">Venda</option>
                <option value="locacao">Locação</option>
              </select>
            </div>

            <!-- Datas locação -->
            <div v-if="tipoVenda === 'locacao'" class="cart-section two-col">
              <div>
                <label class="section-label">Retirada</label>
                <input v-model="dtLocacao" type="datetime-local" class="cart-input sm" />
              </div>
              <div>
                <label class="section-label">Devolução</label>
                <input v-model="dtDevolucao" type="datetime-local" class="cart-input sm" />
              </div>
            </div>

            <!-- Canal de venda -->
            <div class="cart-section">
              <label class="section-label">Canal de venda</label>
              <div class="canal-selector">
                <button :class="['canal-btn', { active: canalVenda === 'presencial' }]" @click="canalVenda = 'presencial'">🏪 Presencial</button>
                <button :class="['canal-btn', { active: canalVenda === 'whatsapp' }]" @click="canalVenda = 'whatsapp'">💬 WhatsApp</button>
              </div>
            </div>

            <!-- CPF na nota -->
            <div class="cart-section">
              <label class="section-label">CPF na nota <span class="opt">(opcional)</span></label>
              <input v-model="cpf" type="text" class="cart-input" placeholder="000.000.000-00" maxlength="14" @input="maskCpf" />
            </div>
          </div>

          <div class="cart-actions">
            <button class="btn-avancar" @click="cartTab = 2">
              Formas de Pagamento
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- ── ABA 2: Pagamento ─────────────────────────────── -->
        <div v-show="cartTab === 2" class="tab-panel">

          <!-- Total + troco em destaque -->
          <div class="total-hero">
            <span class="total-hero-label">Total da Venda</span>
            <span class="total-hero-value">{{ fmt(vendaStore.total) }}</span>
            <div v-if="parseFloat(vendaStore.desconto) > 0" class="total-hero-disc">
              Subtotal {{ fmt(vendaStore.subtotal) }} · Desconto − {{ fmt(vendaStore.desconto) }}
            </div>
          </div>

          <!-- Cartão de status do pagamento -->
          <div class="pag-status-card">
            <div class="psc-row">
              <span class="psc-label">Total</span>
              <span class="psc-val">{{ fmt(vendaStore.total) }}</span>
            </div>
            <div class="psc-row">
              <span class="psc-label">Pago</span>
              <span class="psc-val psc-pago">{{ fmt(vendaStore.totalPago) }}</span>
            </div>
            <div v-if="parseFloat(vendaStore.faltaPagar) > 0.009" class="psc-row psc-falta">
              <span class="psc-label">Falta</span>
              <span class="psc-val">{{ fmt(vendaStore.faltaPagar) }}</span>
            </div>
            <div v-else-if="troco > 0.009" class="psc-row psc-troco">
              <span class="psc-label">Troco</span>
              <span class="psc-val">{{ fmt(troco) }}</span>
            </div>
            <div v-if="parseFloat(vendaStore.faltaPagar) <= 0.009 && vendaStore.pagamentos.length" class="psc-ok">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Pagamento completo
            </div>
          </div>

          <div class="pag-scroll">
            <!-- Forma de pagamento -->
            <div class="cart-section">
              <label class="section-label">Forma de pagamento</label>
              <div class="pag-row">
                <select v-model="formaPag" class="cart-select flex1">
                  <option v-for="f in formasPagamento" :key="f.pk" :value="f.forma">{{ f.icone }} {{ f.label }}</option>
                </select>
                <input v-model.number="valorPag" type="number" min="0" step="0.01" placeholder="0,00" class="cart-input pag-val" />
                <button class="pag-add" @click="addPag">+</button>
              </div>
              <div v-if="formaPag === 'crediario'" class="crediario-fields">
                <div class="crediario-row">
                  <div>
                    <label class="section-label">Vencimento <span class="obrig">*</span></label>
                    <input v-model="dtVenc" type="date" class="cart-input sm" />
                  </div>
                </div>
                <div v-if="crediarioExigeCliente && !clienteSel" class="crediario-warn">
                  <span class="material-symbols-outlined">warning</span>
                  Selecione um cliente para usar o crediário
                </div>
              </div>
              <div v-if="temCrediario && clienteInadimplente && crediarioBloqueiainadimpl" class="crediario-warn inadimpl" style="margin-top:6px">
                <span class="material-symbols-outlined">block</span>
                <span>Cliente possui <b>{{ inadimplenteQtd }} boleto(s) em atraso</b>. Crediário disponível somente após quitar as dívidas.</span>
              </div>
              <div v-if="vendaStore.pagamentos.length" class="pag-list">
                <div v-for="(p, i) in vendaStore.pagamentos" :key="i" class="pag-item">
                  <span class="pag-forma">{{ p.forma }}</span>
                  <span class="pag-valor">{{ fmt(p.valor) }}</span>
                  <button class="pag-del" @click="vendaStore.removerPagamento(i)">×</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Ações fixas no fundo -->
          <div class="cart-actions">
            <button class="btn-finalizar" :disabled="!podeFinalizar || processando" @click="finalizar">
              <span v-if="processando" class="spin-sm"></span>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {{ processando ? 'Processando…' : 'Finalizar Venda' }}
            </button>

            <!-- Botão de Recibo após finalizar -->
            <button v-if="vendaFinalizada" class="btn-recibo-pos" @click="imprimirRecibo">
              <span class="material-symbols-outlined">print</span>
              Imprimir Recibo
            </button>

            <!-- Botão de Contrato (apenas locação) -->
            <button v-if="vendaFinalizada && tipoVenda === 'locacao'" class="btn-contrato-pos" @click="imprimirContrato">
              <span class="material-symbols-outlined">description</span>
              Imprimir Contrato
            </button>

            <!-- Botão de Limpar/Nova Venda após finalizar -->
            <button v-if="vendaFinalizada" type="button" class="btn-limpar-pos" @click="limpar">
              <span class="material-symbols-outlined">delete_sweep</span>
              Nova Venda
            </button>
          </div>

        </div><!-- /tab 2 -->


      </aside>
    </div>



    <!-- Botão flutuante do carrinho (só mobile, quando no catálogo) -->
    <button
      v-if="mobileView === 'catalog'"
      class="fab-cart"
      @click="mobileView = 'cart'"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span v-if="vendaStore.itens.length" class="fab-badge">{{ vendaStore.itens.reduce((s,i) => s + parseFloat(i.qtd||1), 0) }}</span>
      <span class="fab-total" v-if="vendaStore.total > 0">{{ fmt(vendaStore.total) }}</span>
    </button>

    <!-- ── TOAST ────────────────────────────────────────────────── -->
    <Transition name="toast">
      <div v-if="toastMsg" class="pdv-toast" :class="toastTipo">
        <svg v-if="toastTipo === 'ok'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toastMsg }}
      </div>
    </Transition>

  </div>

  <!-- Modal Scanner de Código de Barras -->
  <Teleport to="body">
    <div v-if="scannerAberto" class="scanner-overlay">
      <div class="scanner-box">
        <div class="scanner-header">
          <span class="material-symbols-outlined scanner-icon">barcode_scanner</span>
          <span class="scanner-title">Aponte para o código de barras</span>
          <button class="scanner-close" @click="fecharScanner">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="scanner-viewport">
          <video id="pdv-scanner-video" class="scanner-video" playsinline muted></video>
          <div class="scanner-frame">
            <span class="sf-corner tl"></span>
            <span class="sf-corner tr"></span>
            <span class="sf-corner bl"></span>
            <span class="sf-corner br"></span>
          </div>
          <div class="scanner-line"></div>
        </div>

        <p v-if="scannerStatus" class="scanner-status" :class="scannerStatusTipo">{{ scannerStatus }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch, inject } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useVendaStore }      from '../stores/venda';
import { useCaixaStore }      from '../stores/caixa';
import { useSessaoStore }     from '../stores/sessao';
import { useParametrosStore } from '../stores/parametros';
import { supabase }           from '../composables/useSupabase';
import apiClient              from '../services/api';

const mobileView      = ref('catalog'); // 'catalog' | 'cart'
const vendaStore      = useVendaStore();
const caixaStore      = useCaixaStore();
const sessaoStore     = useSessaoStore();
const parametrosStore = useParametrosStore();
const abrirSidebarFn  = inject('abrirSidebar', () => {});

// ── Estado ────────────────────────────────────────────────────
const busca          = ref('');
const scannerAberto     = ref(false);
const scannerStatus     = ref('');
const scannerStatusTipo = ref('');

const catSel         = ref(null);
const carregando     = ref(true);
const caixaVerificado = ref(false);
const todos          = ref([]);
const categorias     = ref([]);
const vendedores     = ref([]);
const vendedorSel    = ref(null);
const cpf            = ref('');
const tipoVenda      = ref('venda');
const canalVenda     = ref('presencial');
const cartTab           = ref(0);
const itemDescAberto    = ref(null);
const itemDescTipo      = ref('pct');
const itemDescVal       = ref(0);
const clienteSel        = ref(null);
const clienteBusca      = ref('');
const clienteResultados = ref([]);
const buscandoCliente   = ref(false);
const showClienteDrop   = ref(false);
let   _clienteTimer     = null;
const dtLocacao   = ref('');
const dtDevolucao = ref('');
const dtVenc      = ref('');
const formaPag    = ref('dinheiro');
const formasPagamento = ref([]);
const valorPag    = ref(0);
const processando = ref(false);
const emitindo    = ref(false);
const vendaFinalizada = ref(false);
const vendaPk     = ref(null);
const vendaNumero = ref(null);
const resultNfce  = ref(null);
const cartItemsEl = ref(null);

// ── Orçamento ─────────────────────────────────────────────────
const orcCopiado = ref(false);

// ── Toast ─────────────────────────────────────────────────────
const toastMsg  = ref('');
const toastTipo = ref('ok');
let   _toastTimer = null;

function toast(msg, tipo = 'ok', duracao = 3000) {
  clearTimeout(_toastTimer);
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  _toastTimer = setTimeout(() => { toastMsg.value = ''; }, duracao);
}

// ── Computed ──────────────────────────────────────────────────
// Extrai "4*texto" → multiplicador=4, termo="texto"
const qtdMultiplicador = computed(() => {
  const m = busca.value.match(/^(\d+)\*/);
  return m ? parseInt(m[1]) : 1;
});

const termoBusca = computed(() => {
  return busca.value.replace(/^\d+\*/, '').trim().toLowerCase();
});

const filtrados = computed(() => {
  let l = todos.value;
  if (catSel.value !== null)
    l = l.filter(p => p.categoria_pk === catSel.value);
  const q = termoBusca.value;
  if (q) {
    const palavras = q.split(/\s+/).filter(Boolean);
    l = l.filter(p => {
      const desc    = (p.descricao    || '').toLowerCase();
      const codigo  = (p.codigo       || '').toLowerCase();
      const barras  = (p.codigo_barras || '');
      if (barras.includes(q) || codigo.includes(q)) return true;
      return palavras.every(w => desc.includes(w));
    });
  }
  return l;
});

const bloqueiarSemCaixa         = computed(() => parametrosStore.getParam('pdv_bloquear_sem_caixa', true));
const crediarioExigeCliente     = computed(() => parametrosStore.getParam('crediario_exige_cliente', true));
const crediarioBloqueiainadimpl = computed(() => parametrosStore.getParam('crediario_bloqueia_inadimplente', true));
const exigeVendedor             = computed(() => parametrosStore.getParam('pdv_exigir_vendedor', false));
const permitirEstoqueNegativo   = computed(() => parametrosStore.getParam('pdv_permitir_estoque_negativo', false));

const temCrediario = computed(() =>
  vendaStore.pagamentos.some(p => String(p.forma).toLowerCase() === 'crediario')
);

const clienteInadimplente  = ref(false);
const inadimplenteQtd      = ref(0);

watch([clienteSel, temCrediario, crediarioBloqueiainadimpl], async ([cli, temCred, bloqueiaInadimpl]) => {
  if (!cli?.pk || !temCred || !bloqueiaInadimpl) {
    clienteInadimplente.value = false;
    inadimplenteQtd.value     = 0;
    return;
  }
  const hoje = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('vendas')
    .select('pk')
    .eq('cliente_pk', cli.pk)
    .not('data_vencimento_crediario', 'is', null)
    .or('status_crediario.is.null,status_crediario.eq.pendente')
    .lt('data_vencimento_crediario', hoje);
  inadimplenteQtd.value     = data?.length || 0;
  clienteInadimplente.value = inadimplenteQtd.value > 0;
}, { immediate: false });

const podeFinalizar = computed(() =>
  vendaStore.itens.length > 0 &&
  parseFloat(vendaStore.totalPago) >= parseFloat(vendaStore.total) - 0.009 &&
  (!exigeVendedor.value || !!vendedorSel.value) &&
  !vendaFinalizada.value &&
  (!bloqueiarSemCaixa.value || !!caixaStore.caixaAberto) &&
  (!temCrediario.value || !!dtVenc.value) &&
  (!temCrediario.value || !crediarioExigeCliente.value || !!clienteSel.value) &&
  (!temCrediario.value || !crediarioBloqueiainadimpl.value || !clienteInadimplente.value)
);

const troco = computed(() =>
  Math.max(0, parseFloat(vendaStore.totalPago) - parseFloat(vendaStore.total))
);

// ── Sincronização vendedor/cliente com store ──────────────────
watch(vendedorSel, v  => vendaStore.setVendedor(v));
watch(clienteSel,  c  => vendaStore.setCliente(c));

// ── Mount ─────────────────────────────────────────────────────
onMounted(async () => {
  await checkCaixa();
  await Promise.all([loadProdutos(), loadCategorias(), loadVendedores(), loadFormasPagamento()]);
  // Restaura cliente (objeto completo) diretamente
  if (vendaStore.cliente) clienteSel.value = vendaStore.cliente;
});

async function loadProdutos() {
  carregando.value = true;
  try {
    let q = supabase
      .from('produtos')
      .select('pk, codigo, descricao, valor_venda, preco_promo, promo_inicio, promo_fim, saldo, categoria_pk, foto_url, codigo_barras, ncm, cfop, csosn, unidade_comercial')
      .order('descricao');
    if (sessaoStore.filial?.pk)
      q = q.eq('filial_pk', sessaoStore.filial.pk);
    const { data, error } = await q;
    if (error) throw error;
    todos.value = data || [];
  } catch (e) {
    console.error('Produtos:', e.message);
  } finally {
    carregando.value = false;
  }
}

async function loadVendedores() {
  let q = supabase.from('vendedores').select('pk, nome').eq('ativo', true).order('nome');
  if (sessaoStore.filial?.pk) q = q.eq('filial_pk', sessaoStore.filial.pk);
  const { data } = await q;
  vendedores.value = data || [];
}

async function loadCategorias() {
  let q = supabase.from('categorias').select('pk, nome, desconto_somente_decorador').order('nome');
  if (sessaoStore.filial?.pk)
    q = q.eq('filial_pk', sessaoStore.filial.pk);
  const { data } = await q;
  categorias.value = data || [];
}

// Categorias decorador que têm itens no carrinho
const catsDecorador = computed(() => {
  const pksNoCarrinho = new Set(vendaStore.itens.map(i => i.categoria_pk));
  return categorias.value
    .filter(c => c.desconto_somente_decorador && pksNoCarrinho.has(c.pk))
    .map(c => ({ ...c, descInput: 0 }));
});

async function checkCaixa() {
  if (sessaoStore.filial?.pk)
    await caixaStore.verificarStatus(sessaoStore.filial.pk);
  caixaVerificado.value = true;
}

async function loadFormasPagamento() {
  const fil = sessaoStore.filial?.pk;
  if (!fil) return;
  const { data } = await supabase
    .from('formas_pagamento')
    .select('*')
    .eq('filial_pk', fil)
    .eq('ativo', true)
    .order('ordem');
  
  const base = data?.length ? data : [
    { pk: 'dinheiro',  forma: 'dinheiro',  label: 'Dinheiro',  icone: '💵', ordem: 1 },
    { pk: 'pix',       forma: 'pix',       label: 'PIX',       icone: '📱', ordem: 2 },
    { pk: 'debito',    forma: 'debito',    label: 'Débito',    icone: '💳', ordem: 3 },
    { pk: 'credito',   forma: 'credito',   label: 'Crédito',   icone: '💳', ordem: 4 },
    { pk: 'crediario', forma: 'crediario', label: 'Crediário', icone: '🧾', ordem: 5 },
  ];

  // Garante que crediário está sempre disponível
  if (!base.some(f => f.forma === 'crediario')) {
    base.push({ pk: 'crediario', forma: 'crediario', label: 'Crediário', icone: '🧾', ordem: 99 });
  }

  formasPagamento.value = base;
  if (!base.some(f => f.forma === formaPag.value)) {
    formaPag.value = base[0].forma;
  }
}

// ── Helpers ───────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function maskCpf() {
  let v = cpf.value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  cpf.value = v;
}

function filtrarProdutos() {}

// ── Scanner de Código de Barras ───────────────────────────────
let zxingReader      = null;
let scannerControls  = null;
let scannerDetectado = false;

async function abrirScanner() {
  scannerAberto.value  = true;
  scannerDetectado     = false;
  scannerStatus.value  = '';
  scannerStatusTipo.value = '';

  // aguarda dois ticks para garantir que o Teleport montou o <video>
  await nextTick();
  await nextTick();

  if (!navigator.mediaDevices?.getUserMedia) {
    scannerStatus.value = 'Câmera requer conexão segura (HTTPS). Acesse via https://';
    scannerStatusTipo.value = 'err';
    return;
  }

  const videoEl = document.getElementById('pdv-scanner-video');
  if (!videoEl) {
    scannerStatus.value = 'Erro interno: elemento de vídeo não encontrado.';
    scannerStatusTipo.value = 'err';
    return;
  }

  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');

    const hints = new Map([
      [DecodeHintType.TRY_HARDER, true],
      [DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      ]],
    ]);

    zxingReader = new BrowserMultiFormatReader(hints);

    scannerControls = await zxingReader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: 'environment' },
          width:  { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
        }
      },
      videoEl,
      (result, error) => {
        if (!result || scannerDetectado) return;
        scannerDetectado = true;
        const codigo = result.getText();
        fecharScanner();
        const produto = todos.value.find(p =>
          p.codigo_barras === codigo || p.codigo === codigo
        );
        if (produto) {
          add(produto);
          toast(`${produto.descricao} adicionado.`, 'ok');
        } else {
          busca.value = codigo;
          filtrarProdutos();
          toast(`Código lido: ${codigo}`, 'ok');
        }
      }
    );
  } catch (e) {
    console.error('[Scanner]', e);
    const msg = e?.message || '';
    if (/permission|denied|notallowed/i.test(msg)) {
      scannerStatus.value = 'Permissão de câmera negada. Libere nas configurações do navegador.';
    } else if (/notfound|devicenotfound/i.test(msg)) {
      scannerStatus.value = 'Nenhuma câmera encontrada neste dispositivo.';
    } else {
      scannerStatus.value = msg || 'Não foi possível iniciar o scanner.';
    }
    scannerStatusTipo.value = 'err';
  }
}

function fecharScanner() {
  try { scannerControls?.stop(); } catch {}
  try { zxingReader?.reset(); } catch {}
  // para todas as tracks da câmera explicitamente
  const videoEl = document.getElementById('pdv-scanner-video');
  if (videoEl?.srcObject) {
    videoEl.srcObject.getTracks().forEach(t => t.stop());
    videoEl.srcObject = null;
  }
  scannerControls  = null;
  zxingReader      = null;
  scannerAberto.value = false;
  scannerStatus.value = '';
}

function buscarClientes() {
  showClienteDrop.value = true;
  clearTimeout(_clienteTimer);
  if (clienteBusca.value.length < 2) { clienteResultados.value = []; return; }
  _clienteTimer = setTimeout(async () => {
    buscandoCliente.value = true;
    try {
      const q = clienteBusca.value.trim();
      const { data } = await supabase
        .from('clientes')
        .select('pk, nome, cpf, telefone, decorador')
        .or(`nome.ilike.%${q}%,cpf.ilike.%${q}%,telefone.ilike.%${q}%`)
        .order('nome')
        .limit(8);
      clienteResultados.value = data || [];
    } finally {
      buscandoCliente.value = false;
    }
  }, 300);
}

function selecionarCliente(c) {
  clienteSel.value        = c;
  clienteBusca.value      = '';
  clienteResultados.value = [];
  showClienteDrop.value   = false;
  // preenche CPF automaticamente se o cliente tiver
  if (c.cpf && !cpf.value) cpf.value = c.cpf;
}

function removerCliente() {
  clienteSel.value = null;
  cpf.value        = '';
}

function onClienteBlur() {
  setTimeout(() => { showClienteDrop.value = false; }, 150);
}

function aplicarDescCat(cd) {
  if (!parametrosStore.getParam('venda_permite_desconto_sem_aprovacao', true)) {
    toast('Descontos desabilitados pelo administrador.', 'err'); return;
  }
  const descontoMax = parametrosStore.getParam('pdv_desconto_maximo', 0);
  if (descontoMax > 0 && 10 > descontoMax) {
    toast(`Desconto máximo permitido: ${descontoMax}%.`, 'err'); return;
  }
  vendaStore.aplicarDescontoCategoria(cd.pk, 10);
}

function toggleDescItem(i, tipo = 'pct') {
  if (itemDescAberto.value === i && itemDescTipo.value === tipo) {
    itemDescAberto.value = null;
  } else {
    itemDescAberto.value = i;
    const it = vendaStore.itens[i];
    itemDescTipo.value = tipo;
    if (tipo === 'pct') {
      itemDescVal.value = it.desconto_pct || 0;
    } else {
      itemDescVal.value = it.desconto_pct > 0 ? parseFloat((it.qtd * it.preco_unitario - it.preco_total).toFixed(2)) : 0;
    }
  }
}

function aplicarDescontoItem(i) {
  if (!parametrosStore.getParam('venda_permite_desconto_sem_aprovacao', true)) {
    toast('Descontos desabilitados pelo administrador.', 'err'); return;
  }
  const descontoMax = parametrosStore.getParam('pdv_desconto_maximo', 0);
  if (descontoMax > 0 && itemDescTipo.value === 'pct' && itemDescVal.value > descontoMax) {
    toast(`Desconto máximo permitido: ${descontoMax}%.`, 'err'); return;
  }
  vendaStore.atualizarDescontoItem(i, itemDescVal.value, itemDescTipo.value);
  itemDescAberto.value = null;
}

function getPromoAtiva(p) {
  if (!p.preco_promo || !p.promo_inicio || !p.promo_fim) return false;
  const agora = new Date();
  return agora >= new Date(p.promo_inicio) && agora <= new Date(p.promo_fim);
}

function getPrecoEfetivo(p) {
  return getPromoAtiva(p) ? p.preco_promo : (p.valor_venda || 0);
}

function add(p) {
  if (vendaFinalizada.value) return;
  const qtd = qtdMultiplicador.value;
  if (!permitirEstoqueNegativo.value && p.saldo !== null) {
    const noCarrinho = vendaStore.itens.find(i => i.produto_pk === p.pk);
    const qtdAtual = noCarrinho ? parseFloat(noCarrinho.qtd || 0) : 0;
    if (qtdAtual + qtd > p.saldo) {
      const disponivel = p.saldo - qtdAtual;
      if (disponivel <= 0) toast('Produto sem estoque disponível.', 'err');
      else toast(`Estoque insuficiente. Disponível: ${disponivel}`, 'err');
      return;
    }
  }
  
  const preco = getPrecoEfetivo(p);
  
  vendaStore.adicionarItem({
    produto_pk:     p.pk,
    nome:           p.descricao,
    codigo:         p.codigo,
    categoria_pk:   p.categoria_pk,
    preco_unitario: parseFloat(preco),
    qtd,
    preco_total:    parseFloat(preco) * qtd,
    desconto_val:   0,
    saldo:          p.saldo,
  });
  // limpa o multiplicador após adicionar
  if (qtdMultiplicador.value > 1) busca.value = '';
  nextTick(() => {
    if (cartItemsEl.value)
      cartItemsEl.value.scrollTop = cartItemsEl.value.scrollHeight;
  });
}

function incrementarItem(idx, it) {
  if (!permitirEstoqueNegativo.value && it.saldo !== null && it.qtd >= it.saldo) {
    toast(`Estoque insuficiente. Máximo: ${it.saldo}`, 'err'); return;
  }
  vendaStore.atualizarQuantidade(idx, it.qtd + 1);
}

function addPag() {
  if (valorPag.value > 0) {
    vendaStore.adicionarPagamento({
      forma: formaPag.value,
      valor: valorPag.value,
      troco: formaPag.value === 'dinheiro'
        ? Math.max(0, valorPag.value - parseFloat(vendaStore.faltaPagar))
        : 0,
    });
    valorPag.value = 0;
  }
}

function limpar() {
  vendaStore.resetar();
  vendaFinalizada.value      = false;
  vendaPk.value              = null;
  vendaNumero.value          = null;
  resultNfce.value           = null;
  cpf.value                  = '';
  dtVenc.value               = '';
  dtLocacao.value            = '';
  dtDevolucao.value          = '';
  formaPag.value             = 'dinheiro';
  valorPag.value             = 0;
  tipoVenda.value            = 'venda';
  canalVenda.value           = 'presencial';
  vendedorSel.value          = null;
  clienteSel.value           = null;
  clienteBusca.value         = '';
  clienteResultados.value    = [];
  showClienteDrop.value      = false;
  clienteInadimplente.value  = false;
  inadimplenteQtd.value      = 0;
  itemDescAberto.value       = null;
  busca.value                = '';
  catSel.value               = null;
  cartTab.value              = 0;
}

onBeforeRouteLeave(() => {
  fecharScanner();
  if (vendaFinalizada.value) {
    vendaStore.resetar();
    vendaFinalizada.value = false;
    vendaPk.value = null;
    vendaNumero.value = null;
    resultNfce.value = null;
  }
});

// ── Orçamento ─────────────────────────────────────────────────
async function copiarOrcamento() {
  if (!vendaStore.itens.length) return;

  // Gera código sequencial ORC-XXXX
  let proximoNum = 1;
  try {
    const { data } = await supabase
      .from('orcamentos')
      .select('codigo')
      .like('codigo', 'ORC-%')
      .order('pk', { ascending: false })
      .limit(1);
    if (data?.length) {
      const num = parseInt(data[0].codigo.replace('ORC-', '')) || 0;
      proximoNum = num + 1;
    }
  } catch { /* usa 1 como fallback */ }
  const codigo = `ORC-${String(proximoNum).padStart(4, '0')}`;

  // Monta payload JSON para reimportação (salvo em memo)
  const payload = {
    v: 1,
    itens: vendaStore.itens.map(it => ({
      pk:  it.produto_pk,
      n:   it.nome,
      c:   it.codigo || null,
      cat: it.categoria_pk || null,
      u:   it.preco_unitario,
      q:   it.qtd,
      dp:  it.desconto_pct || 0,
      t:   it.preco_total,
    })),
  };

  // Salva no banco
  try {
    await supabase.from('orcamentos').insert({
      codigo,
      filial_pk: sessaoStore.filial?.pk || null,
      total:     vendaStore.total,
      status:    'aberto',
      memo:      JSON.stringify(payload),
    });
  } catch { /* falha silenciosa */ }

  // Monta texto WhatsApp com código curto
  const linhas = vendaStore.itens.map(it => {
    const disc = it.desconto_pct > 0 ? ` _(${it.desconto_pct}% desc)_` : '';
    return `• ${it.nome} × ${it.qtd} — *${fmt(it.preco_total)}*${disc}`;
  }).join('\n');
  const partes = [`🎉 *Orçamento ${codigo} — FESTOU*`, `━━━━━━━━━━━━━━━━━━━━\n`];
  partes.push(`*Itens:*\n${linhas}`);
  if (parseFloat(vendaStore.desconto) > 0)
    partes.push(`\nSubtotal: ${fmt(vendaStore.subtotal)}\nDesconto: − ${fmt(vendaStore.desconto)}`);
  partes.push(`\n✅ *Total: ${fmt(vendaStore.total)}*`);
  partes.push(`\n_Confirme para reservarmos os itens para você!_`);
  partes.push(`📍 Alameda Cosme Ferreira 6893 — Manaus/AM\n📱 (92) 98612-5736`);
  partes.push(`━━━━━━━━━━━━━━━━━━━━\nCódigo: ${codigo}`);
  const texto = partes.join('\n');

  // Copia direto para a área de transferência — funciona em desktop e mobile
  let copiou = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      copiou = true;
    }
  } catch (_) {}

  if (!copiou) {
    try {
      const el = document.createElement('textarea');
      el.value = texto;
      el.setAttribute('readonly', '');
      el.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(el);
      el.focus();
      el.setSelectionRange(0, texto.length);
      el.select();
      copiou = !!document.execCommand('copy');
      document.body.removeChild(el);
    } catch {}
  }

  if (copiou) {
    orcCopiado.value = true;
    setTimeout(() => { orcCopiado.value = false; }, 2500);
  }
  toast(`Orçamento ${codigo} copiado! Cole o código na busca para importar.`);
}

// Detecta "ORC-XXXX" colado na barra de busca
watch(busca, async (val) => {
  const match = val.trim().match(/^ORC-\d+$/i);
  if (!match) return;
  busca.value = '';
  await processarImport(val.trim().toUpperCase());
});

async function processarImport(codigo) {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('memo, total')
    .eq('codigo', codigo)
    .single();

  if (error || !data?.memo) {
    toast(`Orçamento ${codigo} não encontrado.`, 'err');
    return;
  }

  let payload;
  try { payload = JSON.parse(data.memo); } catch {
    toast('Dados do orçamento corrompidos.', 'err');
    return;
  }
  if (!payload?.itens?.length) {
    toast('O orçamento não contém itens.', 'err');
    return;
  }

  vendaStore.resetar();
  payload.itens.forEach(it => {
    vendaStore.adicionarItem({
      produto_pk:     it.pk,
      nome:           it.n,
      codigo:         it.c,
      categoria_pk:   it.cat,
      preco_unitario: it.u,
      qtd:            it.q,
      preco_total:    it.t,
      desconto_val:   0,
    });
    const idx = vendaStore.itens.length - 1;
    if (it.dp > 0) vendaStore.atualizarDescontoItem(idx, it.dp, 'pct');
  });
  cartTab.value = 0;
  toast(`Orçamento ${codigo} importado — ${payload.itens.length} item(ns) carregado(s).`);
}

// ── Finalizar ─────────────────────────────────────────────────
async function finalizar() {
  if (!podeFinalizar.value) return;
  processando.value = true;
  try {
    const payload = {
      filial_pk:      sessaoStore.filial?.pk || null,
      operador:       sessaoStore.operador?.nome || null,
      itens: vendaStore.itens.map(it => ({
        produto_pk:   it.produto_pk,
        descricao:    it.descricao || it.nome || '',
        codigo:       it.codigo || null,
        qtd:          it.qtd,
        preco_unit:   it.preco_unitario,
        desconto_pct: it.desconto_pct || 0,
        desconto_val: it.desconto_val || 0,
        total_item:   it.preco_total,
      })),
      pagamentos:     vendaStore.pagamentos.map(p => ({ forma: p.forma, valor: p.valor })),
      subtotal:       vendaStore.subtotal,
      desconto_total: vendaStore.desconto,
      total:          vendaStore.total,
      cliente:        clienteSel.value?.nome || null,
      cliente_pk:     clienteSel.value?.pk || null,
      vendedor:       vendedorSel.value?.nome || null,
      vendedor_pk:    vendedorSel.value?.pk || null,
      tipo_venda:     tipoVenda.value,
      canal_venda:    canalVenda.value,
      ...(tipoVenda.value === 'locacao' ? { data_locacao: dtLocacao.value, data_devolucao_prevista: dtDevolucao.value } : {}),
      ...(dtVenc.value ? { data_vencimento_crediario: dtVenc.value, status_crediario: 'pendente' } : {}),
    };
    const { data } = await apiClient.post('/api/vendas/finalizar', payload);
    vendaPk.value         = data.venda_pk;
    vendaNumero.value     = data.numero;
    vendaFinalizada.value = true;
    toast(`Venda #${data.numero} finalizada com sucesso!`);
    
    // Impressão automática
    setTimeout(() => {
      imprimirRecibo();
    }, 500);
  } catch (e) {
    toast('Erro: ' + (e.response?.data?.erro || e.message), 'err', 6000);
  } finally {
    processando.value = false;
  }
}

// ── Recibo (Documento Não Fiscal) ────────────────────────────
function imprimirRecibo() {
  const cli   = clienteSel.value || {};
  const itens = vendaStore.itens;
  const agora = new Date();
  const fmtDt = (d) => d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const linhaItens = itens.map(it => {
    const desc = it.desconto_pct > 0 ? ` (-${it.desconto_pct}%)` : '';
    return `
      <tr>
        <td>${it.nome}${desc}<br/><span style="font-size:13px;font-weight:bold">${it.qtd} × ${fmt(it.preco_unitario)}</span></td>
        <td style="text-align:right;white-space:nowrap;font-weight:bold">${fmt(it.preco_total)}</td>
      </tr>`;
  }).join('');

  const linhaPags = vendaStore.pagamentos.map(p =>
    `<tr><td style="text-transform:capitalize">${p.forma}</td><td style="text-align:right">${fmt(p.valor)}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Recibo #${vendaNumero.value}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { 
    size: 80mm auto; 
    margin: 0; 
  }
  html, body { 
    width: 75mm; 
    background: #fff; 
    margin: 0 auto;
    font-family: 'Courier New', Courier, monospace; 
    font-size: 13px; 
    line-height: 1.2;
    color: #000;
  }
  body { padding: 4mm 2mm; -webkit-print-color-adjust: exact; }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .sep    { border: none; border-top: 1px dashed #000; margin: 3mm 0; }
  h1 { font-size: 16px; text-align: center; font-weight: 900; margin-bottom: 2px; }
  h2 { font-size: 11px; text-align: center; font-weight: bold; margin-bottom: 1px; }
  .dnf { font-size: 11px; text-align: center; border: 1px solid #000; padding: 2px 5px; display: inline-block; margin: 4px auto; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 2px 0; }
  td { padding: 3px 0; vertical-align: top; font-size: 12px; font-weight: bold; }
  .total-line { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 5px; }
  .sub-line   { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 2px; }
  .disc-line  { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 2px; }
  .troco-line { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 2px; }
  .rodape { font-size: 11px; text-align: center; font-weight: bold; margin-top: 15px; line-height: 1.4; }
  
  @media print {
    html, body { width: 75mm; margin: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<h1>FESTOU</h1>
<h2>Locações e Decorações</h2>
<h2>CNPJ: 56.918.133/0001-04</h2>
<h2>Alameda Cosme Ferreira 6893 — Manaus/AM</h2>
<div class="center"><span class="dnf">DOCUMENTO NÃO FISCAL</span></div>
<hr class="sep"/>
<div class="sub-line"><span>Nº da venda</span><span>#${vendaNumero.value}</span></div>
<div class="sub-line"><span>Data/hora</span><span>${fmtDt(agora)}</span></div>
${cli.nome ? `<div class="sub-line"><span>Cliente</span><span>${cli.nome}</span></div>` : ''}
<div class="sub-line"><span>Vendedor</span><span>${vendedorSel.value?.nome || '—'}</span></div>
<hr class="sep"/>
<table>${linhaItens}</table>
<hr class="sep"/>
${parseFloat(vendaStore.desconto) > 0 ? `
  <div class="sub-line"><span>Subtotal</span><span>${fmt(vendaStore.subtotal)}</span></div>
  <div class="disc-line"><span>Desconto</span><span>− ${fmt(vendaStore.desconto)}</span></div>` : ''}
<div class="total-line"><span>TOTAL</span><span>${fmt(vendaStore.total)}</span></div>
<hr class="sep"/>
<table>${linhaPags}</table>
${troco.value > 0.009 ? `<div class="troco-line"><span>Troco</span><span>${fmt(troco.value)}</span></div>` : ''}
<hr class="sep"/>
<div class="rodape">
  Obrigado pela preferência!<br/>
  Este documento não tem valor fiscal.
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  iframe.contentWindow.addEventListener('afterprint', () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  });
  setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 15_000);
}

// ── Contrato de Locação ───────────────────────────────────────
function imprimirContrato() {
  const cli   = clienteSel.value || {};
  const itens = vendaStore.itens;

  const fmtDt = (iso) => {
    if (!iso) return '_______________';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };


  const hoje = new Date();
  const dia  = hoje.getDate();
  const mes  = hoje.toLocaleString('pt-BR', { month: 'long' });
  const ano  = hoje.getFullYear();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Contrato de Locação — Festou</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 30px 40px; line-height: 1.5; }
  h1 { font-size: 15px; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  h2 { font-size: 12px; text-align: center; font-weight: normal; margin-bottom: 20px; color: #444; }
  .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #333; margin: 16px 0 8px; padding-bottom: 2px; }
  .row { display: flex; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
  .field { flex: 1; min-width: 160px; }
  .field label { font-size: 10px; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 2px; color: #555; }
  .field .val { border-bottom: 1px solid #555; padding-bottom: 2px; min-height: 18px; word-break: break-word; }
  .pagamento-checks { display: flex; gap: 20px; margin-bottom: 8px; flex-wrap: wrap; }
  .check-item { display: flex; align-items: center; gap: 4px; font-size: 12px; }
  .check-box { width: 12px; height: 12px; border: 1px solid #333; display: inline-block; line-height: 12px; text-align: center; font-size: 10px; }
  .itens-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .itens-table th, .itens-table td { border: 1px solid #aaa; padding: 5px 8px; font-size: 11px; }
  .itens-table th { background: #f0f0f0; font-weight: bold; }
  .itens-table td:last-child { text-align: right; }
  .total-line { text-align: right; font-weight: bold; font-size: 13px; margin-top: 8px; }
  .clausulas { margin-top: 16px; }
  .clausulas p { font-size: 10.5px; margin-bottom: 6px; text-align: justify; }
  .assinaturas { display: flex; justify-content: space-between; margin-top: 40px; }
  .assin { width: 45%; border-top: 1px solid #333; padding-top: 6px; text-align: center; font-size: 11px; }
  .page-break { page-break-before: always; }
  @media print { body { padding: 15px 20px; } .page-break { page-break-before: always; } }
</style>
</head>
<body>
<h1>Contrato de Prestação de Serviço</h1>
<h2>Locação de Móveis de Decoração</h2>

<div class="section-title">Dados do Contratante</div>
<div class="row">
  <div class="field"><label>Nome completo</label><div class="val">${cli.nome || ''}</div></div>
  <div class="field" style="max-width:200px"><label>CPF</label><div class="val">${cli.cpf || cpf.value || ''}</div></div>
</div>
<div class="row">
  <div class="field"><label>RG</label><div class="val"> </div></div>
  <div class="field"><label>Telefone</label><div class="val">${cli.telefone || ''}</div></div>
  <div class="field"><label>Data de Nascimento</label><div class="val">${cli.data_nascimento ? new Date(cli.data_nascimento).toLocaleDateString('pt-BR') : ''}</div></div>
</div>
<div class="row">
  <div class="field"><label>Endereço</label><div class="val">${[cli.logradouro, cli.numero, cli.bairro, cli.cidade, cli.uf].filter(Boolean).join(', ') || ''}</div></div>
</div>

<div class="section-title">Dados da Contratada</div>
<div class="row">
  <div class="field"><label>Nome</label><div class="val">ANDREY RONALD BARROS DA CONCEIÇÃO</div></div>
  <div class="field"><label>CPF/CNPJ</label><div class="val">56.918.133/0001-04</div></div>
</div>
<div class="row">
  <div class="field"><label>Endereço</label><div class="val">ALAMEDA COSME FERREIRA 6893 — ZUMBI DOS PALMARES, MANAUS-AM</div></div>
  <div class="field" style="max-width:200px"><label>Telefone</label><div class="val">(92) 98612-5736</div></div>
</div>

<div class="section-title">Forma de Pagamento</div>
<div class="pagamento-checks">
  ${['dinheiro','pix','débito','crédito','crediário'].map(f => {
    const ativo = vendaStore.pagamentos.some(p => p.forma.toLowerCase() === f);
    return `<div class="check-item"><span class="check-box">${ativo ? '✓' : ''}</span> ${f.charAt(0).toUpperCase()+f.slice(1)}</div>`;
  }).join('')}
</div>
<div class="row">
  <div class="field"><label>Valor total</label><div class="val"><strong>${fmt(vendaStore.total)}</strong></div></div>
  <div class="field"><label>Data da retirada</label><div class="val">${fmtDt(dtLocacao.value)}</div></div>
  <div class="field"><label>Data de devolução</label><div class="val">${fmtDt(dtDevolucao.value)}</div></div>
</div>

<div class="section-title">Acessórios Locados</div>
<table class="itens-table">
  <thead><tr><th>#</th><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Desc.</th><th>Total</th></tr></thead>
  <tbody>
    ${itens.map((it, i) => `<tr>
      <td>${i+1}</td>
      <td>${it.nome}</td>
      <td style="text-align:center">${it.qtd}</td>
      <td>${fmt(it.preco_unitario)}</td>
      <td style="text-align:center">${it.desconto_pct > 0 ? it.desconto_pct + '%' : '—'}</td>
      <td>${fmt(it.preco_total)}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="total-line">TOTAL: ${fmt(vendaStore.total)}</div>

<div class="clausulas page-break">
<div class="section-title">Cláusulas Contratuais</div>
<p>1. A locação terá a duração de 1 (um) dia útil, contados a partir da retirada e conforme negociação para devolução. A entrega deverá ser feita no dia informado no contrato, caso contrário será cobrado o mesmo valor da locação.</p>
<p>2. O pagamento total deverá ser efetuado no ato da locação. Optando pelo frete, este será cobrado de acordo com a localização da entrega e recolhimento (conforme tabela afixada no estabelecimento).</p>
<p>3. Em caso de extravio, danos, ou quebra de material, o contratante deverá repor a(s) peça(s) por substituição de peça nova de mesma especificação (inclusive cor e modelo), ou efetuar o pagamento em dinheiro ou cartão do valor correspondente à peça nova (incluindo frete).</p>
<p>4. No caso em que a peça faça parte de um conjunto, na indisponibilidade de reposição da unidade, fica obrigado o contratante a repor todo o conjunto.</p>
<p>5. O pagamento referente à reposição deverá ser realizado no momento da devolução, sob pena de multa correspondente a duas vezes o valor da peça.</p>
<p>6. A não devolução das peças locadas configurará apropriação indébita, sendo devida a aplicação das penalidades previstas em lei.</p>
<p>7. Em caso de devolução em estado de conservação diferente do entregue (peças sujas, arranhadas ou com pequenas avarias), a loja poderá cobrar até 20% do valor de reposição a título de despesas com manutenção.</p>
<p>8. Em caso de cancelamento com até 7 dias de antecedência: sem ônus. Após esse prazo: multa de 50% do valor total. Em até 24h da retirada: multa de 100% do valor total, sem devolução se já pago.</p>
<p>9. Todo material utilizado para transporte dos itens locados deverá ser devolvido juntamente com as peças, nas mesmas condições recebidas.</p>
<p>10. Fica eleito o foro da cidade de Manaus, Amazonas, como único competente para dirimir questões oriundas deste contrato.</p>
</div>

<p style="margin-top:20px; text-align:center">Manaus, ${dia} de ${mes} de ${ano}.</p>
<div class="assinaturas">
  <div class="assin">LOCADOR<br/>Andrey Ronald Barros da Conceição</div>
  <div class="assin">LOCATÁRIO(A)<br/>${cli.nome || '_______________________________'}</div>
</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow.addEventListener('afterprint', () => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    });
  };
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 10_000);
}

// ── NFC-e ─────────────────────────────────────────────────────
async function emitirNFCe() {
  if (!vendaPk.value) return;
  emitindo.value = true;
  resultNfce.value = null;
  try {
    const { data } = await apiClient.post('/api/nfce/emitir', {
      venda_pk: vendaPk.value,
      cpf_consumidor: cpf.value.replace(/\D/g, '') || null,
    });
    resultNfce.value = data;
  } catch (e) {
    resultNfce.value = { ok: false, erro: e.response?.data?.erro || 'Erro ao emitir NFC-e.' };
  } finally {
    emitindo.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

/* ── Base ─────────────────────────────────────────────────────── */
.pdv {
  --bg0:     #08090c;
  --bg1:     #0e1016;
  --bg2:     #141720;
  --bg3:     #1c2030;
  --line:    rgba(255,255,255,.07);
  --text:    #e8eaf2;
  --muted:   #6b7280;
  --accent:  #6366f1;
  --accent2: #818cf8;
  --green:   #10b981;
  --amber:   #f59e0b;
  --red:     #ef4444;
  --mono:    'IBM Plex Mono', monospace;
  --sans:    'Outfit', sans-serif;
  --radius:  10px;

  font-family: var(--sans);
  background: var(--bg0);
  color: var(--text);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* Ocupa todo o espaço disponível do content-area (padding já zerado via :has) */
  margin: 0;
  height: 100%;
  border-radius: 0;
}
/* Topo removido */
.pdv-top { display: none; }
.pdv-label, .pdv-filial, .op-chip { display: none; }

.canal-selector { display: flex; gap: 8px; margin-top: 5px; }
.canal-btn { flex: 1; padding: 10px; border: 1px solid var(--line); background: var(--bg2); color: var(--muted); border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.canal-btn:hover { background: var(--bg3); color: var(--text); }
.canal-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }

.caixa-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(255,255,255,.05);
  border: 1px solid var(--line);
}
.caixa-chip.ok   { color: var(--green); border-color: rgba(16,185,129,.2); }
.caixa-chip.closed { color: var(--red); border-color: rgba(239,68,68,.2); }
.chip-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.op-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}

/* ── Corpo ────────────────────────────────────────────────────── */
.pdv-body {
  display: grid;
  grid-template-columns: 1fr 560px;
  flex: 1;
  overflow: hidden;
  margin-bottom: 1rem;
}

/* ══ CATÁLOGO ═══════════════════════════════════════════════════ */
.catalog {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--line);
}

/* Controles */
.catalog-controls {
  padding: 14px 16px 10px;
  background: var(--bg1);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}
.btn-scan {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--bg3);
  color: var(--text2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.btn-scan:hover { background: rgba(99,102,241,.12); color: var(--primary); border-color: rgba(99,102,241,.4); }
.btn-scan .material-symbols-outlined { font-size: 20px; }
.search-ico {
  position: absolute;
  left: 11px;
  color: var(--muted);
  pointer-events: none;
  flex-shrink: 0;
}
.search-input {
  width: 100%;
  padding: 9px 36px;
  background: var(--bg3);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--text);
  font-family: var(--sans);
  font-size: 13.5px;
  outline: none;
  transition: border-color .15s;
}
.search-input::placeholder { color: var(--muted); }
.search-input:focus { border-color: rgba(99,102,241,.5); }
.qty-multiplier-badge {
  position: absolute;
  right: 32px;
  background: var(--amber);
  color: #000;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  pointer-events: none;
  line-height: 1.4;
}

.search-clear {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 2px;
}

.cat-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.cat-scroll::-webkit-scrollbar { display: none; }
.cat-pill {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--line);
  background: var(--bg3);
  color: var(--muted);
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.cat-pill:hover { color: var(--text); border-color: rgba(255,255,255,.15); }
.cat-pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* Products area */
.products-area {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.1) transparent;
}

.state-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 120px;
  font-size: 14px;
  color: var(--text);
}
.state-msg.muted { color: var(--muted); }

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
}

.prod-card {
  position: relative;
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0;
  cursor: pointer;
  transition: transform .1s, border-color .15s, box-shadow .15s;
  text-align: left;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.prod-card:hover {
  border-color: rgba(99,102,241,.4);
  box-shadow: 0 0 0 1px rgba(99,102,241,.15), 0 4px 16px rgba(0,0,0,.3);
  transform: translateY(-1px);
}
.prod-card:active { transform: scale(.97); }
.prod-card.no-stock { opacity: .45; }

.prod-img {
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.prod-img img { width: 100%; height: 100%; object-fit: cover; }
.prod-img-icon {
  font-family: var(--mono);
  font-size: 28px;
  font-weight: 600;
  color: var(--muted);
  opacity: .5;
}

.prod-info {
  padding: 8px 10px 4px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.prod-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.prod-code { font-size: 10px; color: var(--muted); font-family: var(--mono); }

.prod-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 8px;
}
.prod-price {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent2);
}
.prod-stock {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(16,185,129,.1);
  color: var(--green);
  border: 1px solid rgba(16,185,129,.2);
}
.prod-stock.low  { background: rgba(245,158,11,.1); color: var(--amber); border-color: rgba(245,158,11,.2); }
.prod-stock.zero { background: rgba(239,68,68,.1); color: var(--red);   border-color: rgba(239,68,68,.2); }

.prod-add-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 300;
  opacity: 0;
  transition: opacity .15s;
  line-height: 1;
}
.prod-card:hover .prod-add-badge { opacity: 1; }

.prod-price-wrap { display: flex; flex-direction: column; gap: 1px; }
.prod-price-original { font-size: 10px; color: var(--text2); text-decoration: line-through; font-family: var(--mono); }
.prod-price-promo { color: #ef4444 !important; }
.prod-promo-badge {
  position: absolute; top: 6px; right: 6px;
  background: #ef4444; color: #fff;
  font-size: 9px; font-weight: 800; letter-spacing: .6px;
  padding: 2px 6px; border-radius: 4px; line-height: 1.4;
}

/* ══ CARRINHO ════════════════════════════════════════════════════ */
.cart {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg1);
  overflow: hidden;
}

/* Tabs */
.cart-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 10px 0;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  background: var(--bg1);
}
.cart-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  background: none;
  color: var(--muted);
  font-family: var(--sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .15s, border-color .15s;
  white-space: nowrap;
}
.cart-tab:hover { color: var(--text); }
.cart-tab.active { color: var(--text); border-bottom-color: var(--accent); }
.tab-badge {
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  font-family: var(--mono);
  line-height: 1.4;
}
.tab-badge.ok { background: var(--green); }
.cart-clear-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color .15s;
}
.cart-clear-btn:hover { color: var(--red); }

/* Painéis das abas */
.tab-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

/* Total hero (aba pagamento) */
.total-hero {
  padding: 16px 16px 12px;
  background: linear-gradient(135deg, rgba(99,102,241,.12), rgba(99,102,241,.04));
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  text-align: center;
}
.total-hero-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin-bottom: 4px;
}
.total-hero-value {
  display: block;
  font-family: var(--mono);
  font-size: 38px;
  font-weight: 700;
  color: var(--accent2);
  line-height: 1;
}
.total-hero-disc {
  margin-top: 4px;
  font-size: 11px;
  color: var(--muted);
}

/* Scroll da aba pagamento */
.pag-scroll {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.08) transparent;
}

/* Resumo compacto (aba itens) */
.cart-summary {
  padding: 10px 14px;
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
}
.summary-row span:last-child { font-family: var(--mono); }
.summary-row.disc span { color: var(--amber); }
.summary-total {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  padding-top: 6px;
  border-top: 1px solid var(--line);
  margin-top: 2px;
}
.summary-total span:last-child { font-family: var(--mono); color: var(--accent2); }

/* Botão avançar */
.btn-avancar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s;
}
.btn-avancar:hover { opacity: .88; }

/* Items */
.cart-items {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.08) transparent;
}
.item-disc-badge {
  display: inline-block;
  padding: 1px 5px;
  background: rgba(245,158,11,.15);
  border: 1px solid rgba(245,158,11,.25);
  border-radius: 4px;
  color: var(--amber);
  font-size: 9px;
  font-weight: 700;
  margin-left: 3px;
}
.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  min-height: 80px;
  color: var(--muted);
  font-size: 12px;
}
.items-list { display: flex; flex-direction: column; }

.cart-item-wrap {
  border-bottom: 1px solid var(--line);
}
.cart-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  transition: background .1s;
  border-bottom: 1px solid var(--line);
}
.cart-item:hover { background: rgba(255,255,255,.02); }

.ci-row { display: flex; align-items: center; width: 100%; box-sizing: border-box; }
.ci-top { justify-content: space-between; gap: 10px; }
.ci-bottom { justify-content: space-between; gap: 8px; }

.item-name-wrap { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.item-name { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
.item-unit-price { font-size: 11.5px; color: var(--muted); font-family: var(--sans); }

.item-desc-btn {
  background: none; border: 1px solid var(--line); border-radius: 4px;
  color: var(--muted); cursor: pointer; font-size: 10px; font-weight: 700;
  line-height: 1; padding: 2px 5px; transition: all .15s;
}
.item-desc-btn:hover, .item-desc-btn.active { background: rgba(99,102,241,.15); border-color: var(--accent); color: var(--accent2); }

.item-desc-inline {
  display: flex; align-items: center; gap: 6px;
}
.desc-type-toggle.compact .desc-type-btn { padding: 4px 8px; font-size: 11px; height: 26px; }
.item-desc-input { width: 66px !important; padding: 4px 6px !important; height: 26px !important; font-size: 12px !important; }
.desc-confirm-btn { background: var(--green); color: #fff; border: none; border-radius: 4px; padding: 0; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; font-weight: bold; transition: all .15s; flex-shrink: 0; }
.desc-confirm-btn:hover { opacity: .8; }

.item-controls { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 3px; border: 1px solid var(--line); flex-shrink: 0; }
.qty-btn {
  width: 24px; height: 24px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .1s;
}
.qty-btn:hover:not(:disabled) { background: rgba(255,255,255,.1); }
.qty-btn:disabled { opacity: .3; cursor: not-allowed; }
.qty-val { font-family: var(--mono); font-size: 13px; font-weight: 600; min-width: 24px; text-align: center; }

.item-total { font-family: var(--mono); font-size: 14.5px; font-weight: 700; color: var(--accent2); margin-left: auto; text-align: right; }
.item-del { 
  background: rgba(239, 68, 68, 0.1); 
  border: 1px solid rgba(239, 68, 68, 0.2); 
  border-radius: 6px; 
  color: #ef4444; 
  cursor: pointer; 
  width: 28px; 
  height: 28px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  transition: all .15s; 
  flex-shrink: 0;
}
.item-del:hover { background: #ef4444; color: #fff; }

/* Transitions */
.item-enter-active { transition: all .2s ease; }
.item-leave-active { transition: all .15s ease; }
.item-enter-from  { opacity: 0; transform: translateX(8px); }
.item-leave-to    { opacity: 0; transform: translateX(-8px); }

/* Seções */
.cart-section {
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.cart-section.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.section-label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin-bottom: 5px; }
.opt { font-weight: 400; text-transform: none; letter-spacing: 0; }

.cart-input {
  width: 100%;
  padding: 7px 10px;
  background: var(--bg3);
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--text);
  font-family: var(--sans);
  font-size: 13px;
  outline: none;
  transition: border-color .15s;
  box-sizing: border-box;
}
.cart-input:focus { border-color: rgba(99,102,241,.4); }
.cart-input.sm { font-size: 12px; }
.cart-input.pag-val { width: 80px; flex-shrink: 0; }
.cart-input.flex1 { flex: 1; width: auto; }
.cart-select {
  width: 100%;
  padding: 7px 10px;
  background: var(--bg3);
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--text);
  font-family: var(--sans);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  box-sizing: border-box;
}
.cart-select.flex1 { flex: 1; }

/* Totais */
.cart-totals {
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
.total-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--muted); }
.total-row span:last-child { font-family: var(--mono); font-weight: 500; }
.total-row.discount span { color: var(--amber); }
.total-row.grand {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.total-row.grand span:last-child { color: var(--accent2); font-size: 16px; }

/* Pagamento */
.pag-row { display: flex; gap: 6px; align-items: center; }
.pag-add {
  width: 34px; height: 34px;
  background: var(--accent);
  border: none;
  border-radius: 7px;
  color: #fff;
  font-size: 20px;
  font-weight: 300;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: opacity .15s;
}
.pag-add:hover { opacity: .85; }

.pag-list { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.pag-item { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: var(--bg3); border-radius: 6px; border: 1px solid var(--line); }
.pag-forma { flex: 1; font-size: 12px; font-weight: 500; text-transform: capitalize; color: var(--text); }
.pag-valor { font-family: var(--mono); font-size: 12px; color: var(--accent2); }
.pag-del { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; }
.pag-del:hover { color: var(--red); }

.pag-status { margin-top: 8px; font-size: 12px; color: var(--muted); display: flex; gap: 10px; }
.crediario-fields { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.crediario-row { display: flex; gap: 12px; }
.crediario-warn { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #f59e0b; background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.25); border-radius: 7px; padding: 5px 10px; }
.crediario-warn .material-symbols-outlined { font-size: 15px; }
.crediario-warn.inadimpl { color: #ef4444; background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.25); }
.pag-status strong { font-family: var(--mono); color: var(--text); }
.falta { color: var(--red); font-weight: 600; }
.troco { color: var(--green); font-weight: 600; }

/* Ações */
.cart-actions {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  border-top: 1px solid var(--line);
  margin-top: auto;
}

.btn-finalizar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  background: var(--green);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
  letter-spacing: .3px;
}
.btn-finalizar:hover:not(:disabled) { opacity: .88; }
.btn-finalizar:active:not(:disabled) { transform: scale(.98); }
.btn-finalizar:disabled { opacity: .35; cursor: not-allowed; }

.btn-recibo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px;
  background: var(--bg3);
  color: var(--green);
  border: 1px solid rgba(16,185,129,.35);
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
  touch-action: manipulation;
}
.btn-recibo:hover { background: rgba(16,185,129,.1); border-color: var(--green); }

.btn-contrato {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px;
  background: var(--bg3);
  color: var(--amber);
  border: 1px solid rgba(245,158,11,.35);
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
  touch-action: manipulation;
}
.btn-contrato:hover { background: rgba(245,158,11,.1); border-color: var(--amber); }

.btn-nfce {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px;
  background: var(--bg3);
  color: var(--accent2);
  border: 1px solid rgba(99,102,241,.35);
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.btn-nfce:hover:not(:disabled) { background: rgba(99,102,241,.1); border-color: var(--accent); }
.btn-nfce:disabled { opacity: .4; cursor: not-allowed; }

.btn-nova-venda {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: var(--primary); color: #fff; border: none;
  border-radius: 10px; padding: 0 14px; height: 44px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: opacity .15s; width: 100%;
  touch-action: manipulation;
}
.btn-nova-venda:hover { opacity: .85; }
.btn-nova-venda:active { opacity: .7; }

.nfce-result {
  padding: 8px 10px; border-radius: 8px; font-size: 12px;
  border: 1px solid; word-break: break-all;
}
.nfce-result.ok { color: var(--green); border-color: rgba(16,185,129,.3); background: rgba(16,185,129,.08); }
.nfce-result.err { color: var(--red); border-color: rgba(239,68,68,.3); background: rgba(239,68,68,.08); }

/* Cliente */
.cliente-section { position: relative; }
.cliente-search-wrap { position: relative; display: flex; align-items: center; }
.cliente-search-wrap .search-ico { position: absolute; left: 10px; color: var(--muted); pointer-events: none; }
.cliente-input { padding-left: 30px !important; }
.spin-xs { position: absolute; right: 10px; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.15); border-top-color: var(--accent2); border-radius: 50%; animation: spin .7s linear infinite; }

.cliente-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; background: rgba(99,102,241,.1);
  border: 1px solid rgba(99,102,241,.25); border-radius: 8px;
}
.cliente-chip-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cliente-chip-nome { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cliente-chip-sub  { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.cliente-chip-del  { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 18px; line-height: 1; padding: 0 2px; flex-shrink: 0; transition: color .1s; }
.cliente-chip-del:hover { color: var(--red); }

.badge-dec { padding: 1px 6px; background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.25); border-radius: 4px; color: var(--amber); font-size: 10px; font-weight: 600; }

.cliente-drop {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  background: var(--bg2); border: 1px solid var(--line);
  border-radius: 8px; margin-top: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
  max-height: 220px; overflow-y: auto;
}
.cliente-drop-item {
  display: flex; flex-direction: column; gap: 2px;
  width: 100%; padding: 9px 12px; background: none; border: none;
  border-bottom: 1px solid var(--line); text-align: left; cursor: pointer;
  transition: background .1s;
}
.cliente-drop-item:last-child { border-bottom: none; }
.cliente-drop-item:hover { background: rgba(255,255,255,.04); }
.drop-nome { font-size: 13px; font-weight: 500; color: var(--text); }
.drop-sub  { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
.drop-empty { display: block; padding: 12px; text-align: center; font-size: 12px; color: var(--muted); }

/* Desconto */
.desc-row { display: flex; align-items: center; gap: 6px; }
.desc-type-toggle { display: flex; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; flex-shrink: 0; }
.desc-type-btn {
  padding: 6px 11px; background: var(--bg3); border: none;
  color: var(--muted); font-family: var(--mono); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.desc-type-btn.active { background: var(--accent); color: #fff; }
.desc-preview { font-family: var(--mono); font-size: 11px; color: var(--amber); white-space: nowrap; flex-shrink: 0; }

/* Decorador */
.decorador-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.decorador-row:first-of-type { margin-top: 4px; }
.decorador-nome { flex: 1; font-size: 12px; font-weight: 500; color: var(--text); }
.dec-pct { width: 60px !important; flex: none !important; text-align: center; }
.decorador-pct-label {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--amber);
  padding: 4px 10px;
  background: rgba(245,158,11,.1);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: 6px;
  flex-shrink: 0;
}
.btn-apply-dec {
  padding: 6px 12px; background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.3);
  border-radius: 7px; color: var(--amber); font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: background .15s;
}
.btn-apply-dec:hover { background: rgba(245,158,11,.25); }

/* NFC-e result */
.nfce-result {
  margin: 0 14px 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  flex-shrink: 0;
}
.nfce-result.ok  { background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.2); color: #6ee7b7; }
.nfce-result.err { background: rgba(239,68,68,.1);  border: 1px solid rgba(239,68,68,.2);  color: #fca5a5; }
.mono { font-family: var(--mono); font-size: 10px; word-break: break-all; }

/* Spinner */
.spin {
  display: inline-block;
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.2);
  border-top-color: var(--accent2);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
.spin-sm {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Botão Orçamento */
.btn-orcamento {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px;
  background: transparent;
  color: var(--accent2);
  border: 1px solid rgba(99,102,241,.3);
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
}
.btn-orcamento:hover { background: rgba(99,102,241,.1); border-color: var(--accent); }
.btn-orcamento.copiado { color: var(--green); border-color: rgba(16,185,129,.4); background: rgba(16,185,129,.08); }

/* ── Toast ──────────────────────────────────────────────────── */
.pdv-toast {
  position: fixed;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 10px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
  white-space: nowrap;
  pointer-events: none;
}
.pdv-toast.ok  { background: #052e16; color: #6ee7b7; border: 1px solid rgba(16,185,129,.3); }
.pdv-toast.err { background: #1f0707; color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }

.toast-enter-active { transition: all .25s ease; }
.toast-leave-active { transition: all .3s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(12px); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(12px); }

/* Mobile */
@media (max-width: 900px) {
  /* Remove estilos antigos de cart mobile que travavam a altura */
  .cart { border-top: none; max-height: none; }
}

/* Vendedor */
.vendedor-section { border-top: 2px solid var(--accent); background: rgba(99,102,241,.04); }
.vendedor-select  { font-weight: 600; }
.obrig            { color: var(--red); }
.vendedor-aviso   { font-size: 11px; color: var(--amber); margin-top: 4px; display: block; }

/* ── Light mode ───────────────────────────────────────────────── */
[data-theme="light"] .pdv {
  --bg0:    #e8eaf2;
  --bg1:    #f0f1f8;
  --bg2:    #ffffff;
  --bg3:    #dde0ed;
  --line:   rgba(0,0,0,.15);
  --text:   #0f172a;
  --muted:  #374151;
  --accent: #4338ca;
  --accent2:#4f46e5;
  --green:  #059669;
  --amber:  #b45309;
  --red:    #dc2626;
}
/* Topo */
[data-theme="light"] .pdv-top        { background: #fff; border-bottom-color: rgba(0,0,0,.15); }
[data-theme="light"] .pdv-label      { color: #4338ca; border-color: rgba(67,56,202,.35); }
[data-theme="light"] .pdv-filial     { color: #0f172a; }
[data-theme="light"] .op-chip        { color: #374151; }
/* Catálogo */
[data-theme="light"] .catalog        { border-right-color: rgba(0,0,0,.15); }
[data-theme="light"] .catalog-controls { background: #fff; border-bottom-color: rgba(0,0,0,.15); }
[data-theme="light"] .search-input   { background: #fff; border-color: rgba(0,0,0,.2); color: #0f172a; }
[data-theme="light"] .search-input:focus { border-color: #4338ca; }
[data-theme="light"] .search-input::placeholder { color: #6b7280; }
[data-theme="light"] .cat-pill       { background: #fff; border-color: rgba(0,0,0,.18); color: #374151; }
[data-theme="light"] .cat-pill:hover { color: #0f172a; border-color: rgba(0,0,0,.3); }
[data-theme="light"] .cat-pill.active { background: #4338ca; border-color: #4338ca; color: #fff; }
/* Produtos */
[data-theme="light"] .prod-card      { background: #fff; border-color: rgba(0,0,0,.14); }
[data-theme="light"] .prod-card:hover { border-color: rgba(67,56,202,.5); box-shadow: 0 0 0 1px rgba(67,56,202,.2), 0 4px 14px rgba(0,0,0,.1); }
[data-theme="light"] .prod-img       { background: #f0f1f8; }
[data-theme="light"] .prod-img-icon  { color: #374151; }
[data-theme="light"] .prod-name      { color: #0f172a; }
[data-theme="light"] .prod-code      { color: #6b7280; }
[data-theme="light"] .prod-price     { color: #4338ca; }
[data-theme="light"] .prod-stock     { background: rgba(5,150,105,.1); color: #065f46; border-color: rgba(5,150,105,.3); }
[data-theme="light"] .prod-stock.low { background: rgba(180,83,9,.1); color: #92400e; border-color: rgba(180,83,9,.25); }
[data-theme="light"] .prod-stock.zero { background: rgba(220,38,38,.1); color: #991b1b; border-color: rgba(220,38,38,.25); }
/* Carrinho */
[data-theme="light"] .cart           { background: #f5f6fc; }
[data-theme="light"] .cart-tabs      { background: #fff; border-bottom-color: rgba(0,0,0,.15); }
[data-theme="light"] .cart-tab       { color: #6b7280; }
[data-theme="light"] .cart-tab:hover { color: #0f172a; }
[data-theme="light"] .cart-tab.active { color: #0f172a; border-bottom-color: #4338ca; }
[data-theme="light"] .cart-item      { border-bottom-color: rgba(0,0,0,.1); }
[data-theme="light"] .cart-item:hover { background: rgba(67,56,202,.04); }
[data-theme="light"] .item-name      { color: #0f172a; }
[data-theme="light"] .item-unit-price { color: #4b5563; }
[data-theme="light"] .item-total     { color: #4338ca; }
[data-theme="light"] .qty-val        { color: #0f172a; }
[data-theme="light"] .qty-btn        { color: #0f172a; }
[data-theme="light"] .qty-btn:hover:not(:disabled) { background: rgba(0,0,0,.07); }
[data-theme="light"] .section-label  { color: #374151; }
[data-theme="light"] .cart-input     { background: #fff; border-color: rgba(0,0,0,.2); color: #0f172a; }
[data-theme="light"] .cart-input:focus { border-color: #4338ca; }
[data-theme="light"] .cart-select    { background: #fff; border-color: rgba(0,0,0,.2); color: #0f172a; }
[data-theme="light"] .summary-row    { color: #374151; }
[data-theme="light"] .summary-total  { color: #0f172a; }
[data-theme="light"] .summary-total span:last-child { color: #4338ca; }
[data-theme="light"] .total-hero     { background: linear-gradient(135deg, rgba(67,56,202,.1), rgba(67,56,202,.04)); }
[data-theme="light"] .total-hero-value { color: #4338ca; }
[data-theme="light"] .total-hero-disc { color: #4b5563; }
[data-theme="light"] .pag-forma      { color: #0f172a; }
[data-theme="light"] .pag-valor      { color: #4338ca; }
[data-theme="light"] .pag-status     { color: #4b5563; }
[data-theme="light"] .pag-status strong { color: #0f172a; }
[data-theme="light"] .pag-item       { background: #fff; border-color: rgba(0,0,0,.15); }
[data-theme="light"] .desc-type-btn  { background: #fff; color: #374151; }
[data-theme="light"] .desc-type-btn.active { background: #4338ca; color: #fff; }
[data-theme="light"] .desc-type-toggle { border-color: rgba(0,0,0,.18); }
[data-theme="light"] .cliente-chip   { background: rgba(67,56,202,.08); border-color: rgba(67,56,202,.3); }
[data-theme="light"] .cliente-chip-nome { color: #0f172a; }
[data-theme="light"] .cliente-drop   { background: #fff; border-color: rgba(0,0,0,.15); box-shadow: 0 8px 24px rgba(0,0,0,.14); }
[data-theme="light"] .cliente-drop-item:hover { background: rgba(67,56,202,.05); }
[data-theme="light"] .drop-nome      { color: #0f172a; }
[data-theme="light"] .drop-sub       { color: #6b7280; }
[data-theme="light"] .vendedor-section { background: rgba(67,56,202,.06); border-top-color: #4338ca; }
[data-theme="light"] .item-disc-badge { background: rgba(180,83,9,.1); border-color: rgba(180,83,9,.25); color: #92400e; }
[data-theme="light"] .nfce-result.ok  { background: rgba(5,150,105,.08); border-color: rgba(5,150,105,.25); color: #065f46; }
[data-theme="light"] .nfce-result.err { background: rgba(220,38,38,.08); border-color: rgba(220,38,38,.25); color: #991b1b; }
[data-theme="light"] .pdv-toast.ok   { background: #ecfdf5; color: #065f46; border-color: rgba(5,150,105,.3); }
[data-theme="light"] .pdv-toast.err  { background: #fef2f2; color: #991b1b; border-color: rgba(220,38,38,.3); }
[data-theme="light"] .products-area  { scrollbar-color: rgba(0,0,0,.15) transparent; }
[data-theme="light"] .pag-scroll,
[data-theme="light"] .cart-items     { scrollbar-color: rgba(0,0,0,.12) transparent; }
[data-theme="light"] .spin           { border-color: rgba(0,0,0,.15); border-top-color: #4338ca; }
[data-theme="light"] .spin-xs        { border-color: rgba(0,0,0,.15); }

/* Novos estilos para Mobile View */
.pdv-back-btn {
  background: none; border: none; color: var(--text);
  padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  margin-right: 4px;
}

.fab-cart {
  position: fixed; bottom: 24px; right: 24px;
  width: 60px; height: 60px; border-radius: 50%;
  background: var(--accent); color: #fff;
  border: none; cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,.3);
  display: none; flex-direction: column; align-items: center; justify-content: center;
  z-index: 100; transition: transform .2s;
}
.fab-cart:active { transform: scale(.9); }
.fab-badge {
  position: absolute; top: 8px; right: 8px;
  background: var(--red); color: #fff;
  font-family: var(--mono); font-size: 10px; font-weight: 700;
  padding: 1px 5px; border-radius: 10px; min-width: 14px;
}
.fab-total { font-size: 10px; font-weight: 700; margin-top: -2px; }

@media (max-width: 900px) {
  .mobile-hidden { display: none !important; }
  .fab-cart { display: flex; }
  .pdv-body { grid-template-columns: 1fr; height: 100%; }
  .cart { width: 100%; border-left: none; border-top: none; max-height: none; flex: 1; }
  .catalog { border-right: none; height: 100%; }

  /* Compactação extrema solicitada pelo usuário */
  .vendedor-section { 
    padding: 10px 12px; 
    display: flex; 
    align-items: center; 
    gap: 10px;
    background: rgba(99,102,241,0.06); 
  }
  .vendedor-section .section-label { margin-bottom: 0; white-space: nowrap; }
  .vendedor-select { padding: 4px 8px; font-size: 13px; height: 32px; }
  .vendedor-aviso { position: absolute; bottom: 100%; right: 14px; background: var(--bg2); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--amber); }

  .cart-actions { padding: 8px 12px; gap: 4px; }
  .btn-finalizar { padding: 10px; font-size: 13.5px; height: 44px; }
  .btn-recibo, .btn-contrato, .btn-nfce { padding: 7px; font-size: 12px; height: 36px; }

  .total-hero { padding: 8px 14px 4px; }
  .total-hero-value { font-size: 30px; }
  .total-hero-label { font-size: 9px; margin-bottom: 0; }

  .cart-back-mobile {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; background: var(--bg2); border: none;
    border-bottom: 1px solid var(--line); color: var(--accent2);
    font-size: 13px; font-weight: 600; cursor: pointer;
  }

  .cart-items { max-height: none; }

  .btn-nova-venda { height: 48px; font-size: 14px; }
  .btn-recibo, .btn-contrato, .btn-nfce { height: 44px; font-size: 13px; }
}

/* Caixa Fechado Overlay */
.caixa-closed-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(8, 9, 12, 0.85);
  backdrop-filter: blur(8px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}
.cc-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 320px;
}
.cc-icon { font-size: 64px !important; color: var(--red); opacity: 0.8; }
.cc-content h3 { font-size: 1.5rem; margin: 0; color: var(--text); }
.cc-content p { font-size: 0.95rem; color: var(--muted); line-height: 1.5; }
.btn-go-caixa {
  margin-top: 1rem;
  padding: 0.85rem 2rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-go-caixa:hover { transform: translateY(-3px); }

[data-theme="light"] .caixa-closed-overlay { background: rgba(232, 234, 242, 0.85); }

/* ── Scanner ─────────────────────────────────── */
.scanner-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.92);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.scanner-box {
  width: 100%; max-width: 420px;
  display: flex; flex-direction: column; gap: .75rem;
}
.scanner-header {
  display: flex; align-items: center; gap: .5rem;
  color: #fff;
}
.scanner-icon { font-size: 22px; color: #6366f1; }
.scanner-title { flex: 1; font-size: .95rem; font-weight: 700; }
.scanner-close {
  width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.scanner-close:hover { background: rgba(255,255,255,.18); }
.scanner-close .material-symbols-outlined { font-size: 18px; }

.scanner-viewport {
  position: relative;
  width: 100%; aspect-ratio: 1;
  border-radius: 16px; overflow: hidden;
  background: #000;
}
.scanner-video {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}

/* Cantos do viewfinder */
.scanner-frame { position: absolute; inset: 0; }
.sf-corner {
  position: absolute; width: 28px; height: 28px;
  border-color: #6366f1; border-style: solid;
}
.sf-corner.tl { top: 16px;    left: 16px;    border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.sf-corner.tr { top: 16px;    right: 16px;   border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.sf-corner.bl { bottom: 16px; left: 16px;    border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.sf-corner.br { bottom: 16px; right: 16px;   border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

/* Linha animada */
.scanner-line {
  position: absolute; left: 16px; right: 16px; height: 2px;
  background: linear-gradient(90deg, transparent, #6366f1, transparent);
  animation: scanLine 2s ease-in-out infinite;
  box-shadow: 0 0 8px #6366f1;
}
@keyframes scanLine {
  0%   { top: 20%; }
  50%  { top: 78%; }
  100% { top: 20%; }
}

.scanner-status { text-align: center; font-size: .85rem; font-weight: 700; padding: .5rem; border-radius: 8px; }
.scanner-status.err { background: rgba(239,68,68,.2); color: #fca5a5; }
.scanner-status.ok  { background: rgba(16,185,129,.2); color: #6ee7b7; }

/* ── Aba 1: Detalhes da Venda ─────────────────────────────── */
.det-total-hero {
  padding: 16px 16px 12px;
  background: linear-gradient(135deg, rgba(99,102,241,.14), rgba(99,102,241,.05));
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  text-align: center;
}
.det-hero-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.det-hero-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
}
.det-hero-value {
  font-family: var(--mono);
  font-size: 32px;
  font-weight: 700;
  color: var(--accent2);
  line-height: 1;
}
.det-hero-disc {
  margin-top: 5px;
  font-size: 11px;
  color: var(--muted);
}

.det-items-list {
  max-height: 160px;
  overflow-y: auto;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.07) transparent;
}
.det-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--line);
}
.det-item-row:last-child { border-bottom: none; }
.det-item-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.det-item-nome {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.det-item-sub {
  font-size: 11px;
  color: var(--muted);
  font-family: var(--sans);
}
.det-item-desc {
  margin-left: 4px;
  padding: 0 4px;
  background: rgba(245,158,11,.15);
  border-radius: 3px;
  color: var(--amber);
  font-size: 10px;
  font-weight: 700;
}
.det-item-total {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--accent2);
  flex-shrink: 0;
}

/* ── Aba 2: Cartão de status pagamento ──────────────────────── */
.pag-status-card {
  margin: 12px 14px;
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  flex-shrink: 0;
}
.psc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  border-bottom: 1px solid var(--line);
}
.psc-row:last-child { border-bottom: none; }
.psc-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
.psc-val {
  font-family: var(--mono);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.psc-pago .psc-val,
.psc-row .psc-val.psc-pago { color: var(--green); }
.psc-falta .psc-label,
.psc-falta .psc-val { color: var(--red); }
.psc-falta { background: rgba(239,68,68,.06); }
.psc-troco .psc-label,
.psc-troco .psc-val { color: var(--green); }
.psc-troco { background: rgba(16,185,129,.06); }
.psc-ok {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  color: var(--green);
  font-size: 12px;
  font-weight: 700;
  background: rgba(16,185,129,.08);
  border-top: 1px solid rgba(16,185,129,.15);
}

/* Light mode — novos elementos */
[data-theme="light"] .det-total-hero { background: linear-gradient(135deg, rgba(67,56,202,.1), rgba(67,56,202,.04)); }
[data-theme="light"] .det-hero-value { color: #4338ca; }
[data-theme="light"] .det-hero-disc  { color: #4b5563; }
[data-theme="light"] .det-item-nome  { color: #0f172a; }
[data-theme="light"] .det-item-sub   { color: #6b7280; }
[data-theme="light"] .det-item-total { color: #4338ca; }
[data-theme="light"] .det-items-list { scrollbar-color: rgba(0,0,0,.1) transparent; }
[data-theme="light"] .pag-status-card { background: #fff; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .psc-row        { border-bottom-color: rgba(0,0,0,.08); }
[data-theme="light"] .psc-label      { color: #374151; }
[data-theme="light"] .psc-val        { color: #0f172a; }

.btn-recibo-pos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: var(--green);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}
.btn-recibo-pos:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
}
.btn-recibo-pos .material-symbols-outlined { font-size: 20px; }

.btn-contrato-pos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}
.btn-contrato-pos:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
}
.btn-contrato-pos .material-symbols-outlined { font-size: 20px; }

.btn-limpar-pos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  background: var(--bg2);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.8;
}
.btn-limpar-pos:hover {
  opacity: 1;
  background: var(--bg3);
  border-color: var(--text2);
}
.btn-limpar-pos .material-symbols-outlined { font-size: 20px; color: var(--red); }

/* Mobile — ajustes das novas abas */
@media (max-width: 900px) {
  .btn-recibo-pos, .btn-limpar-pos {
    padding: 16px;
    font-size: 16px;
  }
}

@media (max-width: 900px) {
  .det-total-hero  { padding: 12px 14px 8px; }
  .det-hero-value  { font-size: 26px; }
  .det-items-list  { max-height: 130px; }
  .pag-status-card { margin: 8px 12px; }
}
</style>

<style>
/* Esconde o menu inferior global no PDV */
#bottom-nav { display: none !important; }
</style>

