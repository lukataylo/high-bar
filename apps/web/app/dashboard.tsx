"use client";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Command,
  DollarSign,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  Smartphone,
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

const steps = [
  ["Question lands", "An agent or human submits the problem it cannot finish."],
  ["Expert matched", "High Bar routes it to people with the right lived experience."],
  ["Answer reviewed", "The response is checked before it is sent back to the asker."],
  ["Expert paid", "Useful answers move into the earnings queue."]
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
  const payoutTotal = data.payoutQueue.reduce(
    (sum, payout) => sum + payout.amountUsd,
    0
  );
  const topQuestion = data.requests[0]?.title ?? "Why is this agent stuck?";
  const topExpert = data.experts[0];

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
          <a href="#how">How it works</a>
          <a href="#experts">For experts</a>
          <a href="#trust">Trust</a>
          <a href="/api/ask">Agent API</a>
        </nav>

        <div className="nav-actions">
          <a className="text-link" href="/pwa">
            Log in
          </a>
          <a className="button-primary" href="/pwa">
            Start earning
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

      <section className="hero-band sales-hero" id="top">
        <div className="hero-copy">
          <p className="section-kicker">Human experts for stuck agents</p>
          <h1>Earn money answering questions AI agents cannot solve.</h1>
          <p>
            High Bar is an expert network for the agent era. When Claude Code,
            internal tools, or another human gets stuck, the question is routed to a
            vetted person who can answer it clearly and get paid.
          </p>
          <div className="hero-actions">
            <a className="button-download" href="/pwa">
              Log in to the PWA
              <ArrowRight size={16} />
            </a>
            <a className="button-tertiary" href="/api/ask">
              Ask with one URL
            </a>
          </div>
        </div>

        <ExpertPwaPreview
          earnings={payoutTotal}
          expertName={topExpert?.name ?? "Maya Chen"}
          question={topQuestion}
        />
      </section>

      <section className="section-grid metrics-strip" aria-label="Network metrics">
        <Metric label="Open questions" value={String(data.requests.length)} />
        <Metric label="Vetted experts" value={String(data.experts.length)} />
        <Metric label="Answers queued" value={String(data.draftCount)} />
        <Metric label="Earnings queued" value={money.format(payoutTotal)} />
      </section>

      <section className="content-section split-section" id="how">
        <div>
          <p className="section-kicker">How it works</p>
          <h2>A simple marketplace for answers that require human judgment.</h2>
        </div>
        <div className="feature-grid">
          <Feature
            icon={<MessageSquareText size={18} />}
            title="Agents ask when blocked"
            body="A Claude skill, MCP tool, or one-line prompt can send a question to High Bar with the context that failed."
          />
          <Feature
            icon={<Search size={18} />}
            title="Experts are matched"
            body="Questions are routed by topic, experience, availability, and answer quality signals."
          />
          <Feature
            icon={<Clock3 size={18} />}
            title="Fast answers win"
            body="Experts see concise tasks in the PWA, answer when they know, and skip what they do not."
          />
          <Feature
            icon={<WalletCards size={18} />}
            title="Useful answers earn"
            body="Accepted answers move into a guarded earnings queue with visible payout controls."
          />
        </div>
      </section>

      <section className="content-section expert-section" id="experts">
        <div className="section-heading">
          <p className="section-kicker">For experts</p>
          <h2>Turn your hard-won knowledge into paid, focused answers.</h2>
          <p>
            High Bar is for operators, engineers, support leads, policy owners, and
            specialists who can solve the edge cases automation gets wrong.
          </p>
        </div>
        <div className="expert-grid">
          <ExpertCard title="Know the answer" body="Claim only the questions where your experience is directly relevant." />
          <ExpertCard title="Answer async" body="Respond from the PWA without jumping on a sales call or joining a meeting." />
          <ExpertCard title="Get paid" body="Track accepted answers, pending reviews, and earnings from one mobile-friendly surface." />
        </div>
      </section>

      <section className="content-section workflow-section">
        <div className="section-heading">
          <p className="section-kicker">Question flow</p>
          <h2>Agents get unstuck. Humans earn for judgment.</h2>
        </div>
        <div className="timeline-card">
          {steps.map(([stage, detail]) => (
            <div className="timeline-row" key={stage}>
              <span className="timeline-pill thinking">{stage}</span>
              <code>{detail}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section comparison-section" id="trust">
        <div className="comparison-card">
          <div>
            <p className="section-kicker">Trust</p>
            <h2>Payment is guarded. Expert work is visible.</h2>
            <p>
              The agent can route questions and propose payments, but approvals, caps,
              and a kill switch bound the money movement.
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
              label="Review threshold"
              value={`${money.format(guardrails.approvalThresholdUsd)}+`}
            />
            <Guardrail
              icon={<LockKeyhole size={17} />}
              label="Daily payout cap"
              value={money.format(guardrails.dailyCapUsd)}
            />
          </div>
        </div>
      </section>

      <section className="cta-band" id="earn">
        <p className="section-kicker">Expert PWA</p>
        <h2>Log in, claim a question, and start earning.</h2>
        <p>
          The PWA gives human experts a focused queue of agent questions, accepted
          answers, and earnings status.
        </p>
        <div className="hero-actions cta-actions">
          <a className="button-primary" href="/pwa">
            Log in to PWA
          </a>
          <a className="button-tertiary" href="/api/ask">
            View agent ask URL
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="wordmark">
          <Command size={18} />
          <span>High Bar</span>
        </div>
        <span>Earn by answering the questions agents cannot finish.</span>
      </footer>
    </main>
  );
}

function ExpertPwaPreview({
  earnings,
  expertName,
  question
}: {
  earnings: number;
  expertName: string;
  question: string;
}) {
  return (
    <aside className="pwa-preview" aria-label="Expert PWA preview">
      <div className="pwa-phone-bar">
        <Smartphone size={16} />
        <span>High Bar Expert PWA</span>
      </div>
      <div className="pwa-panel">
        <p className="section-kicker">Signed in as</p>
        <strong>{expertName}</strong>
        <span>Available for agent questions</span>
      </div>
      <div className="pwa-question-card">
        <div>
          <span>New paid question</span>
          <h3>{question}</h3>
        </div>
        <a className="button-primary" href="/pwa">
          Claim
        </a>
      </div>
      <div className="pwa-earnings">
        <DollarSign size={18} />
        <div>
          <span>Earnings queued</span>
          <strong>{money.format(earnings)}</strong>
        </div>
      </div>
      <div className="mini-checks">
        <span>
          <Check size={14} />
          Answer async
        </span>
        <span>
          <Check size={14} />
          Human review before payout
        </span>
      </div>
    </aside>
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

function ExpertCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="expert-card">
      <Sparkles size={18} />
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
