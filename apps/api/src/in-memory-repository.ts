import { randomUUID } from "node:crypto";
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
import { hashApiKey } from "@high-bar/mcp-expert-network";
import type { Repository } from "./repository.js";

/** Seed shape for an in-memory API key (raw secret hashed on insert, then discarded). */
export interface SeedApiKey {
  readonly rawKey: string;
  readonly scopes: readonly string[];
  readonly rateLimitPerMin: number;
}

interface StoredApiKey extends ApiKeyRecord {
  readonly revoked: boolean;
}

function startOfUtcDay(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * Process-local, dependency-free Repository for tests and local dev. JavaScript's
 * single-threaded model makes the daily-cap reserve atomic in-process, so the
 * concurrency-safe `reserveDailyAmount` path of the PayoutPolicyEngine is
 * exercised exactly as production would use a DB-level atomic counter.
 */
export class InMemoryRepository implements Repository {
  private readonly users = new Map<string, User>();
  private readonly experts = new Map<string, Expert>();
  private readonly questions = new Map<string, Question>();
  private readonly answers = new Map<string, Answer>();
  private readonly payments = new Map<string, Payment>();
  private readonly payouts = new Map<string, Payout>();
  private readonly leads = new Map<string, Lead>();
  private readonly apiKeys = new Map<string, StoredApiKey>();
  private readonly auditLog: AuditEntry[] = [];
  private readonly seenKeys = new Set<string>();
  private readonly dailyTotals = new Map<number, number>();
  private readonly now: () => Date;

  readonly idempotency: IdempotencyStore = {
    has: (key: string): Promise<boolean> => Promise.resolve(this.seenKeys.has(key)),
    remember: (key: string): Promise<void> => {
      this.seenKeys.add(key);
      return Promise.resolve();
    },
  };

  constructor(opts: { now?: () => Date } = {}) {
    this.now = opts.now ?? (() => new Date());
  }

  // ---- test/dev introspection ----
  get auditEntries(): readonly AuditEntry[] {
    return this.auditLog;
  }

  seedApiKey(seed: SeedApiKey): void {
    this.apiKeys.set(hashApiKey(seed.rawKey), {
      scopes: [...seed.scopes],
      rateLimitPerMin: seed.rateLimitPerMin,
      revoked: false,
    });
  }

  // ---- Users ----
  createUser(input: NewUser): Promise<User> {
    const ts = this.now();
    const user: User = {
      id: input.id ?? randomUUID(),
      email: input.email,
      name: input.name ?? null,
      role: input.role ?? "asker",
      createdAt: input.createdAt ?? ts,
      updatedAt: input.updatedAt ?? ts,
    };
    this.users.set(user.id, user);
    return Promise.resolve(user);
  }

  ensureUserByEmail(input: NewUser): Promise<User> {
    for (const existing of this.users.values()) {
      if (existing.email === input.email) return Promise.resolve(existing);
    }
    return this.createUser(input);
  }

  getUser(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  // ---- Experts ----
  createExpert(input: NewExpert): Promise<Expert> {
    const ts = this.now();
    const expert: Expert = {
      id: input.id ?? randomUUID(),
      userId: input.userId,
      bio: input.bio ?? null,
      status: input.status ?? "pending",
      kycStatus: input.kycStatus ?? "unverified",
      stripeConnectAccountId: input.stripeConnectAccountId ?? null,
      hourlyRateCents: input.hourlyRateCents ?? null,
      createdAt: input.createdAt ?? ts,
      updatedAt: input.updatedAt ?? ts,
    };
    this.experts.set(expert.id, expert);
    return Promise.resolve(expert);
  }

  getExpert(id: string): Promise<Expert | null> {
    return Promise.resolve(this.experts.get(id) ?? null);
  }

  // ---- Questions ----
  createQuestion(input: NewQuestion): Promise<Question> {
    const ts = this.now();
    const question: Question = {
      id: input.id ?? randomUUID(),
      askerId: input.askerId,
      askerType: input.askerType ?? "human",
      domain: input.domain,
      title: input.title,
      body: input.body,
      status: input.status ?? "draft",
      priceCents: input.priceCents,
      currency: input.currency ?? "usd",
      slaHours: input.slaHours ?? 48,
      assignedExpertId: input.assignedExpertId ?? null,
      createdAt: input.createdAt ?? ts,
      updatedAt: input.updatedAt ?? ts,
    };
    this.questions.set(question.id, question);
    return Promise.resolve(question);
  }

  getQuestion(id: string): Promise<Question | null> {
    return Promise.resolve(this.questions.get(id) ?? null);
  }

  updateQuestionStatus(id: string, status: QuestionStatus): Promise<Question | null> {
    const q = this.questions.get(id);
    if (!q) return Promise.resolve(null);
    const next: Question = { ...q, status, updatedAt: this.now() };
    this.questions.set(id, next);
    return Promise.resolve(next);
  }

  assignExpert(id: string, expertId: string): Promise<Question | null> {
    const q = this.questions.get(id);
    if (!q) return Promise.resolve(null);
    const next: Question = { ...q, assignedExpertId: expertId, updatedAt: this.now() };
    this.questions.set(id, next);
    return Promise.resolve(next);
  }

  // ---- Answers ----
  createAnswer(input: NewAnswer): Promise<Answer> {
    const ts = this.now();
    const answer: Answer = {
      id: input.id ?? randomUUID(),
      questionId: input.questionId,
      expertId: input.expertId,
      body: input.body,
      status: input.status ?? "submitted",
      createdAt: input.createdAt ?? ts,
      updatedAt: input.updatedAt ?? ts,
    };
    this.answers.set(answer.id, answer);
    return Promise.resolve(answer);
  }

  getAnswer(id: string): Promise<Answer | null> {
    return Promise.resolve(this.answers.get(id) ?? null);
  }

  latestAnswerForQuestion(questionId: string): Promise<Answer | null> {
    let latest: Answer | null = null;
    for (const a of this.answers.values()) {
      if (a.questionId !== questionId) continue;
      if (latest === null || a.createdAt.getTime() >= latest.createdAt.getTime()) latest = a;
    }
    return Promise.resolve(latest);
  }

  // ---- Payments ----
  createPayment(input: NewPayment): Promise<Payment> {
    const ts = this.now();
    const payment: Payment = {
      id: input.id ?? randomUUID(),
      questionId: input.questionId,
      provider: input.provider ?? "stripe",
      stripePaymentIntentId: input.stripePaymentIntentId,
      status: input.status ?? "authorized",
      amountCents: input.amountCents,
      currency: input.currency ?? "usd",
      idempotencyKey: input.idempotencyKey,
      createdAt: input.createdAt ?? ts,
      updatedAt: input.updatedAt ?? ts,
    };
    this.payments.set(payment.id, payment);
    return Promise.resolve(payment);
  }

  getPaymentByQuestion(questionId: string): Promise<Payment | null> {
    for (const p of this.payments.values()) {
      if (p.questionId === questionId) return Promise.resolve(p);
    }
    return Promise.resolve(null);
  }

  getPaymentByIntentId(stripePaymentIntentId: string): Promise<Payment | null> {
    for (const p of this.payments.values()) {
      if (p.stripePaymentIntentId === stripePaymentIntentId) return Promise.resolve(p);
    }
    return Promise.resolve(null);
  }

  updatePaymentStatusByIntentId(
    stripePaymentIntentId: string,
    status: PaymentStatus,
  ): Promise<Payment | null> {
    for (const [id, p] of this.payments) {
      if (p.stripePaymentIntentId === stripePaymentIntentId) {
        const next: Payment = { ...p, status, updatedAt: this.now() };
        this.payments.set(id, next);
        return Promise.resolve(next);
      }
    }
    return Promise.resolve(null);
  }

  // ---- Payouts ----
  createPayout(input: NewPayout): Promise<Payout> {
    const ts = this.now();
    const payout: Payout = {
      id: input.id ?? randomUUID(),
      answerId: input.answerId,
      expertId: input.expertId,
      provider: input.provider ?? "stripe",
      stripeTransferId: input.stripeTransferId ?? null,
      amountCents: input.amountCents,
      currency: input.currency ?? "usd",
      status: input.status ?? "pending",
      requiresApproval: input.requiresApproval ?? false,
      approvedByUserId: input.approvedByUserId ?? null,
      idempotencyKey: input.idempotencyKey,
      createdAt: input.createdAt ?? ts,
      updatedAt: input.updatedAt ?? ts,
    };
    this.payouts.set(payout.id, payout);
    return Promise.resolve(payout);
  }

  getPayout(id: string): Promise<Payout | null> {
    return Promise.resolve(this.payouts.get(id) ?? null);
  }

  setPayoutTransfer(
    id: string,
    stripeTransferId: string | null,
    status: PayoutStatus,
  ): Promise<Payout | null> {
    const p = this.payouts.get(id);
    if (!p) return Promise.resolve(null);
    const next: Payout = { ...p, stripeTransferId, status, updatedAt: this.now() };
    this.payouts.set(id, next);
    return Promise.resolve(next);
  }

  updatePayoutStatusByTransferId(
    stripeTransferId: string,
    status: PayoutStatus,
  ): Promise<Payout | null> {
    for (const [id, p] of this.payouts) {
      if (p.stripeTransferId === stripeTransferId) {
        const next: Payout = { ...p, status, updatedAt: this.now() };
        this.payouts.set(id, next);
        return Promise.resolve(next);
      }
    }
    return Promise.resolve(null);
  }

  // ---- Leads ----
  upsertLead(input: NewLead): Promise<Lead> {
    const ts = this.now();
    const lead: Lead = {
      id: input.id ?? randomUUID(),
      kind: input.kind,
      name: input.name,
      source: input.source ?? null,
      profileUrl: input.profileUrl ?? null,
      domain: input.domain ?? null,
      score: input.score ?? 0,
      status: input.status ?? "new",
      notes: input.notes ?? null,
      createdAt: input.createdAt ?? ts,
      updatedAt: input.updatedAt ?? ts,
    };
    this.leads.set(lead.id, lead);
    return Promise.resolve(lead);
  }

  // ---- API keys ----
  lookupApiKey(hashedKey: string): Promise<ApiKeyRecord | null> {
    const found = this.apiKeys.get(hashedKey);
    if (!found || found.revoked) return Promise.resolve(null);
    return Promise.resolve({ scopes: found.scopes, rateLimitPerMin: found.rateLimitPerMin });
  }

  // ---- Audit ----
  recordAudit(entry: AuditEntry): Promise<void> {
    this.auditLog.push(entry);
    return Promise.resolve();
  }

  // ---- Daily totals ----
  sentTodayCents(): Promise<number> {
    return Promise.resolve(this.dailyTotals.get(startOfUtcDay(this.now())) ?? 0);
  }

  reserveDailyAmount(amountCents: number, dailyCapCents: number): Promise<DailyReservation> {
    const day = startOfUtcDay(this.now());
    const current = this.dailyTotals.get(day) ?? 0;
    const next = current + amountCents;
    if (next > dailyCapCents) {
      return Promise.resolve({ reserved: false, sentTodayCents: current });
    }
    this.dailyTotals.set(day, next);
    return Promise.resolve({ reserved: true, sentTodayCents: next });
  }

  releaseDailyAmount(amountCents: number): Promise<void> {
    const day = startOfUtcDay(this.now());
    const current = this.dailyTotals.get(day) ?? 0;
    this.dailyTotals.set(day, Math.max(0, current - amountCents));
    return Promise.resolve();
  }
}
