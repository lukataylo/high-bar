import type { UserRole } from "./domain/enums";

/** Coarse-grained permissions enforced at the API boundary. */
export type Permission =
  | "question:create"
  | "question:read_own"
  | "question:read_any"
  | "answer:create"
  | "answer:read_own"
  | "expert:apply"
  | "expert:vet"
  | "payout:approve"
  | "lead:read"
  | "outreach:approve"
  | "admin:all";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  asker: ["question:create", "question:read_own"],
  expert: ["answer:create", "answer:read_own", "expert:apply", "question:read_any"],
  admin: [
    "question:read_any",
    "expert:vet",
    "payout:approve",
    "lead:read",
    "outreach:approve",
    "admin:all",
  ],
};

export function permissionsFor(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function can(role: UserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes("admin:all") || perms.includes(permission);
}
