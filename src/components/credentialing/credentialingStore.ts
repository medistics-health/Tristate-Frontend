import type {
  AllowedDocumentType,
  CredentialingDocument,
  CredentialingFollowUp,
  CredentialingFormState,
  CredentialingRecord,
} from "./types";
import {
  contractTypeOptions,
  credentialingStatusOptions,
  followUpChannelOptions,
  followUpDirectionOptions,
  priorityOptions,
  requestTypeOptions,
  verificationStatusOptions,
} from "./types";

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
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function nowIso() {
  return new Date().toISOString();
}

export function createCredentialingFormState(
  record?: CredentialingRecord | null,
): CredentialingFormState {
  return {
    practice: record?.practice || "",
    provider: record?.provider || "",
    insuranceCompany: record?.insuranceCompany || "",
    credentialingType: record?.credentialingType || requestTypeOptions[0],
    contractType: record?.contractType || contractTypeOptions[2],
    ipaDelegatedEntityName: record?.ipaDelegatedEntityName || "",
    status: record?.status || credentialingStatusOptions[0],
    payerProviderId: record?.payerProviderId || "",
    assignedUser: record?.assignedUser || "",
    assignedUserId: record?.assignedUserId || record?.assignedToUserId || "",
    priority: record?.priority || priorityOptions[1],
    startDate: formatDateInput(record?.startDate),
    submissionDate: formatDateInput(record?.submissionDate),
    effectiveDate: formatDateInput(record?.effectiveDate),
    expirationDate: formatDateInput(record?.expirationDate),
    nextFollowUpDate: formatDateInput(record?.nextFollowUpDate),
    reCredentialingDueDate: formatDateInput(record?.reCredentialingDueDate),
    tinVerified: record?.tinVerified || verificationStatusOptions[2],
    addressVerified: record?.addressVerified || verificationStatusOptions[2],
    lineOfBusiness: record?.lineOfBusiness || [],
    documents: record?.documents || [],
    followUpLogs: record?.followUpLogs || [],
  };
}

export function addDocumentsToForm(
  documents: CredentialingDocument[],
  files: File[],
  documentType: AllowedDocumentType,
): Promise<CredentialingDocument[]> {
  return Promise.all(
    files.map(async (file) => {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          resolve(result.includes(",") ? result.split(",").pop() || "" : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      return {
        id: crypto.randomUUID(),
        name: file.name,
        fileName: file.name,
        type: documentType,
        documentType: documentType,
        uploadedAt: nowIso(),
        uploadedBy: "Admin",
        fileBase64,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      };
    }),
  ).then((uploaded) => [...uploaded, ...documents]);
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
