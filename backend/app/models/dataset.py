from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    status = Column(String, default="uploaded") # uploaded, processing, completed
    summary_stats = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_typ = Column(String, nullable=False, default="csv")
    
    # The Magic Link:
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="datasets")