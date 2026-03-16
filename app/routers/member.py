from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.models.member_profile import MemberProfile
from app.models.issue import Issue
from app.models.user import UsersTable
from app.schemas.member import CreateMemberByAdmin, UpdateMember, MemberResponse
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/members", tags=["Members"])


# ======================================
# CREATE MEMBER PROFILE (Admin Only)
# ======================================
# Borrow limit is fixed to 3 as a business rule.
@router.post("/", response_model=MemberResponse, status_code=201)
def create_member_profile(
    data: CreateMemberByAdmin,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    user = db.query(UsersTable).filter(UsersTable.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != "member":
        raise HTTPException(status_code=400, detail="Profile can be created only for member users")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Target user is not verified")

    # Ensure user is active upon profile creation
    user.is_active = True

    existing = db.query(MemberProfile).filter(
        MemberProfile.user_id == data.user_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")

    member = MemberProfile(
        user_id=data.user_id,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        address=data.address,
        borrow_limit=3,
        is_active=True,
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    return member


# ======================================
# APPROVE USER AS MEMBER (Admin Only)
# Auto-creates member profile from verified user
# ======================================
@router.post("/approve/{user_id}", response_model=MemberResponse, status_code=201)
def approve_user_as_member(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    user = db.query(UsersTable).filter(UsersTable.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != "member":
        raise HTTPException(status_code=400, detail="Only member users can be approved")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="User has not verified their email yet")

    # Ensure user is active upon approval
    user.is_active = True

    existing = db.query(MemberProfile).filter(MemberProfile.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Member profile already exists")

    # Derive name from email prefix (e.g. john.doe@... → John Doe)
    email_prefix = user.email.split("@")[0]
    parts = email_prefix.replace(".", " ").replace("_", " ").split()
    first_name = parts[0].capitalize() if len(parts) > 0 else email_prefix
    last_name = parts[1].capitalize() if len(parts) > 1 else ""

    member = MemberProfile(
        user_id=user.id,
        first_name=first_name,
        last_name=last_name,
        borrow_limit=3,
        is_active=True,
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    return member


# ======================================
# LIST ALL MEMBERS (Admin Only)
# ======================================
@router.get("/", response_model=list[MemberResponse])
def list_members(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    return (
        db.query(MemberProfile)
        .filter(MemberProfile.user_id.isnot(None))
        .offset(skip)
        .limit(limit)
        .all()
    )


# ======================================
# GET OWN PROFILE (Member)
# ======================================
@router.get("/me/profile", response_model=MemberResponse)
def get_own_profile(
    db: Session = Depends(get_db),
    current_user: UsersTable = Depends(get_current_user)
):
    member = db.query(MemberProfile).filter(
        MemberProfile.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Profile not found")

    return member


# ======================================
# GET MEMBER BY ID (Admin / Own)
# ======================================
@router.get("/{member_id}", response_model=MemberResponse)
def get_member(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: UsersTable = Depends(get_current_user)
):
    member = db.query(MemberProfile).filter(MemberProfile.id == member_id).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if current_user.role != "admin" and member.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return member


# ======================================
# UPDATE MEMBER (Admin / Own)
# ======================================
@router.put("/{member_id}", response_model=MemberResponse)
def update_member(
    member_id: UUID,
    data: UpdateMember,
    db: Session = Depends(get_db),
    current_user: UsersTable = Depends(get_current_user)
):
    member = db.query(MemberProfile).filter(MemberProfile.id == member_id).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if current_user.role != "admin" and member.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(member, key, value)

    member.borrow_limit = 3

    db.commit()
    db.refresh(member)

    return member


# ======================================
# MEMBER BORROW HISTORY (Admin / Own)
# ======================================
@router.get("/{member_id}/history")
def member_history(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: UsersTable = Depends(get_current_user)
):
    member = db.query(MemberProfile).filter(MemberProfile.id == member_id).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if current_user.role != "admin" and member.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    issues = db.query(Issue).filter(Issue.member_id == member_id).all()

    return issues


# ======================================
# SOFT DELETE MEMBER (Admin Only)
# ======================================
@router.delete("/{member_id}")
def delete_member(
    member_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    member = db.query(MemberProfile).filter(MemberProfile.id == member_id).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.is_active = False
    db.commit()

    return {"message": "Member deactivated successfully"}
