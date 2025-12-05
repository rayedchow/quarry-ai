"""
Solana Attestation Service (SAS) Integration.

This service handles creating and managing on-chain attestations for
dataset reputation, publisher verification, and usage receipts.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import base58
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
import hashlib
import struct

from config import settings

logger = logging.getLogger(__name__)


class SASService:
    """Service for Solana Attestation Service operations."""

    # SAS Program ID (placeholder - replace with actual SAS program ID)
    SAS_PROGRAM_ID = "SAS1111111111111111111111111111111111111111"

    def __init__(self):
        """Initialize SAS service."""
        self.client: Optional[AsyncClient] = None
        self.authority_keypair: Optional[Keypair] = None
        self.connected = False

        # Schema definitions
        self.schemas = {
            "publisher_verified_v1": {
                "version": 1,
                "fields": [
                    {"name": "publisher_pubkey", "type": "pubkey"},
                    {"name": "verification_level", "type": "u8"},
                    {"name": "jurisdiction", "type": "string"},
                    {"name": "issued_at", "type": "i64"},
                    {"name": "evidence_uri", "type": "string"},
                ],
            },
            "dataset_quality_v1": {
                "version": 1,
                "fields": [
                    {"name": "dataset_version_pda", "type": "pubkey"},
                    {"name": "dataset_content_hash", "type": "hash"},
                    {"name": "quality_score", "type": "u8"},
                    {"name": "missing_rate_bps", "type": "u16"},
                    {"name": "duplicate_rate_bps", "type": "u16"},
                    {"name": "pii_risk", "type": "u8"},  # 0=low, 1=medium, 2=high
                    {"name": "report_cid", "type": "string"},
                    {"name": "audited_at", "type": "i64"},
                ],
            },
            "dataset_freshness_v1": {
                "version": 1,
                "fields": [
                    {"name": "dataset_version_pda", "type": "pubkey"},
                    {"name": "last_checked_at", "type": "i64"},
                    {"name": "max_age_seconds", "type": "i64"},
                    {"name": "status", "type": "u8"},  # 0=fresh, 1=aging, 2=stale
                ],
            },
            "dataset_usage_receipt_v1": {
                "version": 1,
                "fields": [
                    {"name": "reviewer_wallet", "type": "pubkey"},
                    {"name": "dataset_version_pda", "type": "pubkey"},
                    {"name": "timestamp", "type": "i64"},
                    {"name": "tx_signature", "type": "string"},
                    {"name": "rows_accessed", "type": "u64"},
                    {"name": "cost_paid", "type": "u64"},
                ],
            },
            "dataset_review_v1": {
                "version": 1,
                "fields": [
                    {"name": "reviewer_wallet", "type": "pubkey"},
                    {"name": "dataset_version_pda", "type": "pubkey"},
                    {"name": "rating", "type": "u8"},
                    {"name": "usage_receipt_attestation", "type": "pubkey"},
                    {"name": "review_text_cid", "type": "string"},
                    {"name": "helpful_count", "type": "u32"},
                    {"name": "timestamp", "type": "i64"},
                ],
            },
        }

    async def connect(self):
        """Connect to Solana RPC."""
        if self.connected:
            return

        try:
            rpc_url = getattr(
                settings, "solana_rpc_url", "https://api.devnet.solana.com"
            )
            self.client = AsyncClient(rpc_url)

            # Load or generate authority keypair
            authority_key = getattr(settings, "sas_authority_key", None)
            if authority_key:
                # Load from secret key
                secret_bytes = base58.b58decode(authority_key)
                self.authority_keypair = Keypair.from_bytes(secret_bytes)
            else:
                # Generate new keypair (for development only)
                self.authority_keypair = Keypair()
                logger.warning(
                    "Generated new SAS authority keypair - set SAS_AUTHORITY_KEY in production"
                )

            self.connected = True
            logger.info(f"Connected to Solana RPC: {rpc_url}")
            logger.info(f"SAS Authority: {self.authority_keypair.pubkey()}")

        except Exception as e:
            logger.error(f"Failed to connect to Solana: {e}")
            self.connected = False

    async def disconnect(self):
        """Disconnect from Solana RPC."""
        if self.client:
            await self.client.close()
            self.connected = False
            logger.info("Disconnected from Solana RPC")

    def derive_dataset_version_pda(self, dataset_id: str, version_or_hash: str) -> str:
        """
        Derive a deterministic PDA for a dataset version.

        Args:
            dataset_id: Dataset identifier
            version_or_hash: Version number or content hash

        Returns:
            PDA address as string
        """
        # Create seeds for PDA derivation
        seeds = [
            b"dataset",
            dataset_id.encode("utf-8"),
            version_or_hash.encode("utf-8"),
        ]

        # Generate deterministic hash
        seed_hash = hashlib.sha256(b"".join(seeds)).digest()

        # For now, return a base58 encoded hash
        # In production, use actual Solana PDA derivation with program ID
        pda = base58.b58encode(seed_hash).decode("utf-8")

        logger.debug(f"Derived PDA for dataset {dataset_id} v{version_or_hash}: {pda}")
        return pda

    async def create_attestation(
        self,
        schema_name: str,
        subject: str,
        data: Dict[str, Any],
        expiry_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create an attestation on-chain.

        Args:
            schema_name: Name of the schema to use
            subject: Subject identifier (PDA or pubkey)
            data: Attestation data matching the schema
            expiry_days: Optional expiry in days from now

        Returns:
            Attestation details including transaction signature
        """
        await self.connect()

        if not self.connected:
            raise Exception("Not connected to Solana")

        if schema_name not in self.schemas:
            raise ValueError(f"Unknown schema: {schema_name}")

        try:
            # Calculate expiry timestamp if provided
            expiry_timestamp = None
            if expiry_days:
                expiry_timestamp = int(
                    (datetime.utcnow() + timedelta(days=expiry_days)).timestamp()
                )

            # In a real implementation, this would:
            # 1. Serialize data according to schema
            # 2. Create transaction with SAS program instructions
            # 3. Sign and send transaction
            # 4. Return transaction signature and attestation address

            # For now, we'll simulate the attestation creation
            attestation_id = hashlib.sha256(
                f"{schema_name}{subject}{data}{datetime.utcnow().isoformat()}".encode()
            ).hexdigest()[:16]

            attestation = {
                "attestation_id": attestation_id,
                "schema": schema_name,
                "subject": subject,
                "issuer": str(self.authority_keypair.pubkey()),
                "data": data,
                "issued_at": datetime.utcnow().isoformat(),
                "expires_at": datetime.fromtimestamp(expiry_timestamp).isoformat()
                if expiry_timestamp
                else None,
                "expiry_timestamp": expiry_timestamp,
                "status": "active",
                "revoked": False,
                # In production, these would be real on-chain values
                "transaction_signature": f"sim_{attestation_id}_tx",
                "attestation_address": f"sim_{attestation_id}_addr",
            }

            logger.info(
                f"Created attestation: {attestation_id} for schema {schema_name}"
            )
            return attestation

        except Exception as e:
            logger.error(f"Failed to create attestation: {e}")
            raise

    async def verify_attestation(self, attestation_id: str) -> Dict[str, Any]:
        """
        Verify an attestation is valid (not expired, not revoked).

        Args:
            attestation_id: Attestation identifier

        Returns:
            Verification result
        """
        await self.connect()

        if not self.connected:
            raise Exception("Not connected to Solana")

        try:
            # In production, this would fetch the attestation from on-chain
            # For now, we simulate verification

            verification = {
                "attestation_id": attestation_id,
                "is_valid": True,
                "is_expired": False,
                "is_revoked": False,
                "issuer_verified": True,
                "schema_valid": True,
                "checked_at": datetime.utcnow().isoformat(),
            }

            logger.info(f"Verified attestation: {attestation_id}")
            return verification

        except Exception as e:
            logger.error(f"Failed to verify attestation: {e}")
            raise

    async def create_dataset_quality_attestation(
        self,
        dataset_id: str,
        dataset_version: str,
        qa_report: Dict[str, Any],
        report_cid: str,
        expiry_days: int = 30,
    ) -> Dict[str, Any]:
        """
        Create a dataset quality attestation.

        Args:
            dataset_id: Dataset identifier
            dataset_version: Dataset version
            qa_report: QA report data
            report_cid: IPFS CID of full report
            expiry_days: Days until expiry (default 30)

        Returns:
            Attestation details
        """
        # Derive dataset PDA
        dataset_pda = self.derive_dataset_version_pda(dataset_id, dataset_version)

        # Map PII risk to enum
        pii_risk_map = {"low": 0, "medium": 1, "high": 2}
        pii_risk = pii_risk_map.get(qa_report["pii_risk"]["risk_level"], 0)

        # Prepare attestation data
        attestation_data = {
            "dataset_version_pda": dataset_pda,
            "dataset_content_hash": hashlib.sha256(
                dataset_version.encode()
            ).hexdigest(),
            "quality_score": qa_report["quality_score"],
            "missing_rate_bps": qa_report["completeness"]["missing_rate_bps"],
            "duplicate_rate_bps": qa_report["duplicates"]["duplicate_rate_bps"],
            "pii_risk": pii_risk,
            "report_cid": report_cid,
            "audited_at": int(datetime.utcnow().timestamp()),
        }

        return await self.create_attestation(
            schema_name="dataset_quality_v1",
            subject=dataset_pda,
            data=attestation_data,
            expiry_days=expiry_days,
        )

    async def create_dataset_freshness_attestation(
        self,
        dataset_id: str,
        dataset_version: str,
        freshness_info: Dict[str, Any],
        max_age_days: int = 30,
    ) -> Dict[str, Any]:
        """
        Create a dataset freshness attestation.

        Args:
            dataset_id: Dataset identifier
            dataset_version: Dataset version
            freshness_info: Freshness check results
            max_age_days: Maximum age in days

        Returns:
            Attestation details
        """
        dataset_pda = self.derive_dataset_version_pda(dataset_id, dataset_version)

        # Map status to enum
        status_map = {
            "fresh": 0,
            "aging": 1,
            "stale": 2,
            "unknown": 3,
            "no_temporal_data": 3,
        }
        status = status_map.get(freshness_info["status"], 3)

        attestation_data = {
            "dataset_version_pda": dataset_pda,
            "last_checked_at": int(datetime.utcnow().timestamp()),
            "max_age_seconds": max_age_days * 24 * 60 * 60,
            "status": status,
        }

        # Freshness should expire quickly (7 days)
        return await self.create_attestation(
            schema_name="dataset_freshness_v1",
            subject=dataset_pda,
            data=attestation_data,
            expiry_days=7,
        )

    async def create_publisher_verified_attestation(
        self,
        publisher_pubkey: str,
        verification_level: int = 1,
        jurisdiction: str = "",
        evidence_uri: str = "",
    ) -> Dict[str, Any]:
        """
        Create a publisher verification attestation.

        Args:
            publisher_pubkey: Publisher's Solana public key
            verification_level: 1=basic, 2=verified, 3=KYC
            jurisdiction: Optional jurisdiction
            evidence_uri: Optional IPFS CID of verification evidence

        Returns:
            Attestation details
        """
        attestation_data = {
            "publisher_pubkey": publisher_pubkey,
            "verification_level": verification_level,
            "jurisdiction": jurisdiction,
            "issued_at": int(datetime.utcnow().timestamp()),
            "evidence_uri": evidence_uri,
        }

        # Publisher verification lasts longer (365 days)
        return await self.create_attestation(
            schema_name="publisher_verified_v1",
            subject=publisher_pubkey,
            data=attestation_data,
            expiry_days=365,
        )

    async def create_usage_receipt_attestation(
        self,
        reviewer_wallet: str,
        dataset_id: str,
        dataset_version: str,
        tx_signature: str,
        rows_accessed: int,
        cost_paid: float,
    ) -> Dict[str, Any]:
        """
        Create a usage receipt attestation for verified reviews.

        Args:
            reviewer_wallet: Reviewer's wallet address
            dataset_id: Dataset identifier
            dataset_version: Dataset version
            tx_signature: Transaction signature of payment
            rows_accessed: Number of rows accessed
            cost_paid: Cost paid in SOL

        Returns:
            Attestation details
        """
        dataset_pda = self.derive_dataset_version_pda(dataset_id, dataset_version)

        attestation_data = {
            "reviewer_wallet": reviewer_wallet,
            "dataset_version_pda": dataset_pda,
            "timestamp": int(datetime.utcnow().timestamp()),
            "tx_signature": tx_signature,
            "rows_accessed": rows_accessed,
            "cost_paid": int(cost_paid * 1_000_000_000),  # Convert SOL to lamports
        }

        # Usage receipts don't expire (permanent proof of purchase)
        return await self.create_attestation(
            schema_name="dataset_usage_receipt_v1",
            subject=reviewer_wallet,
            data=attestation_data,
            expiry_days=None,
        )

    def get_schema(self, schema_name: str) -> Dict[str, Any]:
        """Get schema definition."""
        return self.schemas.get(schema_name, {})

    async def create_review_attestation(
        self,
        reviewer_wallet: str,
        dataset_id: str,
        dataset_version: str,
        rating: int,
        review_text_cid: str,
        usage_receipt_attestation: str,
    ) -> Dict[str, Any]:
        """
        Create an on-chain review attestation.

        Args:
            reviewer_wallet: Reviewer's wallet address
            dataset_id: Dataset ID
            dataset_version: Dataset version
            rating: Star rating (1-5)
            review_text_cid: IPFS CID of review text
            usage_receipt_attestation: Address of usage receipt attestation (proof of purchase)

        Returns:
            Review attestation details
        """
        if not 1 <= rating <= 5:
            raise ValueError("Rating must be between 1 and 5")

        dataset_pda = self.derive_dataset_version_pda(dataset_id, dataset_version)

        attestation_data = {
            "reviewer_wallet": reviewer_wallet,
            "dataset_version_pda": dataset_pda,
            "rating": rating,
            "usage_receipt_attestation": usage_receipt_attestation,
            "review_text_cid": review_text_cid,
            "helpful_count": 0,
            "timestamp": int(datetime.utcnow().timestamp()),
        }

        # Reviews don't expire (permanent on-chain)
        return await self.create_attestation(
            schema_name="dataset_review_v1",
            subject=reviewer_wallet,
            data=attestation_data,
            expiry_days=None,
        )

    def list_schemas(self) -> List[str]:
        """List all available schemas."""
        return list(self.schemas.keys())


# Global SAS service instance
sas_service = SASService()
