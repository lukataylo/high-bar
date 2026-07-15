import type { DimensionKey, TasteVector } from "../../src/taste/dimensions";
import type { RawSignals, WeightedColor } from "./cssSignals";

export interface ScrapedCard {
  id: string;
  name: string;
  tagline: string;
  attrs: TasteVector;
  hue: number;
  layout: "landing";
  attribution: string;
  sourceUrl: string;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function weightedMean(values: { v: number; w: number }[], fallback: number): number {
  const totalW = values.reduce((s, x) => s + x.w, 0);
  if (totalW <= 0) return fallback;
  return values.reduce((s, x) => s + x.v * x.w, 0) / totalW;
}

// The single most-repeated value wins, not the mean — a large stylesheet
// reuses the same handful of "real" bg/text colors on hundreds of elements,
// while one-off component colors are comparatively rare. Bucketing guards
// against the mean drifting toward whichever incidental colors happen to be
// numerous, which is what a dark app shell full of light hover/badge states
// otherwise does to a plain average.
function dominantLightness(values: { v: number; w: number }[], fallback: number, buckets = 12): number {
  if (values.length === 0) return fallback;
  const totals = new Array(buckets).fill(0);
  const sums = new Array(buckets).fill(0);
  const counts = new Array(buckets).fill(0);
  for (const { v, w } of values) {
    const idx = Math.min(buckets - 1, Math.max(0, Math.floor(v * buckets)));
    totals[idx] += w;
    sums[idx] += v * w;
    counts[idx] += w;
  }
  let best = 0;
  for (let i = 1; i < buckets; i++) if (totals[i] > totals[best]) best = i;
  return counts[best] > 0 ? sums[best] / counts[best] : fallback;
}

function median(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// rate: occurrences per ~100 declarations, so CSS-heavy and CSS-light sites
// are comparable on the same 0..1-ish scale before clamping.
function rate(count: number, declarationCount: number): number {
  return (count / Math.max(80, declarationCount)) * 100;
}

function circularMeanHue(colors: WeightedColor[]): number | null {
  const chromatic = colors.filter((c) => c.hsla.s > 0.15 && c.hsla.l > 0.06 && c.hsla.l < 0.96);
  if (chromatic.length === 0) return null;
  let x = 0;
  let y = 0;
  let totalW = 0;
  for (const c of chromatic) {
    const w = c.weight * c.hsla.s;
    const r = (c.hsla.h * Math.PI) / 180;
    x += Math.cos(r) * w;
    y += Math.sin(r) * w;
    totalW += w;
  }
  if (totalW === 0) return null;
  const mean = (Math.atan2(y, x) * 180) / Math.PI;
  return (mean + 360) % 360;
}

const FONT_CLASS_KEYWORDS: Array<{ re: RegExp; classCenter: number }> = [
  { re: /mono|code|consolas|courier/i, classCenter: 0.6 },
  { re: /serif|georgia|times|garamond|fraunces|playfair|lora|merriweather/i, classCenter: 0.9 },
  { re: /grotesk|bricolage|archivo|space grotesk/i, classCenter: 0.35 },
  { re: /sans|helvetica|arial|inter|roboto|system-ui|-apple-system|segoe/i, classCenter: 0.12 },
];

function classifyFontFamilies(families: string[]): number | null {
  const scores: number[] = [];
  for (const stack of families) {
    for (const { re, classCenter } of FONT_CLASS_KEYWORDS) {
      if (re.test(stack)) {
        scores.push(classCenter);
        break;
      }
    }
  }
  if (scores.length === 0) return null;
  return scores.reduce((s, v) => s + v, 0) / scores.length;
}

// Maps raw scraped CSS signals into our 0..1 taste-dimension vector. Every
// dimension falls back to a neutral 0.5 when the page carries no signal for
// it, matching the corpus's hand-authored `vec()` convention.
export function normalizeSignals(sig: RawSignals): ScrapedCard {
  const allColors = [...sig.tokenColors, ...sig.bgColors, ...sig.textColors];

  // Translucent colors (alpha < ~0.9) are almost always overlays, hover
  // washes, or tooltips layered on top of the real surface, not the surface
  // itself — an opaque page background/text color is the meaningful signal.
  const opaqueBg = sig.bgColors.filter((c) => c.hsla.a > 0.9);
  const opaqueText = sig.textColors.filter((c) => c.hsla.a > 0.9);

  const avgBgL = dominantLightness(
    (opaqueBg.length ? opaqueBg : sig.bgColors).map((c) => ({ v: c.hsla.l, w: c.weight })),
    0.9,
  );
  const avgTextL = dominantLightness(
    (opaqueText.length ? opaqueText : sig.textColors).map((c) => ({ v: c.hsla.l, w: c.weight })),
    0.15,
  );

  // How saturated the palette reads *overall* — a weighted mean across every
  // non-neutral color, not just the single most-vivid swatch. A site with
  // one vivid accent buried in a sea of grays should score lower than one
  // that stays vivid throughout, which a single percentile point can't tell
  // apart.
  const chromaticColors = allColors.filter((c) => c.hsla.l > 0.06 && c.hsla.l < 0.96 && c.hsla.s > 0.08);
  const saturation = clamp01(
    weightedMean(
      chromaticColors.map((c) => ({ v: c.hsla.s, w: c.weight })),
      0.15,
    ) * 1.15,
  );

  const hue = circularMeanHue(allColors) ?? 250;

  const contrastBase = clamp01(Math.abs(avgBgL - avgTextL) / 0.85);
  const avgBorder = weightedMean(
    sig.borderWidthsPx.map((v) => ({ v, w: 1 })),
    0,
  );
  const contrast = clamp01(contrastBase * 0.85 + clamp01(avgBorder / 3) * 0.15);

  const mode = clamp01(1 - avgBgL);

  const medRadius = median(sig.radiiPx, 8);
  const radius = clamp01(medRadius >= 999 ? 1 : medRadius / 28);

  const typeClass = classifyFontFamilies(sig.fontFamilies) ?? 0.2;
  const avgWeight = weightedMean(
    sig.fontWeights.map((v) => ({ v, w: 1 })),
    400,
  );
  const typeWeight = clamp01((avgWeight - 300) / 600);

  const avgPadGap = weightedMean(
    [...sig.paddingsPx, ...sig.gapsPx].map((v) => ({ v, w: 1 })),
    16,
  );
  const spacingRhythm = clamp01((avgPadGap - 6) / 42);

  const upperRate = rate(sig.uppercaseCount, sig.declarationCount);
  const letterSpacingSpread = sig.letterSpacingsEm.length
    ? Math.max(...sig.letterSpacingsEm.map(Math.abs))
    : 0;
  const ornament = clamp01(upperRate / 6 + clamp01(letterSpacingSpread / 0.15) * 0.3);

  const gradients = clamp01(rate(sig.gradientCount, sig.declarationCount) / 4);
  const depth = clamp01(
    (rate(sig.shadowCount, sig.declarationCount) + rate(sig.blurCount, sig.declarationCount) * 1.5) / 8,
  );
  const motion = clamp01(rate(sig.motionCount, sig.declarationCount) / 10);
  const texture = clamp01(rate(sig.textureHintCount, sig.declarationCount) / 3);

  const playfulness = clamp01(0.4 * gradients + 0.3 * ornament + 0.3 * saturation - 0.15 * (1 - radius));

  const attrs: TasteVector = {
    density: clamp01(1 - spacingRhythm * 0.7), // denser CSS spacing rhythm reads as airier layout, inversely
    radius,
    saturation,
    contrast,
    mode,
    type_class: clamp01(typeClass),
    type_weight: typeWeight,
    spacing_rhythm: spacingRhythm,
    ornament,
    gradients,
    depth,
    motion,
    playfulness,
    texture,
  } as Record<DimensionKey, number> as TasteVector;

  const slug = sig.hostname.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return {
    id: `insp-scraped-${slug}`,
    name: sig.title || sig.hostname,
    tagline: sig.description || `Live-scraped from ${sig.hostname}`,
    attrs,
    hue,
    layout: "landing",
    attribution: `Inspiration corpus · scraped · ${sig.hostname}`,
    sourceUrl: sig.url,
  };
}
