# High Bar — Security Model & Threat Model

> A long-running agent that can move money is a high-value attack surface. This document is an
> adversarial threat model: assets, adversaries, attack surfaces, the concrete controls that
> defend each one (with file citations), what fails closed on error, and honest residual risk.
>
> **Core invariant:** *the agent proposes; the gateway authorizes.* Untrusted text never shares
> a trust context with tool authorization. See
> `packages/core/src/contracts/agent-runtime.ts`.

---

## 1. Assets we protect

| Asset | Why it matters |
|---|---|
| **Asker funds in escrow** | Authorized-but-uncaptured PaymentIntents; mis-capture or mis-refund is real money lost. |
| **Expert payout destinations** | Stripe Connect account ids (`acct_...`). Redirecting a payout destination = theft. |
| **API keys & secrets** | Stripe secret/restricted keys, webhook secret, model API keys, `DATABASE_URL`, `AUTH_SECRET`. |
| **PII** | Asker/expert identities, emails, question/answer bodies, KYC status. |
| **The agent's authority** | The capability to *propose* payouts, drafts, and lead writes. If subverted, the blast radius is bounded only by the policy engine. |
| **The audit trail** | The tamper-evident record (`audit_log`) that lets operators see *what the agent wanted vs. what ran*. |

---

## 2. Adversaries

| Adversary | Goal |
|---|---|
| **Malicious asker** | Get a free answer; trigger a refund after capture; abuse SLA logic. |
| **Malicious / impersonating expert** | Receive a payout without being vetted/KYC'd; inflate payout amount. |
| **Prompt-injection author** | Embed instructions in untrusted content (question bodies, **expert answers**, scraped lead data, fetched web pages) to make the agent move money, leak secrets, or self-approve. |
| **Leaked-API-key holder** | Use a stolen agent API key to spam the marketplace or exfiltrate data. |
| **Webhook forger / replayer** | Forge or replay a Stripe webhook to fake a capture/payout or double-process one. |
| **Compromised agent / model** | The Hermes loop itself is buggy or subverted and emits hostile proposed actions. |
| **Curious insider** | Read secrets or PII beyond their role. |

**Trust assumption:** the Hermes loop is treated as **untrusted**. The gateway depends only on a
thin `AgentRuntime` interface and never trusts its output — every proposed action is
re-authorized server-side.

---

## 3. Attack surfaces & controls

### 3.1 Money path (highest risk)

Defense-in-depth, all **fail-closed**. The `PayoutPolicyEngine`
(`packages/payments/src/policy.ts`) implements a deliberate 5-stage decision order and
**default-denies anything that is not a `payout.create`**:

| Stage | Check | Deny condition |
|---|---|---|
| 0 | **Action type** | Not `payout.create` → deny ("only evaluates payout.create actions"). |
| 1 | **Kill-switch** (`AGENT_KILL_SWITCH`) | Engaged → deny all agent payouts. |
| 2 | **Eligibility allowlist** | Expert missing, not `vetted`, KYC ≠ `verified`, or no Connect account → deny. |
| 3 | **Daily cap** (`PAYOUT_DAILY_CAP`) | `sentToday + amount > cap` → deny. |
| 4 | **Approval threshold** (`PAYOUT_APPROVAL_THRESHOLD`) | Over threshold → allow **but** `requiresHumanApproval = true`. |
| 5 | Within all limits | Auto-approve. |

Supporting controls:
- **Manual-capture escrow** — funds authorized on submit, captured only on acceptance; reject /
  SLA-expiry voids or refunds (`packages/payments/src/payments.ts`, status machine in
  `packages/core/src/db/schema.ts` `payment_status`).
- **Idempotency keys** — every money operation carries one; enforced **unique** in the schema
  (`payments.idempotencyKey`, `payouts.idempotencyKey`, plus a unique `payments_pi_idx` on the
  PaymentIntent id). A retried/replayed operation cannot double-spend.
