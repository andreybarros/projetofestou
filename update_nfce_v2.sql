-- ══════════════════════════════════════════════════════════════
-- Festou — Migração NFC-e v2
-- Execute no Supabase SQL Editor (após update_nfce.sql)
-- ══════════════════════════════════════════════════════════════

-- ── 1. Tabela de sequência atômica para numeração NFC-e ───────
-- Evita race condition quando duas vendas são fechadas simultaneamente
CREATE TABLE IF NOT EXISTS nfce_sequencia (
  filial_pk  BIGINT  NOT NULL,
  serie      INTEGER NOT NULL DEFAULT 1,
  ultimo_num INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (filial_pk, serie)
);

-- ── 2. Função RPC para incremento atômico ─────────────────────
-- Chamada via: POST /rest/v1/rpc/next_nfce_numero
-- Body: { "p_filial_pk": 1, "p_serie": 1 }
CREATE OR REPLACE FUNCTION next_nfce_numero(p_filial_pk BIGINT, p_serie INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_num INTEGER;
BEGIN
  INSERT INTO nfce_sequencia (filial_pk, serie, ultimo_num)
  VALUES (p_filial_pk, p_serie, 1)
  ON CONFLICT (filial_pk, serie)
  DO UPDATE SET ultimo_num = nfce_sequencia.ultimo_num + 1
  RETURNING ultimo_num INTO v_num;

  -- Sincronizar com o maior número já emitido (para filiais que já emitiram antes)
  -- Garante que o sequence não seja menor que o máximo já usado
  SELECT GREATEST(v_num, COALESCE(MAX(nfce_numero), 0) + 1)
  INTO v_num
  FROM vendas
  WHERE filial_pk = p_filial_pk
    AND nfce_serie = p_serie
    AND nfce_protocolo IS NOT NULL;

  -- Atualizar sequência se o MAX foi maior
  UPDATE nfce_sequencia
  SET ultimo_num = v_num
  WHERE filial_pk = p_filial_pk AND serie = p_serie AND ultimo_num < v_num;

  RETURN v_num;
END;
$$ LANGUAGE plpgsql;

-- ── 3. Permissão para service role chamar a função ─────────────
GRANT EXECUTE ON FUNCTION next_nfce_numero(BIGINT, INTEGER) TO service_role;
GRANT ALL ON TABLE nfce_sequencia TO service_role;

-- ── 4. Inicializar sequências para filiais existentes ──────────
-- (Roda após executar os itens acima)
INSERT INTO nfce_sequencia (filial_pk, serie, ultimo_num)
SELECT
  filial_pk,
  COALESCE(nfce_serie, 1),
  COALESCE(MAX(nfce_numero), 0)
FROM vendas
WHERE filial_pk IS NOT NULL
GROUP BY filial_pk, nfce_serie
ON CONFLICT (filial_pk, serie) DO NOTHING;

-- ── 5. Coluna nfce_xml nas vendas (caso não exista) ───────────
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS nfce_xml TEXT DEFAULT NULL;

COMMENT ON COLUMN vendas.nfce_xml IS 'XML completo da NFC-e autorizada (usado para reimpressão e cancelamento)';
