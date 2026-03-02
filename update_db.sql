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

-- 12. Adição da coluna Razão Social na tabela de clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razao_social text;

-- 13. Adição de Endereço e Telefone na tabela de filiais para o Cupom
ALTER TABLE filiais ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE filiais ADD COLUMN IF NOT EXISTS telefone text;

-- 14. Tabela de Vendedores (Independente de Operadores)
CREATE TABLE IF NOT EXISTS vendedores (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);


-- 15. Tabela de Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text,
  data_nascimento date,
  matricula text,
  nome_mae text,
  nome_pai text,
  salario_mensal numeric(12,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

-- 15.1 Habilitar RLS e criar política de acesso
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='funcionarios' AND policyname='func_all') THEN
    CREATE POLICY "func_all" ON funcionarios USING (true) WITH CHECK (true);
  END IF;
END $$;


-- 15.2 Adicionar permissão à tabela de operadores para acesso à nova rotina
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_funcionarios boolean DEFAULT false;

-- 16. Módulo de Ponto Eletrônico
-- 16.1 Adicionar campos de horário de trabalho na tabela de funcionários
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS hora_entrada time;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS hora_saida time;

-- 16.2 Tabela de Registro de Ponto
CREATE TABLE IF NOT EXISTS registro_ponto (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  funcionario_pk bigint REFERENCES funcionarios(pk) ON DELETE CASCADE,
  matricula text,
  tipo text NOT NULL, -- 'entrada' ou 'saida'
  data date DEFAULT CURRENT_DATE,
  hora time DEFAULT CURRENT_TIME,
  latitude numeric(10,8),
  longitude numeric(11,8),
  criado_em timestamptz DEFAULT now()
);

-- 16.3 Habilitar RLS e criar política de acesso
ALTER TABLE registro_ponto ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='registro_ponto' AND policyname='ponto_all') THEN
    CREATE POLICY "ponto_all" ON registro_ponto USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 16.4 Adicionar permissão à tabela de operadores para acesso à nova rotina
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_ponto boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS matricula text;

-- 17. Fechamento de Ponto e Banco de Horas
-- 17.1 Tabela de Fechamento de Ponto
CREATE TABLE IF NOT EXISTS fechamento_ponto (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  funcionario_pk bigint REFERENCES funcionarios(pk) ON DELETE CASCADE,
  mes int NOT NULL,
  ano int NOT NULL,
  salario_base numeric(12,2),
  horas_trabalhadas numeric(10,2) DEFAULT 0,
  horas_extras numeric(10,2) DEFAULT 0,
  valor_descontos numeric(12,2) DEFAULT 0,
  valor_horas_extras numeric(12,2) DEFAULT 0,
  total_liquido numeric(12,2) DEFAULT 0,
  observacoes text,
  saldo_anterior numeric(10,2) DEFAULT 0,
  horas_previstas numeric(10,2) DEFAULT 0,
  saldo_mes numeric(10,2) DEFAULT 0,
  saldo_acumulado numeric(10,2) DEFAULT 0,
  bloqueado boolean DEFAULT false,
  quinzena int DEFAULT 1, -- 1: 01 a 15, 2: 16 a fim do mês
  criado_em timestamptz DEFAULT now(),
  UNIQUE(funcionario_pk, mes, ano, quinzena)
);

-- 17.2 Tabela de Justificativas / Abonos
CREATE TABLE IF NOT EXISTS justificativas_ponto (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  funcionario_pk bigint REFERENCES funcionarios(pk) ON DELETE CASCADE,
  data date NOT NULL,
  tipo text NOT NULL, -- 'Atestado', 'Abono', 'Folga', etc.
  observacoes text,
  criado_em timestamptz DEFAULT now(),
  UNIQUE(funcionario_pk, data)
);

-- 17.3 Tabela de Detalhamento de Descontos (Vinculada ao Fechamento)
CREATE TABLE IF NOT EXISTS descontos_fechamento (
  pk bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fechamento_pk bigint REFERENCES fechamento_ponto(pk) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  criado_em timestamptz DEFAULT now()
);

-- 17.4 Habilitar RLS e criar políticas
ALTER TABLE fechamento_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE justificativas_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE descontos_fechamento ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fechamento_ponto' AND policyname='fechamento_all') THEN
    CREATE POLICY "fechamento_all" ON fechamento_ponto USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='justificativas_ponto' AND policyname='justificativas_all') THEN
    CREATE POLICY "justificativas_all" ON justificativas_ponto USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='descontos_fechamento' AND policyname='descontos_all') THEN
    CREATE POLICY "descontos_all" ON descontos_fechamento USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 17.4 Adicionar permissão à tabela de operadores para acesso à nova rotina
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_fechamento_ponto boolean DEFAULT false;

-- 17.5 Novos campos no cadastro de funcionários
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS carga_horaria_diaria numeric(4,2) DEFAULT 8.00;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS minutos_intervalo int DEFAULT 60;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS saldo_inicial_banco numeric(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS horas_fechamento numeric(10,2) DEFAULT 120;

-- 17.6 Atualizações para Fechamento (Banco de Horas e Quinzena)
ALTER TABLE fechamento_ponto ADD COLUMN IF NOT EXISTS saldo_anterior numeric(10,2) DEFAULT 0;
ALTER TABLE fechamento_ponto ADD COLUMN IF NOT EXISTS horas_previstas numeric(10,2) DEFAULT 0;
ALTER TABLE fechamento_ponto ADD COLUMN IF NOT EXISTS saldo_mes numeric(10,2) DEFAULT 0;
ALTER TABLE fechamento_ponto ADD COLUMN IF NOT EXISTS saldo_acumulado numeric(10,2) DEFAULT 0;
ALTER TABLE fechamento_ponto ADD COLUMN IF NOT EXISTS bloqueado boolean DEFAULT false;
ALTER TABLE fechamento_ponto ADD COLUMN IF NOT EXISTS quinzena int DEFAULT 1;

ALTER TABLE fechamento_ponto DROP CONSTRAINT IF EXISTS fechamento_ponto_funcionario_pk_mes_ano_key;
ALTER TABLE fechamento_ponto DROP CONSTRAINT IF EXISTS fechamento_ponto_funcionario_pk_mes_ano_quinzena_key;
ALTER TABLE fechamento_ponto ADD CONSTRAINT fechamento_ponto_funcionario_pk_mes_ano_quinzena_key UNIQUE(funcionario_pk, mes, ano, quinzena);

NOTIFY pgrst, 'reload schema';

