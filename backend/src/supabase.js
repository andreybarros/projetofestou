const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://lflpzskcpcsfzagackuy.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_5jo3h0in7z4PPCsw4K5RjA_g-TVT_NP';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase