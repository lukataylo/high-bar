export type Domain =
  | "Engineering"
  | "Finance"
  | "Healthcare"
  | "Legal"
  | "Operations";

export type QuestionSource = "agent" | "human";

export interface Question {
  id: string;
  title: string;
  detail: string;
  source: QuestionSource;
  sourceLabel: string;
  domain: Domain;
  reward: number;
  /** SLA window in hours, e.g. 24 / 48 — used for the "24h SLA" label. */
  slaHours: number;
  /** Absolute deadline (epoch ms) by which the answer is due. Drives the live countdown. */
  expiresAt: number;
}

export type AnswerStatus = "claimed" | "answered";

export interface ClaimedQuestion extends Question {
  answer: string;
  status: AnswerStatus;
}

export type PayoutStatus = "Paid" | "Pending" | "Available";

export interface Payout {
  id: string;
  date: string;
  question: string;
  amount: number;
  status: PayoutStatus;
}

export type TabId = "queue" | "answers" | "earnings" | "account";
