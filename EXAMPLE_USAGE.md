# Примеры использования с числовым orgId

## Пример: Salat с orgId = 5

### 1. Создание организации Salat

```bash
cd scripts
python manage_organizations.py
```

```
Выберите действие: 2

Введите уникальный числовой ID организации: 5
Введите название организации: Салат
Введите описание: Ресторан Салат

✓ Организация успешно добавлена (DB ID: 1)
  Org ID: 5 (для связи с CDR)
  Название: Салат
```

### 2. API запросы для Salat (orgId=5)

#### Получить список звонков
```bash
curl "http://localhost:8000/api/calls?orgId=5&limit=10"
```

#### Получить статистику
```bash
curl "http://localhost:8000/api/statistics/summary?orgId=5"
```

Ответ:
```json
{
  "total_calls": 386,
  "answered_calls": 345,
  "missed_calls": 41,
  "not_redialed": 4
}
```

#### Получить необработанные звонки
```bash
curl "http://localhost:8000/api/calls/unprocessed?orgId=5&limit=20"
```

#### Статистика по датам
```bash
curl "http://localhost:8000/api/statistics/by-date?orgId=5&start_date=2025-11-01&end_date=2025-11-18"
```

### 3. SQL запросы

#### Добавить организацию Salat
```sql
INSERT INTO organizations ("orgId", name, description)
VALUES (5, 'Салат', 'Ресторан Салат');
```

#### Добавить звонок для Salat
```sql
INSERT INTO calls ("orgId", call_id, caller_number, called_number, status, direction)
VALUES (5, 'CALL001', '9280532626', '9995338191', 'answered', 'incoming');
```

#### Получить все звонки Salat
```sql
SELECT * FROM calls WHERE "orgId" = 5 ORDER BY call_date DESC LIMIT 100;
```

#### Статистика по Salat
```sql
SELECT
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE status = 'answered') as answered,
    COUNT(*) FILTER (WHERE status = 'missed') as missed
FROM calls
WHERE "orgId" = 5;
```

### 4. Работа с существующей таблицей cdrs

Если у вас уже есть таблица `cdrs` с полем `orgId`:

#### Вариант A: Использовать cdrs напрямую

В `backend/models.py` измените:
```python
class Call(Base):
    __tablename__ = "cdrs"  # Ваша существующая таблица

    id = Column(Integer, primary_key=True)
    orgId = Column(Integer, ForeignKey("organizations.orgId"))

    # Ваши реальные поля из cdrs
    calldate = Column(DateTime)  # вместо call_date
    src = Column(String)  # вместо caller_number
    dst = Column(String)  # вместо called_number
    # и т.д.
```

#### Вариант B: Создать VIEW для совместимости

```sql
CREATE OR REPLACE VIEW calls AS
SELECT
    id,
    CAST(id AS VARCHAR) as call_id,
    "orgId",
    src as caller_number,
    dst as called_number,
    calldate as call_date,
    duration,
    CASE
        WHEN disposition = 'ANSWERED' THEN 'answered'
        WHEN disposition = 'NO ANSWER' THEN 'missed'
        WHEN disposition = 'BUSY' THEN 'busy'
        ELSE 'unknown'
    END as status,
    CASE
        WHEN src LIKE '9%' THEN 'incoming'
        ELSE 'outgoing'
    END as direction,
    FALSE as is_redialed,
    calldate as created_at,
    calldate as updated_at
FROM cdrs;
```

Теперь приложение будет работать с VIEW, который адаптирует вашу структуру cdrs.

#### Вариант C: RAW SQL запросы

В `backend/main.py`:
```python
@app.get("/api/calls")
def get_calls(orgId: int, db: Session = Depends(get_db)):
    result = db.execute(
        '''
        SELECT
            id,
            src as caller_number,
            dst as called_number,
            calldate as call_date,
            disposition as status
        FROM cdrs
        WHERE "orgId" = :orgId
        ORDER BY calldate DESC
        LIMIT 100
        ''',
        {"orgId": orgId}
    )
    calls = result.fetchall()
    return [dict(row) for row in calls]
```

### 5. Frontend использование

В `frontend/src/components/Dashboard.js` данные автоматически будут подтягиваться по orgId:

```javascript
// API запрос с orgId=5 для Salat
const response = await axios.get(`${API_URL}/api/calls`, {
  params: {
    orgId: organization.orgId  // 5 для Salat
  }
});
```

### 6. Множество организаций

```sql
-- Добавить другие организации
INSERT INTO organizations ("orgId", name, description) VALUES
(2, 'IT Компания', 'IT отдел'),
(3, 'Колл-центр', 'Служба поддержки'),
(10, 'Продажи', 'Отдел продаж');
```

Теперь каждая организация будет иметь свои данные, изолированные по `orgId`.

### 7. Проверка изоляции данных

```sql
-- Звонки только для Salat (orgId=5)
SELECT COUNT(*) FROM calls WHERE "orgId" = 5;

-- Звонки для всех организаций с группировкой
SELECT
    o.name,
    o."orgId",
    COUNT(c.id) as calls_count
FROM organizations o
LEFT JOIN calls c ON o."orgId" = c."orgId"
GROUP BY o.name, o."orgId";
```

Результат:
```
   name      | orgId | calls_count
-------------+-------+-------------
 Салат       |     5 |         386
 IT Компания |     2 |          50
 Колл-центр  |     3 |         120
```

### 8. Импорт организаций из CSV

Создайте файл `organizations.csv`:
```csv
orgId,name,description
5,Салат,Ресторан Салат
2,IT Компания,IT отдел
3,Колл-центр,Служба поддержки
```

Импортируйте:
```bash
cd scripts
python manage_organizations.py
# Выберите: 5 - Импорт из CSV
# Укажите путь: organizations.csv
```

### 9. Пример полного workflow

```bash
# 1. Создать организацию Salat
psql -U postgres -d atc_analytics -c "
INSERT INTO organizations (\"orgId\", name, description)
VALUES (5, 'Салат', 'Ресторан Салат');
"

# 2. Добавить тестовые звонки
psql -U postgres -d atc_analytics -c "
INSERT INTO calls (\"orgId\", call_id, caller_number, called_number, status, direction, call_date)
VALUES
(5, 'CALL001', '9280532626', '9995338191', 'answered', 'incoming', NOW()),
(5, 'CALL002', '9887741604', '9667699009', 'missed', 'incoming', NOW()),
(5, 'CALL003', '9282765709', '9666666858', 'answered', 'outgoing', NOW());
"

# 3. Запустить приложение
docker-compose up -d

# 4. Проверить API
curl "http://localhost:8000/api/calls?orgId=5"
curl "http://localhost:8000/api/statistics/summary?orgId=5"

# 5. Открыть в браузере
open http://localhost:3000
```

---

## Резюме

Теперь система использует **числовой orgId** для связи с CDR:

- ✅ `organizations.orgId` - числовой ID (например, 5 для Salat)
- ✅ `calls.orgId` (или `cdrs.orgId`) - числовой ID для связи
- ✅ API endpoints принимают `orgId` как integer
- ✅ SQL запросы используют `WHERE "orgId" = 5`
- ✅ Скрипты управления работают с числовым ID

**Пример для Salat:**
```bash
# API
curl "http://localhost:8000/api/calls?orgId=5"

# SQL
SELECT * FROM cdrs WHERE "orgId" = 5;

# Python
db.query(Call).filter(Call.orgId == 5).all()
```
