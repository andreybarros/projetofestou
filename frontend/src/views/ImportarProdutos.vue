<template>
  <div class="import-wrap animate-fade">

    <div class="import-header">
      <button @click="$router.back()" class="btn-back">
        <span class="material-symbols-outlined">arrow_back</span>
        Voltar para Produtos
      </button>
      <h1 class="page-title">Importar Produtos</h1>
      <p class="page-sub">Faça o upload de uma planilha CSV ou Excel para cadastrar múltiplos produtos de uma vez.</p>
    </div>

    <div class="import-content card-glass">
      <div class="instructions">
        <h3>
          <span class="material-symbols-outlined">info</span>
          Instruções para o CSV
        </h3>
        <ul>
          <li>Formatos aceitos: <b>.xlsx</b>, <b>.xls</b> (Excel) ou <b>.csv</b></li>
          <li>Recomendamos <b>Excel (.xlsx)</b> para evitar problemas com acentos.</li>
          <li>O sistema irá gerar códigos automáticos sequenciais a partir de <b>10001</b>.</li>
          <li>A primeira linha pode ser cabeçalho ou já começar com dados.</li>
        </ul>

        <div class="format-box">
          Descrição; Código de Barras; Preço Venda; Preço Custo; Categoria; Unidade; Saldo; NCM; CFOP; CSOSN
        </div>

        <div class="exemplos">
          <p><b>Exemplos de linhas:</b></p>
          <code>Bala de Coco; 7891234567890; 5,50; 2,30; Doces; UN; 100; 17049020; 5102; 102</code><br>
          <code>Pirulito; ; 1,50; 0,60; ; ; ; ; ;</code> — campos opcionais podem ficar vazios
        </div>
      </div>

      <!-- Upload -->
      <div class="upload-section">
        <div
          class="drop-zone"
          @click="$refs.csvInput.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
          :class="{ dragging, 'has-file': fileSel }"
        >
          <span class="material-symbols-outlined cloud-icon">
            {{ fileSel ? 'task' : 'cloud_upload' }}
          </span>
          <p v-if="!fileSel">Clique aqui ou arraste o arquivo CSV / Excel</p>
          <p v-else class="file-sel-name">
            <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">description</span>
            {{ fileSel.name }}
            <button class="btn-remove-file" @click.stop="removerArquivo">
              <span class="material-symbols-outlined">close</span>
            </button>
          </p>
          <input type="file" ref="csvInput" style="display:none" accept=".csv,.xlsx,.xls" @change="onFileChange" />
        </div>

        <!-- Progresso -->
        <div v-if="importando" class="progress-box">
          <div class="progress-label">
            <span class="material-symbols-outlined spin-icon">sync</span>
            Importando produto <b>{{ progresso }}</b> de <b>{{ total }}</b>...
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" :style="{ width: pct + '%' }"></div>
          </div>
          <span class="progress-pct">{{ pct }}%</span>
        </div>

        <!-- Botão -->
        <button
          class="btn-import-confirm"
          @click="processarImportacao"
          :disabled="!fileSel || importando"
        >
          <span class="material-symbols-outlined">{{ importando ? 'hourglass_top' : 'upload_file' }}</span>
          {{ importando ? `Importando… (${progresso}/${total})` : 'Iniciar Importação' }}
        </button>
      </div>
    </div>

    <!-- Resultado -->
    <div v-if="resultado" class="import-result" :class="resultado.tipo">
      <span class="material-symbols-outlined">{{ resultado.tipo === 'success' ? 'done_all' : 'error' }}</span>
      {{ resultado.msg }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import * as XLSX from 'xlsx';
import { supabase } from '../composables/useSupabase';
import { useSessaoStore } from '../stores/sessao';

const router      = useRouter();
const sessaoStore = useSessaoStore();
const fileSel     = ref(null);
const dragging    = ref(false);
const importando  = ref(false);
const resultado   = ref(null);
const categorias  = ref([]);
const progresso   = ref(0);
const total       = ref(0);
const pct         = computed(() => total.value > 0 ? Math.round((progresso.value / total.value) * 100) : 0);

onMounted(async () => {
  await carregarCategorias();
});

async function carregarCategorias() {
  let q = supabase.from('categorias').select('pk, nome').order('nome');
  if (sessaoStore.filial?.pk) q = q.eq('filial_pk', sessaoStore.filial.pk);
  const { data } = await q;
  categorias.value = data || [];
}

function onFileChange(e) {
  fileSel.value = e.target.files[0] || null;
  resultado.value = null;
}

function onDrop(e) {
  dragging.value = false;
  const f = e.dataTransfer.files[0];
  if (f && /\.(csv|xlsx|xls)$/i.test(f.name)) {
    fileSel.value = f;
    resultado.value = null;
  } else {
    alert('Por favor, selecione um arquivo CSV, XLSX ou XLS.');
  }
}

function removerArquivo() {
  fileSel.value = null;
  resultado.value = null;
  progresso.value = 0;
  total.value = 0;
}

async function processarImportacao() {
  if (!fileSel.value) return;
  importando.value = true;
  resultado.value  = null;
  progresso.value  = 0;
  total.value      = 0;

  try {
    // Lê o arquivo como ArrayBuffer — funciona para CSV, XLSX e XLS
    const buffer = await fileSel.value.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', codepage: 65001 });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Converte para array de arrays (linhas × colunas)
    const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!linhas.length) throw new Error('Arquivo vazio');

    // Ignora cabeçalho se primeira coluna for texto descritivo
    const primeiroValor = String(linhas[0][0] || '').trim().toLowerCase();
    const ehCabecalho   = ['descrição', 'descricao', 'nome', 'produto', 'description'].includes(primeiroValor);
    const rows = (ehCabecalho ? linhas.slice(1) : linhas).filter(r => String(r[0] || '').trim());

    if (!rows.length) throw new Error('Nenhum dado encontrado no arquivo');

    // Próximo código sequencial
    let proximoCodigo = 10001;
    const { data: ultimos } = await supabase
      .from('produtos').select('codigo')
      .eq('filial_pk', sessaoStore.filial?.pk)
      .not('codigo', 'is', null);

    if (ultimos?.length) {
      const nums = ultimos.map(p => parseInt(p.codigo)).filter(c => !isNaN(c) && c >= 10001);
      if (nums.length) proximoCodigo = Math.max(...nums) + 1;
    }

    function toFloat(v) {
      if (v === null || v === undefined || v === '') return 0;
      return parseFloat(String(v).replace(',', '.')) || 0;
    }

    // Monta lista de produtos
    const novosProdutos = [];
    for (const cols of rows) {
      const descricao = String(cols[0] || '').trim();
      if (!descricao) continue;

      const categoria_n = String(cols[4] || '').trim();
      let cat_pk = null;
      if (categoria_n) {
        const c = categorias.value.find(cat => cat.nome.toLowerCase() === categoria_n.toLowerCase());
        if (c) cat_pk = c.pk;
      }

      novosProdutos.push({
        filial_pk:        sessaoStore.filial?.pk,
        codigo:           String(proximoCodigo++),
        descricao,
        codigo_barras:    String(cols[1] || '').trim() || null,
        valor_venda:      toFloat(cols[2]),
        preco_custo:      toFloat(cols[3]),
        categoria_pk:     cat_pk,
        unidade_comercial: String(cols[5] || '').trim() || 'UN',
        saldo:            toFloat(cols[6]),
        ncm:              String(cols[7] || '').trim() || null,
        cfop:             String(cols[8] || '').trim() || '5102',
        csosn:            String(cols[9] || '').trim() || '400',
        origem:           '0',
      });
    }

    if (!novosProdutos.length) throw new Error('Nenhum produto válido encontrado no arquivo.');

    // Importa em lotes de 50 com contador
    total.value = novosProdutos.length;
    const LOTE  = 50;
    let erros   = 0;

    for (let i = 0; i < novosProdutos.length; i += LOTE) {
      const lote = novosProdutos.slice(i, i + LOTE);
      const { error } = await supabase.from('produtos').insert(lote);
      if (error) erros += lote.length;
      progresso.value = Math.min(i + LOTE, novosProdutos.length);
    }

    const importados = novosProdutos.length - erros;
    if (importados === 0) throw new Error('Falha ao importar todos os produtos.');

    resultado.value = {
      tipo: erros > 0 ? 'warn' : 'success',
      msg: erros > 0
        ? `${importados} produtos importados com sucesso, ${erros} com erro.`
        : `${importados} produtos importados com sucesso!`,
    };

    setTimeout(() => router.push('/produtos'), 2500);

  } catch (err) {
    resultado.value = { tipo: 'error', msg: 'Erro: ' + err.message };
  } finally {
    importando.value = false;
  }
}
</script>

