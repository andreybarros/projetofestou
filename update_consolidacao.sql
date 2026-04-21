-- ============================================================
-- Consolidação de Recebimentos — colunas em pagamentos_venda
-- Execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE pagamentos_venda
  ADD COLUMN IF NOT EXISTS confirmado       boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_recebimento date,
  ADD COLUMN IF NOT EXISTS conta_pk         bigint,
  ADD COLUMN IF NOT EXISTS obs_recebimento  text,
  ADD COLUMN IF NOT EXISTS confirmado_em    timestamptz;

CREATE INDEX IF NOT EXISTS idx_pv_confirmado ON pagamentos_venda(confirmado);

-- RLS (mesma política da tabela, anon com acesso total)
ALTER TABLE pagamentos_venda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_pagamentos_venda" ON pagamentos_venda;
CREATE POLICY "anon_all_pagamentos_venda" ON pagamentos_venda
  FOR ALL TO anon USING (true) WITH CHECK (true);
