from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.models import UserRole, ComplaintStatus, ComplaintPriority

# Organization Schemas
class OrganizationBase(BaseModel):
    name: str
    logo_url: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    admin_email: EmailStr
    admin_full_name: str
    admin_password: str


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None

class OrganizationOut(OrganizationBase):
    id: UUID
    created_at: datetime
    user_count: int = 0
    complaint_count: int = 0
    admin_name: Optional[str] = None
    admin_email: Optional[EmailStr] = None

    class Config:
        from_attributes = True

# Role Schemas
class RoleBase(BaseModel):
    name: str
    permissions: Optional[str] = None

class RoleCreate(RoleBase):
    organization_id: Optional[UUID] = None

class RoleOut(RoleBase):
    id: UUID
    organization_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: str = "user"
    role_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    profile_photo: Optional[str] = None

class UserCreate(UserBase):
    password: str
    organization_name: Optional[str] = None # For registration

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserOut(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    organization_name: Optional[str] = None
    organization_logo_url: Optional[str] = None
    custom_role_name: Optional[str] = None
    permissions: List[str] = []

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# Complaint Schemas
class ComplaintBase(BaseModel):
    title: str
    description: str
    priority: ComplaintPriority = ComplaintPriority.MEDIUM
    photo_urls: List[str] = []
    video_urls: List[str] = []
    audio_url: Optional[str] = None
    voice_transcript: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ComplaintStatus] = None
    priority: Optional[ComplaintPriority] = None
    assigned_to: Optional[UUID] = None
    photo_urls: Optional[List[str]] = None
    video_urls: Optional[List[str]] = None
    audio_url: Optional[str] = None
    voice_transcript: Optional[str] = None

class ComplaintOut(ComplaintBase):
    id: UUID
    status: ComplaintStatus
    user_id: UUID
    assigned_to: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    organization_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    reporter_name: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    photo_urls: List[str] = []
    video_urls: List[str] = []
    audio_url: Optional[str] = None
    voice_transcript: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_category: Optional[str] = None
    ai_risk_score: Optional[str] = None
    ai_recommendation: Optional[str] = None

    class Config:
        from_attributes = True


class PermissionCatalogItem(BaseModel):
    id: str
    label: str
    description: str


class VoiceAnalysisIn(BaseModel):
    transcript: str


class AIReportOut(BaseModel):
    summary: str
    category: str
    risk_score: int
    risk_level: str
    recommended_priority: ComplaintPriority
    recommended_actions: List[str]
    live_monitoring: List[str]
    evidence_review: List[str]
