import { describe, expect, it } from "vitest";
import { contrastRatio, enforceContrast, inSrgbGamut, maxChromaInGamut } from "./color";
import { DIMENSION_KEYS, neutralVector } from "./dimensions";
import { applySwipe, confidence, initialState, learningRate, likedHue, replaySwipes } from "./model";
import { paletteFromTaste } from "./palette";
import { tokensFromTaste } from "./tokens";
import { generateTasteFile } from "./tasteFile";
import { styleName } from "./name";

describe("model", () => {
  it("moves taste toward a liked card", () => {
    let s = initialState();
    const attrs = { ...neutralVector(), radius: 1, saturation: 1 };
    s = applySwipe(s, { cardId: "a", cardKind: "inspiration", direction: "like", attrs, hue: 40, at: 0 });
    expect(s.taste.radius).toBeGreaterThan(0.5);
    expect(s.taste.saturation).toBeGreaterThan(0.5);
    expect(s.taste.density).toBeCloseTo(0.5, 5); // neutral dim unchanged
  });

  it("moves taste away from a passed card, weighted by expression", () => {
    let s = initialState();
    const attrs = { ...neutralVector(), radius: 1, density: 0.5 };
    s = applySwipe(s, { cardId: "b", cardKind: "inspiration", direction: "pass", attrs, hue: 0, at: 0 });
    expect(s.taste.radius).toBeLessThan(0.5); // strongly expressed -> pushed
    expect(s.taste.density).toBeCloseTo(0.5, 5); // neutral -> untouched on pass
  });

  it("superlike learns roughly twice as fast as a like", () => {
    const attrs = { ...neutralVector(), radius: 1 };
    let like = initialState();
    like = applySwipe(like, { cardId: "l", cardKind: "inspiration", direction: "like", attrs, hue: 0, at: 0 });
    let sup = initialState();
    sup = applySwipe(sup, { cardId: "s", cardKind: "inspiration", direction: "superlike", attrs, hue: 0, at: 0 });
    const likeDelta = like.taste.radius - 0.5;
    const supDelta = sup.taste.radius - 0.5;
    expect(supDelta).toBeCloseTo(likeDelta * 2, 5);
  });

  it("decays the learning rate from 0.30 to 0.10 over 30 swipes", () => {
    expect(learningRate(0)).toBeCloseTo(0.3, 5);
    expect(learningRate(30)).toBeCloseTo(0.1, 5);
    expect(learningRate(15)).toBeCloseTo(0.2, 5);
  });

  it("confidence rises as liked values cluster", () => {
    let s = initialState();
    const attrs = { ...neutralVector(), radius: 0.9 };
    for (let i = 0; i < 8; i++) {
      s = applySwipe(s, { cardId: `c${i}`, cardKind: "inspiration", direction: "like", attrs, hue: 40, at: i });
    }
    const c = confidence(s);
    expect(c.radius).toBeGreaterThan(0.8);
  });

  it("computes a circular mean hue of liked cards", () => {
    let s = initialState();
    const attrs = neutralVector();
    s = applySwipe(s, { cardId: "h1", cardKind: "inspiration", direction: "like", attrs, hue: 350, at: 0 });
    s = applySwipe(s, { cardId: "h2", cardKind: "inspiration", direction: "like", attrs, hue: 10, at: 1 });
    const h = likedHue(s);
    // circular mean of 350 and 10 is 0/360, not 180
    expect(Math.min(h, 360 - h)).toBeLessThan(2);
  });

  it("replays the swipe trail exactly after an undo", () => {
    const attrs = { ...neutralVector(), radius: 0.9, mode: 0.8 };
    const first = { cardId: "r1", cardKind: "inspiration" as const, direction: "like" as const, attrs, hue: 280, at: 1 };
    const second = { cardId: "r2", cardKind: "variant" as const, direction: "pass" as const, attrs, hue: 40, at: 2 };
    const afterFirst = applySwipe(initialState(), first);
    const afterBoth = replaySwipes([first, second]);
    const afterUndo = replaySwipes(afterBoth.swipes.slice(0, -1));

    expect(afterUndo).toEqual(afterFirst);
  });
});

describe("tokensFromTaste", () => {
  it("maps radius extremes to the expected pixel range", () => {
    const sharp = tokensFromTaste({ ...neutralVector(), radius: 0 }, 250);
    const round = tokensFromTaste({ ...neutralVector(), radius: 1 }, 250);
    expect(sharp.radiusPx).toBe(0);
    expect(round.radiusPx).toBe(24);
  });

  it("dark mode yields a darker background than light mode", () => {
    const light = tokensFromTaste({ ...neutralVector(), mode: 0 }, 250);
    const dark = tokensFromTaste({ ...neutralVector(), mode: 1 }, 250);
    const lightL = readL(light.palette.bg);
    const darkL = readL(dark.palette.bg);
    expect(darkL).toBeLessThan(lightL);
  });

  it("enables gradients and grain only past their thresholds", () => {
    expect(tokensFromTaste({ ...neutralVector(), gradients: 0.9 }, 250).gradient).toBe(true);
    expect(tokensFromTaste({ ...neutralVector(), gradients: 0.1 }, 250).gradient).toBe(false);
    expect(tokensFromTaste({ ...neutralVector(), texture: 0.9 }, 250).grain).toBe(true);
  });

  it("emits all required CSS variables", () => {
    const tokens = tokensFromTaste(neutralVector(), 250);
    for (const key of ["--bg", "--text", "--primary", "--radius", "--space-unit", "--font-display"]) {
      expect(tokens.cssVars[key]).toBeTruthy();
    }
  });

  it("is a pure function of its inputs", () => {
    const a = tokensFromTaste({ ...neutralVector(), saturation: 0.8 }, 120);
    const b = tokensFromTaste({ ...neutralVector(), saturation: 0.8 }, 120);
    expect(a.cssVars).toEqual(b.cssVars);
  });
});

