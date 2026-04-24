import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useVendaStore = defineStore('venda', () => {
  const itens      = ref([]);
  const desconto   = ref(0);
  const pagamentos = ref([]);
  const vendedor   = ref(null);
  const cliente    = ref(null);

  const subtotal = computed(() => {
    return itens.value.reduce((sum, item) => {
      const valor = parseFloat(item.preco_total || 0);
      return sum + valor;
    }, 0);
  });

  const total = computed(() => {
    return Math.max(0, subtotal.value - parseFloat(desconto.value || 0)).toFixed(2);
  });

  const totalPago = computed(() => {
    return pagamentos.value.reduce((sum, pag) => {
      return sum + parseFloat(pag.valor || 0);
    }, 0).toFixed(2);
  });

  const faltaPagar = computed(() => {
    return Math.max(0, parseFloat(total.value) - parseFloat(totalPago.value)).toFixed(2);
  });

  function adicionarItem(item) {
    const existente = itens.value.find(i => i.produto_pk === item.produto_pk);
    if (existente) {
      existente.qtd = parseFloat(existente.qtd || 0) + parseFloat(item.qtd || 1);
      existente.preco_total = (existente.qtd * existente.preco_unitario * (1 - (existente.desconto_pct || 0) / 100)).toFixed(2);
    } else {
      itens.value.push({
        ...item,
        desconto_pct: 0,
        preco_total: (parseFloat(item.qtd || 1) * parseFloat(item.preco_unitario || 0)).toFixed(2)
      });
    }
  }

  function aplicarDescontoCategoria(categoria_pk, pct) {
    itens.value.forEach(it => {
      if (it.categoria_pk !== categoria_pk) return;
      it.desconto_pct  = parseFloat(pct) || 0;
      it.desconto_val  = parseFloat((it.qtd * it.preco_unitario * it.desconto_pct / 100).toFixed(2));
      it.preco_total   = (it.qtd * it.preco_unitario * (1 - it.desconto_pct / 100)).toFixed(2);
    });
  }

  function removerItem(index) {
    itens.value.splice(index, 1);
  }

  function atualizarQuantidade(index, novaQtd) {
    const it = itens.value[index];
    if (!it) return;
    it.qtd = parseFloat(novaQtd);
    it.preco_total = (it.qtd * it.preco_unitario * (1 - (it.desconto_pct || 0) / 100)).toFixed(2);
  }

  function atualizarDescontoItem(index, valor, tipo) {
    const it = itens.value[index];
    if (!it) return;
    const base = it.qtd * parseFloat(it.preco_unitario || 0);
    if (tipo === 'brl') {
      const brl = Math.min(parseFloat(valor) || 0, base);
      it.desconto_pct = base > 0 ? parseFloat((brl / base * 100).toFixed(4)) : 0;
      it.preco_total  = Math.max(0, base - brl).toFixed(2);
    } else {
      const pct = Math.min(parseFloat(valor) || 0, 100);
      it.desconto_pct = pct;
      it.preco_total  = (base * (1 - pct / 100)).toFixed(2);
    }
  }

  function setDesconto(novoDesconto) {
    desconto.value = Math.max(0, parseFloat(novoDesconto || 0));
  }

  function adicionarPagamento(pagamento) {
    pagamentos.value.push(pagamento);
  }

  function removerPagamento(index) {
    pagamentos.value.splice(index, 1);
  }

  function setVendedor(v) { vendedor.value = v; }
  function setCliente(c)  { cliente.value  = c; }

  function resetar() {
    itens.value      = [];
    desconto.value   = 0;
    pagamentos.value = [];
    vendedor.value   = null;
    cliente.value    = null;
  }

  return {
    itens,
    desconto,
    pagamentos,
    vendedor,
    cliente,
    subtotal,
    total,
    totalPago,
    faltaPagar,
    adicionarItem,
    removerItem,
    atualizarQuantidade,
    atualizarDescontoItem,
    aplicarDescontoCategoria,
    setDesconto,
    adicionarPagamento,
    removerPagamento,
    setVendedor,
    setCliente,
    resetar
  };
});
