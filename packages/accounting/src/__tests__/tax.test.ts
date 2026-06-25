import { describe, it, expect } from "vitest";
import {
  applyRate,
  computeSplit,
  estimateProcessorFee,
  extractInclusiveTax,
  formatMoney,
  type TaxConfig,
} from "../index";

const CONFIG: TaxConfig = {
  platformTakeRate: 0.2,
  vatRate: 0.2,
  incomeTaxRate: 0.19,
  vatInclusive: true,
};

describe("integer money math (no float drift)", () => {
  it("applyRate rounds half up", () => {
    // 12345 * 0.2 = 2469.0 -> 2469
    expect(applyRate(12_345, 0.2)).toBe(2_469);
    // 1 * 0.5 = 0.5 -> rounds half up to 1
    expect(applyRate(1, 0.5)).toBe(1);
    // 3 * 0.5 = 1.5 -> 2
    expect(applyRate(3, 0.5)).toBe(2);
  });

  it("extractInclusiveTax: net + tax === gross exactly", () => {
    for (const gross of [2_000, 1, 999, 12_345, 7]) {
      const { netCents, taxCents } = extractInclusiveTax(gross, 0.2);
      expect(netCents + taxCents).toBe(gross);
    }
    // 2000 inclusive @ 20% -> net 1667, vat 333
    expect(extractInclusiveTax(2_000, 0.2)).toEqual({ netCents: 1_667, taxCents: 333 });
  });

  it("estimateProcessorFee = percent + fixed, rounded", () => {
    // 2.9% of 10000 = 290, + 30 fixed = 320
    expect(estimateProcessorFee(10_000, { percentBps: 290, fixedCents: 30 })).toBe(320);
  });
});

describe("computeSplit exactness", () => {
  it("expert + platform fee always re-sums to the order amount", () => {
    for (const order of [10_000, 1, 999, 12_345, 50_001, 7]) {
      const split = computeSplit(order, 0, CONFIG);
      expect(split.expertAmountCents + split.platformFeeGrossCents).toBe(order);
      expect(split.platformFeeNetCents + split.vatCents).toBe(split.platformFeeGrossCents);
    }
  });

  it("known £100 order with a £3.20 processor fee", () => {
    const split = computeSplit(10_000, 320, CONFIG);
    expect(split.platformFeeGrossCents).toBe(2_000);
    expect(split.expertAmountCents).toBe(8_000);
    expect(split.platformFeeNetCents).toBe(1_667);
    expect(split.vatCents).toBe(333);
    expect(split.netRevenueCents).toBe(1_667 - 320); // 1347
    expect(split.incomeTaxSetAsideCents).toBe(applyRate(1_347, 0.19)); // 256
    expect(split.incomeTaxSetAsideCents).toBe(256);
  });

  it("boundary: order of 1 cent does not produce negative parts", () => {
    const split = computeSplit(1, 0, CONFIG);
    expect(split.platformFeeGrossCents).toBeGreaterThanOrEqual(0);
    expect(split.expertAmountCents).toBeGreaterThanOrEqual(0);
    expect(split.expertAmountCents + split.platformFeeGrossCents).toBe(1);
  });

  it("negative net revenue zeroes the income-tax set-aside", () => {
    // tiny order, large fixed processor fee -> net revenue negative
    const split = computeSplit(1_000, 5_000, CONFIG);
    expect(split.netRevenueCents).toBeLessThan(0);
    expect(split.incomeTaxSetAsideCents).toBe(0);
  });

  it("VAT-exclusive mode adds VAT on top of the fee", () => {
    const split = computeSplit(10_000, 0, { ...CONFIG, vatInclusive: false });
    expect(split.platformFeeNetCents).toBe(2_000);
    expect(split.vatCents).toBe(400);
  });

  it("formatMoney renders major.minor", () => {
    expect(formatMoney(10_000, "gbp")).toBe("100.00 GBP");
    expect(formatMoney(1_999, "usd")).toBe("19.99 USD");
    expect(formatMoney(-5, "usd")).toBe("-0.05 USD");
  });
});
