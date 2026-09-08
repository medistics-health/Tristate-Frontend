import React from "react";
import { Clock } from "lucide-react";
import { readStoredUser } from "./auth";

export type ActivityLogEntry = {
  id: string;
  action: string;
  details?: string;
  actor?: string;
  userName?: string;
  createdAt: string; // ISO string
};

/**
 * Normalizes an activity log entry so that actor and userName are always populated.
 * If neither is provided, defaults to "System".
 */
export function normalizeLogEntry(entry: any): ActivityLogEntry {
  const actor = entry.actor || entry.userName || entry.user || "System";
  return {
    id: entry.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    action: entry.action || "Activity",
    details: entry.details,
    actor,
    userName: actor,
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

/**
 * Extracts current user's name from localStorage user object.
 * Checks user.name, firstName + lastName, userName, and email in order.
 */
export function getCurrentUserName(): string {
  if (typeof window === "undefined") return "Admin";

  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) return "Admin";

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return "Admin";

    const fullName = [parsed.firstName, parsed.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fullName) return fullName;
    if (parsed.name && typeof parsed.name === "string" && parsed.name.trim()) {
      return parsed.name.trim();
    }
    if (parsed.userName && typeof parsed.userName === "string" && parsed.userName.trim()) {
      return parsed.userName.trim();
    }
    if (parsed.email && typeof parsed.email === "string" && parsed.email.trim()) {
      return parsed.email.trim();
    }
  } catch {
    // fallback
  }

  const stored = readStoredUser();
  if (stored) {
    const name = [stored.firstName, stored.lastName].filter(Boolean).join(" ").trim();
    if (name) return name;
    if (typeof stored.name === "string" && stored.name.trim()) return stored.name.trim();
    if (stored.email) return stored.email;
  }

  return "Admin";
}

/**
 * Formats ISO timestamp to human friendly label (e.g. Sep 7, 2026, 10:30 AM)
 */
export function formatActivityDateTime(isoDate?: string | null): string {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return String(isoDate);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Compares two objects and generates a human-readable list of changes.
 * Returns null if no actual changes occurred (helps prevent duplicate empty logs).
 */
export function detectFieldChanges(
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  fieldLabels: Record<string, string>,
): string[] {
  const changes: string[] = [];

  for (const key of Object.keys(fieldLabels)) {
    const label = fieldLabels[key];
    const oldVal = oldValues[key] !== undefined && oldValues[key] !== null ? String(oldValues[key]).trim() : "";
    const newVal = newValues[key] !== undefined && newValues[key] !== null ? String(newValues[key]).trim() : "";

    if (oldVal !== newVal) {
      if (!oldVal && newVal) {
        changes.push(`Set ${label} to "${newVal}"`);
      } else if (oldVal && !newVal) {
        changes.push(`Cleared ${label} (was "${oldVal}")`);
      } else {
        changes.push(`${label} changed from "${oldVal}" to "${newVal}"`);
      }
    }
  }

  return changes;
}

const STORAGE_PREFIX = "pm_activity_logs_";

/**
 * Loads activity logs for an entity from localStorage combined with any server-provided logs.
 * Deduplicates entries by matching action + details + timestamp window.
 */
export function getEntityActivityLogs(
  entityType: string,
  entityId: string,
  initialLogs?: ActivityLogEntry[],
): ActivityLogEntry[] {
  if (typeof window === "undefined" || !entityId) return (initialLogs || []).map(normalizeLogEntry);

  let storedLogs: ActivityLogEntry[] = [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${entityType}_${entityId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        storedLogs = parsed.map(normalizeLogEntry);
      }
    }
  } catch (err) {
    console.error("Failed to parse stored activity logs:", err);
  }

  // If user has saved logs in localStorage, those take precedence over default/fallback initialLogs
  if (storedLogs.length > 0) {
    return deduplicateLogs(storedLogs);
  }

  const normalizedInitial = (initialLogs || []).map(normalizeLogEntry);
  if (normalizedInitial.length > 0) {
    // Persist the initial fallback log so it remains consistent
    try {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${entityType}_${entityId}`,
        JSON.stringify(normalizedInitial),
      );
    } catch {
      // ignore
    }
  }

  return deduplicateLogs(normalizedInitial);
}

/**
 * Saves activity logs for an entity to localStorage.
 */
export function saveEntityActivityLogs(
  entityType: string,
  entityId: string,
  logs: ActivityLogEntry[],
): void {
  if (typeof window === "undefined" || !entityId) return;

  try {
    const clean = deduplicateLogs(logs);
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${entityType}_${entityId}`,
      JSON.stringify(clean),
    );
  } catch (err) {
    console.error("Failed to save activity logs to localStorage:", err);
  }
}

