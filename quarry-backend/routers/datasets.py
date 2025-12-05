from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse

from models import (
    DatasetCreate,
    DatasetUpdate,
    DatasetResponse,
    DatasetListResponse,
    DataQueryRequest,
    DataQueryResponse,
    TagsResponse,
    UploadResponse,
)
from services.dataset_service import dataset_service

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=DatasetListResponse)
async def list_datasets(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    tag: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
):
    """
    List all datasets with optional filtering.

    - **limit**: Maximum number of datasets to return (1-1000)
    - **offset**: Number of datasets to skip
    - **tag**: Filter by tag
    - **search**: Search in name, description, and publisher
    """
    return await dataset_service.list_datasets(
        limit=limit, offset=offset, tag=tag, search=search
    )


@router.get("/tags", response_model=TagsResponse)
async def get_tags():
    """Get all unique tags with their counts."""
    return await dataset_service.get_tags()


@router.get("/{slug}", response_model=DatasetResponse)
async def get_dataset(slug: str):
    """Get a single dataset by its slug."""
    dataset = await dataset_service.get_dataset(slug)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("", response_model=UploadResponse, status_code=201)
async def create_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    publisher: str = Form(...),
    publisher_wallet: str = Form(...),
    description: str = Form(default=""),
    summary: str = Form(default=""),
    tags: str = Form(default=""),
    price_per_row: float = Form(default=0.001),
    update_frequency: str = Form(default="static"),
):
    """
    Upload a new dataset.

    Accepts CSV, JSON, or SQL DDL files. The file will be converted to Parquet
    format and stored in DuckDB for efficient querying.

    - **file**: The data file (CSV, JSON, or SQL DDL)
    - **name**: Display name for the dataset
    - **publisher**: Publisher/organization name
    - **description**: Detailed description
    - **summary**: Short summary
    - **tags**: Comma-separated list of tags
    - **price_per_row**: Price per row for queries
    - **update_frequency**: Update frequency (realtime, daily, weekly, monthly, static)
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    allowed_extensions = {".csv", ".json", ".sql"}
    file_ext = (
        "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    )

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}",
        )

    # Parse tags
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    # Validate publisher wallet address
    if not publisher_wallet or len(publisher_wallet) < 32:
        raise HTTPException(
            status_code=400,
            detail="Valid publisher wallet address required (Solana address)"
        )

    # Create dataset metadata
    dataset_data = DatasetCreate(
        name=name,
        publisher=publisher,
        publisher_wallet=publisher_wallet,
        description=description,
        summary=summary,
        tags=tag_list,
        price_per_row=price_per_row,
        update_frequency=update_frequency,
    )

    try:
        # Read file content
        content = await file.read()

        # Upload and create dataset
        dataset = await dataset_service.upload_file(
            file_content=content, filename=file.filename, dataset_data=dataset_data
        )

        return UploadResponse(
            dataset=dataset, message=f"Dataset '{name}' created successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create dataset: {str(e)}"
        )


@router.patch("/{slug}", response_model=DatasetResponse)
async def update_dataset(slug: str, data: DatasetUpdate):
    """
    Update an existing dataset's metadata.

    Only the fields provided will be updated.
    """
    dataset = await dataset_service.update_dataset(slug, data)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.delete("/{slug}")
async def delete_dataset(slug: str):
    """Delete a dataset and its associated data files."""
    success = await dataset_service.delete_dataset(slug)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return JSONResponse(
        status_code=200, content={"message": f"Dataset '{slug}' deleted successfully"}
    )


@router.post("/{slug}/data", response_model=UploadResponse)
async def add_data(slug: str, file: UploadFile = File(...)):
    """
    Add more data to an existing dataset.

    The uploaded file will be converted and appended to the existing dataset.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    allowed_extensions = {".csv", ".json", ".sql"}
    file_ext = (
        "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    )

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}",
        )

    try:
        content = await file.read()
        dataset = await dataset_service.add_data_to_dataset(
            slug=slug, file_content=content, filename=file.filename
        )
        return UploadResponse(
            dataset=dataset, message=f"Data added to dataset '{slug}' successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add data: {str(e)}")


@router.post("/{slug}/query", response_model=DataQueryResponse)
async def query_dataset(slug: str, request: DataQueryRequest):
    """
    Query data from a dataset.

    You can either provide a custom SQL query or use the default query
    with limit, offset, and column selection.

    - **sql**: Custom SQL query (the dataset is available as a view)
    - **limit**: Maximum rows to return
    - **offset**: Number of rows to skip
    - **columns**: List of columns to select
    """
    try:
        return await dataset_service.query_dataset(
            slug=slug,
            sql=request.sql,
            limit=request.limit,
            offset=request.offset,
            columns=request.columns,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")


@router.get("/{slug}/preview", response_model=DataQueryResponse)
async def preview_dataset(slug: str, limit: int = Query(default=10, ge=1, le=100)):
    """
    Get a preview of the dataset data.

    Returns the first N rows of the dataset.
    """
    try:
        return await dataset_service.query_dataset(slug=slug, limit=limit, offset=0)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preview failed: {str(e)}")
