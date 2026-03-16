from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AuthorBase(BaseModel):
    first_name: str
    last_name: str
    bio: str | None = None
    nationality: str | None = None


class CreateAuthor(AuthorBase):
    pass


class UpdateAuthor(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    bio: str | None = None
    nationality: str | None = None


class AuthorResponse(AuthorBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True