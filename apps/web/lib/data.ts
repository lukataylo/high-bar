import type { ClientRequest, Expert, Payout } from "./types";

export const requests: ClientRequest[] = [
  {
    id: "Q-1042",
    client: "Autonomous support agent",
    title: "Why is the refund agent misclassifying policy exceptions?",
    budgetUsd: 680,
    deadline: "48h",
    status: "Matching",
    needs: ["agent debugging", "refund policy", "support operations", "workflow"],
    context:
      "An AI support agent keeps escalating edge cases after failing to distinguish policy exceptions from standard refunds."
  },
  {
    id: "Q-1043",
    client: "Product operator",
    title: "How should this agent explain usage-based billing disputes?",
    budgetUsd: 420,
    deadline: "72h",
    status: "Intake",
    needs: ["pricing", "billing", "customer operations"],
    context:
      "A human operator needs an expert answer before approving an agent response about a disputed usage invoice."
  }
];

export const experts: Expert[] = [
  {
    id: "EXP-201",
    name: "Maya Chen",
    role: "Support Automation Lead",
    company: "HelioOps",
    location: "San Francisco",
    rateUsd: 450,
    availability: "Today",
    tags: ["agent debugging", "refund policy", "support operations", "workflow"],
    lastContacted: "12 days ago",
    confidence: 92
  },
  {
    id: "EXP-218",
    name: "Daniel Ruiz",
    role: "Billing Systems Advisor",
    company: "UsageLab",
    location: "Austin",
    rateUsd: 325,
    availability: "Tomorrow",
    tags: ["pricing", "billing", "customer operations", "retention"],
    lastContacted: "Never",
    confidence: 86
  },
  {
    id: "EXP-233",
    name: "Priya Nair",
    role: "Policy Operations Lead",
    company: "RuleBridge",
    location: "New York",
    rateUsd: 375,
    availability: "This week",
    tags: ["policy", "risk review", "support operations", "approval flows"],
    lastContacted: "4 days ago",
    confidence: 78
  },
  {
    id: "EXP-245",
    name: "Alex Morgan",
    role: "Agent Reliability Director",
    company: "Brightline",
    location: "Chicago",
    rateUsd: 280,
    availability: "Today",
    tags: ["AI operations", "workflow", "agent debugging", "support"],
    lastContacted: "22 days ago",
    confidence: 74
  }
];

export const payoutQueue: Payout[] = [
  {
    id: "PAY-901",
    expertName: "Maya Chen",
    amountUsd: 450,
    reason: "Resolved blocked refund-policy question",
    status: "Needs approval"
  },
  {
    id: "PAY-902",
    expertName: "Alex Morgan",
    amountUsd: 80,
    reason: "Accepted expert answer bonus",
    status: "Ready"
  }
];