- **Every decision re-parsed** through the `PolicyDecision` zod schema
  (`policy.ts#decision`) so no malformed allow can escape.
- **Server-side only** — all capture/payout logic runs server-side; card data never touches our
  servers (Stripe Elements/Checkout → SAQ-A PCI scope).

### 3.2 Webhook replay / forgery

- **Signature verification** — `verifyWebhookSignature` (`packages/payments/src/webhooks.ts`)
  calls `stripe.webhooks.constructEvent` over the **raw** body; a forged or tampered signature
  throws and the request is rejected. Missing secret → `ConfigError` (deny).
- **No side effects in the mapper** — `mapEventToOutcome` performs **no DB writes**; unhandled
  events map to `{ kind: "ignored" }`, so unknown event types are inert.
- **Replay dedupe** — money mutations land behind the unique idempotency keys / unique
  PaymentIntent + transfer ids, so a replayed event cannot capture or pay out twice.
  *In progress:* event-id-level dedupe (persisting processed Stripe `event.id`) lives in the
  `apps/api` webhook handler, which is still being wired end-to-end — see
  [Residual risks](#5-residual-risks--next-steps).

### 3.3 MCP / REST agent API

`packages/mcp-expert-network/src/{auth,http}.ts`:
- **Hashed keys only** — keys are stored and compared as **sha-256 hashes** (`hashApiKey`);
  the raw secret is discarded at the edge and never logged or persisted
  (`api_keys.hashedKey`, unique).
- **Revoked = unknown** — `ApiKeyPort.lookup` returns `null` for both unknown *and* revoked
  keys; the caller never learns which (no enumeration oracle).
- **Scopes** — reads require `questions:read`, writes require `questions:write`
  (`requireScope`); missing scope → 403.
- **Per-key token-bucket rate limit** — `InMemoryRateLimitStore` (Redis-backed in prod) keyed by
  the hashed key; exhausted bucket → 429.
- **Strict input validation** — every route parses against the exact zod contract
  (`@high-bar/core/contracts`); invalid body → 400, output also re-parsed before return.

### 3.4 Prompt-injection isolation

- **Propose / authorize split** — the agent's internal action surface (`outreach.draft`,
  `payout.create`, `lead.upsert`) is **never directly executable**. It flows through the gateway
  `PolicyEngine` as a `ProposedAction` and only runs after a `PolicyDecision.allowed`
  (`packages/core/src/contracts/agent-runtime.ts`).
- **Untrusted text is data, never authorization** — question bodies, **expert answers**, scraped
  lead data, and fetched pages can *suggest* an action but the engine authorizes against the
  **real** server-side record (e.g. expert eligibility), not against the text. An injected
  "pay $5,000 to acct_attacker" fails at the allowlist because the attacker has no
  vetted/KYC'd/connected record.
- **No secret access from the loop** — the agent cannot read secrets or trigger payouts from
  injected instructions; secrets live only in the gateway/host environment.

### 3.5 Draft-only outreach

`packages/research/src/outreach.ts`:
- `buildOutreachDraft` **never sends** — it returns a body handed to the policy engine as an
  `outreach.draft` proposal; a human approves and sends manually (`outreach_drafts.status`:
  `draft → approved → sent`). **No auto-send, no scraping/automation** of LinkedIn — ToS-safe by
  construction. LinkedIn needs no API keys at all.

### 3.6 AuthZ / RBAC + audit

- **RBAC** — coarse permissions per role (`packages/core/src/rbac.ts`): `asker`, `expert`,
  `admin`. Payout approval (`payout:approve`) and outreach approval (`outreach:approve`) are
  admin-only; `can()` enforces at the API boundary.
- **Immutable audit log** — every proposed side effect is recorded `proposed → allowed/denied →
  executed` with actor, reason, and payload (`packages/core/src/audit.ts`, `audit_log` table).
  This is the trail the security model depends on.

### 3.7 Secrets management

