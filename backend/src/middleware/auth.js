'use strict';

const supabase = require('../supabase');
const { validarToken } = require('../routes/auth');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: 'Token nao fornecido' });

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token)  return res.status(401).json({ erro: 'Token invalido' });

  const operadorPk = validarToken(token);
  if (!operadorPk) return res.status(401).json({ erro: 'Token invalido ou expirado' });

  const { data: op } = await supabase
    .from('operadores')
    .select('id, nome, admin, filial_pk, ativo')
    .eq('id', operadorPk)
    .maybeSingle();

  if (!op || !op.ativo) return res.status(401).json({ erro: 'Operador inativo ou nao encontrado' });

  req.user = { pk: op.id, nome: op.nome, admin: op.admin, filial_pk: op.filial_pk };
  next();
}

module.exports = authMiddleware;
