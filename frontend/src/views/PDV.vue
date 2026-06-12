<template>
  <div class="pdv" :class="{ 'pdv-modal-open': modalNovoCliente }">

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
              <input v-model="busca" type="text" placeholder="Buscar… ou 4* para adicionar 4 un." class="search-input" @input="filtrarProdutos" @keydown.esc="busca = ''" @keydown.enter="adicionarPorBarras" />
              <span v-if="qtdMultiplicador > 1" class="qty-multiplier-badge">× {{ qtdMultiplicador }}</span>
              <button v-if="busca" class="search-clear" @click="busca = ''">×</button>
            </div>
            <button class="btn-scan" @click="abrirScanner" title="Ler código de barras">
              <span class="material-symbols-outlined">barcode_scanner</span>
            </button>
            <button class="btn-scan btn-refresh-prod" @click="recarregarProdutos" :class="{ 'refreshing': recarregandoProd }" title="Atualizar lista de produtos">
              <span class="material-symbols-outlined">refresh</span>
            </button>
          </div>

          <div class="cat-scroll">
            <button
              v-for="cat in [{pk: null, nome: 'Todos'},...categorias]"
              :key="String(cat.pk)"
              :class="['cat-pill', { active: catSel === cat.pk }]"
              @click="catSel = cat.pk; somentePromo = false"
            >{{ cat.nome }}</button>
            <button :class="['cat-pill', 'cat-pill-promo', { active: somentePromo }]" @click="somentePromo = !somentePromo; catSel = null">🏷️ Promoção</button>
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

          <div v-if="carregando" class="loading-state">
            <div class="loading-rings">
              <span class="loading-ring r1"></span>
              <span class="loading-ring r2"></span>
              <span class="loading-ring r3"></span>
            </div>
            <span class="loading-label">Carregando produtos…</span>
          </div>
          <div v-else-if="!filtrados.length" class="state-msg muted">
            Nenhum produto encontrado
          </div>
          <div v-else class="products-list">
            <button
              v-for="p in filtrados"
              :key="p.pk"
              class="prod-card"
              :class="{ 'no-stock': p.saldo !== null && p.saldo <= 0 }"
              @click="add(p)"
            >
              <div class="prod-avatar">
                <div v-if="p.foto_url" class="prod-avatar-foto-wrap" @click.stop="fotoExpandida = p.foto_url">
                  <img :src="p.foto_url" :alt="p.descricao" loading="lazy" class="prod-avatar-foto" />
                  <div class="prod-avatar-zoom">
                    <span class="material-symbols-outlined">zoom_in</span>
                  </div>
                </div>
                <span v-else>{{ (p.descricao||'?')[0].toUpperCase() }}</span>
              </div>
              <div class="prod-info">
                <span class="prod-name">{{ p.descricao }}</span>
                <div class="prod-meta">
                  <span v-if="categoriasMap[p.categoria_pk]" class="prod-cat">{{ categoriasMap[p.categoria_pk] }}</span>
                  <span v-if="p.codigo_barras" class="prod-barras">{{ p.codigo_barras }}</span>
                  <span v-else-if="p.codigo" class="prod-barras">{{ p.codigo }}</span>
                </div>
              </div>
              <div class="prod-right">
                <div class="prod-price-wrap">
                  <span v-if="getPromoAtiva(p)" class="prod-price-original">{{ fmt(p.valor_venda) }}</span>
                  <span :class="['prod-price', { 'prod-price-promo': getPromoAtiva(p) }]">{{ fmt(getPrecoEfetivo(p)) }}</span>
                </div>
                <span :class="['prod-stock', p.saldo <= 0 ? 'zero' : p.saldo <= 5 ? 'low' : '']">
                  {{ p.saldo !== null ? p.saldo : '∞' }}
                </span>
                <div v-if="getPromoAtiva(p)" class="prod-promo-badge">PROMO</div>
              </div>
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
          <button :class="['cart-tab', { active: cartTab === 0 }]" @click="cartTab = 0" :disabled="vendaFinalizada">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Itens
            <span v-if="vendaStore.itens.length" class="tab-badge">{{ vendaStore.itens.reduce((s,i) => s + parseFloat(i.qtd||1), 0) }}</span>
          </button>
          <button :class="['cart-tab', { active: cartTab === 1 }]" @click="cartTab = 1" :disabled="!vendaStore.itens.length || vendaFinalizada">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Detalhes
          </button>
          <button :class="['cart-tab', { active: cartTab === 2 }]" @click="cartTab = 2" :disabled="!vendaStore.itens.length || vendaFinalizada">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Pagamento
            <span v-if="parseFloat(vendaStore.faltaPagar) <= 0.009 && vendaStore.pagamentos.length" class="tab-badge ok">✓</span>
          </button>
          <button :class="['cart-tab', 'tab-impressao', { active: cartTab === 3 }]" @click="cartTab = 3" :disabled="!vendaFinalizada">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Impressão
            <span v-if="vendaFinalizada" class="tab-badge ok">✓</span>
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
                    <input
                      type="number"
                      class="qty-input"
                      :value="it.qtd"
                      min="1"
                      :max="!permitirEstoqueNegativo && it.saldo !== null ? it.saldo : undefined"
                      @change="setQtdItem(i, $event.target.value, it)"
                      @focus="$event.target.select()"
                    />
                    <button class="qty-btn" @click="incrementarItem(i, it)" :disabled="!permitirEstoqueNegativo && it.saldo !== null && it.qtd >= it.saldo">+</button>
                  </div>
                  <div class="item-desc-inline">
                    <!-- Toggle % / R$ sempre visível -->
                    <div class="desc-type-toggle compact">
                      <button :class="['desc-type-btn', { active: itemDescAberto === i && itemDescTipo === 'pct' }]" @click="toggleDescItem(i, 'pct')">%</button>
                      <button :class="['desc-type-btn', { active: itemDescAberto === i && itemDescTipo === 'brl' }]" @click="toggleDescItem(i, 'brl')">R$</button>
                    </div>

                    <!-- Input aberto -->
                    <template v-if="itemDescAberto === i">
                      <input
                        v-if="itemDescTipo === 'pct'"
                        v-model.number="itemDescVal"
                        type="number" inputmode="numeric" min="0" max="100" step="1"
                        placeholder="0"
                        class="cart-input item-desc-input"
                        @keydown.enter.prevent="aplicarDescontoItem(i)"
                      />
                      <input
                        v-else
                        :value="itemDescBrlDisplay"
                        @input="onItemDescBrlInput"
                        type="text" inputmode="numeric"
                        placeholder="0,00"
                        class="cart-input item-desc-input"
                        @keydown.enter.prevent="aplicarDescontoItem(i)"
                      />
                      <button class="desc-confirm-btn" @click.stop.prevent="aplicarDescontoItem(i)">✓</button>
                      <button class="desc-cancel-btn" @click.stop="itemDescAberto = null">×</button>
                    </template>

                    <!-- Badge quando fechado com desconto -->
                    <div v-else-if="it.desconto_pct > 0" class="disc-badge">
                      <button class="disc-badge-btn" @click="toggleDescItem(i, 'pct')">
                        −{{ it.desconto_pct % 1 === 0 ? it.desconto_pct : it.desconto_pct.toFixed(1) }}%
                      </button>
                      <button class="disc-badge-remove" @click.stop="vendaStore.atualizarDescontoItem(i, 0, 'pct')" title="Remover desconto">×</button>
                    </div>
                  </div>
                  <span class="item-total">{{ fmt(it.preco_total) }}</span>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <template v-if="vendaStore.itens.length">

            <div class="cart-summary">
              <div class="summary-row">
                <span>{{ vendaStore.itens.reduce((s,i) => s + parseFloat(i.qtd||1), 0) }} {{ vendaStore.itens.reduce((s,i) => s + parseFloat(i.qtd||1), 0) === 1 ? 'item' : 'itens' }}</span>
                <span>{{ fmt(vendaStore.subtotal) }}</span>
              </div>
              <div v-if="parseFloat(vendaStore.desconto) > 0" class="summary-row disc">
                <span>Desconto</span><span>− {{ fmt(vendaStore.desconto) }}</span>
              </div>
              <div v-if="parseFloat(vendaStore.acrescimo) > 0" class="summary-row acrescimo">
                <span>Acréscimo</span><span>+ {{ fmt(vendaStore.acrescimo) }}</span>
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
                <kbd class="hotkey-badge">F1</kbd>
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
              <div v-if="clienteSel && clienteStats" class="cliente-stats">
                <span class="cs-item" :class="clienteStats.contasAberto > 0 ? 'cs-danger' : 'cs-ok'">
                  <span class="cs-val">{{ fmt(clienteStats.contasAberto) }}</span>
                  <span class="cs-label">Em aberto</span>
                </span>
                <span class="cs-sep">·</span>
                <span class="cs-item">
                  <span class="cs-val">{{ fmt(clienteStats.ticketMedio) }}</span>
                  <span class="cs-label">Ticket médio</span>
                </span>
                <span v-if="clienteStats.inadimplente" class="cs-sep">·</span>
                <span v-if="clienteStats.inadimplente" class="cs-badge-inadimpl">Inadimplente</span>
              </div>
              <div v-if="!clienteSel" class="cliente-search-row">
                <div class="cliente-search-wrap">
                  <svg class="search-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                  <input v-model="clienteBusca" type="text" class="cart-input cliente-input" placeholder="Nome, CPF ou telefone…" @input="buscarClientes" @focus="showClienteDrop = true" @blur="onClienteBlur" autocomplete="off" />
                  <span v-if="buscandoCliente" class="spin-xs"></span>
                </div>
                <button type="button" class="btn-novo-cliente" @mousedown.prevent @click.stop="abrirModalNovoCliente" title="Cadastrar novo cliente">
                  <span class="material-symbols-outlined">person_add</span>
                </button>
              </div>
              <div v-if="showClienteDrop && clienteResultados.length" class="cliente-drop">
                <button v-for="c in clienteResultados" :key="c.pk" class="cliente-drop-item" @mousedown.prevent="selecionarCliente(c)">
                  <span class="drop-nome">{{ c.nome }}<span v-if="c.razao_social" class="drop-razao"> · {{ c.razao_social }}</span></span>
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

            <!-- Desconto decorador -->
            <div v-if="catsDecorador.length" class="cart-section">
              <label class="section-label">Desconto decorador</label>
              <div v-if="parametrosStore.getParam('pdv_desconto_decorador_balao', false) && !clienteSel?.decorador" class="decorador-aviso">
                <span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">info</span>
                Selecione um cliente decorador para aplicar este desconto
              </div>
              <div v-for="cd in catsDecorador" :key="cd.pk" class="decorador-row">
                <span class="decorador-nome">🎈 {{ cd.nome }}</span>
                <span class="decorador-pct-label">10%</span>
                <button class="btn-apply-dec" @click="aplicarDescCat(cd)">Aplicar</button>
                <button class="btn-remove-dec" @click="vendaStore.removerDescontoCategoria(cd.pk)" title="Remover desconto">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  Tirar
                </button>
              </div>
            </div>

            <!-- Vendedor -->
            <div class="cart-section vendedor-section">
              <label class="section-label">Vendedor <span v-if="exigeVendedor" class="obrig">*</span></label>
              <div class="det-pills-wrap">
                <button
                  v-for="v in vendedores"
                  :key="v.pk"
                  :class="['det-pill', { active: vendedorSel?.pk === v.pk }]"
                  @click="vendedorSel = (vendedorSel?.pk === v.pk ? null : v)"
                >{{ v.nome }}</button>
                <span v-if="!vendedores.length" class="det-pills-empty">Nenhum vendedor cadastrado</span>
              </div>
              <span v-if="exigeVendedor && !vendedorSel" class="vendedor-aviso">Selecione um vendedor para finalizar</span>
            </div>

            <!-- Tipo de venda -->
            <div class="cart-section">
              <label class="section-label">Tipo de venda</label>
              <div class="det-pills-wrap">
                <button :class="['det-pill', { active: tipoVenda === 'venda' }]" @click="tipoVenda = 'venda'">Venda</button>
                <button :class="['det-pill', { active: tipoVenda === 'locacao' }]" @click="tipoVenda = 'locacao'">Locação</button>
              </div>
            </div>

            <!-- Datas locação -->
            <div v-if="tipoVenda === 'locacao'" class="cart-section two-col">
              <div>
                <label class="section-label">Retirada</label>
                <input v-model="dtLocacao" type="date" class="cart-input sm" />
              </div>
              <div>
                <label class="section-label">Devolução</label>
                <input v-model="dtDevolucao" type="date" class="cart-input sm" />
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
              <label class="section-label">CPF / CNPJ na nota <span class="opt">(opcional)</span></label>
              <input v-model="cpf" type="text" class="cart-input" placeholder="CPF ou CNPJ" maxlength="18" @input="maskCpf" />
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
        <div v-show="cartTab === 2" class="tab-panel pag-panel">

          <!-- ① Painel de totais -->
          <div class="pag-totais">
            <div class="pag-total-principal">
              <span class="pag-total-label">Total da Venda</span>
              <span class="pag-total-valor">{{ fmt(vendaStore.total) }}</span>
            </div>
            <div class="pag-metricas">
              <div class="pag-metrica">
                <span class="pm-label">Descontos Aplicados</span>
                <span class="pm-val pm-desc">{{ fmt(descontoTotal) }}</span>
              </div>
              <div class="pag-metrica-div"></div>
              <div class="pag-metrica">
                <span class="pm-label">Pago</span>
                <span class="pm-val pm-pago">{{ fmt(vendaStore.totalPago) }}</span>
              </div>
              <div class="pag-metrica-div"></div>
              <div v-if="parseFloat(vendaStore.faltaPagar) > 0.009" class="pag-metrica">
                <span class="pm-label">Falta</span>
                <span class="pm-val pm-falta">{{ fmt(vendaStore.faltaPagar) }}</span>
              </div>
              <div v-else-if="troco > 0.009" class="pag-metrica">
                <span class="pm-label">Troco</span>
                <span class="pm-val pm-troco">{{ fmt(troco) }}</span>
              </div>
              <div v-else class="pag-metrica">
                <span class="pm-label">Falta</span>
                <span class="pm-val pm-zero">R$ 0,00</span>
              </div>
            </div>
            <!-- Barra de progresso -->
            <div class="pag-progress-wrap">
              <div class="pag-progress-bar" :style="{ width: Math.min(100, (parseFloat(vendaStore.totalPago) / parseFloat(vendaStore.total)) * 100) + '%' }"></div>
            </div>
            <div v-if="parseFloat(vendaStore.faltaPagar) <= 0.009 && vendaStore.pagamentos.length" class="pag-completo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Pagamento completo
            </div>
          </div>

          <!-- ② Formas de pagamento (pills) -->
          <div class="pag-formas-wrap">
            <span class="pag-sec-label">Forma de pagamento</span>
            <div class="pag-formas-pills">
              <button
                v-for="f in formasPagamento" :key="f.pk"
                :class="['pag-pill', { active: formaPag === f.forma }]"
                @click="formaPag = f.forma"
              >{{ f.icone }} {{ f.label }}</button>
            </div>
          </div>

          <!-- ③ Campo valor + adicionar -->
          <div class="pag-entrada">
            <div class="pag-entrada-row">
              <div class="pag-entrada-input-wrap">
                <span class="pag-rs">R$</span>
                <input
                  :value="valorPagDisplay"
                  @input="onValorPagInput"
                  @keydown.enter.prevent="addPag"
                  type="text" inputmode="numeric" placeholder="0,00"
                  class="pag-entrada-input"
                />
              </div>
              <button class="pag-btn-add" @click="addPag">
                <span class="material-symbols-outlined">add</span>
                Adicionar
              </button>
            </div>
            <div v-if="formaPag === 'crediario'" class="pag-crediario-row">
              <label class="pag-sec-label">Vencimento <span class="obrig">*</span></label>
              <input v-model="dtVenc" type="date" class="cart-input sm" style="flex:1" />
            </div>
            <div v-if="formaPag === 'crediario' && crediarioExigeCliente && !clienteSel" class="crediario-warn" style="margin-top:4px">
              <span class="material-symbols-outlined">warning</span>
              Selecione um cliente para usar o crediário
            </div>
            <div v-if="tipoVenda === 'locacao' && locacaoExigeCliente && !clienteSel" class="crediario-warn" style="margin-top:4px">
              <span class="material-symbols-outlined">warning</span>
              Selecione um cliente para finalizar a locação
            </div>
            <div v-if="temCrediario && clienteInadimplente && crediarioBloqueiainadimpl" class="crediario-warn inadimpl" style="margin-top:4px">
              <span class="material-symbols-outlined">block</span>
              <span>Cliente possui <b>{{ inadimplenteQtd }} boleto(s) em atraso</b>. Crediário disponível somente após quitar as dívidas.</span>
            </div>
          </div>

          <!-- ④ Pagamentos adicionados + acréscimo -->
          <div class="pag-lista-acrescimo">
            <div v-if="vendaStore.pagamentos.length" class="pag-chips">
              <div v-for="(p, i) in vendaStore.pagamentos" :key="i" class="pag-chip">
                <span class="pag-chip-forma">{{ p.label || p.forma }}</span>
                <span class="pag-chip-val">{{ fmt(p.valor) }}</span>
                <button class="pag-chip-del" @click="vendaStore.removerPagamento(i)">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <!-- Acréscimo -->
            <div class="pag-acrescimo-simples">
              <span class="pag-sec-label" style="white-space:nowrap;margin-bottom:0">Acréscimo</span>
              <div class="pag-acrescimo-row">
                <div class="pag-acrescimo-input-wrap">
                  <span class="pag-acrescimo-rs">R$</span>
                  <input
                    :value="acrescimoDisplay"
                    @input="onAcrescimoInput"
                    @keydown.enter.stop.prevent="confirmarAcrescimo"
                    type="text" inputmode="numeric" placeholder="0,00"
                    class="pag-acrescimo-input"
                  />
                </div>
                <button type="button" class="pag-acrescimo-btn" @click.stop.prevent="confirmarAcrescimo">
                  <span class="material-symbols-outlined">check</span>
                  Aplicar
                </button>
              </div>
              <!-- Chip do acréscimo aplicado -->
              <div v-if="parseFloat(vendaStore.acrescimo) > 0" class="pag-acrescimo-chip">
                <span class="material-symbols-outlined" style="font-size:15px;color:#34d399">add_circle</span>
                <span class="pac-forma">Acréscimo aplicado</span>
                <span class="pac-val">+ {{ fmt(vendaStore.acrescimo) }}</span>
                <button class="pag-chip-del" @click="removerAcrescimo">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ⑤ Finalizar -->
          <div class="pag-footer">
            <div v-if="erroFinalizar" class="erro-finalizar">
              <span class="material-symbols-outlined">error</span>
              {{ erroFinalizar }}
              <button class="erro-finalizar-close" @click="erroFinalizar = ''">×</button>
            </div>
            <button class="btn-finalizar pag-btn-finalizar" :disabled="!podeFinalizar || processando" @click="finalizar">
              <span v-if="processando" class="spin-sm"></span>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {{ processando ? 'Processando…' : 'Finalizar Venda' }}
            </button>
          </div>

        </div><!-- /tab 2 -->

        <!-- ── ABA 3: Impressão (pós-venda) ──────────────────── -->
        <div v-show="cartTab === 3" class="tab-panel tab-impressao-panel">
          <div class="impressao-venda-ok">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div class="impressao-titulo">Venda finalizada!</div>
            <div class="impressao-num">#{{ vendaNumero }}</div>
          </div>

          <div class="impressao-acoes">
            <button class="btn-imp-acao btn-recibo" @click="imprimirRecibo">
              <span class="material-symbols-outlined">print</span>
              Imprimir Recibo
            </button>

            <button v-if="tipoVenda === 'locacao'" class="btn-imp-acao btn-contrato" @click="imprimirContrato">
              <span class="material-symbols-outlined">description</span>
              Imprimir Contrato
            </button>

            <button
              class="btn-imp-acao btn-nfce"
              :disabled="emitindo || (resultNfce && resultNfce.ok)"
              @click="emitirNFCe"
            >
              <span v-if="emitindo" class="spin-sm"></span>
              <span v-else class="material-symbols-outlined">receipt_long</span>
              {{ emitindo ? 'Emitindo…' : (resultNfce && resultNfce.ok ? 'NFC-e Emitida ✓' : 'Emitir NFC-e') }}
            </button>

            <div v-if="resultNfce" class="nfce-result" :class="resultNfce.ok ? 'ok' : 'err'">
              <div v-if="resultNfce.ok">
                <strong>NFC-e autorizada</strong><br>
                <span class="mono">{{ resultNfce.chave }}</span>
              </div>
              <div v-else>{{ resultNfce.erro }}</div>
              <button v-if="resultNfce.danfe" class="btn-danfe" @click="abrirDanfe">
                <span class="material-symbols-outlined">print</span>
                Imprimir DANFE
              </button>
            </div>

            <button class="btn-imp-acao btn-nova-venda" @click="limpar">
              <span class="material-symbols-outlined">add_shopping_cart</span>
              Nova Venda
              <kbd class="hotkey-badge">Esc</kbd>
            </button>
          </div>
        </div><!-- /tab 3 -->


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

    <!-- ── MODAL LISTA IA ────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="modalLista" class="modal-overlay" @click.self="fecharModalLista">
        <div class="modal-box modal-lista-ia">
          <div class="modal-header">
            <h3>
              <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">auto_awesome</span>
              Importar lista do cliente
            </h3>
            <button class="modal-close" @click="fecharModalLista">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- ETAPA 1: colar texto -->
          <div v-if="!listaProcessada" class="modal-body">
            <p class="lista-ia-hint">Cole aqui a mensagem do cliente (WhatsApp, texto livre — qualquer formato):</p>
            <textarea v-model="listaTexto" class="lista-ia-textarea" rows="10"
              placeholder="1 pct Rosa candy n12&#10;1 pct Amarelo candy n12&#10;2 pct un Dourado n05&#10;1 pct liga..."></textarea>
            <div class="modal-footer">
              <button class="btn-cancel" @click="fecharModalLista">Cancelar</button>
              <button class="btn-processar-ia" @click="processarListaIA" :disabled="!listaTexto.trim() || processandoLista">
                <span v-if="processandoLista" class="spin-sm"></span>
                <span v-else class="material-symbols-outlined">auto_awesome</span>
                {{ processandoLista ? 'Processando…' : 'Processar com IA' }}
              </button>
            </div>
          </div>

          <!-- ETAPA 2: resultados -->
          <div v-else class="modal-body lista-ia-resultados-wrap">
            <div class="lista-ia-summary">
              <span class="lista-ia-ok">{{ listaItens.filter(i => i.produto).length }} encontrados</span>
              <span v-if="listaItens.filter(i => !i.produto).length" class="lista-ia-nok">
                · {{ listaItens.filter(i => !i.produto).length }} não encontrados
              </span>
            </div>
            <div class="lista-ia-resultados">
              <div v-for="(item, i) in listaItens" :key="i"
                class="lista-ia-item"
                :class="item.produto ? 'li-ok' : 'li-nok'"
              >
                <!-- Linha principal -->
                <div class="li-main-row">
                  <input type="checkbox" v-model="item.selecionado"
                    :disabled="!item.produto || (item.produto.saldo !== null && item.produto.saldo <= 0)" />
                  <div class="li-info">
                    <p class="li-linha1">
                      <strong class="li-qty">{{ item.qty }}×</strong>
                      {{ item.descricao }}
                    </p>
                    <p v-if="item.produto" class="li-linha2">
                      ↳ {{ item.produto.descricao }}
                      <span class="li-preco">{{ fmt(item.produto.valor_venda) }}</span>
                      <span v-if="item.produto.saldo !== null && item.produto.saldo <= 0" class="li-sem-estoque">· Sem estoque</span>
                      <span v-else-if="item.produto.saldo !== null && item.produto.saldo < item.qty" class="li-estoque-baixo">· Estoque: {{ item.produto.saldo }}</span>
                    </p>
                    <p v-else class="li-linha2 li-sem-match">Não encontrado no catálogo</p>
                  </div>
                  <button class="li-btn-edit" @click.prevent="abrirCorrecao(i)"
                    :class="{ active: editandoIdx === i }"
                    title="Corrigir produto">
                    <span class="material-symbols-outlined" style="font-size:15px">edit</span>
                  </button>
                </div>

                <!-- Busca de correção inline -->
                <div v-if="editandoIdx === i" class="li-correcao">
                  <input
                    v-model="buscaCorrecao"
                    type="text"
                    placeholder="Buscar produto no catálogo…"
                    class="li-correcao-input"
                    autofocus
                  />
                  <div class="li-correcao-drop">
                    <button
                      v-for="p in correcaoResultados"
                      :key="p.pk"
                      class="li-correcao-item"
                      :class="{ 'li-sem-est': p.saldo !== null && p.saldo <= 0 }"
                      @mousedown.prevent="selecionarCorrecao(i, p)"
                    >
                      <span class="li-cor-nome">{{ p.descricao }}</span>
                      <span class="li-cor-preco">{{ fmt(p.valor_venda) }}</span>
                      <span v-if="p.saldo !== null && p.saldo <= 0" class="li-cor-est-zero">sem estoque</span>
                    </button>
                    <div v-if="correcaoResultados.length === 0" class="li-correcao-vazio">Nenhum produto encontrado</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="listaProcessada = false">Editar lista</button>
              <button class="btn-add-lista-carrinho" @click="adicionarListaCarrinho"
                :disabled="!listaItens.some(i => i.selecionado && i.produto)">
                <span class="material-symbols-outlined">add_shopping_cart</span>
                Adicionar ao carrinho
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

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

  <!-- ── Modal Novo Cliente ─────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="modalNovoCliente" class="ncli-overlay" @click.self="modalNovoCliente = false">
      <div class="ncli-modal">
        <!-- Header -->
        <div class="ncli-header-bar">
          <div class="ncli-header-icon">
            <span class="material-symbols-outlined">person_add</span>
          </div>
          <div class="ncli-header-text">
            <h3>Cadastrar Novo Cliente</h3>
            <p>Preencha os dados e selecione automaticamente na venda</p>
          </div>
          <button type="button" class="ncli-close-btn" @click="modalNovoCliente = false">×</button>
        </div>

        <!-- Body -->
        <div class="ncli-body" ref="ncliBodyRef">
          <div class="ncli-form">
            <div class="ncli-grid">
              <div class="ncli-field full">
                <label>Nome *</label>
                <input v-model="ncli.nome" type="text" class="ncli-input" placeholder="Nome completo" autofocus @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>CPF / CNPJ</label>
                <input v-model="ncli.cpf" type="text" class="ncli-input" placeholder="000.000.000-00" maxlength="18" @input="ncliMaskDoc" @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>Telefone</label>
                <input v-model="ncli.telefone" type="text" class="ncli-input" placeholder="(92) 99999-9999" @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>E-mail</label>
                <input v-model="ncli.email" type="email" class="ncli-input" placeholder="email@exemplo.com" @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>Data de Nascimento</label>
                <input v-model="ncli.data_nascimento" type="date" class="ncli-input" @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>CEP</label>
                <div class="ncli-cep-wrap">
                  <input v-model="ncli.cep" type="text" class="ncli-input" placeholder="00000-000" maxlength="9" @input="ncliOnCepInput" @blur="ncliBuscarCep" @keydown.enter.prevent="ncliBuscarCep" />
                  <span v-if="ncliBuscandoCep" class="ncli-spin"></span>
                </div>
              </div>
              <div class="ncli-field full">
                <label>Endereço</label>
                <input v-model="ncli.logradouro" type="text" class="ncli-input" @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>Número</label>
                <input v-model="ncli.numero" type="text" class="ncli-input" @change="ncliAtualizarMapa" @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>Bairro</label>
                <input v-model="ncli.bairro" type="text" class="ncli-input" @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>Cidade</label>
                <input v-model="ncli.cidade" type="text" class="ncli-input" @keydown.enter.prevent="ncliNextField" />
              </div>
              <div class="ncli-field">
                <label>UF</label>
                <input v-model="ncli.uf" type="text" class="ncli-input" maxlength="2" placeholder="AM" @keydown.enter.prevent="ncliSalvar" />
              </div>
              <div class="ncli-field full">
                <label class="ncli-check-label">
                  <input type="checkbox" v-model="ncli.decorador" />
                  É decorador (recebe desconto especial)
                </label>
              </div>
            </div>

            <div v-if="ncliMapUrl" class="ncli-map-wrap">
              <iframe :src="ncliMapUrl" class="ncli-map" frameborder="0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>

            <div v-if="ncliErro" class="ncli-erro">{{ ncliErro }}</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="ncli-footer">
          <button type="button" class="ncli-btn-cancel" @click="modalNovoCliente = false">Cancelar</button>
          <button type="button" class="ncli-btn-save" :disabled="ncliSalvando" @click="ncliSalvar">
            <span v-if="ncliSalvando" class="spin-xs"></span>
            <span class="material-symbols-outlined" v-else style="font-size:16px">person_add</span>
            {{ ncliSalvando ? 'Salvando...' : 'Cadastrar e Selecionar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Lightbox foto produto -->
  <Teleport to="body">
    <Transition name="pdv-lb">
      <div v-if="fotoExpandida" class="pdv-lb-backdrop" @click="fotoExpandida = null">
        <button class="pdv-lb-close" @click="fotoExpandida = null">
          <span class="material-symbols-outlined">close</span>
        </button>
        <img :src="fotoExpandida" class="pdv-lb-img" @click.stop />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, inject } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useVendaStore }      from '../stores/venda';
