from fastapi import FastAPI, Depends, HTTPException,UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.dataset import Dataset
from app.models.user import User
from app.schemas.user_schema import UserCreate, UserOut
from app.crud import crud_user as user_crud, crud_dataset
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.token_schema import Token
from app.schemas.data_schema import DataFileOut, DataFileCreate
from app.services.analytics import analyze_csv
from datetime import timedelta
from typing import List
import shutil
import os

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

# Create a folder to store uploads if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
    
@app.post("/datasets/upload", response_model=DataFileOut)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user) # The Security Guard
):
    # Validation (ensure it's a CSV)
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    # Save the physical file to disk
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Analyze the file immediately after saving
    analysis_results = analyze_csv(file_path)
        
    # Save the metadata to the Database via ORM
    dataset_in = DataFileCreate(
        filename=file.filename,
        file_typ="csv",
        summary_stats=analysis_results
    )
    return crud_dataset.create_dataset(
        db,
        dataset_in,
        owner_id=current_user.id
        )
    

@app.get("/datasets/", response_model=List[DataFileOut])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user)
):
    """
    Retrieve all datasets for the authenticated user.
    """
    datasets = crud_dataset.get_user_datasets(db, owner_id=current_user.id)
    return datasets
    