#!/usr/bin/env python3
"""
Migration: Add publisher_wallet column to datasets table.

This allows publishers to receive payments directly instead of platform wallet.
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
    print("MIGRATION: Add publisher_wallet column")
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
            WHERE table_name = 'datasets' AND column_name = 'publisher_wallet'
        """).fetchall()
        
        if result:
            print("\n✓ Column 'publisher_wallet' already exists. No migration needed.")
            conn.close()
            return
        
        # Add the column
        print("\nAdding 'publisher_wallet' column...")
        conn.execute("ALTER TABLE datasets ADD COLUMN publisher_wallet VARCHAR")
        
        print("✓ Migration complete!")
        print("\nThe publisher_wallet column has been added to the datasets table.")
        print("Publishers can now receive payments directly!")
        
        conn.close()
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print("=" * 70)


if __name__ == "__main__":
    main()

