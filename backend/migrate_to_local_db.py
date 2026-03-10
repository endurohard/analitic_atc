#!/usr/bin/env python3
"""
Скрипт миграции данных из удалённой БД в локальную.
Переносит: org_credentials, phone_mappings, dashboard_layouts, organization_columns
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Подключение к удалённой БД
REMOTE_DB_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@"
    f"{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
)

# Подключение к локальной БД
LOCAL_DB_URL = os.getenv(
    "LOCAL_DATABASE_URL",
    "postgresql://atc_local:atc_local_password@local_db:5432/atc_local"
)

print(f"Remote DB: {REMOTE_DB_URL.split('@')[1] if '@' in REMOTE_DB_URL else 'N/A'}")
print(f"Local DB: {LOCAL_DB_URL.split('@')[1] if '@' in LOCAL_DB_URL else 'N/A'}")

try:
    remote_engine = create_engine(REMOTE_DB_URL)
    local_engine = create_engine(LOCAL_DB_URL)

    RemoteSession = sessionmaker(bind=remote_engine)
    LocalSession = sessionmaker(bind=local_engine)

    remote_db = RemoteSession()
    local_db = LocalSession()

    print("\n=== Начинаем миграцию ===\n")

    # 1. Миграция org_credentials
    print("1. Проверяем org_credentials в удалённой БД...")
    try:
        result = remote_db.execute(text("SELECT * FROM org_credentials"))
        rows = result.fetchall()
        if rows:
            print(f"   Найдено {len(rows)} записей в удалённой БД")
            for row in rows:
                # Проверяем, есть ли уже такая запись
                existing = local_db.execute(
                    text("SELECT id FROM org_credentials WHERE username = :username"),
                    {"username": row[2]}  # username
                ).fetchone()

                if not existing:
                    local_db.execute(text("""
                        INSERT INTO org_credentials
                        (org_id, username, password_hash, is_active, logo_url, primary_color,
                         secondary_color, company_name, favicon_url, show_callto_columns)
                        VALUES (:org_id, :username, :password_hash, :is_active, :logo_url,
                                :primary_color, :secondary_color, :company_name, :favicon_url, :show_callto_columns)
                    """), {
                        "org_id": row[1],
                        "username": row[2],
                        "password_hash": row[3],
                        "is_active": row[4] if len(row) > 4 else True,
                        "logo_url": row[5] if len(row) > 5 else None,
                        "primary_color": row[6] if len(row) > 6 else '#1890ff',
                        "secondary_color": row[7] if len(row) > 7 else '#52c41a',
                        "company_name": row[8] if len(row) > 8 else None,
                        "favicon_url": row[9] if len(row) > 9 else None,
                        "show_callto_columns": row[10] if len(row) > 10 else False
                    })
                    print(f"   + Добавлен: {row[2]}")
                else:
                    print(f"   = Пропущен (уже есть): {row[2]}")
            local_db.commit()
        else:
            print("   Записей не найдено")
    except Exception as e:
        print(f"   ! Таблица не существует или ошибка: {e}")
        remote_db.rollback()

    # 2. Миграция phone_mappings
    print("\n2. Проверяем phone_mappings в удалённой БД...")
    try:
        result = remote_db.execute(text("SELECT * FROM phone_mappings"))
        rows = result.fetchall()
        if rows:
            print(f"   Найдено {len(rows)} записей")
            for row in rows:
                existing = local_db.execute(
                    text("SELECT id FROM phone_mappings WHERE org_id = :org_id AND phone_number = :phone"),
                    {"org_id": row[1], "phone": row[2]}
                ).fetchone()

                if not existing:
                    local_db.execute(text("""
                        INSERT INTO phone_mappings (org_id, phone_number, display_name, color)
                        VALUES (:org_id, :phone_number, :display_name, :color)
                    """), {
                        "org_id": row[1],
                        "phone_number": row[2],
                        "display_name": row[3],
                        "color": row[4] if len(row) > 4 else None
                    })
                    print(f"   + Добавлен: org={row[1]}, phone={row[2]}")
            local_db.commit()
        else:
            print("   Записей не найдено")
    except Exception as e:
        print(f"   ! Таблица не существует или ошибка: {e}")
        remote_db.rollback()

    # 3. Миграция dashboard_layouts
    print("\n3. Проверяем dashboard_layouts в удалённой БД...")
    try:
        result = remote_db.execute(text("SELECT * FROM dashboard_layouts"))
        rows = result.fetchall()
        if rows:
            print(f"   Найдено {len(rows)} записей")
            for row in rows:
                existing = local_db.execute(
                    text("SELECT id FROM dashboard_layouts WHERE org_id = :org_id"),
                    {"org_id": row[1]}
                ).fetchone()

                if not existing:
                    local_db.execute(text("""
                        INSERT INTO dashboard_layouts (org_id, layout_data)
                        VALUES (:org_id, :layout_data)
                    """), {
                        "org_id": row[1],
                        "layout_data": row[2]
                    })
                    print(f"   + Добавлен layout для org={row[1]}")
            local_db.commit()
        else:
            print("   Записей не найдено")
    except Exception as e:
        print(f"   ! Таблица не существует или ошибка: {e}")
        remote_db.rollback()

    # 4. Миграция organization_columns
    print("\n4. Проверяем organization_columns в удалённой БД...")
    try:
        result = remote_db.execute(text("SELECT * FROM organization_columns"))
        rows = result.fetchall()
        if rows:
            print(f"   Найдено {len(rows)} записей")
            for row in rows:
                existing = local_db.execute(
                    text("SELECT id FROM organization_columns WHERE org_id = :org_id AND column_key = :key"),
                    {"org_id": row[1], "key": row[2]}
                ).fetchone()

                if not existing:
                    local_db.execute(text("""
                        INSERT INTO organization_columns
                        (org_id, column_key, column_label, column_order, is_visible, column_type, source_field, is_custom, width)
                        VALUES (:org_id, :column_key, :column_label, :column_order, :is_visible, :column_type, :source_field, :is_custom, :width)
                    """), {
                        "org_id": row[1],
                        "column_key": row[2],
                        "column_label": row[3],
                        "column_order": row[4],
                        "is_visible": row[5] if len(row) > 5 else True,
                        "column_type": row[6] if len(row) > 6 else 'text',
                        "source_field": row[7] if len(row) > 7 else None,
                        "is_custom": row[8] if len(row) > 8 else False,
                        "width": row[9] if len(row) > 9 else None
                    })
                    print(f"   + Добавлена колонка: org={row[1]}, key={row[2]}")
            local_db.commit()
        else:
            print("   Записей не найдено")
    except Exception as e:
        print(f"   ! Таблица не существует или ошибка: {e}")
        remote_db.rollback()

    print("\n=== Миграция завершена ===")

    # Показываем итоговую статистику
    print("\nСтатистика локальной БД:")
    for table in ['org_credentials', 'phone_mappings', 'dashboard_layouts', 'organization_columns']:
        try:
            count = local_db.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()[0]
            print(f"  {table}: {count} записей")
        except:
            print(f"  {table}: ошибка")

except Exception as e:
    print(f"\nОшибка: {e}")
    sys.exit(1)
finally:
    remote_db.close()
    local_db.close()
