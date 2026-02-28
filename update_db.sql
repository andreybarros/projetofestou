-- ============================================================
-- SQL para criar o Módulo Financeiro
-- ============================================================

-- 1. Tabela de Contas Bancárias / Caixa
CREATE TABLE IF NOT EXISTS contas_bancarias (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome text NOT NULL, -- Ex: "Caixa Físico", "Nubank", "Itaú"
  tipo text NOT NULL, -- "caixa" ou "banco"
  saldo numeric(12,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contas_bancarias' AND policyname='contas_all') THEN
    CREATE POLICY "contas_all" ON contas_bancarias USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Tabela de Movimentações Financeiras
CREATE TABLE IF NOT EXISTS movimentacoes_financeiras (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conta_pk bigint REFERENCES contas_bancarias(pk) ON DELETE CASCADE,
  venda_pk bigint REFERENCES vendas(pk) ON DELETE SET NULL, -- Se originado de venda
  tipo_movimento text NOT NULL, -- "entrada" ou "saida"
  valor numeric(12,2) DEFAULT 0,
  descricao text,
  data_movimento timestamptz DEFAULT now(),
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movimentacoes_financeiras' AND policyname='mov_all') THEN
    CREATE POLICY "mov_all" ON movimentacoes_financeiras USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Trigger para atualizar o saldo da conta automaticamente ao inserir movimentação
CREATE OR REPLACE FUNCTION fechar_saldo_conta()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_movimento = 'entrada' THEN
    UPDATE contas_bancarias SET saldo = saldo + NEW.valor WHERE pk = NEW.conta_pk;
  ELSIF NEW.tipo_movimento = 'saida' THEN
    UPDATE contas_bancarias SET saldo = saldo - NEW.valor WHERE pk = NEW.conta_pk;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_atualiza_saldo') THEN
    CREATE TRIGGER trg_atualiza_saldo
    AFTER INSERT ON movimentacoes_financeiras
    FOR EACH ROW
    EXECUTE FUNCTION fechar_saldo_conta();
  END IF;
END $$;

-- 4. Alteração na tabela de pagamentos_venda para vincular a conta destino
ALTER TABLE pagamentos_venda ADD COLUMN IF NOT EXISTS conta_pk bigint REFERENCES contas_bancarias(pk) ON DELETE SET NULL;

-- 5. Adição das colunas de preços de Custo e Venda na tabela produtos
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS preco_custo numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_venda numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS markup numeric(6,2) DEFAULT 0;

-- 6. Adição das colunas de Locação na tabela de vendas
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS tipo_venda text DEFAULT 'venda', -- 'venda' ou 'locacao'
ADD COLUMN IF NOT EXISTS data_locacao timestamp without time zone,
ADD COLUMN IF NOT EXISTS data_devolucao_prevista timestamp without time zone,
ADD COLUMN IF NOT EXISTS status_locacao text; -- 'pendente', 'devolvida' (apenas para tipo = locacao)

-- 7. Adição da coluna venda_pk na agenda para vinculação de Locação
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS venda_pk bigint REFERENCES vendas(pk) ON DELETE SET NULL;

-- 8. Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome text NOT NULL,
  cnpj_cpf text,
  telefone text,
  email text,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fornecedores' AND policyname='forn_all') THEN
    CREATE POLICY "forn_all" ON fornecedores USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. Tabela de Despesas (Contas a Pagar)
CREATE TABLE IF NOT EXISTS despesas (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  fornecedor_pk bigint REFERENCES fornecedores(pk) ON DELETE SET NULL,
  conta_pk bigint REFERENCES contas_bancarias(pk) ON DELETE SET NULL,
  descricao text NOT NULL,
  categoria text,
  valor numeric(12,2) DEFAULT 0,
  vencimento date NOT NULL,
  status text DEFAULT 'pendente', -- 'pendente', 'paga'
  data_pagamento timestamptz,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='despesas' AND policyname='desp_all') THEN
    CREATE POLICY "desp_all" ON despesas USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 10. Adição de colunas para Crediário na tabela de vendas
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS data_vencimento_crediario date,
ADD COLUMN IF NOT EXISTS status_crediario text; -- 'pendente', 'recebido'

-- 11. Novas permissões por rotina na tabela operadores
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_historico boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_receitas boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_categorias boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_despesas boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_financeiro boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
