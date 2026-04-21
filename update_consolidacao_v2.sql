-- ============================================================
-- Consolidação de Recebimentos v2 — tabela independente
-- Permite recebimentos com ou sem venda vinculada
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Remove colunas da abordagem anterior (se existirem)
ALTER TABLE pagamentos_venda
  DROP COLUMN IF EXISTS confirmado,
  DROP COLUMN IF EXISTS data_recebimento,
  DROP COLUMN IF EXISTS conta_pk,
  DROP COLUMN IF EXISTS obs_recebimento,
  DROP COLUMN IF EXISTS confirmado_em;

-- Tabela standalone de recebimentos
CREATE TABLE IF NOT EXISTS recebimentos (
  pk               bigserial   PRIMARY KEY,
  filial_pk        bigint,
  pagamento_pk     bigint      REFERENCES pagamentos_venda(pk) ON DELETE SET NULL,
  venda_pk         bigint,
  conta_pk         bigint,
  data_recebimento date        NOT NULL,
  valor            numeric(12,2) NOT NULL,
  forma            text,
  descricao        text,
  criado_em        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recebimentos_filial   ON recebimentos(filial_pk);
CREATE INDEX IF NOT EXISTS idx_recebimentos_pagamento ON recebimentos(pagamento_pk);
CREATE INDEX IF NOT EXISTS idx_recebimentos_data      ON recebimentos(data_recebimento);

ALTER TABLE recebimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_recebimentos" ON recebimentos;
CREATE POLICY "anon_all_recebimentos" ON recebimentos
  FOR ALL TO anon USING (true) WITH CHECK (true);
