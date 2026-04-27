from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.dataset import Dataset
from app.services.processor import InsightEngine
from typing import Optional, List, Dict
import pandas as pd
import os

router = APIRouter()

@router.post("/process/{dataset_id}")
async def process_dataset(
    dataset_id: int, 
    task: str, 
    payload: Optional[Dict] = Body(None),
    db: Session = Depends(get_db)
):
    # 1. Fetch dataset from DB
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found in InsightStream")

    try:
        engine = InsightEngine(dataset.filepath)
        
        if task == "clean":
            result = engine.clean_data(fill_strategy="median")
            # Save cleaned data back to disk
            if engine.clean_df is not None:
                engine.clean_df.to_csv(dataset.filepath, index=False)
                print(f"💾 Cleaned data saved to {dataset.filepath}")
            return result
            
        elif task == "univariate":
            return {
                "univariate": engine.get_univariate(),
                "global_insights": engine.get_global_insights()
            }
            
        elif task == "bivariate":
            return engine.get_bivariate()
        
        elif task == "apply_recommendations":
            if not payload or "recommendations" not in payload:
                raise HTTPException(status_code=400, detail="Missing recommendations payload")

            # Apply recommendations
            apply_result = engine.apply_recommendations(payload["recommendations"])
            
            # ✨ CRITICAL: Save the cleaned data back to the original file
            if engine.clean_df is not None:
                # Save to the same file path (overwrites original)
                engine.clean_df.to_csv(dataset.filepath, index=False)
                print(f"💾 Applied recommendations and saved to {dataset.filepath}")
                
                # Update the summary stats in the database
                dataset.summary_stats = {
                    "row_count": len(engine.clean_df),
                    "column_count": len(engine.clean_df.columns),
                    "missing_values": int(engine.clean_df.isnull().sum().sum()),
                    "columns": engine.clean_df.columns.tolist()
                }
                db.commit()
                print("📊 Updated dataset metadata in database")
            
            # Get updated insights from the same engine instance
            updated_univariate = engine.get_univariate()
            updated_insights = engine.get_global_insights()
            
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