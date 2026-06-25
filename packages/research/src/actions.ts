import type { ProposedAction } from "@high-bar/core";
import { buildOutreachDraft, type OutreachDraft } from "./outreach";
import { qualify, scoreLead } from "./qualify";
import type { DiscoveredLead, LeadCriteria, OutreachContext } from "./types";

type LeadUpsertAction = Extract<ProposedAction, { type: "lead.upsert" }>;
type OutreachDraftAction = Extract<ProposedAction, { type: "outreach.draft" }>;

/**
 * Build a `lead.upsert` proposal. The shape structurally satisfies the core
 * contract variant exactly: `{ type, kind, name, profileUrl?, score }`.
 * `score` is assumed to already be a clamped integer 0–100 (see {@link scoreLead}).
 */
export function proposeLeadUpsert(
  lead: DiscoveredLead,
  score: number
): LeadUpsertAction {
  const action: LeadUpsertAction = {
    type: "lead.upsert",
    kind: lead.kind,
    name: lead.name,
    score,
  };
  if (lead.profileUrl !== undefined) {
    action.profileUrl = lead.profileUrl;
  }
  return action;
}

/** Build an `outreach.draft` proposal for an already-persisted lead id. */
export function proposeOutreachDraft(
  leadId: string,
  draft: OutreachDraft
): OutreachDraftAction {
  return {
    type: "outreach.draft",
    leadId,
    channel: draft.channel,
    body: draft.body,
  };
}

/**
 * Deterministic slug used as a synthetic lead id for draft proposals. Real ids
 * are assigned on persist; this lets us propose an outreach draft alongside the
 * upsert in a single planning pass without a round-trip to the database.
 */
export function leadSlug(lead: DiscoveredLead): string {
  const base = lead.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeBase = base.length === 0 ? "lead" : base;
  return `${lead.source}:${safeBase}`;
}

/**
 * Plan the set of side-effecting actions to PROPOSE for a batch of discovered
 * leads. For every lead we propose a `lead.upsert`; for leads that clear the
 * threshold we additionally propose an `outreach.draft`. Nothing is executed —
 * the gateway policy engine decides what (if anything) runs.
 */
export function planResearchActions(
  leads: DiscoveredLead[],
  criteria: LeadCriteria,
  threshold: number,
  context: OutreachContext
): ProposedAction[] {
  const actions: ProposedAction[] = [];

  for (const lead of leads) {
    const score = scoreLead(lead, criteria);
    actions.push(proposeLeadUpsert(lead, score));

    if (qualify(lead, criteria, threshold) === "qualified") {
      const draft = buildOutreachDraft(lead, context);
      actions.push(proposeOutreachDraft(leadSlug(lead), draft));
    }
  }

  return actions;
}
