import { useSyncExternalStore } from "react";
import {
  contractTypeOptions,
  credentialingStatusOptions,
  lineOfBusinessOptions,
  priorityOptions,
  requestTypeOptions,
  verificationStatusOptions,
  type AllowedDocumentType,
  type ContractType,
  type CredentialingActivity,
  type CredentialingDocument,
  type CredentialingFollowUp,
  type CredentialingFormState,
  type CredentialingRecord,
  type CredentialingStatus,
  type LineOfBusiness,
  type Priority,
  type RequestType,
  type VerificationStatus,
} from "./types";

const STORAGE_KEY = "tristate.credentialing.records";
const STORE_EVENT = "tristate:credentialing-change";
let cachedSnapshot: CredentialingRecord[] | null = null;
let cachedStorageValue: string | null = null;
let cachedSeedSnapshot: CredentialingRecord[] | null = null;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
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

export function formatDateTimeLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getDaysLeft(value?: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function localDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateInputFromDate(date);
}

function addDays(value: string, days: number) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return formatDateInputFromDate(date);
}

function addYears(value: string, years: number) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setFullYear(date.getFullYear() + years);
  return formatDateInputFromDate(date);
}

function nowIso() {
  return new Date().toISOString();
}

function createActivity(
  action: string,
  details: string,
  actor = "Admin",
): CredentialingActivity {
  return {
    id: crypto.randomUUID(),
    action,
    details,
    actor,
    createdAt: nowIso(),
  };
}

function createFollowUp(
  summary: string,
  nextAction: string,
  dateTime: string = nowIso(),
): CredentialingFollowUp {
  return {
    id: crypto.randomUUID(),
    dateTime,
    channel: "Email",
    direction: "Outbound",
    referenceNumber: "",
    summary,
    nextAction,
    loggedBy: "Admin",
  };
}

function normalizeStatus(value?: string | null): CredentialingStatus {
  switch (value) {
    case "Not Started":
      return "Not Started";
    case "Application Submitted":
    case "Submitted":
      return "Application Submitted";
    case "In Process - Payer Review":
    case "In Progress":
      return "In Process - Payer Review";
    case "Pending Additional Info":
      return "Pending Additional Info";
    case "Contracted - Direct":
    case "Approved":
      return "Contracted - Direct";
    case "Contracted - IPA/Delegated":
      return "Contracted - IPA/Delegated";
    case "Out-of-Network (OON)":
      return "Out-of-Network (OON)";
    case "Declined / Application Rejected":
    case "Rejected":
      return "Declined / Application Rejected";
    case "Re-credentialing Due":
    case "Expired":
      return "Re-credentialing Due";
    case "Terminated":
    case "Closed":
      return "Terminated";
    default:
      return credentialingStatusOptions[0];
  }
}

function normalizeRequestType(value?: string | null): RequestType {
  switch (value) {
    case "New Credentialing":
    case "Initial Credentialing":
      return "New Credentialing";
    case "Re-credentialing":
    case "Recredentialing":
      return "Re-credentialing";
    case "Demographic Update":
    case "Revalidation":
      return "Demographic Update";
    case "Add Location":
    case "Termination":
      return "Add Location";
    default:
      return requestTypeOptions[0];
  }
}

function normalizeContractType(value?: string | null): ContractType {
  switch (value) {
    case "Direct Contract":
      return "Direct Contract";
    case "IPA-Delegated":
    case "IPA/Delegated":
      return "IPA-Delegated";
    case "Unknown - Pending Confirmation":
    case "Unknown-Pending Confirmation":
      return "Unknown - Pending Confirmation";
    default:
      return contractTypeOptions[2];
  }
}

function normalizeVerificationStatus(value?: string | null): VerificationStatus {
  switch (value) {
    case "Yes":
    case "No":
    case "Pending":
      return value;
    default:
      return verificationStatusOptions[2];
  }
}

function normalizePriority(value?: string | null): Priority {
  switch (value) {
    case "High":
    case "Medium":
    case "Low":
      return value;
    default:
      return priorityOptions[1];
  }
}

function normalizeLineOfBusiness(value?: string[] | null): LineOfBusiness[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is LineOfBusiness =>
    lineOfBusinessOptions.includes(entry as LineOfBusiness),
  );
}

function normalizeDocument(document: CredentialingDocument): CredentialingDocument {
  return {
    ...document,
    uploadedBy: document.uploadedBy || "Admin",
  };
}

