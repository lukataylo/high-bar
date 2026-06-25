import "server-only";

import { buildOutreachDraft, scoreMatch } from "./agent";
import { experts, payoutQueue, requests } from "./data";
import type { ClientRequest, Expert, Payout } from "./types";

export type RankedExpert = Expert & { matchScore: number };

export type DashboardData = {
  requests: ClientRequest[];
  experts: Expert[];
  payoutQueue: Payout[];
  rankedExpertsByRequest: Record<string, RankedExpert[]>;
  outreachDrafts: Record<string, Record<string, string>>;
  totalBudgetUsd: number;
  draftCount: number;
};

export function rankExpertsForRequest(request: ClientRequest) {
  return experts
    .map((expert) => ({
      ...expert,
      matchScore: scoreMatch(request, expert)
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function getDashboardData(): DashboardData {
  const rankedExpertsByRequest = Object.fromEntries(
    requests.map((request) => [request.id, rankExpertsForRequest(request)])
  );
  const outreachDrafts = Object.fromEntries(
    requests.map((request) => [
      request.id,
      Object.fromEntries(
        rankedExpertsByRequest[request.id].map((expert) => [
          expert.id,
          buildOutreachDraft(request, expert)
        ])
      )
    ])
  );

  return {
    requests,
    experts,
    payoutQueue,
    rankedExpertsByRequest,
    outreachDrafts,
    totalBudgetUsd: requests.reduce(
      (sum, request) => sum + request.budgetUsd,
      0
    ),
    draftCount: Math.min(3, experts.length)
  };
}

export function getAgentResponse() {
  const request = requests[0];
  if (!request) return null;

  const rankedExperts = rankExpertsForRequest(request);

  return {
    request,
    rankedExperts,
    recommendedDrafts: rankedExperts.slice(0, 3).map((expert) => ({
      expertId: expert.id,
      expertName: expert.name,
      channel: "LinkedIn",
      requiresHumanSend: true,
      draft: buildOutreachDraft(request, expert)
    }))
  };
}
