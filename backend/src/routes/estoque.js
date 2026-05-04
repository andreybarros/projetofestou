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

// ── Entrada de NF-e ──────────────────────────────────────────────────────────

// Preview: cruza itens do XML com mapeamentos salvos
router.post('/entrada-nf/preview', async (req, res) => {
  try {
    const { filial_pk, fornecedor_cnpj, itens } = req.body;
    if (!filial_pk || !fornecedor_cnpj || !Array.isArray(itens) || !itens.length)
      return res.status(400).json({ erro: 'Dados inválidos.' });

    const codigos = itens.map(i => i.codigo_fornecedor);

    const { data: mapeamentos } = await supabase
      .from('mapeamento_produtos_fornecedor')
      .select('codigo_fornecedor, produto_pk, produtos(pk, descricao, saldo)')
      .eq('filial_pk', filial_pk)
      .eq('fornecedor_cnpj', fornecedor_cnpj)
      .in('codigo_fornecedor', codigos);

    const mapaDeParas = {};
    (mapeamentos || []).forEach(m => {
      mapaDeParas[m.codigo_fornecedor] = { produto_pk: m.produto_pk, produto_descricao: m.produtos?.descricao, saldo_atual: m.produtos?.saldo };
    });

    const itensComMatch = itens.map(it => ({
      ...it,
      produto_pk:         mapaDeParas[it.codigo_fornecedor]?.produto_pk || null,
      produto_descricao:  mapaDeParas[it.codigo_fornecedor]?.produto_descricao || null,
      saldo_atual:        mapaDeParas[it.codigo_fornecedor]?.saldo_atual ?? null,
      matched:            !!mapaDeParas[it.codigo_fornecedor],
    }));

    res.json({ ok: true, itens: itensComMatch });
  } catch (err) {
    console.error('[Estoque/EntradaNF/Preview] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

// Confirmar: salva mapeamentos, cria entrada e atualiza saldo
router.post('/entrada-nf/confirmar', async (req, res) => {
  try {
    const { filial_pk, fornecedor_cnpj, fornecedor_nome, numero_nf, chave_nfe, data_emissao, total_nf, itens } = req.body;
    if (!filial_pk || !Array.isArray(itens) || !itens.length)
      return res.status(400).json({ erro: 'Dados inválidos.' });

    // 1. Salva/atualiza mapeamentos de-para
    const mapeamentos = itens
      .filter(it => it.produto_pk)
      .map(it => ({
        filial_pk,
        fornecedor_cnpj,
        codigo_fornecedor: it.codigo_fornecedor,
        produto_pk: it.produto_pk,
      }));

    if (mapeamentos.length > 0) {
      const { error: errMap } = await supabase
        .from('mapeamento_produtos_fornecedor')
        .upsert(mapeamentos, { onConflict: 'filial_pk,fornecedor_cnpj,codigo_fornecedor' });
      if (errMap) throw errMap;
    }

    // 2. Cria cabeçalho da entrada
    const { data: entrada, error: errEnt } = await supabase
      .from('entradas_estoque')
      .insert([{ filial_pk, fornecedor_cnpj, fornecedor_nome, numero_nf, chave_nfe, data_emissao, total_nf }])
      .select().single();
    if (errEnt) throw errEnt;

    // 3. Insere itens
    const itensBD = itens.filter(it => it.produto_pk).map(it => ({
      entrada_pk:           entrada.pk,
      produto_pk:           it.produto_pk,
      codigo_fornecedor:    it.codigo_fornecedor,
      descricao_fornecedor: it.descricao_fornecedor,
      qtd:                  parseFloat(it.qtd || 0),
      preco_custo:          parseFloat(it.preco_custo || 0),
      total_item:           parseFloat(it.total_item || 0),
    }));

    const { error: errItens } = await supabase.from('itens_entrada_estoque').insert(itensBD);
    if (errItens) throw errItens;

    // 4. Atualiza saldo dos produtos usando RPC atômica
    for (const it of itensBD) {
      await supabase.rpc('ajustar_saldo_produto', {
        p_pk: it.produto_pk,
        p_delta: it.qtd,
        p_permitir_negativo: true,
      });
      // Também atualiza preco_custo se informado
      if (it.preco_custo > 0) {
        await supabase.from('produtos').update({ preco_custo: it.preco_custo }).eq('pk', it.produto_pk);
      }
    }

    res.json({ ok: true, entrada_pk: entrada.pk, itens_atualizados: itensBD.length });
  } catch (err) {
    console.error('[Estoque/EntradaNF/Confirmar] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

// Histórico de entradas
router.get('/entrada-nf/historico/:filial_pk', async (req, res) => {
  try {
    const filial_pk = parseInt(req.params.filial_pk, 10);
    const { data, error } = await supabase
      .from('entradas_estoque')
      .select('pk, fornecedor_cnpj, fornecedor_nome, numero_nf, chave_nfe, data_emissao, total_nf, criado_em, itens_entrada_estoque(pk)')
      .eq('filial_pk', filial_pk)
      .order('criado_em', { ascending: false })
      .limit(200);
    if (error) throw error;
    const entradas = (data || []).map(e => ({
      ...e,
      qtd_itens: e.itens_entrada_estoque?.length || 0,
      itens_entrada_estoque: undefined,
    }));
    res.json({ ok: true, entradas });
  } catch (err) {
    console.error('[Estoque/Historico] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
