import { ref } from 'vue';
import { supabase } from './useSupabase';
import { useSessaoStore } from '../stores/sessao';

/**
 * Encapsula carregamento via Supabase com estado carregando/erro.
 *
 * Uso:
 *   const { carregando, erro, carregar } = useCarregaSupabase()
 *   const lista = ref([])
 *
 *   async function buscarClientes() {
 *     await executar((sb, filialPk) => {
 *       let q = sb.from('clientes').select('pk, nome').eq('ativo', true).order('nome')
 *       if (filialPk) q = q.eq('filial_pk', filialPk)
 *       return q
 *     }, lista)
 *   }
 */
export function useCarregaSupabase() {
  const sessao = useSessaoStore();
  const carregando = ref(false);
  const erro = ref(null);

  async function executar(queryFn, destino) {
    carregando.value = true;
    erro.value = null;
    try {
      const { data, error } = await queryFn(supabase, sessao.filial?.pk);
      if (error) throw error;
      destino.value = data || [];
    } catch (e) {
      erro.value = e.message;
      console.error('[useCarregaSupabase]', e.message);
    } finally {
      carregando.value = false;
    }
  }

  return { carregando, erro, executar };
}
