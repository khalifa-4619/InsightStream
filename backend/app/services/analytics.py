import pandas as pd
import numpy as np
import os

def analyze_file(file_path: str):
    """
    Detects file type, parses data, and extracts metadata/statistics.
    All returned values are JSON-serializable.
    Guaranteed to return a safe structure even on failure.
    """
    def _detect_file_type(path):
        """Guess file type by reading magic bytes."""
        with open(path, "rb") as f:
            sig = f.read(4)
        if sig.startswith(b'PK'):
            return 'xlsx'
        elif sig.startswith(b'{') or sig.startswith(b'['):
            return 'json'
        else:
            return 'csv'

    def make_json_safe(obj):
        """Recursively convert pandas/numpy objects to JSON-safe primitives."""
        if isinstance(obj, dict):
            return {k: make_json_safe(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [make_json_safe(v) for v in obj]
        elif isinstance(obj, (pd.Timestamp, np.datetime64)):
            return str(obj)
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        return obj

    try:
        # 1. Load data using signature detection
        file_type = _detect_file_type(file_path)

        if file_type == 'xlsx':
            df = pd.read_excel(file_path, engine='openpyxl')
        elif file_type == 'json':
            df = pd.read_json(file_path)
        elif file_type == 'csv':
            try:
                df = pd.read_csv(file_path)
            except Exception:
                df = pd.read_csv(file_path, sep='\t', header=None, names=['Log Entry'])
        else:
            # Fallback to extension for older formats
            ext = os.path.splitext(file_path)[1].lower()
            if ext == '.xls':
                df = pd.read_excel(file_path, engine='xlrd')
            elif ext in ['.log', '.txt']:
                df = pd.read_csv(file_path, sep='\t', header=None, names=['Log Entry'])
            else:
                return {
                    "error": f"Unsupported file type",
                    "preview": []  # empty array to avoid Object.entries crash
                }

        # 2. Build safe stats
        preview_list = make_json_safe(df.head(5).to_dict(orient='records'))
        # Ensure preview is always a list (even if something went weird)
        if not isinstance(preview_list, list):
            preview_list = []

        stats = {
            "row_count": int(len(df)),
            "column_count": int(len(df.columns)),
            "columns": list(df.columns),
            "data_types": {str(col): str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": make_json_safe(df.isnull().sum().to_dict()),
            "file_size_kb": round(os.path.getsize(file_path) / 1024, 2),
            "preview": preview_list
        }
        return stats

    except Exception as e:
        # Graceful failure: return empty structure, not just an error string
        return {
            "error": f"Analysis Engine Failure: {str(e)}",
            "row_count": 0,
            "column_count": 0,
            "columns": [],
            "data_types": {},
            "missing_values": {},
            "file_size_kb": 0,
            "preview": []
        }