import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Date, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class MealLog(Base):
    """One meal event (breakfast/lunch/dinner/snack) for a user on a date."""
    __tablename__ = "meal_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    log_date = Column(Date, nullable=False, default=date.today)
    meal_type = Column(String, nullable=False)   # "breakfast"|"lunch"|"dinner"|"snack"
    image_url = Column(String, nullable=True)    # Cloudinary URL of the scanned photo

    # Denormalized totals — updated every time an item is added/removed
    total_calories = Column(Float, default=0)
    total_protein_g = Column(Float, default=0)
    total_carbs_g = Column(Float, default=0)
    total_fat_g = Column(Float, default=0)
    total_fiber_g = Column(Float, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="meal_logs")
    items = relationship("LogItem", back_populates="meal_log", cascade="all, delete-orphan")


class LogItem(Base):
    """
    One food item within a meal log.
    Stores FINAL computed nutrition after all adjustments:
      - source (home/restaurant) → determines oil used
      - oil_used → the actual oil ingredient record used
      - extra_ingredients → list of {ingredient_id, name, quantity_g, calories, ...}
    """
    __tablename__ = "log_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_log_id = Column(UUID(as_uuid=True), ForeignKey("meal_logs.id"), nullable=False)
    food_item_id = Column(UUID(as_uuid=True), ForeignKey("food_items.id"), nullable=False)

    # How many pieces / grams the user consumed
    quantity_pieces = Column(Float, default=1.0)
    quantity_grams = Column(Float, nullable=False)   # pieces × per_piece_grams

    # Context captured at scan time
    source = Column(String, nullable=False)   # "home" | "restaurant"
    oil_used = Column(String, nullable=True)  # "ghee" | "refined_oil" | "mustard_oil"
    oil_grams = Column(Float, default=0)      # actual grams of oil added

    # Extra ingredients the user declared beyond the standard recipe
    # Stored as: [{"ingredient_id": "...", "name": "cheese", "quantity_g": 20,
    #              "calories": 66, "protein_g": 4.0, ...}, ...]
    extra_ingredients = Column(JSON, default=list)

    # Final computed nutrition (base + oil adjustment + extras)
    calories = Column(Float, default=0)
    protein_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    fiber_g = Column(Float, default=0)
    sugar_g = Column(Float, default=0)
    sodium_mg = Column(Float, default=0)
    calcium_mg = Column(Float, default=0)
    iron_mg = Column(Float, default=0)
    vitamin_c_mg = Column(Float, default=0)
    vitamin_a_ug = Column(Float, default=0)
    potassium_mg = Column(Float, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    meal_log = relationship("MealLog", back_populates="items")
    food_item = relationship("FoodItem", back_populates="log_items")