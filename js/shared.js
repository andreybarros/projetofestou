// Configuração Supabase
const SUPA_URL = "https://lflpzskcpcsfzagackuy.supabase.co";
const SUPA_KEY = "sb_publishable_5jo3h0in7z4PPCsw4K5RjA_g-TVT_NP";

// Inicializa o cliente Supabase de forma segura
window.initSupabase = function () {
  if (window.supabase && window.supabase.from) return window.supabase;
  if (typeof supabase !== 'undefined') {
    window.supabase = supabase.createClient(SUPA_URL, SUPA_KEY);
    return window.supabase;
  }
  return null;
};
window.initSupabase();

// Estado Global com Persistência em Sessão
window.filialLogada = JSON.parse(sessionStorage.getItem('festou_filial') || 'null');
window.operadorLogado = JSON.parse(sessionStorage.getItem('festou_operador') || 'null');
window._editData = null;

window.setSessao = function (filial, operador) {
  window.filialLogada = filial;
  window.operadorLogado = operador;
  sessionStorage.setItem('festou_filial', JSON.stringify(filial));
  sessionStorage.setItem('festou_operador', JSON.stringify(operador));
};

// Gestão de Tema
window.aplicarTema = function (t) {
  document.documentElement.setAttribute('data-theme', t);
  const themeLabel = document.getElementById('theme-label');
  if (themeLabel) themeLabel.textContent = t === 'dark' ? '🌙 Dark' : '☀️ Light';
  try { localStorage.setItem('tema', t) } catch (e) { }
};

window.alternarTema = function () {
  const temaAtual = document.documentElement.getAttribute('data-theme');
  window.aplicarTema(temaAtual === 'dark' ? 'light' : 'dark');
};

// Toast Notifications
window.showToast = function (msg, tipo = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = (tipo === 'success' ? '✅ ' : '❌ ') + msg;
  t.className = 'show ' + tipo;
  setTimeout(() => t.className = '', 3500);
};

// Carregador de Módulos (Fragments)
window.carregarModulo = window.ir = function (arquivo, navId) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (navId) document.getElementById(navId)?.classList.add('active');

  fetch(arquivo)
    .then(r => {
      if (!r.ok) throw new Error('Módulo não encontrado: ' + arquivo);
      return r.text();
    })
    .then(html => {
      const content = document.getElementById('content');
      if (!content) return;
      content.innerHTML = html;
      content.scrollTo(0, 0);

      // Re-executa scripts dentro do fragmento
      content.querySelectorAll('script').forEach(old => {
        const s = document.createElement('script');
        s.textContent = old.textContent;
        document.body.appendChild(s);
        old.remove();
      });
    })
    .catch(err => {
      const content = document.getElementById('content');
      if (content) content.innerHTML = `<p style="color:#dc2626;padding:20px;text-align:center">❌ ${err.message}</p>`;
    });
};

// Inicialização de Tema
(function () {
  try {
    const temaSalvo = localStorage.getItem('tema') || 'light';
    window.aplicarTema(temaSalvo);
  } catch (e) {
    window.aplicarTema('light');
  }
})();
