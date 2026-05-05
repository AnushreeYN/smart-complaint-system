from celery import Celery
from app.core.config import settings
import asyncio
from sqlalchemy import select, update
from datetime import datetime, timedelta
from app.db.session import SessionLocal
from app.models.models import Complaint, ComplaintPriority, ComplaintStatus

celery_app = Celery("worker", broker=settings.CELERY_BROKER_URL)
celery_app.conf.result_backend = settings.CELERY_RESULT_BACKEND

@celery_app.task
def check_and_escalate_complaints():
    """
    Background task to escalate complaints if they haven't been resolved within 24 hours.
    """
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.ensure_future(escalate_logic())
    else:
        loop.run_until_complete(escalate_logic())

async def escalate_logic():
    async with SessionLocal() as db:
        threshold = datetime.utcnow() - timedelta(hours=24)
        
        # Select complaints that are PENDING or IN_PROGRESS and haven't been updated for 24h
        stmt = select(Complaint).where(
            Complaint.status.in_([ComplaintStatus.PENDING, ComplaintStatus.IN_PROGRESS]),
            Complaint.updated_at <= threshold,
            Complaint.priority != ComplaintPriority.CRITICAL
        )
        result = await db.execute(stmt)
        complaints = result.scalars().all()
        
        for complaint in complaints:
            if complaint.priority == ComplaintPriority.LOW:
                complaint.priority = ComplaintPriority.MEDIUM
            elif complaint.priority == ComplaintPriority.MEDIUM:
                complaint.priority = ComplaintPriority.HIGH
            elif complaint.priority == ComplaintPriority.HIGH:
                complaint.priority = ComplaintPriority.CRITICAL
            
            complaint.updated_at = datetime.utcnow()
            db.add(complaint)
            
        await db.commit()

# Schedule the task (using celery beat)
celery_app.conf.beat_schedule = {
    "check-escalations-every-hour": {
        "task": "app.worker.tasks.check_and_escalate_complaints",
        "schedule": 3600.0,
    },
}
