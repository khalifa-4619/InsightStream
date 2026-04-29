from sqlalchemy.orm import Session
from app.models.dataset import Dataset
from app.schemas.data_schema import DataFileCreate
import math
import os

def create_dataset(db: Session, dataset: DataFileCreate, owner_id: int):
    dataset_dict = dataset.model_dump()
    cleaned_data = clean_for_json(dataset_dict)
    
    db_dataset = Dataset(
        filename=cleaned_data['filename'],
        filepath=cleaned_data['filepath'],
        original_filepath=cleaned_data.get('original_filepath'),
        file_typ=cleaned_data['file_typ'],
        owner_id=owner_id,
        status="completed" if cleaned_data.get('summary_stats') else "uploaded",
        summary_stats=cleaned_data['summary_stats']
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    return db_dataset

def get_user_datasets(db: Session, owner_id: int):
    return db.query(Dataset).filter(Dataset.owner_id == owner_id).order_by(Dataset.created_at.desc()).all()

def get_dataset(db: Session, dataset_id: int, owner_id: int):
    """Fetch a single dataset belonging to a user."""
    return db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.owner_id == owner_id
    ).first()

def delete_dataset(db: Session, dataset_id: int, owner_id: int):
    db_dataset = get_dataset(db, dataset_id, owner_id)
    if not db_dataset:
        return False
    
    # Remove physical file if it exists
    if os.path.exists(db_dataset.filepath):
        try:
            os.remove(db_dataset.filepath)           # ✅ corrected attribute
        except Exception as e:
            print(f"Error deleting file: {e}")
    
    db.delete(db_dataset)
    db.commit()
    return True

def clean_for_json(data):
    if isinstance(data, dict):
        return {k: clean_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_for_json(v) for v in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return None
        return data
    elif hasattr(data, "model_dump"):
        return clean_for_json(data.model_dump())
    return data