import { useCaixaStore }      from '../stores/caixa';
import { useSessaoStore }     from '../stores/sessao';
import { useParametrosStore } from '../stores/parametros';
import { supabase }           from '../composables/useSupabase';
import apiClient              from '../services/api';
import { imprimirContratoLocacao } from '../utils/contrato';

const mobileView      = ref('catalog'); // 'catalog' | 'cart'
const vendaStore      = useVendaStore();
const caixaStore      = useCaixaStore();
const sessaoStore     = useSessaoStore();
const parametrosStore = useParametrosStore();
const abrirSidebarFn  = inject('abrirSidebar', () => {});

// ── Estado ────────────────────────────────────────────────────
const busca          = ref('');
const scannerAberto     = ref(false);

// ── Lista IA ──────────────────────────────────────────────────────
const modalLista       = ref(false);
const listaTexto       = ref('');
const listaItens       = ref([]);
const listaProcessada  = ref(false);
const processandoLista = ref(false);

// Correção manual de produto
const editandoIdx      = ref(null);
const buscaCorrecao    = ref('');

const correcaoResultados = computed(() => {
  const q = buscaCorrecao.value.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!q) return todos.value.slice(0, 40);
  return todos.value
    .filter(p => p.descricao.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
    .slice(0, 40);
});

