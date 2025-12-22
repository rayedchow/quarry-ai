/**
 * Execute Split API Route
 * 
 * POST /api/splits/execute
 * Executes a split distribution (moves funds from vault to recipients)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSplitsManager } from '@/lib/cascade-splits';

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  'https://convincing-delicate-frog.solana-mainnet.quiknode.pro/4dec0b3b4fc568d1c31eafce58fe7effa3bd026a/';
const PLATFORM_WALLET = process.env.QUARRY_PLATFORM_WALLET || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { split_config, executor_wallet } = body;

    if (!split_config || !executor_wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: split_config, executor_wallet' },
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

    // Execute the split
    const result = await splitsManager.executeSplit(split_config, executor_wallet);

    if (result.status === 'success') {
      return NextResponse.json({
        success: true,
        status: 'success',
        instruction: {
          programId: String(result.instruction.programId),
          keys: result.instruction.accounts.map((a: any) => ({
            pubkey: String(a.address),
            isSigner: a.role?.signer || false,
            isWritable: a.role?.writable || false,
          })),
          data: Array.from(result.instruction.data),
        },
        message: 'Split execution instruction ready. Send transaction to distribute funds.',
      });
    } else {
      return NextResponse.json({
        success: false,
        status: result.status,
        message: `Cannot execute split: ${result.status}`,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[SPLITS EXECUTE API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute split',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

