"""
Solana Attestation Service (SAS) Integration.

This service handles creating and managing on-chain attestations for
dataset reputation, publisher verification, and usage receipts.

MVP Implementation: Uses Solana transaction memos to store attestation data.
- Attestations are stored as JSON in transaction memo instructions
- The transaction signature is the attestation ID
- Fully on-chain, immutable, and verifiable
- No custom program needed
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import base58
import json
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solana.rpc.types import TxOpts
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.signature import Signature
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solders.instruction import Instruction
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.compute_budget import set_compute_unit_limit, set_compute_unit_price
import hashlib

from config import settings

logger = logging.getLogger(__name__)


class SASService:
    """Service for Solana Attestation Service operations."""

    # Memo Program ID (official Solana memo program)
    MEMO_PROGRAM_ID = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

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
                # Load from secret key (base58 encoded)
                try:
                    secret_bytes = base58.b58decode(authority_key)
                    # Keypair.from_bytes expects 64 bytes (32 secret + 32 public)
                    # If we only have 32 bytes, we need to use from_seed
                    if len(secret_bytes) == 32:
                        # This is just the seed, derive the keypair
                        self.authority_keypair = Keypair.from_seed(secret_bytes)
                    elif len(secret_bytes) == 64:
                        # Full keypair bytes
                        self.authority_keypair = Keypair.from_bytes(secret_bytes)
                    else:
                        raise ValueError(
                            f"Invalid key length: {len(secret_bytes)} bytes"
                        )
                    logger.info(f"✅ Loaded SAS authority from config")
                except Exception as e:
                    logger.error(f"Failed to load authority key: {e}")
                    # Fallback to generating new one
                    self.authority_keypair = Keypair()
                    logger.warning(
                        "Generated new SAS authority keypair - set SAS_AUTHORITY_KEY in production"
                    )
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
        Create an attestation on-chain using Solana transaction memos.

        Args:
            schema_name: Name of the schema to use
            subject: Subject identifier (PDA or pubkey)
            data: Attestation data matching the schema
            expiry_days: Optional expiry in days from now

        Returns:
            Attestation details including real transaction signature
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

            issued_at = datetime.utcnow().isoformat()

            # Create attestation payload
            attestation_payload = {
                "type": "quarry_attestation",
                "version": "1.0",
                "schema": schema_name,
                "subject": subject,
                "issuer": str(self.authority_keypair.pubkey()),
                "data": data,
                "issued_at": issued_at,
                "expires_at": datetime.fromtimestamp(expiry_timestamp).isoformat()
                if expiry_timestamp
                else None,
            }

            # Serialize to JSON
            memo_data = json.dumps(attestation_payload, separators=(",", ":"))

            # Memo program limits to ~566 bytes, so truncate if needed
            if len(memo_data) > 500:
                logger.warning(
                    f"Attestation data too large ({len(memo_data)} bytes), truncating..."
                )
                # Keep essential fields, truncate data
                attestation_payload["data"] = str(data)[:200] + "..."
                memo_data = json.dumps(attestation_payload, separators=(",", ":"))[:500]

            logger.info(f"Creating on-chain attestation ({len(memo_data)} bytes)")

            # Create memo instruction
            memo_instruction = Instruction(
                program_id=self.MEMO_PROGRAM_ID,
                accounts=[],
                data=memo_data.encode("utf-8"),
            )

            # Get recent blockhash
            blockhash_resp = await self.client.get_latest_blockhash(Confirmed)
            recent_blockhash = blockhash_resp.value.blockhash

            # Create message with compute budget and memo
            instructions = [
                set_compute_unit_limit(200_000),
                set_compute_unit_price(1),
                memo_instruction,
            ]

            message = MessageV0.try_compile(
                payer=self.authority_keypair.pubkey(),
                instructions=instructions,
                address_lookup_table_accounts=[],
                recent_blockhash=recent_blockhash,
            )

            # Create and sign transaction
            transaction = VersionedTransaction(message, [self.authority_keypair])

            # Send transaction
            tx_resp = await self.client.send_transaction(
                transaction,
                opts=TxOpts(skip_preflight=False, preflight_commitment=Confirmed),
            )

            signature = str(tx_resp.value)
            logger.info(f"✅ Attestation created on-chain: {signature}")

            # Confirm transaction (convert string to Signature object)
            sig_obj = Signature.from_string(signature)
            confirm_resp = await self.client.confirm_transaction(
                sig_obj, commitment=Confirmed
            )

            # Check if transaction failed
            # confirm_resp.value is a list of status results
            if confirm_resp.value and len(confirm_resp.value) > 0:
                status = confirm_resp.value[0]
                if status and hasattr(status, "err") and status.err:
                    raise Exception(f"Transaction failed: {status.err}")

            # Return attestation details
            attestation = {
                "attestation_id": signature,  # Transaction signature IS the attestation ID
                "schema": schema_name,
                "subject": subject,
                "issuer": str(self.authority_keypair.pubkey()),
                "data": data,
                "issued_at": issued_at,
                "expires_at": datetime.fromtimestamp(expiry_timestamp).isoformat()
                if expiry_timestamp
                else None,
                "expiry_timestamp": expiry_timestamp,
                "status": "active",
                "revoked": False,
                "transaction_signature": signature,
                "attestation_address": signature,  # For compatibility
                "on_chain": True,
                "explorer_url": f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
                if "devnet" in settings.solana_rpc_url.lower()
                else f"https://explorer.solana.com/tx/{signature}",
            }

            logger.info(
                f"✨ Created attestation: {signature[:16]}... for schema {schema_name}"
            )
            logger.info(f"🔗 View on explorer: {attestation['explorer_url']}")

            return attestation

        except Exception as e:
            logger.error(f"❌ Failed to create attestation: {e}")
            import traceback

            traceback.print_exc()
            raise

    async def verify_attestation(self, attestation_id: str) -> Dict[str, Any]:
        """
        Verify an attestation by fetching the transaction from Solana.

        Args:
            attestation_id: Transaction signature of the attestation

        Returns:
            Verification result with attestation data
        """
        await self.connect()

        if not self.connected:
            raise Exception("Not connected to Solana")

        try:
            logger.info(f"🔍 Verifying attestation: {attestation_id}")
            logger.info(
                f"🔍 Attestation ID type: {type(attestation_id)}, length: {len(attestation_id)}"
            )

            # Fetch transaction from Solana (convert string to Signature object)
            try:
                sig_obj = Signature.from_string(attestation_id)
            except Exception as sig_err:
                logger.error(f"❌ Failed to parse signature: {attestation_id}")
                logger.error(f"❌ Signature error: {sig_err}")
                return {
                    "attestation_id": attestation_id,
                    "is_valid": False,
                    "error": f"Invalid signature format: {sig_err}",
                    "checked_at": datetime.utcnow().isoformat(),
                }

            tx_resp = await self.client.get_transaction(
                sig_obj, encoding="json", max_supported_transaction_version=0
            )

            if not tx_resp.value:
                logger.warning(f"❌ Transaction not found: {attestation_id}")
                return {
                    "attestation_id": attestation_id,
                    "is_valid": False,
                    "is_expired": False,
                    "is_revoked": False,
                    "issuer_verified": False,
                    "schema_valid": False,
                    "error": "Transaction not found on blockchain",
                    "checked_at": datetime.utcnow().isoformat(),
                }

            # Check if transaction succeeded
            if tx_resp.value.transaction.meta.err:
                logger.warning(
                    f"❌ Transaction failed: {tx_resp.value.transaction.meta.err}"
                )
                return {
                    "attestation_id": attestation_id,
                    "is_valid": False,
                    "error": "Transaction failed",
                    "checked_at": datetime.utcnow().isoformat(),
                }

            # Extract memo data from transaction
            attestation_data = None
            instructions = tx_resp.value.transaction.transaction.message.instructions

            logger.info(f"🔍 Found {len(instructions)} instructions in transaction")

            for i, ix in enumerate(instructions):
                # Check if this is a memo instruction
                try:
                    logger.info(
                        f"🔍 Instruction {i}: program_id={ix.program_id}, data type={type(ix.data)}"
                    )

                    # Handle different data formats
                    if isinstance(ix.data, bytes):
                        memo_text = ix.data.decode("utf-8")
                    elif isinstance(ix.data, str):
                        memo_text = ix.data
                    else:
                        # Try to convert to bytes first
                        memo_text = bytes(ix.data).decode("utf-8")

                    logger.info(f"🔍 Memo text preview: {memo_text[:100]}...")

                    if memo_text.startswith('{"type":"quarry_attestation"'):
                        attestation_data = json.loads(memo_text)
                        logger.info(f"✅ Found attestation data in instruction {i}")
                        break
                except Exception as e:
                    logger.debug(f"Instruction {i} not a memo: {e}")
                    continue

            if not attestation_data:
                logger.warning(f"❌ No attestation data found in transaction")
                logger.warning(f"❌ Checked {len(instructions)} instructions")
                return {
                    "attestation_id": attestation_id,
                    "is_valid": False,
                    "error": "No attestation data in transaction",
                    "checked_at": datetime.utcnow().isoformat(),
                }

            # Verify issuer matches
            issuer_pubkey = str(self.authority_keypair.pubkey())
            issuer_verified = attestation_data.get("issuer") == issuer_pubkey

            # Check expiry
            is_expired = False
            if attestation_data.get("expires_at"):
                expiry_time = datetime.fromisoformat(attestation_data["expires_at"])
                is_expired = datetime.utcnow() > expiry_time

            # Verify schema exists
            schema_valid = attestation_data.get("schema") in self.schemas

            is_valid = issuer_verified and not is_expired and schema_valid

            verification = {
                "attestation_id": attestation_id,
                "is_valid": is_valid,
                "is_expired": is_expired,
                "is_revoked": False,  # No revocation mechanism in MVP
                "issuer_verified": issuer_verified,
                "schema_valid": schema_valid,
                "attestation_data": attestation_data,
                "on_chain": True,
                "checked_at": datetime.utcnow().isoformat(),
            }

            if is_valid:
                logger.info(f"✅ Attestation verified: {attestation_id[:16]}...")
            else:
                logger.warning(
                    f"⚠️ Attestation invalid: expired={is_expired}, issuer_verified={issuer_verified}"
                )

            return verification

        except Exception as e:
            logger.error(f"❌ Failed to verify attestation: {e}")
            import traceback

            traceback.print_exc()
            return {
                "attestation_id": attestation_id,
                "is_valid": False,
                "error": str(e),
                "checked_at": datetime.utcnow().isoformat(),
            }

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
