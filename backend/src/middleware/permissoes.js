const supabase = require('../supabase');


const rotasPermissoes = {
  'POST /api/caixa/abrir': 'acesso_pdv',
  'POST /api/caixa/fechar': 'acesso_pdv',
  'POST /api/caixa/sangria': 'acesso_pdv',
  'POST /api/caixa/reforco': 'acesso_pdv',
  'GET /api/caixa/status': 'acesso_pdv',
  'POST /api/vendas/validar': 'acesso_pdv',
  'POST /api/vendas/finalizar': 'acesso_pdv',
  'PUT /api/vendas/:pk': 'acesso_historico',
  'GET /api/estoque': 'acesso_produtos',
  'POST /api/estoque/entrada-nf/preview':              'acesso_entrada_nfe',
  'POST /api/estoque/entrada-nf/confirmar':            'acesso_entrada_nfe',
  'GET /api/estoque/entrada-nf/historico/:filial_pk':  'acesso_entrada_nfe',
  'POST /api/nfce/autorizar': 'acesso_pdv',
  'POST /api/nfce/cancelar': 'acesso_pdv',
  'GET /api/relatorios/vendas/:filial_pk': 'acesso_relatorio_vendas',
  'GET /api/vales':              'acesso_vales',
  'POST /api/vales':             'acesso_vales',
  'PATCH /api/vales/:pk/aprovar':   'acesso_vales',
  'PATCH /api/vales/:pk/rejeitar':  'acesso_vales',
  'PATCH /api/vales/:pk/pagar':     'acesso_vales',
  'PATCH /api/vales/:pk/descontar':         'acesso_vales',
  'PATCH /api/vales/:pk/desconto-parcial':  'acesso_vales',
  'GET /api/projetos':                      'acesso_projetos',
  'GET /api/projetos/:pk':                  'acesso_projetos',
  'POST /api/projetos':                     'acesso_projetos',
  'PUT /api/projetos/:pk':                  'acesso_projetos',
  'DELETE /api/projetos/:pk':               'acesso_projetos',
  'POST /api/projetos/:pk/emitir-nfe':      'acesso_projetos',
  'GET /api/pedidos-compra':                       'acesso_pedidos_compra',
  'GET /api/pedidos-compra/:pk':                   'acesso_pedidos_compra',
  'POST /api/pedidos-compra':                      'acesso_pedidos_compra',
  'PUT /api/pedidos-compra/:pk':                   'acesso_pedidos_compra',
  'PATCH /api/pedidos-compra/:pk/status':          'acesso_pedidos_compra',
  'DELETE /api/pedidos-compra/:pk':                'acesso_pedidos_compra',
  'POST /api/pedidos-compra/:pk/entrada':          'acesso_pedidos_compra',
  'GET /api/contas-receber':                       'acesso_receitas',
  'PATCH /api/contas-receber/:pk/receber':         'acesso_receitas',
  'PATCH /api/contas-receber/:pk/desfazer':        'acesso_receitas',
  'GET /api/pdv/produtos':                         'acesso_pdv',
  'GET /api/pdv/categorias':                       'acesso_pdv',
  'GET /api/pdv/vendedores':                       'acesso_pdv',
  'GET /api/pdv/formas-pagamento':                 'acesso_pdv',
  'DELETE /api/pdv/produto/:pk':                   'acesso_produtos',
  'GET /api/ponto/meus-holerites':                 'acesso_holerite',
  'GET /api/ponto/meus-holerites/:pk':             'acesso_holerite',
};

async function permissoesMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ erro: 'Usuário não autenticado' });
  }

  let rotaKey = `${req.method} ${req.baseUrl}${req.path}`;
  
  // Tratamento para rotas com parâmetros (ex: /api/relatorios/vendas/2)
  if (rotaKey.startsWith('GET /api/relatorios/vendas')) {
    rotaKey = 'GET /api/relatorios/vendas/:filial_pk';
  }
  if (rotaKey.match(/^PUT \/api\/vendas\/\d+$/)) {
    rotaKey = 'PUT /api/vendas/:pk';
  }
  if (rotaKey.match(/^GET \/api\/estoque\/entrada-nf\/historico\/\d+$/)) {
    rotaKey = 'GET /api/estoque/entrada-nf/historico/:filial_pk';
  }
  if (rotaKey.match(/^PATCH \/api\/vales\/\d+\/(aprovar|rejeitar|pagar|descontar|desconto-parcial)$/)) {
    const acao = rotaKey.split('/').pop();
    rotaKey = `PATCH /api/vales/:pk/${acao}`;
  }
  if (rotaKey.match(/^GET \/api\/projetos\/\d+$/)) {
    rotaKey = 'GET /api/projetos/:pk';
  }
  if (rotaKey.match(/^PUT \/api\/projetos\/\d+$/)) {
    rotaKey = 'PUT /api/projetos/:pk';
  }
  if (rotaKey.match(/^DELETE \/api\/projetos\/\d+$/)) {
    rotaKey = 'DELETE /api/projetos/:pk';
  }
  if (rotaKey.match(/^POST \/api\/projetos\/\d+\/emitir-nfe$/)) {
    rotaKey = 'POST /api/projetos/:pk/emitir-nfe';
  }
  if (rotaKey.match(/^GET \/api\/pedidos-compra\/\d+$/)) {
    rotaKey = 'GET /api/pedidos-compra/:pk';
  }
  if (rotaKey.match(/^PUT \/api\/pedidos-compra\/\d+$/)) {
    rotaKey = 'PUT /api/pedidos-compra/:pk';
  }
  if (rotaKey.match(/^PATCH \/api\/pedidos-compra\/\d+\/status$/)) {
    rotaKey = 'PATCH /api/pedidos-compra/:pk/status';
  }
  if (rotaKey.match(/^DELETE \/api\/pedidos-compra\/\d+$/)) {
    rotaKey = 'DELETE /api/pedidos-compra/:pk';
  }
  if (rotaKey.match(/^POST \/api\/pedidos-compra\/\d+\/entrada$/)) {
    rotaKey = 'POST /api/pedidos-compra/:pk/entrada';
  }
  if (rotaKey.match(/^DELETE \/api\/pdv\/produto\/\d+$/)) {
    rotaKey = 'DELETE /api/pdv/produto/:pk';
  }
  if (rotaKey.match(/^GET \/api\/ponto\/meus-holerites\/\d+$/)) {
    rotaKey = 'GET /api/ponto/meus-holerites/:pk';
  }

  const permissaoRequerida = rotasPermissoes[rotaKey];

  if (!permissaoRequerida) {
    return next();
  }

  try {
    const { data: op, error } = await supabase
      .from('operadores')
      .select('*')
      .eq('id', req.user.pk)
      .single();

    if (error || !op) {
      return res.status(403).json({ erro: 'Operador não encontrado ou inativo.' });
    }

    // Se for admin, tem acesso total
    if (op.admin) {
      req.operador = { ...op, pk: op.id };
      return next();
    }

    const temPermissao = op[permissaoRequerida] === true;

    if (!temPermissao) {
      return res.status(403).json({
        erro: `Acesso negado: Você não possui a permissão '${permissaoRequerida.replace('acesso_', '')}'`
      });
    }

    req.operador = { ...op, pk: op.id };
    next();
  } catch (err) {
    console.error('[Permissões] Erro:', err.message);
    return res.status(500).json({ erro: 'Erro ao verificar permissoes' });
  }
}

module.exports = permissoesMiddleware;
