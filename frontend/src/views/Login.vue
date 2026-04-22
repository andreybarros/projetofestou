<template>
  <div class="login-wrapper">
    <!-- Seção Esquerda: Branding (Apenas Desktop) -->
    <div class="login-branding">
      <img src="/img/login_branding.png" alt="Branding" class="branding-image-full" />
    </div>

    <!-- Seção Direita: Formulário -->
    <div class="login-form-container">
      <div class="login-card">
        <div class="login-header-mobile">
          <img src="/img/logo_fundo_transp.png" alt="Logo" class="mobile-logo" />
          <p class="login-subtitle">
            {{ modoTrocarSenha ? 'Trocar senha de acesso' : 'Faça login para acessar o sistema' }}
          </p>
        </div>
        
        <div class="login-header-desktop">
          <h2 class="form-title">{{ modoTrocarSenha ? 'Recuperar Acesso' : 'Bem-vindo de volta' }}</h2>
          <p class="login-subtitle">
            {{ modoTrocarSenha ? 'Defina sua nova senha abaixo' : 'Entre com suas credenciais' }}
          </p>
        </div>

        <!-- ── MODO LOGIN ── -->
        <div v-if="!modoTrocarSenha" class="login-fields">
          <div class="field-group">
            <label class="field-label">Filial</label>
            <div v-if="carregandoFiliais" class="field-loading">⏳ Carregando filiais...</div>
            <select v-else v-model="filialPk" class="field-input">
              <option value="">Selecione a filial...</option>
              <option v-for="f in filiais" :key="f.pk" :value="f.pk">
                [{{ f.codigo }}] {{ f.nome }}
              </option>
            </select>
          </div>

          <div class="sep-line"></div>

          <div class="field-group">
            <label class="field-label">Login</label>
            <input v-model="login" type="text" placeholder="Seu login" class="field-input"
              @keydown.enter="$refs.senhaRef.focus()" />
          </div>

          <div class="field-group">
            <label class="field-label">Senha</label>
            <div class="input-with-icon">
              <input ref="senhaRef" v-model="senha" :type="verSenha ? 'text' : 'password'" placeholder="Sua senha" class="field-input"
                @keydown.enter="fazerLogin" />
              <button type="button" class="btn-toggle-pwd" @click="verSenha = !verSenha">
                <span class="material-symbols-outlined">{{ verSenha ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <button class="btn-entrar" :disabled="carregandoFiliais || tentando" @click="fazerLogin">
            {{ tentando ? '⏳ Entrando...' : 'Entrar' }}
          </button>

          <div v-if="erroMsg" class="login-erro">{{ erroMsg }}</div>

          <button class="btn-link" @click="abrirTrocarSenha">Esqueceu a senha?</button>
        </div>

        <!-- ── MODO TROCAR SENHA ── -->
        <div v-else class="login-fields">
          <div class="field-group">
            <label class="field-label">Filial</label>
            <div v-if="carregandoFiliais" class="field-loading">⏳ Carregando filiais...</div>
            <select v-else v-model="filialPk" class="field-input">
              <option value="">Selecione a filial...</option>
              <option v-for="f in filiais" :key="f.pk" :value="f.pk">
                [{{ f.codigo }}] {{ f.nome }}
              </option>
            </select>
          </div>

          <div class="sep-line"></div>

          <div class="field-group">
            <label class="field-label">Login</label>
            <input v-model="ts.login" type="text" placeholder="Seu login" class="field-input" />
          </div>

          <div class="sep-line"></div>

          <div class="field-group">
            <label class="field-label">Nova senha</label>
            <input v-model="ts.novaSenha" type="password" placeholder="Nova senha" class="field-input" />
          </div>

          <div class="field-group">
            <label class="field-label">Confirmar nova senha</label>
            <div class="input-with-icon">
              <input v-model="ts.confirmar" :type="verSenha ? 'text' : 'password'" placeholder="Repita a nova senha" class="field-input"
                @keydown.enter="trocarSenha" />
              <button type="button" class="btn-toggle-pwd" @click="verSenha = !verSenha">
                <span class="material-symbols-outlined">{{ verSenha ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <button class="btn-entrar" :disabled="tsTentando" @click="trocarSenha">
            {{ tsTentando ? '⏳ Salvando...' : 'Salvar nova senha' }}
          </button>

          <div v-if="tsErro"    class="login-erro">{{ tsErro }}</div>
          <div v-if="tsOkMsg"   class="login-ok">{{ tsOkMsg }}</div>

          <button class="btn-link" @click="voltarLogin">← Voltar ao login</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore }   from '../stores/auth';
import { useSessaoStore } from '../stores/sessao';
import apiClient          from '../services/api';

const emit = defineEmits(['login-ok']);

const filiais           = ref([]);
const filialPk          = ref('');
const login             = ref('');
const senha             = ref('');
const erroMsg           = ref('');
const tentando          = ref(false);
const carregandoFiliais = ref(true);
const verSenha          = ref(false);

const modoTrocarSenha = ref(false);
const tsTentando      = ref(false);
const tsErro          = ref('');
const tsOkMsg         = ref('');
const ts = reactive({ login: '', novaSenha: '', confirmar: '' });

const authStore   = useAuthStore();
const sessaoStore = useSessaoStore();

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/api/auth/filiais');
    filiais.value = data || [];
  } catch (e) {
    erroMsg.value = 'Não foi possível carregar filiais.';
  } finally {
    carregandoFiliais.value = false;
  }
});

