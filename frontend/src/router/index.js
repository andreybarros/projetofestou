import { createRouter, createWebHistory } from 'vue-router';
import { useSessaoStore } from '../stores/sessao';

// Lazy imports para cada view
const Home            = () => import('../views/Home.vue');
const Dashboard       = () => import('../views/Dashboard.vue');
const PDV             = () => import('../views/PDV.vue');
const Produtos        = () => import('../views/Produtos.vue');
const FormProduto     = () => import('../views/FormProduto.vue');
const Categorias      = () => import('../views/Categorias.vue');
const FormCategoria   = () => import('../views/FormCategoria.vue');
const Clientes        = () => import('../views/Clientes.vue');
const FormCliente     = () => import('../views/FormCliente.vue');
const Fornecedores    = () => import('../views/Fornecedores.vue');
const FormFornecedor  = () => import('../views/FormFornecedor.vue');
const Armazens        = () => import('../views/Armazens.vue');
const FormArmazem     = () => import('../views/FormArmazem.vue');
const Agenda          = () => import('../views/Agenda.vue');
const Vendedores      = () => import('../views/Vendedores.vue');
const FormVendedor    = () => import('../views/FormVendedor.vue');
const ContasReceber   = () => import('../views/ContasReceber.vue');
const Receitas        = () => import('../views/Receitas.vue');
const HistoricoVendas = () => import('../views/HistoricoVendas.vue');
const Funcionarios    = () => import('../views/Funcionarios.vue');
const Ponto           = () => import('../views/Ponto.vue');
const AjusteBatidas   = () => import('../views/AjusteBatidas.vue');
const Holerites       = () => import('../views/Holerites.vue');
const EspelhoPonto    = () => import('../views/EspelhoPonto.vue');
const Separacao       = () => import('../views/Separacao.vue');
const Despesas        = () => import('../views/Despesas.vue');
const Financeiro      = () => import('../views/Financeiro.vue');
const Filiais         = () => import('../views/Filiais.vue');
const FechamentoCaixa = () => import('../views/FechamentoCaixa.vue');
const FechamentoPonto = () => import('../views/FechamentoPonto.vue');
const Vales           = () => import('../views/Vales.vue');
const Operadores      = () => import('../views/Operadores.vue');
const Caixa           = () => import('../views/Caixa.vue');
const FormFilial      = () => import('../views/FormFilial.vue');
const Parametros      = () => import('../views/Parametros.vue');
const RelatorioCaixa      = () => import('../views/RelatorioCaixa.vue');
const ConsolidacaoVendas  = () => import('../views/ConsolidacaoVendas.vue');
const RelatorioVendas     = () => import('../views/RelatorioVendas.vue');
const ImportarProdutos    = () => import('../views/ImportarProdutos.vue');

