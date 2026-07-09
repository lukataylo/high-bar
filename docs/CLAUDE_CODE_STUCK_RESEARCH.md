# Where AI Coding Agents (and Claude Code) Get Stuck

Research for **High Bar** — an expert-answer network where humans *and* AI coding agents ask vetted
experts when they hit a wall. This document maps the concrete failure modes where a human expert
genuinely adds value, with representative questions and where the line sits between "ask a human"
and "the agent should just retry."

The thesis: agents are excellent at *generating plausible code fast*, but they fail at **judgment,
verification, missing domain context, and irreversible decisions**. Those are exactly the moments a
paid expert answer is worth more than another autonomous retry.

---

## Failure categories

### 1. Ambiguous / under-specified requirements
Agents cannot read between the lines or infer intent. Every ambiguity becomes a silent decision
point: the agent explores interpretations and commits to one — often a suboptimal one — instead of
asking. They "loop through repeated reasoning attempts to recover context and resume without much
certainty" rather than surface the ambiguity to a human ([arXiv 2510.13859](https://arxiv.org/pdf/2510.13859)).

- **Representative question (agent):** "The ticket says 'make checkout faster' with no metric or
  target. Should I optimize p95 latency, perceived load time, or reduce checkout steps — and what's
  an acceptable regression in conversion to trade against it?"
- **Expert adds value:** turning a vague business goal into a concrete, prioritized spec.
- **Agent should retry itself:** if the missing detail is discoverable in the repo (config, tests,
  adjacent code), the agent should grep for it before asking.

