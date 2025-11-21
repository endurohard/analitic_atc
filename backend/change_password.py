"""
Скрипт для изменения пароля пользователя
Использование: python change_password.py <username> <new_password>
"""
import sys
from database import SessionLocal
from models import OrgCredential
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def change_password(username, new_password):
    """Изменяет пароль пользователя"""
    db = SessionLocal()
    try:
        user = db.query(OrgCredential).filter(OrgCredential.username == username).first()
        if user:
            user.password_hash = pwd_context.hash(new_password)
            db.commit()
            print(f'✓ Пароль для пользователя "{username}" успешно изменен')
            print(f'  Новый пароль: {new_password}')
            return True
        else:
            print(f'✗ Пользователь "{username}" не найден')
            return False
    except Exception as e:
        db.rollback()
        print(f'✗ Ошибка: {e}')
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Использование: python change_password.py <username> <new_password>")
        print("\nПример:")
        print("  python change_password.py admin newpassword123")
        sys.exit(1)

    username = sys.argv[1]
    new_password = sys.argv[2]

    print(f"Изменение пароля для пользователя: {username}")
    success = change_password(username, new_password)
    sys.exit(0 if success else 1)
