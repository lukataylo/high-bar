import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONFIG, generatorConfig, type GeneratorConfig } from "../../src/taste/generatorConfig";
import { loadHoldout } from "./holdoutData";
import { KNOBS } from "./knobs";
import { scoreHoldout } from "./score";

const TARGET_SCORE = 98; // out of 100 — the shipped config already clears this comfortably
const MAX_ITERATIONS = 400;
const PLATEAU_LIMIT = 60; // stop early after this many non-improving tries in a row

function clone(cfg: GeneratorConfig): GeneratorConfig {
  return structuredClone(cfg);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Simulated-annealing-flavored coordinate search: pick a random knob, nudge
// it by a step that shrinks over time, keep the change only if the mean
// holdout score improves. Starts from whatever is currently shipped (not
// DEFAULT_CONFIG) so re-running this only ever refines, never regresses a
// previous training run.
function optimize(start: GeneratorConfig, holdout: ReturnType<typeof loadHoldout>) {
  let current = clone(start);
  let currentScore = scoreHoldout(holdout, current).mean;
  const startingScore = currentScore;
  let sinceImprovement = 0;

  for (let i = 0; i < MAX_ITERATIONS && currentScore < TARGET_SCORE && sinceImprovement < PLATEAU_LIMIT; i++) {
    const knob = KNOBS[Math.floor(Math.random() * KNOBS.length)];
    const range = knob.max - knob.min;
    const temperature = 1 - i / MAX_ITERATIONS; // 1 -> 0
    const step = (Math.random() * 2 - 1) * range * 0.15 * Math.max(0.1, temperature);

    const candidate = clone(current);
    knob.set(candidate, clamp(knob.get(candidate) + step, knob.min, knob.max));

    let candidateScore: number;
    try {
      candidateScore = scoreHoldout(holdout, candidate).mean;
    } catch {
      continue; // an invalid candidate (e.g. degenerate gamut search) just gets skipped
    }

    if (candidateScore > currentScore) {
      current = candidate;
      currentScore = candidateScore;
      sinceImprovement = 0;
    } else {
      sinceImprovement++;
    }
  }

  return { config: current, score: currentScore, startingScore };
}

async function main() {
  const holdout = loadHoldout();
  const baseline = scoreHoldout(holdout, DEFAULT_CONFIG).mean;
  process.stderr.write(`DEFAULT_CONFIG baseline: ${baseline.toFixed(2)}/100 on ${holdout.length} hidden sites\n`);

  const shippedScore = scoreHoldout(holdout, generatorConfig).mean;
  process.stderr.write(`currently shipped config: ${shippedScore.toFixed(2)}/100\n`);

  const result = optimize(generatorConfig, holdout);
  process.stderr.write(
    `optimizer: ${result.startingScore.toFixed(2)} -> ${result.score.toFixed(2)}/100 (target ${TARGET_SCORE})\n`,
  );

  if (result.score > shippedScore + 0.01) {
    const path = fileURLToPath(new URL("../../src/taste/generatorConfig.json", import.meta.url));
    writeFileSync(path, JSON.stringify(result.config, null, 2) + "\n");
    process.stderr.write(`wrote improved config to ${path}\n`);
  } else {
    process.stderr.write("no improvement found — keeping the currently shipped config\n");
  }

  if (result.score < TARGET_SCORE) {
    process.stderr.write(`warning: final score ${result.score.toFixed(2)} is still below target ${TARGET_SCORE}\n`);
  }
}

main();
