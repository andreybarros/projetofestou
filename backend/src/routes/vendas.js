const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.post('/validar', async (req, res) => {
  try {
    const { filial_pk, itens } = req.body;

    if (!filial_pk || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'filial_pk e itens obrigatórios' });
    }

    const { data: caixa, error: erroCaixa } = await supabase
      .from('caixas')
      .select('pk')
      .eq('filial_pk', filial_pk)
      .eq('status', 'aberto')
      .maybeSingle();

    if (erroCaixa) throw erroCaixa;

    const produtoPks = itens.map(item => item.produto_pk).filter(Boolean);
    if (produtoPks.length > 0) {
      const { data: produtos, error: erroEstoque } = await supabase
        .from('produtos')
        .select('pk, saldo')
        .in('pk', produtoPks);

      if (erroEstoque) throw erroEstoque;

      const estoquePorPk = {};
      produtos?.forEach(p => {
        estoquePorPk[p.pk] = parseFloat(p.saldo || 0);
      });

      const faltando = [];
      itens.forEach(item => {
        if (!item.produto_pk) return;
        const estoque = estoquePorPk[item.produto_pk];
        const qtd = parseFloat(item.qtd || 0);

        if (estoque === undefined || estoque < qtd) {
          faltando.push({
            produto_pk: item.produto_pk,
            saldo: estoque || 0,
            qtd_solicitada: qtd
          });
        }
      });

      if (faltando.length > 0) {
        return res.status(200).json({
          ok: false,
          erro: 'Estoque insuficiente para alguns produtos',
          faltando
        });
      }
    }

    res.status(200).json({
      ok: true,
      caixa_pk: caixa ? caixa.pk : null,
      validacoes: {
        estoque_ok: true,
        caixa_ok: !!caixa
      }
    });
  } catch (err) {
    console.error('[Vendas/Validar] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao validar venda' });
  }
});

