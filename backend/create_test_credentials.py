"""
Скрипт для создания тестовых учетных данных для организаций
"""
import psycopg2
from passlib.context import CryptContext
import os

# Настройка для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_credentials():
    """Создает тестовые учетные данные для всех организаций"""

    conn = psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', '176.98.155.78'),
        port=os.getenv('POSTGRES_PORT', 5435),
        user=os.getenv('POSTGRES_USER', 'infobot'),
        password=os.getenv('POSTGRES_PASSWORD', 'infobot'),
        database=os.getenv('POSTGRES_DB', 'infobot'),
        connect_timeout=10
    )
    cursor = conn.cursor()

    # Получаем все организации
    cursor.execute('SELECT id, title FROM orgs ORDER BY id')
    orgs = cursor.fetchall()

    print(f'Найдено {len(orgs)} организаций')
    print('Создание учетных данных...\n')

    for org_id, org_title in orgs:
        # Создаем логин из названия организации (в нижнем регистре)
        username = org_title.lower()
        # Пароль - такой же как логин (для тестирования)
        password = org_title.lower()
        password_hash = pwd_context.hash(password)

        # Проверяем, существует ли уже запись для этой организации
        cursor.execute(
            'SELECT id FROM org_credentials WHERE org_id = %s',
            (org_id,)
        )
        existing = cursor.fetchone()

        if existing:
            print(f'✓ Организация {org_title} (ID: {org_id}) уже имеет учетные данные')
            continue

        # Вставляем новые учетные данные
        try:
            cursor.execute('''
                INSERT INTO org_credentials
                (org_id, username, password_hash, company_name, primary_color, secondary_color)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (
                org_id,
                username,
                password_hash,
                org_title,
                '#1890ff',  # primary color
                '#52c41a'   # secondary color
            ))
            conn.commit()
            print(f'✓ Создан логин для "{org_title}": username="{username}", password="{password}"')
        except Exception as e:
            conn.rollback()
            print(f'✗ Ошибка создания учетных данных для {org_title}: {str(e)}')

    cursor.close()
    conn.close()

    print('\n=== Готово! ===')
    print('Теперь вы можете войти используя логин и пароль любой организации')
    print('Например: username="funduk", password="funduk"')

if __name__ == "__main__":
    create_credentials()
