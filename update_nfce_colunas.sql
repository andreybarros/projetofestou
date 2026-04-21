-- ══════════════════════════════════════════════════════════════
-- Festou — Colunas NFC-e na tabela vendas
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS nfce_chave       TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_protocolo   TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_status      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_motivo      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_numero      INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_ambiente    TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_dh_emissao  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_cpf_dest    TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_xml         TEXT    DEFAULT NULL;
