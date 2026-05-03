from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.dataset import Dataset
from app.services.processor import InsightEngine
from typing import Optional, Dict
from app.models.user import User
from app.services.logger import log_event
from app.crud import crud_user as user_crud, crud_dataset
import os

router = APIRouter()

@router.post("/process/{dataset_id}")
async def process_dataset(
    dataset_id: int,
    task: str,
    payload: Optional[Dict] = Body(None),
    db: Session = Depends(get_db),
    current_user = Depends(user_crud.get_current_user)
):
    # 1. Fetch dataset from DB
    dataset = crud_dataset.get_dataset(db, dataset_id, current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found in InsightStream")

    try:
        engine = InsightEngine(dataset.filepath)

        # ---------------------------------------------------------------
        # TASK: clean
        # ---------------------------------------------------------------
        if task == "clean":
            result = engine.clean_data(fill_strategy="median")
            _save_clean_data_and_update_metadata(engine, dataset, db)
            
            log_event(
                db=db,
                message=f"Global cleanse applied on dataset {dataset_id}",
                level="INFO",
                source="ENGINE",
                owner_id=current_user.id,
            )
    
            return result

        # ---------------------------------------------------------------
        # TASK: univariate
        # ---------------------------------------------------------------
        elif task == "univariate":
            
            log_event(
                    db=db,
                    message=f"Univariate analysis applied on dataset {dataset_id}",
                    level="INFO",
                    source="ENGINE",
                    owner_id=current_user.id,
                )
            
            return {
                "univariate": engine.get_univariate(),
                "categorical": engine.get_categorical(),
                "global_insights": engine.get_global_insights()
            }

        # ---------------------------------------------------------------
        # TASK: bivariate
        # ---------------------------------------------------------------
        elif task == "bivariate":
            
            log_event(
                db=db,
                message=f"Bivariate analysis applied on dataset {dataset_id}",
                level="INFO",
                source="ENGINE",
                owner_id=current_user.id,
            )
            return engine.get_bivariate()

        # ---------------------------------------------------------------
        # TASK: apply_recommendations
        # ---------------------------------------------------------------
        elif task == "apply_recommendations":
            if not payload or "recommendations" not in payload:
                raise HTTPException(status_code=400, detail="Missing recommendations payload")

            apply_result = engine.apply_recommendations(payload["recommendations"])
            _save_clean_data_and_update_metadata(engine, dataset, db)

            updated_univariate = engine.get_univariate()
            updated_insights = engine.get_global_insights()
            
            log_event(
                db=db,
                message=f"Recommendations applied on dataset {dataset_id}",
                level="INFO",
                source="ENGINE",
                owner_id=current_user.id,
            )

            return {
                "status": "recommendations_applied",
                "preview": apply_result.get("preview"),
                "message": "Successfully applied all recommendations",
                "new_score": updated_insights.get("data_quality_score"),
                "univariate": updated_univariate,
                "global_insights": updated_insights
            }

        else:
            raise HTTPException(status_code=400, detail="Unknown engineering task")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processor Error: {str(e)}")


def _save_clean_data_and_update_metadata(engine: InsightEngine, dataset: Dataset, db: Session):
    """
    Save the clean_df to disk in the original format and update DB metadata.
    """
    if engine.clean_df is None:
        return

    file_path = dataset.filepath
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    try:
        if ext == '.csv':
            engine.clean_df.to_csv(file_path, index=False)
            print(f"💾 Cleaned CSV saved to {file_path}")
        elif ext == '.xlsx':
            engine.clean_df.to_excel(file_path, index=False, engine='openpyxl')
            print(f"💾 Cleaned Excel (.xlsx) saved to {file_path}")
        elif ext == '.xls':
            engine.clean_df.to_excel(file_path, index=False, engine='xlwt')
            print(f"💾 Cleaned Excel (.xls) saved to {file_path}")
        else:
            # Fallback
            engine.clean_df.to_csv(file_path, index=False)
            print(f"⚠️ Unknown extension '{ext}', saved as CSV to {file_path}")
    except Exception as e:
        print(f"❌ Failed to save cleaned file: {e}")
        raise HTTPException(status_code=500, detail="Failed to persist cleaned data")

    # Update metadata
    existing_stats = dataset.summary_stats or {}
    existing_stats.update({
        "row_count": len(engine.clean_df),
        "column_count": len(engine.clean_df.columns),
        "missing_values": int(engine.clean_df.isnull().sum().sum()),
        "columns": engine.clean_df.columns.tolist()
    })
    dataset.summary_stats = existing_stats
    db.commit()
    print("📊 Updated dataset metadata in database")