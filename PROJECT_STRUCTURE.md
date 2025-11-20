# Структура проекта АТС Аналитика

```
analitic_atc/
│
├── 📄 README.md                      # Основная документация
├── 📄 INSTALL.md                     # Полное руководство по установке
├── 📄 QUICKSTART.md                  # Быстрый старт (5 минут)
├── 📄 MIGRATION_GUIDE.md             # Миграция существующей БД
├── 📄 PROJECT_STRUCTURE.md           # Этот файл
│
├── 🐳 docker-compose.yml             # Docker Compose конфигурация
├── 📄 Makefile                       # Команды для управления
├── 🗄️ database_schema.sql           # SQL схема базы данных
│
├── 🔐 .env                           # Переменные окружения (создается вами)
├── 📄 .env.example                   # Пример конфигурации
├── 📄 .gitignore                     # Git ignore файл
│
├── 📁 backend/                       # Backend приложение (FastAPI)
│   ├── 📄 Dockerfile                 # Docker образ для backend
│   ├── 📄 requirements.txt           # Python зависимости
│   ├── 🐍 main.py                    # Главный файл API
│   ├── 🐍 models.py                  # Модели базы данных (SQLAlchemy)
│   ├── 🐍 schemas.py                 # Pydantic схемы
│   ├── 🐍 database.py                # Настройка подключения к БД
│   └── 🐍 init_db.py                 # Скрипт инициализации БД
│
├── 📁 frontend/                      # Frontend приложение (React)
│   ├── 📄 Dockerfile                 # Docker образ для frontend
│   ├── 📄 package.json               # Node.js зависимости
│   │
│   ├── 📁 public/                    # Статические файлы
│   │   └── 📄 index.html             # HTML шаблон
│   │
│   └── 📁 src/                       # Исходный код React
│       ├── 🎨 index.js               # Точка входа
│       ├── 🎨 index.css              # Глобальные стили
│       ├── 🎨 App.js                 # Главный компонент
│       ├── 🎨 App.css                # Стили приложения
│       │
│       └── 📁 components/            # React компоненты
│           ├── 🎨 Login.js           # Страница входа
│           ├── 🎨 Login.css          # Стили входа
│           ├── 🎨 OrganizationSelector.js  # Выбор организации
│           ├── 🎨 OrganizationSelector.css # Стили селектора
│           ├── 🎨 Dashboard.js       # Главный дашборд
│           ├── 🎨 Dashboard.css      # Стили дашборда
│           ├── 🎨 CallsTable.js      # Таблица звонков
│           ├── 🎨 CallsTable.css     # Стили таблицы
│           ├── 🎨 Statistics.js      # Компонент статистики
│           └── 🎨 Statistics.css     # Стили статистики
│
└── 📁 scripts/                       # Скрипты установки и управления
    ├── 📄 README.md                  # Документация скриптов
    ├── 📄 requirements.txt           # Python зависимости для скриптов
    │
    ├── 🐍 setup.py                   # Автоматическая установка
    ├── 🐍 manage_organizations.py    # Управление организациями
    ├── 🔧 create_database.sh         # Создание БД (Bash)
    │
    └── 📄 organizations_sample.csv   # Пример CSV для импорта
```

---

## Описание директорий

### 📁 backend/ - Backend приложение

FastAPI приложение, предоставляющее REST API для работы с данными АТС.

**Основные файлы:**

- **main.py** - API endpoints для звонков, организаций, статистики
- **models.py** - ORM модели: Organization, User, Call, CallStatistics
- **schemas.py** - Pydantic схемы для валидации данных
- **database.py** - Подключение к PostgreSQL через SQLAlchemy
- **init_db.py** - Создание таблиц и тестовых данных

**Зависимости:**
- FastAPI - веб-фреймворк
- SQLAlchemy - ORM
- psycopg2 - драйвер PostgreSQL
- Pydantic - валидация данных

---

### 📁 frontend/ - Frontend приложение

React SPA с интерфейсом для просмотра аналитики звонков.

**Компоненты:**

- **Login.js** - Авторизация пользователей
- **OrganizationSelector.js** - Выбор организации с отображением роли
- **Dashboard.js** - Главный экран с вкладками и статистикой
- **CallsTable.js** - Таблица звонков с фильтрацией
- **Statistics.js** - Круговые диаграммы (принятые, пропущенные, и т.д.)

**Зависимости:**
- React 18 - UI библиотека
- React Router - навигация
- Axios - HTTP клиент

---

### 📁 scripts/ - Скрипты установки

Инструменты для установки и настройки системы.

**Скрипты:**

1. **setup.py** - Полная автоматическая установка
   - Проверяет конфигурацию
   - Создает БД
   - Создает таблицы
   - Добавляет примерные данные

2. **manage_organizations.py** - Интерактивный менеджер организаций
   - CRUD операции
   - Массовый импорт из CSV
   - Экспорт в CSV

3. **create_database.sh** - Bash скрипт для создания БД

---

## Файлы конфигурации

### docker-compose.yml

