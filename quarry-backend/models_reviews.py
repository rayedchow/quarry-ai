"""
Review-related models.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    """Create a new review."""
    dataset_id: str
    dataset_version: str = "v1"
    rating: int = Field(ge=1, le=5, description="Star rating (1-5)")
    review_text: str = Field(max_length=2000, description="Review text")
    reviewer_wallet: str
    usage_receipt_attestation: str  # Required: proof of purchase


class Review(BaseModel):
    """Review model with all fields."""
    id: str
    dataset_id: str
    dataset_version: str
    reviewer_wallet: str
    rating: int
    review_text: str
    review_text_cid: str  # IPFS CID
    usage_receipt_attestation: str
    review_attestation_id: str  # On-chain attestation
    review_attestation_address: str
    helpful_count: int = 0
    created_at: datetime
    is_verified_purchaser: bool = True


class ReviewResponse(BaseModel):
    """Review response for frontend."""
    id: str
    dataset_id: str
    reviewer_wallet: str
    rating: int
    review_text: str
    review_text_cid: str
    usage_receipt_attestation: str
    review_attestation_id: str
    helpful_count: int
    created_at: str
    is_verified_purchaser: bool
    time_ago: str


class ReviewListResponse(BaseModel):
    """List of reviews with stats."""
    reviews: list[ReviewResponse]
    total_reviews: int
    average_rating: float
    rating_distribution: dict[int, int]  # {1: count, 2: count, ...}
    verified_purchasers_only: bool = True


class ReputationScore(BaseModel):
    """Combined reputation score."""
    automated_score: int  # QA score (0-100)
    user_rating: float  # Average star rating (0-5)
    combined_score: float  # Weighted combination
    total_reviews: int
    verified_reviews: int
