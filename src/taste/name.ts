import type { TasteVector } from "./dimensions";

// Deterministic style-name generator. No API needed in the hot path — the name
// is a pure read of the taste vector so it never adds latency or a failure mode.
// (An LLM call could replace this, but the demo must never wait on the network.)

function hueWord(hue: number): string {
  const buckets: [number, string][] = [
    [15, "Ember"],
    [45, "Amber"],
    [70, "Citrus"],
    [110, "Moss"],
    [160, "Jade"],
    [200, "Lagoon"],
    [240, "Cobalt"],
    [280, "Ultraviolet"],
    [320, "Orchid"],
    [350, "Rosewood"],
  ];
  for (const [max, word] of buckets) if (hue <= max) return word;
  return "Ember";
}

export function styleName(t: TasteVector, hue: number): string {
  const adjectives: string[] = [];

  if (t.type_class > 0.7) adjectives.push(t.mode > 0.5 ? "Editorial" : "Literary");
  else if (t.ornament < 0.25 && t.radius < 0.3 && t.contrast > 0.6) adjectives.push("Brutalist");
  else if (t.saturation < 0.3 && t.spacing_rhythm > 0.6) adjectives.push("Quiet");
  else if (t.playfulness > 0.7) adjectives.push("Playful");
  else if (t.density < 0.3) adjectives.push("Airy");
  else adjectives.push("Modern");

  let noun: string;
  if (t.type_class > 0.6 && t.saturation < 0.35) noun = "Luxury";
  else if (t.gradients > 0.6) noun = "Aurora";
  else if (t.type_class > 0.5 && t.mode > 0.6) noun = "Terminal";
  else if (t.texture > 0.6) noun = "Riso";
  else if (t.depth > 0.6) noun = "Studio";
  else noun = hueWord(hue);

  // Avoid "Citrus Citrus"-style repeats
  const color = hueWord(hue);
  if (noun === color) {
    return `${adjectives[0]} ${color}`;
  }
  return `${adjectives[0]} ${color} ${noun}`.replace(/\s+/g, " ").trim();
}
