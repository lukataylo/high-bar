import { describe, it, expect } from "vitest";
import { Domain } from "@high-bar/core";
import {
  clientQuestionTemplates,
  templatesForDomain,
  renderTemplate,
  MissingTemplateVariablesError,
  screeningQuestionsForDomain,
  universalScreeningQuestions,
  buildIntakePrompt,
} from "../src/index";

describe("client question templates", () => {
  it("provides at least one template for every Domain", () => {
    for (const domain of Domain.options) {
      expect(
        templatesForDomain(domain).length,
        `expected templates for domain ${domain}`,
      ).toBeGreaterThan(0);
    }
  });

  it("every template declares variables that match its placeholders", () => {
    for (const t of clientQuestionTemplates) {
      for (const v of t.variables) {
        expect(t.prompt).toContain(`{{${v}}}`);
      }
    }
  });

  it("renders a template by substituting placeholders", () => {
    const t = templatesForDomain(Domain.enum.sales)[0];
    expect(t).toBeDefined();
    if (t === undefined) return;
    const vars = Object.fromEntries(t.variables.map((v) => [v, `<${v}>`]));
    const rendered = renderTemplate(t, vars);
    expect(rendered).not.toContain("{{");
    for (const v of t.variables) expect(rendered).toContain(`<${v}>`);
  });

  it("throws when a required variable is missing", () => {
    const t = clientQuestionTemplates.find((x) => x.variables.length > 0);
    expect(t).toBeDefined();
    if (t === undefined) return;
    expect(() => renderTemplate(t, {})).toThrow(MissingTemplateVariablesError);
  });
});

describe("expert screening questions", () => {
  it("provides a domain-specific screen on top of the universal set", () => {
    for (const domain of Domain.options) {
      const qs = screeningQuestionsForDomain(domain);
      expect(qs.length).toBe(universalScreeningQuestions.length + 1);
      // ids are unique
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    }
  });
});

describe("intake prompt", () => {
  it("includes the rendered question, screening, and compliance sections", () => {
    const t = templatesForDomain(Domain.enum.healthcare)[0];
    expect(t).toBeDefined();
    if (t === undefined) return;
    const vars = Object.fromEntries(t.variables.map((v) => [v, `<${v}>`]));
    const prompt = buildIntakePrompt({ template: t, variables: vars });
    expect(prompt).toContain("RESEARCH REQUEST");
    expect(prompt).toContain("SCREENING");
    expect(prompt).toContain("COMPLIANCE");
    expect(prompt).not.toContain("{{");
  });
});
