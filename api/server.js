let app;
try {
  app = require('../backend/src/app');
} catch (err) {
  // Se o app falhar ao carregar, retorna o erro real para diagnóstico
  app = (req, res) => {
    res.status(500).json({ erro: 'Falha ao inicializar backend', detalhe: err.message, stack: err.stack });
  };
}
module.exports = app;
