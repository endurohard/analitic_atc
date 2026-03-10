from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# ===== УДАЛЁННАЯ БАЗА ДАННЫХ (CDR - данные звонков) =====
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@"
    f"{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency для получения сессии удалённой базы данных (CDR)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== ЛОКАЛЬНАЯ БАЗА ДАННЫХ (аутентификация, настройки) =====
LOCAL_DATABASE_URL = os.getenv(
    "LOCAL_DATABASE_URL",
    "postgresql://atc_local:atc_local_password@local_db:5432/atc_local"
)

local_engine = create_engine(LOCAL_DATABASE_URL)
LocalSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=local_engine)

LocalBase = declarative_base()

def get_local_db():
    """Dependency для получения сессии локальной базы данных (auth, settings)"""
    db = LocalSessionLocal()
    try:
        yield db
    finally:
        db.close()
