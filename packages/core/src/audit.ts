import { z } from "zod";
import { ActorType, ActionDecision } from "./domain/enums";

/**
 * Canonical shape for an audit entry. EVERY agent-proposed action with a side
 * effect must be recorded: first as `proposed`, then `allowed`/`denied` by the
 * policy engine, then `executed` once carried out. This is the tamper-evident
 * trail the security model depends on.
 */
export const AuditEntry = z.object({
  actorType: ActorType,
  actorId: z.string().nullable().optional(),
  action: z.string(), // e.g. "payout.create", "outreach.draft", "question.capture"
  resourceType: z.string().nullable().optional(),
  resourceId: z.string().nullable().optional(),
  decision: ActionDecision,
  reason: z.string().nullable().optional(),
  payload: z.unknown().optional(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;
