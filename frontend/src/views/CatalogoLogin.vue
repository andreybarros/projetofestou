<template>
  <div class="cl-page">

    <!-- Fundo animado -->
    <div class="cl-bg">
      <div class="cl-bg-glow cl-bg-glow--a"></div>
      <div class="cl-bg-glow cl-bg-glow--b"></div>
      <div class="cl-bg-grid"></div>
    </div>

    <div class="cl-wrap">

      <!-- Logo + identidade -->
      <div class="cl-brand">
        <img src="/img/logo_fundo_transp.png" alt="Logo" class="cl-logo" />
        <div class="cl-divider"></div>
        <div class="cl-catalog-tag">Catálogo</div>
        <h1 class="cl-catalog-name">{{ catalogo?.nome || '…' }}</h1>
        <p v-if="catalogo?.descricao" class="cl-catalog-desc">{{ catalogo.descricao }}</p>
      </div>

      <!-- Card de login -->
      <div class="cl-card">

        <div class="cl-card-header">
          <div class="cl-card-icon">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div>
            <h2 class="cl-card-title">Acesse sua conta</h2>
            <p class="cl-card-sub">Veja seus orçamentos e aprove direto aqui</p>
          </div>
        </div>

        <div class="cl-form">
          <div class="cl-field" :class="{ 'cl-field--error': erros.email }">
            <label class="cl-label">E-mail</label>
            <div class="cl-input-wrap">
              <span class="material-symbols-outlined cl-input-ico">mail</span>
              <input
                v-model="form.email"
                type="email"
                class="cl-input"
                placeholder="seu@email.com"
                autocomplete="email"
                @keydown.enter="focarTelefone"
              />
            </div>
            <span v-if="erros.email" class="cl-err">{{ erros.email }}</span>
          </div>

          <div class="cl-field" :class="{ 'cl-field--error': erros.telefone }">
            <label class="cl-label">Telefone cadastrado</label>
            <div class="cl-input-wrap">
              <span class="material-symbols-outlined cl-input-ico">phone</span>
              <input
                ref="inputTelefone"
                v-model="form.telefone"
                type="tel"
                class="cl-input"
                placeholder="(92) 99999-9999"
                autocomplete="tel"
                @input="mascaraTelefone"
                @keydown.enter="entrar"
              />
            </div>
            <span v-if="erros.telefone" class="cl-err">{{ erros.telefone }}</span>
          </div>

          <div v-if="erroGeral" class="cl-erro-geral">
            <span class="material-symbols-outlined">error</span>
            {{ erroGeral }}
          </div>

          <button class="cl-btn-entrar" :disabled="entrando" @click="entrar">
            <span v-if="entrando" class="cl-spinner"></span>
            <span v-else class="material-symbols-outlined">login</span>
            {{ entrando ? 'Verificando…' : 'Acessar Minha Conta' }}
          </button>
        </div>

        <div class="cl-separator">
          <span>ou</span>
        </div>

        <button class="cl-btn-pular" @click="$emit('pular')">
          Continuar sem login
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>

        <p class="cl-rodape">
          Não tem cadastro?
          <span class="cl-rodape-link">Entre em contato com a loja</span>
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const props = defineProps({
  catalogo: Object,
  token:    String,
});

const emit = defineEmits(['loginOk', 'pular']);

const inputTelefone = ref(null);
const entrando      = ref(false);
const erroGeral     = ref('');
const erros         = ref({ email: '', telefone: '' });

const form = ref({ email: '', telefone: '' });

function focarTelefone() {
  inputTelefone.value?.focus();
}

function mascaraTelefone(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  else if (v.length) v = `(${v}`;
  form.value.telefone = v;
}

function validar() {
  erros.value = { email: '', telefone: '' };
  let ok = true;
  if (!form.value.email?.trim()) {
    erros.value.email = 'Informe seu e-mail.';
    ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    erros.value.email = 'E-mail inválido.';
    ok = false;
  }
  if (!form.value.telefone?.replace(/\D/g, '')) {
    erros.value.telefone = 'Informe seu telefone.';
    ok = false;
  }
  return ok;
}

async function entrar() {
  erroGeral.value = '';
  if (!validar()) return;
  entrando.value = true;
  try {
    const { data } = await axios.post(
      `/api/catalogo-publico/${props.token}/cliente/login`,
      {
        email:    form.value.email.trim().toLowerCase(),
        telefone: form.value.telefone.replace(/\D/g, ''),
      }
    );
    // Persiste sessão
    localStorage.setItem(`cl_sessao_${props.token}`, data.sessao_token);
    emit('loginOk', { cliente: data.cliente, sessaoToken: data.sessao_token });
  } catch (e) {
    const msg = e.response?.data?.erro;
    if (e.response?.status === 404 || e.response?.status === 401) {
      erroGeral.value = 'E-mail ou telefone não encontrado. Verifique seus dados ou continue sem login.';
    } else {
      erroGeral.value = msg || 'Erro ao verificar. Tente novamente.';
    }
  } finally {
    entrando.value = false;
  }
}
</script>

<style scoped>
/* ─── Reset & base ─── */
.cl-page {
  min-height: 100dvh;
  height: 100dvh;
  overflow-y: auto;
  background: #07080d;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px 48px;
  position: relative;
}

