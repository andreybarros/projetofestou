const express = require('express');
const router  = express.Router();

// POST /api/ia/parse-lista
router.post('/parse-lista', async (req, res) => {
  const { texto } = req.body;
  if (!texto?.trim()) return res.status(400).json({ erro: 'Texto obrigatório.' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ erro: 'GROQ_API_KEY não configurado.' });

  const prompt = `Você é um assistente de PDV brasileiro. Analise a lista de pedido abaixo e extraia cada item.

Para cada item retorne um objeto JSON com:
- qty: número inteiro (padrão 1 se não informado)
- descricao: descrição limpa do produto (sem quantidade, sem pct/un/und/cx)

Regras:
- "pct", "pcts", "un", "und", "cx" são unidades de medida, não fazem parte da descrição
- Mantenha cores, tamanhos e numerações (n09, n12, nº5, etc.) na descrição
- Não agrupe itens diferentes numa mesma linha
- Se uma linha tiver só número ou for cabeçalho, ignore
- Retorne APENAS um JSON array válido, sem markdown, sem explicação

Exemplos:
"2 pct liga dourada n9" → {"qty":2,"descricao":"liga dourada n9"}
"1 balão metalizado coração rosa" → {"qty":1,"descricao":"balão metalizado coração rosa"}
"10un fita cetim 10mm azul" → {"qty":10,"descricao":"fita cetim 10mm azul"}

Lista do cliente:
${texto}`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) throw new Error(`GROQ ${resp.status}`);
    const json      = await resp.json();
    const textoResp = json.choices?.[0]?.message?.content || '[]';

    const match = textoResp.match(/\[[\s\S]*\]/);
    const itens = match ? JSON.parse(match[0]) : [];

    return res.json({ ok: true, itens });
  } catch (e) {
    console.error('[IA/parse-lista]', e.message);
    return res.status(500).json({ erro: 'Erro ao processar lista: ' + e.message });
  }
});

module.exports = router;
