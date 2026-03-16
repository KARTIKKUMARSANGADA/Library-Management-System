from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class BookBase(BaseModel):
    title: str
    isbn: str
    author_id: UUID
    genre: str | None = None
    description: str | None = None
    total_copies: int
    published_year: int | None = None


class CreateBook(BookBase):
    pass


class UpdateBook(BaseModel):
    title: str | None = None
    genre: str | None = None
    description: str | None = None
    total_copies: int | None = None
    published_year: int | None = None


class BookResponse(BookBase):
    id: UUID
    available_copies: int
    created_at: datetime

    class Config:
        from_attributes = True