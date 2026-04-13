"""
Barcode Service
===============
Handles barcode lookups via OpenFoodFacts API (free, no key needed).
Caches results in BarcodeProduct table to avoid repeat API calls.
Creates a FoodItem + NutritionFact from the OFF response.
"""

import httpx
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import uuid4
from fastapi import HTTPException

from app.models.food_item import FoodItem, NutritionFact, BarcodeProduct

OFF_API = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
CACHE_TTL_DAYS = 7  # re-fetch from OFF after 7 days


def _parse_off_response(data: dict) -> dict:
    """Extract the fields we care about from an OpenFoodFacts response."""
    product = data.get("product", {})
    nutriments = product.get("nutriments", {})

    return {
        "product_name": product.get("product_name") or product.get("product_name_en", "Unknown"),
        "brand": product.get("brands", ""),
        "serving_size_g": _safe_float(product.get("serving_size")),
        "calories": _safe_float(nutriments.get("energy-kcal_100g") or
                                nutriments.get("energy_100g", 0)) or 0,
        "protein_g": _safe_float(nutriments.get("proteins_100g", 0)),
        "carbs_g": _safe_float(nutriments.get("carbohydrates_100g", 0)),
        "fat_g": _safe_float(nutriments.get("fat_100g", 0)),
        "fiber_g": _safe_float(nutriments.get("fiber_100g", 0)),
        "sugar_g": _safe_float(nutriments.get("sugars_100g", 0)),
        "saturated_fat_g": _safe_float(nutriments.get("saturated-fat_100g", 0)),
        "sodium_mg": _safe_float(nutriments.get("sodium_100g", 0)) * 1000,  # OFF gives kg
        "calcium_mg": _safe_float(nutriments.get("calcium_100g", 0)) * 1000,
        "iron_mg": _safe_float(nutriments.get("iron_100g", 0)) * 1000,
        "vitamin_c_mg": _safe_float(nutriments.get("vitamin-c_100g", 0)) * 1000,
        "potassium_mg": _safe_float(nutriments.get("potassium_100g", 0)) * 1000,
    }


def _safe_float(val) -> float:
    try:
        return float(val) if val is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _create_food_item_from_off(parsed: dict, barcode: str, db: Session) -> FoodItem:
    """Create a new FoodItem + NutritionFact from parsed OFF data."""
    food_item = FoodItem(
        id=uuid4(),
        name=parsed["product_name"],
        brand=parsed["brand"],
        category="packaged",
        source_type="packaged",
        is_packaged=True,
        off_barcode=barcode,
        serving_size_g=parsed.get("serving_size_g") or 100,
        per_piece_grams=parsed.get("serving_size_g") or 100,
    )
    db.add(food_item)
    db.flush()  # get food_item.id

    nutrition = NutritionFact(
        id=uuid4(),
        entity_id=food_item.id,
        entity_type="food_item",
        calories=parsed["calories"],
        protein_g=parsed["protein_g"],
        carbs_g=parsed["carbs_g"],
        fat_g=parsed["fat_g"],
        fiber_g=parsed["fiber_g"],
        sugar_g=parsed["sugar_g"],
        saturated_fat_g=parsed["saturated_fat_g"],
        sodium_mg=parsed["sodium_mg"],
        calcium_mg=parsed["calcium_mg"],
        iron_mg=parsed["iron_mg"],
        vitamin_c_mg=parsed["vitamin_c_mg"],
        potassium_mg=parsed["potassium_mg"],
        data_source="off",
    )
    db.add(nutrition)
    return food_item


async def lookup_barcode(barcode: str, db: Session) -> dict:
    """
    Main entry point for barcode scanning.
    1. Check cache (BarcodeProduct table)
    2. If miss or stale → fetch from OpenFoodFacts
    3. Create/update FoodItem
    4. Return nutrition data

    Returns a dict ready to display to the user.
    """
    # ── Cache check ────────────────────────────────────────────────────────────
    cached: BarcodeProduct = db.query(BarcodeProduct).filter(
        BarcodeProduct.barcode == barcode
    ).first()

    if cached:
        stale = datetime.utcnow() - cached.cached_at > timedelta(days=CACHE_TTL_DAYS)
        if not stale and cached.food_item:
            return _format_barcode_response(cached.food_item, cached)

    # ── Fetch from OpenFoodFacts ───────────────────────────────────────────────
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(OFF_API.format(barcode=barcode))
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError:
            raise HTTPException(
                status_code=503,
                detail="Could not reach OpenFoodFacts. Check your internet connection."
            )

    if data.get("status") != 1:
        raise HTTPException(
            status_code=404,
            detail=f"Product with barcode {barcode} not found in OpenFoodFacts database."
        )

    parsed = _parse_off_response(data)

    # ── Create or update FoodItem ──────────────────────────────────────────────
    if cached and cached.food_item:
        # Update existing nutrition fact
        fact = cached.food_item.nutrition_fact
        if fact:
            for key, value in parsed.items():
                if hasattr(fact, key):
                    setattr(fact, key, value)
        food_item = cached.food_item
        cached.raw_off_data = data
        cached.cached_at = datetime.utcnow()
    else:
        food_item = _create_food_item_from_off(parsed, barcode, db)
        barcode_record = BarcodeProduct(
            id=uuid4(),
            barcode=barcode,
            food_item_id=food_item.id,
            product_name=parsed["product_name"],
            brand=parsed["brand"],
            raw_off_data=data,
            cached_at=datetime.utcnow(),
        )
        db.add(barcode_record)
        cached = barcode_record

    db.commit()
    db.refresh(food_item)

    return _format_barcode_response(food_item, cached)


def _format_barcode_response(food_item: FoodItem, barcode_record: BarcodeProduct) -> dict:
    """Format the response the API returns to the frontend."""
    fact = food_item.nutrition_fact
    return {
        "food_item_id": str(food_item.id),
        "barcode": barcode_record.barcode,
        "product_name": food_item.name,
        "brand": food_item.brand,
        "serving_size_g": food_item.serving_size_g,
        "per_100g": {
            "calories": fact.calories if fact else 0,
            "protein_g": fact.protein_g if fact else 0,
            "carbs_g": fact.carbs_g if fact else 0,
            "fat_g": fact.fat_g if fact else 0,
            "fiber_g": fact.fiber_g if fact else 0,
            "sodium_mg": fact.sodium_mg if fact else 0,
        },
        "source": "cache" if (
            barcode_record.cached_at and
            (datetime.utcnow() - barcode_record.cached_at).days < 7
        ) else "openfoodfacts"
    }