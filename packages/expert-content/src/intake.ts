import type { Domain } from "@high-bar/core";
import { renderTemplate } from "./templating";
import type { QuestionTemplate } from "./templating";
import { screeningQuestionsForDomain } from "./expertScreeningQuestions";
import { complianceChecklist } from "./complianceAttestations";

export interface IntakePromptInput {
  /** The client question template to render. */
  readonly template: QuestionTemplate;
  /** Values for the template's placeholders. */
  readonly variables: Readonly<Record<string, string>>;
}

/**
 * Assemble the full intake prompt presented to a candidate expert: the rendered
 * client question, the relevance screening questions, and the compliance
 * attestation checklist. This is the text an agent shows an expert before any
 * engagement begins — screening for fit, then gating on compliance.
 */
export function buildIntakePrompt(input: IntakePromptInput): string {
  const { template, variables } = input;
  const domain: Domain = template.domain;
  const renderedQuestion = renderTemplate(template, variables);

  const screening = screeningQuestionsForDomain(domain)
    .map((q, i) => `  ${i + 1}. ${q.prompt}`)
    .join("\n");

  const compliance = complianceChecklist
    .map((item, i) => `  ${i + 1}. ${item.prompt}`)
    .join("\n");

  return [
    `RESEARCH REQUEST (${domain})`,
    renderedQuestion,
    "",
    "SCREENING — confirm your firsthand experience:",
    screening,
    "",
    "COMPLIANCE — you must affirm the following before engaging:",
    compliance,
  ].join("\n");
}
