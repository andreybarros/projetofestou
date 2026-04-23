import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '../composables/useSupabase';

export const useSessaoStore = defineStore('sessao', () => {
  const readStorage = (key, def) => {
    const v = localStorage.getItem(key);
    if (!v || v === 'undefined') return def;
    try { return JSON.parse(v); } catch { return def; }
  };

  const filial   = ref(readStorage('festou_filial', null));
  const operador = ref(readStorage('festou_operador', null));
  const modulos  = ref(new Set(readStorage('festou_modulos', [])));

  const isAutenticado = computed(() => !!operador.value);

  function setSessao(f, op, mods) {
    filial.value   = f;
    operador.value = op;
    modulos.value  = new Set(mods);
    localStorage.setItem('festou_filial',    JSON.stringify(f));
    localStorage.setItem('festou_operador',  JSON.stringify(op));
    localStorage.setItem('festou_modulos',   JSON.stringify(mods));
  }

  function logout() {
    filial.value   = null;
    operador.value = null;
    modulos.value  = new Set();
    localStorage.removeItem('festou_filial');
    localStorage.removeItem('festou_operador');
    localStorage.removeItem('festou_modulos');
  }

  function trocarFilial(novaFilial) {
    filial.value = novaFilial;
    localStorage.setItem('festou_filial', JSON.stringify(novaFilial));
  }

  function setModulos(mods) {
    modulos.value = new Set(mods);
    localStorage.setItem('festou_modulos', JSON.stringify(mods));
  }

  function temModulo(m) { return modulos.value.has(m); }

  return { filial, operador, modulos, isAutenticado, setSessao, logout, trocarFilial, setModulos, temModulo };
});
