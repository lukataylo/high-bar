import { describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";
import {
  createQuestionPaymentIntent,
  capturePayment,
  refund,
  createPayout,
  PaymentsError,
} from "../src/index";

function fakeStripe(overrides: {
  paymentIntents?: Partial<{
    create: ReturnType<typeof vi.fn>;
    capture: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  }>;
  refunds?: Partial<{ create: ReturnType<typeof vi.fn> }>;
  transfers?: Partial<{ create: ReturnType<typeof vi.fn> }>;
}): Stripe {
  return {
    paymentIntents: {
      create: vi.fn(),
      capture: vi.fn(),
      cancel: vi.fn(),
      ...overrides.paymentIntents,
    },
    refunds: { create: vi.fn(), ...overrides.refunds },
    transfers: { create: vi.fn(), ...overrides.transfers },
  } as unknown as Stripe;
}

describe("createQuestionPaymentIntent", () => {
  it("creates a manual-capture intent and forwards the idempotency key", async () => {
    const create = vi.fn().mockResolvedValue({ id: "pi_123", client_secret: "secret_abc" });
    const stripe = fakeStripe({ paymentIntents: { create } });

    const result = await createQuestionPaymentIntent(stripe, {
      questionId: "q_1",
      amountCents: 5000,
      currency: "USD",
      idempotencyKey: "idem_1",
    });

    expect(result).toEqual({ paymentIntentId: "pi_123", clientSecret: "secret_abc" });
    expect(create).toHaveBeenCalledTimes(1);
    const [params, options] = create.mock.calls[0] ?? [];
    expect(params).toMatchObject({
      amount: 5000,
      currency: "usd",
      capture_method: "manual",
      metadata: { questionId: "q_1" },
    });
    expect(options).toEqual({ idempotencyKey: "idem_1" });
  });

  it("rejects a non-positive amount", async () => {
    const stripe = fakeStripe({});
    await expect(
      createQuestionPaymentIntent(stripe, {
        questionId: "q_1",
        amountCents: 0,
        idempotencyKey: "idem_1",
      }),
    ).rejects.toBeInstanceOf(PaymentsError);
  });
});

describe("capturePayment", () => {
  it("captures with the idempotency key", async () => {
    const capture = vi.fn().mockResolvedValue({ id: "pi_123" });
    const stripe = fakeStripe({ paymentIntents: { capture } });
    const id = await capturePayment(stripe, "pi_123", "idem_cap");
    expect(id).toBe("pi_123");
    expect(capture).toHaveBeenCalledWith("pi_123", undefined, { idempotencyKey: "idem_cap" });
  });
});

describe("refund", () => {
  it("issues a partial refund with amount + idempotency key", async () => {
    const create = vi.fn().mockResolvedValue({ id: "re_1" });
    const stripe = fakeStripe({ refunds: { create } });
    const id = await refund(stripe, {
      paymentIntentId: "pi_123",
      amountCents: 2500,
      idempotencyKey: "idem_ref",
    });
    expect(id).toBe("re_1");
    expect(create).toHaveBeenCalledWith(
      { payment_intent: "pi_123", amount: 2500 },
      { idempotencyKey: "idem_ref" },
    );
  });
});

describe("createPayout", () => {
  it("creates a transfer to the connected account with metadata + idempotency", async () => {
    const create = vi.fn().mockResolvedValue({ id: "tr_1" });
    const stripe = fakeStripe({ transfers: { create } });
    const result = await createPayout(stripe, {
      answerId: "ans_1",
      expertId: "exp_1",
      connectedAccountId: "acct_1",
      amountCents: 4000,
      idempotencyKey: "idem_pay",
    });
    expect(result).toEqual({ transferId: "tr_1", amountCents: 4000 });
    const [params, options] = create.mock.calls[0] ?? [];
    expect(params).toMatchObject({
      amount: 4000,
      currency: "usd",
      destination: "acct_1",
      metadata: { answerId: "ans_1", expertId: "exp_1" },
    });
    expect(options).toEqual({ idempotencyKey: "idem_pay" });
  });

  it("throws when the idempotency key is missing", async () => {
    const create = vi.fn();
    const stripe = fakeStripe({ transfers: { create } });
    await expect(
      createPayout(stripe, {
        answerId: "ans_1",
        expertId: "exp_1",
        connectedAccountId: "acct_1",
        amountCents: 4000,
        idempotencyKey: "",
      }),
    ).rejects.toBeInstanceOf(PaymentsError);
    expect(create).not.toHaveBeenCalled();
  });
});
