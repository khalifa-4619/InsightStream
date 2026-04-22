from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.dataset import Dataset
from app.services.processor import InsightEngine
# Import your security dependency if you have it
# from app.api.deps import get_current_user 

router = APIRouter()

@router.post("/process/{dataset_id}")
async def process_dataset(
    dataset_id: int, 
    task: str, 
    db: Session = Depends(get_db)
):
    # 1. Fetch dataset from DB
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found in InsightStream")

    # 2. Initialize the Engine with the physical filepath we just added
    try:
        engine = InsightEngine(dataset.filepath)
        
        # 3. Task Routing
        if task == "clean":
            return engine.clean_data(fill_strategy="median")
        elif task == "univariate":
            return engine.get_univariate()
        elif task == "bivariate":
            return engine.get_bivariate()
        else:
            raise HTTPException(status_code=400, detail="Unknown engineering task")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processor Error: {str(e)}")