<style scoped>
.import-wrap { max-width: 780px; margin: 0 auto; padding: 24px 20px; }

.import-header { margin-bottom: 28px; }
.btn-back { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--primary); cursor: pointer; font-weight: 600; padding: 0; margin-bottom: 16px; font-size: 14px; }
.btn-back:hover { text-decoration: underline; }
.page-title { font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
.page-sub { color: var(--text2); font-size: 14px; }

.card-glass { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 32px; }

/* Instruções */
.instructions { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
.instructions h3 { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; margin-bottom: 14px; color: var(--text); }
.instructions ul { padding-left: 20px; color: var(--text2); font-size: 13px; line-height: 1.8; margin-bottom: 14px; }
.instructions li b { color: var(--primary); }
.format-box { background: var(--bg3); padding: 12px 18px; border-radius: 8px; font-family: monospace; font-size: 13px; color: var(--text); border: 1px dashed var(--border); text-align: center; margin-bottom: 14px; word-break: break-all; }
.exemplos { font-size: 12px; color: var(--text2); line-height: 1.8; }
.exemplos code { background: var(--bg3); padding: 2px 6px; border-radius: 4px; font-size: 11px; }

/* Upload */
.upload-section { display: flex; flex-direction: column; gap: 20px; }

.drop-zone {
  width: 100%; min-height: 160px; border: 2px dashed var(--border);
  border-radius: 12px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  cursor: pointer; transition: all .2s; background: var(--bg);
  padding: 20px; box-sizing: border-box;
}
.drop-zone:hover, .drop-zone.dragging { border-color: var(--primary); background: rgba(99,102,241,.05); }
.drop-zone.has-file { border-color: #22c55e; background: rgba(34,197,94,.05); }
.cloud-icon { font-size: 44px; color: var(--text2); opacity: .5; }
.drop-zone.has-file .cloud-icon { color: #22c55e; opacity: .8; }
.file-sel-name { font-weight: 700; color: #22c55e; display: flex; align-items: center; gap: 8px; }
.btn-remove-file { background: none; border: none; cursor: pointer; color: var(--text2); display: flex; align-items: center; padding: 2px; border-radius: 4px; }
.btn-remove-file:hover { color: #ef4444; }

/* Progresso */
.progress-box { background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.progress-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text); }
.spin-icon { animation: spin .8s linear infinite; color: var(--primary); }
.progress-bar-wrap { width: 100%; height: 8px; background: var(--bg); border-radius: 99px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: var(--primary); border-radius: 99px; transition: width .3s ease; }
.progress-pct { font-size: 12px; color: var(--text2); text-align: right; font-weight: 700; }

/* Botão */
.btn-import-confirm {
  width: 100%; padding: 14px; display: flex; align-items: center; justify-content: center;
  gap: 10px; background: var(--primary); color: #fff; border: none; border-radius: 10px;
  font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity .2s;
}
.btn-import-confirm:hover:not(:disabled) { opacity: .88; }
.btn-import-confirm:disabled { opacity: .45; cursor: not-allowed; }

/* Resultado */
.import-result { margin-top: 20px; padding: 16px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; }
.import-result.success { background: rgba(34,197,94,.12); color: #22c55e; border: 1px solid rgba(34,197,94,.25); }
.import-result.warn    { background: rgba(245,158,11,.12); color: #f59e0b; border: 1px solid rgba(245,158,11,.25); }
.import-result.error   { background: rgba(239,68,68,.12);  color: #ef4444; border: 1px solid rgba(239,68,68,.25); }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
