import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';

export const useCaixaStore = defineStore('caixa', () => {
  const caixaAberto = ref(null);
  const sangrias = ref([]);
  const reforcos = ref([]);

  const saldoDinheiro = computed(() => {
    if (!caixaAberto.value) return 0;
    let saldo = parseFloat(caixaAberto.value.valor_abertura || 0);
    sangrias.value.forEach(s => {
      saldo -= parseFloat(s.valor || 0);
    });
    reforcos.value.forEach(r => {
      saldo += parseFloat(r.valor || 0);
    });
    return saldo.toFixed(2);
  });

  function setCaixaAberto(caixa) {
    caixaAberto.value = caixa;
  }

  function adicionarSangria(sangria) {
    sangrias.value.push(sangria);
  }

  function adicionarReforco(reforco) {
    reforcos.value.push(reforco);
  }

  async function verificarStatus(filial_pk) {
    try {
      const { data } = await apiClient.get(`/api/caixa/status/${filial_pk}`);
      caixaAberto.value = data.aberto ? data.caixa : null;
      if (data.movimentos) {
        sangrias.value  = data.movimentos.filter(m => m.tipo === 'sangria');
        reforcos.value  = data.movimentos.filter(m => m.tipo === 'reforco');
      }
    } catch (e) {
      console.error('Erro ao verificar caixa:', e.message);
    }
  }

  function resetar() {
    caixaAberto.value = null;
    sangrias.value = [];
    reforcos.value = [];
  }

  return {
    caixaAberto,
    sangrias,
    reforcos,
    saldoDinheiro,
    setCaixaAberto,
    adicionarSangria,
    adicionarReforco,
    verificarStatus,
    resetar
  };
});
