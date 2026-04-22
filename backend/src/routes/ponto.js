const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

// 1. Registrar Batida (Ponto do Funcionário)
router.post('/batida', async (req, res) => {
  try {
    let { filial_pk, funcionario_pk, matricula, tipo, lat, lng } = req.body;

    if (!tipo) {
      return res.status(400).json({ erro: 'O tipo da batida é obrigatório' });
    }

    // Se não veio o funcionario_pk, tenta achar pela matricula
    if (!funcionario_pk) {
        if (!matricula) {
             return res.status(400).json({ erro: 'Matrícula ou funcionario_pk é obrigatório' });
        }
        const { data: func, error: errF } = await supabase
          .from('funcionarios')
          .select('pk, nome')
          .eq('matricula', matricula)
          .eq('ativo', true)
          .single();

        if (errF || !func) {
            return res.status(404).json({ erro: 'Funcionário não encontrado ou inativo.' });
        }
        funcionario_pk = func.pk;
    }

    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('en-CA');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour12: false });

    const payload = {
      filial_pk: filial_pk || null,
      funcionario_pk,
      matricula: matricula || '',
      tipo,
      data: dataAtual,
      hora: horaAtual,
      latitude: lat || null,
      longitude: lng || null,
    };

    const { error } = await supabase.from('registro_ponto').insert([payload]);
    if (error) throw error;

    res.status(201).json({ ok: true, mensagem: 'Batida registrada com sucesso', data: dataAtual, hora: horaAtual });
  } catch (err) {
    console.error('[Ponto/Batida] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao registrar batida' });
  }
});

// 2. Opcional: Listar histórico rápido do dia para o funcionário logado
router.get('/historico-dia/:matricula', async (req, res) => {
  try {
    const { matricula } = req.params;
    const hoje = new Date().toLocaleDateString('en-CA');
    
    const { data, error } = await supabase
      .from('registro_ponto')
      .select('*, funcionarios(nome)')
      .eq('data', hoje)
      .eq('matricula', matricula)
      .order('hora', { ascending: false })
      .limit(20);
      
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Ponto/Historico] Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

// 3. Registrar batida manual (Administrador)
router.post('/batida-manual', async (req, res) => {
    try {
        const { filial_pk, funcionario_pk, matricula, tipo, data, hora } = req.body;
        
        if (!funcionario_pk || !tipo || !data || !hora) {
            return res.status(400).json({ erro: 'funcionario_pk, tipo, data e hora são obrigatórios.' })
        }

        const payload = {
            filial_pk: filial_pk || null,
            funcionario_pk,
            matricula: matricula || '',
            tipo,
            data,
            hora,
            latitude: null,
            longitude: null,
        }

        const { error } = await supabase.from('registro_ponto').insert([payload]);
        if (error) throw error;
    
        res.status(201).json({ ok: true, mensagem: 'Batida manual registrada com sucesso' });

    } catch (err) {
        console.error('[Ponto/BatidaManual] Erro:', err);
        res.status(500).json({ erro: err.message || 'Erro ao registrar batida manual' });
    }
});
// 4. Salvar e bloquear fechamento (Administrador)
router.post('/fechamento', async (req, res) => {
    try {
        const { payload, descontos } = req.body;
        
        if (!payload || !payload.funcionario_pk) {
             return res.status(400).json({ erro: 'Payload inválido.' });
        }

        const { data: fchRes, error } = await supabase.from('fechamento_ponto')
          .upsert(payload, { onConflict: 'funcionario_pk, mes, ano, quinzena' })
          .select('pk').single();
          
        if (error) throw error;
    
        // Salvar descontos associados
        await supabase.from('descontos_fechamento').delete().eq('fechamento_pk', fchRes.pk);
        if (descontos && descontos.length > 0) {
          await supabase.from('descontos_fechamento').insert(
            descontos.map(d => ({ fechamento_pk: fchRes.pk, descricao: d.descricao, valor: d.valor }))
          );
        }
    
        res.status(200).json({ ok: true, fechamento_pk: fchRes.pk, mensagem: 'Fechamento processado e bloqueado com sucesso.' });
    } catch(err) {
        console.error('[Ponto/Fechamento] Erro:', err);
        res.status(500).json({ erro: err.message || 'Erro ao processar fechamento.' });
    }
});
module.exports = router;
