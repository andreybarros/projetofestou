const express  = require('express');
const supabase = require('../supabase');

const router = express.Router();

// GET /api/pdv/produtos?filial_pk=X
router.get('/produtos', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    let q = supabase
      .from('produtos')
      .select('pk, codigo, descricao, valor_venda, preco_promo, promo_inicio, promo_fim, saldo, categoria_pk, foto_url, codigo_barras, ncm, cfop, csosn, unidade_comercial')
      .order('descricao');
    if (filial_pk) q = q.eq('filial_pk', parseInt(filial_pk));
    q = q.eq('ativo', true);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error('[PDV/Produtos] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/pdv/categorias?filial_pk=X
router.get('/categorias', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    let q = supabase.from('categorias').select('pk, nome, desconto_somente_decorador').order('nome');
    if (filial_pk) q = q.eq('filial_pk', parseInt(filial_pk));
    const { data, error } = await q;
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error('[PDV/Categorias] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/pdv/vendedores?filial_pk=X
router.get('/vendedores', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    let q = supabase.from('vendedores').select('pk, nome').eq('ativo', true).order('nome');
    if (filial_pk) q = q.eq('filial_pk', parseInt(filial_pk));
    const { data, error } = await q;
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error('[PDV/Vendedores] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/pdv/formas-pagamento?filial_pk=X
router.get('/formas-pagamento', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
    const { data, error } = await supabase
      .from('formas_pagamento')
      .select('*')
      .eq('filial_pk', parseInt(filial_pk))
      .eq('ativo', true)
      .order('ordem');
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error('[PDV/FormasPagamento] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// PUT /api/pdv/produto/:pk  — atualiza produto + auditoria se saldo mudar
router.put('/produto/:pk', async (req, res) => {
  try {
    const pk = parseInt(req.params.pk);
    if (!pk) return res.status(400).json({ erro: 'pk inválido' });

    const {
      codigo, codigo_barras, descricao, valor_venda, preco_custo, saldo,
      ncm, cfop, csosn, unidade_comercial, categoria_pk,
      armazem_pk, endereco_armazem_pk, filial_pk,
      preco_promo, promo_inicio, promo_fim,
    } = req.body;

    // Lê saldo atual antes de alterar
    const { data: prodAtual } = await supabase
      .from('produtos').select('saldo, descricao').eq('pk', pk).single();

    const saldoAntes = parseFloat(prodAtual?.saldo ?? 0);
    const saldoNovo  = parseFloat(saldo ?? 0);

    const payload = {
      codigo:            codigo            || null,
      codigo_barras:     codigo_barras     || null,
      descricao:         descricao?.trim() || null,
      valor_venda:       parseFloat(valor_venda  || 0),
      preco_custo:       parseFloat(preco_custo  || 0),
      saldo:             saldoNovo,
      ncm:               ncm               || null,
      cfop:              cfop              || '5102',
      csosn:             csosn             || '400',
      unidade_comercial: unidade_comercial || 'UN',
      categoria_pk:      categoria_pk      || null,
      armazem_pk:          armazem_pk          || null,
      endereco_armazem_pk: endereco_armazem_pk || null,
      filial_pk:           filial_pk           || null,
      preco_promo:  preco_promo > 0 ? parseFloat(preco_promo) : null,
      promo_inicio: promo_inicio || null,
      promo_fim:    promo_fim    || null,
    };

    const { error } = await supabase.from('produtos').update(payload).eq('pk', pk);
    if (error) throw error;

    // Auditoria somente se o saldo mudou
    if (saldoNovo !== saldoAntes) {
      const { error: errAudit } = await supabase.from('auditoria_estoque').insert({
        filial_pk:    filial_pk    || null,
        produto_pk:   pk,
        nome:         descricao?.trim() || prodAtual?.descricao || null,
        saldo_antes:  saldoAntes,
        qtd_debitada: saldoNovo - saldoAntes,
        saldo_apos:   saldoNovo,
        observacao:   'Alterado estoque pelo cadastro de produto',
      });
      if (errAudit) console.error('[PDV/Produto/Update] Erro auditoria:', errAudit.message);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[PDV/Produto/Update] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// DELETE /api/pdv/produto/:pk  — soft delete (marca ativo = false)
router.delete('/produto/:pk', async (req, res) => {
  try {
    const pk = parseInt(req.params.pk);
    if (!pk) return res.status(400).json({ erro: 'pk inválido' });
    const { error } = await supabase.from('produtos').update({ ativo: false }).eq('pk', pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[PDV/Produto/Delete] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
