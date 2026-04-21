<template>
  <div class="page-wrap">
    <div class="page-header">
      <div>
        <h1 class="page-title">Armazéns &amp; Endereços</h1>
        <p class="page-sub">Gerencie os depósitos e suas posições de estoque.</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input v-model="busca" type="text" placeholder="Buscar armazém..." class="busca-input" />
        </div>
        <button @click="$router.push('/armazens/novo')" class="btn-primary">
          <span class="material-symbols-outlined">add</span>
          Novo Armazém
        </button>
      </div>
    </div>

    <div v-if="carregando" class="loading">
      <div class="spin"></div>
      <span>Carregando...</span>
    </div>

    <div v-else-if="filtrados.length === 0" class="vazio">
      <span class="material-symbols-outlined" style="font-size:3rem;opacity:.3">warehouse</span>
      <p>Nenhum armazém encontrado.</p>
    </div>

    <div v-else class="cards-grid">
      <div v-for="a in filtrados" :key="a.pk" class="arm-card">
        <!-- Ícone + Info -->
        <div class="arm-top">
          <div class="arm-icon">
            <span class="material-symbols-outlined">warehouse</span>
          </div>
          <div class="arm-info">
            <div class="arm-cod">{{ a.id }}</div>
            <div class="arm-nome">{{ a.localizacao || '—' }}</div>
          </div>
          <span class="end-badge">{{ contarEnderecos(a.pk) }} end.</span>
        </div>

        <!-- Lista dos endereços (preview) -->
        <div class="end-preview" v-if="enderecosPorArmazem(a.pk).length">
          <div v-for="e in enderecosPorArmazem(a.pk).slice(0, 4)" :key="e.pk" class="end-chip">
            <span class="material-symbols-outlined" style="font-size:13px;">shelves</span>
            <span class="end-chip-cod">{{ e.codigo }}</span>
            <span v-if="e.descricao" class="end-chip-desc">{{ e.descricao }}</span>
          </div>
          <div v-if="enderecosPorArmazem(a.pk).length > 4" class="end-chip end-chip-more">
            +{{ enderecosPorArmazem(a.pk).length - 4 }} mais
          </div>
        </div>
        <div v-else class="end-vazio-card">Nenhum endereço cadastrado</div>

        <!-- Ações -->
        <div class="arm-actions">
          <button @click="$router.push(`/armazens/${a.pk}/editar`)" class="btn-edit">
            <span class="material-symbols-outlined">edit</span>
            Editar / Gerir Endereços
          </button>
          <button @click="solicitarExclusao(a)" class="btn-del">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Modal de confirmação de exclusão ── -->
    <Teleport to="body">
      <div v-if="armToDelete" style="position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:var(--bg2,#1e1e2e);border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:400px;padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <!-- Cabeçalho -->
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span class="material-symbols-outlined" style="color:#ef4444;">delete</span>
            </div>
            <div>
              <p style="margin:0;font-weight:700;font-size:.95rem;color:var(--text,#fff);">Excluir Armazém</p>
              <p style="margin:3px 0 0;font-size:.82rem;color:rgba(255,255,255,.5);">Esta ação não pode ser desfeita.</p>
            </div>
          </div>

          <!-- Detalhes -->
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 14px;">
            <p style="margin:0;font-size:.9rem;color:var(--text,#fff);">
              Excluir o armazém <strong style="color:#ef4444;">{{ armToDelete.id }}</strong>?
            </p>
            <p v-if="contarEnderecos(armToDelete.pk) > 0" style="margin:6px 0 0;font-size:.82rem;color:#f59e0b;display:flex;align-items:center;gap:6px;">
              <span class="material-symbols-outlined" style="font-size:15px;">warning</span>
              Isso também removerá <strong>{{ contarEnderecos(armToDelete.pk) }} endereço(s)</strong> vinculado(s).
            </p>
          </div>

          <!-- Botões -->
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button
              @click="armToDelete = null"
              style="padding:9px 18px;border-radius:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.8);font-size:.875rem;font-weight:600;cursor:pointer;"
            >Cancelar</button>
            <button
              @click="confirmarExclusao"
              :disabled="excluindo"
              style="padding:9px 18px;border-radius:9px;background:#ef4444;border:none;color:#fff;font-size:.875rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;opacity: excluindo ? .5 : 1;"
            >
              <span v-if="excluindo" class="spin-xs"></span>
              {{ excluindo ? 'Excluindo...' : 'Sim, excluir' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast de feedback -->
    <Teleport to="body">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';
import { useRouter } from 'vue-router';

const router      = useRouter();
const sessaoStore = useSessaoStore();
const lista       = ref([]);
const enderecos   = ref([]);
const carregando  = ref(true);
const busca       = ref('');
const armToDelete = ref(null);
const excluindo   = ref(false);
const toast       = ref('');

function showToast(msg, duracao = 2800) {
  toast.value = msg;
  setTimeout(() => { toast.value = ''; }, duracao);
}

const filtrados = computed(() => {
  const q = busca.value.trim().toLowerCase();
  if (!q) return lista.value;
  return lista.value.filter(a =>
    (a.id          || '').toLowerCase().includes(q) ||
    (a.localizacao || '').toLowerCase().includes(q)
  );
});

function enderecosPorArmazem(armPk) {
  return enderecos.value.filter(e => e.armazem_pk == armPk);
}

function contarEnderecos(armPk) {
  return enderecosPorArmazem(armPk).length;
}

onMounted(carregar);

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase.from('armazem').select('pk, filial, id, localizacao').order('id');
    if (sessaoStore.filial?.codigo) q = q.eq('filial', sessaoStore.filial.codigo);
    const { data, error } = await q;
    if (error) throw error;
    lista.value = data || [];

    // Carrega todos os endereços de uma vez
    const { data: ends } = await supabase
      .from('endereco_armazem')
      .select('pk, armazem_pk, codigo, descricao')
      .order('codigo');
    enderecos.value = ends || [];
  } catch (e) {
    console.error(e.message);
  } finally {
    carregando.value = false;
  }
}

