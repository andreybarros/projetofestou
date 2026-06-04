'use strict';

const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const supabase = require('../supabase');

// GET /api/catalogo-publico/:token — catálogo público sem auth
router.get('/:token', async (req, res) => {
  try {
    const { data: catalogo, error } = await supabase
      .from('catalogos')
      .select('pk, nome, descricao, ativo')
      .eq('token', req.params.token)
      .is('deletado_em', null)
      .single();

    if (error || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    if (!catalogo.ativo)    return res.status(410).json({ erro: 'Este catálogo não está mais disponível' });

    const { data: itens } = await supabase
      .from('catalogo_itens')
      .select('produtos(pk, descricao, foto_url, codigo, saldo)')
      .eq('catalogo_pk', catalogo.pk)
      .order('pk');

    const produtos = (itens || []).map(i => i.produtos).filter(Boolean);
    res.json({ ok: true, catalogo: { nome: catalogo.nome, descricao: catalogo.descricao }, produtos });
  } catch (err) {
    console.error('[CatalogoPublico/GET]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/catalogo-publico/:token/pedido — cliente envia pedido sem auth
router.post('/:token/pedido', async (req, res) => {
  try {
    const {
      nome_cliente, telefone, email, observacao, itens,
      data_evento, hora_evento, tipo_entrega, endereco_evento,
    } = req.body;

    if (!nome_cliente?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
    if (!Array.isArray(itens) || !itens.length) return res.status(400).json({ erro: 'Selecione ao menos um produto' });
    if (tipo_entrega === 'entrega' && !endereco_evento?.trim()) {
      return res.status(400).json({ erro: 'Informe o endereço do evento para entrega' });
    }

    const { data: catalogo, error: errCat } = await supabase
      .from('catalogos')
      .select('pk, filial_pk, ativo')
      .eq('token', req.params.token)
      .single();
    if (errCat || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });
    if (!catalogo.ativo)     return res.status(410).json({ erro: 'Catálogo indisponível' });

    // Verifica conflitos de disponibilidade antes de criar o pedido
    if (data_evento) {
      const prodPksReq = itens.map(i => i.produto_pk).filter(Boolean);
      if (prodPksReq.length) {
        const { data: outrosPedidos } = await supabase
          .from('pedidos_catalogo')
          .select('pk')
          .eq('data_evento', data_evento)
          .eq('filial_pk', catalogo.filial_pk)
          .in('status', ['aprovado', 'retirado'])
          .is('deletado_em', null);

        if (outrosPedidos?.length) {
          const { data: itensOcupados } = await supabase
            .from('pedidos_catalogo_itens')
            .select('produto_pk, nome_produto')
            .in('pedido_pk', outrosPedidos.map(p => p.pk))
            .in('produto_pk', prodPksReq)
            .is('produto_substituto_pk', null);

          if (itensOcupados?.length) {
            const nomes = [...new Set(itensOcupados.map(i => i.nome_produto))].join(', ');
            return res.status(409).json({
              erro: `Os seguintes produtos já estão reservados para esta data: ${nomes}. Por favor, escolha outros produtos.`,
              produtos_indisponiveis: [...new Set(itensOcupados.map(i => i.produto_pk))],
            });
          }
        }
      }
    }

    const pedido_token = crypto.randomBytes(16).toString('hex');

    // Resolve cliente_pk via sessão (se logado)
    let cliente_pk = null;
    const sessaoTk = req.headers['x-sessao-token'];
    if (sessaoTk) {
      const { data: sessao } = await supabase
        .from('catalogo_sessoes')
        .select('cliente_pk')
        .eq('token', sessaoTk)
        .gt('expira_em', new Date().toISOString())
        .single();
      if (sessao) cliente_pk = sessao.cliente_pk;
    }

    const { data: pedido, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .insert({
        catalogo_pk:     catalogo.pk,
        filial_pk:       catalogo.filial_pk,
        cliente_pk,
        nome_cliente:    nome_cliente.trim(),
        telefone:        telefone?.trim()        || null,
        email:           email?.trim()           || null,
        observacao:      observacao?.trim()       || null,
        data_evento:     data_evento             || null,
        hora_evento:     hora_evento             || null,
        tipo_entrega:    tipo_entrega            || 'retirada',
        endereco_evento: endereco_evento?.trim() || null,
        pedido_token,
        status:          'aguardando',
      })
      .select('pk')
      .single();
    if (errPed) throw errPed;

    const prodPks = itens.map(i => i.produto_pk).filter(Boolean);
    const nomesMap = {};
    if (prodPks.length) {
      const { data: prods } = await supabase.from('produtos').select('pk, descricao').in('pk', prodPks);
      (prods || []).forEach(p => { nomesMap[p.pk] = p.descricao; });
    }

    const rows = itens.map(i => ({
      pedido_pk:    pedido.pk,
      produto_pk:   i.produto_pk,
      nome_produto: nomesMap[i.produto_pk] || i.nome || null,
      quantidade:   parseInt(i.quantidade || 1, 10),
    }));

    const { error: errItens } = await supabase.from('pedidos_catalogo_itens').insert(rows);
    if (errItens) throw errItens;

    res.status(201).json({ ok: true, pedido_pk: pedido.pk, pedido_token });
  } catch (err) {
    console.error('[CatalogoPublico/POST/pedido]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/orcamento-publico/:token — cliente visualiza orçamento sem auth
router.get('/orcamento/:token', async (req, res) => {
  try {
    const { data: pedido, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, nome_cliente, telefone, data_evento, hora_evento, tipo_entrega, endereco_evento, observacao, status, valor_orcamento, obs_orcamento, recusado_em, criado_em')
      .eq('pedido_token', req.params.token)
      .single();

    if (error || !pedido) return res.status(404).json({ erro: 'Orçamento não encontrado' });

    const { data: itens } = await supabase
      .from('pedidos_catalogo_itens')
      .select('pk, produto_pk, nome_produto, quantidade, produto_substituto_pk, nome_produto_substituto')
      .eq('pedido_pk', pedido.pk)
      .order('pk');

    const allPks = [...new Set(
      [...(itens||[]).map(i => i.produto_pk), ...(itens||[]).map(i => i.produto_substituto_pk)].filter(Boolean)
    )];
    let fotoMap = {};
    if (allPks.length) {
      const { data: prods } = await supabase.from('produtos').select('pk, foto_url').in('pk', allPks);
      (prods || []).forEach(p => { fotoMap[p.pk] = p.foto_url || null; });
    }

    const itensCompletos = (itens || []).map(i => ({
      produto_pk:              i.produto_pk,
      nome_produto:            i.nome_produto,
      quantidade:              i.quantidade,
      foto_url:                fotoMap[i.produto_pk] || null,
      produto_substituto_pk:   i.produto_substituto_pk || null,
      nome_produto_substituto: i.nome_produto_substituto || null,
      foto_url_substituto:     i.produto_substituto_pk ? (fotoMap[i.produto_substituto_pk] || null) : null,
    }));

    res.json({ ok: true, pedido: { ...pedido, itens: itensCompletos } });
  } catch (err) {
    console.error('[OrcamentoPublico/GET]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/catalogo-publico/orcamento/:token/conflitos — conflitos de disponibilidade
router.get('/orcamento/:token/conflitos', async (req, res) => {
  try {
    const { data: pedido } = await supabase
      .from('pedidos_catalogo')
      .select('pk, data_evento, filial_pk, status')
      .eq('pedido_token', req.params.token)
      .single();
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
    if (!pedido.data_evento) return res.json({ ok: true, conflitos: [] });

    const { data: itensAtuais } = await supabase
      .from('pedidos_catalogo_itens')
      .select('pk, produto_pk, nome_produto, produto_substituto_pk')
      .eq('pedido_pk', pedido.pk);

    // Só verifica itens ainda não substituídos
    const semSubstituto = (itensAtuais || []).filter(i => i.produto_pk && !i.produto_substituto_pk);
    const prodPks = semSubstituto.map(i => i.produto_pk);
    if (!prodPks.length) return res.json({ ok: true, conflitos: [] });

    const { data: outrosPedidos } = await supabase
      .from('pedidos_catalogo')
      .select('pk')
      .eq('data_evento', pedido.data_evento)
      .eq('filial_pk', pedido.filial_pk)
      .in('status', ['aprovado', 'retirado'])
      .is('deletado_em', null)
      .neq('pk', pedido.pk);
    if (!outrosPedidos?.length) return res.json({ ok: true, conflitos: [] });

    const { data: itensConflito } = await supabase
      .from('pedidos_catalogo_itens')
      .select('produto_pk')
      .in('pedido_pk', outrosPedidos.map(p => p.pk))
      .in('produto_pk', prodPks);
    if (!itensConflito?.length) return res.json({ ok: true, conflitos: [] });

    const pksConflitados = new Set(itensConflito.map(i => i.produto_pk));
    const conflitos = semSubstituto
      .filter(i => pksConflitados.has(i.produto_pk))
      .map(i => ({ item_pk: i.pk, produto_pk: i.produto_pk, nome_produto: i.nome_produto }));

    res.json({ ok: true, conflitos });
  } catch (err) {
    console.error('[OrcamentoPublico/GET/conflitos]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/catalogo-publico/orcamento/:token/itens/:pk/substituir — cliente substitui produto
router.patch('/orcamento/:token/itens/:pk/substituir', async (req, res) => {
  try {
    const { produto_substituto_pk } = req.body;
    if (!produto_substituto_pk) return res.status(400).json({ erro: 'produto_substituto_pk obrigatório' });

    const { data: pedido } = await supabase
      .from('pedidos_catalogo')
      .select('pk')
      .eq('pedido_token', req.params.token)
      .single();
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

    const { data: item } = await supabase
      .from('pedidos_catalogo_itens')
      .select('pk')
      .eq('pk', req.params.pk)
      .eq('pedido_pk', pedido.pk)
      .single();
    if (!item) return res.status(404).json({ erro: 'Item não encontrado' });

    const { data: prod } = await supabase
      .from('produtos').select('descricao, foto_url').eq('pk', produto_substituto_pk).single();
    if (!prod) return res.status(404).json({ erro: 'Produto substituto não encontrado' });

    const { quantidade, data_evento, hora_evento } = req.body;
    const itemPayload = { produto_substituto_pk, nome_produto_substituto: prod.descricao };
    if (quantidade) itemPayload.quantidade = parseInt(quantidade, 10);

    const { error } = await supabase
      .from('pedidos_catalogo_itens').update(itemPayload).eq('pk', req.params.pk);
    if (error) throw error;

    // Atualiza data/hora do evento e reseta orçamento — cliente precisa de novo orçamento
    const pedidoPayload = { status: 'aguardando', valor_orcamento: null, obs_orcamento: null };
    if (data_evento !== undefined) pedidoPayload.data_evento = data_evento || null;
    if (hora_evento !== undefined) pedidoPayload.hora_evento = hora_evento || null;
    await supabase.from('pedidos_catalogo').update(pedidoPayload).eq('pk', pedido.pk);

    res.json({ ok: true, nome_produto_substituto: prod.descricao, foto_url_substituto: prod.foto_url || null });
  } catch (err) {
    console.error('[OrcamentoPublico/PATCH/itens/substituir]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/orcamento-publico/:token/aprovar — cliente aprova orçamento sem auth
router.post('/orcamento/:token/aprovar', async (req, res) => {
  try {
    const { data: pedido, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status, valor_orcamento')
      .eq('pedido_token', req.params.token)
      .single();

    if (error || !pedido) return res.status(404).json({ erro: 'Orçamento não encontrado' });
    if (!pedido.valor_orcamento) return res.status(400).json({ erro: 'O orçamento ainda não foi enviado' });
    if (pedido.status === 'aprovado') return res.status(409).json({ erro: 'Orçamento já aprovado' });

    // Bloqueia se ainda há produtos em conflito sem substituto
    const { data: itensConf } = await supabase
      .from('pedidos_catalogo_itens')
      .select('pk, produto_pk, produto_substituto_pk')
      .eq('pedido_pk', pedido.pk);
    if (pedido.data_evento) {
      const semSub = (itensConf || []).filter(i => i.produto_pk && !i.produto_substituto_pk).map(i => i.produto_pk);
      if (semSub.length) {
        const { data: outrospeds } = await supabase
          .from('pedidos_catalogo')
          .select('pk')
          .eq('data_evento', pedido.data_evento)
          .eq('filial_pk', pedido.filial_pk)
          .in('status', ['aprovado', 'retirado'])
          .is('deletado_em', null)
          .neq('pk', pedido.pk);
        if (outrospeds?.length) {
          const { data: conf } = await supabase
            .from('pedidos_catalogo_itens')
            .select('produto_pk')
            .in('pedido_pk', outrospeds.map(p => p.pk))
            .in('produto_pk', semSub);
          if (conf?.length) {
            return res.status(409).json({ erro: 'Existem produtos indisponíveis. Substitua-os antes de confirmar.' });
          }
        }
      }
    }

    const { error: errUpd } = await supabase
      .from('pedidos_catalogo')
      .update({ status: 'aprovado' })
      .eq('pk', pedido.pk);
    if (errUpd) throw errUpd;

    res.json({ ok: true });
  } catch (err) {
    console.error('[OrcamentoPublico/POST/aprovar]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Helpers ──────────────────────────────────────────────────
const soDigitos = s => (s || '').replace(/\D/g, '');

// POST /api/catalogo-publico/:token/cliente/login
router.post('/:token/cliente/login', async (req, res) => {
  try {
    const { email, telefone } = req.body;
    if (!email?.trim() || !telefone?.trim()) {
      return res.status(400).json({ erro: 'E-mail e telefone obrigatórios' });
    }

    // Descobre a filial pelo token do catálogo
    const { data: catalogo, error: errCat } = await supabase
      .from('catalogos')
      .select('pk, filial_pk')
      .eq('token', req.params.token)
      .is('deletado_em', null)
      .single();
    if (errCat || !catalogo) return res.status(404).json({ erro: 'Catálogo não encontrado' });

    // Busca clientes da filial com esse e-mail (case-insensitive)
    const { data: candidatos } = await supabase
      .from('clientes')
      .select('pk, nome, email, telefone, filial_pk')
      .eq('filial_pk', catalogo.filial_pk)
      .ilike('email', email.trim());

    // Verifica telefone normalizando ambos os lados (remove não-dígitos)
    const telBuscado = soDigitos(telefone);
    const cliente = (candidatos || []).find(c => soDigitos(c.telefone) === telBuscado);

    if (!cliente) {
      return res.status(401).json({ erro: 'E-mail ou telefone não encontrado no cadastro' });
    }

    // Cria sessão com validade de 7 dias
    const sessaoToken = crypto.randomBytes(32).toString('hex');
    const expiraEm    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: errSessao } = await supabase
      .from('catalogo_sessoes')
      .insert({
        cliente_pk:  cliente.pk,
        catalogo_pk: catalogo.pk,
        token:       sessaoToken,
        expira_em:   expiraEm,
      });
    if (errSessao) throw errSessao;

    res.json({
      ok: true,
      sessao_token: sessaoToken,
      cliente: {
        pk:       cliente.pk,
        nome:     cliente.nome,
        email:    cliente.email,
        telefone: cliente.telefone,
      },
    });
  } catch (err) {
    console.error('[CatalogoPublico/POST/login]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/catalogo-publico/:token/cliente/sessao — valida sessão existente
router.get('/:token/cliente/sessao', async (req, res) => {
  try {
    const sessaoToken = req.headers['x-sessao-token'];
    if (!sessaoToken) return res.status(401).json({ erro: 'Token não informado' });

    const { data: sessao, error } = await supabase
      .from('catalogo_sessoes')
      .select('pk, cliente_pk, expira_em, clientes(pk, nome, email, telefone)')
      .eq('token', sessaoToken)
      .gt('expira_em', new Date().toISOString())
      .single();

    if (error || !sessao) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });

    res.json({
      ok: true,
      cliente: {
        pk:       sessao.clientes.pk,
        nome:     sessao.clientes.nome,
        email:    sessao.clientes.email,
        telefone: sessao.clientes.telefone,
      },
    });
  } catch (err) {
    console.error('[CatalogoPublico/GET/sessao]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/catalogo-publico/:token/cliente/pedidos — pedidos do cliente logado
router.get('/:token/cliente/pedidos', async (req, res) => {
  try {
    const sessaoToken = req.headers['x-sessao-token'];
    if (!sessaoToken) return res.status(401).json({ erro: 'Não autenticado' });

    // Valida sessão
    const { data: sessao, error: errSessao } = await supabase
      .from('catalogo_sessoes')
      .select('pk, cliente_pk, catalogo_pk')
      .eq('token', sessaoToken)
      .gt('expira_em', new Date().toISOString())
      .single();
    if (errSessao || !sessao) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });

    // Busca pedidos do cliente neste catálogo
    const { data: pedidos, error: errPed } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status, valor_orcamento, obs_orcamento, pedido_token, data_evento, hora_evento, tipo_entrega, endereco_evento, observacao, criado_em')
      .eq('catalogo_pk', sessao.catalogo_pk)
      .eq('cliente_pk', sessao.cliente_pk)
      .is('deletado_em', null)
      .order('criado_em', { ascending: false });

    if (errPed) throw errPed;

    // Busca itens de cada pedido
    const pks = (pedidos || []).map(p => p.pk);
    let itensMap = {};
    if (pks.length) {
      const { data: itens } = await supabase
        .from('pedidos_catalogo_itens')
        .select('pedido_pk, produto_pk, produto_substituto_pk, nome_produto, quantidade')
        .in('pedido_pk', pks);
      (itens || []).forEach(i => {
        if (!itensMap[i.pedido_pk]) itensMap[i.pedido_pk] = [];
        itensMap[i.pedido_pk].push({
          nome:                 i.nome_produto,
          quantidade:           i.quantidade,
          produto_pk:           i.produto_pk,
          produto_substituto_pk: i.produto_substituto_pk || null,
        });
      });
    }

    res.json({
      ok: true,
      data: (pedidos || []).map(p => ({ ...p, itens: itensMap[p.pk] || [] })),
    });
  } catch (err) {
    console.error('[CatalogoPublico/GET/cliente/pedidos]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/catalogo-publico/orcamento/:token/recusar — cliente recusa o orçamento
router.post('/orcamento/:token/recusar', async (req, res) => {
  try {
    const { data: pedido, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status')
      .eq('pedido_token', req.params.token)
      .single();
    if (error || !pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
    if (pedido.status !== 'orcamento_enviado')
      return res.status(400).json({ erro: 'Só é possível recusar um orçamento que foi enviado' });

    // Busca valor atual para preservar histórico
    const { data: ped } = await supabase
      .from('pedidos_catalogo')
      .select('valor_orcamento')
      .eq('pk', pedido.pk)
      .single();

    const { error: errUpd } = await supabase
      .from('pedidos_catalogo')
      .update({
        status:                    'aguardando',
        valor_orcamento:           null,
        obs_orcamento:             null,
        recusado_em:               new Date().toISOString(),
        valor_orcamento_recusado:  ped?.valor_orcamento || null,
      })
      .eq('pk', pedido.pk);
    if (errUpd) throw errUpd;

    res.json({ ok: true });
  } catch (err) {
    console.error('[OrcamentoPublico/POST/recusar]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/catalogo-publico/orcamento/:token/cancelar — cliente cancela pedido (só aguardando)
router.patch('/orcamento/:token/cancelar', async (req, res) => {
  try {
    const { data: pedido, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status')
      .eq('pedido_token', req.params.token)
      .single();
    if (error || !pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
    if (pedido.status !== 'aguardando')
      return res.status(400).json({ erro: 'Só é possível cancelar pedidos aguardando orçamento' });

    const { error: errUpd } = await supabase
      .from('pedidos_catalogo')
      .update({ status: 'cancelado' })
      .eq('pk', pedido.pk);
    if (errUpd) throw errUpd;

    res.json({ ok: true });
  } catch (err) {
    console.error('[OrcamentoPublico/PATCH/cancelar]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/catalogo-publico/orcamento/:token/editar-itens — cliente edita itens (só aguardando)
router.patch('/orcamento/:token/editar-itens', async (req, res) => {
  try {
    const { itens, data_evento, hora_evento } = req.body;
    if (!Array.isArray(itens) || !itens.length)
      return res.status(400).json({ erro: 'Informe ao menos um item' });

    const { data: pedido, error } = await supabase
      .from('pedidos_catalogo')
      .select('pk, status, catalogo_pk, filial_pk, data_evento')
      .eq('pedido_token', req.params.token)
      .single();
    if (error || !pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
    if (pedido.status !== 'aguardando')
      return res.status(400).json({ erro: 'Pedido não pode ser editado neste status' });

    // Verifica conflitos com data do evento (usa a nova data se enviada, ou a existente)
    const dataEvento = data_evento || pedido.data_evento;
    const prodPks    = itens.map(i => i.produto_pk).filter(Boolean);
    if (dataEvento && prodPks.length) {
      const { data: outrosPedidos } = await supabase
        .from('pedidos_catalogo')
        .select('pk')
        .eq('data_evento', dataEvento)
        .eq('filial_pk', pedido.filial_pk)
        .in('status', ['aprovado', 'retirado'])
        .is('deletado_em', null)
        .neq('pk', pedido.pk);

      if (outrosPedidos?.length) {
        const { data: itensConflito } = await supabase
          .from('pedidos_catalogo_itens')
          .select('produto_pk, nome_produto')
          .in('pedido_pk', outrosPedidos.map(p => p.pk))
          .in('produto_pk', prodPks);

        if (itensConflito?.length) {
          const nomes = [...new Set(itensConflito.map(i => i.nome_produto))].join(', ');
          return res.status(409).json({
            erro: `Os seguintes produtos já estão reservados para esta data: ${nomes}. Escolha outros produtos.`,
            conflitos: itensConflito.map(i => ({ produto_pk: i.produto_pk, nome_produto: i.nome_produto })),
          });
        }
      }
    }

    // Busca nomes dos produtos
    const nomesMap = {};
    if (prodPks.length) {
      const { data: prods } = await supabase.from('produtos').select('pk, descricao').in('pk', prodPks);
      (prods || []).forEach(p => { nomesMap[p.pk] = p.descricao; });
    }

    // Substitui todos os itens
    await supabase.from('pedidos_catalogo_itens').delete().eq('pedido_pk', pedido.pk);
    const rows = itens.map(i => ({
      pedido_pk:    pedido.pk,
      produto_pk:   i.produto_pk,
      nome_produto: nomesMap[i.produto_pk] || null,
      quantidade:   parseInt(i.quantidade || 1, 10),
    }));
    const { error: errItens } = await supabase.from('pedidos_catalogo_itens').insert(rows);
    if (errItens) throw errItens;

    // Atualiza data/hora se enviado
    const pedidoPayload = {};
    if (data_evento !== undefined) pedidoPayload.data_evento = data_evento || null;
    if (hora_evento !== undefined) pedidoPayload.hora_evento = hora_evento || null;
    if (Object.keys(pedidoPayload).length)
      await supabase.from('pedidos_catalogo').update(pedidoPayload).eq('pk', pedido.pk);

    res.json({ ok: true });
  } catch (err) {
    console.error('[OrcamentoPublico/PATCH/editar-itens]', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
