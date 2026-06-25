import type { AgentTask } from "@high-bar/core";
import type { AuditSink } from "./ports";
import type { CycleSummary, Gateway } from "./gateway";

export interface SchedulerDeps {
  gateway: Gateway;
  /** Produces the task for the next cycle (fresh id/time each tick). */
  taskFactory: () => AgentTask;
  /** Audit sink, so loop-level failures are recorded even if a cycle never started. */
  audit: AuditSink;
}

export interface RunLoopOptions {
  /** Stop after this many cycles (for tests/demo). Omit to run indefinitely. */
  maxCycles?: number;
}

/**
 * Drives the gateway unattended. SELF-RECOVERY is the whole point: every tick is
 * wrapped so an error in one cycle is audited and the loop continues on the next
 * tick — the loop never crashes.
 */
export class GatewayScheduler {
  private readonly gateway: Gateway;
  private readonly taskFactory: () => AgentTask;
  private readonly audit: AuditSink;
  private stopped = false;

  constructor(deps: SchedulerDeps) {
    this.gateway = deps.gateway;
    this.taskFactory = deps.taskFactory;
    this.audit = deps.audit;
  }

  /** Run exactly one cycle, fully contained. Returns the summary, or null on a contained failure. */
  async runOnce(): Promise<CycleSummary | null> {
    let task: AgentTask;
    try {
      task = this.taskFactory();
    } catch (err) {
      await this.recordLoopError("scheduler.task_factory", err);
      return null;
    }
    try {
      return await this.gateway.runCycle(task);
    } catch (err) {
      // Defence in depth: runCycle already contains its own errors, but if it
      // ever throws we still audit and keep the loop alive.
      await this.recordLoopError("scheduler.cycle", err, task.id);
      return null;
    }
  }

  /** Request the loop to stop after the current tick. */
  stop(): void {
    this.stopped = true;
  }

  /**
   * Run cycles forever (or `maxCycles` times), sleeping `intervalMs` between
   * ticks. Each tick is self-contained via {@link runOnce}.
   */
  async runLoop(intervalMs: number, options: RunLoopOptions = {}): Promise<void> {
    this.stopped = false;
    let count = 0;
    while (!this.stopped) {
      await this.runOnce();
      count += 1;
      if (options.maxCycles !== undefined && count >= options.maxCycles) {
        break;
      }
      if (!this.stopped && intervalMs > 0) {
        await sleep(intervalMs);
      }
    }
  }

  private async recordLoopError(action: string, err: unknown, taskId?: string): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await this.audit.record({
        actorType: "system",
        action,
        decision: "denied",
        reason: `Loop-level failure (recovered): ${message}`,
        resourceType: "agent_task",
        resourceId: taskId ?? null,
      });
    } catch {
      // Never let auditing failures crash the loop.
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
