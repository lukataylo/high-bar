import { createHash } from "node:crypto";

/**
 * Resolved, NON-SECRET view of an API key. The raw secret is never represented
 * in memory beyond the moment it is hashed at the edge.
 */
export interface ApiKeyRecord {
  readonly scopes: readonly string[];
  readonly rateLimitPerMin: number;
}

/**
 * PORT: look up an API key by the sha-256 hash of the presented secret. MUST
 * return null for unknown AND revoked keys — callers never see why.
 */
export interface ApiKeyPort {
  lookup(hashedKey: string): Promise<ApiKeyRecord | null>;
}

/** sha-256 hex digest of the presented key. We store/compare hashes only. */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/** A scope grants access to a route; `submit_question` requires `questions:write`. */
export function hasScope(record: ApiKeyRecord, scope: string): boolean {
  return record.scopes.includes(scope);
}

/** Seed shape for the in-memory key store. `revoked` keys resolve to null. */
export interface SeedApiKey {
  readonly rawKey: string;
  readonly scopes: readonly string[];
  readonly rateLimitPerMin: number;
  readonly revoked?: boolean;
}

interface StoredKey extends ApiKeyRecord {
  readonly revoked: boolean;
}

/**
 * In-memory {@link ApiKeyPort}. Seeds are indexed by hash on construction; the
 * raw secret is discarded immediately.
 */
export class InMemoryApiKeyStore implements ApiKeyPort {
  private readonly byHash = new Map<string, StoredKey>();

  constructor(seeds: readonly SeedApiKey[] = []) {
    for (const seed of seeds) {
      this.byHash.set(hashApiKey(seed.rawKey), {
        scopes: [...seed.scopes],
        rateLimitPerMin: seed.rateLimitPerMin,
        revoked: seed.revoked === true,
      });
    }
  }

  lookup(hashedKey: string): Promise<ApiKeyRecord | null> {
    const found = this.byHash.get(hashedKey);
    if (!found || found.revoked) {
      return Promise.resolve(null);
    }
    return Promise.resolve({ scopes: found.scopes, rateLimitPerMin: found.rateLimitPerMin });
  }
}

/**
 * PORT: per-key rate limit. `take` consumes one token, returning false when the
 * caller has exceeded its allowance.
 */
export interface RateLimitStore {
  take(key: string, ratePerMin: number): Promise<boolean>;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * In-memory token-bucket limiter. Capacity equals the per-minute allowance and
 * refills continuously at `ratePerMin / 60s`. Keyed by the hashed API key, so
 * raw secrets never reach the limiter.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  take(key: string, ratePerMin: number): Promise<boolean> {
    const capacity = Math.max(1, ratePerMin);
    const refillPerMs = capacity / 60_000;
    const now = this.now();

    const existing = this.buckets.get(key);
    let tokens = capacity;
    if (existing) {
      const elapsed = Math.max(0, now - existing.updatedAt);
      tokens = Math.min(capacity, existing.tokens + elapsed * refillPerMs);
    }

    if (tokens < 1) {
      this.buckets.set(key, { tokens, updatedAt: now });
      return Promise.resolve(false);
    }

    this.buckets.set(key, { tokens: tokens - 1, updatedAt: now });
    return Promise.resolve(true);
  }
}
