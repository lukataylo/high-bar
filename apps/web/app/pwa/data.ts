import type { Domain, Payout, Question } from "./types";

export const ALL_DOMAINS: Domain[] = [
  "Engineering",
  "Finance",
  "Healthcare",
  "Legal",
  "Operations"
];

// Deadlines are anchored to load time so the countdowns visibly tick down.
// Each question gets a remaining window chosen to demo normal / amber / red urgency.
const LOADED_AT = Date.now();
const sec = (n: number): number => n * 1000;
const min = (n: number): number => n * 60 * 1000;
const hr = (n: number): number => n * 60 * 60 * 1000;

export const INITIAL_QUEUE: Question[] = [
  {
    id: "q-1",
    title: "Why is the refund agent misclassifying policy exceptions?",
    detail:
      "The support agent keeps approving refunds that fall outside the 30-day window when the customer mentions a shipping delay. How should the policy logic handle this edge case?",
    source: "agent",
    sourceLabel: "Autonomous support agent",
    domain: "Operations",
    reward: 450,
    slaHours: 24,
    // ~47 min left → amber
    expiresAt: LOADED_AT + min(47) + sec(12)
  },
  {
    id: "q-2",
    title: "How should this agent explain usage-based billing disputes?",
    detail:
      "A customer is disputing a metered overage charge. The agent needs a clear, defensible explanation that references the contract terms without sounding evasive.",
    source: "human",
    sourceLabel: "Product operator",
    domain: "Finance",
    reward: 325,
    slaHours: 48,
    expiresAt: LOADED_AT + hr(31) + min(12)
  },
  {
    id: "q-3",
    title: "Is this retry/backoff loop safe for a payments webhook?",
    detail:
      "We retry failed webhook deliveries with exponential backoff, but duplicate charges slipped through last week. What idempotency guarantees are we missing?",
    source: "agent",
    sourceLabel: "Payments integration agent",
    domain: "Engineering",
    reward: 600,
    slaHours: 12,
    // ~8 min left → red urgent, seconds visibly ticking
    expiresAt: LOADED_AT + min(8) + sec(40)
  },
  {
    id: "q-4",
    title: "Does this consent flow meet HIPAA minimum-necessary rules?",
    detail:
      "Our intake bot collects symptom data before routing to a clinician. A reviewer flagged the consent copy. What needs to change to stay compliant?",
    source: "human",
    sourceLabel: "Clinical operations lead",
    domain: "Healthcare",
    reward: 525,
    slaHours: 36,
    expiresAt: LOADED_AT + hr(19) + min(48)
  },
  {
    id: "q-5",
    title: "Can we auto-send this contract clause without counsel review?",
    detail:
      "The agent drafts NDAs from a template and wants to insert a mutual indemnification clause automatically. Where is the legal risk if a human never reviews it?",
    source: "agent",
    sourceLabel: "Contracts drafting agent",
    domain: "Legal",
    reward: 480,
    slaHours: 24,
    expiresAt: LOADED_AT + hr(5) + min(30)
  }
];

export const INITIAL_PAYOUTS: Payout[] = [
  {
    id: "p-1",
    date: "Jun 21",
    question: "How do we reconcile a partial chargeback in escrow?",
    amount: 380,
    status: "Paid"
  },
  {
    id: "p-2",
    date: "Jun 18",
    question: "Why did the agent loop on the same KYC check?",
    amount: 540,
    status: "Paid"
  },
  {
    id: "p-3",
    date: "Jun 14",
    question: "Best way to phrase a denied-claim appeal letter?",
    amount: 295,
    status: "Paid"
  }
];

export const DEMO_AVAILABLE_USD = 1215;
export const DEMO_PAID_OUT_USD = 1215;
