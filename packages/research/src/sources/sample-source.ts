import type { DiscoveredLead, LeadCriteria, LeadSource } from "../types";

/**
 * Deterministic, in-memory fixture data set of public/compliant personas.
 *
 * IMPORTANT: this is a STUB source. It performs NO live network calls, NO
 * scraping, and NO LinkedIn automation. It exists so the rest of the pipeline
 * (scoring, qualification, draft generation, action planning) can be developed
 * and tested deterministically. Real, compliant sources implement the same
 * {@link LeadSource} interface.
 */
const SAMPLE_LEADS: readonly DiscoveredLead[] = [
  {
    kind: "expert_candidate",
    name: "Ada Whitfield",
    source: "sample",
    profileUrl: "https://example.com/people/ada-whitfield",
    domain: "software_engineering",
    signals: ["distributed systems", "typescript", "platform engineering", "kubernetes"],
    headline: "Principal Platform Engineer",
    company: "Northwind Cloud",
  },
  {
    kind: "expert_candidate",
    name: "Bilal Hassan",
    source: "sample",
    profileUrl: "https://example.com/people/bilal-hassan",
    domain: "data_ai",
    signals: ["machine learning", "llm evaluation", "python", "mlops"],
    headline: "Staff ML Engineer",
    company: "Vector Labs",
  },
  {
    kind: "expert_candidate",
    name: "Clara Nguyen",
    source: "sample",
    profileUrl: "https://example.com/people/clara-nguyen",
    domain: "insurance",
    signals: ["underwriting", "actuarial", "claims automation", "reinsurance"],
    headline: "Head of Underwriting",
    company: "Meridian Insurance",
  },
  {
    kind: "expert_candidate",
    name: "Devon Carter",
    source: "sample",
    profileUrl: "https://example.com/people/devon-carter",
    domain: "finance",
    signals: ["corporate finance", "fp&a", "treasury", "fundraising"],
    headline: "VP Finance",
    company: "Atlas Capital",
  },
  {
    kind: "expert_candidate",
    name: "Elena Rossi",
    source: "sample",
    profileUrl: "https://example.com/people/elena-rossi",
    domain: "legal",
    signals: ["commercial contracts", "data privacy", "gdpr", "saas legal"],
    headline: "General Counsel",
    company: "Lumen Legal",
  },
  {
    kind: "customer_candidate",
    name: "Frank Osei",
    source: "sample",
    profileUrl: "https://example.com/people/frank-osei",
    domain: "operations",
    signals: ["supply chain", "operations", "process improvement", "logistics"],
    headline: "Director of Operations",
    company: "Harbor Goods",
  },
  {
    kind: "customer_candidate",
    name: "Grace Lim",
    source: "sample",
    profileUrl: "https://example.com/people/grace-lim",
    domain: "marketing",
    signals: ["demand generation", "growth marketing", "saas", "positioning"],
    headline: "VP Marketing",
    company: "Brightside SaaS",
  },
  {
    kind: "customer_candidate",
    name: "Hiro Tanaka",
    source: "sample",
    profileUrl: "https://example.com/people/hiro-tanaka",
    domain: "sales",
    signals: ["enterprise sales", "gtm strategy", "saas", "revenue operations"],
    headline: "Chief Revenue Officer",
    company: "Summit Software",
  },
  {
    kind: "customer_candidate",
    name: "Imani Reed",
    source: "sample",
    profileUrl: "https://example.com/people/imani-reed",
    domain: "healthcare",
    signals: ["digital health", "clinical operations", "compliance", "telehealth"],
    headline: "Head of Clinical Ops",
    company: "Cura Health",
  },
  {
    kind: "expert_candidate",
    name: "Jonas Berg",
    source: "sample",
    profileUrl: "https://example.com/people/jonas-berg",
    domain: "business_leadership",
    signals: ["scaling teams", "operating model", "leadership", "strategy"],
    headline: "Former COO",
    company: "Helix Group",
  },
];

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function matchesKeywords(lead: DiscoveredLead, keywords: string[]): boolean {
  const normalised = keywords.map(normalise).filter((kw) => kw.length > 0);
  if (normalised.length === 0) {
    return true;
  }
  const haystack = [
    ...lead.signals,
    ...(lead.headline === undefined ? [] : [lead.headline]),
    ...(lead.company === undefined ? [] : [lead.company]),
  ]
    .map(normalise)
    .filter((entry) => entry.length > 0);

  return normalised.some((kw) =>
    haystack.some((entry) => entry.includes(kw) || kw.includes(entry))
  );
}

/**
 * Deterministic {@link LeadSource} backed by a fixed in-memory fixture set.
 * Filters by kind, domain membership and keyword/signal overlap, sorts stably by
 * name, and applies the optional limit. Async only to satisfy the interface —
 * the underlying logic is pure and synchronous.
 */
export class SampleLeadSource implements LeadSource {
  public readonly name = "sample";

  private readonly leads: readonly DiscoveredLead[];

  constructor(leads: readonly DiscoveredLead[] = SAMPLE_LEADS) {
    this.leads = leads;
  }

  public discover(criteria: LeadCriteria): Promise<DiscoveredLead[]> {
    const filtered = this.leads
      .filter((lead) => lead.kind === criteria.kind)
      .filter(
        (lead) =>
          criteria.domains.length === 0 ||
          (lead.domain !== undefined && criteria.domains.includes(lead.domain))
      )
      .filter((lead) => matchesKeywords(lead, criteria.keywords))
      // Stable, deterministic ordering independent of fixture declaration order.
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    const limited =
      criteria.limit !== undefined && criteria.limit >= 0
        ? filtered.slice(0, criteria.limit)
        : filtered;

    return Promise.resolve(limited);
  }
}
