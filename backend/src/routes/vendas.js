const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

// =====================================================================
//  Ajuste de estoque atômico (uma transação no Postgres p/ N produtos).
//  ajustes: [{ pk, delta }]  delta<0 = débito | delta>0 = estorno
//  Retorna: { ok, insuficiente, error, resultado }
//    ok=true            -> tudo aplicado; resultado=[{pk,saldo_antes,saldo_apos}]
//    insuficiente=true  -> saldo ficaria negativo (e negativo não permitido);
//                          NADA foi alterado (rollback automático na função)
//    error              -> falha técnica (rede/timeout/lock/deadlock/etc);
//                          NADA foi alterado
// =====================================================================
async function ajustarSaldos(ajustes, permitirNegativo) {
  const limpos = (ajustes || [])
    .filter(a => a && a.pk && Number(a.delta) !== 0)
    .map(a => ({ pk: Number(a.pk), delta: Number(a.delta) }));

  if (!limpos.length) return { ok: true, resultado: [] };

  const { data, error } = await supabase.rpc('ajustar_saldos_venda', {
    p_ajustes:           limpos,
    p_permitir_negativo: !!permitirNegativo,
  });

  if (error) {
    const insuficiente = String(error.message || '').includes('ESTOQUE_INSUFICIENTE');
    return { ok: false, insuficiente, error, resultado: null };
  }
  return { ok: true, resultado: data || [] };
}

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
      cliente_pk,
      cliente_codigo,
      vendedor,
      vendedor_pk,
      itens,
      pagamentos,
      subtotal,
      desconto_total,
      acrescimo,
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
      filial_pk:      filial_pk      || null,
      numero,
      cliente_pk:     cliente_pk     || null,
      cliente_codigo: cliente_codigo || null,
      vendedor:       vendedor       || null,
      vendedor_pk:    vendedor_pk    || null,
      subtotal:       parseFloat(subtotal      || 0),
      desconto_total: parseFloat(desconto_total || 0),
      acrescimo:      parseFloat(acrescimo      || 0),
      total:          parseFloat(total),
      operador:       operador || null,
      status:         'finalizada',
      tipo_venda:     tipo_venda  || 'venda',
      canal_venda:    canal_venda || 'presencial',
      criado_em:      new Date().toISOString()
    };

    if (tipo_venda === 'locacao') {
      if (!data_locacao || !data_devolucao_prevista) {
        return res.status(400).json({ erro: "Para locações, informe data de retirada e devolução." });
      }
      payloadVenda.data_locacao               = new Date(data_locacao).toISOString();
      payloadVenda.data_devolucao_prevista     = new Date(data_devolucao_prevista).toISOString();
      payloadVenda.status_locacao             = 'pendente';
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

      if (exigeCliente && !cliente_pk) return res.status(400).json({ erro: "Crediário exige um cliente selecionado." });

      payloadVenda.data_vencimento_crediario = data_vencimento_crediario;
      payloadVenda.status_crediario          = 'pendente';
    }

    // 3. Lê parâmetro de estoque negativo
    const { data: paramEstoque } = await supabase
      .from('parametros')
      .select('valor')
      .eq('chave', 'pdv_permitir_estoque_negativo')
      .or(`filial_pk.eq.${filial_pk || 0},filial_pk.is.null`)
      .order('filial_pk', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const permitirNegativo = paramEstoque ? paramEstoque.valor === 'true' : false;

    // 3b. Agrega demanda por produto (mesmo produto pode ter múltiplas linhas)
    const deducaoMap = {};
    const nomeMap    = {};
    for (const item of itens) {
      if (!item.produto_pk) continue;
      deducaoMap[item.produto_pk] = (deducaoMap[item.produto_pk] || 0) + parseFloat(item.qtd || 0);
      if (!nomeMap[item.produto_pk]) nomeMap[item.produto_pk] = item.descricao || item.nome || String(item.produto_pk);
    }
    const prodPks = Object.keys(deducaoMap).map(Number);

    // 3c. Pré-validação rápida (UX/fail-fast). O guarda REAL é a transação atômica no passo 6.
    const saldoAntes = {};
    if (prodPks.length) {
      const { data: prodsAntes } = await supabase
        .from('produtos').select('pk, descricao, saldo').in('pk', prodPks);
      (prodsAntes || []).forEach(p => {
        saldoAntes[p.pk] = parseFloat(p.saldo || 0);
        if (!nomeMap[p.pk]) nomeMap[p.pk] = p.descricao || String(p.pk);
      });

      if (!permitirNegativo) {
        for (const [pkStr, qtdTotal] of Object.entries(deducaoMap)) {
          const pk = Number(pkStr);
          const saldoAtual = saldoAntes[pk] ?? 0;
          if (saldoAtual < qtdTotal) {
            return res.status(400).json({
              erro: `Estoque insuficiente para "${nomeMap[pk]}". Disponível: ${saldoAtual}, solicitado: ${qtdTotal}.`,
              produto_pk: pk,
            });
          }
        }
      }
    }

    // 4. Inserir a Venda
    const { data: vendaSalva, error: erroVenda } = await supabase
      .from('vendas')
      .insert(payloadVenda)
      .select('pk, numero')
      .single();

    if (erroVenda) throw erroVenda;
    const venda_pk = vendaSalva.pk;

    // 5. Inserir itens
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
    if (erroItens) {
      await supabase.from('vendas').delete().eq('pk', venda_pk);
      throw erroItens;
    }

    // 6. Debita estoque de TODOS os produtos numa ÚNICA transação atômica.
    const ajustesDebito = Object.entries(deducaoMap).map(([pk, qtd]) => ({ pk: Number(pk), delta: -qtd }));
    const r = await ajustarSaldos(ajustesDebito, permitirNegativo);
    if (!r.ok) {
      await supabase.from('itens_venda').delete().eq('venda_pk', venda_pk);
      await supabase.from('vendas').delete().eq('pk', venda_pk);
      if (r.insuficiente) {
        return res.status(400).json({ erro: 'Estoque insuficiente. A venda foi cancelada.' });
      }
      console.error('[Vendas/Finalizar] Falha ao debitar estoque:', r.error?.message);
      return res.status(500).json({ erro: 'Falha ao atualizar o estoque. A venda foi cancelada.' });
    }
    const saldoMap = {};
    (r.resultado || []).forEach(x => { saldoMap[x.pk] = x; });

    // 7. Inserir pagamentos (com compensação se falhar)
    const pagamentosPayload = pagamentos.map(p => ({
      venda_pk,
      forma:  String(p.forma || 'dinheiro'),
      valor:  parseFloat(p.valor  || 0),
    }));

    const { error: erroPag } = await supabase.from('pagamentos_venda').insert(pagamentosPayload);
    if (erroPag) {
      await ajustarSaldos(ajustesDebito.map(a => ({ pk: a.pk, delta: -a.delta })), true);
      await supabase.from('itens_venda').delete().eq('venda_pk', venda_pk);
      await supabase.from('vendas').delete().eq('pk', venda_pk);
      throw erroPag;
    }

    // 8. Auditoria de estoque (saldos reais retornados pela transação)
    const auditoriaRows = Object.entries(deducaoMap).map(([pkStr, qtd]) => {
      const pk = Number(pkStr);
      return {
        filial_pk:    filial_pk || null,
        venda_pk,
        produto_pk:   pk,
        nome:         nomeMap[pk],
        saldo_antes:  saldoMap[pk]?.saldo_antes ?? (saldoAntes[pk] ?? null),
        qtd_debitada: qtd,
        saldo_apos:   saldoMap[pk]?.saldo_apos  ?? ((saldoAntes[pk] ?? 0) - qtd),
        observacao:   'Venda normal',
      };
    });
    if (auditoriaRows.length) {
      const { error: errAudit } = await supabase.from('auditoria_estoque').insert(auditoriaRows);
      if (errAudit) {
        console.error('[Vendas/Finalizar] Erro ao gravar auditoria:', JSON.stringify({ code: errAudit.code, message: errAudit.message, details: errAudit.details, hint: errAudit.hint }));
      } else {
        const detalhe = auditoriaRows
          .map(a => `${a.nome}: ${a.saldo_antes ?? '?'} → ${a.saldo_apos ?? '?'}`)
          .join(' | ');
        console.log(`[Vendas/Finalizar] Auditoria gravada venda #${vendaSalva.numero}: ${detalhe}`);
      }
    }

    // 9. Associar ao caixa
    const { data: caixaAberto } = await supabase
      .from('caixas')
      .select('pk')
      .eq('filial_pk', filial_pk)
      .eq('status', 'aberto')
      .maybeSingle();

    if (caixaAberto) {
      await supabase.from('movimentos_caixa').insert({
        caixa_pk:  caixaAberto.pk,
        venda_pk,
        tipo:      'venda',
        valor:     parseFloat(total),
        descricao: `Venda #${vendaSalva.numero}`,
        criado_em: new Date().toISOString(),
      });
    }

    // 10. Push notification para o cliente (não-bloqueante)
    if (cliente_pk) {
      const { enviarPushCliente } = require('../push');
      const tipoLabel = { venda: 'Nova venda', locacao: 'Nova locação', orcamento: 'Novo orçamento', crediario: 'Novo crediário' }[tipo_venda || 'venda'] || 'Nova venda';
      enviarPushCliente(cliente_pk, {
        title: tipoLabel + ' registrada!',
        body:  `${tipoLabel} #${vendaSalva.numero} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(total))}`,
        url:   '/minha-conta',
        tag:   `venda-${venda_pk}`,
      }).catch(() => {});
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

    const restMap = {};
    for (const item of itens || []) {
      if (!item.produto_pk) continue;
      restMap[item.produto_pk] = (restMap[item.produto_pk] || 0) + parseFloat(item.qtd || 0);
    }
    const ajustesRest = Object.entries(restMap).map(([pk, qtd]) => ({ pk: Number(pk), delta: qtd }));
    const rDev = await ajustarSaldos(ajustesRest, true);
    if (!rDev.ok) {
      console.error('[Vendas/Devolver] Falha ao restaurar estoque:', rDev.error?.message);
      return res.status(500).json({ erro: 'Falha ao restaurar o estoque. A devolução não foi concluída.' });
    }

    const { error: errStatus } = await supabase.from('vendas').update({ status: 'devolvida' }).eq('pk', venda_pk);
    if (errStatus) {
      await ajustarSaldos(ajustesRest.map(a => ({ pk: a.pk, delta: -a.delta })), true);
      throw errStatus;
    }

    const { data: caixaAberto } = await supabase
      .from('caixas')
      .select('pk')
      .eq('filial_pk', venda.filial_pk)
      .eq('status', 'aberto')
      .maybeSingle();

    if (caixaAberto) {
      await supabase.from('movimentos_caixa').insert({
        caixa_pk:  caixaAberto.pk,
        venda_pk,
        tipo:      'devolucao',
        valor:     -parseFloat(venda.total),
        descricao: `ESTORNO: Devolução Venda #${venda.numero}${motivo ? ' (' + motivo + ')' : ''}`,
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
      .select('pk, numero, criado_em, cliente, cliente_pk, operador, vendedor, total, acrescimo, status, tipo_venda, data_locacao, data_devolucao_prevista, data_devolucao_real, status_locacao, taxa_realocacao_cobrada, nfce_chave, nfce_protocolo, nfce_dh_emissao, nfce_ref, nfce_danfe, filial_pk, clientes(nome)', { count: 'exact' })
      .eq('ativo', true);

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

    if (busca && busca.trim() !== '') {
      const b = busca.trim();
      const { data: cliMatch } = await supabase
        .from('clientes')
        .select('pk')
        .ilike('nome', `%${b}%`);
      const cliPks = (cliMatch || []).map(c => c.pk);

      const isNum = !isNaN(b);
      const orParts = [`operador.ilike.%${b}%`, `cliente.ilike.%${b}%`];
      if (isNum) orParts.push(`numero.eq.${b}`);
      if (cliPks.length) orParts.push(`cliente_pk.in.(${cliPks.join(',')})`);
      q = q.or(orParts.join(','));
    }

    q = q.order('criado_em', { ascending: false })
         .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await q;
    if (error) {
      console.error('[Vendas/Listar] Erro Supabase:', error);
      throw error;
    }

    const rows = (data || []).map(v => ({
      ...v,
      cliente_nome: v.clientes?.nome || v.cliente || null,
    }));

    res.json({ data: rows, count: count || 0 });
  } catch (err) {
    console.error('[Vendas/Listar] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;
    const {
      cliente_pk, cliente_codigo, vendedor, vendedor_pk,
      itens, pagamentos, subtotal, desconto_total, total,
      tipo_venda, canal_venda,
      data_locacao, data_devolucao_prevista, data_vencimento_crediario,
    } = req.body;

    if (!Array.isArray(itens) || !Array.isArray(pagamentos) || total === undefined) {
      return res.status(400).json({ erro: 'itens, pagamentos e total são obrigatórios' });
    }

    const { data: venda } = await supabase.from('vendas').select('*').eq('pk', pk).single();
    if (!venda) return res.status(404).json({ erro: 'Venda não encontrada' });

    // 1. Lê itens antigos e parâmetro de estoque
    const { data: itensAtuais } = await supabase.from('itens_venda').select('*').eq('venda_pk', pk);

    const { data: paramEstoque } = await supabase
      .from('parametros')
      .select('valor')
      .eq('chave', 'pdv_permitir_estoque_negativo')
      .or(`filial_pk.eq.${venda.filial_pk || 0},filial_pk.is.null`)
      .order('filial_pk', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const permitirNegativo = paramEstoque ? paramEstoque.valor === 'true' : false;

    // 2. Agrega demanda nova e devolução antiga por produto
    const deducaoMapEdit = {};
    const nomeMapEdit    = {};
    for (const item of itens) {
      if (!item.produto_pk) continue;
      deducaoMapEdit[item.produto_pk] = (deducaoMapEdit[item.produto_pk] || 0) + parseFloat(item.qtd || 0);
      if (!nomeMapEdit[item.produto_pk]) nomeMapEdit[item.produto_pk] = item.descricao || String(item.produto_pk);
    }

    const devolucaoMapEdit = {};
    for (const item of itensAtuais || []) {
      if (!item.produto_pk) continue;
      devolucaoMapEdit[item.produto_pk] = (devolucaoMapEdit[item.produto_pk] || 0) + parseFloat(item.qtd || 0);
    }

    const prodPksEdit = [...new Set([
      ...Object.keys(deducaoMapEdit).map(Number),
      ...Object.keys(devolucaoMapEdit).map(Number),
    ])];

    // 3. Pré-validação rápida (fail-fast/UX). Guarda real é a transação no passo 4.
    if (prodPksEdit.length) {
      const { data: prodsAntes } = await supabase
        .from('produtos').select('pk, descricao, saldo').in('pk', prodPksEdit);
      const saldoAtualMap = {};
      (prodsAntes || []).forEach(p => {
        saldoAtualMap[p.pk] = parseFloat(p.saldo || 0);
        if (!nomeMapEdit[p.pk]) nomeMapEdit[p.pk] = p.descricao || String(p.pk);
      });

      if (!permitirNegativo) {
        for (const [pkStr, qtdNova] of Object.entries(deducaoMapEdit)) {
          const pkNum = Number(pkStr);
          const saldoEfetivo = (saldoAtualMap[pkNum] ?? 0) + (devolucaoMapEdit[pkNum] ?? 0);
          if (saldoEfetivo < qtdNova) {
            return res.status(400).json({
              erro: `Estoque insuficiente para "${nomeMapEdit[pkNum]}". Disponível: ${saldoEfetivo}, solicitado: ${qtdNova}.`,
              produto_pk: pkNum,
            });
          }
        }
      }
    }

    // 4. Ajuste LÍQUIDO de estoque numa ÚNICA transação atômica.
    //    delta = devolução dos itens antigos − nova dedução
    const ajustesEdit = prodPksEdit.map(pkNum => ({
      pk:    pkNum,
      delta: (devolucaoMapEdit[pkNum] ?? 0) - (deducaoMapEdit[pkNum] ?? 0),
    }));
    const rEdit = await ajustarSaldos(ajustesEdit, permitirNegativo);
    if (!rEdit.ok) {
      if (rEdit.insuficiente) {
        return res.status(400).json({ erro: 'Estoque insuficiente para a alteração.' });
      }
      console.error('[Vendas/Editar] Falha ao ajustar estoque:', rEdit.error?.message);
      return res.status(500).json({ erro: 'Falha ao atualizar o estoque. A alteração foi cancelada.' });
    }
    const saldoMapEdit = {};
    (rEdit.resultado || []).forEach(x => { saldoMapEdit[x.pk] = x; });

    const reverterEstoque = () => ajustarSaldos(ajustesEdit.map(a => ({ pk: a.pk, delta: -a.delta })), true);

    // 5. Remove dados antigos e grava novos
    const delItens = await supabase.from('itens_venda').delete().eq('venda_pk', pk);
    if (delItens.error) { await reverterEstoque(); throw delItens.error; }
    const delPag = await supabase.from('pagamentos_venda').delete().eq('venda_pk', pk);
    if (delPag.error) { await reverterEstoque(); throw delPag.error; }

    const payloadVenda = {
      cliente_pk:     cliente_pk     || null,
      cliente_codigo: cliente_codigo || null,
      vendedor:       vendedor       || null,
      vendedor_pk:    vendedor_pk    || null,
      subtotal:       parseFloat(subtotal      || 0),
      desconto_total: parseFloat(desconto_total || 0),
      total:          parseFloat(total),
      tipo_venda:     tipo_venda  || 'venda',
      canal_venda:    canal_venda || 'presencial',
    };

    if (tipo_venda === 'locacao') {
      payloadVenda.data_locacao            = data_locacao ? new Date(data_locacao).toISOString() : null;
      payloadVenda.data_devolucao_prevista = data_devolucao_prevista ? new Date(data_devolucao_prevista).toISOString() : null;
    }

    const temCrediario = pagamentos.some(p => String(p.forma).toLowerCase() === 'crediario');
    if (temCrediario && data_vencimento_crediario) {
      payloadVenda.data_vencimento_crediario = data_vencimento_crediario;
      payloadVenda.status_crediario          = 'pendente';
    }

    const { error: errUpd } = await supabase.from('vendas').update(payloadVenda).eq('pk', pk);
    if (errUpd) { await reverterEstoque(); throw errUpd; }

    const itensPayload = itens.map(item => ({
      venda_pk:     parseInt(pk),
      produto_pk:   item.produto_pk   || null,
      descricao:    item.descricao    || '',
      codigo:       item.codigo       || null,
      qtd:          parseFloat(item.qtd          || 1),
      preco_unit:   parseFloat(item.preco_unit   || 0),
      total_item:   parseFloat(item.total_item   || 0),
      desconto_val: parseFloat(item.desconto_val || 0),
    }));
    const { error: errItens } = await supabase.from('itens_venda').insert(itensPayload);
    if (errItens) { await reverterEstoque(); throw errItens; }

    const pagamentosPayload = pagamentos.map(p => ({
      venda_pk: parseInt(pk),
      forma:    String(p.forma || 'dinheiro'),
      valor:    parseFloat(p.valor || 0),
    }));
    const { error: errPag } = await supabase.from('pagamentos_venda').insert(pagamentosPayload);
    if (errPag) { await reverterEstoque(); throw errPag; }

    // 6. Auditoria com saldos reais (apenas produtos cujo saldo mudou)
    const auditoriaRows = prodPksEdit
      .filter(pkNum => ((devolucaoMapEdit[pkNum] ?? 0) - (deducaoMapEdit[pkNum] ?? 0)) !== 0)
      .map(pkNum => ({
        filial_pk:    venda.filial_pk || null,
        venda_pk:     parseInt(pk),
        produto_pk:   pkNum,
        nome:         nomeMapEdit[pkNum],
        saldo_antes:  saldoMapEdit[pkNum]?.saldo_antes ?? null,
        qtd_debitada: (deducaoMapEdit[pkNum] ?? 0) - (devolucaoMapEdit[pkNum] ?? 0),
        saldo_apos:   saldoMapEdit[pkNum]?.saldo_apos  ?? null,
        observacao:   'Venda alterada',
      }));
    if (auditoriaRows.length) {
      const { error: errAudit } = await supabase.from('auditoria_estoque').insert(auditoriaRows);
      if (errAudit) console.error('[Vendas/Editar] Erro ao gravar auditoria:', errAudit.message);
    }

    res.json({ ok: true, venda_pk: parseInt(pk) });
  } catch (err) {
    console.error('[Vendas/Editar] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao editar venda' });
  }
});

router.delete('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;

    const { data: venda } = await supabase.from('vendas').select('*').eq('pk', pk).single();
    if (!venda) return res.status(404).json({ erro: 'Venda não encontrada' });

    if (venda.status === 'finalizada') {
      const { data: itens } = await supabase.from('itens_venda').select('*').eq('venda_pk', pk);

      if (itens && itens.length) {
        const devolucaoMapDel = {};
        const nomeMapDel      = {};
        for (const item of itens) {
          if (!item.produto_pk) continue;
          devolucaoMapDel[item.produto_pk] = (devolucaoMapDel[item.produto_pk] || 0) + parseFloat(item.qtd || 0);
          if (!nomeMapDel[item.produto_pk]) nomeMapDel[item.produto_pk] = item.descricao || String(item.produto_pk);
        }

        const prodPksDel  = Object.keys(devolucaoMapDel).map(Number);
        const ajustesDel  = prodPksDel.map(pkNum => ({ pk: pkNum, delta: devolucaoMapDel[pkNum] }));
        const rDel        = await ajustarSaldos(ajustesDel, true);
        if (!rDel.ok) {
          console.error('[Vendas/Excluir] Falha ao restaurar estoque:', rDel.error?.message);
          return res.status(500).json({ erro: 'Falha ao restaurar o estoque. A exclusão não foi concluída.' });
        }
        const saldoMapDel = {};
        (rDel.resultado || []).forEach(x => { saldoMapDel[x.pk] = x; });

        const auditoriaRows = prodPksDel.map(pkNum => ({
          filial_pk:    venda.filial_pk || null,
          venda_pk:     parseInt(pk),
          produto_pk:   pkNum,
          nome:         nomeMapDel[pkNum],
          saldo_antes:  saldoMapDel[pkNum]?.saldo_antes ?? null,
          qtd_debitada: -devolucaoMapDel[pkNum],
          saldo_apos:   saldoMapDel[pkNum]?.saldo_apos  ?? null,
          observacao:   'Venda cancelada',
        }));
        const { error: errAudit } = await supabase.from('auditoria_estoque').insert(auditoriaRows);
        if (errAudit) console.error('[Vendas/Excluir] Erro ao gravar auditoria:', errAudit.message);
      }
    }

    await supabase.from('movimentos_caixa').delete().eq('venda_pk', pk);
    await supabase.from('agenda').delete().eq('venda_pk', pk);

    const { error: errDel } = await supabase.from('vendas').update({ ativo: false }).eq('pk', pk);
    if (errDel) throw errDel;

    res.json({ ok: true });
  } catch (err) {
    console.error('[Vendas/Excluir] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

router.patch('/:pk/locacao', async (req, res) => {
  const { pk } = req.params;
  const { acao, taxa_cobrada_valor } = req.body;

  if (!['devolvida', 'taxa_cobrada'].includes(acao)) {
    return res.status(400).json({ erro: 'Ação inválida. Use devolvida ou taxa_cobrada.' });
  }

  try {
    const { data: venda, error: errBusca } = await supabase
      .from('vendas').select('pk, tipo_venda, status_locacao').eq('pk', pk).single();
    if (errBusca || !venda) return res.status(404).json({ erro: 'Venda não encontrada.' });
    if (venda.tipo_venda !== 'locacao') return res.status(400).json({ erro: 'Venda não é uma locação.' });

    const update = { status_locacao: acao };
    if (acao === 'devolvida') update.data_devolucao_real = new Date().toISOString();
    if (acao === 'taxa_cobrada' && taxa_cobrada_valor !== undefined) {
      update.taxa_realocacao_cobrada = parseFloat(taxa_cobrada_valor) || 0;
    }

    const { error } = await supabase.from('vendas').update(update).eq('pk', pk);
    if (error) throw error;

    return res.json({ ok: true, status_locacao: acao });
  } catch (e) {
    console.error('[Vendas/locacao]', e.message);
    return res.status(500).json({ erro: e.message });
  }
});

router.get('/:pk/editar-dados', async (req, res) => {
  const venda_pk = parseInt(req.params.pk);
  const { filial_pk } = req.query;
  try {
    const { data: venda, error: ve } = await supabase
      .from('vendas').select('*').eq('pk', venda_pk).single();
    if (ve || !venda) return res.status(404).json({ erro: 'Venda não encontrada' });

    const [{ data: itens }, { data: pagamentos }, { data: categorias }] = await Promise.all([
      supabase.from('itens_venda').select('*').eq('venda_pk', venda_pk),
      supabase.from('pagamentos_venda').select('*').eq('venda_pk', venda_pk),
      supabase.from('categorias').select('pk, nome, desconto_somente_decorador').eq('filial_pk', filial_pk),
    ]);

    let cliente_nome      = venda.cliente        || '';
    let cliente_codigo    = venda.cliente_codigo || null;
    let cliente_decorador = false;
    if (venda.cliente_pk) {
      const { data: cli } = await supabase
        .from('clientes').select('nome, codigo, decorador').eq('pk', venda.cliente_pk).single();
      if (cli) {
        cliente_nome      = cli.nome      || venda.cliente        || '';
        cliente_codigo    = cli.codigo    || venda.cliente_codigo || null;
        cliente_decorador = cli.decorador || false;
      }
    }

    const pksItens = [...new Set((itens || []).filter(i => i.produto_pk).map(i => i.produto_pk))];
    const prodCatMap = {};
    if (pksItens.length) {
      const { data: prods } = await supabase
        .from('produtos').select('pk, categoria_pk').in('pk', pksItens);
      (prods || []).forEach(p => { prodCatMap[p.pk] = p.categoria_pk; });
    }

    res.json({
      ok: true,
      venda,
      itens:            (itens || []).map(i => ({ ...i, categoria_pk: prodCatMap[i.produto_pk] || null })),
      pagamentos:       pagamentos || [],
      cliente_nome,
      cliente_codigo,
      cliente_decorador,
      categorias:       categorias || [],
    });
  } catch (e) {
    console.error('[Vendas/editar-dados]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

router.get('/formas', async (req, res) => {
  const { filial_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const { data, error } = await supabase
      .from('formas_pagamento')
      .select('forma, label')
      .eq('filial_pk', parseInt(filial_pk))
      .eq('ativo', true)
      .order('ordem');
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (e) {
    console.error('[Vendas/formas]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

router.get('/:pk/detalhe', async (req, res) => {
  const venda_pk = parseInt(req.params.pk);
  try {
    const [{ data: venda, error: ve }, { data: itens }, { data: pagamentos }] = await Promise.all([
      supabase.from('vendas')
        .select('pk, numero, criado_em, cliente, cliente_pk, operador, vendedor, subtotal, desconto_total, acrescimo, total, status, tipo_venda, data_locacao, data_devolucao_prevista, data_devolucao_real, status_locacao, taxa_realocacao_cobrada, nfce_chave, nfce_protocolo, nfce_ref, nfce_danfe, clientes(nome)')
        .eq('pk', venda_pk)
        .single(),
      supabase.from('itens_venda').select('*').eq('venda_pk', venda_pk).order('pk'),
      supabase.from('pagamentos_venda').select('*').eq('venda_pk', venda_pk).order('pk'),
    ]);
    if (ve || !venda) return res.status(404).json({ erro: 'Venda não encontrada' });
    const row = { ...venda, cliente_nome: venda.clientes?.nome || venda.cliente || null };
    res.json({ ok: true, venda: row, itens: itens || [], pagamentos: pagamentos || [] });
  } catch (e) {
    console.error('[Vendas/detalhe]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

router.get('/:pk', async (req, res) => {
  const venda_pk = parseInt(req.params.pk);
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('pk, numero, criado_em, cliente, cliente_pk, operador, vendedor, total, acrescimo, status, tipo_venda, data_locacao, data_devolucao_prevista, data_devolucao_real, status_locacao, taxa_realocacao_cobrada, nfce_chave, nfce_protocolo, nfce_ref, nfce_danfe, clientes(nome)')
      .eq('pk', venda_pk)
      .eq('ativo', true)
      .single();
    if (error || !data) return res.status(404).json({ erro: 'Venda não encontrada' });
    const row = { ...data, cliente_nome: data.clientes?.nome || data.cliente || null };
    res.json({ ok: true, data: row });
  } catch (e) {
    console.error('[Vendas/buscarPk]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
