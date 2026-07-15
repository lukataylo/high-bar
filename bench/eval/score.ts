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
  contrast: number; // 0..25 — does text actually clear WCAG AA against bg?
  gamut: number; // 0..25 — do the emitted oklch() colors need clipping?
  chromaFidelity: number; // 0..25 — how much saturation survived gamut clamping
  hueSeparation: number; // 0..25 — is the accent visually distinct from primary?
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
  const contrast = Math.min(25, (ratio / 4.5) * 25);

  const swatches = [p.bg, p.surface, p.surfaceAlt, p.border, p.text, p.textMuted, p.primary, p.accent].map(
    parseOklch,
  );
  const inGamutCount = swatches.filter((s) => inSrgbGamut(s.l, s.c, s.h)).length;
  const gamut = (inGamutCount / swatches.length) * 25;

  const primary = parseOklch(p.primary);
  const accent = parseOklch(p.accent);
  const requestedChroma = cfg.chroma.base + example.attrs.saturation * cfg.chroma.saturationGain;
  const primaryCeil = Math.max(1e-6, maxChromaInGamut(primary.l, primary.h));
  const accentCeil = Math.max(1e-6, maxChromaInGamut(accent.l, accent.h));
  const primaryFidelity = Math.min(1, primary.c / Math.min(requestedChroma, primaryCeil));
  const accentFidelity = Math.min(1, accent.c / Math.min(requestedChroma * 0.9, accentCeil));
  const chromaFidelity = ((primaryFidelity + accentFidelity) / 2) * 25;

  const hueDist = circularHueDistance(primary.h, accent.h);
  const hueSeparation = Math.min(25, (hueDist / 30) * 25);

  return {
    id: example.id,
    total: contrast + gamut + chromaFidelity + hueSeparation,
    contrast,
    gamut,
    chromaFidelity,
    hueSeparation,
  };
}

export interface AggregateScore {
  mean: number;
  min: number;
  scores: ExampleScore[];
}

export function scoreHoldout(examples: HoldoutExample[], cfg: GeneratorConfig = generatorConfig): AggregateScore {
  const scores = examples.map((ex) => scoreExample(ex, cfg));
  const totals = scores.map((s) => s.total);
  return {
    mean: totals.reduce((s, v) => s + v, 0) / totals.length,
    min: Math.min(...totals),
    scores,
  };
}
