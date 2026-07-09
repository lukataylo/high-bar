import type { DiscoveredLead, LeadCriteria, QualifiedDecision } from "./types";

/** Scoring weights. Tuned so a well-matched lead with a profile URL clears ~60. */
const WEIGHT_SIGNAL_OVERLAP = 18;
const WEIGHT_DOMAIN_MATCH = 20;
const WEIGHT_PROFILE_URL = 10;
const WEIGHT_KIND_MATCH = 12;
const SCORE_MAX = 100;
const SCORE_MIN = 0;

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Count how many of the criteria keywords overlap with the lead's signals,
 * headline and company. Comparison is case-insensitive and substring-aware so
 * a keyword "react" matches a signal "React Native".
 */
function countKeywordOverlap(lead: DiscoveredLead, criteria: LeadCriteria): number {
  const keywords = criteria.keywords.map(normalise).filter((kw) => kw.length > 0);
  if (keywords.length === 0) {
    return 0;
  }

  const haystack = [
    ...lead.signals,
    ...(lead.headline === undefined ? [] : [lead.headline]),
    ...(lead.company === undefined ? [] : [lead.company]),
  ]
    .map(normalise)
    .filter((entry) => entry.length > 0);

  return keywords.filter((kw) =>
    haystack.some((entry) => entry.includes(kw) || kw.includes(entry))
  ).length;
}

/**
 * Deterministic 0–100 relevance score for a discovered lead against criteria.
 * Pure function: equal inputs always yield the same integer score.
 */
export function scoreLead(lead: DiscoveredLead, criteria: LeadCriteria): number {
  const keywordCount = criteria.keywords.filter((kw) => normalise(kw).length > 0).length;
  const overlap = countKeywordOverlap(lead, criteria);

  // Normalise overlap into a 0..1 ratio of matched keywords, then weight it.
  const overlapRatio = keywordCount === 0 ? 0 : overlap / keywordCount;
  const overlapPoints = overlapRatio * WEIGHT_SIGNAL_OVERLAP * keywordCount;

  const domainMatch =
    criteria.domains.length === 0 ||
    (lead.domain !== undefined && criteria.domains.includes(lead.domain));
  const domainPoints = domainMatch ? WEIGHT_DOMAIN_MATCH : 0;

  const profilePoints =
    lead.profileUrl !== undefined && lead.profileUrl.length > 0 ? WEIGHT_PROFILE_URL : 0;

  const kindPoints = lead.kind === criteria.kind ? WEIGHT_KIND_MATCH : 0;

  const raw = overlapPoints + domainPoints + profilePoints + kindPoints;

  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(raw)));
}

/**
 * Decide whether a lead clears the qualification threshold. Returns the matching
 * {@link QualifiedDecision} ("qualified" or "disqualified").
 */
export function qualify(
  lead: DiscoveredLead,
  criteria: LeadCriteria,
  threshold: number
): QualifiedDecision {
  return scoreLead(lead, criteria) >= threshold ? "qualified" : "disqualified";
}
