import { Hono } from "hono";
import type { Context } from "hono";
import type { z } from "zod";
import {
  ListDomainsInput,
  ListDomainsOutput,
  PricingInput,
  PricingOutput,
  SubmitQuestionInput,
  SubmitQuestionOutput,
  QuestionStatusInput,
  QuestionStatusOutput,
} from "@high-bar/core/contracts";
import { QuestionNotFoundError } from "./service.js";
import type { QuestionService } from "./service.js";
import {
  hashApiKey,
  hasScope,
  InMemoryRateLimitStore,
  type ApiKeyPort,
  type ApiKeyRecord,
  type RateLimitStore,
} from "./auth.js";

/** Scopes enforced per route. Reads require `questions:read`; writes `questions:write`. */
export const SCOPES = {
  read: "questions:read",
  write: "questions:write",
} as const;

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return details === undefined ? { error: { code, message } } : { error: { code, message, details } };
}

interface HttpVariables {
  apiKey: ApiKeyRecord;
  keyHash: string;
}

export interface CreateHttpAppOptions {
  service: QuestionService;
  apiKeys: ApiKeyPort;
  /** Defaults to an in-memory token-bucket limiter. */
  rateLimit?: RateLimitStore;
}

const BEARER_RE = /^Bearer\s+(.+)$/i;

/**
 * Parse the request body against `schema`, returning a typed value or a 400.
 * Empty/invalid JSON bodies are treated as `{}` so tools with all-optional
 * inputs still validate.
 */
async function parseBody<S extends z.ZodTypeAny>(
  c: Context<{ Variables: HttpVariables }>,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    raw = {};
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: c.json(errorBody("invalid_input", "Request failed schema validation", parsed.error.flatten()), 400),
    };
  }
  return { ok: true, data: parsed.data };
}

function requireScope(c: Context<{ Variables: HttpVariables }>, scope: string): Response | null {
  if (!hasScope(c.get("apiKey"), scope)) {
    return c.json(errorBody("forbidden", `Missing required scope: ${scope}`), 403);
  }
  return null;
}

/**
 * Build the REST agent API: one route per core tool, Bearer-API-key auth with
 * sha-256 key hashing, per-key token-bucket rate limiting, strict zod
 * validation, scoped routes, and typed JSON errors. No raw keys or secrets are
 * ever logged or stored.
 */
export function createHttpApp(options: CreateHttpAppOptions): Hono<{ Variables: HttpVariables }> {
  const { service, apiKeys } = options;
  const rateLimit = options.rateLimit ?? new InMemoryRateLimitStore();

  const app = new Hono<{ Variables: HttpVariables }>();

  // --- Auth + rate limit ---
  app.use("/tools/*", async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const match = BEARER_RE.exec(header);
    const presented = match?.[1]?.trim();
    if (!presented) {
      return c.json(errorBody("unauthorized", "Missing or malformed Bearer token"), 401);
    }

    const keyHash = hashApiKey(presented);
    const record = await apiKeys.lookup(keyHash);
    if (!record) {
      // Unknown or revoked — never disclose which.
      return c.json(errorBody("unauthorized", "Invalid API key"), 401);
    }

    const allowed = await rateLimit.take(keyHash, record.rateLimitPerMin);
    if (!allowed) {
      return c.json(errorBody("rate_limited", "Rate limit exceeded"), 429);
    }

    c.set("apiKey", record);
    c.set("keyHash", keyHash);
    await next();
    return undefined;
  });

  // --- Tools ---
  app.post("/tools/list_domains", async (c) => {
    const denied = requireScope(c, SCOPES.read);
    if (denied) return denied;
    const parsed = await parseBody(c, ListDomainsInput);
    if (!parsed.ok) return parsed.response;
    const result = ListDomainsOutput.parse(await service.listDomains());
    return c.json(result, 200);
  });

  app.post("/tools/pricing", async (c) => {
    const denied = requireScope(c, SCOPES.read);
    if (denied) return denied;
    const parsed = await parseBody(c, PricingInput);
    if (!parsed.ok) return parsed.response;
    const result = PricingOutput.parse(await service.getPricing(parsed.data.domain));
    return c.json(result, 200);
  });

  app.post("/tools/submit_question", async (c) => {
    const denied = requireScope(c, SCOPES.write);
    if (denied) return denied;
    const parsed = await parseBody(c, SubmitQuestionInput);
    if (!parsed.ok) return parsed.response;
    const result = SubmitQuestionOutput.parse(await service.submitQuestion(parsed.data));
    return c.json(result, 201);
  });

  app.post("/tools/question_status", async (c) => {
    const denied = requireScope(c, SCOPES.read);
    if (denied) return denied;
    const parsed = await parseBody(c, QuestionStatusInput);
    if (!parsed.ok) return parsed.response;
    try {
      const result = QuestionStatusOutput.parse(await service.getQuestionStatus(parsed.data.questionId));
      return c.json(result, 200);
    } catch (err) {
      if (err instanceof QuestionNotFoundError) {
        return c.json(errorBody("not_found", "Question not found"), 404);
      }
      throw err;
    }
  });

  return app;
}
