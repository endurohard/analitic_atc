-- Migration: Create dashboard_layouts table for storing organization-level dashboard layouts
-- Similar to Grafana's approach where layouts are shared across organization

CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id SERIAL PRIMARY KEY,
    org_id INTEGER NOT NULL UNIQUE,
    layout_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by org_id
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_org_id ON dashboard_layouts(org_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_layout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dashboard_layout_updated_at
BEFORE UPDATE ON dashboard_layouts
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_layout_updated_at();
