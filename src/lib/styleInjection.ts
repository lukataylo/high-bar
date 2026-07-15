import type { Tokens } from "../taste/tokens";

// A generic "skin" overlay — the same approach userstyle tools like Stylus or
// Dark Reader use: broad, high-specificity, !important rules layered on top
// of whatever the real site's own CSS already did, driven by our taste
// tokens. It can't rewrite a site's layout, but it restyles the things that
// carry a design's personality: color, radius, type, motion.
export function buildStyleOverride(tokens: Tokens): string {
  const v = tokens.cssVars;
  const vars = Object.entries(v)
    .map(([k, val]) => `  ${k}: ${val};`)
    .join("\n");

  return `<style data-taste-engine-override>
:root {
${vars}
}

html, body {
  background: var(--bg) !important;
  color: var(--text) !important;
  font-family: var(--font-body) !important;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display) !important;
  font-weight: var(--weight-display) !important;
}

p, span, li, label, div {
  font-family: var(--font-body) !important;
}

a {
  color: var(--primary) !important;
}

button,
[type="button"],
[type="submit"],
input[type="submit"],
.btn,
[class*="button" i] {
  background: var(--primary-bg) !important;
  color: var(--primary-text) !important;
  border-radius: var(--radius) !important;
  border: none !important;
  transition-duration: var(--motion-ms) !important;
}

input,
textarea,
select {
  background: var(--surface) !important;
  color: var(--text) !important;
  border: var(--border-width) solid var(--border) !important;
  border-radius: var(--radius-sm) !important;
}

[class*="card" i],
[class*="panel" i],
[class*="modal" i],
section,
article,
header,
footer,
nav {
  background: var(--surface) !important;
  border-color: var(--border) !important;
}

img, svg, video, iframe {
  border-radius: var(--radius-sm) !important;
}

*, *::before, *::after {
  transition-duration: var(--motion-ms) !important;
}
</style>`;
}

export function injectStyleOverride(html: string, tokens: Tokens): string {
  const styleBlock = buildStyleOverride(tokens);
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${styleBlock}</head>`);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${styleBlock}`);
  return styleBlock + html;
}
