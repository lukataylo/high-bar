// Generic confidence-scaled hysteresis for discrete (non-continuous) picks
// like font pairing or accent-hue bucket. Nearest-match selection alone is
// fine for a single snapshot, but re-run every render against a taste vector
// that's still wobbling, it can visibly flip back to a previously-rejected
// option the moment the vector crosses back over a decision boundary — that
// reads as "reverting," not "learning."
//
// The fix isn't to stop re-evaluating; it's to require a growing margin of
// improvement before abandoning the current pick. Low confidence -> tiny
// margin -> switches freely (exploration should look responsive). High
// confidence -> large margin -> the pick is effectively locked, so noise
// near a boundary converges and stays converged.
export interface StickyMarginConfig {
  baseMargin: number;
  confidenceGain: number;
}

// Scores are "lower is better" (a distance/error), matching how every
// nearest-match picker in this codebase already scores candidates.
export function stickyBetter(
  currentScore: number,
  candidateScore: number,
  overallConfidence: number,
  marginCfg: StickyMarginConfig,
): boolean {
  const margin = marginCfg.baseMargin + overallConfidence * marginCfg.confidenceGain;
  return currentScore - candidateScore > margin;
}
