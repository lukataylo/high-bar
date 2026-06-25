import type { PolicyEngine, ProposedAction } from "@high-bar/core";
import { PolicyDecision } from "@high-bar/core";
import type { ExpertEligibilityPort, PayoutTotalsPort } from "./ports";
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
    const eligibility = await this.eligibility.getEligibility(expertId);
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
    const sentTodayCents = await this.totals.sentTodayCents();
    if (sentTodayCents + amountCents > config.dailyCapCents) {
      return this.decision({
        allowed: false,
        requiresHumanApproval: false,
        reason: `Daily payout cap exceeded: ${usd(sentTodayCents)} sent + ${usd(amountCents)} requested > ${usd(config.dailyCapCents)} cap.`,
      });
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

  /** Parse every decision through the contract schema to guarantee conformance. */
  private decision(input: PolicyDecision): PolicyDecision {
    return PolicyDecision.parse(input);
  }
}
