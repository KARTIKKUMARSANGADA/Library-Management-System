import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String, nullable=False)

    isbn = Column(String, unique=True, nullable=False, index=True)

    author_id = Column(UUID(as_uuid=True), ForeignKey("authors.id", ondelete="SET NULL"))

    genre = Column(String)
    description = Column(String)

    total_copies = Column(Integer, nullable=False)
    available_copies = Column(Integer, nullable=False)

    published_year = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    author = relationship("Author", back_populates="books")
    issues = relationship("Issue", back_populates="book")