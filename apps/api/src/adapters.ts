import type {
  DailyReservation,
  ExpertEligibility,
  ExpertEligibilityPort,
  PayoutTotalsPort,
} from "@high-bar/payments";
import type { ApiKeyPort, ApiKeyRecord } from "@high-bar/mcp-expert-network";
import type { Repository } from "./repository.js";

/**
 * Backs the PayoutPolicyEngine's eligibility allowlist with the Repository.
 * Returns null for unknown experts so the engine fail-closes to a DENY.
 */
export class RepositoryEligibilityPort implements ExpertEligibilityPort {
  constructor(private readonly repo: Repository) {}

  async getEligibility(expertId: string): Promise<ExpertEligibility | null> {
    const expert = await this.repo.getExpert(expertId);
    if (!expert) return null;
    return {
      status: expert.status,
      kycStatus: expert.kycStatus,
      stripeConnectAccountId: expert.stripeConnectAccountId,
    };
  }
}

/**
 * Backs the daily-cap gate. The atomic `reserveDailyAmount` is wired ONLY when
 * the repo exposes one (in-memory, or a DB-level atomic counter); otherwise the
 * engine falls back to the non-atomic `sentTodayCents` comparison.
 */
export class RepositoryTotalsPort implements PayoutTotalsPort {
  private readonly repo: Repository;

  /** Present only when the backing repo supports an atomic reserve-and-check. */
  reserveDailyAmount?: (amountCents: number, dailyCapCents: number) => Promise<DailyReservation>;

  constructor(repo: Repository) {
    this.repo = repo;
    if (repo.reserveDailyAmount) {
      const reserve = repo.reserveDailyAmount.bind(repo);
      this.reserveDailyAmount = (amountCents, dailyCapCents) => reserve(amountCents, dailyCapCents);
    }
  }

  sentTodayCents(): Promise<number> {
    return this.repo.sentTodayCents();
  }
}

/** Backs the agent surface's API-key auth with hashed lookups in the Repository. */
export class RepositoryApiKeyPort implements ApiKeyPort {
  constructor(private readonly repo: Repository) {}

  lookup(hashedKey: string): Promise<ApiKeyRecord | null> {
    return this.repo.lookupApiKey(hashedKey);
  }
}
