// Public surface of @high-bar/agent-gateway: the hands-off autonomous loop.
export { Gateway } from "./gateway";
export type { GatewayDeps, CycleSummary } from "./gateway";

export { GatewayPolicyEngine } from "./policy";
export type { GatewayPolicyEngineDeps } from "./policy";

export { GatewayScheduler } from "./scheduler";
export type { SchedulerDeps, RunLoopOptions } from "./scheduler";

export { DeterministicRuntime } from "./runtimes/deterministic";
export type { DeterministicRuntimeOptions } from "./runtimes/deterministic";

export { HermesRuntime } from "./runtimes/hermes";
export type { HermesRuntimeOptions } from "./runtimes/hermes";

export type {
  ExecutorPorts,
  ApprovalQueue,
  ApprovalItem,
  AuditSink,
  EnvReader,
  LeadUpsertAction,
  OutreachDraftAction,
  PayoutCreateAction,
} from "./ports";
export { defaultEnvReader } from "./ports";

export {
  InMemoryAuditSink,
  InMemoryApprovalQueue,
  RecordingExecutors,
  AllowlistEligibilityPort,
  FixedPayoutTotals,
} from "./fakes";
