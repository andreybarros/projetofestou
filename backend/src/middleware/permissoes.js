const supabase = require('../supabase');

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
};

async function permissoesMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ erro: 'Usuário não autenticado' });
  }

  const rotaKey = `${req.method} ${req.baseUrl}${req.path}`;
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
