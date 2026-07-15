import { contrastRatio, inSrgbGamut, maxChromaInGamut } from "../../src/taste/color";
import type { TasteVector } from "../../src/taste/dimensions";
import { generatorConfig, type GeneratorConfig } from "../../src/taste/generatorConfig";
import { tokensFromTaste } from "../../src/taste/tokens";

export interface HoldoutExample {
  id: string;
  attrs: TasteVector;
  hue: number;
}

interface OklchParts {
  l: number;
  c: number;
  h: number;
}

function parseOklch(str: string): OklchParts {
  const m = str.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`unparseable oklch(): ${str}`);
  return { l: parseFloat(m[1]), c: parseFloat(m[2]), h: parseFloat(m[3]) };
}

function circularHueDistance(a: number, h: number): number {
  const d = Math.abs(((a - h + 540) % 360) - 180);
  return d;
}

export interface ExampleScore {
  id: string;
  total: number; // 0..100
  contrast: number; // 0..20 — does text actually clear WCAG AA against bg?
  gamut: number; // 0..20 — do the emitted oklch() colors need clipping?
  chromaFidelity: number; // 0..20 — how much saturation survived gamut clamping
  hueSeparation: number; // 0..20 — is the accent visually distinct from primary?
  typeGrid: number; // 0..20 — vertical rhythm + primary/surface distinguishability
}

// Scores one real taste vector (extracted from a live site by the scraper)
// against a candidate generator config. This is the hidden-eval unit: the
// optimizer calls it hundreds of times per holdout example while searching
// generatorConfig, and the CI gate calls it once against the shipped config.
export function scoreExample(example: HoldoutExample, cfg: GeneratorConfig = generatorConfig): ExampleScore {
  const tokens = tokensFromTaste(example.attrs, example.hue, cfg);
  const p = tokens.palette;

  const bg = parseOklch(p.bg);
  const text = parseOklch(p.text);
  const ratio = contrastRatio(bg, text);
  const contrast = Math.min(20, (ratio / 4.5) * 20);

  const swatches = [p.bg, p.surface, p.surfaceAlt, p.border, p.text, p.textMuted, p.primary, p.accent].map(
    parseOklch,
  );
  const inGamutCount = swatches.filter((s) => inSrgbGamut(s.l, s.c, s.h)).length;
  const gamut = (inGamutCount / swatches.length) * 20;

  const primary = parseOklch(p.primary);
  const accent = parseOklch(p.accent);
  const requestedChroma = cfg.chroma.base + example.attrs.saturation * cfg.chroma.saturationGain;
  const primaryCeil = Math.max(1e-6, maxChromaInGamut(primary.l, primary.h));
  const accentCeil = Math.max(1e-6, maxChromaInGamut(accent.l, accent.h));
  const primaryFidelity = Math.min(1, primary.c / Math.min(requestedChroma, primaryCeil));
  const accentFidelity = Math.min(1, accent.c / Math.min(requestedChroma * 0.9, accentCeil));
  const chromaFidelity = ((primaryFidelity + accentFidelity) / 2) * 20;

  const hueDist = circularHueDistance(primary.h, accent.h);
  const hueSeparation = Math.min(20, (hueDist / 30) * 20);

  // Vertical rhythm: line-height (at the 16px reference size) should land on
  // a multiple of half the spacing unit — the same grid check the unit
  // tests run, but here it's a continuous score so a near-miss degrades
  // gracefully instead of just pass/fail.
  const gridStepPx = Math.max(2, tokens.spaceUnitPx / 2);
  const lineHeightPx = tokens.lineHeightRatio * 16;
  const gridRemainder = Math.abs(lineHeightPx / gridStepPx - Math.round(lineHeightPx / gridStepPx));
  const gridScore = Math.max(0, 1 - gridRemainder / 0.5) * 10;

  // Primary shouldn't blend into the surface it sits on.
  const surface = parseOklch(p.surface);
  const lGap = Math.abs(primary.l - surface.l);
  const distinctScore = Math.min(1, lGap / cfg.contrast.primarySurfaceMinLGap) * 10;

  const typeGrid = gridScore + distinctScore;

  return {
    id: example.id,
    total: contrast + gamut + chromaFidelity + hueSeparation + typeGrid,
    contrast,
    gamut,
    chromaFidelity,
    hueSeparation,
    typeGrid,
  };
}

export interface AggregateScore {
  mean: number;
  min: number;
  scores: ExampleScore[];
  differentiation: number; // 0..100, batch-level — see scoreDifferentiation
}

// A perceptual-ish distance between two generated palettes/tokens, weighted
// toward the properties a person would actually notice first (hue, then
// light/dark, then how vivid, then how rounded).
function visualDistance(a: HoldoutExample, b: HoldoutExample, cfg: GeneratorConfig): number {
  const ta = tokensFromTaste(a.attrs, a.hue, cfg);
  const tb = tokensFromTaste(b.attrs, b.hue, cfg);
  const bgA = parseOklch(ta.palette.bg);
  const bgB = parseOklch(tb.palette.bg);
  const primA = parseOklch(ta.palette.primary);
  const primB = parseOklch(tb.palette.primary);

  const hueDist = circularHueDistance(primA.h, primB.h) / 180; // 0..1
  const lightnessDist = Math.abs(bgA.l - bgB.l); // 0..1
  const chromaDist = Math.abs(primA.c - primB.c) / 0.4; // 0.4 ~= a very saturated oklch chroma
  const radiusDist = Math.abs(a.attrs.radius - b.attrs.radius);

  return hueDist * 0.4 + lightnessDist * 0.3 + Math.min(1, chromaDist) * 0.15 + radiusDist * 0.15;
}

// Batch-level check: does the generator actually differentiate distinct real
// sites, or does it collapse a diverse holdout set toward similar-looking
// output? Per-example scores above can all be individually excellent while
// this still fails — they never compare examples to each other.
const TOO_SIMILAR_THRESHOLD = 0.12;

export function scoreDifferentiation(examples: HoldoutExample[], cfg: GeneratorConfig = generatorConfig): number {
  if (examples.length < 2) return 100;
  let pairs = 0;
  let distinctPairs = 0;
  for (let i = 0; i < examples.length; i++) {
    for (let j = i + 1; j < examples.length; j++) {
      pairs++;
      if (visualDistance(examples[i], examples[j], cfg) >= TOO_SIMILAR_THRESHOLD) distinctPairs++;
    }
  }
  return (distinctPairs / pairs) * 100;
}

export function scoreHoldout(examples: HoldoutExample[], cfg: GeneratorConfig = generatorConfig): AggregateScore {
  const scores = examples.map((ex) => scoreExample(ex, cfg));
  const totals = scores.map((s) => s.total);
  return {
    mean: totals.reduce((s, v) => s + v, 0) / totals.length,
    min: Math.min(...totals),
    scores,
    differentiation: scoreDifferentiation(examples, cfg),
  };
}
