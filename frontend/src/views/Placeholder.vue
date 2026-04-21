<template>
  <div class="placeholder-page">
    <div class="placeholder-icon">🚧</div>
    <h2>{{ titulo }}</h2>
    <p>Esta tela está sendo migrada para Vue. Em breve estará disponível.</p>
    <p style="font-size:12px;opacity:.5;margin-top:4px">Rota: {{ $route.path }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();
const titulo = computed(() => {
  const map = {
    '/dashboard': 'Dashboard', '/produtos': 'Produtos', '/categorias': 'Categorias',
    '/clientes': 'Clientes', '/fornecedores': 'Fornecedores', '/armazens': 'Armazéns',
    '/agenda': 'Agenda', '/vendedores': 'Vendedores', '/receitas': 'Contas a Receber',
    '/historico-vendas': 'Histórico de Vendas', '/funcionarios': 'Funcionários',
    '/ponto': 'Ponto Eletrônico', '/holerites': 'Meus Holerites', '/espelho-ponto': 'Espelho de Ponto',
    '/separacao': 'Separação', '/despesas': 'Despesas', '/financeiro': 'Financeiro',
    '/filiais': 'Filiais', '/fechamento-caixa': 'Fechamento de Caixa', '/operadores': 'Operadores',
  };
  return map[route.path] || route.path;
});
</script>

<style scoped>
.placeholder-page {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; text-align: center; gap: 12px; color: var(--text2, #a8abb5);
}
.placeholder-icon { font-size: 48px; }
h2 { font-size: 20px; font-weight: 700; color: var(--text, #e3e5ef); }
p  { font-size: 14px; }
</style>