const routes = [
  { path: '/',                  name: 'Home',             component: Home,            meta: { requiresAuth: true } },
  { path: '/dashboard',         name: 'Dashboard',        component: Dashboard,       meta: { requiresAuth: true } },
  { path: '/pdv',               name: 'PDV',              component: PDV,             meta: { requiresAuth: true } },
  { path: '/produtos',              name: 'Produtos',         component: Produtos,        meta: { requiresAuth: true } },
  { path: '/produtos/novo',         name: 'NovoProduto',      component: FormProduto,     meta: { requiresAuth: true } },
  { path: '/produtos/:pk/editar',   name: 'EditarProduto',    component: FormProduto,     meta: { requiresAuth: true } },
  { path: '/produtos/importar',     name: 'ImportarProdutos', component: ImportarProdutos, meta: { requiresAuth: true } },
  { path: '/categorias',            name: 'Categorias',       component: Categorias,      meta: { requiresAuth: true } },
  { path: '/categorias/novo',       name: 'NovaCategoria',    component: FormCategoria,   meta: { requiresAuth: true } },
  { path: '/categorias/:pk/editar', name: 'EditarCategoria',  component: FormCategoria,   meta: { requiresAuth: true } },
  { path: '/clientes',              name: 'Clientes',         component: Clientes,        meta: { requiresAuth: true } },
  { path: '/clientes/novo',         name: 'NovoCliente',      component: FormCliente,     meta: { requiresAuth: true } },
  { path: '/clientes/:pk/editar',   name: 'EditarCliente',    component: FormCliente,     meta: { requiresAuth: true } },
  { path: '/fornecedores',          name: 'Fornecedores',     component: Fornecedores,    meta: { requiresAuth: true } },
  { path: '/fornecedores/novo',     name: 'NovoFornecedor',   component: FormFornecedor,  meta: { requiresAuth: true } },
  { path: '/fornecedores/:pk/editar', name: 'EditarFornecedor', component: FormFornecedor, meta: { requiresAuth: true } },
  { path: '/armazens',              name: 'Armazens',         component: Armazens,        meta: { requiresAuth: true } },
  { path: '/armazens/novo',         name: 'NovoArmazem',      component: FormArmazem,     meta: { requiresAuth: true } },
  { path: '/armazens/:pk/editar',   name: 'EditarArmazem',    component: FormArmazem,     meta: { requiresAuth: true } },
  { path: '/agenda',            name: 'Agenda',           component: Agenda,          meta: { requiresAuth: true } },
  { path: '/vendedores',              name: 'Vendedores',       component: Vendedores,      meta: { requiresAuth: true } },
  { path: '/vendedores/novo',         name: 'NovoVendedor',     component: FormVendedor,    meta: { requiresAuth: true } },
  { path: '/vendedores/:pk/editar',   name: 'EditarVendedor',   component: FormVendedor,    meta: { requiresAuth: true } },
  { path: '/contas-receber',          name: 'ContasReceber',    component: ContasReceber,   meta: { requiresAuth: true } },
  { path: '/receitas',          name: 'Receitas',         component: Receitas,        meta: { requiresAuth: true } },
  { path: '/historico-vendas',  name: 'HistoricoVendas',  component: HistoricoVendas, meta: { requiresAuth: true } },
  { path: '/funcionarios',      name: 'Funcionarios',     component: Funcionarios,    meta: { requiresAuth: true } },
  { path: '/ponto',             name: 'Ponto',            component: Ponto,           meta: { requiresAuth: true } },
  { path: '/ajuste-batidas',    name: 'AjusteBatidas',    component: AjusteBatidas,   meta: { requiresAuth: true } },
  { path: '/holerites',         name: 'Holerites',        component: Holerites,       meta: { requiresAuth: true } },
  { path: '/espelho-ponto',     name: 'EspelhoPonto',     component: EspelhoPonto,    meta: { requiresAuth: true } },
  { path: '/separacao',         name: 'Separacao',        component: Separacao,       meta: { requiresAuth: true } },
  { path: '/despesas',          name: 'Despesas',         component: Despesas,        meta: { requiresAuth: true } },
  { path: '/financeiro',        name: 'Financeiro',       component: Financeiro,      meta: { requiresAuth: true } },
  { path: '/filiais',           name: 'Filiais',          component: Filiais,         meta: { requiresAuth: true } },
  { path: '/filiais/novo',         name: 'NovaFilial',       component: FormFilial,      meta: { requiresAuth: true } },
  { path: '/filiais/:pk/editar',   name: 'EditarFilial',     component: FormFilial,      meta: { requiresAuth: true } },
  { path: '/fechamento-caixa',  name: 'FechamentoCaixa',  component: FechamentoCaixa, meta: { requiresAuth: true } },
  { path: '/fechamento-ponto',  name: 'FechamentoPonto',  component: FechamentoPonto, meta: { requiresAuth: true } },
  { path: '/vales',             name: 'Vales',            component: Vales,           meta: { requiresAuth: true } },
  { path: '/operadores',        name: 'Operadores',       component: Operadores,      meta: { requiresAuth: true } },
  { path: '/caixa',             name: 'Caixa',            component: Caixa,           meta: { requiresAuth: true } },
  { path: '/parametros',        name: 'Parametros',       component: Parametros,      meta: { requiresAuth: true } },
  { path: '/relatorio-caixa',     name: 'RelatorioCaixa',     component: RelatorioCaixa,     meta: { requiresAuth: true } },
  { path: '/consolidacao-vendas', name: 'ConsolidacaoVendas', component: ConsolidacaoVendas, meta: { requiresAuth: true } },
  { path: '/relatorio-vendas',    name: 'RelatorioVendas',    component: RelatorioVendas,     meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, left: 0, behavior: 'instant' };
  },
});

router.beforeEach((to) => {
  const sessao = useSessaoStore();
  if (to.meta.requiresAuth && !sessao.isAutenticado) {
    return false; // App.vue mostra o Login nativamente
  }
});

router.afterEach(() => {
  const el = document.getElementById('content');
  if (el) el.scrollTop = 0;
});

export default router;
