import type { PolicyEngine, ProposedAction } from "@high-bar/core";
import { PolicyDecision } from "@high-bar/core";

export interface GatewayPolicyEngineDeps {
  /**
   * Money-movement guardrails for `payout.create`. Inject the payments
   * `PayoutPolicyEngine` (constructed with ExpertEligibilityPort + PayoutTotalsPort).
   * Kept as the abstract `PolicyEngine` so the gateway never depends on Stripe.
   */
  payoutPolicy: PolicyEngine;
}

/**
 * The single authority that decides what an (untrusted) runtime proposal is
 * allowed to do. Fail-closed: anything not explicitly handled is DENIED.
 *
 *  - `payout.create`  -> delegated to the injected payout policy (eligibility
 *                        allowlist, daily cap, approval threshold, kill switch).
 *  - `outreach.draft` -> ALLOWED but ALWAYS requiresHumanApproval (draft-only,
 *                        never auto-sent).
 *  - `lead.upsert`    -> ALLOWED (pure data write, no money, no outbound comms).
 *  - anything else    -> DENIED.
 */
export class GatewayPolicyEngine implements PolicyEngine {
  private readonly payoutPolicy: PolicyEngine;

  constructor(deps: GatewayPolicyEngineDeps) {
    this.payoutPolicy = deps.payoutPolicy;
  }

  async evaluate(action: ProposedAction): Promise<PolicyDecision> {
    switch (action.type) {
      case "payout.create":
        // Delegate money movement to the dedicated guardrail engine.
        return this.payoutPolicy.evaluate(action);
      case "outreach.draft":
        return this.decision({
          allowed: true,
          requiresHumanApproval: true,
          reason: "Outreach is draft-only; a human must review and send. Never auto-sent.",
        });
      case "lead.upsert":
        return this.decision({
          allowed: true,
          requiresHumanApproval: false,
          reason: "Lead upsert is a data-only write with no money or outbound comms.",
        });
      default:
        // Exhaustive over the contract union; this guards untrusted/forged shapes.
        return this.decision({
          allowed: false,
          requiresHumanApproval: false,
          reason: "Unknown action type; default-deny.",
        });
    }
  }

  /** Parse every decision through the contract schema to guarantee conformance. */
  private decision(input: PolicyDecision): PolicyDecision {
    return PolicyDecision.parse(input);
  }
}
