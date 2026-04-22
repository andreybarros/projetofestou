-- ============================================================
-- Parâmetros v2 — adiciona crediario_exige_cliente
-- Execute no SQL Editor do Supabase
-- ============================================================

INSERT INTO parametros (filial_pk, chave, valor)
VALUES (null, 'crediario_exige_cliente', 'true')
ON CONFLICT DO NOTHING;
