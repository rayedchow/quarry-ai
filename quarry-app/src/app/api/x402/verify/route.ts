/**
 * x402 Payment Verification API Route
 * 
 * POST /api/x402/verify
 * Verifies a Solana transaction for x402 payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getX402Instance } from '@/lib/x402-protocol';

// Get Solana RPC URL from environment
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  'https://convincing-delicate-frog.solana-mainnet.quiknode.pro/4dec0b3b4fc568d1c31eafce58fe7effa3bd026a/';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challenge_id, transaction_signature } = body;

    if (!challenge_id || !transaction_signature) {
      return NextResponse.json(
        { error: 'Missing challenge_id or transaction_signature' },
        { status: 400 }
      );
    }

    // Get x402 instance
    const x402 = getX402Instance(SOLANA_RPC_URL);

    // Verify payment
    const isValid = await x402.verifyPayment(challenge_id, transaction_signature);

    if (isValid) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Payment verified successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: 'Payment verification failed. Transaction not found or invalid.',
        },
        { status: 402 }
      );
    }
  } catch (error) {
    console.error('[x402 VERIFY API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

