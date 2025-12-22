/**
 * Create Split Vault API Route
 * 
 * POST /api/splits/create
 * Creates a Cascade Split vault for a publisher (requires signature)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSplitsManager } from '@/lib/cascade-splits';

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  'https://convincing-delicate-frog.solana-mainnet.quiknode.pro/4dec0b3b4fc568d1c31eafce58fe7effa3bd026a/';
const PLATFORM_WALLET = process.env.QUARRY_PLATFORM_WALLET || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publisher_wallet, dataset_id, mint } = body;

    if (!publisher_wallet || !dataset_id) {
      return NextResponse.json(
        { error: 'Missing required fields: publisher_wallet, dataset_id' },
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

    // Get split instruction
    const result = await splitsManager.createSplitInstruction(
      publisher_wallet,
      dataset_id,
      mint
    );

    return NextResponse.json({
      success: true,
      split_config: String(result.splitConfig),
      vault: String(result.vault),
      instruction: {
        // Return instruction data for frontend to build transaction
        programId: String(result.instruction.programId),
        keys: result.instruction.accounts.map((a: any) => ({
          pubkey: String(a.address),
          isSigner: a.role?.signer || false,
          isWritable: a.role?.writable || false,
        })),
        data: Array.from(result.instruction.data),
      },
      message: 'Split created successfully. Use this split_config address for payments.',
    });
  } catch (error) {
    console.error('[SPLITS CREATE API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create split',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