/**
 * Appends a new activity log entry while strictly checking for duplicates.
 * Avoids duplicate logs if identical action & details occurred within 15 seconds or are identical to latest.
 */
export function appendActivityLog(
  existingLogs: ActivityLogEntry[],
  newEntry: {
    id?: string;
    action: string;
    details?: string;
    actor?: string;
    userName?: string;
    createdAt?: string;
  },
): ActivityLogEntry[] {
  const normalized = normalizeLogEntry({
    ...newEntry,
    actor: newEntry.actor || newEntry.userName || getCurrentUserName(),
  });

  const createdAt = normalized.createdAt;
  const details = (normalized.details || "").trim();
  const action = normalized.action.trim();

  // Check if identical to the latest entry
  if (existingLogs.length > 0) {
    const latest = existingLogs[0];
    if (
      latest.action.toLowerCase() === action.toLowerCase() &&
      (latest.details || "").trim().toLowerCase() === details.toLowerCase()
    ) {
      const timeDiff = Math.abs(
        new Date(createdAt).getTime() - new Date(latest.createdAt).getTime(),
      );
      // Within 15 seconds, suppress duplicate
      if (isNaN(timeDiff) || timeDiff < 15000) {
        return existingLogs;
      }
    }
  }

  return [normalized, ...existingLogs];
}

/**
 * Deduplicates an array of activity logs based on ID or action+details+timestamp similarity.
 */
export function deduplicateLogs(logs: ActivityLogEntry[]): ActivityLogEntry[] {
  const seenIds = new Set<string>();
  const result: ActivityLogEntry[] = [];

  for (const rawLog of logs) {
    if (!rawLog || !rawLog.action) continue;
    const log = normalizeLogEntry(rawLog);
    if (log.id && seenIds.has(log.id)) continue;

    // Check if duplicate of an already added log within close proximity
    const isDuplicate = result.some(
      (existing) =>
        existing.action.toLowerCase() === log.action.toLowerCase() &&
        (existing.details || "").toLowerCase() === (log.details || "").toLowerCase() &&
        Math.abs(new Date(existing.createdAt).getTime() - new Date(log.createdAt).getTime()) < 10000,
    );

    if (!isDuplicate) {
      if (log.id) seenIds.add(log.id);
      result.push(log);
    }
  }

  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Renders individual bullet points for semicolon-separated details strings.
 */
export function renderActivityDetails(details?: string, action?: string) {
  if (!details) return null;
  const cleaned = details.replace(/\[reminderKey:[^\]]+\]\s*/g, "").trim();
  const actionNorm = (action || "").toLowerCase().trim();

  const items = cleaned
    .split(";")
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false;
      const norm = item.toLowerCase();
      if (norm === "activity recorded" || norm === "details updated") return false;
      if (actionNorm && norm === actionNorm) return false;
      return true;
    });

  if (items.length === 0) return null;

  return (
    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] text-slate-500">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Reusable Activity Log Section component designed to fit into view detail panels/modals.
 */
export function ActivityLogSection({
  logs,
  emptyMessage = "No activity recorded yet.",
}: {
  logs: ActivityLogEntry[];
  emptyMessage?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-slate-400" />
        <h4 className="text-[13px] font-semibold text-slate-700">
          Activity Log ({logs.length})
        </h4>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#ece8e1] bg-[#faf9f7] px-4 py-4 text-center text-[12px] text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
          {[...logs]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-[#f0ece6] bg-[#fbfaf8] px-3.5 py-2.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-slate-700">
                  {entry.action}
                </span>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {formatActivityDateTime(entry.createdAt)}
                </span>
              </div>
              {renderActivityDetails(entry.details, entry.action)}
              <div className="mt-1.5 text-[10.5px] font-medium uppercase tracking-wide text-slate-400">
                Logged by {entry.actor || entry.userName || "System"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
