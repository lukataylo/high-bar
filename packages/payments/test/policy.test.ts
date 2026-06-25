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
