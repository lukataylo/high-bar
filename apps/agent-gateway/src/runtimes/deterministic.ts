import type { AgentRuntime, AgentTask, ProposedAction } from "@high-bar/core";
import { AgentTaskResult } from "@high-bar/core";
import { z } from "zod";
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
 * Answer-quality threshold (0-100). Answers scoring below this are flagged for
 * re-review. Inputs are UNTRUSTED data — parsed defensively, never trusted as
 * authorization.
 */
const DEFAULT_QUALITY_THRESHOLD = 60;

/** An expert with this many low-quality answers is proposed for suspension. */
const SUSPEND_REPEAT_THRESHOLD = 3;

/** Untrusted answer-quality review input. Unknown/extra fields are ignored. */
const AnswerQualityInput = z.object({
  answers: z
    .array(
      z.object({
        answerId: z.string(),
        expertId: z.string(),
        qualityScore: z.number(),
      }),
    )
    .default([]),
});

/** Untrusted network-health scan input. Unknown/extra fields are ignored. */
const NetworkHealthInput = z.object({
  questions: z
    .array(
      z.object({
        questionId: z.string(),
        ageHours: z.number(),
        slaHours: z.number(),
      }),
    )
    .default([]),
});

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
    // Hermes supervision tasks read untrusted task.input — never authorization.
    if (task.kind === "answer_quality_review") {
      return this.reviewAnswerQuality(task);
    }
    if (task.kind === "network_health_scan") {
      return this.scanNetworkHealth(task);
    }

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

  /**
   * Hermes answer-quality supervision. Flags low-quality answers for re-review
   * and, for experts with repeated low quality, PROPOSES a suspension (which the
   * policy always human-gates — never auto-suspended).
   */
  private reviewAnswerQuality(task: AgentTask): AgentTaskResult {
    const parsed = AnswerQualityInput.safeParse(task.input);
    const answers = parsed.success ? parsed.data.answers : [];

    const actions: ProposedAction[] = [];
    const lowQualityByExpert = new Map<string, number>();

    for (const answer of answers) {
      if (answer.qualityScore < DEFAULT_QUALITY_THRESHOLD) {
        actions.push({
          type: "flag_for_re_review",
          answerId: answer.answerId,
          reason: `Quality score ${answer.qualityScore} below threshold ${DEFAULT_QUALITY_THRESHOLD}.`,
        });
        lowQualityByExpert.set(
          answer.expertId,
          (lowQualityByExpert.get(answer.expertId) ?? 0) + 1,
        );
      }
    }

    for (const [expertId, count] of lowQualityByExpert) {
      if (count >= SUSPEND_REPEAT_THRESHOLD) {
        actions.push({
          type: "expert_suspend",
          expertId,
          reason: `${count} low-quality answers this cycle (>= ${SUSPEND_REPEAT_THRESHOLD}); proposing suspension for human review.`,
        });
      }
    }

    const flags = actions.filter((a) => a.type === "flag_for_re_review").length;
    const suspends = actions.filter((a) => a.type === "expert_suspend").length;
    const summary =
      `[${task.kind}] Reviewed ${answers.length} answer(s); ` +
      `proposing ${flags} re-review flag(s) and ${suspends} expert suspension(s) ` +
      `(quality threshold ${DEFAULT_QUALITY_THRESHOLD}).`;

    return AgentTaskResult.parse({
      taskId: task.id,
      summary,
      proposedActions: actions,
    });
  }

  /**
   * Hermes network-health supervision. Emits an SLA-breach alert for every
   * question that has exceeded its SLA window.
   */
  private scanNetworkHealth(task: AgentTask): AgentTaskResult {
    const parsed = NetworkHealthInput.safeParse(task.input);
    const questions = parsed.success ? parsed.data.questions : [];

    const actions: ProposedAction[] = [];
    for (const question of questions) {
      if (question.ageHours > question.slaHours) {
        actions.push({
          type: "sla_breach_alert",
          questionId: question.questionId,
          detail: `Open ${question.ageHours}h vs SLA ${question.slaHours}h; breach by ${question.ageHours - question.slaHours}h.`,
        });
      }
    }

    const summary =
      `[${task.kind}] Scanned ${questions.length} question(s); ` +
      `proposing ${actions.length} SLA-breach alert(s).`;

    return AgentTaskResult.parse({
      taskId: task.id,
      summary,
      proposedActions: actions,
    });
  }
}
