import { describe, it, expect } from "vitest";
import {
  ACCOUNTS,
  Journal,
  assertBalanced,
  credit,
  debit,
  journalForAuthorization,
  journalForCancel,
  journalForCapture,
  journalForIncomeTaxSetAside,
  journalForPayout,
  journalForRefund,
  UnbalancedEntryError,
  computeSplit,
  type JournalEntry,
  type TaxConfig,
} from "../index";

const CONFIG: TaxConfig = {
  platformTakeRate: 0.2,
  vatRate: 0.2,
  incomeTaxRate: 0.19,
  vatInclusive: true,
};

function entriesFor(orderId: string) {
  const split = computeSplit(10_000, 320, CONFIG);
  return [
    journalForAuthorization(orderId, split.orderAmountCents),
    journalForCapture(orderId, split),
    journalForIncomeTaxSetAside(orderId, split.incomeTaxSetAsideCents),
    journalForPayout(orderId, split.expertAmountCents),
    journalForRefund(orderId, split),
    journalForCancel(orderId, split.orderAmountCents),
  ];
}

describe("ledger entry balancing", () => {
  it("every generated journal entry has debits === credits", () => {
    for (const entry of entriesFor("order_1")) {
      const { debitCents, creditCents } = assertBalanced(entry);
      expect(debitCents).toBe(creditCents);
    }
  });

  it("authorization and cancel are memo-only (no postings)", () => {
    expect(journalForAuthorization("o", 5_000).postings).toHaveLength(0);
    expect(journalForCancel("o", 5_000).postings).toHaveLength(0);
  });

  it("Journal.post rejects an unbalanced entry", () => {
    const bad: JournalEntry = {
      memo: "broken",
      event: { type: "manual", memo: "broken" },
      postings: [debit("stripe_cash", 100), credit("platform_revenue", 99)],
    };
    const journal = new Journal();
    expect(() => journal.post(bad)).toThrow(UnbalancedEntryError);
    expect(journal.entries).toHaveLength(0);
  });

  it("trial balance covers exactly the chart of accounts", () => {
    const tb = new Journal().trialBalance();
    expect(Object.keys(tb).sort()).toEqual([...ACCOUNTS].sort());
  });

  it("a balanced manual entry posts and updates the trial balance", () => {
    const journal = new Journal();
    journal.post({
      memo: "seed cash",
      event: { type: "manual", memo: "seed" },
      postings: [debit("stripe_cash", 1_000), credit("platform_revenue", 1_000)],
    });
    expect(journal.balance("stripe_cash")).toBe(1_000);
    expect(journal.balance("platform_revenue")).toBe(1_000);
  });
});
