import type Stripe from "stripe";
import { z } from "zod";
import { InvalidInputError, PaymentsError } from "./errors";

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
