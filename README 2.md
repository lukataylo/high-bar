# High Bar MVP

High Bar is a Next.js MVP for an expert-network operations dashboard. It shows client demand, ranks a small in-memory expert pool, drafts LinkedIn outreach for manual sending, and surfaces payout guardrails before any money movement.

## Quickstart

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
pnpm typecheck
pnpm build
```

## Key Routes

- `/` - Hermes control room dashboard with Pipeline, Scout, and Approvals tabs.
- `/api/agent` - returns the first sample request, ranked experts, and draft-only LinkedIn outreach recommendations.
- `/api/payouts` - returns sample payout queue data with approval, daily cap, and kill-switch guardrail state.

When `AUTH_SECRET` is set, the dashboard and API routes require either browser basic auth with username `highbar` and password set to `AUTH_SECRET`, or API header `Authorization: Bearer <AUTH_SECRET>`.

## Environment Variables

Copy `.env.example` to `.env` and fill in real values as needed:

- `PAYPAL_ENV` - PayPal mode, currently expected to be `sandbox` for MVP use.
- `PAYPAL_CLIENT_ID` - PayPal client ID.
- `PAYPAL_CLIENT_SECRET` - PayPal client secret.
- `PAYPAL_WEBHOOK_ID` - PayPal webhook ID.
- `MODEL_BASE_URL` - OpenAI-compatible model backend URL for the Hermes loop.
- `MODEL_API_KEY` - API key for the configured model backend.
- `ANTHROPIC_API_KEY` - optional Claude route for Hermes instead of an OpenAI-compatible backend.
- `RAILWAY_TOKEN` - Railway deployment token.
- `DATABASE_URL` - database connection string.
- `REDIS_URL` - Redis connection string.
- `AUTH_SECRET` - application auth secret.
- `PAYOUT_APPROVAL_THRESHOLD` - payouts at or above this USD amount require manual approval.
- `PAYOUT_DAILY_CAP` - hard daily USD cap for agent-initiated payouts.
- `AGENT_KILL_SWITCH` - set to `true` to halt the autonomous loop.

## Current Guardrails

- LinkedIn outreach is draft-only; a human must copy and send messages manually.
- Payouts at or above `PAYOUT_APPROVAL_THRESHOLD` are flagged for manual approval.
- `PAYOUT_DAILY_CAP` is used to calculate remaining daily payout capacity.
- `AGENT_KILL_SWITCH=true` marks payout activity as halted.
- PayPal is documented for sandbox-first operation.
- Model, database, and Redis configuration are detected from env, but the MVP still runs on local sample data.
- Production fails closed if `AUTH_SECRET` is missing; local development can run without it.

## Stubbed For Now

- No real PayPal payout execution or webhook handling.
- No persisted database or Redis-backed job queue.
- No live model call in the agent route.
- No full user/session system beyond the MVP basic/Bearer auth gate.
- No automated LinkedIn sending.
- Dashboard actions such as Run loop, Mark queued, Review, and Release are UI-only.
- Sample requests, experts, and payouts are hard-coded in `apps/web/lib/data.ts`.
