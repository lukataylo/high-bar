// Public surface of @high-bar/api — the backend wiring the High Bar packages
// into one guarded, idempotent flow.
export { createApp } from "./app.js";
export type { CreateAppOptions, BuiltApp } from "./app.js";

export { InMemoryRepository } from "./in-memory-repository.js";
export type { SeedApiKey } from "./in-memory-repository.js";
export { DrizzleRepository } from "./drizzle-repository.js";
export type { Repository } from "./repository.js";

export { RepositoryQuestionService } from "./question-service.js";
export type { QuestionServiceDeps } from "./question-service.js";

export {
  RepositoryApiKeyPort,
  RepositoryEligibilityPort,
  RepositoryTotalsPort,
} from "./adapters.js";

export { acceptQuestion, AcceptError } from "./money-path.js";
export type { AcceptOutcome, MoneyPathDeps } from "./money-path.js";

export { loadFinanceConfig } from "./finance.js";
export type { FinanceConfig } from "./finance.js";

export { DOMAIN_LABELS, PRICING, priceCardFor } from "./pricing.js";
export type { PriceCard } from "./pricing.js";
