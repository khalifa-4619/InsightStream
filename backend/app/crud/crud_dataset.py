from sqlalchemy.orm import Session
from app.models.dataset import Dataset
from app.schemas.data_schema import DataFileCreate
import math

def create_dataset(db: Session, dataset: DataFileCreate, owner_id: int):
    # Convert Pydantic model to a raw dict 
    dataset_dict = dataset.model_dump()
    # Now clean the data
    cleaned_data = clean_for_json(dataset_dict)
    
    db_dataset = Dataset(
        filename=cleaned_data['filename'],
        filepath=cleaned_data['filepath'],
        file_typ=cleaned_data['file_typ'],
        owner_id=owner_id,
        status="completed" if cleaned_data.get('summary_stats') else "uploaded",
        summary_stats=cleaned_data['summary_stats'] # This saves the JSON to postgres
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    return db_dataset

def get_user_datasets(db: Session, owner_id: int):
    """
    Fetches all datasets belonging to a specific user, sorted by the newest first.
    """
    return db.query(Dataset).filter(Dataset.owner_id == owner_id).order_by(Dataset.created_at.desc()).all()





def clean_for_json(data):
    """
    Recursively replaces NaN/inf with None.
    Handles dicts, lists, and floats.
    """
    if isinstance(data, dict):
        return {k: clean_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_for_json(v) for v in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return None
        return data
    # Handle Pydantic models if they accidentally slip in
    elif hasattr(data, "model_dump"):
        return clean_for_json(data.model_dump())
    return data