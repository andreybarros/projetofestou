import axios from 'axios';
import { useAuthStore }   from '../stores/auth';
import { useSessaoStore } from '../stores/sessao';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 35000
});

apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    const token = authStore.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore   = useAuthStore();
      const sessaoStore = useSessaoStore();
      
      authStore.logout();
      sessaoStore.logout();
      
      // Como o login é gerenciado por v-if no App.vue, 
      // basta limpar as stores e ir para a raiz.
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
