// ══════════════════════════════════════════════════════════════
// Festou — Agente WhatsApp
// Recebe mensagens do cliente, consulta Supabase e responde
// via Groq (Llama 3.1 - gratuito)
// ══════════════════════════════════════════════════════════════

const VERIFY_TOKEN      = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_TOKEN    = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GROQ_API_KEY      = process.env.GROQ_API_KEY;
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_KEY      = process.env.SUPABASE_KEY;
const FILIAL_PK         = process.env.FILIAL_PK; // pk da filial no Supabase

// Histórico de conversa em memória (por sessão do servidor)
// Para persistência real, salve no Supabase
const historicos = {};

module.exports = async function handler(req, res) {

  // ── Verificação do webhook (Meta exige isso no cadastro) ──
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  // ── Recebe mensagem do cliente ──
  if (req.method === 'POST') {
    try {
      const value    = req.body?.entry?.[0]?.changes?.[0]?.value;
      const messages = value?.messages;

      // Ignora notificações que não são mensagens de texto
      if (!messages?.length) return res.status(200).end();
      const msg = messages[0];
      if (msg.type !== 'text') return res.status(200).end();

      const from    = msg.from; // número do cliente (ex: 5511999999999)
      const texto   = msg.text.body.trim();
      const nome    = value.contacts?.[0]?.profile?.name || 'Cliente';

      // Histórico da conversa (últimas 10 trocas)
      if (!historicos[from]) historicos[from] = [];
      historicos[from].push({ role: 'user', content: texto });
      if (historicos[from].length > 20) historicos[from] = historicos[from].slice(-20);

      // Busca produtos relevantes no Supabase
      const produtos = await buscarProdutos(texto);

      // Chama o agente IA
      const resposta = await chamarAgente(historicos[from], nome, produtos);

      // Salva resposta no histórico
      historicos[from].push({ role: 'assistant', content: resposta });

      // Envia resposta ao cliente no WhatsApp
      await enviarMensagem(from, resposta);

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[Festou Webhook]', e);
      return res.status(200).end(); // Sempre 200 pra Meta não retentar
    }
  }

  return res.status(405).end();
}

// ── Busca produtos no Supabase com base no texto da mensagem ──
async function buscarProdutos(query) {
  try {
    // Pega as palavras mais relevantes da mensagem (ignora stopwords)
    const stopwords = ['quero','preciso','tem','teria','qual','quanto','custa','me','de','para','um','uma','com','os','as','do','da','no','na','por','pra','e'];
    const palavras = query
      .toLowerCase()
      .replace(/[^a-záéíóúâêôãõç\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.includes(w));

    if (!palavras.length) return [];

    // Busca por cada palavra-chave relevante
    const termo = palavras[0]; // usa a primeira palavra significativa
    let url = `${SUPABASE_URL}/rest/v1/produtos?select=codigo,descricao,preco,saldo,categorias(nome)&saldo=gt.0&descricao=ilike.*${encodeURIComponent(termo)}*&limit=10`;
    if (FILIAL_PK) url += `&filial_pk=eq.${FILIAL_PK}`;

    const r = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

// ── Chama Groq (Llama 3.1 - gratuito) ──
async function chamarAgente(historico, nomeCliente, produtos) {
  const listaProdutos = produtos.length
    ? produtos.map(p =>
        `• ${p.codigo} — ${p.descricao}` +
        ` | R$ ${Number(p.preco || 0).toFixed(2)}` +
        ` | Estoque: ${p.saldo}` +
        (p.categorias ? ` | ${p.categorias.nome}` : '')
      ).join('\n')
    : 'Nenhum produto encontrado para essa busca no momento.';

  const system = `Você é Festa, assistente de vendas da Festou, loja de festas e decoração.
Atende clientes pelo WhatsApp de forma simpática, rápida e objetiva.
Use emojis com moderação. Nunca invente produtos ou preços.

Ao montar um orçamento:
- Liste cada item com código, nome, quantidade, preço unitário e subtotal
- Mostre o total no final
- Pergunte se o cliente quer adicionar mais itens ou finalizar

Se o cliente pedir algo sem resultado no catálogo, informe que não temos no momento.

Produtos disponíveis para essa consulta:
${listaProdutos}`;

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 600,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        ...historico
      ]
    })
  });

  if (!r.ok) {
    console.error('[Groq]', await r.text());
    return 'Desculpe, estou com uma instabilidade. Tente novamente em instantes! 🙏';
  }

  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim()
    || 'Não entendi sua mensagem. Pode repetir? 😊';
}

// ── Envia mensagem pelo WhatsApp Cloud API ──
async function enviarMensagem(para, texto) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
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
}
