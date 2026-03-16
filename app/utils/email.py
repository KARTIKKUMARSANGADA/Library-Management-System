import smtplib
from email.mime.text import MIMEText
from app.config import settings


def send_otp_email(to_email: str, otp: str):
    subject = "Your OTP Code"
    body = f"Your OTP is: {otp}"

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email

    server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
    server.starttls()
    server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
    server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
    server.quit()