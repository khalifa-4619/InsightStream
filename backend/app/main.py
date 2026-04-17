from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user_schema import UserCreate, UserOut
from app.crud import crud_user as user_crud
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.token_schema import Token
from datetime import timedelta

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

@app.get("/")
def read_root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "status": "online",
        "database": "connected"
    }
    
@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.1.0"}

@app.post("/signup", response_model=UserOut)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    user = user_crud.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email alreeady exists."
        )
    
    # Create the user
    new_user = user_crud.create_user(db, user=user_in)
    return new_user


@app.get("/users/{user_id}", response_model=UserOut)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = user_crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Find user by email
    user = user_crud.get_user_by_email(db, email=form_data.username) # OAuth2 uses 'username' field for email
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}