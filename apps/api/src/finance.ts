import type { ProcessorFeeConfig, TaxConfig } from "@high-bar/accounting";

/**
 * Fee / tax configuration for the accounting split. Resolved from env with
 * prudent defaults so the autonomous finance ledger always knows the platform
 * take, VAT, income-tax set-aside, and the processor fee to absorb.
 */
export interface FinanceConfig {
  readonly tax: TaxConfig;
  readonly processor: ProcessorFeeConfig;
}

type Env = Record<string, string | undefined>;

function num(env: Env, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(env: Env, key: string, fallback: number): number {
  const v = num(env, key, fallback);
  return Math.trunc(v);
}

/**
 * Reads PLATFORM_TAKE_RATE / VAT_RATE / INCOME_TAX_RATE (decimal fractions) and
 * PROCESSOR_PERCENT_BPS / PROCESSOR_FIXED_CENTS from the environment.
 */
export function loadFinanceConfig(env: Env = process.env): FinanceConfig {
  return {
    tax: {
      platformTakeRate: num(env, "PLATFORM_TAKE_RATE", 0.2),
      vatRate: num(env, "VAT_RATE", 0.2),
      incomeTaxRate: num(env, "INCOME_TAX_RATE", 0.19),
      vatInclusive: true,
    },
    processor: {
      percentBps: int(env, "PROCESSOR_PERCENT_BPS", 290),
      fixedCents: int(env, "PROCESSOR_FIXED_CENTS", 30),
    },
  };
}
