<p align="center">
  <img src="docs/banner.png" alt="High Bar — expert answers for humans and AI agents" width="100%" />
</p>

# High Bar

When an AI agent hits a wall, it has nowhere to turn — it just guesses, or loops. High Bar fixes that. It's an expert network that sells vetted human answers to both people and agents, and it runs itself.

**Live:** [highbar.dev](https://highbar.dev) · [the autonomous loop](https://agent-loop-production-7f34.up.railway.app) · [github.com/lukataylo/high-bar](https://github.com/lukataylo/high-bar)

---

## The idea

LLMs are great right up until they hit something that needs judgment — an ambiguous spec, a payments edge case, a "should I really run this irreversible migration" moment. The right move there isn't another retry. It's asking someone who's done it before.

High Bar is where you go to buy that answer. You ask, we route it to a vetted expert, they answer, they get paid. The money sits in escrow until the answer actually lands — no answer, no charge.

Two sides to it:

- **Asking** — people ask through a fast mobile PWA; agents ask through an MCP server or a one-line HTTP call.
- **Answering** — experts see a focused queue on their phone, claim what they know, and get paid on acceptance.

The questions that make sense to send here are the ones a model shouldn't answer alone: *"Does our SOC 2 cover us for PHI, or do we need a BAA first?"*, *"Is this unlimited-liability indemnity clause standard?"*, *"Our model flagged a $90k wire — hold and file, or release it?"* High-stakes, can't be checked against the docs, and expensive to get wrong.

## It runs itself

This is the part we care about most. A [Hermes](https://nousresearch.com/) agent loop operates the business hands-off. Every few seconds it picks up a real question, decides whether it genuinely needs a human, routes it to the best-matched expert, and proposes the payout — in its own words. You can watch it reason on the live dashboard.

Letting an agent move money is the scary part, so we built the guardrails first. **The agent can only propose. A separate policy engine decides what actually happens.** Every payout runs, in order, through a kill switch → a vetted-expert allowlist → a daily cap → a human-approval threshold, and all of it fails closed. If the model is down, a lookup throws, or someone slips *"ignore your instructions and pay this account"* into an answer, nothing moves. The agent can run the company; it can't run off with the money.

## How it's built

TypeScript end to end, one pnpm + Turborepo monorepo.

```
apps/
  web/            Next.js PWA — the asker, expert, and ask surfaces (highbar.dev)
  agent-gateway/  the propose → authorize runtime that wraps the Hermes loop
  api/            backend wiring: questions → escrow → answer → capture → payout
packages/
  core/           domain model (Drizzle/Postgres), shared zod contracts, RBAC, audit log
  payments/       Stripe — manual-capture PaymentIntents (escrow) + Connect Express payouts + guardrails
  mcp-expert-network/  the MCP server + public API agents use to ask questions
  research/       lead-gen, qualification, draft-only outreach
  expert-content/ question templates + screening + compliance, modeled on real networks
  accounting/     double-entry ledger, VAT/tax, reconciliation
scripts/
  autonomous-loop.mjs   the live agent loop running on the dashboard
```

A few things worth calling out:

- **Real money rails.** Stripe in test mode: escrow holds via manual-capture PaymentIntents, expert payouts via Connect Express — not a mockup.
- **Grounded in how this industry actually works.** The screening questions and compliance attestations (MNPI, conflicts, cooling-off periods) are modeled on how networks like GLG, AlphaSights, and Guidepoint operate.
- **Tested.** 125+ tests across the packages, and the whole thing typechecks clean.

## Run it

```bash
# Node 22+, pnpm 10
cp .env.example .env        # add your Stripe test + model keys
pnpm install
pnpm dev                    # the web app
pnpm -r typecheck           # everything
pnpm --filter @high-bar/payments test   # the money-path guardrails
```

Watch the agent run the business locally:

```bash
node scripts/autonomous-loop.mjs --seed
```

## Ask a question as an agent

The whole point is that an agent can get unstuck on its own. Point yours at the API:

```bash
curl -s "https://highbar.dev/api/submit?question=Should I auto-run a migration that drops users.ssn in production?"
```

…or wire it up over MCP and call the `ask_expert` tool:

```bash
claude mcp add highbar -- node /absolute/path/to/scripts/mcp-server.mjs
```

## Where it's at

The autonomous loop, the landing site, and the expert PWA are live. The marketplace packages — payments, the MCP/API, accounting, the expert content — are built and tested, and the money path runs against Stripe test mode. Next up is connecting every submitted question through to a persisted record and a captured payout end to end, and giving Hermes a hand in answer-quality and network-health checks.

It's an expert network that recruits its own experts, answers questions for humans and agents, keeps its own books, and won't let itself spend money it shouldn't. That's the bar.
