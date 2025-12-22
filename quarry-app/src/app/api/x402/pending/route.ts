/**
 * x402 Pending Payments API Route
 * 
 * GET /api/x402/pending?challenge_id=xxx
 * Retrieves a pending payment by challenge ID
 * 
 * GET /api/x402/pending
 * Lists all pending payment challenge IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getX402Instance } from '@/lib/x402-protocol';

// Get Solana RPC URL from environment
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  'https://convincing-delicate-frog.solana-mainnet.quiknode.pro/4dec0b3b4fc568d1c31eafce58fe7effa3bd026a/';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const challenge_id = searchParams.get('challenge_id');

    // Get x402 instance
    const x402 = getX402Instance(SOLANA_RPC_URL);

    if (challenge_id) {
      // Get specific pending payment
      const payment = x402.getPendingPayment(challenge_id);
      
      if (!payment) {
        return NextResponse.json(
          { error: 'Payment not found or expired' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        payment,
      });
    } else {
      // List all pending payment IDs
      const pendingIds = x402.getPendingPaymentIds();
      
      return NextResponse.json({
        success: true,
        pending_payments: pendingIds,
        count: pendingIds.length,
      });
    }
  } catch (error) {
    console.error('[x402 PENDING API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

