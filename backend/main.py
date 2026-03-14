from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_
from typing import List
import os
import shutil
import uuid
import httpx
from datetime import datetime, timedelta
from passlib.context import CryptContext

from database import get_db, engine, get_local_db
import models
import schemas

# Настройка для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(
    title="АТС Аналитика API",
    description="API для аналитики телефонных звонков",
    version="2.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Создаём директорию для загрузок, если её нет
UPLOAD_DIR = "uploads/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Монтируем статические файлы
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="api-uploads")

@app.get("/api/recordings/{filename:path}")
async def get_recording(filename: str):
    """
    Получение аудио записи звонка
    Проксирует запросы к серверу с записями или отдает локальные файлы
    """
    try:
        recordings_url = os.getenv('RECORDINGS_URL')
        recordings_path = os.getenv('RECORDINGS_PATH')

        # Если настроен URL для записей, используем проксирование
        if recordings_url:
            full_url = f"{recordings_url}/{filename}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    response = await client.get(full_url)
                    if response.status_code == 200:
                        return StreamingResponse(
                            iter([response.content]),
                            media_type="audio/wav",
                            headers={
                                "Accept-Ranges": "bytes",
                                "Content-Length": str(len(response.content))
                            }
                        )
                    else:
                        raise HTTPException(status_code=404, detail="Recording not found on remote server")
                except httpx.RequestError as e:
                    raise HTTPException(status_code=502, detail=f"Error fetching recording: {str(e)}")

        # Если настроен локальный путь, отдаем файл напрямую
        elif recordings_path:
            file_path = os.path.join(recordings_path, filename)
            if os.path.exists(file_path):
                return FileResponse(
                    file_path,
                    media_type="audio/wav",
                    headers={"Accept-Ranges": "bytes"}
                )
            else:
                raise HTTPException(status_code=404, detail="Recording not found")

        else:
            raise HTTPException(
                status_code=500,
                detail="Recordings path not configured. Please set RECORDINGS_URL or RECORDINGS_PATH in .env"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving recording: {str(e)}")

@app.get("/")
def read_root():
    return {
        "message": "АТС Аналитика API",
        "version": "2.0.0",
        "status": "running",
        "database": "external CDR database"
    }

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Проверка подключения к базе данных"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

@app.post("/api/auth/login")
def login(credentials: dict, db: Session = Depends(get_db), local_db: Session = Depends(get_local_db)):
    """Аутентификация пользователя организации"""
    try:
        username = credentials.get("username")
        password = credentials.get("password")

        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password are required")

        # Ищем учетные данные организации (в локальной БД)
        org_cred = local_db.query(models.OrgCredential).filter(
            models.OrgCredential.username == username,
            models.OrgCredential.is_active == True
        ).first()

        if not org_cred:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Проверяем пароль
        if not pwd_context.verify(password, org_cred.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Проверяем, является ли пользователь суперадмином
        is_superadmin = (username == "itadmin")

        if is_superadmin:
            # Для суперадмина возвращаем все организации
            all_orgs = db.query(models.Org).order_by(models.Org.id).all()
            organizations = []

            for org in all_orgs:
                # Получаем настройки организации из OrgCredential (локальная БД)
                org_cred_info = local_db.query(models.OrgCredential).filter(
                    models.OrgCredential.org_id == org.id
                ).first()

                # Получаем маппинги телефонов для каждой организации (локальная БД)
                phone_mappings = local_db.query(models.PhoneMapping).filter(
                    models.PhoneMapping.org_id == org.id
                ).all()

                organizations.append({
                    "id": org.id,
                    "orgId": org.id,
                    "name": org.title,
                    "chatId": org.chatId,
                    "role": "admin",
                    "logo_url": org_cred_info.logo_url if org_cred_info else None,
                    "show_callto_columns": (org_cred_info.show_callto_columns or False) if org_cred_info else False,
                    "phone_mappings": [{
                        "id": pm.id,
                        "phone_number": pm.phone_number,
                        "display_name": pm.display_name,
                        "color": pm.color
                    } for pm in phone_mappings]
                })

            return {
                "user": {
                    "id": org_cred.id,
                    "username": org_cred.username,
                    "name": org_cred.company_name or "Суперадминистратор",
                    "organizations": organizations
                }
            }
        else:
            # Для обычных пользователей возвращаем одну организацию
            org = db.query(models.Org).filter(models.Org.id == org_cred.org_id).first()

            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")

            # Получаем маппинги телефонов для организации (локальная БД)
            phone_mappings = local_db.query(models.PhoneMapping).filter(
                models.PhoneMapping.org_id == org.id
            ).all()

            # Возвращаем данные пользователя и организации
            return {
                "user": {
                    "id": org_cred.id,
                    "username": org_cred.username,
                    "name": org_cred.company_name or org.title
                },
                "organization": {
                    "id": org.id,
                    "orgId": org.id,
                    "name": org.title,
                    "chatId": org.chatId,
                    "logo_url": org_cred.logo_url,
                    "show_callto_columns": org_cred.show_callto_columns or False,
                    "phone_mappings": [{
                        "id": pm.id,
                        "phone_number": pm.phone_number,
                        "display_name": pm.display_name,
                        "color": pm.color
                    } for pm in phone_mappings]
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.get("/api/organizations/all")
def get_all_organizations(db: Session = Depends(get_db)):
    """Получение списка всех организаций из таблицы orgs"""
    try:
        orgs = db.query(models.Org).order_by(models.Org.id).all()
        return [{
            "id": org.id,
            "orgId": org.id,
            "name": org.title,
            "chatId": org.chatId,
            "role": "admin"  # Временно даем всем доступ как администратору
        } for org in orgs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching organizations: {str(e)}")

@app.get("/api/organizations")
def get_user_organizations(user_id: int, db: Session = Depends(get_db)):
    """Получение списка организаций пользователя"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    organizations = []
    for user_org in user.organizations:
        organizations.append({
            "id": user_org.organization.id,
            "orgId": user_org.organization.id,  # У нас orgId = id в таблице orgs
            "name": user_org.organization.title,
            "role": user_org.role
        })

    return organizations

@app.get("/api/calls")
def get_calls(
    orgId: int,
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    direction: str = None,
    timeRange: str = None,
    startDate: str = None,
    endDate: str = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    """
    Получение списка звонков для организации из таблицы cdrs
    timeRange: 1h, 24h, 7d, 30d или None (все время)
    startDate: начальная дата в формате YYYY-MM-DD или YYYY-MM-DD HH:MM:SS
    endDate: конечная дата в формате YYYY-MM-DD или YYYY-MM-DD HH:MM:SS
    """
    try:
        from datetime import datetime, timedelta

        query = db.query(
            models.CDR,
            models.Customer.phone
        ).join(
            models.Customer,
            models.CDR.customerId == models.Customer.id
        ).filter(
            models.CDR.orgId == orgId
        )

        if status:
            if status == "answered":
                query = query.filter(models.CDR.status == "ANSWERED")
            elif status == "missed":
                query = query.filter(models.CDR.status.in_(["NO ANSWER", "NOANSWER"]))

        if direction:
            if direction == "inbound":
                query = query.filter(models.CDR.type == "Inbound")
            elif direction == "outbound":
                query = query.filter(models.CDR.type == "Outbound")

        # Фильтр по датам - приоритет у произвольного периода
        if startDate or endDate:
            if startDate:
                try:
                    if len(startDate) == 10:
                        start_time = datetime.strptime(startDate, "%Y-%m-%d")
                    else:
                        start_time = datetime.strptime(startDate, "%Y-%m-%d %H:%M:%S")
                    query = query.filter(models.CDR.createdAt >= start_time)
                except ValueError:
                    pass

            if endDate:
                try:
                    if len(endDate) == 10:
                        end_time = datetime.strptime(endDate, "%Y-%m-%d")
                        end_time = end_time + timedelta(days=1) - timedelta(seconds=1)
                    else:
                        end_time = datetime.strptime(endDate, "%Y-%m-%d %H:%M:%S")
                    query = query.filter(models.CDR.createdAt <= end_time)
                except ValueError:
                    pass
        elif timeRange:
            # Если не указаны произвольные даты, используем предустановленные периоды
            now = datetime.now()
            if timeRange == "1h":
                start_time = now - timedelta(hours=1)
            elif timeRange == "24h":
                start_time = now - timedelta(hours=24)
            elif timeRange == "7d":
                start_time = now - timedelta(days=7)
            elif timeRange == "30d":
                start_time = now - timedelta(days=30)
            else:
                start_time = None

            if start_time:
                query = query.filter(models.CDR.createdAt >= start_time)

        # Поиск по номеру телефона
        if search:
            search_digits = ''.join(c for c in search if c.isdigit())
            if search_digits:
                # Убираем префикс 7/8 для 11-значных номеров (российский формат)
                if len(search_digits) == 11 and search_digits[0] in ('7', '8'):
                    search_digits = search_digits[1:]
                query = query.filter(models.Customer.phone.ilike(f'%{search_digits}%'))

        # Общее количество записей (до пагинации)
        total_count = query.count()

        results = query.order_by(models.CDR.timeStart.desc()).offset(skip).limit(limit).all()

        calls = []
        for cdr, phone in results:
            # Проверка "Не перезвонили"
            not_redialed = False
            if cdr.type == "Inbound" and cdr.status in ["NO ANSWER", "NOANSWER"] and cdr.finishStatus == "noAnswer":
                # Проверяем, есть ли исходящий звонок после этого
                callback = db.query(models.CDR).filter(
                    models.CDR.orgId == cdr.orgId,
                    models.CDR.customerId == cdr.customerId,
                    models.CDR.type == "Outbound",
                    models.CDR.createdAt > cdr.createdAt
                ).first()
                not_redialed = (callback is None)

            calls.append({
                "id": cdr.id,
                "number": phone,
                "status": "answered" if cdr.status == "ANSWERED" else "not_answered",
                "type": "incoming" if cdr.type == "Inbound" else "outgoing",
                "datetime": cdr.timeStart.isoformat(),
                "redialed": not not_redialed,
                "not_redialed": not_redialed,
                "duration": cdr.talkDuration,
                "waitDuration": cdr.waitDuration,
                "recording": cdr.recording,
                "secret": cdr.secret,
                "finishStatus": cdr.finishStatus,
                "reserveMobile": cdr.reserveMobile,
                "callto1": cdr.callto1,
                "callto2": cdr.callto2
            })

        return {"calls": calls, "total": total_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calls/{call_id}")
def get_call(call_id: int, orgId: int, db: Session = Depends(get_db)):
    """Получение информации о конкретном звонке"""
    try:
        result = db.query(
            models.CDR,
            models.Customer.phone
        ).join(
            models.Customer,
            models.CDR.customerId == models.Customer.id
        ).filter(
            models.CDR.id == call_id,
            models.CDR.orgId == orgId
        ).first()

        if result is None:
            raise HTTPException(status_code=404, detail="Call not found")

        cdr, phone = result
        return {
            "id": cdr.id,
            "number": phone,
            "status": "answered" if cdr.status == "ANSWERED" else "not_answered",
            "type": "incoming" if cdr.type == "Inbound" else "outgoing",
            "datetime": cdr.timeStart.isoformat(),
            "duration": cdr.talkDuration,
            "waitDuration": cdr.waitDuration,
            "recording": cdr.recording,
            "secret": cdr.secret,
            "reserveMobile": cdr.reserveMobile,
            "callto1": cdr.callto1,
            "callto2": cdr.callto2
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/calls/{call_id}")
def update_call(call_id: int, orgId: int, data: dict, db: Session = Depends(get_db)):
    """Обновление информации о звонке (только для админов)"""
    try:
        cdr = db.query(models.CDR).filter(
            models.CDR.id == call_id,
            models.CDR.orgId == orgId
        ).first()

        if cdr is None:
            raise HTTPException(status_code=404, detail="Call not found")

        # Обновляем только разрешенные поля
        if "reserveMobile" in data:
            cdr.reserveMobile = data["reserveMobile"]
        if "callto1" in data:
            cdr.callto1 = data["callto1"]
        if "callto2" in data:
            cdr.callto2 = data["callto2"]

        db.commit()
        db.refresh(cdr)

        return {"success": True, "message": "Call updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calls-unprocessed")
def get_unprocessed_calls(
    orgId: int,
    skip: int = 0,
    limit: int = 100,
    timeRange: str = None,
    startDate: str = None,
    endDate: str = None,
    db: Session = Depends(get_db)
):
    """
    Получение необработанных звонков (пропущенные и не перезвоненные) - ОПТИМИЗИРОВАНО
    timeRange: 1h, 24h, 7d, 30d или None (все время)
    startDate: начальная дата в формате YYYY-MM-DD или YYYY-MM-DD HH:MM:SS
    endDate: конечная дата в формате YYYY-MM-DD или YYYY-MM-DD HH:MM:SS
    """
    try:
        from sqlalchemy import text
        from datetime import datetime, timedelta

        # Определяем временной фильтр
        time_filter = ""
        params = {"org_id": orgId, "limit": limit, "skip": skip}

        # Приоритет у произвольного периода (startDate/endDate)
        if startDate or endDate:
            if startDate:
                try:
                    if len(startDate) == 10:
                        start_time = datetime.strptime(startDate, "%Y-%m-%d")
                    else:
                        start_time = datetime.strptime(startDate, "%Y-%m-%d %H:%M:%S")
                    time_filter = 'AND c."createdAt" >= :start_time'
                    params["start_time"] = start_time
                except ValueError:
                    pass

            if endDate:
                try:
                    if len(endDate) == 10:
                        end_time = datetime.strptime(endDate, "%Y-%m-%d")
                        end_time = end_time + timedelta(days=1) - timedelta(seconds=1)
                    else:
                        end_time = datetime.strptime(endDate, "%Y-%m-%d %H:%M:%S")

                    if time_filter:
                        time_filter += ' AND c."createdAt" <= :end_time'
                    else:
                        time_filter = 'AND c."createdAt" <= :end_time'
                    params["end_time"] = end_time
                except ValueError:
                    pass

        elif timeRange:
            # Если не указаны произвольные даты, используем предустановленные периоды
            now = datetime.now()
            if timeRange == "1h":
                start_time = now - timedelta(hours=1)
            elif timeRange == "24h":
                start_time = now - timedelta(hours=24)
            elif timeRange == "7d":
                start_time = now - timedelta(days=7)
            elif timeRange == "30d":
                start_time = now - timedelta(days=30)
            else:
                start_time = None

            if start_time:
                time_filter = 'AND c."createdAt" >= :start_time'
                params["start_time"] = start_time

        # Оптимизированный SQL запрос с NOT EXISTS для проверки обратных звонков
        query = text(f"""
            SELECT DISTINCT
                c.id,
                cu.phone,
                c."timeStart"
            FROM cdrs c
            JOIN customers cu ON c."customerId" = cu.id
            WHERE c."orgId" = :org_id
                AND c.type = 'Inbound'
                AND c.status IN ('NO ANSWER', 'NOANSWER')
                AND c."finishStatus" = 'noAnswer'
                {time_filter}
                AND NOT EXISTS (
                    SELECT 1 FROM cdrs c2
                    WHERE c2."orgId" = c."orgId"
                        AND c2."customerId" = c."customerId"
                        AND c2.type = 'Outbound'
                        AND c2."createdAt" > c."createdAt"
                )
            ORDER BY c."timeStart" DESC
            LIMIT :limit OFFSET :skip
        """)

        result = db.execute(query, params)

        calls = []
        for row in result:
            calls.append({
                "id": row[0],
                "number": row[1],
                "datetime": row[2].isoformat()
            })

        return calls
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/statistics/by-mapping")
def get_statistics_by_mapping(
    orgId: int,
    timeRange: str = None,
    startDate: str = None,
    endDate: str = None,
    db: Session = Depends(get_db),
    local_db: Session = Depends(get_local_db)
):
    """
    Получение статистики по маппингам телефонов (точкам)
    Возвращает общее количество звонков и пропущенные для каждого маппинга
    """
    try:
        from datetime import datetime, timedelta

        # Получаем маппинги для организации (локальная БД)
        phone_mappings = local_db.query(models.PhoneMapping).filter(
            models.PhoneMapping.org_id == orgId
        ).all()

        if not phone_mappings:
            return []

        # Определяем временной фильтр
        time_filter = ""
        params = {"org_id": orgId}

        if startDate or endDate:
            if startDate:
                try:
                    if len(startDate) == 10:
                        start_time = datetime.strptime(startDate, "%Y-%m-%d")
                    else:
                        start_time = datetime.strptime(startDate, "%Y-%m-%d %H:%M:%S")
                    time_filter = 'AND "createdAt" >= :start_time'
                    params["start_time"] = start_time
                except ValueError:
                    pass

            if endDate:
                try:
                    if len(endDate) == 10:
                        end_time = datetime.strptime(endDate, "%Y-%m-%d")
                        end_time = end_time + timedelta(days=1) - timedelta(seconds=1)
                    else:
                        end_time = datetime.strptime(endDate, "%Y-%m-%d %H:%M:%S")

                    if time_filter:
                        time_filter += ' AND "createdAt" <= :end_time'
                    else:
                        time_filter = 'AND "createdAt" <= :end_time'
                    params["end_time"] = end_time
                except ValueError:
                    pass

        elif timeRange:
            now = datetime.now()
            if timeRange == "1h":
                start_time = now - timedelta(hours=1)
            elif timeRange == "24h":
                start_time = now - timedelta(hours=24)
            elif timeRange == "7d":
                start_time = now - timedelta(days=7)
            elif timeRange == "30d":
                start_time = now - timedelta(days=30)
            else:
                start_time = None

            if start_time:
                time_filter = 'AND "createdAt" >= :start_time'
                params["start_time"] = start_time

        # Собираем статистику для каждого маппинга
        results = []
        for mapping in phone_mappings:
            # Нормализуем номер из маппинга
            mapping_phone = str(mapping.phone_number).replace('+', '').replace('-', '').replace(' ', '')

            # SQL запрос для подсчета звонков на этот номер
            query = text(f"""
                SELECT
                    COUNT(*) as total_calls,
                    SUM(CASE WHEN status IN ('NO ANSWER', 'NOANSWER') THEN 1 ELSE 0 END) as missed_calls
                FROM cdrs
                WHERE "orgId" = :org_id
                    AND (
                        callto1 LIKE '%' || :phone || '%'
                        OR callto2 LIKE '%' || :phone || '%'
                    )
                    {time_filter}
            """)

            params_with_phone = params.copy()
            params_with_phone["phone"] = mapping_phone

            result = db.execute(query, params_with_phone).first()

            if result and result[0] > 0:  # Только если есть звонки
                results.append({
                    "id": mapping.id,
                    "phone_number": mapping.phone_number,
                    "display_name": mapping.display_name,
                    "color": mapping.color,
                    "total_calls": result[0] or 0,
                    "missed_calls": result[1] or 0,
                    "answered_calls": (result[0] or 0) - (result[1] or 0)
                })

        # Сортируем по количеству звонков (от большего к меньшему)
        results.sort(key=lambda x: x['total_calls'], reverse=True)

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/statistics/summary")
def get_statistics_summary(
    orgId: int,
    timeRange: str = None,
    startDate: str = None,
    endDate: str = None,
    db: Session = Depends(get_db)
):
    """
    Получение общей статистики для организации - ОПТИМИЗИРОВАНО
    timeRange: 1h, 24h, 7d, 30d или None (все время)
    startDate: начальная дата в формате YYYY-MM-DD или YYYY-MM-DD HH:MM:SS
    endDate: конечная дата в формате YYYY-MM-DD или YYYY-MM-DD HH:MM:SS
    """
    try:
        from sqlalchemy import text
        from datetime import datetime, timedelta

        # Определяем временной фильтр
        time_filter = ""
        params = {"org_id": orgId}

        # Приоритет у произвольного периода (startDate/endDate)
        if startDate or endDate:
            if startDate:
                try:
                    # Пробуем разные форматы
                    if len(startDate) == 10:  # YYYY-MM-DD
                        start_time = datetime.strptime(startDate, "%Y-%m-%d")
                    else:  # YYYY-MM-DD HH:MM:SS
                        start_time = datetime.strptime(startDate, "%Y-%m-%d %H:%M:%S")
                    time_filter = 'AND "createdAt" >= :start_time'
                    params["start_time"] = start_time
                except ValueError:
                    pass

            if endDate:
                try:
                    if len(endDate) == 10:  # YYYY-MM-DD
                        end_time = datetime.strptime(endDate, "%Y-%m-%d")
                        # Добавляем 1 день минус 1 секунду, чтобы включить весь день
                        end_time = end_time + timedelta(days=1) - timedelta(seconds=1)
                    else:  # YYYY-MM-DD HH:MM:SS
                        end_time = datetime.strptime(endDate, "%Y-%m-%d %H:%M:%S")

                    if time_filter:
                        time_filter += ' AND "createdAt" <= :end_time'
                    else:
                        time_filter = 'AND "createdAt" <= :end_time'
                    params["end_time"] = end_time
                except ValueError:
                    pass

        elif timeRange:
            # Если не указаны произвольные даты, используем предустановленные периоды
            now = datetime.now()
            if timeRange == "1h":
                start_time = now - timedelta(hours=1)
            elif timeRange == "24h":
                start_time = now - timedelta(hours=24)
            elif timeRange == "7d":
                start_time = now - timedelta(days=7)
            elif timeRange == "30d":
                start_time = now - timedelta(days=30)
            else:
                start_time = None

            if start_time:
                time_filter = 'AND "createdAt" >= :start_time'
                params["start_time"] = start_time

        # Оптимизированный запрос: все статистики в одном SQL
        query = text(f"""
            SELECT
                COUNT(*) as total_calls,
                SUM(CASE WHEN status = 'ANSWERED' THEN 1 ELSE 0 END) as answered_calls,
                SUM(CASE WHEN status IN ('NO ANSWER', 'NOANSWER') THEN 1 ELSE 0 END) as missed_calls,
                SUM(
                    CASE
                        WHEN type = 'Inbound'
                            AND status IN ('NO ANSWER', 'NOANSWER')
                            AND "finishStatus" = 'noAnswer'
                            AND NOT EXISTS (
                                SELECT 1 FROM cdrs c2
                                WHERE c2."orgId" = cdrs."orgId"
                                    AND c2."customerId" = cdrs."customerId"
                                    AND c2.type = 'Outbound'
                                    AND c2."createdAt" > cdrs."createdAt"
                            )
                        THEN 1
                        ELSE 0
                    END
                ) as not_redialed
            FROM cdrs
            WHERE "orgId" = :org_id
            {time_filter}
        """)

        result = db.execute(query, params).first()

        return {
            "total_calls": result[0] or 0,
            "answered_calls": result[1] or 0,
            "missed_calls": result[2] or 0,
            "not_redialed": result[3] or 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calls-active")
def get_active_calls(orgId: int, db: Session = Depends(get_db)):
    """
    Получение активных звонков (за последние 15 минут, не завершенные)
    Grafana SQL: calls.createdAt >= NOW() - interval '15 minutes' AND calls.finishedAt IS NULL
    """
    try:
        from datetime import datetime, timedelta

        fifteen_min_ago = datetime.utcnow() - timedelta(minutes=15)

        active_calls = db.query(
            models.Call,
            models.Customer.phone
        ).join(
            models.Customer,
            models.Call.customerId == models.Customer.id
        ).filter(
            models.Call.orgId == orgId,
            models.Call.createdAt >= fifteen_min_ago,
            models.Call.finishedAt == None
        ).order_by(models.Call.createdAt.desc()).all()

        result = []
        for call, phone in active_calls:
            result.append({
                "id": call.callId,
                "number": phone,
                "status": call.status,
                "datetime": call.createdAt.isoformat()
            })

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/statistics/by-date")
def get_statistics_by_date(
    orgId: int,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    """Статистика по датам для организации"""
    try:
        query = db.query(models.CDR).filter(models.CDR.orgId == orgId)

        if start_date:
            query = query.filter(models.CDR.timeStart >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(models.CDR.timeStart <= datetime.fromisoformat(end_date))

        calls = query.all()

        return {
            "total_calls": len(calls),
            "start_date": start_date,
            "end_date": end_date
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ADMIN ENDPOINTS - Управление организациями
# ============================================

@app.get("/api/admin/organizations")
def admin_get_all_organizations(db: Session = Depends(get_db), local_db: Session = Depends(get_local_db)):
    """Получить все организации (только для администратора)"""
    try:
        orgs = db.query(models.Org).order_by(models.Org.id).all()
        result = []
        for org in orgs:
            # Проверяем, есть ли credentials для организации (локальная БД)
            credential = local_db.query(models.OrgCredential).filter(models.OrgCredential.org_id == org.id).first()
            result.append({
                "id": org.id,
                "orgId": org.id,  # В таблице orgs id и есть orgId
                "name": org.title,
                "description": f"Telegram Chat ID: {org.chatId}",
                "credential_username": credential.username if credential else None,
                "logo_url": credential.logo_url if credential else None,
                "created_at": None,  # В таблице orgs нет этих полей
                "updated_at": None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/organizations")
def admin_create_organization(org: schemas.OrganizationCreate, db: Session = Depends(get_db), local_db: Session = Depends(get_local_db)):
    """Создать новую организацию (только для администратора)"""
    try:
        # Проверка уникальности id (в orgs id = orgId)
        existing = db.query(models.Org).filter(models.Org.id == org.orgId).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Organization with id={org.orgId} already exists")

        # Если указаны credentials, проверяем уникальность username (локальная БД)
        if org.username:
            existing_cred = local_db.query(models.OrgCredential).filter(models.OrgCredential.username == org.username).first()
            if existing_cred:
                raise HTTPException(status_code=400, detail=f"Username '{org.username}' already exists")

        new_org = models.Org(
            id=org.orgId,
            title=org.name,
            chatId=0  # По умолчанию 0, можно будет изменить позже
        )
        db.add(new_org)
        db.flush()  # Сохраняем организацию, чтобы получить ID

        # Создаем credentials если указаны username и password (локальная БД)
        if org.username and org.password:
            hashed_password = pwd_context.hash(org.password)
            new_credential = models.OrgCredential(
                org_id=new_org.id,
                username=org.username,
                password_hash=hashed_password
            )
            local_db.add(new_credential)

        db.commit()
        local_db.commit()
        db.refresh(new_org)

        return {
            "id": new_org.id,
            "orgId": new_org.id,
            "name": new_org.title,
            "description": f"Telegram Chat ID: {new_org.chatId}",
            "message": "Organization created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        local_db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/organizations/{org_id}")
def admin_update_organization(org_id: int, org: schemas.OrganizationUpdate, db: Session = Depends(get_db), local_db: Session = Depends(get_local_db)):
    """Обновить организацию (только для администратора)"""
    try:
        db_org = db.query(models.Org).filter(models.Org.id == org_id).first()
        if not db_org:
            raise HTTPException(status_code=404, detail="Organization not found")

        if org.name is not None:
            db_org.title = org.name

        # Обновляем настройки в OrgCredential (локальная БД)
        credential = local_db.query(models.OrgCredential).filter(models.OrgCredential.org_id == org_id).first()

        if org.logo_url is not None and credential:
            credential.logo_url = org.logo_url

        if org.show_callto_columns is not None and credential:
            credential.show_callto_columns = org.show_callto_columns

        # Обновляем или создаем credentials (локальная БД)
        if org.username or org.password:
            if credential:
                # Обновляем существующие credentials
                if org.username:
                    # Проверяем уникальность нового username
                    existing = local_db.query(models.OrgCredential).filter(
                        models.OrgCredential.username == org.username,
                        models.OrgCredential.org_id != org_id
                    ).first()
                    if existing:
                        raise HTTPException(status_code=400, detail=f"Username '{org.username}' already exists")
                    credential.username = org.username

                if org.password:
                    credential.password_hash = pwd_context.hash(org.password)
            else:
                # Создаем новые credentials
                if org.username and org.password:
                    # Проверяем уникальность username
                    existing = local_db.query(models.OrgCredential).filter(models.OrgCredential.username == org.username).first()
                    if existing:
                        raise HTTPException(status_code=400, detail=f"Username '{org.username}' already exists")

                    new_credential = models.OrgCredential(
                        org_id=org_id,
                        username=org.username,
                        password_hash=pwd_context.hash(org.password)
                    )
                    local_db.add(new_credential)

        db.commit()
        local_db.commit()
        db.refresh(db_org)

        return {
            "id": db_org.id,
            "orgId": db_org.id,
            "name": db_org.title,
            "description": f"Telegram Chat ID: {db_org.chatId}",
            "message": "Organization updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        local_db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/organizations/{org_id}")
def admin_delete_organization(org_id: int, db: Session = Depends(get_db)):
    """Удалить организацию (только для администратора)"""
    try:
        db_org = db.query(models.Org).filter(models.Org.id == org_id).first()
        if not db_org:
            raise HTTPException(status_code=404, detail="Organization not found")

        org_name = db_org.title
        db.delete(db_org)
        db.commit()

        return {"message": f"Organization '{org_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/upload-logo")
async def upload_logo(file: UploadFile = File(...)):
    """Загрузить логотип организации"""
    try:
        # Проверяем тип файла
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Файл должен быть изображением")

        # Генерируем уникальное имя файла
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.png'
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Сохраняем файл
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Возвращаем URL
        return {"url": f"/uploads/logos/{unique_filename}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при загрузке файла: {str(e)}")

# Phone Mappings Endpoints
@app.get("/api/phone-mappings/{org_id}")
def get_phone_mappings(org_id: int, local_db: Session = Depends(get_local_db)):
    """Получить все маппинги телефонов для организации"""
    mappings = local_db.query(models.PhoneMapping).filter(
        models.PhoneMapping.org_id == org_id
    ).order_by(models.PhoneMapping.phone_number).all()
    return mappings

@app.post("/api/phone-mappings", response_model=schemas.PhoneMapping)
def create_phone_mapping(mapping: schemas.PhoneMappingCreate, local_db: Session = Depends(get_local_db)):
    """Создать новый маппинг телефона"""
    # Проверяем существование маппинга
    existing = local_db.query(models.PhoneMapping).filter(
        models.PhoneMapping.org_id == mapping.org_id,
        models.PhoneMapping.phone_number == mapping.phone_number
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Маппинг для этого номера уже существует")

    db_mapping = models.PhoneMapping(**mapping.dict())
    local_db.add(db_mapping)
    local_db.commit()
    local_db.refresh(db_mapping)
    return db_mapping

@app.put("/api/phone-mappings/{mapping_id}", response_model=schemas.PhoneMapping)
def update_phone_mapping(mapping_id: int, mapping: schemas.PhoneMappingUpdate, local_db: Session = Depends(get_local_db)):
    """Обновить маппинг телефона"""
    db_mapping = local_db.query(models.PhoneMapping).filter(models.PhoneMapping.id == mapping_id).first()
    if not db_mapping:
        raise HTTPException(status_code=404, detail="Маппинг не найден")

    if mapping.phone_number is not None:
        db_mapping.phone_number = mapping.phone_number
    if mapping.display_name is not None:
        db_mapping.display_name = mapping.display_name
    if mapping.color is not None:
        db_mapping.color = mapping.color

    db_mapping.updated_at = datetime.utcnow()
    local_db.commit()
    local_db.refresh(db_mapping)
    return db_mapping

@app.delete("/api/phone-mappings/{mapping_id}")
def delete_phone_mapping(mapping_id: int, local_db: Session = Depends(get_local_db)):
    """Удалить маппинг телефона"""
    db_mapping = local_db.query(models.PhoneMapping).filter(models.PhoneMapping.id == mapping_id).first()
    if not db_mapping:
        raise HTTPException(status_code=404, detail="Маппинг не найден")

    local_db.delete(db_mapping)
    local_db.commit()
    return {"message": "Маппинг удален"}

@app.get("/api/admin/database/test")
def admin_test_database_connection(db: Session = Depends(get_db)):
    """Тестировать подключение к базе данных"""
    try:
        db.execute(text("SELECT 1"))

        # Получить информацию о БД
        result = db.execute(text("""
            SELECT
                current_database() as database,
                current_user as user,
                version() as version
        """))
        row = result.fetchone()

        return {
            "status": "connected",
            "database": row[0],
            "user": row[1],
            "version": row[2][:50] + "..."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

@app.get("/api/admin/database/stats")
def admin_get_database_stats(db: Session = Depends(get_db)):
    """Получить статистику базы данных"""
    try:
        stats = {}

        # Количество организаций
        stats['organizations_count'] = db.query(models.Org).count()

        # Количество звонков
        stats['calls_count'] = db.query(models.CDR).count()

        # Количество пользователей (таблица может не существовать во внешней БД)
        try:
            stats['users_count'] = db.query(models.User).count()
        except:
            db.rollback()  # Откатываем транзакцию при ошибке
            stats['users_count'] = 0

        # Последняя активность
        last_call = db.query(models.CDR).order_by(models.CDR.createdAt.desc()).first()
        stats['last_call_date'] = last_call.createdAt if last_call else None

        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/database/config")
def admin_get_database_config():
    """Получить текущие настройки подключения к БД"""
    return {
        "host": os.getenv('POSTGRES_HOST', 'localhost'),
        "port": os.getenv('POSTGRES_PORT', '5432'),
        "database": os.getenv('POSTGRES_DB', 'atc_analytics'),
        "user": os.getenv('POSTGRES_USER', 'postgres'),
        "password_set": bool(os.getenv('POSTGRES_PASSWORD'))
    }

@app.post("/api/admin/database/config")
def admin_update_database_config(config: dict):
    """Обновить настройки подключения к БД"""
    try:
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')

        # Читаем текущий .env файл
        env_vars = {}
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key] = value

        # Обновляем значения
        if 'host' in config:
            env_vars['POSTGRES_HOST'] = config['host']
        if 'port' in config:
            env_vars['POSTGRES_PORT'] = str(config['port'])
        if 'database' in config:
            env_vars['POSTGRES_DB'] = config['database']
        if 'user' in config:
            env_vars['POSTGRES_USER'] = config['user']
        if 'password' in config and config['password']:
            env_vars['POSTGRES_PASSWORD'] = config['password']

        # Сохраняем обратно в .env
        with open(env_path, 'w') as f:
            f.write("# PostgreSQL Configuration\n")
            f.write("# Для подключения к внешней базе данных укажите параметры вашего сервера\n")
            f.write(f"POSTGRES_HOST={env_vars.get('POSTGRES_HOST', 'localhost')}\n")
            f.write(f"POSTGRES_PORT={env_vars.get('POSTGRES_PORT', '5432')}\n")
            f.write(f"POSTGRES_USER={env_vars.get('POSTGRES_USER', 'postgres')}\n")
            f.write(f"POSTGRES_PASSWORD={env_vars.get('POSTGRES_PASSWORD', 'password')}\n")
            f.write(f"POSTGRES_DB={env_vars.get('POSTGRES_DB', 'atc_analytics')}\n")
            f.write("\n# Application Configuration\n")
            f.write(f"SECRET_KEY={env_vars.get('SECRET_KEY', 'your_secret_key_change_in_production')}\n")
            f.write(f"DEBUG={env_vars.get('DEBUG', 'True')}\n")

        return {
            "message": "Настройки сохранены. Для применения изменений перезапустите backend контейнер.",
            "restart_required": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения настроек: {str(e)}")

@app.post("/api/admin/database/test-connection")
def admin_test_custom_connection(config: dict):
    """Проверить подключение с заданными параметрами БД"""
    import psycopg2

    try:
        conn = psycopg2.connect(
            host=config.get('host', 'localhost'),
            port=config.get('port', 5432),
            user=config.get('user', 'postgres'),
            password=config.get('password', ''),
            database=config.get('database', 'atc_analytics'),
            connect_timeout=5
        )

        cursor = conn.cursor()
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        cursor.close()
        conn.close()

        return {
            "status": "success",
            "message": "Подключение успешно!",
            "version": version[:100]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Ошибка подключения: {str(e)}"
        }

# ============================================
# DASHBOARD LAYOUT ENDPOINTS
# Подход как в Grafana - layout на уровне организации
# ============================================

@app.get("/api/dashboard-layout/{org_id}")
def get_dashboard_layout(org_id: int, local_db: Session = Depends(get_local_db)):
    """
    Получить dashboard layout для организации
    Если layout не найден, возвращает null
    """
    try:
        layout = local_db.query(models.DashboardLayout).filter(
            models.DashboardLayout.org_id == org_id
        ).first()

        if not layout:
            return {
                "org_id": org_id,
                "layout_data": None,
                "message": "Layout not found for this organization"
            }

        return {
            "id": layout.id,
            "org_id": layout.org_id,
            "layout_data": layout.layout_data,
            "created_at": layout.created_at,
            "updated_at": layout.updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/dashboard-layout")
def create_or_update_dashboard_layout(
    layout_input: schemas.DashboardLayoutCreate,
    db: Session = Depends(get_db),
    local_db: Session = Depends(get_local_db)
):
    """
    Создать или обновить dashboard layout для организации
    Если layout уже существует - обновляет его, если нет - создает новый
    """
    try:
        # Проверяем, существует ли организация (удалённая БД)
        org = db.query(models.Org).filter(models.Org.id == layout_input.org_id).first()
        if not org:
            raise HTTPException(status_code=404, detail=f"Organization with id={layout_input.org_id} not found")

        # Ищем существующий layout (локальная БД)
        existing_layout = local_db.query(models.DashboardLayout).filter(
            models.DashboardLayout.org_id == layout_input.org_id
        ).first()

        if existing_layout:
            # Обновляем существующий
            existing_layout.layout_data = layout_input.layout_data
            existing_layout.updated_at = datetime.utcnow()
            local_db.commit()
            local_db.refresh(existing_layout)

            return {
                "id": existing_layout.id,
                "org_id": existing_layout.org_id,
                "layout_data": existing_layout.layout_data,
                "created_at": existing_layout.created_at,
                "updated_at": existing_layout.updated_at,
                "message": "Dashboard layout updated successfully"
            }
        else:
            # Создаем новый
            new_layout = models.DashboardLayout(
                org_id=layout_input.org_id,
                layout_data=layout_input.layout_data
            )
            local_db.add(new_layout)
            local_db.commit()
            local_db.refresh(new_layout)

            return {
                "id": new_layout.id,
                "org_id": new_layout.org_id,
                "layout_data": new_layout.layout_data,
                "created_at": new_layout.created_at,
                "updated_at": new_layout.updated_at,
                "message": "Dashboard layout created successfully"
            }
    except HTTPException:
        raise
    except Exception as e:
        local_db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/dashboard-layout/{org_id}")
def delete_dashboard_layout(org_id: int, local_db: Session = Depends(get_local_db)):
    """
    Удалить dashboard layout для организации
    После удаления dashboard вернется к дефолтному layout
    """
    try:
        layout = local_db.query(models.DashboardLayout).filter(
            models.DashboardLayout.org_id == org_id
        ).first()

        if not layout:
            raise HTTPException(status_code=404, detail=f"Layout for organization {org_id} not found")

        local_db.delete(layout)
        local_db.commit()

        return {
            "message": f"Dashboard layout for organization {org_id} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        local_db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/organizations/{org_id}/columns")
def get_organization_columns(org_id: int, local_db: Session = Depends(get_local_db)):
    """
    Получение конфигурации колонок таблицы звонков для организации
    """
    try:
        columns = local_db.query(models.OrganizationColumn).filter(
            models.OrganizationColumn.org_id == org_id,
            models.OrganizationColumn.is_visible == True
        ).order_by(models.OrganizationColumn.column_order).all()

        return [
            {
                "key": col.column_key,
                "label": col.column_label,
                "order": col.column_order,
                "type": col.column_type,
                "sourceField": col.source_field,
                "isCustom": col.is_custom,
                "width": col.width
            }
            for col in columns
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/organizations/{org_id}/columns")
def create_organization_column(org_id: int, column_data: dict, local_db: Session = Depends(get_local_db)):
    """
    Создание новой колонки для организации
    """
    try:
        new_column = models.OrganizationColumn(
            org_id=org_id,
            column_key=column_data.get('key'),
            column_label=column_data.get('label'),
            column_order=column_data.get('order', 999),
            column_type=column_data.get('type', 'text'),
            source_field=column_data.get('sourceField'),
            is_custom=column_data.get('isCustom', True),
            is_visible=column_data.get('isVisible', True),
            width=column_data.get('width')
        )
        local_db.add(new_column)
        local_db.commit()
        local_db.refresh(new_column)

        return {
            "message": "Column created successfully",
            "column": {
                "id": new_column.id,
                "key": new_column.column_key,
                "label": new_column.column_label
            }
        }
    except Exception as e:
        local_db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/organizations/{org_id}/columns/{column_id}")
def update_organization_column(org_id: int, column_id: int, column_data: dict, local_db: Session = Depends(get_local_db)):
    """
    Обновление конфигурации колонки
    """
    try:
        column = local_db.query(models.OrganizationColumn).filter(
            models.OrganizationColumn.id == column_id,
            models.OrganizationColumn.org_id == org_id
        ).first()

        if not column:
            raise HTTPException(status_code=404, detail="Column not found")

        if 'label' in column_data:
            column.column_label = column_data['label']
        if 'order' in column_data:
            column.column_order = column_data['order']
        if 'isVisible' in column_data:
            column.is_visible = column_data['isVisible']
        if 'width' in column_data:
            column.width = column_data['width']

        local_db.commit()

        return {"message": "Column updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        local_db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# АНАЛИЗ ЗВОНКОВ (Whisper + Quality Analysis)
# ============================================


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
