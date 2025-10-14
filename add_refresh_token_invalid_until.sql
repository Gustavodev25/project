-- Adicionar campo refresh_token_invalid_until nas tabelas de contas
-- Execute este SQL no pgAdmin para resolver o problema do Prisma

-- 1. Adicionar campo na tabela meli_account
ALTER TABLE meli_account 
ADD COLUMN refresh_token_invalid_until TIMESTAMP;

-- 2. Adicionar campo na tabela shopee_account  
ALTER TABLE shopee_account
ADD COLUMN refresh_token_invalid_until TIMESTAMP;

-- 3. Adicionar campo na tabela bling_account
ALTER TABLE bling_account
ADD COLUMN refresh_token_invalid_until TIMESTAMP;

-- 4. Adicionar comentários para documentar os campos
COMMENT ON COLUMN meli_account.refresh_token_invalid_until IS 'Data até quando o refresh token está marcado como inválido (24h após erro de renovação)';
COMMENT ON COLUMN shopee_account.refresh_token_invalid_until IS 'Data até quando o refresh token está marcado como inválido (24h após erro de renovação)';
COMMENT ON COLUMN bling_account.refresh_token_invalid_until IS 'Data até quando o refresh token está marcado como inválido (24h após erro de renovação)';

-- 5. Verificar se os campos foram adicionados corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('meli_account', 'shopee_account', 'bling_account')
    AND column_name = 'refresh_token_invalid_until'
ORDER BY table_name;
