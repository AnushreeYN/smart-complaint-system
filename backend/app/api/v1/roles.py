from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.models.models import Role, User, UserRole
from app.schemas.schemas import PermissionCatalogItem, RoleCreate, RoleOut
from app.api.deps import get_current_active_user, PermissionChecker
from app.core.permissions import AVAILABLE_PERMISSIONS, has_permission, invalid_permissions

router = APIRouter()


@router.get("/permissions", response_model=List[PermissionCatalogItem])
async def list_permissions(
    current_user: User = Depends(get_current_active_user),
):
    if not (
        has_permission(current_user, "roles:manage")
        or has_permission(current_user, "users:manage")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return AVAILABLE_PERMISSIONS


@router.post("", response_model=RoleOut)
async def create_role(
    role_in: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("roles:manage"))
):
    target_organization_id = current_user.organization_id
    if current_user.role == UserRole.SUPER_ADMIN.value:
        target_organization_id = role_in.organization_id
    if not target_organization_id:
        raise HTTPException(status_code=400, detail="Organization-scoped roles require an organization")

    invalid = invalid_permissions(role_in.permissions)
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid permissions selected: {', '.join(invalid)}",
        )

    existing_role = await db.execute(
        select(Role).where(
            Role.organization_id == target_organization_id,
            Role.name == role_in.name,
        )
    )
    if existing_role.scalars().first():
        raise HTTPException(status_code=400, detail="A role with this name already exists in your organization")

    db_obj = Role(
        name=role_in.name,
        permissions=role_in.permissions,
        organization_id=target_organization_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("", response_model=List[RoleOut])
async def list_roles(
    organization_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not (
        has_permission(current_user, "roles:manage")
        or has_permission(current_user, "users:manage")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )

    target_organization_id = current_user.organization_id
    if current_user.role == UserRole.SUPER_ADMIN.value:
        target_organization_id = organization_id
    if not target_organization_id:
        return []

    result = await db.execute(
        select(Role)
        .where(Role.organization_id == target_organization_id)
        .order_by(Role.created_at.desc())
    )
    return result.scalars().all()

@router.delete("/{role_id}")
async def delete_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("roles:manage"))
):
    where_clauses = [Role.id == role_id]
    if current_user.role != UserRole.SUPER_ADMIN.value:
        if not current_user.organization_id:
            raise HTTPException(status_code=400, detail="Organization-scoped roles require an organization")
        where_clauses.append(Role.organization_id == current_user.organization_id)

    result = await db.execute(select(Role).where(*where_clauses))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Role not found")

    assigned_user = await db.execute(
        select(User).where(User.role_id == db_obj.id).limit(1)
    )
    if assigned_user.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="This role is assigned to one or more users and cannot be deleted",
        )
    
    await db.delete(db_obj)
    await db.commit()
    return {"status": "deleted"}
