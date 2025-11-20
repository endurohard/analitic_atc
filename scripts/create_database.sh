#!/bin/bash

# Скрипт для создания базы данных PostgreSQL
# Использование: ./create_database.sh

set -e

echo "=== Создание базы данных для АТС Аналитики ==="
echo ""

# Загрузка переменных из .env
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo "Ошибка: Файл .env не найден!"
    echo "Скопируйте .env.example в .env и заполните параметры"
    exit 1
fi

echo "Параметры подключения:"
echo "  Host: ${POSTGRES_HOST}"
echo "  Port: ${POSTGRES_PORT}"
echo "  User: ${POSTGRES_USER}"
echo "  Database: ${POSTGRES_DB}"
echo ""

# Проверка существования базы данных
echo "Проверка существования базы данных..."
DB_EXISTS=$(PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -lqt | cut -d \| -f 1 | grep -w ${POSTGRES_DB} | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
    echo "⚠️  База данных '${POSTGRES_DB}' уже существует!"
    read -p "Пересоздать базу данных? Все данные будут удалены! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Удаление существующей базы данных..."
        PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -c "DROP DATABASE ${POSTGRES_DB};"
        echo "✓ База данных удалена"
    else
        echo "Отменено пользователем"
        exit 0
    fi
fi

# Создание базы данных
echo "Создание базы данных '${POSTGRES_DB}'..."
PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -c "CREATE DATABASE ${POSTGRES_DB};"
echo "✓ База данных создана"

# Создание схемы
echo ""
echo "Создание таблиц..."
PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f ../database_schema.sql
echo "✓ Таблицы созданы"

echo ""
echo "=== База данных успешно создана! ==="
echo ""
echo "Следующие шаги:"
echo "1. Запустите скрипт управления организациями: ./manage_organizations.py"
echo "2. Запустите приложение: docker-compose up -d"
echo ""
