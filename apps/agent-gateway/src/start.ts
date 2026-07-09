import type { AgentTask } from "@high-bar/core";
import { PayoutPolicyEngine } from "@high-bar/payments";
import { Gateway } from "./gateway";
import { GatewayPolicyEngine } from "./policy";
import { GatewayScheduler } from "./scheduler";
import { HermesRuntime } from "./runtimes/hermes";
import {
  AllowlistEligibilityPort,
  FixedPayoutTotals,
  InMemoryApprovalQueue,
  InMemoryAuditSink,
  RecordingExecutors,
} from "./fakes";

/**
 * Dev entrypoint: wires fully in-memory fakes and runs ONE real autonomous
 * cycle, then prints the audit feed. No API keys, no database, no network — the
 * HermesRuntime transparently degrades to the deterministic research pipeline.
 *
 *   node dist/start.js
 */
async function main(): Promise<void> {
  const audit = new InMemoryAuditSink();
  const approvalQueue = new InMemoryApprovalQueue();
  const executors = new RecordingExecutors();

  // One vetted, KYC'd expert is on the payout allowlist; everyone else is denied.
  const eligibility = new AllowlistEligibilityPort().allowExpert("expert_demo");
  const totals = new FixedPayoutTotals(0);

  const payoutPolicy = new PayoutPolicyEngine({
    eligibility,
    totals,
    config: () => ({
      approvalThresholdCents: 50_000,
      dailyCapCents: 500_000,
      killSwitch: false,
    }),
  });

  const policy = new GatewayPolicyEngine({ payoutPolicy });

  // Hermes if a model is configured; otherwise it falls back to deterministic.
  const runtime = new HermesRuntime();

  const gateway = new Gateway({ runtime, policy, executors, approvalQueue, audit });

  let seq = 0;
  const taskFactory = (): AgentTask => {
    seq += 1;
    return { id: `cycle-${seq}`, kind: "lead_discovery", input: {} };
  };

  const scheduler = new GatewayScheduler({ gateway, taskFactory, audit });

  // Demo: a single unattended cycle. Swap for scheduler.runLoop(intervalMs) to run forever.
  const summary = await scheduler.runOnce();

  console.log("=== Cycle summary ===");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\n=== Executed side effects ===");
  console.log(`leads persisted:   ${executors.persistedLeads.length}`);
  console.log(`outreach drafted:  ${executors.draftedOutreach.length}`);
  console.log(`payouts created:   ${executors.payouts.length}`);

  console.log("\n=== Approval queue (human-gated, NOT executed) ===");
  for (const item of approvalQueue.items) {
    console.log(`- ${item.action.type}: ${item.decision.reason}`);
  }

  console.log("\n=== Audit feed ===");
  for (const entry of audit.entries) {
    console.log(
      `[${entry.actorType}] ${entry.action} -> ${entry.decision}` +
        (entry.reason !== undefined && entry.reason !== null ? ` (${entry.reason})` : ""),
    );
  }
}

main().catch((err: unknown) => {
  console.error("Fatal:", err);
  process.exitCode = 1;
});
