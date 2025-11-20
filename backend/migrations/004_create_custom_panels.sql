-- Миграция для кастомных панелей дашборда (как в Grafana)
-- Позволяет супер-админам редактировать код панелей

CREATE TABLE IF NOT EXISTS custom_panels (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    panel_key VARCHAR(100) NOT NULL,  -- Ключ панели: 'calls-list', 'statistics', etc.
    panel_code TEXT,  -- JavaScript код компонента
    is_active BOOLEAN DEFAULT false,  -- Включена ли кастомная панель
    created_by INTEGER,  -- ID пользователя создавшего
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, panel_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_panels_org_key ON custom_panels(org_id, panel_key);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_custom_panel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_panel_updated_at
BEFORE UPDATE ON custom_panels
FOR EACH ROW
EXECUTE FUNCTION update_custom_panel_updated_at();
