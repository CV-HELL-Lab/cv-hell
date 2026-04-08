from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from core.database import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
