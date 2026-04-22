from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any


class DataFileBase(BaseModel):
    filename: str
    filepath: str
    file_typ: Optional[str] # e.g., 'csv', 'xlsx'
    summary_stats: Optional[Dict[str, Any]] = None
    
class DataFileCreate(DataFileBase):
    pass

class DataFileOut(DataFileBase):
    id: int
    owner_id: int
    file_typ: str
    created_at: datetime
    status: str
    summary_stats: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True