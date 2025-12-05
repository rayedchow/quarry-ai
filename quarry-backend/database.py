import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

import duckdb

from config import settings
from models import Dataset, ColumnSchema


class DuckDBManager:
    """Manages DuckDB connections and operations."""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(settings.database_path)
        self._init_database()

    def _init_database(self):
        """Initialize database tables if they don't exist."""
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS datasets (
                    id VARCHAR PRIMARY KEY,
                    slug VARCHAR UNIQUE NOT NULL,
                    name VARCHAR NOT NULL,
                    publisher VARCHAR NOT NULL,
                    publisher_wallet VARCHAR,
                    tags JSON,
                    description TEXT,
                    summary TEXT,
                    price_per_row DOUBLE DEFAULT 0.001,
                    row_count BIGINT DEFAULT 0,
                    column_count INTEGER DEFAULT 0,
                    update_frequency VARCHAR DEFAULT 'static',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    schema_columns JSON,
                    parquet_path VARCHAR,
                    original_filename VARCHAR,
                    reputation_data JSON
                )
            """)

            # Create index on slug for faster lookups
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_datasets_slug ON datasets(slug)
            """)

            # Create reviews table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS reviews (
                    id VARCHAR PRIMARY KEY,
                    dataset_id VARCHAR NOT NULL,
                    dataset_version VARCHAR DEFAULT 'v1',
                    reviewer_wallet VARCHAR NOT NULL,
                    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                    review_text TEXT NOT NULL,
                    review_text_cid VARCHAR NOT NULL,
                    usage_receipt_attestation VARCHAR NOT NULL,
                    review_attestation_id VARCHAR NOT NULL,
                    review_attestation_address VARCHAR NOT NULL,
                    helpful_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
                )
            """)

            # Create indexes for reviews
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_reviews_dataset ON reviews(dataset_id, dataset_version)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_reviews_wallet ON reviews(reviewer_wallet)
            """)

            # Create helpful votes table (prevent double voting)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS review_helpful_votes (
                    review_id VARCHAR NOT NULL,
                    voter_wallet VARCHAR NOT NULL,
                    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (review_id, voter_wallet),
                    FOREIGN KEY (review_id) REFERENCES reviews(id)
                )
            """)

    @contextmanager
    def get_connection(self):
        """Get a DuckDB connection context manager."""
        conn = duckdb.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()

    def create_dataset(self, dataset: Dataset) -> Dataset:
        """Create a new dataset in the database."""
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO datasets (
                    id, slug, name, publisher, tags, description, summary,
                    price_per_row, row_count, column_count,
                    update_frequency, created_at, updated_at, schema_columns,
                    parquet_path, original_filename
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                [
                    dataset.id,
                    dataset.slug,
                    dataset.name,
                    dataset.publisher,
                    json.dumps(dataset.tags),
                    dataset.description,
                    dataset.summary,
                    dataset.price_per_row,
                    dataset.row_count,
                    dataset.column_count,
                    dataset.update_frequency,
                    dataset.created_at,
                    dataset.updated_at,
                    json.dumps([col.model_dump() for col in dataset.schema_columns]),
                    dataset.parquet_path,
                    dataset.original_filename,
                ],
            )
        return dataset

    def get_dataset_by_id(self, dataset_id: str) -> Optional[Dataset]:
        """Get a dataset by its ID."""
        with self.get_connection() as conn:
            result = conn.execute(
                "SELECT * FROM datasets WHERE id = ?", [dataset_id]
            ).fetchone()

            if result is None:
                return None

            return self._row_to_dataset(result, conn.description)

    def get_dataset_by_slug(self, slug: str) -> Optional[Dataset]:
        """Get a dataset by its slug."""
        with self.get_connection() as conn:
            result = conn.execute(
                "SELECT * FROM datasets WHERE slug = ?", [slug]
            ).fetchone()

            if result is None:
                return None

            return self._row_to_dataset(result, conn.description)

    def list_datasets(
        self,
        limit: int = 100,
        offset: int = 0,
        tag: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[list[Dataset], int]:
        """List all datasets with optional filtering."""
        with self.get_connection() as conn:
            # Build query
            where_clauses = []
            params = []

            if tag:
                where_clauses.append(
                    "list_contains(CAST(json_extract(tags, '$') AS VARCHAR[]), ?)"
                )
                params.append(tag)

            if search:
                where_clauses.append("""
                    (lower(name) LIKE ? OR 
                     lower(description) LIKE ? OR 
                     lower(publisher) LIKE ?)
                """)
                search_param = f"%{search.lower()}%"
                params.extend([search_param, search_param, search_param])

            where_sql = ""
            if where_clauses:
                where_sql = "WHERE " + " AND ".join(where_clauses)

            # Get total count
            count_result = conn.execute(
                f"SELECT COUNT(*) FROM datasets {where_sql}", params
            ).fetchone()
            total = count_result[0] if count_result else 0

            # Get datasets
            query_params = params + [limit, offset]
            results = conn.execute(
                f"""
                SELECT * FROM datasets 
                {where_sql}
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?
            """,
                query_params,
            ).fetchall()

            datasets = [self._row_to_dataset(row, conn.description) for row in results]

            return datasets, total

    def update_dataset(self, dataset_id: str, updates: dict) -> Optional[Dataset]:
        """Update an existing dataset."""
        with self.get_connection() as conn:
            # Build SET clause
            set_clauses = []
            params = []

            for key, value in updates.items():
                if value is not None:
                    if key == "tags":
                        value = json.dumps(value)
                    elif key == "schema_columns":
                        value = json.dumps(
                            [
                                col.model_dump() if hasattr(col, "model_dump") else col
                                for col in value
                            ]
                        )
                    set_clauses.append(f"{key} = ?")
                    params.append(value)

            if not set_clauses:
                return self.get_dataset_by_id(dataset_id)

            # Always update updated_at
            set_clauses.append("updated_at = ?")
            params.append(datetime.utcnow())
            params.append(dataset_id)

            conn.execute(
                f"""
                UPDATE datasets 
                SET {", ".join(set_clauses)}
                WHERE id = ?
            """,
                params,
            )

        return self.get_dataset_by_id(dataset_id)

    def delete_dataset(self, dataset_id: str) -> bool:
        """Delete a dataset by ID."""
        with self.get_connection() as conn:
            result = conn.execute(
                "DELETE FROM datasets WHERE id = ? RETURNING id", [dataset_id]
            ).fetchone()
            return result is not None

    def get_all_tags(self) -> dict[str, int]:
        """Get all unique tags with counts."""
        with self.get_connection() as conn:
            # First get all tags from datasets
            results = conn.execute("""
                SELECT tags FROM datasets WHERE tags IS NOT NULL
            """).fetchall()

            # Count tags manually since DuckDB's UNNEST behavior varies
            tag_counts: dict[str, int] = {}
            for row in results:
                tags = row[0]
                if isinstance(tags, str):
                    import json

                    tags = json.loads(tags)
                if isinstance(tags, list):
                    for tag in tags:
                        tag_str = str(tag).strip('"')
                        tag_counts[tag_str] = tag_counts.get(tag_str, 0) + 1

            # Sort by count descending
            return dict(sorted(tag_counts.items(), key=lambda x: x[1], reverse=True))

    def _row_to_dataset(self, row: tuple, description) -> Dataset:
        """Convert a database row to a Dataset model."""
        # Create dict from row
        columns = [col[0] for col in description]
        data = dict(zip(columns, row))

        # Parse JSON fields
        if isinstance(data.get("tags"), str):
            data["tags"] = json.loads(data["tags"])
        elif data.get("tags") is None:
            data["tags"] = []

        if isinstance(data.get("schema_columns"), str):
            schema_data = json.loads(data["schema_columns"])
            data["schema_columns"] = [ColumnSchema(**col) for col in schema_data]
        elif data.get("schema_columns") is None:
            data["schema_columns"] = []

        if isinstance(data.get("reputation_data"), str):
            data["reputation_data"] = json.loads(data["reputation_data"])
        elif data.get("reputation_data") is None:
            data["reputation_data"] = None

        return Dataset(**data)

    def register_parquet_view(self, dataset_slug: str, parquet_path: str) -> bool:
        """Register a parquet file as a view in DuckDB for querying."""
        with self.get_connection() as conn:
            view_name = f"data_{dataset_slug.replace('-', '_')}"
            conn.execute(f"""
                CREATE OR REPLACE VIEW {view_name} AS 
                SELECT * FROM read_parquet('{parquet_path}')
            """)
            return True

    def query_dataset(
        self,
        dataset_slug: str,
        sql: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        columns: Optional[list[str]] = None,
    ) -> tuple[list[str], list[list], int]:
        """Query data from a dataset's parquet file."""
        dataset = self.get_dataset_by_slug(dataset_slug)
        if not dataset or not dataset.parquet_path:
            raise ValueError(f"Dataset not found or no data: {dataset_slug}")

        with self.get_connection() as conn:
            # Get total count
            count_result = conn.execute(f"""
                SELECT COUNT(*) FROM read_parquet('{dataset.parquet_path}')
            """).fetchone()
            total = count_result[0] if count_result else 0

            # Build query
            if sql:
                # Execute custom SQL (sanitize in production!)
                view_name = f"data_{dataset_slug.replace('-', '_')}"
                conn.execute(f"""
                    CREATE OR REPLACE TEMP VIEW {view_name} AS 
                    SELECT * FROM read_parquet('{dataset.parquet_path}')
                """)
                result = conn.execute(sql).fetchall()
                col_names = [col[0] for col in conn.description]
            else:
                # Default query
                col_select = ", ".join(columns) if columns else "*"
                result = conn.execute(f"""
                    SELECT {col_select} 
                    FROM read_parquet('{dataset.parquet_path}')
                    LIMIT {limit} OFFSET {offset}
                """).fetchall()
                col_names = [col[0] for col in conn.description]

            rows = [list(row) for row in result]
            return col_names, rows, total

    def update_dataset_reputation(self, dataset_id: str, reputation_data: dict) -> bool:
        """
        Store reputation data for a dataset.

        Args:
            dataset_id: Dataset ID
            reputation_data: Reputation data dictionary

        Returns:
            True if successful
        """
        with self.get_connection() as conn:
            conn.execute(
                """
                UPDATE datasets 
                SET reputation_data = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                [json.dumps(reputation_data), dataset_id],
            )
            return True

    def get_dataset_reputation(self, dataset_id: str) -> Optional[dict]:
        """
        Get reputation data for a dataset.

        Args:
            dataset_id: Dataset ID

        Returns:
            Reputation data dictionary or None
        """
        with self.get_connection() as conn:
            result = conn.execute(
                "SELECT reputation_data FROM datasets WHERE id = ?", [dataset_id]
            ).fetchone()

            if result is None or result[0] is None:
                return None

            return json.loads(result[0])

    def create_review(self, review_data: dict) -> bool:
        """
        Create a new review.

        Args:
            review_data: Review data dictionary

        Returns:
            True if successful
        """
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO reviews (
                    id, dataset_id, dataset_version, reviewer_wallet, rating,
                    review_text, review_text_cid, usage_receipt_attestation,
                    review_attestation_id, review_attestation_address, 
                    helpful_count, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    review_data["id"],
                    review_data["dataset_id"],
                    review_data["dataset_version"],
                    review_data["reviewer_wallet"],
                    review_data["rating"],
                    review_data["review_text"],
                    review_data["review_text_cid"],
                    review_data["usage_receipt_attestation"],
                    review_data["review_attestation_id"],
                    review_data["review_attestation_address"],
                    review_data["helpful_count"],
                    review_data["created_at"],
                ],
            )
            return True

    def get_reviews_for_dataset(
        self, dataset_id: str, dataset_version: str, limit: int = 50, offset: int = 0
    ) -> List[dict]:
        """Get reviews for a dataset."""
        with self.get_connection() as conn:
            results = conn.execute(
                """
                SELECT * FROM reviews
                WHERE dataset_id = ? AND dataset_version = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                [dataset_id, dataset_version, limit, offset],
            ).fetchall()

            reviews = []
            for row in results:
                columns = [col[0] for col in conn.description]
                review_dict = dict(zip(columns, row))
                reviews.append(review_dict)

            return reviews

    def count_reviews_for_dataset(self, dataset_id: str, dataset_version: str) -> int:
        """Count total reviews for a dataset."""
        with self.get_connection() as conn:
            result = conn.execute(
                """
                SELECT COUNT(*) FROM reviews
                WHERE dataset_id = ? AND dataset_version = ?
                """,
                [dataset_id, dataset_version],
            ).fetchone()
            return result[0] if result else 0

    def get_review_by_wallet_and_dataset(
        self, reviewer_wallet: str, dataset_id: str, dataset_version: str
    ) -> Optional[dict]:
        """Check if a user already reviewed a dataset."""
        with self.get_connection() as conn:
            result = conn.execute(
                """
                SELECT * FROM reviews
                WHERE reviewer_wallet = ? AND dataset_id = ? AND dataset_version = ?
                """,
                [reviewer_wallet, dataset_id, dataset_version],
            ).fetchone()

            if result is None:
                return None

            columns = [col[0] for col in conn.description]
            return dict(zip(columns, result))

    def add_helpful_vote(self, review_id: str, voter_wallet: str) -> bool:
        """Record a helpful vote."""
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO review_helpful_votes (review_id, voter_wallet)
                VALUES (?, ?)
                """,
                [review_id, voter_wallet],
            )
            return True

    def get_helpful_vote(self, review_id: str, voter_wallet: str) -> bool:
        """Check if user already voted helpful."""
        with self.get_connection() as conn:
            result = conn.execute(
                """
                SELECT COUNT(*) FROM review_helpful_votes
                WHERE review_id = ? AND voter_wallet = ?
                """,
                [review_id, voter_wallet],
            ).fetchone()
            return result[0] > 0 if result else False

    def increment_review_helpful_count(self, review_id: str) -> int:
        """Increment helpful count and return new count."""
        with self.get_connection() as conn:
            conn.execute(
                """
                UPDATE reviews
                SET helpful_count = helpful_count + 1
                WHERE id = ?
                """,
                [review_id],
            )

            result = conn.execute(
                "SELECT helpful_count FROM reviews WHERE id = ?", [review_id]
            ).fetchone()

            return result[0] if result else 0


# Global database instance
db = DuckDBManager()
