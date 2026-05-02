from pydantic import BaseModel, EmailStr
from typing import Optional

# Common propeerties shared by all User schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_premium: Optional[bool] = False
    name: str
    email: EmailStr
    
# What we need to create a user (Received during signup)
class UserCreate(UserBase):
    password: str
    
# What we return to the frontend (No password here!)
class UserOut(UserBase):
    id: int
    profile_picture: Optional[str] = None
    
    class Config:
        from_attributes = True
        
class UserUpdate(BaseModel):
    name: str
