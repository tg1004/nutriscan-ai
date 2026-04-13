from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True  # allows reading from SQLAlchemy models

class ProfileUpdate(BaseModel):
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    goal: Optional[str] = None
    diet_type: Optional[str] = None
    activity_level: Optional[str] = None
    custom_targets: Optional[dict] = None

class ProfileResponse(BaseModel):
    weight_kg: Optional[float]
    height_cm: Optional[float]
    age: Optional[int]
    gender: Optional[str]
    goal: Optional[str]
    diet_type: Optional[str]
    activity_level: Optional[str]
    custom_targets: Optional[dict]

    class Config:
        from_attributes = True
