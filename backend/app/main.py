from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.dataset import Dataset
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.schemas.user_schema import UserCreate, UserOut, UserUpdate
from app.crud import crud_user as user_crud, crud_dataset
from app.core.config import settings
from app.core.security import verify_password, create_access_token, decode_token
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.token_schema import Token
from app.schemas.data_schema import DataFileOut, DataFileCreate
from app.services.analytics import analyze_file
from datetime import timedelta, datetime, timezone
from typing import List
from app.api.endpoints import analytics
from app.services.logger import log_event, active_connections
import shutil
import os
import pandas as pd
import io
import time

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

# Mount uploads directory for static access
os.makedirs("uploads/profile_pics", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    # Only log API calls
    if request.url.path.startswith("/api") or request.url.path.startswith("/datasets"):
        method = request.method
        status_code = response.status_code
        level = "ERROR" if status_code >= 400 else "INFO"
        print(f"[{level}] {method} {request.url.path} -> {status_code} ({duration:.2f}s)")

    return response


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


# -------------------------------------------------------------------
# USER ENDPOINTS
# -------------------------------------------------------------------
# --- Current user profile ---
@app.get("/users/me", response_model=UserOut)
def read_my_profile(current_user: User = Depends(user_crud.get_current_user)):
    return current_user


@app.put("/users/me", response_model=UserOut)
def update_my_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user),
):
    updated = user_crud.update_user(db, current_user, {"name": user_update.name})
    log_event(db, f"User '{current_user.email}' updated profile name", source="USER", owner_id=current_user.id)
    return updated


# --- Profile picture ---
@app.post("/users/me/picture", response_model=UserOut)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, GIF, WEBP allowed")

    timestamp = int(datetime.now(timezone.utc).timestamp())
    ext = file.filename.split(".")[-1]
    filename = f"user_{current_user.id}_{timestamp}.{ext}"
    relative_path = f"profile_pics/{filename}"          # ✅ fixed f-string
    full_path = os.path.join("uploads", relative_path)
    with open(full_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    updated = user_crud.update_user(db, current_user, {"profile_picture": relative_path})
    log_event(db, f"User '{current_user.email}' uploaded a new profile picture", source="USER", owner_id=current_user.id)
    return updated


@app.get("/users/{user_id}", response_model=UserOut)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user),
):
    # Users can only view their own profile
    if current_user.id != user_id:
        raise HTTPException(status_code=404, detail="User not found")
    db_user = user_crud.get_user_by_id(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.post("/signup", response_model=UserOut)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    user = user_crud.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )

    # Create the user
    new_user = user_crud.create_user(db, user=user_in)
    return new_user




@app.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = user_crud.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# -------------------------------------------------------------------
# DATASET ENDPOINTS
# -------------------------------------------------------------------

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


@app.post("/datasets/upload", response_model=DataFileOut)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user)
):
    allowed_extensions = {'.csv', '.xlsx', '.xls', '.json', '.log', '.txt'}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Extension {file_ext} not supported. Use CSV, Excel, JSON, or Logs."
        )

    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    original_path = os.path.join(UPLOAD_DIR, f"original_{current_user.id}_{file.filename}")
    shutil.copy(file_path, original_path)

    analysis_results = analyze_file(file_path)

    if "error" in analysis_results:
        raise HTTPException(status_code=422, detail=analysis_results["error"])

    dataset_in = DataFileCreate(
        filename=file.filename,
        filepath=file_path,
        original_filepath=original_path,
        file_typ=file_ext.replace('.', ''),
        summary_stats=analysis_results
    )
    log_event(
        db=db,
        message=f"Dataset '{file.filename}' uploaded ({file_ext})",
        level="INFO",
        source="DATASET",
        owner_id=current_user.id
    )
    return crud_dataset.create_dataset(db, dataset_in, owner_id=current_user.id)


@app.get("/datasets/", response_model=List[DataFileOut])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user)
):
    datasets = crud_dataset.get_user_datasets(db, owner_id=current_user.id)
    return datasets


@app.delete("/datasets/{dataset_id}", status_code=status.HTTP_200_OK)
def remove_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user)
):
    success = crud_dataset.delete_dataset(
        db=db,
        dataset_id=dataset_id,
        owner_id=current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found or unauthorized access."
        )

    log_event(db=db, message=f"Dataset {dataset_id} deleted", level="WARNING", source="DATASET", owner_id=current_user.id)
    return {"message": f"Dataset {dataset_id} and associated files have been purged."}


@app.get("/datasets/{dataset_id}/download")
def download_original_file(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user)
):
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


# -------------------------------------------------------------------
# LOGS & WEBSOCKET
# -------------------------------------------------------------------

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=1008)
        return

    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008)
        return

    db = next(get_db())
    user = user_crud.get_user_by_email(db, email=payload.get("sub"))
    if not user:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    active_connections.append((websocket, user.id))

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove((websocket, user.id))


@app.get("/logs/")
def get_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_crud.get_current_user),
):
    logs = (
        db.query(ActivityLog)
        .filter(
            (ActivityLog.owner_id == current_user.id)
            | (ActivityLog.owner_id == None)
        )
        .order_by(ActivityLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "level": log.level,
            "source": log.source,
            "message": log.message,
            "owner_id": log.owner_id,
        }
        for log in logs
    ]


# -------------------------------------------------------------------
# ANALYTICS ROUTER
# -------------------------------------------------------------------

app.include_router(analytics.router, prefix="/api")