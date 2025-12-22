from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration settings."""

    # Application
    app_name: str = "Quarry API"
    debug: bool = True

    # Database
    database_path: Path = Path("data/quarry.duckdb")

    # File storage
    uploads_dir: Path = Path("data/uploads")
    parquet_dir: Path = Path("data/parquet")

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # OpenAI
    openai_api_key: str = ""

    # Solana x402 Payment
    # Use devnet for testing, or use a paid RPC provider for mainnet
    solana_rpc_url: str = "https://convincing-delicate-frog.solana-mainnet.quiknode.pro/4dec0b3b4fc568d1c31eafce58fe7effa3bd026a/"
    payment_wallet_address: str = ""  # Your Solana wallet address to receive payments

    # IPFS Configuration
    ipfs_api: str = "/ip4/127.0.0.1/tcp/5001"  # Local IPFS node
    ipfs_gateway: str = ""  # Optional: Infura or other IPFS gateway

    # Solana Attestation Service (SAS)
    sas_authority_key: str = ""  # Base58 encoded secret key for SAS authority
    sas_program_id: str = (
        "SAS1111111111111111111111111111111111111111"  # SAS program ID
    )

    # Currency Exchange Rates
    sol_to_usdc_rate: float = (
        140.0  # SOL/USDC exchange rate (update periodically or use oracle)
    )

    # NextJS API URL (for x402 proxy)
    nextjs_api_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
settings.database_path.parent.mkdir(parents=True, exist_ok=True)
settings.uploads_dir.mkdir(parents=True, exist_ok=True)
settings.parquet_dir.mkdir(parents=True, exist_ok=True)
