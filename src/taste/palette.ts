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

// Pick an accent hue offset from the primary: low saturation+playfulness
// ("boldness") favors a narrow, analogous offset that reads as harmonious;
// high boldness favors a wide, complementary offset that reads as intentional
// contrast. Replaces a single fixed +150 offset for every taste.
function pickAccentOffset(t: TasteVector, cfg: GeneratorConfig): number {
  const offsets = cfg.hue.harmonyOffsets;
  const boldness = clamp01((t.saturation + t.playfulness) / 2);
  const idx = Math.min(offsets.length - 1, Math.floor(boldness * offsets.length));
  return offsets[idx];
}

// Derive a full palette from the taste vector + a dominant hue (degrees).
// - mode drives light/dark lightness bands
// - saturation drives chroma
// - contrast enforces a real minimum WCAG contrast ratio (not just a wider gap)
export function paletteFromTaste(t: TasteVector, hue: number, cfg: GeneratorConfig = generatorConfig): Palette {
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

  const primaryL = dark >= 0.5 ? ls.primaryLightDark : ls.primaryLightLight;
  const accentHue = hue + pickAccentOffset(t, cfg);
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
