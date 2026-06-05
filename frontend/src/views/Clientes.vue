<template>
  <div class="cl-page">

    <!-- ── Header ── -->
    <div class="cl-header">
      <div>
        <h1 class="cl-title">Clientes</h1>
        <p class="cl-sub">Gerencie sua base de clientes e visualize informações de perfil detalhadas.</p>
      </div>
      <button class="cl-btn-new" @click="$router.push('/clientes/novo')">
        <span class="material-symbols-outlined">add</span>
        Novo Cliente
      </button>
    </div>

    <!-- ── Metric Cards ── -->
    <div class="cl-metrics">

      <div class="cl-card cl-card--green">
        <div class="cl-card-head">
          <span class="cl-card-label">Total de Clientes</span>
          <div class="cl-card-ico cl-ico--green">
            <span class="material-symbols-outlined">group</span>
          </div>
        </div>
        <div class="cl-card-body">
          <div>
            <div class="cl-card-num">{{ lista.length.toLocaleString('pt-BR') }}</div>
            <div class="cl-pill cl-pill--green">
              <span class="material-symbols-outlined">trending_up</span>
              Base ativa
            </div>
          </div>
        </div>
      </div>

      <div class="cl-card cl-card--blue">
        <div class="cl-card-head">
          <span class="cl-card-label">Com Aniversário na Semana</span>
          <div class="cl-card-ico cl-ico--blue">
            <span class="material-symbols-outlined">cake</span>
          </div>
        </div>
        <div class="cl-card-body">
          <div>
            <div class="cl-card-num">{{ aniversariantes.length }}</div>
            <div class="cl-pill cl-pill--blue">
              <span class="material-symbols-outlined">calendar_month</span>
              Próximos 7 dias
            </div>
          </div>
        </div>
      </div>

      <div class="cl-card cl-card--violet">
        <div class="cl-card-head">
          <span class="cl-card-label">Decoradores Premium</span>
          <div class="cl-card-ico cl-ico--violet">
            <span class="material-symbols-outlined">star</span>
          </div>
        </div>
        <div class="cl-card-body">
          <div>
            <div class="cl-card-num">{{ totalDecoradores }}</div>
            <div class="cl-pill cl-pill--violet">
              <span class="material-symbols-outlined">pie_chart</span>
              {{ pctDecoradores }}% do total
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Aniversariantes ── -->
    <div v-if="aniversariantes.length" class="cl-bday">
      <div class="cl-bday-left">
        <div class="cl-bday-ico">🎂</div>
        <div>
          <div class="cl-bday-titulo">Aniversariantes da Semana</div>
          <div class="cl-bday-sub">
            {{ aniversariantes.length }} cliente{{ aniversariantes.length > 1 ? 's' : '' }}
            fazem aniversário nos próximos 7 dias
          </div>
        </div>
      </div>
      <div class="cl-bday-sep"></div>
      <div class="cl-bday-lista">
        <div
          v-for="a in aniversariantes"
          :key="a.pk"
          class="cl-bday-chip"
          :class="{ 'cl-bday-chip--hoje': a.ehHoje }"
        >
          <div class="cl-bday-ava" :style="{ background: avatarGrad(a.nome) }">
            {{ a.nome?.charAt(0)?.toUpperCase() }}
          </div>
          <div class="cl-bday-info">
            <span class="cl-bday-nome">
              {{ a.nome?.split(' ').slice(0, 2).join(' ').toUpperCase() }}
              <span v-if="a.ehHoje" class="cl-bday-hoje-badge">HOJE</span>
            </span>
            <span class="cl-bday-data">{{ a.ehHoje ? 'Hoje!' : fmtDia(a.data_nascimento) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Toolbar ── -->
    <div class="cl-toolbar">
      <div class="cl-search-wrap">
        <span class="material-symbols-outlined cl-search-ico">search</span>
        <input
          v-model="busca"
          type="search"
          class="cl-search"
          placeholder="Buscar por nome, CPF ou telefone…"
        />
        <button v-if="busca" class="cl-search-clear" @click="busca = ''">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="cl-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.val"
          class="cl-tab"
          :class="{ 'cl-tab--on': filtroAtivo === tab.val }"
          @click="filtroAtivo = tab.val; pagina = 1"
        >
          {{ tab.label }}
          <span class="cl-tab-count">{{ tab.count }}</span>
        </button>
      </div>
    </div>

    <!-- ── Table ── -->
    <div class="cl-tbl-card">

      <!-- Loading -->
      <div v-if="carregando" class="cl-state">
        <div class="cl-spinner"></div>
        <span>Carregando clientes…</span>
      </div>

      <!-- Empty -->
      <div v-else-if="filtrados.length === 0" class="cl-state">
        <span class="material-symbols-outlined cl-empty-ico">manage_search</span>
        <span class="cl-empty-txt">Nenhum cliente encontrado</span>
        <span class="cl-empty-sub">Tente ajustar a busca ou os filtros</span>
      </div>

      <template v-else>
        <div class="cl-tbl-scroll">
          <table class="cl-tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Cidade / UF</th>
                <th>Decorador</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in paginados" :key="c.pk" class="cl-row">
                <td>
                  <div class="cl-name-cell">
                    <div class="cl-ava" :style="{ background: avatarGrad(c.nome) }">
                      {{ c.nome?.charAt(0)?.toUpperCase() }}
                    </div>
                    <div>
                      <div class="cl-name-main">{{ c.nome }}</div>
                      <div class="cl-name-sub">{{ [c.cidade, c.uf].filter(Boolean).join(' / ') || '—' }}</div>
                    </div>
                  </div>
                </td>
                <td class="cl-mono">{{ c.cpf || '—' }}</td>
                <td class="cl-mono">{{ c.telefone || '—' }}</td>
                <td class="cl-muted">{{ c.email || '—' }}</td>
                <td class="cl-muted">{{ [c.cidade, c.uf].filter(Boolean).join(' / ') || '—' }}</td>
                <td>
                  <span :class="['cl-badge', c.decorador ? 'cl-badge--sim' : 'cl-badge--nao']">
                    <span class="cl-badge-pip"></span>
                    {{ c.decorador ? 'SIM' : 'NÃO' }}
                  </span>
                </td>
                <td class="cl-actions-td">
                  <div class="cl-acts">
                    <button
                      class="cl-act"
                      @click="$router.push(`/clientes/${c.pk}/editar`)"
                      title="Editar"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="cl-act cl-act--del" @click="excluir(c)" title="Excluir">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="cl-foot">
          <div class="cl-pg-info">
            Mostrando <strong>{{ resumoInfo }}</strong>
            de <strong>{{ filtrados.length.toLocaleString('pt-BR') }}</strong>
            cliente{{ filtrados.length !== 1 ? 's' : '' }}
          </div>
          <div v-if="totalPaginas > 1" class="cl-pg-ctrls">
            <button class="cl-pg-btn" :disabled="pagina === 1" @click="pagina--">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <template v-for="p in paginacaoVisiveis" :key="p">
              <span v-if="p === '...'" class="cl-pg-dots">···</span>
              <button
                v-else
                class="cl-pg-btn"
                :class="{ 'cl-pg-btn--on': p === pagina }"
                @click="pagina = p"
              >{{ p }}</button>
            </template>
            <button class="cl-pg-btn" :disabled="pagina === totalPaginas" @click="pagina++">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </template>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useSessaoStore } from '../stores/sessao';
import { supabase } from '../composables/useSupabase';

const sessaoStore = useSessaoStore();
const lista       = ref([]);
const carregando  = ref(true);
const busca       = ref('');
const pagina      = ref(1);
const filtroAtivo = ref('todos');
const POR_PAGINA  = 20;

// ── Avatar gradient ──
const GRADS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#11998e,#38ef7d)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#fd7943,#e8470a)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#6366f1,#6366f1)',
  'linear-gradient(135deg,#f7971e,#ffd200)',
];

