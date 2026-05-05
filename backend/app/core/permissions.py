from __future__ import annotations

from typing import Iterable

from app.models.models import User, UserRole


AVAILABLE_PERMISSIONS = [
    {
        "id": "organizations:manage",
        "label": "Manage organizations",
        "description": "Create, update, and delete tenant organizations across the platform.",
    },
    {
        "id": "complaints:create",
        "label": "Create reports",
        "description": "Submit new incidents inside the organization workspace.",
    },
    {
        "id": "complaints:read",
        "label": "View complaints",
        "description": "Access complaint records allowed by the user's system role.",
    },
    {
        "id": "complaints:update",
        "label": "Update complaints",
        "description": "Change complaint status, priority, and operational fields.",
    },
    {
        "id": "complaints:delete",
        "label": "Delete complaints",
        "description": "Remove complaints when policy allows it.",
    },
    {
        "id": "complaints:assign",
        "label": "Assign responders",
        "description": "Assign or reassign incidents to staff members.",
    },
    {
        "id": "users:manage",
        "label": "Manage users",
        "description": "Create, edit, activate, and remove members in the organization.",
    },
    {
        "id": "roles:manage",
        "label": "Manage roles",
        "description": "Create and maintain custom organization roles.",
    },
    {
        "id": "organization:read",
        "label": "View organization",
        "description": "Access organization metadata and workspace-level insights.",
    },
    {
        "id": "organization:update",
        "label": "Update organization",
        "description": "Maintain branding and workspace metadata for the current organization.",
    },
]


AVAILABLE_PERMISSION_IDS = {permission["id"] for permission in AVAILABLE_PERMISSIONS}


ROLE_DEFAULT_PERMISSIONS = {
    UserRole.SUPER_ADMIN.value: AVAILABLE_PERMISSION_IDS,
    UserRole.ADMIN.value: AVAILABLE_PERMISSION_IDS - {"organizations:manage"},
    UserRole.STAFF.value: {
        "complaints:create",
        "complaints:read",
        "complaints:update",
        "organization:read",
    },
    UserRole.USER.value: {
        "complaints:create",
        "complaints:read",
        "complaints:update",
        "complaints:delete",
    },
}


def parse_permission_string(raw_permissions: str | None) -> set[str]:
    if not raw_permissions:
        return set()
    return {
        permission.strip()
        for permission in raw_permissions.split(",")
        if permission.strip()
    }


def normalize_permissions(permissions: Iterable[str]) -> list[str]:
    return sorted({permission.strip() for permission in permissions if permission.strip()})


def get_default_permissions(role: str | None) -> set[str]:
    if not role:
        return set()
    return set(ROLE_DEFAULT_PERMISSIONS.get(role, set()))


def get_user_permissions(user: User) -> list[str]:
    permissions = get_default_permissions(user.role)
    custom_role = getattr(user, "custom_role", None)
    if custom_role and custom_role.permissions:
        permissions.update(parse_permission_string(custom_role.permissions))
    return sorted(permissions)


def has_permission(user: User, permission: str) -> bool:
    return permission in get_user_permissions(user)


def invalid_permissions(raw_permissions: str | None) -> list[str]:
    invalid = parse_permission_string(raw_permissions) - AVAILABLE_PERMISSION_IDS
    return sorted(invalid)
