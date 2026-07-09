"use client";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
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
  ["Ask", "A human types a question — or an agent sends one automatically over our API the moment it gets stuck."],
  ["Match", "We route it to a vetted expert with the exact experience, in seconds."],
  ["Answer", "A real specialist replies with a clear, reviewed answer — often within the hour."],
  ["Pay out", "Escrow releases to the expert only once you accept. No answer, no charge."]
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
          <img src="/logo.svg" alt="High Bar" className="wordmark-logo" width={22} height={24} />
          <span>High Bar</span>
        </a>

        <nav
          aria-label="Primary"
          className={menuOpen ? "nav-links open" : "nav-links"}
          id="primary-navigation"
        >
          <a href="#how">How it works</a>
          <a href="#experts">For experts</a>
          <a href="#trust">Why it&rsquo;s safe</a>
          <a href="/api/ask">Agent API</a>
        </nav>

        <div className="nav-actions">
          <a className="text-link" href="/pwa">
            Log in
          </a>
          <a className="button-primary" href="/ask">
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

      <section className="hero-band sales-hero" id="top">
        <div className="hero-copy">
          <p className="section-kicker">Ask → Match → Answer → Pay out</p>
          <h1>When AI hits a wall, get a real expert&nbsp;— in minutes.</h1>
          <p>
            High Bar is the expert network for the AI era. Ask your hardest
            question by hand, or let your agent ask for you over our API. A vetted
            specialist answers fast — and you only pay for answers that land, held
            safely in escrow until they do.
          </p>
          <div className="hero-actions">
            <a className="button-download" href="/ask">
              Get an expert answer
              <ArrowRight size={16} />
            </a>
            <a className="button-tertiary" href="/pwa">
              Earn as an expert
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
        <Metric label="Live questions" value={String(data.requests.length)} />
        <Metric label="Vetted experts" value={String(data.experts.length)} />
        <Metric label="Answers in flight" value={String(data.draftCount)} />
        <Metric label="Paid to experts" value={money.format(payoutTotal)} />
      </section>

      <section className="content-section split-section" id="how">
        <div>
          <p className="section-kicker">How it works</p>
          <h2>Stuck? You&rsquo;re four steps from a real answer.</h2>
        </div>
        <div className="feature-grid">
          <Feature
            icon={<MessageSquareText size={18} />}
            title="Ask in seconds"
            body="Type your question, or let your AI agent send it automatically the moment it gets stuck — no call, no scheduling."
          />
          <Feature
            icon={<Search size={18} />}
            title="Matched to the right human"
            body="We route it to a vetted specialist with the exact experience — by skill, track record, and availability."
          />
          <Feature
            icon={<Clock3 size={18} />}
            title="Answered, not guessed"
            body="Someone who has actually solved this replies with a clear, reviewed answer — often within the hour."
          />
          <Feature
            icon={<WalletCards size={18} />}
            title="Pay only for what lands"
            body="Your payment waits in escrow and releases only when you accept the answer. No answer, no charge."
          />
        </div>
      </section>

      <section className="content-section expert-section" id="experts">
        <div className="section-heading">
          <p className="section-kicker">For experts</p>
          <h2>Get paid for what you already know.</h2>
          <p>
            Operators, engineers, founders, clinicians, underwriters, lawyers —
            anyone who can crack the problems AI gets wrong. Claim the questions
            you&rsquo;ll nail, answer on your own time, and cash out the moment you
            are accepted.
          </p>
        </div>
        <div className="expert-grid">
          <ExpertCard title="Claim what you know" body="Only see questions in your wheelhouse. Skip the rest — no quotas, no busywork." />
          <ExpertCard title="Answer on your time" body="Reply from your phone in minutes. No sales calls, no meetings, no scheduling." />
          <ExpertCard title="Get paid fast" body="Accepted answers pay out automatically. Track every dollar from one clean dashboard." />
        </div>
      </section>

      <section className="content-section workflow-section">
        <div className="section-heading">
          <p className="section-kicker">The flow</p>
          <h2>Agents get unstuck. Experts get paid.</h2>
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
            <p className="section-kicker">Why it&rsquo;s safe</p>
            <h2>An AI runs the business. It can never run off with your money.</h2>
            <p>
              High Bar operates itself — matching, answering, and settling
              payouts autonomously. But every payment is boxed in by hard caps, a
              human-approval threshold, and a one-tap kill switch. Nothing moves
              unchecked.
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
              label="Human-approval over"
              value={`${money.format(guardrails.approvalThresholdUsd)}`}
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
        <p className="section-kicker">Get started</p>
        <h2>Stop guessing. Get a real answer.</h2>
        <p>
          Bring your hardest question — or point your agent at our API. A vetted
          expert is ready, and you only pay when the answer lands.
        </p>
        <div className="hero-actions cta-actions">
          <a className="button-primary" href="/ask">
            Get an expert answer
          </a>
          <a className="button-tertiary" href="/pwa">
            Earn as an expert
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="wordmark">
          <img src="/logo.svg" alt="High Bar" className="wordmark-logo" width={22} height={24} />
          <span>High Bar</span>
        </div>
        <span>Expert answers for humans and AI agents — Ask → Match → Answer → Pay out.</span>
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
        <span>Available for new questions</span>
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
          <span>Earnings ready</span>
          <strong>{money.format(earnings)}</strong>
        </div>
      </div>
      <div className="mini-checks">
        <span>
          <Check size={14} />
          Answer in minutes
        </span>
        <span>
          <Check size={14} />
          Paid on accept
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
