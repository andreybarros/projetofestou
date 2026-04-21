const express         = require('express');
const authRoutes      = require('./auth');
const caixaRoutes     = require('./caixa');
const estoqueRoutes   = require('./estoque');
const vendasRoutes    = require('./vendas');
const permissoesRoutes = require('./permissoes');
const nfceRoutes      = require('./nfce');

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
}

module.exports = setupRoutes;
