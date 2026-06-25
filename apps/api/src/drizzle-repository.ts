import { and, desc, eq, gte, inArray } from "drizzle-orm";
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
import type { Database } from "@high-bar/core/db";
import {
  answers,
  apiKeys,
  auditLog,
  experts,
  leads,
  payments,
  payouts,
  questions,
  users,
} from "@high-bar/core/db";
import type { DailyReservation, IdempotencyStore } from "@high-bar/payments";
import type { ApiKeyRecord } from "@high-bar/mcp-expert-network";
import type { Repository } from "./repository.js";

const IDEMPOTENCY_ACTION = "__idempotency__";

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Postgres-backed Repository via Drizzle (`createDb()` from @high-bar/core/db).
 *
 * Idempotency (webhook dedupe + payout local guard) is persisted durably in the
 * existing `audit_log` table under a reserved action — no schema changes, and
 * the dedupe survives restarts. Only the opaque, namespaced key is stored (no
 * amounts, account ids, or PII).
 */
export class DrizzleRepository implements Repository {
  private readonly db: Database;

  readonly idempotency: IdempotencyStore;

  constructor(db: Database) {
    this.db = db;
    this.idempotency = {
      has: async (key: string): Promise<boolean> => {
        const rows = await this.db
          .select({ id: auditLog.id })
          .from(auditLog)
          .where(and(eq(auditLog.action, IDEMPOTENCY_ACTION), eq(auditLog.resourceId, key)))
          .limit(1);
        return rows.length > 0;
      },
      remember: async (key: string): Promise<void> => {
        await this.db.insert(auditLog).values({
          actorType: "system",
          action: IDEMPOTENCY_ACTION,
          resourceType: "dedupe",
          resourceId: key,
          decision: "executed",
        });
      },
    };
  }

  // ---- Users ----
  async createUser(input: NewUser): Promise<User> {
    const [row] = await this.db.insert(users).values(input).returning();
    if (!row) throw new Error("createUser: insert returned no row");
    return row;
  }

  async ensureUserByEmail(input: NewUser): Promise<User> {
    await this.db.insert(users).values(input).onConflictDoNothing({ target: users.email });
    const [row] = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (!row) throw new Error("ensureUserByEmail: user not found after upsert");
    return row;
  }

  async getUser(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  // ---- Experts ----
  async createExpert(input: NewExpert): Promise<Expert> {
    const [row] = await this.db.insert(experts).values(input).returning();
    if (!row) throw new Error("createExpert: insert returned no row");
    return row;
  }

  async getExpert(id: string): Promise<Expert | null> {
    const [row] = await this.db.select().from(experts).where(eq(experts.id, id)).limit(1);
    return row ?? null;
  }

  // ---- Questions ----
  async createQuestion(input: NewQuestion): Promise<Question> {
    const [row] = await this.db.insert(questions).values(input).returning();
    if (!row) throw new Error("createQuestion: insert returned no row");
    return row;
  }

  async getQuestion(id: string): Promise<Question | null> {
    const [row] = await this.db.select().from(questions).where(eq(questions.id, id)).limit(1);
    return row ?? null;
  }

  async updateQuestionStatus(id: string, status: QuestionStatus): Promise<Question | null> {
    const [row] = await this.db
      .update(questions)
      .set({ status })
      .where(eq(questions.id, id))
      .returning();
    return row ?? null;
  }

  async assignExpert(id: string, expertId: string): Promise<Question | null> {
    const [row] = await this.db
      .update(questions)
      .set({ assignedExpertId: expertId })
      .where(eq(questions.id, id))
      .returning();
    return row ?? null;
  }

  // ---- Answers ----
  async createAnswer(input: NewAnswer): Promise<Answer> {
    const [row] = await this.db.insert(answers).values(input).returning();
    if (!row) throw new Error("createAnswer: insert returned no row");
    return row;
  }

  async getAnswer(id: string): Promise<Answer | null> {
    const [row] = await this.db.select().from(answers).where(eq(answers.id, id)).limit(1);
    return row ?? null;
  }

  async latestAnswerForQuestion(questionId: string): Promise<Answer | null> {
    const [row] = await this.db
      .select()
      .from(answers)
      .where(eq(answers.questionId, questionId))
      .orderBy(desc(answers.createdAt))
      .limit(1);
    return row ?? null;
  }

  // ---- Payments ----
  async createPayment(input: NewPayment): Promise<Payment> {
    const [row] = await this.db.insert(payments).values(input).returning();
    if (!row) throw new Error("createPayment: insert returned no row");
    return row;
  }

  async getPaymentByQuestion(questionId: string): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.questionId, questionId))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    return row ?? null;
  }

  async getPaymentByIntentId(stripePaymentIntentId: string): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
      .limit(1);
    return row ?? null;
  }

  async updatePaymentStatusByIntentId(
    stripePaymentIntentId: string,
    status: PaymentStatus,
  ): Promise<Payment | null> {
    const [row] = await this.db
      .update(payments)
      .set({ status })
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
      .returning();
    return row ?? null;
  }

  // ---- Payouts ----
  async createPayout(input: NewPayout): Promise<Payout> {
    const [row] = await this.db.insert(payouts).values(input).returning();
    if (!row) throw new Error("createPayout: insert returned no row");
    return row;
  }

  async getPayout(id: string): Promise<Payout | null> {
    const [row] = await this.db.select().from(payouts).where(eq(payouts.id, id)).limit(1);
    return row ?? null;
  }

  async setPayoutTransfer(
    id: string,
    stripeTransferId: string | null,
    status: PayoutStatus,
  ): Promise<Payout | null> {
    const [row] = await this.db
      .update(payouts)
      .set({ stripeTransferId, status })
      .where(eq(payouts.id, id))
      .returning();
    return row ?? null;
  }

  async updatePayoutStatusByTransferId(
    stripeTransferId: string,
    status: PayoutStatus,
  ): Promise<Payout | null> {
    const [row] = await this.db
      .update(payouts)
      .set({ status })
      .where(eq(payouts.stripeTransferId, stripeTransferId))
      .returning();
    return row ?? null;
  }

  // ---- Leads ----
  async upsertLead(input: NewLead): Promise<Lead> {
    const [row] = await this.db.insert(leads).values(input).returning();
    if (!row) throw new Error("upsertLead: insert returned no row");
    return row;
  }

  // ---- API keys ----
  async lookupApiKey(hashedKey: string): Promise<ApiKeyRecord | null> {
    const [row] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.hashedKey, hashedKey))
      .limit(1);
    if (!row || row.revokedAt !== null) return null;
    return { scopes: row.scopes, rateLimitPerMin: row.rateLimitPerMin };
  }

  // ---- Audit ----
  async recordAudit(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLog).values({
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      decision: entry.decision,
      reason: entry.reason ?? null,
      payload: entry.payload ?? null,
    });
  }

  // ---- Daily totals (best-effort; PayoutPolicyEngine falls back to this when
  //      no atomic reserve is exposed). For production-grade concurrency safety
  //      a dedicated atomic counter table is recommended. ----
  async sentTodayCents(): Promise<number> {
    const rows = await this.db
      .select({ amountCents: payouts.amountCents })
      .from(payouts)
      .where(
        and(
          inArray(payouts.status, ["approved", "sent"]),
          gte(payouts.createdAt, startOfUtcDay(new Date())),
        ),
      );
    return rows.reduce((sum, r) => sum + r.amountCents, 0);
  }
}
