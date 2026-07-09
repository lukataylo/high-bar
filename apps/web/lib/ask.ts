import { buildAnswerRequest } from "./agent";
import { rankExpertsForRequest } from "./view-model";
import type { ClientRequest } from "./types";

type AskInput = {
  question: string;
  context?: string;
  requester?: string;
};

const hintRules = [
  {
    need: "agent debugging",
    terms: ["agent", "claude", "mcp", "tool", "stuck", "bug", "failing", "error"]
  },
  {
    need: "support operations",
    terms: ["support", "refund", "customer", "ticket", "escalation"]
  },
  {
    need: "billing",
    terms: ["billing", "invoice", "charge", "usage", "pricing", "payment"]
  },
  {
    need: "policy",
    terms: ["policy", "compliance", "risk", "approval", "exception"]
  },
  {
    need: "workflow",
    terms: ["workflow", "handoff", "process", "ops", "queue"]
  }
] as const;

export function normalizeQuestion(raw: unknown) {
  return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
}

export function buildAskResponse(input: AskInput) {
  const needs = inferNeeds(`${input.question} ${input.context ?? ""}`);
  const request = buildRequest(input, needs);
  const matches = rankExpertsForRequest(request).slice(0, 3);
  const topMatch = matches[0];

  return {
    ok: true,
    questionId: request.id,
    status: "queued_for_human_expert",
    question: input.question,
    requester: request.client,
    estimatedSla: request.deadline,
    route: {
      needs,
      topExperts: matches.map((expert) => ({
        id: expert.id,
        name: expert.name,
        role: expert.role,
        company: expert.company,
        matchScore: expert.matchScore,
        rateUsd: expert.rateUsd,
        availability: expert.availability
      }))
    },
    nextStep: topMatch
      ? `High Bar would ask ${topMatch.name} to answer this.`
      : "High Bar would route this to the next available expert.",
    expertRequest: topMatch ? buildAnswerRequest(request, topMatch) : null
  };
}

function buildRequest(input: AskInput, needs: string[]): ClientRequest {
  return {
    id: makeQuestionId(input.question),
    client: input.requester || "External agent",
    title: input.question,
    budgetUsd: 250,
    deadline: "24h",
    status: "Matching",
    needs,
    context: input.context || "Submitted through the simple agent ask URL."
  };
}

function inferNeeds(text: string) {
  const lower = text.toLowerCase();
  const needs = hintRules
    .filter(({ terms }) => terms.some((term) => lower.includes(term)))
    .map(({ need }) => need);

  return needs.length > 0 ? [...new Set(needs)] : ["agent debugging", "workflow"];
}

function makeQuestionId(question: string) {
  let hash = 0;

  for (let i = 0; i < question.length; i += 1) {
    hash = (hash * 31 + question.charCodeAt(i)) >>> 0;
  }

  return `Q-${hash.toString(16).padStart(8, "0").toUpperCase()}`;
}
