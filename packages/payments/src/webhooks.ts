import type Stripe from "stripe";
import type { PaymentStatus, PayoutStatus } from "@high-bar/core";
import { loadStripeWebhookSecret } from "./env";
import type { IdempotencyStore } from "./ports";

/**
 * Typed outcome of a Stripe webhook. This module performs NO database writes —
 * it maps a verified event to a domain outcome that apps/api persists.
 */
export type WebhookOutcome =
  | { kind: "payment"; stripePaymentIntentId: string; status: PaymentStatus }
  | { kind: "payout"; stripeTransferId: string; status: PayoutStatus }
  | { kind: "ignored"; eventType: string };

/** Returned by `processWebhookEvent` when an event id was already processed. */
export type DuplicateWebhookOutcome = { kind: "ignored"; reason: "duplicate" };

/**
 * Outcome of the full verify -> dedupe -> map pipeline. A first-seen event maps
 * to a `WebhookOutcome`; a replayed event (same Stripe `event.id`) short-circuits
 * to `{ kind: "ignored", reason: "duplicate" }` and emits NO state transition.
 */
export type ProcessWebhookResult = WebhookOutcome | DuplicateWebhookOutcome;

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

/** Namespaces the dedupe key so Stripe event ids cannot collide with other keys. */
function webhookDedupeKey(eventId: string): string {
  return `stripe_event:${eventId}`;
}

/**
 * Full webhook pipeline: verify signature -> dedupe on Stripe `event.id` ->
 * map to a domain outcome. This is the REPLAY-SAFE entry point apps/api should
 * use.
 *
 * 1. Signature is verified first (via the Stripe SDK). A tampered/forged body or
 *    signature THROWS before any dedupe or mapping work — nothing is recorded.
 * 2. The verified `event.id` is checked against the injected IdempotencyStore.
 *    A previously-seen id returns `{ kind: "ignored", reason: "duplicate" }` and
 *    does NOT re-emit a state transition (Stripe retries deliver the same id).
 * 3. First-seen ids are recorded, then mapped to a `WebhookOutcome`.
 *
 * SECURITY: no part of the raw body, signature, secret, or event payload is
 * logged here. The store records only the opaque, namespaced event id.
 *
 * NOTE: recording + persisting the mapped outcome should share one DB
 * transaction in apps/api so an id is only marked processed once its effect is
 * durably committed (otherwise a crash between record and persist could drop an
 * event). The store contract here is the dedupe primitive that transaction uses.
 */
export async function processWebhookEvent(
  stripe: Stripe,
  rawBody: string | Buffer,
  signatureHeader: string,
  secret: string | undefined,
  idempotencyStore: IdempotencyStore,
): Promise<ProcessWebhookResult> {
  // Throws on bad/forged signature — fail-closed before any side effect.
  const verified = verifyWebhookSignature(stripe, rawBody, signatureHeader, secret);

  const dedupeKey = webhookDedupeKey(verified.id);
  if (await idempotencyStore.has(dedupeKey)) {
    return { kind: "ignored", reason: "duplicate" };
  }
  await idempotencyStore.remember(dedupeKey);

  return mapEventToOutcome(verified);
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
