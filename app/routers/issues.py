from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import UUID

from app.database import get_db
from app.models.issue import Issue
from app.models.book import Book
from app.models.member_profile import MemberProfile
from app.schemas.issue import CreateIssue, IssueResponse
from app.dependencies import require_admin, get_current_user
from app.config import settings

router = APIRouter(prefix="/issues", tags=["Issues"])


# ======================================
# ISSUE A BOOK (Admin Only)
# ======================================
@router.post("/", response_model=IssueResponse, status_code=201)
def issue_book(
    data: CreateIssue,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    # Check member exists
    member = db.query(MemberProfile).filter(
        MemberProfile.id == data.member_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if not member.is_active:
        raise HTTPException(status_code=403, detail="Inactive member")

    # Check book exists
    book = db.query(Book).filter(Book.id == data.book_id).first()

    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check availability
    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="Book unavailable")

    # Check borrow limit
    active_issues = db.query(Issue).filter(
        Issue.member_id == member.id,
        Issue.status == "issued"
    ).count()

    borrow_limit = member.borrow_limit if member.borrow_limit is not None else 3
    if active_issues >= borrow_limit:
        raise HTTPException(status_code=400, detail="Borrow limit reached")

    # Prevent duplicate active issue
    duplicate = db.query(Issue).filter(
        Issue.member_id == member.id,
        Issue.book_id == book.id,
        Issue.status == "issued"
    ).first()

    if duplicate:
        raise HTTPException(status_code=400, detail="Book already issued to member")

    # Create issue record
    issued_at = datetime.utcnow()
    due_date = issued_at + timedelta(days=settings.DEFAULT_BORROW_DAYS)

    issue = Issue(
        member_id=member.id,
        book_id=book.id,
        issued_at=issued_at,
        due_date=due_date,
        status="issued"
    )

    # Decrease available copies
    book.available_copies -= 1

    db.add(issue)
    db.commit()
    db.refresh(issue)

    return issue


# ======================================
# RETURN BOOK (Admin Only)
# ======================================
@router.post("/{issue_id}/return", response_model=IssueResponse)
def return_book(
    issue_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if issue.status == "returned":
        raise HTTPException(status_code=400, detail="Book already returned")

    book = db.query(Book).filter(Book.id == issue.book_id).first()

    # Update issue
    issue.status = "returned"
    issue.returned_at = datetime.utcnow()

    # Increase available copies
    book.available_copies += 1

    db.commit()
    db.refresh(issue)

    return issue


# ======================================
# LIST ALL ISSUES (Admin Only)
# ======================================
@router.get("/", response_model=list[IssueResponse])
def list_issues(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    return db.query(Issue).order_by(Issue.issued_at.desc()).offset(skip).limit(limit).all()


# ======================================
# LIST ACTIVE ISSUES (Admin Only)
# ======================================
@router.get("/active", response_model=list[IssueResponse])
def active_issues(
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    return db.query(Issue).filter(Issue.status == "issued").all()


# ======================================
# GET MEMBER ISSUES (Admin / Own)
# NOTE: MUST be before /{issue_id} to avoid routing conflict
# FastAPI matches routes in registration order — if /{issue_id}
# was first, "member" would be parsed as a UUID and fail with 422.
# ======================================
@router.get("/member/{member_id}", response_model=list[IssueResponse])
def get_member_issues(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    member = db.query(MemberProfile).filter(MemberProfile.id == member_id).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if current_user.role != "admin" and member.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return db.query(Issue).filter(Issue.member_id == member_id).all()


# ======================================
# GET ISSUE BY ID (Admin / Own)
# ======================================
@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if current_user.role != "admin":
        member = db.query(MemberProfile).filter(
            MemberProfile.user_id == current_user.id
        ).first()

        if not member or issue.member_id != member.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return issue
