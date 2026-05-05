from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import PermissionChecker, get_current_active_user
from app.api.serializers import serialize_organization
from app.db.session import get_db
from app.models.models import Complaint, Organization, Role, User, UserRole
from app.schemas.schemas import OrganizationCreate, OrganizationOut, OrganizationUpdate
from app.core.security import get_password_hash

router = APIRouter()


async def get_organization_by_id(db: AsyncSession, organization_id: UUID) -> Organization | None:
    result = await db.execute(
        select(Organization)
        .options(
            selectinload(Organization.users),
            selectinload(Organization.complaints),
            selectinload(Organization.roles),
        )
        .where(Organization.id == organization_id)
    )
    return result.scalars().first()


@router.get("/", response_model=list[OrganizationOut])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("organizations:manage")),
):
    result = await db.execute(
        select(Organization)
        .options(
            selectinload(Organization.users),
            selectinload(Organization.complaints),
        )
        .order_by(Organization.created_at.desc())
    )
    return [serialize_organization(organization) for organization in result.scalars().all()]


@router.post("/", response_model=OrganizationOut)
async def create_organization(
    organization_in: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("organizations:manage")),
):
    existing_org = await db.execute(select(Organization).where(Organization.name == organization_in.name))
    if existing_org.scalars().first():
        raise HTTPException(status_code=400, detail="An organization with this name already exists")

    existing_user = await db.execute(select(User).where(User.email == organization_in.admin_email))
    if existing_user.scalars().first():
        raise HTTPException(status_code=400, detail="The admin email is already used by another account")

    organization = Organization(name=organization_in.name, logo_url=organization_in.logo_url)
    db.add(organization)
    await db.flush()

    admin_user = User(
        email=organization_in.admin_email,
        hashed_password=get_password_hash(organization_in.admin_password),
        full_name=organization_in.admin_full_name,
        role=UserRole.ADMIN.value,
        organization_id=organization.id,
    )
    db.add(admin_user)
    await db.commit()

    organization = await get_organization_by_id(db, organization.id)
    return serialize_organization(organization)


@router.get("/me", response_model=OrganizationOut)
async def get_my_organization(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="No organization is assigned to this account")

    organization = await get_organization_by_id(db, current_user.organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    return serialize_organization(organization)


@router.put("/me", response_model=OrganizationOut)
async def update_my_organization(
    organization_in: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("organization:update")),
):
    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="No organization is assigned to this account")

    organization = await get_organization_by_id(db, current_user.organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = organization_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != organization.name:
        name_check = await db.execute(select(Organization).where(Organization.name == update_data["name"]))
        existing = name_check.scalars().first()
        if existing and existing.id != organization.id:
            raise HTTPException(status_code=400, detail="An organization with this name already exists")

    for field, value in update_data.items():
        setattr(organization, field, value)

    db.add(organization)
    await db.commit()
    organization = await get_organization_by_id(db, organization.id)
    return serialize_organization(organization)


@router.put("/{organization_id}", response_model=OrganizationOut)
async def update_organization(
    organization_id: UUID,
    organization_in: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("organizations:manage")),
):
    organization = await get_organization_by_id(db, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = organization_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != organization.name:
        name_check = await db.execute(select(Organization).where(Organization.name == update_data["name"]))
        existing = name_check.scalars().first()
        if existing and existing.id != organization.id:
            raise HTTPException(status_code=400, detail="An organization with this name already exists")

    for field, value in update_data.items():
        setattr(organization, field, value)

    db.add(organization)
    await db.commit()
    organization = await get_organization_by_id(db, organization.id)
    return serialize_organization(organization)


@router.delete("/{organization_id}")
async def delete_organization(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("organizations:manage")),
):
    organization = await get_organization_by_id(db, organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    for complaint in list(organization.complaints):
        await db.delete(complaint)
    for user in list(organization.users):
        await db.delete(user)
    for role in list(organization.roles):
        await db.delete(role)
    await db.delete(organization)
    await db.commit()
    return {"status": "deleted"}
