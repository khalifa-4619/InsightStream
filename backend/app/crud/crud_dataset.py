from sqlalchemy.orm import Session
from app.models.dataset import Dataset
from app.schemas.data_schema import DataFileCreate

def create_dataset(db: Session, dataset: DataFileCreate, owner_id: int):
    db_dataset = Dataset(
        filename=dataset.filename,
        filepath=dataset.filepath,
        file_typ=dataset.file_typ,
        owner_id=owner_id,
        status="completed" if dataset.summary_stats else "uploaded",
        summary_stats=dataset.summary_stats # This saves the JSON to postgres
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    return db_dataset

def get_user_datasets(db: Session, owner_id: int):
    """
    Fetches all datasets belonging to a specific user, sorted by the newest first.
    """
    return db.query(Dataset).filter(Dataset.owner_id == owner_id).order_by(Dataset.created_at.desc()).all( )