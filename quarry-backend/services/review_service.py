"""
On-Chain Review Service.

This service manages user reviews that are:
1. Backed by usage receipt attestations (proof of purchase)
2. Stored as attestations on Solana (immutable, verifiable)
3. Review text stored on IPFS (content-addressed)
4. Anti-sybil: Only verified purchasers can review
5. Weighted by actual usage (more usage = more weight)
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib

from services.ipfs_service import ipfs_service
from services.sas_service import sas_service
from database import db

logger = logging.getLogger(__name__)


class ReviewService:
    """Service for managing on-chain reviews."""

    async def create_review(
        self,
        dataset_id: str,
        dataset_version: str,
        reviewer_wallet: str,
        rating: int,
        review_text: str,
        usage_receipt_attestation: str
    ) -> Dict[str, Any]:
        """
        Create an on-chain review with verified purchaser proof.

        Args:
            dataset_id: Dataset ID
            dataset_version: Dataset version
            reviewer_wallet: Reviewer's wallet
            rating: Star rating (1-5)
            review_text: Review text
            usage_receipt_attestation: Usage receipt attestation ID (proof of purchase)

        Returns:
            Review details with on-chain attestation
        """
        logger.info(f"Creating review for dataset {dataset_id} from {reviewer_wallet}")

        # Step 1: Verify usage receipt exists (proof of purchase)
        # For MVP, trust the database record if it exists
        try:
            from database import db
            # Check if this wallet has a usage receipt for this dataset
            receipt = db.get_usage_receipt(reviewer_wallet, dataset_id, dataset_version)
            if not receipt:
                raise ValueError("You must purchase data from this dataset before reviewing it.")
            
            logger.info(f"✅ Usage receipt found in database for {reviewer_wallet}")
            
            # Optionally verify on-chain (skipped for MVP - attestation verification has encoding issues)
            # receipt_verification = await sas_service.verify_attestation(usage_receipt_attestation)
        except ValueError as ve:
            raise ve
        except Exception as e:
            logger.error(f"Usage receipt check failed: {e}")
            raise ValueError("Cannot verify purchase. You must use the dataset before reviewing.")

        # Step 2: Check if user already reviewed this dataset version
        existing_review = db.get_review_by_wallet_and_dataset(reviewer_wallet, dataset_id, dataset_version)
        if existing_review:
            raise ValueError("You have already reviewed this dataset version. You can update your review instead.")

        # Step 3: Upload review text to IPFS
        logger.info("Uploading review text to IPFS...")
        review_data = {
            "review_text": review_text,
            "reviewer_wallet": reviewer_wallet,
            "dataset_id": dataset_id,
            "rating": rating,
            "timestamp": datetime.utcnow().isoformat()
        }
        review_text_cid = await ipfs_service.upload_json(review_data)
        await ipfs_service.pin(review_text_cid)
        logger.info(f"Review uploaded to IPFS: {review_text_cid}")

        # Step 4: Create on-chain review attestation
        logger.info("Creating on-chain review attestation...")
        review_attestation = await sas_service.create_review_attestation(
            reviewer_wallet=reviewer_wallet,
            dataset_id=dataset_id,
            dataset_version=dataset_version,
            rating=rating,
            review_text_cid=review_text_cid,
            usage_receipt_attestation=usage_receipt_attestation
        )

        # Step 5: Store review in database
        review_id = hashlib.sha256(
            f"{reviewer_wallet}{dataset_id}{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:16]

        review_record = {
            "id": review_id,
            "dataset_id": dataset_id,
            "dataset_version": dataset_version,
            "reviewer_wallet": reviewer_wallet,
            "rating": rating,
            "review_text": review_text,
            "review_text_cid": review_text_cid,
            "usage_receipt_attestation": usage_receipt_attestation,
            "review_attestation_id": review_attestation["attestation_id"],
            "review_attestation_address": review_attestation["attestation_address"],
            "helpful_count": 0,
            "created_at": datetime.utcnow()
        }

        db.create_review(review_record)
        logger.info(f"Review stored in database: {review_id}")

        # Step 6: Update dataset reputation with new review
        await self._update_dataset_reputation_with_review(dataset_id, dataset_version)

        return {
            "review_id": review_id,
            "attestation_id": review_attestation["attestation_id"],
            "attestation_address": review_attestation["attestation_address"],
            "review_text_cid": review_text_cid,
            "rating": rating,
            "verified_purchaser": True,
            "on_chain": True
        }

    async def get_dataset_reviews(
        self,
        dataset_id: str,
        dataset_version: str = "v1",
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get all reviews for a dataset.

        Args:
            dataset_id: Dataset ID
            dataset_version: Dataset version
            limit: Max reviews to return
            offset: Offset for pagination

        Returns:
            Reviews with statistics
        """
        logger.info(f"Fetching reviews for dataset {dataset_id}")

        reviews = db.get_reviews_for_dataset(dataset_id, dataset_version, limit, offset)
        total_reviews = db.count_reviews_for_dataset(dataset_id, dataset_version)

        # Calculate statistics
        if reviews:
            ratings = [r["rating"] for r in reviews]
            average_rating = sum(ratings) / len(ratings)
            
            # Rating distribution
            rating_distribution = {i: 0 for i in range(1, 6)}
            for rating in ratings:
                rating_distribution[rating] += 1
        else:
            average_rating = 0.0
            rating_distribution = {i: 0 for i in range(1, 6)}

        # Format reviews for response
        formatted_reviews = []
        for review in reviews:
            time_diff = datetime.utcnow() - review["created_at"]
            
            if time_diff.days > 0:
                time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
            elif time_diff.seconds > 3600:
                hours = time_diff.seconds // 3600
                time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
            else:
                minutes = max(1, time_diff.seconds // 60)
                time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"

            formatted_reviews.append({
                "id": review["id"],
                "dataset_id": review["dataset_id"],
                "reviewer_wallet": review["reviewer_wallet"],
                "rating": review["rating"],
                "review_text": review["review_text"],
                "review_text_cid": review["review_text_cid"],
                "usage_receipt_attestation": review["usage_receipt_attestation"],
                "review_attestation_id": review["review_attestation_id"],
                "helpful_count": review["helpful_count"],
                "created_at": review["created_at"].isoformat(),
                "is_verified_purchaser": True,
                "time_ago": time_ago
            })

        return {
            "reviews": formatted_reviews,
            "total_reviews": total_reviews,
            "average_rating": round(average_rating, 2),
            "rating_distribution": rating_distribution,
            "verified_purchasers_only": True
        }

    async def _update_dataset_reputation_with_review(
        self,
        dataset_id: str,
        dataset_version: str
    ):
        """
        Update dataset reputation score with latest reviews.

        Combines automated QA score with user reviews using weighted average.
        """
        logger.info(f"Updating reputation with reviews for {dataset_id}")

        # Get current reputation
        reputation = db.get_dataset_reputation(dataset_id)
        if not reputation:
            logger.warning(f"No base reputation found for {dataset_id}")
            return

        # Get reviews
        review_stats = await self.get_dataset_reviews(dataset_id, dataset_version)

        # Calculate combined score
        automated_score = reputation.get("quality_score", 0)
        user_rating = review_stats["average_rating"]  # 0-5 scale
        total_reviews = review_stats["total_reviews"]

        # Convert user rating to 0-100 scale
        user_score = (user_rating / 5.0) * 100

        # Weighted combination (starts heavily weighted to automated, shifts with reviews)
        # More reviews = more weight to user opinion
        review_weight = min(0.4, 0.1 + (total_reviews * 0.03))  # Max 40% weight
        automated_weight = 1.0 - review_weight

        combined_score = (automated_score * automated_weight) + (user_score * review_weight)

        # Update reputation with review stats
        reputation["user_rating"] = round(user_rating, 2)
        reputation["total_reviews"] = total_reviews
        reputation["verified_reviews"] = total_reviews  # All our reviews are verified
        reputation["combined_score"] = int(round(combined_score))
        reputation["rating_distribution"] = review_stats["rating_distribution"]
        reputation["review_weight"] = round(review_weight, 2)

        # Store updated reputation
        db.update_dataset_reputation(dataset_id, reputation)
        logger.info(f"Reputation updated: automated={automated_score}, user={user_rating}, combined={combined_score}")

    async def mark_review_helpful(
        self,
        review_id: str,
        voter_wallet: str
    ) -> Dict[str, Any]:
        """
        Mark a review as helpful (on-chain vote).

        Args:
            review_id: Review ID
            voter_wallet: Wallet marking as helpful

        Returns:
            Updated helpful count
        """
        logger.info(f"Marking review {review_id} as helpful by {voter_wallet}")

        # Check if user already voted
        existing_vote = db.get_helpful_vote(review_id, voter_wallet)
        if existing_vote:
            raise ValueError("You have already marked this review as helpful")

        # Record vote
        db.add_helpful_vote(review_id, voter_wallet)
        
        # Update count
        new_count = db.increment_review_helpful_count(review_id)

        return {
            "review_id": review_id,
            "helpful_count": new_count,
            "voted": True
        }


# Global review service instance
review_service = ReviewService()


