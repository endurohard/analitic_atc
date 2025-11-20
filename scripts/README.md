# Скрипты установки и управления

Этот каталог содержит скрипты для установки, настройки и управления АТС Аналитикой.

## Быстрая установка

### Вариант 1: Автоматическая установка (рекомендуется)

```bash
# 1. Установите зависимости для скриптов
pip install -r requirements.txt

# 2. Настройте .env файл
cd ..
cp .env.example .env
nano .env  # Укажите параметры PostgreSQL

# 3. Запустите установку
cd scripts
python setup.py
```

Скрипт `setup.py` автоматически:
- Проверит конфигурацию
- Создаст базу данных
- Создаст все таблицы
- Добавит примерные организации (опционально)

### Вариант 2: Пошаговая установка

#### Шаг 1: Создание базы данных (Bash)

```bash
# Только для Linux/Mac
./create_database.sh
```

Этот скрипт:
- Проверит существование БД
- Создаст новую БД (с подтверждением на перезапись)
- Применит SQL схему

#### Шаг 2: Управление организациями

```bash
python manage_organizations.py
```

## Скрипты

### setup.py - Полная автоматическая установка

Интерактивный скрипт для полной установки системы.

**Использование:**
```bash
python setup.py
```

**Что делает:**
1. Проверяет наличие и корректность файла `.env`
2. Тестирует подключение к PostgreSQL
3. Создает базу данных (с подтверждением)
4. Создает все необходимые таблицы
5. Предлагает добавить примерные организации

**Требования:**
- Python 3.6+
- PostgreSQL сервер (локальный или удаленный)
- Настроенный файл `.env`

---

### manage_organizations.py - Управление организациями

Интерактивный менеджер организаций с меню.

**Использование:**
```bash
python manage_organizations.py
```

**Возможности:**

1. **Показать список организаций**
   - Выводит все организации с подробной информацией

2. **Добавить организацию**
   - Интерактивное добавление новой организации
   - Запрашивает: org_id, название, описание

3. **Обновить организацию**
   - Изменение названия и описания существующей организации

4. **Удалить организацию**
   - Удаление организации со всеми связанными данными
   - Показывает количество связанных записей
   - Требует подтверждения

5. **Импорт из CSV**
   - Массовый импорт организаций из CSV файла
   - Формат файла: `org_id,name,description`

6. **Создать пример CSV**
   - Генерирует файл `organizations_sample.csv` с примерами

**Пример CSV файла:**
```csv
org_id,name,description
ORG001,Салат,Ресторан Салат
ORG002,IT Отдел,IT компания
ORG003,Колл-центр,Служба поддержки
```

---

### create_database.sh - Создание БД (Bash)

Bash скрипт для создания базы данных.

**Использование:**
```bash
./create_database.sh
```

**Что делает:**
- Загружает параметры из `.env`
- Проверяет существование БД
- Создает новую БД или пересоздает существующую
- Применяет SQL схему из `database_schema.sql`

**Требования:**
- Linux/Mac OS
- psql клиент
- Настроенный файл `.env`

---

## Примеры использования

### Пример 1: Первая установка

```bash
# 1. Установить зависимости
pip install -r requirements.txt

# 2. Настроить .env
cd ..
cp .env.example .env
nano .env

# 3. Запустить установку
cd scripts
python setup.py
```

### Пример 2: Добавление организации вручную

```bash
python manage_organizations.py

# В меню выберите:
# 2 - Добавить организацию
# Введите данные:
#   Org ID: ORG004
#   Название: Новая компания
#   Описание: Описание компании
```

### Пример 3: Массовый импорт организаций

```bash
# 1. Создать пример CSV
python manage_organizations.py
# Выберите: 6 - Создать пример CSV файла

# 2. Отредактировать organizations_sample.csv
nano organizations_sample.csv

# 3. Импортировать
python manage_organizations.py
# Выберите: 5 - Импорт из CSV
# Введите путь: organizations_sample.csv
```

### Пример 4: Просмотр существующих организаций

```bash
python manage_organizations.py
# Выберите: 1 - Показать список организаций
```

## Подключение к удаленной PostgreSQL

Если PostgreSQL находится на удаленном сервере:

### .env конфигурация
```env
POSTGRES_HOST=remote.server.com
POSTGRES_PORT=5432
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=atc_analytics
```

### Проверка доступности
```bash
# Тест подключения
psql -h remote.server.com -U your_user -d postgres -c "SELECT version();"
```

## Устранение проблем

### Проблема: "ModuleNotFoundError: No module named 'psycopg2'"

**Решение:**
```bash
pip install -r requirements.txt
```

### Проблема: "connection refused"

**Причины:**
1. PostgreSQL не запущен
2. Неверный хост/порт в `.env`
3. Firewall блокирует подключение

**Решение:**
```bash
# Проверьте статус PostgreSQL
sudo systemctl status postgresql  # Linux
brew services list                 # Mac

# Проверьте доступность порта
telnet localhost 5432

# Проверьте .env файл
cat ../.env
```

### Проблема: "permission denied"

**Решение:**
```bash
# Сделайте скрипты исполняемыми
chmod +x *.sh *.py
```

### Проблема: "database already exists"

**Решение:**
Скрипт `setup.py` спросит, хотите ли вы пересоздать БД.
Или удалите БД вручную:
```bash
psql -h host -U user -c "DROP DATABASE atc_analytics;"
```

## Структура данных организации

При добавлении организации указывайте:

- **org_id** (обязательно) - уникальный идентификатор
  - Формат: `ORG001`, `ORG002`, и т.д.
  - Используется для связи с звонками и пользователями

- **name** (обязательно) - название организации
  - Например: "Ресторан Салат", "IT Компания"

- **description** (опционально) - описание
  - Дополнительная информация об организации

## SQL запросы для ручного управления

### Добавить организацию
```sql
INSERT INTO organizations (org_id, name, description)
VALUES ('ORG004', 'Новая компания', 'Описание');
```

### Просмотреть все организации
```sql
SELECT * FROM organizations ORDER BY created_at DESC;
```

### Обновить организацию
```sql
UPDATE organizations
SET name = 'Новое название', description = 'Новое описание'
WHERE org_id = 'ORG001';
```

### Удалить организацию
```sql
DELETE FROM organizations WHERE org_id = 'ORG001';
```

### Проверить связанные данные
```sql
SELECT o.org_id, o.name, COUNT(c.id) as calls_count
FROM organizations o
LEFT JOIN calls c ON o.org_id = c.org_id
GROUP BY o.org_id, o.name;
```

## Интеграция с Docker

После настройки БД и организаций, запустите приложение:

```bash
cd ..
docker-compose up -d

# Или используя Makefile
make up
```

## Дополнительная информация

- Основная документация: `../README.md`
- Быстрый старт: `../QUICKSTART.md`
- Миграция данных: `../MIGRATION_GUIDE.md`
- SQL схема: `../database_schema.sql`

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs backend`
2. Проверьте подключение к БД
3. Создайте issue в репозитории
