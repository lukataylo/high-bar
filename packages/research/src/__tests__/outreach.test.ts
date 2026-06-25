import { describe, expect, it } from "vitest";
import {
  leadSlug,
  planResearchActions,
  proposeLeadUpsert,
  proposeOutreachDraft,
} from "../actions";
import { buildOutreachDraft } from "../outreach";
import type { DiscoveredLead, LeadCriteria, OutreachContext } from "../types";

const lead: DiscoveredLead = {
  kind: "expert_candidate",
  name: "Ada Whitfield",
  source: "sample",
  profileUrl: "https://example.com/people/ada-whitfield",
  domain: "software_engineering",
  signals: ["distributed systems", "typescript", "platform engineering"],
  headline: "Principal Platform Engineer",
  company: "Northwind Cloud",
};

const context: OutreachContext = {
  senderName: "Sam Rivera",
  company: "High Bar",
  valueProp: "We pay vetted experts for short, high-signal calls.",
};

describe("buildOutreachDraft", () => {
  it("greets by first name and includes the value prop", () => {
    const draft = buildOutreachDraft(lead, context);
    expect(draft.body).toContain("Hi Ada");
    expect(draft.body).toContain(context.valueProp);
  });

  it("defaults to the email channel", () => {
    expect(buildOutreachDraft(lead, context).channel).toBe("email");
  });

  it("honours an explicit channel", () => {
    expect(buildOutreachDraft(lead, { ...context, channel: "linkedin" }).channel).toBe(
      "linkedin"
    );
  });

  it("is deterministic", () => {
    expect(buildOutreachDraft(lead, context).body).toBe(
      buildOutreachDraft(lead, context).body
    );
  });
});

describe("proposeLeadUpsert", () => {
  it("produces the exact lead.upsert variant shape", () => {
    const action = proposeLeadUpsert(lead, 72);
    expect(action).toEqual({
      type: "lead.upsert",
      kind: "expert_candidate",
      name: "Ada Whitfield",
      profileUrl: "https://example.com/people/ada-whitfield",
      score: 72,
    });
  });

  it("omits profileUrl when absent", () => {
    const action = proposeLeadUpsert({ ...lead, profileUrl: undefined }, 50);
    expect(action.profileUrl).toBeUndefined();
    expect("profileUrl" in action).toBe(false);
  });

  it("keeps score an integer within 0..100", () => {
    const action = proposeLeadUpsert(lead, 99);
    expect(Number.isInteger(action.score)).toBe(true);
    expect(action.score).toBeGreaterThanOrEqual(0);
    expect(action.score).toBeLessThanOrEqual(100);
  });
});

describe("proposeOutreachDraft", () => {
  it("produces the exact outreach.draft variant shape", () => {
    const draft = buildOutreachDraft(lead, context);
    const action = proposeOutreachDraft("lead-123", draft);
    expect(action).toEqual({
      type: "outreach.draft",
      leadId: "lead-123",
      channel: draft.channel,
      body: draft.body,
    });
  });
});

describe("planResearchActions", () => {
  const criteria: LeadCriteria = {
    kind: "expert_candidate",
    domains: ["software_engineering"],
    keywords: ["typescript", "platform engineering", "distributed systems"],
  };

  it("proposes an upsert for every lead and a draft only for qualified leads", () => {
    const actions = planResearchActions([lead], criteria, 0, context);
    const upserts = actions.filter((a) => a.type === "lead.upsert");
    const drafts = actions.filter((a) => a.type === "outreach.draft");
    expect(upserts).toHaveLength(1);
    expect(drafts).toHaveLength(1);
  });

  it("omits the draft when no lead qualifies", () => {
    const actions = planResearchActions([lead], criteria, 101, context);
    expect(actions.filter((a) => a.type === "outreach.draft")).toHaveLength(0);
    expect(actions.filter((a) => a.type === "lead.upsert")).toHaveLength(1);
  });

  it("uses a deterministic synthetic lead id for the draft", () => {
    const actions = planResearchActions([lead], criteria, 0, context);
    const draft = actions.find((a) => a.type === "outreach.draft");
    expect(draft?.type === "outreach.draft" ? draft.leadId : undefined).toBe(leadSlug(lead));
  });
});
