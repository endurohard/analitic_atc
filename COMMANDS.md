# Шпаргалка команд АТС Аналитика

## 🚀 Быстрый старт (копируй-вставляй)

### Полная установка с нуля
```bash
# 1. Настройка
cp .env.example .env
nano .env  # Заполните параметры PostgreSQL

# 2. Установка зависимостей для скриптов
cd scripts
pip install -r requirements.txt

# 3. Автоматическая установка (БД + таблицы + организации)
python setup.py

# 4. Запуск приложения
cd ..
docker-compose up -d

# 5. Открыть в браузере
open http://localhost:3000  # Mac
# или просто откройте http://localhost:3000 в браузере
```

---

## 🐳 Docker команды

### Основные
```bash
# Запустить
docker-compose up -d

# Остановить
docker-compose down

# Перезапустить
docker-compose restart

# Логи (все сервисы)
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend

# Статус контейнеров
docker-compose ps

# Остановить и удалить все (включая volumes)
docker-compose down -v

# Пересобрать образы
docker-compose build --no-cache
docker-compose up -d --build
```

### Shell в контейнере
```bash
# Backend
docker-compose exec backend /bin/sh

# Frontend
docker-compose exec frontend /bin/sh

# PostgreSQL (если используется)
docker-compose exec postgres psql -U postgres -d atc_analytics
```

---

## 📋 Makefile команды

```bash
# Показать все доступные команды
make help

# Запустить приложение
make up

# Остановить приложение
make down

# Перезапустить
make restart

# Показать логи
make logs
make logs-backend
make logs-frontend

# Полная очистка (удалить все данные)
make clean

# Полная установка
make setup

# Управление организациями
make manage-orgs

# Инициализация тестовых данных в БД
make init-db

# Shell в контейнере
make shell-backend
make shell-frontend

# Показать запущенные контейнеры
make ps
```

---

## 🗄️ База данных

### Подключение к PostgreSQL
```bash
# Локальная БД
psql -h localhost -U postgres -d atc_analytics

# Удаленная БД
psql -h your_host -U your_user -d atc_analytics

# Через Docker (если используется контейнер)
docker-compose exec postgres psql -U postgres -d atc_analytics
```

### Создание БД
```bash
# Через скрипт (Linux/Mac)
./scripts/create_database.sh

# Или вручную
psql -U postgres -c "CREATE DATABASE atc_analytics;"
psql -U postgres -d atc_analytics -f database_schema.sql
```

### Полезные SQL запросы
```sql
-- Список всех таблиц
\dt

-- Описание таблицы
\d calls

-- Количество организаций
SELECT COUNT(*) FROM organizations;

-- Список организаций
SELECT org_id, name FROM organizations;

-- Количество звонков по организациям
SELECT o.name, COUNT(c.id) as calls_count
FROM organizations o
LEFT JOIN calls c ON o.org_id = c.org_id
GROUP BY o.name;

-- Статистика по статусам
SELECT status, COUNT(*)
FROM calls
WHERE org_id = 'ORG001'
GROUP BY status;
```

### Бэкап и восстановление
```bash
# Бэкап
pg_dump -h localhost -U postgres atc_analytics > backup_$(date +%Y%m%d).sql

# Восстановление
psql -h localhost -U postgres atc_analytics < backup.sql

# Бэкап только данных
pg_dump -h localhost -U postgres --data-only atc_analytics > data_backup.sql
```

---

## 🏢 Управление организациями

### Интерактивный режим
```bash
cd scripts
python manage_organizations.py
```

### Python скрипты (программный доступ)
```python
from manage_organizations import OrganizationManager

manager = OrganizationManager()
manager.connect()

# Список
manager.list_organizations()

# Добавить
# (используйте интерактивный режим)

manager.disconnect()
```

### SQL запросы
```sql
-- Добавить организацию
INSERT INTO organizations (org_id, name, description)
VALUES ('ORG004', 'Новая компания', 'Описание');

-- Обновить
UPDATE organizations
SET name = 'Новое название'
WHERE org_id = 'ORG001';

-- Удалить
DELETE FROM organizations WHERE org_id = 'ORG001';

-- Список с количеством звонков
SELECT o.org_id, o.name, COUNT(c.id) as calls
FROM organizations o
LEFT JOIN calls c ON o.org_id = c.org_id
GROUP BY o.org_id, o.name;
```

---

## 📦 Python/Node управление

### Backend (Python)
```bash
cd backend

# Создать виртуальное окружение
python -m venv venv

# Активировать
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Установить зависимости
pip install -r requirements.txt

# Запустить локально
uvicorn main:app --reload

# Создать миграцию (Alembic)
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Frontend (Node)
```bash
cd frontend

# Установить зависимости
npm install

# Запустить dev сервер
npm start

# Собрать для продакшена
npm run build

# Запустить тесты
npm test
```

---

## 🔍 Проверка работоспособности

### API проверки
```bash
# Health check
curl http://localhost:8000/api/health

# Информация об API
curl http://localhost:8000/

# Список звонков
curl "http://localhost:8000/api/calls?org_id=ORG001&limit=5"

# Статистика
curl "http://localhost:8000/api/statistics/summary?org_id=ORG001"

# Организации пользователя
curl "http://localhost:8000/api/organizations?user_id=1"
```

### Frontend проверки
```bash
# Проверить, что сервис запущен
curl http://localhost:3000

