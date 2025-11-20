-- Создание таблицы для маппинга внутренних номеров на названия
CREATE TABLE IF NOT EXISTS phone_mappings (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_phone_mappings_org_id ON phone_mappings(org_id);
CREATE INDEX IF NOT EXISTS idx_phone_mappings_phone_number ON phone_mappings(org_id, phone_number);

COMMENT ON TABLE phone_mappings IS 'Маппинг внутренних номеров на пользовательские названия';
COMMENT ON COLUMN phone_mappings.org_id IS 'ID организации';
COMMENT ON COLUMN phone_mappings.phone_number IS 'Внутренний номер телефона';
COMMENT ON COLUMN phone_mappings.display_name IS 'Отображаемое название';
COMMENT ON COLUMN phone_mappings.color IS 'Цвет для визуального выделения';
