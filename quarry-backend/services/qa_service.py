"""
Dataset Quality Assurance Service.

This service performs automated quality checks on datasets and generates
comprehensive QA reports that are stored in IPFS for reputation purposes.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import pandas as pd
import duckdb
from pathlib import Path

logger = logging.getLogger(__name__)


class DatasetQAService:
    """Service for performing quality checks on datasets."""

    async def run_qa_checks(
        self,
        parquet_path: str,
        dataset_id: str,
        dataset_name: str
    ) -> Dict[str, Any]:
        """
        Run comprehensive QA checks on a dataset.

        Args:
            parquet_path: Path to the parquet file
            dataset_id: Dataset identifier
            dataset_name: Dataset name

        Returns:
            QA report dictionary
        """
        logger.info(f"Running QA checks for dataset: {dataset_name} ({dataset_id})")

        try:
            # Load dataset
            df = pd.read_parquet(parquet_path)
            
            # Run individual checks
            completeness = await self._check_completeness(df)
            duplicates = await self._check_duplicates(df)
            schema_info = await self._analyze_schema(df)
            data_quality = await self._check_data_quality(df)
            pii_risk = await self._check_pii_risk(df)
            freshness_info = await self._check_freshness(df)
            
            # Calculate overall quality score (0-100)
            quality_score = await self._calculate_quality_score(
                completeness, duplicates, data_quality, pii_risk
            )

            # Build comprehensive report
            report = {
                "dataset_id": dataset_id,
                "dataset_name": dataset_name,
                "generated_at": datetime.utcnow().isoformat(),
                "row_count": len(df),
                "column_count": len(df.columns),
                "quality_score": quality_score,
                "completeness": completeness,
                "duplicates": duplicates,
                "schema": schema_info,
                "data_quality": data_quality,
                "pii_risk": pii_risk,
                "freshness": freshness_info,
                "checks_performed": [
                    "completeness",
                    "duplicate_detection",
                    "schema_validation",
                    "data_quality",
                    "pii_scan",
                    "freshness_check"
                ]
            }

            logger.info(f"QA checks complete. Quality score: {quality_score}")
            return report

        except Exception as e:
            logger.error(f"Failed to run QA checks: {e}")
            raise

    async def _check_completeness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check for missing values in the dataset."""
        missing_counts = df.isnull().sum()
        total_cells = len(df) * len(df.columns)
        total_missing = missing_counts.sum()
        
        missing_by_column = {}
        for col in df.columns:
            missing = int(missing_counts[col])
            if missing > 0:
                missing_by_column[col] = {
                    "count": missing,
                    "percentage": round((missing / len(df)) * 100, 2)
                }

        return {
            "total_missing_cells": int(total_missing),
            "total_cells": int(total_cells),
            "missing_percentage": round((total_missing / total_cells) * 100, 2) if total_cells > 0 else 0,
            "missing_rate_bps": int((total_missing / total_cells) * 10000) if total_cells > 0 else 0,
            "columns_with_missing": missing_by_column,
            "status": "good" if total_missing < total_cells * 0.05 else "warning" if total_missing < total_cells * 0.2 else "poor"
        }

    async def _check_duplicates(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check for duplicate rows."""
        duplicate_rows = df.duplicated().sum()
        duplicate_percentage = (duplicate_rows / len(df)) * 100 if len(df) > 0 else 0

        return {
            "duplicate_rows": int(duplicate_rows),
            "total_rows": len(df),
            "duplicate_percentage": round(duplicate_percentage, 2),
            "duplicate_rate_bps": int((duplicate_rows / len(df)) * 10000) if len(df) > 0 else 0,
            "status": "good" if duplicate_percentage < 1 else "warning" if duplicate_percentage < 5 else "poor"
        }

    async def _analyze_schema(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze dataset schema."""
        schema_info = {}
        
        for col in df.columns:
            dtype = str(df[col].dtype)
            unique_count = df[col].nunique()
            
            schema_info[col] = {
                "type": dtype,
                "unique_values": int(unique_count),
                "uniqueness_ratio": round(unique_count / len(df), 4) if len(df) > 0 else 0,
                "nullable": bool(df[col].isnull().any())
            }

        return {
            "columns": schema_info,
            "total_columns": len(df.columns),
            "status": "valid"
        }

    async def _check_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check data quality metrics."""
        quality_issues = []
        
        # Check for columns with very low variance (potential constant columns)
        for col in df.select_dtypes(include=['number']).columns:
            if df[col].nunique() == 1:
                quality_issues.append({
                    "type": "constant_column",
                    "column": col,
                    "severity": "warning"
                })
        
        # Check for columns with unusual cardinality
        for col in df.columns:
            unique_ratio = df[col].nunique() / len(df) if len(df) > 0 else 0
            if unique_ratio > 0.95 and len(df) > 100:
                quality_issues.append({
                    "type": "high_cardinality",
                    "column": col,
                    "severity": "info"
                })

        return {
            "issues_found": len(quality_issues),
            "issues": quality_issues,
            "status": "good" if len(quality_issues) == 0 else "warning"
        }

    async def _check_pii_risk(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check for potential PII (Personal Identifiable Information)."""
        pii_indicators = [
            'email', 'phone', 'ssn', 'social', 'password', 'name', 
            'address', 'dob', 'birth', 'credit', 'card', 'account'
        ]
        
        potential_pii_columns = []
        for col in df.columns:
            col_lower = col.lower()
            if any(indicator in col_lower for indicator in pii_indicators):
                potential_pii_columns.append(col)

        risk_level = "low"
        if len(potential_pii_columns) > 5:
            risk_level = "high"
        elif len(potential_pii_columns) > 2:
            risk_level = "medium"

        return {
            "risk_level": risk_level,
            "potential_pii_columns": potential_pii_columns,
            "pii_column_count": len(potential_pii_columns),
            "recommendation": "Manual review recommended" if risk_level != "low" else "No concerns detected"
        }

    async def _check_freshness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check dataset freshness based on date columns."""
        date_columns = df.select_dtypes(include=['datetime64']).columns
        
        freshness_info = {
            "has_date_columns": len(date_columns) > 0,
            "date_columns": list(date_columns),
            "last_checked_at": datetime.utcnow().isoformat()
        }

        if len(date_columns) > 0:
            # Find the most recent date in the dataset
            most_recent = None
            for col in date_columns:
                col_max = df[col].max()
                if pd.notna(col_max):
                    if most_recent is None or col_max > most_recent:
                        most_recent = col_max
            
            if most_recent is not None:
                freshness_info["most_recent_date"] = str(most_recent)
                days_old = (datetime.utcnow() - pd.to_datetime(most_recent)).days
                freshness_info["days_old"] = days_old
                freshness_info["status"] = "fresh" if days_old < 30 else "aging" if days_old < 90 else "stale"
            else:
                freshness_info["status"] = "unknown"
        else:
            freshness_info["status"] = "no_temporal_data"

        return freshness_info

    async def _calculate_quality_score(
        self,
        completeness: Dict[str, Any],
        duplicates: Dict[str, Any],
        data_quality: Dict[str, Any],
        pii_risk: Dict[str, Any]
    ) -> int:
        """
        Calculate overall quality score (0-100).

        Weights:
        - Completeness: 40%
        - Duplicates: 30%
        - Data Quality: 20%
        - PII Risk: 10%
        """
        # Completeness score (higher is better)
        completeness_score = max(0, 100 - completeness["missing_percentage"])
        
        # Duplicates score (lower duplicates is better)
        duplicate_score = max(0, 100 - duplicates["duplicate_percentage"] * 2)
        
        # Data quality score (fewer issues is better)
        quality_issues_penalty = min(50, data_quality["issues_found"] * 10)
        quality_score = max(0, 100 - quality_issues_penalty)
        
        # PII risk score
        pii_scores = {"low": 100, "medium": 60, "high": 30}
        pii_score = pii_scores.get(pii_risk["risk_level"], 100)
        
        # Weighted average
        final_score = (
            completeness_score * 0.4 +
            duplicate_score * 0.3 +
            quality_score * 0.2 +
            pii_score * 0.1
        )
        
        return int(round(final_score))


# Global QA service instance
qa_service = DatasetQAService()

