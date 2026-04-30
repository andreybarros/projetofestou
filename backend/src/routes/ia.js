const express = require('express');
const router  = express.Router();

// POST /api/ia/parse-lista
// Usa GROQ para extrair itens de uma lista em texto livre do cliente
router.post('/parse-lista', async (req, res) => {
  const { texto } = req.body;
  if (!texto?.trim()) return res.status(400).json({ erro: 'Texto obrigatório.' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ erro: 'GROQ_API_KEY não configurado.' });

  try {
    const prompt = `Você é um assistente de PDV. Analise a lista de produtos abaixo e extraia cada item como JSON.

Para cada item, retorne:
- qty: quantidade numérica (padrão 1 se não informado)
- descricao: descrição do produto SEM a quantidade, SEM "pct", SEM "un", mantendo tamanho/número se houver (ex: "n12", "n09", "n05")

Regras:
- Ignore linhas em branco ou que não sejam produtos
- "pct", "pcts", "un", "und" = unidades de medida, não fazem parte da descrição
- Mantenha cores, tamanhos e especificações na descrição
- Se a linha for "1 pct liga" → {qty:1, descricao:"liga"}
- Se for "2 pct un Dourado n05" → {qty:2, descricao:"Dourado n05"}

Retorne APENAS um JSON array válido, sem markdown, sem explicação.

Lista:
${texto}`;

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) throw new Error(`GROQ ${resp.status}`);
    const json   = await resp.json();
    const texto_resp = json.choices?.[0]?.message?.content || '[]';

    // Extrai o JSON mesmo que venha com markdown
    const match = texto_resp.match(/\[[\s\S]*\]/);
    const itens = match ? JSON.parse(match[0]) : [];

    return res.json({ ok: true, itens });
  } catch (e) {
    console.error('[IA/parse-lista]', e.message);
    return res.status(500).json({ erro: 'Erro ao processar lista: ' + e.message });
  }
});

module.exports = router;
