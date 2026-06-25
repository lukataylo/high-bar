# High Bar — Hackathon Submission

> **Cursor "Hands-Off" Hackathon** — build a self-running business powered by AI agents.
> The required deliverable is a **≤2-minute demo video**. This file is the submission checklist
> plus how the build maps to each of the six equally-weighted judging criteria.

---

## Submission checklist

| Item | Status | Link |
|---|---|---|
| **≤2-minute demo video** (Loom/YouTube) | ⬜ to record | `<PASTE LOOM/YOUTUBE LINK — placeholder>` |
| **Landing site / web console** | ✅ live | https://highbar.dev |
| **Autonomous loop — live dashboard** | ✅ live, running hands-off | https://agent-loop-production-7f34.up.railway.app (`/state`, `/feed`, `/healthz`) |
| **Public repo URL** | ✅ public | https://github.com/lukataylo/high-bar |
| Demo script | ✅ | [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md) |
| Threat model / security write-up | ✅ | [`docs/SECURITY.md`](SECURITY.md) |
| Reproducible tests | ✅ | 125 passing — see [Evaluate it yourself](../README.md#evaluate-it-yourself) |

**Pre-submit verification:**
```bash
pnpm -r typecheck                                 # clean across the monorepo
pnpm -r test                                      # 125 passing total
pnpm --filter @high-bar/payments test             # 43 passing — money-safety logic + Stripe mappers
pnpm --filter @high-bar/accounting test           # 23 passing — ledger, VAT/tax, invoices, reconciliation
pnpm --filter @high-bar/research test             # 21 passing — lead scoring + draft outreach
pnpm --filter @high-bar/expert-content test       # 18 passing — screening, templates, compliance intake
pnpm --filter @high-bar/mcp-expert-network test   # 16 passing — auth, scopes, rate limit, MCP/REST
pnpm --filter @high-bar/agent-gateway test        #  4 passing — propose→authorize gateway
```

> The repo is **public** and both Railway URLs are reachable. The web console can optionally be gated by
> HTTP Basic auth (`AUTH_REQUIRED=true`); it is currently open for judges.

---

## How the build maps to the six criteria

Each paragraph cites real files a judge can open.

### 1. Technical execution
End-to-end TypeScript monorepo (pnpm + Turborepo) with a **fail-closed payout policy engine** at
its core: `packages/payments/src/policy.ts` implements `PayoutPolicyEngine` with a deliberate
5-stage decision order (kill-switch → eligibility allowlist → daily cap → approval threshold →
auto-approve) that default-denies anything that isn't a payout. Real Stripe plumbing —
manual-capture PaymentIntents, partial refunds, Connect transfers, and a 10-event webhook mapper
(`packages/payments/src/{payments,connect,webhooks}.ts`) — sits behind hexagonal,
dependency-injected ports so it's unit-testable without Stripe/Postgres/Redis. Full books on top —
double-entry ledger, VAT/tax set-aside, invoicing, reconciliation (`packages/accounting`). **125 tests
pass, every package typechecks clean.**

### 2. Product thinking
Two customers, one codebase: the same marketplace serves **humans** (Next.js PWA, `apps/web`) and
**AI agents** (MCP + REST, `packages/mcp-expert-network/src/{auth,http}.ts`) — an explicit bet
that agents become paying buyers of vetted answers. **Escrow-style trust** aligns incentives —
funds authorized on submit, captured only on acceptance (`packages/payments/src/payments.ts`,
`payment_status` machine in `packages/core/src/db/schema.ts`). Outreach is **draft-only**
(`packages/research/src/outreach.ts`): ToS-safe, no scraping — a deliberate compliance choice.

### 3. Agent autonomy
The agent runs a self-driving biz-dev loop — discover, qualify, score, draft outreach, match
experts, propose payouts — and makes **autonomous money decisions within hard limits**: it can
pay vetted experts automatically and only escalates above `PAYOUT_APPROVAL_THRESHOLD`. Autonomy is
bounded by the **propose/authorize split**: the agent's action surface (`outreach.draft`,
`payout.create`, `lead.upsert`) is never directly executable and flows through the gateway
`PolicyEngine` via the `ProposedAction` / `PolicyDecision` contract
(`packages/core/src/contracts/agent-runtime.ts`). Agents can also *buy* answers programmatically
over MCP.

### 4. UX clarity
An installable Next.js PWA console (`apps/web`, **live at https://highbar.dev**) is the asker + expert +
approval-inbox UI, and the autonomous loop ships its own **live operator dashboard**
(https://agent-loop-production-7f34.up.railway.app) showing revenue, payouts, guardrail denials, and
kill-switch state with a streaming audit feed. A **human-in-the-loop inbox** surfaces outreach drafts and over-threshold
payouts (`outreach_drafts` table, `requires_approval` on `payouts`) so a person approves with full
context. A **legible audit trail** records every proposed side effect `proposed → allowed/denied →
executed` (`packages/core/src/audit.ts`, `audit_log` table) — operators always see what the agent
*wanted* vs. what *ran*.

### 5. Real-world applicability
Production payment patterns, not a toy: Stripe manual-capture escrow + Connect Express payouts
(`packages/payments`) is what real marketplaces ship. A real integration surface for agent
customers — hashed-API-key auth, scopes, and per-key rate limiting over MCP and REST
(`packages/mcp-expert-network/src/{auth,http}.ts`). Compliance-first growth via draft-only
outreach (`packages/research`). Deployed today: the web console (https://highbar.dev) and the
autonomous loop (https://agent-loop-production-7f34.up.railway.app) both run live on Railway.

### 6. Safety & oversight design
Safety is by construction. `PayoutPolicyEngine` denies first and allows last — a missing/unvetted
expert, unverified KYC, or absent Connect account all block payout
(`packages/payments/src/policy.ts`). Operator guardrail knobs — `PAYOUT_APPROVAL_THRESHOLD`,
`PAYOUT_DAILY_CAP`, `AGENT_KILL_SWITCH` (`.env.example`) — cap spend and halt the loop instantly.
Least-privilege agent API: sha-256-hashed keys, scopes, token-bucket rate limiting
(`packages/mcp-expert-network/src/auth.ts`). Defense-in-depth with RBAC
(`packages/core/src/rbac.ts`), immutable audit log (`packages/core/src/audit.ts`), idempotency
keys, webhook signature verification (`packages/payments/src/webhooks.ts`), and untrusted-content
isolation. Full adversarial write-up in [`docs/SECURITY.md`](SECURITY.md).

---

## Honest status

The policy engine, payments, accounting, research, expert-content, MCP/REST surface, the
`apps/agent-gateway` propose→authorize runtime, and the web app are **built and tested today**
(125 tests). The web console and the autonomous loop (`scripts/autonomous-loop.mjs`) are
**deployed and running hands-off** on Railway. What is *not* yet live: **managed-Postgres
persistence** (the deployed surfaces run on in-memory/seed state, though the Drizzle schema is
defined in `packages/core`), **live Stripe money movement** (the loop exercises the full escrow
cycle against the same guardrails but does not yet move real funds), and the **Hermes live-LLM**
path (`apps/agent-gateway/src/runtimes/hermes.ts` degrades to a deterministic pipeline when no
model is configured). The demo can fall back to pre-recorded clips and the green test suites for
any live beat (see [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md#fallback-plan)).
