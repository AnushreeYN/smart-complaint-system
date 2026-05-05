from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, select
from app.api.v1 import auth, complaints, users, roles, organizations
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.models import User, UserRole
from app.websocket.manager import manager
from app.api.deps import get_user_from_token
from app.db.session import engine, Base, SessionLocal
import asyncio

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(complaints.router, prefix=f"{settings.API_V1_STR}/complaints", tags=["complaints"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(roles.router, prefix=f"{settings.API_V1_STR}/roles", tags=["roles"])
app.include_router(organizations.router, prefix=f"{settings.API_V1_STR}/organizations", tags=["organizations"])


def run_startup_schema_fixes(sync_conn):
    inspector = inspect(sync_conn)
    if "organizations" not in inspector.get_table_names():
        return

    organization_columns = {
        column["name"] for column in inspector.get_columns("organizations")
    }
    if "logo_url" not in organization_columns:
        sync_conn.exec_driver_sql(
            "ALTER TABLE organizations ADD COLUMN logo_url VARCHAR"
        )

    if "users" in inspector.get_table_names():
        user_columns = {
            column["name"] for column in inspector.get_columns("users")
        }
        if "phone_number" not in user_columns:
            sync_conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN phone_number VARCHAR"
            )

    if "complaints" in inspector.get_table_names():
        complaint_columns = {
            column["name"] for column in inspector.get_columns("complaints")
        }
        complaint_schema_fixes = {
            "photo_urls": "TEXT",
            "video_urls": "TEXT",
            "audio_url": "TEXT",
            "voice_transcript": "TEXT",
            "ai_summary": "TEXT",
            "ai_category": "VARCHAR",
            "ai_risk_score": "VARCHAR",
            "ai_recommendation": "TEXT",
        }
        for column_name, column_type in complaint_schema_fixes.items():
            if column_name not in complaint_columns:
                sync_conn.exec_driver_sql(
                    f"ALTER TABLE complaints ADD COLUMN {column_name} {column_type}"
                )


async def ensure_super_admin_exists():
    async with SessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == settings.SUPER_ADMIN_EMAIL)
        )
        user = result.scalars().first()
        if user:
            user.role = UserRole.SUPER_ADMIN.value
            user.hashed_password = get_password_hash(settings.SUPER_ADMIN_PASSWORD)
            user.full_name = settings.SUPER_ADMIN_FULL_NAME
            user.organization_id = None
            user.role_id = None
            user.is_active = True
            db.add(user)
            await db.commit()
            return

        db.add(
            User(
                email=settings.SUPER_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
                full_name=settings.SUPER_ADMIN_FULL_NAME,
                role=UserRole.SUPER_ADMIN.value,
                organization_id=None,
            )
        )
        await db.commit()

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # In production, use Alembic for migrations
        # await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(run_startup_schema_fixes)
    await ensure_super_admin_exists()

@app.get("/")
async def root():
    return {"message": "Welcome to Smart Complaint Management System"}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    current_user = None
    try:
        from uuid import UUID
        u_id = UUID(user_id)
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=1008)
            return

        async with SessionLocal() as db:
            current_user = await get_user_from_token(token, db)

        if current_user.id != u_id:
            await websocket.close(code=1008)
            return

        await manager.connect(current_user.id, current_user.organization_id, websocket)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if current_user:
            manager.disconnect(current_user.id, websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        await websocket.close()
