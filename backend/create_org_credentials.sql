-- Создание таблицы для хранения логинов и паролей организаций
CREATE TABLE IF NOT EXISTS org_credentials (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по username
CREATE INDEX IF NOT EXISTS idx_org_credentials_username ON org_credentials(username);
CREATE INDEX IF NOT EXISTS idx_org_credentials_org_id ON org_credentials(org_id);

-- Комментарии к таблице
COMMENT ON TABLE org_credentials IS 'Учетные данные для доступа к дашборду организаций';
COMMENT ON COLUMN org_credentials.org_id IS 'ID организации из таблицы orgs';
COMMENT ON COLUMN org_credentials.username IS 'Логин для входа';
COMMENT ON COLUMN org_credentials.password_hash IS 'Хеш пароля (bcrypt)';
