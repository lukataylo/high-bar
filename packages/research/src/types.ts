import type { Domain, LeadKind, LeadStatus, OutreachChannel } from "@high-bar/core";

/**
 * Criteria describing the kind of lead the business-development agent is looking
 * for. Pure data — consumed by {@link LeadSource} implementations and the
 * scoring/qualification logic.
 */
export interface LeadCriteria {
  /** Whether we are sourcing expert candidates or customer candidates. */
  kind: LeadKind;
  /** Domains the lead should be relevant to. Empty means "any domain". */
  domains: Domain[];
  /** Free-text keywords matched against lead signals/headline. */
  keywords: string[];
  /** Optional minimum score (0–100) used as the qualification threshold. */
  minScore?: number;
  /** Optional cap on the number of discovered leads returned. */
  limit?: number;
}

/**
 * A lead discovered from a compliant, public source. This is raw research data,
 * NOT an authorization signal — nothing here triggers a side effect on its own.
 */
export interface DiscoveredLead {
  kind: LeadKind;
  name: string;
  /** Identifier for the source that produced this lead (e.g. "sample"). */
  source: string;
  /** Public profile URL, if available. */
  profileUrl?: string;
  /** Primary domain the lead is associated with. */
  domain?: Domain;
  /** Public signals (skills, topics, mentions) used for matching/scoring. */
  signals: string[];
  /** Short public headline / title. */
  headline?: string;
  /** Company / organisation the lead is associated with. */
  company?: string;
}

/**
 * Context used to render a personalised — but draft-only — outreach message.
 */
export interface OutreachContext {
  senderName: string;
  company: string;
  valueProp: string;
  /** Defaults to "email" when omitted. */
  channel?: OutreachChannel;
  /** Optional explicit call-to-action; a sensible default is used otherwise. */
  callToAction?: string;
}

/**
 * The terminal decision produced by {@link qualify}: a lead is either
 * `"qualified"` or `"disqualified"`.
 */
export type QualifiedDecision = Extract<LeadStatus, "qualified" | "disqualified">;

/**
 * Abstraction over a lead-discovery backend. Implementations MUST only use
 * compliant, public sources — no scraping, no LinkedIn automation. The default
 * implementation ({@link import("./sources/sample-source").SampleLeadSource}) is
 * a deterministic in-memory fixture used for development and tests.
 */
export interface LeadSource {
  readonly name: string;
  discover(criteria: LeadCriteria): Promise<DiscoveredLead[]>;
}