function normalizeFollowUp(
  entry: CredentialingFollowUp,
): CredentialingFollowUp {
  return {
    ...entry,
    channel: entry.channel || "Email",
    direction: entry.direction || "Outbound",
    referenceNumber: entry.referenceNumber || "",
    summary: entry.summary || "",
    nextAction: entry.nextAction || "",
    loggedBy: entry.loggedBy || "Admin",
  };
}

function normalizeRecord(record: Partial<CredentialingRecord>): CredentialingRecord {
  const submissionDate = formatDateInput(record.submissionDate);
  const effectiveDate = formatDateInput(record.effectiveDate);
  const nextFollowUpDate = formatDateInput(record.nextFollowUpDate);
  const reCredentialingDueDate = formatDateInput(record.reCredentialingDueDate);
  const lastActivityDate = formatDateInput(record.lastActivityDate || record.updatedAt);
  const documents = Array.isArray(record.documents)
    ? record.documents.map((document) => normalizeDocument(document))
    : [];
  const followUpLogs = Array.isArray(record.followUpLogs)
    ? record.followUpLogs.map((entry) => normalizeFollowUp(entry))
    : [];
  const activity = Array.isArray(record.activity) ? record.activity : [];

  return {
    id: record.id || crypto.randomUUID(),
    credentialingId:
      record.credentialingId ||
      `CRD-${String(Date.now()).slice(-4)}`,
    practice: record.practice || "Default Practice",
    provider: record.provider || "",
    insuranceCompany: record.insuranceCompany || "",
    credentialingType: normalizeRequestType(record.credentialingType),
    contractType: normalizeContractType(record.contractType),
    ipaDelegatedEntityName: record.ipaDelegatedEntityName || "",
    status: normalizeStatus(record.status),
    payerProviderId: record.payerProviderId || "",
    assignedUser: record.assignedUser || "",
    priority: normalizePriority(record.priority),
    startDate: formatDateInput(record.startDate),
    submissionDate,
    effectiveDate,
    expirationDate: formatDateInput(record.expirationDate),
    nextFollowUpDate,
    reCredentialingDueDate:
      reCredentialingDueDate || (effectiveDate ? addYears(effectiveDate, 2) : ""),
    lastActivityDate: lastActivityDate || record.updatedAt || nowIso(),
    tinVerified: normalizeVerificationStatus(record.tinVerified),
    addressVerified: normalizeVerificationStatus(record.addressVerified),
    lineOfBusiness: normalizeLineOfBusiness(record.lineOfBusiness),
    documents,
    followUpLogs,
    activity,
    createdAt: record.createdAt || nowIso(),
    updatedAt: record.updatedAt || nowIso(),
  };
}

