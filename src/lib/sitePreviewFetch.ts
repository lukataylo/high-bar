// Fetches an arbitrary third-party page's HTML from inside the user's own
// browser (this stays a fully static app — no backend of ours is involved)
// via a chain of public CORS proxies, then sanitizes it for safe rendering
// inside a fully sandboxed iframe.

const PROXIES: Array<(url: string) => string> = [
  (url) => `https://proxy.cors.sh/${url}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class SitePreviewError extends Error {}

// Tries each proxy in order and returns the first HTML response. Public
// proxies are flaky by nature (rate limits, outages) — the fallback chain is
// what makes "any site" a realistic promise rather than "whichever proxy
// happens to be up right now".
export async function fetchPageHtml(targetUrl: string): Promise<string> {
  let lastError: unknown;
  for (const buildProxyUrl of PROXIES) {
    try {
      const res = await fetchWithTimeout(buildProxyUrl(targetUrl), 12000);
      if (!res.ok) {
        lastError = new Error(`proxy responded ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (!/<html[\s>]|<body[\s>]|<!doctype html/i.test(text)) {
        lastError = new Error("response did not look like HTML");
        continue;
      }
      return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw new SitePreviewError(
    `Couldn't load that site for preview (all proxies failed: ${(lastError as Error)?.message ?? "unknown error"})`,
  );
}

// Strips anything that could execute or navigate, and injects a <base> tag so
// relative asset URLs (images, stylesheets, fonts) resolve against the real
// site. The iframe is also rendered with an empty `sandbox` attribute, which
// is the actual security boundary — this sanitization pass is defense in
// depth and keeps the DOM visually clean, not the only thing standing
// between us and script execution.
export function sanitizeForPreview(html: string, sourceUrl: string): string {
  let out = html;

  out = out.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<script\b[^>]*\/?>(?!<\/script>)/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, `$1=$2#$2`);
  out = out.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
  out = out.replace(/<meta[^>]+http-equiv=["']?x-frame-options["']?[^>]*>/gi, "");
  out = out.replace(/<link[^>]+rel=["']?manifest["']?[^>]*>/gi, "");

  const origin = new URL(sourceUrl).origin + "/";
  const baseTag = `<base href="${origin}">`;
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  } else {
    out = baseTag + out;
  }

  return out;
}
