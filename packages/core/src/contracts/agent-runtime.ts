import { z } from "zod";

/**
 * Abstraction over the agent loop. Hermes (Nous) is the default implementation,
 * but the gateway depends only on this interface so the loop provider is
 * swappable. CRITICAL: the runtime can only *propose* side-effecting actions —
 * the gateway's PolicyEngine decides what actually executes. Untrusted content
 * (questions, scraped lead data) is data, never authorization input.
 */

export const AgentTask = z.object({
  id: z.string(),
  kind: z.enum([
    "lead_discovery",
    "lead_qualification",
    "opportunity_scan",
    "daily_digest",
    // Hermes quality/health supervision: surfaces issues through the SAME
    // propose->authorize policy gate so a human/policy decides consequences.
    "answer_quality_review",
    "network_health_scan",
  ]),
  input: z.record(z.unknown()).default({}),
});
export type AgentTask = z.infer<typeof AgentTask>;

/** Side-effecting actions the agent may propose. Each maps to a policy rule. */
export const ProposedAction = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("outreach.draft"),
    leadId: z.string(),
    channel: z.enum(["linkedin", "email"]),
    body: z.string(),
  }),
  z.object({
    type: z.literal("payout.create"),
    answerId: z.string(),
    expertId: z.string(),
    amountCents: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("lead.upsert"),
    kind: z.enum(["expert_candidate", "customer_candidate"]),
    name: z.string(),
    profileUrl: z.string().optional(),
    score: z.number().int().min(0).max(100),
  }),
  // Hermes answer-quality supervision: low-risk, flags an answer for re-review.
  z.object({
    type: z.literal("flag_for_re_review"),
    answerId: z.string(),
    reason: z.string(),
  }),
  // Hermes answer-quality supervision: consequential — suspending an expert
  // must NEVER auto-execute; policy always routes this to human approval.
  z.object({
    type: z.literal("expert_suspend"),
    expertId: z.string(),
    reason: z.string(),
  }),
  // Hermes network-health supervision: raises an SLA-breach alert/notification.
  z.object({
    type: z.literal("sla_breach_alert"),
    questionId: z.string(),
    detail: z.string(),
  }),
]);
export type ProposedAction = z.infer<typeof ProposedAction>;

export const PolicyDecision = z.object({
  allowed: z.boolean(),
  requiresHumanApproval: z.boolean().default(false),
  reason: z.string(),
});
export type PolicyDecision = z.infer<typeof PolicyDecision>;

export const AgentTaskResult = z.object({
  taskId: z.string(),
  summary: z.string(),
  proposedActions: z.array(ProposedAction),
});
export type AgentTaskResult = z.infer<typeof AgentTaskResult>;

export interface AgentRuntime {
  /** Run one task through the loop; returns a summary + proposed actions (NOT executed). */
  runTask(task: AgentTask): Promise<AgentTaskResult>;
}

export interface PolicyEngine {
  /** Authorize a single proposed action. Side effects happen only after `allowed`. */
  evaluate(action: ProposedAction): Promise<PolicyDecision>;
}
