# Festou — Design System

Guia completo de padrões visuais e de código para o Claude seguir ao criar ou editar qualquer tela do sistema.

---

## 1. Tokens CSS Globais

Definidos em `App.vue` → `:root` (dark) e `[data-theme="light"]`.  
**Nunca hardcode cores — use sempre as variáveis abaixo.**

| Variável | Dark | Light | Uso |
|---|---|---|---|
| `--bg` | `#0c0e12` | `#eaecf4` | Fundo geral da página / content-area |
| `--bg2` | `#111318` | `#ffffff` | Cards, inputs, dropdowns, modais |
| `--bg3` | `#171a1f` | `#dde0ed` | Hover de linhas de tabela, fundo de chip |
| `--bg4` | `#1d2026` | `#cfd3e6` | Bordas alternadas, fundos secundários |
| `--border` | `rgba(255,255,255,.07)` | `rgba(0,0,0,.14)` | Bordas universais |
| `--text` | `#e3e5ef` | `#0f172a` | Texto principal |
| `--text2` | `#a8abb5` | `#374151` | Texto secundário, labels, placeholders |
| `--primary` | `#609efc` | `#609efc` | Cor de ação principal (azul) |
| `--primary-c` | `#0560ba` | `#0560ba` | Variante pressed do primary |
| `--radius` | `12px` | `12px` | Border-radius padrão de cards |

**Regras de uso:**
- Hover em linhas de tabela: `background: var(--bg3)` (nunca `rgba`)
- Fundo de input: `var(--bg2)`
- Fundo de modal: `var(--bg2)`
- Fundo de página: `var(--bg)`

---

## 2. Tipografia

**Fonte principal das views:** `'Inter', sans-serif` (carregada globalmente)  
**Fonte das telas Silk (formulários detalhados):** `'Plus Jakarta Sans', sans-serif`  
**Fonte da sidebar:** `'Plus Jakarta Sans', 'Hanken Grotesk', sans-serif`

Tamanhos e pesos mais usados:

| Elemento | Tamanho | Peso |
|---|---|---|
| Título de página (h1) | `28px` | `800` |
| Subtítulo de seção | `15px` | `800` |
| Label de campo (uppercase) | `10px` | `800` |
| Texto de tabela | `13–13.5px` | `500–600` |
| Texto secundário | `12px` | `500` |
| Badge / chip | `10–11px` | `700` |

---

## 3. Shadows — Sistema Silk (telas de formulário)

Variáveis locais definidas em `.sk-page {}` nas views Silk:

```css
.sk-page {
  --sk-raise:        0 2px 18px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.05);
  --sk-raise-md:     0 1px 10px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.04);
  --sk-raise-sm:     0 1px 6px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --sk-press:        none;
  --sk-primary:      var(--primary);
  --sk-primary-dim:  rgba(99,102,241,.13);
  --sk-primary-soft: rgba(99,102,241,.07);
  --sk-primary-glow: rgba(99,102,241,.28);
  --sk-font:         'Plus Jakarta Sans', sans-serif;
}
```

| Token | Quando usar |
|---|---|
| `--sk-raise` | Cards, botões de destaque em repouso |
| `--sk-raise-md` | Elevação intermediária |
| `--sk-raise-sm` | Botões secundários, campos com foco |
| `--sk-primary-dim` | Foco de input (ring de foco) |
| `--sk-primary-soft` | Fundo de destaque suave (toggle, tip) |
| `--sk-primary-glow` | Sombra colorida de botão primário |

---

## 4. Sidebar

A sidebar é **sempre escura**, independente do tema da página. Isso é intencional — cria contraste com a área de conteúdo.

```css
/* Cores fixas da sidebar — NÃO sobrescrever com [data-theme="light"] */
background: #0e1019;
border-right: 1px solid rgba(255,255,255,.04);
color: rgba(255,255,255,.88);
```

