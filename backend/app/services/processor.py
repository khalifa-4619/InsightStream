import pandas as pd
import numpy as np
import os

class InsightEngine:
    """
    Core data processing engine for InsightStream.
    Handles data loading, cleaning, analysis, and recommendation application.
    """
    
    def __init__(self, file_path):
        """
        Initialize the engine with a file path.
        
        Args:
            file_path: Path to the dataset file
        """
        self.file_path = file_path
        self.df = self._load_data()          # Original data loaded from disk
        self.clean_df = None                  # Cleaned version (set after cleaning operations)
        self.duplicates_removed = 0           # Track duplicates removed during cleaning

    def _load_data(self):
        """
        Load data from various file formats.
        
        Supports: CSV, Excel (xlsx/xls), JSON, Log/TXT files
        
        Returns:
            pd.DataFrame: Loaded dataframe, or empty DataFrame on error
        """
        ext = os.path.splitext(self.file_path)[1].lower()
        
        try:
            if ext == '.csv':
                return pd.read_csv(self.file_path)
            elif ext in ['.xlsx', '.xls']:
                return pd.read_excel(self.file_path)
            elif ext == '.json':
                return pd.read_json(self.file_path)
            elif ext in ['.log', '.txt']:
                # Log files are treated as tab-separated with a single column
                return pd.read_csv(self.file_path, sep='\t', header=None, names=['Log Entry'])
            else:
                raise ValueError(f"Unsupported extension: {ext}")
        except Exception as e:
            print(f"Error loading file: {e}")
            return pd.DataFrame()

    def clean_data(self, fill_strategy="median", drop_threshold=0.5, remove_duplicates=True):
        """
        Perform comprehensive data cleaning.
        
        Steps:
        1. Remove duplicate rows
        2. Drop columns with too many missing values
        3. Fill numeric missing values (median/mean)
        4. Fill categorical missing values with "Unknown"
        
        Args:
            fill_strategy: "median" or "mean" for numeric imputation
            drop_threshold: Drop columns with less than this fraction of non-null values
            remove_duplicates: Whether to drop duplicate rows
            
        Returns:
            dict: Cleaning summary with stats
        """
        df = self.df.copy()

        if df.empty:
            self.clean_df = df
            return self.get_cleaning_summary()

        # -------------------------------
        # 1. REMOVE DUPLICATES
        # -------------------------------
        if remove_duplicates:
            before = len(df)
            df = df.drop_duplicates()
            after = len(df)
            self.duplicates_removed = before - after  # Track for summary
        else:
            self.duplicates_removed = 0

        # -------------------------------
        # 2. DROP SPARSE COLUMNS
        # Remove columns where non-null count is below threshold
        # -------------------------------
        limit = int(len(df) * drop_threshold)
        df = df.dropna(thresh=limit, axis=1)

        # -------------------------------
        # 3. IDENTIFY COLUMN TYPES
        # -------------------------------
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        cat_cols = df.select_dtypes(include=['object']).columns

        # -------------------------------
        # 4. FILL NUMERIC VALUES
        # Use median (robust to outliers) or mean
        # -------------------------------
        if len(numeric_cols) > 0:
            if fill_strategy == "median":
                df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
            elif fill_strategy == "mean":
                df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())

        # -------------------------------
        # 5. FILL CATEGORICAL VALUES
        # -------------------------------
        if len(cat_cols) > 0:
            df[cat_cols] = df[cat_cols].fillna("Unknown")

        self.clean_df = df
        return self.get_cleaning_summary()
    
    def _get_working_df(self):
        """
        Get the current working dataframe.
        Uses cleaned version if available, otherwise original.
        
        Returns:
            pd.DataFrame: Working dataframe
        """
        return self.clean_df if self.clean_df is not None else self.df

    def _generate_column_insights(self, series, col_name):
        """
        Analyze a single numeric column and generate insights.
        
        Detects:
        - Skewness (distribution asymmetry)
        - Outliers (using Z-score method)
        - Low variance (potentially useless features)
        - Constant columns
        
        Args:
            series: Pandas Series of numeric data
            col_name: Name of the column for logging
            
        Returns:
            list: List of insight dictionaries with type and text
        """
        insights = []

        # Clean series - remove infinity and NaN values
        series = series.replace([np.inf, -np.inf], np.nan).dropna()

        if series.empty:
            return [{
                "type": "info",
                "text": "Column contains no valid numeric data."
            }]

        # Precompute basic statistics
        mean_val = series.mean()
        std_val = series.std()

        # Check for constant or near-constant columns (low variance)
        # If standard deviation is 0 or very few unique values, it's essentially constant
        if std_val == 0 or len(series.unique()) <= 2:
            return [{
                "type": "info",
                "text": "This column has low variance (constant or near-constant values)."
            }]

        # -------------------------------
        # SKEWNESS DETECTION
        # Only flag if VERY skewed (abs(skew) > 2 instead of > 1)
        # This prevents over-flagging after transformations
        # -------------------------------
        skew_val = series.skew()
        if abs(skew_val) > 2:
            direction = "right" if skew_val > 0 else "left"
            insights.append({
                "type": "warning",
                "text": f"Significant {direction} skew detected ({skew_val:.2f}). Distribution is non-normal."
            })

        # -------------------------------
        # OUTLIER DETECTION
        # Use Z-score method: values more than 3 standard deviations from mean
        # Only flag if outliers represent more than 5% of data (prevents over-flagging)
        # -------------------------------
        z_scores = ((series - mean_val) / std_val).abs()
        outliers_count = int((z_scores > 3).sum())
        
        # Calculate outlier percentage to avoid flagging minor outliers
        outlier_percentage = (outliers_count / len(series)) * 100 if len(series) > 0 else 0
        
        if outlier_percentage > 5:  # Only flag if > 5% are outliers
            insights.append({
                "type": "critical",
                "text": f"Found {outliers_count} extreme outliers ({outlier_percentage:.1f}%). These may distort statistical results."
            })

        # -------------------------------
        # LOW VARIANCE DETECTION
        # Coefficient of Variation (CV) = std / mean
        # Very low CV means the feature has little predictive power
        # -------------------------------
        if mean_val != 0:
            cv = std_val / abs(mean_val)
            if cv < 0.001:  # Very strict threshold
                insights.append({
                    "type": "info",
                    "text": "Very low variance detected: feature may have limited predictive power."
                })

        return insights
        
    def get_univariate(self):
        """
        Perform univariate analysis on all numeric columns.
        
        Calculates:
        - Summary statistics (mean, median, std, min, max)
        - Histogram data (10 bins)
        - Column-specific insights
        
        Returns:
            dict: Column-by-column analysis results
        """
        target_df = self._get_working_df()
        if target_df.empty:
            return {}

        # Only analyze numeric columns
        numeric_df = target_df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            return {}

        stats = {}

        for col in numeric_df.columns:
            # Skip ID columns - they're not meaningful for analysis
            if col.lower() == 'id':
                continue

            # Clean the series for analysis
            series = numeric_df[col].replace([np.inf, -np.inf], np.nan).dropna()
            if series.empty:
                continue

            # Calculate summary statistics
            mean_val = float(series.mean())
            std_val = float(series.std())

            # Generate histogram with 10 bins
            try:
                counts, bin_edges = np.histogram(series, bins=10)
            except Exception:
                continue

            # Format histogram data for frontend visualization
            formatted_hist = [
                {
                    "name": f"{round(bin_edges[i], 1)}-{round(bin_edges[i+1], 1)}",
                    "value": int(counts[i])
                }
                for i in range(len(counts))
            ]

            # Generate column-specific insights
            col_insights = self._generate_column_insights(series, col)

            # Build complete column analysis
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
    
    def get_bivariate(self):
        """
        Perform bivariate analysis using correlation matrix.
        
        Identifies highly correlated feature pairs (>0.8 correlation).
        
        Returns:
            dict: Correlation matrix and insights
        """
        target_df = self._get_working_df()
        if target_df.empty:
            return {}

        numeric_df = target_df.select_dtypes(include=[np.number])
        if numeric_df.empty or len(numeric_df.columns) < 2:
            return {}

        # Drop ID columns for correlation analysis
        numeric_df = numeric_df.loc[:, [c for c in numeric_df.columns if c.lower() != 'id']]

        if len(numeric_df.columns) < 2:
            return {}

        # Calculate correlation matrix
        corr_matrix = numeric_df.corr().round(2)

        # Detect highly correlated pairs
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

        # Format correlation data for frontend matrix visualization
        formatted_corr = [
            {
                "x": cols[i],
                "y": cols[j],
                "value": float(corr_matrix.iloc[i, j])
            }
            for i in range(len(cols))
            for j in range(len(cols))
        ]
        
        return {
            "matrix": formatted_corr,
            "columns": cols,
            "insights": corr_insights
        }
        
    def get_multivariate(self):
        """
        Perform multivariate analysis using covariance matrix.
        
        Returns:
            dict: Covariance matrix data
        """
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
    
    def get_cleaning_summary(self):
        """
        Generate summary after data cleaning operations.
        
        Returns:
            dict: Cleaning statistics including rows, nulls, duplicates
        """
        if self.clean_df is None:
            return {"status": "error", "message": "Data not yet cleaned"}
            
        return {
            "status": "cleaned",
            "rows_after": len(self.clean_df),
            "duplicates_removed": getattr(self, "duplicates_removed", 0),
            "nulls_remaining": int(self.clean_df.isnull().sum().sum()),
            "preview": self.clean_df.head(5).to_dict(orient='records')
        }
        
    def get_global_insights(self):
        """
        Generate comprehensive dataset quality report.
        
        Calculates:
        - Data Quality Score (0-100%)
        - Top problematic columns
        - Critical findings
        - Actionable recommendations
        
        Scoring Factors:
        - Missing values: up to 40 points deduction
        - Duplicates: up to 20 points deduction
        - Statistical issues: up to 50 points deduction
        
        Returns:
            dict: Complete quality report
        """
        target_df = self._get_working_df()

        if target_df.empty:
            return {}

        numeric_df = target_df.select_dtypes(include=[np.number])

        all_issues = []
        column_issue_count = {}

        # -------------------------------
        # LOOP THROUGH EACH COLUMN & COLLECT ISSUES
        # -------------------------------
        for col in numeric_df.columns:
            if col.lower() == "id":
                continue

            series = numeric_df[col]
            insights = self._generate_column_insights(series, col)
            column_issue_count[col] = len(insights)

            # Aggregate all issues globally
            for ins in insights:
                all_issues.append({
                    "column": col,
                    "type": ins["type"],
                    "text": ins["text"]
                })

        # -------------------------------
        # RANK MOST PROBLEMATIC COLUMNS
        # Sort by number of issues (descending)
        # -------------------------------
        ranked_columns = sorted(
            column_issue_count.items(),
            key=lambda x: x[1],
            reverse=True
        )

        most_problematic = [col for col, _ in ranked_columns[:3]]

        # -------------------------------
        # SELECT TOP 3 MOST SEVERE ISSUES
        # Priority: critical (3) > warning (2) > info (1)
        # -------------------------------
        severity_order = {"critical": 3, "warning": 2, "info": 1}

        top_issues = sorted(
            all_issues,
            key=lambda x: severity_order.get(x["type"], 0),
            reverse=True
        )[:3]

        # -------------------------------
        # CALCULATE DATA QUALITY SCORE (0-100%)
        # Start at 100 and deduct based on problems found
        # -------------------------------
        total_cells = target_df.shape[0] * target_df.shape[1]
        total_numeric_cols = len(numeric_df.columns)
        
        # Start with perfect score
        score = 100.0
        
        # 1. Missing values penalty (max 40 points)
        # More missing values = higher penalty
        if total_cells > 0:
            missing_ratio = target_df.isnull().sum().sum() / total_cells
            missing_penalty = min(missing_ratio * 100, 40)
            score -= missing_penalty
        
        # 2. Duplicates penalty (max 20 points)
        # More duplicates = higher penalty
        if len(target_df) > 0:
            duplicate_ratio = getattr(self, "duplicates_removed", 0) / len(target_df)
            duplicate_penalty = min(duplicate_ratio * 40, 20)
            score -= duplicate_penalty
        
        # 3. Statistical issues penalty (max 50 points)
        # Critical issues cost more than warnings
        if total_numeric_cols > 0:
            critical_count = sum(1 for i in all_issues if i["type"] == "critical")
            warning_count = sum(1 for i in all_issues if i["type"] == "warning")
            info_count = sum(1 for i in all_issues if i["type"] == "info")
            
            # Weighted penalty: critical=15pts, warning=5pts, info=2pts
            issue_penalty = min(
                (critical_count * 15) + (warning_count * 5) + (info_count * 2), 
                50  # Cap at 50 points maximum deduction
            )
            score -= issue_penalty
        
        # Ensure score stays in valid range (minimum 10%, maximum 100%)
        score = max(10.0, min(100.0, round(score, 2)))
        
        # Detailed scoring log for debugging
        print(f"📊 DATA QUALITY SCORE: {score}%")
        print(f"   Critical: {sum(1 for i in all_issues if i['type']=='critical')}, "
              f"Warning: {sum(1 for i in all_issues if i['type']=='warning')}, "
              f"Info: {sum(1 for i in all_issues if i['type']=='info')}")

        # -------------------------------
        # GENERATE ACTIONABLE RECOMMENDATIONS
        # Only recommend for critical and significant warning issues
        # -------------------------------
        recommendations = []

        for issue in top_issues:
            # Only suggest actions for actual problems (critical or significant)
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

        # Remove duplicate recommendations (same action on same column)
        unique_recs = { (r["action"], r["column"]): r for r in recommendations }
        recommendations = list(unique_recs.values())

        # -------------------------------
        # RETURN COMPLETE QUALITY REPORT
        # -------------------------------
        return {
            "data_quality_score": score,
            "most_problematic_columns": most_problematic,
            "top_issues": top_issues,
            "recommendations": recommendations
        }
        
    def apply_recommendations(self, recommendations):
        """
        Apply AI-generated recommendations to clean the dataset.
        
        Supported Actions:
        - cap_outliers: Remove outliers using IQR method (falls back to Z-score if IQR=0)
        - log_transform: Apply log1p transformation to reduce skewness
        - drop_column: Remove unnecessary columns
        - fill_missing: Impute missing values
        
        After applying, handles NaN/Inf values to ensure JSON serialization compatibility.
        
        Args:
            recommendations: List of recommendation dicts with 'action' and 'column'
            
        Returns:
            dict: Result with preview and new quality score
        """
        print(f"🎯 Starting apply_recommendations with: {recommendations}")
        
        # Work on a copy to avoid modifying original during processing
        df = self._get_working_df().copy()
        print(f"📊 Working dataframe shape: {df.shape}")

        # Process each recommendation
        for rec in recommendations:
            action = rec.get("action")
            col = rec.get("column")

            # Validate column exists
            if col not in df.columns:
                print(f"⚠️ Column '{col}' not found in dataframe, skipping")
                continue

            # -------------------------------
            # ACTION: DROP COLUMN
            # Remove unnecessary or redundant columns
            # -------------------------------
            if action == "drop_column":
                print(f"🗑️ Dropping column: {col}")
                df = df.drop(columns=[col])

            # -------------------------------
            # ACTION: FILL MISSING VALUES
            # Impute missing values using specified strategy
            # -------------------------------
            elif action == "fill_missing":
                strategy = rec.get("strategy", "median")
                print(f"🔧 Filling missing values in {col} using {strategy}")
                if strategy == "median":
                    df[col] = df[col].fillna(df[col].median())
                elif strategy == "mean":
                    df[col] = df[col].fillna(df[col].mean())

            # -------------------------------
            # ACTION: LOG TRANSFORM
            # Apply log1p to reduce right skewness
            # log1p(x) = log(1 + x) - handles zeros safely
            # -------------------------------
            elif action == "log_transform":
                if np.issubdtype(df[col].dtype, np.number):
                    print(f"📐 Applying log transform to {col}")
                    # Clip at 0 to avoid negative values, then add 1 for log1p
                    df[col] = np.log1p(df[col].clip(lower=0))

            # -------------------------------
            # ACTION: CAP OUTLIERS (PRIMARY CLEANING METHOD)
            # Uses IQR method: bounds = [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
            # Falls back to Z-score method if IQR = 0 (constant data)
            # -------------------------------
            elif action == "cap_outliers":
                if np.issubdtype(df[col].dtype, np.number):
                    # Get clean series without NaN for calculation
                    clean_series = df[col].dropna()
                    
                    if len(clean_series) == 0:
                        print(f"⚠️ {col}: No valid data after removing NaN, skipping")
                        continue
                    
                    # Calculate quartiles and IQR
                    Q1 = clean_series.quantile(0.25)
                    Q3 = clean_series.quantile(0.75)
                    IQR = Q3 - Q1
                    
                    # Handle edge case: IQR = 0 means constant or near-constant data
                    if IQR == 0:
                        print(f"⚠️ {col}: IQR is 0, falling back to standard deviation method")
                        mean_val = clean_series.mean()
                        std_val = clean_series.std()
                        
                        # If no variation at all, skip this column
                        if std_val == 0:
                            print(f"⚠️ {col}: No variation detected, skipping outlier capping")
                            continue
                        
                        # Use 3 standard deviations as bounds
                        lower_bound = mean_val - 3 * std_val
                        upper_bound = mean_val + 3 * std_val
                    else:
                        # Standard IQR method: 1.5 * IQR beyond quartiles
                        lower_bound = Q1 - 1.5 * IQR
                        upper_bound = Q3 + 1.5 * IQR
                    
                    # Count outliers before capping (for logging)
                    before_outliers = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
                    
                    print(f"📏 {col}: bounds [{lower_bound:.2f}, {upper_bound:.2f}], "
                          f"outliers before: {before_outliers}")
                    
                    # Apply capping - values outside bounds are clipped to bounds
                    df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)
                    
                    # Verify outliers are removed
                    after_outliers = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
                    print(f"📏 {col}: outliers after capping: {after_outliers} "
                          f"({'✅' if after_outliers == 0 else '⚠️'})")
        
        # ===================================
        # POST-PROCESSING: Handle NaN and Infinity values
        # These can appear after transformations and must be cleaned
        # for JSON serialization compatibility
        # ===================================
        
        # Convert infinity values to NaN first
        df = df.replace([np.inf, -np.inf], np.nan)
        
        # Separate handling for numeric vs text columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        non_numeric_cols = df.select_dtypes(exclude=[np.number]).columns
        
        # Fill numeric NaN with 0 (safe default that preserves data structure)
        for col in numeric_cols:
            if df[col].isnull().any():
                null_count = df[col].isnull().sum()
                print(f"🔧 Filling {null_count} NaN values in numeric column '{col}' with 0")
                df[col] = df[col].fillna(0)
        
        # Fill text NaN with empty string (maintains string type)
        for col in non_numeric_cols:
            if df[col].isnull().any():
                null_count = df[col].isnull().sum()
                print(f"🔧 Filling {null_count} NaN values in text column '{col}' with empty string")
                df[col] = df[col].fillna("")
        
        # Final safety check - catch any remaining NaN values
        remaining_nulls = df.isnull().sum().sum()
        if remaining_nulls > 0:
            print(f"🔍 Remaining nulls after cleanup: {remaining_nulls} - applying final fillna(0)")
            df = df.fillna(0)  # Final catch-all for any edge cases
        
        print(f"🔍 Final null check: {df.isnull().sum().sum()} nulls remaining")

        # Update the engine's clean dataframe for subsequent operations
        self.clean_df = df
        
        # Test the new quality score with cleaned data
        test_insights = self.get_global_insights()
        new_score = test_insights.get('data_quality_score', 0)
        remaining_issues = len(test_insights.get('top_issues', []))
        remaining_recs = len(test_insights.get('recommendations', []))
        
        print(f"📊 NEW SCORE AFTER CLEANING: {new_score}%")
        print(f"📊 Remaining issues: {remaining_issues}, Remaining recommendations: {remaining_recs}")

        # Prepare JSON-safe preview (replace NaN with None for JSON compliance)
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