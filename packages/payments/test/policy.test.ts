import { describe, it, expect } from "vitest";
import type { ProposedAction } from "@high-bar/core";
import {
  PayoutPolicyEngine,
  type ExpertEligibility,
  type ExpertEligibilityPort,
  type PayoutTotalsPort,
  type GuardrailConfig,
} from "../src/index";

const ELIGIBLE: ExpertEligibility = {
  status: "vetted",
  kycStatus: "verified",
  stripeConnectAccountId: "acct_123",
};

function eligibilityPort(value: ExpertEligibility | null): ExpertEligibilityPort {
  return { getEligibility: async () => value };
}

function totalsPort(sentTodayCents: number): PayoutTotalsPort {
  return { sentTodayCents: async () => sentTodayCents };
}

function config(overrides: Partial<GuardrailConfig> = {}): () => GuardrailConfig {
  return () => ({
    approvalThresholdCents: 100_00,
    dailyCapCents: 1000_00,
    killSwitch: false,
    ...overrides,
  });
}

function payout(amountCents: number): ProposedAction {
  return { type: "payout.create", answerId: "ans_1", expertId: "exp_1", amountCents };
}

function makeEngine(opts: {
  eligibility?: ExpertEligibility | null;
  sentTodayCents?: number;
  config?: Partial<GuardrailConfig>;
}): PayoutPolicyEngine {
  return new PayoutPolicyEngine({
    eligibility: eligibilityPort(opts.eligibility === undefined ? ELIGIBLE : opts.eligibility),
    totals: totalsPort(opts.sentTodayCents ?? 0),
    config: config(opts.config),
  });
}

describe("PayoutPolicyEngine", () => {
  it("denies when the kill switch is engaged", async () => {
    const engine = makeEngine({ config: { killSwitch: true } });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.requiresHumanApproval).toBe(false);
    expect(decision.reason).toMatch(/kill switch/i);
  });

  it("denies non-payout actions (default-deny)", async () => {
    const engine = makeEngine({});
    const action: ProposedAction = {
      type: "outreach.draft",
      leadId: "lead_1",
      channel: "email",
      body: "hi",
    };
    const decision = await engine.evaluate(action);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/only evaluates payout\.create/i);
  });

  it("denies when the expert is not found", async () => {
    const engine = makeEngine({ eligibility: null });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/not found/i);
  });

  it("denies when the expert is not vetted", async () => {
    const engine = makeEngine({ eligibility: { ...ELIGIBLE, status: "pending" } });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/not vetted/i);
  });

  it("denies when KYC is not verified", async () => {
    const engine = makeEngine({ eligibility: { ...ELIGIBLE, kycStatus: "pending" } });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/kyc/i);
  });

  it("denies when there is no connected payout account", async () => {
    const engine = makeEngine({ eligibility: { ...ELIGIBLE, stripeConnectAccountId: null } });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/no connected payout account/i);
  });

  it("denies when the daily cap would be exceeded", async () => {
    const engine = makeEngine({
      sentTodayCents: 990_00,
      config: { dailyCapCents: 1000_00 },
    });
    const decision = await engine.evaluate(payout(20_00));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/daily payout cap exceeded/i);
  });

  it("allows when the running total exactly equals the cap", async () => {
    const engine = makeEngine({
      sentTodayCents: 980_00,
      config: { dailyCapCents: 1000_00, approvalThresholdCents: 100_00 },
    });
    const decision = await engine.evaluate(payout(20_00));
    expect(decision.allowed).toBe(true);
    expect(decision.requiresHumanApproval).toBe(false);
  });

  it("allows but requires human approval over the threshold", async () => {
    const engine = makeEngine({ config: { approvalThresholdCents: 100_00 } });
    const decision = await engine.evaluate(payout(150_00));
    expect(decision.allowed).toBe(true);
    expect(decision.requiresHumanApproval).toBe(true);
    expect(decision.reason).toMatch(/human approval required/i);
  });

  it("auto-approves within all limits", async () => {
    const engine = makeEngine({ config: { approvalThresholdCents: 100_00 } });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(true);
    expect(decision.requiresHumanApproval).toBe(false);
    expect(decision.reason).toMatch(/auto-approved/i);
  });
});

