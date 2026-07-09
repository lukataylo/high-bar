export type Expert = {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  rateUsd: number;
  availability: "Today" | "Tomorrow" | "This week";
  tags: string[];
  lastContacted: string;
  confidence: number;
};

export type ClientRequest = {
  id: string;
  client: string;
  title: string;
  budgetUsd: number;
  deadline: string;
  status: "Intake" | "Matching" | "Scheduling" | "Complete";
  needs: string[];
  context: string;
};

export type Payout = {
  id: string;
  expertName: string;
  amountUsd: number;
  reason: string;
  status: "Queued" | "Needs approval" | "Ready";
};
