from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CreateIssue(BaseModel):
    member_id: UUID
    book_id: UUID


class IssueResponse(BaseModel):
    id: UUID
    member_id: UUID
    book_id: UUID
    issued_at: datetime
    due_date: datetime
    returned_at: datetime | None
    status: str

    class Config:
        from_attributes = True