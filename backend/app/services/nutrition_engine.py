"""
Nutrition Engine
================
Takes a detected food item + user context (source, extras) and returns
a fully computed NutritionResult with all macro + micro values.

Flow:
  1. Load FoodItem base nutrition (per 100g × quantity_grams / 100)
  2. Swap oil: subtract base oil nutrition, add context oil nutrition
  3. Add extra ingredients: each at their default_quantity_g
  4. Return final NutritionResult
"""

from dataclasses import dataclass, field
from typing import Optional
from sqlalchemy.orm import Session
from app.models.food_item import (
    FoodItem, NutritionFact, Ingredient, OilProfile
)


# ── Data containers ────────────────────────────────────────────────────────────

@dataclass
class NutrientValues:
    """Holds all nutrient values. Used as an additive container."""
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    sugar_g: float = 0
    saturated_fat_g: float = 0
    sodium_mg: float = 0
    calcium_mg: float = 0
    iron_mg: float = 0
    vitamin_c_mg: float = 0
    vitamin_a_ug: float = 0
    vitamin_d_ug: float = 0
    vitamin_b12_ug: float = 0
    potassium_mg: float = 0
    magnesium_mg: float = 0
    zinc_mg: float = 0
    phosphorus_mg: float = 0
    folate_ug: float = 0

    def scale(self, factor: float) -> "NutrientValues":
        """Return a new NutrientValues scaled by factor (e.g. grams/100)."""
        return NutrientValues(**{
            k: round(v * factor, 3)
            for k, v in self.__dict__.items()
        })

    def add(self, other: "NutrientValues") -> "NutrientValues":
        """Return a new NutrientValues that is self + other."""
        return NutrientValues(**{
            k: round(getattr(self, k) + getattr(other, k), 3)
            for k in self.__dict__
        })

    def subtract(self, other: "NutrientValues") -> "NutrientValues":
        """Return self - other (used for oil swap). Clamp negatives to 0."""
        return NutrientValues(**{
            k: max(0, round(getattr(self, k) - getattr(other, k), 3))
            for k in self.__dict__
        })


@dataclass
class ExtraIngredientResult:
    ingredient_id: str
    name: str
    quantity_g: float
    nutrients: NutrientValues


@dataclass
class NutritionResult:
    """Final output of the nutrition engine for one LogItem."""
    food_item_id: str
    food_name: str
    quantity_grams: float
    quantity_pieces: float
    source: str                          # "home" | "restaurant"
    oil_used: str
    oil_grams: float
    base_nutrients: NutrientValues       # food item base only
    oil_nutrients: NutrientValues        # oil contribution
    extra_nutrients: NutrientValues      # all extras combined
    total_nutrients: NutrientValues      # base + oil + extras
    extra_ingredients: list = field(default_factory=list)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fact_to_values(fact: NutritionFact) -> NutrientValues:
    """Convert a NutritionFact ORM row to a NutrientValues object."""
    if not fact:
        return NutrientValues()
    return NutrientValues(
        calories=fact.calories or 0,
        protein_g=fact.protein_g or 0,
        carbs_g=fact.carbs_g or 0,
        fat_g=fact.fat_g or 0,
        fiber_g=fact.fiber_g or 0,
        sugar_g=fact.sugar_g or 0,
        saturated_fat_g=fact.saturated_fat_g or 0,
        sodium_mg=fact.sodium_mg or 0,
        calcium_mg=fact.calcium_mg or 0,
        iron_mg=fact.iron_mg or 0,
        vitamin_c_mg=fact.vitamin_c_mg or 0,
        vitamin_a_ug=fact.vitamin_a_ug or 0,
        vitamin_d_ug=fact.vitamin_d_ug or 0,
        vitamin_b12_ug=fact.vitamin_b12_ug or 0,
        potassium_mg=fact.potassium_mg or 0,
        magnesium_mg=fact.magnesium_mg or 0,
        zinc_mg=fact.zinc_mg or 0,
        phosphorus_mg=fact.phosphorus_mg or 0,
        folate_ug=fact.folate_ug or 0,
    )


def _get_oil_ingredient(oil_type: str, db: Session) -> Optional[Ingredient]:
    """Look up an oil ingredient by name (case-insensitive)."""
    return db.query(Ingredient).filter(
        Ingredient.name.ilike(f"%{oil_type}%"),
        Ingredient.category == "oil"
    ).first()


# ── Main engine function ────────────────────────────────────────────────────────

