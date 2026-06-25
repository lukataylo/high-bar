import { describe, it, expect, vi } from "vitest";
import type { StripeClient, GuardrailConfig } from "@high-bar/payments";
import { createApp } from "../app.js";
import { InMemoryRepository } from "../in-memory-repository.js";

interface FakeStripe {
  stripe: StripeClient;
  piCreate: ReturnType<typeof vi.fn>;
  piCapture: ReturnType<typeof vi.fn>;
  transferCreate: ReturnType<typeof vi.fn>;
  constructEvent: ReturnType<typeof vi.fn>;
}

function fakeStripe(opts: { piId?: string; transferId?: string } = {}): FakeStripe {
  const piId = opts.piId ?? "pi_test";
  const transferId = opts.transferId ?? "tr_test";
  const piCreate = vi.fn().mockResolvedValue({ id: piId, client_secret: "cs_test" });
  const piCapture = vi.fn().mockResolvedValue({ id: piId });
  const transferCreate = vi.fn().mockResolvedValue({ id: transferId });
  const constructEvent = vi.fn();
  const stripe = {
    paymentIntents: { create: piCreate, capture: piCapture, cancel: vi.fn() },
    transfers: { create: transferCreate },
    refunds: { create: vi.fn() },
    webhooks: { constructEvent },
  } as unknown as StripeClient;
  return { stripe, piCreate, piCapture, transferCreate, constructEvent };
}

const NO_THRESHOLD: GuardrailConfig = {
  approvalThresholdCents: 10_000_000,
  dailyCapCents: 100_000_000,
  killSwitch: false,
};

async function harness(opts: {
  stripe: FakeStripe;
  guardrail?: GuardrailConfig;
  expert?: { status?: "pending" | "vetted" | "suspended"; kyc?: "verified" | "pending"; connect?: string | null };
}) {
  const repo = new InMemoryRepository();
  const asker = await repo.createUser({ email: "asker@test.local", role: "asker" });
  const expertUser = await repo.createUser({ email: "expert@test.local", role: "expert" });
  const expert = await repo.createExpert({
    userId: expertUser.id,
    status: opts.expert?.status ?? "vetted",
    kycStatus: opts.expert?.kyc ?? "verified",
    stripeConnectAccountId: opts.expert?.connect === undefined ? "acct_test" : opts.expert.connect,
  });
  const built = createApp({
    repo,
    stripe: opts.stripe.stripe,
    defaultAskerId: asker.id,
    webhookSecret: "whsec_test",
    guardrailConfig: () => opts.guardrail ?? NO_THRESHOLD,
  });
  return { repo, expert, ...built };
}

