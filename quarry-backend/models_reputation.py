"""
Reputation-related models for API responses.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ReputationBadge(BaseModel):
    """A reputation badge."""
    type: str
    level: str
    label: str
    icon: str


class AttestationInfo(BaseModel):
    """Information about an attestation."""
    id: str
    address: str
    tx_signature: str
    issued_at: str
    expires_at: Optional[str]
    schema: str


class QAReportSummary(BaseModel):
    """Summary of QA report."""
    ipfs_cid: str
    summary: Dict[str, str]


class DatasetReputation(BaseModel):
    """Dataset reputation information."""
    dataset_id: str
    dataset_name: str
    dataset_version: str
    dataset_version_pda: str
    processed_at: str
    quality_score: int
    qa_report: QAReportSummary
    attestations: Dict[str, AttestationInfo]
    badges: List[ReputationBadge]


class PublisherVerification(BaseModel):
    """Publisher verification information."""
    publisher_wallet: str
    verification_level: int
    attestation_id: str
    attestation_address: str
    issued_at: str
    expires_at: Optional[str]
    badge: ReputationBadge


class UsageReceipt(BaseModel):
    """Usage receipt for verified reviews."""
    receipt_id: str
    reviewer_wallet: str
    dataset_id: str
    attestation_address: str
    tx_signature: str
    created_at: str
    verified_purchaser: bool

