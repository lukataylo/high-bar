import { Hono } from "hono";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { CreateQuestionInput } from "@high-bar/core/contracts";
import { Journal } from "@high-bar/accounting";
import {
  PayoutPolicyEngine,
  processWebhookEvent,
  type GuardrailConfig,
  type StripeClient,
} from "@high-bar/payments";
import {
  createHttpApp,
  type RateLimitStore,
} from "@high-bar/mcp-expert-network";
import { loadFinanceConfig, type FinanceConfig } from "./finance.js";
import {
  RepositoryApiKeyPort,
  RepositoryEligibilityPort,
  RepositoryTotalsPort,
} from "./adapters.js";
import { RepositoryQuestionService } from "./question-service.js";
import { AcceptError, acceptQuestion, type MoneyPathDeps } from "./money-path.js";
import type { Repository } from "./repository.js";

export interface CreateAppOptions {
  repo: Repository;
  stripe: StripeClient;
  /** Persisted asker the intake routes attribute submitted questions to. */
  defaultAskerId: string;
  finance?: FinanceConfig;
  journal?: Journal;
  /** Stripe webhook signing secret. Falls back to STRIPE_WEBHOOK_SECRET. */
  webhookSecret?: string;
  /** Override for payout guardrail thresholds (tests). Defaults to env. */
  guardrailConfig?: () => GuardrailConfig;
  /** Rate limiter for the agent surface. Defaults to an in-memory token bucket. */
  rateLimit?: RateLimitStore;
}

export interface BuiltApp {
  app: Hono;
  journal: Journal;
  service: RepositoryQuestionService;
  moneyDeps: MoneyPathDeps;
}

const RecordAnswerInput = z.object({
  expertId: z.string().uuid(),
  body: z.string().min(1).max(20000),
});

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

/**
 * Build the full API: human REST routes + the Stripe webhook + the public agent
 * surface, all sharing ONE Repository, ONE QuestionService, and ONE guarded
 * money path. Nothing here logs secrets, client secrets, or PII.
 */
export function createApp(options: CreateAppOptions): BuiltApp {
  const { repo, stripe, defaultAskerId } = options;
  const finance = options.finance ?? loadFinanceConfig();
  const journal = options.journal ?? new Journal();

  const service = new RepositoryQuestionService({ repo, stripe, defaultAskerId });

  const payoutPolicy = new PayoutPolicyEngine({
    eligibility: new RepositoryEligibilityPort(repo),
    totals: new RepositoryTotalsPort(repo),
    ...(options.guardrailConfig ? { config: options.guardrailConfig } : {}),
  });

  const moneyDeps: MoneyPathDeps = { repo, stripe, journal, finance, policy: payoutPolicy };

  const api = new Hono();

  // ---- Submit a question (escrow hold opened) ----
  api.post("/questions", async (c) => {
    const parsed = CreateQuestionInput.safeParse(await readJson(c));
    if (!parsed.success) {
      return c.json({ error: { code: "invalid_input", details: parsed.error.flatten() } }, 400);
    }
    const result = await service.submitQuestion({
      domain: parsed.data.domain,
      title: parsed.data.title,
      body: parsed.data.body,
      askerType: "human",
      ...(parsed.data.slaHours === undefined ? {} : { slaHours: parsed.data.slaHours }),
    });
    return c.json(
      {
        questionId: result.questionId,
        status: result.status,
        clientSecret: result.paymentClientSecret,
      },
      201,
    );
  });

  // ---- Record an expert answer ----
  api.post("/questions/:id/answer", async (c) => {
    const id = c.req.param("id");
    const parsed = RecordAnswerInput.safeParse(await readJson(c));
    if (!parsed.success) {
      return c.json({ error: { code: "invalid_input", details: parsed.error.flatten() } }, 400);
    }
    const question = await repo.getQuestion(id);
    if (!question) return c.json({ error: { code: "not_found" } }, 404);
    const expert = await repo.getExpert(parsed.data.expertId);
    if (!expert) return c.json({ error: { code: "expert_not_found" } }, 400);

    const answer = await repo.createAnswer({
      questionId: id,
      expertId: parsed.data.expertId,
      body: parsed.data.body,
    });
    await repo.assignExpert(id, parsed.data.expertId);
    await repo.updateQuestionStatus(id, "answered");

    return c.json({ answerId: answer.id, questionId: id, status: "answered" }, 201);
  });

  // ---- Accept an answer: capture escrow + guarded payout ----
  api.post("/questions/:id/accept", async (c) => {
    const id = c.req.param("id");
    try {
      const outcome = await acceptQuestion(moneyDeps, id);
      return c.json(outcome, 200);
    } catch (err) {
      if (err instanceof AcceptError) {
        return c.json(
          { error: { code: err.code, message: err.message } },
          err.status as ContentfulStatusCode,
        );
      }
      throw err;
    }
  });

  // ---- Stripe webhook (RAW body, verify + replay-safe dedupe) ----
  api.post("/webhooks/stripe", async (c) => {
    const rawBody = await c.req.text();
    const signature = c.req.header("stripe-signature") ?? "";
    let result;
    try {
      result = await processWebhookEvent(
        stripe,
        rawBody,
        signature,
        options.webhookSecret,
        repo.idempotency,
      );
    } catch {
      // Bad/forged signature (or missing secret) — fail closed, record nothing.
      return c.json({ error: { code: "invalid_signature" } }, 400);
    }

    if (result.kind === "ignored") {
      return c.json({ received: true, ignored: true }, 200);
    }
    if (result.kind === "payment") {
      await repo.updatePaymentStatusByIntentId(result.stripePaymentIntentId, result.status);
      return c.json({ received: true }, 200);
    }
    // payout
    await repo.updatePayoutStatusByTransferId(result.stripeTransferId, result.status);
    return c.json({ received: true }, 200);
  });

  // ---- Public agent surface (hashed API-key auth + scopes + rate limit) ----
  const agentApp = createHttpApp({
    service,
    apiKeys: new RepositoryApiKeyPort(repo),
    ...(options.rateLimit ? { rateLimit: options.rateLimit } : {}),
  });
  api.route("/agent", agentApp);

  const app = new Hono();
  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/api", api);

  return { app, journal, service, moneyDeps };
}