describe("PayoutPolicyEngine — fail-closed on port failure", () => {
  it("DENIES (never allows) when the eligibility store throws", async () => {
    const engine = new PayoutPolicyEngine({
      eligibility: {
        getEligibility: async () => {
          throw new Error("connection refused: postgres://user:secret@db:5432");
        },
      },
      totals: totalsPort(0),
      config: config(),
    });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.requiresHumanApproval).toBe(false);
    expect(decision.reason).toBe("fail-closed: eligibility store unavailable");
    // The underlying error (which carries a connection string) must NOT leak.
    expect(decision.reason).not.toMatch(/secret|postgres|connection/i);
  });

  it("DENIES (never allows) when the totals store throws (sentTodayCents)", async () => {
    const engine = new PayoutPolicyEngine({
      eligibility: eligibilityPort(ELIGIBLE),
      totals: {
        sentTodayCents: async () => {
          throw new Error("redis timeout 10.0.0.5");
        },
      },
      config: config(),
    });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.requiresHumanApproval).toBe(false);
    expect(decision.reason).toBe("fail-closed: totals store unavailable");
    expect(decision.reason).not.toMatch(/redis|10\.0\.0/i);
  });

  it("DENIES when the atomic reserveDailyAmount throws", async () => {
    const engine = new PayoutPolicyEngine({
      eligibility: eligibilityPort(ELIGIBLE),
      totals: {
        sentTodayCents: async () => 0,
        reserveDailyAmount: async () => {
          throw new Error("deadlock detected");
        },
      },
      config: config(),
    });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("fail-closed: totals store unavailable");
  });
});

describe("PayoutPolicyEngine — deny-by-default", () => {
  it("denies an unknown/unsupported action type", async () => {
    const engine = makeEngine({});
    // Simulate a future/unknown action the engine has no rule for.
    const unknownAction = { type: "wire.transfer", amountCents: 10_00 } as unknown as ProposedAction;
    const decision = await engine.evaluate(unknownAction);
    expect(decision.allowed).toBe(false);
    expect(decision.requiresHumanApproval).toBe(false);
  });

  it("denies a suspended expert (status not vetted)", async () => {
    const engine = makeEngine({ eligibility: { ...ELIGIBLE, status: "suspended" } });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
  });

  it("denies when the connected account id is blank whitespace", async () => {
    const engine = makeEngine({ eligibility: { ...ELIGIBLE, stripeConnectAccountId: "   " } });
    const decision = await engine.evaluate(payout(50_00));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/no connected payout account/i);
  });
});

describe("PayoutPolicyEngine — daily-cap concurrency via atomic reserve", () => {
  /**
   * Stateful fake of an ATOMIC reserveDailyAmount: it only advances the running
   * total when the amount fits under the cap, exactly as a DB-level
   * `UPDATE ... WHERE total + :amt <= :cap` would. This models the apps/api
   * contract and lets us assert the cap can never be busted.
   */
  function reservingTotalsPort(start: number): PayoutTotalsPort & { runningTotal: () => number } {
    let total = start;
    return {
      sentTodayCents: async () => total,
      runningTotal: () => total,
      reserveDailyAmount: async (amountCents: number, dailyCapCents: number) => {
        if (total + amountCents > dailyCapCents) {
          return { reserved: false, sentTodayCents: total };
        }
        total += amountCents;
        return { reserved: true, sentTodayCents: total };
      },
    };
  }

  it("denies the second of two near-simultaneous payouts once the cap is reached", async () => {
    const totals = reservingTotalsPort(0);
    const engine = new PayoutPolicyEngine({
      eligibility: eligibilityPort(ELIGIBLE),
      totals,
      // Cap fits exactly one 60_00 payout; a second would bust it.
      config: config({ dailyCapCents: 100_00, approvalThresholdCents: 100_00 }),
    });

    const first = await engine.evaluate(payout(60_00));
    const second = await engine.evaluate(payout(60_00));

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.reason).toMatch(/daily payout cap exceeded/i);
    // The atomic reserve never advanced the total past the cap.
    expect(totals.runningTotal()).toBe(60_00);
    expect(totals.runningTotal()).toBeLessThanOrEqual(100_00);
  });
});
