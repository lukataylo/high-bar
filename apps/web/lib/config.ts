import "server-only";

const numberFromEnv = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export function getGuardrails() {
  return {
    approvalThresholdUsd: numberFromEnv("PAYOUT_APPROVAL_THRESHOLD", 100),
    dailyCapUsd: numberFromEnv("PAYOUT_DAILY_CAP", 1000),
    killSwitch: process.env.AGENT_KILL_SWITCH?.toLowerCase() === "true",
    authRequired: Boolean(process.env.AUTH_SECRET),
    paypalMode: process.env.PAYPAL_ENV || "sandbox",
    modelConfigured: Boolean(
      process.env.MODEL_API_KEY || process.env.ANTHROPIC_API_KEY
    ),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    redisConfigured: Boolean(process.env.REDIS_URL)
  };
}

export function getPublicGuardrails() {
  const guardrails = getGuardrails();

  return {
    approvalThresholdUsd: guardrails.approvalThresholdUsd,
    dailyCapUsd: guardrails.dailyCapUsd,
    killSwitch: guardrails.killSwitch
  };
}
