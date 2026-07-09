import { clamp01, type TasteVector } from "./dimensions";
import { pickFontPairing, pickFontWeight } from "./fonts";
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
export function tokensFromTaste(t: TasteVector, hue: number): Tokens {
  const palette = paletteFromTaste(t, hue);
  const pairing = pickFontPairing(t);
  const weights = pickFontWeight(t);

  // radius: sharp (0) -> fully rounded (24px+)
  const radiusPx = Math.round(t.radius * 24);

  // density + spacing_rhythm -> base spacing unit (tighter when dense)
  const spaceUnitPx = +(4 + (1 - t.density) * 4 + t.spacing_rhythm * 6).toFixed(1);

  // depth -> shadow token from none to layered
  const shadow = shadowToken(t.depth, t.mode);

  // gradients -> optional decorative background gradient on primaries
  const gradient = t.gradients > 0.55;
  const gradientCss = gradient
    ? `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`
    : palette.primary;

  const decorated = t.ornament > 0.55;
  const grain = t.texture > 0.6;
  const lineHeight = (1.35 + t.spacing_rhythm * 0.35).toFixed(2);
  const letterSpacing = (0.02 - t.type_class * 0.03).toFixed(3); // display tightens on serif
  const motionMs = Math.round(120 + t.motion * 520);
  const borderWidth = t.contrast > 0.6 && t.radius < 0.4 ? 2 : 1;

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
    "--radius-sm": `${Math.round(radiusPx * 0.6)}px`,
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

function shadowToken(depth: number, mode: number): string {
  if (depth < 0.2) return "none";
  const d = clamp01(depth);
  const alpha = (mode >= 0.5 ? 0.5 : 0.14) * d;
  const y1 = Math.round(2 + d * 6);
  const b1 = Math.round(6 + d * 24);
  const y2 = Math.round(1 + d * 2);
  const b2 = Math.round(2 + d * 8);
  return `0 ${y1}px ${b1}px rgba(0,0,0,${alpha.toFixed(3)}), 0 ${y2}px ${b2}px rgba(0,0,0,${(alpha * 0.6).toFixed(3)})`;
}
