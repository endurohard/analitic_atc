# АТС Аналитика

Веб-приложение для аналитики телефонных звонков с поддержкой мультиорганизационной структуры.

## Возможности

- Мультиорганизационная система с разграничением доступа
- Просмотр статистики звонков в реальном времени
- Отслеживание активных, пропущенных и необработанных звонков
- Визуализация данных с круговыми диаграммами
- Фильтрация по датам и типам звонков
- REST API для интеграции

## Технологии

### Backend
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy ORM
- Pydantic для валидации

### Frontend
- React 18
- Axios для HTTP запросов
- React Router для навигации
- CSS3 для стилизации

### Инфраструктура
- Docker & Docker Compose
- Nginx (опционально для продакшена)

## Структура проекта

```
analitic_atc/
├── backend/
│   ├── main.py              # Основной файл приложения
│   ├── models.py            # Модели базы данных
│   ├── schemas.py           # Pydantic схемы
│   ├── database.py          # Настройка подключения к БД
│   ├── requirements.txt     # Python зависимости
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # React компоненты
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       # Docker Compose конфигурация
├── .env                     # Переменные окружения
├── .env.example            # Пример конфигурации
└── README.md
```

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- PostgreSQL (если используете внешнюю БД)
- Python 3.6+ (для скриптов установки)

### Установка и запуск

#### Вариант A: Автоматическая установка (Рекомендуется)

```bash
# 1. Установите зависимости для скриптов
cd scripts
pip install -r requirements.txt

# 2. Настройте .env
cd ..
cp .env.example .env
nano .env  # Укажите параметры PostgreSQL

# 3. Запустите автоматическую установку
cd scripts
python setup.py

# 4. Управление организациями
python manage_organizations.py

# 5. Запустите приложение
cd ..
docker-compose up -d
```

#### Вариант B: Ручная установка

1. **Настройте переменные окружения**

   Скопируйте `.env.example` в `.env` и отредактируйте параметры подключения к PostgreSQL:
   ```bash
   cp .env.example .env
   ```

   Укажите параметры вашей базы данных в `.env`:
   ```env
   POSTGRES_HOST=your_postgres_host
   POSTGRES_PORT=5432
   POSTGRES_USER=your_username
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=atc_analytics
   ```

2. **Создайте базу данных и таблицы**

   ```bash
   # Используя скрипт (Linux/Mac)
   ./scripts/create_database.sh

   # Или вручную через psql
   psql -h your_host -U your_user -d postgres -f database_schema.sql
   ```

3. **Добавьте организации**

   ```bash
   cd scripts
   python manage_organizations.py
   ```

4. **Запустите приложение**
   ```bash
   docker-compose up -d
   ```

5. **Откройте в браузере**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API документация: http://localhost:8000/docs

### Использование локальной PostgreSQL

Если вы хотите использовать локальную базу данных вместо внешней, раскомментируйте секцию `postgres` в `docker-compose.yml`:

```yaml
postgres:
  image: postgres:15-alpine
  container_name: atc_analytics_db
  ports:
    - "5432:5432"
  environment:
    - POSTGRES_USER=${POSTGRES_USER}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    - POSTGRES_DB=${POSTGRES_DB}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  networks:
    - atc_network
  restart: unless-stopped
```

И раскомментируйте volume в конце файла:
```yaml
volumes:
  postgres_data:
```

Затем обновите `.env`:
```env
POSTGRES_HOST=postgres
```

## Структура базы данных

### Таблицы

#### organizations
- `id` - первичный ключ
- `org_id` - уникальный идентификатор организации
- `name` - название организации
- `description` - описание

#### users
- `id` - первичный ключ
- `username` - имя пользователя (уникальное)
- `password_hash` - хэш пароля
- `name` - полное имя
- `email` - email
- `is_active` - активность аккаунта

#### user_organizations
- `id` - первичный ключ
- `user_id` - ID пользователя (FK)
- `organization_id` - ID организации (FK)
- `role` - роль (admin, user, viewer)

#### calls
- `id` - первичный ключ
- `call_id` - уникальный ID звонка
- `org_id` - ID организации (FK)
- `caller_number` - номер звонящего
- `called_number` - номер получателя
- `call_date` - дата и время звонка
- `duration` - длительность (секунды)
- `wait_time` - время ожидания (секунды)
- `status` - статус (answered, missed, busy)
- `direction` - направление (incoming, outgoing)
- `department` - отдел
- `operator` - оператор
- `is_redialed` - перезвонили ли

#### call_statistics
- `id` - первичный ключ
- `org_id` - ID организации (FK)
- `date` - дата
- `total_calls` - всего звонков
- `answered_calls` - принятых звонков
- `missed_calls` - пропущенных звонков
- `not_redialed_calls` - не перезвонили
- `total_duration` - общая длительность
- `average_duration` - средняя длительность

## API Endpoints

### Здоровье приложения
```
GET /api/health - Проверка подключения к БД
```

### Организации
```
GET /api/organizations?user_id={id} - Список организаций пользователя
```

### Звонки
```
GET /api/calls?org_id={id}&skip=0&limit=100 - Список звонков
GET /api/calls/{call_id}?org_id={id} - Информация о звонке
GET /api/calls/unprocessed?org_id={id} - Необработанные звонки
```

### Статистика
```
GET /api/statistics/summary?org_id={id} - Общая статистика
GET /api/statistics/by-date?org_id={id}&start_date=...&end_date=... - Статистика по датам
```

## Разработка

### Backend

Для локальной разработки backend:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

Для локальной разработки frontend:

```bash
cd frontend
npm install
npm start
```

## Остановка приложения

```bash
docker-compose down
```

Для полной очистки (включая volumes):
```bash
docker-compose down -v
```

## Миграции базы данных

Для создания миграций используйте Alembic:

```bash
cd backend
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Производственное развертывание

Для продакшена:

1. Измените `DEBUG=False` в `.env`
2. Установите надежный `SECRET_KEY`
3. Используйте HTTPS
4. Настройте Nginx как reverse proxy
5. Используйте gunicorn вместо uvicorn с reload
6. Настройте регулярные бэкапы БД

## Адаптация под вашу БД

Если у вас уже есть база данных с другой структурой:

1. Отредактируйте `backend/models.py` под вашу схему
2. Измените названия таблиц и полей в `__tablename__` и `Column`
3. Обновите `backend/schemas.py` соответственно
4. Адаптируйте запросы в `backend/main.py`

Пример адаптации:
```python
# Если ваша таблица звонков называется "phone_calls"
class Call(Base):
    __tablename__ = "phone_calls"  # Ваше название
    # ... ваши поля
```

## Лицензия

MIT

## Поддержка

Для вопросов и проблем создайте issue в репозитории.
