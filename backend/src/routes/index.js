const express         = require('express');
const authRoutes      = require('./auth');
const caixaRoutes     = require('./caixa');
const estoqueRoutes   = require('./estoque');
const vendasRoutes    = require('./vendas');
const permissoesRoutes = require('./permissoes');
const nfceRoutes      = require('./nfce');
const relatoriosRoutes = require('./relatorios');
const pontoRoutes      = require('./ponto');
const valesRoutes      = require('./vales');
const iaRoutes         = require('./ia');
const projetosRoutes        = require('./projetos');
const pedidosCompraRoutes   = require('./pedidosCompra');
const contasReceberRoutes   = require('./contasReceber');
const pdvRoutes             = require('./pdv');
const clientesRoutes        = require('./clientes');
const financeiroRoutes      = require('./financeiro');
const despesasRoutes        = require('./despesas');

function setupRoutes(app, authMiddleware, permissoesMiddleware) {
  // Health
  app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Auth (público)
  app.use('/api/auth', authRoutes);

  // Permissões (autenticado)
  app.get('/api/permissoes/:usuario_pk', authMiddleware, permissoesRoutes);

  // Rotas protegidas
  app.use('/api/caixa',   authMiddleware, permissoesMiddleware, caixaRoutes);
  app.use('/api/estoque', authMiddleware, permissoesMiddleware, estoqueRoutes);
  app.use('/api/vendas',  authMiddleware, permissoesMiddleware, vendasRoutes);
  app.use('/api/nfce',    authMiddleware, permissoesMiddleware, nfceRoutes);
  app.use('/api/relatorios', authMiddleware, permissoesMiddleware, relatoriosRoutes);
  app.use('/api/ponto',   authMiddleware, permissoesMiddleware, pontoRoutes);
  app.use('/api/vales',  authMiddleware, permissoesMiddleware, valesRoutes);
  app.use('/api/ia',       authMiddleware, iaRoutes);
  app.use('/api/projetos',       authMiddleware, permissoesMiddleware, projetosRoutes);
  app.use('/api/pedidos-compra',  authMiddleware, permissoesMiddleware, pedidosCompraRoutes);
  app.use('/api/contas-receber', authMiddleware, permissoesMiddleware, contasReceberRoutes);
  app.use('/api/pdv',           authMiddleware, permissoesMiddleware, pdvRoutes);
  app.use('/api/clientes',      authMiddleware, clientesRoutes);
  app.use('/api/financeiro',    authMiddleware, permissoesMiddleware, financeiroRoutes);
  app.use('/api/despesas',      authMiddleware, permissoesMiddleware, despesasRoutes);
}

module.exports = setupRoutes;
