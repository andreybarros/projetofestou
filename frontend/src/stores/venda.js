import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'pdv_carrinho';

function salvarStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function carregarStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const useVendaStore = defineStore('venda', () => {
  const _salvo = carregarStorage();

  const itens      = ref(_salvo?.itens      || []);
  const desconto   = ref(_salvo?.desconto   || 0);
  const pagamentos = ref(_salvo?.pagamentos || []);
  const vendedor   = ref(_salvo?.vendedor   || null);
  const cliente    = ref(_salvo?.cliente    || null);

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

  // Persiste qualquer mudança no localStorage
  watch(
    [itens, desconto, pagamentos, vendedor, cliente],
    () => salvarStorage({
      itens:      itens.value,
      desconto:   desconto.value,
      pagamentos: pagamentos.value,
      vendedor:   vendedor.value,
      cliente:    cliente.value,
    }),
    { deep: true }
  );

  function adicionarItem(item) {
    const existente = itens.value.find(i => i.produto_pk === item.produto_pk);
    if (existente) {
      existente.qtd = parseFloat(existente.qtd || 0) + parseFloat(item.qtd || 1);
      existente.preco_total = (existente.qtd * existente.preco_unitario * (1 - (existente.desconto_pct || 0) / 100)).toFixed(2);
    } else {
      const uni = parseFloat(item.preco_unitario || 0);
      const qty = parseFloat(item.qtd || 1);
      itens.value.push({
        ...item,
        preco_unitario: uni,
        desconto_pct: 0,
        desconto_val: 0,
        preco_total: (qty * uni).toFixed(2),
      });
    }
  }

  function aplicarDescontoCategoria(categoria_pk, pct) {
    itens.value.forEach(it => {
      if (Number(it.categoria_pk) !== Number(categoria_pk)) return;
      const uni = parseFloat(it.preco_unitario);
      const qty = parseFloat(it.qtd);
      const d   = parseFloat(pct) || 0;
      it.desconto_pct = d;
      it.desconto_val = parseFloat((qty * uni * d / 100).toFixed(2));
      it.preco_total  = (qty * uni * (1 - d / 100)).toFixed(2);
    });
  }

  function removerDescontoCategoria(categoria_pk) {
    itens.value.forEach(it => {
      if (Number(it.categoria_pk) !== Number(categoria_pk)) return;
      const uni = parseFloat(it.preco_unitario);
      const qty = parseFloat(it.qtd);
      it.desconto_pct = 0;
      it.desconto_val = 0;
      it.preco_total  = (qty * uni).toFixed(2);
    });
  }

  function removerItem(index) {
    itens.value.splice(index, 1);
  }

  function atualizarQuantidade(index, novaQtd) {
    const it = itens.value[index];
    if (!it) return;
    const qty = parseFloat(novaQtd);
    const uni = parseFloat(it.preco_unitario);
    it.qtd         = qty;
    it.desconto_val = parseFloat((qty * uni * (it.desconto_pct || 0) / 100).toFixed(2));
    it.preco_total  = (qty * uni * (1 - (it.desconto_pct || 0) / 100)).toFixed(2);
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
    localStorage.removeItem(STORAGE_KEY);
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
    removerDescontoCategoria,
    setDesconto,
    adicionarPagamento,
    removerPagamento,
    setVendedor,
    setCliente,
    resetar
  };
});
