// Minimal CSS color parser: hex(3/4/6/8), rgb()/rgba(), hsl()/hsla(), and a
// small named-color table. Returns HSL + alpha so the extractor can reason
// about lightness/saturation without pulling in a color library.

export interface Hsla {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
  a: number; // 0..1
}

const NAMED: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  transparent: [0, 0, 0],
  red: [255, 0, 0],
  blue: [0, 0, 255],
  green: [0, 128, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  yellow: [255, 255, 0],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
};

function rgbToHsl(r: number, g: number, b: number, a: number): Hsla {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l, a };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return { h: h * 60, s, l, a };
}

export function parseColor(raw: string): Hsla | null {
  const str = raw.trim().toLowerCase();
  if (str === "transparent" || str === "none" || str === "currentcolor" || str === "inherit") return null;

  let m = str.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return rgbToHsl(r, g, b, a);
  }

  m = str.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,/]/).map((p) => p.trim());
    const r = parseFloat(parts[0]);
    const g = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return rgbToHsl(r, g, b, Number.isNaN(a) ? 1 : a);
  }

  m = str.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,/]/).map((p) => p.trim());
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    if ([h, s, l].some((v) => Number.isNaN(v))) return null;
    return { h: ((h % 360) + 360) % 360, s, l, a: Number.isNaN(a) ? 1 : a };
  }

  const named = NAMED[str];
  if (named) return rgbToHsl(named[0], named[1], named[2], str === "transparent" ? 0 : 1);

  return null;
}
