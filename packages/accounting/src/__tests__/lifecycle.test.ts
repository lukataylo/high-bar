import { describe, it, expect } from "vitest";
import {
  Journal,
  computeSplit,
  journalForAuthorization,
  journalForCapture,
  journalForIncomeTaxSetAside,
  journalForPayout,
  journalForRefund,
  profitAndLoss,
  outstandingLiabilities,
  taxOwed,
  type TaxConfig,
} from "../index";

const CONFIG: TaxConfig = {
  platformTakeRate: 0.2,
  vatRate: 0.2,
  incomeTaxRate: 0.19,
  vatInclusive: true,
};

describe("full order lifecycle", () => {
  it("authorize -> capture -> set-aside -> payout leaves a clean ledger", () => {
    const split = computeSplit(10_000, 320, CONFIG);
    const journal = new Journal();

    journal.post(journalForAuthorization("o1", split.orderAmountCents));
    journal.post(journalForCapture("o1", split));
    journal.post(journalForIncomeTaxSetAside("o1", split.incomeTaxSetAsideCents));
    journal.post(journalForPayout("o1", split.expertAmountCents));

    const tb = journal.trialBalance();

    // Expert fully paid -> nothing owed.
    expect(tb.expert_payable).toBe(0);
    // Escrow fully released.
    expect(tb.escrow_liability).toBe(0);
    // Platform revenue = net fee.
    expect(tb.platform_revenue).toBe(1_667);
    // Tax payable = VAT (333) + income-tax set-aside (256).
    expect(tb.tax_payable).toBe(589);
    expect(taxOwed(journal)).toBe(589);
    // Cash = order - processor fee - payout.
    expect(tb.stripe_cash).toBe(10_000 - 320 - 8_000);
    expect(tb.processor_fees).toBe(320);

    // P&L: revenue - processor - income tax.
    const pnl = profitAndLoss(journal);
    expect(pnl.revenueCents).toBe(1_667);
    expect(pnl.processorFeesCents).toBe(320);
    expect(pnl.incomeTaxExpenseCents).toBe(256);
    expect(pnl.netProfitCents).toBe(1_667 - 320 - 256);

    // Retained profit == cash on hand once tax is settled.
    expect(tb.stripe_cash - tb.tax_payable).toBe(pnl.netProfitCents);

    const liabilities = outstandingLiabilities(journal);
    expect(liabilities.expertPayableCents).toBe(0);
    expect(liabilities.escrowLiabilityCents).toBe(0);
    expect(liabilities.taxPayableCents).toBe(589);
  });

  it("refund before payout reverses the recognised split", () => {
    const split = computeSplit(10_000, 320, CONFIG);
    const journal = new Journal();
    journal.post(journalForCapture("o2", split));
    journal.post(journalForRefund("o2", split));

    const tb = journal.trialBalance();
    // Revenue/VAT/expert obligations all reversed.
    expect(tb.expert_payable).toBe(0);
    expect(tb.tax_payable).toBe(0);
    expect(tb.refunds).toBe(1_667);
    // platform_revenue recognised then given back via `refunds`.
    expect(profitAndLoss(journal).netRevenueCents).toBe(0);
    // The processor fee is NOT recovered: cash net is exactly -fee.
    expect(tb.stripe_cash).toBe(-320);
    expect(tb.processor_fees).toBe(320);
    // P&L net profit equals the absorbed processor fee loss.
    expect(profitAndLoss(journal).netProfitCents).toBe(-320);
  });
});
