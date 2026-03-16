from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import UUID

from app.database import get_db
from app.models.book import Book
from app.models.author import Author
from app.schemas.book import CreateBook, UpdateBook, BookResponse
from app.dependencies import require_admin

router = APIRouter(prefix="/books", tags=["Books"])


# ======================================
# CREATE BOOK (Admin Only)
# ======================================
@router.post("/", response_model=BookResponse, status_code=201)
def create_book(
    data: CreateBook,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    # Check author exists
    author = db.query(Author).filter(Author.id == data.author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    # Check ISBN unique
    existing = db.query(Book).filter(Book.isbn == data.isbn).first()
    if existing:
        raise HTTPException(status_code=400, detail="ISBN already exists")

    book = Book(
        **data.model_dump(),
        available_copies=data.total_copies  # Auto-set
    )

    db.add(book)
    db.commit()
    db.refresh(book)

    return book


# ======================================
# LIST BOOKS (Public + Filters)
# ======================================
@router.get("/", response_model=list[BookResponse])
def list_books(
    skip: int = 0,
    limit: int = 10,
    genre: str | None = None,
    available: bool | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Book)

    if genre:
        query = query.filter(Book.genre.ilike(f"%{genre}%"))

    if available is True:
        query = query.filter(Book.available_copies > 0)

    return query.offset(skip).limit(limit).all()


# ======================================
# SEARCH BOOKS
# ======================================
@router.get("/search/", response_model=list[BookResponse])
def search_books(
    keyword: str = Query(...),
    db: Session = Depends(get_db)
):
    books = db.query(Book).filter(
        or_(
            Book.title.ilike(f"%{keyword}%"),
            Book.genre.ilike(f"%{keyword}%")
        )
    ).all()

    return books


# ======================================
# UPDATE BOOK (Admin Only)
# ======================================
@router.put("/{book_id}", response_model=BookResponse)
def update_book(
    book_id: UUID,
    data: UpdateBook,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    book = db.query(Book).filter(Book.id == book_id).first()

    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    update_data = data.model_dump(exclude_unset=True)

    # Handle total_copies change
    if "total_copies" in update_data:
        new_total = update_data["total_copies"]

        issued_count = book.total_copies - book.available_copies

        if new_total < issued_count:
            raise HTTPException(
                status_code=400,
                detail="Total copies cannot be less than issued copies"
            )

        book.available_copies = new_total - issued_count

    for key, value in update_data.items():
        setattr(book, key, value)

    db.commit()
    db.refresh(book)

    return book


# ======================================
# DELETE BOOK (Admin Only)
# ======================================
@router.delete("/{book_id}", status_code=204)
def delete_book(
    book_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    book = db.query(Book).filter(Book.id == book_id).first()

    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    db.delete(book)
    db.commit()

    return


# ======================================
# GET BOOK BY ID
# ======================================
@router.get("/{book_id}", response_model=BookResponse)
def get_book(book_id: UUID, db: Session = Depends(get_db)):

    book = db.query(Book).filter(Book.id == book_id).first()

    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    return book
