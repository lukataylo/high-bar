import { describe, it, expect } from "vitest";
import {
  hashApiKey,
  hasScope,
  InMemoryApiKeyStore,
  InMemoryRateLimitStore,
} from "../auth.js";

describe("hashApiKey", () => {
  it("is a stable sha-256 hex digest that never equals the raw key", () => {
    const raw = "key_secret_value";
    const hashed = hashApiKey(raw);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).not.toContain(raw);
    expect(hashApiKey(raw)).toBe(hashed);
  });
});

describe("InMemoryApiKeyStore", () => {
  it("resolves a live key by hash and returns null for unknown/revoked", async () => {
    const store = new InMemoryApiKeyStore([
      { rawKey: "live", scopes: ["questions:read"], rateLimitPerMin: 60 },
      { rawKey: "dead", scopes: ["questions:read"], rateLimitPerMin: 60, revoked: true },
    ]);

    const live = await store.lookup(hashApiKey("live"));
    expect(live).not.toBeNull();
    expect(hasScope(live!, "questions:read")).toBe(true);

    expect(await store.lookup(hashApiKey("dead"))).toBeNull();
    expect(await store.lookup(hashApiKey("missing"))).toBeNull();
  });
});

describe("InMemoryRateLimitStore", () => {
  it("exhausts a bucket and refills over time", async () => {
    let now = 0;
    const store = new InMemoryRateLimitStore(() => now);
    const key = hashApiKey("limited");

    expect(await store.take(key, 1)).toBe(true);
    expect(await store.take(key, 1)).toBe(false);

    // After a full minute the bucket has refilled one token.
    now = 60_000;
    expect(await store.take(key, 1)).toBe(true);
  });
});
