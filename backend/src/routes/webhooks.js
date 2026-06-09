'use strict';
const express = require('express');
const router  = express.Router();
const { enviarPushCliente } = require('../push');

function validarSecret(req, res, next) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ erro: 'Webhook não configurado' });

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (token !== secret) return res.status(401).json({ erro: 'Não autorizado' });
  next();
}

// POST /api/webhooks/venda-criada
// Chamado pelo Supabase Database Webhook ao INSERT na tabela vendas
router.post('/venda-criada', validarSecret, async (req, res) => {
  try {
    const record = req.body?.record;
    if (!record) return res.status(400).json({ erro: 'Payload inválido' });

    const { cliente_pk, numero, total, tipo_venda } = record;
    if (!cliente_pk) return res.json({ ok: true, info: 'Sem cliente, ignorado' });

    const tipoLabel = {
      venda:     'Nova venda',
      locacao:   'Nova locação',
      orcamento: 'Novo orçamento',
      crediario: 'Novo crediário',
    }[tipo_venda] || 'Nova venda';

    await enviarPushCliente(cliente_pk, {
      title: `${tipoLabel} registrada!`,
      body:  `${tipoLabel} #${numero} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(total || 0))}`,
      url:   '/minha-conta',
      tag:   `venda-${record.pk}`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[Webhook/venda-criada]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
