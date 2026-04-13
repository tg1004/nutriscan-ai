import uuid
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class FoodItem(Base):
    """
    Master catalogue of every food the app knows about.
    One row per dish (e.g. 'Aloo Paratha', 'Masala Dosa', 'Cadbury Dairy Milk').
    Both home-cooked dishes and packaged products live here.
    """
    __tablename__ = "food_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)          # "Aloo Paratha"
    name_aliases = Column(JSON, nullable=True)                  # ["aloo ka paratha", "potato paratha"]
    category = Column(String, nullable=False)                   # "indian_bread" | "rice" | "snack" | "packaged"
    source_type = Column(String, default="homemade")            # "homemade" | "restaurant" | "packaged"

    # Per-piece stats (the unit most users think in)
    per_piece_grams = Column(Float, nullable=True)              # 120.0 (one standard paratha)
    per_piece_calories = Column(Float, nullable=True)           # pre-computed for speed

    # Packaged food fields
    is_packaged = Column(Boolean, default=False)
    off_barcode = Column(String, nullable=True, index=True)     # OpenFoodFacts barcode
    brand = Column(String, nullable=True)
    serving_size_g = Column(Float, nullable=True)               # from package label

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    nutrition_fact = relationship(
        "NutritionFact",
        primaryjoin="and_(FoodItem.id==foreign(NutritionFact.entity_id), "
                    "NutritionFact.entity_type=='food_item')",
        uselist=False,
        cascade="all, delete-orphan"
    )
    food_ingredients = relationship(
        "FoodIngredient",
        back_populates="food_item",
        cascade="all, delete-orphan"
    )
    oil_profile = relationship(
        "OilProfile",
        back_populates="food_item",
        uselist=False,
        cascade="all, delete-orphan"
    )
    barcode_product = relationship(
        "BarcodeProduct",
        back_populates="food_item",
        uselist=False
    )
    log_items = relationship("LogItem", back_populates="food_item")

    def __repr__(self):
        return f"<FoodItem {self.name}>"


class NutritionFact(Base):
    """
    Nutritional values per 100g for any entity (food item OR ingredient).
    entity_type distinguishes which table entity_id points to.
    This single table serves both FoodItem and Ingredient to avoid duplication.
    """
    __tablename__ = "nutrition_facts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    entity_type = Column(String, nullable=False)  # "food_item" | "ingredient"

    # ── Macronutrients (per 100g) ──────────────────────────────────────
    calories = Column(Float, default=0)        # kcal
    protein_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    fiber_g = Column(Float, default=0)
    sugar_g = Column(Float, default=0)
    saturated_fat_g = Column(Float, default=0)

    # ── Micronutrients (per 100g) ──────────────────────────────────────
    sodium_mg = Column(Float, default=0)
    calcium_mg = Column(Float, default=0)
    iron_mg = Column(Float, default=0)
    vitamin_c_mg = Column(Float, default=0)
    vitamin_a_ug = Column(Float, default=0)    # micrograms (RAE)
    vitamin_d_ug = Column(Float, default=0)
    vitamin_b12_ug = Column(Float, default=0)
    potassium_mg = Column(Float, default=0)
    magnesium_mg = Column(Float, default=0)
    zinc_mg = Column(Float, default=0)
    phosphorus_mg = Column(Float, default=0)
    folate_ug = Column(Float, default=0)       # micrograms DFE

    # Raw source for debugging / audit
    data_source = Column(String, nullable=True)  # "usda" | "off" | "manual" | "estimated"


class Ingredient(Base):
    """
    Raw ingredient catalogue — wheat flour, ghee, cheese, potato, oil, etc.
    Each ingredient has its own NutritionFact (per 100g).
    Used both as components of FoodItems AND as user-declared extras.
    """
    __tablename__ = "ingredients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True, index=True)  # "Amul Cheese"
    name_aliases = Column(JSON, nullable=True)                       # ["cheese slice", "processed cheese"]
    category = Column(String, nullable=True)                         # "dairy" | "oil" | "spice" | "vegetable"

    # The standard default quantity used when user says "I added X"
    # e.g. one cheese slice = 20g, one tsp oil = 5g
    default_quantity_g = Column(Float, default=10.0)
    unit = Column(String, default="g")   # "g" | "ml" | "piece" | "tsp"

    nutrition_fact = relationship(
        "NutritionFact",
        primaryjoin="and_(Ingredient.id==foreign(NutritionFact.entity_id), "
                    "NutritionFact.entity_type=='ingredient')",
        uselist=False,
        cascade="all, delete-orphan",
        overlaps="nutrition_fact"
    )
    food_ingredients = relationship("FoodIngredient", back_populates="ingredient")


class FoodIngredient(Base):
    """
    Recipe table: maps FoodItem → Ingredient with exact quantity.
    'Aloo Paratha' → [wheat flour 80g, potato 60g, ghee 10g, salt 1g ...]
    """
    __tablename__ = "food_ingredients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    food_item_id = Column(UUID(as_uuid=True), ForeignKey("food_items.id"), nullable=False)
    ingredient_id = Column(UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False)
    quantity_g = Column(Float, nullable=False)       # grams of this ingredient in one standard piece
    is_optional = Column(Boolean, default=False)     # True for "sometimes added" items

    food_item = relationship("FoodItem", back_populates="food_ingredients")
    ingredient = relationship("Ingredient", back_populates="food_ingredients")


class OilProfile(Base):
    """
    Per-food oil defaults for home vs restaurant context.
    'Aloo Paratha at home' → 8g ghee
    'Aloo Paratha at restaurant' → 15g refined oil
    """
    __tablename__ = "oil_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    food_item_id = Column(UUID(as_uuid=True), ForeignKey("food_items.id"), unique=True, nullable=False)

    # Home cooking defaults
    home_oil_type = Column(String, default="ghee")        # "ghee" | "mustard_oil" | "refined_oil"
    home_oil_g = Column(Float, default=8.0)               # grams per piece

    # Restaurant defaults
    restaurant_oil_type = Column(String, default="refined_oil")
    restaurant_oil_g = Column(Float, default=15.0)        # restaurants use more oil

    food_item = relationship("FoodItem", back_populates="oil_profile")


class BarcodeProduct(Base):
    """
    Cache table for barcode-scanned packaged products.
    When a user scans a barcode:
      1. Check this table first (fast, no API call)
      2. If miss → call OpenFoodFacts API → store result here
      3. Link to or create a FoodItem
    """
    __tablename__ = "barcode_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    barcode = Column(String, nullable=False, unique=True, index=True)
    food_item_id = Column(UUID(as_uuid=True), ForeignKey("food_items.id"), nullable=True)
    product_name = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    raw_off_data = Column(JSON, nullable=True)   # full OpenFoodFacts response stored as-is
    cached_at = Column(DateTime, default=datetime.utcnow)

    food_item = relationship("FoodItem", back_populates="barcode_product")