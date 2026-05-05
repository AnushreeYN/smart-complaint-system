import aiosmtplib
from email.message import EmailMessage
from app.core.config import settings

async def send_email_notification(recipient: str, subject: str, body: str):
    if not settings.SMTP_USER:
        print(f"SMTP not configured. Skipping email to {recipient}")
        return

    message = EmailMessage()
    message["From"] = settings.EMAILS_FROM_EMAIL
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=settings.SMTP_TLS,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
    except Exception as e:
        print(f"Failed to send email: {e}")
