import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://lflpzskcpcsfzagackuy.supabase.co';
const SUPA_KEY = 'sb_publishable_5jo3h0in7z4PPCsw4K5RjA_g-TVT_NP';

export const supabase = createClient(SUPA_URL, SUPA_KEY);

export function useSupabase() {
  return { supabase };
}
