"""
Скрипт для инициализации базы данных и создания тестовых данных
"""
from database import engine, SessionLocal
from models import Base, Organization, User, UserOrganization, Call
from datetime import datetime, timedelta
import random

def init_database():
    """Создание таблиц в базе данных"""
    print("Создание таблиц...")
    Base.metadata.create_all(bind=engine)
    print("✓ Таблицы созданы")

def create_test_data():
    """Создание тестовых данных"""
    db = SessionLocal()

    try:
        # Проверка существующих данных
        existing_org = db.query(Organization).first()
        if existing_org:
            print("Данные уже существуют. Пропускаем создание тестовых данных.")
            return

        print("\nСоздание тестовых данных...")

        # Создание организаций
        orgs = [
            Organization(org_id="ORG001", name="Салат", description="Ресторан Салат"),
            Organization(org_id="ORG002", name="IT Компания", description="IT отдел"),
            Organization(org_id="ORG003", name="Колл-центр", description="Служба поддержки")
        ]
        for org in orgs:
            db.add(org)
        db.commit()
        print("✓ Созданы организации")

        # Создание пользователя (пароль: admin123)
        # В продакшене используйте хэширование паролей!
        from passlib.hash import bcrypt
        user = User(
            username="admin",
            password_hash=bcrypt.hash("admin123"),
            name="Администратор",
            email="admin@example.com",
            is_active=True
        )
        db.add(user)
        db.commit()
        print("✓ Создан пользователь (admin / admin123)")

        # Привязка пользователя к организациям
        for org in orgs:
            user_org = UserOrganization(
                user_id=user.id,
                organization_id=org.id,
                role="admin" if org.org_id == "ORG001" else "user"
            )
            db.add(user_org)
        db.commit()
        print("✓ Пользователь добавлен в организации")

        # Создание тестовых звонков
        statuses = ["answered", "missed", "busy"]
        directions = ["incoming", "outgoing"]
        numbers = [
            "9280532626", "9995338191", "9064489900", "9618369747",
            "9640062672", "9882980010", "9680016667", "9887741604",
            "9667699009", "9282765709", "9666666858"
        ]

        print("✓ Создание тестовых звонков...")
        for i in range(50):
            for org in orgs[:1]:  # Только для первой организации
                call = Call(
                    call_id=f"CALL{org.org_id}_{i:04d}",
                    org_id=org.org_id,
                    caller_number=random.choice(numbers),
                    called_number=random.choice(numbers),
                    call_date=datetime.now() - timedelta(hours=random.randint(0, 72)),
                    duration=random.randint(30, 600),
                    wait_time=random.randint(0, 60),
                    status=random.choice(statuses),
                    direction=random.choice(directions),
                    department="Отдел продаж",
                    operator=f"Оператор {random.randint(1, 5)}",
                    is_redialed=random.choice([True, False])
                )
                db.add(call)

        db.commit()
        print(f"✓ Создано 50 тестовых звонков")

        print("\n✅ Тестовые данные успешно созданы!")
        print("\nДанные для входа:")
        print("  Username: admin")
        print("  Password: admin123")

    except Exception as e:
        print(f"❌ Ошибка при создании данных: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=== Инициализация базы данных ===\n")
    init_database()

    # Спросить пользователя о создании тестовых данных
    create_test = input("\nСоздать тестовые данные? (y/n): ").lower()
    if create_test == 'y':
        create_test_data()

    print("\n=== Готово! ===")
