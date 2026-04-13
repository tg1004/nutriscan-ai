"""
Database Seed Script
====================
Run once after migrations:
  docker exec -it nutriscan_backend python -m app.db.seed

Seeds:
  - Oil ingredients (ghee, refined oil, mustard oil, butter)
  - Common ingredients (cheese, potato, wheat flour, paneer, egg, etc.)
  - Aloo Paratha as a complete FoodItem with recipe + oil profile
  - Paneer Paratha as a second example
"""

from uuid import uuid4
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.food_item import (
    FoodItem, NutritionFact, Ingredient,
    FoodIngredient, OilProfile
)


# ── All nutrition data is per 100g unless noted ────────────────────────────────

INGREDIENTS_DATA = [
    # Oils
    {
        "name": "Ghee",
        "category": "oil",
        "default_quantity_g": 8.0,
        "unit": "g",
        "nutrition": {
            "calories": 900, "protein_g": 0, "carbs_g": 0, "fat_g": 99.5,
            "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 62,
            "sodium_mg": 2, "calcium_mg": 4, "vitamin_a_ug": 840,
            "vitamin_d_ug": 1.5, "data_source": "usda"
        }
    },
    {
        "name": "Refined Oil",
        "category": "oil",
        "default_quantity_g": 10.0,
        "unit": "g",
        "aliases": ["sunflower oil", "vegetable oil"],
        "nutrition": {
            "calories": 884, "protein_g": 0, "carbs_g": 0, "fat_g": 100,
            "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 10.3,
            "data_source": "usda"
        }
    },
    {
        "name": "Mustard Oil",
        "category": "oil",
        "default_quantity_g": 10.0,
        "unit": "g",
        "nutrition": {
            "calories": 884, "protein_g": 0, "carbs_g": 0, "fat_g": 100,
            "fiber_g": 0, "saturated_fat_g": 11.6, "data_source": "usda"
        }
    },
    {
        "name": "Butter",
        "category": "oil",
        "default_quantity_g": 10.0,
        "unit": "g",
        "nutrition": {
            "calories": 717, "protein_g": 0.85, "carbs_g": 0.06, "fat_g": 81,
            "saturated_fat_g": 51, "sodium_mg": 576, "calcium_mg": 24,
            "vitamin_a_ug": 684, "data_source": "usda"
        }
    },
    # Common ingredients
    {
        "name": "Whole Wheat Flour (Atta)",
        "category": "grain",
        "default_quantity_g": 30.0,
        "unit": "g",
        "aliases": ["atta", "wheat flour", "gehun ka atta"],
        "nutrition": {
            "calories": 340, "protein_g": 12, "carbs_g": 72, "fat_g": 2,
            "fiber_g": 10.7, "sugar_g": 0.4, "iron_mg": 3.6,
            "calcium_mg": 34, "potassium_mg": 405, "magnesium_mg": 138,
            "phosphorus_mg": 357, "folate_ug": 44, "data_source": "usda"
        }
    },
    {
        "name": "Potato (Boiled)",
        "category": "vegetable",
        "default_quantity_g": 50.0,
        "unit": "g",
        "aliases": ["aloo", "batata", "boiled potato"],
        "nutrition": {
            "calories": 77, "protein_g": 2, "carbs_g": 17, "fat_g": 0.1,
            "fiber_g": 2.1, "sugar_g": 0.8, "vitamin_c_mg": 13,
            "potassium_mg": 379, "vitamin_b12_ug": 0, "iron_mg": 0.31,
            "sodium_mg": 5, "data_source": "usda"
        }
    },
    {
        "name": "Amul Processed Cheese",
        "category": "dairy",
        "default_quantity_g": 20.0,
        "unit": "g",
        "aliases": ["cheese slice", "processed cheese", "amul cheese", "cheese"],
        "nutrition": {
            "calories": 330, "protein_g": 20, "carbs_g": 6, "fat_g": 25,
            "saturated_fat_g": 16, "sodium_mg": 1200, "calcium_mg": 700,
            "vitamin_a_ug": 280, "data_source": "manual"
        }
    },
    {
        "name": "Paneer",
        "category": "dairy",
        "default_quantity_g": 30.0,
        "unit": "g",
        "aliases": ["cottage cheese", "panir"],
        "nutrition": {
            "calories": 265, "protein_g": 18, "carbs_g": 1.2, "fat_g": 21,
            "saturated_fat_g": 13, "calcium_mg": 480, "sodium_mg": 30,
            "vitamin_a_ug": 210, "data_source": "usda"
        }
    },
    {
        "name": "Egg",
        "category": "protein",
        "default_quantity_g": 50.0,
        "unit": "piece",
        "aliases": ["anda", "whole egg"],
        "nutrition": {
            "calories": 143, "protein_g": 13, "carbs_g": 0.7, "fat_g": 10,
            "saturated_fat_g": 3.1, "sodium_mg": 142, "calcium_mg": 56,
            "iron_mg": 1.75, "vitamin_d_ug": 2, "vitamin_b12_ug": 0.89,
            "vitamin_a_ug": 149, "folate_ug": 47, "data_source": "usda"
        }
    },
    {
        "name": "Onion",
        "category": "vegetable",
        "default_quantity_g": 20.0,
        "unit": "g",
        "aliases": ["pyaaz", "kanda"],
        "nutrition": {
            "calories": 40, "protein_g": 1.1, "carbs_g": 9.3, "fat_g": 0.1,
            "fiber_g": 1.7, "sugar_g": 4.2, "vitamin_c_mg": 7.4,
            "potassium_mg": 146, "data_source": "usda"
        }
    },
    {
        "name": "Salt",
        "category": "spice",
        "default_quantity_g": 2.0,
        "unit": "g",
        "nutrition": {
            "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0,
            "sodium_mg": 38758, "data_source": "usda"
        }
    },
    {
        "name": "Green Chilli",
        "category": "spice",
        "default_quantity_g": 5.0,
        "unit": "piece",
        "aliases": ["hari mirch", "green pepper"],
        "nutrition": {
            "calories": 40, "protein_g": 2, "carbs_g": 9, "fat_g": 0.2,
            "vitamin_c_mg": 242, "vitamin_a_ug": 59, "data_source": "usda"
        }
    },
    {
        "name": "Coriander Leaves",
        "category": "herb",
        "default_quantity_g": 5.0,
        "unit": "g",
        "aliases": ["dhania", "cilantro", "hara dhania"],
        "nutrition": {
            "calories": 23, "protein_g": 2.1, "carbs_g": 3.7, "fat_g": 0.5,
            "vitamin_c_mg": 27, "vitamin_a_ug": 337, 
            "data_source": "usda"
        }
    },
]


