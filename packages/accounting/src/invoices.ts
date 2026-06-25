import type { Cents } from "./money";
import { formatMoney } from "./money";
import type { OrderSplit } from "./tax";
import { EXPERT_TAX_REPORTING_NOTE } from "./tax";

/**
 * Invoicing: pure, typed data structures plus render-to-text helpers. No I/O,
 * no PDF — just the canonical shapes the gateway/app renders or stores.
 */

export interface InvoiceLineItem {
  readonly description: string;
  /** Net (ex-VAT) amount of the line, in cents. */
  readonly netCents: Cents;
  /** VAT applied to the line, in cents (0 where not applicable). */
  readonly vatCents: Cents;
}

/** A VAT invoice issued to the asker for a single order. */
export interface Invoice {
  readonly invoiceId: string;
  readonly orderId: string;
  /** Asker the invoice is addressed to (id or display label — no PII required). */
  readonly issuedTo: string;
  readonly currency: string;
  readonly lineItems: readonly InvoiceLineItem[];
  /** Sum of line net amounts, in cents. */
  readonly subtotalCents: Cents;
  /** Sum of line VAT amounts, in cents. */
  readonly vatCents: Cents;
  /** subtotal + vat, in cents — what the asker pays. */
  readonly totalCents: Cents;
}

export interface BuildAskerInvoiceParams {
  readonly invoiceId: string;
  readonly orderId: string;
  readonly issuedTo: string;
  readonly currency: string;
  readonly split: OrderSplit;
}

/**
 * Builds the asker's VAT invoice from an order split. The expert's answer fee is
 * shown without platform VAT (it is the expert's own supply); the platform
 * service fee carries the VAT line. Totals re-sum to the gross order amount.
 */
export function buildAskerInvoice(params: BuildAskerInvoiceParams): Invoice {
  const { split } = params;
  const lineItems: InvoiceLineItem[] = [
    {
      description: "Expert answer",
      netCents: split.expertAmountCents,
      vatCents: 0,
    },
    {
      description: "Platform service fee",
      netCents: split.platformFeeNetCents,
      vatCents: split.vatCents,
    },
  ];
  const subtotalCents = lineItems.reduce((sum, li) => sum + li.netCents, 0);
  const vatCents = lineItems.reduce((sum, li) => sum + li.vatCents, 0);
  return {
    invoiceId: params.invoiceId,
    orderId: params.orderId,
    issuedTo: params.issuedTo,
    currency: params.currency,
    lineItems,
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
  };
}

/** A payout statement issued to the expert for a single order. */
export interface PayoutStatement {
  readonly statementId: string;
  readonly orderId: string;
  readonly expertId: string;
  readonly currency: string;
  /** Gross order value the payout derives from, in cents. */
  readonly grossCents: Cents;
  /** Platform commission deducted (VAT-inclusive), in cents. */
  readonly platformFeeCents: Cents;
  /** Net amount transferred to the expert, in cents. */
  readonly netCents: Cents;
  /** Expert tax-reporting responsibility note. */
  readonly taxNote: string;
}

export interface BuildPayoutStatementParams {
  readonly statementId: string;
  readonly orderId: string;
  readonly expertId: string;
  readonly currency: string;
  readonly split: OrderSplit;
}

/** Builds the expert's payout statement (gross / platform fee / net). */
export function buildPayoutStatement(params: BuildPayoutStatementParams): PayoutStatement {
  const { split } = params;
  return {
    statementId: params.statementId,
    orderId: params.orderId,
    expertId: params.expertId,
    currency: params.currency,
    grossCents: split.orderAmountCents,
    platformFeeCents: split.platformFeeGrossCents,
    netCents: split.expertAmountCents,
    taxNote: EXPERT_TAX_REPORTING_NOTE.summary,
  };
}

/** Renders an invoice as plain text. */
export function renderInvoiceText(invoice: Invoice): string {
  const lines: string[] = [];
  lines.push(`INVOICE ${invoice.invoiceId}`);
  lines.push(`Order:   ${invoice.orderId}`);
  lines.push(`Bill to: ${invoice.issuedTo}`);
  lines.push("");
  for (const li of invoice.lineItems) {
    const vat = li.vatCents > 0 ? ` (+VAT ${formatMoney(li.vatCents, invoice.currency)})` : "";
    lines.push(`  ${li.description}: ${formatMoney(li.netCents, invoice.currency)}${vat}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${formatMoney(invoice.subtotalCents, invoice.currency)}`);
  lines.push(`VAT:      ${formatMoney(invoice.vatCents, invoice.currency)}`);
  lines.push(`Total:    ${formatMoney(invoice.totalCents, invoice.currency)}`);
  return lines.join("\n");
}

/** Renders a payout statement as plain text. */
export function renderPayoutStatementText(statement: PayoutStatement): string {
  const lines: string[] = [];
  lines.push(`PAYOUT STATEMENT ${statement.statementId}`);
  lines.push(`Order:  ${statement.orderId}`);
  lines.push(`Expert: ${statement.expertId}`);
  lines.push("");
  lines.push(`Gross:        ${formatMoney(statement.grossCents, statement.currency)}`);
  lines.push(`Platform fee: -${formatMoney(statement.platformFeeCents, statement.currency)}`);
  lines.push(`Net payout:   ${formatMoney(statement.netCents, statement.currency)}`);
  lines.push("");
  lines.push(statement.taxNote);
  return lines.join("\n");
}
