-- ============================================================
-- Tabela de parâmetros do sistema
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS parametros (
  pk         bigserial PRIMARY KEY,
  filial_pk  bigint,          -- null = global (todas as filiais)
  chave      text NOT NULL,
  valor      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice único: permite que filial específica sobrescreva o global
CREATE UNIQUE INDEX IF NOT EXISTS idx_parametros_chave
  ON parametros (COALESCE(filial_pk, -1), chave);

-- Defaults globais
INSERT INTO parametros (filial_pk, chave, valor) VALUES
  -- PDV & Caixa
  (null, 'pdv_bloquear_sem_caixa',               'true'),
  (null, 'pdv_exigir_vendedor',                  'false'),
  (null, 'pdv_permitir_estoque_negativo',        'false'),
  (null, 'pdv_desconto_maximo',                  '0'),
  -- Ponto Eletrônico
  (null, 'ponto_exigir_gps',                     'true'),
  (null, 'ponto_tolerancia_minutos',             '15'),
  (null, 'ponto_fechamento_exige_espelho',        'true'),
  -- Fiscal / NFC-e
  (null, 'nfce_ativa',                           'false'),
  (null, 'nfce_ambiente',                        '2'),
  -- Vendas
  (null, 'venda_permite_desconto_sem_aprovacao', 'true'),
  (null, 'venda_imprime_cupom',                  'false')
ON CONFLICT DO NOTHING;

-- RLS ativo com acesso total para a chave anon
ALTER TABLE parametros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_parametros" ON parametros;
DROP POLICY IF EXISTS "anon_insert_parametros" ON parametros;
DROP POLICY IF EXISTS "anon_update_parametros" ON parametros;
DROP POLICY IF EXISTS "anon_delete_parametros" ON parametros;

CREATE POLICY "anon_select_parametros" ON parametros FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_parametros" ON parametros FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_parametros" ON parametros FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_parametros" ON parametros FOR DELETE TO anon USING (true);
