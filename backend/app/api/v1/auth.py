from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.models import User, Organization
from app.schemas.schemas import UserCreate, UserOut, Token
from app.api.serializers import serialize_user
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    if not settings.ALLOW_SELF_REGISTRATION:
        raise HTTPException(
            status_code=403,
            detail="Self-service registration is disabled. Ask a super admin to create your organization and admin account.",
        )

    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    if not user_in.organization_name:
        raise HTTPException(status_code=400, detail="Organization name is required")

    res = await db.execute(
        select(Organization).where(Organization.name == user_in.organization_name)
    )
    org = res.scalars().first()

    if org:
        existing_members = await db.execute(
            select(User).where(User.organization_id == org.id)
        )
        if existing_members.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="This organization already exists. Ask your administrator to add you.",
            )
    else:
        org = Organization(name=user_in.organization_name)
        db.add(org)
        await db.flush()

    db_obj = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role="admin",
        organization_id=org.id,
    )
    db.add(db_obj)
    await db.commit()
    result = await db.execute(
        select(User)
        .options(selectinload(User.custom_role), selectinload(User.organization))
        .where(User.id == db_obj.id)
    )
    return serialize_user(result.scalars().first())

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    return {
        "access_token": create_access_token(user.email, user.role),
        "token_type": "bearer",
    }
