"""
Food Service
============
Handles all food item CRUD, ingredient search, and scan context processing.
"""

from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException
from uuid import UUID

from app.models.food_item import FoodItem, Ingredient, NutritionFact
from app.services.nutrition_engine import compute_nutrition, NutritionResult


def search_food(query: str, db: Session, limit: int = 10) -> list[FoodItem]:
    """Search food items by name or alias."""
    return db.query(FoodItem).filter(
        or_(
            FoodItem.name.ilike(f"%{query}%"),
            FoodItem.name_aliases.cast(str).ilike(f"%{query}%")
        )
    ).limit(limit).all()


def search_ingredients(query: str, db: Session, limit: int = 20) -> list[Ingredient]:
    """Search ingredients — used for the 'add extra ingredient' UI."""
    return db.query(Ingredient).filter(
        or_(
            Ingredient.name.ilike(f"%{query}%"),
            Ingredient.name_aliases.cast(str).ilike(f"%{query}%")
        )
    ).limit(limit).all()


def get_food_item(food_item_id: UUID, db: Session) -> FoodItem:
    food_item = db.query(FoodItem).filter(FoodItem.id == food_item_id).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found.")
    return food_item


def compute_scan_nutrition(
    food_item_id: str,
    quantity_pieces: float,
    source: str,
    extra_ingredient_ids: list[str],
    db: Session,
) -> NutritionResult:
    """
    Called when user confirms a scan result.
    Validates inputs then delegates to the nutrition engine.
    """
    if source not in ("home", "restaurant"):
        raise HTTPException(status_code=400, detail="source must be 'home' or 'restaurant'")
    if quantity_pieces <= 0:
        raise HTTPException(status_code=400, detail="quantity_pieces must be positive")

    food_item = get_food_item(UUID(food_item_id), db)
    return compute_nutrition(
        food_item=food_item,
        quantity_pieces=quantity_pieces,
        source=source,
        extra_ingredient_ids=extra_ingredient_ids,
        db=db,
    )