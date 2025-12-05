import json
import re
from pathlib import Path
from typing import Optional

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from config import settings
from models import ColumnSchema


class FileConverter:
    """
    Service for converting various file formats to Parquet.
    Supports CSV, JSON, and SQL DDL files.
    """
    
    # SQL type to pandas/pyarrow type mapping
    SQL_TYPE_MAP = {
        'int': 'int64',
        'integer': 'int64',
        'bigint': 'int64',
        'smallint': 'int32',
        'tinyint': 'int16',
        'float': 'float64',
        'double': 'float64',
        'decimal': 'float64',
        'numeric': 'float64',
        'real': 'float32',
        'varchar': 'string',
        'char': 'string',
        'text': 'string',
        'string': 'string',
        'bool': 'bool',
        'boolean': 'bool',
        'date': 'datetime64[ns]',
        'datetime': 'datetime64[ns]',
        'timestamp': 'datetime64[ns]',
        'time': 'string',
        'json': 'string',
        'uuid': 'string',
        'array': 'object',
    }
    
    def __init__(self, parquet_dir: Path = None):
        self.parquet_dir = parquet_dir or settings.parquet_dir
        self.parquet_dir.mkdir(parents=True, exist_ok=True)
    
    def convert_to_parquet(
        self,
        file_path: Path,
        output_name: str,
        file_type: Optional[str] = None
    ) -> tuple[Path, list[ColumnSchema], int]:
        """
        Convert a file to Parquet format.
        
        Args:
            file_path: Path to the source file
            output_name: Name for the output parquet file (without extension)
            file_type: Optional file type override (csv, json, sql)
        
        Returns:
            Tuple of (parquet_path, schema_columns, row_count)
        """
        if file_type is None:
            file_type = file_path.suffix.lower().lstrip('.')
        
        output_path = self.parquet_dir / f"{output_name}.parquet"
        
        if file_type == 'csv':
            return self._convert_csv(file_path, output_path)
        elif file_type == 'json':
            return self._convert_json(file_path, output_path)
        elif file_type == 'sql':
            return self._convert_sql(file_path, output_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def _convert_csv(
        self,
        file_path: Path,
        output_path: Path
    ) -> tuple[Path, list[ColumnSchema], int]:
        """Convert CSV file to Parquet."""
        # Read CSV with pandas
        df = pd.read_csv(file_path)
        
        # Extract schema
        schema_columns = self._extract_schema_from_dataframe(df)
        
        # Write to parquet
        table = pa.Table.from_pandas(df)
        pq.write_table(table, output_path, compression='snappy')
        
        return output_path, schema_columns, len(df)
    
    def _convert_json(
        self,
        file_path: Path,
        output_path: Path
    ) -> tuple[Path, list[ColumnSchema], int]:
        """Convert JSON file to Parquet."""
        with open(file_path, 'r') as f:
            content = f.read().strip()
        
        # Try to parse as JSON
        data = json.loads(content)
        
        # Handle different JSON structures
        if isinstance(data, list):
            # Array of objects
            df = pd.DataFrame(data)
        elif isinstance(data, dict):
            # Check if it's a schema definition or data
            if 'data' in data:
                df = pd.DataFrame(data['data'])
            elif 'rows' in data:
                df = pd.DataFrame(data['rows'])
            elif 'columns' in data and isinstance(data.get('columns'), list):
                # Schema definition - create empty DataFrame with schema
                columns = {col.get('name', col): [] for col in data['columns']}
                df = pd.DataFrame(columns)
                # Return schema from definition
                schema_columns = self._extract_schema_from_json_def(data['columns'])
                table = pa.Table.from_pandas(df)
                pq.write_table(table, output_path, compression='snappy')
                return output_path, schema_columns, 0
            else:
                # Single object - wrap in list
                df = pd.DataFrame([data])
        else:
            raise ValueError("Unsupported JSON structure")
        
        # Extract schema
        schema_columns = self._extract_schema_from_dataframe(df)
        
        # Write to parquet
        table = pa.Table.from_pandas(df)
        pq.write_table(table, output_path, compression='snappy')
        
        return output_path, schema_columns, len(df)
    
    def _convert_sql(
        self,
        file_path: Path,
        output_path: Path
    ) -> tuple[Path, list[ColumnSchema], int]:
        """
        Convert SQL DDL file to Parquet.
        Creates empty Parquet with schema extracted from DDL.
        """
        with open(file_path, 'r') as f:
            sql_content = f.read()
        
        # Parse CREATE TABLE statement
        schema_columns = self._parse_sql_ddl(sql_content)
        
        if not schema_columns:
            raise ValueError("Could not parse SQL DDL - no columns found")
        
        # Create empty DataFrame with schema
        columns = {col.name: pd.Series(dtype=self._sql_to_pandas_type(col.type)) 
                   for col in schema_columns}
        df = pd.DataFrame(columns)
        
        # Write to parquet
        table = pa.Table.from_pandas(df)
        pq.write_table(table, output_path, compression='snappy')
        
        return output_path, schema_columns, 0
    
    def _extract_schema_from_dataframe(self, df: pd.DataFrame) -> list[ColumnSchema]:
        """Extract schema information from a pandas DataFrame."""
        schema_columns = []
        
        for col_name in df.columns:
            dtype = str(df[col_name].dtype)
            
            # Map pandas dtype to friendly type name
            if 'int' in dtype:
                type_name = 'integer'
            elif 'float' in dtype:
                type_name = 'float'
            elif 'bool' in dtype:
                type_name = 'boolean'
            elif 'datetime' in dtype:
                type_name = 'timestamp'
            elif 'object' in dtype:
                # Check if it might be an array
                sample = df[col_name].dropna().head(1)
                if len(sample) > 0 and isinstance(sample.iloc[0], (list, dict)):
                    type_name = 'array' if isinstance(sample.iloc[0], list) else 'json'
                else:
                    type_name = 'string'
            else:
                type_name = 'string'
            
            schema_columns.append(ColumnSchema(
                name=col_name,
                type=type_name,
                semantic=self._infer_semantic(col_name, type_name)
            ))
        
        return schema_columns
    
    def _extract_schema_from_json_def(self, columns: list) -> list[ColumnSchema]:
        """Extract schema from JSON schema definition."""
        schema_columns = []
        
        for col in columns:
            if isinstance(col, dict):
                name = col.get('name', '')
                col_type = col.get('type', 'string')
                semantic = col.get('semantic', col.get('description', ''))
            else:
                name = str(col)
                col_type = 'string'
                semantic = ''
            
            if name:
                schema_columns.append(ColumnSchema(
                    name=name,
                    type=col_type,
                    semantic=semantic or self._infer_semantic(name, col_type)
                ))
        
        return schema_columns
    
    def _parse_sql_ddl(self, sql_content: str) -> list[ColumnSchema]:
        """Parse SQL DDL to extract column definitions."""
        schema_columns = []
        
        # Find CREATE TABLE statement
        create_pattern = r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w\.`"]+\s*\((.*?)\)(?:\s*;|\s*$)'
        match = re.search(create_pattern, sql_content, re.IGNORECASE | re.DOTALL)
        
        if not match:
            return schema_columns
        
        columns_str = match.group(1)
        
        # Parse each column definition
        # Split on commas but not within parentheses
        column_defs = self._split_column_defs(columns_str)
        
        for col_def in column_defs:
            col_def = col_def.strip()
            if not col_def:
                continue
            
            # Skip constraints (PRIMARY KEY, FOREIGN KEY, etc.)
            if re.match(r'^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|INDEX)', col_def, re.IGNORECASE):
                continue
            
            # Parse column: name type [constraints] [COMMENT 'semantic']
            col_match = re.match(
                r'[`"\[]?(\w+)[`"\]]?\s+(\w+(?:\([^)]*\))?)',
                col_def,
                re.IGNORECASE
            )
            
            if col_match:
                col_name = col_match.group(1)
                col_type = col_match.group(2).lower()
                
                # Extract comment if present
                comment_match = re.search(r"COMMENT\s+['\"]([^'\"]*)['\"]", col_def, re.IGNORECASE)
                semantic = comment_match.group(1) if comment_match else ""
                
                # Normalize type
                base_type = col_type.split('(')[0]
                friendly_type = self._normalize_sql_type(base_type)
                
                schema_columns.append(ColumnSchema(
                    name=col_name,
                    type=friendly_type,
                    semantic=semantic or self._infer_semantic(col_name, friendly_type)
                ))
        
        return schema_columns
    
    def _split_column_defs(self, columns_str: str) -> list[str]:
        """Split column definitions, respecting parentheses."""
        result = []
        current = ""
        depth = 0
        
        for char in columns_str:
            if char == '(':
                depth += 1
                current += char
            elif char == ')':
                depth -= 1
                current += char
            elif char == ',' and depth == 0:
                result.append(current)
                current = ""
            else:
                current += char
        
        if current.strip():
            result.append(current)
        
        return result
    
    def _normalize_sql_type(self, sql_type: str) -> str:
        """Normalize SQL type to friendly type name."""
        type_lower = sql_type.lower()
        
        type_map = {
            'int': 'integer',
            'integer': 'integer',
            'bigint': 'integer',
            'smallint': 'integer',
            'tinyint': 'integer',
            'float': 'float',
            'double': 'float',
            'decimal': 'float',
            'numeric': 'float',
            'real': 'float',
            'varchar': 'string',
            'char': 'string',
            'text': 'string',
            'string': 'string',
            'bool': 'boolean',
            'boolean': 'boolean',
            'date': 'date',
            'datetime': 'timestamp',
            'timestamp': 'timestamp',
            'time': 'time',
            'json': 'json',
            'jsonb': 'json',
            'uuid': 'uuid',
            'array': 'array',
        }
        
        return type_map.get(type_lower, 'string')
    
    def _sql_to_pandas_type(self, sql_type: str) -> str:
        """Convert SQL type to pandas dtype."""
        type_lower = sql_type.lower()
        return self.SQL_TYPE_MAP.get(type_lower, 'object')
    
    def _infer_semantic(self, column_name: str, column_type: str) -> str:
        """Infer semantic description from column name and type."""
        name_lower = column_name.lower()
        
        # Common patterns
        patterns = {
            'id': 'Unique identifier',
            '_id': 'Reference identifier',
            'uuid': 'Universally unique identifier',
            'hash': 'Hash value',
            'name': 'Name field',
            'email': 'Email address',
            'phone': 'Phone number',
            'address': 'Physical address',
            'date': 'Date value',
            'time': 'Time value',
            'timestamp': 'Timestamp',
            'created': 'Creation timestamp',
            'updated': 'Last update timestamp',
            'count': 'Count/quantity',
            'amount': 'Monetary or numeric amount',
            'price': 'Price value',
            'score': 'Score or rating',
            'status': 'Status indicator',
            'type': 'Type classification',
            'category': 'Category classification',
            'description': 'Text description',
            'url': 'URL/web address',
            'lat': 'Latitude coordinate',
            'lng': 'Longitude coordinate',
            'lon': 'Longitude coordinate',
        }
        
        for pattern, semantic in patterns.items():
            if pattern in name_lower:
                return semantic
        
        # Default based on type
        type_defaults = {
            'string': 'Text field',
            'integer': 'Numeric value',
            'float': 'Decimal value',
            'boolean': 'Boolean flag',
            'timestamp': 'Timestamp',
            'date': 'Date value',
            'array': 'Array of values',
            'json': 'JSON data',
        }
        
        return type_defaults.get(column_type, 'Data field')


# Global instance
file_converter = FileConverter()

