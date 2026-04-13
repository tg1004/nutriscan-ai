from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from uuid import uuid4
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.meal_log import MealLog, LogItem
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter(prefix="/logs", tags=["Logs"])


class LogItemInput(BaseModel):
    food_item_id: str
    quantity_grams: float
    quantity_pieces: float = 1.0
    source: str = "home"
    oil_used: str = "none"
    oil_grams: float = 0
    extra_ingredients: list = []
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    sugar_g: float = 0
    sodium_mg: float = 0
    calcium_mg: float = 0
    iron_mg: float = 0
    vitamin_c_mg: float = 0
    vitamin_a_ug: float = 0
    potassium_mg: float = 0


class CreateLogRequest(BaseModel):
    meal_type: str
    log_date: Optional[str] = None
    items: list[LogItemInput]


@router.post("", status_code=201)
def create_log(
    request: CreateLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log_date = date.fromisoformat(request.log_date) if request.log_date else date.today()

    # Compute totals
    total_calories = sum(i.calories for i in request.items)
    total_protein = sum(i.protein_g for i in request.items)
    total_carbs = sum(i.carbs_g for i in request.items)
    total_fat = sum(i.fat_g for i in request.items)
    total_fiber = sum(i.fiber_g for i in request.items)

    meal_log = MealLog(
        id=uuid4(),
        user_id=current_user.id,
        log_date=log_date,
        meal_type=request.meal_type,
        total_calories=total_calories,
        total_protein_g=total_protein,
        total_carbs_g=total_carbs,
        total_fat_g=total_fat,
        total_fiber_g=total_fiber,
    )
    db.add(meal_log)
    db.flush()

    for item in request.items:
        log_item = LogItem(
            id=uuid4(),
            meal_log_id=meal_log.id,
            food_item_id=item.food_item_id,
            quantity_grams=item.quantity_grams,
            quantity_pieces=item.quantity_pieces,
            source=item.source,
            oil_used=item.oil_used,
            oil_grams=item.oil_grams,
            extra_ingredients=item.extra_ingredients,
            calories=item.calories,
            protein_g=item.protein_g,
            carbs_g=item.carbs_g,
            fat_g=item.fat_g,
            fiber_g=item.fiber_g,
            sugar_g=item.sugar_g,
            sodium_mg=item.sodium_mg,
            calcium_mg=item.calcium_mg,
            iron_mg=item.iron_mg,
            vitamin_c_mg=item.vitamin_c_mg,
            vitamin_a_ug=item.vitamin_a_ug,
            potassium_mg=item.potassium_mg,
        )
        db.add(log_item)

    db.commit()
    db.refresh(meal_log)
    return {"id": str(meal_log.id), "message": "Meal logged successfully"}


@router.get("")
def get_logs(
    log_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date.fromisoformat(log_date) if log_date else date.today()
    logs = db.query(MealLog).filter(
        MealLog.user_id == current_user.id,
        MealLog.log_date == target_date
    ).all()

    result = []
    for log in logs:
        result.append({
            "id": str(log.id),
            "meal_type": log.meal_type,
            "log_date": str(log.log_date),
            "total_calories": log.total_calories,
            "total_protein_g": log.total_protein_g,
            "total_carbs_g": log.total_carbs_g,
            "total_fat_g": log.total_fat_g,
            "total_fiber_g": log.total_fiber_g,
            "items": [
                {
                    "id": str(item.id),
                    "food_item_id": str(item.food_item_id),
                    "quantity_grams": item.quantity_grams,
                    "calories": item.calories,
                    "protein_g": item.protein_g,
                    "carbs_g": item.carbs_g,
                    "fat_g": item.fat_g,
                }
                for item in log.items
            ]
        })
    return result


@router.get("/summary")
def get_summary(
    from_date: str,
    to_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns daily totals between two dates for charts."""
    start = date.fromisoformat(from_date)
    end = date.fromisoformat(to_date)

    logs = db.query(MealLog).filter(
        MealLog.user_id == current_user.id,
        MealLog.log_date >= start,
        MealLog.log_date <= end
    ).all()

    # Group by date
    by_date = {}
    for log in logs:
        d = str(log.log_date)
        if d not in by_date:
            by_date[d] = {
                "date": d,
                "calories": 0, "protein_g": 0,
                "carbs_g": 0, "fat_g": 0, "fiber_g": 0
            }
        by_date[d]["calories"] += log.total_calories or 0
        by_date[d]["protein_g"] += log.total_protein_g or 0
        by_date[d]["carbs_g"] += log.total_carbs_g or 0
        by_date[d]["fat_g"] += log.total_fat_g or 0
        by_date[d]["fiber_g"] += log.total_fiber_g or 0

    return sorted(by_date.values(), key=lambda x: x["date"])


@router.delete("/{log_id}")
def delete_log(
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(MealLog).filter(
        MealLog.id == log_id,
        MealLog.user_id == current_user.id
    ).first()
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"message": "Deleted"}