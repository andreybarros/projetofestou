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

// Modal de Confirmação (substitui confirm() nativo do browser)
window.showConfirm = function (mensagem, titulo) {
  return new Promise(function (resolve) {
    var modal = document.getElementById('confirm-modal-global');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'confirm-modal-global';
      modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;align-items:center;justify-content:center;padding:20px;font-family:DM Sans,sans-serif';
      modal.innerHTML = '<div style="background:var(--mc,#fff);border-radius:14px;padding:28px 26px;max-width:420px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.2)">' +
        '<h3 id="confirm-modal-title" style="font-size:16px;font-weight:700;color:#1e1b4b;margin-bottom:10px"></h3>' +
        '<p id="confirm-modal-msg" style="font-size:14px;color:#6b7280;line-height:1.5;margin-bottom:22px"></p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button id="confirm-modal-cancel" style="padding:9px 18px;border-radius:8px;border:1px solid #c7d2fe;background:#fff;color:#4f46e5;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Cancelar</button>' +
        '<button id="confirm-modal-ok" style="padding:9px 18px;border-radius:8px;border:none;background:#4f46e5;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">Confirmar</button>' +
        '</div></div>';
      document.body.appendChild(modal);
    }
    document.getElementById('confirm-modal-title').textContent = titulo || 'Confirmar';
    document.getElementById('confirm-modal-msg').textContent = mensagem;
    modal.style.display = 'flex';

    function fechar(res) {
      modal.style.display = 'none';
      document.getElementById('confirm-modal-ok').onclick = null;
      document.getElementById('confirm-modal-cancel').onclick = null;
      resolve(res);
    }
    document.getElementById('confirm-modal-ok').onclick = function () { fechar(true); };
    document.getElementById('confirm-modal-cancel').onclick = function () { fechar(false); };
  });
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
