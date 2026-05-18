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
    const dataAtual = req.body.data || agora.toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
    const horaAtual = req.body.hora || agora.toLocaleTimeString('pt-BR', { hour12: false, timeZone: 'America/Manaus' });

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
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
    
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
// 5. Listar funcionários (com último fechamento)
router.get('/funcionarios', async (req, res) => {
  try {
    const { filial_pk } = req.query;
    let q = supabase.from('funcionarios').select('*').eq('ativo', true).order('nome');
    if (filial_pk) q = q.or(`filial_pk.eq.${parseInt(filial_pk)},filial_pk.is.null`);
    const { data, error } = await q;
    if (error) throw error;

    const funcs = data || [];
    let ultimosFech = {};
    if (funcs.length) {
      const pks = funcs.map(f => f.pk);
      const { data: fechs } = await supabase
        .from('fechamento_ponto')
        .select('funcionario_pk, mes, ano, quinzena, bloqueado')
        .in('funcionario_pk', pks)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })
        .order('quinzena', { ascending: false });
      (fechs || []).forEach(r => {
        if (!ultimosFech[r.funcionario_pk]) {
          ultimosFech[r.funcionario_pk] = { mes: r.mes, ano: r.ano, quinzena: r.quinzena, bloqueado: r.bloqueado };
        }
      });
    }

    res.json({ ok: true, data: funcs, ultimosFech });
  } catch (err) {
    console.error('[Ponto/Funcionarios] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ── Lógica de cálculo do período (regras de negócio) ─────────────────────────
function timeToSec(t) {
  const [h, m] = String(t).trim().substring(0, 5).split(':');
  return +h * 3600 + +m * 60;
}

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function calcularPeriodo({ func, punches, justs, saldoAnt, toleranciaMin, dataIni, dataFim }) {
  const cargaSec  = (func.carga_horaria_diaria || 8) * 3600;
  const intSec    = (func.minutos_intervalo || 60) * 60;
  const tolerSec  = (toleranciaMin ?? 15) * 60;

  const diasMap = {};
  punches.forEach(p => {
    if (!diasMap[p.data]) diasMap[p.data] = [];
    diasMap[p.data].push(p.hora.substring(0, 5));
  });

  const justMap = {};
  justs.forEach(j => { justMap[j.data] = j; });

  let prevTot = 0, trabTot = 0, missingSec = 0;
  let extraSecNormal = 0, extraSecDomingo = 0, diasPagos = 0;
  const dias = [];

  const dIni = new Date(dataIni + 'T00:00:00');
  const dFim = new Date(dataFim + 'T00:00:00');

  for (let dt = new Date(dIni); dt <= dFim; dt.setDate(dt.getDate() + 1)) {
    const dtStr    = dt.toISOString().split('T')[0];
    const isDomingo = dt.getDay() === 0;
    const dayName  = DAYS_PT[dt.getDay()];
    const dia      = dt.getDate();

    const just = justMap[dtStr] || null;
    const bats = diasMap[dtStr] || [];

    // Previsto: diaristas e domingos não têm expectativa. Justificativas (exceto Falta) zeram previsto.
    let previsto = (func.diarista || isDomingo) ? 0 : cargaSec;
    if (just && just.tipo !== 'Falta') previsto = 0;

    let trabalhado = 0;
    if (bats.length >= 2) {
      let ent = timeToSec(bats[0]);
      let sai = timeToSec(bats[bats.length - 1]);

      const normTime = t => t ? String(t).trim().substring(0, 5) : null;
      let entPrev = normTime(func.hora_entrada) ? timeToSec(normTime(func.hora_entrada)) : null;
      let saiPrev = normTime(func.hora_saida)   ? timeToSec(normTime(func.hora_saida))   : null;

      if (entPrev === null && saiPrev !== null) entPrev = saiPrev - cargaSec - intSec;
      if (saiPrev === null && entPrev !== null) saiPrev = entPrev + cargaSec + intSec;

      // Tolerância CLT Art. 58 §1º
      if (entPrev !== null && ent < entPrev && (entPrev - ent) <= tolerSec) ent = entPrev;
      if (saiPrev !== null && sai > saiPrev && (sai - saiPrev) <= tolerSec) sai = saiPrev;

      trabalhado = Math.max(0, sai - ent - intSec);
    }

    const diff = trabalhado - previsto;
    prevTot  += previsto;
    trabTot  += trabalhado;

    const isPaidJust = just && ['Abono', 'Atestado Médico', 'Folga'].includes(just.tipo);

    // Horas extras
    if (isDomingo && trabalhado > 0) {
      extraSecDomingo += trabalhado;
    } else if (diff > 0) {
      extraSecNormal += diff;
    }

    // Faltas mensalistas — só desconta se o dia era esperado (previsto > 0)
    // Feriados e folgas justificadas têm previsto=0 e não geram desconto de salário
    if (!func.diarista && previsto > 0 && trabalhado < cargaSec && !isPaidJust) {
      missingSec += (cargaSec - trabalhado);
    }

    // Dias pagos diaristas
    if (func.diarista && (isPaidJust || (bats.length >= 2 && trabalhado > 0))) diasPagos++;

    dias.push({ dtStr, dia, dayName, isDomingo, previsto, trabalhado, diff, batidas: bats, just });
  }

  const saldoMes         = (trabTot - prevTot) / 3600;
  const extraNormalHRound = parseFloat((extraSecNormal  / 3600).toFixed(2));
  const extraDomRawHRound = parseFloat((extraSecDomingo / 3600).toFixed(2));
  const saldoAcum        = (saldoAnt || 0) + extraNormalHRound + extraDomRawHRound;

  return {
    summaries: {
      previsto: prevTot,
      trabalhado: trabTot,
      saldoMes,
      saldoAcum,
      missingSec,
      extraSecNormal,
      extraSecDomingo,
      extraSec: extraSecNormal + extraSecDomingo * 2,
      diasPagos,
    },
    dias,
  };
}

// 6. Dados completos do fechamento de um período (inclui cálculo do período)
router.get('/fechamento-dados', async (req, res) => {
  try {
    const { funcionario_pk, mes, ano, quinzena } = req.query;
    if (!funcionario_pk || !mes || !ano || !quinzena) {
      return res.status(400).json({ erro: 'funcionario_pk, mes, ano e quinzena são obrigatórios' });
    }
    const fpk = parseInt(funcionario_pk);
    const m1  = parseInt(mes), a1 = parseInt(ano), q1 = parseInt(quinzena);

    const diaIni  = q1 === 1 ? '01' : '16';
    const dataIni = `${a1}-${String(m1).padStart(2, '0')}-${diaIni}`;
    const dataFim = q1 === 1
      ? `${a1}-${String(m1).padStart(2, '0')}-15`
      : new Date(a1, m1, 0).toISOString().split('T')[0];

    const antQ = q1 === 1 ? 2 : 1;
    const antM = q1 === 1 ? (m1 === 1 ? 12 : m1 - 1) : m1;
    const antA = q1 === 1 ? (m1 === 1 ? a1 - 1 : a1) : a1;

    const [resFch, resFchAnt, resFunc, resP, resJ, resTol, resExtra, resDom] = await Promise.all([
      supabase.from('fechamento_ponto').select('*')
        .eq('funcionario_pk', fpk).eq('mes', m1).eq('ano', a1).eq('quinzena', q1).maybeSingle(),
      supabase.from('fechamento_ponto').select('saldo_acumulado')
        .eq('funcionario_pk', fpk).eq('mes', antM).eq('ano', antA).eq('quinzena', antQ).maybeSingle(),
      supabase.from('funcionarios').select('*').eq('pk', fpk).single(),
      supabase.from('registro_ponto').select('*')
        .eq('funcionario_pk', fpk).gte('data', dataIni).lte('data', dataFim).order('data').order('hora'),
      supabase.from('justificativas_ponto').select('*')
        .eq('funcionario_pk', fpk).gte('data', dataIni).lte('data', dataFim),
      supabase.from('parametros_sistema').select('valor').eq('chave', 'ponto_tolerancia_minutos').maybeSingle(),
      supabase.from('parametros_sistema').select('valor').eq('chave', 'ponto_adicional_hora_extra').maybeSingle(),
      supabase.from('parametros_sistema').select('valor').eq('chave', 'ponto_adicional_hora_domingo').maybeSingle(),
    ]);

    if (!resFunc.data) return res.status(404).json({ erro: 'Funcionário não encontrado' });

    const fch = resFch.data;
    let descontos = [];
    if (fch?.pk) {
      const { data: desc } = await supabase.from('descontos_fechamento').select('*').eq('fechamento_pk', fch.pk);
      descontos = desc || [];
    }

    const func          = resFunc.data;
    const saldoAnt      = Math.max(0, resFchAnt.data?.saldo_acumulado ?? (func.saldo_inicial_banco || 0));
    const toleranciaMin = parseInt(resTol.data?.valor  ?? 15);
    const adicionalExtraPct   = parseFloat(resExtra.data?.valor ?? 60);
    const adicionalDomingoPct = parseFloat(resDom.data?.valor   ?? 100);

    const { summaries, dias } = calcularPeriodo({
      func, punches: resP.data || [], justs: resJ.data || [],
      saldoAnt, toleranciaMin, dataIni, dataFim,
    });

    // ── Cálculos financeiros ───────────────────────────────────────────────
    const horasFechamento = func.horas_fechamento > 0 ? func.horas_fechamento : 220;
    let salarioProporcional, valorHoraBase, valorHoraNormal, valorHoraDomingo;

    if (func.diarista) {
      salarioProporcional = parseFloat((summaries.diasPagos * (func.valor_diaria || 0)).toFixed(2));
      valorHoraBase       = func.valor_diaria || 0;
      valorHoraNormal     = 0;
      valorHoraDomingo    = 0;
    } else {
      valorHoraBase    = (func.salario_mensal || 0) / horasFechamento;
      valorHoraNormal  = parseFloat((valorHoraBase * (1 + adicionalExtraPct   / 100)).toFixed(2));
      valorHoraDomingo = parseFloat((valorHoraBase * (1 + adicionalDomingoPct / 100)).toFixed(2));
      const salBase    = (func.salario_mensal || 0) / 2;
      const deducao    = (summaries.missingSec / 3600) * valorHoraBase;
      salarioProporcional = parseFloat(Math.max(0, salBase - deducao).toFixed(2));
    }

    res.json({
      ok: true,
      fechamento:               fch || null,
      saldo_acumulado_anterior: resFchAnt.data?.saldo_acumulado ?? null,
      punches:                  resP.data  || [],
      justs:                    resJ.data  || [],
      descontos,
      summaries: {
        ...summaries,
        saldoAnt,
        baseSalary:           func.salario_mensal || func.valor_diaria || 0,
        horasFechamento,
        adicionalExtraPct,
        adicionalDomingoPct,
        valorHoraBase:        parseFloat(valorHoraBase.toFixed(4)),
        valorHoraNormal,
        valorHoraDomingo,
        salarioProporcional,
      },
      dias,
    });
  } catch (err) {
    console.error('[Ponto/FechamentoDados] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 7. Batidas de um dia específico
router.get('/batidas-dia', async (req, res) => {
  try {
    const { funcionario_pk, data } = req.query;
    if (!funcionario_pk || !data) return res.status(400).json({ erro: 'funcionario_pk e data obrigatórios' });
    const { data: rows, error } = await supabase
      .from('registro_ponto').select('*')
      .eq('funcionario_pk', parseInt(funcionario_pk)).eq('data', data).order('hora');
    if (error) throw error;
    res.json({ ok: true, data: rows || [] });
  } catch (err) {
    console.error('[Ponto/BatidasDia] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 8. Remover batida
router.delete('/batidas/:pk', async (req, res) => {
  try {
    const { error } = await supabase.from('registro_ponto').delete().eq('pk', parseInt(req.params.pk));
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Ponto/RemoverBatida] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 9. Salvar justificativa (tipo vazio = remover)
router.post('/justificativa', async (req, res) => {
  try {
    const { funcionario_pk, filial_pk, data, tipo, observacoes } = req.body;
    if (!funcionario_pk || !data) return res.status(400).json({ erro: 'funcionario_pk e data obrigatórios' });
    if (!tipo) {
      const { error } = await supabase.from('justificativas_ponto')
        .delete().eq('funcionario_pk', parseInt(funcionario_pk)).eq('data', data);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('justificativas_ponto').upsert({
        funcionario_pk: parseInt(funcionario_pk),
        filial_pk:      filial_pk || null,
        data,
        tipo,
        observacoes:    observacoes || null,
      }, { onConflict: 'funcionario_pk, data' });
      if (error) throw error;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[Ponto/Justificativa] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 10. Enviar espelho para aprovação
router.post('/espelho', async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload?.funcionario_pk) return res.status(400).json({ erro: 'Payload inválido.' });
    const { error } = await supabase.from('fechamento_ponto')
      .upsert({ ...payload, espelho_status: 'enviado' }, { onConflict: 'funcionario_pk, mes, ano, quinzena' });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Ponto/Espelho] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 11. Desbloquear período
router.patch('/desbloquear', async (req, res) => {
  try {
    const { funcionario_pk, mes, ano, quinzena } = req.body;
    if (!funcionario_pk || !mes || !ano || !quinzena) return res.status(400).json({ erro: 'Dados incompletos.' });
    const { error } = await supabase.from('fechamento_ponto')
      .update({ bloqueado: false })
      .eq('funcionario_pk', parseInt(funcionario_pk))
      .eq('mes', parseInt(mes)).eq('ano', parseInt(ano)).eq('quinzena', parseInt(quinzena));
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Ponto/Desbloquear] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 12. Vales de um funcionário (aprovado/pago)
router.get('/vales-funcionario', async (req, res) => {
  try {
    const { funcionario_pk, nome } = req.query;
    if (!funcionario_pk) return res.status(400).json({ erro: 'funcionario_pk obrigatório' });
    const [r1, r2] = await Promise.all([
      supabase.from('vales').select('*')
        .eq('funcionario_pk', parseInt(funcionario_pk))
        .in('status', ['aprovado', 'pago']).order('solicitado_em'),
      nome
        ? supabase.from('vales').select('*')
            .is('funcionario_pk', null).ilike('funcionario_nome', nome)
            .in('status', ['aprovado', 'pago']).order('solicitado_em')
        : Promise.resolve({ data: [] }),
    ]);
    const todos = [...(r1.data || []), ...(r2.data || [])];
    const seen  = new Set();
    const data  = todos.filter(v => { if (seen.has(v.pk)) return false; seen.add(v.pk); return true; });
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[Ponto/ValesFuncionario] Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
