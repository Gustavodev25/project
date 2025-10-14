-- =============================================
-- SCRIPT PARA CRIAR TODAS AS 18 TABELAS DO CONTAZOOM
-- PostgreSQL no Render
-- =============================================

-- Habilitar extensão CITEXT para emails case-insensitive
CREATE EXTENSION IF NOT EXISTS citext;

-- =============================================
-- 1. TABELA USUARIO
-- =============================================
CREATE TABLE usuario (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    country VARCHAR(2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuario_created_at ON usuario(created_at);

-- =============================================
-- 2. TABELA MELI_ACCOUNT
-- =============================================
CREATE TABLE meli_account (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    ml_user_id INTEGER NOT NULL,
    nickname TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meli_account_user FOREIGN KEY ("userId") REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_ml_user_id UNIQUE ("userId", ml_user_id)
);

CREATE INDEX idx_meli_account_user_id ON meli_account("userId");

-- =============================================
-- 3. TABELA MELI_OAUTH_STATE
-- =============================================
CREATE TABLE meli_oauth_state (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    state TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL,
    CONSTRAINT fk_meli_oauth_state_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_meli_oauth_state_expires_at ON meli_oauth_state(expires_at);

-- =============================================
-- 4. TABELA SHOPEE_ACCOUNT
-- =============================================
CREATE TABLE shopee_account (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    shop_name TEXT,
    merchant_id TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shopee_account_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_shop_id UNIQUE (user_id, shop_id)
);

CREATE INDEX idx_shopee_account_user_id ON shopee_account(user_id);

-- =============================================
-- 5. TABELA SHOPEE_OAUTH_STATE
-- =============================================
CREATE TABLE shopee_oauth_state (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    state TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shopee_oauth_state_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_shopee_oauth_state_expires_at ON shopee_oauth_state(expires_at);

-- =============================================
-- 6. TABELA BLING_ACCOUNT
-- =============================================
CREATE TABLE bling_account (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    bling_user_id TEXT,
    account_name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bling_account_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_bling_user_id UNIQUE (user_id, bling_user_id)
);

CREATE INDEX idx_bling_account_user_id ON bling_account(user_id);

-- =============================================
-- 7. TABELA BLING_OAUTH_STATE
-- =============================================
CREATE TABLE bling_oauth_state (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    state TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bling_oauth_state_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_bling_oauth_state_expires_at ON bling_oauth_state(expires_at);

-- =============================================
-- 8. TABELA MELI_VENDA
-- =============================================
CREATE TABLE meli_venda (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    meli_account_id TEXT NOT NULL,
    data_venda TIMESTAMP NOT NULL,
    status TEXT NOT NULL,
    conta TEXT NOT NULL,
    valor_total NUMERIC(10,2) NOT NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario NUMERIC(10,2) NOT NULL,
    taxa_plataforma NUMERIC(10,2),
    valor_frete NUMERIC(10,2) NOT NULL,
    frete_ajuste NUMERIC(12,2),
    cmv NUMERIC(10,2),
    margem_contribuicao NUMERIC(10,2),
    is_margem_real BOOLEAN NOT NULL DEFAULT false,
    titulo TEXT NOT NULL,
    sku TEXT,
    comprador TEXT NOT NULL,
    logistic_type TEXT,
    envio_mode TEXT,
    shipping_status TEXT,
    shipping_id TEXT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    frete_base_cost NUMERIC(10,2),
    frete_list_cost NUMERIC(10,2),
    frete_final_cost NUMERIC(10,2),
    frete_adjustment NUMERIC(10,2),
    frete_calculation JSONB,
    exposicao TEXT,
    tipo_anuncio TEXT,
    ads TEXT,
    plataforma TEXT NOT NULL DEFAULT 'Mercado Livre',
    canal TEXT NOT NULL DEFAULT 'ML',
    tags JSONB,
    internal_tags JSONB,
    raw_data JSONB,
    sincronizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meli_venda_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_meli_venda_account FOREIGN KEY (meli_account_id) REFERENCES meli_account(id) ON DELETE CASCADE
);

CREATE INDEX idx_meli_venda_user_id ON meli_venda(user_id);
CREATE INDEX idx_meli_venda_account_id ON meli_venda(meli_account_id);
CREATE INDEX idx_meli_venda_data_venda ON meli_venda(data_venda);
CREATE INDEX idx_meli_venda_order_id ON meli_venda(order_id);

-- =============================================
-- 9. TABELA SHOPEE_VENDA
-- =============================================
CREATE TABLE shopee_venda (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    shopee_account_id TEXT NOT NULL,
    data_venda TIMESTAMP NOT NULL,
    status TEXT NOT NULL,
    conta TEXT NOT NULL,
    valor_total NUMERIC(10,2) NOT NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario NUMERIC(10,2) NOT NULL,
    taxa_plataforma NUMERIC(10,2),
    valor_frete NUMERIC(10,2) NOT NULL,
    frete_ajuste NUMERIC(12,2),
    cmv NUMERIC(10,2),
    margem_contribuicao NUMERIC(10,2),
    is_margem_real BOOLEAN NOT NULL DEFAULT false,
    titulo TEXT NOT NULL,
    sku TEXT,
    comprador TEXT NOT NULL,
    logistic_type TEXT,
    envio_mode TEXT,
    shipping_status TEXT,
    shipping_id TEXT,
    payment_method TEXT,
    payment_status TEXT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    frete_base_cost NUMERIC(10,2),
    frete_list_cost NUMERIC(10,2),
    frete_final_cost NUMERIC(10,2),
    frete_adjustment NUMERIC(10,2),
    frete_calculation JSONB,
    shipment_details JSONB,
    payment_details JSONB,
    plataforma TEXT NOT NULL DEFAULT 'Shopee',
    canal TEXT NOT NULL DEFAULT 'SP',
    tags JSONB,
    internal_tags JSONB,
    raw_data JSONB,
    sincronizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shopee_venda_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_shopee_venda_account FOREIGN KEY (shopee_account_id) REFERENCES shopee_account(id) ON DELETE CASCADE
);

CREATE INDEX idx_shopee_venda_user_id ON shopee_venda(user_id);
CREATE INDEX idx_shopee_venda_account_id ON shopee_venda(shopee_account_id);
CREATE INDEX idx_shopee_venda_data_venda ON shopee_venda(data_venda);
CREATE INDEX idx_shopee_venda_order_id ON shopee_venda(order_id);

-- =============================================
-- 10. TABELA USER_SETTINGS
-- =============================================
CREATE TABLE user_settings (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL UNIQUE,
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
    last_auto_sync_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- =============================================
-- 11. TABELA SYNC_NOTIFICATION
-- =============================================
CREATE TABLE sync_notification (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'new_orders',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    new_orders_count INTEGER NOT NULL DEFAULT 0,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sync_notification_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_notification_user_read ON sync_notification(user_id, is_read);
CREATE INDEX idx_sync_notification_created_at ON sync_notification(created_at);

-- =============================================
-- 12. TABELA SKU
-- =============================================
CREATE TABLE sku (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    produto TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'filho',
    sku_pai TEXT,
    custo_unitario NUMERIC(10,2) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    proporcao NUMERIC(5,4),
    hierarquia_1 TEXT,
    hierarquia_2 TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    tem_estoque BOOLEAN NOT NULL DEFAULT true,
    skus_filhos JSONB,
    observacoes TEXT,
    tags JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sku_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_sku UNIQUE (user_id, sku),
    CONSTRAINT unique_sku UNIQUE (sku)
);

CREATE INDEX idx_sku_user_id ON sku(user_id);
CREATE INDEX idx_sku_sku ON sku(sku);
CREATE INDEX idx_sku_tipo ON sku(tipo);
CREATE INDEX idx_sku_ativo ON sku(ativo);
CREATE INDEX idx_sku_tem_estoque ON sku(tem_estoque);

-- =============================================
-- 13. TABELA SKU_CUSTO_HISTORICO
-- =============================================
CREATE TABLE sku_custo_historico (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sku_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    custo_anterior NUMERIC(10,2),
    custo_novo NUMERIC(10,2) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    motivo TEXT,
    tipo_alteracao TEXT NOT NULL,
    alterado_por TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sku_custo_historico_sku FOREIGN KEY (sku_id) REFERENCES sku(id) ON DELETE CASCADE,
    CONSTRAINT fk_sku_custo_historico_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_sku_custo_historico_sku_id ON sku_custo_historico(sku_id);
CREATE INDEX idx_sku_custo_historico_user_id ON sku_custo_historico(user_id);
CREATE INDEX idx_sku_custo_historico_created_at ON sku_custo_historico(created_at);

-- =============================================
-- 14. TABELA FORMA_PAGAMENTO
-- =============================================
CREATE TABLE forma_pagamento (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    bling_id TEXT,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    sincronizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_forma_pagamento_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_bling_id_forma_pagamento UNIQUE (user_id, bling_id)
);

CREATE INDEX idx_forma_pagamento_user_id ON forma_pagamento(user_id);
CREATE INDEX idx_forma_pagamento_bling_id ON forma_pagamento(bling_id);

-- =============================================
-- 15. TABELA CATEGORIA
-- =============================================
CREATE TABLE categoria (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    bling_id TEXT,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    sincronizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categoria_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_bling_id_categoria UNIQUE (user_id, bling_id)
);

CREATE INDEX idx_categoria_user_id ON categoria(user_id);
CREATE INDEX idx_categoria_bling_id ON categoria(bling_id);

-- =============================================
-- 16. TABELA CONTA_PAGAR
-- =============================================
CREATE TABLE conta_pagar (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    bling_id TEXT,
    forma_pagamento_id TEXT,
    categoria_id TEXT,
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    data_vencimento TIMESTAMP NOT NULL,
    data_pagamento TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pendente',
    sincronizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conta_pagar_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_conta_pagar_forma_pagamento FOREIGN KEY (forma_pagamento_id) REFERENCES forma_pagamento(id),
    CONSTRAINT fk_conta_pagar_categoria FOREIGN KEY (categoria_id) REFERENCES categoria(id),
    CONSTRAINT unique_user_bling_id_conta_pagar UNIQUE (user_id, bling_id)
);

CREATE INDEX idx_conta_pagar_user_id ON conta_pagar(user_id);
CREATE INDEX idx_conta_pagar_bling_id ON conta_pagar(bling_id);
CREATE INDEX idx_conta_pagar_data_vencimento ON conta_pagar(data_vencimento);

-- =============================================
-- 17. TABELA CONTA_RECEBER
-- =============================================
CREATE TABLE conta_receber (
    id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    bling_id TEXT,
    forma_pagamento_id TEXT,
    categoria_id TEXT,
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    data_vencimento TIMESTAMP NOT NULL,
    data_recebimento TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pendente',
    sincronizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conta_receber_user FOREIGN KEY (user_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_conta_receber_forma_pagamento FOREIGN KEY (forma_pagamento_id) REFERENCES forma_pagamento(id),
    CONSTRAINT fk_conta_receber_categoria FOREIGN KEY (categoria_id) REFERENCES categoria(id),
    CONSTRAINT unique_user_bling_id_conta_receber UNIQUE (user_id, bling_id)
);

CREATE INDEX idx_conta_receber_user_id ON conta_receber(user_id);
CREATE INDEX idx_conta_receber_bling_id ON conta_receber(bling_id);
CREATE INDEX idx_conta_receber_data_vencimento ON conta_receber(data_vencimento);

-- =============================================
-- 18. TABELA _PRISMA_MIGRATIONS (Controle interno)
-- =============================================
CREATE TABLE _prisma_migrations (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_usuario_updated_at BEFORE UPDATE ON usuario FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meli_account_updated_at BEFORE UPDATE ON meli_account FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopee_account_updated_at BEFORE UPDATE ON shopee_account FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bling_account_updated_at BEFORE UPDATE ON bling_account FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meli_venda_updated_at BEFORE UPDATE ON meli_venda FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopee_venda_updated_at BEFORE UPDATE ON shopee_venda FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sku_updated_at BEFORE UPDATE ON sku FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forma_pagamento_updated_at BEFORE UPDATE ON forma_pagamento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categoria_updated_at BEFORE UPDATE ON categoria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conta_pagar_updated_at BEFORE UPDATE ON conta_pagar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conta_receber_updated_at BEFORE UPDATE ON conta_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Contar total de tabelas
SELECT COUNT(*) as total_tabelas FROM pg_tables WHERE schemaname = 'public';

-- =============================================
-- FIM DO SCRIPT
-- =============================================
