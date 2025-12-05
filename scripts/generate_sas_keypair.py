#!/usr/bin/env python3
"""
Generate a Solana keypair for SAS authority.

This script generates a new Solana keypair and outputs the public key
and base58-encoded secret key for use in the .env file.
"""

import sys

try:
    from solders.keypair import Keypair
    import base58
except ImportError:
    print("Error: Required packages not installed.")
    print("Please install: pip install solders base58")
    print("\nOr install all backend requirements:")
    print("  cd quarry-backend && pip install -r requirements.txt")
    sys.exit(1)


def main():
    print("Generating Solana keypair for SAS authority...\n")

    keypair = Keypair()

    # Get the secret key bytes (solders Keypair can be converted to bytes)
    secret_bytes = bytes(keypair)

    print("=" * 70)
    print("SAS AUTHORITY KEYPAIR")
    print("=" * 70)
    print(f"\nPublic Key (Authority Address):")
    print(f"  {keypair.pubkey()}")
    print(f"\nSecret Key (Base58 - KEEP SECURE!):")
    print(f"  {base58.b58encode(secret_bytes).decode()}")
    print("\n" + "=" * 70)
    print("\nAdd this to your .env file:")
    print(f"SAS_AUTHORITY_KEY={base58.b58encode(secret_bytes).decode()}")
    print("\n⚠️  IMPORTANT: Keep the secret key secure and never commit it to git!")
    print("=" * 70)


if __name__ == "__main__":
    main()
