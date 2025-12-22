"""
x402 Protocol Proxy Implementation
Proxies x402 payment requests and verification to the NextJS TypeScript API
This replaces the direct Solana interaction with API calls to the NextJS backend
"""

import uuid
import time
import httpx
from typing import Dict, Literal
from fastapi.responses import JSONResponse

from config import settings

Currency = Literal["SOL", "USDC"]


class X402PaymentRequired(Exception):
    """Exception raised when x402 payment is required"""

    def __init__(self, payment_details: Dict):
        self.payment_details = payment_details
        super().__init__("Payment required")


class X402ProtocolProxy:
    """Proxies x402 protocol payments to NextJS TypeScript API"""

    def __init__(self, nextjs_api_url: str = "http://localhost:3000"):
        self.nextjs_api_url = nextjs_api_url
        self.pending_payments: Dict[str, Dict] = {}

    def create_payment_request(
        self,
        amount: float,
        resource_id: str,
        description: str,
        recipient_wallet: str = None,
        currency: Currency = "SOL",
    ) -> Dict:
        """
        Create an x402 payment request via NextJS API

        Args:
            amount: Amount in the specified currency (SOL or USDC)
            resource_id: Unique identifier for the resource
            description: Human-readable description
            recipient_wallet: Wallet to receive payment (defaults to platform wallet)
            currency: Payment currency - "SOL" or "USDC"

        Returns:
            Payment request details including challenge ID
        """
        # Use provided recipient or fallback to platform wallet
        if not recipient_wallet:
            recipient_wallet = settings.payment_wallet_address

        # Validate recipient address is configured
        if not recipient_wallet:
            raise ValueError(
                "No payment recipient configured. Dataset publisher must set wallet address."
            )

        # Call NextJS API to create payment request
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.nextjs_api_url}/api/x402/create",
                    json={
                        "amount": amount,
                        "resource_id": resource_id,
                        "description": description,
                        "recipient_wallet": recipient_wallet,
                        "currency": currency,
                    },
                )

                if response.status_code == 402:
                    # Expected 402 response with payment details
                    data = response.json()
                    payment_request = data.get("payment", {})

                    # Store pending payment locally for backward compatibility
                    challenge_id = payment_request["challenge_id"]
                    self.pending_payments[challenge_id] = payment_request

                    return payment_request
                else:
                    # Unexpected response
                    raise Exception(
                        f"Unexpected response from NextJS API: {response.status_code} - {response.text}"
                    )

        except httpx.RequestError as e:
            # Fallback: create payment request locally if NextJS API is unavailable
            print(
                f"[x402 PROXY] WARNING: NextJS API unavailable, creating payment request locally: {e}"
            )
            return self._create_payment_request_local(
                amount, resource_id, description, recipient_wallet, currency
            )

    def _create_payment_request_local(
        self,
        amount: float,
        resource_id: str,
        description: str,
        recipient_wallet: str,
        currency: Currency,
    ) -> Dict:
        """
        Fallback: Create payment request locally if NextJS API is unavailable
        This maintains the same structure as the NextJS API response
        """
        challenge_id = str(uuid.uuid4())

        # Prepare payment details based on currency
        if currency == "USDC":
            USDC_DECIMALS = 6
            amount_tokens = int(amount * (10**USDC_DECIMALS))
            USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
            USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
            USDC_MINT = (
                USDC_MINT_DEVNET
                if "devnet" in settings.solana_rpc_url.lower()
                else USDC_MINT_MAINNET
            )

            payment_request = {
                "challenge_id": challenge_id,
                "recipient": recipient_wallet,
                "amount": amount,
                "amount_tokens": amount_tokens,
                "currency": "USDC",
                "mint_address": USDC_MINT,
                "decimals": USDC_DECIMALS,
                "resource_id": resource_id,
                "description": description,
                "timestamp": int(time.time()),
                "expires_at": int(time.time()) + 300,  # 5 minutes expiry
            }
        else:
            SOL_DECIMALS = 9
            amount_lamports = int(amount * (10**SOL_DECIMALS))

            payment_request = {
                "challenge_id": challenge_id,
                "recipient": recipient_wallet,
                "amount": amount,
                "amount_lamports": amount_lamports,
                "currency": "SOL",
                "decimals": SOL_DECIMALS,
                "resource_id": resource_id,
                "description": description,
                "timestamp": int(time.time()),
                "expires_at": int(time.time()) + 300,  # 5 minutes expiry
            }

        # Store pending payment
        self.pending_payments[challenge_id] = payment_request

        return payment_request

    def create_402_response(self, payment_request: Dict) -> JSONResponse:
        """
        Create HTTP 402 Payment Required response with x402 headers

        Args:
            payment_request: Payment request details from create_payment_request

        Returns:
            FastAPI Response with 402 status and x402 headers
        """
        headers = {
            "X-402-Version": "1.0",
            "X-402-Protocol": "solana",
            "X-402-Challenge": payment_request["challenge_id"],
            "X-402-Recipient": payment_request["recipient"],
            "X-402-Amount": str(payment_request["amount"]),
            "X-402-Currency": payment_request["currency"],
            "X-402-Description": payment_request["description"],
            "X-402-Expires": str(payment_request["expires_at"]),
        }

        return JSONResponse(
            status_code=402,
            content={
                "error": "payment_required",
                "message": "Payment required to access this resource",
                "payment": payment_request,
            },
            headers=headers,
        )

    async def verify_payment(
        self, challenge_id: str, transaction_signature: str
    ) -> bool:
        """
        Verify a Solana transaction for x402 payment via NextJS API

        Args:
            challenge_id: The challenge ID from the payment request
            transaction_signature: Solana transaction signature

        Returns:
            True if payment is valid, False otherwise
        """
        print(f"\n[x402 PROXY] Starting verification via NextJS API")
        print(f"[x402 PROXY] Challenge ID: {challenge_id}")
        print(f"[x402 PROXY] Transaction signature: {transaction_signature}")

        if challenge_id not in self.pending_payments:
            print(f"[x402 PROXY] FAILED: Challenge ID not found in pending payments")
            print(
                f"[x402 PROXY] Available challenges: {list(self.pending_payments.keys())}"
            )
            return False

        payment_request = self.pending_payments[challenge_id]
        print(f"[x402 PROXY] Payment request found: {payment_request}")

        # Check if expired
        current_time = int(time.time())
        if current_time > payment_request["expires_at"]:
            print(
                f"[x402 PROXY] FAILED: Payment expired (current: {current_time}, expires: {payment_request['expires_at']})"
            )
            del self.pending_payments[challenge_id]
            return False

        try:
            # Call NextJS API to verify payment
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.nextjs_api_url}/api/x402/verify",
                    json={
                        "challenge_id": challenge_id,
                        "transaction_signature": transaction_signature,
                    },
                )

                print(
                    f"[x402 PROXY] NextJS API response status: {response.status_code}"
                )
                print(f"[x402 PROXY] NextJS API response: {response.text}")

                if response.status_code == 200:
                    data = response.json()
                    is_valid = data.get("verified", False)

                    if is_valid:
                        print(f"[x402 PROXY] SUCCESS: Payment verified via NextJS API!")
                        # Remove from pending payments
                        del self.pending_payments[challenge_id]
                        return True
                    else:
                        print(f"[x402 PROXY] FAILED: Payment verification failed")
                        return False
                else:
                    print(
                        f"[x402 PROXY] FAILED: Unexpected response from NextJS API: {response.status_code}"
                    )
                    return False

        except httpx.RequestError as e:
            print(f"[x402 PROXY] EXCEPTION: NextJS API request failed: {e}")
            print(
                f"[x402 PROXY] WARNING: Falling back to direct verification (not implemented in proxy)"
            )
            # In a production environment, you might want to fall back to direct verification
            # For now, we'll just return False
            return False
        except Exception as e:
            print(f"[x402 PROXY] EXCEPTION: {e}")
            print(f"[x402 PROXY] Exception type: {type(e).__name__}")
            import traceback

            traceback.print_exc()
            return False


# Global x402 protocol proxy instance
x402_proxy = X402ProtocolProxy(
    nextjs_api_url=getattr(settings, "nextjs_api_url", "http://localhost:3000")
)

