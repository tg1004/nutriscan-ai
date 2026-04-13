from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.profile import UserProfile
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token

def register_user(request: RegisterRequest, db: Session) -> TokenResponse:
    """Register a new user and return tokens immediately."""

    # Check if email is already taken
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Create the user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password)
    )
    db.add(user)
    db.flush()  # gets the user.id without committing yet

    # Create an empty profile for this user
    profile = UserProfile(user_id=user.id)
    db.add(profile)
    db.commit()
    db.refresh(user)

    # Generate tokens
    token_data = {"sub": str(user.id), "email": user.email}
    return {
    "access_token": create_access_token(token_data),
    "refresh_token": create_refresh_token(token_data),
    "token_type": "bearer",
    "onboarding_complete": False,  # new user always needs onboarding
}

def login_user(request: LoginRequest, db: Session) -> TokenResponse:
    """Verify credentials and return tokens."""

    user = db.query(User).filter(User.email == request.email).first()

    # Use the same error for both 'user not found' and 'wrong password'
    # This prevents attackers from knowing which accounts exist
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data)
    )