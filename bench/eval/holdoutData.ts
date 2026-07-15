import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { HoldoutExample } from "./score";

// bench/data/holdout.json is produced by `pnpm scrape:holdout` from sites
// that are never imported into src/ — the generator is never tuned to know
// these examples exist, which is what makes this a *hidden* eval rather than
// a training-set replay.
export function loadHoldout(): HoldoutExample[] {
  const path = fileURLToPath(new URL("../data/holdout.json", import.meta.url));
  const raw = JSON.parse(readFileSync(path, "utf8")) as Array<{ id: string; attrs: HoldoutExample["attrs"]; hue: number }>;
  return raw.map((c) => ({ id: c.id, attrs: c.attrs, hue: c.hue }));
}
