# Taste Engine

Swipe on design inspiration Tinder-style. A taste model learns your visual
preferences in real time, **your own app restyles itself live as you swipe**, and
the result compiles into a Cursor rules file so every future agent build ships in
your taste.

> You never describe what you want. You react ~30 times, and your taste compiles.

## The idea

Every vibe-coded app looks like the same grey shadcn template. Taste Engine fixes
"slop shame" with **programming by selection**: react to design, don't describe it.
The output is a **taste file** — a personal style fingerprint a coding agent
cannot invent because it is derived from your gestures.

## How it works

1. **The Deck** — full-screen swipe cards. Right = like, left = pass, up =
   superlike (2× learning weight), long-press = flip to see which of the 14 design
   dimensions the card is teaching. After ~10 swipes, live-rendered **variant
   cards** (bred from your taste + exploration noise) start to dominate.
2. **The Model** — a taste vector `t` over 14 dimensions (density, radius,
   saturation, contrast, mode, type class/weight, spacing, ornament, gradients,
   depth, motion, playfulness, texture). Simple online update rule with a decaying
   learning rate and a per-dimension "taste locked" confidence meter.
3. **The Mirror** — a generic SaaS dashboard styled entirely by CSS variables
   mapped from `t` via the pure function [`tokensFromTaste`](src/taste/tokens.ts).
   Every swipe re-derives the palette (OKLCH), type pairing, radius, spacing,
   depth and motion with a smooth transition.
4. **The Taste File** — one tap generates `.cursor/rules/taste.mdc`: the token
   values as JSON plus a prose style guide. Copy or download it.

The entire swipe loop is pure math — **zero network latency, no API key required**
to run the core demo. The inspiration corpus is rendered from attribute vectors,
so the app is fully static and self-contained.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:5173/high-bar/
```

Other scripts:

```bash
pnpm test       # vitest — model + tokensFromTaste unit tests
pnpm lint       # eslint
pnpm typecheck  # tsc
pnpm build      # production build to dist/
```

## Deploy (GitHub Pages)

`/.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push
to `main`. Enable it once under **Settings → Pages → Build and deployment →
Source: GitHub Actions**. The site publishes to
`https://<owner>.github.io/<repo>/`. The Vite `base` is read from the `VITE_BASE`
env var in CI (defaults to `/high-bar/` locally).

## Stack

Vite + React 18 + TypeScript, framer-motion for the swipe gestures, and pure-TS
taste math. No backend.
