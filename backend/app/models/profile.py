import uuid
from sqlalchemy import Column, String, Float, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    # Physical stats
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)  # 'male' | 'female' | 'other'

    # Goals & preferences
    goal = Column(String, nullable=True)        # 'weight_loss' | 'muscle_gain' | 'maintenance'
    diet_type = Column(String, nullable=True)   # 'standard' | 'vegan' | 'keto' | 'vegetarian'
    activity_level = Column(String, nullable=True) # 'sedentary' | 'light' | 'moderate' | 'active'

    # Computed targets (JSON so they're flexible)
    custom_targets = Column(JSON, nullable=True)

    user = relationship("User", back_populates="profile")