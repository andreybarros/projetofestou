<template>
  <div class="page-wrap">
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">Filiais</h2>
        <p class="page-sub">Gerencie as unidades e pontos de venda da sua empresa</p>
      </div>
      <button @click="$router.push('/filiais/novo')" class="btn-primary">+ Nova Filial</button>
    </div>

    <div v-if="carregando" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando filiais...</p>
    </div>

    <div v-else-if="lista.length === 0" class="empty-state">
      <div class="icon">🏢</div>
      <h3>Nenhuma filial encontrada</h3>
      <p>Comece cadastrando a matriz ou sua primeira unidade.</p>
      <button @click="$router.push('/filiais/novo')" class="btn-primary">Cadastrar Agora</button>
    </div>

    <div v-else class="grid-unidades">
      <div v-for="f in lista" :key="f.pk" class="unidade-card" :class="{ inativa: !f.ativo }">
        <div class="card-header">
          <div class="codigo">{{ f.codigo }}</div>
          <div class="badge" :class="f.ativo ? 'ativo' : 'inativo'">
            {{ f.ativo ? 'Ativa' : 'Inativa' }}
          </div>
        </div>
        
        <div class="card-body">
          <h3 class="nome">{{ f.nome }}</h3>
          <p class="razao">{{ f.razao_social || '—' }}</p>
          
          <div class="info-list">
            <div class="info-item">
              <span class="icon">📄</span>
              <span>{{ f.cnpj || 'Sem CNPJ' }}</span>
            </div>
            <div class="info-item">
              <span class="icon">📍</span>
              <span class="truncate">{{ [f.cidade, f.uf].filter(Boolean).join('/') || 'Localização não informada' }}</span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="modulos-count">
             {{ f.modulos_count || 0 }} módulos ativos
          </div>
          <div class="acoes">
            <button @click="$router.push(`/filiais/${f.pk}/editar`)" class="btn-icon" title="Editar">✏️</button>
            <button @click="excluir(f)" class="btn-icon del" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../composables/useSupabase';

const lista = ref([]);
const carregando = ref(true);

onMounted(carregar);

async function carregar() {
  carregando.value = true;
  try {
    const { data: filiais, error } = await supabase.from('filiais').select('*').order('codigo');
    if (error) throw error;

    // Buscar contagem de módulos para cada filial
    const { data: modsCount } = await supabase.rpc('contar_modulos_filiais');
    // Obs: Se a RPC não existir ou falhar, buscamos manualmente
    
    const { data: todosMods } = await supabase.from('modulos_filiais').select('filial_pk').eq('ativo', true);
    
    lista.value = filiais.map(f => {
      const count = todosMods?.filter(m => m.filial_pk === f.pk).length || 0;
      return { ...f, modulos_count: count };
    });

  } catch (e) {
    console.error('Erro ao carregar filiais:', e);
  } finally {
    carregando.value = false;
  }
}

async function excluir(f) {
  if (!confirm(`Deseja realmente excluir a filial "${f.nome}"? Esta ação não pode ser desfeita.`)) return;

  try {
    const { error } = await supabase.from('filiais').delete().eq('pk', f.pk);
    if (error) throw error;
    await carregar();
  } catch (e) {
    alert('Erro ao excluir: ' + e.message);
  }
}
</script>

<style scoped>
.page-wrap { display: flex; flex-direction: column; gap: 2rem; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.page-title { margin: 0; font-size: 1.6rem; color: var(--text); font-weight: 700; }
.page-sub { margin: 0; font-size: 0.95rem; color: var(--text2); }

.btn-primary { background: #667eea; color: white; border: none; padding: 0.7rem 1.4rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
.btn-primary:hover { transform: translateY(-2px); background: #5a67d8; }

.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem; gap: 1rem; color: var(--text2); }
.spinner { width: 30px; height: 30px; border: 3px solid rgba(102,126,234,0.1); border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 5rem; background: var(--bg2); border-radius: 20px; border: 2px dashed var(--border); }
.empty-state .icon { font-size: 4rem; margin-bottom: 1rem; }
.empty-state h3 { margin: 0 0 0.5rem; color: var(--text); }
.empty-state p { opacity: 0.7; margin-bottom: 2rem; }

.grid-unidades { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }

.unidade-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; display: flex; flex-direction: column; transition: all 0.3s; overflow: hidden; }
.unidade-card:hover { transform: translateY(-5px); box-shadow: 10px 10px 20px rgba(0,0,0,0.1); border-color: #667eea; }
.unidade-card.inativa { opacity: 0.7; grayscale: 1; }

.card-header { padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
.codigo { font-family: monospace; font-weight: 800; font-size: 1.2rem; color: #667eea; background: rgba(102,126,234,0.1); padding: 0.2rem 0.6rem; border-radius: 6px; }

.badge { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 20px; text-transform: uppercase; }
.badge.ativo { background: #d1fae5; color: #065f46; }
.badge.inativo { background: #fee2e2; color: #b91c1c; }

.card-body { padding: 1.25rem; flex: 1; }
.nome { margin: 0; font-size: 1.15rem; color: var(--text); font-weight: 700; }
.razao { margin: 0.25rem 0 1rem; font-size: 0.85rem; color: var(--text2); }

.info-list { display: flex; flex-direction: column; gap: 0.5rem; }
.info-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text2); }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.card-footer { padding: 1rem 1.25rem; background: var(--bg3); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); }
.modulos-count { font-size: 0.8rem; font-weight: 600; color: var(--text2); }

.acoes { display: flex; gap: 0.5rem; }
.btn-icon { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 1rem; }
.btn-icon:hover { background: #667eea; color: white; border-color: #667eea; }
.btn-icon.del:hover { background: #ef4444; border-color: #ef4444; }
</style>
