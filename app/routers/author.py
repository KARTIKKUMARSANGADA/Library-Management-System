from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.models.author import Author
from app.schemas.author import CreateAuthor, UpdateAuthor, AuthorResponse
from app.dependencies import require_admin

router = APIRouter(prefix="/authors", tags=["Authors"])


# ======================================
# CREATE AUTHOR (Admin Only)
# ======================================
@router.post("/", response_model=AuthorResponse, status_code=201)
def create_author(
    data: CreateAuthor,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    author = Author(**data.model_dump())

    db.add(author)
    db.commit()
    db.refresh(author)

    return author


# ======================================
# LIST AUTHORS (Public)
# ======================================
@router.get("/", response_model=list[AuthorResponse])
def list_authors(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    return db.query(Author).offset(skip).limit(limit).all()


# ======================================
# GET AUTHOR BY ID (Public)
# ======================================
@router.get("/{author_id}", response_model=AuthorResponse)
def get_author(author_id: UUID, db: Session = Depends(get_db)):

    author = db.query(Author).filter(Author.id == author_id).first()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    return author


# ======================================
# UPDATE AUTHOR (Admin Only)
# ======================================
@router.put("/{author_id}", response_model=AuthorResponse)
def update_author(
    author_id: UUID,
    data: UpdateAuthor,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    author = db.query(Author).filter(Author.id == author_id).first()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(author, key, value)

    db.commit()
    db.refresh(author)

    return author


# ======================================
# DELETE AUTHOR (Admin Only)
# ======================================
@router.delete("/{author_id}", status_code=204)
def delete_author(
    author_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    author = db.query(Author).filter(Author.id == author_id).first()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    db.delete(author)
    db.commit()

    return