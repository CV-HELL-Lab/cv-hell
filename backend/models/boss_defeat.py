import uuid
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class BossDefeat(Base):
    __tablename__ = "boss_defeats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    boss_id = Column(UUID(as_uuid=True), ForeignKey("bosses.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    defeated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("boss_id", name="uq_boss_defeat_boss_id"),
    )

    boss = relationship("Boss", back_populates="defeat")
    user = relationship("User", back_populates="defeats")
