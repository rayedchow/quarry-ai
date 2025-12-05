"""
Reputation Router - Endpoints for dataset and publisher reputation.

Handles:
- Dataset reputation processing
- Publisher verification
- Attestation verification
- Usage receipts for verified reviews
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.reputation_service import reputation_service
from services.sas_service import sas_service
from services.ipfs_service import ipfs_service

router = APIRouter(prefix="/reputation", tags=["reputation"])


# Request/Response Models
class ProcessReputationRequest(BaseModel):
    """Request to process dataset reputation."""

    dataset_id: str
    dataset_name: str
    dataset_version: str
    parquet_path: str
    publisher_wallet: Optional[str] = None


class VerifyPublisherRequest(BaseModel):
    """Request to verify a publisher."""

    publisher_wallet: str
    verification_level: int = 1  # 1=basic, 2=verified, 3=KYC
    evidence_cid: Optional[str] = None


class UsageReceiptRequest(BaseModel):
    """Request to create a usage receipt."""

    reviewer_wallet: str
    dataset_id: str
    dataset_version: str
    tx_signature: str
    rows_accessed: int
    cost_paid: float


# Endpoints
@router.post("/process")
async def process_dataset_reputation(request: ProcessReputationRequest):
    """
    Process complete reputation workflow for a dataset.

    This includes:
    1. Running QA checks
    2. Uploading report to IPFS
    3. Creating quality and freshness attestations
    4. Returning reputation summary
    """
    try:
        reputation = await reputation_service.process_dataset_reputation(
            dataset_id=request.dataset_id,
            dataset_name=request.dataset_name,
            dataset_version=request.dataset_version,
            parquet_path=request.parquet_path,
            publisher_wallet=request.publisher_wallet,
        )
        return JSONResponse(status_code=200, content=reputation)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to process reputation: {str(e)}"
        )


@router.get("/dataset/{dataset_id}")
async def get_dataset_reputation(dataset_id: str, version: str = Query(default="v1")):
    """
    Get reputation information for a dataset.

    Returns attestations, badges, and verification status.
    """
    try:
        # Retrieve actual stored reputation data from database
        reputation = await reputation_service.verify_dataset_reputation(
            dataset_id=dataset_id, dataset_version=version
        )

        if reputation is None:
            raise HTTPException(
                status_code=404, detail="Reputation not found for this dataset"
            )

        return JSONResponse(status_code=200, content=reputation)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve reputation: {str(e)}"
        )


@router.post("/verify-publisher")
async def verify_publisher(request: VerifyPublisherRequest):
    """
    Create publisher verification attestation.

    Verification levels:
    - 1: Basic (email verified)
    - 2: Verified (identity verified)
    - 3: KYC (full KYC completed)
    """
    try:
        verification = await reputation_service.verify_publisher(
            publisher_wallet=request.publisher_wallet,
            verification_level=request.verification_level,
            evidence_cid=request.evidence_cid,
        )
        return JSONResponse(status_code=200, content=verification)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to verify publisher: {str(e)}"
        )


@router.post("/usage-receipt")
async def create_usage_receipt(request: UsageReceiptRequest):
    """
    Create a usage receipt attestation for verified reviews.

    This proves that a wallet has actually paid to use a dataset,
    allowing them to leave "verified purchaser" reviews.
    """
    try:
        receipt = await reputation_service.create_usage_receipt(
            reviewer_wallet=request.reviewer_wallet,
            dataset_id=request.dataset_id,
            dataset_version=request.dataset_version,
            tx_signature=request.tx_signature,
            rows_accessed=request.rows_accessed,
            cost_paid=request.cost_paid,
        )
        return JSONResponse(status_code=200, content=receipt)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create usage receipt: {str(e)}"
        )


@router.get("/attestation/{attestation_id}/verify")
async def verify_attestation(attestation_id: str):
    """
    Verify an attestation is valid (not expired, not revoked).

    Returns verification status and details.
    """
    try:
        verification = await sas_service.verify_attestation(attestation_id)
        return JSONResponse(status_code=200, content=verification)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Attestation not found: {str(e)}")


@router.get("/schemas")
async def list_schemas():
    """
    List all available SAS schemas.

    Shows the schema definitions for attestations.
    """
    try:
        schemas = sas_service.list_schemas()
        schema_details = {name: sas_service.get_schema(name) for name in schemas}
        return JSONResponse(status_code=200, content=schema_details)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list schemas: {str(e)}")


@router.get("/schemas/{schema_name}")
async def get_schema(schema_name: str):
    """Get details of a specific schema."""
    try:
        schema = sas_service.get_schema(schema_name)
        if not schema:
            raise HTTPException(status_code=404, detail="Schema not found")
        return JSONResponse(status_code=200, content=schema)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Schema not found: {str(e)}")


@router.get("/ipfs/{cid}")
async def get_ipfs_content(cid: str):
    """
    Retrieve content from IPFS by CID.

    Useful for fetching QA reports and other reputation artifacts.
    """
    try:
        # Connect to IPFS first
        await ipfs_service.connect()
        content = await ipfs_service.retrieve_json(cid)
        return JSONResponse(status_code=200, content=content)
    except Exception as e:
        # In simulation mode, return helpful message
        import logging

        logging.warning(f"IPFS retrieval failed for {cid}: {e}")
        return JSONResponse(
            status_code=200,
            content={
                "note": "IPFS Simulation Mode",
                "cid": cid,
                "message": "Running in simulation mode. Connect to a local IPFS node to see actual data.",
                "status": "simulated",
                "suggestion": "Install IPFS: brew install ipfs && ipfs daemon",
            },
        )


@router.get("/dataset/{dataset_id}/pda")
async def get_dataset_pda(dataset_id: str, version: str = Query(default="v1")):
    """
    Get the PDA (Program Derived Address) for a dataset version.

    This is the stable identifier used in attestations.
    """
    try:
        pda = sas_service.derive_dataset_version_pda(dataset_id, version)
        return JSONResponse(
            status_code=200,
            content={"dataset_id": dataset_id, "version": version, "pda": pda},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to derive PDA: {str(e)}")


@router.get("/health")
async def reputation_health():
    """
    Health check for reputation services.

    Checks connectivity to IPFS, Solana, and SAS.
    """
    health_status = {"status": "healthy", "services": {}}

    try:
        # Check IPFS
        await ipfs_service.connect()
        health_status["services"]["ipfs"] = {
            "status": "connected" if ipfs_service.connected else "disconnected"
        }
    except Exception as e:
        health_status["services"]["ipfs"] = {"status": "error", "error": str(e)}

    try:
        # Check Solana/SAS
        await sas_service.connect()
        health_status["services"]["sas"] = {
            "status": "connected" if sas_service.connected else "disconnected",
            "authority": str(sas_service.authority_keypair.public_key)
            if sas_service.authority_keypair
            else None,
        }
    except Exception as e:
        health_status["services"]["sas"] = {"status": "error", "error": str(e)}

    # Overall status
    all_healthy = all(
        service.get("status") in ["connected", "healthy"]
        for service in health_status["services"].values()
    )
    health_status["status"] = "healthy" if all_healthy else "degraded"

    return JSONResponse(status_code=200 if all_healthy else 503, content=health_status)
