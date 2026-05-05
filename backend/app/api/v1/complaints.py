from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID
import json
from dataclasses import asdict

from app.ai.reporting import analyze_case, analyze_voice_transcript
from app.db.session import get_db
from app.models.models import Complaint, User, UserRole
from app.api.serializers import serialize_complaint
from app.schemas.schemas import AIReportOut, ComplaintCreate, ComplaintOut, ComplaintUpdate, VoiceAnalysisIn
from app.api.deps import get_current_active_user, PermissionChecker
from app.core.permissions import has_permission
from app.websocket.manager import manager

router = APIRouter()


CASE_WORK_FIELDS = {"title", "description", "priority", "status", "photo_urls", "video_urls", "audio_url", "voice_transcript"}


def normalize_media_payload(data: dict) -> dict:
    normalized = dict(data)
    for field in ("photo_urls", "video_urls"):
        if field in normalized and isinstance(normalized[field], list):
            normalized[field] = json.dumps(normalized[field])
    return normalized


def apply_ai_analysis(complaint: Complaint) -> None:
    photo_urls = json.loads(complaint.photo_urls or "[]")
    video_urls = json.loads(complaint.video_urls or "[]")
    report = analyze_case(
        complaint.title,
        complaint.description,
        complaint.priority.value if hasattr(complaint.priority, "value") else str(complaint.priority),
        voice_transcript=complaint.voice_transcript,
        photo_count=len(photo_urls),
        video_count=len(video_urls),
        has_audio=bool(complaint.audio_url),
    )
    complaint.ai_summary = report.summary
    complaint.ai_category = report.category
    complaint.ai_risk_score = str(report.risk_score)
    complaint.ai_recommendation = "\n".join(report.recommended_actions)

@router.post("/", response_model=ComplaintOut)
async def create_complaint(
    complaint_in: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("complaints:create"))
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="Complaints must belong to an organization")

    db_obj = Complaint(
        **normalize_media_payload(complaint_in.model_dump()),
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    apply_ai_analysis(db_obj)
    db.add(db_obj)
    await db.commit()
    result = await db.execute(
        select(Complaint)
        .options(selectinload(Complaint.owner), selectinload(Complaint.assigned_staff))
        .where(Complaint.id == db_obj.id)
    )
    complaint = result.scalars().first()

    await manager.broadcast_to_organization(
        current_user.organization_id,
        f"NEW_CASE|{complaint.id}|{complaint.title}|{current_user.full_name or current_user.email}",
    )

    return serialize_complaint(complaint)

@router.get("/", response_model=List[ComplaintOut])
async def list_complaints(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("complaints:read"))
):
    query = select(Complaint).options(
        selectinload(Complaint.owner),
        selectinload(Complaint.assigned_staff),
        selectinload(Complaint.organization),
    )
    
    if status:
        query = query.where(Complaint.status == status)

    if current_user.role == UserRole.SUPER_ADMIN:
        pass
    elif current_user.role == UserRole.ADMIN:
        # Admins see all in their org
        query = query.where(Complaint.organization_id == current_user.organization_id)
    elif current_user.role == UserRole.STAFF:
        # Staff see assigned tasks, unassigned work they can claim, or their own complaints.
        query = query.where(
            Complaint.organization_id == current_user.organization_id,
            (
                (Complaint.assigned_to == current_user.id)
                | (Complaint.assigned_to == None)
                | (Complaint.user_id == current_user.id)
            )
        )
    else:
        # Regular users only see their own
        query = query.where(
            Complaint.organization_id == current_user.organization_id,
            Complaint.user_id == current_user.id,
        )
    
    result = await db.execute(query.order_by(Complaint.updated_at.desc()))
    return [serialize_complaint(complaint) for complaint in result.scalars().all()]

