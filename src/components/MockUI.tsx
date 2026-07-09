import type { CSSProperties } from "react";
import type { Layout } from "../corpus/corpus";
import type { Tokens } from "../taste/tokens";

interface Props {
  tokens: Tokens;
  layout: Layout;
  compact?: boolean;
}

// One renderer for every styled surface: the live "slop" dashboard, inspiration
// preview cards, and variant cards. It only reads CSS variables from `tokens`,
// so the same component "wears" whatever taste it is given.
export function MockUI({ tokens, layout, compact }: Props) {
  const style = tokens.cssVars as CSSProperties;
  const scale = compact ? 0.82 : 1;

  return (
    <div className="mirror" style={{ ...style, fontSize: `${14 * scale}px` }}>
      {tokens.decorated && <Ornaments />}
      {layout === "dashboard" && <Dashboard compact={compact} />}
      {layout === "landing" && <Landing compact={compact} />}
      {layout === "mobile" && <MobileApp compact={compact} />}
      {layout === "poster" && <Poster compact={compact} />}
    </div>
  );
}

function Ornaments() {
  return (
    <>
      <span className="ui-deco" style={{ width: 60, height: 60, top: -18, right: -14, transform: "rotate(12deg)" }} />
      <span
        className="ui-deco"
        style={{ width: 30, height: 30, bottom: 24, left: -10, borderRadius: 999, opacity: 0.6 }}
      />
    </>
  );
}

function Dashboard({ compact }: { compact?: boolean }) {
  return (
    <div className="ui">
      <div className="ui-eyebrow">Analytics</div>
      <h1 className="ui-title" style={{ fontSize: compact ? "1.4em" : "1.9em" }}>
        Revenue
      </h1>
      <div className="ui-row">
        <div className="ui-card">
          <div className="ui-eyebrow">MRR</div>
          <div className="ui-stat" style={{ fontSize: "1.6em" }}>
            $48.2k
          </div>
          <div className="ui-bar" style={{ marginTop: 8 }}>
            <span style={{ width: "72%" }} />
          </div>
        </div>
        <div className="ui-card alt">
          <div className="ui-eyebrow">Users</div>
          <div className="ui-stat" style={{ fontSize: "1.6em" }}>
            9,140
          </div>
          <div className="ui-bar" style={{ marginTop: 8 }}>
            <span style={{ width: "54%" }} />
          </div>
        </div>
      </div>
      <div className="ui-card">
        <div className="ui-eyebrow">This week</div>
        <div className="ui-chart" style={{ marginTop: 8 }}>
          {[40, 65, 50, 80, 60, 92, 74].map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      {!compact && (
        <div className="ui-row">
          <div className="ui-btn" style={{ flex: 1 }}>
            Add widget
          </div>
          <div className="ui-btn ghost" style={{ flex: 1 }}>
            Export
          </div>
        </div>
      )}
    </div>
  );
}

function Landing({ compact }: { compact?: boolean }) {
  return (
    <div className="ui" style={{ gap: "var(--space-3)" }}>
      <div className="ui-chip">New · v2.0</div>
      <h1 className="ui-title" style={{ fontSize: compact ? "1.7em" : "2.4em" }}>
        Ship in your taste.
      </h1>
      <p className="ui-sub">A design system that learns how you like things to look, then builds it for you.</p>
      <div className="ui-row">
        <div className="ui-btn" style={{ flex: 1 }}>
          Get started
        </div>
        <div className="ui-btn ghost" style={{ flex: 1 }}>
          Docs
        </div>
      </div>
      <div className="ui-card">
        <div className="ui-row" style={{ alignItems: "center" }}>
          <span className="ui-avatar" />
          <div style={{ flex: 1 }}>
            <div className="ui-stat" style={{ fontSize: "1em" }}>
              Trusted by builders
            </div>
            <div className="ui-sub" style={{ fontSize: "0.8em" }}>
              4.9 · 12k teams
            </div>
          </div>
          <div className="ui-chip">↗ 32%</div>
        </div>
      </div>
    </div>
  );
}

function MobileApp({ compact }: { compact?: boolean }) {
  return (
    <div className="ui">
      <div className="ui-row" style={{ alignItems: "center" }}>
        <span className="ui-avatar" />
        <div style={{ flex: 1 }}>
          <div className="ui-eyebrow">Good morning</div>
          <div className="ui-stat" style={{ fontSize: "1.1em" }}>
            Alex
          </div>
        </div>
        <div className="ui-chip">•••</div>
      </div>
      <div className="ui-card" style={{ textAlign: "center" }}>
        <div className="ui-eyebrow">Today</div>
        <div className="ui-stat" style={{ fontSize: compact ? "2em" : "2.6em" }}>
          72%
        </div>
        <div className="ui-sub" style={{ fontSize: "0.8em" }}>
          daily goal
        </div>
        <div className="ui-bar" style={{ marginTop: 10 }}>
          <span style={{ width: "72%" }} />
        </div>
      </div>
      <div className="ui-row">
        {["Focus", "Rest", "Move"].map((l) => (
          <div className="ui-card alt" key={l} style={{ textAlign: "center", padding: "var(--space-unit)" }}>
            <div className="ui-sub" style={{ fontSize: "0.8em" }}>
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Poster({ compact }: { compact?: boolean }) {
  return (
    <div className="ui" style={{ justifyContent: "center", gap: "var(--space-2)" }}>
      <div className="ui-eyebrow">Vol. 04 — Type &amp; Form</div>
      <h1 className="ui-title" style={{ fontSize: compact ? "2.4em" : "3.4em", lineHeight: 0.95 }}>
        FORM
        <br />
        FOLLOWS
        <br />
        FEELING
      </h1>
      <div className="ui-row" style={{ alignItems: "center" }}>
        <div className="ui-bar" style={{ flex: 1 }}>
          <span style={{ width: "100%" }} />
        </div>
        <div className="ui-chip">2026</div>
      </div>
      {!compact && <p className="ui-sub">An exhibition of computational design taste.</p>}
    </div>
  );
}
