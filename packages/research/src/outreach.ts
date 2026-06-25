import type { OutreachChannel } from "@high-bar/core";
import type { DiscoveredLead, OutreachContext } from "./types";

export interface OutreachDraft {
  channel: OutreachChannel;
  body: string;
}

function firstName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "there";
  }
  const parts = trimmed.split(/\s+/);
  const first = parts[0];
  return first === undefined || first.length === 0 ? "there" : first;
}

/**
 * Build a deterministic, personalised outreach DRAFT for a discovered lead.
 *
 * DRAFT ONLY: this function never sends anything. The returned body is handed to
 * the gateway's policy engine as an `outreach.draft` proposal; a human approves
 * and sends manually. Tone mirrors `apps/web/lib/agent.ts#buildOutreachDraft`:
 * a first-name greeting, a paid-call ask, and an explicit promise to share scope
 * before anything is scheduled.
 */
export function buildOutreachDraft(
  lead: DiscoveredLead,
  context: OutreachContext
): OutreachDraft {
  const channel: OutreachChannel = context.channel ?? "email";
  const greetingName = firstName(lead.name);

  const relevance =
    lead.headline !== undefined && lead.headline.length > 0
      ? `Your work as ${lead.headline}`
      : "Your background";
  const atCompany =
    lead.company !== undefined && lead.company.length > 0 ? ` at ${lead.company}` : "";

  const callToAction =
    context.callToAction !== undefined && context.callToAction.length > 0
      ? context.callToAction
      : "Would you be open to a short paid expert call?";

  const body = `Hi ${greetingName}, I'm ${context.senderName} from ${context.company}. ${relevance}${atCompany} looks especially relevant for what we're working on. ${context.valueProp} ${callToAction} I can share scope and rate before anything is scheduled.`;

  return { channel, body };
}
