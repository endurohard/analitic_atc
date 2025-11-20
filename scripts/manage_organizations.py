#!/usr/bin/env python3
"""
Скрипт для управления организациями в базе данных
Использование: python manage_organizations.py
"""

import sys
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Загрузка переменных окружения
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

# Параметры подключения к БД
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST'),
    'port': os.getenv('POSTGRES_PORT', 5432),
    'user': os.getenv('POSTGRES_USER'),
    'password': os.getenv('POSTGRES_PASSWORD'),
    'database': os.getenv('POSTGRES_DB')
}

class OrganizationManager:
    def __init__(self):
        self.conn = None
        self.cursor = None

    def connect(self):
        """Подключение к базе данных"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print("✓ Подключено к базе данных")
            return True
        except Exception as e:
            print(f"✗ Ошибка подключения к БД: {e}")
            return False

    def disconnect(self):
        """Отключение от базы данных"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("✓ Отключено от базы данных")

    def list_organizations(self):
        """Показать список всех организаций"""
        try:
            self.cursor.execute("""
                SELECT id, "orgId", name, description, created_at
                FROM organizations
                ORDER BY created_at DESC
            """)
            orgs = self.cursor.fetchall()

            if not orgs:
                print("\n📋 Организации не найдены")
                return

            print("\n📋 Список организаций:")
            print("-" * 80)
            for org in orgs:
                print(f"ID: {org['id']}")
                print(f"Org ID: {org['orgId']} (числовой)")
                print(f"Название: {org['name']}")
                print(f"Описание: {org['description'] or 'Не указано'}")
                print(f"Создана: {org['created_at']}")
                print("-" * 80)

        except Exception as e:
            print(f"✗ Ошибка при получении списка: {e}")

    def add_organization(self):
        """Добавить новую организацию"""
        print("\n➕ Добавление новой организации")
        print("-" * 40)

        org_id_str = input("Введите уникальный числовой ID организации (например, 5 для Salat): ").strip()
        if not org_id_str:
            print("✗ Org ID не может быть пустым")
            return

        try:
            org_id = int(org_id_str)
        except ValueError:
            print("✗ Org ID должен быть числом")
            return

        name = input("Введите название организации: ").strip()
        if not name:
            print("✗ Название не может быть пустым")
            return

        description = input("Введите описание (необязательно): ").strip()

        try:
            self.cursor.execute("""
                INSERT INTO organizations ("orgId", name, description)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (org_id, name, description if description else None))

            new_id = self.cursor.fetchone()['id']
            self.conn.commit()

            print(f"\n✓ Организация успешно добавлена (DB ID: {new_id})")
            print(f"  Org ID: {org_id} (для связи с CDR)")
            print(f"  Название: {name}")

        except psycopg2.IntegrityError:
            self.conn.rollback()
            print(f"✗ Организация с Org ID '{org_id}' уже существует")
        except Exception as e:
            self.conn.rollback()
            print(f"✗ Ошибка при добавлении: {e}")

    def update_organization(self):
        """Обновить существующую организацию"""
        print("\n✏️  Обновление организации")
        print("-" * 40)

        org_id_str = input("Введите Org ID организации для обновления (числовой): ").strip()
        if not org_id_str:
            print("✗ Org ID не может быть пустым")
            return

        try:
            org_id = int(org_id_str)
        except ValueError:
            print("✗ Org ID должен быть числом")
            return

        # Проверка существования
        self.cursor.execute('SELECT * FROM organizations WHERE "orgId" = %s', (org_id,))
        org = self.cursor.fetchone()

        if not org:
            print(f"✗ Организация с Org ID '{org_id}' не найдена")
            return

        print(f"\nТекущие данные:")
        print(f"  Название: {org['name']}")
        print(f"  Описание: {org['description'] or 'Не указано'}")
        print()

        name = input(f"Новое название (Enter - оставить '{org['name']}'): ").strip()
        description = input(f"Новое описание (Enter - оставить текущее): ").strip()

        if not name and not description:
            print("Нечего обновлять")
            return

        try:
            updates = []
            params = []

            if name:
                updates.append("name = %s")
                params.append(name)

            if description:
                updates.append("description = %s")
                params.append(description)

            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(org_id)

            query = f'UPDATE organizations SET {", ".join(updates)} WHERE "orgId" = %s'
            self.cursor.execute(query, params)
            self.conn.commit()

            print(f"\n✓ Организация (Org ID: {org_id}) успешно обновлена")

        except Exception as e:
            self.conn.rollback()
            print(f"✗ Ошибка при обновлении: {e}")

    def delete_organization(self):
        """Удалить организацию"""
        print("\n🗑️  Удаление организации")
        print("-" * 40)
        print("⚠️  ВНИМАНИЕ: Все связанные данные (звонки, пользователи) будут удалены!")
        print()

        org_id = input("Введите Org ID организации для удаления: ").strip()
        if not org_id:
            print("✗ Org ID не может быть пустым")
            return

        # Проверка существования
        self.cursor.execute("SELECT name FROM organizations WHERE org_id = %s", (org_id,))
        org = self.cursor.fetchone()

        if not org:
            print(f"✗ Организация с ID '{org_id}' не найдена")
            return

        # Подсчет связанных записей
        self.cursor.execute("SELECT COUNT(*) as cnt FROM calls WHERE org_id = %s", (org_id,))
        calls_count = self.cursor.fetchone()['cnt']

        print(f"\nОрганизация: {org['name']}")
        print(f"Связанных звонков: {calls_count}")
        print()

        confirm = input(f"Вы уверены, что хотите удалить '{org_id}'? (yes/no): ").strip().lower()

        if confirm != 'yes':
            print("Отменено")
            return

        try:
            self.cursor.execute("DELETE FROM organizations WHERE org_id = %s", (org_id,))
            self.conn.commit()
            print(f"\n✓ Организация '{org_id}' успешно удалена")

        except Exception as e:
            self.conn.rollback()
            print(f"✗ Ошибка при удалении: {e}")

    def import_organizations_from_file(self):
        """Импорт организаций из CSV файла"""
        print("\n📥 Импорт организаций из CSV файла")
        print("-" * 40)
        print("Формат CSV: orgId,name,description")
        print("Пример: 5,Салат,Ресторан Салат")
        print()

        file_path = input("Введите путь к CSV файлу: ").strip()

        if not os.path.exists(file_path):
            print(f"✗ Файл '{file_path}' не найден")
            return

        try:
            import csv
            added = 0
            skipped = 0

            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)

                for row in reader:
                    org_id_str = row.get('orgId', '').strip()
                    name = row.get('name', '').strip()
                    description = row.get('description', '').strip()

                    if not org_id_str or not name:
                        print(f"⚠️  Пропущена строка: пустой orgId или name")
                        skipped += 1
                        continue

                    try:
                        org_id = int(org_id_str)
                    except ValueError:
                        print(f"⚠️  Пропущена строка: orgId должен быть числом ({org_id_str})")
                        skipped += 1
                        continue

                    try:
                        self.cursor.execute("""
                            INSERT INTO organizations ("orgId", name, description)
                            VALUES (%s, %s, %s)
                        """, (org_id, name, description if description else None))
                        added += 1
                        print(f"✓ Добавлена: orgId={org_id} - {name}")

                    except psycopg2.IntegrityError:
                        self.conn.rollback()
                        print(f"⚠️  Пропущена: orgId={org_id} (уже существует)")
                        skipped += 1

                self.conn.commit()

            print(f"\n✓ Импорт завершен: добавлено {added}, пропущено {skipped}")

        except Exception as e:
            self.conn.rollback()
            print(f"✗ Ошибка при импорте: {e}")

    def create_sample_csv(self):
        """Создать пример CSV файла"""
        filename = 'organizations_sample.csv'

        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("orgId,name,description\n")
                f.write("5,Салат,Ресторан Салат\n")
                f.write("2,IT Отдел,IT компания\n")
                f.write("3,Колл-центр,Служба поддержки\n")

            print(f"\n✓ Создан пример файла: {filename}")
            print("Формат: orgId (числовой), name, description")
            print("Отредактируйте его и используйте для импорта")

        except Exception as e:
            print(f"✗ Ошибка при создании файла: {e}")

    def show_menu(self):
        """Показать главное меню"""
        print("\n" + "=" * 50)
        print("  Управление организациями АТС Аналитики")
        print("=" * 50)
        print("\n1. Показать список организаций")
        print("2. Добавить организацию")
        print("3. Обновить организацию")
        print("4. Удалить организацию")
        print("5. Импорт из CSV файла")
        print("6. Создать пример CSV файла")
        print("0. Выход")
        print()

    def run(self):
        """Запуск интерактивного режима"""
        if not self.connect():
            return

        try:
            while True:
                self.show_menu()
                choice = input("Выберите действие: ").strip()

                if choice == '1':
                    self.list_organizations()
                elif choice == '2':
                    self.add_organization()
                elif choice == '3':
                    self.update_organization()
                elif choice == '4':
                    self.delete_organization()
                elif choice == '5':
                    self.import_organizations_from_file()
                elif choice == '6':
                    self.create_sample_csv()
                elif choice == '0':
                    print("\nВыход...")
                    break
                else:
                    print("\n✗ Неверный выбор")

                input("\nНажмите Enter для продолжения...")

        finally:
            self.disconnect()

def main():
    """Главная функция"""
    print("\n" + "=" * 60)
    print("  Скрипт управления организациями")
    print("  АТС Аналитика")
    print("=" * 60)

    # Проверка параметров подключения
    if not all([DB_CONFIG['host'], DB_CONFIG['user'], DB_CONFIG['password'], DB_CONFIG['database']]):
        print("\n✗ Ошибка: Не все параметры подключения к БД указаны в .env")
        print("Проверьте файл .env и укажите:")
        print("  - POSTGRES_HOST")
        print("  - POSTGRES_USER")
        print("  - POSTGRES_PASSWORD")
        print("  - POSTGRES_DB")
        sys.exit(1)

    print(f"\nПодключение к: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")

    manager = OrganizationManager()
    manager.run()

if __name__ == '__main__':
    main()