- Secrets live in **Railway environment variables only** — never in the repo (`.env` is
  git-ignored; `.env.example` carries no values). Separate sandbox/live credentials per
  environment, with a rotation plan. Stripe runs **test mode first** with restricted keys.

---

## 4. What fails closed on error

The system **denies / no-ops** rather than proceeding whenever a dependency is unavailable or an
input is malformed:

| Failure | Behavior | Where |
|---|---|---|
| **Model / Hermes loop down** | No proposed actions emitted; nothing executes. Loop output is untrusted anyway and re-authorized. | `agent-runtime.ts` (propose/authorize split) |
| **Policy config unreadable / ambiguous** | Default-deny; only the final stage allows. Non-payout actions denied outright. | `policy.ts` (`evaluate` default-deny) |
| **Expert record missing / DB lookup null** | Deny ("Expert not found; cannot authorize payout"). | `policy.ts` stage 2 |
| **Daily-totals lookup unavailable** | Treated as failure → deny (no allow without a known total). | `policy.ts` stage 3 |
| **Webhook secret missing** | `ConfigError` thrown → request rejected. | `webhooks.ts` `verifyWebhookSignature` |
| **Bad / forged webhook signature** | Stripe SDK throws → 4xx, no processing. | `webhooks.ts` |
| **Unknown webhook event type** | Mapped to `ignored`, zero side effects. | `webhooks.ts` `mapEventToOutcome` |
| **Unknown / revoked API key** | 401, indistinguishable from unknown. | `auth.ts` `lookup`, `http.ts` |
| **Missing scope** | 403. | `http.ts` `requireScope` |
| **Rate bucket exhausted** | 429. | `auth.ts` `InMemoryRateLimitStore.take` |
| **Invalid request body** | 400 from zod `safeParse`. | `http.ts` `parseBody` |
| **Kill-switch engaged** | All agent payouts denied at stage 1. | `policy.ts` stage 1 |
| **Malformed policy decision** | `PolicyDecision.parse` throws rather than emit a bad allow. | `policy.ts` `decision` |

---

## 5. Residual risks / next steps

Honest accounting of what is **not** yet fully closed:

1. **Cron runtime not wired end-to-end.** `apps/agent-gateway`, `apps/api`, and
   `services/hermes` are specified by the `packages/core` contracts but not yet running on a
   schedule. The guardrails (`packages/payments`, `packages/research`, MCP/REST) are built and
   tested (67 tests passing); the orchestrator that *invokes* them on a cron is in progress.
2. **Event-id webhook dedupe** lives in the not-yet-wired `apps/api` handler. Today, replay
   protection rests on the unique idempotency keys and unique PaymentIntent/transfer ids
   (strong against double-spend) rather than a persisted processed-`event.id` ledger.
3. **In-memory ports in tests.** `InMemoryApiKeyStore` / `InMemoryRateLimitStore` are reference
   implementations; production must back them with Postgres/Redis so rate limits and key lookups
   are durable and shared across instances.
4. **Daily cap is global, not per-expert.** `PAYOUT_DAILY_CAP` bounds total agent spend per day
   but does not yet cap per-expert or detect anomalous payout *patterns* (e.g. many small
   payouts to one new account just under the threshold).
5. **No automated anomaly/dispute detection yet.** Disputes and chargebacks are modeled in the
   schema but automated detection and response are future work (M4 hardening).
6. **KYC / vetting trust.** The allowlist trusts the `experts.status` / `kycStatus` fields;
   the vetting and KYC *intake* pipeline that sets them must itself be hardened against
   fraudulent applicants.
7. **Supply chain.** Lockfile is pinned and money/agent paths keep deps minimal, but continuous
   dependency scanning and a signed-build pipeline are still to be added.
8. **Audit-log immutability** is enforced by convention/app logic today; append-only storage
   guarantees (e.g. WORM / hash-chaining) are a hardening item.

> Bottom line: the **money-decision core fails closed and is tested today**. The remaining work
> is wiring the orchestrator and adding durable infra + anomaly detection around an already
> default-deny core.
