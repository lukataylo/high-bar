/**
 * Typed errors for the accounting package. These NEVER embed PII or secrets —
 * only a stable `code` plus non-sensitive numeric context, so they are safe to
 * log and surface to operators / the autonomous finance agent.
 */

export type AccountingErrorCode =
  | "invalid_input"
  | "unbalanced_entry"
  | "reconciliation_drift";

export class AccountingError extends Error {
  readonly code: AccountingErrorCode;

  constructor(code: AccountingErrorCode, message: string) {
    super(message);
    this.name = "AccountingError";
    this.code = code;
    // Restore prototype chain for instanceof across transpilation targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Caller-supplied arguments (amounts, rates) failed validation. */
export class InvalidInputError extends AccountingError {
  constructor(message: string) {
    super("invalid_input", message);
    this.name = "InvalidInputError";
  }
}

/** A journal entry's debits did not equal its credits — refuse to record it. */
export class UnbalancedEntryError extends AccountingError {
  readonly debitCents: number;
  readonly creditCents: number;

  constructor(debitCents: number, creditCents: number, memo: string) {
    super(
      "unbalanced_entry",
      `Unbalanced journal entry "${memo}": debits=${debitCents} credits=${creditCents}`,
    );
    this.name = "UnbalancedEntryError";
    this.debitCents = debitCents;
    this.creditCents = creditCents;
  }
}

/** Ledger balances drifted from the processor's reported balances. Fail loud. */
export class ReconciliationDriftError extends AccountingError {
  readonly checkName: string;
  readonly ledgerCents: number;
  readonly externalCents: number;

  constructor(checkName: string, ledgerCents: number, externalCents: number) {
    super(
      "reconciliation_drift",
      `Reconciliation drift on "${checkName}": ledger=${ledgerCents} external=${externalCents} delta=${ledgerCents - externalCents}`,
    );
    this.name = "ReconciliationDriftError";
    this.checkName = checkName;
    this.ledgerCents = ledgerCents;
    this.externalCents = externalCents;
  }
}
