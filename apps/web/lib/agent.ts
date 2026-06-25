import type { ClientRequest, Expert } from "./types";

export function scoreMatch(request: ClientRequest, expert: Expert) {
  const needSet = new Set(request.needs.map((need) => need.toLowerCase()));
  const overlap = expert.tags.filter((tag) => needSet.has(tag.toLowerCase()));
  const availabilityBoost = expert.availability === "Today" ? 12 : 6;
  const confidenceWeight = expert.confidence / 10;

  return Math.min(
    100,
    Math.round(overlap.length * 20 + availabilityBoost + confidenceWeight)
  );
}

export function buildOutreachDraft(request: ClientRequest, expert: Expert) {
  const matchedTopics = expert.tags
    .filter((tag) =>
      request.needs.some((need) => need.toLowerCase() === tag.toLowerCase())
    )
    .slice(0, 3)
    .join(", ");

  return `Hi ${expert.name.split(" ")[0]}, I am helping ${request.client} speak with operators on ${request.title.toLowerCase()}. Your background at ${expert.company} looks especially relevant for ${matchedTopics || "this topic"}. Would you be open to a paid ${request.deadline} expert call? I can share scope and rate before anything is scheduled.`;
}
