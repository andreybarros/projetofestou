'use strict';

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const supabase = require('../supabase');

function gerarToken(operadorPk) {
  const secret = process.env.JWT_SECRET || 'festou_secret_2024';
  const ts     = Math.floor(Date.now() / 1000);
  const hash   = crypto
    .createHmac('sha256', secret)
    .update(`${operadorPk}:${ts}`)
    .digest('hex');
  return Buffer.from(`${operadorPk}:${ts}:${hash}`).toString('base64url');
}

function validarToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [pkStr, tsStr, hash] = decoded.split(':');
    if (!pkStr || !tsStr || !hash) return null;

    const secret   = process.env.JWT_SECRET || 'festou_secret_2024';
    const esperado = crypto
      .createHmac('sha256', secret)
      .update(`${pkStr}:${tsStr}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(esperado))) return null;

    const ts = parseInt(tsStr, 10);
    if (Date.now() / 1000 - ts > 43200) return null;

    return parseInt(pkStr, 10);
  } catch {
    return null;
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { filial_pk, login, senha } = req.body;
    if (!filial_pk || !login || !senha)
      return res.status(400).json({ erro: 'filial_pk, login e senha obrigatorios' });

    const { data: op, error } = await supabase
      .from('operadores')
      .select('id, nome, login, senha, admin, ativo, filial_pk, acesso_produtos, acesso_armazens, acesso_agenda, acesso_pdv, acesso_clientes, acesso_historico, acesso_receitas, acesso_categorias, acesso_despesas, acesso_financeiro, acesso_dashboard, acesso_fechamento, acesso_funcionarios, acesso_ponto, acesso_separacao, acesso_criar_ordem, matricula, acesso_espelho_ponto')
      .eq('login', login)
      .or(`filial_pk.eq.${filial_pk},filial_pk.is.null`)
      .maybeSingle();

    if (error) throw error;
    if (!op)       return res.status(401).json({ erro: 'Usuario nao encontrado' });
    if (!op.ativo) return res.status(401).json({ erro: 'Usuario inativo' });
    if (op.senha !== senha) return res.status(401).json({ erro: 'Senha incorreta' });

    const { data: filial } = await supabase
      .from('filiais')
      .select('pk, codigo, nome, cnpj, nfce_ambiente')
      .eq('pk', filial_pk)
      .single();

    const token = gerarToken(op.id);

    return res.json({
      token,
      operador: {
        pk: op.id, nome: op.nome, login: op.login, admin: op.admin,
        filial_pk: op.filial_pk,
        acesso_produtos: op.acesso_produtos, acesso_armazens: op.acesso_armazens,
        acesso_agenda: op.acesso_agenda, acesso_pdv: op.acesso_pdv,
        acesso_clientes: op.acesso_clientes, acesso_historico: op.acesso_historico,
        acesso_receitas: op.acesso_receitas, acesso_categorias: op.acesso_categorias,
        acesso_despesas: op.acesso_despesas, acesso_financeiro: op.acesso_financeiro,
        acesso_dashboard: op.acesso_dashboard, acesso_fechamento: op.acesso_fechamento,
        acesso_funcionarios: op.acesso_funcionarios, acesso_ponto: op.acesso_ponto,
        acesso_separacao: op.acesso_separacao, acesso_criar_ordem: op.acesso_criar_ordem,
        matricula: op.matricula, acesso_espelho_ponto: op.acesso_espelho_ponto,
      },
      filial: filial || { pk: filial_pk },
    });
  } catch (err) {
    console.error('[Auth/login]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// GET /api/auth/filiais  (publico)
router.get('/filiais', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('filiais')
      .select('pk, codigo, nome')
      .order('codigo');
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
module.exports.validarToken = validarToken;
