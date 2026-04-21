const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.get('/:usuario_pk', async (req, res) => {
  try {
    const { usuario_pk } = req.params;

    const { data: operador, error } = await supabase
      .from('operadores')
      .select(`
        pk,
        nome,
        email,
        perfis!inner(pk, nome, permissoes)
      `)
      .eq('pk', usuario_pk)
      .single();

    if (error || !operador) {
      return res.status(404).json({ erro: 'Operador não encontrado' });
    }

    const permissoes = operador.perfis?.permissoes || [];

    res.status(200).json({
      usuario_pk: operador.pk,
      nome: operador.nome,
      email: operador.email,
      perfil: operador.perfis?.nome || null,
      permissoes: Array.isArray(permissoes) ? permissoes : []
    });
  } catch (err) {
    console.error('[Permissões/Obter] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao obter permissões' });

  }
});

module.exports = router;
