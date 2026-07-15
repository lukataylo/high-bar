// OKLCH <-> linear sRGB (Björn Ottosson's OKLab) plus the WCAG contrast math
// built on top of it. Two jobs: keep generated oklch() values inside the
// sRGB gamut (so the browser never silently clips them to a different hue),
// and let the token generator enforce a *real* contrast ratio instead of
// guessing at a lightness gap.

interface LinearRGB {
  r: number;
  g: number;
  b: number;
}

function oklchToLinearSrgb(l: number, c: number, hDeg: number): LinearRGB {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
  };
}

const GAMUT_EPS = 1e-4;

// True if (l, c, h) renders without the browser having to clip it into gamut.
export function inSrgbGamut(l: number, c: number, h: number): boolean {
  const { r, g, b } = oklchToLinearSrgb(l, c, h);
  return (
    r >= -GAMUT_EPS &&
    r <= 1 + GAMUT_EPS &&
    g >= -GAMUT_EPS &&
    g <= 1 + GAMUT_EPS &&
    b >= -GAMUT_EPS &&
    b <= 1 + GAMUT_EPS
  );
}

// Largest chroma at this lightness/hue that still stays inside sRGB gamut,
// via binary search. Colors we ask the browser to render should never need
// clipping — clipped oklch() silently shifts hue/lightness away from what we
// computed, which is exactly the "random" look this is meant to prevent.
export function maxChromaInGamut(l: number, h: number, ceiling = 0.4): number {
  let lo = 0;
  let hi = ceiling;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgbGamut(l, mid, h)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function relativeLuminance(l: number, c: number, h: number): number {
  const { r, g, b } = oklchToLinearSrgb(l, c, h);
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

export interface Lch {
  l: number;
  c: number;
  h: number;
}

// WCAG contrast ratio (1..21) between two OKLCH colors.
export function contrastRatio(a: Lch, b: Lch): number {
  const la = relativeLuminance(a.l, a.c, a.h);
  const lb = relativeLuminance(b.l, b.c, b.h);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// Push `textL` further from `bg` (same chroma/hue, same direction it already
// leans) until the contrast ratio clears `minRatio`, or the lightness bound
// is hit. Replaces an ad hoc "widen the gap by a fraction" heuristic with an
// actual measured guarantee.
export function enforceContrast(bg: Lch, textL: number, textC: number, textH: number, minRatio: number): number {
  const towardLighter = textL >= bg.l;
  let l = textL;
  for (let i = 0; i < 100; i++) {
    const ratio = contrastRatio(bg, { l, c: textC, h: textH });
    if (ratio >= minRatio) return l;
    l = towardLighter ? l + 0.01 : l - 0.01;
    if (l >= 0.99) return 0.99;
    if (l <= 0.01) return 0.01;
  }
  return l;
}
