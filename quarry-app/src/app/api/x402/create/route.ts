/**
 * x402 Payment Request Creation API Route
 * 
 * POST /api/x402/create
 * Creates a new x402 payment request
 * 
 * Note: Cascade Splits integration is disabled for MVP to maintain
 * clean attestation flow (direct user → publisher payments are clearer
 * for blockchain verification and usage receipts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getX402Instance, Currency } from '@/lib/x402-protocol';

// Get configuration from environment
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  'https://convincing-delicate-frog.solana-mainnet.quiknode.pro/4dec0b3b4fc568d1c31eafce58fe7effa3bd026a/';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      resource_id,
      description,
      recipient_wallet,
      currency = 'SOL',
      dataset_slug,
      sql_query,
    } = body;

    // Validate required fields
    if (!amount || !resource_id || !description || !recipient_wallet) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['amount', 'resource_id', 'description', 'recipient_wallet'],
        },
        { status: 400 }
      );
    }

    // Validate currency
    if (currency !== 'SOL' && currency !== 'USDC') {
      return NextResponse.json(
        { error: 'Invalid currency. Must be SOL or USDC' },
        { status: 400 }
      );
    }

    // Create direct payment (Cascade Splits disabled for MVP)
    // Reason: Direct payments create clearer attestations and usage receipts
    // Future: Can add splits with updated attestation metadata
    const x402 = getX402Instance(SOLANA_RPC_URL);

    const paymentRequest = await x402.createPaymentRequest(
      amount,
      resource_id,
      description,
      recipient_wallet,
      currency as Currency
    );

    // Store additional data if provided
    if (dataset_slug || sql_query) {
      x402.updatePendingPayment(paymentRequest.challenge_id, {
        dataset_slug,
        sql_query,
      });
    }

    // Create 402 response
    const response402 = x402.create402Response(paymentRequest);

    return NextResponse.json(response402.body, {
      status: response402.status,
      headers: response402.headers,
    });
  } catch (error) {
    console.error('[x402 CREATE API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

