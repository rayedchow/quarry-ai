/**
 * x402 Protocol Implementation for Solana Micropayments
 * Implements the x402 standard for HTTP 402 Payment Required
 * Supports both native SOL and USDC payments
 * 
 * This is a TypeScript port of the Python implementation in quarry-backend/x402_protocol.py
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// USDC Mint Addresses
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// USDC Decimals
const USDC_DECIMALS = 6; // USDC has 6 decimals
const SOL_DECIMALS = 9; // SOL has 9 decimals

export type Currency = 'SOL' | 'USDC';

export interface PaymentRequest {
  challenge_id: string;
  recipient: string;
  recipient_token_account?: string;
  amount: number;
  amount_lamports?: number;
  amount_tokens?: number;
  currency: Currency;
  mint_address?: string;
  decimals: number;
  resource_id: string;
  description: string;
  timestamp: number;
  expires_at: number;
  dataset_slug?: string;
  sql_query?: string;
  split_info?: {
    publisher_wallet: string;
    platform_wallet: string;
    split_address: string;
    vault_address: string;
    publisher_share: number;
    platform_share: number;
  };
}

export interface X402Response {
  error: string;
  message: string;
  payment: PaymentRequest;
}

export class X402PaymentRequired extends Error {
  payment_details: PaymentRequest;

  constructor(payment_details: PaymentRequest) {
    super('Payment required');
    this.name = 'X402PaymentRequired';
    this.payment_details = payment_details;
  }
}

import { x402Storage } from './x402-storage';

export class X402Protocol {
  private solana_client: Connection;
  private solana_rpc_url: string;

  constructor(solana_rpc_url: string) {
    this.solana_rpc_url = solana_rpc_url;
    this.solana_client = new Connection(solana_rpc_url, 'confirmed');
  }

  /**
   * Get USDC mint address based on network
   */
  private getUsdcMint(): PublicKey {
    return this.solana_rpc_url.toLowerCase().includes('devnet')
      ? USDC_MINT_DEVNET
      : USDC_MINT_MAINNET;
  }

  /**
   * Create an x402 payment request
   * 
   * @param amount - Amount in the specified currency (SOL or USDC)
   * @param resource_id - Unique identifier for the resource
   * @param description - Human-readable description
   * @param recipient_wallet - Wallet to receive payment (defaults to platform wallet)
   * @param currency - Payment currency - "SOL" or "USDC"
   * @returns Payment request details including challenge ID
   */
  async createPaymentRequest(
    amount: number,
    resource_id: string,
    description: string,
    recipient_wallet: string,
    currency: Currency = 'SOL'
  ): Promise<PaymentRequest> {
    // Validate recipient address is configured
    if (!recipient_wallet) {
      throw new Error(
        'No payment recipient configured. Dataset publisher must set wallet address.'
      );
    }

    const challenge_id = this.generateUUID();
    const recipient_pubkey = new PublicKey(recipient_wallet);

    // Prepare payment details based on currency
    let payment_request: PaymentRequest;

    if (currency === 'USDC') {
      // USDC: SPL Token transfer
      const amount_tokens = Math.floor(amount * Math.pow(10, USDC_DECIMALS)); // Convert to smallest unit
      const usdc_mint = this.getUsdcMint();
      const recipient_token_account = await getAssociatedTokenAddress(
        usdc_mint,
        recipient_pubkey
      );

      payment_request = {
        challenge_id,
        recipient: recipient_wallet,
        recipient_token_account: recipient_token_account.toBase58(),
        amount,
        amount_tokens,
        currency: 'USDC',
        mint_address: usdc_mint.toBase58(),
        decimals: USDC_DECIMALS,
        resource_id,
        description,
        timestamp: Math.floor(Date.now() / 1000),
        expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes expiry
      };
    } else {
      // SOL: Native transfer
      const amount_lamports = Math.floor(amount * Math.pow(10, SOL_DECIMALS)); // Convert to lamports

      payment_request = {
        challenge_id,
        recipient: recipient_wallet,
        amount,
        amount_lamports,
        currency: 'SOL',
        decimals: SOL_DECIMALS,
        resource_id,
        description,
        timestamp: Math.floor(Date.now() / 1000),
        expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes expiry
      };
    }

    // Store pending payment in shared storage
    x402Storage.set(challenge_id, payment_request);

    return payment_request;
  }

  /**
   * Create HTTP 402 Payment Required response with x402 headers
   * 
   * @param payment_request - Payment request details from createPaymentRequest
   * @returns Response object with 402 status and x402 headers
   */
  create402Response(payment_request: PaymentRequest): {
    status: number;
    headers: Record<string, string>;
    body: X402Response;
  } {
    const headers: Record<string, string> = {
      'X-402-Version': '1.0',
      'X-402-Protocol': 'solana',
      'X-402-Challenge': payment_request.challenge_id,
      'X-402-Recipient': payment_request.recipient,
      'X-402-Amount': payment_request.amount.toString(),
      'X-402-Currency': payment_request.currency,
      'X-402-Description': payment_request.description,
      'X-402-Expires': payment_request.expires_at.toString(),
    };

    return {
      status: 402,
      headers,
      body: {
        error: 'payment_required',
        message: 'Payment required to access this resource',
        payment: payment_request,
      },
    };
  }

  /**
   * Verify a Solana transaction for x402 payment (SOL or USDC)
   * 
   * @param challenge_id - The challenge ID from the payment request
   * @param transaction_signature - Solana transaction signature
   * @returns True if payment is valid, False otherwise
   */
  async verifyPayment(
    challenge_id: string,
    transaction_signature: string
  ): Promise<boolean> {
    console.log('\n[x402 VERIFY] Starting verification');
    console.log(`[x402 VERIFY] Challenge ID: ${challenge_id}`);
    console.log(`[x402 VERIFY] Transaction signature: ${transaction_signature}`);

    if (!x402Storage.has(challenge_id)) {
      console.log('[x402 VERIFY] FAILED: Challenge ID not found in pending payments');
      console.log(
        `[x402 VERIFY] Available challenges: ${x402Storage.keys()}`
      );
      return false;
    }

    const payment_request = x402Storage.get(challenge_id)!;
    const currency = payment_request.currency || 'SOL';
    console.log(`[x402 VERIFY] Payment request found:`, payment_request);
    console.log(`[x402 VERIFY] Currency: ${currency}`);

    // Check if expired
    const current_time = Math.floor(Date.now() / 1000);
    if (current_time > payment_request.expires_at) {
      console.log(
        `[x402 VERIFY] FAILED: Payment expired (current: ${current_time}, expires: ${payment_request.expires_at})`
      );
      x402Storage.delete(challenge_id);
      return false;
    }

    try {
      // Get transaction details from Solana
      console.log(
        `[x402 VERIFY] Fetching transaction from Solana RPC: ${this.solana_rpc_url}`
      );
      const tx_response = await this.solana_client.getTransaction(
        transaction_signature,
        {
          maxSupportedTransactionVersion: 0,
        }
      );

      console.log('[x402 VERIFY] Transaction response received');

      if (!tx_response) {
        console.log('[x402 VERIFY] FAILED: Transaction not found on blockchain');
        return false;
      }

      console.log('[x402 VERIFY] Transaction data retrieved');

      // Verify transaction is confirmed
      if (!tx_response.meta) {
        console.log(
          '[x402 VERIFY] FAILED: Transaction has no metadata (not confirmed yet?)'
        );
        return false;
      }

      // Verify no errors
      if (tx_response.meta.err) {
        console.log(
          `[x402 VERIFY] FAILED: Transaction has error: ${JSON.stringify(tx_response.meta.err)}`
        );
        return false;
      }

      console.log('[x402 VERIFY] Transaction confirmed successfully');

      // Get transaction details
      const transaction = tx_response.transaction;
      const message = transaction.message;

      console.log(`[x402 VERIFY] Account keys in transaction:`, message.accountKeys);

      // Verify recipient
      const recipient_pubkey = new PublicKey(payment_request.recipient);
      console.log(`[x402 VERIFY] Expected recipient: ${recipient_pubkey.toBase58()}`);

      // Currency-specific verification
      if (currency === 'USDC') {
        // USDC: Check token balance changes
        return await this.verifyUsdcPayment(
          tx_response,
          payment_request,
          recipient_pubkey
        );
      } else {
        // SOL: Check native balance changes
        return await this.verifySolPayment(
          tx_response,
          payment_request,
          message,
          recipient_pubkey,
          challenge_id
        );
      }
    } catch (e) {
      console.log(`[x402 VERIFY] EXCEPTION: ${e}`);
      console.log(`[x402 VERIFY] Exception type: ${(e as Error).name}`);
      console.error(e);
      return false;
    }
  }

  /**
   * Verify native SOL payment
   */
  private async verifySolPayment(
    tx_data: any,
    payment_request: PaymentRequest,
    message: any,
    recipient_pubkey: PublicKey,
    challenge_id: string
  ): Promise<boolean> {
    console.log('[x402 VERIFY SOL] Verifying SOL payment');

    // Check if recipient is in the account keys
    let found_recipient = false;
    for (let idx = 0; idx < message.accountKeys.length; idx++) {
      const account = message.accountKeys[idx];
      if (account.toBase58() === recipient_pubkey.toBase58()) {
        found_recipient = true;
        console.log(`[x402 VERIFY SOL] Found recipient at index ${idx}`);
        break;
      }
    }

    if (!found_recipient) {
      console.log(
        '[x402 VERIFY SOL] FAILED: Recipient not found in transaction accounts'
      );
      return false;
    }

    // Verify amount (check post balances vs pre balances)
    if (tx_data.meta.postBalances && tx_data.meta.preBalances) {
      console.log(`[x402 VERIFY SOL] Pre-balances:`, tx_data.meta.preBalances);
      console.log(`[x402 VERIFY SOL] Post-balances:`, tx_data.meta.postBalances);

      // Find the recipient's balance change
      for (let i = 0; i < message.accountKeys.length; i++) {
        const account = message.accountKeys[i];
        if (account.toBase58() === recipient_pubkey.toBase58()) {
          const balance_change =
            tx_data.meta.postBalances[i] - tx_data.meta.preBalances[i];
          const expected_lamports = payment_request.amount_lamports!;

          console.log(
            `[x402 VERIFY SOL] Balance change for recipient: ${balance_change} lamports`
          );
          console.log(
            `[x402 VERIFY SOL] Expected amount: ${expected_lamports} lamports`
          );
          console.log(
            `[x402 VERIFY SOL] Tolerance (95%): ${expected_lamports * 0.95} lamports`
          );

          // Verify amount (with some tolerance for fees)
          if (balance_change >= expected_lamports * 0.95) {
            // 95% tolerance
            // Payment verified!
            console.log('[x402 VERIFY SOL] SUCCESS: Payment verified!');
            x402Storage.delete(challenge_id);
            return true;
          } else {
            console.log('[x402 VERIFY SOL] FAILED: Balance change insufficient');
            return false;
          }
        }
      }
    }

    console.log('[x402 VERIFY SOL] FAILED: Could not verify balance change');
    return false;
  }

  /**
   * Verify USDC SPL token payment
   */
  private async verifyUsdcPayment(
    tx_data: any,
    payment_request: PaymentRequest,
    recipient_pubkey: PublicKey
  ): Promise<boolean> {
    console.log('[x402 VERIFY USDC] Verifying USDC payment');

    const recipient_token_account = new PublicKey(
      payment_request.recipient_token_account!
    );
    const expected_amount = payment_request.amount_tokens!;

    console.log(
      `[x402 VERIFY USDC] Expected recipient token account: ${recipient_token_account.toBase58()}`
    );
    console.log(`[x402 VERIFY USDC] Expected amount: ${expected_amount} tokens`);

    // Check token balances (pre/post)
    if (tx_data.meta.preTokenBalances && tx_data.meta.postTokenBalances) {
      console.log(
        '[x402 VERIFY USDC] Pre-token-balances:',
        tx_data.meta.preTokenBalances
      );
      console.log(
        '[x402 VERIFY USDC] Post-token-balances:',
        tx_data.meta.postTokenBalances
      );

      // Find recipient's token account in post balances
      for (const post_balance of tx_data.meta.postTokenBalances) {
        const account_index = post_balance.accountIndex;
        const post_amount = parseInt(post_balance.uiTokenAmount.amount);

        // Get corresponding pre balance
        let pre_amount = 0;
        for (const pre_balance of tx_data.meta.preTokenBalances) {
          if (pre_balance.accountIndex === account_index) {
            pre_amount = parseInt(pre_balance.uiTokenAmount.amount);
            break;
          }
        }

        const balance_change = post_amount - pre_amount;

        console.log(
          `[x402 VERIFY USDC] Account index ${account_index}: change = ${balance_change}`
        );

        // Check if this is the recipient and amount matches
        if (balance_change > 0 && balance_change >= expected_amount * 0.95) {
          console.log('[x402 VERIFY USDC] SUCCESS: USDC payment verified!');
          // Remove from pending
          const challenge_id = payment_request.challenge_id;
          if (x402Storage.has(challenge_id)) {
            x402Storage.delete(challenge_id);
          }
          return true;
        }
      }

      console.log('[x402 VERIFY USDC] FAILED: No matching token transfer found');
      return false;
    }

    console.log('[x402 VERIFY USDC] FAILED: No token balance data in transaction');
    return false;
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get a pending payment by challenge ID
   */
  getPendingPayment(challenge_id: string): PaymentRequest | undefined {
    return x402Storage.get(challenge_id);
  }

  /**
   * Store additional data in a pending payment
   */
  updatePendingPayment(challenge_id: string, data: Partial<PaymentRequest>): void {
    x402Storage.update(challenge_id, data);
  }

  /**
   * Get all pending payment challenge IDs
   */
  getPendingPaymentIds(): string[] {
    return x402Storage.keys();
  }
}

// Singleton instance (will be initialized in API routes with proper config)
let x402Instance: X402Protocol | null = null;

export function getX402Instance(solana_rpc_url?: string): X402Protocol {
  if (!x402Instance) {
    if (!solana_rpc_url) {
      throw new Error('Solana RPC URL must be provided on first initialization');
    }
    x402Instance = new X402Protocol(solana_rpc_url);
  }
  return x402Instance;
}

export { x402Instance };

