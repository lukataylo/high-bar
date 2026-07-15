import type { GeneratorConfig } from "../../src/taste/generatorConfig";

export interface Knob {
  name: string;
  min: number;
  max: number;
  get: (c: GeneratorConfig) => number;
  set: (c: GeneratorConfig, v: number) => void;
}

// Only parameters that plausibly move the four things score.ts actually
// measures (contrast, gamut validity, chroma fidelity, hue separation) are
// tunable here. Radius/spacing/motion/etc. shape *feel*, not consistency —
// optimizing them against this rubric would just be aimless drift.
export const KNOBS: Knob[] = [
  { name: "chroma.base", min: 0, max: 0.06, get: (c) => c.chroma.base, set: (c, v) => (c.chroma.base = v) },
  {
    name: "chroma.saturationGain",
    min: 0.05,
    max: 0.3,
    get: (c) => c.chroma.saturationGain,
    set: (c, v) => (c.chroma.saturationGain = v),
  },
  { name: "chroma.bgGain", min: 0.05, max: 0.35, get: (c) => c.chroma.bgGain, set: (c, v) => (c.chroma.bgGain = v) },
  {
    name: "contrast.minRatio",
    min: 3.0,
    max: 7.0,
    get: (c) => c.contrast.minRatio,
    set: (c, v) => (c.contrast.minRatio = v),
  },
  {
    name: "contrast.boostBase",
    min: 0.2,
    max: 0.8,
    get: (c) => c.contrast.boostBase,
    set: (c, v) => (c.contrast.boostBase = v),
  },
  {
    name: "contrast.boostGain",
    min: 0.2,
    max: 0.8,
    get: (c) => c.contrast.boostGain,
    set: (c, v) => (c.contrast.boostGain = v),
  },
  {
    name: "lightness.darkBgBase",
    min: 0.05,
    max: 0.35,
    get: (c) => c.lightness.darkBgBase,
    set: (c, v) => (c.lightness.darkBgBase = v),
  },
  {
    name: "lightness.lightBgBase",
    min: 0.85,
    max: 0.995,
    get: (c) => c.lightness.lightBgBase,
    set: (c, v) => (c.lightness.lightBgBase = v),
  },
  {
    name: "lightness.primaryLightDark",
    min: 0.5,
    max: 0.85,
    get: (c) => c.lightness.primaryLightDark,
    set: (c, v) => (c.lightness.primaryLightDark = v),
  },
  {
    name: "lightness.primaryLightLight",
    min: 0.4,
    max: 0.7,
    get: (c) => c.lightness.primaryLightLight,
    set: (c, v) => (c.lightness.primaryLightLight = v),
  },
  {
    name: "hue.harmonyOffsets[0]",
    min: 15,
    max: 60,
    get: (c) => c.hue.harmonyOffsets[0],
    set: (c, v) => (c.hue.harmonyOffsets[0] = v),
  },
  {
    name: "hue.harmonyOffsets[1]",
    min: 90,
    max: 165,
    get: (c) => c.hue.harmonyOffsets[1],
    set: (c, v) => (c.hue.harmonyOffsets[1] = v),
  },
  {
    name: "hue.harmonyOffsets[2]",
    min: 150,
    max: 180,
    get: (c) => c.hue.harmonyOffsets[2],
    set: (c, v) => (c.hue.harmonyOffsets[2] = v),
  },
];
