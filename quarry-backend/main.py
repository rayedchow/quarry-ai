"""
Quarry Backend API

A FastAPI backend for managing datasets with DuckDB storage.
Supports uploading CSV, JSON, and SQL DDL files, which are converted
to Parquet format for efficient storage and querying.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import datasets, agent

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="""
    Quarry API provides endpoints for managing datasets.
    
    ## Features
    
    - **Upload Datasets**: Upload CSV, JSON, or SQL DDL files
    - **View Datasets**: Browse and search published datasets
    - **Query Data**: Execute queries against dataset data
    - **Schema Management**: Automatic schema extraction and storage
    
    ## File Formats
    
    - **CSV**: Standard CSV files with headers
    - **JSON**: Array of objects or schema definitions
    - **SQL**: DDL statements (CREATE TABLE)
    
    All files are converted to Parquet format for efficient storage and querying.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(datasets.router, prefix="/api")
app.include_router(agent.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "database": "connected"
        }
    )


@app.get("/api")
async def api_info():
    """API info endpoint."""
    return {
        "version": "1.0.0",
        "endpoints": {
            "datasets": {
                "list": "GET /api/datasets",
                "get": "GET /api/datasets/{slug}",
                "create": "POST /api/datasets",
                "update": "PATCH /api/datasets/{slug}",
                "delete": "DELETE /api/datasets/{slug}",
                "query": "POST /api/datasets/{slug}/query",
                "preview": "GET /api/datasets/{slug}/preview",
                "add_data": "POST /api/datasets/{slug}/data",
                "tags": "GET /api/datasets/tags"
            }
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )

