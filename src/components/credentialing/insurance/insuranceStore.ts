import { useSyncExternalStore } from "react";
import {
  payerTypeOptions,
  reCredentialingCycleOptions,
  type InsuranceFormState,
  type InsurancePlan,
  type InsuranceRecord,
} from "./types";

const STORAGE_KEY = "tristate.insurance.records";
const STORE_EVENT = "tristate:insurance-change";
let cachedSnapshot: InsuranceRecord[] | null = null;
let cachedStorageValue: string | null = null;
let cachedSeedSnapshot: InsuranceRecord[] | null = null;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateInputFromDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function formatDateLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function nowIso() {
  return new Date().toISOString();
}

function localDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateInputFromDate(date);
}

function normalizePlan(plan: Partial<InsurancePlan>): InsurancePlan {
  return {
    id: plan.id || crypto.randomUUID(),
    planName: plan.planName || "",
    planId: plan.planId || "",
    createdAt: plan.createdAt || nowIso(),
    updatedAt: plan.updatedAt || nowIso(),
  };
}

function normalizeRecord(
  record: Partial<InsuranceRecord>,
): InsuranceRecord {
  return {
    id: record.id || crypto.randomUUID(),
    payerName: record.payerName || "",
    payerType: payerTypeOptions.includes(
      record.payerType as (typeof payerTypeOptions)[number],
    )
      ? (record.payerType as InsuranceRecord["payerType"])
      : payerTypeOptions[0],
    contact: record.contact || "",
    turnaroundTime: record.turnaroundTime || "",
    reCredentialingCycle: reCredentialingCycleOptions.includes(
      record.reCredentialingCycle as (typeof reCredentialingCycleOptions)[number],
    )
      ? (record.reCredentialingCycle as InsuranceRecord["reCredentialingCycle"])
      : reCredentialingCycleOptions[1],
    plans: (record.plans || []).map(normalizePlan),
    createdAt: record.createdAt || nowIso(),
    updatedAt: record.updatedAt || nowIso(),
  };
}

function createSeedRecords(): InsuranceRecord[] {
  return [
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Aetna",
      payerType: "Commercial",
      contact: "provider@aetna.com",
      turnaroundTime: "45 days",
      reCredentialingCycle: "Every 2 Years",
      createdAt: localDateOffset(-120),
      updatedAt: localDateOffset(-2),
      plans: [
        { planName: "Aetna Choice POS II", planId: "11111" },
        { planName: "Aetna HMO", planId: "11112" },
      ] as InsurancePlan[],
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Blue Cross Blue Shield",
      payerType: "Commercial",
      contact: "credentialing@bcbs.com",
      turnaroundTime: "60 days",
      reCredentialingCycle: "Every 3 Years",
      createdAt: localDateOffset(-100),
      updatedAt: localDateOffset(-5),
      plans: [
        { planName: "BCBS PPO", planId: "22221" },
        { planName: "BCBS HMO", planId: "22222" },
        { planName: "BCBS Blue Choice", planId: "22223" },
      ] as InsurancePlan[],
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Cigna",
      payerType: "Managed Care",
      contact: "network@cigna.com",
      turnaroundTime: "30 days",
      reCredentialingCycle: "Every 2 Years",
      createdAt: localDateOffset(-90),
      updatedAt: localDateOffset(-10),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "UnitedHealthcare",
      payerType: "Commercial",
      contact: "provider@uhc.com",
      turnaroundTime: "45 days",
      reCredentialingCycle: "Annually",
      createdAt: localDateOffset(-80),
      updatedAt: localDateOffset(-3),
      plans: [
        { planName: "United Health Care", planId: "87726" },
      ] as InsurancePlan[],
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Humana",
      payerType: "Medicare",
      contact: "credentialing@humana.com",
      turnaroundTime: "60 days",
      reCredentialingCycle: "Annually",
      createdAt: localDateOffset(-70),
      updatedAt: localDateOffset(-7),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Kaiser Permanente",
      payerType: "Managed Care",
      contact: "provider@kaiser.org",
      turnaroundTime: "90 days",
      reCredentialingCycle: "Every 2 Years",
      createdAt: localDateOffset(-60),
      updatedAt: localDateOffset(-1),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Medicaid",
      payerType: "Government",
      contact: "provider@medicaid.gov",
      turnaroundTime: "60 days",
      reCredentialingCycle: "Annually",
      createdAt: localDateOffset(-50),
      updatedAt: localDateOffset(-4),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Medicare",
      payerType: "Medicare",
      contact: "provider@medicare.gov",
      turnaroundTime: "45 days",
      reCredentialingCycle: "Every 3 Years",
      createdAt: localDateOffset(-40),
      updatedAt: localDateOffset(-6),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Molina Healthcare",
      payerType: "Medicaid",
      contact: "credentialing@molina.com",
      turnaroundTime: "30 days",
      reCredentialingCycle: "Annually",
      createdAt: localDateOffset(-30),
      updatedAt: localDateOffset(-8),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      payerName: "Anthem",
      payerType: "Commercial",
      contact: "provider@anthem.com",
      turnaroundTime: "45 days",
      reCredentialingCycle: "Every 2 Years",
      createdAt: localDateOffset(-20),
      updatedAt: localDateOffset(-9),
    }),
  ];
}

