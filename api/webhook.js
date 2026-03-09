// ══════════════════════════════════════════════════════════════
// Festou — Agente de Vendas WhatsApp
// Tool calling com Groq (Llama 3.1) + Supabase
// ══════════════════════════════════════════════════════════════

const VERIFY_TOKEN    = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_TOKEN  = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GROQ_API_KEY    = process.env.GROQ_API_KEY;
const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_KEY;
const FILIAL_PK       = process.env.FILIAL_PK;

// Estado por cliente: { historico, carrinho }
const sessoes = {};

// ── Ferramentas disponíveis para o agente ─────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'buscar_produtos',
      description: 'Busca produtos disponíveis no estoque pelo nome ou categoria',
      parameters: {
        type: 'object',
        properties: {
          termo: { type: 'string', description: 'Nome ou categoria do produto' }
        },
        required: ['termo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'adicionar_item',
      description: 'Adiciona um produto ao carrinho do cliente',
      parameters: {
        type: 'object',
        properties: {
          produto_pk:  { type: 'string'  },
          codigo:      { type: 'string'  },
          descricao:   { type: 'string'  },
          preco:       { type: 'number'  },
          qtd:         { type: 'number'  }
        },
        required: ['produto_pk', 'codigo', 'descricao', 'preco', 'qtd']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remover_item',
      description: 'Remove um item do carrinho pelo código do produto',
      parameters: {
        type: 'object',
        properties: {
          codigo: { type: 'string' }
        },
        required: ['codigo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ver_carrinho',
      description: 'Retorna os itens atuais no carrinho do cliente com subtotal e total',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'finalizar_venda',
      description: 'Finaliza a venda, cria o pedido no sistema e confirma ao cliente',
      parameters: {
        type: 'object',
        properties: {
          forma_pagamento: {
            type: 'string',
            enum: ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'crediario'],
            description: 'Forma de pagamento escolhida pelo cliente'
          },
          nome_cliente: {
            type: 'string',
            description: 'Nome do cliente para registrar na venda (opcional)'
          }
        },
        required: ['forma_pagamento']
      }
    }
  }
];

// ── Handler principal ─────────────────────────────────────────
module.exports = async function handler(req, res) {

  if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).end();
  }

  if (req.method === 'POST') {
    try {
      const value    = req.body?.entry?.[0]?.changes?.[0]?.value;
      const messages = value?.messages;
      if (!messages?.length) return res.status(200).end();

      const msg = messages[0];
      if (msg.type !== 'text') return res.status(200).end();

      const from  = msg.from;
      const texto = msg.text.body.trim();
      const nome  = value.contacts?.[0]?.profile?.name || 'Cliente';

      if (!sessoes[from]) sessoes[from] = { historico: [], carrinho: [] };
      const sessao = sessoes[from];

      const resposta = await processarMensagem(sessao, texto, nome);
      await enviarMensagem(from, resposta);

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[Festou]', e);
      return res.status(200).end();
    }
  }

  return res.status(405).end();
};

// ── Processamento com tool calling ───────────────────────────
async function processarMensagem(sessao, texto, nome) {
  sessao.historico.push({ role: 'user', content: texto });
  if (sessao.historico.length > 30) sessao.historico = sessao.historico.slice(-30);

  const systemPrompt = `Você é Festa, assistente de vendas da Festou, loja de festas e decoração.
Atende pelo WhatsApp de forma simpática, rápida e objetiva. Use emojis com moderação.
Cliente: ${nome}

Fluxo de venda:
1. Cliente pede produtos → use buscar_produtos para encontrar
2. Cliente confirma quantidade → use adicionar_item para adicionar ao carrinho
3. Cliente quer ver o pedido → use ver_carrinho
4. Cliente quer finalizar → confirme a forma de pagamento e use finalizar_venda

Regras:
- Nunca invente produtos ou preços. Só ofereça o que buscar_produtos retornar.
- Sempre confirme quantidade e item antes de adicionar.
- Ao finalizar, liste o resumo do pedido e o número gerado.
- Se o carrinho estiver vazio e o cliente tentar finalizar, informe que precisa adicionar itens.`;

  let messages = [
    { role: 'system', content: systemPrompt },
    ...sessao.historico
  ];

  // Loop de tool calling (máx 5 rodadas)
  for (let i = 0; i < 5; i++) {
    const data = await groqChat(messages, TOOLS);
    const choice = data.choices?.[0];
    if (!choice) break;

    if (choice.finish_reason === 'tool_calls') {
      messages.push(choice.message);

      for (const tc of (choice.message.tool_calls || [])) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}

        const resultado = await executarTool(tc.function.name, args, sessao);
        console.log(`[Tool] ${tc.function.name}`, args, '→', resultado);

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(resultado)
        });
      }
    } else {
      const resposta = choice.message?.content?.trim() || 'Não entendi. Pode repetir? 😊';
      sessao.historico.push({ role: 'assistant', content: resposta });
      return resposta;
    }
  }

  return 'Desculpe, tive um problema interno. Tente novamente! 🙏';
}

