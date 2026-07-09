import type Stripe from "stripe";
import { z } from "zod";
import { InvalidInputError } from "./errors";

const currencySchema = z
  .string()
  .trim()
  .min(3)
  .max(3)
  .transform((c) => c.toLowerCase());

const amountCentsSchema = z.number().int().positive();
const idempotencyKeySchema = z.string().trim().min(1);

const createIntentSchema = z.object({
  questionId: z.string().min(1),
  amountCents: amountCentsSchema,
  currency: currencySchema.default("usd"),
  idempotencyKey: idempotencyKeySchema,
});
export type CreateQuestionPaymentIntentInput = z.input<typeof createIntentSchema>;

export interface CreatedPaymentIntent {
  paymentIntentId: string;
  clientSecret: string | null;
}

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new InvalidInputError(result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

/**
 * Creates an escrow PaymentIntent against the asker with MANUAL capture, so the
 * funds are only authorized (held) until the answer is accepted and we capture.
 */
export async function createQuestionPaymentIntent(
  stripe: Stripe,
  input: CreateQuestionPaymentIntentInput,
): Promise<CreatedPaymentIntent> {
  const { questionId, amountCents, currency, idempotencyKey } = parse(createIntentSchema, input);

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency,
      capture_method: "manual",
      metadata: { questionId },
    },
    { idempotencyKey },
  );

  return { paymentIntentId: intent.id, clientSecret: intent.client_secret };
}

/** Captures a previously authorized (manual-capture) PaymentIntent. */
export async function capturePayment(
  stripe: Stripe,
  paymentIntentId: string,
  idempotencyKey: string,
): Promise<string> {
  const id = parse(z.string().min(1), paymentIntentId);
  const key = parse(idempotencyKeySchema, idempotencyKey);
  const intent = await stripe.paymentIntents.capture(id, undefined, { idempotencyKey: key });
  return intent.id;
}

/** Cancels (voids) an uncaptured PaymentIntent, releasing the authorization. */
export async function cancelPayment(stripe: Stripe, paymentIntentId: string): Promise<string> {
  const id = parse(z.string().min(1), paymentIntentId);
  const intent = await stripe.paymentIntents.cancel(id);
  return intent.id;
}

const refundSchema = z.object({
  paymentIntentId: z.string().min(1),
  amountCents: amountCentsSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
});
export type RefundInput = z.input<typeof refundSchema>;

/** Refunds a captured payment, in full or (when amountCents given) partially. */
export async function refund(stripe: Stripe, input: RefundInput): Promise<string> {
  const { paymentIntentId, amountCents, idempotencyKey } = parse(refundSchema, input);
  const refundResult = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      ...(amountCents === undefined ? {} : { amount: amountCents }),
    },
    { idempotencyKey },
  );
  return refundResult.id;
}
