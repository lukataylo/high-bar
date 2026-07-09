"use client";

import { AlarmClock } from "lucide-react";
import { formatRemaining, urgencyOf } from "./slaTime";
import styles from "./enhance.module.css";

/**
 * Presentational live countdown chip. The ticking `now` value is owned by the
 * page (one shared interval), so this component holds no timer of its own.
 */
export function Countdown({
  expiresAt,
  now,
  showLeft = true
}: {
  expiresAt: number;
  now: number;
  showLeft?: boolean;
}) {
  const remaining = expiresAt - now;
  const urgency = urgencyOf(remaining);
  const label = formatRemaining(remaining);
  const expired = urgency === "expired";

  return (
    <span
      aria-label={expired ? "Time to answer has expired" : `${label} left to answer`}
      className={`${styles.countdown} ${styles[urgency]}`}
      role="timer"
    >
      <AlarmClock aria-hidden="true" size={13} />
      <span className={styles.countdownTime}>{label}</span>
      {!expired && showLeft ? <span className={styles.countdownLeft}>left</span> : null}
    </span>
  );
}
