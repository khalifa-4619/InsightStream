from pydantic import BaseModel, EmailStr
from typing import Optional

# Common propeerties shared by all User schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_premium: Optional[bool] = False
    
# What we need to create a user (Received during signup)
class UserCreate(UserBase):
    email: EmailStr
    password: str
    
# What we return to the frontend (No password here!)
class UserOut(UserBase):
    id: int
    
    class Config:
        from_attributes = True # Allows pydantic to read SQLAlchemy models