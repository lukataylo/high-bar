import { enforceContrast, maxChromaInGamut } from "./color";
import { clamp01, type TasteVector } from "./dimensions";
import { generatorConfig, type GeneratorConfig } from "./generatorConfig";

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  hue: number;
}

// Modern browsers render oklch() directly, so we can emit it as-is. OKLCH keeps
// perceived lightness stable while we vary hue/chroma, which is what makes the
// generated palettes read as "designed" rather than random.
function oklch(l: number, c: number, h: number, alpha = 1): string {
  const L = clamp01(l).toFixed(3);
  const C = Math.max(0, c).toFixed(3);
  const H = ((h % 360) + 360) % 360;
  return alpha >= 1
    ? `oklch(${L} ${C} ${H.toFixed(1)})`
    : `oklch(${L} ${C} ${H.toFixed(1)} / ${alpha})`;
}

// Every swatch (not just primary/accent) gets its chroma capped to what
// sRGB can actually render at that lightness/hue — an uncapped oklch() past
// gamut is silently clipped by the browser, which is a worse and less
// predictable failure than us clamping it ourselves.
function gamutSafe(l: number, c: number, h: number, alpha = 1): string {
  // toFixed(3) in oklch() can round a chroma sitting exactly on the gamut
  // boundary back out of gamut — back off by a hair so the *rendered* string
  // stays in gamut, not just the pre-rounding number.
  const capped = Math.min(c, Math.max(0, maxChromaInGamut(clamp01(l), h) - 0.001));
  return oklch(l, capped, h, alpha);
}

// How bold a palette should read: low saturation+playfulness favors a
// narrow, analogous accent offset that reads as harmonious; high boldness
// favors a wide, complementary offset that reads as intentional contrast.
export function boldnessOf(t: TasteVector): number {
  return clamp01((t.saturation + t.playfulness) / 2);
}

// Which harmony-offset bucket the current taste's boldness falls into.
// Exported (rather than folded into paletteFromTaste) so the sticky resolver
// can compute this once, decide whether to keep the previous bucket, and
// hand the resolved index back in as an override.
export function accentOffsetIndex(t: TasteVector, cfg: GeneratorConfig): number {
  const offsets = cfg.hue.harmonyOffsets;
  const idx = Math.min(offsets.length - 1, Math.floor(boldnessOf(t) * offsets.length));
  return idx;
}

// Lower is better — distance from boldness to bucket `idx`'s center. Used to
// compare "how good a fit is the currently-committed bucket" against "how
// good a fit is the fresh nearest bucket" on the same scale.
export function accentOffsetIndexScore(idx: number, t: TasteVector, cfg: GeneratorConfig): number {
  const n = cfg.hue.harmonyOffsets.length;
  const center = (idx + 0.5) / n;
  return Math.abs(boldnessOf(t) - center);
}

// Derive a full palette from the taste vector + a dominant hue (degrees).
// - mode drives light/dark lightness bands
// - saturation drives chroma
// - contrast enforces a real minimum WCAG contrast ratio (not just a wider gap)
export function paletteFromTaste(
  t: TasteVector,
  hue: number,
  cfg: GeneratorConfig = generatorConfig,
  accentOffsetIndexOverride?: number,
): Palette {
  const dark = t.mode; // 0 light -> 1 dark
  const chroma = cfg.chroma.base + t.saturation * cfg.chroma.saturationGain; // muted -> vivid
  const ls = cfg.lightness;

  let bgL: number;
  let surfaceL: number;
  let surfaceAltL: number;
  let textL: number;
  let mutedL: number;
  let borderL: number;

  if (dark >= 0.5) {
    const d = (dark - 0.5) / 0.5; // 0..1 within dark band
    bgL = ls.darkBgBase - d * ls.darkBgRange;
    surfaceL = bgL + ls.darkSurfaceStep;
    surfaceAltL = bgL + ls.darkSurfaceAltStep;
    borderL = bgL + ls.darkBorderStep;
    textL = ls.darkTextBase + d * ls.darkTextRange;
    mutedL = ls.darkMuted;
  } else {
    const l = 1 - dark / 0.5; // 1 at pure light
    bgL = ls.lightBgBase - (1 - l) * ls.lightBgRange;
    surfaceL = Math.min(0.995, bgL + 0.03);
    surfaceAltL = bgL - ls.lightSurfaceAltStep;
    borderL = bgL - ls.lightBorderStep;
    textL = ls.lightTextBase - l * ls.lightTextRange;
    mutedL = ls.lightMuted;
  }

  const bgChroma = chroma * cfg.chroma.bgGain; // tinted neutrals, not grey slop
  const textChroma = bgChroma * 0.8;

  // Guarantee a real contrast ratio between text and background — `contrast`
  // still nudges the starting gap (so the dimension keeps meaning), but the
  // floor is an actual measured WCAG ratio, not a hoped-for lightness delta.
  const boost = cfg.contrast.boostBase + t.contrast * cfg.contrast.boostGain;
  const wantedRatio = cfg.contrast.minRatio * (0.7 + boost * 0.6);
  textL = enforceContrast({ l: bgL, c: bgChroma, h: hue }, textL, textChroma, hue, wantedRatio);

  let primaryL = dark >= 0.5 ? ls.primaryLightDark : ls.primaryLightLight;
  // A primary that lands too close in lightness to the surface it sits on
  // reads as the same fill — buttons and cards need to stay visually
  // distinct elements, not just differently-hued versions of the same tone.
  const minGap = cfg.contrast.primarySurfaceMinLGap;
  if (Math.abs(primaryL - surfaceL) < minGap) {
    const pushLighter = primaryL >= surfaceL;
    primaryL = clamp01(pushLighter ? surfaceL + minGap : surfaceL - minGap);
  }

  const offsetIdx = accentOffsetIndexOverride ?? accentOffsetIndex(t, cfg);
  const accentHue = hue + cfg.hue.harmonyOffsets[offsetIdx];
  const accentL = dark >= 0.5 ? 0.75 : 0.6;

  return {
    hue,
    bg: gamutSafe(bgL, bgChroma, hue),
    surface: gamutSafe(surfaceL, bgChroma * 1.1, hue),
    surfaceAlt: gamutSafe(surfaceAltL, bgChroma * 1.4, hue),
    border: gamutSafe(borderL, bgChroma * 1.6, hue),
    text: gamutSafe(textL, textChroma, hue),
    textMuted: gamutSafe(mutedL, bgChroma, hue),
    primary: gamutSafe(primaryL, chroma, hue),
    primaryText: gamutSafe(dark >= 0.5 ? 0.15 : 0.99, chroma * 0.2, hue),
    accent: gamutSafe(accentL, chroma * 0.9, accentHue),
  };
}

export { oklch };
