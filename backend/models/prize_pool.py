import uuid
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class PrizePool(Base):
    __tablename__ = "prize_pools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    boss_id = Column(UUID(as_uuid=True), ForeignKey("bosses.id"), unique=True, nullable=False)
    total_points = Column(Integer, nullable=False, default=0)
    settled = Column(Boolean, nullable=False, default=False)
    winner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    settled_at = Column(DateTime(timezone=True), nullable=True)

    boss = relationship("Boss", back_populates="prize_pool")
    winner = relationship("User")
