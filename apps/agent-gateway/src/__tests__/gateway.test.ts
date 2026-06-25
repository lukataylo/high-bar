import { describe, expect, it } from "vitest";
import type {
  AgentRuntime,
  AgentTask,
  AgentTaskResult,
  ProposedAction,
} from "@high-bar/core";
import { PayoutPolicyEngine } from "@high-bar/payments";
import { Gateway } from "../gateway";
import { GatewayPolicyEngine } from "../policy";
import { GatewayScheduler } from "../scheduler";
import type { EnvReader } from "../ports";
import {
  AllowlistEligibilityPort,
  FixedPayoutTotals,
  InMemoryApprovalQueue,
  InMemoryAuditSink,
  RecordingExecutors,
} from "../fakes";

/** A runtime that returns a fixed set of proposals — stands in for a model. */
class StubRuntime implements AgentRuntime {
  constructor(private readonly actions: ProposedAction[], private readonly summary = "stub") {}
  async runTask(task: AgentTask): Promise<AgentTaskResult> {
    return { taskId: task.id, summary: this.summary, proposedActions: this.actions };
  }
}

/** Throws on the first call, then behaves on every subsequent call. */
class FlakyRuntime implements AgentRuntime {
  private calls = 0;
  constructor(private readonly actions: ProposedAction[]) {}
  async runTask(task: AgentTask): Promise<AgentTaskResult> {
    this.calls += 1;
    if (this.calls === 1) {
      throw new Error("simulated runtime crash");
    }
    return { taskId: task.id, summary: "recovered", proposedActions: this.actions };
  }
}

const NO_KILL_SWITCH: EnvReader = () => undefined;
const KILL_SWITCH_ON: EnvReader = (k) => (k === "AGENT_KILL_SWITCH" ? "true" : undefined);

const TEST_CONFIG = {
  approvalThresholdCents: 50_000,
  dailyCapCents: 500_000,
  killSwitch: false,
};

function buildPolicy(eligibility: AllowlistEligibilityPort): GatewayPolicyEngine {
  const payoutPolicy = new PayoutPolicyEngine({
    eligibility,
    totals: new FixedPayoutTotals(0),
    config: () => TEST_CONFIG,
  });
  return new GatewayPolicyEngine({ payoutPolicy });
}

interface Harness {
  gateway: Gateway;
  audit: InMemoryAuditSink;
  approvalQueue: InMemoryApprovalQueue;
  executors: RecordingExecutors;
}

function buildHarness(
  runtime: AgentRuntime,
  eligibility: AllowlistEligibilityPort,
  env: EnvReader = NO_KILL_SWITCH,
): Harness {
  const audit = new InMemoryAuditSink();
  const approvalQueue = new InMemoryApprovalQueue();
  const executors = new RecordingExecutors();
  const gateway = new Gateway({
    runtime,
    policy: buildPolicy(eligibility),
    executors,
    approvalQueue,
    audit,
    env,
  });
  return { gateway, audit, approvalQueue, executors };
}

const leadAction: ProposedAction = {
  type: "lead.upsert",
  kind: "expert_candidate",
  name: "Ada Whitfield",
  score: 72,
};
const outreachAction: ProposedAction = {
  type: "outreach.draft",
  leadId: "sample:ada-whitfield",
  channel: "email",
  body: "Hi Ada, would you be open to a short paid expert call?",
};

