import { ref } from 'vue';
import { supabase } from './useSupabase';

/**
 * Soft-delete via Supabase (update ativo = false) com confirmação.
 *
 * @param {string}   tabela      - nome da tabela Supabase
 * @param {Function} aoExcluir   - callback assíncrono chamado após excluir com sucesso (ex: carregar)
 *
 * Uso:
 *   const { excluindo, excluir } = useExcluirItem('clientes', carregar)
 *   // No template: @click="excluir(cliente)"
 *   // Para usar campo diferente de "nome": excluir(produto, 'descricao')
 */
export function useExcluirItem(tabela, aoExcluir = null) {
  const excluindo = ref(false);

  async function excluir(item, campoNome = 'nome') {
    const nome = item[campoNome] || 'este registro';
    if (!confirm(`Excluir "${nome}"?`)) return false;

    excluindo.value = true;
    try {
      const { error } = await supabase
        .from(tabela)
        .update({ ativo: false })
        .eq('pk', item.pk);
      if (error) throw error;
      if (aoExcluir) await aoExcluir();
      return true;
    } catch (e) {
      console.error(`[useExcluirItem/${tabela}]`, e.message);
      alert('Erro: ' + e.message);
      return false;
    } finally {
      excluindo.value = false;
    }
  }

  return { excluindo, excluir };
}
