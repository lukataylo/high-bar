import Stripe from "stripe";
import { loadStripeSecret } from "./env";

/** Instance type of the configured Stripe SDK client. */
export type StripeClient = Stripe;

export interface CreateStripeClientOptions {
  /** Explicit secret key. Falls back to STRIPE_SECRET_KEY when omitted. */
  apiKey?: string;
}

/**
 * Creates a configured Stripe client. The API version is intentionally left
 * unpinned so it tracks the version bundled with the installed SDK major,
 * avoiding type friction between the pinned string and the SDK's literal union.
 */
export function createStripeClient(opts: CreateStripeClientOptions = {}): StripeClient {
  const apiKey = opts.apiKey ?? loadStripeSecret();
  return new Stripe(apiKey, {
    typescript: true,
    appInfo: { name: "high-bar/payments" },
  });
}
