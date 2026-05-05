import json

from app.core.permissions import get_user_permissions
from app.models.models import Complaint, Organization, User


def serialize_organization(organization: Organization) -> dict:
    users = list(getattr(organization, "users", []) or [])
    complaints = list(getattr(organization, "complaints", []) or [])
    admin_user = next((user for user in users if user.role == "admin"), None)

    return {
        "id": organization.id,
        "name": organization.name,
        "logo_url": organization.logo_url,
        "created_at": organization.created_at,
        "user_count": len(users),
        "complaint_count": len(complaints),
        "admin_name": admin_user.full_name if admin_user else None,
        "admin_email": admin_user.email if admin_user else None,
    }


def serialize_user(user: User) -> dict:
    custom_role = getattr(user, "custom_role", None)
    organization = getattr(user, "organization", None)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "role": user.role,
        "role_id": user.role_id,
        "organization_id": user.organization_id,
        "organization_name": organization.name if organization else None,
        "organization_logo_url": organization.logo_url if organization else None,
        "custom_role_name": custom_role.name if custom_role else None,
        "profile_photo": user.profile_photo,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "permissions": get_user_permissions(user),
    }


def serialize_complaint(complaint: Complaint) -> dict:
    owner = getattr(complaint, "owner", None)
    assigned_staff = getattr(complaint, "assigned_staff", None)
    organization = getattr(complaint, "organization", None)

    def parse_json_list(raw_value):
        if not raw_value:
            return []
        try:
            value = json.loads(raw_value)
            return value if isinstance(value, list) else []
        except (TypeError, json.JSONDecodeError):
            return []

    return {
        "id": complaint.id,
        "title": complaint.title,
        "description": complaint.description,
        "status": complaint.status,
        "priority": complaint.priority,
        "user_id": complaint.user_id,
        "assigned_to": complaint.assigned_to,
        "organization_id": complaint.organization_id,
        "organization_name": organization.name if organization else None,
        "created_at": complaint.created_at,
        "updated_at": complaint.updated_at,
        "reporter_name": owner.full_name if owner and owner.full_name else owner.email if owner else None,
        "assigned_staff_name": assigned_staff.full_name if assigned_staff and assigned_staff.full_name else assigned_staff.email if assigned_staff else None,
        "photo_urls": parse_json_list(complaint.photo_urls),
        "video_urls": parse_json_list(complaint.video_urls),
        "audio_url": complaint.audio_url,
        "voice_transcript": complaint.voice_transcript,
        "ai_summary": complaint.ai_summary,
        "ai_category": complaint.ai_category,
        "ai_risk_score": complaint.ai_risk_score,
        "ai_recommendation": complaint.ai_recommendation,
    }
