'use strict';
const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

// GET /api/vales
router.get('/', async (req, res) => {
  try {
    const { filial_pk, status, funcionario_pk } = req.query;
    let q = supabase.from('vales').select('*').order('solicitado_em', { ascending: false });
    if (filial_pk)      q = q.eq('filial_pk', filial_pk);
    if (status)         q = q.eq('status', status);
    if (funcionario_pk) q = q.eq('funcionario_pk', funcionario_pk);
    const { data, error } = await q;
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Vales/GET]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// POST /api/vales
router.post('/', async (req, res) => {
  try {
    const { filial_pk, funcionario_pk, funcionario_nome, valor, motivo } = req.body;
    if (!funcionario_nome || !valor)
      return res.status(400).json({ erro: 'funcionario_nome e valor são obrigatórios' });

    const { data, error } = await supabase
      .from('vales')
      .insert([{
        filial_pk,
        funcionario_pk:  funcionario_pk || null,
        funcionario_nome,
        valor,
        valor_original:  valor,
        valor_pago:      0,
        valor_restante:  valor,
        motivo:          motivo || null,
        status:          'pendente',
        solicitado_em:   new Date().toISOString(),
      }])
      .select().single();
    if (error) throw error;
    return res.json({ ok: true, vale: data });
  } catch (err) {
    console.error('[Vales/POST]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/vales/:pk/aprovar
router.patch('/:pk/aprovar', async (req, res) => {
  try {
    const { aprovado_por } = req.body;
    const { error } = await supabase.from('vales')
      .update({ status: 'aprovado', aprovado_em: new Date().toISOString(), aprovado_por: aprovado_por || null })
      .eq('pk', req.params.pk);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Vales/aprovar]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/vales/:pk/rejeitar
router.patch('/:pk/rejeitar', async (req, res) => {
  try {
    const { observacao } = req.body;
    const { error } = await supabase.from('vales')
      .update({ status: 'rejeitado', observacao: observacao || null })
      .eq('pk', req.params.pk);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Vales/rejeitar]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/vales/:pk/pagar
router.patch('/:pk/pagar', async (req, res) => {
  try {
    const { error } = await supabase.from('vales')
      .update({ status: 'pago', pago_em: new Date().toISOString() })
      .eq('pk', req.params.pk);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Vales/pagar]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/vales/:pk/descontar
router.patch('/:pk/descontar', async (req, res) => {
  try {
    const { fechamento_pk } = req.body;
    const { error } = await supabase.from('vales')
      .update({ status: 'descontado', descontado_em: new Date().toISOString(), fechamento_pk: fechamento_pk || null })
      .eq('pk', req.params.pk);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Vales/descontar]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/vales/:pk/desconto-parcial
router.patch('/:pk/desconto-parcial', async (req, res) => {
  try {
    const { valor_desconto, fechamento_pk } = req.body;
    if (!valor_desconto || valor_desconto <= 0)
      return res.status(400).json({ erro: 'valor_desconto deve ser maior que zero' });

    const { data: vale, error: fetchErr } = await supabase
      .from('vales').select('pk, valor, valor_original, valor_pago, valor_restante, status')
      .eq('pk', req.params.pk).single();
    if (fetchErr) throw fetchErr;

    const original   = parseFloat(vale.valor_original ?? vale.valor);
    const jaFoiPago  = parseFloat(vale.valor_pago ?? 0);
    const novoPago   = jaFoiPago + parseFloat(valor_desconto);
    const restante   = Math.max(0, original - novoPago);

    const updates = {
      valor_pago:      parseFloat(novoPago.toFixed(2)),
      valor_restante:  parseFloat(restante.toFixed(2)),
      fechamento_pk:   fechamento_pk || null,
    };

    if (restante <= 0.009) {
      updates.status        = 'descontado';
      updates.descontado_em = new Date().toISOString();
    }

    const { error } = await supabase.from('vales').update(updates).eq('pk', req.params.pk);
    if (error) throw error;

    return res.json({ ok: true, valor_pago: novoPago, valor_restante: restante });
  } catch (err) {
    console.error('[Vales/desconto-parcial]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
