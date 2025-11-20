-- Добавление поля show_callto_columns в таблицу orgs
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS show_callto_columns BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN orgs.show_callto_columns IS 'Показывать колонки callto1 и callto2 в таблице звонков';
