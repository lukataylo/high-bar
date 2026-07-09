import { clamp01, type TasteVector } from "./dimensions";

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

// Derive a full palette from the taste vector + a dominant hue (degrees).
// - mode drives light/dark lightness bands
// - saturation drives chroma
// - contrast widens the gap between text and background
export function paletteFromTaste(t: TasteVector, hue: number): Palette {
  const dark = t.mode; // 0 light -> 1 dark
  const chroma = 0.02 + t.saturation * 0.16; // muted -> vivid
  const contrastBoost = 0.5 + t.contrast * 0.5;

  let bgL: number;
  let surfaceL: number;
  let surfaceAltL: number;
  let textL: number;
  let mutedL: number;
  let borderL: number;

  if (dark >= 0.5) {
    const d = (dark - 0.5) / 0.5; // 0..1 within dark band
    bgL = 0.22 - d * 0.16; // 0.22 -> 0.06
    surfaceL = bgL + 0.05;
    surfaceAltL = bgL + 0.09;
    borderL = bgL + 0.14;
    textL = 0.9 + d * 0.06;
    mutedL = 0.62;
  } else {
    const l = 1 - dark / 0.5; // 1 at pure light
    bgL = 0.97 - (1 - l) * 0.06; // 0.97 -> 0.91
    surfaceL = Math.min(0.995, bgL + 0.03);
    surfaceAltL = bgL - 0.04;
    borderL = bgL - 0.1;
    textL = 0.2 - l * 0.06; // darker text for more contrast
    mutedL = 0.45;
  }

  // Contrast widens the text/bg lightness gap symmetrically.
  if (dark >= 0.5) textL = clamp01(textL + (textL - bgL) * (contrastBoost - 0.5));
  else textL = clamp01(textL - (bgL - textL) * (contrastBoost - 0.5));

  const bgChroma = chroma * 0.18; // tinted neutrals, not grey slop
  const primaryL = dark >= 0.5 ? 0.72 : 0.58;
  const accentHue = hue + 150;

  return {
    hue,
    bg: oklch(bgL, bgChroma, hue),
    surface: oklch(surfaceL, bgChroma * 1.1, hue),
    surfaceAlt: oklch(surfaceAltL, bgChroma * 1.4, hue),
    border: oklch(borderL, bgChroma * 1.6, hue),
    text: oklch(textL, bgChroma * 0.8, hue),
    textMuted: oklch(mutedL, bgChroma, hue),
    primary: oklch(primaryL, chroma, hue),
    primaryText: oklch(dark >= 0.5 ? 0.15 : 0.99, chroma * 0.2, hue),
    accent: oklch(dark >= 0.5 ? 0.75 : 0.6, chroma * 0.9, accentHue),
  };
}

export { oklch };
