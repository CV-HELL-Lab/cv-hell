import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class BossResponse(Base):
    __tablename__ = "boss_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), unique=True, nullable=False)
    roast_opening = Column(Text, nullable=False)
    why_it_fails = Column(Text, nullable=False)
    top_issues_json = Column(Text, nullable=False)  # JSON array of strings
    fix_direction = Column(Text, nullable=False)
    mood = Column(String, nullable=False)
    mood_level = Column(Integer, nullable=False)
    approved = Column(Boolean, nullable=False, default=False)
    approved_phrase = Column(String, nullable=True)
    raw_llm_response = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submission = relationship("Submission", back_populates="boss_response")
