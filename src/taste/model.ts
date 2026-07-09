import {
  clamp01,
  DIMENSION_KEYS,
  neutralVector,
  type DimensionKey,
  type TasteVector,
} from "./dimensions";

export type SwipeDirection = "like" | "pass" | "superlike";

export interface SwipeEvent {
  cardId: string;
  cardKind: "inspiration" | "variant";
  direction: SwipeDirection;
  attrs: TasteVector;
  hue: number;
  at: number;
}

export interface TasteState {
  taste: TasteVector;
  swipes: SwipeEvent[];
  // per-dimension running list of liked attribute values, used for confidence
  likedValues: Record<DimensionKey, number[]>;
  // hues of liked cards, averaged (circularly) to seed the palette
  likedHues: number[];
}

export function initialState(): TasteState {
  const likedValues = {} as Record<DimensionKey, number[]>;
  for (const k of DIMENSION_KEYS) likedValues[k] = [];
  return { taste: neutralVector(), swipes: [], likedValues, likedHues: [] };
}

// Circular mean of liked hues (degrees). Falls back to a calm blue before any
// likes exist so the first render still looks deliberate.
export function likedHue(state: TasteState): number {
  if (state.likedHues.length === 0) return 255;
  let x = 0;
  let y = 0;
  for (const h of state.likedHues) {
    const r = (h * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  const mean = (Math.atan2(y, x) * 180) / Math.PI;
  return (mean + 360) % 360;
}

// Learning rate decays from 0.30 to 0.10 over the first 30 swipes.
export function learningRate(swipeIndex: number): number {
  const start = 0.3;
  const end = 0.1;
  const t = Math.min(1, swipeIndex / 30);
  return start + (end - start) * t;
}

// How neutral (near 0.5) a card is on each dimension. Cards that are neutral on
// a dimension shouldn't push the taste much on a pass — you didn't really reject
// that dimension. Weight peaks at the extremes.
function dimensionWeight(attrValue: number): number {
  return Math.abs(attrValue - 0.5) * 2; // 0 at neutral, 1 at extremes
}

export function applySwipe(state: TasteState, event: SwipeEvent): TasteState {
  const swipeIndex = state.swipes.length;
  let eta = learningRate(swipeIndex);
  if (event.direction === "superlike") eta *= 2;

  const next = { ...state.taste } as TasteVector;
  const likedValues = { ...state.likedValues };

  for (const k of DIMENSION_KEYS) {
    const a = event.attrs[k];
    const delta = a - state.taste[k];
    if (event.direction === "pass") {
      // Move away from the card, weighted by how strongly the card expresses
      // this dimension. A card that is neutral here teaches nothing on a pass.
      const w = dimensionWeight(a);
      next[k] = clamp01(state.taste[k] - eta * w * delta);
    } else {
      next[k] = clamp01(state.taste[k] + eta * delta);
    }
  }

  let likedHues = state.likedHues;
  if (event.direction !== "pass") {
    for (const k of DIMENSION_KEYS) {
      likedValues[k] = [...likedValues[k], event.attrs[k]];
    }
    likedHues = [...state.likedHues, event.hue];
  }

  return {
    taste: next,
    swipes: [...state.swipes, event],
    likedValues,
    likedHues,
  };
}

// Rebuild taste from the audit trail. Undo uses this rather than trying to
// reverse the learning formula, keeping liked-value confidence and hue history
// exactly consistent with the remaining swipes.
export function replaySwipes(events: SwipeEvent[]): TasteState {
  return events.reduce(applySwipe, initialState());
}

function variance(values: number[]): number {
  if (values.length < 2) return 1; // unknown => treat as max spread
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

// Confidence per dimension: low variance of liked values => high confidence.
// Variance of a uniform [0,1] var is ~0.083; we scale against that ceiling.
export function confidence(state: TasteState): TasteVector {
  const out = {} as TasteVector;
  for (const k of DIMENSION_KEYS) {
    const vals = state.likedValues[k];
    if (vals.length < 2) {
      out[k] = 0;
      continue;
    }
    const v = variance(vals);
    const norm = clamp01(1 - v / 0.083);
    // ramp in confidence with sample count so 2 samples never reads as "locked"
    const sampleFactor = clamp01(vals.length / 6);
    out[k] = clamp01(norm * sampleFactor);
  }
  return out;
}

export function overallConfidence(state: TasteState): number {
  const c = confidence(state);
  const vals = DIMENSION_KEYS.map((k) => c[k]);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}
