import { ref } from 'vue';

const _fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function useFormatacao() {
  function fmt(v) {
    try { return _fmtBRL.format(v || 0); } catch { return 'R$ 0,00'; }
  }

  function fmtData(data) {
    if (!data) return '—';
    return data.split('-').reverse().join('/');
  }

  function fmtNum(v, decimais = 2) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimais,
      maximumFractionDigits: decimais,
    }).format(v || 0);
  }

  return { fmt, fmtData, fmtNum };
}
