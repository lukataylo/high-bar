import { generatorConfig } from "../../src/taste/generatorConfig";
import { loadHoldout } from "./holdoutData";
import { scoreHoldout } from "./score";

// The CI/local gate: score the *currently shipped* generatorConfig.json
// against the hidden holdout set and fail the build if consistency,
// cohesion, or cross-example differentiation regresses below the bar the
// training bench already cleared.
const MEAN_THRESHOLD = 90;
const MIN_THRESHOLD = 75;
const DIFFERENTIATION_THRESHOLD = 80; // % of holdout pairs that must render visually distinct

function main() {
  const holdout = loadHoldout();
  const result = scoreHoldout(holdout, generatorConfig);

  process.stderr.write(`hidden-eval consistency: mean ${result.mean.toFixed(2)}/100, min ${result.min.toFixed(2)}/100\n`);
  for (const s of result.scores) {
    process.stderr.write(
      `  ${s.id.padEnd(32)} ${s.total.toFixed(1).padStart(5)}  (contrast ${s.contrast.toFixed(1)}, gamut ${s.gamut.toFixed(1)}, chroma ${s.chromaFidelity.toFixed(1)}, hue ${s.hueSeparation.toFixed(1)}, typeGrid ${s.typeGrid.toFixed(1)})\n`,
    );
  }
  process.stderr.write(`differentiation across the holdout set: ${result.differentiation.toFixed(1)}%\n`);

  const failures: string[] = [];
  if (result.mean < MEAN_THRESHOLD) failures.push(`mean ${result.mean.toFixed(2)} < ${MEAN_THRESHOLD}`);
  if (result.min < MIN_THRESHOLD) failures.push(`min ${result.min.toFixed(2)} < ${MIN_THRESHOLD}`);
  if (result.differentiation < DIFFERENTIATION_THRESHOLD) {
    failures.push(`differentiation ${result.differentiation.toFixed(1)}% < ${DIFFERENTIATION_THRESHOLD}%`);
  }

  if (failures.length) {
    process.stderr.write(`\nFAIL: ${failures.join("; ")}\n`);
    process.exit(1);
  }
  process.stderr.write(
    `\nPASS: consistency gate cleared (mean >= ${MEAN_THRESHOLD}, min >= ${MIN_THRESHOLD}, differentiation >= ${DIFFERENTIATION_THRESHOLD}%)\n`,
  );
}

main();
