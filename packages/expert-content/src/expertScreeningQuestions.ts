import { z } from "zod";
import type { Domain } from "@high-bar/core";

/**
 * The short qualifying questions a network puts to a candidate expert to confirm
 * the topic genuinely matches their firsthand experience before they are put
 * forward to the client. Modeled on the "handful of screening questions,
 * <10 minutes" pre-call qualification used by GLG, AlphaSights, Guidepoint,
 * Third Bridge and Tegus.
 *
 * NOTE: screening is about *relevance and depth of experience*. Compliance
 * disqualification is handled separately in `complianceAttestations` — the two
 * gates are intentionally kept apart.
 */
export const ScreeningResponseType = z.enum([
  "free_text",
  "yes_no",
  "single_select",
  "scale_1_5", // self-rated depth / recency
]);
export type ScreeningResponseType = z.infer<typeof ScreeningResponseType>;

export interface ScreeningQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly responseType: ScreeningResponseType;
  /** Whether an answer is mandatory before the expert can be put forward. */
  readonly required: boolean;
  /** Options for `single_select` questions. */
  readonly options?: readonly string[];
}

/**
 * Universal screen applied to every project regardless of domain. The first
 * questions probe firsthand experience; the last invites the expert to flag
 * limits on what they can speak to (the network's first compliance signal).
 */
export const universalScreeningQuestions: readonly ScreeningQuestion[] = [
  {
    id: "screen.firsthand_experience",
    prompt:
      "Briefly describe your direct, firsthand experience with this topic and the specific " +
      "companies, products, or markets you can speak to.",
    responseType: "free_text",
    required: true,
  },
  {
    id: "screen.role_and_period",
    prompt:
      "In what role, at which organization, and over what time period did you gain this experience?",
    responseType: "free_text",
    required: true,
  },
  {
    id: "screen.recency",
    prompt:
      "How recent is your knowledge? When did you last work directly on this topic?",
    responseType: "single_select",
    required: true,
    options: [
      "Currently active",
      "Within the last 12 months",
      "1–3 years ago",
      "More than 3 years ago",
    ],
  },
  {
    id: "screen.named_comparators",
    prompt:
      "Which named companies or products in this space can you compare from direct experience?",
    responseType: "free_text",
    required: true,
  },
  {
    id: "screen.depth_self_rating",
    prompt:
      "On a scale of 1–5, how would you rate the depth of your firsthand expertise on this " +
      "specific question?",
    responseType: "scale_1_5",
    required: true,
  },
  {
    id: "screen.limits",
    prompt:
      "Are there aspects of this topic you cannot speak to, or that you would be unable or " +
      "unwilling to discuss?",
    responseType: "free_text",
    required: true,
  },
];

/**
 * One focused, domain-specific qualifier per domain (keyed off the core `Domain`
 * enum) layered on top of the universal screen.
 */
export const domainScreeningQuestions: Readonly<
  Record<Domain, ScreeningQuestion>
> = {
  software_engineering: {
    id: "screen.swe.hands_on",
    prompt:
      "Which systems did you personally architect, build, or operate, and at what scale " +
      "(traffic, team size, data volume)?",
    responseType: "free_text",
    required: true,
  },
  business_leadership: {
    id: "screen.biz.scope",
    prompt:
      "What was the scope of your leadership remit (P&L size, headcount, function), and which " +
      "decisions did you personally own?",
    responseType: "free_text",
    required: true,
  },
  insurance: {
    id: "screen.ins.line",
    prompt:
      "Which lines of business and geographies did you underwrite, price, or handle claims for, " +
      "and in what capacity?",
    responseType: "free_text",
    required: true,
  },
  legal: {
    id: "screen.legal.matters",
    prompt:
      "What types of matters or transactions did you advise on, and in which jurisdictions? " +
      "(Do not identify privileged or confidential client matters.)",
    responseType: "free_text",
    required: true,
  },
  finance: {
    id: "screen.fin.coverage",
    prompt:
      "Which sectors, instruments, or business models did you cover or operate, and what was your " +
      "analytical or operating role?",
    responseType: "free_text",
    required: true,
  },
  healthcare: {
    id: "screen.hc.practice",
    prompt:
      "What is your specialty and practice setting, and which products or treatments do you have " +
      "direct prescribing, purchasing, or clinical experience with?",
    responseType: "free_text",
    required: true,
  },
  marketing: {
    id: "screen.mkt.channels",
    prompt:
      "Which channels, budgets, and audiences did you personally manage, and what outcomes were " +
      "you directly accountable for?",
    responseType: "free_text",
    required: true,
  },
  sales: {
    id: "screen.sales.deals",
    prompt:
      "What did you sell, to which segments, and what was your role in the deals (quota, deal size, " +
      "stage owned)?",
    responseType: "free_text",
    required: true,
  },
  data_ai: {
    id: "screen.ai.deployments",
    prompt:
      "Which models or data systems did you build or deploy to production, on what stack, and what " +
      "were you accountable for (research, MLOps, evaluation)?",
    responseType: "free_text",
    required: true,
  },
  operations: {
    id: "screen.ops.functions",
    prompt:
      "Which operational functions did you run (supply chain, manufacturing, logistics, support), " +
      "at what scale, and what did you personally own?",
    responseType: "free_text",
    required: true,
  },
};

/** Full screening set for a domain: universal questions plus the domain qualifier. */
export function screeningQuestionsForDomain(
  domain: Domain,
): ScreeningQuestion[] {
  return [...universalScreeningQuestions, domainScreeningQuestions[domain]];
}
