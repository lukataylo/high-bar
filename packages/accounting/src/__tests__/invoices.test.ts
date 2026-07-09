import { describe, it, expect } from "vitest";
import {
  buildAskerInvoice,
  buildPayoutStatement,
  computeSplit,
  renderInvoiceText,
  renderPayoutStatementText,
  type TaxConfig,
} from "../index";

const CONFIG: TaxConfig = {
  platformTakeRate: 0.2,
  vatRate: 0.2,
  incomeTaxRate: 0.19,
  vatInclusive: true,
};

describe("invoicing", () => {
  const split = computeSplit(10_000, 320, CONFIG);

  it("asker invoice totals re-sum to the gross order amount", () => {
    const invoice = buildAskerInvoice({
      invoiceId: "inv_1",
      orderId: "o1",
      issuedTo: "asker_1",
      currency: "gbp",
      split,
    });
    expect(invoice.subtotalCents).toBe(8_000 + 1_667);
    expect(invoice.vatCents).toBe(333);
    expect(invoice.totalCents).toBe(10_000);
    expect(invoice.totalCents).toBe(split.orderAmountCents);
    const text = renderInvoiceText(invoice);
    expect(text).toContain("Total:");
    expect(text).toContain("100.00 GBP");
  });

  it("payout statement is gross / fee / net and re-sums", () => {
    const statement = buildPayoutStatement({
      statementId: "ps_1",
      orderId: "o1",
      expertId: "exp_1",
      currency: "gbp",
      split,
    });
    expect(statement.grossCents).toBe(10_000);
    expect(statement.platformFeeCents).toBe(2_000);
    expect(statement.netCents).toBe(8_000);
    expect(statement.grossCents - statement.platformFeeCents).toBe(statement.netCents);
    const stmtText = renderPayoutStatementText(statement);
    expect(stmtText).toContain("Net payout:");
    expect(stmtText).toContain("80.00 GBP");
    expect(stmtText).toContain("responsible for their own income tax");
  });
});
