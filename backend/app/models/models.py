import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    STAFF = "staff"
    USER = "user"

class ComplaintStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class ComplaintPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    logo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="organization", cascade="all, delete-orphan")
    roles = relationship("Role", back_populates="organization", cascade="all, delete-orphan")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    permissions = Column(String, nullable=True) # Comma-separated permissions
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="roles")
    users = relationship("User", back_populates="custom_role")

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    phone_number = Column(String, nullable=True)
    role = Column(String, default="user") # Keep for simple checks
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=True)
    profile_photo = Column(String, nullable=True) # URL or Base64
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", back_populates="users")
    custom_role = relationship("Role", back_populates="users")

    complaints = relationship("Complaint", back_populates="owner", foreign_keys="Complaint.user_id")
    assigned_tasks = relationship("Complaint", back_populates="assigned_staff", foreign_keys="Complaint.assigned_to")

class Complaint(Base):
    __tablename__ = "complaints"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    photo_urls = Column(Text, nullable=True)
    video_urls = Column(Text, nullable=True)
    audio_url = Column(Text, nullable=True)
    voice_transcript = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_category = Column(String, nullable=True)
    ai_risk_score = Column(String, nullable=True)
    ai_recommendation = Column(Text, nullable=True)
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.PENDING)
    priority = Column(Enum(ComplaintPriority), default=ComplaintPriority.MEDIUM)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="complaints", foreign_keys=[user_id])
    assigned_staff = relationship("User", back_populates="assigned_tasks", foreign_keys=[assigned_to])
    organization = relationship("Organization", back_populates="complaints")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String) # "EMAIL", "WS"
    created_at = Column(DateTime, default=datetime.utcnow)