FOOD_ITEMS_DATA = [
    {
        "name": "Aloo Paratha",
        "category": "indian_bread",
        "source_type": "homemade",
        "per_piece_grams": 120.0,   # one standard paratha
        "aliases": ["potato paratha", "aloo ka paratha", "stuffed paratha"],
        # Base nutrition per 100g (includes standard ghee from recipe)
        "nutrition": {
            "calories": 230, "protein_g": 5.5, "carbs_g": 32, "fat_g": 9.5,
            "fiber_g": 3.2, "sugar_g": 0.8, "saturated_fat_g": 4.5,
            "sodium_mg": 380, "calcium_mg": 28, "iron_mg": 1.8,
            "vitamin_c_mg": 4, "vitamin_a_ug": 45, "potassium_mg": 210,
            "magnesium_mg": 28, "phosphorus_mg": 98, "data_source": "manual"
        },
        # Recipe: ingredients per ONE piece (120g paratha)
        "recipe": [
            {"ingredient_name": "Whole Wheat Flour (Atta)", "quantity_g": 60, "is_optional": False},
            {"ingredient_name": "Potato (Boiled)", "quantity_g": 40, "is_optional": False},
            {"ingredient_name": "Ghee", "quantity_g": 8, "is_optional": False},
            {"ingredient_name": "Salt", "quantity_g": 1, "is_optional": False},
            {"ingredient_name": "Green Chilli", "quantity_g": 3, "is_optional": True},
            {"ingredient_name": "Coriander Leaves", "quantity_g": 3, "is_optional": True},
        ],
        "oil_profile": {
            "home_oil_type": "ghee",
            "home_oil_g": 8.0,
            "restaurant_oil_type": "refined_oil",
            "restaurant_oil_g": 15.0,
        }
    },
    {
        "name": "Paneer Paratha",
        "category": "indian_bread",
        "source_type": "homemade",
        "per_piece_grams": 130.0,
        "aliases": ["paneer ka paratha", "cottage cheese paratha"],
        "nutrition": {
            "calories": 270, "protein_g": 9, "carbs_g": 29, "fat_g": 13,
            "fiber_g": 2.8, "sugar_g": 0.6, "saturated_fat_g": 7,
            "sodium_mg": 340, "calcium_mg": 120, "iron_mg": 1.5,
            "vitamin_a_ug": 90, "data_source": "manual"
        },
        "recipe": [
            {"ingredient_name": "Whole Wheat Flour (Atta)", "quantity_g": 60, "is_optional": False},
            {"ingredient_name": "Paneer", "quantity_g": 40, "is_optional": False},
            {"ingredient_name": "Ghee", "quantity_g": 8, "is_optional": False},
            {"ingredient_name": "Salt", "quantity_g": 1, "is_optional": False},
            {"ingredient_name": "Green Chilli", "quantity_g": 3, "is_optional": True},
        ],
        "oil_profile": {
            "home_oil_type": "ghee",
            "home_oil_g": 8.0,
            "restaurant_oil_type": "refined_oil",
            "restaurant_oil_g": 15.0,
        }
    },
]


