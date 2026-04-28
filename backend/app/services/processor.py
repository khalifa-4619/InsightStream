import pandas as pd
import numpy as np
import os
import logging

# Configure logging to show messages in terminal (with level INFO)
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


class InsightEngine:
    """
    Core data processing engine for InsightStream.
    Handles data loading, cleaning, analysis, and recommendation application.
    """

    # ------------------------------------------------------------------
    # Configurable thresholds (can be overridden per instance)
    # ------------------------------------------------------------------
    SKEW_THRESHOLD = 2.0          # abs(skew) above this triggers warning
    OUTLIER_PCT_THRESHOLD = 5.0   # outlier percentage over this triggers critical
    LOW_VARIANCE_CV = 0.001       # CV below this triggers info

    def __init__(self, file_path):
        """
        Initialize the engine with a file path.
        
        Args:
            file_path: Path to the dataset file
        """
        self.file_path = file_path
        self.df = self._load_data()                # Original data loaded from disk
        self.clean_df = None                        # Cleaned version (set after cleaning operations)
        self.duplicates_removed = 0                 # Track duplicates removed during cleaning
        self.original_row_count = len(self.df)      # Original row count before cleaning

    def _load_data(self):
        """
        Load data from various file formats using file signature detection.
        Supports: CSV, Excel (xlsx/xls), JSON, Log/TXT files.
        """
        try:
            file_type = self._detect_file_type(self.file_path)
            logger.info(f"📂 Detected file type: {file_type} for {self.file_path}")

            df = None

            if file_type == "xlsx":
                df = pd.read_excel(self.file_path, engine='openpyxl')
                logger.info(f"✅ Excel loaded: {df.shape[0]} rows, {df.shape[1]} columns")
                # If Excel file is empty, it may actually be a CSV with wrong extension
                if df.empty:
                    logger.info("⚠️ Excel file is empty, trying to read as CSV instead...")
                    df = pd.read_csv(self.file_path)
                    logger.info(f"✅ Fallback CSV loaded: {df.shape[0]} rows, {df.shape[1]} columns")
                return df

            elif file_type == "json":
                df = pd.read_json(self.file_path)
                logger.info(f"✅ JSON loaded: {df.shape[0]} rows, {df.shape[1]} columns")
                return df

            elif file_type == "csv":
                try:
                    df = pd.read_csv(self.file_path)
                except Exception:
                    df = pd.read_csv(self.file_path, sep='\t', header=None, names=['Log Entry'])
                logger.info(f"✅ CSV loaded: {df.shape[0]} rows, {df.shape[1]} columns")
                return df

            else:
                ext = os.path.splitext(self.file_path)[1].lower()
                if ext in ['.log', '.txt']:
                    df = pd.read_csv(self.file_path, sep='\t', header=None, names=['Log Entry'])
                    logger.info(f"✅ Log loaded: {df.shape[0]} rows, {df.shape[1]} columns")
                    return df
                elif ext == '.xls':
                    df = pd.read_excel(self.file_path, engine='xlrd')
                    logger.info(f"✅ Old Excel loaded: {df.shape[0]} rows, {df.shape[1]} columns")
                    return df
                else:
                    raise ValueError(f"Unsupported file type: {file_type} (extension: {ext})")

        except Exception as e:
            logger.error(f"Error loading file: {e}")
            return pd.DataFrame()

    @staticmethod
    def _detect_file_type(file_path):
        """Detect file type by reading magic bytes, skipping leading whitespace."""
        with open(file_path, "rb") as f:
            # Read enough bytes to skip any whitespace in front of JSON
            start = f.read(20).lstrip()

        if not start:   # empty file
            return "csv"

        if start.startswith(b'PK'):
            # Confirm it's really an Excel file (xlsx/xlsm)
            ext = os.path.splitext(file_path)[1].lower()
            if ext in ['.xlsx', '.xlsm']:
                return "xlsx"
            else:
                # If extension doesn't match, treat as xlsx anyway (ZIP-based)
                return "xlsx"
        elif start.startswith(b'{') or start.startswith(b'['):
            return "json"
        else:
            return "csv"

    # ------------------------------------------------------------------
    # Data Cleaning
    # ------------------------------------------------------------------
    def clean_data(self, fill_strategy="median", drop_threshold=0.5, remove_duplicates=True):
        """
        Perform comprehensive data cleaning.
        
        Steps:
        1. Remove duplicate rows
        2. Drop columns with too many missing values
        3. Fill numeric missing values (median/mean)
        4. Fill categorical missing values with "Unknown"
        """
        df = self.df.copy()

        if df.empty:
            self.clean_df = df
            return self.get_cleaning_summary()

        # 1. REMOVE DUPLICATES
        if remove_duplicates:
            before = len(df)
            df = df.drop_duplicates()
            after = len(df)
            self.duplicates_removed = before - after
        else:
            self.duplicates_removed = 0

        # 2. DROP SPARSE COLUMNS
        limit = int(len(df) * drop_threshold)
        df = df.dropna(thresh=limit, axis=1)

        # 3. IDENTIFY COLUMN TYPES
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        cat_cols = df.select_dtypes(include=['object']).columns

        # 4. FILL NUMERIC VALUES
        if len(numeric_cols) > 0:
            if fill_strategy == "median":
                df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
            elif fill_strategy == "mean":
                df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())

        # 5. FILL CATEGORICAL VALUES
        if len(cat_cols) > 0:
            df[cat_cols] = df[cat_cols].fillna("Unknown")

        self.clean_df = df
        return self.get_cleaning_summary()

    def _get_working_df(self):
        """Return cleaned DataFrame if available, else original."""
        return self.clean_df if self.clean_df is not None else self.df

    # ------------------------------------------------------------------
    # Column insights
    # ------------------------------------------------------------------
    def _generate_column_insights(self, series, col_name):
        """
        Analyze a single numeric column and generate insights.
        Uses configurable thresholds.
        """
        insights = []

        series = series.replace([np.inf, -np.inf], np.nan).dropna()
        if series.empty:
            return [{"type": "info", "text": "Column contains no valid numeric data."}]

        mean_val = series.mean()
        std_val = series.std()

        # Constant / near-constant
        if std_val == 0 or len(series.unique()) <= 2:
            return [{"type": "info", "text": "This column has low variance (constant or near-constant values)."}]

        # Skewness
        skew_val = series.skew()
        if abs(skew_val) > self.SKEW_THRESHOLD:
            direction = "right" if skew_val > 0 else "left"
            insights.append({
                "type": "warning",
                "text": f"Significant {direction} skew detected ({skew_val:.2f}). Distribution is non-normal."
            })

        # Outliers
        z_scores = ((series - mean_val) / std_val).abs()
        outliers_count = int((z_scores > 3).sum())
        outlier_percentage = (outliers_count / len(series)) * 100 if len(series) > 0 else 0
        if outlier_percentage > self.OUTLIER_PCT_THRESHOLD:
            insights.append({
                "type": "critical",
                "text": f"Found {outliers_count} extreme outliers ({outlier_percentage:.1f}%). These may distort statistical results."
            })

        # Low variance (CV)
        if mean_val != 0:
            cv = std_val / abs(mean_val)
            if cv < self.LOW_VARIANCE_CV:
                insights.append({"type": "info", "text": "Very low variance detected: feature may have limited predictive power."})

        return insights

    # ------------------------------------------------------------------
    # Univariate Analysis
    # ------------------------------------------------------------------
    def get_univariate(self):
        target_df = self._get_working_df()
        logger.info(f"🔬 get_univariate: working_df shape = {target_df.shape}")
        if target_df.empty:
            return {}

        numeric_df = target_df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            return {}

        stats = {}
        for col in numeric_df.columns:
            if col.lower() == 'id':
                continue

            series = numeric_df[col].replace([np.inf, -np.inf], np.nan).dropna()
            if series.empty:
                continue

            mean_val = float(series.mean())
            std_val = float(series.std())

            # Histogram
            try:
                counts, bin_edges = np.histogram(series, bins=10)
            except Exception:
                continue

            formatted_hist = [
                {
                    "name": f"{round(bin_edges[i], 1)}-{round(bin_edges[i+1], 1)}",
                    "value": int(counts[i])
                }
                for i in range(len(counts))
            ]

            col_insights = self._generate_column_insights(series, col)

            stats[col] = {
                "summary": {
                    "mean": round(mean_val, 2),
                    "median": round(float(series.median()), 2),
                    "std": round(std_val, 2),
                    "min": float(series.min()),
                    "max": float(series.max()),
                },
                "histogram": formatted_hist,
                "insights": col_insights
            }

        return stats

    # ------------------------------------------------------------------
    # Bivariate Analysis (Correlation)
    # ------------------------------------------------------------------
    def get_bivariate(self):
        target_df = self._get_working_df()
        if target_df.empty:
            return {}

        numeric_df = target_df.select_dtypes(include=[np.number])
        if numeric_df.empty or len(numeric_df.columns) < 2:
            return {}

        numeric_df = numeric_df.loc[:, [c for c in numeric_df.columns if c.lower() != 'id']]
        if len(numeric_df.columns) < 2:
            return {}

        corr_matrix = numeric_df.corr().round(2)

        # Detect highly correlated pairs (only upper triangle)
        corr_insights = []
        cols = corr_matrix.columns.tolist()
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                val = corr_matrix.iloc[i, j]
                if abs(val) > 0.8:
                    severity = "critical" if abs(val) > 0.9 else "warning"
                    corr_insights.append({
                        "type": severity,
                        "text": f"High correlation ({val}) between '{cols[i]}' and '{cols[j]}'. Consider removing one to avoid redundancy."
                    })

        # Full matrix for frontend (upper triangle only, lower triangle can be mirrored)
        formatted_corr = []
        for i in range(len(cols)):
            for j in range(len(cols)):
                # Only store upper triangle values (or full symmetric; frontend expects both)
                formatted_corr.append({
                    "x": cols[i],
                    "y": cols[j],
                    "value": float(corr_matrix.iloc[i, j])
                })

        return {
            "matrix": formatted_corr,
            "columns": cols,
            "insights": corr_insights
        }

    # ------------------------------------------------------------------
    # Multivariate
    # ------------------------------------------------------------------
    def get_multivariate(self):
        target_df = self._get_working_df()
        if target_df.empty:
            return {}

        numeric_df = target_df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            return {}

        return {
            "covariance": numeric_df.cov().to_dict(),
            "columns": list(numeric_df.columns)
        }

    # ------------------------------------------------------------------
    # Cleaning Summary
    # ------------------------------------------------------------------
    def get_cleaning_summary(self):
        if self.clean_df is None:
            return {"status": "error", "message": "Data not yet cleaned"}

        return {
            "status": "cleaned",
            "rows_after": len(self.clean_df),
            "duplicates_removed": getattr(self, "duplicates_removed", 0),
            "nulls_remaining": int(self.clean_df.isnull().sum().sum()),
            "preview": self.clean_df.head(5).to_dict(orient='records')
        }

    # ------------------------------------------------------------------
    # Global Insights & Data Quality Score
    # ------------------------------------------------------------------
    def get_global_insights(self):
        target_df = self._get_working_df()

        if target_df.empty:
            return {}

        numeric_df = target_df.select_dtypes(include=[np.number])

        all_issues = []
        column_issue_count = {}

        for col in numeric_df.columns:
            if col.lower() == "id":
                continue
            series = numeric_df[col]
            insights = self._generate_column_insights(series, col)
            column_issue_count[col] = len(insights)
            for ins in insights:
                all_issues.append({
                    "column": col,
                    "type": ins["type"],
                    "text": ins["text"]
                })

        # Top problematic columns
        ranked_columns = sorted(column_issue_count.items(), key=lambda x: x[1], reverse=True)
        most_problematic = [col for col, _ in ranked_columns[:3]]

        # Top 3 issues
        severity_order = {"critical": 3, "warning": 2, "info": 1}
        top_issues = sorted(all_issues, key=lambda x: severity_order.get(x["type"], 0), reverse=True)[:3]

        # Data quality score
        total_cells = target_df.shape[0] * target_df.shape[1]
        total_numeric_cols = len(numeric_df.columns)

        score = 100.0

        # Missing values penalty (max 40)
        if total_cells > 0:
            missing_ratio = target_df.isnull().sum().sum() / total_cells
            score -= min(missing_ratio * 100, 40)

        # Duplicates penalty (max 20) – now uses original row count
        if len(target_df) > 0:
            duplicate_ratio = getattr(self, "duplicates_removed", 0) / self.original_row_count if self.original_row_count > 0 else 0
            score -= min(duplicate_ratio * 40, 20)

        # Statistical issues penalty (max 50)
        if total_numeric_cols > 0:
            critical = sum(1 for i in all_issues if i["type"] == "critical")
            warning = sum(1 for i in all_issues if i["type"] == "warning")
            info = sum(1 for i in all_issues if i["type"] == "info")
            score -= min((critical * 15) + (warning * 5) + (info * 2), 50)

        score = max(10.0, min(100.0, round(score, 2)))

        logger.info(f"📊 DATA QUALITY SCORE: {score}%")
        logger.info(f"   Critical: {critical}, Warning: {warning}, Info: {info}")

        # Recommendations
        recommendations = []
        for issue in top_issues:
            if issue["type"] in ["critical"] or (issue["type"] == "warning" and "significant" in issue["text"].lower()):
                text = issue["text"].lower()
                col = issue["column"]
                if "outliers" in text:
                    recommendations.append({
                        "action": "cap_outliers",
                        "column": col,
                        "reason": f"Remove extreme values from {col}"
                    })
                if "skew" in text:
                    recommendations.append({
                        "action": "log_transform",
                        "column": col,
                        "reason": f"Normalize distribution of {col}"
                    })

        # Deduplicate recommendations
        unique_recs = {(r["action"], r["column"]): r for r in recommendations}
        recommendations = list(unique_recs.values())

        return {
            "data_quality_score": score,
            "most_problematic_columns": most_problematic,
            "top_issues": top_issues,
            "recommendations": recommendations
        }

    # ------------------------------------------------------------------
    # Apply Recommendations
    # ------------------------------------------------------------------
    def apply_recommendations(self, recommendations):
        logger.info(f"🎯 Starting apply_recommendations with: {recommendations}")

        df = self._get_working_df().copy()
        logger.info(f"📊 Working dataframe shape: {df.shape}")

        for rec in recommendations:
            action = rec.get("action")
            col = rec.get("column")
            if col not in df.columns:
                logger.warning(f"⚠️ Column '{col}' not found in dataframe, skipping")
                continue

            if action == "drop_column":
                logger.info(f"🗑️ Dropping column: {col}")
                df = df.drop(columns=[col])

            elif action == "fill_missing":
                strategy = rec.get("strategy", "median")
                logger.info(f"🔧 Filling missing values in {col} using {strategy}")
                if strategy == "median":
                    df[col] = df[col].fillna(df[col].median())
                elif strategy == "mean":
                    df[col] = df[col].fillna(df[col].mean())

            elif action == "log_transform":
                if np.issubdtype(df[col].dtype, np.number):
                    # Check for negative values before transforming
                    if (df[col] < 0).any():
                        logger.warning(f"⚠️ Skipping log transform for {col} (contains negative values)")
                    else:
                        logger.info(f"📐 Applying log transform to {col}")
                        df[col] = np.log1p(df[col])

            elif action == "cap_outliers":
                if np.issubdtype(df[col].dtype, np.number):
                    clean_series = df[col].dropna()
                    if len(clean_series) == 0:
                        logger.warning(f"⚠️ {col}: No valid data after removing NaN, skipping")
                        continue

                    Q1 = clean_series.quantile(0.25)
                    Q3 = clean_series.quantile(0.75)
                    IQR = Q3 - Q1

                    if IQR == 0:
                        logger.warning(f"⚠️ {col}: IQR is 0, falling back to standard deviation method")
                        mean_val = clean_series.mean()
                        std_val = clean_series.std()
                        if std_val == 0:
                            logger.warning(f"⚠️ {col}: No variation detected, skipping outlier capping")
                            continue
                        lower_bound = mean_val - 3 * std_val
                        upper_bound = mean_val + 3 * std_val
                    else:
                        lower_bound = Q1 - 1.5 * IQR
                        upper_bound = Q3 + 1.5 * IQR

                    before = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
                    logger.info(f"📏 {col}: bounds [{lower_bound:.2f}, {upper_bound:.2f}], outliers before: {before}")
                    df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)
                    after = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
                    logger.info(f"📏 {col}: outliers after capping: {after} {'✅' if after == 0 else '⚠️'}")

        # ------------------------------------------------------------------
        # Post-processing: replace infinities, fill NaN sensibly
        # ------------------------------------------------------------------
        df = df.replace([np.inf, -np.inf], np.nan)

        # Fill numeric NaN with median (or 0 if median fails)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].isnull().any():
                null_count = df[col].isnull().sum()
                # Use median to preserve distribution better than 0
                median_val = df[col].median()
                if pd.isna(median_val):
                    median_val = 0  # fallback
                logger.info(f"🔧 Filling {null_count} NaN values in numeric column '{col}' with median ({round(median_val, 2)})")
                df[col] = df[col].fillna(median_val)

        # Fill text NaN with empty string
        non_numeric_cols = df.select_dtypes(exclude=[np.number]).columns
        for col in non_numeric_cols:
            if df[col].isnull().any():
                null_count = df[col].isnull().sum()
                logger.info(f"🔧 Filling {null_count} NaN values in text column '{col}' with empty string")
                df[col] = df[col].fillna("")

        remaining_nulls = df.isnull().sum().sum()
        if remaining_nulls > 0:
            logger.info(f"🔍 Remaining nulls after cleanup: {remaining_nulls} - applying final fillna(0)")
            df = df.fillna(0)

        logger.info(f"🔍 Final null check: {df.isnull().sum().sum()} nulls remaining")

        self.clean_df = df

        # New insights after cleaning
        test_insights = self.get_global_insights()
        new_score = test_insights.get('data_quality_score', 0)
        remaining_issues = len(test_insights.get('top_issues', []))
        remaining_recs = len(test_insights.get('recommendations', []))

        logger.info(f"📊 NEW SCORE AFTER CLEANING: {new_score}%")
        logger.info(f"📊 Remaining issues: {remaining_issues}, Remaining recommendations: {remaining_recs}")

        # JSON-safe preview
        preview_data = df.head(5).copy()
        preview_data = preview_data.where(pd.notnull(preview_data), None)
        preview_dict = preview_data.to_dict(orient="records")

        return {
            "status": "recommendations_applied",
            "preview": preview_dict,
            "message": f"Data quality improved to {new_score}%",
            "new_score": new_score,
            "remaining_issues": remaining_issues,
            "remaining_recommendations": remaining_recs
        }