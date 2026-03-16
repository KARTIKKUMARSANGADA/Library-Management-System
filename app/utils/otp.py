import random
from datetime import datetime, timedelta
from app.config import settings


def generate_otp():
    return str(random.randint(100000, 999999))


def get_otp_expiry():
    return datetime.utcnow() + timedelta(
        minutes=settings.OTP_EXPIRE_MINUTES
    )