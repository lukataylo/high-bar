import type { Cents } from "./money";
import { assertNonNegativeCents } from "./money";
import type { OrderSplit } from "./tax";
import { UnbalancedEntryError } from "./errors";

/**
 * Double-entry ledger.
 *
 * Every money event maps to one or more balanced journal entries (sum of debits
 * === sum of credits, in integer cents). The `Journal` refuses to record an
 * unbalanced entry. Account natural balances follow normal-side accounting:
 * assets/expenses are debit-normal, liabilities/revenue are credit-normal.
 */

// ---- Chart of accounts ----
export const ACCOUNTS = [
  "stripe_cash", // ASSET  — funds in our Stripe balance
  "escrow_liability", // LIABILITY — asker funds held until an answer is accepted
  "platform_revenue", // REVENUE — recognised platform fee, net of VAT
  "expert_payable", // LIABILITY — amounts owed to experts, pre-payout
  "processor_fees", // EXPENSE — Stripe/card processing fees the platform absorbs
  "refunds", // CONTRA-REVENUE — value returned to askers
  "tax_payable", // LIABILITY — VAT collected + income-tax set-aside owed
  "income_tax_expense", // EXPENSE — income/corporation tax provision
] as const;

export type Account = (typeof ACCOUNTS)[number];

export type NormalSide = "debit" | "credit";

/** Natural (normal) balance side per account — drives reporting sign. */
export const ACCOUNT_NORMAL_SIDE: Record<Account, NormalSide> = {
  stripe_cash: "debit",
  escrow_liability: "credit",
  platform_revenue: "credit",
  expert_payable: "credit",
  processor_fees: "debit",
  refunds: "debit",
  tax_payable: "credit",
  income_tax_expense: "debit",
};

/** A single posting. Exactly one of debit/credit is a positive integer; the other is 0. */
export interface Posting {
  readonly account: Account;
  readonly debitCents: Cents;
  readonly creditCents: Cents;
}

export function debit(account: Account, amountCents: Cents): Posting {
  assertNonNegativeCents(amountCents, `debit ${account}`);
  return { account, debitCents: amountCents, creditCents: 0 };
}

export function credit(account: Account, amountCents: Cents): Posting {
  assertNonNegativeCents(amountCents, `credit ${account}`);
  return { account, debitCents: 0, creditCents: amountCents };
}

// ---- Money events (vocabulary aligned with @high-bar/payments) ----
export type MoneyEvent =
  | { readonly type: "charge_authorized"; readonly orderId: string; readonly amountCents: Cents }
  | { readonly type: "charge_captured"; readonly orderId: string; readonly split: OrderSplit }
  | { readonly type: "income_tax_set_aside"; readonly orderId: string; readonly amountCents: Cents }
  | { readonly type: "expert_payout"; readonly orderId: string; readonly expertAmountCents: Cents }
  | { readonly type: "refund"; readonly orderId: string; readonly split: OrderSplit }
  | { readonly type: "manual"; readonly memo: string };

export interface JournalEntry {
  readonly memo: string;
  readonly event: MoneyEvent;
  readonly postings: readonly Posting[];
}

/** Sums debits and credits of an entry; throws if unbalanced or malformed. */
export function assertBalanced(entry: JournalEntry): { debitCents: Cents; creditCents: Cents } {
  let debitCents = 0;
  let creditCents = 0;
  for (const p of entry.postings) {
    assertNonNegativeCents(p.debitCents, `debit ${p.account}`);
    assertNonNegativeCents(p.creditCents, `credit ${p.account}`);
    debitCents += p.debitCents;
    creditCents += p.creditCents;
  }
  if (debitCents !== creditCents) {
    throw new UnbalancedEntryError(debitCents, creditCents, entry.memo);
  }
  return { debitCents, creditCents };
}

// ---- Event -> journal entry mapping ----

/**
 * Charge AUTHORIZED (manual-capture hold). No cash has settled to our Stripe
 * balance yet, so this is a MEMO-ONLY entry (zero postings, trivially balanced).
 */
export function journalForAuthorization(orderId: string, amountCents: Cents): JournalEntry {
  assertNonNegativeCents(amountCents, "authorized amount");
  return {
    memo: `Authorize escrow hold ${amountCents}c for order ${orderId}`,
    event: { type: "charge_authorized", orderId, amountCents },
    postings: [],
  };
}

/**
 * Charge CAPTURED. Cash settles into our Stripe balance, the escrow is released
 * and recognised as platform revenue (net of VAT), VAT payable, and expert
 * payable; the processor fee is expensed against cash. One balanced entry.
 */
export function journalForCapture(orderId: string, split: OrderSplit): JournalEntry {
  const {
    orderAmountCents,
    platformFeeNetCents,
    vatCents,
    expertAmountCents,
    processorFeeCents,
  } = split;
  const entry: JournalEntry = {
    memo: `Capture order ${orderId}`,
    event: { type: "charge_captured", orderId, split },
    postings: [
      // 1. Cash in, recorded against escrow.
      debit("stripe_cash", orderAmountCents),
      credit("escrow_liability", orderAmountCents),
      // 2. Release escrow and recognise the split.
      debit("escrow_liability", orderAmountCents),
      credit("platform_revenue", platformFeeNetCents),
      credit("tax_payable", vatCents),
      credit("expert_payable", expertAmountCents),
      // 3. Processor fee, absorbed by the platform out of cash.
      debit("processor_fees", processorFeeCents),
      credit("stripe_cash", processorFeeCents),
    ],
  };
  assertBalanced(entry);
  return entry;
}

