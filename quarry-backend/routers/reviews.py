"""
Reviews Router - On-chain verified reviews.

All reviews are:
1. Backed by usage receipt attestations (proof of purchase)
2. Stored as attestations on Solana
3. Review text on IPFS
4. Anti-sybil protected
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.review_service import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


# Request Models
class CreateReviewRequest(BaseModel):
    """Request to create a review."""

    dataset_id: str
    dataset_version: str = "v1"
    rating: int = Field(ge=1, le=5)
    review_text: str = Field(max_length=2000)
    reviewer_wallet: str
    usage_receipt_attestation: str


class MarkHelpfulRequest(BaseModel):
    """Request to mark review as helpful."""

    review_id: str
    voter_wallet: str


# Endpoints
@router.post("")
async def create_review(request: CreateReviewRequest):
    """
    Create an on-chain review for a dataset.

    Requirements:
    - Must have usage receipt attestation (proof of purchase)
    - Rating must be 1-5 stars
    - Review text max 2000 characters
    - One review per wallet per dataset version

    Creates:
    - IPFS entry for review text
    - On-chain attestation linking review to usage receipt
    - Database record with all details
    """
    try:
        review = await review_service.create_review(
            dataset_id=request.dataset_id,
            dataset_version=request.dataset_version,
            reviewer_wallet=request.reviewer_wallet,
            rating=request.rating,
            review_text=request.review_text,
            usage_receipt_attestation=request.usage_receipt_attestation,
        )
        return JSONResponse(status_code=201, content=review)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create review: {str(e)}"
        )


@router.get("/dataset/{dataset_id}")
async def get_dataset_reviews(
    dataset_id: str,
    version: str = Query(default="v1"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    Get all reviews for a dataset.

    Returns:
    - List of verified reviews
    - Average rating
    - Rating distribution
    - Total review count
    """
    try:
        reviews = await review_service.get_dataset_reviews(
            dataset_id=dataset_id,
            dataset_version=version,
            limit=limit,
            offset=offset,
        )
        return JSONResponse(status_code=200, content=reviews)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch reviews: {str(e)}"
        )


@router.post("/helpful")
async def mark_review_helpful(request: MarkHelpfulRequest):
    """
    Mark a review as helpful.

    Each wallet can only vote once per review (anti-spam).
    """
    try:
        result = await review_service.mark_review_helpful(
            review_id=request.review_id, voter_wallet=request.voter_wallet
        )
        return JSONResponse(status_code=200, content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark helpful: {str(e)}")


@router.get("/wallet/{wallet_address}")
async def get_wallet_reviews(
    wallet_address: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    Get all reviews by a specific wallet.

    Useful for showing a user's review history.
    """
    try:
        with db.get_connection() as conn:
            results = conn.execute(
                """
                SELECT * FROM reviews
                WHERE reviewer_wallet = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                [wallet_address, limit, offset],
            ).fetchall()

            reviews = []
            for row in results:
                columns = [col[0] for col in conn.description]
                review_dict = dict(zip(columns, row))
                reviews.append(review_dict)

            return JSONResponse(
                status_code=200,
                content={"reviews": reviews, "total": len(reviews)},
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch wallet reviews: {str(e)}"
        )


@router.get("/check-eligibility/{dataset_id}/{wallet_address}")
async def check_review_eligibility(dataset_id: str, wallet_address: str):
    """
    Check if a wallet is eligible to review a dataset.

    Returns:
    - can_review: bool
    - reason: str
    - usage_receipt_attestation: str (if eligible)
    """
    try:
        # Check for existing review
        existing_review = db.get_review_by_wallet_and_dataset(
            wallet_address, dataset_id, "v1"
        )

        if existing_review:
            return JSONResponse(
                status_code=200,
                content={
                    "can_review": False,
                    "reason": "You have already reviewed this dataset",
                    "existing_review_id": existing_review["id"],
                },
            )

        # Check for usage receipts in database
        # Query database for usage receipt for this wallet + dataset
        usage_receipt = db.get_usage_receipt(wallet_address, dataset_id)

        if usage_receipt:
            return JSONResponse(
                status_code=200,
                content={
                    "can_review": True,
                    "reason": "You have purchased this dataset",
                    "usage_receipt_attestation": usage_receipt["attestation_address"],
                },
            )
        else:
            return JSONResponse(
                status_code=200,
                content={
                    "can_review": False,
                    "reason": "You must purchase data from this dataset first",
                },
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check eligibility: {str(e)}"
        )


# Import at module level for middleware
from database import db
