import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);

  const isAuthenticated = computed(() => !!token.value);

  function setAuth(newToken, newUser) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function getToken() {
    return token.value;
  }

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    logout,
    getToken
  };
});