async function postJson(app: { request: (p: string, init?: RequestInit) => Promise<Response> }, path: string, body: unknown) {
  const res = await app.request(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

const QUESTION = {
  domain: "software_engineering",
  title: "How do I debug a flaky MCP tool call?",
  body: "My agent intermittently fails a tool call and I cannot reproduce it reliably.",
};

async function submitAndAnswer(app: Parameters<typeof postJson>[0], expertId: string) {
  const submit = await postJson(app, "/api/questions", QUESTION);
  const questionId = submit.json.questionId as string;
  const answer = await postJson(app, `/api/questions/${questionId}/answer`, {
    expertId,
    body: "Add structured logging around the tool boundary and capture the failing payload.",
  });
  return { submit, questionId, answerId: answer.json.answerId as string };
}

describe("money path", () => {
  it("submit -> answer -> accept captures escrow and pays the expert (happy path)", async () => {
    const fs = fakeStripe();
    const { app, repo, expert, journal } = await harness({ stripe: fs });

    const { submit, questionId } = await submitAndAnswer(app, expert.id);
    expect(submit.status).toBe(201);
    expect(submit.json.status).toBe("awaiting_payment");
    expect(submit.json.clientSecret).toBe("cs_test");
    expect(fs.piCreate).toHaveBeenCalledTimes(1);

    const accept = await postJson(app, `/api/questions/${questionId}/accept`, {});
    expect(accept.status).toBe(200);
    expect(accept.json.decision).toBe("executed");
    expect(accept.json.transferId).toBe("tr_test");

    // Escrow captured, transfer issued exactly once.
    expect(fs.piCapture).toHaveBeenCalledTimes(1);
    expect(fs.transferCreate).toHaveBeenCalledTimes(1);

    // Ledger balances: escrow released and expert payable settled to zero.
    expect(journal.balance("escrow_liability")).toBe(0);
    expect(journal.balance("expert_payable")).toBe(0);
    for (const entry of journal.entries) {
      const debit = entry.postings.reduce((s, p) => s + p.debitCents, 0);
      const credit = entry.postings.reduce((s, p) => s + p.creditCents, 0);
      expect(debit).toBe(credit);
    }

    // Audit trail: proposed -> allowed -> executed.
    const decisions = repo.auditEntries
      .filter((e) => e.action === "payout.create")
      .map((e) => e.decision);
    expect(decisions).toContain("proposed");
    expect(decisions).toContain("allowed");
    expect(decisions).toContain("executed");
  });

  it("over-threshold payout is queued for approval and never executed", async () => {
    const fs = fakeStripe();
    const guardrail: GuardrailConfig = {
      approvalThresholdCents: 1,
      dailyCapCents: 100_000_000,
      killSwitch: false,
    };
    const { app, repo, expert } = await harness({ stripe: fs, guardrail });

    const { questionId } = await submitAndAnswer(app, expert.id);
    const accept = await postJson(app, `/api/questions/${questionId}/accept`, {});

    expect(accept.json.decision).toBe("pending_approval");
    expect(fs.transferCreate).not.toHaveBeenCalled();

    const payoutId = accept.json.payoutId as string;
    const payout = await repo.getPayout(payoutId);
    expect(payout?.status).toBe("pending");
    expect(payout?.requiresApproval).toBe(true);
  });

  it("ineligible expert payout is DENIED and the executor is never called", async () => {
    const fs = fakeStripe();
    const { app, expert } = await harness({
      stripe: fs,
      expert: { status: "pending" }, // not vetted -> fail-closed deny
    });

    const { questionId } = await submitAndAnswer(app, expert.id);
    const accept = await postJson(app, `/api/questions/${questionId}/accept`, {});

    expect(accept.json.decision).toBe("denied");
    expect(fs.transferCreate).not.toHaveBeenCalled();
  });

  it("webhook replay is a no-op (same event id processed once)", async () => {
    const fs = fakeStripe();
    const { app, repo } = await harness({ stripe: fs });

    // A submitted question opens the escrow PaymentIntent (id "pi_test").
    await postJson(app, "/api/questions", QUESTION);

    const event = {
      id: "evt_replay_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_test" } },
    };
    fs.constructEvent.mockReturnValue(event);

    const first = await app.request("/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(event),
      headers: { "content-type": "application/json", "stripe-signature": "sig" },
    });
    const firstJson = (await first.json()) as Record<string, unknown>;
    expect(first.status).toBe(200);
    expect(firstJson.ignored).toBeUndefined();

    const second = await app.request("/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(event),
      headers: { "content-type": "application/json", "stripe-signature": "sig" },
    });
    const secondJson = (await second.json()) as Record<string, unknown>;
    expect(second.status).toBe(200);
    expect(secondJson.ignored).toBe(true);

    const payment = await repo.getPaymentByIntentId("pi_test");
    expect(payment?.status).toBe("captured");
  });

  it("rejects a forged webhook signature (fail closed)", async () => {
    const fs = fakeStripe();
    const { app } = await harness({ stripe: fs });
    fs.constructEvent.mockImplementation(() => {
      throw new Error("signature verification failed");
    });
    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "bad" },
    });
    expect(res.status).toBe(400);
  });
});
