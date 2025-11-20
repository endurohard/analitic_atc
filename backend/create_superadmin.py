"""
Скрипт для создания суперадмина с доступом ко всем организациям
"""
import psycopg2
from passlib.context import CryptContext
import os

# Настройка для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_superadmin():
    """Создает учетную запись суперадмина"""

    conn = psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', '176.98.155.78'),
        port=os.getenv('POSTGRES_PORT', 5435),
        user=os.getenv('POSTGRES_USER', 'infobot'),
        password=os.getenv('POSTGRES_PASSWORD', 'infobot'),
        database=os.getenv('POSTGRES_DB', 'infobot'),
        connect_timeout=10
    )
    cursor = conn.cursor()

    username = 'admin'
    password = 'admin'
    password_hash = pwd_context.hash(password)

    # Проверяем, существует ли уже admin
    cursor.execute(
        'SELECT id FROM org_credentials WHERE username = %s',
        (username,)
    )
    existing = cursor.fetchone()

    if existing:
        print(f'✓ Суперадмин "{username}" уже существует')
        cursor.close()
        conn.close()
        return

    # Создаем специальную запись для суперадмина
    # Используем org_id = 1 (первая организация), но это будет особый пользователь
    try:
        cursor.execute('''
            INSERT INTO org_credentials
            (org_id, username, password_hash, company_name, is_active)
            VALUES (%s, %s, %s, %s, %s)
        ''', (
            1,  # Временно привязываем к первой организации
            username,
            password_hash,
            'Суперадминистратор',
            True
        ))
        conn.commit()
        print(f'✓ Создан суперадмин: username="{username}", password="{password}"')
        print(f'  Суперадмин имеет доступ ко всем организациям через AdminPanel')
    except Exception as e:
        conn.rollback()
        print(f'✗ Ошибка создания суперадмина: {str(e)}')

    cursor.close()
    conn.close()

    print('\n=== Готово! ===')
    print('Войдите с логином "admin" и паролем "admin"')
    print('Суперадмин может управлять всеми организациями через AdminPanel')

if __name__ == "__main__":
    create_superadmin()
