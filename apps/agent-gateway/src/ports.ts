import type { AuditEntry, ProposedAction, PolicyDecision } from "@high-bar/core";

/**
 * Side-effect surface the gateway is allowed to touch. Each method maps to one
 * proposed-action variant. The runtime can only PROPOSE; only the gateway (after
 * a policy ALLOW with no human-approval gate) ever calls these. Implementations
 * live outside this package (db-backed in prod, in-memory fakes in tests/demo).
 */
export type LeadUpsertAction = Extract<ProposedAction, { type: "lead.upsert" }>;
export type OutreachDraftAction = Extract<ProposedAction, { type: "outreach.draft" }>;
export type PayoutCreateAction = Extract<ProposedAction, { type: "payout.create" }>;
export type FlagForReReviewAction = Extract<ProposedAction, { type: "flag_for_re_review" }>;
export type ExpertSuspendAction = Extract<ProposedAction, { type: "expert_suspend" }>;
export type SlaBreachAlertAction = Extract<ProposedAction, { type: "sla_breach_alert" }>;

export interface ExecutorPorts {
  /** Persist a discovered lead. */
  persistLead(action: LeadUpsertAction): Promise<void>;
  /**
   * Materialise an outreach DRAFT (never sends). In the default policy outreach
   * always routes through the approval queue first, so this is only reached if a
   * policy ever auto-approves a draft.
   */
  enqueueOutreachDraft(action: OutreachDraftAction): Promise<void>;
  /** Move money. Only ever invoked after the payout policy ALLOWs with no human gate. */
  createPayout(action: PayoutCreateAction): Promise<void>;
  /** Flag an answer for re-review (low-risk Hermes quality signal). */
  flagForReReview(action: FlagForReReviewAction): Promise<void>;
  /**
   * Suspend an expert. Consequential — the policy ALWAYS human-gates this, so it
   * is routed to the approval queue and this is never reached by the default
   * policy. Present for completeness/symmetry with the other executors.
   */
  suspendExpert(action: ExpertSuspendAction): Promise<void>;
  /** Raise an SLA-breach alert/notification (no money, no outbound comms). */
  emitSlaAlert(action: SlaBreachAlertAction): Promise<void>;
}

/** An action that was ALLOWED but is gated on human approval — parked, never executed. */
export interface ApprovalItem {
  taskId: string;
  action: ProposedAction;
  decision: PolicyDecision;
}

/** Destination for allowed-but-human-gated actions (e.g. every outreach draft). */
export interface ApprovalQueue {
  enqueue(item: ApprovalItem): Promise<void>;
}

/** Append-only audit trail. EVERY proposal, decision and execution is recorded. */
export interface AuditSink {
  record(entry: AuditEntry): Promise<void>;
}

/** Reads environment flags (kill switch). Injectable for testability. */
export type EnvReader = (key: string) => string | undefined;

export const defaultEnvReader: EnvReader = (key) => process.env[key];
