import { serve } from "@hono/node-server";
import { createStripeClient } from "@high-bar/payments";
import { createDb } from "@high-bar/core/db";
import { createApp } from "./app.js";
import { InMemoryRepository } from "./in-memory-repository.js";
import { DrizzleRepository } from "./drizzle-repository.js";
import type { Repository } from "./repository.js";

const INTAKE_EMAIL = "agent-intake@high-bar.internal";

async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 8787);

  // Graceful degradation: Postgres when DATABASE_URL is set, else in-memory.
  let repo: Repository;
  if (process.env.DATABASE_URL) {
    repo = new DrizzleRepository(createDb());
    console.log("[api] using DrizzleRepository (Postgres)");
  } else {
    repo = new InMemoryRepository();
    console.log("[api] DATABASE_URL not set — using InMemoryRepository");
  }

  // Never log the Stripe secret. Boot even when unset so non-payment routes work.
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("[api] STRIPE_SECRET_KEY not set — payment routes will fail until configured");
  }
  const stripe = createStripeClient({ apiKey: process.env.STRIPE_SECRET_KEY ?? "sk_test_unset" });

  const asker = await repo.ensureUserByEmail({
    email: INTAKE_EMAIL,
    name: "Agent Intake",
    role: "asker",
  });

  const { app } = createApp({ repo, stripe, defaultAskerId: asker.id });

  serve({ fetch: app.fetch, port });
  console.log(`[api] listening on :${port}`);
}

main().catch((err: unknown) => {
  // Surface a stable message; do not print env/secrets.
  console.error("[api] fatal startup error:", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