def compute_nutrition(
    food_item: FoodItem,
    quantity_pieces: float,
    source: str,                            # "home" | "restaurant"
    extra_ingredient_ids: list[str],        # list of Ingredient UUIDs user declared
    db: Session,
) -> NutritionResult:
    """
    Compute the complete nutrition for a scanned food item.

    Parameters
    ----------
    food_item        : FoodItem ORM object (must have nutrition_fact loaded)
    quantity_pieces  : how many pieces the user ate (e.g. 2 parathas)
    source           : "home" or "restaurant"
    extra_ingredient_ids : list of ingredient UUIDs the user declared as extras
    db               : SQLAlchemy session

    Returns
    -------
    NutritionResult with all breakdowns
    """
    quantity_grams = (food_item.per_piece_grams or 100) * quantity_pieces
    scale_factor = quantity_grams / 100   # nutrition facts are per 100g

    # ── Step 1: Base nutrition (food item, scaled to quantity) ─────────────────
    base_per_100g = _fact_to_values(food_item.nutrition_fact)
    base_nutrients = base_per_100g.scale(scale_factor)

    # ── Step 2: Oil adjustment ─────────────────────────────────────────────────
    oil_profile: OilProfile = food_item.oil_profile
    oil_nutrients = NutrientValues()
    oil_used = "none"
    oil_grams = 0.0

    if oil_profile:
        if source == "home":
            oil_type = oil_profile.home_oil_type
            oil_grams_per_piece = oil_profile.home_oil_g
        else:
            oil_type = oil_profile.restaurant_oil_type
            oil_grams_per_piece = oil_profile.restaurant_oil_g

        oil_grams = oil_grams_per_piece * quantity_pieces
        oil_ingredient = _get_oil_ingredient(oil_type, db)

        if oil_ingredient and oil_ingredient.nutrition_fact:
            oil_per_100g = _fact_to_values(oil_ingredient.nutrition_fact)
            oil_nutrients = oil_per_100g.scale(oil_grams / 100)
            oil_used = oil_type

        # The base nutrition_fact already includes a "standard" oil amount.
        # We need to subtract that and add the context-specific amount.
        # Find the oil ingredient in the food's recipe to get the base oil grams.
        base_oil_grams = 0.0
        for fi in food_item.food_ingredients:
            if fi.ingredient and fi.ingredient.category == "oil":
                base_oil_grams += fi.quantity_g * quantity_pieces

        if base_oil_grams > 0 and oil_ingredient and oil_ingredient.nutrition_fact:
            base_oil_per_100g = _fact_to_values(oil_ingredient.nutrition_fact)
            base_oil_contribution = base_oil_per_100g.scale(base_oil_grams / 100)
            # Remove standard oil, add context oil
            base_nutrients = base_nutrients.subtract(base_oil_contribution)
            base_nutrients = base_nutrients.add(oil_nutrients)
            oil_nutrients = oil_nutrients  # keep for display

    # ── Step 3: Extra ingredients ──────────────────────────────────────────────
    extra_results: list[ExtraIngredientResult] = []
    combined_extra_nutrients = NutrientValues()

    for ing_id in extra_ingredient_ids:
        ingredient = db.query(Ingredient).filter(Ingredient.id == ing_id).first()
        if not ingredient or not ingredient.nutrition_fact:
            continue

        qty_g = ingredient.default_quantity_g
        ing_per_100g = _fact_to_values(ingredient.nutrition_fact)
        ing_nutrients = ing_per_100g.scale(qty_g / 100)

        extra_results.append(ExtraIngredientResult(
            ingredient_id=str(ingredient.id),
            name=ingredient.name,
            quantity_g=qty_g,
            nutrients=ing_nutrients
        ))
        combined_extra_nutrients = combined_extra_nutrients.add(ing_nutrients)

    # ── Step 4: Total ──────────────────────────────────────────────────────────
    total_nutrients = base_nutrients.add(combined_extra_nutrients)

    return NutritionResult(
        food_item_id=str(food_item.id),
        food_name=food_item.name,
        quantity_grams=round(quantity_grams, 1),
        quantity_pieces=quantity_pieces,
        source=source,
        oil_used=oil_used,
        oil_grams=round(oil_grams, 1),
        base_nutrients=base_nutrients,
        oil_nutrients=oil_nutrients,
        extra_nutrients=combined_extra_nutrients,
        total_nutrients=total_nutrients,
        extra_ingredients=[
            {
                "ingredient_id": e.ingredient_id,
                "name": e.name,
                "quantity_g": e.quantity_g,
                **e.nutrients.__dict__
            }
            for e in extra_results
        ]
    )