from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.services.auth_service import register_user, login_user
from app.core.security import decode_token
from fastapi import HTTPException, status

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new account and return access + refresh tokens."""
    return register_user(request, db)

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Log in and return access + refresh tokens."""
    return login_user(request, db)

@router.post("/refresh", response_model=TokenResponse)
def refresh(request: RefreshRequest):
    """Exchange a valid refresh token for a new access token."""
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )
    from app.core.security import create_access_token, create_refresh_token
    token_data = {"sub": payload["sub"], "email": payload["email"]}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data)
    )