function abrirCorrecao(i) {
  editandoIdx.value   = editandoIdx.value === i ? null : i;
  buscaCorrecao.value = '';
}

function selecionarCorrecao(i, produto) {
  const semEstoque = produto.saldo !== null && produto.saldo <= 0;
  listaItens.value[i].produto    = produto;
  listaItens.value[i].selecionado = !semEstoque;
  editandoIdx.value   = null;
  buscaCorrecao.value = '';
}

function fecharModalLista() {
  modalLista.value      = false;
  listaTexto.value      = '';
  listaItens.value      = [];
  listaProcessada.value = false;
  editandoIdx.value     = null;
  buscaCorrecao.value   = '';
}

function normalizarDesc(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\bn[°º.]?\s*(\d+)/g, '$1')
    .replace(/numero\s*(\d+)/g, '$1')
    .replace(/[^a-z\d\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normaliza números: n9 = n09 = nº9 = 9 → "09" (2 dígitos para comparação)
function normalizarNumeros(s) {
  return s.replace(/\b(\d)\b/g, '0$1');
}

function matchProduto(descricao) {
  if (!descricao) return null;
  const alvo = normalizarNumeros(normalizarDesc(descricao));
  const palavrasAlvo = alvo.split(' ').filter(w => w.length >= 2);
  if (!palavrasAlvo.length) return null;

  // 1. Match exato
  const exato = todos.value.find(p => normalizarNumeros(normalizarDesc(p.descricao)) === alvo);
  if (exato) return exato;

  let melhor = null, melhorScore = 0;
  for (const p of todos.value) {
    const nome = normalizarNumeros(normalizarDesc(p.descricao));
    const palavrasNome = nome.split(' ').filter(w => w.length >= 2);

    // Quantas palavras do pedido estão no produto
    const scoreAB = palavrasAlvo.filter(w => nome.includes(w)).length / palavrasAlvo.length;
    // Quantas palavras do produto estão no pedido (evita match parcial errado)
    const scoreBA = palavrasNome.length
      ? palavrasNome.filter(w => alvo.includes(w)).length / palavrasNome.length
      : 0;

    // Bidirecional: média ponderada — pedido tem mais peso
    const score = scoreAB * 0.65 + scoreBA * 0.35;
    if (score > melhorScore) { melhorScore = score; melhor = p; }
  }
  // Threshold mais alto para evitar falsos positivos
  return melhorScore >= 0.6 ? melhor : null;
}

async function processarListaIA() {
  processandoLista.value = true;
  try {
    const { data } = await apiClient.post('/api/ia/parse-lista', { texto: listaTexto.value });
    listaItens.value = (data.itens || []).map(it => {
      const produto = matchProduto(it.descricao);
      const semEstoque = produto && produto.saldo !== null && produto.saldo <= 0;
      return {
        qty:         parseInt(it.qty) || 1,
        descricao:   it.descricao,
        produto,
        selecionado: !!produto && !semEstoque,
      };
    });
    listaProcessada.value = true;
  } catch (e) {
    toast('Erro ao processar lista: ' + (e.response?.data?.erro || e.message), 'err');
  } finally {
    processandoLista.value = false;
  }
}

function adicionarListaCarrinho() {
  let adicionados = 0;
  for (const item of listaItens.value) {
    if (!item.selecionado || !item.produto) continue;
    if (item.produto.saldo !== null && item.produto.saldo <= 0) continue;
    const p     = item.produto;
    const preco = getPrecoEfetivo(p);
    vendaStore.adicionarItem({
      produto_pk:     p.pk,
      nome:           p.descricao,
      codigo:         p.codigo,
      categoria_pk:   p.categoria_pk,
      preco_unitario: parseFloat(preco),
      qtd:            item.qty,
      preco_total:    parseFloat(preco) * item.qty,
      desconto_val:   0,
      saldo:          p.saldo,
    });
    adicionados++;
  }
  toast(`${adicionados} produto(s) adicionado(s) ao carrinho.`, 'ok');
  fecharModalLista();
  if (mobileView.value === 'catalog') mobileView.value = 'cart';
}
const scannerStatus     = ref('');
const scannerStatusTipo = ref('');

const catSel         = ref(null);
const somentePromo   = ref(false);
const carregando     = ref(true);
const fotoExpandida  = ref(null);
const recarregandoProd = ref(false);
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
const itemDescBrlDisplay = ref('');
const clienteSel        = ref(null);
const clienteBusca      = ref('');
const clienteResultados = ref([]);
const buscandoCliente   = ref(false);
const showClienteDrop      = ref(false);
const showClienteDropItens = ref(false);
let   _clienteTimer     = null;
const dtLocacao   = ref('');
const dtDevolucao = ref('');
const dtVenc      = ref('');
const formaPag    = ref('dinheiro');
const formasPagamento = ref([]);
const valorPag    = ref(0);
const valorPagDisplay = ref('');
const acrescimoDisplay    = ref('');
const acrescimoValor      = ref(0);
const acrescimoConfirmado = ref(false);
const processando = ref(false);
const emitindo    = ref(false);
const vendaFinalizada = ref(false);
const erroFinalizar   = ref('');
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

function semAcento(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const termoBusca = computed(() => {
  return semAcento(busca.value.replace(/^\d+\*/, '').trim());
});

const filtrados = computed(() => {
  let l = todos.value;
  if (catSel.value !== null)
    l = l.filter(p => p.categoria_pk === catSel.value);
  if (somentePromo.value)
    l = l.filter(p => getPromoAtiva(p));
  const q = termoBusca.value;
  if (q) {
    const palavras = q.split(/\s+/).filter(Boolean);
    l = l.filter(p => {
      const desc   = semAcento(p.descricao);
      const codigo = semAcento(p.codigo);
      const barras = (p.codigo_barras || '');
      if (barras.includes(q) || codigo.includes(q)) return true;
      return palavras.every(w => desc.includes(w));
    });
  }
  return l;
});

const bloqueiarSemCaixa         = computed(() => parametrosStore.getParam('pdv_bloquear_sem_caixa', true));
const crediarioExigeCliente     = computed(() => parametrosStore.getParam('crediario_exige_cliente', true));
const locacaoExigeCliente       = computed(() => parametrosStore.getParam('locacao_exige_cliente', true));
const crediarioBloqueiainadimpl = computed(() => parametrosStore.getParam('crediario_bloqueia_inadimplente', true));
const exigeVendedor             = computed(() => parametrosStore.getParam('pdv_exigir_vendedor', false));
const permitirEstoqueNegativo   = computed(() => parametrosStore.getParam('pdv_permitir_estoque_negativo', false));
const nfceAtiva                 = computed(() => parametrosStore.getParam('nfce_ativa', false));

const temCrediario = computed(() =>
  vendaStore.pagamentos.some(p => String(p.forma).toLowerCase() === 'crediario')
);

const clienteInadimplente  = ref(false);
const inadimplenteQtd      = ref(0);

const clienteStats = ref(null);

// ── Modal Novo Cliente ─────────────────────────────────────────
const modalNovoCliente = ref(false);
const ncliSalvando     = ref(false);
const ncliBuscandoCep  = ref(false);
const ncliErro         = ref('');
const ncliMapUrl       = ref('');
const ncliBodyRef      = ref(null);
const ncli = ref({ nome: '', cpf: '', telefone: '', email: '', data_nascimento: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', decorador: false });

function ncliNextField(e) {
  const inputs = Array.from(ncliBodyRef.value?.querySelectorAll('input, select, textarea') || []);
  const idx = inputs.indexOf(e.target);
  if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
}

function abrirModalNovoCliente() {
  ncli.value = { nome: clienteBusca.value || '', cpf: '', telefone: '', email: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', decorador: false };
  ncliErro.value = '';
  ncliMapUrl.value = '';
  modalNovoCliente.value = true;
}

function ncliMaskDoc(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    v = v.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  ncli.value.cpf = v;
}

function ncliOnCepInput(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  ncli.value.cep = v;
}

function ncliAtualizarMapa() {
  const p = [ncli.value.logradouro, ncli.value.numero, ncli.value.bairro, ncli.value.cidade, ncli.value.uf].filter(Boolean);
  if (!p.length && !ncli.value.cep) { ncliMapUrl.value = ''; return; }
  const q = encodeURIComponent(p.length >= 2 ? p.join(', ') : ncli.value.cep);
  ncliMapUrl.value = `https://maps.google.com/maps?q=${q}&output=embed&hl=pt-BR`;
}

async function ncliBuscarCep() {
  const cep = ncli.value.cep?.replace(/\D/g, '');
  if (cep?.length !== 8) return;
  ncliBuscandoCep.value = true;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (!d.erro) {
      ncli.value.logradouro = d.logradouro || ncli.value.logradouro;
      ncli.value.bairro     = d.bairro     || ncli.value.bairro;
      ncli.value.cidade     = d.localidade || ncli.value.cidade;
      ncli.value.uf         = d.uf         || ncli.value.uf;
      ncliAtualizarMapa();
    }
  } catch {} finally { ncliBuscandoCep.value = false; }
}

async function ncliSalvar() {
  if (!ncli.value.nome?.trim()) { ncliErro.value = 'Nome obrigatório.'; return; }
  ncliSalvando.value = true;
  ncliErro.value = '';
  try {
    const payload = {
      nome:       ncli.value.nome.trim(),
      cpf:        ncli.value.cpf?.trim() || null,
      telefone:   ncli.value.telefone?.trim() || null,
      email:           ncli.value.email?.trim() || null,
      data_nascimento: ncli.value.data_nascimento || null,
      decorador:       ncli.value.decorador || false,
      cep:        ncli.value.cep?.trim() || null,
      logradouro: ncli.value.logradouro?.trim() || null,
      numero:     ncli.value.numero?.trim() || null,
      bairro:     ncli.value.bairro?.trim() || null,
      cidade:     ncli.value.cidade?.trim() || null,
      uf:         ncli.value.uf?.trim()?.toUpperCase() || null,
      filial_pk:  sessaoStore.filial?.pk || null,
    };
    const res = await apiClient.post('/api/clientes', payload);
    clienteSel.value = res.data.data;
    clienteBusca.value = '';
    modalNovoCliente.value = false;
  } catch (e) {
    ncliErro.value = e.message;
  } finally {
    ncliSalvando.value = false;
  }
}

watch(clienteSel, async (cli) => {
  if (!cli?.pk) { clienteStats.value = null; return; }
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: vendas } = await supabase
    .from('vendas')
    .select('total, status_crediario, data_vencimento_crediario')
    .eq('cliente_pk', cli.pk)
    .eq('ativo', true)
    .not('status', 'eq', 'cancelada');
  if (!vendas) return;
  const contasAberto = vendas
    .filter(v => v.status_crediario === 'pendente' || (v.data_vencimento_crediario && v.status_crediario !== 'recebido'))
    .reduce((s, v) => s + parseFloat(v.total || 0), 0);
  const ticketMedio = vendas.length ? vendas.reduce((s, v) => s + parseFloat(v.total || 0), 0) / vendas.length : 0;
  const inadimplente = vendas.some(v =>
    v.data_vencimento_crediario && v.data_vencimento_crediario < hoje &&
    (v.status_crediario === 'pendente' || !v.status_crediario)
  );
  clienteStats.value = { contasAberto, ticketMedio, inadimplente };
}, { immediate: false });

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
    .eq('ativo', true)
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
  (!temCrediario.value || !crediarioBloqueiainadimpl.value || !clienteInadimplente.value) &&
  (tipoVenda.value !== 'locacao' || !locacaoExigeCliente.value || !!clienteSel.value)
);

const troco = computed(() =>
  Math.max(0, parseFloat(vendaStore.totalPago) - parseFloat(vendaStore.total))
);

const descontoTotal = computed(() => {
  // desconto total = bruto - total + acrescimo = descontos de itens + desconto de venda
  const bruto = parseFloat(vendaStore.subtotalBruto) || 0;
  const total  = parseFloat(vendaStore.total) || 0;
  const acr    = parseFloat(vendaStore.acrescimo) || 0;
  return Math.max(0, bruto - total + acr);
});

// ── Sincronização vendedor/cliente com store ──────────────────
watch(vendedorSel, v  => vendaStore.setVendedor(v));
watch(clienteSel,  c  => vendaStore.setCliente(c));

// Zera descontos de categorias restritas ao trocar para cliente não-decorador
watch(clienteSel, (novo, anterior) => {
  const restricaoAtiva = parametrosStore.getParam('pdv_desconto_decorador_balao', false);
  if (!restricaoAtiva) return;
  const eraDecorador = !!anterior?.decorador;
  const eAgora       = !!novo?.decorador;
  if (eraDecorador && !eAgora) {
    categorias.value
      .filter(c => c.desconto_somente_decorador)
      .forEach(c => vendaStore.removerDescontoCategoria(c.pk));
    toast('Descontos de decorador removidos pois o cliente não é decorador.', 'warn', 4000);
  }
});

// Preenche valor recebido com o total restante sempre que o total da venda muda
watch(() => vendaStore.faltaPagar, (val) => {
  if (vendaStore.pagamentos.length === 0) {
    preencherValorPag(parseFloat(val) || 0);
  }
}, { immediate: false });

// Preenche ao abrir a aba de pagamento
watch(cartTab, (tab) => {
  if (tab === 2 && vendaStore.pagamentos.length === 0) {
    preencherValorPag(parseFloat(vendaStore.faltaPagar) || 0);
  }
});

// ── Mount ─────────────────────────────────────────────────────
function onHotkey(e) {
  if (e.key === 'Escape') { e.preventDefault(); limpar(); }
  if (e.key === 'F1' && vendaStore.itens.length) { e.preventDefault(); copiarOrcamento(); }
  if (e.key === 'F2' && !vendaFinalizada.value) { e.preventDefault(); cartTab.value = 0; }
  if (e.key === 'F3' && !vendaFinalizada.value && vendaStore.itens.length) { e.preventDefault(); cartTab.value = 1; }
  if (e.key === 'F4' && !vendaFinalizada.value && vendaStore.itens.length) { e.preventDefault(); cartTab.value = 2; }
}

let _realtimeChannel = null;
let _refreshTimer    = null;
let _retryTimer      = null;
let _desmontado      = false;

function _aplicarSaldoProduto(updated) {
  if (updated.ativo === false) {
    todos.value = todos.value.filter(p => p.pk !== updated.pk);
    return;
  }
  const idx = todos.value.findIndex(p => p.pk === updated.pk);
  if (idx !== -1) todos.value[idx] = { ...todos.value[idx], saldo: updated.saldo };
  vendaStore.itens.forEach(item => {
    if (item.produto_pk === updated.pk) item.saldo = updated.saldo;
  });
}

function _pararRealtime() {
  clearTimeout(_retryTimer);
  _retryTimer = null;
  if (_realtimeChannel) {
    supabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }
}

function _iniciarRealtime() {
  if (_desmontado) return;
  _pararRealtime();
  _realtimeChannel = supabase
    .channel(`pdv-produtos-saldo-${Date.now()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'produtos' }, (payload) => {
      if (!_desmontado) _aplicarSaldoProduto(payload.new);
    })
    .subscribe((status) => {
      if (_desmontado) return;
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(_retryTimer);
        _retryTimer = setTimeout(_iniciarRealtime, 5000);
      }
    });
}

async function _sincronizarSaldos() {
  if (_desmontado) return;
  try {
    const filial_pk = sessaoStore.filial?.pk;
    const { data } = await api.get('/api/pdv/produtos', { params: { filial_pk } });
    const novos = data?.data || data || [];
    novos.forEach(p => _aplicarSaldoProduto(p));
  } catch { /* silencioso */ }
  // Se canal caiu silenciosamente, reinicia
  if (!_desmontado && _realtimeChannel?.state !== 'joined') {
    _iniciarRealtime();
  }
}

function _onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    _sincronizarSaldos();
    if (_realtimeChannel?.state !== 'joined') {
      _iniciarRealtime();
    }
  }
}

onMounted(async () => {
  _desmontado = false;
  window.addEventListener('keydown', onHotkey);
  document.addEventListener('visibilitychange', _onVisibilityChange);

  // Restaura estado de venda finalizada após reload
  const _fin = sessionStorage.getItem('pdv_finalizada');
  if (_fin) {
    try {
      const { pk, numero, tipoVenda: tv, dtLocacao: dl, dtDevolucao: dd } = JSON.parse(_fin);
      vendaPk.value         = pk;
      vendaNumero.value     = numero;
      vendaFinalizada.value = true;
      cartTab.value         = 3;
      if (tv) tipoVenda.value    = tv;
      if (dl) dtLocacao.value    = dl;
      if (dd) dtDevolucao.value  = dd;
    } catch {}
  }

  await checkCaixa();
  await Promise.all([loadProdutos(), loadCategorias(), loadVendedores(), loadFormasPagamento()]);
  if (vendaStore.cliente) clienteSel.value = vendaStore.cliente;

  _iniciarRealtime();

  // Fallback: sincroniza saldos a cada 90s caso o Realtime caia sem notificação
  _refreshTimer = setInterval(_sincronizarSaldos, 90 * 1000);
});

onUnmounted(() => {
  _desmontado = true;
  window.removeEventListener('keydown', onHotkey);
  document.removeEventListener('visibilitychange', _onVisibilityChange);
  _pararRealtime();
  if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
  clearTimeout(_clienteTimer);
  clearTimeout(_toastTimer);
});

async function loadProdutos() {
  carregando.value = true;
  try {
    const { data } = await apiClient.get('/api/pdv/produtos', {
      params: { filial_pk: sessaoStore.filial?.pk },
    });
    todos.value = data.data || [];
  } catch (e) {
    console.error('Produtos:', e.message);
  } finally {
    carregando.value = false;
  }
}

async function recarregarProdutos() {
  if (recarregandoProd.value) return;
  recarregandoProd.value = true;
  await loadProdutos();
  filtrarProdutos();
  recarregandoProd.value = false;
}

async function loadVendedores() {
  try {
    const { data } = await apiClient.get('/api/pdv/vendedores', {
      params: { filial_pk: sessaoStore.filial?.pk },
    });
    vendedores.value = data.data || [];
  } catch { /* não bloqueia o PDV */ }
}

async function loadCategorias() {
  try {
    const { data } = await apiClient.get('/api/pdv/categorias', {
      params: { filial_pk: sessaoStore.filial?.pk },
    });
    categorias.value = data.data || [];
  } catch { /* não bloqueia o PDV */ }
}

const categoriasMap = computed(() => {
  const m = {};
  categorias.value.forEach(c => { m[c.pk] = c.nome; });
  return m;
});

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
  try {
    const { data } = await apiClient.get('/api/pdv/formas-pagamento', { params: { filial_pk: fil } });
    formasPagamento.value = data.data?.length ? data.data : [
      { pk: 'dinheiro',  forma: 'dinheiro',  label: 'Dinheiro',  icone: '💵', ordem: 1 },
      { pk: 'pix',       forma: 'pix',       label: 'PIX',       icone: '📱', ordem: 2 },
      { pk: 'debito',    forma: 'debito',    label: 'Débito',    icone: '💳', ordem: 3 },
      { pk: 'credito',   forma: 'credito',   label: 'Crédito',   icone: '💳', ordem: 4 },
      { pk: 'crediario', forma: 'crediario', label: 'Crediário', icone: '🧾', ordem: 5 },
    ];
  } catch {
    formasPagamento.value = [
      { pk: 'dinheiro',  forma: 'dinheiro',  label: 'Dinheiro',  icone: '💵', ordem: 1 },
      { pk: 'pix',       forma: 'pix',       label: 'PIX',       icone: '📱', ordem: 2 },
      { pk: 'debito',    forma: 'debito',    label: 'Débito',    icone: '💳', ordem: 3 },
      { pk: 'credito',   forma: 'credito',   label: 'Crédito',   icone: '💳', ordem: 4 },
      { pk: 'crediario', forma: 'crediario', label: 'Crediário', icone: '🧾', ordem: 5 },
    ];
  }
  if (!formasPagamento.value.some(f => f.forma === formaPag.value)) {
    formaPag.value = formasPagamento.value[0]?.forma || 'dinheiro';
  }
}

// ── Helpers ───────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function maskCpf() {
  let v = cpf.value.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    v = v.replace(/(\d{2})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1/$2')
         .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  cpf.value = v;
}

function filtrarProdutos() {}

function adicionarPorBarras() {
  const q = termoBusca.value;
  if (!q) return;

  // Busca exata por código de barras ou código interno primeiro
  const exato = todos.value.find(p =>
    p.codigo_barras === q || p.codigo === q
  );
  if (exato) {
    add(exato);
    busca.value = '';
    return;
  }

  // Se filtrou apenas 1 resultado, adiciona diretamente
  if (filtrados.value.length === 1) {
    add(filtrados.value[0]);
    busca.value = '';
  }
}

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
      const { data } = await apiClient.get('/api/clientes', {
        params: { busca: clienteBusca.value.trim(), filial_pk: sessaoStore.filial?.pk },
      });
      clienteResultados.value = data.data || [];
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

function categoriaRestritoDecorador(categoria_pk) {
  const cat = categorias.value.find(c => Number(c.pk) === Number(categoria_pk));
  return !!cat?.desconto_somente_decorador;
}

function validarDescontoCategoria(categoria_pk, pctOuBrl, tipo = 'pct') {
  const restricaoAtiva = parametrosStore.getParam('pdv_desconto_decorador_balao', false);
  if (!restricaoAtiva || !categoriaRestritoDecorador(categoria_pk)) return true;
  if (!clienteSel.value?.decorador) {
    const nomeCat = categoriasMap.value[Number(categoria_pk)] || 'categoria restrita';
    toast(`Desconto em "${nomeCat}" é exclusivo para clientes decoradores.`, 'err'); return false;
  }
  let pct = pctOuBrl;
  if (tipo === 'brl') {
    const item = vendaStore.itens.find(i => Number(i.categoria_pk) === Number(categoria_pk));
    const base = item ? Number(item.qtd || 1) * Number(item.preco_unitario || 0) : 0;
    pct = base > 0 ? (pctOuBrl / base) * 100 : 0;
  }
  if (pct > 10) {
    toast('Desconto máximo para decoradores nesta categoria: 10%.', 'err'); return false;
  }
  return true;
}

function aplicarDescCat(cd) {
  if (!parametrosStore.getParam('venda_permite_desconto_sem_aprovacao', true)) {
    toast('Descontos desabilitados pelo administrador.', 'err'); return;
  }
  const descontoMax = parametrosStore.getParam('pdv_desconto_maximo', 0);
  if (descontoMax > 0 && 10 > descontoMax) {
    toast(`Desconto máximo permitido: ${descontoMax}%.`, 'err'); return;
  }
  if (!validarDescontoCategoria(cd.pk, 10)) return;

  let algumSkip = false;
  vendaStore.itens.forEach(it => {
    if (Number(it.categoria_pk) !== Number(cd.pk)) return;
    if (itemEmPromo(it)) { algumSkip = true; return; }
    const uni = parseFloat(it.preco_unitario);
    const qty = parseFloat(it.qtd);
    it.desconto_pct = 10;
    it.desconto_val = parseFloat((qty * uni * 0.10).toFixed(2));
    it.preco_total  = (qty * uni * 0.90).toFixed(2);
  });

  const msg = algumSkip
    ? `Desconto decorador de 10% aplicado em "${cd.nome}". Itens em promoção não foram alterados.`
    : `Desconto decorador de 10% aplicado com sucesso em "${cd.nome}"!`;
  toast(msg);
}

function toggleDescItem(i, tipo = 'pct') {
  if (itemEmPromo(vendaStore.itens[i])) {
    toast('Produto em promoção — desconto adicional não permitido.', 'err'); return;
  }
  if (itemDescAberto.value === i && itemDescTipo.value === tipo) {
    itemDescAberto.value = null;
  } else {
    itemDescAberto.value = i;
    const it = vendaStore.itens[i];
    itemDescTipo.value = tipo;
    if (tipo === 'pct') {
      itemDescVal.value = Math.round(it.desconto_pct || 0);
      itemDescBrlDisplay.value = '';
    } else {
      const brl = it.desconto_pct > 0 ? parseFloat((it.qtd * it.preco_unitario - it.preco_total).toFixed(2)) : 0;
      itemDescVal.value = brl;
      itemDescBrlDisplay.value = brl > 0
        ? brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';
    }
  }
}

function onItemDescBrlInput(e) {
  const digits = e.target.value.replace(/\D/g, '');
  if (!digits || digits === '0') {
    itemDescVal.value = 0;
    itemDescBrlDisplay.value = '';
    e.target.value = '';
    return;
  }
  const cents = parseInt(digits, 10);
  itemDescVal.value = cents / 100;
  const formatted = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  itemDescBrlDisplay.value = formatted;
  e.target.value = formatted;
}

function aplicarDescontoItem(i) {
  if (!parametrosStore.getParam('venda_permite_desconto_sem_aprovacao', true)) {
    toast('Descontos desabilitados pelo administrador.', 'err'); return;
  }
  const item = vendaStore.itens[i];
  if (itemEmPromo(item)) {
    toast('Produto em promoção — desconto adicional não permitido.', 'err');
    itemDescAberto.value = null; return;
  }
  const descontoMax = parametrosStore.getParam('pdv_desconto_maximo', 0);
  if (descontoMax > 0 && itemDescTipo.value === 'pct' && itemDescVal.value > descontoMax) {
    toast(`Desconto máximo permitido: ${descontoMax}%.`, 'err'); return;
  }
  if (!validarDescontoCategoria(item.categoria_pk, itemDescVal.value, itemDescTipo.value)) return;
  vendaStore.atualizarDescontoItem(i, itemDescVal.value, itemDescTipo.value);
  itemDescAberto.value = null;
}

function getPromoAtiva(p) {
  if (!p.preco_promo || !p.promo_inicio || !p.promo_fim) return false;
  const agora = new Date();
  return agora >= new Date(p.promo_inicio) && agora <= new Date(p.promo_fim);
}

function itemEmPromo(it) {
  const p = todos.value.find(x => x.pk === it.produto_pk);
  return p ? getPromoAtiva(p) : false;
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

function setQtdItem(idx, val, it) {
  const n = parseFloat(String(val).replace(',', '.'));
  if (!n || n < 0.01) return;
  if (!permitirEstoqueNegativo.value && it.saldo !== null && n > it.saldo) {
    toast(`Estoque insuficiente. Máximo: ${it.saldo}`, 'err');
    vendaStore.atualizarQuantidade(idx, it.saldo);
    return;
  }
  vendaStore.atualizarQuantidade(idx, n);
}

function preencherValorPag(v) {
  const cents = Math.round(parseFloat(v || 0) * 100);
  valorPag.value = cents / 100;
  valorPagDisplay.value = cents > 0
    ? (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
}

function onAcrescimoInput(e) {
  const digits = e.target.value.replace(/\D/g, '');
  if (!digits || digits === '0') {
    acrescimoValor.value = 0;
    acrescimoDisplay.value = '';
    e.target.value = '';
    return;
  }
  const cents = parseInt(digits, 10);
  acrescimoValor.value = cents / 100;
  const fmt2 = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  acrescimoDisplay.value = fmt2;
  e.target.value = fmt2;
}

function confirmarAcrescimo() {
  const val = acrescimoValor.value;
  if (val <= 0) return;
  vendaStore.setAcrescimo(val);
  acrescimoConfirmado.value = true;
  preencherValorPag(val);
  acrescimoDisplay.value = '';
  acrescimoValor.value = 0;
}

function removerAcrescimo() {
  vendaStore.setAcrescimo(0);
  acrescimoDisplay.value = '';
  acrescimoValor.value = 0;
  acrescimoConfirmado.value = false;
}

function onValorPagInput(e) {
  const digits = e.target.value.replace(/\D/g, '');
  if (!digits || digits === '0') {
    valorPag.value = 0;
    valorPagDisplay.value = '';
    e.target.value = '';
    return;
  }
  const cents = parseInt(digits, 10);
  valorPag.value = cents / 100;
  const fmt2 = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  valorPagDisplay.value = fmt2;
  // Preserva cursor no fim
  e.target.value = fmt2;
}

function addPag() {
  if (valorPag.value > 0) {
    const fp = formasPagamento.value.find(f => f.forma === formaPag.value);
    vendaStore.adicionarPagamento({
      forma: formaPag.value,
      label: fp ? `${fp.icone} ${fp.label}` : formaPag.value,
      valor: valorPag.value,
      troco: formaPag.value === 'dinheiro'
        ? Math.max(0, valorPag.value - parseFloat(vendaStore.faltaPagar))
        : 0,
    });
    // Após adicionar, preenche com o saldo restante
    const resta = parseFloat(vendaStore.faltaPagar) || 0;
    preencherValorPag(resta > 0 ? resta : 0);
  }
}

function limpar() {
  vendaStore.resetar();
  sessionStorage.removeItem('pdv_finalizada');
  vendaFinalizada.value      = false;
  vendaPk.value              = null;
  vendaNumero.value          = null;
  resultNfce.value           = null;
  cpf.value                  = '';
  dtVenc.value               = '';
  dtLocacao.value            = '';
  dtDevolucao.value          = '';
  formaPag.value             = formasPagamento.value[0]?.forma || 'dinheiro';
  valorPag.value             = 0;
  valorPagDisplay.value      = '';
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
  somentePromo.value         = false;
  cartTab.value              = 0;
}

onBeforeRouteLeave(() => {
  fecharScanner();
  if (vendaFinalizada.value) {
    vendaStore.resetar();
    sessionStorage.removeItem('pdv_finalizada');
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
  const nomeCliente = clienteSel.value?.nome ? `👤 *${clienteSel.value.nome}*\n` : '';
  const partes = [`🎉 *Orçamento — Festouu*\n${nomeCliente}━━━━━━━━━━━━━━━━━━━━\n`];
  partes.push(`*Itens:*\n${linhas}`);
  if (parseFloat(vendaStore.desconto) > 0)
    partes.push(`\nSubtotal: ${fmt(vendaStore.subtotal)}\nDesconto: − ${fmt(vendaStore.desconto)}`);
  partes.push(`\n✅ *Total: ${fmt(vendaStore.total)}*`);
  partes.push(`\n_Confira com atenção!_`);
  partes.push(`━━━━━━━━━━━━━━━━━━━━\nCódigo: ${codigo}`);
  const texto = partes.join('\n');

  // Mobile: share sheet nativa (iOS/Android)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && navigator.share) {
    try {
      await navigator.share({ title: `Orçamento ${codigo} — BarroStock`, text: texto });
      orcCopiado.value = true;
      setTimeout(() => { orcCopiado.value = false; }, 2500);
      toast(`Orçamento ${codigo} gerado!`);
    } catch (e) {
      if (e.name === 'AbortError') return;
      toast(`Orçamento ${codigo} gerado. Código: ${codigo}`, 'ok', 6000);
    }
    return;
  }

  // Desktop: copia direto para a área de transferência
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

// Detecta "ORC-XXXX" colado na barra de busca (exige exatamente 4 dígitos)
watch(busca, async (val) => {
  const match = val.trim().match(/^ORC-\d{4}$/i);
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
  if (processando.value || vendaFinalizada.value || !podeFinalizar.value) return;
  processando.value = true;
  erroFinalizar.value = '';
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
      acrescimo:      vendaStore.acrescimo,
      total:          vendaStore.total,
      cliente_pk:     clienteSel.value?.pk     || null,
      cliente_codigo: clienteSel.value?.codigo || null,
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
    cartTab.value         = 3;
    sessionStorage.setItem('pdv_finalizada', JSON.stringify({
      pk:         data.venda_pk,
      numero:     data.numero,
      tipoVenda:  tipoVenda.value,
      dtLocacao:  dtLocacao.value || null,
      dtDevolucao: dtDevolucao.value || null,
    }));
    toast(`Venda #${data.numero} finalizada com sucesso!`);

    // Impressão automática
    setTimeout(() => {
      imprimirRecibo();
    }, 500);
  } catch (e) {
    const msg = e.response?.data?.erro || e.message || 'Erro ao finalizar venda.';
    erroFinalizar.value = msg;
    toast('Erro: ' + msg, 'err', 6000);
  } finally {
    processando.value = false;
  }
}

// ── Recibo (Documento Não Fiscal) ────────────────────────────
function imprimirRecibo() {
  const cli        = clienteSel.value || {};
  const itens      = [...vendaStore.itens];
  const totalQtd   = itens.reduce((s, i) => s + parseFloat(i.qtd || 1), 0);
  const totalProds = itens.length;
  const agora      = new Date();
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
    `<tr><td>${p.label || p.forma}</td><td style="text-align:right">${fmt(p.valor)}</td></tr>`
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
  .qtd-total  { font-size: 12px; font-weight: bold; text-align: right; margin-top: 4px; border-top: 1px dotted #000; padding-top: 3px; }
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
<div class="qtd-total"><span>Total: ${totalProds} produto${totalProds !== 1 ? 's' : ''} / ${totalQtd} un.</span></div>
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
  imprimirContratoLocacao({
    vendaPk:   vendaPk.value,
    cpfNota:   cpf.value,
    pagamentos: vendaStore.pagamentos,
    itens:     vendaStore.itens,
    total:     vendaStore.total,
  });
}

// ── NFC-e ─────────────────────────────────────────────────────
async function imprimirDanfe(url) {
  try {
    const resp = await apiClient.get('/api/nfce/danfe-html', { params: { url } });
    const html = resp.data;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(
      html + '<script>window.onload=function(){window.print()}<\/script>'
    );
    iframe.contentWindow.document.close();
    iframe.contentWindow.addEventListener('afterprint', () => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    });
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 30000);
  } catch {
    window.open(url, '_blank');
  }
}

function abrirDanfe() {
  if (resultNfce.value?.danfe) imprimirDanfe(resultNfce.value.danfe);
}

async function emitirNFCe() {
  if (!vendaPk.value) return;
  emitindo.value = true;
  resultNfce.value = null;
  try {
    const { data } = await apiClient.post('/api/nfce/emitir', {
      venda_pk:      vendaPk.value,
      cpf_consumidor: cpf.value.replace(/\D/g, '') || null,
      ambiente:      Number(parametrosStore.getParam('nfce_ambiente', 2)),
    });
    resultNfce.value = data;
    if (data.ok && data.danfe) {
      imprimirDanfe(data.danfe);
    }
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
.pdv-modal-open { pointer-events: none; user-select: none; }
.pdv {
  --bg0:     #08090c;
  --bg1:     #0e1016;
  --bg2:     #141720;
  --bg3:     #000000;
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
  grid-template-columns: 1fr 660px;
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
  width: 40px;
  height: 45px;
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

[data-theme="light"] .btn-scan { background: #fff; }


.btn-scan:hover { background: rgba(99,102,241,.12); color: var(--primary); border-color: rgba(99,102,241,.4); }
.btn-scan .material-symbols-outlined { font-size: 20px; }
.btn-refresh-prod .material-symbols-outlined { transition: transform .6s ease; }
.btn-refresh-prod.refreshing .material-symbols-outlined { animation: spin-refresh .7s linear infinite; }
@keyframes spin-refresh { to { transform: rotate(360deg); } }
.btn-lista-ia:hover { background: rgba(16,185,129,.12) !important; color: #10b981 !important; border-color: rgba(16,185,129,.4) !important; }

/* Modal base (usado pelo modal de lista IA) */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 4000; padding: 16px;
}
.modal-box {
  background: var(--bg2); border: 1px solid var(--line);
  border-radius: 16px; width: 100%; max-width: 520px;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
  display: flex; flex-direction: column; max-height: 90vh; overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px 14px; border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.modal-header h3 { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; display: flex; align-items: center; gap: 8px; }
.modal-close { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; padding: 2px; }
.modal-close:hover { color: var(--text); }
.modal-body { padding: 18px 22px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; min-height: 0; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px; border-top: 1px solid var(--line); flex-shrink: 0; }
.btn-cancel { padding: 8px 16px; background: var(--bg3); border: 1px solid var(--line); border-radius: 8px; color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-salvar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: var(--accent); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity .15s; }
.btn-salvar:hover:not(:disabled) { opacity: .88; }
.btn-salvar:disabled { opacity: .45; cursor: not-allowed; }

.btn-processar-ia {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 20px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: opacity .15s;
  box-shadow: 0 2px 12px rgba(124,58,237,.4);
}
.btn-processar-ia:hover:not(:disabled) { opacity: .88; }
.btn-processar-ia:disabled { opacity: .45; cursor: not-allowed; }
.btn-processar-ia .material-symbols-outlined { font-size: 18px; }

/* Modal Lista IA */
.modal-lista-ia { max-width: 680px; width: 100%; max-height: 88vh; }
.lista-ia-hint { font-size: 13px; color: var(--text2); margin: 0 0 10px; }
.lista-ia-textarea {
  width: 100%; padding: 10px 12px; font-size: 13px; font-family: monospace;
  background: var(--bg3); border: 1px solid var(--line); border-radius: 8px;
  color: var(--text); resize: vertical; outline: none; box-sizing: border-box;
  line-height: 1.6;
}
.lista-ia-textarea:focus { border-color: rgba(99,102,241,.4); }
.lista-ia-summary { font-size: 12px; font-weight: 600; margin-bottom: 10px; display: flex; gap: 8px; }
.lista-ia-ok  { color: #10b981; }
.lista-ia-nok { color: #f59e0b; }
.lista-ia-resultados-wrap { display: flex; flex-direction: column; gap: 0; }
.lista-ia-resultados { display: flex; flex-direction: column; gap: 5px; }
.lista-ia-item { border-radius: 8px; border: 1px solid var(--border); overflow: hidden; }
.li-ok  { border-color: rgba(16,185,129,.35); }
.li-nok { border-color: rgba(239,68,68,.3); background: rgba(239,68,68,.04); }
.li-main-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 14px; }
.li-main-row:hover { background: var(--bg3); }
.lista-ia-item input[type=checkbox] { margin-top: 3px; flex-shrink: 0; width: 16px; height: 16px; cursor: pointer; }
.li-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.li-linha1 { margin: 0; font-size: 14px; font-weight: 500; color: var(--text); line-height: 1.5; }
.li-qty { font-size: 14px; font-weight: 800; color: #818cf8; }
.li-linha2 { margin: 0; font-size: 12px; font-weight: 500; color: #34d399; line-height: 1.5; }
.li-preco { display: inline-block; font-family: monospace; font-size: 11px; background: rgba(52,211,153,.15); color: #34d399; padding: 0 6px; border-radius: 4px; font-weight: 700; margin-left: 4px; }
.li-sem-match { color: #f87171 !important; font-style: italic; }
.li-ia-hint { color: #fb923c; margin-left: 4px; }

/* Botão editar produto */
.li-btn-edit {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--bg3);
  color: var(--text2); cursor: pointer; display: flex; align-items: center;
  justify-content: center; transition: all .15s; margin-left: auto;
}
.li-btn-edit:hover, .li-btn-edit.active { background: #6366f1; border-color: #6366f1; color: #fff; }

/* Dropdown de correção inline */
.li-correcao {
  border-top: 1px solid var(--border); padding: 8px 10px;
  background: var(--bg2); display: flex; flex-direction: column; gap: 6px;
}
.li-correcao-input {
  width: 100%; padding: 7px 10px; border-radius: 7px;
  border: 1px solid var(--border); background: var(--bg3);
  color: var(--text); font-size: 13px;
}
.li-correcao-input:focus { outline: none; border-color: #6366f1; }
.li-correcao-drop {
  max-height: 180px; overflow-y: auto; display: flex; flex-direction: column;
  gap: 2px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg3);
}
.li-correcao-item {
  display: flex; align-items: center; gap: 8px; padding: 7px 10px;
  background: none; border: none; text-align: left; cursor: pointer;
  font-size: 12px; color: var(--text); transition: background .1s; width: 100%;
}
.li-correcao-item:hover { background: var(--bg4); }
.li-correcao-item.li-sem-est { opacity: .55; }
.li-cor-nome  { flex: 1; font-weight: 600; }
.li-cor-preco { font-family: var(--mono); font-size: 11px; color: #10b981; flex-shrink: 0; }
.li-cor-est-zero { font-size: 10px; color: #f87171; background: rgba(239,68,68,.1); padding: 1px 5px; border-radius: 4px; }
.li-correcao-vazio { padding: 10px; font-size: 12px; color: var(--text2); text-align: center; }
.btn-add-lista-carrinho {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 20px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: opacity .15s;
  box-shadow: 0 2px 12px rgba(16,185,129,.4);
}
.btn-add-lista-carrinho:hover:not(:disabled) { opacity: .88; }
.btn-add-lista-carrinho:disabled { opacity: .45; cursor: not-allowed; }
.btn-add-lista-carrinho .material-symbols-outlined { font-size: 18px; }

.li-sem-estoque { display: flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 700; color: #f87171; background: rgba(239,68,68,.1); padding: 1px 6px; border-radius: 4px; }
.li-estoque-baixo { display: flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 700; color: #f59e0b; background: rgba(245,158,11,.1); padding: 1px 6px; border-radius: 4px; }
.search-ico {
  position: absolute;
  left: 11px;
  color: var(--muted);
  pointer-events: none;
  flex-shrink: 0;
}
.search-input {
  width: 100%;
  padding: 11px 40px;
  background: var(--bg3);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--text);
  font-family: var(--sans);
  font-size: 16.5px;
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
.cat-pill-promo { border-color: #f59e0b; color: #f59e0b; }
.cat-pill-promo.active { background: #f59e0b; border-color: #f59e0b; color: #fff; }
[data-theme="light"] .cat-pill-promo { border-color: #d97706; color: #d97706; }
[data-theme="light"] .cat-pill-promo.active { background: #d97706; border-color: #d97706; color: #fff; }

/* Products area */
.products-area {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  position: relative;
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

/* Loading state */
.loading-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px;
  position: absolute; inset: 0;
}
.loading-rings {
  position: relative; width: 56px; height: 56px;
}
.loading-ring {
  position: absolute; inset: 0; border-radius: 70%;
  border: 7px solid transparent; animation: ringPulse 1.4s ease-in-out infinite;
}
.r1 { border-top-color: #6366f1; animation-delay: 0s; }
.r2 { inset: 8px; border-top-color: #818cf8; animation-delay: .18s; }
.r3 { inset: 15px; border-top-color: #a5b4fc; animation-delay: .36s; }
@keyframes ringPulse {
  0%   { transform: rotate(0deg); opacity: 1; }
  50%  { opacity: .6; }
  100% { transform: rotate(360deg); opacity: 1; }
}
.loading-label {
  font-size: 19px; font-weight: 500; color: var(--text2);
  letter-spacing: .3px;
  animation: textBlink 1.4s ease-in-out infinite;
}
@keyframes textBlink {
  0%, 100% { opacity: .5; }
  50%       { opacity: 1; }
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prod-card {
  position: relative;
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px 20px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  text-align: left;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
}
.prod-card:hover {
  border-color: rgba(99,102,241,.4);
  background: var(--bg3);
}
.prod-card:active { opacity: .85; }
.prod-card.no-stock { opacity: .55; border-color: rgba(239,68,68,.25); }

.prod-avatar {
  width: 58px; height: 58px; flex-shrink: 0;
  border-radius: 12px; background: var(--bg3);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.prod-avatar img { width: 100%; height: 100%; object-fit: cover; }
.prod-avatar span { font-size: 24px; font-weight: 700; color: var(--muted); }

.prod-avatar-foto-wrap {
  width: 100%; height: 100%;
  position: relative;
  cursor: zoom-in;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(99,102,241,.35);
  box-sizing: border-box;
}
.prod-avatar-foto { width: 100%; height: 100%; object-fit: cover; display: block; }
.prod-avatar-zoom {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.42);
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity .15s;
}
.prod-avatar-foto-wrap:hover .prod-avatar-zoom { opacity: 1; }
.prod-avatar-zoom .material-symbols-outlined {
  font-size: 20px; color: #fff;
  background: rgba(0,0,0,.45);
  border-radius: 6px; padding: 2px;
}

.prod-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.prod-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
  white-space: normal;
}
.prod-code { font-size: 12px; color: var(--muted); font-family: var(--mono); }
.prod-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}
.prod-cat {
  font-size: 12px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  border-radius: 5px;
  padding: 2px 7px;
  font-weight: 600;
}
.prod-barras {
  font-size: 11px;
  color: var(--text2);
  font-family: var(--mono);
  background: var(--bg3);
  border-radius: 5px;
  padding: 2px 7px;
}

.prod-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.prod-price {
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 800;
  color: var(--accent2);
}
.prod-stock {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 800;
  padding: 5px 12px;
  border-radius: 7px;
  background: rgba(16,185,129,.12);
  color: var(--green);
  border: 1px solid rgba(16,185,129,.25);
  letter-spacing: .3px;
}
.prod-stock.low {
  font-size: 15px;
  padding: 5px 13px;
  background: rgba(245,158,11,.18);
  color: #f59e0b;
  border-color: rgba(245,158,11,.45);
  box-shadow: 0 0 8px rgba(245,158,11,.25);
}
.prod-stock.zero {
  font-size: 15px;
  padding: 5px 13px;
  background: rgba(239,68,68,.18);
  color: #f87171;
  border-color: rgba(239,68,68,.5);
  box-shadow: 0 0 10px rgba(239,68,68,.3);
  animation: pulse-stock .25s ease-in-out;
}

.prod-price-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.prod-price-original { font-size: 11px; color: var(--text2); text-decoration: line-through; font-family: var(--mono); }
.prod-price-promo { color: #ef4444 !important; }
.prod-promo-badge {
  font-size: 9px; font-weight: 800; letter-spacing: .6px;
  background: #ef4444; color: #fff;
  padding: 1px 5px; border-radius: 4px; line-height: 1.4;
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
  gap: 0;
  padding: 1px 0 0;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  background: var(--bg1);
}
.cart-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 4px;
  border: none;
  background: none;
  color: var(--muted);
  font-family: var(--sans);
  font-size: 16.5px;
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

/* ── ABA PAGAMENTO REDESIGN ───────────────────────────────────── */
.pag-panel { gap: 0; }

/* ① Totais */
.pag-totais {
  padding: 12px 16px 10px;
  background: linear-gradient(160deg, rgba(99,102,241,.13) 0%, rgba(99,102,241,.04) 100%);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.pag-total-principal { text-align: center; margin-bottom: 10px; }
.pag-total-label { display: block; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 2px; }
.pag-total-valor { display: block; font-family: var(--mono); font-size: 55px; font-weight: 800; color: var(--accent2); line-height: 1; letter-spacing: -1px; }
.pag-metricas { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 10px; }
.pag-metrica { flex: 1; text-align: center; padding: 6px 0; }
.pag-metrica-div { width: 1px; height: 30px; background: var(--line); flex-shrink: 0; }
.pm-label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin-bottom: 3px; }
.pm-val { display: block; font-family: var(--mono); font-size: 19px; font-weight: 800; color: var(--text); }
.pm-pago  { color: #10b981; }
.pm-falta { color: #f43f5e; }
.pm-troco { color: #10b981; }
.pm-zero  { color: #64748b; font-size: 16px; }
.pm-desc  { color: var(--text); }
.pag-progress-wrap { height: 5px; background: var(--bg3); border-radius: 99px; overflow: hidden; margin-bottom: 8px; }
.pag-progress-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #10b981); border-radius: 99px; transition: width .4s ease; }
.pag-completo { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: #10b981; }

/* ② Pills de forma de pagamento */
.pag-formas-wrap { padding: 10px 14px 8px; flex-shrink: 0; border-bottom: 1px solid var(--line); }
.pag-sec-label { font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: var(--muted); display: block; margin-bottom: 7px; }
.pag-formas-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pag-pill {
  padding: 10px 22px; border-radius: 99px; font-size: 13px; font-weight: 600;
  background: var(--bg3); border: 1.5px solid var(--line); color: var(--text2);
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.pag-pill:hover { border-color: #6366f1; color: #818cf8; background: rgba(99,102,241,.08); }
.pag-pill.active {
  background: #6366f1; border-color: #6366f1; color: #fff;
}

/* ③ Entrada de valor */
.pag-entrada { padding: 10px 14px 8px; flex-shrink: 0; border-bottom: 1px solid var(--line); }
.pag-entrada-row { display: flex; gap: 8px; align-items: stretch; }
.pag-entrada-input-wrap { flex: 1; display: flex; align-items: center; gap: 6px; background: var(--bg3); border: 1.5px solid var(--line); border-radius: 10px; padding: 0 12px; transition: border-color .15s; }
.pag-entrada-input-wrap:focus-within { border-color: #6366f1; background: var(--bg); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
.pag-rs { font-size: 13px; font-weight: 700; color: var(--muted); flex-shrink: 0; }
.pag-entrada-input { flex: 1; background: none; border: none; outline: none; font-family: var(--mono); font-size: 24px; font-weight: 700; color: var(--text); padding: 10px 0; width: 0; min-width: 0; }
.pag-entrada-input::placeholder { color: var(--muted); font-weight: 400; font-size: 20px; }
.pag-btn-add {
  display: flex; align-items: center; gap: 5px; padding: 0 16px;
  background: #6366f1;
  border: none; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer; flex-shrink: 0; transition: opacity .15s;
}
.pag-btn-add:hover { opacity: .85; }
.pag-btn-add .material-symbols-outlined { font-size: 18px; }
.pag-crediario-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }

/* ④ Chips de pagamentos + acréscimo */
.pag-lista-acrescimo { padding: 8px 14px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
.pag-chips { display: flex; flex-direction: column; gap: 5px; }
.pag-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; background: var(--bg3);
  border: 1px solid var(--line); border-radius: 9px;
}
.pag-chip-forma { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--text); }
.pag-chip-val { font-family: var(--mono); font-size: 13px; font-weight: 700; color: #818cf8; }
.pag-chip-del { background: none; border: none; color: var(--muted); cursor: pointer; display: flex; padding: 0; transition: color .15s; }
.pag-chip-del:hover { color: #f43f5e; }
.pag-chip-del .material-symbols-outlined { font-size: 16px; }

/* Acréscimo simples */
.pag-acrescimo-simples { display: flex; flex-direction: column; gap: 6px; }
.pag-acrescimo-badge { font-size: 10.5px; font-weight: 700; color: #34d399; background: rgba(52,211,153,.15); border: 1px solid rgba(52,211,153,.25); border-radius: 99px; padding: 1px 7px; margin-left: 6px; }
.pag-acrescimo-row { display: flex; align-items: center; gap: 8px; }
.pag-acrescimo-input-wrap {
  flex: 1; display: flex; align-items: center; gap: 6px;
  background: var(--bg3); border: 1.5px solid var(--line);
  border-radius: 9px; padding: 0 10px; transition: border-color .15s;
}
.pag-acrescimo-input-wrap:focus-within { border-color: #34d399; box-shadow: 0 0 0 3px rgba(52,211,153,.1); }
.pag-acrescimo-rs { font-size: 12px; font-weight: 700; color: var(--muted); flex-shrink: 0; }
.pag-acrescimo-input { flex: 1; background: none; border: none; outline: none; font-family: var(--mono); font-size: 18px; font-weight: 700; color: var(--text); padding: 7px 0; width: 0; min-width: 0; }
.pag-acrescimo-input::placeholder { color: var(--muted); font-size: 15px; font-weight: 400; }
.pag-acrescimo-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 7px 13px; background: var(--bg3); border: 1.5px solid var(--line);
  border-radius: 9px; color: var(--text2); font-size: 12px; font-weight: 700;
  cursor: pointer; flex-shrink: 0; transition: background .15s, border-color .15s, color .15s;
}
.pag-acrescimo-btn:hover { border-color: #34d399; color: #34d399; background: rgba(52,211,153,.08); }
.pag-acrescimo-btn .material-symbols-outlined { font-size: 14px; }



/* Chip acréscimo aplicado */
.pag-acrescimo-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px;
  background: rgba(52,211,153,.08); border: 1px solid rgba(52,211,153,.25);
  border-radius: 9px;
}
.pac-forma { flex: 1; font-size: 12.5px; font-weight: 600; color: #34d399; }
.pac-val { font-family: var(--mono); font-size: 13px; font-weight: 700; color: #34d399; }

/* ⑤ Footer finalizar */
.pag-footer { padding: 10px 14px 14px; flex-shrink: 0; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; }
.erro-finalizar {
  display: flex; align-items: center; gap: 8px;
  background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.35);
  border-radius: 8px; padding: 9px 12px;
  font-size: 12.5px; font-weight: 600; color: #f87171; line-height: 1.4;
}
.erro-finalizar .material-symbols-outlined { font-size: 17px; flex-shrink: 0; }
.erro-finalizar-close {
  margin-left: auto; background: none; border: none; color: #f87171;
  font-size: 18px; line-height: 1; cursor: pointer; padding: 0 2px; flex-shrink: 0;
}
.erro-finalizar-close:hover { color: #fca5a5; }
.pag-btn-finalizar {
  width: 100%; font-size: 17px !important; padding: 15px !important;
  border-radius: 12px !important; letter-spacing: .4px;
  box-shadow: 0 4px 18px rgba(16,185,129,.3);
  gap: 10px !important;
}
.pag-btn-finalizar:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(16,185,129,.4); transform: translateY(-1px); }
.pag-btn-finalizar:disabled { box-shadow: none; }

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
.summary-row.acrescimo span { color: #34d399; }
.acrescimo-section { margin-top: 8px; }
.acrescimo-add-btn { background: rgba(52,211,153,.15) !important; color: #34d399 !important; border-color: rgba(52,211,153,.3) !important; }
.acrescimo-add-btn:hover { background: rgba(52,211,153,.25) !important; }
.acrescimo-ok { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: #34d399; margin-top: 6px; font-weight: 600; }
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
  font-size: 15.5px;
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
.item-name { font-size: 19px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
.item-unit-price { font-size: 14.5px; color: var(--muted); font-family: var(--sans); }

.item-desc-btn {
  background: none; border: 1px solid var(--line); border-radius: 4px;
  color: var(--muted); cursor: pointer; font-size: 10px; font-weight: 700;
  line-height: 1; padding: 2px 5px; transition: all .15s;
}
.item-desc-btn:hover, .item-desc-btn.active { background: rgba(99,102,241,.15); border-color: var(--accent); color: var(--accent2); }

.item-desc-inline {
  display: flex; align-items: center; gap: 5px; flex: 1;
}

/* Badge de desconto aplicado */
.disc-badge {
  display: flex; align-items: center;
  border-radius: 20px;
  border: 1px solid rgba(245,158,11,.4);
  background: rgba(245,158,11,.12);
  overflow: hidden;
  height: 26px;
  flex-shrink: 0;
}
.disc-badge-btn {
  display: flex; align-items: center; gap: 3px;
  padding: 0 8px 0 7px;
  background: transparent; border: none;
  color: #f59e0b;
  font-size: 11px; font-weight: 700;
  cursor: pointer;
  height: 100%;
  transition: background .15s;
}
.disc-badge-btn .material-symbols-outlined { font-size: 12px; }
.disc-badge-btn:hover { background: rgba(245,158,11,.15); }
.disc-badge-remove {
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 100%;
  background: transparent; border: none; border-left: 1px solid rgba(245,158,11,.3);
  color: #f59e0b; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: background .15s;
  flex-shrink: 0;
}
.disc-badge-remove:hover { background: rgba(245,158,11,.25); }

/* Estado de edição */
.desc-type-toggle.compact .desc-type-btn { padding: 4px 8px; font-size: 11px; height: 26px; }
.item-desc-input { width: 60px !important; padding: 4px 6px !important; height: 26px !important; font-size: 12px !important; }
.desc-confirm-btn { background: var(--green); color: #fff; border: none; border-radius: 4px; padding: 0; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; font-weight: bold; transition: all .15s; flex-shrink: 0; }
.desc-confirm-btn:hover { opacity: .8; }
.desc-cancel-btn { background: transparent; color: var(--text2); border: 1px solid var(--border); border-radius: 4px; padding: 0; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; font-weight: 700; transition: all .15s; flex-shrink: 0; }
.desc-cancel-btn:hover { background: rgba(244,63,94,.1); border-color: rgba(244,63,94,.4); color: #f43f5e; }

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
.qty-input {
  font-family: var(--mono); font-size: 13px; font-weight: 700;
  width: 42px; text-align: center; background: var(--bg2);
  border: 1px solid var(--line); border-radius: 5px; color: var(--text);
  padding: 2px 4px; height: 26px;
  -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button { -webkit-appearance: none; appearance: none; margin: 0; }
.qty-input:focus { outline: none; border-color: var(--primary); }

.item-total { font-family: var(--mono); font-size: 22.5px; font-weight: 700; color: var(--accent2); margin-left: auto; text-align: right; }
.item-del { 
  background: rgba(239, 68, 68, 0.1); 
  border: 1px solid rgba(239, 68, 68, 0.2); 
  border-radius: 6px; 
  color: #ef4444; 
  cursor: pointer; 
  width: 50px; 
  height: 28px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  transition: all .15s; 
  flex-shrink: 0;
}
.item-del:hover { background: #ef4444; color: #fff; }

[data-theme="light"]

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
.section-label { display: block; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin-bottom: 5px; }
.opt { font-weight: 400; text-transform: none; letter-spacing: 0; }

.cart-input {
  width: 100%;
  padding: 7px 9px;
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
.cart-input.pag-val { width: 110px; flex-shrink: 0; font-size: 16px; font-weight: 700; text-align: right; padding: 10px 10px; height: 44px; }
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
.pag-select-full {
  width: 100%;
  padding: 10px 12px;
  font-size: 15px;
  font-weight: 600;
  background: var(--bg3);
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--text);
  font-family: var(--sans);
  outline: none;
  height: 46px;
}
.pag-row-col { display: flex; flex-direction: column; gap: 8px; }
.pag-val-big {
  width: 100%;
  padding: 10px 14px;
  font-size: 22px;
  font-weight: 800;
  font-family: var(--mono);
  text-align: right;
  background: var(--bg3);
  border: 2px solid var(--line);
  border-radius: 10px;
  color: var(--accent2);
  outline: none;
  box-sizing: border-box;
  transition: border-color .15s;
}
.pag-val-big:focus { border-color: rgba(99,102,241,.5); }
.pag-val-big::placeholder { color: var(--muted); font-weight: 400; font-size: 18px; }
.pag-add-full {
  width: 100%;
  height: 46px;
  background: var(--accent);
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity .15s;
}
.pag-add-full .material-symbols-outlined { font-size: 20px; }
.pag-add-full:hover { opacity: .87; }
.pag-row { display: flex; gap: 6px; align-items: center; }

.pag-list { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.pag-item { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: var(--bg3); border-radius: 6px; border: 1px solid var(--line); }
.pag-forma { flex: 1; font-size: 12px; font-weight: 500; text-transform: capitalize; color: var(--text); }
.pag-valor { font-family: var(--mono); font-size: 12px; color: var(--accent2); }
.pag-del { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; }
.pag-del:hover { color: var(--red); }

.pag-status { margin-top: 8px; font-size: 12px; color: var(--muted); display: flex; gap: 10px; }
.crediario-fields { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.crediario-row { display: flex; gap: 12px; }
.crediario-warn { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; color: #f59e0b; background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.25); border-radius: 7px; padding: 5px 10px; }
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
.cliente-search-row { display: flex; align-items: center; gap: 6px; }
.cliente-search-row .cliente-search-wrap { flex: 1; }
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

.btn-novo-cliente {
  background: linear-gradient(135deg, #6366f1, #818cf8);
  border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  transition: transform .15s, box-shadow .15s, opacity .15s;
  box-shadow: 0 2px 8px rgba(99,102,241,.35);
}
.btn-novo-cliente:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(99,102,241,.45); }
.btn-novo-cliente:active { transform: translateY(0); opacity: .85; }
.btn-novo-cliente .material-symbols-outlined { font-size: 18px; }

/* Modal Novo Cliente */
.ncli-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 4000; padding: 16px;
  animation: fadeIn .18s ease;
  pointer-events: all;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }

.ncli-modal {
  width: 740px; max-width: 96vw; max-height: 90vh;
  display: flex; flex-direction: column;
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 32px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04);
  overflow: hidden;
  animation: slideUp .22s cubic-bezier(.22,.68,0,1.2);
}
.ncli-header-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 28px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(129,140,248,.04));
}
.ncli-header-icon {
  width: 44px; height: 44px; border-radius: 13px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99,102,241,.35);
}
.ncli-header-icon .material-symbols-outlined { font-size: 22px; color: #fff; }
.ncli-header-text h3 { font-size: 16px; font-weight: 700; color: var(--text); margin: 0 0 2px; }
.ncli-header-text p { font-size: 12px; color: var(--text2); margin: 0; }
.ncli-close-btn {
  margin-left: auto; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2);
  color: #f87171; cursor: pointer; display: flex; align-items: center;
  justify-content: center; width: 36px; height: 36px; border-radius: 10px;
  font-size: 22px; line-height: 1; transition: background .15s, color .15s, transform .1s; flex-shrink: 0;
}
.ncli-close-btn:hover { background: rgba(239,68,68,.2); color: #ef4444; transform: scale(1.08); }

.ncli-body  { overflow-y: auto; padding: 20px 24px; flex: 1; }
.ncli-form  { display: flex; flex-direction: column; gap: 16px; }
.ncli-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ncli-field { display: flex; flex-direction: column; gap: 5px; }
.ncli-field.full { grid-column: 1 / -1; }
.ncli-field label { font-size: .72rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .5px; }
.ncli-input {
  padding: .55rem .8rem; border: 1.5px solid var(--border);
  border-radius: 9px; background: var(--bg); color: var(--text);
  font-size: .88rem; outline: none; transition: border-color .15s, box-shadow .15s;
  width: 100%; box-sizing: border-box;
}
.ncli-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.12); background: var(--bg); }
.ncli-cep-wrap { position: relative; display: flex; align-items: center; }
.ncli-cep-wrap .ncli-input { flex: 1; }
.ncli-spin { position: absolute; right: 10px; width: 13px; height: 13px; border: 2px solid var(--border); border-top-color: #6366f1; border-radius: 50%; animation: spin .6s linear infinite; }
.ncli-check-label { display: flex; align-items: center; gap: 8px; font-size: .88rem; color: var(--text); cursor: pointer; font-weight: normal !important; text-transform: none !important; letter-spacing: 0 !important; }
.ncli-map-wrap { border-radius: 12px; overflow: hidden; height: 180px; border: 1.5px solid var(--border); }
.ncli-map { width: 100%; height: 100%; display: block; border: none; }
.ncli-erro { color: #f87171; font-size: .82rem; background: rgba(220,38,38,.1); border: 1px solid rgba(220,38,38,.2); padding: .4rem .75rem; border-radius: 8px; }
.ncli-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 24px 18px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
  background: var(--bg);
}
.ncli-btn-cancel {
  padding: 9px 18px; background: var(--bg3); border: 1px solid var(--line);
  border-radius: 10px; color: var(--text2); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background .15s;
}
.ncli-btn-cancel:hover { background: var(--bg4); }
.ncli-btn-save {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 20px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  border: none; border-radius: 10px; color: #fff;
  font-size: 13px; font-weight: 700; cursor: pointer;
  box-shadow: 0 2px 10px rgba(99,102,241,.35);
  transition: opacity .15s, transform .15s;
}
.ncli-btn-save:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.ncli-btn-save:disabled { opacity: .5; cursor: not-allowed; transform: none; }

.cliente-stats { display: flex; align-items: center; gap: 6px; padding: 5px 10px; background: var(--bg3); border-radius: 7px; flex-wrap: wrap; margin-top: 6px; }
.cs-item { display: flex; align-items: baseline; gap: 4px; }
.cs-val   { font-size: 11.5px; font-weight: 700; color: var(--text); }
.cs-label { font-size: 15px; color: var(--text2); }
.cs-sep   { font-size: 10px; color: var(--text2); }
.cs-ok    .cs-val { color: var(--green); }
.cs-danger .cs-val { color: #f43f5e; }
.cs-badge-inadimpl { font-size: 10px; font-weight: 700; padding: 1px 6px; background: rgba(244,63,94,.15); border: 1px solid rgba(244,63,94,.3); border-radius: 4px; color: #f43f5e; }

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
.drop-nome  { font-size: 13px; font-weight: 500; color: var(--text); }
.drop-razao { font-size: 12px; font-weight: 400; color: var(--text2); }
.drop-sub   { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
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
.decorador-aviso {
  font-size: 11px;
  color: var(--amber, #f59e0b);
  background: rgba(245,158,11,.08);
  border: 1px solid rgba(245,158,11,.25);
  border-radius: 6px;
  padding: 5px 8px;
  margin-bottom: 4px;
}
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
.btn-remove-dec {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.25);
  border-radius: 7px; color: #f87171; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: background .15s;
}
.btn-remove-dec:hover { background: rgba(239,68,68,.2); }

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
.btn-danfe {
  display: flex; align-items: center; gap: 6px; margin-top: 8px;
  background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.35);
  color: #6ee7b7; border-radius: 6px; padding: 6px 10px; font-size: 12px;
  font-weight: 600; cursor: pointer; width: 100%;
  justify-content: center; transition: background .15s;
}
.btn-danfe:hover { background: rgba(16,185,129,.25); }

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
@keyframes pulse-stock {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,.5); }
  70%  { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}

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
.btn-orcamento .hotkey-badge { margin-left: 0; }
.btn-orcamento.copiado { color: var(--green); border-color: rgba(16,185,129,.4); background: rgba(16,185,129,.08); }
.btn-orcamento--full { width: 100%; }

/* ── Toast ──────────────────────────────────────────────────── */
.pdv-toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px;
  border-radius: 14px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 12px 40px rgba(0,0,0,.55);
  white-space: nowrap;
  pointer-events: none;
  min-width: 280px;
  justify-content: center;
}
.pdv-toast svg { width: 20px; height: 20px; flex-shrink: 0; }
.pdv-toast.ok  {
  background: #052e16; color: #6ee7b7;
  border: 1px solid rgba(16,185,129,.4);
  box-shadow: 0 12px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(16,185,129,.15);
}
.pdv-toast.warn {
  background: #2d1a00; color: #fcd34d;
  border: 1px solid rgba(245,158,11,.45);
  box-shadow: 0 12px 40px rgba(0,0,0,.55), 0 0 16px rgba(245,158,11,.15);
}
.pdv-toast.err {
  background: #2d0707; color: #fca5a5;
  border: 1px solid rgba(239,68,68,.45);
  box-shadow: 0 12px 40px rgba(0,0,0,.55), 0 0 20px rgba(239,68,68,.2);
}

.toast-enter-active { transition: all .2s cubic-bezier(.34,1.56,.64,1); }
.toast-leave-active { transition: all .25s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(20px) scale(.9); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(20px) scale(.95); }

/* Mobile */
@media (max-width: 900px) {
  /* Remove estilos antigos de cart mobile que travavam a altura */
  .cart { border-top: none; max-height: none; }
}

/* Det pills (vendedor / tipo de venda) */
.det-pills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}
.det-pill {
  padding: 9px 22px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg3);
  color: var(--text2);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
  white-space: nowrap;
}
.det-pill:hover { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.35); color: var(--text); }
.det-pill.active { background: #6366f1; border-color: #6366f1; color: #fff; font-weight: 600; }
.det-pills-empty { font-size: 12px; color: var(--text2); font-style: italic; }

/* Vendedor */
.vendedor-section { border-top: 2px solid var(--accent); background: rgba(99,102,241,.04); }
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
[data-theme="light"] .pm-desc        { color: #111827; }
[data-theme="light"] .pag-pill       { background: #f1f5f9; border-color: #cbd5e1; color: #475569; }
[data-theme="light"] .pag-pill:hover { background: #e0e7ff; border-color: #6366f1; color: #4338ca; }
[data-theme="light"] .pag-pill.active { background: #4338ca; border-color: #4338ca; color: #fff; }
[data-theme="light"] .pag-chip       { background: #f8fafc; border-color: rgba(0,0,0,.12); }
[data-theme="light"] .pag-acrescimo-chip { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.25); }
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
[data-theme="light"] .disc-badge { background: rgba(180,83,9,.08); border-color: rgba(180,83,9,.3); }
[data-theme="light"] .disc-badge-btn { color: #b45309; }
[data-theme="light"] .disc-badge-remove { color: #b45309; border-left-color: rgba(180,83,9,.25); }
[data-theme="light"] .nfce-result.ok  { background: rgba(5,150,105,.08); border-color: rgba(5,150,105,.25); color: #065f46; }
[data-theme="light"] .nfce-result.err { background: rgba(220,38,38,.08); border-color: rgba(220,38,38,.25); color: #991b1b; }
[data-theme="light"] .pdv-toast.ok   { background: #065f46; color: #d1fae5; border-color: rgba(5,150,105,.4); }
[data-theme="light"] .pdv-toast.warn { background: #78350f; color: #fef3c7; border-color: rgba(245,158,11,.4); }
[data-theme="light"] .pdv-toast.err  { background: #7f1d1d; color: #fee2e2; border-color: rgba(220,38,38,.4); box-shadow: 0 12px 40px rgba(0,0,0,.3), 0 0 20px rgba(239,68,68,.15); }
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
    background: rgba(99,102,241,0.06);
  }
  .vendedor-aviso { font-size: 11px; color: var(--amber); margin-top: 4px; display: block; }
  .det-pill { padding: 5px 12px; font-size: 12px; }

  .cart-actions { padding: 8px 12px; gap: 4px; }
  .btn-finalizar { padding: 10px; font-size: 13.5px; height: 44px; }
  .btn-recibo, .btn-contrato, .btn-nfce { padding: 7px; font-size: 12px; height: 36px; }

  .total-hero { padding: 10px 14px 8px; }
  .total-hero-value { font-size: 40px; }
  .total-hero-label { font-size: 10px; margin-bottom: 2px; }
  .psc-val { font-size: 17px; }
  .cart-input.pag-val { width: 100px; font-size: 15px; }

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
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
}
.psc-row:last-child { border-bottom: none; }
.psc-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.psc-val {
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 800;
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
  padding: 10px 16px;
  color: var(--green);
  font-size: 50px;
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

/* ── Aba Impressão ──────────────────────────────────────── */
.tab-impressao { color: #10b981; }
.tab-impressao.active { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.35); color: #10b981; }
.tab-impressao:disabled { opacity: .35; }

.tab-impressao-panel { display: flex; flex-direction: column; gap: 20px; padding: 20px; height: 100%; justify-content: center; }

.impressao-venda-ok {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 24px 0 8px;
}
.impressao-titulo { font-size: 1.2rem; font-weight: 800; color: #10b981; }
.impressao-num    { font-size: .95rem; color: var(--text2); font-weight: 600; }

.impressao-acoes {
  display: flex; flex-direction: column; gap: 10px;
}

.btn-imp-acao {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 13px 16px; border-radius: 12px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  border: none; transition: opacity .15s, transform .1s;
}
.btn-imp-acao:active { transform: scale(.98); }
.btn-imp-acao:disabled { opacity: .4; cursor: not-allowed; }
.btn-imp-acao .material-symbols-outlined { font-size: 20px; }

.btn-recibo  { background: var(--bg3); border: 1px solid var(--border); color: var(--text); }
.btn-recibo:hover:not(:disabled) { background: var(--bg4, var(--bg2)); }

.btn-contrato { background: var(--bg3); border: 1px solid var(--border); color: var(--text); }
.btn-contrato:hover:not(:disabled) { background: var(--bg4, var(--bg2)); }

.btn-imp-acao.btn-nfce {
  background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.3); color: var(--primary);
}
.btn-imp-acao.btn-nfce:hover:not(:disabled) { background: rgba(99,102,241,.18); }

.btn-nova-venda {
  background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff;
  box-shadow: 0 4px 16px rgba(99,102,241,.35); margin-top: 4px;
}
.btn-nova-venda:hover { opacity: .88; }

.hotkey-badge {
  margin-left: auto; font-size: 10px; font-weight: 700; font-family: var(--mono, monospace);
  background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.3);
  border-radius: 4px; padding: 1px 5px; letter-spacing: .5px;
}

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

<style scoped>
/* ── Lightbox foto produto ── */
.pdv-lb-backdrop {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.88);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.pdv-lb-img {
  max-width: 90vw; max-height: 88vh;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(0,0,0,.6);
}
.pdv-lb-close {
  position: absolute; top: 16px; right: 16px;
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,.12); border: none;
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.pdv-lb-close:hover { background: rgba(255,255,255,.22); }
.pdv-lb-close .material-symbols-outlined { font-size: 22px; }

.pdv-lb-enter-active, .pdv-lb-leave-active { transition: opacity .18s; }
.pdv-lb-enter-from,  .pdv-lb-leave-to     { opacity: 0; }
</style>