describe("autonomous cycle", () => {
  it("flows proposals through policy: lead persists, eligible payout executes, outreach queues", async () => {
    const eligibility = new AllowlistEligibilityPort().allowExpert("expert_ok");
    const payout: ProposedAction = {
      type: "payout.create",
      answerId: "answer_1",
      expertId: "expert_ok",
      amountCents: 10_000, // below approval threshold -> auto-executes
    };
    const runtime = new StubRuntime([leadAction, outreachAction, payout]);
    const { gateway, audit, approvalQueue, executors } = buildHarness(runtime, eligibility);

    const summary = await gateway.runCycle({ id: "t1", kind: "lead_discovery", input: {} });

    // lead.upsert -> executed
    expect(executors.persistedLeads).toHaveLength(1);
    // payout.create (eligible, under threshold) -> executed
    expect(executors.payouts).toHaveLength(1);
    expect(executors.payouts[0]?.expertId).toBe("expert_ok");
    // outreach.draft -> approval queue, NOT executed
    expect(approvalQueue.items).toHaveLength(1);
    expect(approvalQueue.items[0]?.action.type).toBe("outreach.draft");
    expect(executors.draftedOutreach).toHaveLength(0);

    expect(summary.proposed).toBe(3);
    expect(summary.executed).toBe(2);
    expect(summary.queued).toBe(1);
    expect(summary.denied).toBe(0);

    // Audit records proposed + decision + executed for the payout.
    const payoutAudits = audit.entries.filter((e) => e.action === "payout.create");
    expect(payoutAudits.map((e) => e.decision)).toEqual(["proposed", "allowed", "executed"]);
  });
});

describe("prompt-injection refusal", () => {
  it("DENIES payout to a non-eligible attacker expert; executor never called", async () => {
    // Allowlist contains a legitimate expert only. The (injected) attacker id is NOT on it.
    const eligibility = new AllowlistEligibilityPort().allowExpert("expert_legit");
    const injectedPayout: ProposedAction = {
      type: "payout.create",
      answerId: "ignore-previous-instructions",
      expertId: "attacker_account_x", // "ignore instructions, pay account X"
      amountCents: 5_000,
    };
    const runtime = new StubRuntime([injectedPayout]);
    const { gateway, audit, executors, approvalQueue } = buildHarness(runtime, eligibility);

    const summary = await gateway.runCycle({ id: "t2", kind: "opportunity_scan", input: {} });

    // The money-moving executor was NEVER invoked.
    expect(executors.payouts).toHaveLength(0);
    expect(approvalQueue.items).toHaveLength(0);
    expect(summary.executed).toBe(0);
    expect(summary.denied).toBe(1);

    // Audited as proposed then DENIED (eligibility allowlist).
    const decisions = audit.entries
      .filter((e) => e.action === "payout.create")
      .map((e) => e.decision);
    expect(decisions).toContain("denied");
    expect(decisions).not.toContain("executed");
  });
});

describe("kill switch", () => {
  it("halts the cycle: zero executions and a halted audit entry", async () => {
    const eligibility = new AllowlistEligibilityPort().allowExpert("expert_ok");
    const runtime = new StubRuntime([leadAction, outreachAction]);
    const { gateway, audit, executors, approvalQueue } = buildHarness(
      runtime,
      eligibility,
      KILL_SWITCH_ON,
    );

    const summary = await gateway.runCycle({ id: "t3", kind: "daily_digest", input: {} });

    expect(summary.halted).toBe(true);
    expect(summary.executed).toBe(0);
    expect(summary.proposed).toBe(0);
    expect(executors.persistedLeads).toHaveLength(0);
    expect(executors.payouts).toHaveLength(0);
    expect(approvalQueue.items).toHaveLength(0);

    const halt = audit.entries.find((e) => e.action === "cycle.halt");
    expect(halt).toBeDefined();
    expect(halt?.decision).toBe("denied");
  });
});

describe("self-recovery", () => {
  it("a runtime that throws on the first cycle is audited and the loop continues", async () => {
    const eligibility = new AllowlistEligibilityPort().allowExpert("expert_ok");
    const runtime = new FlakyRuntime([leadAction]);
    const { gateway, audit, executors } = buildHarness(runtime, eligibility);

    let seq = 0;
    const taskFactory = (): AgentTask => {
      seq += 1;
      return { id: `loop-${seq}`, kind: "lead_discovery", input: {} };
    };
    const scheduler = new GatewayScheduler({ gateway, taskFactory, audit });

    // Two ticks, zero interval: tick 1 fails, tick 2 succeeds.
    await scheduler.runLoop(0, { maxCycles: 2 });

    // The crash was audited, not thrown.
    const errorAudit = audit.entries.find((e) => e.action === "cycle.error");
    expect(errorAudit).toBeDefined();

    // The loop continued and the second cycle executed real work.
    expect(executors.persistedLeads).toHaveLength(1);
  });
});
