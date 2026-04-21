-- ============================================================
-- CORREÇÃO: armazem_pk e endereco_armazem_pk em produtos
-- Motivo: Colunas foram criadas como UUID pelo painel Supabase,
--         mas armazem.pk e endereco_armazem.pk são BIGINT.
--         Isso causava: invalid input syntax for type uuid: "6"
-- ============================================================

-- Remove as colunas com tipo errado (UUID)
ALTER TABLE produtos
  DROP COLUMN IF EXISTS armazem_pk,
  DROP COLUMN IF EXISTS endereco_armazem_pk;

-- Recria como BIGINT (compatível com as PKs das tabelas de armazém)
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS armazem_pk          bigint,
  ADD COLUMN IF NOT EXISTS endereco_armazem_pk bigint;

-- Notifica o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
