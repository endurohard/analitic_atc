# Changelog - История изменений

## [1.1.0] - 2025-11-18

### Changed - Изменено
- **Использование числового orgId вместо строкового**
  - `organizations.org_id` (VARCHAR) → `organizations.orgId` (INTEGER)
  - Пример: orgId=5 для ресторана Салат
  - Совместимость с существующими таблицами CDR

### Updated - Обновлено

#### Backend
- `models.py`: все поля `org_id` заменены на `orgId` (Integer)
- `schemas.py`: Pydantic схемы обновлены для Integer orgId
- `main.py`: API endpoints принимают `orgId: int` вместо `org_id: str`

#### Database
- `database_schema.sql`: поле `orgId` INTEGER вместо `org_id` VARCHAR
- Индексы обновлены для `orgId`
- Примеры данных используют числовые ID (5, 2, 3)

#### Scripts
- `manage_organizations.py`: работа с числовым orgId
  - Валидация числового ввода
  - Импорт CSV с числовыми ID
- `organizations_sample.csv`: формат с числовым orgId

### Added - Добавлено
- `EXAMPLE_USAGE.md`: примеры работы с числовым orgId
- `backend/models_cdrs_example.py`: пример адаптации к существующей таблице cdrs
- Примеры SQL запросов для работы с cdrs

### Migration - Миграция

Если вы обновляете существующую установку:

```sql
-- 1. Добавить новое поле orgId
ALTER TABLE organizations ADD COLUMN "orgId" INTEGER;

-- 2. Мигрировать данные (если org_id был строкой типа "ORG001")
-- Вариант A: Если org_id содержал числа
UPDATE organizations SET "orgId" = SUBSTRING(org_id FROM '[0-9]+')::INTEGER;

-- Вариант B: Присвоить новые числовые ID
UPDATE organizations SET "orgId" = id;

-- 3. Сделать orgId обязательным и уникальным
ALTER TABLE organizations ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE organizations ADD CONSTRAINT unique_orgId UNIQUE ("orgId");

-- 4. Обновить связи в таблице calls
ALTER TABLE calls ADD COLUMN "orgId" INTEGER;
UPDATE calls SET "orgId" = (
    SELECT "orgId" FROM organizations WHERE organizations.org_id = calls.org_id
);

-- 5. Удалить старое поле (опционально)
ALTER TABLE calls DROP COLUMN org_id;
ALTER TABLE organizations DROP COLUMN org_id;
```

---

## [1.0.0] - 2025-11-18

### Added - Первая версия
- Полнофункциональная система аналитики АТС
- Backend на FastAPI + PostgreSQL
- Frontend на React
- Docker Compose для развертывания
- Скрипты установки и управления
- Подробная документация (7 файлов)
- Мультиорганизационная структура
- Разграничение доступа по ролям

### Features
- 📊 Дашборд с круговыми диаграммами
- 📞 Таблицы звонков (активные, необработанные, все)
- 🏢 Управление организациями
- 👥 Система авторизации
- 🔧 Автоматическая установка
- 📦 Docker контейнеризация
- 📚 Полная документация
