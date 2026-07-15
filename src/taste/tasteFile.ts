import { DIMENSIONS, type TasteVector } from "./dimensions";
import { styleName } from "./name";
import type { Tokens } from "./tokens";

function pct(x: number): number {
  return Math.round(x * 100);
}

// Turn the taste vector into prose directives. This is a deterministic stand-in
// for the "LLM-written style guide" — same shape, zero network dependency.
function proseGuide(t: TasteVector, tokens: Tokens): string[] {
  const lines: string[] = [];

  lines.push(
    t.radius < 0.25
      ? `Use sharp corners. Border radius should be ${tokens.radiusPx}px or less.`
      : t.radius > 0.75
        ? `Prefer generously rounded corners (~${tokens.radiusPx}px). Pills for buttons.`
        : `Use moderate corner radii around ${tokens.radiusPx}px.`,
  );

  lines.push(
    t.gradients > 0.55
      ? "Gradients are welcome on primary surfaces and hero areas."
      : "Never use gradients. Keep fills flat and solid.",
  );

  lines.push(
    t.density > 0.6
      ? "Favor dense, information-rich layouts with tight spacing."
      : t.density < 0.35
        ? "Favor airy layouts with lots of whitespace."
        : "Balance density — neither cramped nor sparse.",
  );

  lines.push(
    `Type: ${tokens.fontName}. Display weight ${tokens.fontWeightDisplay}, body weight ${tokens.fontWeightBody}.`,
  );

  lines.push(
    t.mode > 0.6
      ? "Default to a dark UI."
      : t.mode < 0.4
        ? "Default to a light UI."
        : "Support both light and dark, leaning neutral.",
  );

  lines.push(
    t.saturation > 0.6
      ? "Colors should be vivid and confident."
      : t.saturation < 0.35
        ? "Keep colors muted and restrained."
        : "Use moderate color saturation.",
  );

  lines.push(
    t.depth > 0.6
      ? "Use layered shadows and elevation to create depth."
      : "Keep surfaces flat; avoid heavy shadows.",
  );

  if (t.ornament > 0.55) lines.push("Decorative details and ornament are on-brand.");
  else lines.push("Stay minimal. Avoid decorative ornament.");

  lines.push(
    t.motion > 0.6
      ? "Motion is expressive — animate transitions and micro-interactions."
      : "Keep motion subtle and quick.",
  );

  return lines;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface TokenPayload {
  name: string;
  hue: number;
  dimensions: Record<string, number>;
  resolved: {
    palette: Tokens["palette"];
    radiusPx: number;
    spaceUnitPx: number;
    fontDisplay: string;
    fontBody: string;
    fontWeightDisplay: number;
    fontWeightBody: number;
  };
}

// Shared building blocks every export target assembles differently: prose
// directives, the machine-readable token JSON, and the raw CSS variables.
// Keeping this in one place means every export target stays consistent by
// construction instead of by manual upkeep across near-duplicate templates.
function buildParts(t: TasteVector, tokens: Tokens, hue: number) {
  const name = styleName(t, hue);
  const slug = slugify(name);

  const dims: Record<string, number> = {};
  for (const d of DIMENSIONS) dims[d.key] = pct(t[d.key]);

  const tokenPayload: TokenPayload = {
    name,
    hue: Math.round(hue),
    dimensions: dims,
    resolved: {
      palette: tokens.palette,
      radiusPx: tokens.radiusPx,
      spaceUnitPx: tokens.spaceUnitPx,
      fontDisplay: tokens.fontDisplay,
      fontBody: tokens.fontBody,
      fontWeightDisplay: tokens.fontWeightDisplay,
      fontWeightBody: tokens.fontWeightBody,
    },
  };

  const prose = proseGuide(t, tokens)
    .map((l) => `- ${l}`)
    .join("\n");

  const tokenJsonBlock = "```json\n" + JSON.stringify(tokenPayload, null, 2) + "\n```";

  const cssVarsBlock =
    "```css\n:root {\n" +
    Object.entries(tokens.cssVars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n") +
    "\n}\n```";

  return { name, slug, prose, tokenJsonBlock, cssVarsBlock };
}

export interface TasteFile {
  fileName: string;
  content: string;
}

export type TasteFileTarget = "cursor" | "claude-skill" | "agents-prompt";

export const TASTE_FILE_TARGETS: { id: TasteFileTarget; label: string; blurb: string }[] = [
  { id: "cursor", label: "Cursor", blurb: "Drop into a repo — every Cursor agent build ships in your taste." },
  { id: "claude-skill", label: "Claude Skill", blurb: "A SKILL.md Claude Code loads automatically for UI work." },
  { id: "agents-prompt", label: "Codex / ChatGPT", blurb: "An AGENTS.md-style prompt — drop in a repo or paste into chat." },
];

function cursorFile(t: TasteVector, tokens: Tokens, hue: number, swipeCount: number): TasteFile {
  const { name, prose, tokenJsonBlock, cssVarsBlock } = buildParts(t, tokens, hue);
  const content = `---
description: Personal design taste "${name}", learned by swiping in Taste Engine. Apply to all UI work.
globs: ["**/*.tsx", "**/*.jsx", "**/*.css", "**/*.html"]
alwaysApply: true
---

# Design taste: ${name}

You are building UI for someone with a specific, measured visual taste.
Honor these directives on every component, page, and style you produce.

## Style directives
${prose}

## Design tokens (source of truth)
${tokenJsonBlock}

## CSS variables
${cssVarsBlock}

_Generated by Taste Engine from ${swipeCount} swipes. You never described this — you reacted, and it compiled._
`;
  return { fileName: ".cursor/rules/taste.mdc", content };
}

function claudeSkillFile(t: TasteVector, tokens: Tokens, hue: number, swipeCount: number): TasteFile {
  const { name, slug, prose, tokenJsonBlock, cssVarsBlock } = buildParts(t, tokens, hue);
  const content = `---
name: taste-${slug}
description: Apply the design taste "${name}" (learned from ${swipeCount} real swipes, not described) to any UI, component, or style work in this project. Use this whenever writing or reviewing frontend code, CSS, or design tokens.
---

# Design taste: ${name}

This skill encodes one person's measured visual taste — a personal style
fingerprint derived from ~${swipeCount} swipe reactions in Taste Engine, not a
written brief. Apply it whenever generating or editing UI.

## Style directives
${prose}

## Design tokens (source of truth)
${tokenJsonBlock}

## CSS variables
${cssVarsBlock}

## When to use this skill
Use it for any task that produces or touches visible UI: new components,
page layouts, CSS/style edits, design-token definitions, or reviewing a
diff for style consistency. Prefer the tokens above over inventing new
colors, radii, spacing, or fonts.
`;
  return { fileName: `.claude/skills/taste-${slug}/SKILL.md`, content };
}

function agentsPromptFile(t: TasteVector, tokens: Tokens, hue: number, swipeCount: number): TasteFile {
  const { name, prose, tokenJsonBlock, cssVarsBlock } = buildParts(t, tokens, hue);
  const content = `# Design taste: ${name}

The following is a personal design taste, learned from ${swipeCount} swipe
reactions in Taste Engine rather than written by hand. Apply it to any UI,
component, or styling work you do in this project — treat it as a standing
style guide, not a one-off request.

## Style directives
${prose}

## Design tokens (source of truth)
${tokenJsonBlock}

## CSS variables
${cssVarsBlock}

---
This file works two ways: drop it in a repo root as \`AGENTS.md\` (Codex CLI
and compatible agents read it automatically), or copy the whole thing into a
ChatGPT/Codex chat as a system-style prompt before asking for UI work.
`;
  return { fileName: "AGENTS.md", content };
}

// Produce the wedge artifact in one of three formats, all derived from the
// same taste vector so switching targets never changes the underlying style
// — only the wrapper a given agent/tool expects.
export function generateTasteFile(
  target: TasteFileTarget,
  t: TasteVector,
  tokens: Tokens,
  hue: number,
  swipeCount: number,
): TasteFile {
  switch (target) {
    case "claude-skill":
      return claudeSkillFile(t, tokens, hue, swipeCount);
    case "agents-prompt":
      return agentsPromptFile(t, tokens, hue, swipeCount);
    case "cursor":
    default:
      return cursorFile(t, tokens, hue, swipeCount);
  }
}
