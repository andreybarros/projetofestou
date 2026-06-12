import { ref, computed, watch } from 'vue';

/**
 * Encapsula busca textual + paginação para listas.
 *
 * @param {Ref<Array>} listaSource  - ref da lista completa
 * @param {Function}   filtrarFn   - (items, busca) => items filtrados
 * @param {number}     porPagina   - itens por página (padrão 20)
 *
 * Uso:
 *   const { busca, pagina, paginados, totalPaginas, resumoInfo, paginacaoVisiveis, irPara } =
 *     useListaPaginada(lista, (items, q) => {
 *       const lower = q.trim().toLowerCase()
 *       return lower
 *         ? items.filter(c => (c.nome || '').toLowerCase().includes(lower))
 *         : items
 *     })
 *
 * Filtros extras (abas, categorias): apenas resete `pagina.value = 1` no watch da view.
 */
export function useListaPaginada(listaSource, filtrarFn, porPagina = 20) {
  const busca  = ref('');
  const pagina = ref(1);

  const filtrados = computed(() => filtrarFn(listaSource.value, busca.value));

  const totalPaginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / porPagina)));

  const paginados = computed(() => {
    const ini = (pagina.value - 1) * porPagina;
    return filtrados.value.slice(ini, ini + porPagina);
  });

  const resumoInfo = computed(() => {
    if (!filtrados.value.length) return '0–0';
    const ini = (pagina.value - 1) * porPagina + 1;
    const fim = Math.min(pagina.value * porPagina, filtrados.value.length);
    return `${ini}–${fim}`;
  });

  const paginacaoVisiveis = computed(() => {
    const tp = totalPaginas.value;
    const p  = pagina.value;
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
    const pages = [1];
    if (p > 3) pages.push('...');
    for (let i = Math.max(2, p - 1); i <= Math.min(tp - 1, p + 1); i++) pages.push(i);
    if (p < tp - 2) pages.push('...');
    pages.push(tp);
    return pages;
  });

  watch(busca, () => { pagina.value = 1; });

  function irPara(p) {
    if (p >= 1 && p <= totalPaginas.value) pagina.value = p;
  }

  return { busca, pagina, filtrados, totalPaginas, paginados, resumoInfo, paginacaoVisiveis, irPara };
}
