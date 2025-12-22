"""
Test real Solana attestations on devnet
"""

import sys
import os
import asyncio

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'quarry-backend'))

from services.sas_service import sas_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_quality_attestation():
    """Test creating a dataset quality attestation on devnet"""
    print("\n" + "="*60)
    print("TEST: Dataset Quality Attestation")
    print("="*60 + "\n")
    
    # Sample QA report
    qa_report = {
        "quality_score": 96,
        "completeness": {
            "missing_rate_bps": 150,  # 1.5%
        },
        "duplicates": {
            "duplicate_rate_bps": 50,  # 0.5%
        },
        "pii_risk": {
            "risk_level": "low"
        }
    }
    
    try:
        attestation = await sas_service.create_dataset_quality_attestation(
            dataset_id="test-dataset-001",
            dataset_version="v1",
            qa_report=qa_report,
            report_cid="QmTestCID123",
            expiry_days=30
        )
        
        print("✅ Quality attestation created!")
        print(f"   Transaction: {attestation['transaction_signature']}")
        print(f"   Explorer: {attestation['explorer_url']}")
        print(f"   Schema: {attestation['schema']}")
        print(f"   Expires: {attestation['expires_at']}")
        
        return attestation
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_usage_receipt():
    """Test creating a usage receipt attestation"""
    print("\n" + "="*60)
    print("TEST: Usage Receipt Attestation")
    print("="*60 + "\n")
    
    try:
        attestation = await sas_service.create_usage_receipt_attestation(
            reviewer_wallet="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            dataset_id="test-dataset-001",
            dataset_version="v1",
            tx_signature="5j7s8K9L...",
            rows_accessed=1000,
            cost_paid=0.001  # SOL
        )
        
        print("✅ Usage receipt created!")
        print(f"   Transaction: {attestation['transaction_signature']}")
        print(f"   Explorer: {attestation['explorer_url']}")
        print(f"   Schema: {attestation['schema']}")
        print(f"   Never expires: {attestation['expires_at'] is None}")
        
        return attestation
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_verify_attestation(attestation_id: str):
    """Test verifying an attestation"""
    print("\n" + "="*60)
    print("TEST: Verify Attestation")
    print("="*60 + "\n")
    
    try:
        verification = await sas_service.verify_attestation(attestation_id)
        
        print(f"✅ Verification result:")
        print(f"   Valid: {verification['is_valid']}")
        print(f"   Expired: {verification['is_expired']}")
        print(f"   Issuer verified: {verification['issuer_verified']}")
        print(f"   Schema valid: {verification['schema_valid']}")
        
        if 'attestation_data' in verification:
            print(f"   Schema: {verification['attestation_data']['schema']}")
            print(f"   Issued: {verification['attestation_data']['issued_at']}")
        
        return verification
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_review_attestation(usage_receipt_address: str):
    """Test creating a review attestation"""
    print("\n" + "="*60)
    print("TEST: Review Attestation")
    print("="*60 + "\n")
    
    try:
        attestation = await sas_service.create_review_attestation(
            reviewer_wallet="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            dataset_id="test-dataset-001",
            dataset_version="v1",
            rating=5,
            review_text_cid="QmReviewText123",
            usage_receipt_attestation=usage_receipt_address
        )
        
        print("✅ Review attestation created!")
        print(f"   Transaction: {attestation['transaction_signature']}")
        print(f"   Explorer: {attestation['explorer_url']}")
        print(f"   Rating: {attestation['data']['rating']}/5")
        print(f"   Links to receipt: {usage_receipt_address[:16]}...")
        
        return attestation
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return None


async def main():
    """Run all tests"""
    print("\n" + "🚀 "*20)
    print("REAL SOLANA ATTESTATIONS TEST SUITE")
    print("🚀 "*20 + "\n")
    
    # Connect to Solana
    await sas_service.connect()
    
    if not sas_service.connected:
        print("❌ Failed to connect to Solana")
        return
    
    print(f"✅ Connected to Solana")
    print(f"   RPC: {sas_service.client}")
    print(f"   Authority: {sas_service.authority_keypair.pubkey()}")
    
    # Test 1: Create quality attestation
    quality_attestation = await test_quality_attestation()
    
    if quality_attestation:
        # Test 2: Verify the attestation we just created
        await asyncio.sleep(2)  # Wait for confirmation
        await test_verify_attestation(quality_attestation['transaction_signature'])
    
    # Test 3: Create usage receipt
    usage_receipt = await test_usage_receipt()
    
    if usage_receipt:
        # Test 4: Create review linked to usage receipt
        await asyncio.sleep(2)
        await test_review_attestation(usage_receipt['transaction_signature'])
    
    # Disconnect
    await sas_service.disconnect()
    
    print("\n" + "🎉 "*20)
    print("TEST SUITE COMPLETE")
    print("🎉 "*20 + "\n")
    
    print("💡 Tips:")
    print("   - View transactions on Solana Explorer")
    print("   - Attestations are stored in transaction memos")
    print("   - Transaction signatures are attestation IDs")
    print("   - All data is immutable and verifiable")
    print()


if __name__ == "__main__":
    asyncio.run(main())

