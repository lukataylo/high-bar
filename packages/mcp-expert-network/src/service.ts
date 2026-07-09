import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { Domain } from "@high-bar/core";
import {
  ListDomainsOutput,
  PricingOutput,
  SubmitQuestionInput,
  SubmitQuestionOutput,
  QuestionStatusOutput,
} from "@high-bar/core/contracts";

/**
 * Result/argument types are derived directly from the core contract schemas so
 * this port can never drift from the public tool surface.
 */
export type ListDomainsResult = z.infer<typeof ListDomainsOutput>;
export type PricingResult = z.infer<typeof PricingOutput>;
export type SubmitQuestionArgs = z.infer<typeof SubmitQuestionInput>;
export type SubmitQuestionResult = z.infer<typeof SubmitQuestionOutput>;
export type QuestionStatusResult = z.infer<typeof QuestionStatusOutput>;

/**
 * PORT: the only dependency the MCP server and REST API have on the rest of the
 * platform. An adapter backed by Postgres + payments lives elsewhere; this
 * package ships an in-memory fake for tests and local development and has NO
 * hard dependency on @high-bar/payments or the DB driver.
 */
export interface QuestionService {
  listDomains(): Promise<ListDomainsResult>;
  getPricing(domain: Domain): Promise<PricingResult>;
  submitQuestion(input: SubmitQuestionArgs): Promise<SubmitQuestionResult>;
  getQuestionStatus(questionId: string): Promise<QuestionStatusResult>;
}

/** Thrown when a question id is not known to the service. */
export class QuestionNotFoundError extends Error {
  readonly questionId: string;
  constructor(questionId: string) {
    super(`Question not found: ${questionId}`);
    this.name = "QuestionNotFoundError";
    this.questionId = questionId;
  }
}

const DOMAIN_LABELS: Record<Domain, string> = {
  software_engineering: "Software Engineering",
  business_leadership: "Business Leadership",
  insurance: "Insurance",
  legal: "Legal",
  finance: "Finance",
  healthcare: "Healthcare",
  marketing: "Marketing",
  sales: "Sales",
  data_ai: "Data & AI",
  operations: "Operations",
};

interface PriceCard {
  readonly priceCents: number;
  readonly slaHours: number;
}

const PRICING: Record<Domain, PriceCard> = {
  software_engineering: { priceCents: 9900, slaHours: 48 },
  business_leadership: { priceCents: 14900, slaHours: 48 },
  insurance: { priceCents: 12900, slaHours: 72 },
  legal: { priceCents: 19900, slaHours: 72 },
  finance: { priceCents: 17900, slaHours: 48 },
  healthcare: { priceCents: 18900, slaHours: 72 },
  marketing: { priceCents: 8900, slaHours: 48 },
  sales: { priceCents: 8900, slaHours: 48 },
  data_ai: { priceCents: 11900, slaHours: 48 },
  operations: { priceCents: 9900, slaHours: 48 },
};

interface StoredAnswer {
  body: string;
  answeredAt: string;
}

interface StoredQuestion {
  id: string;
  domain: Domain;
  status: QuestionStatusResult["status"];
  answer: StoredAnswer | null;
  /** Echoed back from submission; empty when the agent attached none. */
  codeExamples: NonNullable<SubmitQuestionArgs["codeExamples"]>;
}

/**
 * Deterministic, dependency-free implementation used by tests and local dev.
 * Submitted questions land in `awaiting_payment` (escrow hold pending); this
 * fake never touches Stripe, so `paymentClientSecret` is always null.
 */
export class InMemoryQuestionService implements QuestionService {
  private readonly questions = new Map<string, StoredQuestion>();
  private readonly idFactory: () => string;

  constructor(idFactory: () => string = randomUUID) {
    this.idFactory = idFactory;
  }

  listDomains(): Promise<ListDomainsResult> {
    const domains = Domain.options.map((id) => ({ id, label: DOMAIN_LABELS[id] }));
    return Promise.resolve({ domains });
  }

  getPricing(domain: Domain): Promise<PricingResult> {
    const card = PRICING[domain];
    return Promise.resolve({
      domain,
      priceCents: card.priceCents,
      currency: "usd",
      slaHours: card.slaHours,
    });
  }

  submitQuestion(input: SubmitQuestionArgs): Promise<SubmitQuestionResult> {
    const id = this.idFactory();
    this.questions.set(id, {
      id,
      domain: input.domain,
      status: "awaiting_payment",
      answer: null,
      codeExamples: input.codeExamples ?? [],
    });
    return Promise.resolve({
      questionId: id,
      status: "awaiting_payment",
      paymentClientSecret: null,
    });
  }

  getQuestionStatus(questionId: string): Promise<QuestionStatusResult> {
    const found = this.questions.get(questionId);
    if (!found) {
      return Promise.reject(new QuestionNotFoundError(questionId));
    }
    return Promise.resolve({
      questionId: found.id,
      status: found.status,
      answer: found.answer ? { body: found.answer.body, answeredAt: found.answer.answeredAt } : null,
      codeExamples: found.codeExamples.length > 0 ? found.codeExamples : undefined,
    });
  }

  /** Test helper: attach an accepted answer to a previously submitted question. */
  markAnswered(questionId: string, body: string, answeredAt: string = new Date().toISOString()): void {
    const found = this.questions.get(questionId);
    if (!found) {
      throw new QuestionNotFoundError(questionId);
    }
    found.status = "answered";
    found.answer = { body, answeredAt };
  }
}

/** The `Domain` type (zod-inferred union) re-exported for adapter implementors. */
export type { Domain };
