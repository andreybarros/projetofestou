-- ============================================================
-- FESTOU — Script de Implantação do Banco de Dados
-- Supabase (PostgreSQL)
--
-- INSTRUÇÕES:
--   1. Acesse o SQL Editor do Supabase
--   2. Execute este arquivo inteiro de uma vez
--   3. Todas as operações usam IF NOT EXISTS / IF EXISTS
--      e são seguras para rodar em banco já existente
--
-- PRÉ-REQUISITOS (tabelas que devem existir antes de executar):
--   filiais, operadores, clientes, produtos, categorias,
--   armazens, endereco_armazem, vendas, pagamentos_venda,
--   itens_venda
--
-- ORDEM DAS SEÇÕES:
--   1.  Agenda
--   2.  Módulo Financeiro (contas, movimentações, fornecedores,
--       despesas, vendedores, funcionários, ponto, fechamento)
--   3.  Correção de FK Armazém
--   4.  Módulo Caixa Operacional
--   5.  Fiscal / NFC-e
--   6.  Orçamentos
--   7.  Campos Adicionais
--   8.  Consolidação de Recebimentos
--   9.  Parâmetros
--   10. Permissões de Operadores
--   11. Backfill de Permissões (operadores existentes)
-- ============================================================



-- ============================================================
-- SEÇÃO 1 — AGENDA
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
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS descricao   text;
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS data_evento date;
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



-- ============================================================
-- SEÇÃO 2 — MÓDULO FINANCEIRO
-- ============================================================

-- 2.1 Contas Bancárias / Caixa
CREATE TABLE IF NOT EXISTS contas_bancarias (
  pk         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk  bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome       text NOT NULL,
  tipo       text NOT NULL, -- "caixa" ou "banco"
  saldo      numeric(12,2) DEFAULT 0,
  ativo      boolean DEFAULT true,
  criado_em  timestamptz DEFAULT now()
);
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contas_bancarias' AND policyname='contas_all') THEN
    CREATE POLICY "contas_all" ON contas_bancarias USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.2 Movimentações Financeiras
CREATE TABLE IF NOT EXISTS movimentacoes_financeiras (
  pk              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conta_pk        bigint REFERENCES contas_bancarias(pk) ON DELETE CASCADE,
  venda_pk        bigint REFERENCES vendas(pk) ON DELETE SET NULL,
  tipo_movimento  text NOT NULL, -- "entrada" ou "saida"
  valor           numeric(12,2) DEFAULT 0,
  descricao       text,
  data_movimento  timestamptz DEFAULT now(),
  criado_em       timestamptz DEFAULT now()
);
ALTER TABLE movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movimentacoes_financeiras' AND policyname='mov_all') THEN
    CREATE POLICY "mov_all" ON movimentacoes_financeiras USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.3 Trigger para atualizar saldo da conta ao inserir movimentação
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

-- 2.4 Vincula conta de destino aos pagamentos de venda
ALTER TABLE pagamentos_venda ADD COLUMN IF NOT EXISTS conta_pk bigint REFERENCES contas_bancarias(pk) ON DELETE SET NULL;

-- 2.5 Preço de custo e markup nos produtos
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS preco_custo  numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_venda  numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup       numeric(6,2)  DEFAULT 0;

-- 2.6 Locação nas vendas
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS tipo_venda                text    DEFAULT 'venda',
  ADD COLUMN IF NOT EXISTS data_locacao              timestamp without time zone,
  ADD COLUMN IF NOT EXISTS data_devolucao_prevista   timestamp without time zone,
  ADD COLUMN IF NOT EXISTS data_devolucao_real       timestamp without time zone,
  ADD COLUMN IF NOT EXISTS status_locacao            text,
  ADD COLUMN IF NOT EXISTS taxa_realocacao_cobrada   numeric(12,2),
  ADD COLUMN IF NOT EXISTS canal_venda               text    DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS data_vencimento_crediario date,
  ADD COLUMN IF NOT EXISTS status_crediario          text;

-- 2.7 Vinculação de locação na agenda
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS venda_pk bigint REFERENCES vendas(pk) ON DELETE SET NULL;

-- 2.7.1 Observação em locações
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS observacao text;

-- 2.8 Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  pk         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk  bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome       text NOT NULL,
  cnpj_cpf   text,
  telefone   text,
  email      text,
  criado_em  timestamptz DEFAULT now()
);
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fornecedores' AND policyname='forn_all') THEN
    CREATE POLICY "forn_all" ON fornecedores USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.9 Despesas (Contas a Pagar)
CREATE TABLE IF NOT EXISTS despesas (
  pk              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk       bigint REFERENCES filiais(pk)       ON DELETE CASCADE,
  fornecedor_pk   bigint REFERENCES fornecedores(pk)  ON DELETE SET NULL,
  conta_pk        bigint REFERENCES contas_bancarias(pk) ON DELETE SET NULL,
  descricao       text NOT NULL,
  categoria       text,
  valor           numeric(12,2) DEFAULT 0,
  vencimento      date NOT NULL,
  status          text DEFAULT 'pendente', -- 'pendente', 'paga'
  data_pagamento  timestamptz,
  criado_em       timestamptz DEFAULT now()
);
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='despesas' AND policyname='desp_all') THEN
    CREATE POLICY "desp_all" ON despesas USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.10 Campos adicionais em clientes e filiais
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE filiais  ADD COLUMN IF NOT EXISTS endereco     text;
ALTER TABLE filiais  ADD COLUMN IF NOT EXISTS telefone     text;

