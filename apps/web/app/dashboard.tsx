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
  ["Thinking", "Detect where the agent is stuck"],
  ["Reading", "Review prior attempts and context"],
  ["Grepping", "Find humans with matching expertise"],
  ["Editing", "Package a precise answer request"],
  ["Done", "Pay the expert after human review"]
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
          <a href="#product">How it works</a>
          <a href="#workflow">Routing</a>
          <a href="#guardrails">Trust</a>
          <a href="#earn">Earn</a>
        </nav>

        <div className="nav-actions">
          <a className="text-link" href="/api/ask">
            Agent URL
          </a>
          <a className="button-primary" href="/api/ask">
            Ask a question
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
          <p className="section-kicker">AI + human expert network</p>
          <h1>When agents get stuck, High Bar routes the question to a human who knows.</h1>
          <p>
            High Bar lets people earn money by answering hard questions that AI agents and
            other humans cannot finish on their own. The system captures context, finds the
            right expert, and keeps approval visible before answers or payments move.
          </p>
          <div className="hero-actions">
            <a className="button-download" href="#product">
              See how it works
              <ArrowRight size={16} />
            </a>
            <a className="button-tertiary" href="#earn">
              Join as an expert
            </a>
          </div>
        </div>

        <ProductMockup
          requestTitle={firstRequest?.title ?? "Why is this agent failing?"}
          expertName={firstExperts[0]?.name ?? "Maya Chen"}
          matchScore={firstExperts[0]?.matchScore ?? 100}
          payoutTotal={payoutTotal}
        />
      </section>

      <section className="section-grid metrics-strip" aria-label="Network metrics">
        <Metric label="Open demand" value={String(data.requests.length)} />
        <Metric label="Human experts" value={String(data.experts.length)} />
        <Metric label="Answers queued" value={String(data.draftCount)} />
        <Metric label="Expert earnings" value={money.format(payoutTotal)} />
      </section>

      <section className="content-section split-section" id="product">
        <div>
          <p className="section-kicker">Product</p>
          <h2>A marketplace for questions that need human judgment.</h2>
        </div>
        <div className="feature-grid">
          <Feature
            icon={<Search size={18} />}
            title="Find the person who knows"
            body="Match stuck questions against expert tags, availability, confidence, and rate before asking for an answer."
          />
          <Feature
            icon={<MailPlus size={18} />}
            title="Package the context"
            body="Agents hand over the failed path, evidence, and exact question so humans can answer quickly."
          />
          <Feature
            icon={<WalletCards size={18} />}
            title="Pay for useful answers"
            body="Humans can earn for resolving blockers, with payout thresholds and daily caps surfaced before release."
          />
          <Feature
            icon={<Database size={18} />}
            title="Built for agent handoffs"
            body="Postgres and Redis are provisioned on Railway; the MVP is ready for live routing, queues, and review."
          />
        </div>
      </section>

      <section className="content-section workflow-section" id="workflow">
        <div className="section-heading">
          <p className="section-kicker">Routing timeline</p>
          <h2>Every handoff shows why a human is needed.</h2>
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
              The launch posture is conservative: answer requests are visible, payouts stay
              gated, and operators can pause routing with a kill switch.
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

      <section className="cta-band" id="earn">
        <p className="section-kicker">Earn with expertise</p>
        <h2>High Bar is ready to route stuck questions to paid human experts.</h2>
        <p>
          Bring a difficult question, or join the network as a human expert who gets paid
          when your answer resolves the blocker.
        </p>
        <div className="hero-actions cta-actions">
          <a className="button-primary" href="/api/ask">
            Ask a question
          </a>
          <a className="button-tertiary" href="/api/payouts">
            Join as an expert
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="wordmark">
          <Command size={18} />
          <span>High Bar</span>
        </div>
        <span>Human expertise for the questions automation cannot finish.</span>
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
        <strong>highbar-router.ts</strong>
      </div>
      <div className="ide-grid">
        <aside className="ide-sidebar">
          <strong>Questions</strong>
          <span>Q-1042</span>
          <span>Q-1043</span>
          <span>Approvals</span>
        </aside>
        <section className="ide-pane editor-pane">
          <div className="code-line">
            <span className="muted">const</span> stuckQuestion = <b>{requestTitle}</b>
          </div>
          <div className="code-line">
            human.match(<b>{expertName}</b>) <span className="muted">=</span>{" "}
            <b>{matchScore}/100</b>
          </div>
          <div className="code-line">
            earnings.queue <span className="muted">=</span> {money.format(payoutTotal)}
          </div>
          <div className="agent-result">
            <Sparkles size={16} />
            Human answer requested. Payment requires approval.
          </div>
        </section>
        <aside className="ide-pane chat-pane">
          <strong>High Bar</strong>
          <p>Matched experts are ready. No answer request or payout executes without review.</p>
          <div className="mini-checks">
            <span>
              <Check size={14} />
              Human answer handoff
            </span>
            <span>
              <Check size={14} />
              Earnings approval gate
            </span>
          </div>
        </aside>
        <section className="ide-pane terminal-pane">
          <Code2 size={15} />
          <code>agent stuck -&gt; human answer -&gt; earnings approved</code>
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
