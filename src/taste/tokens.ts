import { clamp01, type TasteVector } from "./dimensions";
import { pickFontPairing, pickFontWeight } from "./fonts";
import { generatorConfig, type GeneratorConfig } from "./generatorConfig";
import { paletteFromTaste, type Palette } from "./palette";

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
  decorated: boolean;
  gradient: boolean;
  grain: boolean;
  fontName: string;
}

// THE load-bearing mapping. Pure function: taste vector (+ derived hue) in,
// design tokens out. Hand-verify this; everything else can be vibe-checked.
// `cfg` defaults to the shipped, trained config — the offline bench passes
// candidate configs here directly to score them without touching disk.
export function tokensFromTaste(t: TasteVector, hue: number, cfg: GeneratorConfig = generatorConfig): Tokens {
  const palette = paletteFromTaste(t, hue, cfg);
  const pairing = pickFontPairing(t);
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
  const lineHeight = (cfg.type.lineHeightBase + t.spacing_rhythm * cfg.type.lineHeightGain).toFixed(2);
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