/**
 * Income-tax SET-ASIDE provision. Recognises the platform's own tax reserve as
 * an expense, increasing `tax_payable`. Posted alongside capture in the
 * lifecycle once net revenue (and thus the processor fee) is known.
 */
export function journalForIncomeTaxSetAside(orderId: string, amountCents: Cents): JournalEntry {
  assertNonNegativeCents(amountCents, "income tax set-aside");
  const entry: JournalEntry = {
    memo: `Income-tax set-aside for order ${orderId}`,
    event: { type: "income_tax_set_aside", orderId, amountCents },
    postings: [debit("income_tax_expense", amountCents), credit("tax_payable", amountCents)],
  };
  assertBalanced(entry);
  return entry;
}

/**
 * Expert PAYOUT (Stripe Connect transfer). Settles what we owed the expert,
 * reducing cash. One balanced entry.
 */
export function journalForPayout(orderId: string, expertAmountCents: Cents): JournalEntry {
  assertNonNegativeCents(expertAmountCents, "payout amount");
  const entry: JournalEntry = {
    memo: `Payout to expert for order ${orderId}`,
    event: { type: "expert_payout", orderId, expertAmountCents },
    postings: [debit("expert_payable", expertAmountCents), credit("stripe_cash", expertAmountCents)],
  };
  assertBalanced(entry);
  return entry;
}

/**
 * REFUND of a captured order, BEFORE the expert payout. Reverses the recognised
 * split and returns the gross to the asker out of cash. The processor fee is NOT
 * recovered (Stripe keeps it) — it remains an expense the platform absorbs. The
 * platform-revenue give-back is routed through `refunds` to preserve gross
 * revenue figures; VAT and expert payable are reversed directly.
 */
export function journalForRefund(orderId: string, split: OrderSplit): JournalEntry {
  const { orderAmountCents, platformFeeNetCents, vatCents, expertAmountCents } = split;
  const entry: JournalEntry = {
    memo: `Refund order ${orderId}`,
    event: { type: "refund", orderId, split },
    postings: [
      debit("refunds", platformFeeNetCents),
      debit("tax_payable", vatCents),
      debit("expert_payable", expertAmountCents),
      credit("stripe_cash", orderAmountCents),
    ],
  };
  assertBalanced(entry);
  return entry;
}

/**
 * CANCEL / VOID of an un-captured authorization. Mirrors authorization: nothing
 * settled, so this is a memo-only entry.
 */
export function journalForCancel(orderId: string, amountCents: Cents): JournalEntry {
  assertNonNegativeCents(amountCents, "cancel amount");
  return {
    memo: `Cancel escrow hold ${amountCents}c for order ${orderId}`,
    event: { type: "charge_authorized", orderId, amountCents },
    postings: [],
  };
}

// ---- The Journal ----

function zeroBalances(): Record<Account, Cents> {
  return {
    stripe_cash: 0,
    escrow_liability: 0,
    platform_revenue: 0,
    expert_payable: 0,
    processor_fees: 0,
    refunds: 0,
    tax_payable: 0,
    income_tax_expense: 0,
  };
}

export class Journal {
  readonly #entries: JournalEntry[] = [];

  /** Records an entry after asserting it balances. Throws on imbalance. */
  post(entry: JournalEntry): JournalEntry {
    assertBalanced(entry);
    this.#entries.push(entry);
    return entry;
  }

  /** Convenience: post many entries in order. */
  postAll(entries: readonly JournalEntry[]): void {
    for (const e of entries) this.post(e);
  }

  get entries(): readonly JournalEntry[] {
    return this.#entries;
  }

  /** Trial balance: natural (normal-side) balance per account, in cents. */
  trialBalance(): Record<Account, Cents> {
    const debits = zeroBalances();
    const credits = zeroBalances();
    for (const entry of this.#entries) {
      for (const p of entry.postings) {
        debits[p.account] += p.debitCents;
        credits[p.account] += p.creditCents;
      }
    }
    const out = zeroBalances();
    for (const account of ACCOUNTS) {
      const natural =
        ACCOUNT_NORMAL_SIDE[account] === "debit"
          ? debits[account] - credits[account]
          : credits[account] - debits[account];
      out[account] = natural;
    }
    return out;
  }

  /** Natural balance of a single account, in cents. */
  balance(account: Account): Cents {
    return this.trialBalance()[account];
  }

  /** Total expert payouts recorded (sum of `expert_payout` events), in cents. */
  totalPayoutsCents(): Cents {
    let total = 0;
    for (const entry of this.#entries) {
      if (entry.event.type === "expert_payout") total += entry.event.expertAmountCents;
    }
    return total;
  }
}
