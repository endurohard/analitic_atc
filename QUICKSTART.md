# Быстрый старт

## Вариант 1: Автоматическая установка (5 минут)

Самый быстрый способ начать работу:

```bash
# 1. Установите зависимости
cd scripts
pip install -r requirements.txt

# 2. Настройте .env
cd ..
cp .env.example .env
nano .env  # Укажите параметры PostgreSQL

# 3. Запустите автоматическую установку
cd scripts
python setup.py

# Скрипт создаст БД, таблицы и предложит добавить организации

# 4. Управление организациями (опционально)
python manage_organizations.py

# 5. Запустите приложение
cd ..
docker-compose up -d
```

Готово! Откройте http://localhost:3000

---

## Вариант 2: Простой запуск (с существующей PostgreSQL)

### 1. Настройте подключение к базе данных

```bash
# Скопируйте пример файла окружения
cp .env.example .env

# Отредактируйте .env и укажите параметры вашей БД
nano .env
```

Укажите в `.env`:
```env
POSTGRES_HOST=ваш_хост_postgres
POSTGRES_PORT=5432
POSTGRES_USER=ваш_пользователь
POSTGRES_PASSWORD=ваш_пароль
POSTGRES_DB=имя_базы_данных
```

### 2. Создайте базу данных и таблицы

**Вариант A: Через автоматический скрипт**
```bash
cd scripts
pip install -r requirements.txt
python setup.py
```

**Вариант B: Вручную**
```bash
# Создайте БД
psql -h ваш_хост -U ваш_пользователь -d postgres -c "CREATE DATABASE имя_бд;"

# Создайте таблицы
psql -h ваш_хост -U ваш_пользователь -d имя_бд -f database_schema.sql
```

### 3. Добавьте организации

```bash
cd scripts
python manage_organizations.py

# В меню выберите:
# 2 - Добавить организацию
# или
# 5 - Импорт из CSV файла
```

### 4. Запустите приложение

```bash
# Используя Docker Compose
docker-compose up -d

# Или используя Makefile
make up
```

### 4. Откройте в браузере

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API документация: http://localhost:8000/docs

### 5. Войдите в систему

Используйте тестовые данные (если вы их создали):
- Username: `admin`
- Password: `admin123`

## Вариант 3: Запуск с локальной PostgreSQL (через Docker)

Если у вас нет PostgreSQL, можно использовать контейнер:

### 1. Раскомментируйте секцию postgres в docker-compose.yml

```yaml
postgres:
  image: postgres:15-alpine
  ...

# И в конце файла:
volumes:
  postgres_data:
```

### 2. Настройте .env

```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=atc_analytics
```

### 3. Запустите все сервисы

```bash
docker-compose up -d
```

### 4. Инициализируйте базу данных

```bash
# Создать таблицы и тестовые данные
docker-compose exec backend python init_db.py
```

---

## Управление организациями

После установки вы можете управлять организациями:

### Интерактивный менеджер

```bash
cd scripts
python manage_organizations.py
```

**Возможности:**
- Просмотр списка организаций
- Добавление новых организаций
- Редактирование существующих
- Удаление организаций
- Массовый импорт из CSV

### Пример: Добавление организации

```
Выберите действие: 2

Введите уникальный ID организации: ORG001
Введите название организации: Ресторан Салат
Введите описание: Главный офис

✓ Организация успешно добавлена
```

### Пример: Импорт из CSV

1. Создайте файл `orgs.csv`:
```csv
org_id,name,description
ORG001,Салат,Ресторан
ORG002,IT Отдел,IT компания
```

2. Импортируйте:
```bash
python manage_organizations.py
# Выберите: 5 - Импорт из CSV
# Укажите путь: orgs.csv
```

## Полезные команды

```bash
# Показать логи
make logs

# Показать логи только backend
make logs-backend

# Показать логи только frontend
make logs-frontend

# Перезапустить приложение
make restart

# Остановить приложение
make down

# Полная очистка (включая volumes)
make clean

# Показать запущенные контейнеры
make ps

# Открыть shell в backend контейнере
make shell-backend

# Показать все доступные команды
make help
```

## Проверка работоспособности

### 1. Проверка API

```bash
# Проверить здоровье приложения
curl http://localhost:8000/api/health

# Получить список звонков
curl "http://localhost:8000/api/calls?org_id=ORG001&limit=5"

# Получить статистику
curl "http://localhost:8000/api/statistics/summary?org_id=ORG001"
```

### 2. Проверка Frontend

Откройте http://localhost:3000 в браузере.

## Возможные проблемы

### Порты уже заняты

Если порты 3000 или 8000 заняты, измените их в `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "3001:3000"  # Изменить 3000 на 3001

backend:
  ports:
    - "8001:8000"  # Изменить 8000 на 8001
```

### Не удается подключиться к БД

1. Проверьте параметры в `.env`
2. Убедитесь, что PostgreSQL доступен с хоста Docker
3. Проверьте логи: `make logs-backend`

### Frontend не подключается к Backend

Проверьте переменную окружения `REACT_APP_API_URL` в `docker-compose.yml`:

```yaml
frontend:
  environment:
    - REACT_APP_API_URL=http://localhost:8000
```

## Следующие шаги

1. Прочитайте [README.md](README.md) для подробной документации
2. Если у вас существующая БД, см. [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
3. Настройте подключение к вашей АТС для получения реальных данных
4. Адаптируйте модели под вашу структуру данных

## Остановка и удаление

```bash
# Остановить контейнеры
docker-compose down

# Остановить и удалить все данные
docker-compose down -v
```

---

Если возникли проблемы, создайте issue в репозитории!
