export type Urgency = "normal" | "warn" | "urgent" | "expired";

const FIFTEEN_MIN = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/** Classify how close a deadline is, for color treatment. */
export function urgencyOf(remainingMs: number): Urgency {
  if (remainingMs <= 0) {
    return "expired";
  }
  if (remainingMs <= FIFTEEN_MIN) {
    return "urgent";
  }
  if (remainingMs <= ONE_HOUR) {
    return "warn";
  }
  return "normal";
}

const pad = (value: number): string => value.toString().padStart(2, "0");

/**
 * Human-readable remaining time.
 * >= 1h → "23:41:07", < 1h → "47:12" (mm:ss), expired → "Expired".
 */
export function formatRemaining(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "Expired";
  }
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}
