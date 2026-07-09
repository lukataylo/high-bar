import { z } from "zod";
import type { Cents } from "./money";
import { applyRate, assertNonNegativeCents, extractInclusiveTax } from "./money";
import { InvalidInputError } from "./errors";

/**
 * Fee + tax engine.
 *
 * The platform takes a configurable percentage of each order (the "take rate").
 * That platform fee is treated as VAT-INCLUSIVE by default (UK / EU consumer
 * pricing convention): the displayed order price is what the asker pays, and the
 * VAT on the platform's service fee is carved OUT of the fee rather than added
 * on top. Set `vatInclusive: false` to instead add VAT on top of the fee.
 *
 * Two tax figures are produced:
 *   1. VAT / sales tax on the platform service fee — a pass-through liability we
 *      collect on behalf of the tax authority (credited to `tax_payable`).
 *   2. An INCOME-tax SET-ASIDE — a prudent reserve (NOT a filed liability)
 *      estimated on the platform's NET revenue (fee net of VAT, less processor
 *      fees). This is the platform's own corporation/income tax provision.
 *
 * Nothing here files or remits tax. It computes liabilities and set-asides so
 * the autonomous finance loop always knows how much cash to ring-fence.
 */

const rateSchema = z.number().finite().min(0).max(1);

export const TaxConfigSchema = z.object({
  /** Platform take as a fraction of the order, e.g. 0.2 for 20%. */
  platformTakeRate: rateSchema,
  /** VAT / sales-tax rate applied to the platform service fee, e.g. 0.2 (UK). */
  vatRate: rateSchema,
  /** Income/corporation tax set-aside rate on net platform revenue, e.g. 0.19. */
  incomeTaxRate: rateSchema,
  /** When true (default), the platform fee is VAT-inclusive; otherwise added on top. */
  vatInclusive: z.boolean().default(true),
});
export type TaxConfig = z.input<typeof TaxConfigSchema>;
export type ResolvedTaxConfig = z.infer<typeof TaxConfigSchema>;

/**
 * The full, fully-reconciled breakdown of a single order. Every cents field is
 * an exact integer and the parts always re-sum to their totals (no float drift).
 */
export interface OrderSplit {
  /** Gross amount the asker is charged for the order (escrow / question price). */
  readonly orderAmountCents: Cents;
  /** Platform fee inclusive of VAT (the headline commission). */
  readonly platformFeeGrossCents: Cents;
  /** Platform fee net of VAT — this is recognised platform revenue. */
  readonly platformFeeNetCents: Cents;
  /** VAT collected on the platform fee (pass-through to the tax authority). */
  readonly vatCents: Cents;
  /** Amount owed to the expert (order minus the gross platform fee). */
  readonly expertAmountCents: Cents;
  /** Stripe / card processing fee the platform absorbs out of its take. */
  readonly processorFeeCents: Cents;
  /** Net platform revenue: fee net of VAT, less processor fee (can be negative). */
  readonly netRevenueCents: Cents;
  /** Prudent income-tax reserve on positive net revenue. */
  readonly incomeTaxSetAsideCents: Cents;
}

/** Estimate a Stripe-style processor fee: percentBps of amount + fixed cents. */
export interface ProcessorFeeConfig {
  /** Percentage component in basis points, e.g. 290 for 2.9%. */
  readonly percentBps: number;
  /** Fixed per-transaction component in cents, e.g. 30. */
  readonly fixedCents: Cents;
}

/** Computes a processor fee from a config; rounds HALF UP per the package rule. */
export function estimateProcessorFee(amountCents: Cents, config: ProcessorFeeConfig): Cents {
  assertNonNegativeCents(amountCents, "amount");
  assertNonNegativeCents(config.fixedCents, "processor fixedCents");
  if (!Number.isInteger(config.percentBps) || config.percentBps < 0) {
    throw new InvalidInputError(`processor percentBps must be a non-negative integer, got ${config.percentBps}`);
  }
  return Math.round((amountCents * config.percentBps) / 10_000) + config.fixedCents;
}

/**
 * Computes the canonical split for an order. `processorFeeCents` is supplied by
 * the caller (read from Stripe in production, or via `estimateProcessorFee`).
 */
export function computeSplit(
  orderAmountCents: Cents,
  processorFeeCents: Cents,
  config: TaxConfig,
): OrderSplit {
  assertNonNegativeCents(orderAmountCents, "orderAmount");
  assertNonNegativeCents(processorFeeCents, "processorFee");
  const cfg = TaxConfigSchema.parse(config);

  const platformFeeGrossCents = applyRate(orderAmountCents, cfg.platformTakeRate, "order");
  const expertAmountCents = orderAmountCents - platformFeeGrossCents;

  let platformFeeNetCents: Cents;
  let vatCents: Cents;
  if (cfg.vatInclusive) {
    const { netCents, taxCents } = extractInclusiveTax(platformFeeGrossCents, cfg.vatRate);
    platformFeeNetCents = netCents;
    vatCents = taxCents;
  } else {
    platformFeeNetCents = platformFeeGrossCents;
    vatCents = applyRate(platformFeeGrossCents, cfg.vatRate, "fee");
  }

  const netRevenueCents = platformFeeNetCents - processorFeeCents;
  const incomeTaxSetAsideCents =
    netRevenueCents > 0 ? applyRate(netRevenueCents, cfg.incomeTaxRate, "netRevenue") : 0;

  return {
    orderAmountCents,
    platformFeeGrossCents,
    platformFeeNetCents,
    vatCents,
    expertAmountCents,
    processorFeeCents,
    netRevenueCents,
    incomeTaxSetAsideCents,
  };
}

/**
 * Expert tax-reporting responsibilities. The platform is a marketplace, NOT the
 * expert's employer: experts are independent and report their own income. The
 * platform only issues payout statements and (where applicable) the Stripe
 * Connect informational forms. This is guidance metadata, not tax advice.
 */
export interface ExpertTaxReportingNote {
  readonly responsibility: "expert";
  readonly platformProvides: "payout_statement";
  /** Informational forms the platform / Stripe surface, by jurisdiction. */
  readonly forms: {
    readonly us: "stripe_connect_1099_k";
    readonly uk: "self_assessment_self_employment";
  };
  readonly summary: string;
}

export const EXPERT_TAX_REPORTING_NOTE: ExpertTaxReportingNote = {
  responsibility: "expert",
  platformProvides: "payout_statement",
  forms: {
    us: "stripe_connect_1099_k",
    uk: "self_assessment_self_employment",
  },
  summary:
    "Experts are independent contractors responsible for their own income tax. " +
    "In the US, Stripe Connect issues a 1099-K where thresholds are met; in the UK, " +
    "experts declare earnings via Self Assessment self-employment. The platform issues " +
    "payout statements (gross / platform fee / net) but does not withhold or file the " +
    "expert's tax.",
};