// Abre o modal de confirmação (substitui o confirm() nativo)
function solicitarExclusao(a) {
  armToDelete.value = a;
}

// Executa a exclusão após confirmação no modal
async function confirmarExclusao() {
  const a = armToDelete.value;
  if (!a) return;
  excluindo.value = true;
  try {
    await supabase.from('endereco_armazem').delete().eq('armazem_pk', String(a.pk));
    const { error } = await supabase.from('armazem').delete().eq('pk', String(a.pk));
    if (error) throw error;
    armToDelete.value = null;
    await carregar();
    showToast(`Armazém "${a.id}" excluído com sucesso.`);
  } catch (e) {
    armToDelete.value = null;
    showToast('Erro ao excluir: ' + e.message);
  } finally {
    excluindo.value = false;
  }
}
</script>

<style scoped>
.page-wrap    { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header  { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title   { margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--text); }
.page-sub     { margin: 3px 0 0; font-size: .85rem; color: var(--text2); }

.header-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; }
.search-box     { position: relative; display: flex; align-items: center; }
.search-icon    { position: absolute; left: 10px; font-size: 20px; color: var(--text2); pointer-events: none; }
.busca-input    { padding: .55rem .9rem .55rem 2.4rem; border: 1px solid var(--border); border-radius: 10px; width: 260px; background: var(--bg2); color: var(--text); font-size: .9rem; outline: none; transition: border-color .2s; }
.busca-input:focus { border-color: #6366f1; }

.btn-primary { display: flex; align-items: center; gap: 5px; padding: .55rem 1.1rem; background: #6366f1; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: .9rem; white-space: nowrap; transition: opacity .15s; }
.btn-primary:hover { opacity: .88; }

/* Cards grid */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }

.arm-card {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 16px;
  padding: 18px 20px; display: flex; flex-direction: column; gap: 14px;
  transition: box-shadow .2s, border-color .2s;
}
.arm-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.12); border-color: rgba(99,102,241,.3); }

.arm-top  { display: flex; align-items: center; gap: 12px; }
.arm-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.2); display: flex; align-items: center; justify-content: center; color: #f59e0b; flex-shrink: 0; }
.arm-info { flex: 1; }
.arm-cod  { font-family: monospace; font-size: 1rem; font-weight: 800; color: var(--text); }
.arm-nome { font-size: .82rem; color: var(--text2); margin-top: 1px; }
.end-badge { padding: 3px 10px; border-radius: 20px; font-size: .7rem; font-weight: 800; background: rgba(99,102,241,.1); color: #6366f1; border: 1px solid rgba(99,102,241,.2); white-space: nowrap; }

/* Preview de endereços */
.end-preview { display: flex; flex-direction: column; gap: 5px; }
.end-chip {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px;
  background: var(--bg3); border: 1px solid var(--border); border-radius: 8px;
  font-size: .8rem; color: var(--text);
}
.end-chip-cod  { font-weight: 700; font-family: monospace; color: #6366f1; }
.end-chip-desc { color: var(--text2); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.end-chip-more { justify-content: center; color: var(--text2); font-style: italic; border-style: dashed; }
.end-vazio-card { font-size: .8rem; color: var(--text2); font-style: italic; text-align: center; padding: 8px; border: 1px dashed var(--border); border-radius: 8px; }

/* Ações */
.arm-actions { display: flex; gap: 8px; }
.btn-edit {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 12px; border-radius: 9px; background: var(--bg3); border: 1px solid var(--border);
  color: var(--text2); font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .15s;
}
.btn-edit:hover { border-color: #6366f1; color: #6366f1; }
.btn-del {
  width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
  border-radius: 9px; background: none; border: 1px solid var(--border);
  color: #ef4444; cursor: pointer; transition: background .15s;
}
.btn-del:hover { background: rgba(239,68,68,.08); }

.loading { display: flex; align-items: center; gap: 12px; padding: 4rem; color: var(--text2); }
.vazio   { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text2); padding: 4rem; }
.spin { width: 24px; height: 24px; border: 3px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
.spin-xs { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: #10b981; color: #fff; padding: 10px 24px; border-radius: 12px; font-weight: 600; font-size: .9rem; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,.3); }
</style>
