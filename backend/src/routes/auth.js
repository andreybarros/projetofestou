'use strict';

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const supabase = require('../supabase');

const SELECT_OPERADOR =
  'id, login, senha, nome, admin, ativo, filial_pk, matricula,' +
  ' acesso_pdv, acesso_produtos, acesso_categorias, acesso_clientes,' +
  ' acesso_fornecedores, acesso_armazens, acesso_agenda, acesso_caixa,' +
  ' acesso_vendedores, acesso_receitas, acesso_historico, acesso_funcionarios,' +
  ' acesso_ponto, acesso_espelho_ponto, acesso_fechamento_ponto,' +
  ' acesso_separacao, acesso_criar_ordem, acesso_despesas, acesso_financeiro,' +
  ' acesso_fechamento, acesso_relatorio_caixa, acesso_dashboard,' +
  ' acesso_gestao_ponto, acesso_relatorio_vendas, acesso_vales';

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
      .select(SELECT_OPERADOR)
      .eq('login', login)
      .maybeSingle();

    if (error) {
      console.error('[Auth/login] DB Error:', error.message);
      return res.status(500).json({ erro: 'Erro no banco de dados ao buscar operador' });
    }

    if (!op) {
      return res.status(401).json({ erro: 'Usuario nao encontrado' });
    }

    const opFilialPk = op.filial_pk;
    if (!op.admin && opFilialPk !== null && String(opFilialPk) !== String(filial_pk)) {
      return res.status(401).json({ erro: 'Usuario sem acesso a esta filial' });
    }

    if (!op.ativo) {
      return res.status(401).json({ erro: 'Usuario inativo' });
    }

    const senhaCorreta = String(op.senha).trim() === String(senha).trim();
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Senha incorreta' });
    }

    let filial = null;
    try {
      const { data: fData } = await supabase
        .from('filiais')
        .select('pk, codigo, nome, cnpj, nfce_ambiente')
        .eq('pk', filial_pk)
        .maybeSingle();
      filial = fData;
    } catch { /* ignore */ }

    let modulos = [];
    try {
      const { data: modulosData } = await supabase
        .from('modulos_filiais')
        .select('modulo')
        .eq('filial_pk', filial_pk)
        .eq('ativo', true);
      if (modulosData) modulos = modulosData.map(m => m.modulo);
    } catch { /* ignore */ }

    const opId = op.id || op.pk;
    const token = gerarToken(opId);

    const { senha: _omit, ...operadorSemSenha } = op;

    return res.json({
      token,
      operador: { ...operadorSemSenha, pk: opId, id: opId },
      filial: filial || { pk: filial_pk },
      modulos,
    });
  } catch (err) {
    console.error('[Auth/login]', err.message);
    return res.status(500).json({ erro: err.message });
  }
});

// GET /api/auth/modulos/:filial_pk
router.get('/modulos/:filial_pk', async (req, res) => {
  try {
    const { filial_pk } = req.params;
    const { data, error } = await supabase
      .from('modulos_filiais')
      .select('modulo')
      .eq('filial_pk', filial_pk)
      .eq('ativo', true);
    if (error) throw error;
    return res.json((data || []).map(m => m.modulo));
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
});

// POST /api/auth/trocar-senha
router.post('/trocar-senha', async (req, res) => {
  try {
    const { filial_pk, login, nova_senha } = req.body;
    if (!filial_pk || !login || !nova_senha)
      return res.status(400).json({ erro: 'Filial, login e nova senha são obrigatórios.' });
    if (nova_senha.length < 4)
      return res.status(400).json({ erro: 'Nova senha deve ter pelo menos 4 caracteres.' });

    const { data: op, error } = await supabase
      .from('operadores')
      .select('id, ativo')
      .eq('login', login)
      .or(`filial_pk.eq.${filial_pk},filial_pk.is.null`)
      .maybeSingle();

    if (error) throw error;
    if (!op)       return res.status(401).json({ erro: 'Usuário não encontrado.' });
    if (!op.ativo) return res.status(401).json({ erro: 'Usuário inativo.' });

    const { error: errUpd } = await supabase
      .from('operadores')
      .update({ senha: nova_senha })
      .eq('id', op.id);
    if (errUpd) throw errUpd;

    return res.json({ ok: true });
  } catch (err) {
    console.error('[Auth/trocar-senha]', err.message);
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
