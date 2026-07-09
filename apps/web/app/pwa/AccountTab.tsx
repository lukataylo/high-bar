"use client";

import { BadgeCheck, Check, LogOut, Pause } from "lucide-react";
import { ALL_DOMAINS } from "./data";
import type { Domain } from "./types";

export function AccountTab({
  displayName,
  email,
  domains,
  available,
  onNameChange,
  onEmailChange,
  onToggleDomain,
  onToggleAvailability,
  onSignOut
}: {
  displayName: string;
  email: string;
  domains: Domain[];
  available: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onToggleDomain: (domain: Domain) => void;
  onToggleAvailability: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="account-tab">
      <section className="account-section">
        <label className="account-label" htmlFor="account-name">
          Display name
        </label>
        <input
          className="account-input"
          id="account-name"
          onChange={(event) => onNameChange(event.target.value)}
          type="text"
          value={displayName}
        />

        <label className="account-label" htmlFor="account-email">
          Email
        </label>
        <input
          className="account-input"
          id="account-email"
          inputMode="email"
          onChange={(event) => onEmailChange(event.target.value)}
          type="email"
          value={email}
        />
      </section>

      <section className="account-section">
        <h2 className="account-heading">Areas of expertise</h2>
        <div className="chip-row" role="group" aria-label="Areas of expertise">
          {ALL_DOMAINS.map((domain) => {
            const active = domains.includes(domain);
            return (
              <button
                aria-pressed={active}
                className={`chip${active ? " active" : ""}`}
                key={domain}
                onClick={() => onToggleDomain(domain)}
                type="button"
              >
                {active ? <Check size={14} /> : null}
                {domain}
              </button>
            );
          })}
        </div>
      </section>

      <section className="account-section">
        <h2 className="account-heading">Availability</h2>
        <button
          aria-pressed={available}
          className={`availability-toggle${available ? " on" : " off"}`}
          onClick={onToggleAvailability}
          type="button"
        >
          <span className="availability-dot" aria-hidden="true" />
          {available ? "Available for new questions" : "Paused"}
          {available ? <Check size={16} /> : <Pause size={16} />}
        </button>
      </section>

      <section className="account-section">
        <h2 className="account-heading">Payout method</h2>
        <div className="payout-method">
          <span className="payout-method-main">
            <BadgeCheck size={18} />
            Stripe Connect
          </span>
          <span className="status-pill paid">Connected</span>
        </div>
      </section>

      <button className="signout-button" onClick={onSignOut} type="button">
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}
