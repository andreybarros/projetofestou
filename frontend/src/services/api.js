import axios from 'axios';
import { useAuthStore }   from '../stores/auth';
import { useSessaoStore } from '../stores/sessao';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 35000
});

// Renova token automaticamente quando falta menos de 4h para expirar (token dura 24h)
function tokenExpirandoEm4h(token) {
  try {
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts   = decoded.split(':');
    const ts      = parseInt(parts[parts.length - 2], 10);
    const idadeSec = Date.now() / 1000 - ts;
    return idadeSec > 72000; // mais de 20h = renova
  } catch {
    return false;
  }
}

let renovandoToken = false;
async function tentarRenovarToken() {
  if (renovandoToken) return;
  renovandoToken = true;
  try {
    const authStore = useAuthStore();
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/renovar`, {}, {
      headers: { Authorization: `Bearer ${authStore.getToken()}` },
    });
    if (data?.token) authStore.setAuth(data.token, authStore.user);
  } catch { /* silencioso — não logout aqui */ } finally {
    renovandoToken = false;
  }
}

apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    const token = authStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (tokenExpirandoEm4h(token)) tentarRenovarToken();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Só desloga em 401 autêntico — ignora erros de rede (sem response)
    if (error.response?.status === 401) {
      const authStore   = useAuthStore();
      const sessaoStore = useSessaoStore();
      authStore.logout();
      sessaoStore.logout();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
