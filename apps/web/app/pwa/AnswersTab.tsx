"use client";

import { Bot, CheckCircle2, Inbox, SendHorizontal, User } from "lucide-react";
import type { ClaimedQuestion } from "./types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export function AnswersTab({
  claimed,
  onDraftChange,
  onSubmit
}: {
  claimed: ClaimedQuestion[];
  onDraftChange: (id: string, value: string) => void;
  onSubmit: (id: string) => void;
}) {
  if (claimed.length === 0) {
    return (
      <div className="pwa-empty" role="status">
        <span className="pwa-empty-icon" aria-hidden="true">
          <Inbox size={26} />
        </span>
        <h2>No claimed questions yet</h2>
        <p>Swipe right on a question in the Queue to claim it. It will show up here to answer.</p>
      </div>
    );
  }

  return (
    <ul className="answer-list">
      {claimed.map((question) => {
        const answered = question.status === "answered";
        return (
          <li className="answer-card" key={question.id}>
            <div className="answer-card-head">
              <span className={`swipe-source ${question.source}`}>
                {question.source === "agent" ? <Bot size={14} /> : <User size={14} />}
                {question.sourceLabel}
              </span>
              {answered ? (
                <span className="status-pill pending">
                  <CheckCircle2 size={13} /> Pending review
                </span>
              ) : (
                <span className="status-pill open">Claimed</span>
              )}
            </div>

            <h2 className="answer-card-title">{question.title}</h2>
            <p className="answer-card-detail">{question.detail}</p>

            <div className="answer-card-meta">
              <span>{question.domain}</span>
              <span>{money.format(question.reward)}</span>
              <span>SLA {question.sla}</span>
            </div>

            {answered ? (
              <div className="answer-readonly">
                <span className="answer-readonly-label">Your answer</span>
                <p>{question.answer}</p>
              </div>
            ) : (
              <>
                <label className="answer-label" htmlFor={`answer-${question.id}`}>
                  Your answer
                </label>
                <textarea
                  className="answer-textarea"
                  id={`answer-${question.id}`}
                  onChange={(event) => onDraftChange(question.id, event.target.value)}
                  placeholder="Write a clear, reviewed answer…"
                  rows={4}
                  value={question.answer}
                />
                <button
                  className="button-primary answer-submit"
                  disabled={question.answer.trim().length === 0}
                  onClick={() => onSubmit(question.id)}
                  type="button"
                >
                  <SendHorizontal size={16} />
                  Submit answer
                </button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
