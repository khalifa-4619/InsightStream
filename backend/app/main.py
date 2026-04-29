from fastapi import FastAPI, Depends, HTTPException,UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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
from app.services.analytics import analyze_file
from datetime import timedelta
from typing import List
from app.api.endpoints import analytics
import shutil
import os
import pandas as pd
import io

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

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
    current_user: User = Depends(user_crud.get_current_user)
):
    # Expanded Validation
    allowed_extensions = {'.csv', '.xlsx', '.xls', '.json', '.log', '.txt'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Extension {file_ext} not supported. Use CSV, Excel, JSON, or Logs."
        )
    
    # Save the physical file
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Keep a copy as the untouched original
    original_path = os.path.join(UPLOAD_DIR, f"original_{current_user.id}_{file.filename}")
    shutil.copy(file_path, original_path)
        
    # Use the new generalized analyzer
    analysis_results = analyze_file(file_path)
    
    if "error" in analysis_results:
        raise HTTPException(status_code=422, detail=analysis_results["error"])
        
    # Save the metadata to the Database via ORM
    dataset_in = DataFileCreate(
        filename=file.filename,
        filepath=file_path,
        original_filepath=original_path,
        file_typ=file_ext.replace('.', ''), # 'csv', 'xlsx', etc.
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

@app.delete("/datasets/{dataset_id}", status_code=status.HTTP_200_OK)
def remove_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User=Depends(user_crud.get_current_user)
):
    success = crud_dataset(
        db=db,
        dataset_id=dataset_id,
        owner_id=current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found or unauthorized access."
        )
    return {"message": f"Dataset {dataset_id} and associated files have been purged."}

@app.get("/datasets/{dataset_id}/download")
def download_original_file(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user)
):
    """Download the original uploaded file."""
    dataset = crud_dataset.get_dataset(db, dataset_id, current_user.id)
    if not dataset or not dataset.original_filepath:
        raise HTTPException(status_code=404, detail="Original file not found")
    if not os.path.exists(dataset.original_filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        path=dataset.original_filepath,
        filename=dataset.filename,
        media_type='application/octet-stream'
    )


@app.get("/datasets/{dataset_id}/download/cleaned")
def download_cleaned_file(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user)
):
    """
    Download the cleaned dataset (if it exists).
    The cleaned file is saved at the same path as the original (after cleaning).
    """
    dataset = crud_dataset.get_dataset(db, dataset_id, current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not os.path.exists(dataset.filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=dataset.filepath,
        filename=f"cleaned_{dataset.filename}",
        media_type='application/octet-stream'
    )
    
# Mounting the analytics router
app.include_router(analytics.router, prefix="/api")