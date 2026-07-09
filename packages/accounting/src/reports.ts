import type { Cents } from "./money";
import type { Journal } from "./ledger";

/**
 * Financial reports derived purely from the ledger trial balance. VAT is a
 * pass-through liability and is intentionally EXCLUDED from the P&L; income tax
 * IS an expense and reduces net profit.
 */

export interface ProfitAndLoss {
  /** Recognised platform revenue, net of VAT, in cents. */
  readonly revenueCents: Cents;
  /** Value returned to askers, in cents. */
  readonly refundsCents: Cents;
  /** revenue - refunds, in cents. */
  readonly netRevenueCents: Cents;
  /** Processing fees absorbed, in cents. */
  readonly processorFeesCents: Cents;
  /** Income/corporation tax provision expensed, in cents. */
  readonly incomeTaxExpenseCents: Cents;
  /** net revenue - processor fees - income tax expense, in cents. */
  readonly netProfitCents: Cents;
}

export function profitAndLoss(journal: Journal): ProfitAndLoss {
  const tb = journal.trialBalance();
  const revenueCents = tb.platform_revenue;
  const refundsCents = tb.refunds;
  const processorFeesCents = tb.processor_fees;
  const incomeTaxExpenseCents = tb.income_tax_expense;
  const netRevenueCents = revenueCents - refundsCents;
  return {
    revenueCents,
    refundsCents,
    netRevenueCents,
    processorFeesCents,
    incomeTaxExpenseCents,
    netProfitCents: netRevenueCents - processorFeesCents - incomeTaxExpenseCents,
  };
}

/** Outstanding obligations the platform is currently carrying, in cents. */
export interface OutstandingLiabilities {
  /** Asker funds held against authorized-but-not-yet-recognised orders. */
  readonly escrowLiabilityCents: Cents;
  /** Amounts owed to experts not yet paid out. */
  readonly expertPayableCents: Cents;
  /** VAT collected + income-tax set-aside owed to tax authorities. */
  readonly taxPayableCents: Cents;
}

export function outstandingLiabilities(journal: Journal): OutstandingLiabilities {
  const tb = journal.trialBalance();
  return {
    escrowLiabilityCents: tb.escrow_liability,
    expertPayableCents: tb.expert_payable,
    taxPayableCents: tb.tax_payable,
  };
}

/** Total tax currently owed (VAT collected + income-tax set-aside), in cents. */
export function taxOwed(journal: Journal): Cents {
  return journal.balance("tax_payable");
}

/** Cash currently held in the Stripe balance, per the ledger, in cents. */
export function cashOnHand(journal: Journal): Cents {
  return journal.balance("stripe_cash");
}