function avatarGrad(nome) {
  if (!nome) return GRADS[0];
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h + nome.charCodeAt(i)) % GRADS.length;
  return GRADS[h];
}

// ── Metrics ──

const totalDecoradores = computed(() => lista.value.filter(c => c.decorador).length);
const pctDecoradores   = computed(() =>
  lista.value.length ? Math.round(totalDecoradores.value / lista.value.length * 100) : 0
);

// ── Tabs ──
const tabs = computed(() => [
  { val: 'todos',       label: 'Todos',       count: lista.value.length },
  { val: 'decoradores', label: 'Decoradores', count: totalDecoradores.value },
]);

// ── Filtering ──
const filtrados = computed(() => {
  let res = lista.value;

  if (filtroAtivo.value === 'decoradores') {
    res = res.filter(c => c.decorador);
  }

  const q = busca.value.trim().toLowerCase();
  if (q) res = res.filter(c =>
    (c.nome      || '').toLowerCase().includes(q) ||
    (c.cpf       || '').includes(q) ||
    (c.telefone  || '').includes(q)
  );

  return res;
});

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / POR_PAGINA)));

const paginados = computed(() => {
  const ini = (pagina.value - 1) * POR_PAGINA;
  return filtrados.value.slice(ini, ini + POR_PAGINA);
});

