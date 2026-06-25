"use client";

import {
  ArrowLeft,
  Layers,
  Mail,
  PencilLine,
  User,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { AccountTab } from "./AccountTab";
import { AnswersTab } from "./AnswersTab";
import {
  DEMO_AVAILABLE_USD,
  DEMO_PAID_OUT_USD,
  INITIAL_PAYOUTS,
  INITIAL_QUEUE
} from "./data";
import { EarningsTab } from "./EarningsTab";
import { SwipeDeck } from "./SwipeDeck";
import type { ClaimedQuestion, Domain, Payout, Question, TabId } from "./types";

const TABS: { id: TabId; label: string; icon: typeof Layers }[] = [
  { id: "queue", label: "Queue", icon: Layers },
  { id: "answers", label: "Answers", icon: PencilLine },
  { id: "earnings", label: "Earnings", icon: Wallet },
  { id: "account", label: "Account", icon: User }
];

const TAB_TITLES: Record<TabId, string> = {
  queue: "Question queue",
  answers: "Your answers",
  earnings: "Earnings",
  account: "Account"
};

export default function ExpertPwaPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("queue");

  const [queue, setQueue] = useState<Question[]>(INITIAL_QUEUE);
  const [claimed, setClaimed] = useState<ClaimedQuestion[]>([]);
  const [payouts] = useState<Payout[]>(INITIAL_PAYOUTS);

  const [displayName, setDisplayName] = useState("Maya Chen");
  const [email, setEmail] = useState("expert@highbar.dev");
  const [domains, setDomains] = useState<Domain[]>([
    "Engineering",
    "Operations"
  ]);
  const [available, setAvailable] = useState(true);

  const pendingTotal = useMemo(
    () =>
      claimed
        .filter((question) => question.status === "answered")
        .reduce((sum, question) => sum + question.reward, 0),
    [claimed]
  );

  function handleClaim(id: string) {
    setQueue((current) => {
      const target = current.find((question) => question.id === id);
      if (target) {
        setClaimed((existing) =>
          existing.some((question) => question.id === id)
            ? existing
            : [...existing, { ...target, answer: "", status: "claimed" }]
        );
      }
      return current.filter((question) => question.id !== id);
    });
  }

  function handleSkip(id: string) {
    setQueue((current) => current.filter((question) => question.id !== id));
  }

  function handleDraftChange(id: string, value: string) {
    setClaimed((current) =>
      current.map((question) =>
        question.id === id ? { ...question, answer: value } : question
      )
    );
  }

  function handleSubmitAnswer(id: string) {
    setClaimed((current) =>
      current.map((question) =>
        question.id === id ? { ...question, status: "answered" } : question
      )
    );
  }

  function handleToggleDomain(domain: Domain) {
    setDomains((current) =>
      current.includes(domain)
        ? current.filter((item) => item !== domain)
        : [...current, domain]
    );
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignedIn(true);
  }

  function handleSignOut() {
    setSignedIn(false);
    setActiveTab("queue");
  }

  if (!signedIn) {
    return (
      <main className="pwa-login-page">
        <section className="login-card pwa-login-card" aria-labelledby="login-title">
          <Link className="back-link" href="/">
            <ArrowLeft size={16} />
            High Bar
          </Link>
          <img
            alt="High Bar"
            className="pwa-login-logo"
            height={28}
            src="/logo.svg"
            width={26}
          />
          <p className="section-kicker">Expert PWA</p>
          <h1 id="login-title">Log in to answer agent questions.</h1>
          <p>
            Claim questions where your judgment can unblock an AI agent or a human
            operator. Accepted answers move into your earnings queue.
          </p>
          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email</label>
            <div className="login-input">
              <Mail size={17} />
              <input
                autoComplete="email"
                defaultValue="expert@highbar.dev"
                id="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
              />
            </div>
            <button className="button-primary login-submit" type="submit">
              Continue to expert queue
            </button>
          </form>
          <span className="login-note">Demo login — any email works.</span>
        </section>
      </main>
    );
  }

  return (
    <div className="pwa-shell">
      <div className="pwa-phone">
        <header className="pwa-topbar">
          <span className="pwa-topbar-brand">
            <img
              alt="High Bar"
              className="wordmark-logo"
              height={22}
              src="/logo.svg"
              width={20}
            />
            <span>{TAB_TITLES[activeTab]}</span>
          </span>
          <span className={`pwa-status-dot${available ? " on" : " off"}`}>
            {available ? "Available" : "Paused"}
          </span>
        </header>

        <main className="pwa-content">
          {activeTab === "queue" ? (
            <SwipeDeck questions={queue} onClaim={handleClaim} onSkip={handleSkip} />
          ) : null}

          {activeTab === "answers" ? (
            <AnswersTab
              claimed={claimed}
              onDraftChange={handleDraftChange}
              onSubmit={handleSubmitAnswer}
            />
          ) : null}

          {activeTab === "earnings" ? (
            <EarningsTab
              available={DEMO_AVAILABLE_USD}
              paidOut={DEMO_PAID_OUT_USD}
              payouts={payouts}
              pending={pendingTotal}
            />
          ) : null}

          {activeTab === "account" ? (
            <AccountTab
              available={available}
              displayName={displayName}
              domains={domains}
              email={email}
              onEmailChange={setEmail}
              onNameChange={setDisplayName}
              onSignOut={handleSignOut}
              onToggleAvailability={() => setAvailable((value) => !value)}
              onToggleDomain={handleToggleDomain}
            />
          ) : null}
        </main>

        <nav className="pwa-tabbar" aria-label="Primary">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;
            const badge =
              tab.id === "answers" && claimed.length > 0 ? claimed.length : null;
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={`pwa-tab${active ? " active" : ""}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <span className="pwa-tab-icon">
                  <Icon size={22} />
                  {badge ? <span className="pwa-tab-badge">{badge}</span> : null}
                </span>
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
