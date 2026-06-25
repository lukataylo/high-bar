"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Bell,
  Check,
  ClipboardCheck,
  Clock3,
  Copy,
  Flame,
  Gauge,
  Lock,
  MailPlus,
  PauseCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards
} from "lucide-react";
import { useState } from "react";
import type { DashboardData, RankedExpert } from "@/lib/view-model";
import type { ClientRequest, Expert, Payout } from "@/lib/types";

type Tab = "pipeline" | "scout" | "approvals";
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

export function Dashboard({
  data,
  guardrails,
  renderedAt
}: {
  data: DashboardData;
  guardrails: DashboardGuardrails;
  renderedAt: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("pipeline");
  const [selectedRequestId, setSelectedRequestId] = useState(
    data.requests[0]?.id ?? ""
  );
  const [selectedExpertId, setSelectedExpertId] = useState(
    data.experts[0]?.id ?? ""
  );
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  const selectedRequest =
    data.requests.find((request) => request.id === selectedRequestId) ??
    data.requests[0];
  const rankedExperts =
    (selectedRequest && data.rankedExpertsByRequest[selectedRequest.id]) ?? [];

  const selectedExpert =
    rankedExperts.find((expert) => expert.id === selectedExpertId) ??
    rankedExperts[0];

  const draft =
    selectedRequest && selectedExpert
      ? data.outreachDrafts[selectedRequest.id]?.[selectedExpert.id] ?? ""
      : "";
  const pendingPayoutTotal = data.payoutQueue.reduce(
    (sum, payout) => sum + payout.amountUsd,
    0
  );

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1200);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">HB</div>
          <div>
            <strong>High Bar</strong>
            <span>Expert network ops</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          <TabButton
            active={activeTab === "pipeline"}
            icon={<Gauge size={18} />}
            label="Pipeline"
            onClick={() => setActiveTab("pipeline")}
          />
          <TabButton
            active={activeTab === "scout"}
            icon={<Search size={18} />}
            label="Scout"
            onClick={() => setActiveTab("scout")}
          />
          <TabButton
            active={activeTab === "approvals"}
            icon={<ClipboardCheck size={18} />}
            label="Approvals"
            onClick={() => setActiveTab("approvals")}
          />
        </nav>

        <GuardrailPanel guardrails={guardrails} />
      </aside>

      <section className="workspace">
        <div className="mobile-guardrails">
          <GuardrailPanel guardrails={guardrails} />
        </div>

        <header className="topbar">
          <div>
            <p className="eyebrow">Live workspace</p>
            <h1>Hermes control room</h1>
          </div>
          <div className="topbar-actions">
            <span className="sync-pill">
              <Clock3 size={16} />
              {renderedAt}
            </span>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="primary-action" type="button" disabled>
              <Sparkles size={17} />
              Run loop
            </button>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Summary">
          <Metric
            icon={<Flame size={20} />}
            label="Open demand"
            value={`${data.requests.length}`}
            caption={`${money.format(data.totalBudgetUsd)} booked budget`}
          />
          <Metric
            icon={<UsersRound size={20} />}
            label="Expert pool"
            value={`${data.experts.length}`}
            caption={`${data.experts.length} vetted operators ready`}
          />
          <Metric
            icon={<MailPlus size={20} />}
            label="Drafts ready"
            value={`${data.draftCount}`}
            caption="LinkedIn send remains manual"
          />
          <Metric
            icon={<WalletCards size={20} />}
            label="Queued payouts"
            value={money.format(pendingPayoutTotal)}
            caption={`${money.format(Math.max(guardrails.dailyCapUsd - pendingPayoutTotal, 0))} cap remaining`}
          />
        </section>

        {selectedRequest && activeTab === "pipeline" && (
          <PipelineView
            requests={data.requests}
            selectedRequest={selectedRequest}
            selectedRequestId={selectedRequestId}
            onSelectRequest={(id) => {
              setSelectedRequestId(id);
              setSelectedExpertId(
                data.rankedExpertsByRequest[id]?.[0]?.id ?? ""
              );
            }}
            rankedExperts={rankedExperts}
            onSelectExpert={setSelectedExpertId}
            selectedExpertId={selectedExpert?.id ?? ""}
          />
        )}

        {selectedRequest && selectedExpert && activeTab === "scout" && (
          <ScoutView
            selectedRequest={selectedRequest}
            selectedExpert={selectedExpert}
            rankedExperts={rankedExperts}
            draft={draft}
            copyState={copyState}
            onCopy={copyDraft}
            onSelectExpert={setSelectedExpertId}
          />
        )}

        {activeTab === "approvals" && (
          <ApprovalsView
            payoutQueue={data.payoutQueue}
            approvalThresholdUsd={guardrails.approvalThresholdUsd}
            killSwitch={guardrails.killSwitch}
          />
        )}
      </section>
    </main>
  );
}

