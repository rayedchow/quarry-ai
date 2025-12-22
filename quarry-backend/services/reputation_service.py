"""
Reputation Service - Orchestrates QA, IPFS, and SAS services.

This service coordinates the reputation layer by:
1. Running QA checks on datasets
2. Storing reports in IPFS
3. Issuing SAS attestations
4. Managing reputation scores
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import hashlib

from services.qa_service import qa_service
from services.ipfs_service import ipfs_service
from services.sas_service import sas_service
from database import db

logger = logging.getLogger(__name__)


class ReputationService:
    """Service for managing dataset and publisher reputation."""

    async def process_dataset_reputation(
        self,
        dataset_id: str,
        dataset_name: str,
        dataset_version: str,
        parquet_path: str,
        publisher_wallet: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process complete reputation workflow for a dataset.

        This includes:
        1. Running QA checks
        2. Uploading report to IPFS
        3. Creating quality and freshness attestations
        4. Returning reputation summary

        Args:
            dataset_id: Dataset identifier
            dataset_name: Dataset name
            dataset_version: Dataset version (e.g., "v1" or content hash)
            parquet_path: Path to parquet file
            publisher_wallet: Optional publisher wallet for verification

        Returns:
            Reputation summary with attestations and IPFS CIDs
        """
        logger.info(f"Processing reputation for dataset: {dataset_name} ({dataset_id})")

        try:
            # Step 1: Run QA checks
            logger.info("Running QA checks...")
            qa_report = await qa_service.run_qa_checks(
                parquet_path=parquet_path,
                dataset_id=dataset_id,
                dataset_name=dataset_name
            )

            # Step 2: Upload report to IPFS
            logger.info("Uploading QA report to IPFS...")
            report_cid = await ipfs_service.upload_json(qa_report)
            await ipfs_service.pin(report_cid)
            logger.info(f"QA report uploaded: {report_cid}")

            # Step 3: Create dataset quality attestation
            logger.info("Creating quality attestation...")
            quality_attestation = await sas_service.create_dataset_quality_attestation(
                dataset_id=dataset_id,
                dataset_version=dataset_version,
                qa_report=qa_report,
                report_cid=report_cid,
                expiry_days=30
            )

            # Step 4: Create freshness attestation
            logger.info("Creating freshness attestation...")
            freshness_attestation = await sas_service.create_dataset_freshness_attestation(
                dataset_id=dataset_id,
                dataset_version=dataset_version,
                freshness_info=qa_report["freshness"],
                max_age_days=30
            )

            # Step 5: Build reputation summary
            reputation_summary = {
                "dataset_id": dataset_id,
                "dataset_name": dataset_name,
                "dataset_version": dataset_version,
                "dataset_version_pda": sas_service.derive_dataset_version_pda(
                    dataset_id, dataset_version
                ),
                "processed_at": datetime.utcnow().isoformat(),
                "quality_score": qa_report["quality_score"],
                "qa_report": {
                    "ipfs_cid": report_cid,
                    "summary": {
                        "completeness": qa_report["completeness"]["status"],
                        "duplicates": qa_report["duplicates"]["status"],
                        "pii_risk": qa_report["pii_risk"]["risk_level"],
                        "freshness": qa_report["freshness"]["status"]
                    }
                },
                "attestations": {
                    "quality": {
                        "id": quality_attestation["attestation_id"],
                        "address": quality_attestation["attestation_address"],
                        "tx_signature": quality_attestation["transaction_signature"],
                        "issued_at": quality_attestation["issued_at"],
                        "expires_at": quality_attestation["expires_at"],
                        "schema": "dataset_quality_v1"
                    },
                    "freshness": {
                        "id": freshness_attestation["attestation_id"],
                        "address": freshness_attestation["attestation_address"],
                        "tx_signature": freshness_attestation["transaction_signature"],
                        "issued_at": freshness_attestation["issued_at"],
                        "expires_at": freshness_attestation["expires_at"],
                        "schema": "dataset_freshness_v1"
                    }
                },
                "badges": self._calculate_badges(qa_report, quality_attestation, freshness_attestation)
            }

            # Step 6: Store reputation in database
            logger.info("Storing reputation in database...")
            db.update_dataset_reputation(dataset_id, reputation_summary)
            
            logger.info(f"Reputation processing complete. Score: {qa_report['quality_score']}")
            return reputation_summary

        except Exception as e:
            logger.error(f"Failed to process dataset reputation: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise

    async def verify_dataset_reputation(
        self,
        dataset_id: str,
        dataset_version: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get stored reputation data for a dataset.

        Args:
            dataset_id: Dataset identifier
            dataset_version: Dataset version

        Returns:
            Reputation data or None
        """
        logger.info(f"Fetching reputation for dataset: {dataset_id} v{dataset_version}")

        try:
            # Fetch reputation from database
            reputation = db.get_dataset_reputation(dataset_id)
            
            if reputation is None:
                logger.warning(f"No reputation found for dataset: {dataset_id}")
                return None
            
            logger.info(f"Found reputation for dataset: {dataset_id}")
            return reputation

        except Exception as e:
            logger.error(f"Failed to fetch reputation: {e}")
            raise

    async def create_usage_receipt(
        self,
        reviewer_wallet: str,
        dataset_id: str,
        dataset_version: str,
        tx_signature: str,
        rows_accessed: int,
        cost_paid: float
    ) -> Dict[str, Any]:
        """
        Create a usage receipt attestation for verified reviews.

        Args:
            reviewer_wallet: Reviewer's wallet
            dataset_id: Dataset ID
            dataset_version: Dataset version
            tx_signature: Payment transaction signature
            rows_accessed: Rows accessed
            cost_paid: Cost paid in SOL

        Returns:
            Usage receipt details
        """
        logger.info(f"Creating usage receipt for {reviewer_wallet}")

        try:
            attestation = await sas_service.create_usage_receipt_attestation(
                reviewer_wallet=reviewer_wallet,
                dataset_id=dataset_id,
                dataset_version=dataset_version,
                tx_signature=tx_signature,
                rows_accessed=rows_accessed,
                cost_paid=cost_paid
            )

            receipt = {
                "receipt_id": attestation["attestation_id"],
                "reviewer_wallet": reviewer_wallet,
                "dataset_id": dataset_id,
                "attestation_address": attestation["attestation_address"],
                "tx_signature": attestation["transaction_signature"],
                "created_at": attestation["issued_at"],
                "verified_purchaser": True
            }

            # Store in database for easy lookup
            from database import db
            db.create_usage_receipt({
                "id": attestation["attestation_id"],
                "reviewer_wallet": reviewer_wallet,
                "dataset_id": dataset_id,
                "dataset_version": dataset_version,
                "attestation_address": attestation["attestation_address"],
                "tx_signature": tx_signature,
                "rows_accessed": rows_accessed,
                "cost_paid": cost_paid,
            })

            logger.info(f"Usage receipt created: {receipt['receipt_id']}")
            return receipt

        except Exception as e:
            logger.error(f"Failed to create usage receipt: {e}")
            raise

    async def verify_publisher(
        self,
        publisher_wallet: str,
        verification_level: int = 1,
        evidence_cid: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create publisher verification attestation.

        Args:
            publisher_wallet: Publisher's wallet
            verification_level: 1=basic, 2=verified, 3=KYC
            evidence_cid: Optional IPFS CID of verification evidence

        Returns:
            Verification attestation
        """
        logger.info(f"Verifying publisher: {publisher_wallet}")

        try:
            attestation = await sas_service.create_publisher_verified_attestation(
                publisher_pubkey=publisher_wallet,
                verification_level=verification_level,
                evidence_uri=evidence_cid or ""
            )

            verification = {
                "publisher_wallet": publisher_wallet,
                "verification_level": verification_level,
                "attestation_id": attestation["attestation_id"],
                "attestation_address": attestation["attestation_address"],
                "issued_at": attestation["issued_at"],
                "expires_at": attestation["expires_at"],
                "badge": self._get_verification_badge(verification_level)
            }

            logger.info(f"Publisher verified: {publisher_wallet}")
            return verification

        except Exception as e:
            logger.error(f"Failed to verify publisher: {e}")
            raise

    def _calculate_badges(
        self,
        qa_report: Dict[str, Any],
        quality_attestation: Dict[str, Any],
        freshness_attestation: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Calculate reputation badges based on QA report and attestations."""
        badges = []

        # Quality score badge
        score = qa_report["quality_score"]
        if score >= 90:
            badges.append({
                "type": "quality",
                "level": "excellent",
                "label": "Excellent Quality",
                "icon": "⭐"
            })
        elif score >= 75:
            badges.append({
                "type": "quality",
                "level": "good",
                "label": "Good Quality",
                "icon": "✓"
            })

        # PII safety badge
        if qa_report["pii_risk"]["risk_level"] == "low":
            badges.append({
                "type": "pii_safe",
                "level": "safe",
                "label": "PII Safe",
                "icon": "🔒"
            })

        # Freshness badge
        if qa_report["freshness"]["status"] == "fresh":
            badges.append({
                "type": "freshness",
                "level": "fresh",
                "label": "Recently Checked",
                "icon": "🔄"
            })

        # Verified attestation badge
        badges.append({
            "type": "verified",
            "level": "on_chain",
            "label": "On-Chain Verified",
            "icon": "⛓️"
        })

        return badges

    def _get_verification_badge(self, level: int) -> Dict[str, str]:
        """Get publisher verification badge."""
        badges = {
            1: {"level": "basic", "label": "Basic Verification", "icon": "✓"},
            2: {"level": "verified", "label": "Verified Publisher", "icon": "✓✓"},
            3: {"level": "kyc", "label": "KYC Verified", "icon": "⭐"}
        }
        return badges.get(level, badges[1])


# Global reputation service instance
reputation_service = ReputationService()

