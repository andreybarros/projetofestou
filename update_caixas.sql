-- ============================================================
-- Tabelas do módulo Caixa (Operação)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Tabela principal de caixas
CREATE TABLE IF NOT EXISTS caixas (
  pk            bigserial PRIMARY KEY,
  filial_pk     bigint        NOT NULL,
  operador_pk   bigint,
  vendedor_pk   bigint,
  nome_operador text,
  valor_abertura numeric(12,2) NOT NULL DEFAULT 0,
  valor_fechado  numeric(12,2),
  status        text          NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  dt_abertura   timestamptz   NOT NULL DEFAULT now(),
  dt_fechamento timestamptz,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- Saldos detalhados por conta bancária (abertura e fechamento)
CREATE TABLE IF NOT EXISTS caixa_saldos (
  pk              bigserial PRIMARY KEY,
  caixa_pk        bigint        NOT NULL REFERENCES caixas(pk) ON DELETE CASCADE,
  conta_pk        bigint        NOT NULL,
  valor_abertura  numeric(12,2) NOT NULL DEFAULT 0,
  valor_fechamento numeric(12,2),
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- Sangrias do caixa
CREATE TABLE IF NOT EXISTS caixa_sangrias (
  pk          bigserial PRIMARY KEY,
  caixa_pk    bigint        NOT NULL REFERENCES caixas(pk) ON DELETE CASCADE,
  valor       numeric(12,2) NOT NULL,
  observacoes text,
  dt_criacao  timestamptz   NOT NULL DEFAULT now()
);

-- Reforços do caixa
CREATE TABLE IF NOT EXISTS caixa_reforcos (
  pk          bigserial PRIMARY KEY,
  caixa_pk    bigint        NOT NULL REFERENCES caixas(pk) ON DELETE CASCADE,
  valor       numeric(12,2) NOT NULL,
  observacoes text,
  dt_criacao  timestamptz   NOT NULL DEFAULT now()
);

-- Movimentos unificados (usado pelo store para calcular saldo)
-- O backend insere sangrias/reforços aqui E nas tabelas separadas
CREATE TABLE IF NOT EXISTS movimentos_caixa (
  pk          bigserial PRIMARY KEY,
  caixa_pk    bigint        NOT NULL REFERENCES caixas(pk) ON DELETE CASCADE,
  tipo        text          NOT NULL CHECK (tipo IN ('sangria','reforco','venda','estorno')),
  valor       numeric(12,2) NOT NULL,
  descricao   text,
  dt_criacao  timestamptz   NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_caixas_filial_status   ON caixas(filial_pk, status);
CREATE INDEX IF NOT EXISTS idx_caixa_saldos_caixa     ON caixa_saldos(caixa_pk);
CREATE INDEX IF NOT EXISTS idx_caixa_sangrias_caixa   ON caixa_sangrias(caixa_pk);
CREATE INDEX IF NOT EXISTS idx_caixa_reforcos_caixa   ON caixa_reforcos(caixa_pk);
CREATE INDEX IF NOT EXISTS idx_movimentos_caixa_caixa ON movimentos_caixa(caixa_pk);

-- RLS ativo com acesso total para a chave anon
ALTER TABLE caixas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_saldos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_sangrias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_reforcos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentos_caixa ENABLE ROW LEVEL SECURITY;

-- Policies (drop antes para evitar erro se já existirem)
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
