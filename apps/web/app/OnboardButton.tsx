"use client";

import { useState } from "react";

interface OnboardResponse {
  ok: boolean;
  onboardingUrl?: string;
  note?: string;
}

export function OnboardButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startOnboarding() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/experts/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = (await response.json()) as OnboardResponse;
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
        return;
      }
      setError(data.note ?? "Could not start onboarding.");
    } catch {
      setError("Could not reach the onboarding service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={startOnboarding} disabled={pending}>
        {pending ? "Starting…" : "Become a paid expert"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

export default OnboardButton;
