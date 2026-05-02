from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.user_schema import UserCreate
from app.core.security import get_password_hash

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_user_by_email(db: Session, email: str):
    """Fetch a single user by email address."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    """Fetch a single user by primary key."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user: UserCreate):
    """Create a new user with hashed password."""
    hashed_password = get_password_hash(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        is_premium=False,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """Dependency that extracts and validates the JWT, then returns the User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user


def update_user(db: Session, user: User, update_data: dict):
    """Update arbitrary fields on a user object and persist."""
    for key, value in update_data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user