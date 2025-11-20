# Руководство по миграции существующей БД

Если у вас уже есть база данных АТС с другой структурой, следуйте этому руководству для интеграции.

## Шаг 1: Анализ существующей структуры

Изучите свою текущую структуру БД:

```sql
-- Посмотреть все таблицы
\dt

-- Описание таблицы звонков (замените на ваше название)
\d your_calls_table

-- Примеры данных
SELECT * FROM your_calls_table LIMIT 5;
```

## Шаг 2: Создание новых таблиц

Создайте новые таблицы для поддержки мультиорганизационности:

```bash
psql -U your_user -d your_database -f database_schema.sql
```

Или выполните вручную необходимые части из `database_schema.sql`.

## Шаг 3: Адаптация моделей

### Вариант A: Изменить models.py под вашу БД

Откройте `backend/models.py` и измените класс `Call`:

```python
class Call(Base):
    __tablename__ = "your_existing_calls_table"  # ← Ваше название таблицы

    id = Column(Integer, primary_key=True, index=True)
    # Замените на ваши названия колонок:
    call_id = Column("your_call_id_column", String, unique=True)
    caller_number = Column("your_caller_column", String)
    # ... и так далее
```

### Вариант B: Создать VIEW в PostgreSQL

Создайте представление (VIEW), которое адаптирует вашу структуру:

```sql
CREATE VIEW calls AS
SELECT
    id,
    your_call_id AS call_id,
    your_org_field AS org_id,
    your_caller_field AS caller_number,
    your_called_field AS called_number,
    your_datetime_field AS call_date,
    your_duration_field AS duration,
    your_wait_field AS wait_time,
    your_status_field AS status,
    your_direction_field AS direction,
    your_dept_field AS department,
    your_operator_field AS operator,
    FALSE AS is_redialed,  -- Если нет такого поля
    created_at,
    updated_at
FROM your_existing_calls_table;
```

## Шаг 4: Добавление org_id к существующим данным

Если в вашей БД нет поля `org_id`, добавьте его:

```sql
-- Добавить колонку
ALTER TABLE your_calls_table
ADD COLUMN org_id VARCHAR;

-- Создать индекс
CREATE INDEX idx_your_calls_org_id ON your_calls_table(org_id);

-- Установить значение по умолчанию для существующих записей
UPDATE your_calls_table
SET org_id = 'ORG001'
WHERE org_id IS NULL;

-- Сделать поле обязательным
ALTER TABLE your_calls_table
ALTER COLUMN org_id SET NOT NULL;

-- Добавить внешний ключ
ALTER TABLE your_calls_table
ADD CONSTRAINT fk_org_id
FOREIGN KEY (org_id) REFERENCES organizations(org_id);
```

## Шаг 5: Маппинг полей

Создайте файл `backend/field_mapping.py`:

```python
# Маппинг ваших полей к полям приложения
FIELD_MAPPING = {
    'call_id': 'your_call_id_column',
    'caller_number': 'your_caller_column',
    'called_number': 'your_receiver_column',
    'call_date': 'your_timestamp_column',
    'duration': 'your_duration_column',
    'status': 'your_status_column',
    # ... и так далее
}

# Маппинг статусов
STATUS_MAPPING = {
    'answered': 'your_answered_status',
    'missed': 'your_missed_status',
    'busy': 'your_busy_status',
}
```

## Шаг 6: Миграция данных

### Скрипт миграции организаций

```python
# backend/migrate_organizations.py
from database import SessionLocal
from models import Organization
import pandas as pd

db = SessionLocal()

# Если организации определяются по отделам или другим полям
orgs_data = db.execute("""
    SELECT DISTINCT
        department,
        COUNT(*) as call_count
    FROM your_calls_table
    GROUP BY department
""").fetchall()

for dept, count in orgs_data:
    org = Organization(
        org_id=f"ORG_{dept.upper()}",
        name=dept,
        description=f"Организация {dept} ({count} звонков)"
    )
    db.add(org)

db.commit()
print("Организации созданы!")
```

### Обновление существующих звонков

```python
# backend/update_calls_org.py
from database import SessionLocal

db = SessionLocal()

# Пример: присвоить org_id по отделу
db.execute("""
    UPDATE your_calls_table c
    SET org_id = 'ORG_' || UPPER(department)
    WHERE org_id IS NULL
""")

db.commit()
print("org_id обновлены!")
```

## Шаг 7: Настройка API

Измените `backend/main.py` для работы с вашими полями:

```python
@app.get("/api/calls")
def get_calls(org_id: str, db: Session = Depends(get_db)):
    # Используйте RAW SQL если нужно
    result = db.execute(
        """
        SELECT
            id,
            your_call_id as call_id,
            your_caller as caller_number,
            ...
        FROM your_calls_table
        WHERE org_id = :org_id
        """,
        {"org_id": org_id}
    )
    return result.fetchall()
```

## Шаг 8: Тестирование

1. Проверьте подключение к БД:
```bash
docker-compose up backend
curl http://localhost:8000/api/health
```

2. Проверьте получение звонков:
```bash
curl "http://localhost:8000/api/calls?org_id=ORG001&limit=5"
```

3. Проверьте статистику:
```bash
curl "http://localhost:8000/api/statistics/summary?org_id=ORG001"
```

## Часто встречающиеся проблемы

### Проблема: Разные названия статусов

**Решение**: Создайте функцию маппинга в PostgreSQL:

```sql
CREATE OR REPLACE FUNCTION normalize_status(status_value TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN status_value IN ('success', 'completed', 'ok') THEN 'answered'
        WHEN status_value IN ('failed', 'no_answer', 'timeout') THEN 'missed'
        WHEN status_value IN ('busy', 'unavailable') THEN 'busy'
        ELSE status_value
    END;
END;
$$ LANGUAGE plpgsql;
```

### Проблема: Даты в неправильном формате

**Решение**: Конвертируйте в PostgreSQL:

```sql
ALTER TABLE your_calls_table
ADD COLUMN call_date_normalized TIMESTAMP;

UPDATE your_calls_table
SET call_date_normalized = TO_TIMESTAMP(your_date_field, 'DD.MM.YYYY HH24:MI:SS');
```

### Проблема: Нет поля направления звонка

**Решение**: Определите по префиксу или другим данным:

```sql
ALTER TABLE your_calls_table ADD COLUMN direction VARCHAR;

UPDATE your_calls_table
SET direction = CASE
    WHEN caller_number LIKE '8%' THEN 'incoming'
    ELSE 'outgoing'
END;
```

## Пример полной миграции

```bash
# 1. Создать новые таблицы
psql -U user -d atc_db -f database_schema.sql

# 2. Добавить org_id к существующим данным
psql -U user -d atc_db -c "
    ALTER TABLE calls ADD COLUMN IF NOT EXISTS org_id VARCHAR;
    UPDATE calls SET org_id = 'ORG001' WHERE org_id IS NULL;
"

# 3. Запустить приложение
docker-compose up -d

# 4. Инициализировать тестовые организации
docker-compose exec backend python migrate_organizations.py
```

## Откат изменений

Если что-то пошло не так:

```sql
-- Удалить новые таблицы
DROP TABLE IF EXISTS user_organizations CASCADE;
DROP TABLE IF EXISTS call_statistics CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Удалить добавленную колонку
ALTER TABLE your_calls_table DROP COLUMN IF EXISTS org_id;
```

## Поддержка

Если возникли проблемы при миграции, создайте issue с описанием вашей структуры БД.
