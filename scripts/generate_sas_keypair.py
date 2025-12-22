"""
Generate a new keypair for SAS (Solana Attestation Service) authority.
The authority signs all attestations.
"""

from solders.keypair import Keypair
import base58

# Generate new keypair
keypair = Keypair()

# Get the full keypair bytes (64 bytes: 32 secret + 32 public)
keypair_bytes = bytes(keypair)

print("\n" + "=" * 60)
print("SAS AUTHORITY KEYPAIR GENERATED")
print("=" * 60)
print()
print(f"Public Key:  {keypair.pubkey()}")
print()
print(f"Secret Key (base58 - 64 bytes):")
print(f"{base58.b58encode(keypair_bytes).decode()}")
print()
print("=" * 60)
print()
print("⚠️  SECURITY NOTES:")
print("  - Keep the secret key PRIVATE")
print("  - Add to .env as: sas_authority_key=<secret_key_above>")
print("  - Never commit to git")
print("  - This key signs all attestations")
print()
print("💡 For devnet testing:")
print(f"  solana airdrop 2 {keypair.pubkey()} --url devnet")
print()
print("💡 For mainnet:")
print(f"  Send SOL to: {keypair.pubkey()}")
print("  - 0.01 SOL = ~2000 attestations")
print("  - 0.1 SOL = ~20,000 attestations")
print()
print("Or use the web faucet (devnet only):")
print("  https://faucet.solana.com/")
print()
