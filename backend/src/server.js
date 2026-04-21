require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const permissoesMiddleware = require('./middleware/permissoes');
const setupRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, cb) => {
    // Permite localhost, 127.0.0.1 ou qualquer IP de rede local (192.168.*, 10.*, 172.*)
    const localIpRegex = /^http:\/\/(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/;
    if (!origin || localIpRegex.test(origin)) return cb(null, true);
    cb(new Error('CORS não permitido: ' + origin));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

setupRoutes(app, authMiddleware, permissoesMiddleware);

app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);
  res.status(500).json({
    erro: err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║      Festou Backend Express                          ║
║      Rodando em http://localhost:${PORT}                  ║
║      Ambiente: ${process.env.NODE_ENV || 'development'}                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});