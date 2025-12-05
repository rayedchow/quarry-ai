from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ColumnSchema(BaseModel):
    """Schema definition for a single column."""

    name: str
    type: str
    semantic: str = ""


class DatasetBase(BaseModel):
    """Base model for dataset operations."""

    name: str
    publisher: str
    tags: list[str] = Field(default_factory=list)
    description: str = ""
    summary: str = ""
    price_per_row: float = 0.001
    update_frequency: str = "static"


class DatasetCreate(DatasetBase):
    """Model for creating a new dataset."""

    pass


class DatasetUpdate(BaseModel):
    """Model for updating an existing dataset."""

    name: Optional[str] = None
    publisher: Optional[str] = None
    tags: Optional[list[str]] = None
    description: Optional[str] = None
    summary: Optional[str] = None
    price_per_row: Optional[float] = None
    update_frequency: Optional[str] = None


class Dataset(DatasetBase):
    """Full dataset model with all fields."""

    id: str
    slug: str
    row_count: int = 0
    column_count: int = 0
    created_at: datetime
    updated_at: datetime
    schema_columns: list[ColumnSchema] = Field(default_factory=list)
    parquet_path: Optional[str] = None
    original_filename: Optional[str] = None

    class Config:
        from_attributes = True


class DatasetResponse(BaseModel):
    """Dataset response model matching frontend expectations."""

    id: str
    slug: str
    name: str
    publisher: str
    tags: list[str]
    description: str
    summary: str
    pricePerRow: float
    rowCount: str
    columnCount: int
    updatedAt: str
    image: str
    schema_: list[ColumnSchema] = Field(alias="schema")

    model_config = {"populate_by_name": True}

    @classmethod
    def from_dataset(cls, dataset: Dataset) -> "DatasetResponse":
        """Convert internal Dataset model to frontend response format."""
        # Format row count for display
        row_count = dataset.row_count
        if row_count >= 1_000_000_000:
            row_count_str = f"{row_count / 1_000_000_000:.1f}B"
        elif row_count >= 1_000_000:
            row_count_str = f"{row_count / 1_000_000:.0f}M"
        elif row_count >= 1_000:
            row_count_str = f"{row_count / 1_000:.0f}K"
        else:
            row_count_str = str(row_count)

        # Format updated_at for display
        now = datetime.utcnow()
        diff = now - dataset.updated_at
        if diff.days > 0:
            updated_str = f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            updated_str = f"{hours} hour{'s' if hours > 1 else ''} ago"
        else:
            minutes = max(1, diff.seconds // 60)
            updated_str = f"{minutes} minute{'s' if minutes > 1 else ''} ago"

        return cls(
            id=dataset.id,
            slug=dataset.slug,
            name=dataset.name,
            publisher=dataset.publisher,
            tags=dataset.tags,
            description=dataset.description,
            summary=dataset.summary,
            pricePerRow=dataset.price_per_row,
            rowCount=row_count_str,
            columnCount=dataset.column_count,
            updatedAt=updated_str,
            image=f"https://picsum.photos/seed/{dataset.slug}/1400/800",
            schema_=dataset.schema_columns,
        )


class DatasetListResponse(BaseModel):
    """Response model for listing datasets."""

    datasets: list[DatasetResponse]
    total: int


class DataQueryRequest(BaseModel):
    """Request model for querying dataset data."""

    sql: Optional[str] = None
    limit: int = Field(default=100, ge=1, le=10000)
    offset: int = Field(default=0, ge=0)
    columns: Optional[list[str]] = None


class DataQueryResponse(BaseModel):
    """Response model for dataset queries."""

    columns: list[str]
    rows: list[list]
    total_rows: int
    returned_rows: int


class TagsResponse(BaseModel):
    """Response model for tags endpoint."""

    tags: list[str]
    counts: dict[str, int]


class UploadResponse(BaseModel):
    """Response model for file upload."""

    dataset: DatasetResponse
    message: str


class ChatMessage(BaseModel):
    """Model for a single chat message."""

    role: str  # "user", "assistant", or "system"
    content: str


class DatasetInfo(BaseModel):
    """Dataset information for agent context."""

    id: int
    slug: str
    name: str
    table_name: str
    schema: list[ColumnSchema]


class AgentChatRequest(BaseModel):
    """Request model for agent chat."""

    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    attached_datasets: list[str] = Field(default_factory=list)
    datasets_info: list[DatasetInfo] = Field(default_factory=list)


class AgentChatResponse(BaseModel):
    """Response model for agent chat."""

    message: str
    role: str = "assistant"


class PaymentRequest(BaseModel):
    """Payment request for query execution."""

    query_id: str
    dataset_slug: str
    dataset_name: str
    sql_query: str
    estimated_rows: int
    price_per_row: float
    total_cost: float


class PaymentConfirmation(BaseModel):
    """Payment confirmation from user."""

    query_id: str
    transaction_signature: str