const resumoInfo = computed(() => {
  const ini = (pagina.value - 1) * POR_PAGINA + 1;
  const fim = Math.min(pagina.value * POR_PAGINA, filtrados.value.length);
  return `${ini}–${fim}`;
});

const paginacaoVisiveis = computed(() => {
  const tp = totalPaginas.value;
  const p  = pagina.value;
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
  const pages = [1];
  if (p > 3) pages.push('...');
  for (let i = Math.max(2, p - 1); i <= Math.min(tp - 1, p + 1); i++) pages.push(i);
  if (p < tp - 2) pages.push('...');
  pages.push(tp);
  return pages;
});

watch(busca,       () => { pagina.value = 1; });
watch(filtroAtivo, () => { pagina.value = 1; });

// ── Data ──
onMounted(carregar);

async function carregar() {
  carregando.value = true;
  try {
    let q = supabase
      .from('clientes')
      .select('pk, nome, cpf, telefone, email, decorador, cidade, uf, data_nascimento')
      .eq('ativo', true)
      .order('nome');
    if (sessaoStore.filial?.pk) q = q.eq('filial_pk', sessaoStore.filial.pk);
    const { data, error } = await q;
    if (error) throw error;
    lista.value = data || [];
  } catch (e) {
    console.error('[Clientes/carregar]', e.message);
  } finally {
    carregando.value = false;
  }
}

async function excluir(c) {
  if (!confirm(`Excluir cliente "${c.nome}"?`)) return;
  const { error } = await supabase.from('clientes').update({ ativo: false }).eq('pk', c.pk);
  if (error) return alert('Erro: ' + error.message);
  await carregar();
}

// ── Aniversariantes ──
const aniversariantes = computed(() => {
  const hoje = new Date();
  const res  = [];
  for (const c of lista.value) {
    if (!c.data_nascimento) continue;
    const [, mes, dia] = c.data_nascimento.split('-').map(Number);
    let aniv = new Date(hoje.getFullYear(), mes - 1, dia);
    const hoje0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (aniv < hoje0) aniv = new Date(hoje.getFullYear() + 1, mes - 1, dia);
    const diffDias = Math.round((aniv - hoje0) / 86400000);
    if (diffDias <= 6) res.push({ ...c, ehHoje: diffDias === 0, diffDias });
  }
  return res.sort((a, b) => a.diffDias - b.diffDias);
});

