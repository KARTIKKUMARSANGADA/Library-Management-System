from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class MemberBase(BaseModel):
    first_name: str
    last_name: str
    phone: str | None = None
    address: str | None = None


class CreateMemberByAdmin(MemberBase):
    user_id: UUID


class UpdateMember(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    address: str | None = None


class MemberResponse(MemberBase):
    id: UUID
    user_id: UUID | None = None  # Optional to handle legacy/orphaned rows
    borrow_limit: int
    membership_date: datetime | None = None
    is_active: bool

    class Config:
        from_attributes = True
