export type StoredUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

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
  const normalizedRole = String(role || "").trim().toUpperCase();
  return (
    normalizedRole === "ADMIN" ||
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "INTERNAL"
  );
}
