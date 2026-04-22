-- ============================================================
-- Agenda — estrutura completa da tabela
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS agenda (
  pk          bigserial   PRIMARY KEY,
  filial_pk   bigint,
  titulo      text        NOT NULL,
  descricao   text,
  data_inicio date        NOT NULL,
  data_fim    date,
  hora_inicio time,
  hora_fim    time,
  tipo        text        DEFAULT 'manual',
  venda_pk    bigint      REFERENCES vendas(pk) ON DELETE SET NULL,
  cor         text,
  criado_em   timestamptz DEFAULT now()
);

-- Garante colunas mesmo que a tabela já existisse parcialmente
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS filial_pk   bigint;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS titulo      text;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS descricao   text;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS data_fim    date;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS hora_inicio time;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS hora_fim    time;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS tipo        text DEFAULT 'manual';
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS venda_pk    bigint;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS cor         text;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS criado_em   timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_agenda_filial ON agenda(filial_pk);
CREATE INDEX IF NOT EXISTS idx_agenda_data   ON agenda(data_inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_venda  ON agenda(venda_pk);

ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_agenda" ON agenda;
CREATE POLICY "anon_all_agenda" ON agenda
  FOR ALL TO anon USING (true) WITH CHECK (true);
