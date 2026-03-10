-- Инициализация локальной базы данных для аутентификации и настроек

-- Таблица учетных данных организаций
CREATE TABLE IF NOT EXISTS org_credentials (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    logo_url VARCHAR(500),
    primary_color VARCHAR(20) DEFAULT '#1890ff',
    secondary_color VARCHAR(20) DEFAULT '#52c41a',
    company_name VARCHAR(200),
    favicon_url VARCHAR(500),
    show_callto_columns BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица маппингов телефонов
CREATE TABLE IF NOT EXISTS phone_mappings (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица layouts дашбордов
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL UNIQUE,
    layout_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица конфигурации колонок
CREATE TABLE IF NOT EXISTS organization_columns (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    column_key VARCHAR(100) NOT NULL,
    column_label VARCHAR(200) NOT NULL,
    column_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    column_type VARCHAR(50) DEFAULT 'text',
    source_field VARCHAR(200),
    is_custom BOOLEAN DEFAULT FALSE,
    width INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_org_credentials_username ON org_credentials(username);
CREATE INDEX IF NOT EXISTS idx_org_credentials_org_id ON org_credentials(org_id);
CREATE INDEX IF NOT EXISTS idx_phone_mappings_org_id ON phone_mappings(org_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_org_id ON dashboard_layouts(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_columns_org_id ON organization_columns(org_id);

-- Суперадмин (пароль: admin123 - поменяйте после первого входа!)
-- Хеш сгенерирован bcrypt для 'admin123'
INSERT INTO org_credentials (org_id, username, password_hash, company_name, is_active)
VALUES (0, 'itadmin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G6X6.QVmLqKyXi', 'Суперадминистратор', true)
ON CONFLICT (username) DO NOTHING;
