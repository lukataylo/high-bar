import tuned from "./generatorConfig.json";

// Every tunable constant the taste -> design-token generator uses. This is
// the search space for the offline training bench (bench/eval/optimize.mjs):
// it scores candidate configs against a hidden held-out set of real scraped
// sites and writes the winner to generatorConfig.json. tokensFromTaste and
// paletteFromTaste read from `generatorConfig` below — the shipped app is
// still a pure function over these numbers, no network call, no LLM.
export interface GeneratorConfig {
  chroma: { base: number; saturationGain: number; bgGain: number };
  contrast: { boostBase: number; boostGain: number; minRatio: number };
  lightness: {
    darkBgBase: number;
    darkBgRange: number;
    darkSurfaceStep: number;
    darkSurfaceAltStep: number;
    darkBorderStep: number;
    darkTextBase: number;
    darkTextRange: number;
    darkMuted: number;
    lightBgBase: number;
    lightBgRange: number;
    lightSurfaceAltStep: number;
    lightBorderStep: number;
    lightTextBase: number;
    lightTextRange: number;
    lightMuted: number;
    primaryLightDark: number;
    primaryLightLight: number;
  };
  hue: { harmonyOffsets: number[] };
  radius: { maxPx: number; smRatio: number };
  spacing: { base: number; densityGain: number; rhythmGain: number };
  shadow: { darkAlpha: number; lightAlpha: number };
  type: { lineHeightBase: number; lineHeightGain: number; letterSpacingBase: number; letterSpacingGain: number };
  motion: { base: number; gain: number };
  thresholds: {
    gradient: number;
    decorated: number;
    grain: number;
    borderWidthContrast: number;
    borderWidthRadius: number;
  };
}

// Baseline values — identical to what used to be hardcoded inline in
// tokens.ts/palette.ts. generatorConfig.json starts as a copy of this and is
// only ever overwritten by the optimizer, so behavior never changes outside
// of an explicit training run.
export const DEFAULT_CONFIG: GeneratorConfig = {
  chroma: { base: 0.02, saturationGain: 0.16, bgGain: 0.18 },
  contrast: { boostBase: 0.5, boostGain: 0.5, minRatio: 4.5 },
  lightness: {
    darkBgBase: 0.22,
    darkBgRange: 0.16,
    darkSurfaceStep: 0.05,
    darkSurfaceAltStep: 0.09,
    darkBorderStep: 0.14,
    darkTextBase: 0.9,
    darkTextRange: 0.06,
    darkMuted: 0.62,
    lightBgBase: 0.97,
    lightBgRange: 0.06,
    lightSurfaceAltStep: 0.04,
    lightBorderStep: 0.1,
    lightTextBase: 0.2,
    lightTextRange: 0.06,
    lightMuted: 0.45,
    primaryLightDark: 0.72,
    primaryLightLight: 0.58,
  },
  hue: { harmonyOffsets: [30, 150, 180] },
  radius: { maxPx: 24, smRatio: 0.6 },
  spacing: { base: 4, densityGain: 4, rhythmGain: 6 },
  shadow: { darkAlpha: 0.5, lightAlpha: 0.14 },
  type: { lineHeightBase: 1.35, lineHeightGain: 0.35, letterSpacingBase: 0.02, letterSpacingGain: 0.03 },
  motion: { base: 120, gain: 520 },
  thresholds: { gradient: 0.55, decorated: 0.55, grain: 0.6, borderWidthContrast: 0.6, borderWidthRadius: 0.4 },
};

function deepMerge<T>(base: T, patch: unknown): T {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return (patch === undefined ? base : (patch as T)) ?? base;
  }
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const baseVal = (base as Record<string, unknown>)[k];
    out[k] = typeof baseVal === "object" && baseVal !== null && !Array.isArray(baseVal) ? deepMerge(baseVal, v) : v;
  }
  return out as T;
}

// generatorConfig.json may be a partial/older shape (e.g. mid-training, or
// checked in before a new field existed) — deep-merge onto DEFAULT_CONFIG so
// missing keys always fall back to a known-good value.
export const generatorConfig: GeneratorConfig = deepMerge(DEFAULT_CONFIG, tuned);
