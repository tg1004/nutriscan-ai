from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.meal_log import MealLog
from app.models.profile import UserProfile

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _get_targets(db: Session, user_id) -> dict:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile and profile.custom_targets:
        return profile.custom_targets
    return {
        "calories": 2000, "protein_g": 50, "carbs_g": 275,
        "fat_g": 65, "fiber_g": 28, "sodium_mg": 2300,
        "calcium_mg": 1000, "iron_mg": 18, "vitamin_c_mg": 90,
        "potassium_mg": 3500,
    }


@router.get("/daily")
def get_daily(
    log_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date.fromisoformat(log_date) if log_date else date.today()
    logs = db.query(MealLog).filter(
        MealLog.user_id == current_user.id,
        MealLog.log_date == target_date
    ).all()

    totals = {
        "calories": 0, "protein_g": 0, "carbs_g": 0,
        "fat_g": 0, "fiber_g": 0
    }
    meals = []
    for log in logs:
        totals["calories"] += log.total_calories or 0
        totals["protein_g"] += log.total_protein_g or 0
        totals["carbs_g"] += log.total_carbs_g or 0
        totals["fat_g"] += log.total_fat_g or 0
        totals["fiber_g"] += log.total_fiber_g or 0
        meals.append({
            "id": str(log.id),
            "meal_type": log.meal_type,
            "calories": log.total_calories,
            "protein_g": log.total_protein_g,
            "carbs_g": log.total_carbs_g,
            "fat_g": log.total_fat_g,
        })

    targets = _get_targets(db, current_user.id)

    # Check which nutrients exceed targets
    alerts = []
    for key, target in targets.items():
        consumed = totals.get(key, 0)
        if consumed > target * 1.1:  # 10% over target
            alerts.append({
                "nutrient": key,
                "consumed": round(consumed, 1),
                "target": target,
                "percent": round(consumed / target * 100, 1)
            })

    return {
        "date": str(target_date),
        "totals": {k: round(v, 1) for k, v in totals.items()},
        "targets": targets,
        "meals": meals,
        "alerts": alerts,
    }


@router.get("/weekly")
def get_weekly(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    week_ago = today - timedelta(days=6)

    logs = db.query(MealLog).filter(
        MealLog.user_id == current_user.id,
        MealLog.log_date >= week_ago,
        MealLog.log_date <= today
    ).all()

    by_date = {}
    for i in range(7):
        d = str(week_ago + timedelta(days=i))
        by_date[d] = {"date": d, "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}

    for log in logs:
        d = str(log.log_date)
        if d in by_date:
            by_date[d]["calories"] += log.total_calories or 0
            by_date[d]["protein_g"] += log.total_protein_g or 0
            by_date[d]["carbs_g"] += log.total_carbs_g or 0
            by_date[d]["fat_g"] += log.total_fat_g or 0

    targets = _get_targets(db, current_user.id)
    return {
        "days": list(by_date.values()),
        "targets": targets
    }


@router.get("/monthly")
def get_monthly(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    month_ago = today - timedelta(days=29)

    logs = db.query(MealLog).filter(
        MealLog.user_id == current_user.id,
        MealLog.log_date >= month_ago,
        MealLog.log_date <= today
    ).all()

    by_date = {}
    for i in range(30):
        d = str(month_ago + timedelta(days=i))
        by_date[d] = {"date": d, "calories": 0}

    for log in logs:
        d = str(log.log_date)
        if d in by_date:
            by_date[d]["calories"] += log.total_calories or 0

    return {"days": list(by_date.values())}