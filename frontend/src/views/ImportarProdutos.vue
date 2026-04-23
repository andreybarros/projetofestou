<template>
  <div class="import-wrap animate-fade">
    
    <div class="import-header">
      <button @click="$router.back()" class="btn-back">
        <span class="material-symbols-outlined">arrow_back</span>
        Voltar para Produtos
      </button>
      <h1 class="page-title">Importar Produtos via CSV</h1>
      <p class="page-sub">Faça o upload de uma planilha para cadastrar múltiplos produtos de uma vez.</p>
    </div>

    <div class="import-content card-glass">
      <div class="instructions">
        <h3>
          <span class="material-symbols-outlined">info</span>
          Instruções para o CSV
        </h3>
        <ul>
          <li>O arquivo deve estar no formato <b>.csv</b></li>
          <li>Utilize <b>ponto e vírgula (;)</b> ou <b>vírgula (,)</b> como separador.</li>
          <li>O sistema irá gerar códigos automáticos sequenciais a partir de <b>10001</b>.</li>
          <li>Não inclua cabeçalho ou use a seguinte ordem de colunas:</li>
        </ul>
        
        <div class="format-box">
          <b>Descrição; Código de Barras; Preço Venda; Preço Custo; Categoria; Unidade; Saldo; NCM; CFOP; CSOSN</b>
        </div>

        <div class="exemplos">
          <p><b>Exemplos de linhas:</b></p>
          <code>Bala de Coco; 7891234567890; 5,50; 2,30; Doces; UN; 100; 17049020; 5102; 102</code><br>
          <code>Pirulito; ; 1,50; 0,60; ; ; ; ; ; </code> (pode deixar o que não tiver vazio)
        </div>
      </div>

      <div class="upload-section">
        <div 
          class="drop-zone" 
          @click="$refs.csvInput.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
          :class="{ dragging }"
        >
          <span class="material-symbols-outlined cloud-icon">cloud_upload</span>
          <p v-if="!fileSel">Clique aqui ou arraste o arquivo CSV</p>
          <p v-else class="file-sel-name">{{ fileSel.name }}</p>
          <input type="file" ref="csvInput" style="display:none" accept=".csv" @change="onFileChange" />
        </div>

        <button 
          class="btn-import-confirm" 
          @click="processarImportacao" 
          :disabled="!fileSel || importando"
        >
          <span class="spin-sm" v-if="importando"></span>
          <span class="material-symbols-outlined" v-else>check_circle</span>
          {{ importando ? 'Importando...' : 'Confirmar Importação' }}
        </button>
      </div>
    </div>

    <div v-if="resultado" class="import-result" :class="resultado.tipo">
      <span class="material-symbols-outlined">{{ resultado.tipo === 'success' ? 'done_all' : 'error' }}</span>
      {{ resultado.msg }}
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const router      = useRouter();
const sessaoStore = useSessaoStore();
const fileSel     = ref(null);
const dragging    = ref(false);
const importando  = ref(false);
const resultado   = ref(null);
const categorias  = ref([]);

onMounted(async () => {
  await carregarCategorias();
});

async function carregarCategorias() {
  let q = supabase.from("categorias").select("pk, nome").order("nome");
  if (sessaoStore.filial?.pk) q = q.eq("filial_pk", sessaoStore.filial.pk);
  const { data } = await q;
  categorias.value = data || [];
}

function onFileChange(e) {
  fileSel.value = e.target.files[0];
  resultado.value = null;
}

function onDrop(e) {
  dragging.value = false;
  const f = e.dataTransfer.files[0];
  if (f && f.name.endsWith('.csv')) {
    fileSel.value = f;
    resultado.value = null;
  } else {
    alert("Por favor, selecione um arquivo CSV válido.");
  }
}