router.post('/finalizar', async (req, res) => {
  try {
    const {
      filial_pk,
      operador,
      cliente,
      cliente_pk,
      vendedor,
      vendedor_pk,
      itens,
      pagamentos,
      subtotal,
      desconto_total,
      total,
      tipo_venda,
      canal_venda,
      data_locacao,
      data_devolucao_prevista,
      data_vencimento_crediario
    } = req.body;

    if (!Array.isArray(itens) || !Array.isArray(pagamentos) || total === undefined) {
      return res.status(400).json({ erro: 'itens, pagamentos, total obrigatórios' });
    }

    // 1. Obtém o número da venda (sequencial por filial)
    let qn = supabase.from('vendas').select('numero').order('numero', { ascending: false }).limit(1);
    if (filial_pk) qn = qn.eq('filial_pk', filial_pk);
    const { data: rn, error: errNum } = await qn;
    if (errNum) throw errNum;
    const numero = (rn && rn.length ? rn[0].numero : 999) + 1;

    // 2. Montar objeto da venda
    const payloadVenda = {
      filial_pk: filial_pk || null,
      numero,
      cliente:      cliente    || null,
      cliente_pk:   cliente_pk || null,
      vendedor:     vendedor   || null,
      vendedor_pk:  vendedor_pk || null,
      subtotal:     parseFloat(subtotal || 0),
      desconto_total: parseFloat(desconto_total || 0),
      total:        parseFloat(total),
      operador:     operador || null,
      status: 'finalizada',
      tipo_venda: tipo_venda || 'venda',
      canal_venda: canal_venda || 'presencial',
      criado_em: new Date().toISOString()
    };

    if (tipo_venda === 'locacao') {
      if (!data_locacao || !data_devolucao_prevista) {
        return res.status(400).json({ erro: "Para locações, informe data de retirada e devolução." });
      }
      payloadVenda.data_locacao = new Date(data_locacao).toISOString();
      payloadVenda.data_devolucao_prevista = new Date(data_devolucao_prevista).toISOString();
      payloadVenda.status_locacao = 'pendente';
    }

    const temCrediario = pagamentos.some(p => String(p.forma).toLowerCase() === 'crediario');
    if (temCrediario) {
      if (!data_vencimento_crediario) return res.status(400).json({ erro: "Informe a data de vencimento do crediário." });

      const { data: paramCliente } = await supabase
        .from('parametros')
        .select('valor')
        .eq('chave', 'crediario_exige_cliente')
        .or(`filial_pk.eq.${filial_pk || 0},filial_pk.is.null`)
        .order('filial_pk', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      const exigeCliente = paramCliente ? paramCliente.valor !== 'false' : true;

      if (exigeCliente && !cliente) return res.status(400).json({ erro: "Crediário exige um cliente selecionado." });

      payloadVenda.data_vencimento_crediario = data_vencimento_crediario;
      payloadVenda.status_crediario = 'pendente';
    }

    // 3. Inserir a Venda
    const { data: vendaSalva, error: erroVenda } = await supabase
      .from('vendas')
      .insert(payloadVenda)
      .select('pk, numero')
      .single();

    if (erroVenda) throw erroVenda;
    const venda_pk = vendaSalva.pk;

    // 4. Inserir itens
    const itensPayload = itens.map(item => ({
      venda_pk,
      produto_pk:   item.produto_pk || null,
      descricao:    item.descricao  || item.nome || '',
      codigo:       item.codigo     || null,
      qtd:          parseFloat(item.qtd          || 1),
      preco_unit:   parseFloat(item.preco_unit   || 0),
      total_item:   parseFloat(item.total_item   || 0),
      desconto_val: parseFloat(item.desconto_val || 0),
    }));

    const { error: erroItens } = await supabase.from('itens_venda').insert(itensPayload);
    if (erroItens) throw erroItens;

    // 5. Inserir pagamentos
    const pagamentosPayload = pagamentos.map(p => ({
      venda_pk,
      forma:  String(p.forma || 'dinheiro'),
      valor:  parseFloat(p.valor  || 0),
    }));

    const { error: erroPag } = await supabase.from('pagamentos_venda').insert(pagamentosPayload);
    if (erroPag) throw erroPag;

    // 6. Decrementar estoque (atômico com FOR UPDATE — sem race condition)
    const { data: paramEstoque } = await supabase
      .from('parametros')
      .select('valor')
      .eq('chave', 'pdv_permitir_estoque_negativo')
      .or(`filial_pk.eq.${filial_pk || 0},filial_pk.is.null`)
      .order('filial_pk', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const permitirNegativo = paramEstoque ? paramEstoque.valor === 'true' : false;

    for (const item of itens) {
      if (!item.produto_pk) continue;
      const { data: ok } = await supabase.rpc('ajustar_saldo_produto', {
        p_pk: item.produto_pk,
        p_delta: -parseFloat(item.qtd || 0),
        p_permitir_negativo: permitirNegativo,
      });
      if (ok === false) {
        return res.status(400).json({
          erro: `Estoque insuficiente para o produto ${item.descricao || item.produto_pk}.`,
          produto_pk: item.produto_pk,
        });
      }
    }

    // 7. Associar ao caixa
    const { data: caixaAberto } = await supabase
      .from('caixas')
      .select('pk')
      .eq('filial_pk', filial_pk)
      .eq('status', 'aberto')
      .maybeSingle();

    if (caixaAberto) {
      await supabase.from('movimentos_caixa').insert({
        caixa_pk:   caixaAberto.pk,
        venda_pk,
        tipo:       'venda',
        valor:      parseFloat(total),
        descricao:  `Venda #${vendaSalva.numero}`,
        criado_em: new Date().toISOString(),
      });
    }

    res.status(201).json({
      ok:       true,
      venda_pk,
      numero:   vendaSalva.numero,
      total:    parseFloat(total),
      caixa_pk: caixaAberto?.pk || null,
    });

  } catch (err) {
    console.error('[Vendas/Finalizar] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao finalizar venda' });
  }
});

router.post('/devolver', async (req, res) => {
  try {
    const { venda_pk, motivo } = req.body;
    if (!venda_pk) return res.status(400).json({ erro: 'venda_pk obrigatório' });

    const { data: venda, error: errVenda } = await supabase
      .from('vendas')
      .select('*')
      .eq('pk', venda_pk)
      .single();

    if (errVenda || !venda) return res.status(404).json({ erro: 'Venda não encontrada' });
    if (venda.status === 'devolvida') return res.status(400).json({ erro: 'Venda já foi devolvida' });

    const { data: itens, error: errItens } = await supabase
      .from('itens_venda')
      .select('*')
      .eq('venda_pk', venda_pk);

    if (errItens) throw errItens;

    for (const item of itens) {
      if (!item.produto_pk) continue;
      await supabase.rpc('ajustar_saldo_produto', {
        p_pk: item.produto_pk,
        p_delta: parseFloat(item.qtd || 0),
        p_permitir_negativo: true,
      });
    }

    await supabase.from('vendas').update({ status: 'devolvida' }).eq('pk', venda_pk);

    const { data: caixaAberto } = await supabase
      .from('caixas')
      .select('pk')
      .eq('filial_pk', venda.filial_pk)
      .eq('status', 'aberto')
      .maybeSingle();

    if (caixaAberto) {
      await supabase.from('movimentos_caixa').insert({
        caixa_pk:   caixaAberto.pk,
        venda_pk:   venda_pk,
        tipo:       'devolucao',
        valor:      -parseFloat(venda.total),
        descricao:  `ESTORNO: Devolução Venda #${venda.numero} ${motivo ? '('+motivo+')' : ''}`,
        criado_em: new Date().toISOString(),
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Vendas/Devolver] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao processar devolução' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { filial_pk, inicio, fim, status, busca, limit = 20, offset = 0 } = req.query;
    console.log('[Vendas/Listar] Params:', { filial_pk, inicio, fim, status, busca, limit, offset });
    
    let q = supabase
      .from('vendas')
      .select('pk, numero, criado_em, cliente, operador, vendedor, total, status, tipo_venda, nfce_chave, nfce_protocolo, nfce_dh_emissao, filial_pk', { count: 'exact' });

    if (filial_pk && filial_pk !== 'undefined' && filial_pk !== 'null' && filial_pk !== '') {
      q = q.eq('filial_pk', parseInt(filial_pk));
    }
    if (status && status !== '' && status !== 'null') {
      q = q.eq('status', status);
    }
    if (inicio && inicio !== '' && inicio !== 'null') {
      q = q.gte('criado_em', inicio);
    }
    if (fim && fim !== '' && fim !== 'null') {
      q = q.lte('criado_em', fim + 'T23:59:59');
    }

    if (busca && busca.trim() !== "") {
      const b = busca.trim();
      const isNum = !isNaN(b);
      if (isNum) {
        q = q.or(`numero.eq.${b},cliente.ilike.%${b}%,operador.ilike.%${b}%`);
      } else {
        q = q.or(`cliente.ilike.%${b}%,operador.ilike.%${b}%`);
      }
    }

    q = q.order('criado_em', { ascending: false })
         .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await q;
    if (error) {
      console.error('[Vendas/Listar] Erro Supabase:', error);
      throw error;
    }

    res.json({ data: data || [], count: count || 0 });
  } catch (err) {
    console.error('[Vendas/Listar] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;

    const { data: venda } = await supabase.from('vendas').select('*').eq('pk', pk).single();
    if (!venda) return res.status(404).json({ erro: 'Venda não encontrada' });

    if (venda.status === 'finalizada') {
      const { data: itens } = await supabase.from('itens_venda').select('*').eq('venda_pk', pk);
      if (itens) {
        for (const item of itens) {
          if (!item.produto_pk) continue;
          await supabase.rpc('ajustar_saldo_produto', {
            p_pk: item.produto_pk,
            p_delta: parseFloat(item.qtd || 0),
            p_permitir_negativo: true,
          });
        }
      }
    }

    await supabase.from('itens_venda').delete().eq('venda_pk', pk);
    await supabase.from('pagamentos_venda').delete().eq('venda_pk', pk);
    await supabase.from('movimentos_caixa').delete().eq('venda_pk', pk);
    
    const { error: errDel } = await supabase.from('vendas').delete().eq('pk', pk);
    if (errDel) throw errDel;

    res.json({ ok: true });
  } catch (err) {
    console.error('[Vendas/Excluir] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
