import pandas as pd
import os

def analyze_csv(file_path: str):
    """
    Opens a CSV and extracts basic metadata and statistics.
    """
    try:
        # Read the CSV (only the first few rows if the file is huge, but for now, the whole thing)
        df = pd.read_csv(file_path)
        
        # Extract basic info
        stats = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": df.isnull().sum().to_dict(),
            "file_size_kb": round(os.path.getsize(file_path) / 1024, 2)
        }
        
        return stats
    except Exception as e:
        return {"error": f"Could not analyze file: {str(e)}"}