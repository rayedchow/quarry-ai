/**
 * Get Split Info API Route
 * 
 * GET /api/splits/info?publisher=xxx&dataset=xxx
 * Returns split configuration info (addresses, shares, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSplitsManager } from '@/lib/cascade-splits';

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  'https://convincing-delicate-frog.solana-mainnet.quiknode.pro/4dec0b3b4fc568d1c31eafce58fe7effa3bd026a/';
const PLATFORM_WALLET = process.env.QUARRY_PLATFORM_WALLET || '';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const publisher = searchParams.get('publisher');
    const dataset = searchParams.get('dataset');
    const mint = searchParams.get('mint');

    if (!publisher || !dataset) {
      return NextResponse.json(
        { error: 'Missing required parameters: publisher, dataset' },
        { status: 400 }
      );
    }

    if (!PLATFORM_WALLET) {
      return NextResponse.json(
        { error: 'Platform wallet not configured' },
        { status: 500 }
      );
    }

    const splitsManager = getSplitsManager(SOLANA_RPC_URL, PLATFORM_WALLET);

    // Get split info
    const splitInfo = await splitsManager.ensureSplit(
      publisher,
      dataset,
      mint || undefined
    );

    // Check if split exists on-chain
    const exists = await splitsManager.isSplit(splitInfo.splitConfigAddress);

    return NextResponse.json({
      success: true,
      split_config: splitInfo.splitConfigAddress,
      vault: splitInfo.vaultAddress,
      publisher_wallet: publisher,
      platform_wallet: PLATFORM_WALLET,
      publisher_share: splitInfo.publisherShare,
      platform_share: splitInfo.platformShare,
      exists_on_chain: exists,
      recipients: splitInfo.recipients,
    });
  } catch (error) {
    console.error('[SPLITS INFO API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get split info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

