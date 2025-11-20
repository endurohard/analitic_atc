-- Схема базы данных для АТС Аналитики
-- Используйте этот скрипт для создания таблиц в вашей PostgreSQL базе данных

-- Таблица организаций
-- orgId используется как числовой идентификатор для связи с CDR (например, orgId=5 для Salat)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    "orgId" INTEGER UNIQUE NOT NULL,  -- Числовой ID для связи с таблицей cdrs
    name VARCHAR NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_orgId ON organizations("orgId");

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    name VARCHAR,
    email VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);

-- Таблица связи пользователей и организаций
CREATE TABLE IF NOT EXISTS user_organizations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(organization_id);

-- Таблица звонков
-- Если у вас уже есть таблица cdrs, адаптируйте эту схему или используйте VIEW
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR UNIQUE NOT NULL,
    "orgId" INTEGER NOT NULL REFERENCES organizations("orgId") ON DELETE CASCADE,  -- Связь с организацией
    caller_number VARCHAR,
    called_number VARCHAR,
    call_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER,
    wait_time INTEGER,
    status VARCHAR,
    direction VARCHAR,
    department VARCHAR,
    operator VARCHAR,
    is_redialed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calls_orgId ON calls("orgId");
CREATE INDEX idx_calls_call_id ON calls(call_id);
CREATE INDEX idx_calls_caller_number ON calls(caller_number);
CREATE INDEX idx_calls_called_number ON calls(called_number);
CREATE INDEX idx_calls_call_date ON calls(call_date);
CREATE INDEX idx_calls_status ON calls(status);

-- Таблица статистики
CREATE TABLE IF NOT EXISTS call_statistics (
    id SERIAL PRIMARY KEY,
    "orgId" INTEGER NOT NULL REFERENCES organizations("orgId") ON DELETE CASCADE,
    date TIMESTAMP NOT NULL,
    total_calls INTEGER DEFAULT 0,
    answered_calls INTEGER DEFAULT 0,
    missed_calls INTEGER DEFAULT 0,
    not_redialed_calls INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    average_duration FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_call_statistics_orgId ON call_statistics("orgId");
CREATE INDEX idx_call_statistics_date ON call_statistics(date);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at
    BEFORE UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Вставка примерных данных (опционально)

-- Организации с числовым ID (например, orgId=5 для Salat)
INSERT INTO organizations ("orgId", name, description) VALUES
(5, 'Салат', 'Ресторан Салат'),
(2, 'IT Компания', 'IT отдел'),
(3, 'Колл-центр', 'Служба поддержки')
ON CONFLICT ("orgId") DO NOTHING;

-- Комментарии к таблицам
COMMENT ON TABLE organizations IS 'Таблица организаций';
COMMENT ON TABLE users IS 'Таблица пользователей системы';
COMMENT ON TABLE user_organizations IS 'Связь пользователей с организациями и их роли';
COMMENT ON TABLE calls IS 'Таблица звонков АТС';
COMMENT ON TABLE call_statistics IS 'Агрегированная статистика звонков';

COMMENT ON COLUMN calls.status IS 'Статус: answered, missed, busy';
COMMENT ON COLUMN calls.direction IS 'Направление: incoming, outgoing';
COMMENT ON COLUMN user_organizations.role IS 'Роль: admin, user, viewer';
