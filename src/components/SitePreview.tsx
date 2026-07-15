import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPageHtml, sanitizeForPreview, SitePreviewError } from "../lib/sitePreviewFetch";
import { injectStyleOverride } from "../lib/styleInjection";
import type { Tokens } from "../taste/tokens";

interface Props {
  url: string;
  tokens: Tokens;
}

type Status = "loading" | "ready" | "direct-fallback" | "error";

// Restyles an arbitrary real site live: fetches its HTML through a public
// CORS-proxy fallback chain, sanitizes it, and renders it in a fully
// sandboxed iframe with our taste tokens injected as a high-specificity CSS
// overlay. Re-injects styles (no re-fetch) whenever `tokens` changes, so
// swiping keeps restyling the loaded site in real time.
export function SitePreview({ url, tokens }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [baseHtml, setBaseHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    setBaseHtml(null);
    setError(null);

    fetchPageHtml(url)
      .then((html) => {
        if (requestIdRef.current !== requestId) return;
        setBaseHtml(sanitizeForPreview(html, url));
        setStatus("ready");
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        const message = err instanceof SitePreviewError ? err.message : "Couldn't load that site for preview.";
        setError(message);
        // Every proxy failed — many sites still allow direct cross-origin
        // framing even though we can't reach into that origin to restyle it.
        // Showing the real, unstyled site beats a permanently blank preview.
        setStatus("direct-fallback");
      });
  }, [url]);

  const styledHtml = useMemo(() => (baseHtml ? injectStyleOverride(baseHtml, tokens) : null), [baseHtml, tokens]);

  const [directLoadFailed, setDirectLoadFailed] = useState(false);
  useEffect(() => {
    if (status !== "direct-fallback") return;
    setDirectLoadFailed(false);
    const timer = window.setTimeout(() => setDirectLoadFailed(true), 6000);
    return () => window.clearTimeout(timer);
  }, [status, url]);

  if (status === "loading") {
    return (
      <div className="site-preview-status">
        <span className="site-preview-spinner" aria-hidden />
        <p>Loading {safeHostname(url)}…</p>
      </div>
    );
  }

  if (status === "error" || (status === "ready" && !styledHtml) || (status === "direct-fallback" && directLoadFailed)) {
    return (
      <div className="site-preview-status site-preview-error">
        <p>{error ?? "Couldn't load that site for preview."}</p>
        <small>Try a different URL — some sites block every public proxy we try, and this one also refused a direct embed.</small>
      </div>
    );
  }

  if (status === "direct-fallback") {
    return (
      <div className="site-preview-direct">
        <div className="site-preview-banner">Showing the live site unstyled — couldn't fetch it to restyle.</div>
        <iframe className="preview-iframe" title="Site preview (unstyled)" sandbox="" src={url} onLoad={() => setDirectLoadFailed(false)} />
      </div>
    );
  }

  return <iframe className="preview-iframe" title="Site preview" sandbox="" srcDoc={styledHtml ?? undefined} />;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
