from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.food_item import FoodItem, FoodIngredient, Ingredient
from pydantic import BaseModel

router = APIRouter(prefix="/suggest", tags=["Suggest"])


class SuggestRequest(BaseModel):
    ingredient_names: list[str]  # what the user has at home


@router.post("")
def suggest_meals(
    request: SuggestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Given a list of ingredient names the user has at home,
    find all food items whose NON-OPTIONAL ingredients are
    all available in that list.
    """
    available = [name.lower().strip() for name in request.ingredient_names]

    # Get all non-packaged food items with their ingredients
    all_foods = db.query(FoodItem).filter(
        FoodItem.is_packaged == False
    ).all()

    suggestions = []

    for food in all_foods:
        if not food.food_ingredients:
            continue

        # Check if all required (non-optional) ingredients are available
        required = [
            fi for fi in food.food_ingredients
            if not fi.is_optional and fi.ingredient
        ]
        if not required:
            continue

        can_make = all(
            any(
                avail in fi.ingredient.name.lower() or
                fi.ingredient.name.lower() in avail
                for avail in available
            )
            for fi in required
        )

        if can_make:
            fact = food.nutrition_fact
            recipe = [
                {
                    "ingredient": fi.ingredient.name,
                    "quantity_g": fi.quantity_g,
                    "is_optional": fi.is_optional
                }
                for fi in food.food_ingredients if fi.ingredient
            ]
            suggestions.append({
                "food_item_id": str(food.id),
                "name": food.name,
                "per_piece_grams": food.per_piece_grams,
                "per_piece_calories": food.per_piece_calories,
                "recipe": recipe,
                "nutrition_per_piece": {
                    "calories": round((fact.calories or 0) * (food.per_piece_grams or 100) / 100, 1),
                    "protein_g": round((fact.protein_g or 0) * (food.per_piece_grams or 100) / 100, 1),
                    "carbs_g": round((fact.carbs_g or 0) * (food.per_piece_grams or 100) / 100, 1),
                    "fat_g": round((fact.fat_g or 0) * (food.per_piece_grams or 100) / 100, 1),
                } if fact else {}
            })

    return {"suggestions": suggestions, "count": len(suggestions)}