**Estado inativo:** `color: rgba(255,255,255,.48)`  
**Hover:** `background: rgba(255,255,255,.07)` + `color: rgba(255,255,255,.88)`  
**Ativo (router-link-active):** `background: rgba(99,102,241,.16)` + `box-shadow: inset 2px 2px 5px rgba(0,0,0,.25)` + `color: #a5b4fc`  

Mini sidebar (colapsada): botões `48×48px`, `border-radius: 14px`, tooltip neomórfico via `::after`.

---

## 5. Componentes Globais

Esses estilos estão em views individuais mas seguem o mesmo padrão em todo o sistema.

### Botões globais (views de listagem)

```css
/* Primário */
.btn-primary {
  display: flex; align-items: center; gap: 5px;
  padding: .55rem 1.1rem;
  background: #6366f1; color: #fff;
  border: none; border-radius: 10px;
  font-weight: 700; font-size: .9rem;
}
.btn-primary:hover { opacity: .88; }

/* Secundário */
.btn-secondary {
  background: var(--bg2); color: var(--text);
  border: 1px solid var(--border); border-radius: 10px;
  padding: .55rem 1.1rem; font-weight: 700; font-size: .9rem;
}
.btn-secondary:hover:not(:disabled) { background: var(--bg3); }

/* Destrutivo */
.btn-danger {
  background: #ef4444; color: #fff;
  border: none; border-radius: 10px;
  padding: .55rem 1.1rem; font-weight: 700; font-size: .9rem;
}
.btn-danger:hover:not(:disabled) { opacity: .88; }
```

### Botões Silk (telas de formulário com prefixo `sk-`)

```css
/* Ghost — ação secundária */
.sk-btn-ghost {
  padding: 9px 20px; border-radius: 10px;
  background: var(--bg2); box-shadow: var(--sk-raise-sm);
  border: 1px solid var(--border); color: var(--text2);
  font-size: 13px; font-weight: 600;
}

/* Solid — ação primária */
.sk-btn-solid {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 22px; border-radius: 10px;
  background: var(--sk-primary); color: #fff;
  box-shadow: 4px 4px 12px var(--sk-primary-glow), -2px -2px 6px rgba(255,255,255,.25);
  font-size: 13px; font-weight: 700;
}
.sk-btn-solid:hover:not(:disabled) { transform: translateY(-1px); }
.sk-btn-solid:disabled { opacity: .5; cursor: not-allowed; }

/* Back — círculo para voltar */
.sk-btn-back {
  width: 42px; height: 42px; border-radius: 50%;
  background: var(--bg2); box-shadow: var(--sk-raise-sm);
  border: 1px solid var(--border);
}
```

### Modal (global — todas as views)

Sempre usar `<Teleport to="body">`.

```html
<Teleport to="body">
  <div v-if="modalAberto" class="modal-backdrop" @click.self="fecharModal">
    <div class="modal-box" style="max-width:520px">
      <div class="modal-header">
        <span class="material-symbols-outlined">icon_name</span>
        <h3>Título do Modal</h3>
        <button class="modal-close" @click="fecharModal">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <!-- conteúdo -->
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="fecharModal">Cancelar</button>
        <button class="btn-primary" @click="confirmar">Confirmar</button>
      </div>
    </div>
  </div>
</Teleport>
```

```css
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-box      { background: var(--bg2); border: 1px solid var(--border); border-radius: 18px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.25); display: flex; flex-direction: column; }
.modal-header   { display: flex; align-items: center; gap: 10px; padding: 18px 20px 14px; border-bottom: 1px solid var(--border); }
.modal-header h3 { flex: 1; margin: 0; font-size: 1rem; font-weight: 800; color: var(--text); }
.modal-close    { background: none; border: none; color: var(--text2); cursor: pointer; padding: 4px; border-radius: 6px; }
.modal-close:hover { background: var(--bg3); }
.modal-body     { padding: 18px 20px; font-size: .9rem; color: var(--text); }
.modal-footer   { padding: 14px 20px 18px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border); }
```

