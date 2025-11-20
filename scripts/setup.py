#!/usr/bin/env python3
"""
Скрипт полной установки и настройки АТС Аналитики
Использование: python setup.py
"""

import os
import sys
import subprocess
import psycopg2
from dotenv import load_dotenv

def print_header(text):
    """Печать заголовка"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")

def print_step(step_num, text):
    """Печать шага"""
    print(f"\n[Шаг {step_num}] {text}")
    print("-" * 60)

def check_env_file():
    """Проверка наличия .env файла"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')

    if not os.path.exists(env_path):
        print("✗ Файл .env не найден!")
        print("\nСоздайте файл .env на основе .env.example:")
        print("  cp .env.example .env")
        print("\nЗатем отредактируйте .env и укажите параметры подключения к PostgreSQL")
        return False

    load_dotenv(env_path)

    required_vars = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        print(f"✗ В файле .env отсутствуют обязательные переменные: {', '.join(missing_vars)}")
        return False

    print("✓ Файл .env найден и корректен")
    return True

def test_db_connection():
    """Тестирование подключения к БД"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST'),
            port=os.getenv('POSTGRES_PORT', 5432),
            user=os.getenv('POSTGRES_USER'),
            password=os.getenv('POSTGRES_PASSWORD'),
            database='postgres'  # Подключаемся к системной БД
        )
        conn.close()
        print("✓ Подключение к PostgreSQL успешно")
        return True
    except Exception as e:
        print(f"✗ Ошибка подключения к PostgreSQL: {e}")
        print("\nПроверьте параметры в файле .env:")
        print(f"  Host: {os.getenv('POSTGRES_HOST')}")
        print(f"  Port: {os.getenv('POSTGRES_PORT', 5432)}")
        print(f"  User: {os.getenv('POSTGRES_USER')}")
        return False

def create_database():
    """Создание базы данных"""
    db_name = os.getenv('POSTGRES_DB')

    try:
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST'),
            port=os.getenv('POSTGRES_PORT', 5432),
            user=os.getenv('POSTGRES_USER'),
            password=os.getenv('POSTGRES_PASSWORD'),
            database='postgres'
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # Проверка существования БД
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
        exists = cursor.fetchone()

        if exists:
            print(f"⚠️  База данных '{db_name}' уже существует")

            response = input("Пересоздать базу данных? Все данные будут удалены! (yes/no): ").strip().lower()
            if response == 'yes':
                # Отключить все соединения
                cursor.execute(f"""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = '{db_name}'
                    AND pid <> pg_backend_pid()
                """)

                cursor.execute(f'DROP DATABASE {db_name}')
                print(f"✓ База данных '{db_name}' удалена")
            else:
                print("Пропускаем создание БД")
                cursor.close()
                conn.close()
                return True

        cursor.execute(f'CREATE DATABASE {db_name}')
        print(f"✓ База данных '{db_name}' создана")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"✗ Ошибка при создании БД: {e}")
        return False

def create_tables():
    """Создание таблиц в БД"""
    schema_file = os.path.join(os.path.dirname(__file__), '..', 'database_schema.sql')

    if not os.path.exists(schema_file):
        print(f"✗ Файл схемы БД не найден: {schema_file}")
        return False

    try:
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST'),
            port=os.getenv('POSTGRES_PORT', 5432),
            user=os.getenv('POSTGRES_USER'),
            password=os.getenv('POSTGRES_PASSWORD'),
            database=os.getenv('POSTGRES_DB')
        )
        cursor = conn.cursor()

        with open(schema_file, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
            cursor.execute(schema_sql)

        conn.commit()
        cursor.close()
        conn.close()

        print("✓ Таблицы успешно созданы")
        return True

    except Exception as e:
        print(f"✗ Ошибка при создании таблиц: {e}")
        return False

def add_sample_data():
    """Добавление примерных организаций"""
    response = input("\nДобавить примерные организации для тестирования? (y/n): ").strip().lower()

    if response != 'y':
        print("Пропускаем добавление тестовых данных")
        return True

    try:
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST'),
            port=os.getenv('POSTGRES_PORT', 5432),
            user=os.getenv('POSTGRES_USER'),
            password=os.getenv('POSTGRES_PASSWORD'),
            database=os.getenv('POSTGRES_DB')
        )
        cursor = conn.cursor()

        # Проверка существования данных
        cursor.execute("SELECT COUNT(*) FROM organizations")
        count = cursor.fetchone()[0]

        if count > 0:
            print(f"⚠️  В БД уже есть {count} организаций. Пропускаем.")
            cursor.close()
            conn.close()
            return True

        organizations = [
            ('ORG001', 'Салат', 'Ресторан Салат'),
            ('ORG002', 'IT Компания', 'IT отдел'),
            ('ORG003', 'Колл-центр', 'Служба поддержки')
        ]

        for org_id, name, description in organizations:
            cursor.execute("""
                INSERT INTO organizations (org_id, name, description)
                VALUES (%s, %s, %s)
            """, (org_id, name, description))
            print(f"✓ Добавлена организация: {name} ({org_id})")

        conn.commit()
        cursor.close()
        conn.close()

        print(f"\n✓ Добавлено {len(organizations)} примерных организаций")
        return True

    except Exception as e:
        print(f"✗ Ошибка при добавлении данных: {e}")
        return False

def show_next_steps():
    """Показать следующие шаги"""
    print_header("Установка завершена!")

    print("✓ База данных создана и настроена")
    print("✓ Таблицы созданы")
    print("✓ Система готова к использованию")

    print("\n📋 Следующие шаги:")
    print("\n1. Управление организациями:")
    print("   python scripts/manage_organizations.py")

    print("\n2. Запуск приложения через Docker:")
    print("   docker-compose up -d")
    print("   или")
    print("   make up")

    print("\n3. Доступ к приложению:")
    print("   Frontend:  http://localhost:3000")
    print("   Backend:   http://localhost:8000")
    print("   API Docs:  http://localhost:8000/docs")

    print("\n4. Для инициализации тестовых данных (пользователи, звонки):")
    print("   docker-compose exec backend python init_db.py")

    print("\n📚 Документация:")
    print("   README.md          - Полная документация")
    print("   QUICKSTART.md      - Быстрый старт")
    print("   MIGRATION_GUIDE.md - Миграция существующей БД")
    print()

def main():
    """Главная функция установки"""
    print_header("Установка АТС Аналитики")

    print("Этот скрипт выполнит:")
    print("  1. Проверку конфигурации (.env)")
    print("  2. Тестирование подключения к PostgreSQL")
    print("  3. Создание базы данных")
    print("  4. Создание таблиц")
    print("  5. Добавление примерных данных (опционально)")
    print()

    response = input("Продолжить? (y/n): ").strip().lower()
    if response != 'y':
        print("Отменено пользователем")
        return

    # Шаг 1: Проверка .env
    print_step(1, "Проверка конфигурации")
    if not check_env_file():
        sys.exit(1)

    # Шаг 2: Тестирование подключения
    print_step(2, "Тестирование подключения к PostgreSQL")
    if not test_db_connection():
        sys.exit(1)

    # Шаг 3: Создание БД
    print_step(3, "Создание базы данных")
    if not create_database():
        sys.exit(1)

    # Шаг 4: Создание таблиц
    print_step(4, "Создание таблиц")
    if not create_tables():
        sys.exit(1)

    # Шаг 5: Добавление примерных данных
    print_step(5, "Добавление примерных данных")
    add_sample_data()

    # Завершение
    show_next_steps()

if __name__ == '__main__':
    main()
