from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, BigInteger, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Org(Base):
    """
    Модель организации из существующей таблицы orgs
    """
    __tablename__ = "orgs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # Название организации
    chatId = Column(BigInteger, nullable=False)  # ID телеграм-чата
    logo_url = Column(String, nullable=True)  # URL логотипа организации
    show_callto_columns = Column(Boolean, default=False)  # Показывать колонки callto1 и callto2

    # Связи
    cdrs = relationship("CDR", back_populates="organization", foreign_keys="CDR.orgId")

class Customer(Base):
    """
    Модель клиента из существующей таблицы customers
    """
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True)  # Номер телефона клиента

    # Связи
    cdrs = relationship("CDR", back_populates="customer")

class CDR(Base):
    """
    Модель для работы с существующей таблицей cdrs (Call Detail Records)
    Это основная таблица со всеми звонками
    """
    __tablename__ = "cdrs"

    id = Column(Integer, primary_key=True, index=True)
    orgId = Column(Integer, ForeignKey("orgs.id"), nullable=False, index=True)
    customerId = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)

    type = Column(String, nullable=False)  # Inbound/Outbound
    status = Column(String, nullable=False)  # ANSWERED, NO ANSWER, BUSY, etc.
    callId = Column(String, nullable=False)  # Уникальный ID звонка из АТС

    timeStart = Column(DateTime, nullable=False, index=True)  # Время начала звонка
    waitDuration = Column(Integer, nullable=False)  # Длительность ожидания (секунды)
    talkDuration = Column(Integer, nullable=False)  # Длительность разговора (секунды)

    recording = Column(String, nullable=False)  # Имя файла записи
    createdAt = Column(DateTime, nullable=False, index=True)  # Когда запись создана
    telegramFileId = Column(String)  # ID файла в Telegram

    secret = Column(Integer, nullable=False)  # Секретный код для доступа
    finishStatus = Column(String, nullable=False)  # userCall, noAnswer, etc.
    finishedAt = Column(DateTime)  # Когда завершился звонок

    callto1 = Column(String, nullable=False)  # Внутренний номер 1
    callto2 = Column(String, nullable=False)  # Внутренний номер 2
    reserveMobile = Column(String)  # Резервный мобильный номер

    # Связи
    organization = relationship("Org", back_populates="cdrs", foreign_keys=[orgId])
    customer = relationship("Customer", back_populates="cdrs")


class User(Base):
    """
    Модель пользователя (локальная таблица для аутентификации)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    email = Column(String)
    is_active = Column(Boolean, default=True)

    # Связи
    organizations = relationship("UserOrganization", back_populates="user")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserOrganization(Base):
    """
    Связь пользователя с организацией и его роль
    """
    __tablename__ = "user_organizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False)
    role = Column(String, default="viewer")  # admin, user, viewer

    # Связи
    user = relationship("User", back_populates="organizations")
    organization = relationship("Org")

    created_at = Column(DateTime, default=datetime.utcnow)

class OrgCredential(Base):
    """
    Учетные данные и брендирование для организаций
    """
    __tablename__ = "org_credentials"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False, unique=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    # Брендирование
    logo_url = Column(String)
    primary_color = Column(String, default="#1890ff")
    secondary_color = Column(String, default="#52c41a")
    company_name = Column(String)
    favicon_url = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Связи
    organization = relationship("Org")

class Call(Base):
    """
    Модель для активных звонков из таблицы calls
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

    # Связи
    organization = relationship("Org")
    customer = relationship("Customer")

class DashboardLayout(Base):
    """
    Модель для хранения layout'ов дашборда на уровне организации
    Подход как в Grafana - layout общий для всей организации
    """
    __tablename__ = "dashboard_layouts"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False, unique=True, index=True)
    layout_data = Column(JSON, nullable=False)  # JSON с конфигурацией grid layout

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Связи
    organization = relationship("Org")

class OrganizationColumn(Base):
    """
    Модель для хранения конфигурации колонок таблицы звонков для каждой организации
    """
    __tablename__ = "organization_columns"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False, index=True)
    column_key = Column(String(100), nullable=False)
    column_label = Column(String(200), nullable=False)
    column_order = Column(Integer, nullable=False, default=0)
    is_visible = Column(Boolean, default=True)
    column_type = Column(String(50), default='text')  # text, number, date, status, badge, audio, button
    source_field = Column(String(200))  # field name from the call object
    is_custom = Column(Boolean, default=False)
    width = Column(Integer)  # optional fixed width in pixels

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Связи
    organization = relationship("Org")

class PhoneMapping(Base):
    """
    Модель для маппинга внутренних номеров на пользовательские названия
    """
    __tablename__ = "phone_mappings"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False, index=True)
    phone_number = Column(String(50), nullable=False)
    display_name = Column(String(200), nullable=False)
    color = Column(String(20))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Связи
    organization = relationship("Org")

# Старые модели оставлю закомментированными на случай если понадобятся
"""
class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    orgId = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    calls = relationship("Call", back_populates="organization")
    users = relationship("UserOrganization", back_populates="organization")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Call(Base):
    __tablename__ = "calls"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(String, unique=True, index=True, nullable=False)
    orgId = Column(Integer, ForeignKey("organizations.orgId"), nullable=False, index=True)
    caller_number = Column(String, index=True)
    called_number = Column(String, index=True)
    call_date = Column(DateTime, default=datetime.utcnow, index=True)
    duration = Column(Integer)
    wait_time = Column(Integer)
    status = Column(String)
    direction = Column(String)
    department = Column(String)
    operator = Column(String)
    is_redialed = Column(Boolean, default=False)
    organization = relationship("Organization", back_populates="calls")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
"""
