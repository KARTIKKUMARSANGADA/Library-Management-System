import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class MemberProfile(Base):
    __tablename__ = "member_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String)
    address = Column(String)

    borrow_limit = Column(Integer, nullable=False, default=3, server_default=text("3"))
    membership_date = Column(DateTime, default=datetime.utcnow)

    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("UsersTable", back_populates="member_profile")
    issues = relationship("Issue", back_populates="member")
