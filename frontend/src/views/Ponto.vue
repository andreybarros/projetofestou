<template>
  <div class="pt-wrap">

    <!-- Cabeçalho -->
    <div class="pt-header">
      <div>
        <h1 class="pt-title">Ponto Eletrônico</h1>
        <span class="pt-sub">Registre sua entrada e saída</span>
      </div>
      <button v-if="isAdmin" class="btn-manual-toggle" @click="abrirManual">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Inserir Manual
      </button>
    </div>

    <!-- Card principal -->
    <div class="punch-card">

      <!-- Matrícula -->
      <div class="mat-row">
        <div class="mat-label">Matrícula</div>
        <div class="mat-value">{{ operador?.matricula || '—' }}</div>
        <div class="mat-name">{{ funcNome || operador?.nome || '' }}</div>
      </div>

      <div class="divider"></div>

      <!-- Status GPS -->
      <div class="geo-row">
        <div :class="['geo-dot', { active: geoOk }]"></div>
        <span class="geo-txt">{{ geoTxt }}</span>
        <button v-if="!geoOk && !geoCarregando" class="btn-retry-geo" @click="obterGeo">
          Tentar novamente
        </button>
      </div>

      <!-- Aviso HTTPS -->
      <div v-if="geoErrHttps" class="geo-warning">
        ⚠️ Geolocalização requer HTTPS. Se estiver em IP local, o navegador bloqueia o GPS.
      </div>

      <!-- Botões de batida -->
      <div class="punch-actions">
        <button
          class="btn-punch btn-entrada"
          :disabled="(exigeGps && !geoOk) || registrando"
          @click="registrar('entrada')"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          <strong>Entrada</strong>
          <span v-if="registrando && tipoRegistrando === 'entrada'" class="spin-btn"></span>
        </button>
        <button
          class="btn-punch btn-saida"
          :disabled="(exigeGps && !geoOk) || registrando"
          @click="registrar('saida')"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <strong>Saída</strong>
          <span v-if="registrando && tipoRegistrando === 'saida'" class="spin-btn"></span>
        </button>
      </div>

    </div>

    <!-- Histórico do dia -->
    <div class="hist-card">
      <div class="hist-header">
        <span class="hist-title">Batidas de hoje</span>
        <span class="hist-date">{{ dataHoje }}</span>
      </div>

      <div v-if="carregandoHist" class="hist-loading">
        <div class="spin"></div>
      </div>

      <div v-else-if="historico.length === 0" class="hist-empty">
        Nenhuma batida registrada hoje.
      </div>

      <div v-else class="hist-list">
        <div v-for="p in historico" :key="p.pk" class="hist-item">
          <div class="hist-item-left">
            <span :class="['badge-tipo', tipoBase(p.tipo) === 'entrada' ? 'entrada' : 'saida']">
              {{ tipoBase(p.tipo).toUpperCase() }}
            </span>
            <span v-if="p.tipo.includes('_manual')" class="badge-manual">MANUAL</span>
            <span class="hist-func">{{ p.funcionarios?.nome || '' }}</span>
          </div>
          <div class="hist-hora">{{ p.hora.substring(0, 5) }}</div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" :class="['pt-toast', toastTipo]">{{ toastMsg }}</div>
    </Transition>

    <!-- Modal Inserção Manual -->
    <Teleport to="body">
      <div v-if="modalManual" class="modal-backdrop" @click.self="fecharManual">
        <div class="modal-box">
          <div class="modal-header">
            <h2 class="modal-title">Inserir Batida Manual</h2>
            <button class="modal-close" @click="fecharManual">×</button>
          </div>

          <div class="modal-body">
            <div class="form-field">
              <label>Funcionário</label>
              <select v-model="manual.funcionario_pk" class="pt-input">
                <option value="">Selecione...</option>
                <option v-for="f in funcionariosManual" :key="f.pk" :value="f.pk">
                  {{ f.nome }}{{ f.matricula ? ' (' + f.matricula + ')' : '' }}
                </option>
              </select>
            </div>

            <div class="form-grid">
              <div class="form-field">
                <label>Tipo</label>
                <select v-model="manual.tipo" class="pt-input">
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div class="form-field">
                <label>Data</label>
                <input v-model="manual.data" type="date" class="pt-input" />
              </div>
            </div>

            <div class="form-field">
              <label>Hora</label>
              <input v-model="manual.hora" type="time" class="pt-input" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="modal-btn cancel" @click="fecharManual">Cancelar</button>
            <button
              class="modal-btn save"
              :disabled="inserindoManual || !manual.funcionario_pk || !manual.data || !manual.hora"
              @click="inserirManual"
            >
              <span v-if="inserindoManual" class="spin-xs"></span>
              {{ inserindoManual ? 'Inserindo…' : 'Inserir Batida' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { useParametrosStore } from '../stores/parametros';
import apiClient from '../services/api';
import { supabase } from '../composables/useSupabase';

const sessao   = useSessaoStore();
const parametrosStore = useParametrosStore();
const operador = computed(() => sessao.operador);
const isAdmin  = computed(() => !!sessao.operador?.admin);

// Geo
const geoOk         = ref(false);
const geoCarregando = ref(false);
const geoErrHttps   = ref(false);
const geoTxt        = ref('Aguardando geolocalização...');
const geo           = ref({ lat: null, lng: null });
const exigeGps      = computed(() => parametrosStore.getParam('ponto_exigir_gps', true));

// Estado
const funcNome        = ref('');
const registrando     = ref(false);
const tipoRegistrando = ref('');
const historico       = ref([]);
const carregandoHist  = ref(false);
const toastMsg        = ref('');
const toastTipo       = ref('ok');
let   _toastTimer     = null;

// Modal manual
const modalManual      = ref(false);
const inserindoManual  = ref(false);
const funcionariosManual = ref([]);
const manual = ref({ funcionario_pk: '', tipo: 'entrada', data: '', hora: '' });

const dataHoje = computed(() => new Date().toLocaleDateString('pt-BR'));

function tipoBase(t) { return t.replace('_manual', ''); }

function toast(msg, tipo = 'ok', dur = 3500) {
  clearTimeout(_toastTimer);
  toastMsg.value  = msg;
  toastTipo.value = tipo;
  _toastTimer = setTimeout(() => { toastMsg.value = ''; }, dur);
}

function obterGeo() {
  if (!navigator.geolocation) {
    geoTxt.value = 'Geolocalização não suportada pelo navegador.';
    return;
  }
  geoCarregando.value = true;
  geoTxt.value = 'Obtendo localização...';

  navigator.geolocation.getCurrentPosition(
    pos => {
      geo.value.lat = pos.coords.latitude;
      geo.value.lng = pos.coords.longitude;
      geoOk.value         = true;
      geoCarregando.value = false;
      geoTxt.value        = 'Localização capturada com sucesso.';
    },
    err => {
      geoOk.value         = false;
      geoCarregando.value = false;
      if (!exigeGps.value) {
           geoTxt.value = `📍 Não obrigatório (${err.message})`;
      } else {
           geoTxt.value = 'Erro ao obter localização: ' + err.message;
      }
      
      const proto = window.location.protocol;
      const host  = window.location.hostname;
      if (proto !== 'https:' && host !== 'localhost' && host !== '127.0.0.1') {
        geoErrHttps.value = true;
      }
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

async function carregarNomeFuncionario() {
  const mat = operador.value?.matricula;
  if (!mat) return;
  const { data } = await supabase
    .from('funcionarios')
    .select('nome')
    .eq('matricula', mat)
    .eq('ativo', true)
    .maybeSingle();
  if (data) funcNome.value = data.nome;
}

async function carregarHistorico() {
  const mat = operador.value?.matricula;
  if (!mat) return;
  carregandoHist.value = true;
  try {
    const res = await apiClient.get(`/api/ponto/historico-dia/${mat}`);
    historico.value = res.data || [];
  } catch (e) {
    console.error('Erro historico', e);
  } finally {
    carregandoHist.value = false;
  }
}

async function registrar(tipo) {
  const mat = operador.value?.matricula;
  const funcPk = operador.value?.funcionario_pk;
  
  if (!mat) { toast('Seu usuário não possui matrícula vinculada.', 'err'); return; }
  if (exigeGps.value && !geoOk.value) { toast('Geolocalização obrigatória não capturada. Tente novamente.', 'err'); return; }

  registrando.value     = true;
  tipoRegistrando.value = tipo;

  try {
    const payload = {
      filial_pk:      sessao.filial?.pk || null,
      funcionario_pk: funcPk,
      matricula:      mat,
      tipo,
      lat:            geo.value.lat,
      lng:            geo.value.lng,
    };

    const res = await apiClient.post('/api/ponto/batida', payload);
    toast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} registrada com sucesso.`);
    await carregarHistorico();
  } catch (e) {
    toast('Erro ao registrar ponto: ' + (e.response?.data?.erro || e.message), 'err', 6000);
  } finally {
    registrando.value     = false;
    tipoRegistrando.value = '';
  }
}

async function abrirManual() {
  modalManual.value = true;
  const ownMat = operador.value?.matricula || null;
  const { data } = await supabase
    .from('funcionarios')
    .select('pk, nome, matricula')
    .eq('ativo', true)
    .order('nome');
  funcionariosManual.value = (data || []).filter(f => f.matricula !== ownMat);

  const agora = new Date();
  manual.value = {
    funcionario_pk: '',
    tipo:  'entrada',
    data:  agora.toLocaleDateString('en-CA'),
    hora:  agora.toLocaleTimeString('pt-BR', { hour12: false }).substring(0, 5),
  };
}

function fecharManual() {
  modalManual.value = false;
}

async function inserirManual() {
  if (!manual.value.funcionario_pk || !manual.value.data || !manual.value.hora) return;
  inserindoManual.value = true;
  try {
    const funcSel = funcionariosManual.value.find(f => f.pk === manual.value.funcionario_pk);
    const res = await apiClient.post('/api/ponto/batida-manual', {
      filial_pk:      sessao.filial?.pk || null,
      funcionario_pk: manual.value.funcionario_pk,
      matricula:      funcSel?.matricula || '',
      tipo:           manual.value.tipo + '_manual',
      data:           manual.value.data,
      hora:           manual.value.hora + ':00'
    });
    
    toast('Batida manual inserida com sucesso!');
    fecharManual();
    await carregarHistorico();
  } catch (e) {
    toast('Erro ao inserir: ' + (e.response?.data?.erro || e.message), 'err', 6000);
  } finally {
    inserindoManual.value = false;
  }
}

onMounted(async () => {
  obterGeo();
  await Promise.all([carregarNomeFuncionario(), carregarHistorico()]);
});
</script>

<style scoped>
.pt-wrap { display: flex; flex-direction: column; gap: 20px; max-width: 560px; padding-bottom: 40px; }

/* Cabeçalho */
.pt-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pt-title  { margin: 0; font-size: 1.4rem; font-weight: 700; color: var(--text); }
.pt-sub    { font-size: .8rem; color: var(--text2); }

.btn-manual-toggle {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 16px; background: var(--bg2);
  border: 1px solid var(--border); border-radius: 9px;
  color: var(--text2); font-size: .82rem; font-weight: 600; cursor: pointer;
  transition: all .15s;
}
.btn-manual-toggle:hover { color: #6366f1; border-color: #6366f1; background: rgba(99,102,241,.06); }

/* Card principal */
.punch-card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px;
}

.mat-row  { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.mat-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text2); }
.mat-value { font-family: monospace; font-size: 1rem; font-weight: 700; color: var(--text);
  background: var(--bg3); padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border); }
.mat-name  { font-size: .85rem; color: var(--text2); }

.divider { border: none; border-top: 1px solid var(--border); }

/* GPS */
.geo-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.geo-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--border); flex-shrink: 0;
  transition: background .3s;
}
.geo-dot.active {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16,185,129,.2);
  animation: pulse 1.2s infinite;
}
.geo-txt { font-size: .8rem; color: var(--text2); flex: 1; }
.btn-retry-geo {
  font-size: .75rem; font-weight: 600; color: #6366f1;
  background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline;
}

.geo-warning {
  background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.25);
  color: #dc2626; border-radius: 8px; padding: 10px 14px; font-size: .78rem; line-height: 1.5;
}

/* Botões de batida */
.punch-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
.btn-punch {
  padding: 20px 16px; border-radius: 14px;
  font-size: .95rem; font-weight: 700;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer; transition: all .2s; border: 2px solid transparent;
  position: relative;
}
.btn-punch:disabled { opacity: .35; cursor: not-allowed; filter: grayscale(.4); transform: none !important; }

.btn-entrada {
  background: #ecfdf5; color: #065f46; border-color: #a7f3d0;
}
.btn-entrada:not(:disabled):hover { background: #d1fae5; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16,185,129,.2); }

.btn-saida {
  background: #fff1f2; color: #9f1239; border-color: #fecdd3;
}
.btn-saida:not(:disabled):hover { background: #ffe4e6; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(244,63,94,.2); }

.spin-btn {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(0,0,0,.15); border-top-color: currentColor;
  border-radius: 50%; animation: spin .7s linear infinite;
  position: absolute; top: 10px; right: 10px;
}

/* Histórico */
.hist-card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden;
}
.hist-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--border);
}
.hist-title { font-size: .875rem; font-weight: 700; color: var(--text); }
.hist-date  { font-size: .78rem; color: var(--text2); }
.hist-loading { display: flex; align-items: center; justify-content: center; padding: 30px; }
.hist-empty   { padding: 30px; text-align: center; font-size: .85rem; color: var(--text2); }

.hist-list { display: flex; flex-direction: column; }
.hist-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-bottom: 1px solid var(--border);
  transition: background .1s;
}
.hist-item:last-child { border-bottom: none; }
.hist-item:hover { background: var(--bg3); }

.hist-item-left { display: flex; align-items: center; gap: 8px; }

.badge-tipo {
  padding: 3px 10px; border-radius: 20px;
  font-size: .7rem; font-weight: 700; letter-spacing: .3px;
}
.badge-tipo.entrada { background: rgba(16,185,129,.12); color: #065f46; border: 1px solid rgba(16,185,129,.25); }
.badge-tipo.saida   { background: rgba(239,68,68,.1);   color: #991b1b; border: 1px solid rgba(239,68,68,.2); }

.badge-manual {
  font-size: .65rem; font-weight: 700; background: #fef9c3;
  color: #713f12; border: 1px solid #fcd34d; border-radius: 4px; padding: 1px 5px;
}
.hist-func { font-size: .8rem; color: var(--text2); }
.hist-hora { font-family: monospace; font-weight: 700; font-size: .95rem; color: var(--text); }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 16px; width: 100%; max-width: 440px;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 60px rgba(0,0,0,.35);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border);
}
.modal-title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); }
.modal-close { background: none; border: none; color: var(--text2); font-size: 22px; cursor: pointer; padding: 2px 6px; border-radius: 6px; transition: color .15s; }
.modal-close:hover { color: var(--text); }
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--border); }

.form-field { display: flex; flex-direction: column; gap: 5px; }
.form-field label { font-size: .73rem; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; }
.form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.pt-input {
  width: 100%; padding: 9px 12px;
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: .875rem;
  outline: none; transition: border-color .15s;
  appearance: auto;
}
.pt-input:focus { border-color: #6366f1; }

.modal-btn {
  flex: 1; padding: 10px; border-radius: 9px;
  font-size: .875rem; font-weight: 600; cursor: pointer;
  border: none; transition: opacity .15s;
}
.modal-btn.cancel { background: var(--bg3); color: var(--text2); border: 1px solid var(--border); }
.modal-btn.cancel:hover { color: var(--text); }
.modal-btn.save   { background: #6366f1; color: #fff; }
.modal-btn.save:hover:not(:disabled) { opacity: .88; }
.modal-btn.save:disabled { opacity: .4; cursor: not-allowed; }

/* Toast */
.pt-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  z-index: 10000; padding: 12px 22px; border-radius: 10px;
  font-size: .875rem; font-weight: 500; white-space: nowrap;
  pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,.25);
}
.pt-toast.ok  { background: #052e16; color: #6ee7b7; border: 1px solid rgba(16,185,129,.3); }
.pt-toast.err { background: #1f0707; color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
.toast-enter-active { transition: all .25s ease; }
.toast-leave-active { transition: all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* Spinners */
.spin {
  width: 20px; height: 20px;
  border: 2px solid rgba(99,102,241,.2); border-top-color: #6366f1;
  border-radius: 50%; animation: spin .7s linear infinite;
}
.spin-xs {
  display: inline-block; width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite;
}

@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse {
  0%   { transform: scale(1);   opacity: 1; }
  50%  { transform: scale(1.3); opacity: .7; }
  100% { transform: scale(1);   opacity: 1; }
}

@media (max-width: 500px) {
  .punch-actions { grid-template-columns: 1fr; }
  .form-grid     { grid-template-columns: 1fr; }
}
</style>
