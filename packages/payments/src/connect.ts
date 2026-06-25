import type Stripe from "stripe";
import { z } from "zod";
import { InvalidInputError, PaymentsError } from "./errors";
import type { IdempotencyStore } from "./ports";

const currencySchema = z
  .string()
  .trim()
  .min(3)
  .max(3)
  .transform((c) => c.toLowerCase());

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new InvalidInputError(result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

const createAccountSchema = z.object({
  email: z.string().email(),
  country: z.string().trim().length(2).transform((c) => c.toUpperCase()),
  expertId: z.string().min(1),
});
export type CreateExpertConnectAccountInput = z.input<typeof createAccountSchema>;

/** Creates a Stripe Connect Express account for an expert; returns its acct id. */
export async function createExpertConnectAccount(
  stripe: Stripe,
  input: CreateExpertConnectAccountInput,
): Promise<string> {
  const { email, country, expertId } = parse(createAccountSchema, input);
  const account = await stripe.accounts.create({
    type: "express",
    email,
    country,
    metadata: { expertId },
  });
  return account.id;
}

const onboardingLinkSchema = z.object({
  connectedAccountId: z.string().min(1),
  refreshUrl: z.string().url(),
  returnUrl: z.string().url(),
});
export type CreateAccountOnboardingLinkInput = z.input<typeof onboardingLinkSchema>;

/** Creates a one-time onboarding link for a connected account; returns the url. */
export async function createAccountOnboardingLink(
  stripe: Stripe,
  input: CreateAccountOnboardingLinkInput,
): Promise<string> {
  const { connectedAccountId, refreshUrl, returnUrl } = parse(onboardingLinkSchema, input);
  const link = await stripe.accountLinks.create({
    account: connectedAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

const createPayoutSchema = z.object({
  answerId: z.string().min(1),
  expertId: z.string().min(1),
  connectedAccountId: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: currencySchema.default("usd"),
  idempotencyKey: z.string().trim().min(1),
});
export type CreatePayoutInput = z.input<typeof createPayoutSchema>;

export interface CreatedPayout {
  transferId: string;
  amountCents: number;
}

/**
 * Moves funds to an expert's connected account via a Connect Transfer. An
 * idempotency key is REQUIRED — money-moving calls must never double-fire.
 */
export async function createPayout(stripe: Stripe, input: CreatePayoutInput): Promise<CreatedPayout> {
  if (
    input === null ||
    typeof input !== "object" ||
    typeof (input as { idempotencyKey?: unknown }).idempotencyKey !== "string" ||
    (input as { idempotencyKey: string }).idempotencyKey.trim() === ""
  ) {
    throw new PaymentsError("missing_idempotency_key", "createPayout requires a non-empty idempotencyKey");
  }
  const { answerId, expertId, connectedAccountId, amountCents, currency, idempotencyKey } = parse(
    createPayoutSchema,
    input,
  );

  const transfer = await stripe.transfers.create(
    {
      amount: amountCents,
      currency,
      destination: connectedAccountId,
      metadata: { answerId, expertId },
    },
    { idempotencyKey },
  );

  return { transferId: transfer.id, amountCents };
}

/** Result of a store-guarded payout attempt. */
export type PayoutAttempt =
  | { kind: "created"; transferId: string; amountCents: number }
  | { kind: "duplicate"; idempotencyKey: string };

function payoutDedupeKey(idempotencyKey: string): string {
  return `payout:${idempotencyKey}`;
}

/**
 * Defense-in-depth wrapper around {@link createPayout}. Stripe's idempotency key
 * already de-duplicates retries on Stripe's side, but a local IdempotencyStore
 * guard means we never even ISSUE a second money-moving call for an id we have
 * already acted on — closing the window where a retry races before Stripe has
 * recorded the first request.
 *
 * Sequence is deliberately check -> record -> call:
 *   - a previously-seen key returns `{ kind: "duplicate" }` WITHOUT touching
 *     Stripe (no double-create);
 *   - the key is recorded BEFORE the Stripe call so a crash mid-flight does not
 *     re-issue. The Stripe idempotencyKey is still forwarded, so even if a
 *     duplicate slips past the local guard, Stripe returns the original
 *     transfer rather than creating a second one.
 *
 * SECURITY: the store records only the opaque idempotency key — no amounts,
 * account ids, or other PII.
 */
export async function createPayoutOnce(
  stripe: Stripe,
  input: CreatePayoutInput,
  store: IdempotencyStore,
): Promise<PayoutAttempt> {
  const key = (input as { idempotencyKey?: unknown }).idempotencyKey;
  if (typeof key !== "string" || key.trim() === "") {
    throw new PaymentsError("missing_idempotency_key", "createPayoutOnce requires a non-empty idempotencyKey");
  }

  const dedupeKey = payoutDedupeKey(key.trim());
  if (await store.has(dedupeKey)) {
    return { kind: "duplicate", idempotencyKey: key.trim() };
  }
  await store.remember(dedupeKey);

  const created = await createPayout(stripe, input);
  return { kind: "created", transferId: created.transferId, amountCents: created.amountCents };
}
