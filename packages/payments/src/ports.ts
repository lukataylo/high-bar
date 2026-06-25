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

/**
 * Result of an atomic daily-cap reservation. `reserved` is true only when the
 * requested amount fit under the cap AND the running total was advanced in the
 * SAME atomic operation. `sentTodayCents` reflects the total at decision time
 * (after a successful reserve it includes the just-reserved amount).
 */
export interface DailyReservation {
  reserved: boolean;
  sentTodayCents: number;
}

/** Reports how much (in cents) has already been paid out today. */
export interface PayoutTotalsPort {
  sentTodayCents(): Promise<number>;
  /**
   * OPTIONAL atomic reserve-and-check for the daily cap. When present, the
   * PayoutPolicyEngine prefers this over `sentTodayCents()` because a read-then-
   * compare is racy under concurrency (two payouts can both read an under-cap
   * total and both proceed, busting the cap).
   *
   * CRITICAL: apps/api MUST implement this with a DB-LEVEL ATOMIC operation —
   * e.g. a single transactional
   *   `UPDATE daily_payout_totals
   *      SET total_cents = total_cents + :amt
   *    WHERE day = :today AND total_cents + :amt <= :cap`
   * (or SELECT ... FOR UPDATE) so the reserve+compare cannot interleave. A
   * reservation is TENTATIVE: if the resulting decision does not execute (e.g.
   * a human rejects an over-threshold payout, or createPayout fails), apps/api
   * MUST release/decrement the reserved amount so it is not permanently
   * consumed against the cap.
   */
  reserveDailyAmount?(amountCents: number, dailyCapCents: number): Promise<DailyReservation>;
}

/**
 * Optional belt-and-suspenders idempotency store. Stripe idempotency keys are
 * the primary guard; this exists for callers that want an extra local check.
 */
export interface IdempotencyStore {
  has(key: string): Promise<boolean>;
  remember(key: string): Promise<void>;
}
