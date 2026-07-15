import { clamp01, type TasteVector } from "./dimensions";
import { pickFontPairing, pickFontWeight, type FontPairing } from "./fonts";
import { generatorConfig, type GeneratorConfig } from "./generatorConfig";
import { paletteFromTaste, type Palette } from "./palette";

// Overrides for the discrete (non-continuous) picks a caller has already
// resolved elsewhere — used by the live preview's sticky/hysteresis layer
// (see stickyChoices.ts) so a committed font pairing or accent-hue bucket can
// be reused instead of recomputed fresh. Omit for the pure, stateless
// behavior every other caller (bench scoring, variant cards, tests) wants.
export interface StickyOverrides {
  pairing?: FontPairing;
  accentOffsetIndex?: number;
}

// A resolved set of design tokens. `cssVars` is what actually drives every
// styled surface (preview dashboard, variant cards, taste card) — the mirror
// simply consumes these variables.
export interface Tokens {
  cssVars: Record<string, string>;
  palette: Palette;
  fontDisplay: string;
  fontBody: string;
  fontWeightDisplay: number;
  fontWeightBody: number;
  radiusPx: number;
  spaceUnitPx: number;
  lineHeightRatio: number;
  typeScale: number;
  decorated: boolean;
  gradient: boolean;
  grain: boolean;
  fontName: string;
}

// Standard web body size — the reference point every grid computation below
// (line-height, type scale) is anchored to, so "grid-aligned" means the same
// thing regardless of what font-size a given surface actually renders at.
const REFERENCE_FONT_PX = 16;

// Named modular-scale ratios (real typographic convention — Major Second
// through Golden Ratio) rather than an interpolated number, so the jump from
// body to headline always reads as one deliberate, recognizable proportion
// instead of an arbitrary blend that lands nowhere in particular.
const TYPE_SCALE_RATIOS = [1.125, 1.2, 1.25, 1.333, 1.414, 1.5, 1.618];

// Airy, playful, editorial taste wants a more dramatic scale; dense, serious,
// utilitarian taste wants a tighter one. Picking a bucket (not blending)
// keeps every generated style anchored to a real named ratio.
function pickTypeScale(t: TasteVector): number {
  const expressiveness = clamp01((t.playfulness + (1 - t.density) + t.type_class) / 3);
  const idx = Math.min(TYPE_SCALE_RATIOS.length - 1, Math.floor(expressiveness * TYPE_SCALE_RATIOS.length));
  return TYPE_SCALE_RATIOS[idx];
}

// THE load-bearing mapping. Pure function: taste vector (+ derived hue) in,
// design tokens out. Hand-verify this; everything else can be vibe-checked.
// `cfg` defaults to the shipped, trained config — the offline bench passes
// candidate configs here directly to score them without touching disk.
export function tokensFromTaste(
  t: TasteVector,
  hue: number,
  cfg: GeneratorConfig = generatorConfig,
  sticky?: StickyOverrides,
): Tokens {
  const palette = paletteFromTaste(t, hue, cfg, sticky?.accentOffsetIndex);
  const pairing = sticky?.pairing ?? pickFontPairing(t);
  const weights = pickFontWeight(t);

  // radius: sharp (0) -> fully rounded (24px+)
  const radiusPx = Math.round(t.radius * cfg.radius.maxPx);

  // density + spacing_rhythm -> base spacing unit (tighter when dense)
  const spaceUnitPx = +(
    cfg.spacing.base +
    (1 - t.density) * cfg.spacing.densityGain +
    t.spacing_rhythm * cfg.spacing.rhythmGain
  ).toFixed(1);

  // depth -> shadow token from none to layered
  const shadow = shadowToken(t.depth, t.mode, cfg);

  // gradients -> optional decorative background gradient on primaries
  const gradient = t.gradients > cfg.thresholds.gradient;
  const gradientCss = gradient
    ? `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`
    : palette.primary;

  const decorated = t.ornament > cfg.thresholds.decorated;
  const grain = t.texture > cfg.thresholds.grain;

  // Vertical rhythm: snap line-height (measured at the reference size) to
  // the same spacing grid every margin/padding token already uses, so text
  // baselines and layout spacing share one rhythm instead of line-height
  // floating as an unrelated, ungrounded ratio.
  const rawLineHeightPx =
    REFERENCE_FONT_PX * (cfg.type.lineHeightBase + t.spacing_rhythm * cfg.type.lineHeightGain);
  const gridStepPx = Math.max(2, spaceUnitPx / 2);
  const snappedLineHeightPx = Math.max(gridStepPx, Math.round(rawLineHeightPx / gridStepPx) * gridStepPx);
  const lineHeight = (snappedLineHeightPx / REFERENCE_FONT_PX).toFixed(3);

  const typeScale = pickTypeScale(t);
  const letterSpacing = (cfg.type.letterSpacingBase - t.type_class * cfg.type.letterSpacingGain).toFixed(3); // display tightens on serif
  const motionMs = Math.round(cfg.motion.base + t.motion * cfg.motion.gain);
  const borderWidth = t.contrast > cfg.thresholds.borderWidthContrast && t.radius < cfg.thresholds.borderWidthRadius ? 2 : 1;

  const cssVars: Record<string, string> = {
    "--bg": palette.bg,
    "--surface": palette.surface,
    "--surface-alt": palette.surfaceAlt,
    "--border": palette.border,
    "--border-width": `${borderWidth}px`,
    "--text": palette.text,
    "--text-muted": palette.textMuted,
    "--primary": palette.primary,
    "--primary-bg": gradientCss,
    "--primary-text": palette.primaryText,
    "--accent": palette.accent,
    "--radius": `${radiusPx}px`,
    "--radius-sm": `${Math.round(radiusPx * cfg.radius.smRatio)}px`,
    "--space-unit": `${spaceUnitPx}px`,
    "--space-2": `${(spaceUnitPx * 2).toFixed(1)}px`,
    "--space-3": `${(spaceUnitPx * 3).toFixed(1)}px`,
    "--space-4": `${(spaceUnitPx * 4).toFixed(1)}px`,
    "--font-display": pairing.display,
    "--font-body": pairing.body,
    "--weight-display": `${weights.display}`,
    "--weight-body": `${weights.body}`,
    "--line-height": lineHeight,
    "--type-scale": typeScale.toFixed(3),
    "--letter-spacing": `${letterSpacing}em`,
    "--shadow": shadow,
    "--motion-ms": `${motionMs}ms`,
    "--grain-opacity": grain ? "0.06" : "0",
  };

  return {
    cssVars,
    palette,
    fontDisplay: pairing.display,
    fontBody: pairing.body,
    fontWeightDisplay: weights.display,
    fontWeightBody: weights.body,
    radiusPx,
    spaceUnitPx,
    lineHeightRatio: parseFloat(lineHeight),
    typeScale,
    decorated,
    gradient,
    grain,
    fontName: pairing.name,
  };
}

function shadowToken(depth: number, mode: number, cfg: GeneratorConfig): string {
  if (depth < 0.2) return "none";
  const d = clamp01(depth);
  const alpha = (mode >= 0.5 ? cfg.shadow.darkAlpha : cfg.shadow.lightAlpha) * d;
  const y1 = Math.round(2 + d * 6);
  const b1 = Math.round(6 + d * 24);
  const y2 = Math.round(1 + d * 2);
  const b2 = Math.round(2 + d * 8);
  return `0 ${y1}px ${b1}px rgba(0,0,0,${alpha.toFixed(3)}), 0 ${y2}px ${b2}px rgba(0,0,0,${(alpha * 0.6).toFixed(3)})`;
}
