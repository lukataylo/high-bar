import { describe, expect, it } from "vitest";
import { DIMENSION_KEYS, neutralVector } from "./dimensions";
import { applySwipe, confidence, initialState, learningRate, likedHue } from "./model";
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
    const file = generateTasteFile(t, tokens, 150, 30);
    expect(file.fileName).toBe(".cursor/rules/taste.mdc");
    expect(file.content).toContain("alwaysApply: true");
    expect(file.content).toContain("Never use gradients");
    expect(file.content).toContain("Default to a dark UI");
    expect(file.content).toContain('"dimensions"');
    expect(file.content).toContain("30 swipes");
  });

  it("names styles distinctly across taste vectors", () => {
    const brut = styleName({ ...neutralVector(), ornament: 0.1, radius: 0.1, contrast: 0.8 }, 20);
    const lux = styleName({ ...neutralVector(), type_class: 0.9, saturation: 0.2 }, 40);
    expect(brut).not.toEqual(lux);
    expect(brut.length).toBeGreaterThan(3);
  });
});

// crude OKLCH lightness reader for assertions
function readL(oklchStr: string): number {
  const m = oklchStr.match(/oklch\(([0-9.]+)/);
  return m ? parseFloat(m[1]) : NaN;
}

// keep DIMENSION_KEYS referenced so unused-import lint stays quiet if edited
void DIMENSION_KEYS;
