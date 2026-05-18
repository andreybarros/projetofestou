const express  = require('express');
const supabase = require('../supabase');
const router   = express.Router();

const COR_TIPOS = {
  manual:            '#60a5fa',
  montagem:          '#c084fc',
  entrega:           '#fb923c',
  outro:             '#94a3b8',
  locacao_retirada:  '#4ade80',
  locacao_devolucao: '#f59e0b',
  projeto:           '#a855f7',
};

// ── 1. Listar eventos do mês (agenda + locações) ──────────────────────────────
router.get('/eventos', async (req, res) => {
  const { filial_pk, ano, mes } = req.query;
  if (!filial_pk || !ano || !mes) return res.status(400).json({ erro: 'filial_pk, ano e mes obrigatórios' });
  try {
    const mm  = String(mes).padStart(2, '0');
    const ini = `${ano}-${mm}-01`;
    const fim = new Date(parseInt(ano), parseInt(mes), 0).toISOString().slice(0, 10);

    const [resAgenda, resLocacoes] = await Promise.all([
      supabase
        .from('agenda')
        .select('*, vendas(pk, numero, cliente)')
        .eq('filial_pk', parseInt(filial_pk))
        .gte('data_evento', ini)
        .lte('data_evento', fim)
        .order('hora_inicio', { nullsFirst: true }),

      supabase
        .from('vendas')
        .select('pk, numero, cliente, data_locacao, data_devolucao_prevista, status_locacao, observacao')
        .eq('filial_pk', parseInt(filial_pk))
        .eq('ativo', true)
        .eq('tipo_venda', 'locacao')
        .or(`data_locacao.gte.${ini}T00:00:00,data_devolucao_prevista.gte.${ini}T00:00:00`)
        .lte('data_locacao', fim + 'T23:59:59'),
    ]);

    const evs = [];

    for (const ev of resAgenda.data || []) {
      evs.push({
        id:         'ag-' + ev.pk,
        pk:         ev.pk,
        source:     'agenda',
        titulo:     ev.titulo,
        tipo:       ev.tipo || 'manual',
        date:       ev.data_evento || ev.data_inicio,
        hora:       ev.hora_inicio ? ev.hora_inicio.slice(0, 5) : null,
        descricao:  ev.descricao,
        cor:        ev.cor || COR_TIPOS[ev.tipo] || COR_TIPOS.manual,
        venda_pk:   ev.venda_pk,
        venda_info: ev.vendas || null,
        projeto_pk: ev.projeto_pk || null,
        observacao: null,
      });
    }

    for (const loc of resLocacoes.data || []) {
      if (loc.data_locacao) {
        const d = loc.data_locacao.slice(0, 10);
        if (d >= ini && d <= fim) {
          evs.push({
            id:             'ret-' + loc.pk,
            source:         'locacao',
            titulo:         `Retirada #${loc.numero}${loc.cliente ? ' · ' + loc.cliente : ''}`,
            tipo:           'locacao_retirada',
            date:           d,
            hora:           loc.data_locacao.slice(11, 16) !== '00:00' ? loc.data_locacao.slice(11, 16) : null,
            descricao:      loc.observacao || (loc.status_locacao === 'devolvida' ? 'Já devolvida' : null),
            observacao:     loc.observacao || '',
            status_locacao: loc.status_locacao,
            cor:            COR_TIPOS.locacao_retirada,
            venda_pk:       loc.pk,
            venda_info:     { numero: loc.numero, cliente: loc.cliente },
            pk:             null,
          });
        }
      }
      if (loc.data_devolucao_prevista) {
        const d = loc.data_devolucao_prevista.slice(0, 10);
        if (d >= ini && d <= fim) {
          evs.push({
            id:             'dev-' + loc.pk,
            source:         'locacao',
            titulo:         `Devolução #${loc.numero}${loc.cliente ? ' · ' + loc.cliente : ''}`,
            tipo:           'locacao_devolucao',
            date:           d,
            hora:           null,
            descricao:      loc.observacao || (loc.status_locacao === 'devolvida' ? 'Devolvida' : 'Pendente'),
            observacao:     loc.observacao || '',
            status_locacao: loc.status_locacao,
            cor:            COR_TIPOS.locacao_devolucao,
            venda_pk:       loc.pk,
            venda_info:     { numero: loc.numero, cliente: loc.cliente },
            pk:             null,
          });
        }
      }
    }

    res.json({ ok: true, data: evs });
  } catch (e) {
    console.error('[Agenda/eventos]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 2. Criar evento ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { filial_pk, titulo, tipo, data_evento, hora_inicio, descricao, venda_pk } = req.body;
  if (!filial_pk || !titulo || !data_evento)
    return res.status(400).json({ erro: 'filial_pk, titulo e data_evento obrigatórios' });
  try {
    const t = tipo || 'manual';
    const { error } = await supabase.from('agenda').insert({
      filial_pk:   parseInt(filial_pk),
      titulo,
      tipo:        t,
      data_evento,
      data_inicio: data_evento,
      hora_inicio: hora_inicio || null,
      descricao:   descricao   || null,
      venda_pk:    venda_pk    || null,
      cor:         COR_TIPOS[t] || COR_TIPOS.manual,
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Agenda/criar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 3. Editar evento ──────────────────────────────────────────────────────────
router.put('/:pk', async (req, res) => {
  const { pk } = req.params;
  const { filial_pk, titulo, tipo, data_evento, hora_inicio, descricao, venda_pk } = req.body;
  if (!filial_pk || !titulo || !data_evento)
    return res.status(400).json({ erro: 'filial_pk, titulo e data_evento obrigatórios' });
  try {
    const t = tipo || 'manual';
    const { error } = await supabase.from('agenda').update({
      filial_pk:   parseInt(filial_pk),
      titulo,
      tipo:        t,
      data_evento,
      data_inicio: data_evento,
      hora_inicio: hora_inicio || null,
      descricao:   descricao   || null,
      venda_pk:    venda_pk    || null,
      cor:         COR_TIPOS[t] || COR_TIPOS.manual,
    }).eq('pk', parseInt(pk));
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Agenda/editar]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 4. Excluir evento ─────────────────────────────────────────────────────────
router.delete('/:pk', async (req, res) => {
  const { pk } = req.params;
  try {
    const { error } = await supabase.from('agenda').delete().eq('pk', parseInt(pk));
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Agenda/excluir]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 5. Buscar vendas (autocomplete) ──────────────────────────────────────────
router.get('/buscar-vendas', async (req, res) => {
  const { filial_pk, q } = req.query;
  if (!filial_pk || !q) return res.json({ ok: true, data: [] });
  try {
    let query = supabase
      .from('vendas')
      .select('pk, numero, cliente, tipo_venda, criado_em')
      .eq('filial_pk', parseInt(filial_pk))
      .eq('ativo', true)
      .order('numero', { ascending: false })
      .limit(8);

    const numQ = parseInt(q);
    if (!isNaN(numQ)) {
      query = query.eq('numero', numQ);
    } else {
      query = query.ilike('cliente', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (e) {
    console.error('[Agenda/buscarVendas]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 6. Detalhe de uma venda (para modal) ─────────────────────────────────────
router.get('/venda-detalhe/:pk', async (req, res) => {
  const { pk } = req.params;
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('pk, numero, cliente, total, tipo_venda, criado_em, itens_venda(pk, descricao, qtd, preco_unit, total_item)')
      .eq('pk', parseInt(pk))
      .single();
    if (error) throw error;
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[Agenda/vendaDetalhe]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 7. Atualizar observação de locação ────────────────────────────────────────
router.patch('/obs-locacao/:venda_pk', async (req, res) => {
  const { venda_pk } = req.params;
  const { observacao } = req.body;
  try {
    const { error } = await supabase
      .from('vendas')
      .update({ observacao: observacao || null })
      .eq('pk', parseInt(venda_pk));
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('[Agenda/obsLocacao]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
