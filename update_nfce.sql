-- ══════════════════════════════════════════════════════════════
-- Festou — Migração NFC-e / Fiscal
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── 1. Dados fiscais nos produtos ─────────────────────────────
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ncm              TEXT DEFAULT NULL,          -- NCM 8 dígitos (ex: '95030099')
  ADD COLUMN IF NOT EXISTS cfop             TEXT DEFAULT '5102',        -- CFOP padrão: venda interna
  ADD COLUMN IF NOT EXISTS csosn            TEXT DEFAULT '400',         -- CSOSN Simples Nacional (400 = sem destaque ICMS)
  ADD COLUMN IF NOT EXISTS unidade_comercial TEXT DEFAULT 'UN',         -- UN, KG, L, CX, PCT...
  ADD COLUMN IF NOT EXISTS unidade_tributavel TEXT DEFAULT 'UN',        -- mesma da comercial na maioria dos casos
  ADD COLUMN IF NOT EXISTS origem           TEXT DEFAULT '0';           -- 0 = Nacional

COMMENT ON COLUMN produtos.ncm    IS 'Nomenclatura Comum do Mercosul (8 dígitos) — obrigatório para NF-e';
COMMENT ON COLUMN produtos.cfop   IS 'Código Fiscal de Operações (ex: 5102 para venda interna)';
COMMENT ON COLUMN produtos.csosn  IS 'CSOSN para Simples Nacional (ex: 400 sem destaque de ICMS)';

-- ── 2. Dados fiscais e NFC-e nas filiais ──────────────────────
ALTER TABLE filiais
  ADD COLUMN IF NOT EXISTS ie               TEXT DEFAULT NULL,          -- Inscrição Estadual
  ADD COLUMN IF NOT EXISTS razao_social     TEXT DEFAULT NULL,          -- Razão Social completa
  ADD COLUMN IF NOT EXISTS nome_fantasia    TEXT DEFAULT NULL,          -- Nome Fantasia
  ADD COLUMN IF NOT EXISTS logradouro       TEXT DEFAULT NULL,          -- Endereço
  ADD COLUMN IF NOT EXISTS numero_end       TEXT DEFAULT NULL,          -- Número do endereço
  ADD COLUMN IF NOT EXISTS complemento_end  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bairro           TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cidade           TEXT DEFAULT 'Manaus',
  ADD COLUMN IF NOT EXISTS uf               TEXT DEFAULT 'AM',
  ADD COLUMN IF NOT EXISTS cep              TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfce_serie       INTEGER DEFAULT 1,          -- Série NFC-e
  ADD COLUMN IF NOT EXISTS nfce_ambiente    TEXT DEFAULT '2',           -- 1=Produção 2=Homologação
  ADD COLUMN IF NOT EXISTS nfce_csc         TEXT DEFAULT NULL,          -- Código de Segurança do Contribuinte
  ADD COLUMN IF NOT EXISTS nfce_csc_id      TEXT DEFAULT '000001',      -- ID do CSC
  ADD COLUMN IF NOT EXISTS nfce_cert_b64    TEXT DEFAULT NULL,          -- Certificado A1 em base64
  ADD COLUMN IF NOT EXISTS nfce_cert_senha  TEXT DEFAULT NULL,          -- Senha do certificado (criptografar!)
  ADD COLUMN IF NOT EXISTS nfce_cert_venc   DATE DEFAULT NULL,          -- Vencimento do certificado
  ADD COLUMN IF NOT EXISTS nfce_cert_titular TEXT DEFAULT NULL;         -- Titular do certificado

COMMENT ON COLUMN filiais.ie            IS 'Inscrição Estadual — obrigatória para emissão de NF-e/NFC-e';
COMMENT ON COLUMN filiais.nfce_csc      IS 'CSC obtido junto à SEFAZ-AM para geração do QR Code NFC-e';
COMMENT ON COLUMN filiais.nfce_cert_b64 IS 'Certificado A1 (.pfx) codificado em base64';

-- ── 3. Dados da NFC-e emitida nas vendas ─────────────────────
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS nfce_chave       TEXT DEFAULT NULL,          -- Chave de acesso (44 dígitos)
  ADD COLUMN IF NOT EXISTS nfce_protocolo   TEXT DEFAULT NULL,          -- Protocolo de autorização SEFAZ
  ADD COLUMN IF NOT EXISTS nfce_status      TEXT DEFAULT NULL,          -- cStat da SEFAZ (100 = autorizada)
  ADD COLUMN IF NOT EXISTS nfce_motivo      TEXT DEFAULT NULL,          -- xMotivo da SEFAZ
  ADD COLUMN IF NOT EXISTS nfce_numero      INTEGER DEFAULT NULL,       -- Número da NFC-e
  ADD COLUMN IF NOT EXISTS nfce_serie       INTEGER DEFAULT NULL,       -- Série da NFC-e
  ADD COLUMN IF NOT EXISTS nfce_ambiente    TEXT DEFAULT NULL,          -- '1' prod / '2' hom
  ADD COLUMN IF NOT EXISTS nfce_xml         TEXT DEFAULT NULL,          -- XML completo autorizado
  ADD COLUMN IF NOT EXISTS nfce_qrcode      TEXT DEFAULT NULL,          -- URL do QR Code
  ADD COLUMN IF NOT EXISTS nfce_dh_emissao  TEXT DEFAULT NULL,          -- Data/hora de emissão
  ADD COLUMN IF NOT EXISTS nfce_cpf_dest    TEXT DEFAULT NULL;          -- CPF do destinatário (opcional)

COMMENT ON COLUMN vendas.nfce_chave    IS 'Chave de acesso NFC-e — 44 dígitos, identifica a nota na SEFAZ';
COMMENT ON COLUMN vendas.nfce_protocolo IS 'Número do protocolo de autorização retornado pela SEFAZ';

-- ── 4. Índice na chave NFC-e para consultas rápidas ──────────
CREATE INDEX IF NOT EXISTS idx_vendas_nfce_chave ON vendas(nfce_chave);
CREATE INDEX IF NOT EXISTS idx_vendas_nfce_numero ON vendas(filial_pk, nfce_serie, nfce_numero);

-- ── 5. Dados padrão para a filial principal ──────────────────
-- (Ajuste o pk conforme sua filial cadastrada)
-- UPDATE filiais
-- SET
--   razao_social  = 'ANDREY RONALD BARROS DA CONCEICAO ME',
--   nome_fantasia = 'FESTOU',
--   logradouro    = 'ALAMEDA COSME FERREIRA',
--   numero_end    = '6893',
--   bairro        = 'ZUMBI DOS PALMARES',
--   cidade        = 'Manaus',
--   uf            = 'AM',
--   cep           = '69037220',
--   ie            = 'SEU_NUMERO_IE_AQUI',
--   nfce_serie    = 1,
--   nfce_ambiente = '2'   -- Comece em Homologação!
-- WHERE pk = 'SEU_FILIAL_PK_AQUI';
