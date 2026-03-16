import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Author(Base):
    __tablename__ = "authors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)

    bio = Column(String)
    nationality = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    books = relationship("Book", back_populates="author")