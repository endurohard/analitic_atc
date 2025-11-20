-- Добавление колонки logo_url в таблицу orgs
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Комментарий для колонки
COMMENT ON COLUMN orgs.logo_url IS 'URL логотипа организации';
