<template>
  <div class="ab-wrap">
    
    <div class="ab-header">
      <div>
        <h1 class="ab-title">Gestão de Batidas & Localização</h1>
        <p class="ab-sub">Audite batidas manuais e verifique a localização GPS dos colaboradores.</p>
      </div>
      <div class="ab-header-actions">
        <div class="filter-group">
          <label>Período</label>
          <div class="date-inputs">
            <input v-model="filtro.inicio" type="date" class="ab-input" @change="carregar" />
            <span>até</span>
            <input v-model="filtro.fim" type="date" class="ab-input" @change="carregar" />
          </div>
        </div>
        <div class="filter-group">
          <label>Funcionário</label>
          <select v-model="filtro.funcionario_pk" class="ab-input" @change="carregar">
            <option value="">Todos os Funcionários</option>
            <option v-for="f in funcionarios" :key="f.pk" :value="f.pk">{{ f.nome }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Resumo -->
    <div class="ab-stats">
      <div class="ab-stat-card">
        <span class="ab-stat-label">Total de Batidas</span>
        <span class="ab-stat-val">{{ lista.length }}</span>
      </div>
      <div class="ab-stat-card">
        <span class="ab-stat-label">Com Localização GPS</span>
        <span class="ab-stat-val val-gps">{{ totalGPS }}</span>
      </div>
      <div class="ab-stat-card">
        <span class="ab-stat-label">Inserções Manuais</span>
        <span class="ab-stat-val val-manual">{{ totalManual }}</span>
      </div>
    </div>

    <!-- Tabela Principal -->
    <div class="ab-main">
      <div v-if="loading" class="ab-loading">
        <div class="spin"></div>
        <span>Carregando registros...</span>
      </div>

      <div v-else-if="lista.length === 0" class="ab-vazio">
        <span class="material-symbols-outlined">history</span>
        <p>Nenhuma batida encontrada para os filtros selecionados.</p>
      </div>

      <table v-else class="ab-table">
        <thead>
          <tr>
            <th>Funcionário</th>
            <th>Data</th>
            <th>Hora</th>
            <th>Tipo</th>
            <th>Origem / GPS</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in lista" :key="b.pk">
            <td>
              <div class="ab-func-cell">
                <strong>{{ b.funcionarios?.nome || 'Desconhecido' }}</strong>
                <small>{{ b.matricula }}</small>
              </div>
            </td>
            <td>{{ fmtData(b.data) }}</td>
            <td class="td-hora">{{ b.hora.substring(0, 5) }}</td>
            <td>
              <span :class="['badge-tipo', tipoBase(b.tipo)]">
                {{ tipoBase(b.tipo).toUpperCase() }}
              </span>
            </td>
            <td>
              <div class="origin-cell">
                <span v-if="b.tipo.includes('_manual')" class="badge-manual">MANUAL</span>
                <button v-if="b.latitude !== null" class="btn-gps" @click="abrirMapa(b)" title="Ver localização no mapa">
                  <span class="material-symbols-outlined">location_on</span>
                  Ver Localização
                </button>
                <span v-else-if="!b.tipo.includes('_manual')" class="td-muted">Sem coordenadas</span>
              </div>
            </td>
            <td>
              <div class="ab-actions">
                <button class="btn-delete" @click="remover(b)" title="Excluir batida">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Confirmação Exclusão -->
    <Teleport to="body">
      <div v-if="confirmarExclusao" @click.self="confirmarExclusao = null"
        style="position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:100%;max-width:420px;padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.5);">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
            <span class="material-symbols-outlined" style="font-size:32px;color:#f87171;">delete_forever</span>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text);">Excluir Batida</h3>
          </div>
          <p style="margin:0 0 20px;font-size:14px;color:var(--text2);line-height:1.6;">
            Deseja excluir a batida de <strong style="color:var(--text);">{{ confirmarExclusao.funcionarios?.nome || '—' }}</strong>
            às <strong style="color:var(--text);">{{ confirmarExclusao.hora.substring(0,5) }}</strong>
            do dia <strong style="color:var(--text);">{{ fmtData(confirmarExclusao.data) }}</strong>?
            <br/><span style="color:#f87171;font-size:12px;">Esta ação não pode ser desfeita.</span>
          </p>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button @click="confirmarExclusao = null" style="padding:9px 20px;border-radius:9px;background:var(--bg3);border:1px solid var(--border);color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
            <button @click="confirmarRemover" :disabled="removendo" style="padding:9px 20px;border-radius:9px;background:#dc2626;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
              <span v-if="removendo" style="width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin-ab .7s linear infinite;display:inline-block;"></span>
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Mapa (inline styles para funcionar com Teleport + CSS scoped) -->
    <Teleport to="body">
      <div
        v-if="modalMapa"
        @click.self="modalMapa = false"
        style="position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;"
      >
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:18px;width:100%;max-width:640px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6);">
          <!-- Cabeçalho -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);">
            <div>
              <h2 style="margin:0;font-size:1rem;font-weight:700;color:var(--text);">Localização da Batida</h2>
              <p v-if="batidaMapa" style="margin:3px 0 0;font-size:.8rem;color:var(--text2);">
                {{ batidaMapa.funcionarios?.nome }} · {{ fmtData(batidaMapa.data) }} às {{ batidaMapa.hora.substring(0,5) }}
              </p>
            </div>
            <button @click="modalMapa = false" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);font-size:20px;cursor:pointer;width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;">×</button>
          </div>

          <!-- Área do mapa -->
          <div style="position:relative;">
            <div v-if="mapaCarregando" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:var(--bg);z-index:2;">
              <div style="width:36px;height:36px;border:3px solid rgba(99,102,241,.2);border-top-color:#6366f1;border-radius:50%;animation:spin-ab .7s linear infinite;"></div>
              <span style="color:var(--text2);font-size:.85rem;">Carregando mapa...</span>
            </div>
            <div id="mapa-ab-container" style="height:380px;width:100%;"></div>
          </div>

          <!-- Rodapé -->
          <div style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--border);">
            <button @click="modalMapa = false" style="padding:9px 22px;border-radius:9px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-size:.875rem;font-weight:600;cursor:pointer;">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" :class="['ab-toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const sessao  = useSessaoStore();
const hojeStr = new Date().toISOString().split('T')[0];

const loading = ref(true);
const lista   = ref([]);
const funcionarios = ref([]);
const filtro  = ref({ inicio: hojeStr, fim: hojeStr, funcionario_pk: '' });

const totalGPS    = computed(() => lista.value.filter(b => b.latitude).length);
const totalManual = computed(() => lista.value.filter(b => b.tipo.includes('_manual')).length);

const toastMsg  = ref('');
const toastTipo = ref('ok');
const confirmarExclusao = ref(null);
const removendo = ref(false);

const modalMapa    = ref(false);
const batidaMapa   = ref(null);
const mapaCarregando = ref(false);
let   L_map        = null;

function toast(msg, tipo = 'ok') {
  toastMsg.value = msg;
  toastTipo.value = tipo;
  setTimeout(() => { toastMsg.value = ''; }, 3500);
}

function tipoBase(t) { return t.replace('_manual', ''); }
function fmtData(d)  { return d.split('-').reverse().join('/'); }

function carregarLeaflet() {
  if (window.L) return Promise.resolve(true);
  return new Promise((resolve) => {
    if (document.getElementById('leaflet-css')) {
      // CSS já inserido, só espera o script
    } else {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

watch(modalMapa, (val) => {
  if (!val && L_map) { L_map.remove(); L_map = null; }
});

async function abrirMapa(b) {
  // Abre o modal primeiro para dar feedback visual imediato
  batidaMapa.value   = b;
  modalMapa.value    = true;
  mapaCarregando.value = true;

  const ok = await carregarLeaflet();
  if (!ok || !window.L) {
    mapaCarregando.value = false;
    toast('Não foi possível carregar o mapa.', 'err');
    return;
  }

  // Usa nextTick para garantir que o div já está no DOM
  await nextTick();

  const container = document.getElementById('mapa-ab-container');
  if (!container) {
    mapaCarregando.value = false;
    toast('Erro interno: container do mapa não encontrado.', 'err');
    return;
  }

  try {
    if (L_map) { L_map.remove(); L_map = null; }

    const lat = parseFloat(b.latitude);
    const lng = parseFloat(b.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      mapaCarregando.value = false;
      toast('Coordenadas GPS inválidas.', 'err');
      return;
    }

    L_map = window.L.map(container, { zoomControl: true }).setView([lat, lng], 16);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(L_map);

    window.L.marker([lat, lng])
      .addTo(L_map)
      .bindPopup(`<b>${b.funcionarios?.nome || 'Funcionário'}</b><br>${b.hora.substring(0, 5)}`)
      .openPopup();

    mapaCarregando.value = false;
    // Força o mapa a recalcular o tamanho do container
    L_map.invalidateSize();

  } catch (err) {
    console.error('Erro Leaflet:', err);
    mapaCarregando.value = false;
    toast('Erro ao renderizar mapa: ' + err.message, 'err');
  }
}

async function carregar() {
  loading.value = true;
  try {
    let query = supabase
      .from('registro_ponto')
      .select('*, funcionarios(nome)')
      .gte('data', filtro.value.inicio)
      .lte('data', filtro.value.fim)
      .order('data', { ascending: false })
      .order('hora', { ascending: false });

    if (sessao.filial?.pk) query = query.eq('filial_pk', sessao.filial.pk);
    if (filtro.value.funcionario_pk) query = query.eq('funcionario_pk', filtro.value.funcionario_pk);

    const { data, error } = await query;
    if (error) throw error;
    lista.value = data || [];
  } catch (e) {
    toast('Erro ao carregar: ' + e.message, 'err');
  } finally {
    loading.value = false;
  }
}

async function carregarFuncionarios() {
  let q = supabase.from('funcionarios').select('pk, nome').eq('ativo', true).order('nome');
  if (sessao.filial?.pk) q = q.or(`filial_pk.eq.${sessao.filial.pk},filial_pk.is.null`);
  const { data } = await q;
  funcionarios.value = data || [];
}

function remover(b) {
  confirmarExclusao.value = b;
}

async function confirmarRemover() {
  const b = confirmarExclusao.value;
  if (!b) return;
  removendo.value = true;
  try {
    const { error } = await supabase.from('registro_ponto').delete().eq('pk', b.pk);
    if (error) throw error;
    confirmarExclusao.value = null;
    toast('Batida removida com sucesso');
    await carregar();
  } catch (e) {
    toast('Erro ao remover: ' + e.message, 'err');
  } finally {
    removendo.value = false;
  }
}

onMounted(() => {
  carregarFuncionarios();
  carregar();
});
</script>

<style scoped>
.ab-wrap { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }

.ab-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.ab-title { font-size: 1.6rem; font-weight: 800; color: var(--text); margin: 0; }
.ab-sub   { font-size: 0.9rem; color: var(--text2); margin: 4px 0 0; }

.ab-header-actions { display: flex; gap: 20px; flex-wrap: wrap; background: var(--bg2); padding: 16px 20px; border-radius: 16px; border: 1px solid var(--border); }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--text2); letter-spacing: 0.5px; }

.date-inputs { display: flex; align-items: center; gap: 10px; color: var(--text2); font-size: 0.8rem; }

.ab-input {
  background: var(--bg3); border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); padding: 8px 12px; font-size: 0.85rem; outline: none;
  transition: border-color 0.2s;
}
.ab-input:focus { border-color: var(--primary, #6366f1); }

.ab-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.ab-stat-card {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 20px;
  display: flex; flex-direction: column; gap: 6px;
}
.ab-stat-label { font-size: 0.75rem; font-weight: 600; color: var(--text2); }
.ab-stat-val   { font-size: 1.8rem; font-weight: 800; color: var(--text); }
.val-gps { color: #6366f1; }
.val-manual { color: #f59e0b; }

.ab-main { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; min-height: 200px; }
.ab-loading, .ab-vazio { padding: 80px 20px; text-align: center; color: var(--text2); display: flex; flex-direction: column; align-items: center; gap: 15px; }

.ab-table { width: 100%; border-collapse: collapse; }
.ab-table th { text-align: left; padding: 14px 20px; background: var(--bg3); font-size: 0.7rem; text-transform: uppercase; color: var(--text2); letter-spacing: 0.5px; border-bottom: 2px solid var(--border); }
.ab-table td { padding: 14px 20px; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
.ab-table tr:last-child td { border-bottom: none; }
.ab-table tr:hover td { background: var(--bg3); }

.ab-func-cell { display: flex; flex-direction: column; }
.ab-func-cell strong { font-size: 0.95rem; }
.ab-func-cell small   { color: var(--text2); font-size: 0.75rem; font-family: monospace; }
.td-hora { font-weight: 800; font-family: monospace; font-size: 1rem; }

.badge-tipo { padding: 4px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.5px; }
.badge-tipo.entrada { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
.badge-tipo.saida   { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }

.origin-cell { display: flex; align-items: center; gap: 12px; }
.badge-manual { background: #fef3c7; color: #92400e; font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; }
.btn-gps {
  display: flex; align-items: center; gap: 5px; color: #6366f1; text-decoration: none;
  font-weight: 700; font-size: 0.8rem; padding: 6px 12px; background: rgba(99,102,241,0.08);
  border-radius: 8px; border: 1px solid rgba(99,102,241,0.2); transition: all 0.2s;
}
.btn-gps:hover { background: rgba(99,102,241,0.15); border-color: #6366f1; }
.btn-gps .material-symbols-outlined { font-size: 18px; }

.ab-actions { display: flex; gap: 8px; }
.btn-delete {
  background: none; border: none; color: #ef4444; cursor: pointer; padding: 6px;
  border-radius: 8px; display: flex; align-items: center; transition: background 0.2s;
}
.btn-delete:hover { background: rgba(239,68,68,0.1); }

.modal-mapa { max-width: 600px; width: 100%; border: none; overflow: hidden; }
.mapa-container { height: 400px; width: 100%; background: #000; }
.mapa-info { padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; background: var(--bg3); border-top: 1px solid var(--border); }
.m-func { font-weight: 700; color: var(--text); }
.m-data { font-size: 0.85rem; color: var(--text2); }

.ab-toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 12px; color: #fff; font-weight: 600; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.ab-toast.ok { background: #10b981; }
.ab-toast.err { background: #ef4444; }

.td-muted { font-size: 0.8rem; color: var(--text2); opacity: 0.6; }

.spin { width: 24px; height: 24px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 800px) {
  .ab-stats { grid-template-columns: 1fr; }
  .ab-header-actions { width: 100%; justify-content: space-between; }
}
</style>
