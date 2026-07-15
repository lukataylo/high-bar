import { describe, expect, it } from "vitest";
import { sanitizeForPreview } from "./sitePreviewFetch";
import { injectStyleOverride } from "./styleInjection";
import { tokensFromTaste } from "../taste/tokens";
import { neutralVector } from "../taste/dimensions";

describe("sanitizeForPreview", () => {
  it("strips script tags", () => {
    const out = sanitizeForPreview("<html><head></head><body><script>alert(1)</script>hi</body></html>", "https://example.com");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("hi");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeForPreview('<body><img src="x.png" onerror="alert(1)"></body>', "https://example.com");
    expect(out).not.toContain("onerror");
  });

  it("neutralizes javascript: URLs", () => {
    const out = sanitizeForPreview('<a href="javascript:alert(1)">click</a>', "https://example.com");
    expect(out).not.toContain("javascript:");
  });

  it("injects a base tag pointing at the source origin", () => {
    const out = sanitizeForPreview("<html><head><title>t</title></head><body></body></html>", "https://example.com/path/page");
    expect(out).toContain('<base href="https://example.com/">');
  });

  it("strips CSP and X-Frame-Options meta tags", () => {
    const out = sanitizeForPreview(
      '<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"><meta http-equiv="X-Frame-Options" content="DENY"></head>',
      "https://example.com",
    );
    expect(out).not.toContain("Content-Security-Policy");
    expect(out).not.toContain("X-Frame-Options");
  });
});

describe("injectStyleOverride", () => {
  it("injects a style block with taste CSS vars before </head>", () => {
    const tokens = tokensFromTaste(neutralVector(), 250);
    const out = injectStyleOverride("<html><head><title>t</title></head><body></body></html>", tokens);
    expect(out).toContain("data-taste-engine-override");
    expect(out).toContain("--primary:");
    expect(out.indexOf("data-taste-engine-override")).toBeLessThan(out.indexOf("</head>"));
  });

  it("falls back to prepending when there is no head tag", () => {
    const tokens = tokensFromTaste(neutralVector(), 250);
    const out = injectStyleOverride("<body>hi</body>", tokens);
    expect(out.startsWith("<style")).toBe(true);
    expect(out.endsWith("<body>hi</body>")).toBe(true);
  });
});
