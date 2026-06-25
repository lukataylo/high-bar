import { z } from "zod";
import { Domain, QuestionStatus, AskerType } from "../domain/enums";

/**
 * Public tool contracts exposed to AI-agent consumers via the MCP server and
 * the REST agent API. Both surfaces validate against these exact schemas.
 */

export const ListDomainsInput = z.object({});
export const ListDomainsOutput = z.object({
  domains: z.array(z.object({ id: Domain, label: z.string() })),
});

export const PricingInput = z.object({ domain: Domain });
export const PricingOutput = z.object({
  domain: Domain,
  priceCents: z.number().int().positive(),
  currency: z.string().default("usd"),
  slaHours: z.number().int().positive(),
});

export const SubmitQuestionInput = z.object({
  domain: Domain,
  title: z.string().min(8).max(160),
  body: z.string().min(20).max(8000),
  askerType: AskerType.default("agent"),
  slaHours: z.number().int().min(1).max(168).optional(),
});
export const SubmitQuestionOutput = z.object({
  questionId: z.string().uuid(),
  status: QuestionStatus,
  // Stripe PaymentIntent client secret to authorize the hold (escrow), if required.
  paymentClientSecret: z.string().nullable(),
});

export const QuestionStatusInput = z.object({ questionId: z.string().uuid() });
export const QuestionStatusOutput = z.object({
  questionId: z.string().uuid(),
  status: QuestionStatus,
  answer: z
    .object({ body: z.string(), answeredAt: z.string() })
    .nullable(),
});

export const MCP_TOOLS = {
  list_domains: { input: ListDomainsInput, output: ListDomainsOutput },
  pricing: { input: PricingInput, output: PricingOutput },
  submit_question: { input: SubmitQuestionInput, output: SubmitQuestionOutput },
  question_status: { input: QuestionStatusInput, output: QuestionStatusOutput },
} as const;

export type McpToolName = keyof typeof MCP_TOOLS;
