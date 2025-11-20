-- Migration 006: Add organization-specific column configurations

CREATE TABLE IF NOT EXISTS organization_columns (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL,
    column_key VARCHAR(100) NOT NULL,
    column_label VARCHAR(200) NOT NULL,
    column_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    column_type VARCHAR(50) DEFAULT 'text', -- text, number, date, status, badge, audio, button
    source_field VARCHAR(200), -- field name from the call object or SQL expression
    is_custom BOOLEAN DEFAULT FALSE, -- whether this is a custom column specific to this org
    width INTEGER, -- optional fixed width in pixels
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, column_key)
);

CREATE INDEX IF NOT EXISTS idx_organization_columns_org_id ON organization_columns(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_columns_visible ON organization_columns(org_id, is_visible);

CREATE OR REPLACE FUNCTION update_organization_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organization_columns_updated_at
BEFORE UPDATE ON organization_columns
FOR EACH ROW
EXECUTE FUNCTION update_organization_columns_updated_at();

-- Insert default column configuration for all organizations
-- This will be the base configuration that all orgs can customize

-- Default columns for organization 1
INSERT INTO organization_columns (org_id, column_key, column_label, column_order, column_type, source_field, is_custom) VALUES
(1, 'player', 'Прослушать', 1, 'audio', 'recording', FALSE),
(1, 'status', 'Статус', 2, 'status', 'status', FALSE),
(1, 'number', 'Номер', 3, 'text', 'number', FALSE),
(1, 'type', 'Тип', 4, 'badge', 'type', FALSE),
(1, 'datetime', 'Время звонка', 5, 'date', 'datetime', FALSE),
(1, 'not_redialed', 'Не перезвонили', 6, 'text', 'not_redialed', FALSE),
(1, 'reserve', 'Резе', 7, 'text', 'reserveMobile', FALSE),
(1, 'funduk', 'Фундук', 8, 'text', 'callto1', TRUE)
ON CONFLICT (org_id, column_key) DO NOTHING;

COMMENT ON TABLE organization_columns IS 'Organization-specific column configurations for calls table';
COMMENT ON COLUMN organization_columns.column_key IS 'Unique key identifier for the column';
COMMENT ON COLUMN organization_columns.column_label IS 'Display label for the column header';
COMMENT ON COLUMN organization_columns.column_order IS 'Display order of columns (lower = earlier)';
COMMENT ON COLUMN organization_columns.column_type IS 'Type of column: text, number, date, status, badge, audio, button';
COMMENT ON COLUMN organization_columns.source_field IS 'Source field name from call object or SQL expression';
COMMENT ON COLUMN organization_columns.is_custom IS 'Whether this is a custom organization-specific column';
