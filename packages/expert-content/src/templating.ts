import { z } from "zod";
import type { Domain } from "@high-bar/core";

/**
 * A reusable research-question template a client (human or agent) submits to the
 * network. Phrasing mirrors the consulting / diligence style used by real expert
 * networks (GLG, AlphaSights, Guidepoint, Third Bridge, Tegus): an explicit ask
 * for firsthand, opinion-and-context-driven insight — never a request for
 * material non-public information.
 *
 * Placeholders use a `{{snake_case}}` syntax and are filled at render time.
 */
export interface QuestionTemplate {
  /** Stable identifier, unique across the catalog. */
  readonly id: string;
  /** Domain the template is routed into (keyed off the core `Domain` enum). */
  readonly domain: Domain;
  /** Short human label for pickers / UI. */
  readonly title: string;
  /** The shape of insight requested — useful for matching and reporting. */
  readonly style: QuestionStyle;
  /** The full prompt body, containing zero or more `{{placeholder}}` tokens. */
  readonly prompt: string;
  /** Placeholder names referenced by `prompt`, derived at construction time. */
  readonly variables: readonly string[];
}

export const QuestionStyle = z.enum([
  "diligence", // investor / acquirer due diligence
  "market_landscape", // competitive & market mapping
  "technical_deep_dive", // hands-on practitioner detail
  "best_practices", // how leading teams operate
  "vendor_evaluation", // buy-side product / vendor selection
]);
export type QuestionStyle = z.infer<typeof QuestionStyle>;

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Extract the unique, ordered list of `{{placeholder}}` names from a string. */
export function extractVariables(prompt: string): string[] {
  const seen = new Set<string>();
  for (const match of prompt.matchAll(PLACEHOLDER)) {
    const name = match[1];
    if (name !== undefined) seen.add(name);
  }
  return [...seen];
}

/**
 * Construct a {@link QuestionTemplate}, deriving `variables` from `prompt` so the
 * declared variable list can never drift from the actual placeholders.
 */
export function defineTemplate(input: {
  id: string;
  domain: Domain;
  title: string;
  style: QuestionStyle;
  prompt: string;
}): QuestionTemplate {
  return {
    id: input.id,
    domain: input.domain,
    title: input.title,
    style: input.style,
    prompt: input.prompt,
    variables: extractVariables(input.prompt),
  };
}

export class MissingTemplateVariablesError extends Error {
  constructor(public readonly missing: readonly string[]) {
    super(`Missing template variable(s): ${missing.join(", ")}`);
    this.name = "MissingTemplateVariablesError";
  }
}

/**
 * Render a template by substituting every `{{placeholder}}`. Throws
 * {@link MissingTemplateVariablesError} if any declared variable is absent —
 * we never ship a half-filled brief to an expert.
 */
export function renderTemplate(
  template: QuestionTemplate,
  vars: Readonly<Record<string, string>>,
): string {
  const missing = template.variables.filter(
    (name) => vars[name] === undefined || vars[name] === "",
  );
  if (missing.length > 0) throw new MissingTemplateVariablesError(missing);

  return template.prompt.replace(PLACEHOLDER, (_full, rawName: string) => {
    const value = vars[rawName];
    // Guarded above for declared vars; fall back to the literal token otherwise.
    return value ?? `{{${rawName}}}`;
  });
}