async function fazerLogin() {
  erroMsg.value = '';
  if (!filialPk.value) { erroMsg.value = 'Selecione a filial.'; return; }
  if (!login.value)    { erroMsg.value = 'Informe o login.';    return; }
  if (!senha.value)    { erroMsg.value = 'Informe a senha.';    return; }

  tentando.value = true;
  try {
    const { data } = await apiClient.post('/api/auth/login', {
      filial_pk: filialPk.value,
      login:     login.value,
      senha:     senha.value,
    });

    authStore.setAuth(data.token, data.operador);
    sessaoStore.setSessao(data.filial, data.operador, data.operador.modulos || []);
    emit('login-ok', { filial: data.filial, operador: data.operador });
  } catch (e) {
    erroMsg.value = e.response?.data?.erro || 'Erro ao fazer login.';
  } finally {
    tentando.value = false;
  }
}

function abrirTrocarSenha() {
  ts.login      = login.value;
  ts.novaSenha  = '';
  ts.confirmar  = '';
  tsErro.value  = '';
  tsOkMsg.value = '';
  modoTrocarSenha.value = true;
}

function voltarLogin() {
  modoTrocarSenha.value = false;
  tsErro.value  = '';
  tsOkMsg.value = '';
}

async function trocarSenha() {
  tsErro.value  = '';
  tsOkMsg.value = '';

  if (!filialPk.value)    { tsErro.value = 'Selecione a filial.';              return; }
  if (!ts.login)          { tsErro.value = 'Informe o login.';                 return; }
  if (!ts.novaSenha)      { tsErro.value = 'Informe a nova senha.';            return; }
  if (ts.novaSenha !== ts.confirmar) { tsErro.value = 'As senhas não conferem.'; return; }

  tsTentando.value = true;
  try {
    await apiClient.post('/api/auth/trocar-senha', {
      filial_pk:   filialPk.value,
      login:       ts.login,
      nova_senha:  ts.novaSenha,
    });
    tsOkMsg.value = 'Senha alterada com sucesso! Faça login com a nova senha.';
    ts.novaSenha  = '';
    ts.confirmar  = '';
    setTimeout(() => {
      login.value = ts.login;
      voltarLogin();
    }, 2200);
  } catch (e) {
    tsErro.value = e.response?.data?.erro || 'Erro ao trocar senha.';
  } finally {
    tsTentando.value = false;
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  min-height: 100vh;
  width: 100vw;
  background: var(--bg, #090a0f);
}

/* BRANDING ESQUERDA */
.login-branding {
  display: none; /* Escondido no mobile */
  flex: 1.6;
  position: relative;
  overflow: hidden;
  border-right: 1px solid var(--border, rgba(255,255,255,.05));
}

.branding-image-full {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.9);
}


/* FORM DIREITA */
.login-form-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: var(--bg, #090a0f);
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg2, #111318);
  border: 1px solid var(--border, rgba(255,255,255,.07));
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 24px 80px rgba(0,0,0,.5);
}

.login-header-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.login-header-desktop {
  display: none;
  margin-bottom: 32px;
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.mobile-logo {
  max-height: 50px;
  max-width: 150px;
  object-fit: contain;
}

.login-subtitle {
  font-size: 14px;
  color: var(--text2, #a8abb5);
  line-height: 1.5;
}

.login-fields {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: var(--text2, #a8abb5);
}

.field-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1.5px solid var(--border, rgba(255,255,255,.1));
  background: var(--bg3, #171a1f);
  color: var(--text, #e3e5ef);
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: all .2s;
}

.field-input:focus {
  border-color: var(--primary, #609efc);
  background: var(--bg2, #111318);
  box-shadow: 0 0 0 4px rgba(96, 158, 252, 0.15);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon .field-input {
  padding-right: 46px;
}

.btn-toggle-pwd {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text2, #a8abb5);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.btn-toggle-pwd:hover {
  background: rgba(255,255,255, 0.05);
  color: var(--primary);
}

[data-theme="light"] .btn-toggle-pwd:hover {
  background: rgba(0,0,0, 0.05);
}

.btn-toggle-pwd .material-symbols-outlined {
  font-size: 18px;
}

.field-loading {
  font-size: 14px;
  color: var(--text2, #a8abb5);
  padding: 8px 0;
}

.sep-line {
  height: 1px;
  background: var(--border, rgba(255,255,255,.07));
  margin: 4px 0;
}

.btn-entrar {
  width: 100%;
  padding: 14px;
  background: var(--primary, #609efc);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
  margin-top: 8px;
  box-shadow: 0 8px 20px rgba(96, 158, 252, 0.2);
}

.btn-entrar:hover:not(:disabled) {
  opacity: .9;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(96, 158, 252, 0.25);
}

.btn-entrar:active:not(:disabled) {
  transform: translateY(0);
}

.btn-entrar:disabled {
  opacity: .45;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-link {
  background: none;
  border: none;
  color: var(--text2, #a8abb5);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  padding: 8px;
  transition: color .2s;
  margin-top: 8px;
}

.btn-link:hover {
  color: var(--primary, #609efc);
}

.login-erro {
  background: rgba(239,68,68,.1);
  border: 1px solid rgba(239,68,68,.2);
  color: #fca5a5;
  border-radius: 10px;
  padding: 12px;
  font-size: 13px;
  text-align: center;
}

.login-ok {
  background: rgba(16,185,129,.1);
  border: 1px solid rgba(16,185,129,.2);
  color: #6ee7b7;
  border-radius: 10px;
  padding: 12px;
  font-size: 13px;
  text-align: center;
  font-weight: 600;
}

/* RESPONSIVIDADE DESKTOP */
@media (min-width: 1024px) {
  .login-branding {
    display: flex;
  }

  .login-form-container {
    flex: 0 0 420px;
    padding: 32px 48px;
    align-items: flex-start;
    padding-top: 10vh;
  }

  .login-header-mobile {
    display: none;
  }

  .login-header-desktop {
    display: block;
    margin-bottom: 24px;
  }

  .login-card {
    border: none;
    background: transparent;
    box-shadow: none;
    padding: 0;
    width: 100%;
  }
}

@media (max-width: 1023px) {
  .login-form-container {
    padding: 24px 16px;
  }
  
  .login-card {
    padding: 32px 24px;
    box-shadow: 0 10px 40px rgba(0,0,0,.3);
  }

  .mobile-logo {
    max-height: 60px;
    margin-bottom: 8px;
  }
}

/* AJUSTE LIGHT MODE */
[data-theme="light"] .login-wrapper,
[data-theme="light"] .login-form-container {
  background: #eaecf4;
}
[data-theme="light"] .login-card {
  background: transparent;
  border-color: rgba(0,0,0,0.05);
  box-shadow: none;
}
[data-theme="light"] .form-title {
  color: #0f172a;
}
[data-theme="light"] .login-subtitle,
[data-theme="light"] .field-label {
  color: #334155;
}
[data-theme="light"] .field-input {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
}
[data-theme="light"] .field-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(96, 158, 252, 0.15);
}
[data-theme="light"] .btn-link {
  color: #475569;
}
[data-theme="light"] .btn-link:hover {
  color: var(--primary);
}
[data-theme="light"] .sep-line {
  background: rgba(0,0,0,0.06);
}
</style>
