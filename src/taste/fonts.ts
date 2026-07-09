import type { TasteVector } from "./dimensions";

export interface FontPairing {
  name: string;
  // class bucket midpoint on the grotesque(0) -> serif/display(1) axis
  classCenter: number;
  playful: number; // 0 serious -> 1 playful, used to break ties
  display: string; // headline font-family stack
  body: string; // body font-family stack
}

// Pre-loaded pairings (see index.html Google Fonts link). Kept small and curated
// so typography always reads as intentional even if the colour math wobbles.
export const FONT_PAIRINGS: FontPairing[] = [
  {
    name: "Inter / Inter",
    classCenter: 0.1,
    playful: 0.3,
    display: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  {
    name: "Space Grotesk / Inter",
    classCenter: 0.25,
    playful: 0.55,
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  {
    name: "Bricolage Grotesque / DM Sans",
    classCenter: 0.35,
    playful: 0.7,
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  {
    name: "Archivo Black / Sora",
    classCenter: 0.5,
    playful: 0.45,
    display: "'Archivo Black', system-ui, sans-serif",
    body: "'Sora', system-ui, sans-serif",
  },
  {
    name: "IBM Plex Mono / IBM Plex Mono",
    classCenter: 0.6,
    playful: 0.25,
    display: "'IBM Plex Mono', ui-monospace, monospace",
    body: "'IBM Plex Mono', ui-monospace, monospace",
  },
  {
    name: "Fraunces / Lora",
    classCenter: 0.85,
    playful: 0.4,
    display: "'Fraunces', Georgia, serif",
    body: "'Lora', Georgia, serif",
  },
  {
    name: "Playfair Display / Lora",
    classCenter: 0.95,
    playful: 0.35,
    display: "'Playfair Display', Georgia, serif",
    body: "'Lora', Georgia, serif",
  },
];

export function pickFontPairing(t: TasteVector): FontPairing {
  let best = FONT_PAIRINGS[0];
  let bestScore = Infinity;
  for (const p of FONT_PAIRINGS) {
    const classDist = Math.abs(p.classCenter - t.type_class);
    const playDist = Math.abs(p.playful - t.playfulness) * 0.4;
    const score = classDist + playDist;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

// Map type_weight (0..1) to a real font weight, snapped to loaded weights.
export function pickFontWeight(t: TasteVector): { display: number; body: number } {
  const displayRaw = 300 + t.type_weight * 600; // 300..900
  const bodyRaw = 300 + t.type_weight * 300; // 300..600
  const snap = (w: number) => Math.max(300, Math.min(900, Math.round(w / 100) * 100));
  return { display: snap(displayRaw), body: snap(bodyRaw) };
}
