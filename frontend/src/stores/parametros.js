import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '../composables/useSupabase';

export const useParametrosStore = defineStore('parametros', () => {
  const mapa = ref({});
  const carregado = ref(false);

  function getParam(chave, padrao = null) {
    const val = mapa.value[chave];
    if (val === undefined || val === null) return padrao;
    if (val === 'true')  return true;
    if (val === 'false') return false;
    const n = Number(val);
    if (!isNaN(n) && val.trim() !== '') return n;
    return val;
  }

  async function carregar(filial_pk) {
    const { data } = await supabase
      .from('parametros')
      .select('chave, valor, filial_pk')
      .or(`filial_pk.is.null,filial_pk.eq.${filial_pk}`);

    const novo = {};
    // Globals primeiro, filial sobrescreve
    (data || []).filter(p => p.filial_pk === null).forEach(p => novo[p.chave] = p.valor);
    (data || []).filter(p => p.filial_pk !== null).forEach(p => novo[p.chave] = p.valor);
    mapa.value = novo;
    carregado.value = true;
  }

  async function salvar(chave, valor, filial_pk = null) {
    const valorStr = String(valor);
    // Busca registro existente
    let q = supabase.from('parametros').select('pk').eq('chave', chave);
    if (filial_pk === null) q = q.is('filial_pk', null);
    else q = q.eq('filial_pk', filial_pk);
    const { data: existente } = await q.maybeSingle();

    if (existente) {
      await supabase.from('parametros')
        .update({ valor: valorStr, updated_at: new Date().toISOString() })
        .eq('pk', existente.pk);
    } else {
      await supabase.from('parametros')
        .insert({ filial_pk, chave, valor: valorStr });
    }
    mapa.value[chave] = valorStr;
  }

  return { mapa, carregado, getParam, carregar, salvar };
});
