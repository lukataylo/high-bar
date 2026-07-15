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

1. **The Deck** — full-screen swipe cards, mixing hand-authored inspiration
   with cards scraped from real sites (see below). Right = like, left = pass, up =
   superlike (2× learning weight), tap = flip to see which of the 14 design
   dimensions the card is teaching. After ~10 swipes, live-rendered **variant
   cards** (bred from your taste + exploration noise) start to dominate.
2. **The Model** — a taste vector `t` over 14 dimensions (density, radius,
   saturation, contrast, mode, type class/weight, spacing, ornament, gradients,
   depth, motion, playfulness, texture). Simple online update rule with a decaying
   learning rate and a per-dimension "taste locked" confidence meter.
3. **The Mirror** — a generic SaaS dashboard styled entirely by CSS variables
   mapped from `t` via the pure function [`tokensFromTaste`](src/taste/tokens.ts).
   Every swipe re-derives the palette (OKLCH), type pairing, radius, spacing,
   depth and motion with a smooth transition. Paste a real URL into the preview's
   address bar and the same tokens restyle *that* live site instead (see below).
4. **The Taste File** — one tap opens an export modal with three targets, all
   derived from the same taste vector (`src/taste/tasteFile.ts`): a Cursor
   rules file (`.cursor/rules/taste.mdc`), a **Claude Skill**
   (`.claude/skills/taste-<name>/SKILL.md` with proper `name`/`description`
   frontmatter Claude Code loads automatically), and a generic **Codex /
   ChatGPT** prompt (`AGENTS.md` — drop in a repo root or paste straight into
   a chat as a system-style prompt). Copy or download whichever fits.
5. **Clients** — the topbar chip switches between saved client profiles, each
   with its own taste model and swipe history, persisted to `localStorage`. Built
   for the actual freelance/agency workflow: one taste session per real client,
   not one demo session per visitor.

Every layout is responsive: a single-column swipe deck on mobile, and a
two-pane desktop layout (deck + actions on the left, live preview pinned on
the right) above ~900px wide. Desktop also gets arrow-key swiping
(←/→/↑ for pass/like/superlike), Cmd/Ctrl+Z to undo, and a persistent Undo
button in the deck header — mobile's shake-to-undo still works too, but
undo was previously unreachable without a touchscreen and accelerometer.

The entire swipe loop is pure math — **zero network latency, no API key, no LLM
call** to run the core demo, and the generator itself never calls out to a model
at runtime either. Its only inputs are the taste vector and a small, versioned
config (see "Training bench" below).

## Training bench

`tokensFromTaste`'s constants aren't hand-guessed — they're the output of an
offline, non-LLM training loop against real, scraped design sites:

- **`pnpm scrape`** — `bench/scrape/` fetches a curated list of real sites
  (Stripe, Linear, Vercel, Awwwards, onepagelove.com, …), extracts CSS design
  signals (colors, radii, type, shadows, gradients, spacing) via a small
  from-scratch CSS parser, and normalizes them into the same 0–1 taste-vector
  space the app uses. The result is committed as `src/corpus/scraped.ts` and
  folded into the swipe deck — real designs, not synthetic ones.
- **`pnpm scrape:holdout`** — scrapes a *different*, non-overlapping set of
  sites into `bench/data/holdout.json`. This file is never imported into
  `src/`, so it's a genuinely hidden eval set: the generator can't have been
  tuned to it.
- **`pnpm bench:eval`** — scores the shipped `generatorConfig.json` against
  the hidden holdout set on four measurable axes (real WCAG contrast, sRGB
  gamut validity, chroma fidelity after gamut clamping, accent/primary hue
  separation) and fails if consistency regresses below a threshold. Wired
  into CI (`.github/workflows/ci.yml` and `deploy.yml`) and mirrored as a
  vitest test (`src/taste/consistency.test.ts`).
- **`pnpm bench:optimize`** — a simulated-annealing-flavored coordinate search
  over `src/taste/generatorConfig.ts`'s tunable parameters (chroma curve,
  contrast floor, lightness bands, hue-harmony offsets), scored against the
  same hidden set, that only ever writes back an improvement. Re-run it after
  changing the scraped corpus or the scoring rubric to re-tune the generator.

Current shipped consistency: **~99.9/100 mean** across the 10-site hidden holdout.

## Restyle any site

The live-preview address bar isn't cosmetic — paste a real URL and the app
fetches its HTML client-side through a public CORS-proxy fallback chain
(`src/lib/sitePreviewFetch.ts`), strips anything executable, and renders it in
a fully sandboxed iframe with your current taste tokens injected as a
high-specificity CSS overlay (`src/lib/styleInjection.ts`) — the same
"userstyle" approach tools like Stylus or Dark Reader use. Swiping keeps
re-injecting live, no re-fetch needed. If every proxy is unavailable, it falls
back to a direct (unstyled) embed rather than a blank frame. This is a
best-effort feature by nature — it depends on third-party proxy services and
on a given site allowing itself to be embedded.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:5173/high-bar/
```

Other scripts:

```bash
pnpm test           # vitest — model + tokensFromTaste + hidden-eval gate + preview-sanitizer tests
pnpm lint           # eslint
pnpm typecheck      # tsc
pnpm build          # production build to dist/
pnpm scrape         # re-scrape the shipped inspiration corpus from real sites
pnpm scrape:holdout # re-scrape the hidden eval set (never imported into src/)
pnpm bench:eval     # score the shipped generator against the hidden eval set
pnpm bench:optimize # search generatorConfig for a better-scoring config
```

## Deploy (GitHub Pages)

`/.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push
to `main`. Enable it once under **Settings → Pages → Build and deployment →
Source: GitHub Actions**. The site publishes to
`https://<owner>.github.io/<repo>/`. The Vite `base` is read from the `VITE_BASE`
env var in CI (defaults to `/high-bar/` locally).

## Stack

Vite + React 18 + TypeScript, framer-motion for the swipe gestures, and pure-TS
taste math. The shipped app has no backend and makes no LLM calls; `bench/` is
dev-only Node tooling (via `tsx`) that runs offline and commits its output as
plain static data/config.
