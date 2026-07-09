import { Domain } from "@high-bar/core";
import { createQuestionPaymentIntent, type StripeClient } from "@high-bar/payments";
import type {
  ListDomainsResult,
  PricingResult,
  QuestionService,
  QuestionStatusResult,
  SubmitQuestionArgs,
  SubmitQuestionResult,
} from "@high-bar/mcp-expert-network";
import { QuestionNotFoundError } from "@high-bar/mcp-expert-network";
import { DOMAIN_LABELS, priceCardFor } from "./pricing.js";
import type { Repository } from "./repository.js";

export interface QuestionServiceDeps {
  repo: Repository;
  stripe: StripeClient;
  /** The persisted user a submitted question is attributed to. */
  defaultAskerId: string;
}

/**
 * The mcp-expert-network {@link QuestionService} PORT, backed by the Repository
 * and Stripe. Both the REST agent API and the human REST routes delegate here,
 * so the public agent surface and the app share exactly one implementation.
 *
 * `submitQuestion` persists the question, opens a MANUAL-capture escrow
 * PaymentIntent (funds only held, captured on accept), records the payment, and
 * returns the client secret so the caller can authorize the hold.
 */
export class RepositoryQuestionService implements QuestionService {
  private readonly repo: Repository;
  private readonly stripe: StripeClient;
  private readonly defaultAskerId: string;

  constructor(deps: QuestionServiceDeps) {
    this.repo = deps.repo;
    this.stripe = deps.stripe;
    this.defaultAskerId = deps.defaultAskerId;
  }

  listDomains(): Promise<ListDomainsResult> {
    const domains = Domain.options.map((id) => ({ id, label: DOMAIN_LABELS[id] }));
    return Promise.resolve({ domains });
  }

  getPricing(domain: Domain): Promise<PricingResult> {
    const card = priceCardFor(domain);
    return Promise.resolve({
      domain,
      priceCents: card.priceCents,
      currency: "usd",
      slaHours: card.slaHours,
    });
  }

  async submitQuestion(input: SubmitQuestionArgs): Promise<SubmitQuestionResult> {
    const card = priceCardFor(input.domain);
    const slaHours = input.slaHours ?? card.slaHours;

    const question = await this.repo.createQuestion({
      askerId: this.defaultAskerId,
      askerType: input.askerType,
      domain: input.domain,
      title: input.title,
      body: input.body,
      status: "awaiting_payment",
      priceCents: card.priceCents,
      currency: "usd",
      slaHours,
    });

    // MANUAL-capture escrow hold. The idempotency key is derived from the
    // question id so a retry never opens a second hold.
    const idempotencyKey = `pi:${question.id}`;
    const intent = await createQuestionPaymentIntent(this.stripe, {
      questionId: question.id,
      amountCents: question.priceCents,
      currency: question.currency,
      idempotencyKey,
    });

    await this.repo.createPayment({
      questionId: question.id,
      stripePaymentIntentId: intent.paymentIntentId,
      status: "authorized",
      amountCents: question.priceCents,
      currency: question.currency,
      idempotencyKey,
    });

    return {
      questionId: question.id,
      status: "awaiting_payment",
      paymentClientSecret: intent.clientSecret,
    };
  }

  async getQuestionStatus(questionId: string): Promise<QuestionStatusResult> {
    const question = await this.repo.getQuestion(questionId);
    if (!question) throw new QuestionNotFoundError(questionId);

    const answerRow =
      question.status === "answered" || question.status === "accepted"
        ? await this.repo.latestAnswerForQuestion(questionId)
        : null;

    return {
      questionId: question.id,
      status: question.status,
      answer: answerRow
        ? { body: answerRow.body, answeredAt: answerRow.createdAt.toISOString() }
        : null,
    };
  }
}
