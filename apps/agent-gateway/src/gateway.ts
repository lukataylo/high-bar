import type {
  AgentRuntime,
  AgentTask,
  AuditEntry,
  PolicyDecision,
  PolicyEngine,
  ProposedAction,
} from "@high-bar/core";
import { ProposedAction as ProposedActionSchema } from "@high-bar/core";
import type { ApprovalQueue, AuditSink, EnvReader, ExecutorPorts } from "./ports";
import { defaultEnvReader } from "./ports";

export interface GatewayDeps {
  runtime: AgentRuntime;
  policy: PolicyEngine;
  executors: ExecutorPorts;
  approvalQueue: ApprovalQueue;
  audit: AuditSink;
  /** Reads AGENT_KILL_SWITCH. Defaults to process.env. */
  env?: EnvReader;
}

export interface CycleSummary {
  taskId: string;
  /** True when the kill switch halted the cycle before any work. */
  halted: boolean;
  proposed: number;
  executed: number;
  /** Allowed but routed to the human approval queue (not executed). */
  queued: number;
  denied: number;
  /** Proposals/executions that errored mid-cycle (recorded, never thrown). */
  errors: number;
  /** Human-readable digest for the unattended operator feed. */
  digest: string;
}

/**
 * The hands-off autonomous loop. For each cycle it asks the runtime for
 * proposals, runs every proposal past the policy engine, and ONLY executes
 * what is both allowed and not human-gated. Every proposal, decision and
 * execution is written to the audit sink.
 *
 * Two hard safety properties:
 *  - Kill switch: AGENT_KILL_SWITCH==="true" halts the cycle before any work.
 *  - Fail-closed dispatch: anything not allowed (or that fails to re-validate)
 *    is recorded and skipped; nothing executes without an explicit ALLOW.
 */
export class Gateway {
  private readonly runtime: AgentRuntime;
  private readonly policy: PolicyEngine;
  private readonly executors: ExecutorPorts;
  private readonly approvalQueue: ApprovalQueue;
  private readonly audit: AuditSink;
  private readonly env: EnvReader;

  constructor(deps: GatewayDeps) {
    this.runtime = deps.runtime;
    this.policy = deps.policy;
    this.executors = deps.executors;
    this.approvalQueue = deps.approvalQueue;
    this.audit = deps.audit;
    this.env = deps.env ?? defaultEnvReader;
  }

  async runCycle(task: AgentTask): Promise<CycleSummary> {
    const summary: CycleSummary = {
      taskId: task.id,
      halted: false,
      proposed: 0,
      executed: 0,
      queued: 0,
      denied: 0,
      errors: 0,
      digest: "",
    };

    // 1. Kill switch — halt before doing anything at all.
    if (this.killSwitchEngaged()) {
      summary.halted = true;
      summary.digest = `Cycle for task ${task.id} HALTED: kill switch engaged.`;
      await this.record({
        actorType: "system",
        action: "cycle.halt",
        decision: "denied",
        reason: "AGENT_KILL_SWITCH engaged; cycle halted, nothing executed.",
        resourceType: "agent_task",
        resourceId: task.id,
      });
      return summary;
    }

    // 2. Ask the (untrusted) runtime for proposals. A throw here is contained
    //    so a single bad cycle never crashes the loop.
    let proposals: ProposedAction[];
    let runtimeSummary = "";
    try {
      const result = await this.runtime.runTask(task);
      proposals = result.proposedActions;
      runtimeSummary = result.summary;
    } catch (err) {
      summary.errors += 1;
      summary.digest = `Cycle for task ${task.id} FAILED in runtime: ${errorMessage(err)}`;
      await this.record({
        actorType: "system",
        action: "cycle.error",
        decision: "denied",
        reason: `Runtime threw: ${errorMessage(err)}`,
        resourceType: "agent_task",
        resourceId: task.id,
      });
      return summary;
    }

    // 3. Evaluate + dispatch each proposal independently.
    for (const candidate of proposals) {
      await this.handleProposal(task, candidate, summary);
    }

    summary.digest =
      `${runtimeSummary} | Executed ${summary.executed}, queued ${summary.queued}, ` +
      `denied ${summary.denied}, errors ${summary.errors}.`;
    return summary;
  }