function GuardrailPanel({ guardrails }: { guardrails: DashboardGuardrails }) {
  return (
    <div className="guardrail-panel">
          <div className="section-label">
            <ShieldCheck size={15} />
            Guardrails
          </div>
          <GuardrailRow
            label="Kill switch"
            value={guardrails.killSwitch ? "On" : "Off"}
            tone={guardrails.killSwitch ? "danger" : "good"}
          />
          <GuardrailRow
            label="Approval"
            value={`${money.format(guardrails.approvalThresholdUsd)}+`}
            tone="warn"
          />
          <GuardrailRow
            label="Daily cap"
            value={money.format(guardrails.dailyCapUsd)}
            tone="good"
          />
        </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`nav-button ${active ? "active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function GuardrailRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "danger";
}) {
  return (
    <div className="guardrail-row">
      <span>{label}</span>
      <strong className={`status-dot ${tone}`}>{value}</strong>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  caption
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{caption}</p>
      </div>
    </article>
  );
}

function PipelineView({
  requests,
  selectedRequest,
  selectedRequestId,
  onSelectRequest,
  rankedExperts,
  onSelectExpert,
  selectedExpertId
}: {
  requests: ClientRequest[];
  selectedRequest: ClientRequest;
  selectedRequestId: string;
  onSelectRequest: (id: string) => void;
  rankedExperts: RankedExpert[];
  onSelectExpert: (id: string) => void;
  selectedExpertId: string;
}) {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Demand</p>
            <h2>Client requests</h2>
          </div>
          <button className="secondary-action" type="button" disabled>
            <ArrowRight size={16} />
            Intake
          </button>
        </div>

        <div className="request-list">
          {requests.map((request) => (
            <button
              key={request.id}
              aria-pressed={selectedRequestId === request.id}
              className={`request-row ${selectedRequestId === request.id ? "active" : ""}`}
              onClick={() => onSelectRequest(request.id)}
              type="button"
            >
              <div>
                <span className="ticket">{request.id}</span>
                <strong>{request.title}</strong>
                <p>{request.context}</p>
              </div>
              <div className="request-meta">
                <span>{money.format(request.budgetUsd)}</span>
                <small>{request.deadline}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Match</p>
            <h2>Best experts</h2>
          </div>
          <span className="small-pill">{selectedRequest.needs.length} needs</span>
        </div>

        <div className="expert-list">
          {rankedExperts.map((expert) => (
            <button
              key={expert.id}
              aria-pressed={selectedExpertId === expert.id}
              className={`expert-row ${selectedExpertId === expert.id ? "active" : ""}`}
              onClick={() => onSelectExpert(expert.id)}
              type="button"
            >
              <div className="avatar">{expert.name.slice(0, 2)}</div>
              <div>
                <strong>{expert.name}</strong>
                <span>
                  {expert.role}, {expert.company}
                </span>
                <div className="tag-row">
                  {expert.tags.slice(0, 3).map((tag) => (
                    <small key={tag}>{tag}</small>
                  ))}
                </div>
              </div>
              <b>{expert.matchScore}</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScoutView({
  selectedRequest,
  selectedExpert,
  rankedExperts,
  draft,
  copyState,
  onCopy,
  onSelectExpert
}: {
  selectedRequest: ClientRequest;
  selectedExpert: RankedExpert;
  rankedExperts: RankedExpert[];
  draft: string;
  copyState: "idle" | "copied" | "failed";
  onCopy: () => void;
  onSelectExpert: (id: string) => void;
}) {
  return (
    <div className="content-grid scout-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Scout</p>
            <h2>Source list</h2>
          </div>
          <Search size={18} />
        </div>
        <div className="expert-list compact">
          {rankedExperts.map((expert) => (
            <button
              key={expert.id}
              aria-pressed={selectedExpert.id === expert.id}
              className={`expert-row ${selectedExpert.id === expert.id ? "active" : ""}`}
              onClick={() => onSelectExpert(expert.id)}
              type="button"
            >
              <div className="avatar">{expert.name.slice(0, 2)}</div>
              <div>
                <strong>{expert.name}</strong>
                <span>{expert.availability}</span>
              </div>
              <b>{expert.matchScore}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Draft only</p>
            <h2>LinkedIn outreach</h2>
          </div>
          <span className="manual-pill">
            <Lock size={14} />
            Human send
          </span>
        </div>

        <div className="draft-shell">
          <div className="draft-context">
            <span>{selectedRequest.client}</span>
            <strong>{selectedRequest.title}</strong>
            <p>
              {selectedExpert.name} matches at {selectedExpert.matchScore}/100
              with {money.format(selectedExpert.rateUsd)} hourly rate.
            </p>
          </div>
          <textarea value={draft} readOnly aria-label="Outreach draft" />
          <div className="draft-actions">
            <button className="secondary-action" onClick={onCopy} type="button">
              {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
              {copyState === "failed"
                ? "Copy failed"
                : copyState === "copied"
                  ? "Copied"
                  : "Copy"}
            </button>
            <button className="primary-action" type="button" disabled>
              <Send size={16} />
              Mark queued
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ApprovalsView({
  payoutQueue,
  approvalThresholdUsd,
  killSwitch
}: {
  payoutQueue: Payout[];
  approvalThresholdUsd: number;
  killSwitch: boolean;
}) {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Money movement</p>
            <h2>Payout approvals</h2>
          </div>
          <span className={killSwitch ? "danger-pill" : "small-pill"}>
            {killSwitch ? <PauseCircle size={14} /> : <ShieldCheck size={14} />}
            {killSwitch ? "Halted" : "Active"}
          </span>
        </div>

        <div className="payout-list">
          {payoutQueue.map((payout) => {
            const needsApproval = payout.amountUsd >= approvalThresholdUsd;

            return (
              <article key={payout.id} className="payout-row">
                <div className="metric-icon">
                  <BadgeDollarSign size={20} />
                </div>
                <div>
                  <strong>{payout.expertName}</strong>
                  <p>{payout.reason}</p>
                  <span className={needsApproval ? "warn-text" : "good-text"}>
                    {needsApproval ? "Approval required" : "Ready below threshold"}
                  </span>
                </div>
                <div className="payout-actions">
                  <b>{money.format(payout.amountUsd)}</b>
                  <button
                    className={needsApproval ? "secondary-action" : "primary-action"}
                    disabled
                    type="button"
                  >
                    {needsApproval ? "Review" : "Release"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Ops</p>
            <h2>Checks</h2>
          </div>
          <AlertTriangle size={18} />
        </div>
        <div className="check-list">
          <CheckRow label="PayPal mode" value="Sandbox" done />
          <CheckRow label="Large payouts" value="Manual approval" done />
          <CheckRow label="LinkedIn sends" value="Draft only" done />
          <CheckRow label="Agent loop" value="Config gated" done={!killSwitch} />
        </div>
      </section>
    </div>
  );
}

function CheckRow({
  label,
  value,
  done
}: {
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className="check-row">
      <div className={done ? "check-icon done" : "check-icon"}>
        {done ? <Check size={15} /> : <AlertTriangle size={15} />}
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
