import type { Cents } from "./money";
import type { Journal } from "./ledger";
import { ReconciliationDriftError } from "./errors";

/**
 * Reconciliation: compares the internal ledger against the payment processor's
 * own reported balances and detects drift. Designed to FAIL LOUD — an
 * autonomous finance loop must halt and escalate on any unexplained mismatch
 * rather than silently continue.
 */

/** Processor balance snapshot, in cents. */
export interface StripeBalance {
  /** Funds available for payout, in cents. */
  readonly availableCents: Cents;
  /** Funds still settling (in transit), in cents. */
  readonly pendingCents: Cents;
}

/**
 * Injected port over the payment processor. The gateway/app implements this
 * against the live Stripe Balance + payout APIs; tests inject fakes.
 */
export interface StripeBalancePort {
  /** Current processor balance (available + pending). */
  getBalance(): Promise<StripeBalance>;
  /** Total transferred out to experts to date, in cents. */
  getPayoutTotalsCents(): Promise<Cents>;
}

/** One reconciliation check comparing a ledger figure to an external figure. */
export interface ReconciliationCheck {
  readonly name: string;
  readonly ledgerCents: Cents;
  readonly externalCents: Cents;
  /** ledger - external, in cents. */
  readonly deltaCents: Cents;
  readonly ok: boolean;
}

export interface ReconciliationReport {
  readonly matched: boolean;
  readonly checks: readonly ReconciliationCheck[];
  /** Only the checks that drifted (deltaCents outside tolerance). */
  readonly mismatches: readonly ReconciliationCheck[];
}

export interface ReconcileOptions {
  /** Absolute cents tolerance per check (default 0 — exact match required). */
  readonly toleranceCents?: Cents;
}

function makeCheck(
  name: string,
  ledgerCents: Cents,
  externalCents: Cents,
  toleranceCents: Cents,
): ReconciliationCheck {
  const deltaCents = ledgerCents - externalCents;
  return {
    name,
    ledgerCents,
    externalCents,
    deltaCents,
    ok: Math.abs(deltaCents) <= toleranceCents,
  };
}

/**
 * Reconciles the ledger against the processor. Returns a report; never throws on
 * drift (use `assertReconciled` for the fail-loud variant). Checks:
 *   - cash: ledger `stripe_cash` vs processor available + pending balance.
 *   - payouts: ledger total expert payouts vs processor payout totals.
 */
export async function reconcile(
  journal: Journal,
  port: StripeBalancePort,
  options: ReconcileOptions = {},
): Promise<ReconciliationReport> {
  const toleranceCents = options.toleranceCents ?? 0;
  const [balance, externalPayouts] = await Promise.all([
    port.getBalance(),
    port.getPayoutTotalsCents(),
  ]);

  const ledgerCash = journal.balance("stripe_cash");
  const processorBalance = balance.availableCents + balance.pendingCents;
  const ledgerPayouts = journal.totalPayoutsCents();

  const checks: ReconciliationCheck[] = [
    makeCheck("stripe_cash", ledgerCash, processorBalance, toleranceCents),
    makeCheck("expert_payouts", ledgerPayouts, externalPayouts, toleranceCents),
  ];
  const mismatches = checks.filter((c) => !c.ok);
  return { matched: mismatches.length === 0, checks, mismatches };
}

/**
 * Fail-loud reconciliation: runs `reconcile` and throws a
 * `ReconciliationDriftError` on the first mismatch. Use this in the autonomous
 * loop so drift halts execution and escalates.
 */
export async function assertReconciled(
  journal: Journal,
  port: StripeBalancePort,
  options: ReconcileOptions = {},
): Promise<ReconciliationReport> {
  const report = await reconcile(journal, port, options);
  const firstMismatch = report.mismatches[0];
  if (firstMismatch !== undefined) {
    throw new ReconciliationDriftError(
      firstMismatch.name,
      firstMismatch.ledgerCents,
      firstMismatch.externalCents,
    );
  }
  return report;
}
