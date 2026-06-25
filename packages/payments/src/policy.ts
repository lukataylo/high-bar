import type { PolicyEngine, ProposedAction } from "@high-bar/core";
import { PolicyDecision } from "@high-bar/core";
import type { DailyReservation, ExpertEligibility, ExpertEligibilityPort, PayoutTotalsPort } from "./ports";
import { loadGuardrailConfig, type GuardrailConfig } from "./env";

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface PayoutPolicyEngineDeps {
  eligibility: ExpertEligibilityPort;
  totals: PayoutTotalsPort;
  /** Supplies fresh guardrail config per evaluation. Defaults to env-derived. */
  config?: () => GuardrailConfig;
}

/**
 * Money-movement guardrails for agent-initiated payouts. Fail-closed: every
 * unknown or under-specified situation results in a DENY. Decision order is
 * deliberate — kill switch first, then eligibility allowlist, then daily cap,
 * then the human-approval threshold.
 */
export class PayoutPolicyEngine implements PolicyEngine {
  private readonly eligibility: ExpertEligibilityPort;
  private readonly totals: PayoutTotalsPort;
  private readonly config: () => GuardrailConfig;

  constructor(deps: PayoutPolicyEngineDeps) {
    this.eligibility = deps.eligibility;
    this.totals = deps.totals;
    this.config = deps.config ?? (() => loadGuardrailConfig());
  }

  async evaluate(action: ProposedAction): Promise<PolicyDecision> {
    // Default-deny anything that is not a payout — this engine only authorizes payouts.
    if (action.type !== "payout.create") {
      return this.decision({
        allowed: false,
        requiresHumanApproval: false,
        reason: "PayoutPolicyEngine only evaluates payout.create actions.",
      });
    }

    const { expertId, amountCents } = action;
    const config = this.config();

    // 1. Kill switch — halts all agent-initiated payouts.
    if (config.killSwitch) {
      return this.decision({
        allowed: false,
        requiresHumanApproval: false,
        reason: "Agent kill switch is engaged; all agent-initiated payouts are halted.",
      });
    }

    // 2. Eligibility allowlist — expert must exist, be vetted, KYC-verified, and have a payout account.
    // FAIL-CLOSED: if the eligibility store is unavailable or throws, we DENY.
    // An unknown answer to "is this expert eligible?" is never an authorization.
    let eligibility: ExpertEligibility | null;
    try {
      eligibility = await this.eligibility.getEligibility(expertId);
    } catch {
      // Intentionally swallow the underlying error WITHOUT logging it — it may
      // carry PII/connection strings. Only the stable fail-closed reason leaves.
      return this.failClosed("eligibility");
    }
    if (eligibility === null) {
      return this.decision({
        allowed: false,
        requiresHumanApproval: false,
        reason: "Expert not found; cannot authorize payout.",
      });
    }
    if (eligibility.status !== "vetted") {
      return this.decision({
        allowed: false,
        requiresHumanApproval: false,
        reason: `Expert is not vetted (status=${eligibility.status}).`,
      });
    }
    if (eligibility.kycStatus !== "verified") {
      return this.decision({
        allowed: false,
        requiresHumanApproval: false,
        reason: `Expert KYC not verified (kyc=${eligibility.kycStatus}).`,
      });
    }
    if (
      eligibility.stripeConnectAccountId === null ||
      eligibility.stripeConnectAccountId.trim() === ""
    ) {
      return this.decision({
        allowed: false,
        requiresHumanApproval: false,
        reason: "Expert has no connected payout account.",
      });
    }

    // 3. Daily cap — hard ceiling on total agent-initiated payouts per day.
    //
    // RACE WARNING: a naive `read total -> compare -> proceed` is NOT safe under
    // concurrency. Two payouts evaluated at nearly the same instant can both
    // read an under-cap total and both pass, busting the cap. When the injected
    // PayoutTotalsPort exposes an ATOMIC `reserveDailyAmount`, we use it as the
    // authoritative gate so the reserve-and-compare happens in a single atomic
    // operation. apps/api MUST back that method with a DB-level atomic counter /
    // transaction (see ports.ts). The `sentTodayCents()` branch below is a
    // best-effort fallback and is NOT concurrency-safe on its own.
    //
    // FAIL-CLOSED: any error reaching the totals store results in a DENY.
    const reserve = this.totals.reserveDailyAmount;
    if (reserve !== undefined) {
      let reservation: DailyReservation;
      try {
        reservation = await reserve.call(this.totals, amountCents, config.dailyCapCents);
      } catch {
        return this.failClosed("totals");
      }
      if (!reservation.reserved) {
        return this.decision({
          allowed: false,
          requiresHumanApproval: false,
          reason: `Daily payout cap exceeded: ${usd(reservation.sentTodayCents)} sent + ${usd(amountCents)} requested > ${usd(config.dailyCapCents)} cap.`,
        });
      }
    } else {
      let sentTodayCents: number;
      try {
        sentTodayCents = await this.totals.sentTodayCents();
      } catch {
        return this.failClosed("totals");
      }
      if (sentTodayCents + amountCents > config.dailyCapCents) {
        return this.decision({
          allowed: false,
          requiresHumanApproval: false,
          reason: `Daily payout cap exceeded: ${usd(sentTodayCents)} sent + ${usd(amountCents)} requested > ${usd(config.dailyCapCents)} cap.`,
        });
      }
    }

    // 4. Approval threshold — over-threshold amounts are allowed but gated on human approval.
    if (amountCents > config.approvalThresholdCents) {
      return this.decision({
        allowed: true,
        requiresHumanApproval: true,
        reason: `Amount ${usd(amountCents)} exceeds auto-approval threshold ${usd(config.approvalThresholdCents)}; human approval required.`,
      });
    }

    // 5. Within all limits — auto-approve.
    return this.decision({
      allowed: true,
      requiresHumanApproval: false,
      reason: "Within limits; auto-approved.",
    });
  }

  /**
   * Fail-closed denial used when an injected port throws or is unavailable.
   * `which` is a fixed, non-sensitive label ("eligibility" | "totals") — we
   * NEVER include the underlying error, which may carry secrets or PII.
   */
  private failClosed(which: "eligibility" | "totals"): PolicyDecision {
    return this.decision({
      allowed: false,
      requiresHumanApproval: false,
      reason: `fail-closed: ${which} store unavailable`,
    });
  }

  /** Parse every decision through the contract schema to guarantee conformance. */
  private decision(input: PolicyDecision): PolicyDecision {
    return PolicyDecision.parse(input);
  }
}
