import type { ClientRequest, Expert, Payout } from "./types";

export const requests: ClientRequest[] = [
  {
    id: "REQ-1042",
    client: "Northstar Capital",
    title: "Voice AI diligence for healthcare contact centers",
    budgetUsd: 6800,
    deadline: "48h",
    status: "Matching",
    needs: ["voice AI", "healthcare", "contact center", "HIPAA"],
    context:
      "The client is evaluating a Series B company that sells AI call automation into payers and hospital groups."
  },
  {
    id: "REQ-1043",
    client: "Meridian Strategy",
    title: "Usage-based billing in vertical SaaS",
    budgetUsd: 4200,
    deadline: "72h",
    status: "Intake",
    needs: ["pricing", "vertical SaaS", "billing"],
    context:
      "The team wants three operator calls on packaging, expansion motion, and churn risk after usage migration."
  }
];

export const experts: Expert[] = [
  {
    id: "EXP-201",
    name: "Maya Chen",
    role: "Former VP Product",
    company: "HelioVoice Health",
    location: "San Francisco",
    rateUsd: 450,
    availability: "Today",
    tags: ["voice AI", "healthcare", "contact center", "HIPAA", "product"],
    lastContacted: "12 days ago",
    confidence: 92
  },
  {
    id: "EXP-218",
    name: "Daniel Ruiz",
    role: "Revenue Operations Advisor",
    company: "UsageLab",
    location: "Austin",
    rateUsd: 325,
    availability: "Tomorrow",
    tags: ["pricing", "billing", "vertical SaaS", "revops", "retention"],
    lastContacted: "Never",
    confidence: 86
  },
  {
    id: "EXP-233",
    name: "Priya Nair",
    role: "Compliance Lead",
    company: "CareBridge",
    location: "New York",
    rateUsd: 375,
    availability: "This week",
    tags: ["HIPAA", "healthcare", "procurement", "enterprise sales"],
    lastContacted: "4 days ago",
    confidence: 78
  },
  {
    id: "EXP-245",
    name: "Alex Morgan",
    role: "Director, CX Automation",
    company: "Brightline",
    location: "Chicago",
    rateUsd: 280,
    availability: "Today",
    tags: ["contact center", "AI operations", "workflow", "support"],
    lastContacted: "22 days ago",
    confidence: 74
  }
];

export const payoutQueue: Payout[] = [
  {
    id: "PAY-901",
    expertName: "Maya Chen",
    amountUsd: 450,
    reason: "Completed 45 minute diligence call",
    status: "Needs approval"
  },
  {
    id: "PAY-902",
    expertName: "Alex Morgan",
    amountUsd: 80,
    reason: "Referral bounty",
    status: "Ready"
  }
];
