/**
 * Cascade Splits Integration for Quarry Platform Fees
 * 
 * Automatically splits x402 payments between:
 * - Dataset publisher (gets majority)
 * - Quarry platform (gets small fee)
 */

import { createSolanaRpc, address } from '@solana/kit';
import {
  deriveSplitConfig,
  deriveVault,
  createSplitConfig,
  labelToSeed,
  shareToPercentageBps,
  type Recipient,
} from '@cascade-fyi/splits-sdk';

// Platform fee percentage (in shares out of 100)
// Example: 5 = 5% platform fee, 95% to publisher
const PLATFORM_FEE_SHARE = 5;

export interface SplitPaymentInfo {
  splitConfigAddress: string;
  vaultAddress: string;
  recipients: Recipient[];
  publisherShare: number;
  platformShare: number;
}

export class CascadeSplitsManager {
  private rpc: ReturnType<typeof createSolanaRpc>;
  private platformWallet: string;

  constructor(rpcUrl: string, platformWallet: string) {
    this.rpc = createSolanaRpc(rpcUrl);
    this.platformWallet = platformWallet;
  }

  /**
   * Hash dataset ID to create short deterministic identifier
   * Keeps label under 27 character limit while maintaining uniqueness
   */
  private hashDatasetId(datasetId: string): string {
    // Simple hash function that creates a short deterministic string
    let hash = 0;
    for (let i = 0; i < datasetId.length; i++) {
      const char = datasetId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to base36 for short alphanumeric string
    return Math.abs(hash).toString(36).substring(0, 16);
  }

  /**
   * Create or get a split configuration for a dataset publisher
   * 
   * @param publisherWallet - Dataset publisher's wallet address
   * @param datasetId - Dataset ID for deterministic split address
   * @param mint - Optional mint address (default: native SOL)
   * @returns Split configuration details
   */
  async ensureSplit(
    publisherWallet: string,
    datasetId: string,
    mint?: string
  ): Promise<SplitPaymentInfo> {
    // Calculate shares (must total 100)
    const publisherShare = 100 - PLATFORM_FEE_SHARE;
    const platformShare = PLATFORM_FEE_SHARE;

    // Create recipients array - use 'share' field (1-100)
    // Recipient type expects address as string, not Address type
    const recipients: Recipient[] = [
      {
        address: publisherWallet, // Plain string
        share: publisherShare,     // 95
      },
      {
        address: this.platformWallet, // Plain string  
        share: platformShare,          // 5
      },
    ];

    // Use dataset ID as unique identifier for deterministic addressing
    // Hash dataset ID to keep label under 27 char limit
    const shortId = this.hashDatasetId(datasetId);
    const uniqueId = labelToSeed(`q-${shortId}`);

    // Derive split config address (deterministic - ASYNC!)
    // Convert string addresses to Address type for derive functions
    const mintAddress = mint ? address(mint) : address('11111111111111111111111111111111'); // System program for native SOL
    
    // Derive split config address
    const splitConfigAddress = await deriveSplitConfig(
      address(publisherWallet),
      mintAddress,
      uniqueId
    );

    // Derive vault address (ASYNC!)
    const vaultAddress = await deriveVault(
      splitConfigAddress,
      mintAddress
    );

    return {
      splitConfigAddress: String(splitConfigAddress),
      vaultAddress: String(vaultAddress),
      recipients,
      publisherShare,
      platformShare,
    };
  }

  /**
   * Create the split configuration on-chain (returns instruction)
   * 
   * This needs to be called once per dataset to set up the split.
   * Returns the instruction to include in a transaction.
   * 
   * @param publisherWallet - Publisher wallet (authority)
   * @param datasetId - Dataset ID
   * @param mint - Optional mint address
   */
  async createSplitInstruction(
    publisherWallet: string,
    datasetId: string,
    mint?: string
  ) {
    const publisherShare = 100 - PLATFORM_FEE_SHARE;
    const platformShare = PLATFORM_FEE_SHARE;

    const recipients: Recipient[] = [
      {
        address: publisherWallet,
        share: publisherShare,
      },
      {
        address: this.platformWallet,
        share: platformShare,
      },
    ];

    const shortId = this.hashDatasetId(datasetId);
    const uniqueId = labelToSeed(`q-${shortId}`);
    const mintAddress = mint ? address(mint) : address('11111111111111111111111111111111');

    const result = await createSplitConfig({
      authority: address(publisherWallet),
      recipients,
      mint: mintAddress,
      uniqueId,
    });

    return result;
  }

  /**
   * Get the split payment address for a dataset
   * This is what users should pay to (the splitConfig address)
   * 
   * @param publisherWallet - Publisher wallet
   * @param datasetId - Dataset ID
   * @param mint - Optional mint address
   * @returns The splitConfig address to use as payment recipient
   */
  async getSplitPaymentAddress(
    publisherWallet: string,
    datasetId: string,
    mint?: string
  ): Promise<string> {
    const split = await this.ensureSplit(publisherWallet, datasetId, mint);
    return split.splitConfigAddress;
  }

  /**
   * Check if an address is a Cascade split
   */
  async isSplit(splitConfigAddress: string): Promise<boolean> {
    try {
      const { isCascadeSplit } = await import('@cascade-fyi/splits-sdk');
      // isCascadeSplit signature might be: (rpc, splitConfig) based on TypeScript error
      const result = await (isCascadeSplit as any)(this.rpc, address(splitConfigAddress));
      return result;
    } catch (error) {
      console.warn('Failed to check if address is split:', error);
      return false;
    }
  }

  /**
   * Execute a split distribution
   * Call this after payment to distribute funds from vault to recipients
   * 
   * @param splitConfigAddress - The split config PDA address
   * @param executorWallet - Wallet executing the split (pays tx fees)
   * @returns Execution result with instruction to send
   */
  async executeSplit(splitConfigAddress: string, executorWallet: string) {
    try {
      const { executeSplit } = await import('@cascade-fyi/splits-sdk');
      
      const result = await executeSplit({
        rpc: this.rpc,
        splitConfig: address(splitConfigAddress),
        executor: address(executorWallet),
      } as any);

      return result;
    } catch (error) {
      console.error('Failed to execute split:', error);
      throw error;
    }
  }
}

// Singleton instance
let splitsManager: CascadeSplitsManager | null = null;

export function getSplitsManager(
  rpcUrl?: string,
  platformWallet?: string
): CascadeSplitsManager {
  if (!splitsManager) {
    if (!rpcUrl || !platformWallet) {
      throw new Error(
        'Solana RPC URL and platform wallet must be provided on first initialization'
      );
    }
    splitsManager = new CascadeSplitsManager(rpcUrl, platformWallet);
  }
  return splitsManager;
}

export { splitsManager };