function fmtDia(data) {
  if (!data) return '';
  const [, mes, dia] = data.split('-');
  const nomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${Number(dia)} ${nomes[Number(mes) - 1]}`;
}
</script>

<style scoped>
/* ════════════════════════════════
   PAGE SHELL
════════════════════════════════ */
.cl-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px 32px 48px;
  min-height: 100%;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
}

/* ── Header ── */
.cl-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  animation: cl-up .32s .04s ease both;
}

.cl-title {
  font-size: 28px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -.7px;
  line-height: 1;
  margin: 0;
}

.cl-sub {
  font-size: 14px;
  color: var(--text2);
  margin: 6px 0 0;
  font-weight: 400;
}

.cl-btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 22px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 9px;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background .14s, transform .14s, box-shadow .14s;
}

.cl-btn-new:hover {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 5px 16px rgba(99,102,241,.36);
}

.cl-btn-new .material-symbols-outlined { font-size: 18px; }

/* ════════════════════════════════
   METRIC CARDS
════════════════════════════════ */
.cl-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.cl-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 20px 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04);
  transition: box-shadow .18s, transform .18s;
  cursor: default;
  animation: cl-up .32s ease both;
}

.cl-card:nth-child(1) { animation-delay: .10s; }
.cl-card:nth-child(2) { animation-delay: .16s; }
.cl-card:nth-child(3) { animation-delay: .22s; }

.cl-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,.09);
  transform: translateY(-2px);
}

/* top accent */
.cl-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 12px 12px 0 0;
}

.cl-card--green::before  { background: #6366f1; }
.cl-card--blue::before   { background: linear-gradient(90deg,#3b82f6,#60a5fa); }
.cl-card--violet::before { background: linear-gradient(90deg,#8b5cf6,#a78bfa); }

.cl-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 13px;
}

.cl-card-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text2);
}

.cl-card-ico {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}

.cl-card-ico .material-symbols-outlined { font-size: 15px; }
.cl-ico--green  { background: rgba(99,102,241,.1);    color: #6366f1; }
.cl-ico--blue   { background: rgba(59,130,246,.1);  color: #3b82f6; }
.cl-ico--violet { background: rgba(139,92,246,.1);  color: #8b5cf6; }

.cl-card-body {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.cl-card-num {
  font-size: 34px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -1.5px;
  line-height: 1;
}

.cl-num--accent { color: #6366f1; }

.cl-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  margin-top: 8px;
}

.cl-pill .material-symbols-outlined { font-size: 13px; }
.cl-pill--green  { background: rgba(99,102,241,.09);   color: #6366f1; }
.cl-pill--blue   { background: rgba(59,130,246,.09); color: #3b82f6; }
.cl-pill--violet { background: rgba(139,92,246,.09); color: #7c3aed; }

.cl-spark { width: 88px; height: 34px; flex-shrink: 0; }
.cl-spark svg { width: 100%; height: 100%; }

/* ════════════════════════════════
   BIRTHDAY BANNER
════════════════════════════════ */
.cl-bday {
  background: linear-gradient(135deg,#fffbeb 0%,#fef6d9 100%);
  border: 1.5px solid #fcd34d;
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 10px rgba(252,211,77,.16);
  animation: cl-up .32s .28s ease both;
}

[data-theme="dark"] .cl-bday {
  background: linear-gradient(135deg,#422006 0%,#451a03 100%);
  border-color: #78350f;
}

.cl-bday-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.cl-bday-ico {
  width: 42px; height: 42px;
  background: linear-gradient(135deg,#fbbf24,#f59e0b);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(245,158,11,.34);
}

.cl-bday-titulo {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: #92400e;
}

[data-theme="dark"] .cl-bday-titulo { color: #fbbf24; }

.cl-bday-sub {
  font-size: 12px;
  color: #b45309;
  font-weight: 500;
  margin-top: 2px;
}

[data-theme="dark"] .cl-bday-sub { color: #d97706; }

.cl-bday-sep {
  width: 1px; height: 34px;
  background: #fcd34d;
  flex-shrink: 0;
}

.cl-bday-lista {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
  padding-bottom: 2px;
}

.cl-bday-lista::-webkit-scrollbar { height: 3px; }
.cl-bday-lista::-webkit-scrollbar-thumb { background: #fcd34d; border-radius: 10px; }

.cl-bday-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(255,255,255,.72);
  border: 1px solid rgba(252,211,77,.55);
  border-radius: 8px;
  padding: 5px 10px 5px 5px;
  flex-shrink: 0;
  transition: all .14s;
  cursor: default;
}

.cl-bday-chip:hover { background: #fff; border-color: #f59e0b; box-shadow: 0 2px 8px rgba(245,158,11,.13); }
.cl-bday-chip--hoje { background: #fff; border-color: #f59e0b; }

.cl-bday-ava {
  width: 26px; height: 26px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #fff;
  flex-shrink: 0;
}

.cl-bday-nome {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #78350f;
  white-space: nowrap;
  letter-spacing: .02em;
  display: block;
}

.cl-bday-data {
  font-size: 9.5px;
  color: #b45309;
  font-weight: 500;
  display: block;
  margin-top: 1px;
}

.cl-bday-hoje-badge {
  display: inline-block;
  font-size: 8px; font-weight: 800;
  background: #f59e0b; color: #fff;
  padding: 1px 5px; border-radius: 4px;
  margin-left: 3px;
  vertical-align: middle;
}

/* ════════════════════════════════
   TOOLBAR
════════════════════════════════ */
.cl-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  animation: cl-up .32s .33s ease both;
}

.cl-search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.cl-search-ico {
  position: absolute;
  left: 13px; top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: var(--text2);
  pointer-events: none;
}

.cl-search {
  width: 100%;
  height: 42px;
  padding: 0 36px 0 42px;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  font-family: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--bg2);
  outline: none;
  transition: border-color .14s, box-shadow .14s;
}

.cl-search::placeholder { color: var(--text2); }

.cl-search:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,.1);
}

.cl-search-clear {
  position: absolute;
  right: 10px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  color: var(--text2); cursor: pointer;
  display: flex; padding: 2px;
  border-radius: 4px;
  transition: color .12s;
}

.cl-search-clear:hover { color: var(--text); }
.cl-search-clear .material-symbols-outlined { font-size: 16px; }

.cl-tabs {
  display: flex;
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 9px;
  padding: 3px;
  gap: 2px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}

[data-theme="dark"] .cl-tabs { background: var(--bg2); }

.cl-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text2);
  cursor: pointer;
  transition: all .13s;
  white-space: nowrap;
}

.cl-tab:hover:not(.cl-tab--on) { color: var(--text); }

.cl-tab--on {
  background: #6366f1;
  color: #fff;
  box-shadow: 0 2px 8px rgba(99,102,241,.3);
}

.cl-tab-count {
  font-size: 10px;
  font-weight: 700;
  background: rgba(0,0,0,.06);
  color: inherit;
  padding: 1px 6px;
  border-radius: 10px;
  transition: all .13s;
}

.cl-tab--on .cl-tab-count {
  background: rgba(255,255,255,.2);
  color: #fff;
}

/* ════════════════════════════════
   TABLE
════════════════════════════════ */
.cl-tbl-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04);
  overflow: hidden;
  animation: cl-up .32s .38s ease both;
}

/* States */
.cl-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 64px 20px;
  color: var(--text2);
}

.cl-spinner {
  width: 26px; height: 26px;
  border: 2.5px solid var(--border);
  border-top-color: #6366f1;

  border-radius: 50%;
  animation: cl-spin .7s linear infinite;
}

.cl-empty-ico { font-size: 36px; opacity: .45; }
.cl-empty-txt { font-size: 15px; font-weight: 700; color: var(--text); }
.cl-empty-sub { font-size: 12.5px; color: var(--text2); margin-top: -4px; }

/* Table */
.cl-tbl-scroll { overflow-x: auto; }

.cl-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.cl-tbl thead th {
  padding: 11px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--text2);
  background: var(--bg3);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.cl-tbl thead th:last-child { padding-right: 16px; }

.cl-row { transition: background .1s; }
.cl-row:hover { background: var(--bg3); }
.cl-row:hover .cl-acts { opacity: 1; }

.cl-tbl tbody td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
  color: var(--text);
}

.cl-tbl tbody tr:last-child td { border-bottom: none; }

/* Name cell */
.cl-name-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.cl-ava {
  width: 30px; height: 30px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #fff;
  flex-shrink: 0;
}

.cl-name-main { font-weight: 600; font-size: 14px; color: var(--text); }
.cl-name-sub  { font-size: 12px; color: var(--text2); margin-top: 2px; }

.cl-mono  { font-family: 'Courier New', monospace; font-size: 13px; color: var(--text2); letter-spacing: .02em; }
.cl-muted { font-size: 13px; color: var(--text2); }

/* Badges */
.cl-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 11px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.cl-badge--sim { background: #dcfce7; color: #166534; }
.cl-badge--sim .cl-badge-pip { background: #22c55e; }
.cl-badge--nao { background: var(--bg3); color: var(--text2); }
.cl-badge--nao .cl-badge-pip { background: #d1d5db; }
.cl-badge-pip { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

/* Actions */
.cl-actions-td { white-space: nowrap; padding-right: 14px; }

.cl-acts {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  opacity: 0;
  transition: opacity .13s;
}

.cl-act {
  width: 28px; height: 28px;
  border: 1.5px solid var(--border);
  background: var(--bg2);
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--text2);
  transition: all .13s;
}

.cl-act:hover { border-color: #6366f1; color: #6366f1; background: rgba(99,102,241,.05); }
.cl-act--del:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,.05); }
.cl-act .material-symbols-outlined { font-size: 14px; }

/* Footer / Pagination */
.cl-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg3);
  flex-wrap: wrap;
  gap: 8px;
}

.cl-pg-info { font-size: 13px; color: var(--text2); }
.cl-pg-info strong { color: var(--text); font-weight: 600; }

.cl-pg-ctrls { display: flex; align-items: center; gap: 3px; }

.cl-pg-btn {
  min-width: 28px; height: 28px;
  padding: 0 5px;
  border: 1.5px solid var(--border);
  background: var(--bg2);
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px; font-weight: 600;
  color: var(--text2);
  transition: all .13s;
}

.cl-pg-btn:hover:not(:disabled):not(.cl-pg-btn--on) { border-color: #6366f1; color: #6366f1; }
.cl-pg-btn--on { background: #6366f1; border-color: #6366f1; color: #fff; font-weight: 800; }
.cl-pg-btn:disabled { opacity: .28; cursor: not-allowed; }
.cl-pg-btn .material-symbols-outlined { font-size: 15px; }
.cl-pg-dots { font-size: 12px; color: var(--text2); padding: 0 3px; line-height: 28px; }

/* ════════════════════════════════
   ANIMATIONS
════════════════════════════════ */
@keyframes cl-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes cl-spin { to { transform: rotate(360deg); } }
</style>
