import type { ExpertStatus, KycStatus } from "@high-bar/core";

/**
 * Ports inject all external state so this package has NO database dependency.
 * The gateway/app supplies concrete implementations backed by the DB.
 */

/** The minimal expert facts the payout guardrails need to decide eligibility. */
export interface ExpertEligibility {
  status: ExpertStatus;
  kycStatus: KycStatus;
  stripeConnectAccountId: string | null;
}

/** Looks up an expert's payout eligibility. Returns null when not found. */
export interface ExpertEligibilityPort {
  getEligibility(expertId: string): Promise<ExpertEligibility | null>;
}

/** Reports how much (in cents) has already been paid out today. */
export interface PayoutTotalsPort {
  sentTodayCents(): Promise<number>;
}

/**
 * Optional belt-and-suspenders idempotency store. Stripe idempotency keys are
 * the primary guard; this exists for callers that want an extra local check.
 */
export interface IdempotencyStore {
  has(key: string): Promise<boolean>;
  remember(key: string): Promise<void>;
}
