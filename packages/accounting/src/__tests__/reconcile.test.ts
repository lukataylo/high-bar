import { describe, it, expect } from "vitest";
import {
  Journal,
  ReconciliationDriftError,
  assertReconciled,
  computeSplit,
  journalForCapture,
  journalForPayout,
  reconcile,
  type StripeBalance,
  type StripeBalancePort,
  type TaxConfig,
} from "../index";

const CONFIG: TaxConfig = {
  platformTakeRate: 0.2,
  vatRate: 0.2,
  incomeTaxRate: 0.19,
  vatInclusive: true,
};

function port(balance: StripeBalance, payoutTotalsCents: number): StripeBalancePort {
  return {
    getBalance: async () => balance,
    getPayoutTotalsCents: async () => payoutTotalsCents,
  };
}

function fundedJournal(): Journal {
  const split = computeSplit(10_000, 320, CONFIG);
  const journal = new Journal();
  journal.post(journalForCapture("o1", split));
  journal.post(journalForPayout("o1", split.expertAmountCents));
  return journal;
}

describe("reconciliation", () => {
  it("matches when processor agrees with the ledger", async () => {
    const journal = fundedJournal();
    const ledgerCash = journal.balance("stripe_cash"); // 10000 - 320 - 8000 = 1680
    const report = await reconcile(
      journal,
      port({ availableCents: ledgerCash, pendingCents: 0 }, journal.totalPayoutsCents()),
    );
    expect(report.matched).toBe(true);
    expect(report.mismatches).toHaveLength(0);
  });

  it("flags an injected cash mismatch", async () => {
    const journal = fundedJournal();
    const ledgerCash = journal.balance("stripe_cash");
    const report = await reconcile(
      journal,
      port({ availableCents: ledgerCash + 20, pendingCents: 0 }, journal.totalPayoutsCents()),
    );
    expect(report.matched).toBe(false);
    const cashCheck = report.mismatches.find((c) => c.name === "stripe_cash");
    expect(cashCheck?.deltaCents).toBe(-20);
  });

  it("flags an injected payout-total mismatch", async () => {
    const journal = fundedJournal();
    const ledgerCash = journal.balance("stripe_cash");
    const report = await reconcile(
      journal,
      port({ availableCents: ledgerCash, pendingCents: 0 }, journal.totalPayoutsCents() - 1_000),
    );
    expect(report.matched).toBe(false);
    expect(report.mismatches.map((c) => c.name)).toContain("expert_payouts");
  });

  it("assertReconciled throws loud on drift", async () => {
    const journal = fundedJournal();
    const ledgerCash = journal.balance("stripe_cash");
    await expect(
      assertReconciled(
        journal,
        port({ availableCents: ledgerCash + 1, pendingCents: 0 }, journal.totalPayoutsCents()),
      ),
    ).rejects.toBeInstanceOf(ReconciliationDriftError);
  });

  it("tolerance absorbs a sub-threshold delta", async () => {
    const journal = fundedJournal();
    const ledgerCash = journal.balance("stripe_cash");
    const report = await reconcile(
      journal,
      port({ availableCents: ledgerCash + 2, pendingCents: 0 }, journal.totalPayoutsCents()),
      { toleranceCents: 5 },
    );
    expect(report.matched).toBe(true);
  });
});
