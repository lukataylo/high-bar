import type Stripe from "stripe";
import type { PaymentStatus, PayoutStatus } from "@high-bar/core";
import { loadStripeWebhookSecret } from "./env";

/**
 * Typed outcome of a Stripe webhook. This module performs NO database writes —
 * it maps a verified event to a domain outcome that apps/api persists.
 */
export type WebhookOutcome =
  | { kind: "payment"; stripePaymentIntentId: string; status: PaymentStatus }
  | { kind: "payout"; stripeTransferId: string; status: PayoutStatus }
  | { kind: "ignored"; eventType: string };

/**
 * Verifies a Stripe webhook signature and returns the parsed event. Throws via
 * the Stripe SDK on a bad/forged signature, and ConfigError when no secret is
 * available. The raw (unparsed) request body MUST be passed.
 */
export function verifyWebhookSignature(
  stripe: Stripe,
  rawBody: string | Buffer,
  signatureHeader: string,
  secret?: string,
): Stripe.Event {
  const webhookSecret = secret ?? loadStripeWebhookSecret();
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
}

/** Pulls the PaymentIntent id off a charge/refund-style object. */
function paymentIntentIdOf(value: string | Stripe.PaymentIntent | null | undefined): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.id === "string") return value.id;
  return null;
}

/**
 * Maps a verified Stripe event to a domain outcome. Unhandled events map to
 * `ignored` so the caller can ack them without side effects.
 */
export function mapEventToOutcome(event: Stripe.Event): WebhookOutcome {
  switch (event.type) {
    // ---- Asker payments (manual-capture PaymentIntents) ----
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      return { kind: "payment", stripePaymentIntentId: pi.id, status: "captured" };
    }
    case "payment_intent.amount_capturable_updated": {
      const pi = event.data.object as Stripe.PaymentIntent;
      return { kind: "payment", stripePaymentIntentId: pi.id, status: "authorized" };
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      return { kind: "payment", stripePaymentIntentId: pi.id, status: "failed" };
    }
    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      return { kind: "payment", stripePaymentIntentId: pi.id, status: "voided" };
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const piId = paymentIntentIdOf(charge.payment_intent);
      if (piId === null) return { kind: "ignored", eventType: event.type };
      return { kind: "payment", stripePaymentIntentId: piId, status: "refunded" };
    }
    case "refund.created":
    case "refund.updated": {
      const refundObj = event.data.object as Stripe.Refund;
      const piId = paymentIntentIdOf(refundObj.payment_intent);
      if (piId === null) return { kind: "ignored", eventType: event.type };
      return { kind: "payment", stripePaymentIntentId: piId, status: "refunded" };
    }

    // ---- Expert payouts (Connect transfers + payouts) ----
    case "transfer.created": {
      const transfer = event.data.object as Stripe.Transfer;
      return { kind: "payout", stripeTransferId: transfer.id, status: "sent" };
    }
    case "transfer.reversed": {
      const transfer = event.data.object as Stripe.Transfer;
      return { kind: "payout", stripeTransferId: transfer.id, status: "failed" };
    }
    case "payout.paid": {
      const payout = event.data.object as Stripe.Payout;
      return { kind: "payout", stripeTransferId: payout.id, status: "sent" };
    }
    case "payout.failed": {
      const payout = event.data.object as Stripe.Payout;
      return { kind: "payout", stripeTransferId: payout.id, status: "failed" };
    }

    default:
      return { kind: "ignored", eventType: event.type };
  }
}
