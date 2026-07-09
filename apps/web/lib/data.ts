import type { ClientRequest, Expert, Payout } from "./types";

// Research-grounded sample data for the High Bar control room. The requests mix
// questions raised by autonomous agents at a judgment boundary with questions
// raised by humans who need a vetted answer before they act. Names, roles,
// bounties, and SLAs are kept consistent with lib/realistic-questions.ts and the
// expert-routing loop. `needs` and expert `tags` share vocabulary so matching is
// meaningful.

export const requests: ClientRequest[] = [
  {
    id: "Q-1042",
    client: "Payments agent (Claude Code)",
    title: "How do I make Stripe webhook handlers idempotent so retries never double-charge?",
    budgetUsd: 320,
    deadline: "24h",
    status: "Matching",
    needs: ["payments", "idempotency", "webhooks", "stripe"],
    context:
      "An autonomous agent is wiring invoice.payment_failed handling and hit a judgment boundary: Stripe re-delivers and reorders events, and it can't verify its retry logic is safe to ship without double-crediting a customer."
  },
  {
    id: "Q-1043",
    client: "Security review agent",
    title: "Is it safe to drop users.ssn after backfilling a tokenized field, or does a human need to sign off?",
    budgetUsd: 450,
    deadline: "8h",
    status: "Matching",
    needs: ["data security", "migrations", "compliance", "approval flows"],
    context:
      "Agent prepared an irreversible production migration that drops a PII column post-backfill. It paused before running it because the deletion can't be undone and the backfill verification is ambiguous."
  },
  {
    id: "Q-1044",
    client: "Finance operator",
    title: "How should we recognize 12 months of prepaid revenue before our seed close?",
    budgetUsd: 400,
    deadline: "48h",
    status: "Intake",
    needs: ["revenue recognition", "asc 606", "saas metrics", "fundraising"],
    context:
      "A founder needs a vetted answer before sending an investor data room: a customer prepaid annually and they want books and ARR reporting that won't mislead diligence."
  },
  {
    id: "Q-1045",
    client: "Risk & compliance lead",
    title: "Model flagged a $90k wire from a long-standing account as high-risk — hold and file, or release?",
    budgetUsd: 600,
    deadline: "24h",
    status: "Matching",
    needs: ["aml", "transaction risk", "sar filing", "compliance"],
    context:
      "A flagged-transaction model scored a wire high-risk. The team must decide within the regulatory window whether a SAR is required and what they're obligated to do before releasing funds."
  },
  {
    id: "Q-1046",
    client: "Platform / DevOps engineer",
    title: "Docker image runs locally but the Railway deploy crashes on boot with a health-check timeout",
    budgetUsd: 260,
    deadline: "12h",
    status: "Scheduling",
    needs: ["deployment", "containers", "railway", "observability"],
    context:
      "A service boots fine locally but dies in the platform runtime with no useful logs. The on-call engineer wants an experienced platform reviewer before they keep guessing at PORT and bind-address issues."
  },
  {
    id: "Q-1047",
    client: "General counsel (15-person startup)",
    title: "First enterprise MSA includes unlimited-liability indemnification — is that standard, and what do we push back on?",
    budgetUsd: 520,
    deadline: "48h",
    status: "Intake",
    needs: ["contracts", "liability", "indemnification", "enterprise sales"],
    context:
      "A small startup is reviewing its first big-customer MSA. They need a commercial-counsel read on the indemnity clause before signing uncapped exposure."
  },
  {
    id: "Q-1048",
    client: "Hospital onboarding lead",
    title: "Does our SOC 2 Type II cover PHI, or do we need HIPAA and a BAA before onboarding a hospital?",
    budgetUsd: 500,
    deadline: "48h",
    status: "Matching",
    needs: ["hipaa", "phi", "healthcare compliance", "soc 2"],
    context:
      "Sales is blocked on a hospital deal. They need a compliance advisor to confirm whether existing SOC 2 attestation is sufficient or a BAA and HIPAA program are prerequisites."
  },
  {
    id: "Q-1049",
    client: "Support automation agent",
    title: "Where should the human-in-the-loop boundary sit so refund edge cases stop over-escalating?",
    budgetUsd: 260,
    deadline: "24h",
    status: "Complete",
    needs: ["support operations", "refund policy", "agent debugging", "approval flows"],
    context:
      "A support agent keeps escalating refunds because it can't separate policy exceptions from standard cases. Ops wants an expert to define the auto-approval envelope."
  }
];