describe("taste file", () => {
  it("produces a Cursor rules file with tokens and prose", () => {
    const t = { ...neutralVector(), radius: 0.05, gradients: 0.0, mode: 0.9 };
    const tokens = tokensFromTaste(t, 150);
    const file = generateTasteFile("cursor", t, tokens, 150, 30);
    expect(file.fileName).toBe(".cursor/rules/taste.mdc");
    expect(file.content).toContain("alwaysApply: true");
    expect(file.content).toContain("Never use gradients");
    expect(file.content).toContain("Default to a dark UI");
    expect(file.content).toContain('"dimensions"');
    expect(file.content).toContain("30 swipes");
  });

  it("produces a Claude Skill with name/description frontmatter", () => {
    const t = { ...neutralVector(), radius: 0.05, gradients: 0.0, mode: 0.9 };
    const tokens = tokensFromTaste(t, 150);
    const file = generateTasteFile("claude-skill", t, tokens, 150, 30);
    expect(file.fileName).toMatch(/^\.claude\/skills\/taste-.+\/SKILL\.md$/);
    expect(file.content).toMatch(/^---\nname: taste-/);
    expect(file.content).toContain("description:");
    expect(file.content).toContain("Never use gradients");
    expect(file.content).toContain('"dimensions"');
  });

  it("produces an AGENTS.md-style prompt with no tool-specific frontmatter", () => {
    const t = { ...neutralVector(), radius: 0.05, gradients: 0.0, mode: 0.9 };
    const tokens = tokensFromTaste(t, 150);
    const file = generateTasteFile("agents-prompt", t, tokens, 150, 30);
    expect(file.fileName).toBe("AGENTS.md");
    expect(file.content).not.toMatch(/^---/);
    expect(file.content).toContain("Never use gradients");
    expect(file.content).toContain('"dimensions"');
  });

  it("keeps the same style name across every export target", () => {
    const t = { ...neutralVector(), type_class: 0.9, saturation: 0.15 };
    const tokens = tokensFromTaste(t, 40);
    const name = styleName(t, 40);
    for (const target of ["cursor", "claude-skill", "agents-prompt"] as const) {
      const file = generateTasteFile(target, t, tokens, 40, 12);
      expect(file.content).toContain(name);
    }
  });

  it("names styles distinctly across taste vectors", () => {
    const brut = styleName({ ...neutralVector(), ornament: 0.1, radius: 0.1, contrast: 0.8 }, 20);
    const lux = styleName({ ...neutralVector(), type_class: 0.9, saturation: 0.2 }, 40);
    expect(brut).not.toEqual(lux);
    expect(brut.length).toBeGreaterThan(3);
  });
});

describe("color", () => {
  it("keeps in-gamut colors reported as in-gamut", () => {
    expect(inSrgbGamut(0.9, 0.0, 0)).toBe(true);
    expect(inSrgbGamut(0.5, 0.5, 0)).toBe(false); // way past sRGB at mid lightness
  });

  it("finds a chroma ceiling that is actually renderable", () => {
    const c = maxChromaInGamut(0.5, 30);
    expect(inSrgbGamut(0.5, c, 30)).toBe(true);
    expect(inSrgbGamut(0.5, c + 0.05, 30)).toBe(false);
  });

  it("enforces a real WCAG contrast ratio, not just a lightness gap", () => {
    const bg = { l: 0.95, c: 0.02, h: 250 };
    const pushedL = enforceContrast(bg, 0.9, 0.02, 250, 4.5); // text starts *lighter* than bg — wrong direction
    const ratio = contrastRatio(bg, { l: pushedL, c: 0.02, h: 250 });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe("paletteFromTaste", () => {
  it("always clears AA contrast between text and background", () => {
    const cases: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [0.5, 0.5],
      [0, 1],
      [1, 0],
    ];
    for (const [mode, contrast] of cases) {
      for (const hue of [0, 90, 180, 270]) {
        const p = paletteFromTaste({ ...neutralVector(), mode, contrast }, hue);
        const bgL = readL(p.bg);
        const textL = readL(p.text);
        const ratio = contrastRatio({ l: bgL, c: 0.02, h: hue }, { l: textL, c: 0.02, h: hue });
        expect(ratio).toBeGreaterThanOrEqual(4.4); // small slack for the two swatches' differing chroma
      }
    }
  });
});

// crude OKLCH lightness reader for assertions
function readL(oklchStr: string): number {
  const m = oklchStr.match(/oklch\(([0-9.]+)/);
  return m ? parseFloat(m[1]) : NaN;
}

// keep DIMENSION_KEYS referenced so unused-import lint stays quiet if edited
void DIMENSION_KEYS;
