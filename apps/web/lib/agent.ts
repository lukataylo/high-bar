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

export function buildAnswerRequest(request: ClientRequest, expert: Expert) {
  const matchedTopics = expert.tags
    .filter((tag) =>
      request.needs.some((need) => need.toLowerCase() === tag.toLowerCase())
    )
    .slice(0, 3)
    .join(", ");

  return `Hi ${expert.name.split(" ")[0]}, High Bar has a stuck question from ${request.client}: "${request.title}". Your background at ${expert.company} looks relevant for ${matchedTopics || "this topic"}. Would you answer it for a paid ${request.deadline} expert request? Context and approval details are attached before anything is routed.`;
}
