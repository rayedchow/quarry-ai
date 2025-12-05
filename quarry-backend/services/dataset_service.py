import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from slugify import slugify

from config import settings
from database import db
from models import (
    Dataset,
    DatasetCreate,
    DatasetUpdate,
    DatasetResponse,
    DatasetListResponse,
    DataQueryResponse,
    TagsResponse,
    ColumnSchema,
)
from services.file_converter import file_converter


class DatasetService:
    """Service for managing datasets."""

    def __init__(self):
        self.uploads_dir = settings.uploads_dir
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

    async def create_dataset(
        self,
        data: DatasetCreate,
        file_path: Optional[Path] = None,
        original_filename: Optional[str] = None,
    ) -> DatasetResponse:
        """
        Create a new dataset.

        Args:
            data: Dataset metadata
            file_path: Optional path to uploaded file
            original_filename: Original name of uploaded file

        Returns:
            Created dataset response
        """
        # Generate ID and slug
        dataset_id = f"ds-{uuid.uuid4().hex[:8]}"
        slug = slugify(data.name)

        # Ensure unique slug
        existing = db.get_dataset_by_slug(slug)
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"

        now = datetime.utcnow()

        # Initialize schema and counts
        schema_columns: list[ColumnSchema] = []
        row_count = 0
        column_count = 0
        parquet_path: Optional[str] = None

        # Process uploaded file if present
        if file_path and file_path.exists():
            try:
                parquet_output, schema_columns, row_count = (
                    file_converter.convert_to_parquet(
                        file_path=file_path, output_name=slug
                    )
                )
                parquet_path = str(parquet_output)
                column_count = len(schema_columns)
            except Exception as e:
                # Clean up file on error
                if file_path.exists():
                    file_path.unlink()
                raise ValueError(f"Failed to process file: {str(e)}")

        # Create dataset model
        dataset = Dataset(
            id=dataset_id,
            slug=slug,
            name=data.name,
            publisher=data.publisher,
            tags=data.tags,
            description=data.description,
            summary=data.summary,
            price_per_row=data.price_per_row,
            row_count=row_count,
            column_count=column_count,
            update_frequency=data.update_frequency,
            created_at=now,
            updated_at=now,
            schema_columns=schema_columns,
            parquet_path=parquet_path,
            original_filename=original_filename,
        )

        # Save to database
        db.create_dataset(dataset)

        return DatasetResponse.from_dataset(dataset)

    async def get_dataset(self, slug: str) -> Optional[DatasetResponse]:
        """Get a dataset by slug."""
        dataset = db.get_dataset_by_slug(slug)
        if not dataset:
            return None
        return DatasetResponse.from_dataset(dataset)

    async def list_datasets(
        self,
        limit: int = 100,
        offset: int = 0,
        tag: Optional[str] = None,
        search: Optional[str] = None,
    ) -> DatasetListResponse:
        """List datasets with optional filtering."""
        datasets, total = db.list_datasets(
            limit=limit, offset=offset, tag=tag, search=search
        )

        return DatasetListResponse(
            datasets=[DatasetResponse.from_dataset(d) for d in datasets], total=total
        )

    async def update_dataset(
        self, slug: str, data: DatasetUpdate
    ) -> Optional[DatasetResponse]:
        """Update a dataset."""
        dataset = db.get_dataset_by_slug(slug)
        if not dataset:
            return None

        # Build updates dict
        updates = {}
        if data.name is not None:
            updates["name"] = data.name
        if data.publisher is not None:
            updates["publisher"] = data.publisher
        if data.tags is not None:
            updates["tags"] = data.tags
        if data.description is not None:
            updates["description"] = data.description
        if data.summary is not None:
            updates["summary"] = data.summary
        if data.price_per_row is not None:
            updates["price_per_row"] = data.price_per_row
        if data.update_frequency is not None:
            updates["update_frequency"] = data.update_frequency

        updated = db.update_dataset(dataset.id, updates)
        if not updated:
            return None

        return DatasetResponse.from_dataset(updated)

    async def delete_dataset(self, slug: str) -> bool:
        """Delete a dataset and its associated files."""
        dataset = db.get_dataset_by_slug(slug)
        if not dataset:
            return False

        # Delete parquet file
        if dataset.parquet_path:
            parquet_path = Path(dataset.parquet_path)
            if parquet_path.exists():
                parquet_path.unlink()

        # Delete from database
        return db.delete_dataset(dataset.id)

    async def upload_file(
        self, file_content: bytes, filename: str, dataset_data: DatasetCreate
    ) -> DatasetResponse:
        """
        Upload a file and create a dataset from it.

        Args:
            file_content: Raw file content
            filename: Original filename
            dataset_data: Dataset metadata

        Returns:
            Created dataset response
        """
        # Save uploaded file temporarily
        temp_path = self.uploads_dir / filename
        with open(temp_path, "wb") as f:
            f.write(file_content)

        try:
            # Create dataset with file
            result = await self.create_dataset(
                data=dataset_data, file_path=temp_path, original_filename=filename
            )
            return result
        finally:
            # Clean up temp file
            if temp_path.exists():
                temp_path.unlink()

    async def query_dataset(
        self,
        slug: str,
        sql: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        columns: Optional[list[str]] = None,
    ) -> DataQueryResponse:
        """Query data from a dataset."""
        try:
            col_names, rows, total = db.query_dataset(
                dataset_slug=slug, sql=sql, limit=limit, offset=offset, columns=columns
            )

            return DataQueryResponse(
                columns=col_names, rows=rows, total_rows=total, returned_rows=len(rows)
            )
        except ValueError as e:
            raise ValueError(str(e))

    async def get_tags(self) -> TagsResponse:
        """Get all unique tags with counts."""
        tag_counts = db.get_all_tags()
        return TagsResponse(tags=list(tag_counts.keys()), counts=tag_counts)

    async def add_data_to_dataset(
        self, slug: str, file_content: bytes, filename: str
    ) -> DatasetResponse:
        """
        Add more data to an existing dataset by appending to its parquet file.

        Args:
            slug: Dataset slug
            file_content: Raw file content
            filename: Original filename

        Returns:
            Updated dataset response
        """
        dataset = db.get_dataset_by_slug(slug)
        if not dataset:
            raise ValueError(f"Dataset not found: {slug}")

        # Save uploaded file temporarily
        temp_path = self.uploads_dir / filename
        with open(temp_path, "wb") as f:
            f.write(file_content)

        try:
            # Convert new file to parquet
            temp_parquet_path, new_schema, new_row_count = (
                file_converter.convert_to_parquet(
                    file_path=temp_path,
                    output_name=f"{slug}_temp_{uuid.uuid4().hex[:8]}",
                )
            )

            if dataset.parquet_path:
                # Append to existing parquet
                import pandas as pd
                import pyarrow.parquet as pq

                existing_df = pd.read_parquet(dataset.parquet_path)
                new_df = pd.read_parquet(temp_parquet_path)

                # Merge dataframes
                combined_df = pd.concat([existing_df, new_df], ignore_index=True)

                # Write combined parquet
                combined_df.to_parquet(dataset.parquet_path, compression="snappy")

                # Clean up temp parquet
                Path(temp_parquet_path).unlink()

                # Update counts
                updates = {
                    "row_count": len(combined_df),
                    "column_count": len(combined_df.columns),
                }
            else:
                # No existing data, use new parquet
                final_parquet_path = settings.parquet_dir / f"{slug}.parquet"
                shutil.move(str(temp_parquet_path), str(final_parquet_path))

                updates = {
                    "parquet_path": str(final_parquet_path),
                    "row_count": new_row_count,
                    "column_count": len(new_schema),
                    "schema_columns": new_schema,
                }

            # Update database
            updated = db.update_dataset(dataset.id, updates)
            return DatasetResponse.from_dataset(updated)

        finally:
            # Clean up temp file
            if temp_path.exists():
                temp_path.unlink()


# Global instance
dataset_service = DatasetService()
