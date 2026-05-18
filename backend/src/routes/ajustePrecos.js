const express  = require('express');
const supabase = require('../supabase');
const router   = express.Router();

function calcularNovoPreco(atual, metodo, ajuste) {
  const v = parseFloat(atual || 0);
  const a = parseFloat(ajuste || 0);
  if (metodo === 'percentual_aumento') return parseFloat((v * (1 + a / 100)).toFixed(2));
  if (metodo === 'percentual_desconto') return parseFloat((v * (1 - a / 100)).toFixed(2));
  if (metodo === 'valor_fixo') return parseFloat(a.toFixed(2));
  return v;
}

// ── 1. Listar produtos com categoria ─────────────────────────────────────────
router.get('/produtos', async (req, res) => {
  const { filial_pk } = req.query;
  if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });
  try {
    const [{ data: cats }, { data: prods, error }] = await Promise.all([
      supabase.from('categorias').select('pk, nome').eq('filial_pk', parseInt(filial_pk)).order('nome'),
      supabase
        .from('produtos')
        .select('pk, codigo, descricao, valor_venda, preco_custo, categoria_pk, preco_promo, promo_inicio, promo_fim')
        .eq('filial_pk', parseInt(filial_pk))
        .eq('ativo', true)
        .order('descricao'),
    ]);
    if (error) throw error;

    const catMap = {};
    (cats || []).forEach(c => { catMap[c.pk] = c.nome; });

    const agora = new Date();
    const lista = (prods || []).map(p => {
      const emPromo =
        p.preco_promo > 0 &&
        p.promo_inicio && p.promo_fim &&
        agora >= new Date(p.promo_inicio) && agora <= new Date(p.promo_fim);
      return { ...p, categoria_nome: catMap[p.categoria_pk] || '', em_promo: emPromo };
    });

    res.json({ ok: true, produtos: lista, categorias: cats || [] });
  } catch (e) {
    console.error('[AjustePrecos/produtos]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 2. Reajuste permanente de preços ─────────────────────────────────────────
router.post('/reajuste', async (req, res) => {
  const { pks, tipoAlvo, metodo, valorAjuste } = req.body;
  if (!pks?.length || !tipoAlvo || !metodo || valorAjuste === undefined)
    return res.status(400).json({ erro: 'pks, tipoAlvo, metodo e valorAjuste obrigatórios' });
  try {
    const { data: prods, error: erGet } = await supabase
      .from('produtos')
      .select('pk, valor_venda, preco_custo')
      .in('pk', pks);
    if (erGet) throw erGet;

    const updates = (prods || []).map(p => {
      const payload = {};
      if (tipoAlvo === 'venda' || tipoAlvo === 'ambos')
        payload.valor_venda = calcularNovoPreco(p.valor_venda, metodo, valorAjuste);
      if (tipoAlvo === 'custo' || tipoAlvo === 'ambos')
        payload.preco_custo = calcularNovoPreco(p.preco_custo, metodo, valorAjuste);
      return supabase.from('produtos').update(payload).eq('pk', p.pk);
    });

    await Promise.all(updates);
    res.json({ ok: true, atualizados: updates.length });
  } catch (e) {
    console.error('[AjustePrecos/reajuste]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 3. Aplicar promoção relâmpago ─────────────────────────────────────────────
router.post('/promo', async (req, res) => {
  const { pks, preco_promo, promo_inicio, promo_fim } = req.body;
  if (!pks?.length || !preco_promo || !promo_inicio || !promo_fim)
    return res.status(400).json({ erro: 'pks, preco_promo, promo_inicio e promo_fim obrigatórios' });
  try {
    const { error } = await supabase
      .from('produtos')
      .update({
        preco_promo:  parseFloat(preco_promo),
        promo_inicio: new Date(promo_inicio).toISOString(),
        promo_fim:    new Date(promo_fim).toISOString(),
      })
      .in('pk', pks);
    if (error) throw error;
    res.json({ ok: true, atualizados: pks.length });
  } catch (e) {
    console.error('[AjustePrecos/promo]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

// ── 4. Remover promoção ───────────────────────────────────────────────────────
router.delete('/promo', async (req, res) => {
  const { pks } = req.body;
  if (!pks?.length)
    return res.status(400).json({ erro: 'pks obrigatório' });
  try {
    const { error } = await supabase
      .from('produtos')
      .update({ preco_promo: null, promo_inicio: null, promo_fim: null })
      .in('pk', pks);
    if (error) throw error;
    res.json({ ok: true, atualizados: pks.length });
  } catch (e) {
    console.error('[AjustePrecos/removerPromo]', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
