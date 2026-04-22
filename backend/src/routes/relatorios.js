const express = require('express');
const supabase = require('../supabase');
const router = express.Router();

router.get('/vendas/:filial_pk', async (req, res) => {
  try {
    const filial_pk = parseInt(req.params.filial_pk, 10);
    if (!filial_pk) {
      return res.status(400).json({ erro: 'ID da filial inválido.' });
    }
    const { inicio, fim } = req.query;
    const now = new Date();
    
    // Datas de filtro
    const dataFim = fim ? new Date(fim + 'T23:59:59') : new Date();
    const dataInicio = inicio ? new Date(inicio + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);

    const inicioISO = dataInicio.toISOString();
    const fimISO = dataFim.toISOString();
    
    // Para cálculos de hoje/semana (mantemos fixos ou baseamos no fim?)
    // Vamos manter fixos à data real de hoje para os cards, mas as listas respeitam o filtro
    const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const inicioSemana = new Date(now);
    inicioSemana.setDate(now.getDate() - 7);
    const inicioSemanaISO = inicioSemana.toISOString();

    // 1. Vendas no período
    const { data: vendasPeriodo, error: errV } = await supabase
      .from('vendas')
      .select('pk, total, criado_em, cliente, vendedor, vendedor_pk')
      .eq('filial_pk', filial_pk)
      .eq('status', 'finalizada')
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO);
    
    if (errV) throw errV;

    // 1.1 Vendas Período Anterior (Para Comparação)
    const duracaoMs = dataFim.getTime() - dataInicio.getTime();
    const inicioAnteriorISO = new Date(dataInicio.getTime() - duracaoMs).toISOString();
    const fimAnteriorISO    = new Date(dataInicio.getTime() - 1).toISOString();

    const { data: vendasAnterior } = await supabase
      .from('vendas')
      .select('total')
      .eq('filial_pk', filial_pk)
      .eq('status', 'finalizada')
      .gte('criado_em', inicioAnteriorISO)
      .lte('criado_em', fimAnteriorISO);
    
    const fatAnterior = (vendasAnterior || []).reduce((sum, v) => sum + parseFloat(v.total || 0), 0);

    let fatDia = 0, fatSemana = 0, fatMes = 0;
    const vendasPorDia = {};
    const clientesMap = {};
    const vendedoresMap = {};
    const sazonalidadeHora = Array(24).fill(0);

    vendasPeriodo.forEach(v => {
      const valor = parseFloat(v.total || 0);
      const dataV = v.criado_em.split('T')[0];
      const hora = new Date(v.criado_em).getHours();
      
      fatMes += valor;
      if (v.criado_em >= hoje) fatDia += valor;
      if (v.criado_em >= inicioSemanaISO) fatSemana += valor;

      // Sazonalidade (Por Quantidade de Vendas)
      sazonalidadeHora[hora] += 1;

      // Agrupamento por dia
      vendasPorDia[dataV] = (vendasPorDia[dataV] || 0) + valor;

      // Agrupamento por cliente
      if (v.cliente) {
        const id = v.cliente;
        if (!clientesMap[id]) clientesMap[id] = { nome: v.cliente, total: 0 };
        clientesMap[id].total += valor;
      }

      // Agrupamento por vendedor
      const nomeVend = v.vendedor || 'Sem Vendedor';
      if (!vendedoresMap[nomeVend]) vendedoresMap[nomeVend] = { nome: nomeVend, total: 0, qtd: 0 };
      vendedoresMap[nomeVend].total += valor;
      vendedoresMap[nomeVend].qtd += 1;
    });

    // 2. Lucro no Período
    const vendaPks = vendasPeriodo.map(v => v.pk);
    let custoTotalMes = 0;
    if (vendaPks.length > 0) {
      const { data: itens, error: errItens } = await supabase
        .from('itens_venda')
        .select('qtd, produto_pk')
        .in('venda_pk', vendaPks);
      
      if (!errItens && itens && itens.length > 0) {
        const prodPks = [...new Set(itens.map(i => i.produto_pk).filter(Boolean))];
        const { data: prods } = await supabase.from('produtos').select('pk, preco_custo').in('pk', prodPks);
        
        const custosMap = {};
        prods?.forEach(p => custosMap[p.pk] = parseFloat(p.preco_custo || 0));

        itens.forEach(i => {
          const custoProd = custosMap[i.produto_pk] || 0;
          custoTotalMes += (custoProd * parseFloat(i.qtd || 0));
        });
      }
    }

    const inicioStr = inicioISO.split('T')[0];
    const fimStr = fimISO.split('T')[0];
    
    // 2.2 Despesas no Período
    const { data: despesas, error: errD } = await supabase
      .from('despesas')
      .select('valor, descricao, vencimento')
      .eq('filial_pk', filial_pk)
      .gte('vencimento', inicioStr)
      .lte('vencimento', fimStr);

    if (errD) throw errD;
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor || 0), 0);

    const lucroMes = fatMes - custoTotalMes - totalDespesas;
    const margemLucro = fatMes > 0 ? (lucroMes / fatMes) * 100 : 0;

    // 3. Rankings e Listas
    const melhoresClientes = Object.values(clientesMap).sort((a, b) => b.total - a.total).slice(0, 5);
    const maioresDespesas = [...despesas].sort((a, b) => b.valor - a.valor).slice(0, 5);
    const vendasPorVendedor = Object.values(vendedoresMap).sort((a, b) => b.total - a.total);

    // 4. Produtos Mais Vendidos
    let produtosMaisVendidos = [];
    if (vendaPks.length > 0) {
       const { data: itensVendidos } = await supabase.from('itens_venda').select('descricao, qtd, total_item').in('venda_pk', vendaPks);
       if (itensVendidos) {
         const pMap = {};
         itensVendidos.forEach(it => {
            if (!pMap[it.descricao]) pMap[it.descricao] = { nome: it.descricao, qtd: 0, total: 0 };
            pMap[it.descricao].qtd += parseFloat(it.qtd || 0);
            pMap[it.descricao].total += parseFloat(it.total_item || 0);
         });
         produtosMaisVendidos = Object.values(pMap).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
       }
    }

    // 5. Produtos para Reposição (Saldo <= 5)
    const { data: produtosRepor } = await supabase
      .from('produtos')
      .select('descricao, saldo, codigo')
      .eq('filial_pk', filial_pk)
      .lte('saldo', 5)
      .order('saldo', { ascending: true })
      .limit(10);

    // 6. Datas Comemorativas
    const datasComemorativas = [
      { data: '2026-05-10', nome: 'Dia das Mães' },
      { data: '2026-06-12', nome: 'Dia dos Namorados' },
      { data: '2026-08-09', nome: 'Dia dos Pais' },
      { data: '2026-10-12', nome: 'Dia das Crianças' },
      { data: '2026-11-27', nome: 'Black Friday' },
      { data: '2025-12-25', nome: 'Natal' }
    ].filter(d => new Date(d.data) >= new Date()).sort((a, b) => new Date(a.data) - new Date(b.data)).slice(0, 3);

    // 7. Gráfico de Vendas por Dia
    const diasGrafico = [];
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let dLoop = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
    let fLoop = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate());
    for (let d = new Date(dLoop); d <= fLoop; d.setDate(d.getDate() + 1)) {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      diasGrafico.push({ data: dStr, diaSemana: diasSemana[d.getDay()], total: vendasPorDia[dStr] || 0 });
    }

    res.json({
      fatDia, fatSemana, fatMes, fatAnterior,
      totalVendas: vendasPeriodo.length,
      totalVendasAnterior: (vendasAnterior || []).length,
      totalDespesas, lucroMes, margemLucro,
      melhoresClientes, maioresDespesas, produtosMaisVendidos,
      vendasPorVendedor, produtosRepor: produtosRepor || [],
      datasComemorativas, vendasPorDia: diasGrafico,
      sazonalidadeHora
    });

  } catch (err) {
    console.error('[Relatorios/Vendas] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
