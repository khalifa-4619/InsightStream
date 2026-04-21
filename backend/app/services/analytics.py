import pandas as pd
import os

def analyze_file(file_path: str):
    """
    Detects file type, parses data, and extracts metadata/statistics.
    """
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        # 1. Routing the parsing logic based on extension
        if ext == '.csv':
            df = pd.read_csv(file_path)
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif ext == '.json':
            df = pd.read_json(file_path)
        elif ext == '.log' or ext == '.txt':
            # Simple log parsing (one line per entry)
            df = pd.read_csv(file_path, sep='\t', header=None, names=['Log Entry'])
        else:
            return {"error": f"Unsupported file extension: {ext}"}

        # 2. Extracting Intelligence
        stats = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": df.isnull().sum().to_dict(),
            "file_size_kb": round(os.path.getsize(file_path) / 1024, 2),
            "preview": df.head(5).to_dict(orient='records') # Very important for the UI!
        }
        
        return stats
    except Exception as e:
        return {"error": f"Analysis Engine Failure: {str(e)}"}