const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║      Festou Backend Express                          ║
║      Rodando em http://localhost:${PORT}                  ║
║      Ambiente: ${process.env.NODE_ENV || 'development'}                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});
