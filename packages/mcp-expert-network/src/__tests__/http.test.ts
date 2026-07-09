import { describe, it, expect, beforeEach } from "vitest";
import { createHttpApp } from "../http.js";
import { InMemoryQuestionService } from "../service.js";
import { InMemoryApiKeyStore, InMemoryRateLimitStore, type SeedApiKey } from "../auth.js";

const FULL = "key_full_secret";
const READONLY = "key_read_secret";
const REVOKED = "key_revoked_secret";
const LIMITED = "key_limited_secret";

const SEEDS: readonly SeedApiKey[] = [
  { rawKey: FULL, scopes: ["questions:read", "questions:write"], rateLimitPerMin: 1000 },
  { rawKey: READONLY, scopes: ["questions:read"], rateLimitPerMin: 1000 },
  { rawKey: REVOKED, scopes: ["questions:read", "questions:write"], rateLimitPerMin: 1000, revoked: true },
  { rawKey: LIMITED, scopes: ["questions:read"], rateLimitPerMin: 1 },
];

function bearer(key: string): Record<string, string> {
  return { authorization: `Bearer ${key}`, "content-type": "application/json" };
}

const VALID_SUBMIT = {
  domain: "software_engineering",
  title: "How do I shard Postgres?",
  body: "We are at 2TB and writes are slowing down. What is the right sharding strategy?",
};

describe("REST agent API", () => {
  let app: ReturnType<typeof createHttpApp>;
  let service: InMemoryQuestionService;

  beforeEach(() => {
    service = new InMemoryQuestionService();
    app = createHttpApp({
      service,
      apiKeys: new InMemoryApiKeyStore(SEEDS),
      rateLimit: new InMemoryRateLimitStore(),
    });
  });

  describe("auth", () => {
    it("rejects a missing bearer token with 401", async () => {
      const res = await app.request("/tools/pricing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: "finance" }),
      });
      expect(res.status).toBe(401);
      const json = (await res.json()) as { error: { code: string } };
      expect(json.error.code).toBe("unauthorized");
    });

    it("rejects an unknown key with 401", async () => {
      const res = await app.request("/tools/pricing", {
        method: "POST",
        headers: bearer("totally_unknown_key"),
        body: JSON.stringify({ domain: "finance" }),
      });
      expect(res.status).toBe(401);
    });

    it("rejects a revoked key with 401", async () => {
      const res = await app.request("/tools/pricing", {
        method: "POST",
        headers: bearer(REVOKED),
        body: JSON.stringify({ domain: "finance" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("scopes", () => {
    it("forbids submit_question without questions:write", async () => {
      const res = await app.request("/tools/submit_question", {
        method: "POST",
        headers: bearer(READONLY),
        body: JSON.stringify(VALID_SUBMIT),
      });
      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: { code: string } };
      expect(json.error.code).toBe("forbidden");
    });
  });

  describe("validation", () => {
    it("rejects a too-short title with 400", async () => {
      const res = await app.request("/tools/submit_question", {
        method: "POST",
        headers: bearer(FULL),
        body: JSON.stringify({ ...VALID_SUBMIT, title: "short" }),
      });
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: { code: string } };
      expect(json.error.code).toBe("invalid_input");
    });

    it("rejects an unknown domain with 400", async () => {
      const res = await app.request("/tools/pricing", {
        method: "POST",
        headers: bearer(FULL),
        body: JSON.stringify({ domain: "astrology" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 once the per-key bucket is exhausted", async () => {
      const first = await app.request("/tools/pricing", {
        method: "POST",
        headers: bearer(LIMITED),
        body: JSON.stringify({ domain: "finance" }),
      });
      expect(first.status).toBe(200);

      const second = await app.request("/tools/pricing", {
        method: "POST",
        headers: bearer(LIMITED),
        body: JSON.stringify({ domain: "finance" }),
      });
      expect(second.status).toBe(429);
      const json = (await second.json()) as { error: { code: string } };
      expect(json.error.code).toBe("rate_limited");
    });
  });

  describe("happy path", () => {
    it("submits a question and reads its status", async () => {
      const submitRes = await app.request("/tools/submit_question", {
        method: "POST",
        headers: bearer(FULL),
        body: JSON.stringify(VALID_SUBMIT),
      });
      expect(submitRes.status).toBe(201);
      const submit = (await submitRes.json()) as {
        questionId: string;
        status: string;
        paymentClientSecret: string | null;
      };
      expect(submit.status).toBe("awaiting_payment");
      expect(submit.paymentClientSecret).toBeNull();
      expect(submit.questionId).toMatch(/[0-9a-f-]{36}/i);

      const statusRes = await app.request("/tools/question_status", {
        method: "POST",
        headers: bearer(FULL),
        body: JSON.stringify({ questionId: submit.questionId }),
      });
      expect(statusRes.status).toBe(200);
      const status = (await statusRes.json()) as {
        questionId: string;
        status: string;
        answer: { body: string; answeredAt: string } | null;
      };
      expect(status.questionId).toBe(submit.questionId);
      expect(status.status).toBe("awaiting_payment");
      expect(status.answer).toBeNull();
    });

    it("lists domains", async () => {
      const res = await app.request("/tools/list_domains", {
        method: "POST",
        headers: bearer(FULL),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { domains: { id: string; label: string }[] };
      expect(json.domains.length).toBe(10);
      expect(json.domains.some((d) => d.id === "software_engineering")).toBe(true);
    });

    it("returns 404 for an unknown question id", async () => {
      const res = await app.request("/tools/question_status", {
        method: "POST",
        headers: bearer(FULL),
        body: JSON.stringify({ questionId: "11111111-1111-1111-1111-111111111111" }),
      });
      expect(res.status).toBe(404);
    });
  });
});
