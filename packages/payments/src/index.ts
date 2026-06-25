// Public surface of @high-bar/payments.

// Stripe client
export { createStripeClient } from "./stripe-client";
export type { StripeClient, CreateStripeClientOptions } from "./stripe-client";

// Environment / guardrail config
export { loadStripeSecret, loadStripeWebhookSecret, loadGuardrailConfig } from "./env";
export type { GuardrailConfig } from "./env";

// Asker escrow payments
export {
  createQuestionPaymentIntent,
  capturePayment,
  cancelPayment,
  refund,
} from "./payments";
export type {
  CreateQuestionPaymentIntentInput,
  CreatedPaymentIntent,
  RefundInput,
} from "./payments";

// Expert Connect accounts + payouts
export {
  createExpertConnectAccount,
  createAccountOnboardingLink,
  createPayout,
} from "./connect";
export type {
  CreateExpertConnectAccountInput,
  CreateAccountOnboardingLinkInput,
  CreatePayoutInput,
  CreatedPayout,
} from "./connect";

// Payout guardrails
export { PayoutPolicyEngine } from "./policy";
export type { PayoutPolicyEngineDeps } from "./policy";

// Injected ports
export type {
  ExpertEligibility,
  ExpertEligibilityPort,
  PayoutTotalsPort,
  IdempotencyStore,
} from "./ports";

// Webhooks
export { verifyWebhookSignature, mapEventToOutcome } from "./webhooks";
export type { WebhookOutcome } from "./webhooks";

// Errors
export {
  PaymentsError,
  ConfigError,
  InvalidInputError,
} from "./errors";
export type { PaymentsErrorCode } from "./errors";
