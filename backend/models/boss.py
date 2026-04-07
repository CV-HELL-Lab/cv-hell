import uuid
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class Boss(Base):
    __tablename__ = "bosses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    order_index = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="locked")  # locked/unlocked/current/defeated
    specialty = Column(String, nullable=False)
    rudeness_level = Column(Integer, nullable=False, default=2)  # 1/2/3
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submissions = relationship("Submission", back_populates="boss")
    prize_pool = relationship("PrizePool", back_populates="boss", uselist=False)
    defeat = relationship("BossDefeat", back_populates="boss", uselist=False)
