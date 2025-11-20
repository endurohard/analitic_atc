-- Миграция для добавления брендирования организаций
-- Логотипы, цвета, и другие настройки внешнего вида

CREATE TABLE IF NOT EXISTS organization_branding (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL UNIQUE,
    logo_url VARCHAR(500),  -- URL или путь к логотипу
    primary_color VARCHAR(20) DEFAULT '#1890ff',  -- Основной цвет
    secondary_color VARCHAR(20) DEFAULT '#52c41a',  -- Вторичный цвет
    background_color VARCHAR(20) DEFAULT '#f5f5f5',  -- Цвет фона
    text_color VARCHAR(20) DEFAULT '#333333',  -- Цвет текста
    company_name VARCHAR(200),  -- Название компании (может отличаться от org name)
    favicon_url VARCHAR(500),  -- URL favicon
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organization_branding_org_id ON organization_branding(org_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_organization_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organization_branding_updated_at
BEFORE UPDATE ON organization_branding
FOR EACH ROW
EXECUTE FUNCTION update_organization_branding_updated_at();
