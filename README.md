# High Bar

> An expert-answer network that sells **vetted answers** to humans **and AI agents** — operated end-to-end by an autonomous agent.

[![TypeScript](https://img.shields.io/badge/TypeScript-end--to--end-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![Status](https://img.shields.io/badge/status-active%20development-yellow)](#project-status--roadmap)

---

## What it is

High Bar is two things that run on the same codebase:

**1. A marketplace for expert answers.**
- **Askers** submit a paid question with a domain tag and an SLA — humans through an installable **PWA**, AI agents through our **MCP server / public API**.
- Funds are **authorized on submit** (escrow-style hold), and the question is routed to a matched, **vetted expert**.
- The expert answers. If the asker accepts, we **capture** the payment and **pay out** the expert minus a platform fee. If they reject — or the SLA expires — the hold is **voided/refunded**.
- Money always flows **asker → platform → expert**, with ratings, SLA tracking, and disputes on top.

**2. An autonomous business-development agent.**
A cron-driven [Nous Hermes](https://nousresearch.com/) agent loop that operates the business itself:
- discovers candidate experts and customers from public/compliant sources,
- qualifies and scores leads, scans for opportunities, and writes a daily digest,
- drafts personalized **LinkedIn / email outreach** — **draft-only**, never auto-sent. Drafts land in a **human approval inbox**; a person reviews and sends manually (ToS-safe).

Two constraints shape every decision:

1. **Security is paramount.** A long-running agent that can move money is a high-value attack surface, so guardrails, least-privilege, audit trails, and prompt-injection isolation are first-class — see [Security model](#security-model).
2. **The agent proposes; the platform authorizes.** The agent loop can only *suggest* side effects. A separate policy engine decides what actually executes.

---

## How this project addresses the judging criteria

Every claim below maps to code in this repo. **67 tests pass** (payments 30, research 21, MCP 16) and **every package typechecks clean** (`pnpm -r typecheck`). See [Evaluate it yourself](#evaluate-it-yourself) to reproduce.

### 1. Technical execution
- **Fail-closed payout policy engine** — [`packages/payments/src/policy.ts`](packages/payments/src/policy.ts) implements `PayoutPolicyEngine` with a deliberate 5-stage decision order (kill-switch → eligibility allowlist → daily cap → approval threshold → auto-approve), default-denying anything that isn't a payout. Covered by 10 tests in [`packages/payments/test/policy.test.ts`](packages/payments/test/policy.test.ts).
- **Real Stripe money plumbing** — manual-capture PaymentIntents, partial refunds, and Connect transfers with idempotency keys, plus a webhook-event mapper over 10 Stripe event types ([`packages/payments/src/{payments,webhooks,connect}.ts`](packages/payments/src), 20 more tests).
- **Hexagonal, dependency-injected design** — engines depend on thin ports (`ApiKeyPort`, `RateLimitStore`, `PayoutPolicyEngineDeps`), so the money/agent logic is unit-testable without Stripe, Postgres, or Redis running.
- **Shared, schema-locked contracts** — zod + Drizzle definitions in [`packages/core/src`](packages/core/src) (`db/schema.ts`, `contracts/*`) are the single source of truth every package builds against.

### 2. Product thinking
- **Two customers, one codebase** — the same marketplace serves humans (PWA) and AI agents (MCP + REST), an explicit bet that agents will become paying buyers of vetted answers.
- **Escrow-style trust** — funds are authorized on submit and only captured on acceptance; reject or SLA-expiry voids/refunds, aligning incentives for asker and expert.
- **ToS-safe outreach by design** — [`packages/research/src`](packages/research/src) generates *drafts only* (`outreach.ts`), never auto-sending and never scraping/automating LinkedIn — a deliberate product choice that keeps the business compliant.

### 3. Agent autonomy
- **Propose/authorize split** — the agent's internal action surface (`outreach.draft`, `payout.create`, `lead.upsert`) is never directly executable; it flows through the gateway `PolicyEngine` via the `ProposedAction`/`PolicyDecision` contract in [`packages/core/src/contracts/agent-runtime.ts`](packages/core/src/contracts/agent-runtime.ts).
- **Autonomous money decisions, bounded** — `PayoutPolicyEngine` lets the loop pay vetted experts *automatically within limits* and only escalates to a human above the configured threshold — real autonomy with a hard ceiling.
- **Self-driving biz-dev** — [`packages/research/src`](packages/research/src) qualifies and scores leads (`qualify.ts`, 10 tests) and prepares outreach, the loop the agent runs end-to-end.
- **Agents as autonomous customers** — [`packages/mcp-expert-network/src`](packages/mcp-expert-network/src) exposes the marketplace over MCP so other AI agents can buy answers programmatically (`mcp.ts`, `http.ts`).

### 4. UX clarity
- **Installable Next.js PWA console** — [`apps/web/`](apps/web) is the asker + expert + approval-inbox UI, **deployed live on Railway**.
- **Human-in-the-loop inbox** — outreach drafts and over-threshold payouts surface in a review queue (`outreach_drafts` table, `requires_approval` on payouts) so a person approves with full context.
- **Legible audit trail** — every proposed side effect is recorded `proposed → allowed/denied → executed` ([`packages/core/src/audit.ts`](packages/core/src/audit.ts), `audit_log` table), so operators can always see *what the agent wanted vs. what ran*.

### 5. Real-world applicability
- **Production payments, not a toy** — Stripe manual-capture escrow + Connect Express payouts ([`packages/payments`](packages/payments)) is the same pattern real marketplaces ship.
- **A real integration surface for agent customers** — [`packages/mcp-expert-network/src/{auth,http,mcp}.ts`](packages/mcp-expert-network/src) provides hashed-API-key auth, scopes, and per-key rate limiting over both MCP and REST.
- **Compliance-first growth** — draft-only outreach ([`packages/research`](packages/research)) avoids the scraping/automation that gets real businesses banned.
- **Deployable today** — live web service on Railway with Postgres + Redis; see [Deployment](#deployment).

### 6. Safety & oversight design
- **Fail-closed by construction** — `PayoutPolicyEngine` denies first and only allows at the end; a missing/unvetted expert, unverified KYC, or absent Connect account all block payout ([`packages/payments/src/policy.ts`](packages/payments/src/policy.ts)).
- **Operator guardrail knobs** — `PAYOUT_APPROVAL_THRESHOLD`, `PAYOUT_DAILY_CAP`, and `AGENT_KILL_SWITCH` in [`.env.example`](.env.example) let an operator cap spend and halt the loop instantly.
- **Least-privilege agent API** — keys are stored as **sha-256 hashes only**, gated by scopes, and throttled by a per-key token-bucket rate limiter ([`packages/mcp-expert-network/src/auth.ts`](packages/mcp-expert-network/src/auth.ts), `hashApiKey` / `hasScope` / `RateLimitStore`).
- **Defense-in-depth + audit** — RBAC ([`packages/core/src/rbac.ts`](packages/core/src/rbac.ts)), immutable audit log ([`packages/core/src/audit.ts`](packages/core/src/audit.ts)), and untrusted-content isolation (see [Security model](#security-model)).

> **Honest status:** the policy engine, payments, research, MCP/REST surface, and web app are **built and tested today**. The runtime that *invokes* them on a cron — `apps/agent-gateway`, `services/hermes`, and `apps/api` — is **in progress / specified by the `packages/core` contracts** but not yet wired end-to-end. See [Project status / roadmap](#project-status--roadmap).

---

## Evaluate it yourself

A judge can verify every claim above in a few minutes:

```bash
# 1. Clone and install
git clone <this-repo> && cd self-running
pnpm install

# 2. Typecheck the whole monorepo (expect: clean)
pnpm -r typecheck

# 3. Run each package's tests (expect: 67 passing total)
pnpm --filter @high-bar/payments test            # 30 passing — money-safety logic
pnpm --filter @high-bar/research test             # 21 passing — lead scoring + draft outreach
pnpm --filter @high-bar/mcp-expert-network test   # 16 passing — auth, scopes, rate limit, MCP/REST
```

- **Read the money-safety logic first:** [`packages/payments/src/policy.ts`](packages/payments/src/policy.ts) is the ~115-line `PayoutPolicyEngine` — kill-switch, eligibility allowlist, daily cap, and human-approval threshold, in that order. Its tests ([`packages/payments/test/policy.test.ts`](packages/payments/test/policy.test.ts)) read like an executable spec of the safety guarantees.
- **Live web console:** the Next.js PWA ([`apps/web/`](apps/web)) is **deployed on Railway** behind HTTP Basic auth (credentials available on request).
- **Guardrail knobs:** [`.env.example`](.env.example) documents `PAYOUT_APPROVAL_THRESHOLD`, `PAYOUT_DAILY_CAP`, and `AGENT_KILL_SWITCH`.

---

## Architecture

A TypeScript monorepo managed with **pnpm workspaces + Turborepo** (`apps/*`, `packages/*`, `services/*`).

```
self-running/
├─ apps/
│  ├─ web/             Next.js PWA — asker + expert UI, answer flow, approval inbox, dashboards   [built]
│  ├─ api/             Backend (tRPC + REST webhooks) — business logic, auth, payment orchestration  (planned)
│  └─ agent-gateway/   Orchestrates the Hermes runtime: task intake, cron loops, POLICY engine     (planned)
├─ services/
│  └─ hermes/          Nous Hermes agent runtime (container) — loop, skills, memory; OpenAI-compatible  (planned)
├─ packages/
│  ├─ core/            Domain model, Drizzle/Postgres schema, RBAC, audit log, shared zod contracts  [built]
│  ├─ payments/        Stripe — PaymentIntents (manual capture), Connect Express + Transfers, guardrails  [built · 30 tests]
│  ├─ research/        Lead gen, qualification scoring, LinkedIn/email DRAFT queue (no auto-send)    [built · 21 tests]
│  └─ mcp-expert-network/  MCP server + public agent API: list_domains, pricing, submit_question, …  [built · 16 tests]
└─ docs/               Operational notes (e.g. domain setup)
```

### The trust boundary (critical)

The Hermes loop runs as **its own process behind a gateway**. The gateway — *not* Hermes — owns authorization:

```
┌───────────────┐   proposes     ┌───────────────────────┐  authorizes   ┌─────────────┐
│  Hermes loop  │ ─────────────▶ │  agent-gateway         │ ────────────▶ │ side effect │
│ (AgentRuntime)│ ProposedAction │  PolicyEngine.evaluate │ PolicyDecision│ (payout,    │
│               │                │  caps · allowlist ·    │               │  draft, …)  │
└───────────────┘                │  approval threshold    │               └─────────────┘
        ▲                        └───────────────────────┘                      │
        │ untrusted content (questions, scraped leads) = DATA, never instructions
        └──────────────────────────────── audit_log ◀───────────────────────────┘
```

`agent-gateway` depends only on a thin `AgentRuntime` interface, so the loop provider is **swappable** (Hermes is the default, but the gateway never trusts it). Untrusted text — questions, answers, scraped lead data, web pages — is treated as **data and never shares a trust context with tool authorization**. Every proposed action is logged as `proposed → allowed/denied → executed`.

### Money / answer flow

```
Asker ──submit──▶ Question (authorize hold: Stripe PaymentIntent, manual capture)
                        │
                        ▼
                 Match & route ──▶ Vetted Expert ──writes──▶ Answer
                        │
        ┌───────────────┴────────────────┐
   accept │                               │ reject / SLA expiry
          ▼                               ▼
   capture PaymentIntent            cancel PaymentIntent
          │                          (void / refund)
          ▼
   Transfer to expert's Connect Express account
   (amount − platform fee) · guardrail-checked · idempotent
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Language | **TypeScript**, end-to-end |
| Monorepo | **pnpm** workspaces + **Turborepo** |
| Web / PWA | **Next.js** (installable PWA: asker + expert + approval inbox) |
| Backend | tRPC + REST webhooks *(planned `apps/api`)* |
| Data | **Postgres** via **Drizzle ORM** |
| Cache / queues | **Redis** (rate-limit, locks, queues) |
| Payments | **Stripe** — PaymentIntents (manual-capture escrow) + **Connect Express** Transfers for payouts |
| Agent API | **MCP** server + scoped REST API |
| Agent loop | **Nous Hermes** (OpenAI-compatible backend; optional Anthropic routing) |
| Hosting | **Railway** (Postgres + Redis + services) |

---

## Security model

Security is a **core design principle**, not an add-on. The money path and the agent path are the two highest-risk surfaces, and both are constrained by defense-in-depth:

- **Money-movement guardrails** (`packages/payments` + gateway policy): all capture/payout logic is server-side only; per-action and **daily spend caps** (`PAYOUT_DAILY_CAP`); a payee **allowlist** (only vetted, KYC'd experts with a verified Stripe Connect account); a **human-approval gate** above a configurable threshold (`PAYOUT_APPROVAL_THRESHOLD`); **idempotency keys** on every money operation (enforced unique in the schema); an immutable **audit log** of every proposed-vs-executed action; and a global **kill switch** (`AGENT_KILL_SWITCH`) that halts the autonomous loop.
- **Stripe**: restricted API keys, **test mode first**, **webhook signature verification** (`STRIPE_WEBHOOK_SECRET`). Card data never touches our servers (Stripe Elements/Checkout → **SAQ-A** PCI scope). Manual-capture PaymentIntent = authorize-then-capture escrow; Connect for expert payouts.
- **Prompt-injection defense**: untrusted text is sandboxed as data; tool-authorization decisions never read from untrusted content; the agent cannot read secrets or trigger payouts from injected instructions.
- **AuthN/Z**: managed auth + **RBAC** (`asker` / `expert` / `admin`); expert vetting + KYC before payout eligibility.
- **Agent / API access**: **scoped API keys** per consumer (only a hash is stored), **rate limiting** via Redis, strict **zod** input validation, output filtering.
- **Secrets**: live in **Railway only** — never in the repo. Separate sandbox/live credentials per environment, with a rotation plan.
- **Supply chain**: pinned lockfile, dependency scanning, minimal deps in money/agent paths. A dedicated security review audits every money/agent/auth slice before it ships.

---

## Data model

Core tables live in [`packages/core/src/db/schema.ts`](packages/core/src/db/schema.ts) (Drizzle + Postgres), mirroring the zod enums in [`packages/core/src/domain/enums.ts`](packages/core/src/domain/enums.ts):

| Table | Purpose |
|---|---|
| `users` | Accounts with a role (`asker` / `expert` / `admin`). |
| `experts` + `expert_domains` | Expert profiles, vetting status, KYC status, Stripe Connect account id, and the domains they cover. |
| `questions` | Paid questions: domain, title/body, status, price, currency, SLA hours, asker type (`human` / `agent`), assigned expert. |
| `answers` | Expert answers tied to a question, with accept/reject status. |
| `payments` | Charge to the asker — Stripe PaymentIntent (manual capture); status `authorized`→`captured`/`voided`/`refunded`; **unique idempotency key**. |
| `payouts` | Transfer to the expert — Stripe Connect; amount, `requires_approval`, approver; **unique idempotency key**. |
| `leads` | Biz-dev candidates (`expert_candidate` / `customer_candidate`) with source, score, and status. |
| `outreach_drafts` | **Draft-only** LinkedIn/email messages awaiting human approval before manual send. |
| `audit_log` | Every agent-proposed side effect: `proposed → allowed/denied → executed`, with actor, reason, and payload. |
| `api_keys` | Scoped keys for agent consumers — stored as a **hash only**, with per-key rate limits and revocation. |

---

## Public agent API / MCP

AI-agent consumers integrate over an **MCP server** (and an equivalent scoped REST API). Both surfaces validate against the exact zod schemas in [`packages/core/src/contracts/mcp-tools.ts`](packages/core/src/contracts/mcp-tools.ts):

| Tool | Input | Output |
|---|---|---|
| `list_domains` | — | Available domains with labels. |
| `pricing` | `domain` | Price (cents), currency, SLA hours for that domain. |
| `submit_question` | `domain`, `title`, `body`, `askerType`, `slaHours?` | `questionId`, `status`, and a Stripe PaymentIntent **client secret** to authorize the escrow hold. |
| `question_status` | `questionId` | Current status and the answer (once available). |

> The agent loop's own internal action surface (`outreach.draft`, `payout.create`, `lead.upsert`) is **separate** and never directly executable — it flows through the gateway `PolicyEngine` (see [`packages/core/src/contracts/agent-runtime.ts`](packages/core/src/contracts/agent-runtime.ts)).

---

## Getting started

### Prerequisites
- **Node.js 22+**
- **pnpm 10** (`corepack enable` to match the `packageManager` field in `package.json`)
- A Postgres database and a Redis instance (Railway provisions both — see [Deployment](#deployment))

### Setup

```bash
# 1. Configure environment
cp .env.example .env
#    then fill in real values (see the table below)

# 2. Install workspace dependencies
pnpm install

# 3. Run the web app in dev
pnpm dev          # runs @high-bar/web

# Other workspace scripts
pnpm build        # build every package/app (turbo)
pnpm typecheck    # typecheck across the monorepo
pnpm lint         # lint across the monorepo
```

### Environment variables

All variables are documented in [`.env.example`](.env.example). `.env` is git-ignored — **never commit real secrets**.

| Variable | Purpose |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` | Stripe API keys (test mode first). |
| `STRIPE_WEBHOOK_SECRET` | Verifies inbound Stripe webhook signatures (`whsec_…`). |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect (Express) for expert payouts. |
| `MODEL_BASE_URL` / `MODEL_API_KEY` | OpenAI-compatible backend for the Hermes loop. |
| `ANTHROPIC_API_KEY` | Optional — route Hermes to Claude instead. |
| `DATABASE_URL` | Postgres connection string. |
| `REDIS_URL` | Redis connection string. |
| `AUTH_SECRET` | Session/auth secret (`openssl rand -base64 32`). |
| `PAYOUT_APPROVAL_THRESHOLD` | USD above which a payout needs human approval (default `100`). |
| `PAYOUT_DAILY_CAP` | Hard daily ceiling on agent-initiated payouts (default `1000`). |
| `AGENT_KILL_SWITCH` | `true` halts the autonomous loop entirely. |
| `RAILWAY_TOKEN` | Railway deploy token. |

> LinkedIn needs **no keys** — outreach is **draft-only** and sent manually by a human.

---

## Deployment

High Bar deploys to **[Railway](https://railway.app/)**:

- A **Postgres** plugin (primary data store) and a **Redis** plugin (rate-limits, locks, queues).
- A **web** service for the Next.js PWA (additional services — `api`, `agent-gateway`, `hermes` — come online as those packages land).
- All secrets are stored in **Railway environment variables only**, with separate sandbox/live credentials per environment.

To put the app on the production domain **`highbar.dev`**, follow [`docs/DOMAIN_SETUP.md`](docs/DOMAIN_SETUP.md) — it walks through adding the custom domain in Railway and pointing DNS (apex + `www`) at the Railway target over HTTPS.

> `.dev` is on the browser HSTS preload list, so it is HTTPS-only; Railway issues TLS automatically once DNS resolves.

---

## Project status / roadmap

> **Active development.** The foundation and contracts are in place; several services and packages are still being built. Statuses below reflect the current tree.

| Milestone | Scope | Status |
|---|---|---|
| **M0 — Foundation** | Monorepo, `packages/core` schema + zod types, API/MCP/AgentRuntime contracts, Railway provisioning | ✅ Done |
| **M1 — Marketplace MVP** | Asker submits (PWA + MCP) → expert answers → authorize/capture/payout in sandbox | 🚧 In progress (`web`, `payments`) |
| **M2 — Agent core** | Hermes gateway + policy engine + audit + kill switch; cron biz-dev loop with daily digest | ⏳ Planned (`agent-gateway`, `hermes`) |
| **M3 — Research + outreach** | Lead gen, qualification, LinkedIn/email draft queue + approval inbox | 🚧 In progress (`research`) |
| **M4 — Hardening** | Security review actioned, rate limits, monitoring; promote toward live Stripe | ⏳ Planned |

**Currently in the repo (built + tested):** `apps/web` (deployed on Railway), `packages/core` (complete schema + contracts), `packages/payments` (30 tests), `packages/research` (21 tests), and `packages/mcp-expert-network` (16 tests) — **67 tests passing, all packages typecheck clean**. Still being wired end-to-end: `apps/agent-gateway`, `apps/api`, and `services/hermes` (the cron runtime that *invokes* the above on a schedule), all specified by the `packages/core` contracts.

---

<sub>Built as a delegated, spec-driven monorepo — shared contracts in <code>packages/core</code> are locked first so each slice can be built against stable boundaries.</sub>
