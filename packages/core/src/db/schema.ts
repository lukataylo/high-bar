import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---- Enums (mirror src/domain/enums.ts) ----
export const userRoleEnum = pgEnum("user_role", ["asker", "expert", "admin"]);
export const askerTypeEnum = pgEnum("asker_type", ["human", "agent"]);
export const domainEnum = pgEnum("domain", [
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
export const expertStatusEnum = pgEnum("expert_status", ["pending", "vetted", "suspended"]);
export const kycStatusEnum = pgEnum("kyc_status", ["unverified", "pending", "verified", "rejected"]);
export const questionStatusEnum = pgEnum("question_status", [
  "draft",
  "awaiting_payment",
  "open",
  "assigned",
  "answered",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);
export const answerStatusEnum = pgEnum("answer_status", ["submitted", "accepted", "rejected"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "authorized",
  "captured",
  "voided",
  "refunded",
  "failed",
]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "approved", "sent", "failed"]);
export const leadKindEnum = pgEnum("lead_kind", ["expert_candidate", "customer_candidate"]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "qualified",
  "disqualified",
  "contacted",
  "converted",
]);
export const outreachChannelEnum = pgEnum("outreach_channel", ["linkedin", "email"]);
export const outreachStatusEnum = pgEnum("outreach_status", ["draft", "approved", "sent", "declined"]);
export const actionDecisionEnum = pgEnum("action_decision", ["proposed", "allowed", "denied", "executed"]);
export const actorTypeEnum = pgEnum("actor_type", ["agent", "user", "system"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

// ---- Users ----
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("asker"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---- Experts ----
export const experts = pgTable("experts", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  status: expertStatusEnum("status").notNull().default("pending"),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("unverified"),
  // Stripe Connect Express connected-account id (acct_...). Payout-eligible only when set + verified.
  stripeConnectAccountId: text("stripe_connect_account_id"),
  hourlyRateCents: integer("hourly_rate_cents"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  userIdx: index("experts_user_idx").on(t.userId),
}));

export const expertDomains = pgTable("expert_domains", {
  expertId: uuid("expert_id").notNull().references(() => experts.id, { onDelete: "cascade" }),
  domain: domainEnum("domain").notNull(),
}, (t) => ({
  pk: uniqueIndex("expert_domains_pk").on(t.expertId, t.domain),
}));

// ---- Questions ----
export const questions = pgTable("questions", {
  id: id(),
  askerId: uuid("asker_id").notNull().references(() => users.id),
  askerType: askerTypeEnum("asker_type").notNull().default("human"),
  domain: domainEnum("domain").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: questionStatusEnum("status").notNull().default("draft"),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  slaHours: integer("sla_hours").notNull().default(48),
  assignedExpertId: uuid("assigned_expert_id").references(() => experts.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  statusIdx: index("questions_status_idx").on(t.status),
  domainIdx: index("questions_domain_idx").on(t.domain),
}));

// ---- Answers ----
export const answers = pgTable("answers", {
  id: id(),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  expertId: uuid("expert_id").notNull().references(() => experts.id),
  body: text("body").notNull(),
  status: answerStatusEnum("status").notNull().default("submitted"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  questionIdx: index("answers_question_idx").on(t.questionId),
}));

// ---- Payments (charge the asker; Stripe PaymentIntent, manual capture) ----
export const payments = pgTable("payments", {
  id: id(),
  questionId: uuid("question_id").notNull().references(() => questions.id),
  provider: text("provider").notNull().default("stripe"),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
  status: paymentStatusEnum("status").notNull().default("authorized"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  questionIdx: index("payments_question_idx").on(t.questionId),
  piIdx: uniqueIndex("payments_pi_idx").on(t.stripePaymentIntentId),
}));

// ---- Payouts (pay the expert; Stripe Connect Transfer) ----
export const payouts = pgTable("payouts", {
  id: id(),
  answerId: uuid("answer_id").notNull().references(() => answers.id),
  expertId: uuid("expert_id").notNull().references(() => experts.id),
  provider: text("provider").notNull().default("stripe"),
  stripeTransferId: text("stripe_transfer_id"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: payoutStatusEnum("status").notNull().default("pending"),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  expertIdx: index("payouts_expert_idx").on(t.expertId),
}));

// ---- Leads (biz-dev: candidate experts + customers) ----
export const leads = pgTable("leads", {
  id: id(),
  kind: leadKindEnum("kind").notNull(),
  name: text("name").notNull(),
  source: text("source"),
  profileUrl: text("profile_url"),
  domain: domainEnum("domain"),
  score: integer("score").notNull().default(0),
  status: leadStatusEnum("status").notNull().default("new"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  statusIdx: index("leads_status_idx").on(t.status),
  kindIdx: index("leads_kind_idx").on(t.kind),
}));

// ---- Outreach drafts (DRAFT-ONLY; human approves + sends) ----
export const outreachDrafts = pgTable("outreach_drafts", {
  id: id(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  channel: outreachChannelEnum("channel").notNull(),
  body: text("body").notNull(),
  status: outreachStatusEnum("status").notNull().default("draft"),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => ({
  leadIdx: index("outreach_lead_idx").on(t.leadId),
  statusIdx: index("outreach_status_idx").on(t.status),
}));

// ---- Audit log (every agent-proposed side effect: proposed -> allowed/denied -> executed) ----
export const auditLog = pgTable("audit_log", {
  id: id(),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  decision: actionDecisionEnum("decision").notNull(),
  reason: text("reason"),
  payload: jsonb("payload"),
  createdAt: createdAt(),
}, (t) => ({
  actorIdx: index("audit_actor_idx").on(t.actorType, t.actorId),
  resourceIdx: index("audit_resource_idx").on(t.resourceType, t.resourceId),
  createdIdx: index("audit_created_idx").on(t.createdAt),
}));

// ---- API keys (scoped access for agent consumers of the public MCP/API) ----
export const apiKeys = pgTable("api_keys", {
  id: id(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // store ONLY a hash of the key, never the raw secret
  hashedKey: text("hashed_key").notNull().unique(),
  scopes: jsonb("scopes").notNull().$type<string[]>().default([]),
  rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => ({
  ownerIdx: index("api_keys_owner_idx").on(t.ownerId),
}));
