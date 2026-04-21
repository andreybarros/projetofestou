const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.post('/verificar', async (req, res) => {
  try {
    const { itens } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'itens deve ser um array não vazio' });
    }

    const produtoPks = itens.map(item => item.produto_pk);

    const { data: produtos, error } = await supabase
      .from('produtos')
      .select('pk, nome, estoque_atual')
      .in('pk', produtoPks);

    if (error) throw error;

    const estoquePorPk = {};
    produtos?.forEach(p => {
      estoquePorPk[p.pk] = {
        nome: p.nome,
        estoque_atual: parseFloat(p.estoque_atual || 0)
      };
    });

    const faltando = [];
    let ok = true;

    itens.forEach(item => {
      const estoque = estoquePorPk[item.produto_pk];
      const qtd_solicitada = parseFloat(item.qtd || 0);

      if (!estoque) {
        faltando.push({
          produto_pk: item.produto_pk,
          erro: 'Produto não encontrado'
        });
        ok = false;
      } else if (estoque.estoque_atual < qtd_solicitada) {
        faltando.push({
          produto_pk: item.produto_pk,
          nome: estoque.nome,
          estoque_atual: estoque.estoque_atual,
          qtd_solicitada
        });
        ok = false;
      }
    });

    res.status(200).json({
      ok,
      faltando: ok ? [] : faltando
    });
  } catch (err) {
    console.error('[Estoque/Verificar] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao verificar estoque' });
  }
});

router.get('/saldo/:produto_pk', async (req, res) => {
  try {
    const { produto_pk } = req.params;

    const { data: produto, error } = await supabase
      .from('produtos')
      .select('pk, nome, estoque_atual')
      .eq('pk', produto_pk)
      .single();

    if (error || !produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    res.status(200).json({
      produto_pk: produto.pk,
      nome: produto.nome,
      estoque_atual: parseFloat(produto.estoque_atual || 0)
    });
  } catch (err) {
    console.error('[Estoque/Saldo] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao buscar saldo' });
  }
});

module.exports = router;
