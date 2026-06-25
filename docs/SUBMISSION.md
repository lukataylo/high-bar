# High Bar — Hackathon Submission

> **Cursor "Hands-Off" Hackathon** — build a self-running business powered by AI agents.
> The required deliverable is a **≤2-minute demo video**. This file is the submission checklist
> plus how the build maps to each of the six equally-weighted judging criteria.

---

## Submission checklist

| Item | Status | Link |
|---|---|---|
| **≤2-minute demo video** (Loom/YouTube) | ⬜ to record | `<PASTE LOOM/YOUTUBE LINK>` |
| **Deployed URL** (Railway web service) | ✅ live | `<PASTE RAILWAY URL>` (e.g. `https://highbar.dev`) |
| **Public repo URL** | ⬜ confirm public | `<PASTE GITHUB REPO URL>` |
| Demo script | ✅ | [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md) |
| Threat model / security write-up | ✅ | [`docs/SECURITY.md`](SECURITY.md) |
| Reproducible tests | ✅ | 67 passing — see [Evaluate it yourself](../README.md#evaluate-it-yourself) |

**Pre-submit verification:**
```bash
pnpm -r typecheck                                 # clean across the monorepo
pnpm --filter @high-bar/payments test             # 30 passing — money-safety logic
pnpm --filter @high-bar/research test             # 21 passing — lead scoring + draft outreach
pnpm --filter @high-bar/mcp-expert-network test   # 16 passing — auth, scopes, rate limit, MCP/REST
```

> Confirm the repo is **public** and the Railway URL is reachable before pasting the links.
> The web console is behind HTTP Basic auth — share credentials with judges if needed.

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
dependency-injected ports so it's unit-testable without Stripe/Postgres/Redis. **67 tests pass,
every package typechecks clean.**

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
An installable Next.js PWA console (`apps/web`, **deployed on Railway**) is the asker + expert +
approval-inbox UI. A **human-in-the-loop inbox** surfaces outreach drafts and over-threshold
payouts (`outreach_drafts` table, `requires_approval` on `payouts`) so a person approves with full
context. A **legible audit trail** records every proposed side effect `proposed → allowed/denied →
executed` (`packages/core/src/audit.ts`, `audit_log` table) — operators always see what the agent
*wanted* vs. what *ran*.

### 5. Real-world applicability
Production payment patterns, not a toy: Stripe manual-capture escrow + Connect Express payouts
(`packages/payments`) is what real marketplaces ship. A real integration surface for agent
customers — hashed-API-key auth, scopes, and per-key rate limiting over MCP and REST
(`packages/mcp-expert-network/src/{auth,http}.ts`). Compliance-first growth via draft-only
outreach (`packages/research`). Deployable today: live web service on Railway with Postgres +
Redis (`docs/DOMAIN_SETUP.md`).

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

The policy engine, payments, research, MCP/REST surface, and web app are **built and tested
today**. The cron runtime that *invokes* them on a schedule — `apps/agent-gateway`, `apps/api`,
`services/hermes` — is **in progress**, specified by the `packages/core` contracts but not yet
wired end-to-end. The demo uses pre-recorded backup clips and the green test suites as a fallback
for any live-loop beat (see [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md#fallback-plan)).