// ── Execução das ferramentas ──────────────────────────────────
async function executarTool(nome, args, sessao) {
  switch (nome) {

    case 'buscar_produtos': {
      const produtos = await supabaseBuscarProdutos(args.termo);
      if (!produtos.length) return { encontrados: 0, mensagem: 'Nenhum produto encontrado.' };
      return {
        encontrados: produtos.length,
        produtos: produtos.map(p => ({
          produto_pk: p.pk,
          codigo: p.codigo,
          descricao: p.descricao,
          preco: Number(p.preco || 0),
          saldo: p.saldo,
          categoria: p.categorias?.nome || null
        }))
      };
    }

    case 'adicionar_item': {
      const idx = sessao.carrinho.findIndex(i => i.codigo === args.codigo);
      if (idx >= 0) {
        sessao.carrinho[idx].qtd += Number(args.qtd);
      } else {
        sessao.carrinho.push({
          produto_pk: args.produto_pk,
          codigo: args.codigo,
          descricao: args.descricao,
          preco_unit: Number(args.preco),
          qtd: Number(args.qtd),
          desconto_pct: 0
        });
      }
      return { ok: true, itens_no_carrinho: sessao.carrinho.length };
    }

    case 'remover_item': {
      const antes = sessao.carrinho.length;
      sessao.carrinho = sessao.carrinho.filter(i => i.codigo !== args.codigo);
      return { removido: sessao.carrinho.length < antes };
    }

    case 'ver_carrinho': {
      if (!sessao.carrinho.length) return { vazio: true };
      const itens = sessao.carrinho.map(i => ({
        codigo: i.codigo,
        descricao: i.descricao,
        qtd: i.qtd,
        preco_unit: i.preco_unit,
        subtotal: i.qtd * i.preco_unit
      }));
      const total = itens.reduce((s, i) => s + i.subtotal, 0);
      return { itens, total };
    }

    case 'finalizar_venda': {
      if (!sessao.carrinho.length) return { erro: 'Carrinho vazio.' };
      const resultado = await criarVenda(sessao.carrinho, args.forma_pagamento, args.nome_cliente);
      if (resultado.erro) return { erro: resultado.erro };
      sessao.carrinho = []; // limpa carrinho após venda
      return { ok: true, numero_venda: resultado.numero, total: resultado.total };
    }

    default:
      return { erro: 'Ferramenta desconhecida.' };
  }
}

// ── Supabase: busca produtos ──────────────────────────────────
async function supabaseBuscarProdutos(termo) {
  try {
    const palavras = termo.toLowerCase()
      .replace(/[^a-záéíóúâêôãõç\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const t = encodeURIComponent(palavras[0] || termo);
    let url = `${SUPABASE_URL}/rest/v1/produtos?select=pk,codigo,descricao,preco,saldo,categorias(nome)&saldo=gt.0&descricao=ilike.*${t}*&limit=10`;
    if (FILIAL_PK) url += `&filial_pk=eq.${FILIAL_PK}`;

    const r = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

// ── Supabase: cria venda ──────────────────────────────────────
async function criarVenda(carrinho, formaPagamento, nomeCliente) {
  try {
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // Próximo número de venda
    let numUrl = `${SUPABASE_URL}/rest/v1/vendas?select=numero&order=numero.desc&limit=1`;
    if (FILIAL_PK) numUrl += `&filial_pk=eq.${FILIAL_PK}`;
    const rnRes = await fetch(numUrl, { headers });
    const rnData = rnRes.ok ? await rnRes.json() : [];
    const numero = (rnData[0]?.numero || 999) + 1;

    const total = carrinho.reduce((s, i) => s + i.qtd * i.preco_unit, 0);

    // Cria venda
    const vendaRes = await fetch(`${SUPABASE_URL}/rest/v1/vendas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filial_pk: FILIAL_PK || null,
        numero,
        cliente: nomeCliente || null,
        subtotal: total,
        desconto_total: 0,
        total,
        operador: 'WhatsApp',
        status: 'finalizada',
        tipo_venda: 'venda',
        canal_venda: 'whatsapp'
      })
    });
    if (!vendaRes.ok) {
      const err = await vendaRes.text();
      console.error('[Venda]', err);
      return { erro: 'Erro ao criar venda.' };
    }
    const venda = await vendaRes.json();
    const vendaPk = venda[0]?.pk || venda?.pk;

    // Cria itens
    const itens = carrinho.map(i => ({
      venda_pk: vendaPk,
      produto_pk: i.produto_pk,
      codigo: i.codigo,
      descricao: i.descricao,
      preco_unit: i.preco_unit,
      qtd: i.qtd,
      desconto_pct: 0,
      desconto_val: 0,
      total_item: i.qtd * i.preco_unit
    }));
    await fetch(`${SUPABASE_URL}/rest/v1/itens_venda`, {
      method: 'POST',
      headers,
      body: JSON.stringify(itens)
    });

    // Cria pagamento
    await fetch(`${SUPABASE_URL}/rest/v1/pagamentos_venda`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ venda_pk: vendaPk, forma: formaPagamento, valor: total }])
    });

    return { numero, total };
  } catch (e) {
    console.error('[criarVenda]', e);
    return { erro: e.message };
  }
}

// ── Groq API ──────────────────────────────────────────────────
async function groqChat(messages, tools) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 800,
      temperature: 0.3,
      tools,
      tool_choice: 'auto',
      messages
    })
  });
  if (!r.ok) { console.error('[Groq]', await r.text()); return {}; }
  return r.json();
}

// ── WhatsApp Cloud API ────────────────────────────────────────
async function enviarMensagem(para, texto) {
  const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: para,
      type: 'text',
      text: { body: texto }
    })
  });
  if (!r.ok) console.error('[WhatsApp send]', await r.text());
}
