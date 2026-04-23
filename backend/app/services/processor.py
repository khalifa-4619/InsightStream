import pandas as pd
import numpy as np
import os

class InsightEngine:
    def __init__(self, file_path):
        self.file_path = file_path
        self.df = self._load_data()
        self.clean_df = None 

    def _load_data(self):
        """Reuses your analytics.py logic to handle multiple file types."""
        ext = os.path.splitext(self.file_path)[1].lower()
        
        try:
            if ext == '.csv':
                return pd.read_csv(self.file_path)
            elif ext in ['.xlsx', '.xls']:
                return pd.read_excel(self.file_path)
            elif ext == '.json':
                return pd.read_json(self.file_path)
            elif ext in ['.log', '.txt']:
                # Tab-separated logs as defined in your analytics.py
                return pd.read_csv(self.file_path, sep='\t', header=None, names=['Log Entry'])
            else:
                raise ValueError(f"Unsupported extension: {ext}")
        except Exception as e:
            print(f"Error loading file: {e}")
            return pd.DataFrame() # Return empty DF to prevent crashes

    def clean_data(self, fill_strategy="median", drop_threshold=0.5):
        df = self.df.copy()
        
        # 1. Drop sparsely populated columns
        limit = len(df) * drop_threshold
        df = df.dropna(thresh=limit, axis=1)
        
        # 2. Identify numeric columns for the current state of df
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        # 3. Apply filling strategy
        if fill_strategy == "median":
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
        elif fill_strategy == "mean":
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
            
        # 4. Handle Categorical nulls
        cat_cols = df.select_dtypes(include=['object']).columns
        df[cat_cols] = df[cat_cols].fillna("Unknown")
        
        self.clean_df = df
        return self.get_cleaning_summary() # Fixed typo
    
    def _get_working_df(self):
        """Helper to decide which data to analyze"""
        return self.clean_df if self.clean_df is not None else self.df

    def get_univariate(self):
        target_df = self._get_working_df()
        numeric_df = target_df.select_dtypes(include=[np.number])
        
        stats = {}
        for col in numeric_df.columns:
            if col.lower() == 'id':
                continue
            series = numeric_df[col].dropna()
            
            # 1. Calculate Histogram with bin edges
            counts, bin_edges = np.histogram(series, bins=10)
            
            # 2. Format for Recharts: [{"name": "10-20", "value": 50}, ...]
            formatted_hist = []
            for i in range(len(counts)):
                # Create a label like "10.5 - 20.1"
                bin_label = f"{round(bin_edges[i], 1)}-{round(bin_edges[i+1], 1)}"
                formatted_hist.append({
                    "name": bin_label, 
                    "value": int(counts[i]) # JS likes standard ints
                })

            stats[col] = {
                "summary": {
                    "mean": round(float(series.mean()), 2),
                    "median": round(float(series.median()), 2),
                    "std": round(float(series.std()), 2),
                    "min": float(series.min()),
                    "max": float(series.max()),
                },
                "histogram": formatted_hist
            }
        return stats
    
    def get_bivariate(self):
        target_df = self._get_working_df()
        numeric_df = target_df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            return {}
        # Returns correlation matrix as a dictionary for JSON
        return numeric_df.corr().to_dict()
    
    def get_multivariate(self):
        target_df = self._get_working_df()
        numeric_df = target_df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            return {}
            
        return {
            "covariance": numeric_df.cov().to_dict(),
            "columns": list(numeric_df.columns)
        }
    
    def get_cleaning_summary(self):
        if self.clean_df is None:
            return {"status": "error", "message": "Data not yet cleaned"}
            
        return {
            "status": "cleaned",
            "rows_after": len(self.clean_df),
            "nulls_remaining": int(self.clean_df.isnull().sum().sum()),
            "preview": self.clean_df.head(5).to_dict(orient='records')
        }