-- 2.11 Vendedores
CREATE TABLE IF NOT EXISTS vendedores (
  pk         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk  bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome       text NOT NULL,
  telefone   text,
  ativo      boolean DEFAULT true,
  criado_em  timestamptz DEFAULT now()
);
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendedores' AND policyname='vendedores_all') THEN
    CREATE POLICY "vendedores_all" ON vendedores USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.12 Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
  pk                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk             bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome                  text NOT NULL,
  cpf                   text,
  data_nascimento       date,
  matricula             text,
  nome_mae              text,
  nome_pai              text,
  salario_mensal        numeric(12,2) DEFAULT 0,
  hora_entrada          time,
  hora_saida            time,
  carga_horaria_diaria  numeric(4,2)  DEFAULT 8.00,
  minutos_intervalo     int           DEFAULT 60,
  saldo_inicial_banco   numeric(10,2) DEFAULT 0,
  horas_fechamento      numeric(10,2) DEFAULT 120,
  diarista              boolean       DEFAULT false,
  valor_diaria          numeric(12,2) DEFAULT 0,
  ativo                 boolean       DEFAULT true,
  criado_em             timestamptz   DEFAULT now()
);
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='funcionarios' AND policyname='func_all') THEN
    CREATE POLICY "func_all" ON funcionarios USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.13 Registro de Ponto
CREATE TABLE IF NOT EXISTS registro_ponto (
  pk             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk      bigint REFERENCES filiais(pk)     ON DELETE CASCADE,
  funcionario_pk bigint REFERENCES funcionarios(pk) ON DELETE CASCADE,
  matricula      text,
  tipo           text NOT NULL, -- 'entrada' ou 'saida'
  data           date DEFAULT CURRENT_DATE,
  hora           time DEFAULT CURRENT_TIME,
  latitude       numeric(10,8),
  longitude      numeric(11,8),
  criado_em      timestamptz DEFAULT now()
);
ALTER TABLE registro_ponto ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='registro_ponto' AND policyname='ponto_all') THEN
    CREATE POLICY "ponto_all" ON registro_ponto USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.14 Fechamento de Ponto
CREATE TABLE IF NOT EXISTS fechamento_ponto (
  pk                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk             bigint REFERENCES filiais(pk)     ON DELETE CASCADE,
  funcionario_pk        bigint REFERENCES funcionarios(pk) ON DELETE CASCADE,
  mes                   int NOT NULL,
  ano                   int NOT NULL,
  quinzena              int DEFAULT 1, -- 1: dia 01-15, 2: dia 16-fim
  salario_base          numeric(12,2),
  horas_trabalhadas     numeric(10,2) DEFAULT 0,
  horas_extras          numeric(10,2) DEFAULT 0,
  horas_previstas       numeric(10,2) DEFAULT 0,
  saldo_anterior        numeric(10,2) DEFAULT 0,
  saldo_mes             numeric(10,2) DEFAULT 0,
  saldo_acumulado       numeric(10,2) DEFAULT 0,
  valor_descontos       numeric(12,2) DEFAULT 0,
  valor_horas_extras    numeric(12,2) DEFAULT 0,
  qtd_horas_pagas       numeric       DEFAULT 0,
  valor_hora_extra_pago numeric       DEFAULT 0,
  total_liquido         numeric(12,2) DEFAULT 0,
  observacoes           text,
  bloqueado             boolean DEFAULT false,
  espelho_status        text DEFAULT 'rascunho', -- 'rascunho', 'enviado', 'aprovado', 'rejeitado'
  espelho_observacao    text,
  espelho_aprovado_em   timestamptz,
  criado_em             timestamptz DEFAULT now(),
  UNIQUE(funcionario_pk, mes, ano, quinzena)
);
ALTER TABLE fechamento_ponto ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fechamento_ponto' AND policyname='fechamento_all') THEN
    CREATE POLICY "fechamento_all" ON fechamento_ponto USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.15 Justificativas / Abonos de Ponto
CREATE TABLE IF NOT EXISTS justificativas_ponto (
  pk             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk      bigint REFERENCES filiais(pk)     ON DELETE CASCADE,
  funcionario_pk bigint REFERENCES funcionarios(pk) ON DELETE CASCADE,
  data           date NOT NULL,
  tipo           text NOT NULL, -- 'Atestado', 'Abono', 'Folga', etc.
  observacoes    text,
  criado_em      timestamptz DEFAULT now(),
  UNIQUE(funcionario_pk, data)
);
ALTER TABLE justificativas_ponto ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='justificativas_ponto' AND policyname='justificativas_all') THEN
    CREATE POLICY "justificativas_all" ON justificativas_ponto USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.16 Descontos detalhados no fechamento
CREATE TABLE IF NOT EXISTS descontos_fechamento (
  pk             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fechamento_pk  bigint REFERENCES fechamento_ponto(pk) ON DELETE CASCADE,
  descricao      text NOT NULL,
  valor          numeric(12,2) NOT NULL DEFAULT 0,
  criado_em      timestamptz DEFAULT now()
);
ALTER TABLE descontos_fechamento ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='descontos_fechamento' AND policyname='descontos_all') THEN
    CREATE POLICY "descontos_all" ON descontos_fechamento USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.17 Formas de Pagamento configuráveis
CREATE TABLE IF NOT EXISTS formas_pagamento (
  pk         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  filial_pk  bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  forma      text NOT NULL,
  label      text NOT NULL,
  icone      text NOT NULL DEFAULT '💳',
  ativo      boolean DEFAULT true,
  ordem      int DEFAULT 0
);
ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='formas_pagamento' AND policyname='formas_all') THEN
    CREATE POLICY "formas_all" ON formas_pagamento USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2.18 Desconto restrito a decoradores por categoria
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS desconto_somente_decorador boolean DEFAULT false;

-- 2.19 Permissões na tabela operadores
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_historico       boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_receitas        boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_categorias      boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_despesas        boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_financeiro      boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_funcionarios    boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_ponto           boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_espelho_ponto   boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_fechamento_ponto boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS matricula              text;



-- ============================================================
-- SEÇÃO 3 — CORREÇÃO DE FK ARMAZÉM
-- (Corrige tipo UUID → BIGINT nas colunas de armazém em produtos)
-- ============================================================

