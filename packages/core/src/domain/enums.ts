import { z } from "zod";

/** Domains experts are recruited and questions are routed into. Extend as the network grows. */
export const Domain = z.enum([
  "software_engineering",
  "business_leadership",
  "insurance",
  "legal",
  "finance",
  "healthcare",
  "marketing",
  "sales",
  "data_ai",
  "operations",
]);
export type Domain = z.infer<typeof Domain>;

export const UserRole = z.enum(["asker", "expert", "admin"]);
export type UserRole = z.infer<typeof UserRole>;

export const AskerType = z.enum(["human", "agent"]);
export type AskerType = z.infer<typeof AskerType>;

export const ExpertStatus = z.enum(["pending", "vetted", "suspended"]);
export type ExpertStatus = z.infer<typeof ExpertStatus>;

export const KycStatus = z.enum(["unverified", "pending", "verified", "rejected"]);
export type KycStatus = z.infer<typeof KycStatus>;

export const QuestionStatus = z.enum([
  "draft",
  "awaiting_payment", // order authorized hold pending
  "open", // funded, awaiting match/answer
  "assigned",
  "answered",
  "accepted", // asker accepted -> capture + payout
  "rejected", // asker rejected -> void/refund
  "expired", // SLA breach -> void/refund
  "cancelled",
]);
export type QuestionStatus = z.infer<typeof QuestionStatus>;

export const AnswerStatus = z.enum(["submitted", "accepted", "rejected"]);
export type AnswerStatus = z.infer<typeof AnswerStatus>;

export const PaymentStatus = z.enum([
  "authorized",
  "captured",
  "voided",
  "refunded",
  "failed",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PayoutStatus = z.enum([
  "pending", // created, may need approval
  "approved", // human-approved (above threshold) or auto-approved
  "sent",
  "failed",
]);
export type PayoutStatus = z.infer<typeof PayoutStatus>;

export const LeadKind = z.enum(["expert_candidate", "customer_candidate"]);
export type LeadKind = z.infer<typeof LeadKind>;

export const LeadStatus = z.enum([
  "new",
  "qualified",
  "disqualified",
  "contacted",
  "converted",
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const OutreachChannel = z.enum(["linkedin", "email"]);
export type OutreachChannel = z.infer<typeof OutreachChannel>;

/** Draft-only: nothing is sent automatically. Human approves, then sends manually. */
export const OutreachStatus = z.enum(["draft", "approved", "sent", "declined"]);
export type OutreachStatus = z.infer<typeof OutreachStatus>;

/** Audit decisions for every agent-proposed action that has a side effect. */
export const ActionDecision = z.enum(["proposed", "allowed", "denied", "executed"]);
export type ActionDecision = z.infer<typeof ActionDecision>;

export const ActorType = z.enum(["agent", "user", "system"]);
export type ActorType = z.infer<typeof ActorType>;
