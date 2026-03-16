from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import get_db
from app.models.user import UsersTable
from app.models.otp_token import OtpToken
from app.schemas.auth import (
    RegisterRequest,
    VerifyOtpRequest,
    ResendOtpRequest,
    LoginRequest,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.utils.security import hash_password, verify_password
from app.utils.jwt import create_access_token, create_refresh_token, create_reset_token
from app.utils.otp import generate_otp, get_otp_expiry
from app.utils.email import send_otp_email
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])

# In-memory refresh token blacklist
BLACKLISTED_REFRESH_TOKENS = set()


# =====================================================
# REGISTER
# =====================================================
@router.post("/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):

    existing = db.query(UsersTable).filter(
        UsersTable.email == data.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role and data.role != "member":
        raise HTTPException(status_code=403, detail="Only member self-registration is allowed")

    user = UsersTable(
        email=data.email,
        password_hash=hash_password(data.password),
        role="member",
        is_verified=False,
        is_active=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate OTP
    otp_code = generate_otp()

    otp = OtpToken(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=get_otp_expiry(),
        is_used=False,
    )

    db.add(otp)
    db.commit()

    # Send OTP Email
    send_otp_email(user.email, otp_code)

    return {"message": "Registered successfully. Please verify OTP."}


# =====================================================
# VERIFY OTP
# =====================================================
@router.post("/verify-otp")
def verify_otp(data: VerifyOtpRequest, db: Session = Depends(get_db)):

    user = db.query(UsersTable).filter(
        UsersTable.email == data.email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = db.query(OtpToken).filter(
        OtpToken.user_id == user.id,
        OtpToken.otp_code == data.otp,
        OtpToken.is_used == False,
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    otp.is_used = True
    user.is_verified = True

    db.commit()

    return {"message": "Account verified successfully"}


# =====================================================
# RESEND OTP
# =====================================================
@router.post("/resend-otp")
def resend_otp(data: ResendOtpRequest, db: Session = Depends(get_db)):

    user = db.query(UsersTable).filter(
        UsersTable.email == data.email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Invalidate old OTPs
    db.query(OtpToken).filter(
        OtpToken.user_id == user.id,
        OtpToken.is_used == False
    ).update({"is_used": True})

    otp_code = generate_otp()

    new_otp = OtpToken(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=get_otp_expiry(),
        is_used=False,
    )

    db.add(new_otp)
    db.commit()

    send_otp_email(user.email, otp_code)

    return {"message": "New OTP sent successfully"}


# =====================================================
# LOGIN
# =====================================================
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(UsersTable).filter(
        UsersTable.email == data.email
    ).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Account not verified")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# =====================================================
# REFRESH TOKEN
# =====================================================
@router.post("/refresh-token")
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):

    if data.refresh_token in BLACKLISTED_REFRESH_TOKENS:
        raise HTTPException(status_code=401, detail="Token blacklisted")

    try:
        payload = jwt.decode(
            data.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(UsersTable).filter(UsersTable.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    new_access = create_access_token({"sub": user_id})

    return {"access_token": new_access, "token_type": "bearer"}


# =====================================================
# LOGOUT
# =====================================================
@router.post("/logout")
def logout(data: RefreshTokenRequest):

    BLACKLISTED_REFRESH_TOKENS.add(data.refresh_token)

    return {"message": "Logged out successfully"}


# =====================================================
# FORGOT PASSWORD
# =====================================================
@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):

    user = db.query(UsersTable).filter(
        UsersTable.email == data.email
    ).first()

    if not user:
        return {"message": "If the account exists, password reset OTP was sent"}

    otp_code = generate_otp()

    otp = OtpToken(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=get_otp_expiry(),
        is_used=False,
    )

    db.add(otp)
    db.commit()

    send_otp_email(user.email, otp_code)

    return {"message": "Password reset OTP sent"}


# =====================================================
# VERIFY RESET OTP
# =====================================================
@router.post("/verify-reset-otp")
def verify_reset_otp(data: VerifyOtpRequest, db: Session = Depends(get_db)):

    user = db.query(UsersTable).filter(
        UsersTable.email == data.email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = db.query(OtpToken).filter(
        OtpToken.user_id == user.id,
        OtpToken.otp_code == data.otp,
        OtpToken.is_used == False,
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    otp.is_used = True
    db.commit()

    reset_token = create_reset_token({"sub": str(user.id)})

    return {"reset_token": reset_token}


# =====================================================
# RESET PASSWORD
# =====================================================
@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):

    try:
        payload = jwt.decode(
            data.reset_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        if payload.get("type") != "reset":
            raise HTTPException(status_code=401, detail="Invalid reset token")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid reset token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid reset token")

    user = db.query(UsersTable).filter(
        UsersTable.id == user_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(data.new_password)
    db.commit()

    return {"message": "Password reset successfully"}