ALTER TABLE produtos
  DROP COLUMN IF EXISTS armazem_pk,
  DROP COLUMN IF EXISTS endereco_armazem_pk;

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS armazem_pk          bigint,
  ADD COLUMN IF NOT EXISTS endereco_armazem_pk bigint;



-- ============================================================
-- SEÇÃO 4 — MÓDULO CAIXA OPERACIONAL
-- ============================================================

CREATE TABLE IF NOT EXISTS caixas (
  pk             bigserial PRIMARY KEY,
  filial_pk      bigint    NOT NULL,
  operador_pk    bigint,
  vendedor_pk    bigint,
  nome_operador  text,
  valor_abertura numeric(12,2) NOT NULL DEFAULT 0,
  valor_fechado  numeric(12,2),
  status         text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  dt_abertura    timestamptz   NOT NULL DEFAULT now(),
  dt_fechamento  timestamptz,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caixa_saldos (
  pk               bigserial PRIMARY KEY,
  caixa_pk         bigint NOT NULL REFERENCES caixas(pk) ON DELETE CASCADE,
  conta_pk         bigint NOT NULL,
  valor_abertura   numeric(12,2) NOT NULL DEFAULT 0,
  valor_fechamento numeric(12,2),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caixa_sangrias (
  pk          bigserial PRIMARY KEY,
  caixa_pk    bigint NOT NULL REFERENCES caixas(pk) ON DELETE CASCADE,
  valor       numeric(12,2) NOT NULL,
  observacoes text,
  dt_criacao  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caixa_reforcos (
  pk          bigserial PRIMARY KEY,
  caixa_pk    bigint NOT NULL REFERENCES caixas(pk) ON DELETE CASCADE,
  valor       numeric(12,2) NOT NULL,
  observacoes text,
  dt_criacao  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimentos_caixa (
  pk          bigserial PRIMARY KEY,
  caixa_pk    bigint NOT NULL REFERENCES caixas(pk) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('sangria','reforco','venda','estorno')),
  valor       numeric(12,2) NOT NULL,
  descricao   text,
  dt_criacao  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caixas_filial_status   ON caixas(filial_pk, status);
CREATE INDEX IF NOT EXISTS idx_caixa_saldos_caixa     ON caixa_saldos(caixa_pk);
CREATE INDEX IF NOT EXISTS idx_caixa_sangrias_caixa   ON caixa_sangrias(caixa_pk);
CREATE INDEX IF NOT EXISTS idx_caixa_reforcos_caixa   ON caixa_reforcos(caixa_pk);
CREATE INDEX IF NOT EXISTS idx_movimentos_caixa_caixa ON movimentos_caixa(caixa_pk);

ALTER TABLE caixas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_saldos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_sangrias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_reforcos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentos_caixa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_caixas"           ON caixas;
DROP POLICY IF EXISTS "anon_all_caixa_saldos"     ON caixa_saldos;
DROP POLICY IF EXISTS "anon_all_caixa_sangrias"   ON caixa_sangrias;
DROP POLICY IF EXISTS "anon_all_caixa_reforcos"   ON caixa_reforcos;
DROP POLICY IF EXISTS "anon_all_movimentos_caixa" ON movimentos_caixa;

CREATE POLICY "anon_all_caixas"           ON caixas           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_caixa_saldos"     ON caixa_saldos     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_caixa_sangrias"   ON caixa_sangrias   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_caixa_reforcos"   ON caixa_reforcos   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_movimentos_caixa" ON movimentos_caixa FOR ALL TO anon USING (true) WITH CHECK (true);



-- ============================================================
-- SEÇÃO 5 — FISCAL / NFC-e
-- ============================================================

-- 5.1 Dados fiscais nos produtos
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ncm               text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cfop              text DEFAULT '5102',
  ADD COLUMN IF NOT EXISTS csosn             text DEFAULT '400',
  ADD COLUMN IF NOT EXISTS unidade_comercial  text DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS unidade_tributavel text DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS origem            text DEFAULT '0';

-- 5.2 Promoção Relâmpago por produto
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS preco_promo  NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_inicio TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_fim    TIMESTAMPTZ   DEFAULT NULL;

-- 5.2 Dados fiscais e NFC-e nas filiais
ALTER TABLE filiais
  ADD COLUMN IF NOT EXISTS ie               text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS razao_social     text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nome_fantasia    text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logradouro       text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS numero_end       text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS complemento_end  text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bairro           text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cidade           text    DEFAULT 'Manaus',
  ADD COLUMN IF NOT EXISTS uf               text    DEFAULT 'AM',
  ADD COLUMN IF NOT EXISTS cep              text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_serie       integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nfce_ambiente    text    DEFAULT '2',
  ADD COLUMN IF NOT EXISTS nfce_csc         text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_csc_id      text    DEFAULT '000001',
  ADD COLUMN IF NOT EXISTS nfce_cert_b64    text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_cert_senha  text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_cert_venc   date    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_cert_titular text   DEFAULT NULL;

-- 5.3 Dados da NFC-e emitida nas vendas
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS nfce_chave      text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_protocolo  text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_status     text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_motivo     text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_numero     integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_serie      integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_ambiente   text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_xml        text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_qrcode     text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_dh_emissao text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_cpf_dest   text    DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_nfce_chave  ON vendas(nfce_chave);
CREATE INDEX IF NOT EXISTS idx_vendas_nfce_numero ON vendas(filial_pk, nfce_serie, nfce_numero);

-- 5.4 Sequência atômica para numeração NFC-e
CREATE TABLE IF NOT EXISTS nfce_sequencia (
  filial_pk  bigint  NOT NULL,
  serie      integer NOT NULL DEFAULT 1,
  ultimo_num integer NOT NULL DEFAULT 0,
  PRIMARY KEY (filial_pk, serie)
);

-- 5.5 Função RPC para incremento atômico de número NFC-e
CREATE OR REPLACE FUNCTION next_nfce_numero(p_filial_pk bigint, p_serie integer)
RETURNS integer AS $$
DECLARE
  v_num integer;
BEGIN
  INSERT INTO nfce_sequencia (filial_pk, serie, ultimo_num)
  VALUES (p_filial_pk, p_serie, 1)
  ON CONFLICT (filial_pk, serie)
  DO UPDATE SET ultimo_num = nfce_sequencia.ultimo_num + 1
  RETURNING ultimo_num INTO v_num;

  SELECT GREATEST(v_num, COALESCE(MAX(nfce_numero), 0) + 1)
  INTO v_num
  FROM vendas
  WHERE filial_pk = p_filial_pk
    AND nfce_serie = p_serie
    AND nfce_protocolo IS NOT NULL;

  UPDATE nfce_sequencia
  SET ultimo_num = v_num
  WHERE filial_pk = p_filial_pk AND serie = p_serie AND ultimo_num < v_num;

  RETURN v_num;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION next_nfce_numero(bigint, integer) TO service_role;
GRANT ALL ON TABLE nfce_sequencia TO service_role;

ALTER TABLE nfce_sequencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_nfce_sequencia" ON nfce_sequencia FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5.6 Inicializar sequências para filiais existentes
INSERT INTO nfce_sequencia (filial_pk, serie, ultimo_num)
SELECT
  filial_pk,
  COALESCE(nfce_serie, 1),
  COALESCE(MAX(nfce_numero), 0)
FROM vendas
WHERE filial_pk IS NOT NULL
GROUP BY filial_pk, nfce_serie
ON CONFLICT (filial_pk, serie) DO NOTHING;



-- ============================================================
-- SEÇÃO 6 — ORÇAMENTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS orcamentos (
  pk             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo         text UNIQUE NOT NULL,
  filial_pk      bigint REFERENCES filiais(pk),
  funcionario_pk bigint REFERENCES funcionarios(pk),
  cliente_pk     bigint REFERENCES clientes(pk),
  cliente_nome   text,
  data_criacao   timestamptz DEFAULT now(),
  total          numeric(15,2) DEFAULT 0,
  status         text DEFAULT 'aberto', -- 'aberto', 'convertido', 'cancelado'
  memo           text  -- JSON do carrinho para reimportação no PDV
);

CREATE TABLE IF NOT EXISTS itens_orcamento (
  pk           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orcamento_pk bigint REFERENCES orcamentos(pk) ON DELETE CASCADE,
  produto_pk   bigint REFERENCES produtos(pk),
  filial_pk    bigint REFERENCES filiais(pk),
  codigo       text,
  descricao    text,
  preco_unit   numeric(15,2) DEFAULT 0,
  qtd          numeric(15,2) DEFAULT 0,
  desconto_pct numeric(5,2)  DEFAULT 0,
  total_item   numeric(15,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_codigo ON orcamentos(codigo);

ALTER TABLE orcamentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_orcamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_orcamentos"      ON orcamentos      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_itens_orcamento" ON itens_orcamento FOR ALL TO anon USING (true) WITH CHECK (true);



-- ============================================================
-- SEÇÃO 7 — CAMPOS ADICIONAIS EM TABELAS EXISTENTES
-- ============================================================

-- 7.1 Filial nos itens de venda (suporte a múltiplas filiais)
ALTER TABLE itens_venda ADD COLUMN IF NOT EXISTS filial_pk bigint REFERENCES filiais(pk);
UPDATE itens_venda iv
SET filial_pk = v.filial_pk
FROM vendas v
WHERE iv.venda_pk = v.pk AND iv.filial_pk IS NULL;

-- 7.2 Persistência de horas pagas no fechamento de ponto
ALTER TABLE fechamento_ponto ADD COLUMN IF NOT EXISTS qtd_horas_pagas       numeric DEFAULT 0;
ALTER TABLE fechamento_ponto ADD COLUMN IF NOT EXISTS valor_hora_extra_pago  numeric DEFAULT 0;

-- 7.3 Vendedor vinculado à venda
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS vendedor_pk bigint REFERENCES vendedores(pk) ON DELETE SET NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS vendedor    text;

-- 7.4 Forma de recebimento na venda
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS forma_recebimento text;

-- 7.5 Cliente vinculado à venda
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_pk bigint REFERENCES clientes(pk) ON DELETE SET NULL;



-- ============================================================
-- SEÇÃO 8 — CONSOLIDAÇÃO DE RECEBIMENTOS
-- (Abordagem standalone — sem colunas em pagamentos_venda)
-- ============================================================

-- Remove colunas da abordagem anterior v1 (se existirem)
ALTER TABLE pagamentos_venda
  DROP COLUMN IF EXISTS confirmado,
  DROP COLUMN IF EXISTS data_recebimento,
  DROP COLUMN IF EXISTS obs_recebimento,
  DROP COLUMN IF EXISTS confirmado_em;

-- Tabela standalone de recebimentos
CREATE TABLE IF NOT EXISTS recebimentos (
  pk               bigserial   PRIMARY KEY,
  filial_pk        bigint,
  pagamento_pk     bigint REFERENCES pagamentos_venda(pk) ON DELETE SET NULL,
  venda_pk         bigint,
  conta_pk         bigint,
  data_recebimento date NOT NULL,
  valor            numeric(12,2) NOT NULL,
  forma            text,
  descricao        text,
  criado_em        timestamptz DEFAULT now()
);

ALTER TABLE recebimentos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_recebimentos_filial    ON recebimentos(filial_pk);
CREATE INDEX IF NOT EXISTS idx_recebimentos_pagamento ON recebimentos(pagamento_pk);
CREATE INDEX IF NOT EXISTS idx_recebimentos_data      ON recebimentos(data_recebimento);

ALTER TABLE recebimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_recebimentos" ON recebimentos;
CREATE POLICY "anon_all_recebimentos" ON recebimentos
  FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE pagamentos_venda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_pagamentos_venda" ON pagamentos_venda;
CREATE POLICY "anon_all_pagamentos_venda" ON pagamentos_venda
  FOR ALL TO anon USING (true) WITH CHECK (true);



-- ============================================================
-- SEÇÃO 9 — PARÂMETROS DO SISTEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS parametros (
  pk         bigserial   PRIMARY KEY,
  filial_pk  bigint,          -- null = global (todas as filiais)
  chave      text NOT NULL,
  valor      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice único: filial específica pode sobrescrever o global
CREATE UNIQUE INDEX IF NOT EXISTS idx_parametros_chave
  ON parametros (COALESCE(filial_pk, -1), chave);

-- Valores padrão globais
INSERT INTO parametros (filial_pk, chave, valor) VALUES
  -- PDV & Caixa
  (null, 'pdv_bloquear_sem_caixa',               'true'),
  (null, 'pdv_exigir_vendedor',                  'false'),
  (null, 'pdv_permitir_estoque_negativo',        'false'),
  (null, 'pdv_desconto_maximo',                  '0'),
  (null, 'pdv_desconto_decorador_balao',          'false'),
  -- Ponto Eletrônico
  (null, 'ponto_exigir_gps',                     'true'),
  (null, 'ponto_tolerancia_minutos',             '15'),
  (null, 'ponto_adicional_hora_extra',           '60'),
  (null, 'ponto_adicional_hora_domingo',         '100'),
  (null, 'ponto_fechamento_exige_espelho',        'true'),
  -- Fiscal / NFC-e e NF-e
  (null, 'nfce_ativa',                           'false'),
  (null, 'nfce_ambiente',                        '2'),
  (null, 'nfe_ambiente',                         '2'),
  -- Vendas
  (null, 'venda_permite_desconto_sem_aprovacao', 'true'),
  (null, 'venda_imprime_cupom',                  'false'),
  (null, 'locacao_taxa_realocacao',              '0'),
  -- Crediário
  (null, 'crediario_exige_cliente',              'true'),
  (null, 'locacao_exige_cliente',               'true'),
  (null, 'crediario_bloqueia_inadimplente',      'true'),
  -- Vales
  (null, 'vale_gestor_pk',                       '')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEÇÃO 12 — TABELA VALES (Adiantamento Salarial)
-- ============================================================

CREATE TABLE IF NOT EXISTS vales (
  pk               SERIAL PRIMARY KEY,
  filial_pk        INTEGER,
  funcionario_pk   INTEGER,
  funcionario_nome TEXT NOT NULL,
  valor            NUMERIC(10,2) NOT NULL,
  valor_original   NUMERIC(10,2),
  valor_pago       NUMERIC(10,2) DEFAULT 0,
  valor_restante   NUMERIC(10,2),
  motivo           TEXT,
  status           TEXT NOT NULL DEFAULT 'pendente',
  solicitado_em    TIMESTAMPTZ DEFAULT NOW(),
  aprovado_em      TIMESTAMPTZ,
  aprovado_por     TEXT,
  pago_em          TIMESTAMPTZ,
  descontado_em    TIMESTAMPTZ,
  fechamento_pk    INTEGER,
  observacao       TEXT
);

ALTER TABLE vales ADD COLUMN IF NOT EXISTS valor_original  NUMERIC(10,2);
ALTER TABLE vales ADD COLUMN IF NOT EXISTS valor_pago      NUMERIC(10,2) DEFAULT 0;
ALTER TABLE vales ADD COLUMN IF NOT EXISTS valor_restante  NUMERIC(10,2);
UPDATE vales SET valor_original = valor, valor_restante = valor WHERE valor_original IS NULL;

ALTER TABLE vales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_vales" ON vales;
CREATE POLICY "anon_all_vales" ON vales FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE parametros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_parametros" ON parametros;
DROP POLICY IF EXISTS "anon_insert_parametros" ON parametros;
DROP POLICY IF EXISTS "anon_update_parametros" ON parametros;
DROP POLICY IF EXISTS "anon_delete_parametros" ON parametros;

CREATE POLICY "anon_select_parametros" ON parametros FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_parametros" ON parametros FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_parametros" ON parametros FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_parametros" ON parametros FOR DELETE TO anon USING (true);



-- ============================================================
-- SEÇÃO 10 — PERMISSÕES GRANULARES DE OPERADORES
-- ============================================================

ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_fornecedores    boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_vendedores       boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_caixa            boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_relatorio_caixa  boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_gestao_ponto     boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_relatorio_vendas boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_vales            boolean DEFAULT false;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_holerite         boolean DEFAULT false;



-- ============================================================
-- SEÇÃO 11 — BACKFILL DE PERMISSÕES
-- (Para operadores já cadastrados — migra permissões legadas)
-- ============================================================

-- acesso_pdv → acesso_historico, acesso_caixa, acesso_vendedores
UPDATE operadores SET acesso_historico   = true WHERE acesso_pdv = true AND acesso_historico  IS NOT TRUE;
UPDATE operadores SET acesso_caixa       = true WHERE acesso_pdv = true AND acesso_caixa      IS NOT TRUE;
UPDATE operadores SET acesso_vendedores  = true WHERE acesso_pdv = true AND acesso_vendedores IS NOT TRUE;

-- acesso_historico → acesso_relatorio_vendas
UPDATE operadores SET acesso_relatorio_vendas = true WHERE acesso_historico = true AND acesso_relatorio_vendas IS NOT TRUE;

-- acesso_clientes → acesso_fornecedores
UPDATE operadores SET acesso_fornecedores = true WHERE acesso_clientes = true AND acesso_fornecedores IS NOT TRUE;

-- acesso_fechamento → acesso_relatorio_caixa
UPDATE operadores SET acesso_relatorio_caixa = true WHERE acesso_fechamento = true AND acesso_relatorio_caixa IS NOT TRUE;

-- acesso_ponto → acesso_gestao_ponto
UPDATE operadores SET acesso_gestao_ponto = true WHERE acesso_ponto = true AND acesso_gestao_ponto IS NOT TRUE;

-- acesso_funcionarios → acesso_fechamento_ponto
UPDATE operadores SET acesso_fechamento_ponto = true WHERE acesso_funcionarios = true AND acesso_fechamento_ponto IS NOT TRUE;

-- matricula preenchida → acesso_holerite (autoatendimento)
UPDATE operadores SET acesso_holerite = true WHERE matricula IS NOT NULL AND matricula <> '' AND acesso_holerite IS NOT TRUE;



-- Coluna para rastrear ref Focus NFe (cancelamento/consulta)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfce_ref   text DEFAULT NULL;
-- URL do DANFE gerado pela Focus NFe
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfce_danfe text DEFAULT NULL;

-- ============================================================
-- Função: ajuste atômico de saldo de produto (evita race condition)
-- Usar via supabase.rpc('ajustar_saldo_produto', { p_pk, p_delta })
-- p_delta positivo = entrada; negativo = saída
-- ============================================================
CREATE OR REPLACE FUNCTION ajustar_saldo_produto(
  p_pk                INTEGER,
  p_delta             NUMERIC,
  p_permitir_negativo BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_saldo NUMERIC;
BEGIN
  -- FOR UPDATE bloqueia a linha até o commit, eliminando race condition
  SELECT saldo INTO v_saldo FROM produtos WHERE pk = p_pk FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT p_permitir_negativo AND (v_saldo + p_delta) < 0 THEN
    RETURN FALSE;
  END IF;
  UPDATE produtos SET saldo = v_saldo + p_delta WHERE pk = p_pk;
  RETURN TRUE;
END;
$$;

-- =====================================================================
--  ajustar_saldos_venda
--  Ajusta o saldo de VÁRIOS produtos numa ÚNICA transação atômica.
--  Ou aplica todos os ajustes, ou nenhum (rollback automático no RAISE).
--
--  p_ajustes: jsonb no formato [{"pk": 1, "delta": -3}, {"pk": 7, "delta": 2}]
--             delta negativo  = débito (venda)
--             delta positivo  = estorno (devolução / exclusão)
--  p_permitir_negativo: se false, aborta tudo caso algum saldo fique < 0
--
--  Retorna: jsonb [{"pk":1,"saldo_antes":10,"saldo_apos":7}, ...]
--
--  Em caso de erro lança exceção (PostgREST devolve como { error }):
--    - 'ESTOQUE_INSUFICIENTE:<pk>'   quando saldo ficaria negativo
--    - 'PRODUTO_NAO_ENCONTRADO:<pk>' quando o produto não existe
-- =====================================================================
CREATE OR REPLACE FUNCTION ajustar_saldos_venda(
  p_ajustes           jsonb,
  p_permitir_negativo boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
-- security definer  -- descomente se houver RLS e a função precisar ignorá-la
AS $$
DECLARE
  v_item        jsonb;
  v_pk          bigint;
  v_delta       numeric;
  v_saldo_antes numeric;
  v_saldo_apos  numeric;
  v_result      jsonb := '[]'::jsonb;
BEGIN
  -- Trava TODAS as linhas SEMPRE em ordem crescente de pk.
  -- Isso garante que vendas concorrentes que tocam os mesmos produtos
  -- adquiram os locks na mesma ordem -> impossível haver deadlock.
  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_ajustes) AS t(value)
    ORDER BY (t.value->>'pk')::bigint
  LOOP
    v_pk    := (v_item->>'pk')::bigint;
    v_delta := (v_item->>'delta')::numeric;

    -- FOR UPDATE: serializa concorrência por produto dentro desta transação
    SELECT saldo
      INTO v_saldo_antes
      FROM produtos
     WHERE pk = v_pk
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUTO_NAO_ENCONTRADO:%', v_pk USING ERRCODE = 'P0002';
    END IF;

    v_saldo_apos := COALESCE(v_saldo_antes, 0) + v_delta;

    IF v_saldo_apos < 0 AND NOT p_permitir_negativo THEN
      -- aborta a transação inteira: nenhum produto deste lote é alterado
      RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE:%', v_pk USING ERRCODE = 'P0001';
    END IF;

    UPDATE produtos SET saldo = v_saldo_apos WHERE pk = v_pk;

    v_result := v_result || jsonb_build_object(
      'pk',          v_pk,
      'saldo_antes', COALESCE(v_saldo_antes, 0),
      'saldo_apos',  v_saldo_apos
    );
  END LOOP;

  RETURN v_result;
END;
$$;

-- ============================================================
-- SEÇÃO 13 — ENTRADA DE NF-e (Recebimento de mercadoria)
-- ============================================================

-- De-Para: código do fornecedor → produto interno
CREATE TABLE IF NOT EXISTS mapeamento_produtos_fornecedor (
  pk                bigserial PRIMARY KEY,
  filial_pk         bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  fornecedor_cnpj   text NOT NULL,
  codigo_fornecedor text NOT NULL,
  produto_pk        bigint REFERENCES produtos(pk) ON DELETE CASCADE,
  criado_em         timestamptz DEFAULT now(),
  UNIQUE (filial_pk, fornecedor_cnpj, codigo_fornecedor)
);

-- Cabeçalho da entrada
CREATE TABLE IF NOT EXISTS entradas_estoque (
  pk              bigserial PRIMARY KEY,
  filial_pk       bigint REFERENCES filiais(pk),
  fornecedor_cnpj text,
  fornecedor_nome text,
  numero_nf       text,
  chave_nfe       text,
  data_emissao    date,
  total_nf        numeric(12,2),
  criado_em       timestamptz DEFAULT now(),
  operador_pk     bigint
);

-- Itens da entrada
CREATE TABLE IF NOT EXISTS itens_entrada_estoque (
  pk                   bigserial PRIMARY KEY,
  entrada_pk           bigint REFERENCES entradas_estoque(pk) ON DELETE CASCADE,
  produto_pk           bigint REFERENCES produtos(pk),
  codigo_fornecedor    text,
  descricao_fornecedor text,
  qtd                  numeric(12,4),
  preco_custo          numeric(12,2),
  total_item           numeric(12,2)
);

-- Permissão de operador para entrada de NF-e
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_entrada_nfe boolean DEFAULT false;

ALTER TABLE mapeamento_produtos_fornecedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas_estoque               ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_entrada_estoque          ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_mapeamento_fornecedor" ON mapeamento_produtos_fornecedor FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_entradas_estoque"      ON entradas_estoque               FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_itens_entrada"         ON itens_entrada_estoque          FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- SEÇÃO 14 — CATEGORIAS DE DESPESA
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_despesa (
  pk        bigserial PRIMARY KEY,
  filial_pk bigint REFERENCES filiais(pk) ON DELETE CASCADE,
  nome      text NOT NULL,
  criado_em timestamptz DEFAULT now(),
  UNIQUE(filial_pk, nome)
);
ALTER TABLE categorias_despesa ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categorias_despesa' AND policyname='anon_all_cats_despesa') THEN
    CREATE POLICY "anon_all_cats_despesa" ON categorias_despesa FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RPC: ajustar saldo de conta bancária atomicamente (positivo = entrada, negativo = saída)
CREATE OR REPLACE FUNCTION ajustar_saldo_conta(p_conta_pk bigint, p_delta numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE contas_bancarias SET saldo = saldo + p_delta WHERE pk = p_conta_pk;
END;
$$;

-- ============================================================
-- SEÇÃO 15 — CÓDIGO ÚNICO POR FILIAL EM PRODUTOS
-- ============================================================

-- Constraint para garantir que dois produtos da mesma filial não tenham o mesmo código interno
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'produtos_filial_pk_codigo_key'
  ) THEN
    ALTER TABLE produtos ADD CONSTRAINT produtos_filial_pk_codigo_key UNIQUE (filial_pk, codigo);
  END IF;
END $$;

-- Função atômica que retorna o próximo código sequencial disponível para a filial
CREATE OR REPLACE FUNCTION proximo_codigo_produto(p_filial_pk bigint)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_max integer;
  v_proximo integer;
BEGIN
  SELECT COALESCE(MAX(codigo::integer), 0)
    INTO v_max
    FROM produtos
   WHERE filial_pk = p_filial_pk
     AND codigo ~ '^\d{1,5}$';

  v_proximo := v_max + 1;
  RETURN LPAD(v_proximo::text, 4, '0');
END;
$$;

-- ============================================================
-- SEÇÃO 16 — ACRÉSCIMO NA VENDA
-- ============================================================

  ALTER TABLE vendas ADD COLUMN IF NOT EXISTS acrescimo numeric(12,2) DEFAULT 0;

-- ============================================================
-- SEÇÃO 17 — MÓDULO DE PROJETOS
-- ============================================================

CREATE TABLE IF NOT EXISTS projetos (
  pk              bigserial   PRIMARY KEY,
  filial_pk       bigint      REFERENCES filiais(pk),
  titulo          text        NOT NULL,
  cliente_pk      bigint      REFERENCES clientes(pk) ON DELETE SET NULL,
  valor           numeric(12,2) DEFAULT 0,
  data_decoracao  date,
  cfop            text        DEFAULT '5102',
  ncm             text,
  status          text        DEFAULT 'pendente',
  forma_pagamento text,
  observacao      text,
  agenda_pk       bigint,
  nfe_ref         text,
  nfe_chave       text,
  nfe_protocolo   text,
  nfe_status      text,
  nfe_motivo      text,
  nfe_numero      text,
  nfe_serie       text,
  nfe_ambiente    text,
  nfe_xml         text,
  nfe_danfe       text,
  criado_em       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projetos_filial  ON projetos(filial_pk);
CREATE INDEX IF NOT EXISTS idx_projetos_cliente ON projetos(cliente_pk);
CREATE INDEX IF NOT EXISTS idx_projetos_data    ON projetos(data_decoracao);

ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_projetos" ON projetos;
CREATE POLICY "anon_all_projetos" ON projetos
  FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE agenda ADD COLUMN IF NOT EXISTS projeto_pk bigint;

ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_projetos boolean DEFAULT false;

-- ============================================================
-- Seção 18 — Busca de produtos com suporte a acentos (unaccent)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION buscar_produtos(p_filial bigint, p_termo text)
RETURNS TABLE(pk bigint, descricao text, codigo text, valor_venda numeric, saldo numeric, categoria_pk bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    pr.pk, pr.descricao, pr.codigo,
    pr.valor_venda, pr.saldo, pr.categoria_pk
  FROM produtos pr
  WHERE pr.filial_pk = p_filial
    AND (
      unaccent(lower(pr.descricao)) ILIKE '%' || unaccent(lower(p_termo)) || '%'
      OR lower(pr.codigo::text)     ILIKE '%' || lower(p_termo)            || '%'
    )
  ORDER BY pr.descricao
  LIMIT 20;
$$;

-- ============================================================
-- Seção 19 — CNPJs adicionais por filial (para projetos / NF-e)
-- ============================================================
CREATE TABLE IF NOT EXISTS filial_cnpjs (
  pk            bigserial PRIMARY KEY,
  filial_pk     bigint NOT NULL REFERENCES filiais(pk) ON DELETE CASCADE,
  cnpj          text NOT NULL,
  razao_social  text,
  nome_fantasia text,
  ie            text,
  ativo         boolean DEFAULT true,
  criado_em     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_filial_cnpjs_filial ON filial_cnpjs(filial_pk);
ALTER TABLE filial_cnpjs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_filial_cnpjs" ON filial_cnpjs;
CREATE POLICY "anon_all_filial_cnpjs" ON filial_cnpjs FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS cnpj_pk bigint REFERENCES filial_cnpjs(pk) ON DELETE SET NULL;

ALTER TABLE filial_cnpjs ADD COLUMN IF NOT EXISTS focusnfe_token_hom  text DEFAULT NULL;
ALTER TABLE filial_cnpjs ADD COLUMN IF NOT EXISTS focusnfe_token_prod text DEFAULT NULL;

-- ============================================================
-- Seção 20 — Migração de status de projetos
-- ============================================================
UPDATE projetos SET status = 'a_montar'  WHERE status IN ('pendente', 'confirmado');
UPDATE projetos SET status = 'montado'   WHERE status = 'realizado';

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS custo numeric(12,2) DEFAULT 0;

-- ============================================================
-- Seção 21 — Código de cliente + soft delete
-- ============================================================

ALTER TABLE clientes         ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE clientes         ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE vendas           ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE categorias       ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE fornecedores     ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE filiais          ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE operadores       ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE projetos         ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE armazem          ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE categorias_despesa ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE contas_bancarias ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE produtos         ADD COLUMN IF NOT EXISTS ativo  boolean DEFAULT true;
ALTER TABLE vendas   ADD COLUMN IF NOT EXISTS cliente_codigo text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clientes_filial_pk_codigo_key'
  ) THEN
    ALTER TABLE clientes ADD CONSTRAINT clientes_filial_pk_codigo_key UNIQUE (filial_pk, codigo);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION proximo_codigo_cliente(p_filial_pk bigint)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_max     integer;
  v_proximo integer;
BEGIN
  SELECT COALESCE(MAX(codigo::integer), 0)
    INTO v_max
    FROM clientes
   WHERE filial_pk = p_filial_pk
     AND codigo ~ '^\d{1,5}$';
  v_proximo := v_max + 1;
  RETURN LPAD(v_proximo::text, 4, '0');
END;
$$;

-- ============================================================
-- Seção 22 — Pedidos de Compra
-- ============================================================

CREATE TABLE IF NOT EXISTS pedidos_compra (
  pk              bigserial PRIMARY KEY,
  numero          text NOT NULL,
  filial_pk       bigint REFERENCES filiais(pk),
  fornecedor_pk   bigint REFERENCES fornecedores(pk),
  status          text DEFAULT 'em_andamento',
  observacao      text,
  nf_numero       text,
  nf_serie        text,
  nf_chave        text,
  nf_fornecedor   text,
  nf_data_entrada date,
  nf_valor        numeric(12,2),
  ativo           boolean DEFAULT true,
  criado_em       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos_compra_itens (
  pk              bigserial PRIMARY KEY,
  pedido_pk       bigint REFERENCES pedidos_compra(pk),
  produto_pk      bigint REFERENCES produtos(pk),
  descricao_livre text,
  quantidade      numeric(12,3) DEFAULT 0,
  preco_unitario  numeric(12,2) DEFAULT 0
);

ALTER TABLE pedidos_compra_itens ADD COLUMN IF NOT EXISTS descricao_livre text;

ALTER TABLE pedidos_compra ADD COLUMN IF NOT EXISTS nf_numero text;
ALTER TABLE pedidos_compra ADD COLUMN IF NOT EXISTS nf_serie text;
ALTER TABLE pedidos_compra ADD COLUMN IF NOT EXISTS nf_chave text;
ALTER TABLE pedidos_compra ADD COLUMN IF NOT EXISTS nf_fornecedor text;
ALTER TABLE pedidos_compra ADD COLUMN IF NOT EXISTS nf_data_entrada date;
ALTER TABLE pedidos_compra ADD COLUMN IF NOT EXISTS nf_valor numeric(12,2);

ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos_compra' AND policyname='pedidos_compra_all') THEN
    CREATE POLICY "pedidos_compra_all" ON pedidos_compra USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE pedidos_compra_itens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos_compra_itens' AND policyname='pedidos_compra_itens_all') THEN
    CREATE POLICY "pedidos_compra_itens_all" ON pedidos_compra_itens USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE operadores ADD COLUMN IF NOT EXISTS acesso_pedidos_compra boolean DEFAULT false;

CREATE OR REPLACE FUNCTION proximo_numero_pedido_compra(p_filial_pk bigint)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_max integer;
BEGIN
  SELECT COALESCE(MAX(numero::integer), 0)
    INTO v_max
    FROM pedidos_compra
   WHERE filial_pk = p_filial_pk
     AND numero ~ '^\d+$';
  RETURN LPAD((v_max + 1)::text, 6, '0');
END;
$$;

-- ============================================================
-- Auditoria de movimentações de estoque por venda
-- ============================================================
CREATE TABLE IF NOT EXISTS auditoria_estoque (
  pk           bigserial PRIMARY KEY,
  filial_pk    bigint,
  venda_pk     bigint     REFERENCES vendas(pk),
  produto_pk   bigint     REFERENCES produtos(pk),
  nome         text,
  saldo_antes  numeric(12,3),
  qtd_debitada numeric(12,3),
  saldo_apos   numeric(12,3),
  observacao   text,
  criado_em    timestamptz DEFAULT now()
);
ALTER TABLE auditoria_estoque ADD COLUMN IF NOT EXISTS filial_pk bigint;
CREATE INDEX IF NOT EXISTS idx_auditoria_estoque_venda   ON auditoria_estoque(venda_pk);
CREATE INDEX IF NOT EXISTS idx_auditoria_estoque_produto ON auditoria_estoque(produto_pk);
CREATE INDEX IF NOT EXISTS idx_auditoria_estoque_filial  ON auditoria_estoque(filial_pk);
ALTER TABLE auditoria_estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_auditoria_estoque" ON auditoria_estoque;
CREATE POLICY "anon_all_auditoria_estoque" ON auditoria_estoque FOR ALL TO anon USING (true) WITH CHECK (true);

-- RLS para tabelas críticas sem policy definida anteriormente
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_produtos" ON produtos;
CREATE POLICY "anon_all_produtos" ON produtos FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_vendas" ON vendas;
CREATE POLICY "anon_all_vendas" ON vendas FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_itens_venda" ON itens_venda;
CREATE POLICY "anon_all_itens_venda" ON itens_venda FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- FIM DO SCRIPT — Notifica o PostgREST para recarregar schema
-- ============================================================

NOTIFY pgrst, 'reload schema';
