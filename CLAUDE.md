# Festou — Instruções para Claude Code

> **Design System:** Antes de criar ou editar qualquer componente visual, leia `DESIGN_SYSTEM.md` na raiz do projeto. Ele define tokens CSS, padrões de botão, modal, toast, input, tabela, paginação, sidebar e composables disponíveis.

## Stack
- **Frontend**: Vue 3 (`<script setup>` + Composition API), Vite, Pinia, Vue Router 4, Axios, Supabase JS
- **Backend**: Node.js, Express 4, Supabase JS, JWT customizado (HMAC-SHA256, 12h)
- **Banco**: Supabase (PostgreSQL), RLS ativo em todas as tabelas
- **Deploy**: Vercel (`vercel.json` — frontend dist + backend serverless)

## Como rodar
```bash
npm run install-all   # instala deps frontend e backend
npm run dev           # frontend :5173 + backend :3001
```
`.env` (backend): `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `PORT=3001`, `FOCUSNFE_TOKEN`, `NFCE_AMBIENTE=2`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `GROQ_API_KEY`

Vite faz proxy `/api` → `http://localhost:3001` (`frontend/vite.config.js`).

## Arquitetura
```
frontend/src/
  views/          # uma view por rota, PascalCase
  stores/         # sessao, auth, parametros, venda, caixa
  services/api.js # Axios + interceptor token + logout em 401
  composables/useSupabase.js
  router/index.js # lazy-loaded, guard requiresAuth

backend/src/
  app.js / server.js
  supabase.js            # client singleton
  middleware/auth.js     # valida token, injeta req.user
  middleware/permissoes.js  # mapa rota→flag, admin bypass
  routes/auth.js vendas.js caixa.js estoque.js nfce.js ponto.js relatorios.js

banco_dados/migration.sql  # estrutura SQL completa
```

## Padrões obrigatórios

### Vue
- Sempre `<script setup>` + Composition API; nunca Options API
- `onMounted` para carga inicial; nunca `created`
- Prefixo CSS raiz = abreviação do módulo (ex: `.fp-` em FechamentoPonto)
- Sem emojis; sem comentários triviais; strings visíveis ao usuário em português
- Estado vazio: `v-if="carregando"` → spinner → `v-else-if="lista.length===0"` → mensagem → `v-else` tabela
- Toast local: `toastMsg ref + toastTipo ref + função toast(msg, tipo, dur=3500)` com `<Transition name="toast">`
- Modal: sempre `<Teleport to="body">` com `modal-backdrop / modal-box / modal-header / modal-body / modal-footer`
- Nunca hardcodar cores dark: usar `var(--bg)` `var(--bg2)` `var(--bg3)` `var(--bg4)` `var(--border)` `var(--text)` `var(--text2)` `var(--primary)`
- Hover em tabelas: `background: var(--bg3)` (não `rgba`)

### Supabase (frontend)
- Toda tabela com `filial_pk` deve ser filtrada: `.eq('filial_pk', sessao.filial.pk)`
- Registro global ou da filial: `.or('filial_pk.is.null,filial_pk.eq.X')`
- Insert com retorno: `.insert([payload]).select().single()`
- Upsert: `.upsert(payload, { onConflict: 'coluna' })`

### Backend
- Validação: `400`; não encontrado: `404`; erro geral: `500`
- Sucesso sempre retorna `{ ok: true, ... }`
- `console.error` com prefixo `[Modulo/Endpoint]`

## Checklists

**Nova view/rota frontend:**
1. `frontend/src/views/NomeView.vue` com `<script setup>`
2. Lazy import + rota em `router/index.js` com `meta: { requiresAuth: true }`
3. `RouterLink` no sidebar de `App.vue` com `v-if="pode('modulo')"`
4. Entrada em `pode()` no `App.vue`

**Nova rota backend:**
1. Arquivo em `backend/src/routes/`
2. Registrar em `backend/src/routes/index.js` com `authMiddleware` + `permissoesMiddleware`
3. Entrada em `rotasPermissoes` (`middleware/permissoes.js`)

**Novo parâmetro:**
1. `INSERT` em `banco_dados/migration.sql` (seção Parâmetros)
2. Consumir via `parametrosStore.getParam('chave', padrao)`
3. Adicionar em `grupos` e `vals` de `frontend/src/views/Parametros.vue`
4. Adicionar linha na tabela abaixo

**Nova permissão de operador:**
1. Coluna `acesso_xxx boolean DEFAULT false` em `operadores` (migration.sql)
2. Incluir no `SELECT` e no objeto do login (`backend/src/routes/auth.js`)
3. Entrada em `rotasPermissoes` e em `pode()` (`App.vue`)
4. Campo no formulário de `Operadores.vue`

## Parâmetros do sistema
Lidos via `parametrosStore.getParam(chave, padrao)`. Filial sobrescreve global.

| Chave | Padrão | Onde é consumido |
|-------|--------|-----------------|
| `pdv_bloquear_sem_caixa` | `true` | PDV.vue — overlay, `podeFinalizar` |
| `pdv_exigir_vendedor` | `false` | PDV.vue — `podeFinalizar` |
| `pdv_permitir_estoque_negativo` | `false` | PDV.vue — `add()` |
| `pdv_desconto_maximo` | `0` | PDV.vue — `aplicarDescontoItem`, `aplicarDescCat` |
| `crediario_exige_cliente` | `true` | PDV.vue — `podeFinalizar` |
| `venda_permite_desconto_sem_aprovacao` | `true` | PDV.vue — funções de desconto |
| `venda_imprime_cupom` | `false` | PDV.vue — `finalizar()` |
| `nfce_ativa` | `false` | PDV.vue — visibilidade botão NFC-e |
| `nfce_ambiente` | `2` | Backend `.env NFCE_AMBIENTE` |
| `ponto_exigir_gps` | `true` | Ponto.vue — botões de batida |
| `ponto_tolerancia_minutos` | `15` | FechamentoPonto.vue — `processar()` |
| `ponto_adicional_hora_extra` | `60` | FechamentoPonto.vue — `valorHoraNormal` (%) |
| `ponto_adicional_hora_domingo` | `100` | FechamentoPonto.vue — `valorHoraDomingo`, banco de horas (%) |
| `ponto_fechamento_exige_espelho` | `true` | FechamentoPonto.vue — `salvar()` |

## Convenções gerais
- **Fuso**: `America/Manaus (UTC-4)`. Backend sempre usa `{ timeZone: 'America/Manaus' }` ao formatar datas. Frontend envia `data`/`hora` do dispositivo local.
- **Datas**: armazenamento `YYYY-MM-DD`; exibição `dd/MM/YYYY`. Obter: `new Date().toLocaleDateString('en-CA')`. Exibir: `data.split('-').reverse().join('/')`.
- **Auth**: token HMAC-SHA256 12h gerado em `backend/src/routes/auth.js`. Frontend: `localStorage` via `auth.js` store, injetado no Axios. `401` → logout automático.

## Arquivos críticos
- `frontend/src/App.vue` — shell, sidebar, tema, troca de filial, `pode()`
- `frontend/src/router/index.js` — todas as rotas
- `frontend/src/stores/sessao.js` — filial ativa, operador, `trocarFilial()`
- `frontend/src/stores/parametros.js` — `getParam()`, `salvar()`, `carregar()`
- `frontend/src/services/api.js` — Axios com interceptores
- `backend/src/middleware/auth.js` — validação de token
- `backend/src/middleware/permissoes.js` — controle de acesso por rota
- `backend/src/routes/auth.js` — login, `gerarToken`, `validarToken`
- `banco_dados/migration.sql` — estrutura completa do banco
