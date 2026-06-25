import type { AgentRuntime, AgentTask, ProposedAction } from "@high-bar/core";
import { AgentTaskResult } from "@high-bar/core";
import type { LeadCriteria, LeadSource, OutreachContext } from "@high-bar/research";
import { SampleLeadSource, planResearchActions } from "@high-bar/research";

export interface DeterministicRuntimeOptions {
  /** Lead discovery backend. Defaults to the deterministic in-memory sample source. */
  leadSource?: LeadSource;
  /** What kind of lead we're hunting and how to score it. */
  criteria?: LeadCriteria;
  /** Qualification threshold (0–100). Leads at/above this also get an outreach draft proposed. */
  threshold?: number;
  /** Personalisation context for draft outreach copy. */
  outreach?: OutreachContext;
}

const DEFAULT_CRITERIA: LeadCriteria = {
  kind: "expert_candidate",
  domains: [],
  keywords: ["typescript", "machine learning", "leadership", "underwriting", "finance"],
};

const DEFAULT_OUTREACH: OutreachContext = {
  senderName: "The High Bar Network",
  company: "High Bar",
  valueProp: "We connect vetted experts with paid, high-signal questions.",
  channel: "email",
};

const DEFAULT_THRESHOLD = 50;

/**
 * The default, always-available runtime. ZERO external calls and NO API keys
 * required: it drives the deterministic `@high-bar/research` pipeline so the
 * autonomous loop (and the demo) keeps working even with no model configured.
 *
 * Output is structurally guaranteed by `AgentTaskResult.parse`, so downstream
 * code only ever sees validated `ProposedAction`s.
 */
export class DeterministicRuntime implements AgentRuntime {
  private readonly leadSource: LeadSource;
  private readonly criteria: LeadCriteria;
  private readonly threshold: number;
  private readonly outreach: OutreachContext;

  constructor(options: DeterministicRuntimeOptions = {}) {
    this.leadSource = options.leadSource ?? new SampleLeadSource();
    this.criteria = options.criteria ?? DEFAULT_CRITERIA;
    this.threshold = options.threshold ?? this.criteria.minScore ?? DEFAULT_THRESHOLD;
    this.outreach = options.outreach ?? DEFAULT_OUTREACH;
  }

  async runTask(task: AgentTask): Promise<AgentTaskResult> {
    const leads = await this.leadSource.discover(this.criteria);
    const actions: ProposedAction[] = planResearchActions(
      leads,
      this.criteria,
      this.threshold,
      this.outreach,
    );

    const upserts = actions.filter((a) => a.type === "lead.upsert").length;
    const drafts = actions.filter((a) => a.type === "outreach.draft").length;
    const summary =
      `[${task.kind}] Discovered ${leads.length} lead(s) via "${this.leadSource.name}"; ` +
      `proposing ${upserts} upsert(s) and ${drafts} outreach draft(s) ` +
      `(threshold ${this.threshold}).`;

    return AgentTaskResult.parse({
      taskId: task.id,
      summary,
      proposedActions: actions,
    });
  }
}
