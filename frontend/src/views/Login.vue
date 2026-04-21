<template>
  <div class="login-card">
    <div class="login-logo-wrap">
      <img src="/img/logo_fundo_transp.png" alt="Logo" class="login-logo" />
      <p class="login-subtitle">Faça login para acessar o sistema</p>
    </div>

    <div class="login-fields">
      <!-- Filial -->
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

      <!-- Login -->
      <div class="field-group">
        <label class="field-label">Login</label>
        <input v-model="login" type="text" placeholder="Seu login" class="field-input"
          @keydown.enter="$refs.senhaRef.focus()" />
      </div>

      <!-- Senha -->
      <div class="field-group">
        <label class="field-label">Senha</label>
        <input ref="senhaRef" v-model="senha" type="password" placeholder="Sua senha" class="field-input"
          @keydown.enter="fazerLogin" />
      </div>

      <button class="btn-entrar" :disabled="carregandoFiliais || tentando" @click="fazerLogin">
        {{ tentando ? '⏳ Entrando...' : 'Entrar' }}
      </button>

      <div v-if="erroMsg" class="login-erro">{{ erroMsg }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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

    // Salva token no authStore (localStorage)
    authStore.setAuth(data.token, data.operador);

    // Salva sessão (filial + operador + módulos)
    sessaoStore.setSessao(data.filial, data.operador, data.operador.modulos || []);

    emit('login-ok', { filial: data.filial, operador: data.operador });
  } catch (e) {
    const msg = e.response?.data?.erro || 'Erro ao fazer login.';
    erroMsg.value = msg;
  } finally {
    tentando.value = false;
  }
}
</script>

<style scoped>
.login-card {
  background: var(--bg2, #111318);
  border: 1px solid var(--border, rgba(255,255,255,.07));
  border-radius: 18px;
  padding: 36px 32px;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,.4);
}

.login-logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.login-logo {
  max-height: 64px;
  max-width: 180px;
  object-fit: contain;
}

.login-subtitle {
  font-size: 13px;
  color: var(--text2, #a8abb5);
  text-align: center;
}

.login-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--text2, #a8abb5);
}

.field-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(255,255,255,.1));
  background: var(--bg3, #171a1f);
  color: var(--text, #e3e5ef);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color .15s;
}
.field-input:focus { border-color: var(--primary, #609efc); }
.field-input option { background: var(--bg3, #171a1f); }

.field-loading {
  font-size: 13px;
  color: var(--text2, #a8abb5);
  padding: 8px 0;
}

.sep-line {
  height: 1px;
  background: var(--border, rgba(255,255,255,.07));
  margin: 2px 0;
}

.btn-entrar {
  width: 100%;
  padding: 12px;
  background: var(--primary, #609efc);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
  margin-top: 4px;
}
.btn-entrar:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.btn-entrar:disabled { opacity: .45; cursor: not-allowed; }

.login-erro {
  background: rgba(239,68,68,.12);
  border: 1px solid rgba(239,68,68,.3);
  color: #fca5a5;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  text-align: center;
}
</style>