function getSeedSnapshot() {
  if (!cachedSeedSnapshot) {
    cachedSeedSnapshot = createSeedRecords();
  }
  return cachedSeedSnapshot;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readRecordsFromStorage(): InsuranceRecord[] {
  if (!isBrowser()) return getSeedSnapshot();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = getSeedSnapshot();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    cachedSnapshot = seed;
    cachedStorageValue = JSON.stringify(seed);
    return seed;
  }

  if (raw === cachedStorageValue && cachedSnapshot) {
    return cachedSnapshot;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<InsuranceRecord>[];
    const nextSnapshot = Array.isArray(parsed)
      ? parsed.map((record) => normalizeRecord(record))
      : getSeedSnapshot();
    cachedSnapshot = nextSnapshot;
    cachedStorageValue = raw;
    return nextSnapshot;
  } catch {
    const seed = getSeedSnapshot();
    cachedSnapshot = seed;
    cachedStorageValue = JSON.stringify(seed);
    return seed;
  }
}

function writeRecords(records: InsuranceRecord[]) {
  if (!isBrowser()) return;
  const normalized = records.map((record) => normalizeRecord(record));
  const serialized = JSON.stringify(normalized);
  cachedSnapshot = normalized;
  cachedStorageValue = serialized;
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function getInsuranceRecords() {
  return readRecordsFromStorage();
}

export function setInsuranceRecords(records: InsuranceRecord[]) {
  writeRecords(records);
}

export function useInsuranceRecords() {
  return useSyncExternalStore(
    (callback) => {
      if (!isBrowser()) return () => undefined;
      window.addEventListener(STORE_EVENT, callback);
      window.addEventListener("storage", callback);
      return () => {
        window.removeEventListener(STORE_EVENT, callback);
        window.removeEventListener("storage", callback);
      };
    },
    readRecordsFromStorage,
    getSeedSnapshot,
  );
}

export function buildInsuranceRecord(
  previousRecord: InsuranceRecord | null,
  form: InsuranceFormState,
) {
  const timestamp = nowIso();
  return normalizeRecord({
    id: previousRecord?.id || crypto.randomUUID(),
    payerName: form.payerName.trim(),
    payerType: form.payerType,
    contact: form.contact.trim(),
    turnaroundTime: form.turnaroundTime.trim(),
    reCredentialingCycle: form.reCredentialingCycle,
    plans: previousRecord?.plans || [],
    createdAt: previousRecord?.createdAt || timestamp,
    updatedAt: timestamp,
  });
}

export function createInsuranceFormState(
  record?: InsuranceRecord | null,
): InsuranceFormState {
  return {
    payerName: record?.payerName || "",
    payerType: record?.payerType || payerTypeOptions[0],
    contact: record?.contact || "",
    turnaroundTime: record?.turnaroundTime || "",
    reCredentialingCycle:
      record?.reCredentialingCycle || reCredentialingCycleOptions[1],
  };
}

export function addPlanToPayer(
  payerId: string,
  plan: { planName: string; planId?: string },
) {
  const records = readRecordsFromStorage();
  const next = records.map((record) => {
    if (record.id !== payerId) return record;
    return {
      ...record,
      updatedAt: nowIso(),
      plans: [
        ...record.plans,
        normalizePlan({
          planName: plan.planName,
          planId: plan.planId || "",
        }),
      ],
    };
  });
  writeRecords(next);
}

export function updatePlan(
  payerId: string,
  planId: string,
  updates: { planName?: string; planId?: string },
) {
  const records = readRecordsFromStorage();
  const next = records.map((record) => {
    if (record.id !== payerId) return record;
    return {
      ...record,
      updatedAt: nowIso(),
      plans: record.plans.map((plan) =>
        plan.id === planId
          ? { ...plan, ...updates, updatedAt: nowIso() }
          : plan,
      ),
    };
  });
  writeRecords(next);
}

export function removePlan(payerId: string, planId: string) {
  const records = readRecordsFromStorage();
  const next = records.map((record) => {
    if (record.id !== payerId) return record;
    return {
      ...record,
      updatedAt: nowIso(),
      plans: record.plans.filter((plan) => plan.id !== planId),
    };
  });
  writeRecords(next);
}
