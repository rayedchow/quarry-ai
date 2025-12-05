#!/usr/bin/env python3
"""
Reset all datasets and data in Quarry.

This script:
1. Deletes all datasets from DuckDB
2. Removes all parquet files
3. Removes all uploaded files
4. Clears the uploads directory

⚠️  WARNING: This is destructive and cannot be undone!
"""

import sys
import os
from pathlib import Path
import shutil

# Change to backend directory
backend_dir = Path(__file__).parent.parent / "quarry-backend"
os.chdir(backend_dir)

# Add backend directory to path
sys.path.insert(0, str(backend_dir))

try:
    import duckdb
    from config import settings
except ImportError:
    print("Error: Could not import required modules.")
    print("Make sure you're running from the project root with venv activated.")
    sys.exit(1)


def confirm_reset():
    """Ask user to confirm the reset operation."""
    print("=" * 70)
    print("⚠️  WARNING: DESTRUCTIVE OPERATION")
    print("=" * 70)
    print("\nThis will DELETE:")
    print("  - All datasets from the database")
    print("  - All parquet files")
    print("  - All uploaded files")
    print("\nThis action CANNOT be undone!")
    print("=" * 70)

    response = input("\nType 'yes' to confirm reset: ")
    return response.lower() == "yes"


def delete_directory_contents(directory: Path, description: str):
    """Delete all contents of a directory."""
    if not directory.exists():
        print(f"  {description}: Directory doesn't exist, skipping")
        return 0

    count = 0
    for item in directory.iterdir():
        if item.name == ".gitkeep":
            continue  # Keep .gitkeep files

        try:
            if item.is_file():
                item.unlink()
                count += 1
            elif item.is_dir():
                shutil.rmtree(item)
                count += 1
        except Exception as e:
            print(f"  Warning: Could not delete {item}: {e}")

    print(f"  {description}: Deleted {count} items")
    return count


def reset_database():
    """Reset the DuckDB database."""
    db_path = Path(settings.database_path)

    if not db_path.exists():
        print("  Database: No database file found, skipping")
        return 0

    try:
        # Connect to database
        conn = duckdb.connect(str(db_path))

        # Get count of datasets
        result = conn.execute("SELECT COUNT(*) FROM datasets").fetchone()
        dataset_count = result[0] if result else 0

        # Drop and recreate the datasets table
        conn.execute("DROP TABLE IF EXISTS datasets")
        conn.execute("""
            CREATE TABLE datasets (
                id VARCHAR PRIMARY KEY,
                slug VARCHAR UNIQUE NOT NULL,
                name VARCHAR NOT NULL,
                publisher VARCHAR NOT NULL,
                tags JSON,
                description TEXT,
                summary TEXT,
                price_per_row DOUBLE DEFAULT 0.001,
                row_count INTEGER DEFAULT 0,
                column_count INTEGER DEFAULT 0,
                update_frequency VARCHAR DEFAULT 'static',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                schema_columns JSON,
                parquet_path VARCHAR,
                original_filename VARCHAR
            )
        """)

        conn.close()
        print(f"  Database: Deleted {dataset_count} datasets")
        return dataset_count

    except Exception as e:
        print(f"  Database: Error - {e}")
        return 0


def main():
    """Main reset function."""
    print("\nQUARRY DATA RESET SCRIPT")
    print()

    # Check for --force flag
    force = "--force" in sys.argv or "-f" in sys.argv

    # Confirm operation
    if not force and not confirm_reset():
        print("\nReset cancelled.")
        return

    if force:
        print("Running in FORCE mode (skipping confirmation)\n")

    print("\nResetting data...\n")

    total_deleted = 0

    # Reset database
    print("1. Resetting database...")
    total_deleted += reset_database()

    # Delete parquet files
    print("\n2. Deleting parquet files...")
    parquet_dir = Path(settings.parquet_dir)
    total_deleted += delete_directory_contents(parquet_dir, "Parquet directory")

    # Delete uploaded files
    print("\n3. Deleting uploaded files...")
    uploads_dir = Path(settings.uploads_dir)
    total_deleted += delete_directory_contents(uploads_dir, "Uploads directory")

    # Summary
    print("\n" + "=" * 70)
    print("RESET COMPLETE")
    print("=" * 70)
    print(f"\nTotal items deleted: {total_deleted}")
    print("\nThe database is now empty and ready for fresh data.")
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nReset cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError during reset: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
