import { clamp01, DIMENSION_KEYS, type TasteVector } from "./dimensions";
import { likedHue, overallConfidence, type TasteState } from "./model";

export interface VariantCard {
  id: string;
  kind: "variant";
  name: string;
  tagline: string;
  attrs: TasteVector;
  hue: number;
  offTaste: boolean;
}

// Box-Muller normal sample.
function gaussian(mean: number, sd: number): number {
  const u = Math.random() || 1e-9;
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * sd;
}

const SIGMA_MAX = 0.25;
const SIGMA_FLOOR = 0.05; // never fully freezes — some noise always survives
const SIGMA_EXPONENT = 1.6; // > 1 biases the curve to narrow harder in the back half of the session

// Sample a variant near the current taste. σ starts wide (0.25) and shrinks
// as confidence rises, so exploration narrows into exploitation over the
// session. Every Nth variant is deliberately off-taste to keep the contrast
// visceral — but in Narrow mode both effects strengthen with confidence:
// the curve shrinks steeply instead of gently, and the off-taste probe
// spaces out (then stops entirely once truly converged) instead of
// continuing to yank the deck back toward already-rejected territory
// forever. Keep-exploring mode reproduces the original constant-width,
// constant-rate behavior.
export function sampleVariant(state: TasteState, index: number, narrow: boolean): VariantCard {
  const conf = overallConfidence(state);
  const sigma = narrow
    ? Math.max(SIGMA_FLOOR, SIGMA_MAX * Math.pow(1 - conf, SIGMA_EXPONENT))
    : 0.25 * (1 - 0.6 * conf); // legacy curve: 0.25 -> ~0.10

  const probeInterval = narrow ? Math.round(8 + conf * 20) : 8; // 8 -> 28 as confidence rises
  const probesActive = !narrow || conf < 0.92; // stop reverting once truly locked in
  const offTaste = probesActive && index > 0 && index % probeInterval === 0;

  const attrs = {} as TasteVector;
  for (const k of DIMENSION_KEYS) {
    if (offTaste) {
      // push several dimensions toward the opposite pole
      attrs[k] = clamp01(gaussian(1 - state.taste[k], 0.12));
    } else {
      attrs[k] = clamp01(gaussian(state.taste[k], sigma));
    }
  }

  const baseHue = likedHue(state);
  const hue = offTaste ? (baseHue + 180) % 360 : (baseHue + gaussian(0, 18) + 360) % 360;

  return {
    id: `variant-${index}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "variant",
    name: offTaste ? "Off-taste probe" : "Bred for you",
    tagline: offTaste ? "Reject me to sharpen the model." : "Sampled near your taste.",
    attrs,
    hue,
    offTaste,
  };
}
