"use client";

import { ArrowLeft, Check, Clock3, DollarSign, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const questions = [
  {
    title: "Why is the refund agent misclassifying policy exceptions?",
    source: "Autonomous support agent",
    reward: "$450",
    sla: "24h"
  },
  {
    title: "How should this agent explain usage-based billing disputes?",
    source: "Product operator",
    reward: "$325",
    sla: "48h"
  }
];

export default function ExpertPwaPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [claimedQuestion, setClaimedQuestion] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <main className="pwa-login-page">
        <section className="login-card" aria-labelledby="login-title">
          <Link className="back-link" href="/">
            <ArrowLeft size={16} />
            High Bar
          </Link>
          <p className="section-kicker">Expert PWA</p>
          <h1 id="login-title">Log in to answer agent questions.</h1>
          <p>
            Claim questions where your judgment can unblock an AI agent or a human
            operator. Accepted answers move into your earnings queue.
          </p>
          <label htmlFor="email">Email</label>
          <div className="login-input">
            <Mail size={17} />
            <input
              autoComplete="email"
              defaultValue="expert@highbar.dev"
              id="email"
              inputMode="email"
              type="email"
            />
          </div>
          <button className="button-primary login-submit" onClick={() => setSignedIn(true)} type="button">
            Continue to expert queue
          </button>
          <span className="login-note">Demo login for the launch PWA.</span>
        </section>
      </main>
    );
  }

  return (
    <main className="pwa-app-shell">
      <header className="pwa-app-header">
        <div>
          <p className="section-kicker">High Bar Expert PWA</p>
          <h1>Agent questions ready for you</h1>
        </div>
        <Link className="button-tertiary" href="/">
          Sales page
        </Link>
      </header>

      <section className="pwa-summary-grid" aria-label="Expert summary">
        <Summary icon={<DollarSign size={18} />} label="Queued earnings" value="$530" />
        <Summary icon={<Clock3 size={18} />} label="Open questions" value="2" />
        <Summary icon={<Check size={18} />} label="Accepted answers" value="3" />
      </section>

      <section className="pwa-question-list" aria-label="Questions to answer">
        {questions.map((question) => (
          <article className="pwa-task-card" key={question.title}>
            <div>
              <span>{question.source}</span>
              <h2>{question.title}</h2>
            </div>
            <dl>
              <div>
                <dt>Reward</dt>
                <dd>{question.reward}</dd>
              </div>
              <div>
                <dt>SLA</dt>
                <dd>{question.sla}</dd>
              </div>
            </dl>
            <button
              className="button-primary"
              onClick={() => setClaimedQuestion(question.title)}
              type="button"
            >
              {claimedQuestion === question.title ? "Claimed" : "Claim question"}
            </button>
          </article>
        ))}
      </section>

      {claimedQuestion ? (
        <section className="pwa-claimed-banner" aria-live="polite">
          <Check size={16} />
          Claimed: {claimedQuestion}
        </section>
      ) : null}

      <footer className="pwa-trust-note">
        <LockKeyhole size={16} />
        Payments are reviewed against threshold, cap, and kill-switch policy before release.
      </footer>
    </main>
  );
}

function Summary({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="pwa-summary-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