async function processarImportacao() {
  if (!fileSel.value) return;
  importando.value = true;
  resultado.value = null;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/);
      if (lines.length < 1) throw new Error("Arquivo vazio");

      // Detectar separador
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : ',';
      
      // Se a primeira linha parecer um cabeçalho (não tem números onde deveriam estar), ignorar
      let rows = lines;
      if (isNaN(parseFloat(firstLine.split(sep)[1]?.replace(',', '.')))) {
        rows = lines.slice(1);
      }
      
      rows = rows.filter(l => l.trim().length > 0);
      if (rows.length === 0) throw new Error("Nenhum dado encontrado para importar");

      // 1. Achar o último código numérico
      let proximoCodigo = 10001;
      const { data: ultimos } = await supabase
        .from("produtos")
        .select("codigo")
        .eq("filial_pk", sessaoStore.filial?.pk)
        .not("codigo", "is", null);
      
      if (ultimos && ultimos.length > 0) {
        const codigosNumericos = ultimos
          .map(p => parseInt(p.codigo))
          .filter(c => !isNaN(c) && c >= 10001);
        if (codigosNumericos.length > 0) {
          proximoCodigo = Math.max(...codigosNumericos) + 1;
        }
      }

      const novosProdutos = [];
      for (const line of rows) {
        const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 1 || !cols[0]) continue;

        const descricao         = cols[0];
        const codigo_barras     = cols[1] || null;
        const valor_venda       = parseFloat(cols[2]?.replace(',', '.') || 0);
        const preco_custo       = parseFloat(cols[3]?.replace(',', '.') || 0);
        const categoria_n       = cols[4] || '';
        const unidade_comercial = cols[5] || 'UN';
        const saldo             = parseFloat(cols[6]?.replace(',', '.') || 0);
        const ncm               = cols[7] || null;
        const cfop              = cols[8] || '5102';
        const csosn             = cols[9] || '102';

        let cat_pk = null;
        if (categoria_n) {
          const c = categorias.value.find(cat => cat.nome.toLowerCase() === categoria_n.toLowerCase());
          if (c) cat_pk = c.pk;
        }

        novosProdutos.push({
          filial_pk: sessaoStore.filial?.pk,
          codigo: String(proximoCodigo++),
          codigo_barras,
          descricao,
          valor_venda,
          preco_custo,
          categoria_pk: cat_pk,
          unidade_comercial,
          saldo,
          ncm,
          cfop,
          csosn,
          origem: '0'
        });
      }

      if (novosProdutos.length > 0) {
        const { error } = await supabase.from("produtos").insert(novosProdutos);
        if (error) throw error;
        resultado.value = { tipo: 'success', msg: `${novosProdutos.length} produtos importados com sucesso!` };
        setTimeout(() => router.push('/produtos'), 2000);
      } else {
        throw new Error("Nenhum produto válido encontrado no arquivo.");
      }
    } catch (err) {
      resultado.value = { tipo: 'error', msg: "Erro: " + err.message };
    } finally {
      importando.value = false;
    }
  };

  reader.readAsText(fileSel.value, 'ISO-8859-1');
}
</script>

<style scoped>
.import-wrap { max-width: 800px; margin: 0 auto; padding: 20px; }
.import-header { margin-bottom: 24px; }
.btn-back { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--accent); cursor: pointer; font-weight: 600; padding: 0; margin-bottom: 16px; font-size: 14px; }
.btn-back:hover { text-decoration: underline; }

.page-title { font-size: 24px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
.page-sub { color: var(--text2); font-size: 14px; }

.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,.1); }

.instructions { margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }
.instructions h3 { display: flex; align-items: center; gap: 8px; font-size: 18px; margin-bottom: 16px; color: var(--text); }
.instructions ul { padding-left: 20px; color: var(--text2); font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
.instructions li b { color: var(--accent); }

.format-box { background: var(--bg3); padding: 12px 20px; border-radius: 8px; font-family: monospace; font-size: 14px; color: var(--text); border: 1px dashed var(--accent); text-align: center; margin-bottom: 16px; }

.exemplos { font-size: 12px; color: var(--text2); }
.exemplos code { background: rgba(0,0,0,.05); padding: 2px 6px; border-radius: 4px; }

.upload-section { display: flex; flex-direction: column; gap: 20px; align-items: center; }
.drop-zone { width: 100%; height: 180px; border: 2px dashed var(--border); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; cursor: pointer; transition: all .2s; background: rgba(0,0,0,.02); }
.drop-zone:hover, .drop-zone.dragging { border-color: var(--accent); background: rgba(99,102,241,.05); }
.cloud-icon { font-size: 48px; color: var(--text2); opacity: .5; }
.file-sel-name { font-weight: 700; color: var(--accent); }

.btn-import-confirm { width: 100%; max-width: 300px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: var(--accent); color: #fff; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; transition: opacity .2s; }
.btn-import-confirm:disabled { opacity: .5; cursor: default; }

.import-result { margin-top: 20px; padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; }
.import-result.success { background: rgba(74, 222, 128, 0.15); color: #22c55e; border: 1px solid rgba(74, 22c55e, 0.2); }
.import-result.error { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

.spin-sm { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
