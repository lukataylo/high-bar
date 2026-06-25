import type { AuditEntry } from "@high-bar/core";
import type {
  ExpertEligibility,
  ExpertEligibilityPort,
  PayoutTotalsPort,
} from "@high-bar/payments";
import type {
  ApprovalItem,
  ApprovalQueue,
  AuditSink,
  ExecutorPorts,
  ExpertSuspendAction,
  FlagForReReviewAction,
  LeadUpsertAction,
  OutreachDraftAction,
  PayoutCreateAction,
  SlaBreachAlertAction,
} from "./ports";

/** Append-only in-memory audit trail for demo/tests. */
export class InMemoryAuditSink implements AuditSink {
  public readonly entries: AuditEntry[] = [];
  async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

/** In-memory parking lot for allowed-but-human-gated actions. */
export class InMemoryApprovalQueue implements ApprovalQueue {
  public readonly items: ApprovalItem[] = [];
  async enqueue(item: ApprovalItem): Promise<void> {
    this.items.push(item);
  }
}

/** Records executor invocations without performing real side effects. */
export class RecordingExecutors implements ExecutorPorts {
  public readonly persistedLeads: LeadUpsertAction[] = [];
  public readonly draftedOutreach: OutreachDraftAction[] = [];
  public readonly payouts: PayoutCreateAction[] = [];
  public readonly reReviewFlags: FlagForReReviewAction[] = [];
  public readonly suspendedExperts: ExpertSuspendAction[] = [];
  public readonly slaAlerts: SlaBreachAlertAction[] = [];

  async persistLead(action: LeadUpsertAction): Promise<void> {
    this.persistedLeads.push(action);
  }
  async enqueueOutreachDraft(action: OutreachDraftAction): Promise<void> {
    this.draftedOutreach.push(action);
  }
  async createPayout(action: PayoutCreateAction): Promise<void> {
    this.payouts.push(action);
  }
  async flagForReReview(action: FlagForReReviewAction): Promise<void> {
    this.reReviewFlags.push(action);
  }
  async suspendExpert(action: ExpertSuspendAction): Promise<void> {
    // Should never be reached under the default policy (always human-gated).
    this.suspendedExperts.push(action);
  }
  async emitSlaAlert(action: SlaBreachAlertAction): Promise<void> {
    this.slaAlerts.push(action);
  }
}

/**
 * Allowlist-backed eligibility port. ONLY experts explicitly added here are
 * eligible — everyone else (including injected "attacker" expert ids) returns
 * null, so the payout policy fails closed.
 */
export class AllowlistEligibilityPort implements ExpertEligibilityPort {
  private readonly allow = new Map<string, ExpertEligibility>();

  allowExpert(expertId: string, eligibility?: Partial<ExpertEligibility>): this {
    this.allow.set(expertId, {
      status: eligibility?.status ?? "vetted",
      kycStatus: eligibility?.kycStatus ?? "verified",
      stripeConnectAccountId: eligibility?.stripeConnectAccountId ?? `acct_${expertId}`,
    });
    return this;
  }

  async getEligibility(expertId: string): Promise<ExpertEligibility | null> {
    return this.allow.get(expertId) ?? null;
  }
}

/** Fixed daily-total port. */
export class FixedPayoutTotals implements PayoutTotalsPort {
  constructor(private readonly cents: number = 0) {}
  async sentTodayCents(): Promise<number> {
    return this.cents;
  }
}
