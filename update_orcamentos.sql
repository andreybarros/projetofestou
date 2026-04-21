-- Adiciona campo memo ao orçamento (armazena JSON do carrinho para reimportação)
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS memo text;
