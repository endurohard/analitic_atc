# Руководство по установке АТС Аналитики

## Содержание

1. [Системные требования](#системные-требования)
2. [Автоматическая установка](#автоматическая-установка)
3. [Ручная установка](#ручная-установка)
4. [Настройка организаций](#настройка-организаций)
5. [Запуск приложения](#запуск-приложения)
6. [Проверка работоспособности](#проверка-работоспособности)
7. [Устранение проблем](#устранение-проблем)

---

## Системные требования

### Обязательно

- **Docker** 20.10+ и **Docker Compose** 1.29+
- **PostgreSQL** 12+ (локальный или удаленный)
- **Python** 3.6+ (для скриптов установки)

### Рекомендуется

- 2+ GB RAM
- 10+ GB свободного места на диске
- Linux, macOS или Windows с WSL2

---

## Автоматическая установка

Самый быстрый способ начать работу.

### Шаг 1: Установка зависимостей Python

```bash
cd scripts
pip install -r requirements.txt
```

Если используете виртуальное окружение:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows

pip install -r requirements.txt
```

### Шаг 2: Настройка .env файла

```bash
cd ..
cp .env.example .env
```

Отредактируйте `.env` и укажите параметры PostgreSQL:

```env
# Пример для локального PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=atc_analytics

# Пример для удаленного PostgreSQL
POSTGRES_HOST=db.example.com
POSTGRES_PORT=5432
POSTGRES_USER=atc_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=atc_analytics
```

### Шаг 3: Запуск автоматической установки

```bash
cd scripts
python setup.py
```

Скрипт:
1. ✓ Проверит конфигурацию
2. ✓ Протестирует подключение к PostgreSQL
3. ✓ Создаст базу данных
4. ✓ Создаст все таблицы
5. ✓ Предложит добавить примерные организации

### Шаг 4: Добавление организаций

```bash
python manage_organizations.py
```

В меню выберите:
- `2` - Добавить организацию
- `5` - Импорт из CSV файла

### Шаг 5: Запуск приложения

```bash
cd ..
docker-compose up -d
```

Готово! Приложение доступно:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Ручная установка

Для тех, кто предпочитает контролировать каждый шаг.

### Шаг 1: Настройка .env

```bash
cp .env.example .env
nano .env  # или любой редактор
```

### Шаг 2: Создание базы данных

#### Вариант A: Через psql

```bash
# Подключитесь к PostgreSQL
psql -h your_host -U your_user -d postgres

# Создайте базу данных
CREATE DATABASE atc_analytics;

# Выйдите
\q
```

#### Вариант B: Через скрипт (Linux/Mac)

```bash
./scripts/create_database.sh
```

### Шаг 3: Создание таблиц

```bash
psql -h your_host -U your_user -d atc_analytics -f database_schema.sql
```

### Шаг 4: Добавление организаций

#### Вариант A: Через интерактивный скрипт

```bash
cd scripts
pip install -r requirements.txt
python manage_organizations.py
```

#### Вариант B: Через SQL

```sql
psql -h your_host -U your_user -d atc_analytics

INSERT INTO organizations (org_id, name, description) VALUES
('ORG001', 'Салат', 'Ресторан Салат'),
('ORG002', 'IT Компания', 'IT отдел');

\q
```

#### Вариант C: Импорт из CSV

```bash
# Подготовьте CSV файл
cat > organizations.csv << EOF
org_id,name,description
ORG001,Салат,Ресторан Салат
ORG002,IT Компания,IT отдел
EOF

# Импортируйте
cd scripts
python manage_organizations.py
# Выберите: 5 - Импорт из CSV
# Укажите путь: ../organizations.csv
```

### Шаг 5: Запуск Docker контейнеров

```bash
docker-compose up -d
```

---

## Настройка организаций

### Интерактивное управление

```bash
cd scripts
python manage_organizations.py
```

#### Меню:

1. **Показать список** - просмотр всех организаций
2. **Добавить** - создать новую организацию
3. **Обновить** - изменить существующую
4. **Удалить** - удалить организацию (с подтверждением)
5. **Импорт из CSV** - массовое добавление
6. **Создать пример CSV** - шаблон для импорта

### Пример добавления организации

```
Выберите действие: 2

Введите уникальный ID организации: ORG001
Введите название организации: Ресторан Салат
Введите описание: Главный офис ресторана

✓ Организация успешно добавлена (ID: 1)
```

### Массовый импорт

1. Создайте CSV файл `my_organizations.csv`:
```csv
org_id,name,description
ORG001,Салат,Ресторан Салат
ORG002,IT Компания,IT отдел
ORG003,Колл-центр,Служба поддержки
```

2. Импортируйте:
```bash
python manage_organizations.py
# Выберите: 5
# Введите путь: my_organizations.csv
```

---

## Запуск приложения

### Через Docker Compose

```bash
# Запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### Через Makefile

```bash
# Запуск
make up

# Просмотр логов
make logs

# Перезапуск
make restart

# Остановка
make down

# Полная очистка
make clean
```

### Доступ к приложению

После запуска откройте в браузере:

- **Frontend**: http://localhost:3000
  - Страница входа с авторизацией
  - Выбор организации
  - Dashboard с аналитикой

- **Backend API**: http://localhost:8000
  - REST API endpoints

- **API Документация**: http://localhost:8000/docs
  - Swagger UI
  - Тестирование API

---

## Проверка работоспособности

### 1. Проверка Docker контейнеров

```bash
docker-compose ps

# Должно показать:
# atc_analytics_backend   running
# atc_analytics_frontend  running
```

### 2. Проверка Backend

```bash
# Health check
curl http://localhost:8000/api/health

# Ожидаемый ответ:
# {"status":"healthy","database":"connected"}
```

### 3. Проверка подключения к БД

```bash
# Список организаций
curl "http://localhost:8000/api/organizations?user_id=1"

# Статистика
curl "http://localhost:8000/api/statistics/summary?org_id=ORG001"
```

### 4. Проверка Frontend

Откройте http://localhost:3000 - должна появиться страница входа.

---

## Устранение проблем

### Проблема: "Connection refused" при подключении к PostgreSQL

**Причины:**
- PostgreSQL не запущен
- Неверные параметры в `.env`
- Firewall блокирует подключение

**Решение:**
```bash
# Проверьте статус PostgreSQL
sudo systemctl status postgresql  # Linux
brew services list                 # Mac

# Проверьте доступность порта
telnet localhost 5432

# Проверьте параметры в .env
cat .env
```

### Проблема: "Database does not exist"

**Решение:**
```bash
# Создайте БД через скрипт
cd scripts
python setup.py

# Или вручную
psql -U postgres -c "CREATE DATABASE atc_analytics;"
```

### Проблема: "Table does not exist"

**Решение:**
```bash
# Примените SQL схему
psql -h localhost -U postgres -d atc_analytics -f database_schema.sql
```

### Проблема: Порты уже заняты (3000 или 8000)

**Решение:**
Измените порты в `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "3001:3000"  # Вместо 3000

backend:
  ports:
    - "8001:8000"  # Вместо 8000
```

И обновите `REACT_APP_API_URL` во frontend секции:
```yaml
frontend:
  environment:
    - REACT_APP_API_URL=http://localhost:8001
```

### Проблема: Docker контейнеры не запускаются

**Решение:**
```bash
# Посмотрите логи
docker-compose logs

# Пересоберите образы
docker-compose build --no-cache

# Перезапустите
docker-compose down
docker-compose up -d
```

### Проблема: Frontend не подключается к Backend

**Проверьте:**
1. Backend запущен: `curl http://localhost:8000/api/health`
2. Настройка CORS в backend
3. Переменная `REACT_APP_API_URL` в docker-compose.yml

**Решение:**
```bash
# Проверьте логи frontend
docker-compose logs frontend

# Проверьте переменную окружения
docker-compose exec frontend printenv REACT_APP_API_URL
```

### Проблема: "Permission denied" при запуске скриптов

**Решение:**
```bash
chmod +x scripts/*.sh
chmod +x scripts/*.py
```

---

## Использование с локальной PostgreSQL

Если у вас нет PostgreSQL, можно использовать контейнер.

### 1. Раскомментируйте в docker-compose.yml:

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

# И в конце файла:
volumes:
  postgres_data:
```

### 2. Обновите .env:

```env
POSTGRES_HOST=postgres  # Название сервиса в docker-compose
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=atc_analytics
```

### 3. Запустите все вместе:

```bash
docker-compose up -d

# Инициализируйте БД
docker-compose exec backend python init_db.py
```

---

## Следующие шаги

После успешной установки:

1. 📖 Прочитайте [README.md](README.md) для полной документации
2. 🚀 См. [QUICKSTART.md](QUICKSTART.md) для быстрого начала работы
3. 🔄 Если есть существующая БД: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
4. 📝 Адаптируйте модели под вашу структуру данных
5. 🔌 Настройте подключение к вашей АТС

---

## Полезные команды

```bash
# Управление
make help           # Показать все команды
make up             # Запустить
make down           # Остановить
make restart        # Перезапустить
make logs           # Показать логи
make clean          # Полная очистка

# База данных
make setup          # Полная установка
make manage-orgs    # Управление организациями
make init-db        # Инициализация тестовых данных

# Отладка
make shell-backend  # Shell в backend контейнере
make shell-frontend # Shell в frontend контейнере
```

---

## Дополнительные ресурсы

- [Документация PostgreSQL](https://www.postgresql.org/docs/)
- [Документация Docker](https://docs.docker.com/)
- [Документация FastAPI](https://fastapi.tiangolo.com/)
- [Документация React](https://react.dev/)

---

**Успешной установки!** 🎉

Если возникли проблемы, создайте issue в репозитории.