def run_seed():
    db: Session = SessionLocal()
    try:
        # ── 1. Seed Ingredients ────────────────────────────────────────────────
        ingredient_map = {}   # name → Ingredient ORM object

        for data in INGREDIENTS_DATA:
            existing = db.query(Ingredient).filter(
                Ingredient.name == data["name"]
            ).first()
            if existing:
                ingredient_map[data["name"]] = existing
                print(f"  [skip] Ingredient already exists: {data['name']}")
                continue

            ing = Ingredient(
                id=uuid4(),
                name=data["name"],
                category=data.get("category"),
                default_quantity_g=data.get("default_quantity_g", 10),
                unit=data.get("unit", "g"),
                name_aliases=data.get("aliases"),
            )
            db.add(ing)
            db.flush()

            nutrition_data = data.get("nutrition", {})
            fact = NutritionFact(
                id=uuid4(),
                entity_id=ing.id,
                entity_type="ingredient",
                **{k: v for k, v in nutrition_data.items() if k != "data_source"},
                data_source=nutrition_data.get("data_source", "manual"),
            )
            db.add(fact)
            ingredient_map[data["name"]] = ing
            print(f"  [+] Ingredient: {data['name']}")

        db.flush()

        # ── 2. Seed Food Items ─────────────────────────────────────────────────
        for data in FOOD_ITEMS_DATA:
            existing = db.query(FoodItem).filter(
                FoodItem.name == data["name"]
            ).first()
            if existing:
                print(f"  [skip] FoodItem already exists: {data['name']}")
                continue

            food = FoodItem(
                id=uuid4(),
                name=data["name"],
                category=data["category"],
                source_type=data["source_type"],
                per_piece_grams=data["per_piece_grams"],
                per_piece_calories=data["nutrition"]["calories"] * data["per_piece_grams"] / 100,
                name_aliases=data.get("aliases"),
                is_packaged=False,
            )
            db.add(food)
            db.flush()

            # Nutrition fact
            n = data["nutrition"]
            fact = NutritionFact(
                id=uuid4(),
                entity_id=food.id,
                entity_type="food_item",
                calories=n.get("calories", 0),
                protein_g=n.get("protein_g", 0),
                carbs_g=n.get("carbs_g", 0),
                fat_g=n.get("fat_g", 0),
                fiber_g=n.get("fiber_g", 0),
                sugar_g=n.get("sugar_g", 0),
                saturated_fat_g=n.get("saturated_fat_g", 0),
                sodium_mg=n.get("sodium_mg", 0),
                calcium_mg=n.get("calcium_mg", 0),
                iron_mg=n.get("iron_mg", 0),
                vitamin_c_mg=n.get("vitamin_c_mg", 0),
                vitamin_a_ug=n.get("vitamin_a_ug", 0),
                vitamin_b12_ug=n.get("vitamin_b12_ug", 0),
                potassium_mg=n.get("potassium_mg", 0),
                magnesium_mg=n.get("magnesium_mg", 0),
                phosphorus_mg=n.get("phosphorus_mg", 0),
                data_source=n.get("data_source", "manual"),
            )
            db.add(fact)

            # Recipe (FoodIngredient rows)
            for recipe_item in data.get("recipe", []):
                ing = ingredient_map.get(recipe_item["ingredient_name"])
                if not ing:
                    print(f"  [warn] Ingredient not found: {recipe_item['ingredient_name']}")
                    continue
                fi = FoodIngredient(
                    id=uuid4(),
                    food_item_id=food.id,
                    ingredient_id=ing.id,
                    quantity_g=recipe_item["quantity_g"],
                    is_optional=recipe_item.get("is_optional", False),
                )
                db.add(fi)

            # Oil profile
            op_data = data.get("oil_profile")
            if op_data:
                op = OilProfile(
                    id=uuid4(),
                    food_item_id=food.id,
                    **op_data,
                )
                db.add(op)

            print(f"  [+] FoodItem: {data['name']}")

        db.commit()
        print("\nSeed complete.")

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()