// Realistic, research-grounded sample questions for High Bar.
//
// These mix questions submitted *by AI coding agents* (e.g. Claude Code) when they
// hit a judgment boundary, with questions submitted *by humans* who need an expert
// answer before they act. Grounded in docs/CLAUDE_CODE_STUCK_RESEARCH.md.
//
// Plain typed data module — no imports, compiles under the repo's strict tsconfig.

export type QuestionDomain =
  | "engineering"
  | "finance"
  | "healthcare"
  | "legal"
  | "insurance"
  | "operations";

export type QuestionSource = "agent" | "human";

export type RealisticQuestion = {
  id: string;
  question: string;
  domain: QuestionDomain;
  source: QuestionSource;
  expert: string;
  answer: string;
  bountyUsd: number;
  slaHours: number;
};

export const realisticQuestions: RealisticQuestion[] = [
  {
    id: "RQ-001",
    question:
      "I'm wiring Stripe subscription webhooks. How do I make invoice.payment_failed and re-delivered events idempotent so a customer is never double-charged or double-credited when Stripe retries the same event?",
    domain: "engineering",
    source: "agent",
    expert: "Daniel Ruiz, Payments Infrastructure Lead",
    answer:
      "Persist each event by its Stripe event id and short-circuit if you've seen it; do all credit/charge effects inside a single DB transaction keyed on that id. Trust the subscription's current state from the API, not the event order, since Stripe re-delivers and reorders.",
    bountyUsd: 320,
    slaHours: 24,
  },
  {
    id: "RQ-002",
    question:
      "I'm about to delete the existing verifySession() auth flow and rebuild it because it looks broken — but the integration tests pass. Is this flow actually wrong, or am I misreading it before I do something destructive?",
    domain: "engineering",
    source: "agent",
    expert: "Priya Nair, Application Security Engineer",
    answer:
      "Don't delete it. Passing integration tests on an auth flow is strong evidence it works; the smell you're seeing is almost certainly an unfamiliar-but-valid pattern. Add a failing test that proves the bug first — if you can't write one, there's no bug.",
    bountyUsd: 280,
    slaHours: 12,
  },
  {
    id: "RQ-003",
    question:
      "Build is green locally on Node 22 but the production Next.js build fails in CI on Node 20 with a module-resolution error I can't reproduce. What version-specific difference am I missing?",
    domain: "engineering",
    source: "agent",
    expert: "Alex Morgan, Build & Release Engineer",
    answer:
      "Reproduce with CI's exact Node and a clean install (rm -rf node_modules and use the lockfile), since Node 20 vs 22 differ on ESM/CJS resolution and conditional exports. Pin the version in .nvmrc and the CI matrix so local and CI can't drift.",
    bountyUsd: 240,
    slaHours: 24,
  },
  {
    id: "RQ-004",
    question:
      "I've tried four approaches to make this Jest suite pass and each fails identically on a fake-timer mock. I'm clearly missing something fundamental about how fake timers interact with this async library — what's the root cause?",
    domain: "engineering",
    source: "agent",
    expert: "Maya Chen, Senior Test Engineer",
    answer:
      "Fake timers don't advance promises by themselves — you need to interleave await with jest.advanceTimersByTimeAsync(), or microtasks scheduled inside the timer callback never flush. Switch to the async timer API and await between advances.",
    bountyUsd: 180,
    slaHours: 12,
  },
  {
    id: "RQ-005",
    question:
      "My Docker image builds and runs locally but the Railway deploy crashes on boot — the health check times out with no useful logs. How do I diagnose a container that works locally but dies in the platform runtime?",
    domain: "engineering",
    source: "agent",
    expert: "Sofia Almeida, Platform Reliability Engineer",
    answer:
      "It's almost always binding to localhost instead of 0.0.0.0 or the wrong PORT — Railway injects PORT and routes to it, so bind to process.env.PORT on 0.0.0.0. Point the health check at a route that returns before external dependencies connect.",
    bountyUsd: 260,
    slaHours: 12,
  },
  {
    id: "RQ-006",
    question:
      "I have a migration that drops the legacy users.ssn column after backfilling a tokenized field. This is irreversible in production — is the backfill safe to trust, and should a human sign off before I run it?",
    domain: "engineering",
    source: "agent",
    expert: "Priya Nair, Application Security Engineer",
    answer:
      "Do not auto-run this. Ship it as two deploys: backfill and verify row counts match first, keep the column for a release as a safety net, then drop it in a follow-up. Irreversible production data deletion is a mandatory human sign-off gate.",
    bountyUsd: 450,
    slaHours: 8,
  },
  {
    id: "RQ-007",
    question:
      "Our monorepo has three overlapping auth helpers and I can't tell which is canonical. Which should new code depend on, and what's the safe migration path off the deprecated ones?",
    domain: "engineering",
    source: "human",
    expert: "Alex Morgan, Staff Engineer",
    answer:
      "Standardize on the one the API routes import (the others are pre-refactor leftovers). Mark the legacy two @deprecated, add a lint rule to block new imports, and migrate call sites opportunistically rather than in one risky sweep.",
    bountyUsd: 300,
    slaHours: 48,
  },
  {
    id: "RQ-008",
    question:
      "The ticket says 'make checkout faster' with no target metric. Should I optimize p95 latency, perceived load time, or cut checkout steps — and what conversion regression is acceptable to trade against it?",
    domain: "engineering",
    source: "agent",
    expert: "Maya Chen, Product Engineering Lead",
    answer:
      "Optimize perceived time-to-interactive on the payment step first — that's what moves conversion — and treat p95 server latency as a guardrail, not the goal. Never trade measurable conversion for speed; require an A/B test before shipping anything that could regress it.",
    bountyUsd: 220,
    slaHours: 24,
  },
  {
    id: "RQ-009",
    question:
      "An adversarial prompt could make our spending agent loop and drain the account. How do I architect hard spend limits so even buggy or compromised agent code can't exceed them?",
    domain: "engineering",
    source: "agent",
    expert: "Daniel Ruiz, Payments Infrastructure Lead",
    answer:
      "Enforce limits at the issuing layer, not in agent code: scoped virtual cards with per-transaction and daily caps so an over-limit charge is declined by the network. Treat the agent as untrusted and put the budget where it can't reach it.",
    bountyUsd: 340,
    slaHours: 24,
  },
  {
    id: "RQ-010",
    question:
      "Does our SOC 2 Type II report cover us for handling protected health information, or do we separately need HIPAA compliance and a BAA before we can onboard a hospital customer?",
    domain: "healthcare",
    source: "human",
    expert: "Dr. Lena Whitfield, Healthcare Compliance Advisor",
    answer:
      "SOC 2 does not satisfy HIPAA — they overlap on controls but HIPAA is a legal requirement with its own Security and Privacy Rules. If you create, receive, or transmit PHI for a covered entity you're a business associate and must sign a BAA before onboarding.",
    bountyUsd: 500,
    slaHours: 48,
  },
  {
    id: "RQ-011",
    question:
      "We're pre-revenue SaaS closing a seed round. For a customer who prepaid 12 months upfront, how should I recognize that revenue so our books and metrics don't mislead investors?",
    domain: "finance",
    source: "human",
    expert: "Marcus Bell, Fractional CFO",
    answer:
      "Recognize it ratably over the 12-month service period under ASC 606 — the cash is deferred revenue on the balance sheet, not revenue on day one. Report ARR and recognized revenue separately so investors see both cash collected and earned.",
    bountyUsd: 400,
    slaHours: 48,
  },
  {
    id: "RQ-012",
    question:
      "Our flagged-transaction model says this $90k wire is high-risk but the customer is a long-standing account. Do we hold it and file, or release it — and what's our actual obligation before we decide?",
    domain: "finance",
    source: "human",
    expert: "Naomi Carter, AML / Transaction Risk Officer",
    answer:
      "Hold pending review and document your rationale; a model score is an input, not a decision. If the activity is suspicious after review you must file a SAR within the regulatory window and must not tip off the customer — escalate to your BSA officer before releasing.",
    bountyUsd: 600,
    slaHours: 24,
  },
  {
    id: "RQ-013",
    question:
      "A customer in the EU wants us to delete all their data, but some sits in immutable backups and some we're required to retain for tax purposes. How do I satisfy a GDPR erasure request without breaking those obligations?",
    domain: "legal",
    source: "human",
    expert: "Hannah Voss, Data Protection Counsel",
    answer:
      "Erase from live systems now and document a backup retention schedule with deletion on the next rotation — GDPR accepts this if backups aren't restored to active use. Legal retention obligations are a valid Article 17 exception, so retain that subset and tell the customer exactly what and why.",
    bountyUsd: 480,
    slaHours: 48,
  },
  {
    id: "RQ-014",
    question:
      "We're a 15-person startup signing our first enterprise MSA. The customer added an unlimited-liability indemnification clause. Is that standard, and what should I push back on before signing?",
    domain: "legal",
    source: "human",
    expert: "Hannah Voss, Commercial Counsel",
    answer:
      "Unlimited indemnity is not standard for a vendor your size — negotiate a liability cap (commonly 12 months of fees) with narrow carve-outs only for IP infringement and data breach. Don't sign uncapped exposure that could exceed the entire contract value.",
    bountyUsd: 520,
    slaHours: 48,
  },
  {
    id: "RQ-015",
    question:
      "We had a minor data exposure — a misconfigured bucket, no confirmed exfiltration. Does our cyber insurance policy require us to notify the carrier now, and could investigating it ourselves first jeopardize coverage?",
    domain: "insurance",
    source: "human",
    expert: "Greg Olsen, Cyber Insurance Broker",
    answer:
      "Notify the carrier immediately — most cyber policies require prompt notice and using their approved forensics panel, and going it alone first can void coverage for those costs. Notice is not the same as a claim; late notice is the more common reason claims get denied.",
    bountyUsd: 450,
    slaHours: 12,
  },
  {
    id: "RQ-016",
    question:
      "We're expanding from 30 to 80 employees and our group health renewal jumped 40%. Should we move to a self-insured or level-funded plan, and what's the real risk for a company our size?",
    domain: "insurance",
    source: "human",
    expert: "Tara Nguyen, Employee Benefits Consultant",
    answer:
      "Level-funded is usually the right step at 80 employees — you get claims-data visibility and refunds in good years with stop-loss capping the downside. Avoid true self-insurance until you're larger; the cash-flow variance from a single high claim is too sharp at your size.",
    bountyUsd: 380,
    slaHours: 48,
  },
  {
    id: "RQ-017",
    question:
      "Our support agent keeps escalating refund edge cases because it can't tell a policy exception from a standard refund. Where should the human-in-the-loop boundary sit so we cut escalations without approving bad refunds?",
    domain: "operations",
    source: "agent",
    expert: "Alex Morgan, Support Operations Director",
    answer:
      "Let the agent auto-approve refunds inside a clear dollar and policy envelope, and route only true exceptions — over-limit, out-of-window, or repeat requesters — to a human. Define the envelope explicitly; ambiguity is what's driving your over-escalation.",
    bountyUsd: 260,
    slaHours: 24,
  },
  {
    id: "RQ-018",
    question:
      "We're deciding whether to sunset a low-revenue product line that still has a handful of loyal enterprise accounts. How do I make this go/no-go call without torching key relationships or our reputation?",
    domain: "operations",
    source: "human",
    expert: "Rebecca Lin, Operating Partner",
    answer:
      "Run the call on contribution margin and engineering opportunity cost, not just top-line revenue — but give the loyal accounts a 6–12 month sunset runway with a migration path. A graceful, well-communicated exit protects reputation far more than the revenue you'd keep.",
    bountyUsd: 420,
    slaHours: 48,
  },
];
