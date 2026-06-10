'use strict';

const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const supabase = require('../supabase');

// ── Admin: listar catálogos da filial ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    if (!filial_pk) return res.status(400).json({ erro: 'filial_pk obrigatório' });

    const { data, error } = await supabase
      .from('catalogos')
      .select('pk, nome, descricao, token, ativo, criado_em')
      .eq('filial_pk', filial_pk)
      .is('deletado_em', null)
      .order('criado_em', { ascending: false });
    if (error) throw error;

    // Conta itens e pedidos por catálogo
    const pks = (data || []).map(c => c.pk);
    const contagemItens    = {};
    const contagemPedidos  = {};
    if (pks.length) {
      const [{ data: itens }, { data: pedidos }] = await Promise.all([
        supabase.from('catalogo_itens').select('catalogo_pk').in('catalogo_pk', pks),
        supabase.from('pedidos_catalogo').select('catalogo_pk, status').in('catalogo_pk', pks).is('deletado_em', null),
      ]);
      (itens   || []).forEach(i => { contagemItens[i.catalogo_pk]   = (contagemItens[i.catalogo_pk]   || 0) + 1; });
      (pedidos || []).forEach(p => { contagemPedidos[p.catalogo_pk] = (contagemPedidos[p.catalogo_pk] || 0) + 1; });
    }

    res.json({
      ok: true,
      data: (data || []).map(c => ({
        ...c,
        qtd_itens:   contagemItens[c.pk]   || 0,
        qtd_pedidos: contagemPedidos[c.pk] || 0,
      })),
    });
  } catch (err) {
    console.error('[Catalogos/GET]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: criar catálogo ─────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { filial_pk, nome, descricao } = req.body;
    if (!filial_pk || !nome?.trim()) return res.status(400).json({ erro: 'filial_pk e nome obrigatórios' });

    const token = crypto.randomBytes(16).toString('hex');
    const { data, error } = await supabase
      .from('catalogos')
      .insert({ filial_pk, nome: nome.trim(), descricao: descricao?.trim() || null, token })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ ok: true, data });
  } catch (err) {
    console.error('[Catalogos/POST]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: atualizar catálogo ─────────────────────────────────
router.put('/:pk', async (req, res) => {
  try {
    const { pk } = req.params;
    const { nome, descricao, ativo } = req.body;

    const payload = {};
    if (nome      !== undefined) payload.nome      = nome?.trim() || null;
    if (descricao !== undefined) payload.descricao = descricao?.trim() || null;
    if (ativo     !== undefined) payload.ativo     = ativo;

    const { error } = await supabase.from('catalogos').update(payload).eq('pk', pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/PUT]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: soft-delete catálogo ──────────────────────────────
router.delete('/:pk', async (req, res) => {
  try {
    const { error } = await supabase
      .from('catalogos')
      .update({ deletado_em: new Date().toISOString() })
      .eq('pk', req.params.pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/DELETE]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: buscar catálogo por pk ────────────────────────────
router.get('/:pk', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('catalogos')
      .select('pk, nome, descricao, token, ativo, filial_pk, criado_em')
      .eq('pk', req.params.pk)
      .is('deletado_em', null)
      .single();
    if (error || !data) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[Catalogos/GET/:pk]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: listar produtos do catálogo ────────────────────────
router.get('/:pk/produtos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('catalogo_itens')
      .select('produto_pk, produtos(pk, descricao, codigo, foto_url, valor_venda, saldo)')
      .eq('catalogo_pk', req.params.pk)
      .order('pk');
    if (error) throw error;
    res.json({ ok: true, data: (data || []).map(i => i.produtos).filter(Boolean) });
  } catch (err) {
    console.error('[Catalogos/GET/produtos]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Todos os produtos da filial do catálogo (para pedido avulso) ──
router.get('/:pk/produtos-filial', async (req, res) => {
  try {
    const { data: cat, error: catErr } = await supabase
      .from('catalogos').select('filial_pk').eq('pk', req.params.pk).single();
    if (catErr || !cat) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    const { data, error } = await supabase
      .from('produtos')
      .select('pk, descricao, codigo, foto_url, saldo')
      .eq('filial_pk', cat.filial_pk)
      .eq('ativo', true)
      .order('descricao');
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error('[Catalogos/GET/produtos-filial]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: adicionar produto ao catálogo ─────────────────────
router.post('/:pk/produtos', async (req, res) => {
  try {
    const { produto_pk } = req.body;
    if (!produto_pk) return res.status(400).json({ erro: 'produto_pk obrigatório' });

    const { error } = await supabase
      .from('catalogo_itens')
      .insert({ catalogo_pk: req.params.pk, produto_pk });
    if (error) {
      if (error.code === '23505') return res.status(409).json({ erro: 'Produto já está no catálogo' });
      throw error;
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/POST/produto]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: remover produto do catálogo ───────────────────────
router.delete('/:pk/produtos/:produto_pk', async (req, res) => {
  try {
    const { error } = await supabase
      .from('catalogo_itens')
      .delete()
      .eq('catalogo_pk', req.params.pk)
      .eq('produto_pk', req.params.produto_pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/DELETE/produto]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: listar pedidos recebidos ──────────────────────────
router.get('/:pk/pedidos', async (req, res) => {
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, nome_cliente, telefone, email, observacao, status, valor_orcamento, obs_orcamento, pedido_token, data_evento, hora_evento, tipo_entrega, endereco_evento, criado_em, recusado_em, valor_orcamento_recusado')
      .eq('catalogo_pk', req.params.pk)
      .is('deletado_em', null)
      .order('criado_em', { ascending: false });
    if (error) throw error;

    const pedidoPks = (pedidos || []).map(p => p.pk);
    let itensMap = {};
    if (pedidoPks.length) {
      const { data: itens } = await supabase
        .from('pedidos_catalogo_itens')
        .select('pk, pedido_pk, produto_pk, nome_produto, quantidade, produto_substituto_pk, nome_produto_substituto')
        .in('pedido_pk', pedidoPks)
        .order('pk');

      const allProdPks = [...new Set(
        [...(itens||[]).map(i => i.produto_pk), ...(itens||[]).map(i => i.produto_substituto_pk)].filter(Boolean)
      )];
      let prodMap = {};
      if (allProdPks.length) {
        const { data: prods } = await supabase.from('produtos').select('pk, foto_url, saldo').in('pk', allProdPks);
        (prods || []).forEach(p => { prodMap[p.pk] = p; });
      }

      (itens || []).forEach(i => {
        if (!itensMap[i.pedido_pk]) itensMap[i.pedido_pk] = [];
        itensMap[i.pedido_pk].push({
          pk:                      i.pk,
          nome:                    i.nome_produto,
          quantidade:              i.quantidade,
          produto_pk:              i.produto_pk,
          foto_url:                prodMap[i.produto_pk]?.foto_url || null,
          saldo:                   prodMap[i.produto_pk]?.saldo ?? null,
          produto_substituto_pk:   i.produto_substituto_pk || null,
          nome_produto_substituto: i.nome_produto_substituto || null,
          foto_url_substituto:     i.produto_substituto_pk ? (prodMap[i.produto_substituto_pk]?.foto_url || null) : null,
        });
      });
    }

    res.json({
      ok: true,
      data: (pedidos || []).map(p => ({ ...p, itens: itensMap[p.pk] || [] })),
    });
  } catch (err) {
    console.error('[Catalogos/GET/pedidos]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: soft-delete pedido ────────────────────────────────
router.delete('/pedidos/:pk', async (req, res) => {
  try {
    const { error } = await supabase
      .from('pedidos_catalogo')
      .update({ deletado_em: new Date().toISOString(), status: 'cancelado' })
      .eq('pk', req.params.pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/DELETE/pedido]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: responder pedido com orçamento ────────────────────
router.patch('/pedidos/:pk/orcamento', async (req, res) => {
  try {
    const { valor_orcamento, obs_orcamento, status } = req.body;
    const payload = {
      status:          status          || 'orcamento_enviado',
      valor_orcamento: valor_orcamento ? parseFloat(valor_orcamento) : null,
      obs_orcamento:   obs_orcamento?.trim() || null,
    };
    const { error } = await supabase
      .from('pedidos_catalogo').update(payload).eq('pk', req.params.pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/PATCH/orcamento]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: alterar quantidade de um item do pedido ───────────
router.patch('/pedidos/itens/:pk/quantidade', async (req, res) => {
  try {
    const { quantidade } = req.body;
    if (!quantidade || parseInt(quantidade, 10) < 1)
      return res.status(400).json({ erro: 'Quantidade inválida' });
    const { error } = await supabase
      .from('pedidos_catalogo_itens')
      .update({ quantidade: parseInt(quantidade, 10) })
      .eq('pk', req.params.pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/PATCH/itens/quantidade]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: adicionar item ao pedido ──────────────────────────
router.post('/pedidos/:pk/itens', async (req, res) => {
  try {
    const { produto_pk, quantidade } = req.body;
    if (!produto_pk) return res.status(400).json({ erro: 'produto_pk obrigatório' });

    const { data: prod } = await supabase
      .from('produtos').select('descricao, foto_url, saldo').eq('pk', produto_pk).single();
    if (!prod) return res.status(404).json({ erro: 'Produto não encontrado' });

    const { data: item, error } = await supabase
      .from('pedidos_catalogo_itens')
      .insert({
        pedido_pk:    req.params.pk,
        produto_pk,
        nome_produto: prod.descricao,
        quantidade:   parseInt(quantidade || 1, 10),
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ ok: true, item: {
      pk:       item.pk,
      nome:     prod.descricao,
      produto_pk,
      foto_url: prod.foto_url || null,
      saldo:    prod.saldo ?? null,
      quantidade: item.quantidade,
      produto_substituto_pk: null, nome_produto_substituto: null, foto_url_substituto: null,
    }});
  } catch (err) {
    console.error('[Catalogos/POST/pedidos/itens]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: remover item do pedido ────────────────────────────
router.delete('/pedidos/itens/:pk', async (req, res) => {
  try {
    const { error } = await supabase
      .from('pedidos_catalogo_itens').delete().eq('pk', req.params.pk);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/DELETE/pedidos/itens]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: substituir produto de um item do pedido ───────────
router.patch('/pedidos/itens/:pk/substituir', async (req, res) => {
  try {
    const { produto_substituto_pk } = req.body;

    let nome_produto_substituto = null;
    if (produto_substituto_pk) {
      const { data: prod } = await supabase
        .from('produtos').select('descricao').eq('pk', produto_substituto_pk).single();
      if (!prod) return res.status(404).json({ erro: 'Produto substituto não encontrado' });
      nome_produto_substituto = prod.descricao;
    }

    const { quantidade } = req.body;
    const updatePayload = { produto_substituto_pk: produto_substituto_pk || null, nome_produto_substituto };
    if (quantidade) updatePayload.quantidade = parseInt(quantidade, 10);

    const { error } = await supabase
      .from('pedidos_catalogo_itens').update(updatePayload).eq('pk', req.params.pk);
    if (error) throw error;

    res.json({ ok: true, nome_produto_substituto });
  } catch (err) {
    console.error('[Catalogos/PATCH/itens/substituir]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: verificar conflitos de disponibilidade por data ───
router.get('/pedidos/:pk/conflitos', async (req, res) => {
  try {
    const { data: pedido, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .select('pk, data_evento, filial_pk')
      .eq('pk', req.params.pk)
      .single();
    if (errPed || !pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

    // Sem data de evento — sem conflito possível
    if (!pedido.data_evento) return res.json({ ok: true, conflitos: [] });

    // Itens do pedido atual ainda sem substituto
    const { data: itensAtuais } = await supabase
      .from('pedidos_catalogo_itens')
      .select('produto_pk, nome_produto')
      .eq('pedido_pk', req.params.pk)
      .is('produto_substituto_pk', null);

    const prodPks = (itensAtuais || []).map(i => i.produto_pk).filter(Boolean);
    if (!prodPks.length) return res.json({ ok: true, conflitos: [] });

    // Outros pedidos aprovados ou retirados na mesma data e filial
    const { data: outrosPedidos } = await supabase
      .from('pedidos_catalogo')
      .select('pk, nome_cliente, status')
      .eq('data_evento', pedido.data_evento)
      .eq('filial_pk', pedido.filial_pk)
      .in('status', ['aprovado', 'retirado'])
      .is('deletado_em', null)
      .neq('pk', req.params.pk);

    if (!outrosPedidos?.length) return res.json({ ok: true, conflitos: [] });

    const outrosPks  = outrosPedidos.map(p => p.pk);
    const pedidoMap  = {};
    outrosPedidos.forEach(p => { pedidoMap[p.pk] = p; });

    // Itens desses pedidos que usam o mesmo produto
    const { data: itensConflito } = await supabase
      .from('pedidos_catalogo_itens')
      .select('pedido_pk, produto_pk, nome_produto')
      .in('pedido_pk', outrosPks)
      .in('produto_pk', prodPks);

    if (!itensConflito?.length) return res.json({ ok: true, conflitos: [] });

    // Agrupa conflitos por produto
    const nomeMap = {};
    (itensAtuais || []).forEach(i => { nomeMap[i.produto_pk] = i.nome_produto; });

    const conflitosMap = {};
    for (const it of itensConflito) {
      if (!conflitosMap[it.produto_pk]) {
        conflitosMap[it.produto_pk] = {
          produto_pk:   it.produto_pk,
          nome_produto: nomeMap[it.produto_pk] || it.nome_produto,
          pedidos:      [],
        };
      }
      const p = pedidoMap[it.pedido_pk];
      conflitosMap[it.produto_pk].pedidos.push({
        pk:           p.pk,
        nome_cliente: p.nome_cliente,
        status:       p.status,
      });
    }

    res.json({ ok: true, conflitos: Object.values(conflitosMap) });
  } catch (err) {
    console.error('[Catalogos/GET/conflitos]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Admin: marcar pedido como retirado ou devolvido ──────────
router.patch('/pedidos/:pk/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['retirado', 'devolvido'].includes(status))
      return res.status(400).json({ erro: 'Status inválido. Use retirado ou devolvido.' });

    const { data: pedido, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status, filial_pk')
      .eq('pk', req.params.pk)
      .single();
    if (errPed || !pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

    if (status === 'retirado' && pedido.status !== 'aprovado')
      return res.status(400).json({ erro: 'Pedido precisa estar aprovado para ser marcado como retirado' });
    if (status === 'devolvido' && pedido.status !== 'retirado')
      return res.status(400).json({ erro: 'Pedido precisa estar retirado para ser marcado como devolvido' });

    const agora = new Date().toISOString();
    const updatePayload = { status };
    if (status === 'retirado')  updatePayload.retirado_em  = agora;
    if (status === 'devolvido') updatePayload.devolvido_em = agora;

    const { error: errUpd } = await supabase
      .from('pedidos_catalogo').update(updatePayload).eq('pk', req.params.pk);
    if (errUpd) throw errUpd;

    // Busca itens com produto_pk, nome e quantidade
    const { data: itens } = await supabase
      .from('pedidos_catalogo_itens')
      .select('produto_pk, nome_produto, quantidade')
      .eq('pedido_pk', req.params.pk);

    const itensFiltrados = (itens || []).filter(i => i.produto_pk);
    if (!itensFiltrados.length) return res.json({ ok: true });

    // Lê saldos atuais antes do ajuste
    const prodPks = itensFiltrados.map(i => i.produto_pk);
    const { data: produtosAtual } = await supabase
      .from('produtos').select('pk, saldo, descricao').in('pk', prodPks);
    const saldoMap = {};
    (produtosAtual || []).forEach(p => { saldoMap[p.pk] = { saldo: p.saldo ?? 0, descricao: p.descricao }; });

    // Ajusta saldo de cada produto e monta auditoria
    const delta       = status === 'retirado' ? -1 : 1;
    const observacao  = status === 'retirado' ? 'Pedido retirado' : 'Pedido devolvido';
    const auditoriaRows = [];

    for (const it of itensFiltrados) {
      const saldoAntes = saldoMap[it.produto_pk]?.saldo ?? 0;
      await supabase.rpc('ajustar_saldo_produto', { p_pk: it.produto_pk, p_delta: delta * it.quantidade });
      auditoriaRows.push({
        filial_pk:          pedido.filial_pk || null,
        produto_pk:         it.produto_pk,
        pedido_catalogo_pk: pedido.pk,
        nome:               saldoMap[it.produto_pk]?.descricao || it.nome_produto || null,
        saldo_antes:        saldoAntes,
        qtd_debitada:       delta * it.quantidade,
        saldo_apos:         saldoAntes + delta * it.quantidade,
        observacao,
      });
    }

    if (auditoriaRows.length) {
      await supabase.from('auditoria_estoque').insert(auditoriaRows);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Catalogos/PATCH/status]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── PUBLIC: buscar catálogo pelo token (sem auth) ────────────
router.get('/public/:token', async (req, res) => {
  try {
    const { data: catalogo, error } = await supabase
      .from('catalogos')
      .select('pk, nome, descricao, ativo')
      .eq('token', req.params.token)
      .single();

    if (error || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    if (!catalogo.ativo)    return res.status(410).json({ erro: 'Este catálogo não está mais disponível' });

    const { data: itens } = await supabase
      .from('catalogo_itens')
      .select('produtos(pk, descricao, foto_url, codigo)')
      .eq('catalogo_pk', catalogo.pk)
      .order('pk');

    const produtos = (itens || []).map(i => i.produtos).filter(Boolean);
    res.json({ ok: true, catalogo: { nome: catalogo.nome, descricao: catalogo.descricao }, produtos });
  } catch (err) {
    console.error('[Catalogos/PUBLIC/GET]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── PUBLIC: cliente envia pedido de interesse (sem auth) ─────
// POST /api/catalogos/:pk/pedido-avulso  — cria pedido manual pelo operador
router.post('/:pk/pedido-avulso', async (req, res) => {
  try {
    const catalogoPk = Number(req.params.pk);
    if (!catalogoPk) return res.status(400).json({ erro: 'Catálogo inválido' });

    const { nome_cliente, telefone, email, data_evento, hora_evento, tipo_entrega, observacao, cliente_pk, itens } = req.body;
    if (!nome_cliente?.trim()) return res.status(400).json({ erro: 'Nome do cliente obrigatório' });

    const { data: catalogo } = await supabase
      .from('catalogos').select('pk, filial_pk').eq('pk', catalogoPk).maybeSingle();
    if (!catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });

    const { data: pedido, error } = await supabase
      .from('pedidos_catalogo')
      .insert({
        catalogo_pk:  catalogo.pk,
        filial_pk:    catalogo.filial_pk,
        cliente_pk:   cliente_pk || null,
        nome_cliente: nome_cliente.trim(),
        telefone:     telefone?.trim()   || null,
        email:        email?.trim()      || null,
        data_evento:  data_evento        || null,
        hora_evento:  hora_evento        || null,
        tipo_entrega: tipo_entrega       || 'retirada',
        observacao:   observacao?.trim() || null,
        status:       'aguardando',
      })
      .select('pk')
      .single();
    if (error) throw error;

    // Salva itens se enviados
    if (Array.isArray(itens) && itens.length) {
      const prodPks = itens.map(i => i.produto_pk).filter(Boolean);
      const nomesMap = {};
      if (prodPks.length) {
        const { data: prods } = await supabase.from('produtos').select('pk, descricao').in('pk', prodPks);
        (prods || []).forEach(p => { nomesMap[p.pk] = p.descricao; });
      }
      const rows = itens.map(i => ({
        pedido_pk:    pedido.pk,
        produto_pk:   i.produto_pk,
        nome_produto: nomesMap[i.produto_pk] || i.descricao || null,
        quantidade:   parseInt(i.quantidade || 1, 10),
      }));
      await supabase.from('pedidos_catalogo_itens').insert(rows);
    }

    res.status(201).json({ ok: true, pedido_pk: pedido.pk });
  } catch (err) {
    console.error('[Catalogos/PedidoAvulso]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

router.post('/public/:token/pedido', async (req, res) => {
  try {
    const { nome_cliente, telefone, email, observacao, itens } = req.body;
    if (!nome_cliente?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
    if (!Array.isArray(itens) || !itens.length) return res.status(400).json({ erro: 'Selecione ao menos um produto' });

    const { data: catalogo, error: errCat } = await supabase
      .from('catalogos')
      .select('pk, filial_pk, ativo')
      .eq('token', req.params.token)
      .single();
    if (errCat || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    if (!catalogo.ativo)     return res.status(410).json({ erro: 'Catálogo indisponível' });

    const { data: pedido, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .insert({
        catalogo_pk:  catalogo.pk,
        filial_pk:    catalogo.filial_pk,
        nome_cliente: nome_cliente.trim(),
        telefone:     telefone?.trim() || null,
        email:        email?.trim()    || null,
        observacao:   observacao?.trim() || null,
        status:       'aguardando',
      })
      .select('pk')
      .single();
    if (errPed) throw errPed;

    // Busca nomes dos produtos para snapshot
    const prodPks = itens.map(i => i.produto_pk).filter(Boolean);
    const nomesMap = {};
    if (prodPks.length) {
      const { data: prods } = await supabase.from('produtos').select('pk, descricao').in('pk', prodPks);
      (prods || []).forEach(p => { nomesMap[p.pk] = p.descricao; });
    }

    const rows = itens.map(i => ({
      pedido_pk:   pedido.pk,
      produto_pk:  i.produto_pk,
      nome_produto: nomesMap[i.produto_pk] || i.nome || null,
      quantidade:  parseInt(i.quantidade || 1, 10),
    }));

    const { error: errItens } = await supabase.from('pedidos_catalogo_itens').insert(rows);
    if (errItens) throw errItens;

    res.status(201).json({ ok: true, pedido_pk: pedido.pk });
  } catch (err) {
    console.error('[Catalogos/PUBLIC/POST]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
