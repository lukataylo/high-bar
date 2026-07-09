/**
 * Typed errors for the payments package. These NEVER embed secrets, API keys,
 * client secrets, or PII — only a stable `code` plus non-sensitive context so
 * they are safe to log and surface.
 */

export type PaymentsErrorCode =
  | "config_error"
  | "invalid_input"
  | "missing_idempotency_key";

export class PaymentsError extends Error {
  readonly code: PaymentsErrorCode;

  constructor(code: PaymentsErrorCode, message: string) {
    super(message);
    this.name = "PaymentsError";
    this.code = code;
    // Restore prototype chain for instanceof across transpilation targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when required configuration (env vars) is missing or invalid. */
export class ConfigError extends PaymentsError {
  constructor(message: string) {
    super("config_error", message);
    this.name = "ConfigError";
  }
}

/** Thrown when caller-supplied arguments fail validation. */
export class InvalidInputError extends PaymentsError {
  constructor(message: string) {
    super("invalid_input", message);
    this.name = "InvalidInputError";
  }
}
