import { NextResponse } from "next/server";
import { buildOutreachDraft, scoreMatch } from "@/lib/agent";
import { experts, requests } from "@/lib/data";

export async function GET() {
  const request = requests[0];
  const rankedExperts = experts
    .map((expert) => ({
      ...expert,
      matchScore: scoreMatch(request, expert)
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return NextResponse.json({
    request,
    rankedExperts,
    recommendedDrafts: rankedExperts.slice(0, 3).map((expert) => ({
      expertId: expert.id,
      expertName: expert.name,
      channel: "LinkedIn",
      requiresHumanSend: true,
      draft: buildOutreachDraft(request, expert)
    }))
  });
}
