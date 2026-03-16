from uuid import UUID
from pydantic import BaseModel
from datetime import datetime


class GetUser(BaseModel):
    id: UUID
    email: str
    role: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True