const express  = require('express');
const supabase = require('../supabase');

const router = express.Router();

// GET /api/contas-receber?filial_pk=X&status=pendente&busca=X
router.get('/', async (req, res) => {
  try {
    const { filial_pk, status, busca } = req.query;

    let q = supabase
      .from('vendas')
      .select(`
        pk, numero, criado_em, cliente, cliente_pk, vendedor, total,
        status_crediario, data_vencimento_crediario, forma_recebimento,
        clientes(nome),
        pagamentos_venda(forma, valor)
      `)
      .eq('ativo', true)
      .not('data_vencimento_crediario', 'is', null)
      .order('data_vencimento_crediario', { ascending: true });

    if (filial_pk) q = q.eq('filial_pk', parseInt(filial_pk));
    if (status && status !== '') q = q.eq('status_crediario', status);

    const { data, error } = await q;
    if (error) throw error;

    const hoje = new Date().toISOString().slice(0, 10);

    let rows = (data || []).map(v => {
      const nomeCliente = v.clientes?.nome || v.cliente || null;

      const pags = v.pagamentos_venda || [];
      const somaCrediario = pags
        .filter(p => String(p.forma).toLowerCase() === 'crediario')
        .reduce((s, p) => s + parseFloat(p.valor || 0), 0);
      const valorCrediario = somaCrediario > 0 ? somaCrediario : parseFloat(v.total || 0);

      let statusCalc = v.status_crediario === 'recebido'
        ? 'recebido'
        : (v.data_vencimento_crediario && v.data_vencimento_crediario < hoje ? 'vencido' : 'pendente');

      return {
        pk:                       v.pk,
        numero:                   v.numero,
        criado_em:                v.criado_em,
        cliente_nome:             nomeCliente,
        vendedor:                 v.vendedor,
        total:                    v.total,
        valor_crediario:          valorCrediario,
        status_crediario:         v.status_crediario,
        status_calc:              statusCalc,
        data_vencimento_crediario: v.data_vencimento_crediario,
        forma_recebimento:        v.forma_recebimento,
      };
    });

    if (busca && busca.trim()) {
      const q2 = busca.trim().toLowerCase();
      rows = rows.filter(v =>
        (v.cliente_nome || '').toLowerCase().includes(q2) ||
        String(v.numero).includes(q2)
      );
    }

    const totalPendente = rows.filter(v => v.status_calc === 'pendente').reduce((s, v) => s + v.valor_crediario, 0);
    const totalVencido  = rows.filter(v => v.status_calc === 'vencido' ).reduce((s, v) => s + v.valor_crediario, 0);
    const totalRecebido = rows.filter(v => v.status_calc === 'recebido').reduce((s, v) => s + v.valor_crediario, 0);

    res.json({ ok: true, data: rows, totalPendente, totalVencido, totalRecebido });
  } catch (err) {
    console.error('[ContasReceber/Listar] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/contas-receber/:pk/receber
router.patch('/:pk/receber', async (req, res) => {
  try {
    const { pk } = req.params;
    const { forma_recebimento } = req.body;
    if (!forma_recebimento) return res.status(400).json({ erro: 'Informe a forma de recebimento.' });

    const { error } = await supabase
      .from('vendas')
      .update({ status_crediario: 'recebido', forma_recebimento })
      .eq('pk', pk);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[ContasReceber/Receber] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/contas-receber/:pk/desfazer
router.patch('/:pk/desfazer', async (req, res) => {
  try {
    const { pk } = req.params;

    const { error } = await supabase
      .from('vendas')
      .update({ status_crediario: 'pendente', forma_recebimento: null })
      .eq('pk', pk);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[ContasReceber/Desfazer] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
