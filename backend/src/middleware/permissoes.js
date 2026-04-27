const supabase = require('../supabase');

const SELECT_PERMISSOES =
  'id, admin, ativo,' +
  ' acesso_pdv, acesso_produtos, acesso_categorias, acesso_clientes,' +
  ' acesso_fornecedores, acesso_armazens, acesso_agenda, acesso_caixa,' +
  ' acesso_vendedores, acesso_receitas, acesso_historico, acesso_funcionarios,' +
  ' acesso_ponto, acesso_espelho_ponto, acesso_fechamento_ponto,' +
  ' acesso_separacao, acesso_criar_ordem, acesso_despesas, acesso_financeiro,' +
  ' acesso_fechamento, acesso_relatorio_caixa, acesso_dashboard,' +
  ' acesso_gestao_ponto, acesso_relatorio_vendas, acesso_vales';

const rotasPermissoes = {
  'POST /api/caixa/abrir': 'acesso_pdv',
  'POST /api/caixa/fechar': 'acesso_pdv',
  'POST /api/caixa/sangria': 'acesso_pdv',
  'POST /api/caixa/reforco': 'acesso_pdv',
  'GET /api/caixa/status': 'acesso_pdv',
  'POST /api/vendas/validar': 'acesso_pdv',
  'POST /api/vendas/finalizar': 'acesso_pdv',
  'GET /api/estoque': 'acesso_produtos',
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
  if (rotaKey.match(/^PATCH \/api\/vales\/\d+\/(aprovar|rejeitar|pagar|descontar|desconto-parcial)$/)) {
    const acao = rotaKey.split('/').pop();
    rotaKey = `PATCH /api/vales/:pk/${acao}`;
  }

  const permissaoRequerida = rotasPermissoes[rotaKey];

  if (!permissaoRequerida) {
    return next();
  }

  try {
    const { data: op, error } = await supabase
      .from('operadores')
      .select(SELECT_PERMISSOES)
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
