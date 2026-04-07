import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    boss_id = Column(UUID(as_uuid=True), ForeignKey("bosses.id"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    source_type = Column(String, nullable=False)  # pdf/docx/text
    original_file_path = Column(String, nullable=True)
    extracted_text = Column(Text, nullable=True)
    image_paths = Column(Text, nullable=True)  # JSON array of image file paths
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="submissions")
    boss = relationship("Boss", back_populates="submissions")
    boss_response = relationship("BossResponse", back_populates="submission", uselist=False)
