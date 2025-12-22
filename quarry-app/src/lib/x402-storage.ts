/**
 * Shared storage for x402 pending payments
 * Uses module-level Map to persist across API route requests
 */

import { PaymentRequest } from './x402-protocol';

// Module-level storage (persists across requests in the same Node process)
const pendingPayments = new Map<string, PaymentRequest>();

export const x402Storage = {
  set(challengeId: string, payment: PaymentRequest): void {
    pendingPayments.set(challengeId, payment);
  },

  get(challengeId: string): PaymentRequest | undefined {
    return pendingPayments.get(challengeId);
  },

  has(challengeId: string): boolean {
    return pendingPayments.has(challengeId);
  },

  delete(challengeId: string): boolean {
    return pendingPayments.delete(challengeId);
  },

  keys(): string[] {
    return Array.from(pendingPayments.keys());
  },

  update(challengeId: string, data: Partial<PaymentRequest>): void {
    const payment = pendingPayments.get(challengeId);
    if (payment) {
      pendingPayments.set(challengeId, { ...payment, ...data });
    }
  },
};

