import { describe, it, expect, vi, afterEach } from "vitest";
import type Stripe from "stripe";
import {
  mapEventToOutcome,
  verifyWebhookSignature,
  ConfigError,
  type WebhookOutcome,
} from "../src/index";

function event(type: string, object: Record<string, unknown>): Stripe.Event {
  return { type, data: { object } } as unknown as Stripe.Event;
}

describe("mapEventToOutcome", () => {
  const cases: Array<{ name: string; event: Stripe.Event; expected: WebhookOutcome }> = [
    {
      name: "payment_intent.succeeded -> captured",
      event: event("payment_intent.succeeded", { id: "pi_1" }),
      expected: { kind: "payment", stripePaymentIntentId: "pi_1", status: "captured" },
    },
    {
      name: "payment_intent.amount_capturable_updated -> authorized",
      event: event("payment_intent.amount_capturable_updated", { id: "pi_2" }),
      expected: { kind: "payment", stripePaymentIntentId: "pi_2", status: "authorized" },
    },
    {
      name: "payment_intent.payment_failed -> failed",
      event: event("payment_intent.payment_failed", { id: "pi_3" }),
      expected: { kind: "payment", stripePaymentIntentId: "pi_3", status: "failed" },
    },
    {
      name: "payment_intent.canceled -> voided",
      event: event("payment_intent.canceled", { id: "pi_4" }),
      expected: { kind: "payment", stripePaymentIntentId: "pi_4", status: "voided" },
    },
    {
      name: "charge.refunded (string payment_intent) -> refunded",
      event: event("charge.refunded", { id: "ch_1", payment_intent: "pi_5" }),
      expected: { kind: "payment", stripePaymentIntentId: "pi_5", status: "refunded" },
    },
    {
      name: "refund.created (nested payment_intent) -> refunded",
      event: event("refund.created", { id: "re_1", payment_intent: { id: "pi_6" } }),
      expected: { kind: "payment", stripePaymentIntentId: "pi_6", status: "refunded" },
    },
    {
      name: "transfer.created -> payout sent",
      event: event("transfer.created", { id: "tr_1" }),
      expected: { kind: "payout", stripeTransferId: "tr_1", status: "sent" },
    },
    {
      name: "transfer.reversed -> payout failed",
      event: event("transfer.reversed", { id: "tr_2" }),
      expected: { kind: "payout", stripeTransferId: "tr_2", status: "failed" },
    },
    {
      name: "payout.paid -> sent",
      event: event("payout.paid", { id: "po_1" }),
      expected: { kind: "payout", stripeTransferId: "po_1", status: "sent" },
    },
    {
      name: "payout.failed -> failed",
      event: event("payout.failed", { id: "po_2" }),
      expected: { kind: "payout", stripeTransferId: "po_2", status: "failed" },
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      expect(mapEventToOutcome(c.event)).toEqual(c.expected);
    });
  }

  it("ignores unmapped event types", () => {
    expect(mapEventToOutcome(event("customer.created", { id: "cus_1" }))).toEqual({
      kind: "ignored",
      eventType: "customer.created",
    });
  });

  it("ignores charge.refunded with no resolvable payment intent", () => {
    expect(mapEventToOutcome(event("charge.refunded", { id: "ch_2", payment_intent: null }))).toEqual({
      kind: "ignored",
      eventType: "charge.refunded",
    });
  });
});

describe("verifyWebhookSignature", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it("delegates to stripe.webhooks.constructEvent with the provided secret", () => {
    const built = event("payment_intent.succeeded", { id: "pi_1" });
    const constructEvent = vi.fn().mockReturnValue(built);
    const stripe = { webhooks: { constructEvent } } as unknown as Stripe;

    const result = verifyWebhookSignature(stripe, "raw-body", "sig-header", "whsec_test");

    expect(result).toBe(built);
    expect(constructEvent).toHaveBeenCalledWith("raw-body", "sig-header", "whsec_test");
  });

  it("throws ConfigError when no secret is provided or configured", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const constructEvent = vi.fn();
    const stripe = { webhooks: { constructEvent } } as unknown as Stripe;

    expect(() => verifyWebhookSignature(stripe, "raw-body", "sig-header")).toThrow(ConfigError);
    expect(constructEvent).not.toHaveBeenCalled();
  });
});
