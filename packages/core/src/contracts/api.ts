import { z } from "zod";
import { Domain, QuestionStatus, AnswerStatus } from "../domain/enums";

/** DTOs shared between apps/web (client) and apps/api (server). */

export const QuestionDTO = z.object({
  id: z.string().uuid(),
  domain: Domain,
  title: z.string(),
  body: z.string(),
  status: QuestionStatus,
  priceCents: z.number().int(),
  currency: z.string(),
  slaHours: z.number().int(),
  createdAt: z.string(),
});
export type QuestionDTO = z.infer<typeof QuestionDTO>;

export const AnswerDTO = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid(),
  body: z.string(),
  status: AnswerStatus,
  createdAt: z.string(),
});
export type AnswerDTO = z.infer<typeof AnswerDTO>;

export const CreateQuestionInput = z.object({
  domain: Domain,
  title: z.string().min(8).max(160),
  body: z.string().min(20).max(8000),
  slaHours: z.number().int().min(1).max(168).optional(),
});
export type CreateQuestionInput = z.infer<typeof CreateQuestionInput>;
