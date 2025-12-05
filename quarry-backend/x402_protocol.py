"""
x402 Protocol Implementation for Solana Micropayments
Implements the x402 standard for HTTP 402 Payment Required
"""

import uuid
import time
from typing import Dict
from fastapi.responses import JSONResponse
from solana.rpc.api import Client
from solders.pubkey import Pubkey  # type: ignore
from solders.signature import Signature  # type: ignore

from config import settings


class X402PaymentRequired(Exception):
    """Exception raised when x402 payment is required"""

    def __init__(self, payment_details: Dict):
        self.payment_details = payment_details
        super().__init__("Payment required")


class X402Protocol:
    """Handles x402 protocol payments on Solana"""

    def __init__(self):
        self.solana_client = Client(settings.solana_rpc_url)
        self.pending_payments: Dict[str, Dict] = {}

    def create_payment_request(
        self, amount_sol: float, resource_id: str, description: str, recipient_wallet: str = None
    ) -> Dict:
        """
        Create an x402 payment request

        Args:
            amount_sol: Amount in SOL
            resource_id: Unique identifier for the resource
            description: Human-readable description
            recipient_wallet: Wallet to receive payment (defaults to platform wallet)

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

        challenge_id = str(uuid.uuid4())
        lamports = int(amount_sol * 1_000_000_000)  # Convert SOL to lamports

        payment_request = {
            "challenge_id": challenge_id,
            "recipient": recipient_wallet,  # Use publisher's wallet
            "amount": amount_sol,
            "amount_lamports": lamports,
            "currency": "SOL",
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
        Verify a Solana transaction for x402 payment

        Args:
            challenge_id: The challenge ID from the payment request
            transaction_signature: Solana transaction signature

        Returns:
            True if payment is valid, False otherwise
        """
        print(f"\n[x402 VERIFY] Starting verification")
        print(f"[x402 VERIFY] Challenge ID: {challenge_id}")
        print(f"[x402 VERIFY] Transaction signature: {transaction_signature}")

        if challenge_id not in self.pending_payments:
            print(f"[x402 VERIFY] FAILED: Challenge ID not found in pending payments")
            print(
                f"[x402 VERIFY] Available challenges: {list(self.pending_payments.keys())}"
            )
            return False

        payment_request = self.pending_payments[challenge_id]
        print(f"[x402 VERIFY] Payment request found: {payment_request}")

        # Check if expired
        current_time = int(time.time())
        if current_time > payment_request["expires_at"]:
            print(
                f"[x402 VERIFY] FAILED: Payment expired (current: {current_time}, expires: {payment_request['expires_at']})"
            )
            del self.pending_payments[challenge_id]
            return False

        try:
            # Convert signature string to Signature object
            print(f"[x402 VERIFY] Converting signature to Signature object")
            sig = Signature.from_string(transaction_signature)
            print(f"[x402 VERIFY] Signature converted successfully")

            # Get transaction details from Solana
            print(
                f"[x402 VERIFY] Fetching transaction from Solana RPC: {settings.solana_rpc_url}"
            )
            tx_response = self.solana_client.get_transaction(
                sig, encoding="json", max_supported_transaction_version=0
            )

            print(f"[x402 VERIFY] Transaction response received: {tx_response}")

            if not tx_response.value:
                print(f"[x402 VERIFY] FAILED: Transaction not found on blockchain")
                return False

            tx_data = tx_response.value
            print(f"[x402 VERIFY] Transaction data retrieved")

            # Verify transaction is confirmed
            if not tx_data.transaction.meta:
                print(
                    f"[x402 VERIFY] FAILED: Transaction has no metadata (not confirmed yet?)"
                )
                return False

            # Verify no errors
            if tx_data.transaction.meta.err:
                print(
                    f"[x402 VERIFY] FAILED: Transaction has error: {tx_data.transaction.meta.err}"
                )
                return False

            print(f"[x402 VERIFY] Transaction confirmed successfully")

            # Get transaction details
            transaction = tx_data.transaction.transaction
            message = transaction.message

            print(f"[x402 VERIFY] Account keys in transaction: {message.account_keys}")

            # Verify recipient
            recipient_pubkey = Pubkey.from_string(payment_request["recipient"])
            print(f"[x402 VERIFY] Expected recipient: {recipient_pubkey}")

            # Check if recipient is in the account keys
            found_recipient = False
            for idx, account in enumerate(message.account_keys):
                print(f"[x402 VERIFY] Checking account {idx}: {account}")
                if account == recipient_pubkey:
                    found_recipient = True
                    print(f"[x402 VERIFY] Found recipient at index {idx}")
                    break

            if not found_recipient:
                print(
                    f"[x402 VERIFY] FAILED: Recipient not found in transaction accounts"
                )
                return False

            # Verify amount (check post balances vs pre balances)
            if (
                tx_data.transaction.meta.post_balances
                and tx_data.transaction.meta.pre_balances
            ):
                print(
                    f"[x402 VERIFY] Pre-balances: {tx_data.transaction.meta.pre_balances}"
                )
                print(
                    f"[x402 VERIFY] Post-balances: {tx_data.transaction.meta.post_balances}"
                )

                # Find the recipient's balance change
                for i, account in enumerate(message.account_keys):
                    if account == recipient_pubkey:
                        balance_change = (
                            tx_data.transaction.meta.post_balances[i]
                            - tx_data.transaction.meta.pre_balances[i]
                        )
                        expected_lamports = payment_request["amount_lamports"]

                        print(
                            f"[x402 VERIFY] Balance change for recipient: {balance_change} lamports"
                        )
                        print(
                            f"[x402 VERIFY] Expected amount: {expected_lamports} lamports"
                        )
                        print(
                            f"[x402 VERIFY] Tolerance (95%): {expected_lamports * 0.95} lamports"
                        )

                        # Verify amount (with some tolerance for fees)
                        if balance_change >= expected_lamports * 0.95:  # 95% tolerance
                            # Payment verified!
                            print(f"[x402 VERIFY] SUCCESS: Payment verified!")
                            del self.pending_payments[challenge_id]
                            return True
                        else:
                            print(f"[x402 VERIFY] FAILED: Balance change insufficient")
                            return False

            print(f"[x402 VERIFY] FAILED: Could not verify balance change")
            return False

        except Exception as e:
            print(f"[x402 VERIFY] EXCEPTION: {e}")
            print(f"[x402 VERIFY] Exception type: {type(e).__name__}")
            import traceback

            traceback.print_exc()
            return False


# Global x402 protocol instance
x402 = X402Protocol()