  private async handleProposal(
    task: AgentTask,
    candidate: ProposedAction,
    summary: CycleSummary,
  ): Promise<void> {
    // Re-validate the proposal shape — never trust runtime output structurally.
    const parsed = ProposedActionSchema.safeParse(candidate);
    if (!parsed.success) {
      summary.denied += 1;
      await this.record({
        actorType: "agent",
        action: "unknown.action",
        decision: "denied",
        reason: `Malformed proposal rejected: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        resourceType: "agent_task",
        resourceId: task.id,
        payload: candidate,
      });
      return;
    }
    const action = parsed.data;
    summary.proposed += 1;

    await this.record({
      actorType: "agent",
      action: action.type,
      decision: "proposed",
      reason: "Runtime proposed action (not yet authorized).",
      resourceType: resourceTypeFor(action),
      resourceId: resourceIdFor(action),
      payload: action,
    });

    // Policy is the single authority. A throw is contained per-proposal.
    let decision: PolicyDecision;
    try {
      decision = await this.policy.evaluate(action);
    } catch (err) {
      summary.errors += 1;
      await this.record({
        actorType: "system",
        action: action.type,
        decision: "denied",
        reason: `Policy evaluation failed (fail-closed): ${errorMessage(err)}`,
        resourceType: resourceTypeFor(action),
        resourceId: resourceIdFor(action),
        payload: action,
      });
      return;
    }

    await this.record({
      actorType: "system",
      action: action.type,
      decision: decision.allowed ? "allowed" : "denied",
      reason: decision.reason,
      resourceType: resourceTypeFor(action),
      resourceId: resourceIdFor(action),
      payload: action,
    });

    if (!decision.allowed) {
      summary.denied += 1;
      return;
    }

    if (decision.requiresHumanApproval) {
      // Park it — do NOT execute. The human reviews and acts out-of-band.
      summary.queued += 1;
      await this.approvalQueue.enqueue({ taskId: task.id, action, decision });
      await this.record({
        actorType: "system",
        action: action.type,
        decision: "allowed",
        reason: "Allowed but human-gated; routed to approval queue (NOT executed).",
        resourceType: resourceTypeFor(action),
        resourceId: resourceIdFor(action),
        payload: action,
      });
      return;
    }

    // Allowed and ungated — execute. Contain any executor error.
    try {
      await this.execute(action);
      summary.executed += 1;
      await this.record({
        actorType: "system",
        action: action.type,
        decision: "executed",
        reason: "Executed by gateway after policy ALLOW.",
        resourceType: resourceTypeFor(action),
        resourceId: resourceIdFor(action),
        payload: action,
      });
    } catch (err) {
      summary.errors += 1;
      await this.record({
        actorType: "system",
        action: action.type,
        decision: "denied",
        reason: `Execution failed: ${errorMessage(err)}`,
        resourceType: resourceTypeFor(action),
        resourceId: resourceIdFor(action),
        payload: action,
      });
    }
  }

  private async execute(action: ProposedAction): Promise<void> {
    switch (action.type) {
      case "lead.upsert":
        await this.executors.persistLead(action);
        return;
      case "outreach.draft":
        await this.executors.enqueueOutreachDraft(action);
        return;
      case "payout.create":
        await this.executors.createPayout(action);
        return;
      default:
        // Unreachable for valid contract input; fail-closed regardless.
        throw new Error("No executor for action type.");
    }
  }

  private killSwitchEngaged(): boolean {
    return this.env("AGENT_KILL_SWITCH") === "true";
  }

  private async record(entry: AuditEntry): Promise<void> {
    await this.audit.record(entry);
  }
}

function resourceTypeFor(action: ProposedAction): string {
  switch (action.type) {
    case "lead.upsert":
      return "lead";
    case "outreach.draft":
      return "outreach";
    case "payout.create":
      return "payout";
    default:
      return "unknown";
  }
}

function resourceIdFor(action: ProposedAction): string | null {
  switch (action.type) {
    case "lead.upsert":
      return action.name;
    case "outreach.draft":
      return action.leadId;
    case "payout.create":
      return action.answerId;
    default:
      return null;
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
