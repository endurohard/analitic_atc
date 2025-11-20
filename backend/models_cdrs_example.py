"""
Пример настройки моделей для работы с существующей таблицей cdrs

Если у вас уже есть таблица cdrs в базе данных, используйте этот файл
как пример для адаптации models.py

Пример SQL запроса для Salat:
SELECT * FROM cdrs WHERE "orgId" = 5
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# Ваша существующая таблица cdrs
class CDR(Base):
    """
    Модель для существующей таблицы cdrs
    Адаптируйте поля под вашу реальную структуру
    """
    __tablename__ = "cdrs"  # Название вашей существующей таблицы

    # Замените на ваши реальные поля
    id = Column(Integer, primary_key=True, index=True)

    # Числовой ID организации (например, 5 для Salat)
    orgId = Column(Integer, ForeignKey("organizations.orgId"), nullable=False, index=True)

    # Пример полей - адаптируйте под вашу структуру
    calldate = Column(DateTime, index=True)  # или другое название
    src = Column(String, index=True)  # caller number
    dst = Column(String, index=True)  # called number
    duration = Column(Integer)
    billsec = Column(Integer)  # billing seconds
    disposition = Column(String)  # ANSWERED, NO ANSWER, BUSY, etc.

    # Добавьте все остальные поля из вашей таблицы cdrs
    # uniqueid = Column(String)
    # channel = Column(String)
    # dcontext = Column(String)
    # и т.д.

    # Связь с организацией
    organization = relationship("Organization", back_populates="cdrs")


# Адаптация Organization для работы с cdrs
class Organization(Base):
    """
    Модель организации с связью к cdrs
    """
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    orgId = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)

    # Связь с cdrs
    cdrs = relationship("CDR", back_populates="organization")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Пример VIEW для совместимости, если структура сильно отличается
"""
CREATE OR REPLACE VIEW calls AS
SELECT
    id,
    CAST(id AS VARCHAR) as call_id,  -- Преобразуем ID в строку для call_id
    "orgId" as "orgId",
    src as caller_number,
    dst as called_number,
    calldate as call_date,
    duration,
    NULL as wait_time,
    CASE
        WHEN disposition = 'ANSWERED' THEN 'answered'
        WHEN disposition = 'NO ANSWER' THEN 'missed'
        WHEN disposition = 'BUSY' THEN 'busy'
        ELSE 'unknown'
    END as status,
    CASE
        WHEN src LIKE '9%' THEN 'incoming'
        ELSE 'outgoing'
    END as direction,
    NULL as department,
    NULL as operator,
    FALSE as is_redialed,
    calldate as created_at,
    calldate as updated_at
FROM cdrs;
"""

# Пример использования в API
"""
@app.get("/api/calls")
def get_calls(orgId: int, db: Session = Depends(get_db)):
    # Прямой запрос к cdrs
    calls = db.query(CDR).filter(CDR.orgId == orgId).all()
    return calls

# Или через RAW SQL для гибкости
@app.get("/api/calls")
def get_calls(orgId: int, db: Session = Depends(get_db)):
    result = db.execute(
        '''
        SELECT *
        FROM cdrs
        WHERE "orgId" = :orgId
        ORDER BY calldate DESC
        LIMIT 100
        ''',
        {"orgId": orgId}
    )
    return result.fetchall()
"""