Определяет 2-3 сервиса:
- **backend** - FastAPI контейнер (порт 8000)
- **frontend** - React контейнер (порт 3000)
- **postgres** (опционально) - PostgreSQL контейнер

### .env

Переменные окружения:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=atc_analytics
SECRET_KEY=your_secret_key
DEBUG=True
```

### Makefile

Полезные команды:
```bash
make up              # Запустить
make down            # Остановить
make logs            # Логи
make restart         # Перезапуск
make clean           # Очистка
make setup           # Установка
make manage-orgs     # Управление организациями
```

---

## База данных

### Таблицы

1. **organizations** - Организации
   - id, org_id, name, description

2. **users** - Пользователи
   - id, username, password_hash, name, email

3. **user_organizations** - Связь пользователь-организация
   - id, user_id, organization_id, role

4. **calls** - Звонки АТС
   - id, call_id, org_id, caller_number, called_number
   - call_date, duration, wait_time, status, direction
   - department, operator, is_redialed

5. **call_statistics** - Агрегированная статистика
   - id, org_id, date, total_calls, answered_calls
   - missed_calls, not_redialed_calls

### Индексы

Созданы на:
- org_id (во всех таблицах)
- caller_number, called_number
- call_date
- status

---

## API Endpoints

### Организации
```
GET  /api/organizations?user_id={id}  # Список организаций пользователя
```

### Звонки
```
GET  /api/calls?org_id={id}           # Список звонков
GET  /api/calls/{id}?org_id={id}      # Конкретный звонок
GET  /api/calls/unprocessed?org_id={id} # Необработанные
```

### Статистика
```
GET  /api/statistics/summary?org_id={id}     # Общая статистика
GET  /api/statistics/by-date?org_id={id}&... # По датам
```

### Здоровье
```
GET  /api/health                      # Проверка БД
GET  /                                # Информация о API
```

---

## Workflow разработки

### Локальная разработка Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Локальная разработка Frontend

```bash
cd frontend
npm install
npm start
```

### Разработка через Docker

```bash
docker-compose up
# Код монтируется через volumes
# Изменения применяются автоматически
```

---

## Размеры и ресурсы

### Образы Docker

- **backend**: ~500 MB (Python 3.11 + зависимости)
- **frontend**: ~400 MB (Node 18 + зависимости)
- **postgres**: ~200 MB (Alpine-based)

### Требования

- RAM: 2+ GB для всех сервисов
- Disk: 10+ GB свободного места
- CPU: 2+ cores рекомендуется

---

## Безопасность

### Что НЕ включать в git:

- `.env` - содержит пароли и ключи
- `__pycache__/` - Python cache
- `node_modules/` - Node зависимости
- `*.pyc` - скомпилированные файлы

### Рекомендации:

1. Используйте сильные пароли в `.env`
2. Измените `SECRET_KEY` в продакшене
3. Используйте HTTPS в продакшене
4. Настройте firewall для PostgreSQL
5. Регулярно обновляйте зависимости

---

## Расширение проекта

### Добавление новой модели

1. Добавьте класс в `backend/models.py`
2. Создайте схему в `backend/schemas.py`
3. Добавьте endpoints в `backend/main.py`
4. Создайте миграцию (Alembic)

### Добавление нового компонента

1. Создайте `frontend/src/components/NewComponent.js`
2. Создайте `frontend/src/components/NewComponent.css`
3. Импортируйте в `App.js` или другой компонент

### Добавление нового API endpoint

```python
# backend/main.py
@app.get("/api/new-endpoint")
def new_endpoint(org_id: str, db: Session = Depends(get_db)):
    # Ваша логика
    return {"data": "result"}
```

---

## Документация

### Основные файлы

- **README.md** - Полная документация проекта
- **INSTALL.md** - Детальное руководство по установке
- **QUICKSTART.md** - Быстрый старт за 5 минут
- **MIGRATION_GUIDE.md** - Миграция существующей БД
- **scripts/README.md** - Документация скриптов

### Онлайн документация

- API Docs: http://localhost:8000/docs (Swagger)
- ReDoc: http://localhost:8000/redoc

---

## Полезные команды

### Docker

```bash
# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f frontend

# Shell в контейнере
docker-compose exec backend /bin/sh
docker-compose exec frontend /bin/sh

# Пересборка
docker-compose build --no-cache
docker-compose up -d --build
```

### База данных

```bash
# Подключение к БД
psql -h localhost -U postgres -d atc_analytics

# Бэкап
pg_dump -h localhost -U postgres atc_analytics > backup.sql

# Восстановление
psql -h localhost -U postgres atc_analytics < backup.sql
```

### Git

```bash
# Первый commit
git init
git add .
git commit -m "Initial commit: ATC Analytics project"

# Создать .gitignore (уже есть)
# Добавить remote
git remote add origin <your-repo-url>
git push -u origin main
```

---

## Лицензия

MIT License - свободное использование для коммерческих и некоммерческих проектов.

---

## Контакты и поддержка

Для вопросов и проблем:
- Создайте issue в репозитории
- Проверьте документацию в `/docs`
- Посмотрите логи: `make logs`

---

**Успешной разработки!** 🚀