/* ─── Fundo animado ─── */
.cl-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.cl-bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: .35;
  animation: drift 12s ease-in-out infinite alternate;
}
.cl-bg-glow--a {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #6366f1 0%, transparent 70%);
  top: -120px; left: -100px;
  animation-duration: 14s;
}
.cl-bg-glow--b {
  width: 380px; height: 380px;
  background: radial-gradient(circle, #4f46e5 0%, transparent 70%);
  bottom: -80px; right: -80px;
  animation-duration: 10s;
  animation-direction: alternate-reverse;
}
@keyframes drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(30px, 20px) scale(1.08); }
}

.cl-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px);
  background-size: 44px 44px;
}

/* ─── Layout ─── */
.cl-wrap {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  animation: fadeUp .5s cubic-bezier(.22,.68,0,1.2) both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Brand ─── */
.cl-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.cl-logo {
  height: 42px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: .9;
}
.cl-divider {
  width: 32px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99,102,241,.6), transparent);
  margin: 4px 0;
}
.cl-catalog-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .18em;
  color: rgba(99,102,241,.8);
}
.cl-catalog-name {
  font-size: clamp(22px, 5vw, 28px);
  font-weight: 900;
  color: #fff;
  margin: 0;
  letter-spacing: -.4px;
  line-height: 1.15;
  text-shadow: 0 0 40px rgba(99,102,241,.4);
}
.cl-catalog-desc {
  font-size: 13px;
  color: rgba(255,255,255,.4);
  margin: 0;
  max-width: 300px;
  line-height: 1.5;
}

/* ─── Card ─── */
.cl-card {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 20px;
  padding: 28px 24px 24px;
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 0 1px rgba(99,102,241,.08),
    0 24px 64px rgba(0,0,0,.5),
    inset 0 1px 0 rgba(255,255,255,.05);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cl-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
}
.cl-card-icon {
  width: 44px; height: 44px;
  background: rgba(99,102,241,.15);
  border: 1px solid rgba(99,102,241,.25);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cl-card-icon .material-symbols-outlined { font-size: 22px; color: #818cf8; }
.cl-card-title {
  font-size: 17px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 2px;
  letter-spacing: -.2px;
}
.cl-card-sub {
  font-size: 12px;
  color: rgba(255,255,255,.45);
  margin: 0;
  line-height: 1.4;
}

/* ─── Form ─── */
.cl-form { display: flex; flex-direction: column; gap: 14px; }

.cl-field { display: flex; flex-direction: column; gap: 6px; }
.cl-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: rgba(255,255,255,.45);
}
.cl-input-wrap { position: relative; display: flex; align-items: center; }
.cl-input-ico {
  position: absolute;
  left: 13px;
  font-size: 18px;
  color: rgba(255,255,255,.3);
  pointer-events: none;
}
.cl-input {
  width: 100%;
  padding: 13px 14px 13px 44px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color .2s, background .2s, box-shadow .2s;
  -webkit-text-fill-color: #fff;
}
.cl-input::placeholder { color: rgba(255,255,255,.25); }
.cl-input:focus {
  border-color: rgba(99,102,241,.6);
  background: rgba(99,102,241,.08);
  box-shadow: 0 0 0 3px rgba(99,102,241,.12);
}
.cl-field--error .cl-input { border-color: rgba(248,113,113,.5); }
.cl-err {
  font-size: 11px;
  color: #fca5a5;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cl-erro-geral {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 11px 14px;
  background: rgba(239,68,68,.1);
  border: 1px solid rgba(239,68,68,.2);
  border-radius: 10px;
  font-size: 13px;
  color: #fca5a5;
  line-height: 1.4;
}
.cl-erro-geral .material-symbols-outlined { font-size: 17px; flex-shrink: 0; margin-top: 1px; }

/* ─── Botão entrar ─── */
.cl-btn-entrar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 15px;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: .02em;
  transition: transform .15s, box-shadow .15s, opacity .15s;
  box-shadow: 0 4px 20px rgba(99,102,241,.4);
  margin-top: 4px;
}
.cl-btn-entrar:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(99,102,241,.5);
}
.cl-btn-entrar:active:not(:disabled) { transform: translateY(0); }
.cl-btn-entrar:disabled { opacity: .5; cursor: not-allowed; }
.cl-btn-entrar .material-symbols-outlined { font-size: 20px; }

.cl-spinner {
  display: inline-block;
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Separador ─── */
.cl-separator {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255,255,255,.2);
  font-size: 12px;
}
.cl-separator::before,
.cl-separator::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,.08);
}

/* ─── Botão pular ─── */
.cl-btn-pular {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  color: rgba(255,255,255,.55);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}
.cl-btn-pular:hover {
  border-color: rgba(255,255,255,.22);
  color: rgba(255,255,255,.8);
  background: rgba(255,255,255,.04);
}
.cl-btn-pular .material-symbols-outlined { font-size: 16px; }

/* ─── Rodapé ─── */
.cl-rodape {
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,.25);
  margin: 0;
}
.cl-rodape-link {
  color: rgba(99,102,241,.7);
  cursor: pointer;
  transition: color .15s;
}
.cl-rodape-link:hover { color: #818cf8; }

/* ─── Responsive ─── */
@media (min-width: 640px) {
  .cl-wrap { max-width: 480px; gap: 32px; }
  .cl-card { padding: 36px 32px 30px; }
  .cl-catalog-name { font-size: 32px; }
  .cl-bg-glow--a { width: 700px; height: 700px; }
}
</style>
