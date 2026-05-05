from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.models.models import User, Role
from app.schemas.schemas import UserOut, UserUpdate, UserCreate
from app.api.serializers import serialize_user
from app.api.deps import get_current_active_user, PermissionChecker
from app.core.permissions import has_permission
from app.core.security import get_password_hash

router = APIRouter()


async def get_role_for_organization(db: AsyncSession, organization_id: UUID, role_id: UUID | None):
    if not role_id:
        return None

    result = await db.execute(
        select(Role).where(Role.id == role_id, Role.organization_id == organization_id)
    )
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=400, detail="Selected custom role is invalid for this organization")
    return role

@router.post("/", response_model=UserOut)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("users:manage"))
):
    existing_user = await db.execute(select(User).where(User.email == user_in.email))
    if existing_user.scalars().first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    target_organization_id = current_user.organization_id
    if current_user.role == "super_admin":
        target_organization_id = user_in.organization_id
    if not target_organization_id:
        raise HTTPException(status_code=400, detail="Target organization is required")

    custom_role = await get_role_for_organization(db, target_organization_id, user_in.role_id)
    db_obj = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        role=user_in.role,
        role_id=custom_role.id if custom_role else None,
        organization_id=target_organization_id
    )
    db.add(db_obj)
    await db.commit()
    result = await db.execute(
        select(User)
        .options(selectinload(User.custom_role), selectinload(User.organization))
        .where(User.id == db_obj.id)
    )
    return serialize_user(result.scalars().first())

@router.get("/", response_model=List[UserOut])
async def list_users(
    organization_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not (
        has_permission(current_user, "users:manage")
        or has_permission(current_user, "complaints:assign")
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions to view organization users")

    query = (
        select(User)
        .options(selectinload(User.custom_role), selectinload(User.organization))
        .order_by(User.created_at.desc())
    )
    if current_user.role == "super_admin":
        if organization_id:
            query = query.where(User.organization_id == organization_id)
    else:
        query = query.where(User.organization_id == current_user.organization_id)

    result = await db.execute(query)
    return [serialize_user(user) for user in result.scalars().all()]

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return serialize_user(current_user)

@router.put("/me", response_model=UserOut)
async def update_me(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    update_data = user_in.model_dump(exclude_unset=True)
    for restricted_field in ("email", "role", "role_id", "organization_id"):
        update_data.pop(restricted_field, None)
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]
    
    for field in update_data:
        setattr(current_user, field, update_data[field])
    
    db.add(current_user)
    await db.commit()
    result = await db.execute(
        select(User)
        .options(selectinload(User.custom_role), selectinload(User.organization))
        .where(User.id == current_user.id)
    )
    return serialize_user(result.scalars().first())

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("users:manage"))
):
    where_clauses = [User.id == user_id]
    if current_user.role != "super_admin":
        where_clauses.append(User.organization_id == current_user.organization_id)

    result = await db.execute(
        select(User)
        .options(selectinload(User.custom_role), selectinload(User.organization))
        .where(*where_clauses)
    )
    db_user = result.scalars().first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)
    update_data.pop("organization_id", None)

    if "email" in update_data and update_data["email"] != db_user.email:
        email_check = await db.execute(select(User).where(User.email == update_data["email"]))
        if email_check.scalars().first():
            raise HTTPException(status_code=400, detail="A user with this email already exists")

    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]

    if "role_id" in update_data:
        custom_role = await get_role_for_organization(
            db, db_user.organization_id, update_data["role_id"]
        )
        update_data["role_id"] = custom_role.id if custom_role else None

    for field in update_data:
        setattr(db_user, field, update_data[field])
    
    db.add(db_user)
    await db.commit()
    result = await db.execute(
        select(User)
        .options(selectinload(User.custom_role), selectinload(User.organization))
        .where(User.id == db_user.id)
    )
    return serialize_user(result.scalars().first())

@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("users:manage"))
):
    where_clauses = [User.id == user_id]
    if current_user.role != "super_admin":
        where_clauses.append(User.organization_id == current_user.organization_id)

    result = await db.execute(select(User).where(*where_clauses))
    db_user = result.scalars().first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    if db_user.role == "super_admin" and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only a super admin can manage another super admin")
        
    await db.delete(db_user)
    await db.commit()
    return {"status": "deleted"}
