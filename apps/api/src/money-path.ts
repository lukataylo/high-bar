import type { PolicyEngine, ProposedAction } from "@high-bar/core";
import {
  type Journal,
  computeSplit,
  estimateProcessorFee,
  journalForCapture,
  journalForIncomeTaxSetAside,
  journalForPayout,
} from "@high-bar/accounting";
import {
  capturePayment,
  createPayoutOnce,
  type PayoutAttempt,
  type StripeClient,
} from "@high-bar/payments";
import type { FinanceConfig } from "./finance.js";
import type { Repository } from "./repository.js";

/** Error carrying an HTTP status so the route can map money-path failures cleanly. */
export class AcceptError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AcceptError";
    this.status = status;
    this.code = code;
  }
}

export type AcceptOutcome =
  | { decision: "executed"; payoutId: string; transferId: string | null; amountCents: number }
  | { decision: "pending_approval"; payoutId: string; amountCents: number; reason: string }
  | { decision: "denied"; reason: string };

export interface MoneyPathDeps {
  repo: Repository;
  stripe: StripeClient;
  journal: Journal;
  finance: FinanceConfig;
  /** Guardrail engine for payout.create (eligibility, daily cap, threshold, kill switch). */
  policy: PolicyEngine;
}

/**
 * Accept an answered question: capture the escrow, then run the expert payout
 * through the guardrails.
 *
 * Guardrails + idempotency:
 *  - capture uses a deterministic idempotency key (no double-capture);
 *  - EVERY money decision is audited (proposed -> allowed/denied -> executed);
 *  - the executor (`createPayoutOnce`) is reached ONLY after an ALLOW with no
 *    human-approval gate, and is itself guarded by the Repository idempotency
 *    store AND a Stripe idempotency key (no double-pay);
 *  - over-threshold payouts are parked as `pending` (requiresApproval) and the
 *    executor is never called;
 *  - a tentative daily-cap reservation is released when the payout does not
 *    execute (parked for approval, or a failed transfer).
 *  - ledger entries are posted so debits === credits for every event.
 */
export async function acceptQuestion(
  deps: MoneyPathDeps,
  questionId: string,
): Promise<AcceptOutcome> {
  const { repo, stripe, journal, finance, policy } = deps;

  const question = await repo.getQuestion(questionId);
  if (!question) throw new AcceptError(404, "question_not_found", "Question not found");
  if (question.status !== "answered") {
    throw new AcceptError(409, "not_answerable", `Question is ${question.status}, not answered`);
  }

  const answer = await repo.latestAnswerForQuestion(questionId);
  if (!answer) throw new AcceptError(409, "no_answer", "Question has no answer to accept");

  const expert = await repo.getExpert(answer.expertId);
  if (!expert) throw new AcceptError(409, "expert_missing", "Answer expert not found");

  const payment = await repo.getPaymentByQuestion(questionId);
  if (!payment) throw new AcceptError(409, "no_payment", "No escrow payment for question");

  // 1. Capture the escrow hold (manual-capture PaymentIntent). Deterministic key.
  await capturePayment(stripe, payment.stripePaymentIntentId, `capture:${payment.stripePaymentIntentId}`);
  await repo.updatePaymentStatusByIntentId(payment.stripePaymentIntentId, "captured");
  await repo.recordAudit({
    actorType: "system",
    action: "question.capture",
    resourceType: "payment",
    resourceId: payment.id,
    decision: "executed",
    reason: "Escrow captured on answer acceptance.",
  });

  // 2. Ledger: capture + income-tax set-aside (balanced entries).
  const processorFeeCents = estimateProcessorFee(question.priceCents, finance.processor);
  const split = computeSplit(question.priceCents, processorFeeCents, finance.tax);
  journal.post(journalForCapture(question.id, split));
  if (split.incomeTaxSetAsideCents > 0) {
    journal.post(journalForIncomeTaxSetAside(question.id, split.incomeTaxSetAsideCents));
  }

  await repo.updateQuestionStatus(question.id, "accepted");

  // 3. Propose the expert payout — the runtime/asker can only PROPOSE; the
  //    PolicyEngine decides what actually moves money.
  const amountCents = split.expertAmountCents;
  const action: ProposedAction = {
    type: "payout.create",
    answerId: answer.id,
    expertId: expert.id,
    amountCents,
  };
  await repo.recordAudit({
    actorType: "agent",
    action: "payout.create",
    resourceType: "answer",
    resourceId: answer.id,
    decision: "proposed",
    reason: "Expert payout proposed on accepted answer.",
  });

  const decision = await policy.evaluate(action);
  await repo.recordAudit({
    actorType: "agent",
    action: "payout.create",
    resourceType: "answer",
    resourceId: answer.id,
    decision: decision.allowed ? "allowed" : "denied",
    reason: decision.reason,
  });

  // 4a. DENIED — no payout row, executor never called.
  if (!decision.allowed) {
    return { decision: "denied", reason: decision.reason };
  }

  const idempotencyKey = `payout:${answer.id}`;

  // 4b. ALLOWED but human-gated — park as pending, never execute. Release the
  //     tentative reservation so the cap is not consumed while parked.
  if (decision.requiresHumanApproval) {
    const payout = await repo.createPayout({
      answerId: answer.id,
      expertId: expert.id,
      amountCents,
      currency: question.currency,
      status: "pending",
      requiresApproval: true,
      idempotencyKey,
    });
    await repo.releaseDailyAmount?.(amountCents);
    return {
      decision: "pending_approval",
      payoutId: payout.id,
      amountCents,
      reason: decision.reason,
    };
  }

  // 4c. ALLOWED + auto — execute the payout under the idempotency guard.
  const connectedAccountId = expert.stripeConnectAccountId;
  if (connectedAccountId === null || connectedAccountId.trim() === "") {
    // Defense-in-depth; the policy already requires a connected account.
    throw new AcceptError(409, "no_connect_account", "Expert has no connected payout account");
  }

  const payout = await repo.createPayout({
    answerId: answer.id,
    expertId: expert.id,
    amountCents,
    currency: question.currency,
    status: "approved",
    requiresApproval: false,
    idempotencyKey,
  });

  let attempt: PayoutAttempt;
  try {
    attempt = await createPayoutOnce(
      stripe,
      {
        answerId: answer.id,
        expertId: expert.id,
        connectedAccountId,
        amountCents,
        currency: question.currency,
        idempotencyKey,
      },
      repo.idempotency,
    );
  } catch (err) {
    await repo.setPayoutTransfer(payout.id, null, "failed");
    await repo.releaseDailyAmount?.(amountCents);
    await repo.recordAudit({
      actorType: "agent",
      action: "payout.create",
      resourceType: "payout",
      resourceId: payout.id,
      decision: "denied",
      reason: "Payout transfer failed at the processor.",
    });
    throw new AcceptError(502, "payout_failed", "Expert payout failed at the processor");
  }

  if (attempt.kind === "duplicate") {
    // A prior execution already issued the transfer; do not re-post the ledger.
    await repo.setPayoutTransfer(payout.id, null, "sent");
    return { decision: "executed", payoutId: payout.id, transferId: null, amountCents };
  }

  await repo.setPayoutTransfer(payout.id, attempt.transferId, "sent");
  journal.post(journalForPayout(question.id, amountCents));
  await repo.recordAudit({
    actorType: "agent",
    action: "payout.create",
    resourceType: "payout",
    resourceId: payout.id,
    decision: "executed",
    reason: "Expert payout transfer created.",
  });

  return {
    decision: "executed",
    payoutId: payout.id,
    transferId: attempt.transferId,
    amountCents,
  };
}