### Toast (views com feedback inline)

```js
// Script
const toastMsg  = ref('');
const toastTipo = ref('ok');
let _toastTimer = null;
function toast(msg, tipo = 'ok', dur = 3500) {
  clearTimeout(_toastTimer);
  toastMsg.value = msg;
  toastTipo.value = tipo;
  _toastTimer = setTimeout(() => { toastMsg.value = ''; }, dur);
}
```

```html
<!-- Template -->
<Transition name="toast">
  <div v-if="toastMsg" :class="['toast', toastTipo === 'ok' ? 'success' : 'error']">
    <span class="material-symbols-outlined">{{ toastTipo === 'ok' ? 'check_circle' : 'error' }}</span>
    {{ toastMsg }}
  </div>
</Transition>
```

```css
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; color: #fff; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,.4); }
.toast.success { background: #065f46; }
.toast.error   { background: #991b1b; }
.toast-enter-active, .toast-leave-active { transition: opacity .25s, transform .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
```

### Spinner

```css
/* Inline — dentro de botão */
.spin { width: 18px; height: 18px; border: 2px solid rgba(99,102,241,.2); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }

/* Silk — branco (dentro de sk-btn-solid) */
.sk-spin { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: skSpin .7s linear infinite; }

/* Silk — grande (página carregando) */
.sk-spin--lg { width: 30px; height: 30px; border-width: 3px; border-color: var(--sk-primary-dim); border-top-color: var(--sk-primary); }

@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes skSpin { to { transform: rotate(360deg); } }
```

---

## 6. Inputs

### Global (views de listagem/modal)

```css
input, select, textarea {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: .5rem .75rem;
  font-size: .9rem;
}
input:focus, select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99,102,241,.12);
}
```

### Silk (views de formulário com `sk-inp`)

```css
.sk-inp {
  padding: 11px 14px;
  background: var(--bg2);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  color: var(--text); font-size: 13.5px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  outline: none; width: 100%; box-sizing: border-box;
  transition: border-color .18s, box-shadow .18s;
}
.sk-inp:focus {
  border-color: var(--sk-primary);
  box-shadow: 0 0 0 3px var(--sk-primary-dim);
}
.sk-inp::placeholder { color: var(--text2); opacity: .5; }
```

Label de campo Silk:
```css
.sk-lbl {
  font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .1em;
  color: var(--sk-primary); opacity: .75;
}
```

---

## 7. Padrão de Estado Vazio / Carregando

```html
<!-- Views de listagem -->
<div v-if="carregando" class="loading">
  <span class="spin"></span>
  Carregando...
</div>
<div v-else-if="lista.length === 0" class="vazio">
  <span class="material-symbols-outlined" style="font-size:48px;color:var(--text2)">inbox</span>
  Nenhum registro encontrado.
</div>
<div v-else>
  <!-- tabela / grid -->
</div>
```

```css
.loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 4rem; color: var(--text2); }
.vazio   { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text2); padding: 4rem; }
```

---

## 8. Tabelas

```css
/* Padrão consistente de tabela */
table  { width: 100%; border-collapse: collapse; }
thead  { position: sticky; top: 0; background: var(--bg2); }
th     { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); border-bottom: 1px solid var(--border); }
td     { padding: 10px 12px; font-size: .88rem; color: var(--text); border-bottom: 1px solid var(--border); vertical-align: middle; }
tr:hover td { background: var(--bg3); }  /* NUNCA rgba aqui */
```

---

## 9. Paginação

```html
<div class="paginacao">
  <button :disabled="pagina === 1" @click="pagina--" class="pg-btn">‹</button>
  <template v-for="p in paginacaoVisiveis" :key="p">
    <span v-if="p === '...'" class="pg-ellipsis">…</span>
    <button v-else :class="['pg-btn', pagina === p ? 'active' : '']" @click="irPara(p)">{{ p }}</button>
  </template>
  <button :disabled="pagina === totalPaginas" @click="pagina++" class="pg-btn">›</button>
</div>
```

