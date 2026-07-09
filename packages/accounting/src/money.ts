import { InvalidInputError } from "./errors";

/**
 * All money in this package is an integer number of CENTS (minor units). We
 * never use floating-point money. `Cents` is a documentation alias for the
 * integer contract — callers must pass whole integers.
 */
export type Cents = number;

/**
 * ROUNDING RULE (single source of truth for the whole package):
 *   - All proportional splits round to the nearest whole cent.
 *   - Ties (exactly .5 of a cent) round HALF UP (towards +Infinity), which for
 *     non-negative money is "round half away from zero".
 *   - We round ONE side of every split, then derive the other by SUBTRACTION
 *     from an exact integer total. This guarantees the parts always re-sum to
 *     the original integer with zero drift (no two independently-rounded halves
 *     that fail to add up).
 *
 * Rates are supplied as decimal fractions (e.g. 0.2 for 20%) but are converted
 * to integer basis points before any multiplication, so the arithmetic stays in
 * the integer domain and is fully deterministic.
 */

/** Asserts a value is a finite, safe integer (a valid cents amount). */
export function assertInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new InvalidInputError(`${label} must be a safe integer number of cents, got ${value}`);
  }
}

/** Asserts a value is a non-negative integer number of cents. */
export function assertNonNegativeCents(value: number, label: string): void {
  assertInteger(value, label);
  if (value < 0) {
    throw new InvalidInputError(`${label} must be >= 0 cents, got ${value}`);
  }
}

/** Asserts a rate is a finite fraction in the inclusive range [0, 1]. */
export function assertRate(rate: number, label: string): void {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new InvalidInputError(`${label} must be a fraction in [0, 1], got ${rate}`);
  }
}

/** Converts a decimal-fraction rate (0.2) to integer basis points (2000). */
export function rateToBasisPoints(rate: number): number {
  return Math.round(rate * 10_000);
}

/**
 * Multiplies an integer cents amount by a rate and rounds HALF UP to whole
 * cents. Works in the integer domain via basis points.
 */
export function applyRate(amountCents: Cents, rate: number, label = "amount"): Cents {
  assertNonNegativeCents(amountCents, label);
  assertRate(rate, `${label} rate`);
  const bps = rateToBasisPoints(rate);
  return Math.round((amountCents * bps) / 10_000);
}

/**
 * Splits a VAT-INCLUSIVE gross amount into its net (ex-tax) and tax components.
 * `tax` is derived by subtraction so `net + tax === grossInclusive` exactly.
 */
export function extractInclusiveTax(
  grossInclusiveCents: Cents,
  rate: number,
): { netCents: Cents; taxCents: Cents } {
  assertNonNegativeCents(grossInclusiveCents, "grossInclusive");
  assertRate(rate, "vat rate");
  const bps = rateToBasisPoints(rate);
  const netCents = Math.round((grossInclusiveCents * 10_000) / (10_000 + bps));
  const taxCents = grossInclusiveCents - netCents;
  return { netCents, taxCents };
}

/** Formats integer cents as a major-unit string, e.g. (1999, "usd") -> "19.99 USD". */
export function formatMoney(amountCents: Cents, currency: string): string {
  assertInteger(amountCents, "amount");
  const sign = amountCents < 0 ? "-" : "";
  const abs = Math.abs(amountCents);
  const major = Math.floor(abs / 100);
  const minor = (abs % 100).toString().padStart(2, "0");
  return `${sign}${major}.${minor} ${currency.toUpperCase()}`;
}