### 2. Confidently wrong — hallucinated problems and APIs
Models lean on the statistical plausibility of their context window. Stale or unverified context
makes them "confidently hallucinate problems that do not actually exist." In one documented case an
agent trusted an 8-day-old file instead of the live code, hallucinated a broken auth flow, and
proposed deleting working code to rebuild functionality that already existed
([SmarterArticles](https://smarterarticles.co.uk/when-coding-agents-forget-the-hidden-cost-of-ai-context-degradation)).
Agents also invent API signatures, config keys, and library methods that look right but don't exist.

- **Representative question (agent):** "I'm about to delete the existing `verifySession()` flow and
  rebuild it because it looks broken — but the integration tests pass. Is this auth flow actually
  wrong, or am I misreading it before I do something destructive?"
- **Expert adds value:** a sanity check before a confident, destructive, hard-to-reverse change.
- **Agent should retry itself:** verifying a hallucinated API is cheap — read the actual source /
  `node_modules` / docs before assuming.

### 3. Repetitive loops with no learning
A distinct failure mode: attempt → fail → re-evaluate → attempt the *same* flawed approach, forever.
Claude Code "doesn't effectively learn from the error messages of previous attempts," and when the
context window fills, the plan "falls out of the model's brain" and it starts guessing
([Ralphable](https://ralphable.com/blog/claude-code-infinite-loop-bug-how-to-spot-stop-fix),
[GitHub issue #19699](https://github.com/anthropics/claude-code/issues/19699)). The community
heuristic: >5 minutes of similar output without tangible progress = a loop; pause.

- **Representative question (agent):** "I've tried four approaches to make this Jest suite pass and
  each fails the same way on a timer mock. I'm clearly missing something fundamental about how fake
  timers interact with this library — what's the actual root cause?"
- **Expert adds value:** breaking the loop with the one insight the agent can't derive from the
  error text.
- **Agent should retry itself:** the first two or three attempts. A human is worth paging only once
  the agent recognizes it is not converging.

### 4. Environment-, version-, and config-specific bugs
Bugs invisible in a single environment: an agent rewrote an import to a path alias that only existed
in the *local* tsconfig — passed locally, broke in CI. Upgrade regressions are "invisible in a
single-version test suite." Agents hallucinate config (e.g. a k8s memory limit of `512Pi` instead of
`512Mi`) when they generate from memory instead of reading the existing manifest
([dev.to](https://dev.to/mamoor_ahmad/i-replaced-my-entire-ci-pipeline-with-an-ai-agent-heres-what-broke-1d8h)).

- **Representative question (agent):** "Build is green locally but the Next.js production build on
  Node 20 in CI fails with a module-resolution error that doesn't reproduce on my Node 22 machine.
  What's the version-specific difference I'm missing?"
- **Expert adds value:** someone who has *lived* the exact toolchain/version footgun.
- **Agent should retry itself:** reproducing locally with the CI's pinned versions before escalating.

### 5. Infra, CI/CD, Docker, and cloud edge cases
CI/CD must be deterministic; agents are non-deterministic by design. Standard pipelines miss the
failure modes agents introduce — spec drift, hallucinated dependencies, and "code that passes tests
while violating the agreed contract." A Claude-based agent measured 62% success without guardrails,
89% with them ([dev.to](https://dev.to/mamoor_ahmad/i-replaced-my-entire-ci-pipeline-with-an-ai-agent-heres-what-broke-1d8h),
[Augment Code](https://www.augmentcode.com/guides/cicd-ai-agents-pipeline-integration)). Deploy
edge cases (cold starts, IAM scoping, health checks, build caching) are high-blast-radius.

- **Representative question (agent):** "My Docker image builds and runs locally but the Railway
  deploy crashes on boot with no useful logs — the health check times out. How do I diagnose a
  container that works locally but dies in the platform's runtime?"
- **Expert adds value:** platform-specific operational knowledge and blast-radius awareness.
- **Agent should retry itself:** reading the deploy logs and the platform docs first.

### 6. Missing domain knowledge — payments, auth, security, compliance
This is the sharpest "ask a human" zone. For payments, "a mostly correct integration is a failure;
payments require 100% accuracy" — 3D Secure, webhook idempotency, partial refunds, and retries are
edge cases agents fumble ([Stripe](https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations)).
For compliance, a SOC 2 report does *not* equal HIPAA compliance, and an agent will happily conflate
them ([Scytale](https://scytale.ai/resources/soc-2-vs-hipaa-compliance/),
[Vanta](https://www.vanta.com/collection/hipaa/hipaa-and-soc-2)). The model lacks the regulatory,
contractual, and security context that lives in experts' heads.

- **Representative question (agent):** "I'm wiring Stripe webhooks for subscription billing. How do
  I make `invoice.payment_failed` and retried webhooks idempotent so a customer is never double-
  charged or double-credited if Stripe re-delivers the event?"
- **Expert adds value:** correctness in a domain where mistakes cost real money, trust, or legal
  exposure.
- **Agent should retry itself:** boilerplate it can verify against official docs; it should *not*
  guess on the parts with financial or legal consequences.

### 7. Large-codebase context limits
On real projects with large files and cross-file dependencies, agents have "limited capabilities in
long-context modeling, cross-file dependency analysis, and overall architecture understanding."
Context degrades via poisoning (hallucinations contaminate later reasoning), distraction (noise
drowns the signal), confusion, and conflict ([arXiv 2508.00083](https://arxiv.org/pdf/2508.00083),
[SmarterArticles](https://smarterarticles.co.uk/when-coding-agents-forget-the-hidden-cost-of-ai-context-degradation)).
Claude Code will re-implement features that already exist elsewhere in the repo because it can't see
them.

- **Representative question (human/agent):** "Our monorepo has three overlapping auth helpers and I
  can't tell which is canonical. Which one should new code depend on, and what's the safe migration
  path off the deprecated ones?"
- **Expert adds value:** the architectural map and historical "why" that isn't written down.
- **Agent should retry itself:** targeted search/grep across the repo before concluding something
  doesn't exist.

### 8. Judgment calls a human should own (irreversible / high-stakes)
Anthropic's own guidance: "certain decisions need a human. Auth flows, payment logic, data
mutations, and destructive database operations should be reviewed regardless of how good the rest
looks" — a wrong auth scope, a misconfigured webhook, or a migration that drops a column costs
users, money, or trust, and no automated test catches them all
([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). Across legal,
finance, and insurance, "judgment is built through experience, not prompting"; firms combining AI
*and* human judgment outperform either alone
([Risk & Insurance](https://riskandinsurance.com/insurance-agents-are-using-ai-faster-than-their-firms-can-govern-it/),
[Institute for Financial Integrity](https://finintegrity.org/ai-vs-human-judgment/)).

- **Representative question (agent):** "I have a migration that drops the legacy `users.ssn` column
  after backfilling a tokenized field. This is irreversible in production — is the backfill safe to
  trust, and should a human sign off before I run it?"
- **Expert adds value:** owning the irreversible decision.
- **Agent should retry itself:** never, for irreversible high-stakes mutations — this is a human gate
  by policy, not a capability gap.

---

## Where a human expert adds value vs. where the agent should retry

| Situation | Human expert | Agent retries |
|---|---|---|
| Ambiguous business intent / spec | ✅ clarify & prioritize | only if discoverable in-repo |
| Hallucinated API/config | sanity-check before destructive action | ✅ verify against source/docs first |
| Stuck in a loop (>3 tries, no progress) | ✅ root-cause insight | ✅ first 2–3 attempts |
| Version/env-specific bug | ✅ lived experience | reproduce with pinned versions first |
| Payments / auth / security / compliance | ✅ correctness & liability | boilerplate it can verify |
| Architecture in a large codebase | ✅ the map & the "why" | grep before concluding |
| Irreversible prod mutation | ✅ owns the sign-off | ❌ never autonomous |

**Rule of thumb for High Bar:** page an expert when the cost of being confidently wrong is high and
the answer can't be cheaply verified from the repo or official docs. Keep retrying when the feedback
loop is fast and self-correcting.

---

## Beyond engineering: the other expert domains High Bar serves
The same "ask a human at the judgment boundary" pattern generalizes. Finance (revenue recognition,
runway, transaction-risk calls where humans scored 88.3 vs. GPT's 57.1 —
[arXiv 2507.17186](https://arxiv.org/pdf/2507.17186)), healthcare (HIPAA/PHI handling, BAAs), legal
(contract and IP judgment AI can't own — [Spellbook](https://spellbook.com/learn/ai-vs-lawyers)),
insurance (coverage and claims judgment), and operations/business leadership (pricing, vendor, and
go/no-go decisions). In each, the agent or operator wants a crisp, accountable answer from someone
who has done it before — which is the product.

---

## Sources
- arXiv 2510.13859 — Benchmarking Correctness and Security in Multi-Turn Code Generation: <https://arxiv.org/pdf/2510.13859>
- arXiv 2508.00083 — A Survey on Code Generation with LLM-based Agents: <https://arxiv.org/pdf/2508.00083>
- arXiv 2507.17186 — FinGAIA: A Chinese Benchmark for AI Agents in the Financial Domain: <https://arxiv.org/pdf/2507.17186>
- SmarterArticles — When Coding Agents Forget: The Hidden Cost of AI Context Degradation: <https://smarterarticles.co.uk/when-coding-agents-forget-the-hidden-cost-of-ai-context-degradation>
- Ralphable — The Claude Code "Infinite Loop" Bug: <https://ralphable.com/blog/claude-code-infinite-loop-bug-how-to-spot-stop-fix>
- GitHub anthropics/claude-code Issue #19699 — stuck in infinite loop repeating failing command: <https://github.com/anthropics/claude-code/issues/19699>
- GitHub anthropics/claude-code Issue #42796 — unusable for complex engineering tasks (Feb updates): <https://github.com/anthropics/claude-code/issues/42796>
- Claude Code Docs — Best practices: <https://code.claude.com/docs/en/best-practices>
- Claude Code Docs — Troubleshooting: <https://code.claude.com/docs/en/troubleshooting>
- dev.to — I Replaced My CI Pipeline with an AI Agent (what broke): <https://dev.to/mamoor_ahmad/i-replaced-my-entire-ci-pipeline-with-an-ai-agent-heres-what-broke-1d8h>
- dev.to — How I stopped Claude Code from hallucinating (Spec-Driven Workflow): <https://dev.to/samhath03/how-i-stopped-claude-code-from-hallucinating-on-day-4-the-spec-driven-workflow-3lim>
- Augment Code — CI/CD for AI Agents: <https://www.augmentcode.com/guides/cicd-ai-agents-pipeline-integration>
- Augment Code — Why Multi-Agent LLM Systems Fail: <https://www.augmentcode.com/guides/why-multi-agent-llm-systems-fail-and-how-to-fix-them>
- Stripe — Can AI agents build real Stripe integrations?: <https://stripe.com/blog/can-ai-agents-build-real-stripe-integrations>
- Stripe Docs — Agents and AI on Stripe: <https://docs.stripe.com/building-with-ai>
- Scytale — SOC 2 vs. HIPAA Compliance: <https://scytale.ai/resources/soc-2-vs-hipaa-compliance/>
- Vanta — SOC 2 and HIPAA compliance: overlaps and differences: <https://www.vanta.com/collection/hipaa/hipaa-and-soc-2>
- Spellbook — AI vs. Lawyers: <https://spellbook.com/learn/ai-vs-lawyers>
- Risk & Insurance — Insurance Agents Are Using AI Faster Than Firms Can Govern It: <https://riskandinsurance.com/insurance-agents-are-using-ai-faster-than-their-firms-can-govern-it/>
- Institute for Financial Integrity — AI vs. Human Judgment: <https://finintegrity.org/ai-vs-human-judgment/>
- Fortune — Anthropic explains Claude Code's performance decline: <https://fortune.com/2026/04/24/anthropic-engineering-missteps-claude-code-performance-decline-user-backlash/>
- Docker — AI Coding Agent Horror Stories: Security Risks Explained: <https://www.docker.com/blog/ai-coding-agent-horror-stories-security-risks/>