```css
.paginacao { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 1rem 0; }
.pg-btn    { background: var(--bg3); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: .85rem; transition: background .15s; }
.pg-btn:hover:not(:disabled):not(.active) { background: var(--bg4); }
.pg-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }
.pg-btn:disabled { opacity: .3; cursor: default; }
```

---

## 10. Layout de Telas Silk (formulários / detalhes)

Usado em `FormCliente.vue` e novas telas de detalhe/cadastro.

```
sk-page
  sk-topbar (breadcrumb + botões)
  sk-hero   (título + subtítulo)
  sk-body   (flex row)
    sk-form-col (flex: 1)
      sk-section  (separado por border-bottom)
        sk-sec-head (badge numerado + título + descrição)
        sk-grid     (4 colunas responsivo)
          sk-field + sk-lbl + sk-inp
    sk-sidebar (296px fixo)
      sk-card (cards laterais)
```

```css
.sk-body     { display: flex; gap: 22px; padding: 0 32px; align-items: flex-start; }
.sk-form-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 28px; }
.sk-sidebar  { width: 296px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
.sk-section  { display: flex; flex-direction: column; gap: 22px; padding: 0 0 10px; border-bottom: 1px solid var(--border); }
.sk-grid     { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sk-span-2   { grid-column: span 2; }
.sk-span-3   { grid-column: span 3; }
.sk-span-4   { grid-column: 1 / -1; }
```

**Animação de entrada obrigatória nas views Silk:**
```css
.sk-page { animation: skIn .35s ease both; }
@keyframes skIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
```

---

## 11. Prefixo CSS por Módulo

Cada view usa um prefixo próprio para evitar colisões. Sempre escolher um prefixo novo para views novas.

| Módulo | Prefixo |
|---|---|
| FormCliente | `.sk-` |
| Clientes | `.cl-` |
| Produtos | `.prod-` / global |
| FechamentoPonto | `.fp-` |
| Ponto | `.pt-` |
| Dashboard | `.dash-` |
| Catálogos | `.cat-` |

---

## 12. Convenções obrigatórias

- **Sem emojis** no código ou texto visível
- **Strings ao usuário em português brasileiro**
- **Sem `!important`** — ajuste especificidade CSS
- **Cores dark nunca hardcodadas** — sempre `var(--bg*)`, `var(--text*)`, `var(--border)`
- **Sidebar sempre `#0e1019`** — não sobrescrever com `[data-theme="light"]`
- **Hover de tabela:** `var(--bg3)`, nunca `rgba`
- Toda view nova com rota protegida: `meta: { requiresAuth: true }` + entrada em `pode()` no `App.vue`
- Fuso horário backend: `America/Manaus (UTC-4)`
- Datas: armazenar `YYYY-MM-DD`, exibir `DD/MM/YYYY` via `fmtData()` do `useFormatacao`

---

## 13. Composables disponíveis

| Composable | Importar de | Retorna |
|---|---|---|
| `useFormatacao` | `../composables/useFormatacao` | `fmt(v)`, `fmtData(d)`, `fmtNum(v, dec)` |
| `useCarregaSupabase` | `../composables/useCarregaSupabase` | `carregando`, `erro`, `executar(queryFn, destino)` |
| `useListaPaginada` | `../composables/useListaPaginada` | `busca`, `pagina`, `paginados`, `totalPaginas`, `resumoInfo`, `paginacaoVisiveis`, `irPara(p)` |
| `useExcluirItem` | `../composables/useExcluirItem` | `excluindo`, `excluir(item, campoNome?)` |
| `useSupabase` | `../composables/useSupabase` | `supabase` |

**Sempre usar `useFormatacao` em vez de definir `function fmt` local.**  
**Sempre usar `useListaPaginada` em views com busca + paginação.**
