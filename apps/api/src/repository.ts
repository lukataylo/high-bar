import type {
  AuditEntry,
  Answer,
  Expert,
  Lead,
  NewAnswer,
  NewExpert,
  NewLead,
  NewPayment,
  NewPayout,
  NewQuestion,
  NewUser,
  Payment,
  PaymentStatus,
  Payout,
  PayoutStatus,
  Question,
  QuestionStatus,
  User,
} from "@high-bar/core";
import type { DailyReservation, IdempotencyStore } from "@high-bar/payments";
import type { ApiKeyRecord } from "@high-bar/mcp-expert-network";

/**
 * The single persistence PORT for apps/api. Every route, the money path, the
 * webhook handler, and the agent surface depend ONLY on this interface — never
 * on a concrete driver. Two implementations live behind it: an
 * `InMemoryRepository` (tests / local dev) and a `DrizzleRepository` (Postgres).
 *
 * Inputs use the Drizzle `New*` insert types and outputs the `*` select types,
 * so both implementations stay schema-aligned by construction.
 */
export interface Repository {
  // ---- Users ----
  createUser(input: NewUser): Promise<User>;
  /** Idempotent: returns the existing user for `email`, else creates one. */
  ensureUserByEmail(input: NewUser): Promise<User>;
  getUser(id: string): Promise<User | null>;

  // ---- Experts ----
  createExpert(input: NewExpert): Promise<Expert>;
  getExpert(id: string): Promise<Expert | null>;

  // ---- Questions ----
  createQuestion(input: NewQuestion): Promise<Question>;
  getQuestion(id: string): Promise<Question | null>;
  updateQuestionStatus(id: string, status: QuestionStatus): Promise<Question | null>;
  assignExpert(id: string, expertId: string): Promise<Question | null>;

  // ---- Answers ----
  createAnswer(input: NewAnswer): Promise<Answer>;
  getAnswer(id: string): Promise<Answer | null>;
  latestAnswerForQuestion(questionId: string): Promise<Answer | null>;

  // ---- Payments (asker escrow; one PaymentIntent per question) ----
  createPayment(input: NewPayment): Promise<Payment>;
  getPaymentByQuestion(questionId: string): Promise<Payment | null>;
  getPaymentByIntentId(stripePaymentIntentId: string): Promise<Payment | null>;
  updatePaymentStatusByIntentId(
    stripePaymentIntentId: string,
    status: PaymentStatus,
  ): Promise<Payment | null>;

  // ---- Payouts (expert Connect transfers) ----
  createPayout(input: NewPayout): Promise<Payout>;
  getPayout(id: string): Promise<Payout | null>;
  setPayoutTransfer(
    id: string,
    stripeTransferId: string | null,
    status: PayoutStatus,
  ): Promise<Payout | null>;
  updatePayoutStatusByTransferId(
    stripeTransferId: string,
    status: PayoutStatus,
  ): Promise<Payout | null>;

  // ---- Leads ----
  upsertLead(input: NewLead): Promise<Lead>;

  // ---- API keys (hashed lookup for the agent surface) ----
  lookupApiKey(hashedKey: string): Promise<ApiKeyRecord | null>;

  // ---- Audit trail (every money decision: proposed -> allowed/denied -> executed) ----
  recordAudit(entry: AuditEntry): Promise<void>;

  // ---- Idempotency (webhook dedupe + payout local guard) ----
  readonly idempotency: IdempotencyStore;

  // ---- Daily payout totals (cap enforcement) ----
  sentTodayCents(): Promise<number>;
  /**
   * OPTIONAL atomic reserve-and-check for the daily cap. When present, the
   * PayoutPolicyEngine prefers it over `sentTodayCents()`. A reservation is
   * tentative — release it (where supported) when the payout does not execute.
   */
  reserveDailyAmount?(amountCents: number, dailyCapCents: number): Promise<DailyReservation>;
  /** Release a tentative reservation when the payout never executes. */
  releaseDailyAmount?(amountCents: number): Promise<void>;
}
