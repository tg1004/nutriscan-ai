from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class NutrientValuesSchema(BaseModel):
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


class IngredientResponse(BaseModel):
    id: UUID
    name: str
    category: Optional[str]
    default_quantity_g: float
    unit: str

    class Config:
        from_attributes = True


class FoodItemResponse(BaseModel):
    id: UUID
    name: str
    category: str
    source_type: str
    per_piece_grams: Optional[float]
    per_piece_calories: Optional[float]
    is_packaged: bool
    brand: Optional[str]

    class Config:
        from_attributes = True


class ScanContextRequest(BaseModel):
    """
    Sent by the frontend after user answers the context questions
    (home vs restaurant, extra ingredients).
    """
    food_item_id: str
    quantity_pieces: float = 1.0
    source: str                          # "home" | "restaurant"
    extra_ingredient_ids: list[str] = [] # list of Ingredient UUIDs

    class Config:
        json_schema_extra = {
            "example": {
                "food_item_id": "uuid-here",
                "quantity_pieces": 2,
                "source": "home",
                "extra_ingredient_ids": ["uuid-of-cheese-ingredient"]
            }
        }


class ScanContextResponse(BaseModel):
    """Full nutrition breakdown returned after context is resolved."""
    food_item_id: str
    food_name: str
    quantity_grams: float
    quantity_pieces: float
    source: str
    oil_used: str
    oil_grams: float
    base_nutrients: NutrientValuesSchema
    oil_nutrients: NutrientValuesSchema
    extra_nutrients: NutrientValuesSchema
    total_nutrients: NutrientValuesSchema
    extra_ingredients: list


class BarcodeResponse(BaseModel):
    food_item_id: str
    barcode: str
    product_name: str
    brand: Optional[str]
    serving_size_g: Optional[float]
    per_100g: dict
    source: str