from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, BigInteger, JSON
from sqlalchemy.orm import relationship
from database import Base, LocalBase
from datetime import datetime

# ============================================
# МОДЕЛИ ДЛЯ УДАЛЁННОЙ БАЗЫ ДАННЫХ (CDR)
# ============================================

class Org(Base):
    """
    Модель организации из существующей таблицы orgs (удалённая БД)
    """
    __tablename__ = "orgs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    chatId = Column(BigInteger, nullable=False)
    # Эти колонки теперь в локальной БД через OrgCredential
    # logo_url и show_callto_columns больше не нужны здесь

    cdrs = relationship("CDR", back_populates="organization", foreign_keys="CDR.orgId")


class Customer(Base):
    """
    Модель клиента из существующей таблицы customers (удалённая БД)
    """
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True)

    cdrs = relationship("CDR", back_populates="customer")


class CDR(Base):
    """
    Модель для работы с существующей таблицей cdrs (удалённая БД)
    """
    __tablename__ = "cdrs"

    id = Column(Integer, primary_key=True, index=True)
    orgId = Column(Integer, ForeignKey("orgs.id"), nullable=False, index=True)
    customerId = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)

    type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    callId = Column(String, nullable=False)

    timeStart = Column(DateTime, nullable=False, index=True)
    waitDuration = Column(Integer, nullable=False)
    talkDuration = Column(Integer, nullable=False)

    recording = Column(String, nullable=False)
    createdAt = Column(DateTime, nullable=False, index=True)
    telegramFileId = Column(String)

    secret = Column(Integer, nullable=False)
    finishStatus = Column(String, nullable=False)
    finishedAt = Column(DateTime)

    callto1 = Column(String, nullable=False)
    callto2 = Column(String, nullable=False)
    reserveMobile = Column(String)

    organization = relationship("Org", back_populates="cdrs", foreign_keys=[orgId])
    customer = relationship("Customer", back_populates="cdrs")


class Call(Base):
    """
    Модель для активных звонков из таблицы calls (удалённая БД)
    """
    __tablename__ = "calls"

    callId = Column(String, primary_key=True)
    orgId = Column(Integer, ForeignKey("orgs.id"), nullable=False, index=True)
    customerId = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    createdAt = Column(DateTime, nullable=False, index=True)
    finishedAt = Column(DateTime)
    reserveMobile = Column(String)

    organization = relationship("Org")
    customer = relationship("Customer")


# ============================================
# МОДЕЛИ ДЛЯ ЛОКАЛЬНОЙ БАЗЫ ДАННЫХ (Auth/Settings)
# ============================================

class OrgCredential(LocalBase):
    """
    Учетные данные организаций (локальная БД)
    """
    __tablename__ = "org_credentials"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, unique=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    # Брендирование и настройки
    logo_url = Column(String(500))
    primary_color = Column(String(20), default="#1890ff")
    secondary_color = Column(String(20), default="#52c41a")
    company_name = Column(String(200))
    favicon_url = Column(String(500))
    show_callto_columns = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PhoneMapping(LocalBase):
    """
    Маппинг внутренних номеров на названия (локальная БД)
    """
    __tablename__ = "phone_mappings"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    phone_number = Column(String(50), nullable=False)
    display_name = Column(String(200), nullable=False)
    color = Column(String(20))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DashboardLayout(LocalBase):
    """
    Layout дашборда для организации (локальная БД)
    """
    __tablename__ = "dashboard_layouts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, unique=True, index=True)
    layout_data = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OrganizationColumn(LocalBase):
    """
    Конфигурация колонок таблицы звонков (локальная БД)
    """
    __tablename__ = "organization_columns"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    column_key = Column(String(100), nullable=False)
    column_label = Column(String(200), nullable=False)
    column_order = Column(Integer, nullable=False, default=0)
    is_visible = Column(Boolean, default=True)
    column_type = Column(String(50), default='text')
    source_field = Column(String(200))
    is_custom = Column(Boolean, default=False)
    width = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================
# УСТАРЕВШИЕ МОДЕЛИ (не используются)
# ============================================

class User(Base):
    """
    Модель пользователя (не используется, оставлена для совместимости)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    email = Column(String)
    is_active = Column(Boolean, default=True)

    organizations = relationship("UserOrganization", back_populates="user")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserOrganization(Base):
    """
    Связь пользователя с организацией (не используется)
    """
    __tablename__ = "user_organizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False)
    role = Column(String, default="viewer")

    user = relationship("User", back_populates="organizations")
    organization = relationship("Org")

    created_at = Column(DateTime, default=datetime.utcnow)
