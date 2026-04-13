from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.food import (
    FoodItemResponse, IngredientResponse,
    ScanContextRequest, ScanContextResponse, BarcodeResponse
)
from app.services.food_service import (
    search_food, search_ingredients, compute_scan_nutrition
)
from app.services.barcode_service import lookup_barcode

router = APIRouter(prefix="/food", tags=["Food"])


@router.get("/search", response_model=list[FoodItemResponse])
def search_foods(
    q: str = Query(..., min_length=2, description="Search query"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Search the food catalogue by name."""
    return search_food(q, db)


@router.get("/ingredients/search", response_model=list[IngredientResponse])
def search_ingredient_list(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Search ingredients — shown to user as suggestions
    when they say 'I added something extra'.
    """
    return search_ingredients(q, db)


@router.post("/scan/context", response_model=ScanContextResponse)
def resolve_scan_context(
    request: ScanContextRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Called after ML model identifies a food AND user has answered:
      1. Home or restaurant?
      2. Any extra ingredients?
    Returns the full computed nutrition breakdown.
    """
    result = compute_scan_nutrition(
        food_item_id=request.food_item_id,
        quantity_pieces=request.quantity_pieces,
        source=request.source,
        extra_ingredient_ids=request.extra_ingredient_ids,
        db=db,
    )
    return ScanContextResponse(
        food_item_id=result.food_item_id,
        food_name=result.food_name,
        quantity_grams=result.quantity_grams,
        quantity_pieces=result.quantity_pieces,
        source=result.source,
        oil_used=result.oil_used,
        oil_grams=result.oil_grams,
        base_nutrients=result.base_nutrients.__dict__,
        oil_nutrients=result.oil_nutrients.__dict__,
        extra_nutrients=result.extra_nutrients.__dict__,
        total_nutrients=result.total_nutrients.__dict__,
        extra_ingredients=result.extra_ingredients,
    )


@router.get("/barcode/{barcode}", response_model=BarcodeResponse)
async def scan_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Look up a product by barcode.
    Checks local cache first, then calls OpenFoodFacts.
    The product is saved to the database automatically.
    """
    return await lookup_barcode(barcode, db)