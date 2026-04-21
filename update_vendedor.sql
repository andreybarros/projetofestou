-- Adiciona coluna vendedor_pk e vendedor na tabela vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS vendedor_pk bigint REFERENCES vendedores(pk) ON DELETE SET NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS vendedor text;
