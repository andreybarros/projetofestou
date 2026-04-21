const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.post('/abrir', async (req, res) => {
  try {
    const { filial_pk, valor_abertura, operador, vendedor_pk, detalhe_saldos } = req.body;
    const operador_pk = req.operador?.pk;

    if (!filial_pk || valor_abertura === undefined || !vendedor_pk || !operador_pk) {
      return res.status(400).json({ erro: 'filial_pk, valor_abertura, vendedor_pk e permissões são obrigatórios' });
    }

    // 1. Verifica se já existe caixa aberto
    const { data: caixaAberto } = await supabase
      .from('caixas')
      .select('*')
      .eq('filial_pk', filial_pk)
      .eq('status', 'aberto')
      .maybeSingle();

    if (caixaAberto) {
      return res.status(400).json({ erro: 'Já existe um caixa aberto para esta filial.' });
    }

    // 2. Cria o registro do caixa
    const { data: novoCaixa, error: errC } = await supabase
      .from('caixas')
      .insert([{
        filial_pk,
        operador_pk,
        vendedor_pk,
        nome_operador: operador,
        valor_abertura: parseFloat(valor_abertura),
        status: 'aberto',
        dt_abertura: new Date().toISOString()
      }])
      .select()
      .single();

    if (errC) throw errC;

    // 3. Insere detalhes de saldos por conta (se houver)
    if (detalhe_saldos) {
      const saldosPayload = Object.entries(detalhe_saldos).map(([conta_pk, valor]) => ({
        caixa_pk: novoCaixa.pk,
        conta_pk,
        valor_abertura: parseFloat(valor || 0)
      }));
      if (saldosPayload.length > 0) {
        await supabase.from('caixa_saldos').insert(saldosPayload);
      }
    }

    res.status(201).json({ ok: true, caixa: novoCaixa });
  } catch (err) {
    console.error('[Caixa/Abrir] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao abrir caixa' });
  }
});

router.post('/fechar', async (req, res) => {
  try {
    const { caixa_pk, valor_contado, detalhe_saldos } = req.body;

    if (!caixa_pk) return res.status(400).json({ erro: 'caixa_pk obrigatório' });

    // 1. Busca o caixa
    const { data: caixa, error: errC } = await supabase
      .from('caixas').select('*').eq('pk', caixa_pk).single();

    if (errC || !caixa) return res.status(404).json({ erro: 'Caixa não encontrado' });
    if (caixa.status === 'fechado') return res.status(400).json({ erro: 'Caixa já encerrado' });

    // 2. Atualiza saldos detalhados de fechamento
    if (detalhe_saldos) {
      for (const [conta_pk, valor] of Object.entries(detalhe_saldos)) {
        await supabase
          .from('caixa_saldos')
          .update({ valor_fechamento: parseFloat(valor || 0) })
          .eq('caixa_pk', caixa_pk)
          .eq('conta_pk', conta_pk);
      }
    }

    // 3. Fecha o caixa principal
    const { data: fechado, error: errF } = await supabase
      .from('caixas')
      .update({
        status: 'fechado',
        dt_fechamento: new Date().toISOString(),
        valor_fechado: parseFloat(valor_contado || 0)
      })
      .eq('pk', caixa_pk)
      .select()
      .single();

    if (errF) throw errF;

    res.status(200).json({ ok: true, caixa: fechado });
  } catch (err) {
    console.error('[Caixa/Fechar] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao fechar caixa' });
  }
});

