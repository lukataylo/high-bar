import { z } from "zod";
import { ConfigError } from "./errors";

/**
 * Guardrail configuration, resolved to integer cents. Thresholds in the
 * environment are expressed in whole USD and converted here.
 */
export interface GuardrailConfig {
  /** Payouts strictly above this (cents) require human approval. */
  approvalThresholdCents: number;
  /** Hard ceiling (cents) on total agent-initiated payouts per day. */
  dailyCapCents: number;
  /** When true, ALL agent-initiated payouts are halted. */
  killSwitch: boolean;
}

type Env = Record<string, string | undefined>;

function getEnv(env?: Env): Env {
  return env ?? process.env;
}

/** Returns STRIPE_SECRET_KEY or throws. Never logs the value. */
export function loadStripeSecret(env?: Env): string {
  const key = getEnv(env).STRIPE_SECRET_KEY;
  if (key === undefined || key.trim() === "") {
    throw new ConfigError("STRIPE_SECRET_KEY is not set");
  }
  return key;
}

/** Returns STRIPE_WEBHOOK_SECRET or throws. Never logs the value. */
export function loadStripeWebhookSecret(env?: Env): string {
  const secret = getEnv(env).STRIPE_WEBHOOK_SECRET;
  if (secret === undefined || secret.trim() === "") {
    throw new ConfigError("STRIPE_WEBHOOK_SECRET is not set");
  }
  return secret;
}

const usdAmount = (fallback: number) =>
  z
    .preprocess(
      (v) => (v === undefined || v === "" ? undefined : v),
      z.coerce.number().nonnegative(),
    )
    .default(fallback);

const boolish = z
  .preprocess(
    (v) => (v === undefined || v === "" ? undefined : v),
    z.union([z.boolean(), z.string()]).transform((v) => {
      if (typeof v === "boolean") return v;
      const s = v.trim().toLowerCase();
      return s === "true" || s === "1" || s === "yes";
    }),
  )
  .default(false);

const guardrailSchema = z.object({
  PAYOUT_APPROVAL_THRESHOLD: usdAmount(100),
  PAYOUT_DAILY_CAP: usdAmount(1000),
  AGENT_KILL_SWITCH: boolish,
});

/**
 * Reads PAYOUT_APPROVAL_THRESHOLD / PAYOUT_DAILY_CAP (USD) and AGENT_KILL_SWITCH
 * from the environment, returning a normalized config in integer cents.
 */
export function loadGuardrailConfig(env?: Env): GuardrailConfig {
  const e = getEnv(env);
  const parsed = guardrailSchema.parse({
    PAYOUT_APPROVAL_THRESHOLD: e.PAYOUT_APPROVAL_THRESHOLD,
    PAYOUT_DAILY_CAP: e.PAYOUT_DAILY_CAP,
    AGENT_KILL_SWITCH: e.AGENT_KILL_SWITCH,
  });
  return {
    approvalThresholdCents: Math.round(parsed.PAYOUT_APPROVAL_THRESHOLD * 100),
    dailyCapCents: Math.round(parsed.PAYOUT_DAILY_CAP * 100),
    killSwitch: parsed.AGENT_KILL_SWITCH,
  };
}
