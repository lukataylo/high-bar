import { describe, expect, it } from "vitest";
import { qualify, scoreLead } from "../qualify";
import { SampleLeadSource } from "../sources/sample-source";
import type { DiscoveredLead, LeadCriteria } from "../types";

const expertLead: DiscoveredLead = {
  kind: "expert_candidate",
  name: "Ada Whitfield",
  source: "sample",
  profileUrl: "https://example.com/people/ada-whitfield",
  domain: "software_engineering",
  signals: ["distributed systems", "typescript", "platform engineering"],
  headline: "Principal Platform Engineer",
  company: "Northwind Cloud",
};

const strongCriteria: LeadCriteria = {
  kind: "expert_candidate",
  domains: ["software_engineering"],
  keywords: ["typescript", "platform engineering", "distributed systems"],
};

const weakCriteria: LeadCriteria = {
  kind: "customer_candidate",
  domains: ["healthcare"],
  keywords: ["telehealth"],
};

describe("scoreLead", () => {
  it("is deterministic for equal inputs", () => {
    expect(scoreLead(expertLead, strongCriteria)).toBe(scoreLead(expertLead, strongCriteria));
  });

  it("stays within 0..100 bounds", () => {
    const score = scoreLead(expertLead, strongCriteria);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns an integer", () => {
    const score = scoreLead(expertLead, strongCriteria);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("scores a well-matched lead higher than a poorly-matched one", () => {
    expect(scoreLead(expertLead, strongCriteria)).toBeGreaterThan(
      scoreLead(expertLead, weakCriteria)
    );
  });

  it("rewards a profile URL", () => {
    const noUrl: DiscoveredLead = { ...expertLead, profileUrl: undefined };
    expect(scoreLead(expertLead, strongCriteria)).toBeGreaterThan(
      scoreLead(noUrl, strongCriteria)
    );
  });
});

describe("qualify", () => {
  it("qualifies a lead at or above the threshold", () => {
    const score = scoreLead(expertLead, strongCriteria);
    expect(qualify(expertLead, strongCriteria, score)).toBe("qualified");
  });

  it("disqualifies a lead below the threshold", () => {
    const score = scoreLead(expertLead, strongCriteria);
    expect(qualify(expertLead, strongCriteria, score + 1)).toBe("disqualified");
  });
});

describe("SampleLeadSource", () => {
  it("filters by kind and returns deterministic ordering", async () => {
    const source = new SampleLeadSource();
    const criteria: LeadCriteria = {
      kind: "expert_candidate",
      domains: [],
      keywords: [],
    };
    const first = await source.discover(criteria);
    const second = await source.discover(criteria);

    expect(first.every((lead) => lead.kind === "expert_candidate")).toBe(true);
    expect(first.map((lead) => lead.name)).toEqual(second.map((lead) => lead.name));
    expect(first.map((lead) => lead.name)).toEqual(
      [...first.map((lead) => lead.name)].sort((a, b) => a.localeCompare(b))
    );
  });

  it("filters by domain and keyword overlap", async () => {
    const source = new SampleLeadSource();
    const results = await source.discover({
      kind: "expert_candidate",
      domains: ["data_ai"],
      keywords: ["llm"],
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Bilal Hassan");
  });

  it("honours the limit", async () => {
    const source = new SampleLeadSource();
    const results = await source.discover({
      kind: "expert_candidate",
      domains: [],
      keywords: [],
      limit: 2,
    });
    expect(results).toHaveLength(2);
  });
});
