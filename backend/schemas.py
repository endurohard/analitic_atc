from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class OrganizationBase(BaseModel):
    orgId: int  # Числовой ID для связи с CDR
    name: str
    description: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    """Схема для создания организации"""
    username: Optional[str] = None  # Логин для доступа к организации
    password: Optional[str] = None  # Пароль для доступа к организации

class OrganizationUpdate(BaseModel):
    """Схема для обновления организации"""
    name: Optional[str] = None
    description: Optional[str] = None
    username: Optional[str] = None  # Новый логин (optional)
    password: Optional[str] = None  # Новый пароль (optional)
    logo_url: Optional[str] = None  # URL логотипа организации
    show_callto_columns: Optional[bool] = None  # Показывать колонки callto1 и callto2

class Organization(OrganizationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    name: Optional[str] = None
    email: Optional[str] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserOrganizationBase(BaseModel):
    user_id: int
    organization_id: int
    role: str

class UserOrganization(UserOrganizationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CallBase(BaseModel):
    call_id: str
    orgId: int  # Числовой ID организации
    caller_number: Optional[str] = None
    called_number: Optional[str] = None
    call_date: Optional[datetime] = None
    duration: Optional[int] = None
    wait_time: Optional[int] = None
    status: Optional[str] = None
    direction: Optional[str] = None
    department: Optional[str] = None
    operator: Optional[str] = None
    is_redialed: Optional[bool] = False

class Call(CallBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CallStatisticsBase(BaseModel):
    orgId: int  # Числовой ID организации
    date: datetime
    total_calls: int
    answered_calls: int
    missed_calls: int
    not_redialed_calls: int
    total_duration: int
    average_duration: float

class CallStatistics(CallStatisticsBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardLayoutBase(BaseModel):
    org_id: int
    layout_data: dict  # JSON с конфигурацией layout

class DashboardLayoutCreate(DashboardLayoutBase):
    pass

class DashboardLayoutUpdate(BaseModel):
    layout_data: dict

class DashboardLayout(DashboardLayoutBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PhoneMappingBase(BaseModel):
    org_id: int
    phone_number: str
    display_name: str
    color: Optional[str] = None

class PhoneMappingCreate(PhoneMappingBase):
    pass

class PhoneMappingUpdate(BaseModel):
    phone_number: Optional[str] = None
    display_name: Optional[str] = None
    color: Optional[str] = None

class PhoneMapping(PhoneMappingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
