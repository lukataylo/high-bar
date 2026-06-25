"use client";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  Code2,
  Command,
  Database,
  LockKeyhole,
  MailPlus,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X
} from "lucide-react";
import { useState } from "react";
import type { DashboardData } from "@/lib/view-model";

type DashboardGuardrails = {
  approvalThresholdUsd: number;
  dailyCapUsd: number;
  killSwitch: boolean;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const timeline = [
  ["Thinking", "Understand diligence scope and constraints"],
  ["Reading", "Review expert graph and prior call notes"],
  ["Grepping", "Find operators with matching scars"],
  ["Editing", "Draft compliant manual outreach"],
  ["Done", "Queue approvals without moving money"]
] as const;

export function Dashboard({
  data,
  guardrails
}: {
  data: DashboardData;
  guardrails: DashboardGuardrails;
  renderedAt: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const firstRequest = data.requests[0];
  const firstExperts = firstRequest
    ? data.rankedExpertsByRequest[firstRequest.id] ?? []
    : [];
  const payoutTotal = data.payoutQueue.reduce(
    (sum, payout) => sum + payout.amountUsd,
    0
  );

  return (
    <main className="site-shell">
      <header className="top-nav">
        <a className="wordmark" href="#top" aria-label="High Bar home">
          <Command size={18} />
          <span>High Bar</span>
        </a>

        <nav
          aria-label="Primary"
          className={menuOpen ? "nav-links open" : "nav-links"}
          id="primary-navigation"
        >
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#guardrails">Guardrails</a>
          <a href="#launch">Launch</a>
        </nav>

        <div className="nav-actions">
          <a className="text-link" href="/api/agent">
            API
          </a>
          <a className="button-primary" href="#launch">
            Get live
          </a>
          <button
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            className="menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <section className="hero-band" id="top">
        <div className="hero-copy">
          <p className="section-kicker">Expert network operations</p>
          <h1>AI-assisted diligence calls, without letting the agent touch the wire.</h1>
          <p>
            High Bar turns client requests into ranked expert shortlists, manual outreach
            drafts, and payout approvals. It is built for fast-moving teams who still need a
            human checkpoint before money or messages leave the system.
          </p>
          <div className="hero-actions">
            <a className="button-download" href="#product">
              View control room
              <ArrowRight size={16} />
            </a>
            <a className="button-tertiary" href="#guardrails">
              Read guardrails
            </a>
          </div>
        </div>

        <ProductMockup
          requestTitle={firstRequest?.title ?? "Voice AI diligence"}
          expertName={firstExperts[0]?.name ?? "Maya Chen"}
          matchScore={firstExperts[0]?.matchScore ?? 100}
          payoutTotal={payoutTotal}
        />
      </section>

      <section className="section-grid metrics-strip" aria-label="Launch metrics">
        <Metric label="Open demand" value={String(data.requests.length)} />
        <Metric label="Expert pool" value={String(data.experts.length)} />
        <Metric label="Drafts ready" value={String(data.draftCount)} />
        <Metric label="Queued payouts" value={money.format(payoutTotal)} />
      </section>

      <section className="content-section split-section" id="product">
        <div>
          <p className="section-kicker">Product</p>
          <h2>One calm surface for the messy middle of expert calls.</h2>
        </div>
        <div className="feature-grid">
          <Feature
            icon={<Search size={18} />}
            title="Rank the right operators"
            body="Match client needs against expert tags, availability, confidence, and rate before anyone starts outreach."
          />
          <Feature
            icon={<MailPlus size={18} />}
            title="Draft-only outreach"
            body="LinkedIn copy is generated for review. The system never auto-sends social outreach."
          />
          <Feature
            icon={<WalletCards size={18} />}
            title="Payout queue"
            body="Every payout is visible with approval thresholds and daily caps surfaced before release."
          />
          <Feature
            icon={<Database size={18} />}
            title="Ready for persistence"
            body="Postgres and Redis are provisioned on Railway; the MVP uses seed data until the backed services are wired."
          />
        </div>
      </section>

      <section className="content-section workflow-section" id="workflow">
        <div className="section-heading">
          <p className="section-kicker">Agent timeline</p>
          <h2>AI work is legible before it becomes action.</h2>
        </div>
        <div className="timeline-card">
          {timeline.map(([stage, detail]) => (
            <div className="timeline-row" key={stage}>
              <span className={`timeline-pill ${stage.toLowerCase()}`}>{stage}</span>
              <code>{detail}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section comparison-section" id="guardrails">
        <div className="comparison-card">
          <div>
            <p className="section-kicker">Guardrails</p>
            <h2>Automation where it helps. Approval where it matters.</h2>
            <p>
              The default launch posture is conservative: draft-only outreach, approval
              thresholds, daily payout caps, and a kill switch visible in the interface.
            </p>
          </div>
          <div className="guardrail-list">
            <Guardrail
              icon={<ShieldCheck size={17} />}
              label="Kill switch"
              value={guardrails.killSwitch ? "Enabled" : "Off"}
            />
            <Guardrail
              icon={<BadgeCheck size={17} />}
              label="Approval threshold"
              value={`${money.format(guardrails.approvalThresholdUsd)}+`}
            />
            <Guardrail
              icon={<LockKeyhole size={17} />}
              label="Daily cap"
              value={money.format(guardrails.dailyCapUsd)}
            />
          </div>
        </div>
      </section>

      <section className="cta-band" id="launch">
        <p className="section-kicker">Launch build</p>
        <h2>High Bar is ready for a live demo path.</h2>
        <p>
          The current build is public-demo friendly by default. Set
          <code>AUTH_REQUIRED=true</code> when the team wants to lock it behind Basic or
          Bearer auth.
        </p>
        <a className="button-primary" href="/api/payouts">
          Inspect payouts API
        </a>
      </section>

      <footer className="footer">
        <div className="wordmark">
          <Command size={18} />
          <span>High Bar</span>
        </div>
        <span>Expert network operations, built for guarded autonomy.</span>
      </footer>
    </main>
  );
}

function ProductMockup({
  requestTitle,
  expertName,
  matchScore,
  payoutTotal
}: {
  requestTitle: string;
  expertName: string;
  matchScore: number;
  payoutTotal: number;
}) {
  return (
    <div className="ide-mockup-card">
      <div className="ide-toolbar">
        <span />
        <span />
        <span />
        <strong>hermes-control.ts</strong>
      </div>
      <div className="ide-grid">
        <aside className="ide-sidebar">
          <strong>Requests</strong>
          <span>REQ-1042</span>
          <span>REQ-1043</span>
          <span>Approvals</span>
        </aside>
        <section className="ide-pane editor-pane">
          <div className="code-line">
            <span className="muted">const</span> request = <b>{requestTitle}</b>
          </div>
          <div className="code-line">
            expert.match(<b>{expertName}</b>) <span className="muted">=</span>{" "}
            <b>{matchScore}/100</b>
          </div>
          <div className="code-line">
            payout.queue <span className="muted">=</span> {money.format(payoutTotal)}
          </div>
          <div className="agent-result">
            <Sparkles size={16} />
            Draft outreach prepared. Human send required.
          </div>
        </section>
        <aside className="ide-pane chat-pane">
          <strong>Hermes</strong>
          <p>Ranked candidates are ready. No external message or payout will execute without approval.</p>
          <div className="mini-checks">
            <span>
              <Check size={14} />
              Manual LinkedIn send
            </span>
            <span>
              <Check size={14} />
              Payout approval gate
            </span>
          </div>
        </aside>
        <section className="ide-pane terminal-pane">
          <Code2 size={15} />
          <code>pnpm build && railway up --detach</code>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Feature({
  icon,
  title,
  body
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function Guardrail({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="guardrail-row">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
