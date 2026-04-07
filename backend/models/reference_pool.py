import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from core.database import Base


class ReferencePoolItem(Base):
    __tablename__ = "reference_pool_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False)  # excellent / bad / mid / victory_descriptor
    boss_scope = Column(String, nullable=False, default="global")  # global or boss slug
    content = Column(Text, nullable=False)
    tags_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
