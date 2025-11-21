"""
Скрипт для просмотра всех пользователей
"""
from database import SessionLocal
from models import OrgCredential

def list_users():
    """Показывает список всех пользователей"""
    db = SessionLocal()
    try:
        users = db.query(OrgCredential).filter(OrgCredential.is_active == True).order_by(OrgCredential.username).all()

        print(f"\n{'='*70}")
        print(f"Всего активных пользователей: {len(users)}")
        print(f"{'='*70}\n")

        print(f"{'Username':<20} {'Organization':<25} {'Org ID':<10}")
        print(f"{'-'*70}")

        for user in users:
            org_name = user.company_name or f"Org #{user.org_id}"
            print(f"{user.username:<20} {org_name:<25} {user.org_id:<10}")

        print(f"\n{'='*70}")
        print("Для изменения пароля используйте:")
        print("  python change_password.py <username> <new_password>")
        print(f"{'='*70}\n")

    except Exception as e:
        print(f'✗ Ошибка: {e}')
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
