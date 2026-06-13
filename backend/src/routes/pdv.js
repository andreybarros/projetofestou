const express  = require('express');
const supabase = require('../supabase');

const router = express.Router();

// Verifica duplicata de descrição ou código de barras na mesma filial
async function checarDuplicata(filial_pk, descricao, codigo_barras, pk_excluir = null) {
  const descTrim = (descricao || '').trim();
  if (!filial_pk) return null;

  if (descTrim) {
    let q = supabase
      .from('produtos')
      .select('pk, codigo, descricao')
      .eq('filial_pk', filial_pk)
      .eq('ativo', true)
      .ilike('descricao', descTrim)
      .limit(1);
    if (pk_excluir) q = q.neq('pk', pk_excluir);
    const { data } = await q;
    if (data?.[0]) {
      const c = data[0];
      return `Já existe o produto "${c.descricao}" (cód. ${c.codigo || 'sem código'}) com a mesma descrição.`;
    }
  }

  if (codigo_barras) {
    let q = supabase
      .from('produtos')
      .select('pk, codigo, descricao')
      .eq('filial_pk', filial_pk)
      .eq('ativo', true)
      .eq('codigo_barras', codigo_barras)
      .limit(1);
    if (pk_excluir) q = q.neq('pk', pk_excluir);
    const { data } = await q;
    if (data?.[0]) {
      const c = data[0];
      return `Já existe o produto "${c.descricao}" (cód. ${c.codigo || 'sem código'}) com o mesmo código de barras.`;
    }
  }

  return null;
}

async function registrarAuditoriaEstoque(produto_pk, filial_pk, nome, saldo_antes, saldo_apos, observacao, operador = null) {
  const { error } = await supabase.from('auditoria_estoque').insert({
    filial_pk:    filial_pk || null,
    produto_pk,
    nome,
    saldo_antes,
    qtd_debitada: saldo_apos - saldo_antes,
    saldo_apos,
    observacao,
    operador:     operador  || null,
  });
  if (error) console.error('[PDV/AuditoriaEstoque] Erro:', error.message);
}

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

// POST /api/pdv/produto  — cria produto com validação de duplicata
router.post('/produto', async (req, res) => {
  try {
    const {
      codigo, codigo_barras, descricao, valor_venda, preco_custo, saldo,
      ncm, cfop, csosn, unidade_comercial, categoria_pk,
      armazem_pk, endereco_armazem_pk, filial_pk,
      preco_promo, promo_inicio, promo_fim, foto_url,
    } = req.body;

    if (!descricao?.trim()) return res.status(400).json({ erro: 'Descrição obrigatória.' });
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório.' });

    const payload = {
      codigo:              codigo              || null,
      codigo_barras:       codigo_barras       || null,
      descricao:           descricao.trim(),
      valor_venda:         parseFloat(valor_venda  || 0),
      preco_custo:         parseFloat(preco_custo  || 0),
      saldo:               parseFloat(saldo         || 0),
      ncm:                 ncm                 || null,
      cfop:                cfop                || '5102',
      csosn:               csosn               || '400',
      unidade_comercial:   unidade_comercial   || 'UN',
      categoria_pk:        categoria_pk        || null,
      armazem_pk:          armazem_pk          || null,
      endereco_armazem_pk: endereco_armazem_pk || null,
      filial_pk,
      preco_promo:  preco_promo > 0 ? parseFloat(preco_promo) : null,
      promo_inicio: promo_inicio || null,
      promo_fim:    promo_fim    || null,
      foto_url:     foto_url     || null,
      ativo:        true,
    };

    const { data: inserted, error } = await supabase
      .from('produtos').insert(payload).select('pk, codigo').single();

    if (error) {
      // Conflito no código único: gera próximo e tenta de novo
      if (error.code === '23505' && error.message.includes('codigo')) {
        const { data: novoCod } = await supabase.rpc('proximo_codigo_produto', { p_filial_pk: filial_pk });
        payload.codigo = novoCod || payload.codigo;
        const { data: retry, error: err2 } = await supabase
          .from('produtos').insert(payload).select('pk, codigo').single();
        if (err2) throw err2;
        await registrarAuditoriaEstoque(retry.pk, filial_pk, payload.descricao, 0, payload.saldo, 'Cadastro inicial do produto', req.user?.nome);
        return res.json({ ok: true, pk: retry.pk, codigo: payload.codigo });
      }
      throw error;
    }

    if (payload.saldo > 0) {
      await registrarAuditoriaEstoque(inserted.pk, filial_pk, payload.descricao, 0, payload.saldo, 'Cadastro inicial do produto', req.user?.nome);
    }

    res.json({ ok: true, pk: inserted.pk, codigo: inserted.codigo });
  } catch (err) {
    console.error('[PDV/Produto/Create] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/pdv/produtos/duplicatas?filial_pk=X  — lista produtos com descrição ou código de barras duplicados
router.get('/produtos/duplicatas', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });

    const { data, error } = await supabase
      .from('produtos')
      .select('pk, codigo, codigo_barras, descricao, valor_venda, saldo')
      .eq('filial_pk', parseInt(filial_pk))
      .eq('ativo', true)
      .order('descricao');
    if (error) throw error;

    const lista = data || [];

    const porDescricao = {};
    lista.forEach(p => {
      const key = (p.descricao || '').trim().toLowerCase();
      if (!porDescricao[key]) porDescricao[key] = [];
      porDescricao[key].push(p);
    });

    const porBarras = {};
    lista.forEach(p => {
      if (!p.codigo_barras) return;
      if (!porBarras[p.codigo_barras]) porBarras[p.codigo_barras] = [];
      porBarras[p.codigo_barras].push(p);
    });

    const porDescricaoDup = Object.values(porDescricao)
      .filter(g => g.length > 1)
      .map(g => ({ descricao: g[0].descricao, produtos: g }));

    const porBarrasDup = Object.values(porBarras)
      .filter(g => g.length > 1)
      .map(g => ({ codigo_barras: g[0].codigo_barras, produtos: g }));

    res.json({ ok: true, por_descricao: porDescricaoDup, por_codigo_barras: porBarrasDup });
  } catch (err) {
    console.error('[PDV/Produtos/Duplicatas] Erro:', err.message);
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
      preco_promo, promo_inicio, promo_fim, foto_url,
    } = req.body;

    // Lê saldo atual antes de alterar
    const { data: prodAtual } = await supabase
      .from('produtos').select('saldo, descricao, filial_pk').eq('pk', pk).single();

    const saldoAntes  = parseFloat(prodAtual?.saldo ?? 0);
    const saldoNovo   = parseFloat(saldo ?? 0);

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
      foto_url:     foto_url     || null,
    };

    const { error } = await supabase.from('produtos').update(payload).eq('pk', pk);
    if (error) throw error;

    // Auditoria somente se o saldo mudou
    if (Math.round(saldoNovo * 1000) !== Math.round(saldoAntes * 1000)) {
      const filialAudit = filial_pk || prodAtual?.filial_pk || null;
      const nomeAudit   = descricao?.trim() || prodAtual?.descricao || null;
      await registrarAuditoriaEstoque(pk, filialAudit, nomeAudit, saldoAntes, saldoNovo, 'Alterado no cadastro de produto', req.user?.nome);
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