export const experts: Expert[] = [
  {
    id: "EXP-201",
    name: "Daniel Ruiz",
    role: "Payments Infrastructure Lead",
    company: "Stripe (former)",
    location: "Austin, TX",
    rateUsd: 320,
    availability: "Today",
    tags: ["payments", "idempotency", "webhooks", "stripe", "billing"],
    lastContacted: "3 days ago",
    confidence: 94
  },
  {
    id: "EXP-204",
    name: "Priya Nair",
    role: "Application Security Engineer",
    company: "Cloudflare",
    location: "Remote (EU)",
    rateUsd: 410,
    availability: "Today",
    tags: ["data security", "migrations", "compliance", "approval flows", "authentication"],
    lastContacted: "Never",
    confidence: 91
  },
  {
    id: "EXP-209",
    name: "Marcus Bell",
    role: "Fractional CFO",
    company: "Ledgerline Advisory",
    location: "New York, NY",
    rateUsd: 380,
    availability: "Tomorrow",
    tags: ["revenue recognition", "asc 606", "saas metrics", "fundraising", "finance"],
    lastContacted: "9 days ago",
    confidence: 88
  },
  {
    id: "EXP-212",
    name: "Naomi Carter",
    role: "AML / Transaction Risk Officer",
    company: "Mercury (former BSA officer)",
    location: "Chicago, IL",
    rateUsd: 520,
    availability: "Today",
    tags: ["aml", "transaction risk", "sar filing", "compliance", "banking"],
    lastContacted: "Never",
    confidence: 90
  },
  {
    id: "EXP-216",
    name: "Sofia Almeida",
    role: "Platform Reliability Engineer",
    company: "Vercel",
    location: "Lisbon, PT",
    rateUsd: 290,
    availability: "Today",
    tags: ["deployment", "containers", "railway", "observability", "ci/cd"],
    lastContacted: "5 days ago",
    confidence: 85
  },
  {
    id: "EXP-221",
    name: "Hannah Voss",
    role: "Commercial & Data Protection Counsel",
    company: "Independent (ex-Latham)",
    location: "Berlin, DE",
    rateUsd: 540,
    availability: "This week",
    tags: ["contracts", "liability", "indemnification", "enterprise sales", "gdpr"],
    lastContacted: "14 days ago",
    confidence: 87
  },
  {
    id: "EXP-225",
    name: "Dr. Lena Whitfield",
    role: "Healthcare Compliance Advisor",
    company: "Epic (former)",
    location: "Madison, WI",
    rateUsd: 500,
    availability: "Tomorrow",
    tags: ["hipaa", "phi", "healthcare compliance", "soc 2", "risk review"],
    lastContacted: "Never",
    confidence: 89
  },
  {
    id: "EXP-230",
    name: "Alex Morgan",
    role: "Support Operations Director",
    company: "Zendesk",
    location: "Denver, CO",
    rateUsd: 260,
    availability: "Today",
    tags: ["support operations", "refund policy", "agent debugging", "approval flows", "workflow"],
    lastContacted: "7 days ago",
    confidence: 83
  },
  {
    id: "EXP-238",
    name: "Maya Chen",
    role: "Senior Test & Product Engineering Lead",
    company: "Figma",
    location: "San Francisco, CA",
    rateUsd: 300,
    availability: "This week",
    tags: ["agent debugging", "testing", "workflow", "product engineering", "ci/cd"],
    lastContacted: "21 days ago",
    confidence: 79
  }
];

export const payoutQueue: Payout[] = [
  {
    id: "PAY-901",
    expertName: "Alex Morgan",
    amountUsd: 260,
    reason: "Defined refund auto-approval envelope (Q-1049) — answer accepted",
    status: "Ready"
  },
  {
    id: "PAY-902",
    expertName: "Daniel Ruiz",
    amountUsd: 320,
    reason: "Stripe webhook idempotency guidance (Q-1042) — pending answer acceptance",
    status: "Needs approval"
  },
  {
    id: "PAY-903",
    expertName: "Sofia Almeida",
    amountUsd: 260,
    reason: "Railway boot/health-check diagnosis (Q-1046) — escrow release scheduled",
    status: "Queued"
  },
  {
    id: "PAY-904",
    expertName: "Naomi Carter",
    amountUsd: 50,
    reason: "Same-day SLA bonus for urgent AML review (Q-1045)",
    status: "Needs approval"
  }
];
