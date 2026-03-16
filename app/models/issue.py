import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    member_id = Column(UUID(as_uuid=True), ForeignKey("member_profiles.id", ondelete="CASCADE"))
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"))

    issued_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=False)

    returned_at = Column(DateTime, nullable=True)

    status = Column(String, default="issued")  # issued / returned

    # Unique active issue per member + book
    __table_args__ = (
        UniqueConstraint("member_id", "book_id", "status", name="unique_active_issue"),
    )

    # Relationships
    member = relationship("MemberProfile", back_populates="issues")
    book = relationship("Book", back_populates="issues")