router.post('/sangria', async (req, res) => {
  try {
    const { caixa_pk, valor, observacoes } = req.body;

    if (!caixa_pk || !valor) {
      return res.status(400).json({ erro: 'caixa_pk e valor obrigatórios' });
    }

    const { data: caixa, error: erroCaixa } = await supabase
      .from('caixas')
      .select('*')
      .eq('pk', caixa_pk)
      .single();

    if (erroCaixa || !caixa) {
      return res.status(404).json({ erro: 'Caixa não encontrado' });
    }

    if (caixa.status === 'fechado') {
      return res.status(400).json({ erro: 'Caixa já foi fechado' });
    }

    const { data: sangrias, error: erroSangrias } = await supabase
      .from('caixa_sangrias')
      .select('valor')
      .eq('caixa_pk', caixa_pk);

    const totalSangrias = sangrias?.reduce((sum, s) => sum + parseFloat(s.valor || 0), 0) || 0;
    const saldoDisponivel = parseFloat(caixa.valor_abertura || 0) - totalSangrias;

    if (parseFloat(valor) > saldoDisponivel) {
      return res.status(400).json({
        erro: 'Valor de sangria ultrapassa saldo disponível',
        saldoDisponivel,
        solicitado: parseFloat(valor)
      });
    }

    const { data: sangria, error: erroInsercao } = await supabase
      .from('caixa_sangrias')
      .insert([{
        caixa_pk,
        valor: parseFloat(valor),
        observacoes,
        dt_criacao: new Date().toISOString()
      }])
      .select()
      .single();

    if (erroInsercao) throw erroInsercao;

    await supabase.from('movimentos_caixa').insert([{
      caixa_pk,
      tipo: 'sangria',
      valor: parseFloat(valor),
      descricao: observacoes || null,
      dt_criacao: new Date().toISOString()
    }]);

    res.status(201).json({
      ok: true,
      sangria,
      saldoDisponivel: (saldoDisponivel - parseFloat(valor)).toFixed(2)
    });
  } catch (err) {
    console.error('[Caixa/Sangria] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao registrar sangria' });
  }
});

router.post('/reforco', async (req, res) => {
  try {
    const { caixa_pk, valor, observacoes } = req.body;

    if (!caixa_pk || !valor) {
      return res.status(400).json({ erro: 'caixa_pk e valor obrigatórios' });
    }

    const { data: caixa, error: erroCaixa } = await supabase
      .from('caixas')
      .select('*')
      .eq('pk', caixa_pk)
      .single();

    if (erroCaixa || !caixa) {
      return res.status(404).json({ erro: 'Caixa não encontrado' });
    }

    if (caixa.status === 'fechado') {
      return res.status(400).json({ erro: 'Caixa já foi fechado' });
    }

    const { data: reforco, error: erroInsercao } = await supabase
      .from('caixa_reforcos')
      .insert([{
        caixa_pk,
        valor: parseFloat(valor),
        observacoes,
        dt_criacao: new Date().toISOString()
      }])
      .select()
      .single();

    if (erroInsercao) throw erroInsercao;

    await supabase.from('movimentos_caixa').insert([{
      caixa_pk,
      tipo: 'reforco',
      valor: parseFloat(valor),
      descricao: observacoes || null,
      dt_criacao: new Date().toISOString()
    }]);

    res.status(201).json({
      ok: true,
      reforco
    });
  } catch (err) {
    console.error('[Caixa/Reforço] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao registrar reforço' });
  }
});

router.get('/status/:filial_pk', async (req, res) => {
  try {
    const { filial_pk } = req.params;

    const { data: caixa, error } = await supabase
      .from('caixas')
      .select('*')
      .eq('filial_pk', filial_pk)
      .eq('status', 'aberto')
      .order('dt_abertura', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!caixa) {
      return res.status(200).json({
        aberto: false,
        caixa: null
      });
    }

    // Busca movimentos do caixa
    const { data: movimentos } = await supabase
      .from('movimentos_caixa')
      .select('tipo, valor, descricao, dt_criacao')
      .eq('caixa_pk', caixa.pk)
      .order('dt_criacao', { ascending: false });

    return res.status(200).json({
      aberto: true,
      caixa,
      movimentos: movimentos || [],
    });
  } catch (err) {
    console.error('[Caixa/Status] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao buscar status do caixa' });
  }
});

module.exports = router;