function createSeedRecords(): CredentialingRecord[] {
  const createdAt = new Date();
  return [
    normalizeRecord({
      id: crypto.randomUUID(),
      credentialingId: "CRD-1001",
      practice: "Tristate Family Care",
      provider: "Dr. Maya Rao",
      insuranceCompany: "Aetna",
      credentialingType: "New Credentialing",
      contractType: "Direct Contract",
      ipaDelegatedEntityName: "",
      status: "In Process - Payer Review",
      payerProviderId: "PID-44821",
      assignedUser: "Siddhi Gajjar",
      priority: "High",
      startDate: localDateOffset(-12),
      submissionDate: localDateOffset(-4),
      effectiveDate: localDateOffset(10),
      expirationDate: localDateOffset(365),
      nextFollowUpDate: localDateOffset(3),
      reCredentialingDueDate: localDateOffset(730),
      lastActivityDate: nowIso(),
      tinVerified: "Pending",
      addressVerified: "Yes",
      lineOfBusiness: ["PPO", "HMO"],
      documents: [
        {
          id: crypto.randomUUID(),
          name: "Board_Certificate.pdf",
          type: "Board Certificate",
          uploadedAt: nowIso(),
          uploadedBy: "Admin",
        },
        {
          id: crypto.randomUUID(),
          name: "CV_Dr_Maya_Rao.docx",
          type: "CV",
          uploadedAt: nowIso(),
          uploadedBy: "Admin",
        },
      ],
      followUpLogs: [createFollowUp("Waiting on board verification and packet review.", "Follow up on payer portal submission.")],
      activity: [
        createActivity("Created Credentialing", "Opened for Dr. Maya Rao"),
        createActivity("Document Uploaded", "Board certificate and CV added"),
        createActivity("Updated Status", "Moved to In Process - Payer Review"),
      ],
      createdAt: createdAt.toISOString(),
      updatedAt: nowIso(),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      credentialingId: "CRD-1002",
      practice: "Tristate Family Care",
      provider: "Dr. Daniel Mehta",
      insuranceCompany: "Blue Cross Blue Shield",
      credentialingType: "Re-credentialing",
      contractType: "IPA-Delegated",
      ipaDelegatedEntityName: "Metro IPA",
      status: "Application Submitted",
      payerProviderId: "PID-55102",
      assignedUser: "Nikhil Patel",
      priority: "Medium",
      startDate: localDateOffset(-26),
      submissionDate: localDateOffset(-1),
      effectiveDate: localDateOffset(18),
      expirationDate: localDateOffset(180),
      nextFollowUpDate: localDateOffset(5),
      reCredentialingDueDate: localDateOffset(720),
      lastActivityDate: nowIso(),
      tinVerified: "Yes",
      addressVerified: "Yes",
      lineOfBusiness: ["PPO"],
      documents: [
        {
          id: crypto.randomUUID(),
          name: "DEA.pdf",
          type: "DEA",
          uploadedAt: nowIso(),
          uploadedBy: "Admin",
        },
      ],
      followUpLogs: [createFollowUp("Application submitted to payer.", "Await acknowledgement and reference number.")],
      activity: [
        createActivity("Created Credentialing", "Opened for Dr. Daniel Mehta"),
        createActivity("Uploaded Document", "DEA document uploaded"),
        createActivity("Updated Status", "Moved to Application Submitted"),
      ],
      createdAt: createdAt.toISOString(),
      updatedAt: nowIso(),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      credentialingId: "CRD-1003",
      practice: "Northside Medical Group",
      provider: "Dr. Anika Shah",
      insuranceCompany: "Cigna",
      credentialingType: "New Credentialing",
      contractType: "Direct Contract",
      ipaDelegatedEntityName: "",
      status: "Contracted - Direct",
      payerProviderId: "PID-77314",
      assignedUser: "Riya Desai",
      priority: "Low",
      startDate: localDateOffset(-40),
      submissionDate: localDateOffset(-20),
      effectiveDate: localDateOffset(0),
      expirationDate: localDateOffset(340),
      nextFollowUpDate: localDateOffset(30),
      reCredentialingDueDate: localDateOffset(720),
      lastActivityDate: nowIso(),
      tinVerified: "Yes",
      addressVerified: "Yes",
      lineOfBusiness: ["EPO", "PPO"],
      documents: [
        {
          id: crypto.randomUUID(),
          name: "W9.pdf",
          type: "W9",
          uploadedAt: nowIso(),
          uploadedBy: "Admin",
        },
        {
          id: crypto.randomUUID(),
          name: "Insurance_Certificate.pdf",
          type: "Insurance Certificate",
          uploadedAt: nowIso(),
          uploadedBy: "Admin",
        },
      ],
      followUpLogs: [createFollowUp("Approval received and contract marked direct.", "Close the request and file contract.")],
      activity: [
        createActivity("Created Credentialing", "Opened for Dr. Anika Shah"),
        createActivity("Status Changed", "Approved by admin"),
        createActivity("Document Uploaded", "W9 and insurance certificate attached"),
      ],
      createdAt: createdAt.toISOString(),
      updatedAt: nowIso(),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      credentialingId: "CRD-1004",
      practice: "Northside Medical Group",
      provider: "Dr. Priya Nair",
      insuranceCompany: "UnitedHealthcare",
      credentialingType: "Demographic Update",
      contractType: "Unknown - Pending Confirmation",
      ipaDelegatedEntityName: "",
      status: "Declined / Application Rejected",
      payerProviderId: "",
      assignedUser: "Aman Khan",
      priority: "High",
      startDate: localDateOffset(-50),
      submissionDate: localDateOffset(-28),
      effectiveDate: "",
      expirationDate: localDateOffset(250),
      nextFollowUpDate: localDateOffset(7),
      reCredentialingDueDate: "",
      lastActivityDate: nowIso(),
      tinVerified: "Pending",
      addressVerified: "No",
      lineOfBusiness: ["HMO"],
      documents: [],
      followUpLogs: [createFollowUp("Missing license renewal document.", "Resubmit corrected packet.")],
      activity: [
        createActivity("Created Credentialing", "Opened for Dr. Priya Nair"),
        createActivity("Updated Status", "Marked as Declined / Application Rejected"),
      ],
      createdAt: createdAt.toISOString(),
      updatedAt: nowIso(),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      credentialingId: "CRD-1005",
      practice: "Tristate Family Care",
      provider: "Dr. Omar Farooq",
      insuranceCompany: "Humana",
      credentialingType: "Re-credentialing",
      contractType: "Direct Contract",
      ipaDelegatedEntityName: "",
      status: "Re-credentialing Due",
      payerProviderId: "PID-99201",
      assignedUser: "Siddhi Gajjar",
      priority: "High",
      startDate: localDateOffset(-120),
      submissionDate: localDateOffset(-100),
      effectiveDate: localDateOffset(-88),
      expirationDate: localDateOffset(-5),
      nextFollowUpDate: localDateOffset(-2),
      reCredentialingDueDate: localDateOffset(-5),
      lastActivityDate: nowIso(),
      tinVerified: "Yes",
      addressVerified: "Pending",
      lineOfBusiness: ["Medicare Advantage"],
      documents: [
        {
          id: crypto.randomUUID(),
          name: "Medical_License.pdf",
          type: "Medical License",
          uploadedAt: nowIso(),
          uploadedBy: "Admin",
        },
      ],
      followUpLogs: [createFollowUp("Renewal missed and needs immediate follow-up.", "Contact payer and re-submit.")],
      activity: [
        createActivity("Created Credentialing", "Opened for Dr. Omar Farooq"),
        createActivity("Updated Status", "Marked as Re-credentialing Due"),
      ],
      createdAt: createdAt.toISOString(),
      updatedAt: nowIso(),
    }),
    normalizeRecord({
      id: crypto.randomUUID(),
      credentialingId: "CRD-1006",
      practice: "Lakeside Pediatrics",
      provider: "Dr. Neha Verma",
      insuranceCompany: "Kaiser Permanente",
      credentialingType: "Add Location",
      contractType: "Direct Contract",
      ipaDelegatedEntityName: "",
      status: "Terminated",
      payerProviderId: "",
      assignedUser: "Rohan Mehta",
      priority: "Low",
      startDate: localDateOffset(-170),
      submissionDate: localDateOffset(-140),
      effectiveDate: localDateOffset(-128),
      expirationDate: localDateOffset(40),
      nextFollowUpDate: "",
      reCredentialingDueDate: "",
      lastActivityDate: nowIso(),
      tinVerified: "Yes",
      addressVerified: "Yes",
      lineOfBusiness: ["Other"],
      documents: [],
      followUpLogs: [createFollowUp("File closed after provider moved to another group.", "Archive record.")],
      activity: [
        createActivity("Created Credentialing", "Opened for Dr. Neha Verma"),
        createActivity("Edited Record", "Status changed to Terminated"),
      ],
      createdAt: createdAt.toISOString(),
      updatedAt: nowIso(),
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

function readRecordsFromStorage(): CredentialingRecord[] {
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
    const parsed = JSON.parse(raw) as Partial<CredentialingRecord>[];
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

function writeRecords(records: CredentialingRecord[]) {
  if (!isBrowser()) return;
  const normalized = records.map((record) => normalizeRecord(record));
  const serialized = JSON.stringify(normalized);
  cachedSnapshot = normalized;
  cachedStorageValue = serialized;
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function getCredentialingRecords() {
  return readRecordsFromStorage();
}

export function setCredentialingRecords(records: CredentialingRecord[]) {
  writeRecords(records);
}

export function useCredentialingRecords() {
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

export function formatCredentialingStatus(status: CredentialingStatus) {
  return status;
}

export function buildCredentialingActivityLog(
  previousRecord: CredentialingRecord | null,
  nextRecord: CredentialingFormState,
  actor = "Admin",
) {
  const entries: CredentialingActivity[] = [];

  if (!previousRecord) {
    entries.push(
      createActivity(
        "Created Credentialing",
        `Created for ${nextRecord.provider || nextRecord.practice}`,
        actor,
      ),
    );
  } else {
    entries.push(
      createActivity(
        "Edited Record",
        `Updated ${nextRecord.provider || nextRecord.practice}`,
        actor,
      ),
    );
    if (previousRecord.status !== nextRecord.status) {
      entries.push(
        createActivity(
          "Status Changed",
          `${previousRecord.status} -> ${nextRecord.status}`,
          actor,
        ),
      );
    }
    if (previousRecord.documents.length !== nextRecord.documents.length) {
      entries.push(
        createActivity(
          "Document Uploaded",
          `${Math.max(
            nextRecord.documents.length - previousRecord.documents.length,
            0,
          )} document(s) changed`,
          actor,
        ),
      );
    }
    if (
      previousRecord.followUpLogs.length !== nextRecord.followUpLogs.length
    ) {
      entries.push(
        createActivity(
          "Follow-up Logged",
          `${Math.max(
            nextRecord.followUpLogs.length - previousRecord.followUpLogs.length,
            0,
          )} follow-up entry(s) changed`,
          actor,
        ),
      );
    }
  }

  return entries;
}

export function buildCredentialingRecord(
  previousRecord: CredentialingRecord | null,
  form: CredentialingFormState,
  actor = "Admin",
) {
  const timestamp = nowIso();
  const effectiveDate = formatDateInput(form.effectiveDate);
  const submissionDate = formatDateInput(form.submissionDate);
  const lastActivityDate = timestamp;
  const nextRecord: CredentialingRecord = {
    id: previousRecord?.id || crypto.randomUUID(),
    credentialingId:
      previousRecord?.credentialingId ||
      `CRD-${String(Date.now()).slice(-4)}`,
    practice: form.practice.trim(),
    provider: form.provider.trim(),
    insuranceCompany: form.insuranceCompany.trim(),
    credentialingType: form.credentialingType,
    contractType: form.contractType,
    ipaDelegatedEntityName: form.ipaDelegatedEntityName.trim(),
    status: form.status,
    payerProviderId: form.payerProviderId.trim(),
    assignedUser: form.assignedUser.trim(),
    priority: form.priority,
    startDate: form.startDate,
    submissionDate,
    effectiveDate,
    expirationDate: formatDateInput(form.expirationDate),
    nextFollowUpDate: formatDateInput(form.nextFollowUpDate),
    reCredentialingDueDate:
      formatDateInput(form.reCredentialingDueDate) ||
      (effectiveDate ? addYears(effectiveDate, 2) : ""),
    lastActivityDate,
    tinVerified: form.tinVerified,
    addressVerified: form.addressVerified,
    lineOfBusiness: form.lineOfBusiness,
    documents: form.documents,
    followUpLogs: form.followUpLogs,
    activity: [
      ...buildCredentialingActivityLog(previousRecord, form, actor),
      ...(previousRecord?.activity || []),
    ],
    createdAt: previousRecord?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  return normalizeRecord(nextRecord);
}

export function createCredentialingFormState(
  record?: CredentialingRecord | null,
): CredentialingFormState {
  const normalized = record ? normalizeRecord(record) : null;
  return {
    practice: normalized?.practice || "",
    provider: normalized?.provider || "",
    insuranceCompany: normalized?.insuranceCompany || "",
    credentialingType: normalized?.credentialingType || requestTypeOptions[0],
    contractType: normalized?.contractType || contractTypeOptions[2],
    ipaDelegatedEntityName: normalized?.ipaDelegatedEntityName || "",
    status: normalized?.status || credentialingStatusOptions[0],
    payerProviderId: normalized?.payerProviderId || "",
    assignedUser: normalized?.assignedUser || "",
    priority: normalized?.priority || priorityOptions[1],
    startDate: formatDateInput(normalized?.startDate),
    submissionDate: formatDateInput(normalized?.submissionDate),
    effectiveDate: formatDateInput(normalized?.effectiveDate),
    expirationDate: formatDateInput(normalized?.expirationDate),
    nextFollowUpDate: formatDateInput(normalized?.nextFollowUpDate),
    reCredentialingDueDate: formatDateInput(normalized?.reCredentialingDueDate),
    tinVerified: normalized?.tinVerified || verificationStatusOptions[2],
    addressVerified: normalized?.addressVerified || verificationStatusOptions[2],
    lineOfBusiness: normalized?.lineOfBusiness || [],
    documents: normalized?.documents || [],
    followUpLogs: normalized?.followUpLogs || [],
  };
}

export function addDocumentsToForm(
  documents: CredentialingDocument[],
  files: File[],
  documentType: AllowedDocumentType,
) {
  return [
    ...files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: documentType,
      uploadedAt: nowIso(),
      uploadedBy: "Admin",
    })),
    ...documents,
  ];
}

export function addFollowUpToForm(
  entries: CredentialingFollowUp[],
  entry: Omit<CredentialingFollowUp, "id" | "dateTime"> & {
    dateTime?: string;
  },
) {
  return [
    {
      id: crypto.randomUUID(),
      dateTime: entry.dateTime || nowIso(),
      channel: entry.channel,
      direction: entry.direction,
      referenceNumber: entry.referenceNumber.trim(),
      summary: entry.summary.trim(),
      nextAction: entry.nextAction.trim(),
      loggedBy: entry.loggedBy.trim() || "Admin",
    },
    ...entries,
  ];
}

export function removeFollowUpFromForm(
  entries: CredentialingFollowUp[],
  entryId: string,
) {
  return entries.filter((entry) => entry.id !== entryId);
}

export function formatCredentialingTypeLabel(type: RequestType) {
  return type;
}
