from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any


class DataFileBase(BaseModel):
    filename: str
    file_typ: str # e.g., 'csv', 'xlsx'
    
class DataFileCreate(DataFileBase):
    pass

class DataFileOut(DataFileBase):
    id: int
    owner_id: int
    created_at: datetime
    summary_stats: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True