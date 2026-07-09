"use client";

import { Clock3, DollarSign, LockKeyhole, Wallet } from "lucide-react";
import type { Payout } from "./types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export function EarningsTab({
  available,
  pending,
  paidOut,
  payouts
}: {
  available: number;
  pending: number;
  paidOut: number;
  payouts: Payout[];
}) {
  return (
    <div className="earnings-tab">
      <div className="earnings-cards">
        <article className="earnings-card primary">
          <span className="earnings-card-label">
            <Wallet size={15} /> Available
          </span>
          <strong>{money.format(available)}</strong>
        </article>
        <div className="earnings-card-row">
          <article className="earnings-card">
            <span className="earnings-card-label">
              <Clock3 size={15} /> Pending review
            </span>
            <strong>{money.format(pending)}</strong>
          </article>
          <article className="earnings-card">
            <span className="earnings-card-label">
              <DollarSign size={15} /> Paid out
            </span>
            <strong>{money.format(paidOut)}</strong>
          </article>
        </div>
      </div>

      <h2 className="earnings-heading">Payout history</h2>
      <ul className="payout-list">
        {payouts.map((payout) => (
          <li className="payout-row" key={payout.id}>
            <div className="payout-main">
              <span className="payout-question">{payout.question}</span>
              <span className="payout-date">{payout.date}</span>
            </div>
            <div className="payout-side">
              <span className="payout-amount">{money.format(payout.amount)}</span>
              <span className={`status-pill ${statusClass(payout.status)}`}>
                {payout.status}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="earnings-note">
        <LockKeyhole size={15} />
        Every payout passes the approval threshold, daily cap, and kill-switch policy before release.
      </p>
    </div>
  );
}

function statusClass(status: Payout["status"]): string {
  if (status === "Paid") {
    return "paid";
  }
  if (status === "Pending") {
    return "pending";
  }
  return "open";
}
