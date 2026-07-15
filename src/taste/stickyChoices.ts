import type { TasteVector } from "./dimensions";
import { pairingScore, pickFontPairing, type FontPairing } from "./fonts";
import type { GeneratorConfig } from "./generatorConfig";
import { accentOffsetIndex, accentOffsetIndexScore } from "./palette";
import { stickyBetter } from "./sticky";

export interface StickyChoices {
  pairing: FontPairing;
  accentOffsetIndex: number;
}

// Tuned so early-session switching still feels responsive (small margin at
// confidence 0) while a fully "locked" dimension (confidence 1) needs a
// clearly better match, not a marginal one, before the live preview commits
// to a different pairing or hue bucket.
const PAIRING_MARGIN = { baseMargin: 0.03, confidenceGain: 0.35 };
const HUE_MARGIN = { baseMargin: 0.04, confidenceGain: 0.3 };

// Resolves the discrete choices the live-evolving mirror commits to. Pure
// stateless callers (bench scoring, variant cards, the taste-file export)
// never call this — it exists specifically for the one continuously-updating
// preview, where "recompute nearest match every render" causes visible
// flip-flopping near a decision boundary.
//
// `narrow=false` reproduces the old always-fresh-nearest-match behavior
// exactly (the "Keep exploring" toggle state).
export function resolveStickyChoices(
  t: TasteVector,
  cfg: GeneratorConfig,
  previous: StickyChoices | null,
  overallConfidence: number,
  narrow: boolean,
): StickyChoices {
  const candidatePairing = pickFontPairing(t);
  const candidateOffsetIndex = accentOffsetIndex(t, cfg);

  if (!narrow || !previous) {
    return { pairing: candidatePairing, accentOffsetIndex: candidateOffsetIndex };
  }

  const pairingCandidateWins = stickyBetter(
    pairingScore(previous.pairing, t),
    pairingScore(candidatePairing, t),
    overallConfidence,
    PAIRING_MARGIN,
  );

  const offsetCandidateWins = stickyBetter(
    accentOffsetIndexScore(previous.accentOffsetIndex, t, cfg),
    accentOffsetIndexScore(candidateOffsetIndex, t, cfg),
    overallConfidence,
    HUE_MARGIN,
  );

  return {
    pairing: pairingCandidateWins ? candidatePairing : previous.pairing,
    accentOffsetIndex: offsetCandidateWins ? candidateOffsetIndex : previous.accentOffsetIndex,
  };
}