@router.put("/{complaint_id}", response_model=ComplaintOut)
async def update_complaint(
    complaint_id: UUID,
    complaint_in: ComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("complaints:update"))
):
    where_clauses = [Complaint.id == complaint_id]
    if current_user.role != UserRole.SUPER_ADMIN:
        where_clauses.append(Complaint.organization_id == current_user.organization_id)

    result = await db.execute(
        select(Complaint)
        .options(
            selectinload(Complaint.owner),
            selectinload(Complaint.assigned_staff),
            selectinload(Complaint.organization),
        )
        .where(*where_clauses)
    )
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Complaint not found or access denied")

    update_data = normalize_media_payload(complaint_in.model_dump(exclude_unset=True))
    requested_fields = set(update_data)
    case_work_requested = bool(requested_fields & CASE_WORK_FIELDS)
    assignment_requested = "assigned_to" in update_data
    is_admin_actor = current_user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
    is_assignee = db_obj.assigned_to == current_user.id
    is_owner = db_obj.user_id == current_user.id
    assigns_to_self = assignment_requested and update_data["assigned_to"] == current_user.id
    will_be_assignee = is_assignee or (assigns_to_self and not db_obj.assigned_to)

    if assignment_requested:
        requested_assignee = update_data["assigned_to"]
        can_assign_others = has_permission(current_user, "complaints:assign")

        if not can_assign_others:
            if current_user.role != UserRole.STAFF:
                raise HTTPException(status_code=403, detail="Only responders can self-assign cases")
            if not assigns_to_self:
                raise HTTPException(status_code=403, detail="You can only assign this case to yourself")
            if db_obj.assigned_to and db_obj.assigned_to != current_user.id:
                raise HTTPException(status_code=403, detail="This case is already assigned")
            if db_obj.organization_id != current_user.organization_id:
                raise HTTPException(status_code=403, detail="Cannot self-assign outside your organization")

    if case_work_requested:
        if db_obj.assigned_to:
            if not is_assignee:
                raise HTTPException(
                    status_code=403,
                    detail="Only the assigned responder can update this case",
                )
        elif not (is_admin_actor or is_owner or will_be_assignee):
            raise HTTPException(
                status_code=403,
                detail="Assign this case to yourself before updating it",
            )

    if update_data.get("assigned_to"):
        assignee_result = await db.execute(
            select(User).where(
                User.id == update_data["assigned_to"],
                User.organization_id == db_obj.organization_id,
            )
        )
        assignee = assignee_result.scalars().first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assigned user must belong to your organization")

    for field in update_data:
        setattr(db_obj, field, update_data[field])

    if requested_fields & CASE_WORK_FIELDS:
        apply_ai_analysis(db_obj)
    
    db.add(db_obj)
    await db.commit()
    result = await db.execute(
        select(Complaint)
        .options(
            selectinload(Complaint.owner),
            selectinload(Complaint.assigned_staff),
            selectinload(Complaint.organization),
        )
        .where(Complaint.id == db_obj.id)
    )
    complaint = result.scalars().first()

    await manager.send_personal_message(
        f"STATUS_UPDATE|{complaint.id}|{complaint.status}",
        complaint.user_id
    )

    if complaint.assigned_to:
        await manager.send_personal_message(
            f"ASSIGNMENT_UPDATE|{complaint.id}|{complaint.title}|{complaint.status}",
            complaint.assigned_to,
        )

    return serialize_complaint(complaint)


@router.get("/{complaint_id}/ai-report", response_model=AIReportOut)
async def generate_ai_report(
    complaint_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("complaints:read")),
):
    where_clauses = [Complaint.id == complaint_id]
    if current_user.role != UserRole.SUPER_ADMIN:
        where_clauses.append(Complaint.organization_id == current_user.organization_id)

    result = await db.execute(
        select(Complaint)
        .options(selectinload(Complaint.owner), selectinload(Complaint.assigned_staff), selectinload(Complaint.organization))
        .where(*where_clauses)
    )
    complaint = result.scalars().first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found or access denied")

    if current_user.role == UserRole.STAFF and complaint.assigned_to not in (None, current_user.id) and complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if current_user.role == UserRole.USER and complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    photo_urls = json.loads(complaint.photo_urls or "[]")
    video_urls = json.loads(complaint.video_urls or "[]")
    report = analyze_case(
        complaint.title,
        complaint.description,
        complaint.priority.value if hasattr(complaint.priority, "value") else str(complaint.priority),
        voice_transcript=complaint.voice_transcript,
        photo_count=len(photo_urls),
        video_count=len(video_urls),
        has_audio=bool(complaint.audio_url),
    )
    return asdict(report)


@router.post("/voice/analyze", response_model=AIReportOut)
async def analyze_voice(
    voice_in: VoiceAnalysisIn,
    current_user: User = Depends(PermissionChecker("complaints:create")),
):
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="Voice reports must belong to an organization")
    return asdict(analyze_voice_transcript(voice_in.transcript))


@router.delete("/{complaint_id}")
async def delete_complaint(
    complaint_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("complaints:delete"))
):
    where_clauses = [Complaint.id == complaint_id]
    if current_user.role != UserRole.SUPER_ADMIN:
        where_clauses.append(Complaint.organization_id == current_user.organization_id)

    result = await db.execute(select(Complaint).where(*where_clauses))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Complaint not found or access denied")

    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN) and db_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    await db.delete(db_obj)
    await db.commit()
    return {"status": "deleted"}
