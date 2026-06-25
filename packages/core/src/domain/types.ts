import type {
  users,
  experts,
  questions,
  answers,
  payments,
  payouts,
  leads,
  outreachDrafts,
  auditLog,
  apiKeys,
} from "../db/schema";

/** Row types inferred from the Drizzle schema (single source of truth). */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Expert = typeof experts.$inferSelect;
export type NewExpert = typeof experts.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type OutreachDraft = typeof outreachDrafts.$inferSelect;
export type NewOutreachDraft = typeof outreachDrafts.$inferInsert;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
