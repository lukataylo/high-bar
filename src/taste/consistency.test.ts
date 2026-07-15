import { describe, expect, it } from "vitest";
import { loadHoldout } from "../../bench/eval/holdoutData";
import { scoreHoldout } from "../../bench/eval/score";

// The same hidden-eval gate `pnpm bench:eval` runs, folded into the regular
// test suite so a regression fails `pnpm test`/CI even if nobody remembers
// to run the bench script directly. Thresholds match bench/eval/gate.ts.
describe("hidden-eval consistency gate", () => {
  it("clears the trained consistency bar against real, never-trained-on sites", () => {
    const holdout = loadHoldout();
    const result = scoreHoldout(holdout);
    expect(result.mean).toBeGreaterThanOrEqual(90);
    expect(result.min).toBeGreaterThanOrEqual(75);
    expect(result.differentiation).toBeGreaterThanOrEqual(80);
  });
});
