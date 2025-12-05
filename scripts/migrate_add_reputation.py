#!/usr/bin/env python3
"""
Migration: Add reputation_data column to datasets table.

This script adds the reputation_data JSON column to existing databases.
"""

import sys
from pathlib import Path

# Change to backend directory
backend_dir = Path(__file__).parent.parent / "quarry-backend"
sys.path.insert(0, str(backend_dir))

try:
    import duckdb
    from config import settings
except ImportError:
    print("Error: Could not import required modules.")
    sys.exit(1)


def main():
    """Run migration."""
    print("=" * 70)
    print("MIGRATION: Add reputation_data column")
    print("=" * 70)
    
    db_path = Path(settings.database_path)
    
    if not db_path.exists():
        print("\nNo database found. Nothing to migrate.")
        return
    
    try:
        conn = duckdb.connect(str(db_path))
        
        # Check if column already exists
        result = conn.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'datasets' AND column_name = 'reputation_data'
        """).fetchall()
        
        if result:
            print("\n✓ Column 'reputation_data' already exists. No migration needed.")
            conn.close()
            return
        
        # Add the column
        print("\nAdding 'reputation_data' column...")
        conn.execute("ALTER TABLE datasets ADD COLUMN reputation_data JSON")
        
        print("✓ Migration complete!")
        print("\nThe reputation_data column has been added to the datasets table.")
        
        conn.close()
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print("=" * 70)


if __name__ == "__main__":
    main()

