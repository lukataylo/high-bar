// The 14 design dimensions the taste model learns over. Each value is 0..1.
// The order here is authoritative: it defines the vector layout used everywhere
// (model updates, radar chart, token mapping, taste file export).

export const DIMENSIONS = [
  { key: "density", label: "Density", low: "airy", high: "dense" },
  { key: "radius", label: "Radius", low: "sharp", high: "rounded" },
  { key: "saturation", label: "Saturation", low: "muted", high: "vivid" },
  { key: "contrast", label: "Contrast", low: "soft", high: "stark" },
  { key: "mode", label: "Mode", low: "light", high: "dark" },
  { key: "type_class", label: "Type class", low: "grotesque", high: "serif/display" },
  { key: "type_weight", label: "Type weight", low: "light", high: "heavy" },
  { key: "spacing_rhythm", label: "Spacing", low: "tight", high: "generous" },
  { key: "ornament", label: "Ornament", low: "flat", high: "decorated" },
  { key: "gradients", label: "Gradients", low: "none", high: "heavy" },
  { key: "depth", label: "Depth", low: "flat", high: "layered" },
  { key: "motion", label: "Motion", low: "static", high: "animated" },
  { key: "playfulness", label: "Playfulness", low: "serious", high: "playful" },
  { key: "texture", label: "Texture", low: "clean", high: "grainy" },
] as const;

export type Dimension = (typeof DIMENSIONS)[number];
export type DimensionKey = Dimension["key"];

export const DIMENSION_KEYS: DimensionKey[] = DIMENSIONS.map((d) => d.key);

export type TasteVector = Record<DimensionKey, number>;

export function neutralVector(): TasteVector {
  const v = {} as TasteVector;
  for (const k of DIMENSION_KEYS) v[k] = 0.5;
  return v;
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
