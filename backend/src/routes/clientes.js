const express  = require('express');
const https    = require('https');
const supabase = require('../supabase');

const router = express.Router();

// GET /api/clientes/cep/:cep — proxy ViaCEP para evitar CORS
router.get('/cep/:cep', (req, res) => {
  const cleaned = req.params.cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return res.status(400).json({ erro: 'CEP inválido' });
  https.get(`https://viacep.com.br/ws/${cleaned}/json/`, (r) => {
    let body = '';
    r.on('data', chunk => { body += chunk; });
    r.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (d.erro) return res.status(404).json({ erro: 'CEP não encontrado' });
        res.json({ ok: true, data: { logradouro: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', uf: d.uf || '' } });
      } catch {
        res.status(500).json({ erro: 'Erro ao processar resposta' });
      }
    });
  }).on('error', (err) => {
    console.error('[Clientes/CEP]', err.message);
    res.status(500).json({ erro: 'Erro ao buscar CEP' });
  });
});

// GET /api/clientes?busca=X&filial_pk=X
router.get('/', async (req, res) => {
  try {
    const { busca, filial_pk } = req.query;
    if (!busca || busca.trim().length < 2) return res.json({ ok: true, data: [] });
    const q = busca.trim();
    let query = supabase
      .from('clientes')
      .select('pk, nome, razao_social, cpf, telefone, decorador, logradouro, numero, bairro, cep')
      .eq('ativo', true)
      .or(`nome.ilike.%${q}%,razao_social.ilike.%${q}%,cpf.ilike.%${q}%,telefone.ilike.%${q}%`)
      .order('nome')
      .limit(8);
    if (filial_pk) query = query.eq('filial_pk', parseInt(filial_pk));
    const { data, error } = await query;
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error('[Clientes/Buscar] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  try {
    const { nome, cpf, telefone, email, decorador, logradouro, numero, bairro, cidade, cep, uf, filial_pk } = req.body;
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório.' });
    const payload = {
      nome:       nome.trim(),
      cpf:        cpf?.trim()        || null,
      telefone:   telefone?.trim()   || null,
      email:      email?.trim()      || null,
      decorador:  decorador          || false,
      logradouro: logradouro?.trim() || null,
      numero:     numero?.trim()     || null,
      bairro:     bairro?.trim()     || null,
      cidade:     cidade?.trim()     || null,
      cep:        cep?.trim()        || null,
      uf:         uf?.trim()?.toUpperCase() || null,
      filial_pk:  filial_pk          || null,
      ativo:      true,
    };
    const { data, error } = await supabase.from('clientes').insert(payload).select().single();
    if (error) throw error;
    res.status(201).json({ ok: true, data });
  } catch (err) {
    console.error('[Clientes/Criar] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
