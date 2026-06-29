export type StoredUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

export type UserRole =
  | "ADMIN"
  | "SALES"
  | "ACCOUNTMANAGER"
  | "OPERATIONS"
  | "FINANCE"
  | "VIEWER";

export const ALL_AUTHENTICATED_ROLES: readonly UserRole[] = [
  "ADMIN",
  "SALES",
  "ACCOUNTMANAGER",
  "OPERATIONS",
  "FINANCE",
  "VIEWER",
];

export const BUSINESS_WRITE_ROLES: readonly UserRole[] = [
  "ADMIN",
  "SALES",
  "ACCOUNTMANAGER",
  "OPERATIONS",
];

export const OPERATIONS_AND_FINANCE_WRITE_ROLES: readonly UserRole[] = [
  "ADMIN",
  "OPERATIONS",
  "FINANCE",
];

export const FINANCE_WRITE_ROLES: readonly UserRole[] = ["ADMIN", "FINANCE"];

export const INTEGRATIONS_ROLES: readonly UserRole[] = ["ADMIN", "FINANCE"];

export const SETTINGS_ROLES: readonly UserRole[] = ["ADMIN"];

/**
 * Frontend role abstractions used by route guards and sidebar rendering.
 * Keep these groups aligned with backend RBAC and docs/ROLE_ACCESS.md.
 */
export const MODULE_ACCESS = {
  DASHBOARD: ALL_AUTHENTICATED_ROLES,
  CRM: ALL_AUTHENTICATED_ROLES,
  OPERATIONS_AND_FINANCE: ALL_AUTHENTICATED_ROLES,
  INTEGRATIONS: ALL_AUTHENTICATED_ROLES,
  SETTINGS: ALL_AUTHENTICATED_ROLES,
  ADMIN_ONLY: ["ADMIN"] as const,
} as const;

function normalizeRole(role?: string | null): string {
  return String(role || "")
    .trim()
    .toUpperCase();
}

export function readStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;

  const rawUser = window.localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as StoredUser;
  } catch {
    return null;
  }
}

export function hasAdminAccess(role?: string | null) {
  return normalizeRole(role) === "ADMIN";
}

export function hasAnyRole(
  role: string | null | undefined,
  allowedRoles: readonly UserRole[],
) {
  return allowedRoles.includes(normalizeRole(role) as UserRole);
}

export function canAccessModule(
  role: string | null | undefined,
  module:
    | "DASHBOARD"
    | "CRM"
    | "OPERATIONS_AND_FINANCE"
    | "INTEGRATIONS"
    | "SETTINGS"
    | "ADMIN_ONLY",
) {
  return hasAnyRole(role, MODULE_ACCESS[module]);
}

export function canManageIntegrations(role?: string | null) {
  return hasAnyRole(role, INTEGRATIONS_ROLES);
}

export function canManageSettings(role?: string | null) {
  return hasAnyRole(role, SETTINGS_ROLES);
}

export function canBusinessWrite(role?: string | null) {
  return hasAnyRole(role, BUSINESS_WRITE_ROLES);
}

export function canOperationsAndFinanceWrite(role?: string | null) {
  return hasAnyRole(role, OPERATIONS_AND_FINANCE_WRITE_ROLES);
}

export function canFinanceWrite(role?: string | null) {
  return hasAnyRole(role, FINANCE_WRITE_ROLES);
}