# Проверить переменные окружения
docker-compose exec frontend printenv | grep REACT_APP
```

---

## 🔧 Отладка

### Просмотр логов
```bash
# Все логи
docker-compose logs -f

# Последние 100 строк
docker-compose logs --tail=100

# Логи с меткой времени
docker-compose logs -t -f backend

# Логи за последний час
docker-compose logs --since 1h
```

### Проверка контейнеров
```bash
# Статус
docker-compose ps

# Использование ресурсов
docker stats

# Детали контейнера
docker inspect atc_analytics_backend

# Процессы в контейнере
docker-compose exec backend ps aux
```

### Проверка сети
```bash
# Проверить порты
netstat -an | grep 3000
netstat -an | grep 8000
netstat -an | grep 5432

# Проверить подключение
telnet localhost 5432
nc -zv localhost 5432

# Проверить DNS
docker-compose exec backend ping postgres
```

---

## 📊 Мониторинг

### Проверка БД
```bash
# Размер БД
psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('atc_analytics'));"

# Количество подключений
psql -U postgres -d atc_analytics -c "SELECT count(*) FROM pg_stat_activity;"

# Активные запросы
psql -U postgres -d atc_analytics -c "SELECT pid, query, state FROM pg_stat_activity WHERE state = 'active';"
```

### Проверка производительности
```bash
# Backend response time
time curl http://localhost:8000/api/health

# Количество звонков в БД
psql -U postgres -d atc_analytics -c "SELECT COUNT(*) FROM calls;"

# Размер таблиц
psql -U postgres -d atc_analytics -c "
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::text)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;
"
```

---

## 🧹 Очистка

### Удаление старых данных
```sql
-- Удалить звонки старше 30 дней
DELETE FROM calls
WHERE call_date < NOW() - INTERVAL '30 days';

-- Очистить всю таблицу
TRUNCATE TABLE calls;

-- Очистить с каскадным удалением
TRUNCATE TABLE calls CASCADE;
```

### Удаление Docker ресурсов
```bash
# Остановить и удалить контейнеры
docker-compose down

# + удалить volumes
docker-compose down -v

# Удалить неиспользуемые образы
docker image prune -a

# Удалить все (контейнеры, сети, образы, volumes)
docker system prune -a --volumes
```

---

## 📝 Git команды

### Первый commit
```bash
git init
git add .
git commit -m "feat: initial commit - ATC Analytics project"
```

### Обновление
```bash
git add .
git commit -m "feat: add new feature"
git push
```

### .gitignore уже настроен для:
- .env
- node_modules/
- __pycache__/
- *.pyc
- build/

---

## 🔐 Безопасность

### Изменить пароли
```bash
# 1. Обновить .env
nano .env

# 2. Изменить в PostgreSQL
psql -U postgres -c "ALTER USER postgres PASSWORD 'new_password';"

# 3. Перезапустить
docker-compose restart
```

### Создать секретный ключ
```python
import secrets
print(secrets.token_urlsafe(32))
```

```bash
# Или через OpenSSL
openssl rand -base64 32
```

---

## 📖 Документация

### Онлайн
```bash
# Swagger UI
open http://localhost:8000/docs

# ReDoc
open http://localhost:8000/redoc
```

### Локальная
- README.md - полная документация
- INSTALL.md - установка
- QUICKSTART.md - быстрый старт
- MIGRATION_GUIDE.md - миграция БД
- PROJECT_STRUCTURE.md - структура
- SUMMARY.md - резюме
- scripts/README.md - скрипты

---

## 🎯 Полезные однострочники

```bash
# Быстрая установка
cp .env.example .env && cd scripts && pip install -r requirements.txt && python setup.py && cd .. && docker-compose up -d

# Полный рестарт
docker-compose down && docker-compose up -d && docker-compose logs -f

# Очистить и пересоздать
docker-compose down -v && docker-compose build --no-cache && docker-compose up -d

# Бэкап БД с датой
pg_dump -h localhost -U postgres atc_analytics > backup_$(date +%Y%m%d_%H%M%S).sql

# Проверить все сервисы
curl http://localhost:8000/api/health && curl http://localhost:3000 && echo "All OK"

# Количество записей в каждой таблице
psql -U postgres -d atc_analytics -c "SELECT schemaname,relname,n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"
```

---

## 🆘 Решение проблем

### Backend не запускается
```bash
# Проверить логи
docker-compose logs backend

# Проверить .env
cat .env

# Проверить подключение к БД
docker-compose exec backend python -c "from database import engine; print(engine)"
```

### Frontend не запускается
```bash
# Проверить логи
docker-compose logs frontend

# Проверить package.json
docker-compose exec frontend cat package.json

# Переустановить зависимости
docker-compose exec frontend npm install
```

### Порты заняты
```bash
# Найти процесс на порту 3000
lsof -i :3000
netstat -ano | findstr :3000  # Windows

# Убить процесс
kill -9 <PID>

# Или изменить порты в docker-compose.yml
```

### БД недоступна
```bash
# Проверить PostgreSQL
systemctl status postgresql  # Linux
brew services list           # Mac

# Проверить подключение
psql -h localhost -U postgres -c "SELECT version();"

# Проверить логи PostgreSQL
journalctl -u postgresql -f  # Linux
tail -f /usr/local/var/log/postgres.log  # Mac
```

---

**Сохраните этот файл для быстрого доступа к командам!** 📌
