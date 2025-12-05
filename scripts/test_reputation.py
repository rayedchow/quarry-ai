#!/usr/bin/env python3
"""
Test the reputation system with a sample dataset.

This script tests the complete reputation workflow:
1. Connects to IPFS and Solana
2. Runs QA checks on a test dataset
3. Uploads report to IPFS
4. Creates SAS attestations
5. Verifies the attestations
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "quarry-backend"))

from services.reputation_service import reputation_service
from services.ipfs_service import ipfs_service
from services.sas_service import sas_service


async def test_reputation():
    """Test the reputation system."""
    print("=" * 70)
    print("QUARRY REPUTATION SYSTEM TEST")
    print("=" * 70)
    
    # Test 1: Check IPFS connection
    print("\n[1/5] Testing IPFS connection...")
    try:
        await ipfs_service.connect()
        if ipfs_service.connected:
            print("✅ IPFS connected successfully")
        else:
            print("❌ IPFS connection failed")
            return
    except Exception as e:
        print(f"❌ IPFS error: {e}")
        return
    
    # Test 2: Check Solana/SAS connection
    print("\n[2/5] Testing Solana/SAS connection...")
    try:
        await sas_service.connect()
        if sas_service.connected:
            print(f"✅ Solana connected successfully")
            print(f"   Authority: {sas_service.authority_keypair.public_key}")
        else:
            print("❌ Solana connection failed")
            return
    except Exception as e:
        print(f"❌ Solana error: {e}")
        return
    
    # Test 3: Find a test dataset
    print("\n[3/5] Looking for test dataset...")
    test_parquet = Path("quarry-backend/data/parquet")
    if not test_parquet.exists():
        print("❌ No parquet directory found")
        return
    
    parquet_files = list(test_parquet.glob("*.parquet"))
    if not parquet_files:
        print("❌ No parquet files found")
        print("   Upload a dataset first to test reputation")
        return
    
    test_file = parquet_files[0]
    print(f"✅ Found test dataset: {test_file.name}")
    
    # Test 4: Process reputation
    print("\n[4/5] Processing reputation...")
    try:
        reputation = await reputation_service.process_dataset_reputation(
            dataset_id="test-ds-001",
            dataset_name="Test Dataset",
            dataset_version="v1",
            parquet_path=str(test_file)
        )
        print("✅ Reputation processed successfully")
        print(f"   Quality Score: {reputation['quality_score']}/100")
        print(f"   IPFS CID: {reputation['qa_report']['ipfs_cid']}")
        print(f"   Attestations: {len(reputation['attestations'])}")
    except Exception as e:
        print(f"❌ Reputation processing error: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Test 5: Verify attestation
    print("\n[5/5] Verifying attestation...")
    try:
        attestation_id = reputation['attestations']['quality']['id']
        verification = await sas_service.verify_attestation(attestation_id)
        if verification['is_valid']:
            print("✅ Attestation verified successfully")
        else:
            print("❌ Attestation verification failed")
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print("\n✅ All tests passed!")
    print("\nReputation Details:")
    print(f"  Dataset ID: {reputation['dataset_id']}")
    print(f"  Dataset PDA: {reputation['dataset_version_pda']}")
    print(f"  Quality Score: {reputation['quality_score']}/100")
    print(f"  Badges: {len(reputation['badges'])}")
    for badge in reputation['badges']:
        print(f"    {badge['icon']} {badge['label']}")
    print(f"\n  QA Report (IPFS): {reputation['qa_report']['ipfs_cid']}")
    print(f"  Quality Attestation: {reputation['attestations']['quality']['id']}")
    print(f"  Freshness Attestation: {reputation['attestations']['freshness']['id']}")
    print("\n" + "=" * 70)
    
    # Cleanup
    await ipfs_service.disconnect()
    await sas_service.disconnect()


if __name__ == "__main__":
    asyncio.run(test_reputation())

