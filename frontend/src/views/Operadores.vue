<template>
  <div class="page-wrap">
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">👥 Operadores</h2>
        <p class="page-sub">Gerencie os usuários e permissões de acesso ao sistema</p>
      </div>
      <div class="header-actions">
        <button @click="carregar" class="btn-ghost">🔄 Atualizar</button>
        <button @click="abrirNovo" class="btn-primary">+ Novo Operador</button>
      </div>
    </div>

    <!-- Tabela de Operadores -->
    <div class="card table-card overflow-x">
      <table class="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Login</th>
            <th>Filial</th>
            <th>Perfil</th>
            <th class="text-center">PDV</th>
            <th class="text-center">Financ.</th>
            <th class="text-center">Admin</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in lista" :key="u.id">
            <td class="bold">{{ u.nome }}</td>
            <td class="mono accent">{{ u.login }}</td>
            <td>
              <span v-if="!u.filial_pk" class="badge-filial super">Superadmin</span>
              <span v-else class="badge-filial">{{ getFilialNome(u.filial_pk) }}</span>
            </td>
            <td>
              <span :class="['badge-perfil', u.admin ? 'admin' : 'op']">
                {{ u.admin ? 'Administrador' : 'Operador' }}
              </span>
            </td>
            <td class="text-center">
               <span v-if="u.admin || u.acesso_pdv" class="check">✓</span>
               <span v-else class="dash">—</span>
            </td>
            <td class="text-center">
               <span v-if="u.admin || u.acesso_financeiro" class="check">✓</span>
               <span v-else class="dash">—</span>
            </td>
            <td class="text-center">
               <span v-if="u.admin" class="check">✓</span>
               <span v-else class="dash">—</span>
            </td>
            <td class="text-right">
              <div class="actions">
                <button @click="abrirEditar(u)" class="btn-action" title="Editar">✏️</button>
                <button v-if="u.login !== 'Admin'" @click="excluir(u)" class="btn-action err" title="Excluir">🗑️</button>
                <span v-else class="lock" title="Usuário Protegido">🔒</span>
              </div>
            </td>
          </tr>
          <tr v-if="carregando">
            <td colspan="8" class="vazio">⏳ Carregando operadores...</td>
          </tr>
          <tr v-else-if="lista.length === 0">
            <td colspan="8" class="vazio">Nenhum operador cadastrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL: CADASTRAR / EDITAR -->
    <div v-if="modalAberto" class="modal-overlay" @click.self="modalAberto = false">
      <div class="modal-card wide animate-slide-up">
        <div class="modal-header">
          <div class="header-content">
            <span class="modal-tag">{{ f.id ? 'Edição' : 'Novo Registro' }}</span>
            <h3>{{ f.id ? 'Alterar Operador' : 'Criar Novo Operador' }}</h3>
          </div>
          <button @click="modalAberto = false" class="close-btn">×</button>
        </div>
        
        <div class="modal-body custom-scroll">
          <div class="modal-grid-layout">
            <!-- Seção: Dados -->
            <div class="modal-section main-info">
              <h4 class="section-title">Dados do Operador</h4>
              <div class="grid-form mb-4">
                <div class="field">
                  <label>Nome Completo *</label>
                  <input v-model="f.nome" type="text" placeholder="João da Silva" />
                </div>
                <div class="field">
                  <label>Matrícula</label>
                  <input v-model="f.matricula" type="text" placeholder="Ex: OP-010" />
                </div>
              </div>

              <div class="grid-form mb-4">
                <div class="field">
                  <label>Login de Usuário *</label>
                  <input v-model="f.login" type="text" placeholder="joao.silva" />
                </div>
                <div class="field">
                  <label>Senha {{ f.id ? '(Opcional)' : '*' }}</label>
                  <input v-model="f.senha" type="password" placeholder="••••••••" />
                </div>
              </div>

              <div class="field mb-4">
                <label>Filial Designada</label>
                <select v-model="f.filial_pk">
                  <option :value="null">⚡ Superadmin (Todas as unidades)</option>
                  <option v-for="fi in filiais" :key="fi.pk" :value="fi.pk">
                    [{{ fi.codigo }}] {{ fi.nome }}
                  </option>
                </select>
              </div>

              <div class="divider"></div>

              <h4 class="section-title">Nível de Privilégio</h4>
              <div :class="['admin-card', { active: f.admin }]">
                <div class="admin-content">
                  <span class="admin-label">Perfil Administrador</span>
                  <p class="admin-desc">Liberar todas as funções para esta filial</p>
                </div>
                <label class="toggle">
                  <input type="checkbox" v-model="f.admin" @change="handleAdminToggle" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <!-- Coluna 2: Módulos -->
            <div class="modal-section permissions">
              <div class="rotinas-header mb-3">
                <h4 class="section-title small">Módulos Permitidos</h4>
                <span class="badge-count" v-if="!f.admin">{{ ROTINAS.filter(r => f[r.campo]).length }} ativos</span>
              </div>
              
              <div class="rotinas-desc-v2 mb-3" v-if="f.admin">
                <p>O perfil administrador já possui todos os acessos liberados.</p>
              </div>

              <div :class="['rotinas-grid-v2', { 'is-admin': f.admin }]">
                <label v-for="r in ROTINAS" :key="r.id" 
                       :class="['rotina-item-v2', { selected: f[r.campo] || f.admin }]">
                  <input type="checkbox" v-model="f[r.campo]" :disabled="f.admin" />
                  <div class="r-icon">{{ r.icon }}</div>
                  <span class="r-label">{{ r.label }}</span>
                  <span class="r-check material-symbols-outlined">check_circle</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-status" v-if="podeSalvar">
            <span class="blob green"></span> Pronto para salvar
          </div>
          <button @click="modalAberto = false" class="btn-ghost" :disabled="processando">Cancelar</button>
          <button @click="salvar" class="btn-primary prestige" :disabled="processando || !podeSalvar">
            <span v-if="processando" class="spinner-sm"></span>
            {{ f.id ? 'Salvar Alterações' : 'Concluir Cadastro' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Build Hash: MOD_OP_LINEAR_V1 -->
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject, computed } from 'vue';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const sessaoStore = useSessaoStore();
const showToast = inject('showToast');

const lista = ref([]);
const filiais = ref([]);
const carregando = ref(true);
const processando = ref(false);
const modalAberto = ref(false);

const ROTINAS = [
  { id: 'produtos',     icon: '📦', label: 'Produtos / Estoque',                campo: 'acesso_produtos' },
  { id: 'categorias',   icon: '🏷️', label: 'Categorias',                        campo: 'acesso_categorias' },
  { id: 'armazens',     icon: '🏭', label: 'Armazéns',                           campo: 'acesso_armazens' },
  { id: 'clientes',     icon: '👥', label: 'Clientes',                          campo: 'acesso_clientes' },
  { id: 'fornecedores', icon: '🤝', label: 'Fornecedores',                      campo: 'acesso_fornecedores' },
  { id: 'agenda',       icon: '📅', label: 'Agenda / Eventos',                  campo: 'acesso_agenda' },
  { id: 'separacao',    icon: '📋', label: 'Monitor de Separação',              campo: 'acesso_separacao' },
  { id: 'criar_ordem',  icon: '➕', label: 'Criar Ordem (Separação)',           campo: 'acesso_criar_ordem' },
  { id: 'pdv',          icon: '🛒', label: 'Ponto de Venda (PDV)',              campo: 'acesso_pdv' },
  { id: 'caixa',        icon: '🏧', label: 'Caixa (Operação)',                  campo: 'acesso_caixa' },
  { id: 'vendedores',   icon: '👤', label: 'Vendedores (Cadastro)',             campo: 'acesso_vendedores' },
  { id: 'historico',    icon: '📊', label: 'Histórico de Vendas',               campo: 'acesso_historico' },
  { id: 'receitas',     icon: '📒', label: 'Contas a Receber',                   campo: 'acesso_receitas' },
  { id: 'despesas',     icon: '📉', label: 'Despesas (Contas a Pagar)',          campo: 'acesso_despesas' },
  { id: 'financeiro',   icon: '💳', label: 'Financeiro / Consolidação',          campo: 'acesso_financeiro' },
  { id: 'fechamento',   icon: '💰', label: 'Fechamento de Caixa',               campo: 'acesso_fechamento' },
  { id: 'rel_caixa',    icon: '📑', label: 'Relatório de Caixa',                campo: 'acesso_relatorio_caixa' },
  { id: 'dashboard',    icon: '📈', label: 'Dashboard Gerencial',               campo: 'acesso_dashboard' },
  { id: 'funcionarios', icon: '👤', label: 'Cadastro de Funcionários',          campo: 'acesso_funcionarios' },
  { id: 'ponto',        icon: '⏰', label: 'Bater Ponto (Registro)',            campo: 'acesso_ponto' },
  { id: 'espelho',      icon: '📅', label: 'Espelho de Ponto (Consulta)',       campo: 'acesso_espelho_ponto' },
  { id: 'gestao_ponto', icon: '🛠️', label: 'Gestão de Ponto (Ajustes)',          campo: 'acesso_gestao_ponto' },
  { id: 'fech_ponto',   icon: '🔐', label: 'Fechamento de Ponto (RH)',          campo: 'acesso_fechamento_ponto' },
  { id: 'rel_vendas',  icon: '💰', label: 'Relatórios de Vendas',               campo: 'acesso_relatorio_vendas' },
];

const f = reactive({
  id: null,
  nome: '',
  login: '',
  senha: '',
  matricula: '',
  filial_pk: null,
  admin: false,
  acesso_produtos: false,
  acesso_armazens: false,
  acesso_clientes: false,
  acesso_agenda: false,
  acesso_separacao: false,
  acesso_criar_ordem: false,
  acesso_pdv: false,
  acesso_caixa: false,
  acesso_vendedores: false,
  acesso_historico: false,
  acesso_receitas: false,
  acesso_despesas: false,
  acesso_categorias: false,
  acesso_financeiro: false,
  acesso_dashboard: false,
  acesso_fechamento: false,
  acesso_relatorio_caixa: false,
  acesso_funcionarios: false,
  acesso_ponto: false,
  acesso_espelho_ponto: false,
  acesso_fornecedores: false,
  acesso_gestao_ponto: false,
  acesso_fechamento_ponto: false,
  acesso_relatorio_vendas: false
});

onMounted(async () => {
  await Promise.all([carregar(), carregarFiliais()]);
});

async function carregar() {
  carregando.value = true;
  const opLogado = sessaoStore.operador;
  try {
    let q = supabase.from('operadores').select('*').order('nome');
    
    // Se o logado não for superadmin (tem filial_pk), vê só a sua filial
    if (opLogado?.filial_pk) {
      q = q.eq('filial_pk', opLogado.filial_pk);
    }

    const { data, error } = await q;
    if (error) throw error;
    lista.value = data || [];
  } catch (e) {
    showToast('Erro ao carregar operadores: ' + e.message, 'error');
  } finally {
    carregando.value = false;
  }
}

async function carregarFiliais() {
  const { data } = await supabase.from('filiais').select('pk, codigo, nome').eq('ativo', true).order('codigo');
  filiais.value = data || [];
}

const podeSalvar = computed(() => {
  if (!f.nome || !f.login) return false;
  if (!f.id && !f.senha) return false;
  return true;
});

function abrirNovo() {
  f.id = null;
  f.nome = '';
  f.login = '';
  f.senha = '';
  f.matricula = '';
  f.filial_pk = sessaoStore.filial?.pk || null;
  f.admin = false;
  ROTINAS.forEach(r => f[r.campo] = false);
  modalAberto.value = true;
}

function abrirEditar(u) {
  f.id = u.id;
  f.nome = u.nome;
  f.login = u.login;
  f.senha = '';
  f.matricula = u.matricula || '';
  f.filial_pk = u.filial_pk;
  f.admin = !!u.admin;
  ROTINAS.forEach(r => f[r.campo] = !!u[r.campo]);
  modalAberto.value = true;
}

function handleAdminToggle() {
  if (f.admin) {
    ROTINAS.forEach(r => f[r.campo] = true);
  }
}

async function salvar() {
  processando.value = true;
  const payload = {
    nome: f.nome,
    login: f.login,
    matricula: f.matricula,
    filial_pk: f.filial_pk,
    admin: f.admin,
    ativo: true
  };

  ROTINAS.forEach(r => payload[r.campo] = f.admin ? true : f[r.campo]);

  try {
    if (f.id) {
      if (f.senha) payload.senha = f.senha;
      const { error } = await supabase.from('operadores').update(payload).eq('id', f.id);
      if (error) throw error;
      showToast('Operador atualizado!');
    } else {
      payload.senha = f.senha;
      const { error } = await supabase.from('operadores').insert([payload]);
      if (error) throw error;
      showToast('Operador cadastrado com sucesso!');
    }
    modalAberto.value = false;
    carregar();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  } finally {
    processando.value = false;
  }
}

async function excluir(u) {
  if (u.login === 'Admin') return;
  if (!confirm(`Deseja realmente excluir o operador "${u.nome}"?`)) return;
  try {
    const { error } = await supabase.from('operadores').delete().eq('id', u.id);
    if (error) throw error;
    showToast('Operador removido.');
    carregar();
  } catch (e) {
    showToast('Erro ao excluir: ' + e.message, 'error');
  }
}

function getFilialNome(pk) {
  const fi = filiais.value.find(f => f.pk === pk);
  return fi ? `[${fi.codigo}] ${fi.nome}` : 'Desconhecida';
}
</script>

<style scoped>
.modal-card.wide { max-width: 900px; }
.header-content { display: flex; flex-direction: column; gap: 4px; }
.modal-tag { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #6366f1; letter-spacing: 1px; }

.modal-grid-layout { display: flex; flex-direction: column; gap: 0; }
.modal-section { width: 100%; }
.modal-section.permissions { border-top: 2px solid var(--border); margin-top: 1rem; padding-top: 1rem; }

.divider { height: 1px; background: var(--border); margin: 1.5rem 0; }
.help-text.warning.mt-3 { margin-top: 1rem; }

.rotinas-desc-v2 p { font-size: 0.8rem; color: var(--text2); background: var(--bg3); padding: 12px; border-radius: 8px; border: 1px dashed var(--border); margin: 0; }

.section-title { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 800; color: var(--text); margin: 1rem 0 0.75rem; border-bottom: 2px solid var(--border); padding-bottom: 6px; }
.section-title.small { margin: 0; border: none; padding: 0; }

.field input, .field select { padding: 0.75rem 1rem !important; width: 100%; font-weight: 500; color: var(--text); background: var(--bg2) !important; border: 1.5px solid var(--border); border-radius: 10px; outline: none; }
.field input:focus, .field select:focus { border-color: #6366f1; background: var(--bg) !important; }

.help-text { font-size: 0.75rem; margin-top: 8px; font-weight: 600; }
.help-text.warning { color: #b45309; background: rgba(251, 191, 36, 0.1); padding: 10px; border-radius: 8px; border-left: 4px solid #f59e0b; }

/* Admin Card */
.admin-card { display: flex; align-items: center; gap: 1rem; background: var(--bg3); border: 2px solid var(--border); padding: 1.25rem; border-radius: 14px; transition: all 0.3s; }
.admin-card.active { border-color: #6366f1; background: rgba(99,102,241,0.1); }
.admin-content { flex: 1; }
.admin-label { display: block; font-weight: 800; color: var(--text); font-size: 1rem; }
.admin-desc { font-size: 0.75rem; color: var(--text2); margin: 0; }

.rotinas-header { display: flex; justify-content: space-between; align-items: center; }
.badge-count { font-size: 10px; font-weight: 800; background: #6366f1; color: white; padding: 3px 10px; border-radius: 20px; }

/* Rotinas Grid V2 */
.rotinas-grid-v2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.rotinas-grid-v2.is-admin { opacity: 0.5; cursor: not-allowed; }
.rotina-item-v2 { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 1.25rem; background: var(--bg3); border: 2px solid var(--border); border-radius: 14px; cursor: pointer; transition: all 0.2s; text-align: center; }
.rotina-item-v2:hover:not(.disabled) { border-color: #6366f1; transform: translateY(-3px); }
.rotina-item-v2.selected { background: var(--bg2); border-color: #6366f1; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.rotina-item-v2 input { position: absolute; opacity: 0; }
.r-icon { font-size: 28px; }
.r-label { font-size: 0.75rem; font-weight: 800; color: var(--text); line-height: 1.3; }
.r-check { position: absolute; top: 8px; right: 8px; font-size: 18px; color: #6366f1; opacity: 0; transition: all 0.2s; }
.rotina-item-v2.selected .r-check { opacity: 1; }

/* Especial para Modo Light */
[data-theme="light"] .rotina-item-v2 { background: #fff; border-color: #e2e8f0; }
[data-theme="light"] .rotina-item-v2.selected { background: #f8fafc; border-color: #6366f1; }
[data-theme="light"] .admin-card { background: #fff; }
[data-theme="light"] .field input, [data-theme="light"] .field select { background: #fff !important; }

.footer-status { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 800; color: var(--text2); margin-right: auto; }
.blob { width: 10px; height: 10px; border-radius: 50%; }
.blob.green { background: #10b981; }

.btn-primary.prestige { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; }

/* Base Styles */
.page-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { margin: 0; font-size: 1.6rem; color: var(--text); font-weight: 800; }
.page-sub { margin: 0; font-size: 0.95rem; color: var(--text2); }

.card { background: var(--bg2); border: 2px solid var(--border); border-radius: 16px; padding: 0.75rem; }

.tabela { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.tabela th { text-align: left; padding: 1.1rem; background: var(--bg3); color: var(--text); font-weight: 800; border-bottom: 2px solid var(--border); }
.tabela td { padding: 1.1rem; border-bottom: 1px solid var(--border); color: var(--text); }

.badge-filial { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; background: var(--bg3); color: var(--text2); border: 2px solid var(--border); }
.badge-filial.super { background: rgba(99,102,241,0.15); color: #6366f1; border-color: #6366f1; }

.badge-perfil { padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
.badge-perfil.admin { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
.badge-perfil.op { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }

.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-action { background: var(--bg3); border: 2px solid var(--border); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text); cursor: pointer; }

.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.8); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-card { 
  background: var(--bg2); 
  border-radius: 24px; 
  border: 2px solid var(--border); 
  display: flex; 
  flex-direction: column; 
  width: 100%; 
  max-height: 95vh; 
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden; /* Fix para cantos arredondados */
}
.modal-header { 
  padding: 1.5rem 2rem; 
  border-bottom: 2px solid var(--border); 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  background: var(--bg3); 
}
.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
}
.modal-body { padding: 2rem; overflow-y: auto; background: var(--bg2); }
.modal-footer { padding: 1.5rem 2rem; border-top: 2px solid var(--border); display: flex; justify-content: flex-end; gap: 1rem; background: var(--bg3); align-items: center; }
.close-btn { background: var(--bg4); border: none; color: var(--text); font-size: 1.5rem; cursor: pointer; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }

.grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.field label { font-size: 0.75rem; font-weight: 800; color: var(--text2); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }

.btn-primary { background: #6366f1; color: white; border: none; padding: 0.85rem 1.8rem; border-radius: 12px; font-weight: 700; cursor: pointer; }
.btn-ghost { background: var(--bg); border: 2px solid var(--border); color: var(--text); padding: 0.85rem 1.8rem; border-radius: 12px; font-weight: 700; cursor: pointer; }

.toggle { position: relative; width: 44px; height: 24px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; transition: .4s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background: #6366f1; }
input:checked + .slider:before { transform: translateX(20px); }

.animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
