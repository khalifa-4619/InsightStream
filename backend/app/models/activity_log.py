from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    level = Column(String(10), default="INFO") # INFO, WARNING, ERROR
    source = Column(String(50))
    message = Column(Text, nullable=False)
    owner_id = Column(Integer, nullable=True)