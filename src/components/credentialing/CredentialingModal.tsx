import { createPortal } from "react-dom";
import {
  ArrowUpFromLine,
  CalendarDays,
  ChevronLeft,
  Circle,
  Clock3,
  Download,
  FileText,
  Loader2,
  Plus,
  ExternalLink,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import DatePicker from "../shared/DatePicker";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import {
  addDocumentsToForm,
  addFollowUpToForm,
  createCredentialingFormState,
  formatDateLabel,
  formatDateTimeLabel,
  removeFollowUpFromForm,
} from "./credentialingStore";
import {
  allowedDocumentTypes,
  contractTypeOptions,
  credentialingStatusOptions,
  followUpChannelOptions,
  followUpDirectionOptions,
  lineOfBusinessOptions,
  priorityOptions,
  requestTypeOptions,
  verificationStatusOptions,
  type CredentialingFormState,
  type CredentialingRecord,
  type FollowUpChannel,
  type FollowUpDirection,
  type LineOfBusiness,
} from "./types";
import { getCredentialingRequestsView } from "../../services/operations/credentialing";
import { getAllUsers } from "../../services/operations/users";
import { getPersonsView } from "../../services/operations/persons";
import { getPracticesView } from "../../services/operations/practices";

type CredentialingModalProps = {
  isOpen: boolean;
  mode: "create" | "edit" | "view";
  record?: CredentialingRecord | null;
  onClose: () => void;
  onSave: (form: CredentialingFormState) => Promise<void> | void;
  onDelete?: () => void;
  onRequestEdit?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
};

type FollowUpDraft = {
  channel: FollowUpChannel;
  direction: FollowUpDirection;
  referenceNumber: string;
  summary: string;
  nextAction: string;
  loggedBy: string;
};

function downloadLocalDocument(
  record: CredentialingRecord | null | undefined,
  docName: string,
) {
  const content = [
    "Credentialing document",
    `Record: ${record?.credentialingId || "-"}`,
    `Practice: ${record?.practice || "-"}`,
    `Provider: ${record?.provider || "-"}`,
    `Payer: ${record?.insuranceCompany || "-"}`,
    `Document: ${docName}`,
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = docName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1 block text-[13px] font-medium text-slate-700">
      {children}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </span>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
      {label}
    </span>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "Not Started":
      return "bg-slate-100 text-slate-700";
    case "Application Submitted":
      return "bg-indigo-100 text-indigo-700";
    case "In Process - Payer Review":
      return "bg-amber-100 text-amber-800";
    case "Pending Additional Info":
      return "bg-amber-50 text-amber-700";
    case "Contracted - Direct":
      return "bg-emerald-100 text-emerald-700";
    case "Contracted - IPA/Delegated":
      return "bg-teal-100 text-teal-700";
    case "Out-of-Network (OON)":
      return "bg-slate-200 text-slate-700";
    case "Declined / Application Rejected":
      return "bg-rose-100 text-rose-700";
    case "Re-credentialing Due":
      return "bg-orange-100 text-orange-700";
    case "Terminated":
      return "bg-slate-300 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function createLocalSearchOptions(options: string[]) {
  return async (query: string): Promise<SearchSelectOption[]> => {
    const normalized = query.trim().toLowerCase();
    return options
      .filter((option) =>
        normalized ? option.toLowerCase().includes(normalized) : true,
      )
      .map((option) => ({ label: option, value: option }));
  };
}

export default function CredentialingModal({
  isOpen,
  mode,
  record,
  onClose,
  onSave,
  onDelete,
  onRequestEdit,
  isSaving = false,
  isDeleting = false,
}: CredentialingModalProps) {
  const [form, setForm] = useState<CredentialingFormState>(
    createCredentialingFormState(null),
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    allowedDocumentTypes[0],
  );
  const [documentExpiryDate, setDocumentExpiryDate] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState<FollowUpDraft>({
    channel: followUpChannelOptions[0],
    direction: followUpDirectionOptions[0],
    referenceNumber: "",
    summary: "",
    nextAction: "",
    loggedBy: "Admin",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [practiceOptions, setPracticeOptions] = useState<string[]>([]);
  const [payerOptions, setPayerOptions] = useState<string[]>([]);
  const [providerOptions, setProviderOptions] = useState<string[]>([]);
  const [specialistOptions, setSpecialistOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    async function loadOptions() {
      try {
        const [practiceView, credentialingView, personView, users] = await Promise.all([
          getPracticesView({ limit: 1000 }),
          getCredentialingRequestsView({ limit: 5000 }),
          getPersonsView({ limit: 1000 }),
          getAllUsers(),
        ]);

        if (!active) return;

        setPracticeOptions(
          Array.from(new Set(practiceView.rows.map((row) => row.values.name)))
            .filter(Boolean)
            .sort(),
        );
        setPayerOptions(
          Array.from(
            new Set(credentialingView.credentialingRequests.map((entry) => entry.insuranceCompany)),
          )
            .filter(Boolean)
            .sort(),
        );
        setProviderOptions(
          Array.from(
            new Set(
              personView.rows.map((row) => row.values.fullName).filter(Boolean),
            ),
          ).sort(),
        );
        setSpecialistOptions(
          Array.from(
            new Set(
              users
                .map((user: any) => [user.firstName, user.lastName].filter(Boolean).join(" "))
                .filter(Boolean),
            ),
          ).sort(),
        );
      } catch {
        if (!active) return;
        setPracticeOptions([]);
        setPayerOptions([]);
        setProviderOptions([]);
        setSpecialistOptions([]);
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, [isOpen]);
  const searchPracticeOptions = useMemo(() => createLocalSearchOptions(practiceOptions), [practiceOptions]);
  const searchPayerOptions = useMemo(() => createLocalSearchOptions(payerOptions), [payerOptions]);
  const searchProviderOptions = useMemo(() => createLocalSearchOptions(providerOptions), [providerOptions]);
  const searchSpecialistOptions = useMemo(() => createLocalSearchOptions(specialistOptions), [specialistOptions]);
  const searchStatusOptions = useMemo(
    () => createLocalSearchOptions(credentialingStatusOptions as readonly string[] as string[]),
    [],
  );
  const searchRequestTypeOptions = useMemo(
    () => createLocalSearchOptions(requestTypeOptions as readonly string[] as string[]),
    [],
  );
  const searchContractTypeOptions = useMemo(
    () => createLocalSearchOptions(contractTypeOptions as readonly string[] as string[]),
    [],
  );
  const searchPriorityOptions = useMemo(
    () => createLocalSearchOptions(priorityOptions as readonly string[] as string[]),
    [],
  );
  const searchVerificationOptions = useMemo(
    () => createLocalSearchOptions(verificationStatusOptions as readonly string[] as string[]),
    [],
  );
  const searchDocumentTypeOptions = useMemo(
    () => createLocalSearchOptions(allowedDocumentTypes as readonly string[] as string[]),
    [],
  );
  const searchChannelOptions = useMemo(
    () => createLocalSearchOptions(followUpChannelOptions as readonly string[] as string[]),
    [],
  );
  const searchDirectionOptions = useMemo(
    () => createLocalSearchOptions(followUpDirectionOptions as readonly string[] as string[]),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(createCredentialingFormState(record));
    setSelectedDocumentType(allowedDocumentTypes[0]);
    setDocumentExpiryDate("");
    setFollowUpDraft({
      channel: followUpChannelOptions[0],
      direction: followUpDirectionOptions[0],
      referenceNumber: "",
      summary: "",
      nextAction: "",
      loggedBy: "Admin",
    });
  }, [isOpen, record, mode]);

  const isReadOnly = mode === "view";
  const isEditMode = mode === "edit";

  const title = useMemo(() => {
    if (mode === "create") return "Add Credentialing";
    if (mode === "edit") return "Edit Credentialing";
    return "View Credentialing";
  }, [mode]);

  if (!isOpen) return null;

  function updateField<K extends keyof CredentialingFormState>(
    key: K,
    value: CredentialingFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleLineOfBusiness(line: LineOfBusiness) {
    setForm((current) => ({
      ...current,
      lineOfBusiness: current.lineOfBusiness.includes(line)
        ? current.lineOfBusiness.filter((entry) => entry !== line)
        : [...current.lineOfBusiness, line],
    }));
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const uploadedDocuments = await addDocumentsToForm(
      form.documents,
      Array.from(files),
      selectedDocumentType,
    );
    setForm((current) => ({
      ...current,
      documents: uploadedDocuments.map((doc) =>
        documentExpiryDate && doc.expiryDate == null
          ? { ...doc, expiryDate: documentExpiryDate }
          : doc,
      ),
    }));
    setDocumentExpiryDate("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeDocument(documentId: string) {
    setForm((current) => ({
      ...current,
      documents: current.documents.filter((doc) => doc.id !== documentId),
    }));
  }

  function addFollowUpEntry() {
    if (!followUpDraft.summary.trim() && !followUpDraft.nextAction.trim()) return;
    setForm((current) => ({
      ...current,
      followUpLogs: addFollowUpToForm(current.followUpLogs, followUpDraft),
    }));
    setFollowUpDraft({
      channel: followUpChannelOptions[0],
      direction: followUpDirectionOptions[0],
      referenceNumber: "",
      summary: "",
      nextAction: "",
      loggedBy: "Admin",
    });
  }

  function removeFollowUpEntry(entryId: string) {
    setForm((current) => ({
      ...current,
      followUpLogs: removeFollowUpFromForm(current.followUpLogs, entryId),
    }));
  }

  const activityEntries = record?.activity || [];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative flex h-[90vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between border-b border-[#f0ece6] px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#ece8e1] bg-[#f7f5f1] p-2 text-slate-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[18px] font-semibold text-slate-800">
                  {title}
                </div>
                <Badge
                  label={form.status}
                  tone={statusTone(form.status)}
                />
              </div>
              <div className="mt-1 text-[13px] text-slate-400">
                {record?.credentialingId || "Create credentialing record"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#ece8e1] p-2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#fbfaf8]">
          <form
            id="credentialing-form"
            className="space-y-5 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              onSave(form);
            }}
          >
            <section className="rounded-2xl border border-[#ece8e1] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Circle className="h-4 w-4 text-slate-400" />
                <h3 className="text-[15px] font-semibold text-slate-800">
                  Basic Information
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <FieldLabel required>Practice</FieldLabel>
                  <SearchSelect
                    value={form.practice}
                    onChange={(value) => updateField("practice", value)}
                    onSearch={searchPracticeOptions}
                    disabled={isReadOnly}
                    placeholder="Search practice"
                  />
                </label>

                <label className="block">
                  <FieldLabel>Provider</FieldLabel>
                  <SearchSelect
                    value={form.provider}
                    onChange={(value) => updateField("provider", value)}
                    onSearch={searchProviderOptions}
                    disabled={isReadOnly}
                    placeholder="Search provider"
                  />
                </label>

                <label className="block">
                  <FieldLabel>Insurance Payer</FieldLabel>
                  <SearchSelect
                    value={form.insuranceCompany}
                    onChange={(value) => updateField("insuranceCompany", value)}
                    onSearch={searchPayerOptions}
                    disabled={isReadOnly}
                    placeholder="Search payer (optional)"
                  />
                </label>

                <label className="block">
                  <FieldLabel required>Request Type</FieldLabel>
                  <SearchSelect
                    value={form.credentialingType}
                    onChange={(value) =>
                      updateField(
                        "credentialingType",
                        value as CredentialingFormState["credentialingType"],
                      )
                    }
                    onSearch={searchRequestTypeOptions}
                    disabled={isReadOnly}
                    placeholder="Search request type"
                  />
                </label>

                <label className="block">
                  <FieldLabel required>Contract Type</FieldLabel>
                  <SearchSelect
                    value={form.contractType}
                    onChange={(value) =>
                      updateField(
                        "contractType",
                        value as CredentialingFormState["contractType"],
                      )
                    }
                    onSearch={searchContractTypeOptions}
                    disabled={isReadOnly}
                    placeholder="Search contract type"
                  />
                </label>

                <label className="block">
                  <FieldLabel>IPA / Delegated Entity Name</FieldLabel>
                  <input
                    type="text"
                    value={form.ipaDelegatedEntityName}
                    onChange={(event) =>
                      updateField("ipaDelegatedEntityName", event.target.value)
                    }
                    readOnly={isReadOnly}
                    placeholder="Only if IPA-Delegated"
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px] disabled:bg-slate-50"
                  />
                </label>

                <label className="block">
                  <FieldLabel required>Assigned Specialist</FieldLabel>
                  <SearchSelect
                    value={form.assignedUser}
                    onChange={(value) => updateField("assignedUser", value)}
                    onSearch={searchSpecialistOptions}
                    disabled={isReadOnly}
                    placeholder="Search specialist"
                  />
                </label>

                <label className="block">
                  <FieldLabel required>Priority</FieldLabel>
                  <SearchSelect
                    value={form.priority}
                    onChange={(value) =>
                      updateField(
                        "priority",
                        value as CredentialingFormState["priority"],
                      )
                    }
                    onSearch={searchPriorityOptions}
                    disabled={isReadOnly}
                    placeholder="Search priority"
                  />
                </label>

                <label className="block">
                  <FieldLabel required>Status</FieldLabel>
                  <SearchSelect
                    value={form.status}
                    onChange={(value) =>
                      updateField(
                        "status",
                        value as CredentialingFormState["status"],
                      )
                    }
                    onSearch={searchStatusOptions}
                    disabled={isReadOnly}
                    placeholder="Search status"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-[#ece8e1] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <h3 className="text-[15px] font-semibold text-slate-800">
                  Tracking Dates
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: "Start Date", key: "startDate" },
                  { label: "Date Submitted", key: "submissionDate" },
                  { label: "Effective Date", key: "effectiveDate" },
                  { label: "Expiration Date", key: "expirationDate" },
                  { label: "Next Follow-up Date", key: "nextFollowUpDate" },
                  { label: "Re-credentialing Due Date", key: "reCredentialingDueDate" },
                ].map((field) => (
                  <label key={field.label} className="block">
                    <FieldLabel>{field.label}</FieldLabel>
                    <DatePicker
                      value={
                        form[field.key as keyof CredentialingFormState] as string
                      }
                      onChange={(value) =>
                        updateField(
                          field.key as keyof CredentialingFormState,
                          value as never,
                        )
                      }
                      placeholder={`Select ${field.label.toLowerCase()}`}
                      className="rounded-xl"
                      disabled={isReadOnly}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-[#e5e0d7] bg-[#fcfbf9] p-4">
                <div className="text-[12px] font-medium uppercase tracking-wide text-slate-400">
                  Last Activity Date
                </div>
                <div className="mt-1 text-[14px] font-medium text-slate-700">
                  {record?.lastActivityDate
                    ? formatDateLabel(record.lastActivityDate)
                    : "-"}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#ece8e1] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Circle className="h-4 w-4 text-slate-400" />
                <h3 className="text-[15px] font-semibold text-slate-800">
                  Verification
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <FieldLabel>TIN Verified</FieldLabel>
                  <SearchSelect
                    value={form.tinVerified}
                    onChange={(value) =>
                      updateField(
                        "tinVerified",
                        value as CredentialingFormState["tinVerified"],
                      )
                    }
                    onSearch={searchVerificationOptions}
                    disabled={isReadOnly}
                    placeholder="Search status"
                  />
                </label>

                <label className="block">
                  <FieldLabel>Address Verified</FieldLabel>
                  <SearchSelect
                    value={form.addressVerified}
                    onChange={(value) =>
                      updateField(
                        "addressVerified",
                        value as CredentialingFormState["addressVerified"],
                      )
                    }
                    onSearch={searchVerificationOptions}
                    disabled={isReadOnly}
                    placeholder="Search status"
                  />
                </label>

                <label className="block">
                  <FieldLabel>Payer Provider ID (PID#)</FieldLabel>
                  <input
                    type="text"
                    value={form.payerProviderId}
                    onChange={(event) =>
                      updateField("payerProviderId", event.target.value)
                    }
                    readOnly={isReadOnly}
                    placeholder="PID number"
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px] disabled:bg-slate-50"
                  />
                </label>
              </div>

              <div className="mt-4">
                <FieldLabel>Lines of Business</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {lineOfBusinessOptions.map((option) => {
                    const active = form.lineOfBusiness.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => toggleLineOfBusiness(option)}
                        className={`rounded-full border px-3 py-2 text-[12px] font-medium transition ${
                          active
                            ? "border-[#4f63ea] bg-[#eef2ff] text-[#4f63ea]"
                            : "border-[#ece8e1] bg-white text-slate-600 hover:bg-[#f7f5f1]"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#ece8e1] bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[15px] font-semibold text-slate-800">
                    Documents
                  </h3>
                </div>
                <span className="text-[12px] text-slate-400">
                  Allowed: {allowedDocumentTypes.join(", ")}
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="rounded-2xl border border-dashed border-[#e4e0d8] bg-[#faf9f7] p-4">
                  <div className="mb-3 text-[13px] font-medium text-slate-700">
                    Upload Documents
                  </div>
                  <SearchSelect
                    value={selectedDocumentType}
                    onChange={(value) =>
                      setSelectedDocumentType(
                        value as (typeof allowedDocumentTypes)[number],
                      )
                    }
                    onSearch={searchDocumentTypeOptions}
                    disabled={isReadOnly}
                    placeholder="Search document type"
                  />

                  <label className="mt-3 block">
                    <FieldLabel>Optional Expiry Date</FieldLabel>
                    <DatePicker
                      value={documentExpiryDate}
                      onChange={setDocumentExpiryDate}
                      placeholder="Set document expiry"
                      className="rounded-xl"
                      disabled={isReadOnly}
                    />
                  </label>

                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#ece8e1] bg-white px-4 py-6 text-center text-[13px] text-slate-500 hover:bg-[#fcfbf9]">
                    <ArrowUpFromLine className="h-5 w-5 text-slate-400" />
                    <span className="mt-2 font-medium text-slate-700">
                      Upload files
                    </span>
                    <span className="mt-1 text-[12px] text-slate-400">
                      Select one or more files
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      disabled={isReadOnly}
                      className="hidden"
                      onChange={(event) => {
                        void handleFileSelect(event.target.files);
                      }}
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-[#ece8e1] p-4">
                  <div className="mb-3 text-[13px] font-medium text-slate-700">
                    Uploaded Documents
                  </div>
                  <div className="space-y-2">
                    {form.documents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#ece8e1] bg-[#faf9f7] px-4 py-6 text-center text-[13px] text-slate-400">
                        No documents uploaded yet.
                      </div>
                    ) : (
                      form.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0ece6] bg-[#fbfaf8] px-3 py-3"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-slate-700">
                              {doc.name}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-400">
                              {doc.type} · {formatDateTimeLabel(doc.uploadedAt)}
                              {doc.expiryDate
                                ? ` · Expires ${formatDateLabel(doc.expiryDate)}`
                                : ""}
                            </div>
                          </div>
                          <Badge
                            label={doc.type}
                            tone="bg-slate-100 text-slate-600"
                          />
                          {doc.fileUrl ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#ece8e1] px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-white hover:text-slate-800"
                                title="View document"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View
                              </a>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                                title="Open Azure document"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => downloadLocalDocument(record, doc.name)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                              title="Download local preview"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {!isReadOnly ? (
                            <button
                              type="button"
                              onClick={() => removeDocument(doc.id)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#ece8e1] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-slate-400" />
                <h3 className="text-[15px] font-semibold text-slate-800">
                  Follow-up / Communication Log
                </h3>
              </div>

              {!isReadOnly ? (
                <div className="mb-4 rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <label className="block">
                      <FieldLabel>Channel</FieldLabel>
                      <SearchSelect
                        value={followUpDraft.channel}
                        onChange={(value) =>
                          setFollowUpDraft((current) => ({
                            ...current,
                            channel: value as FollowUpChannel,
                          }))
                        }
                        onSearch={searchChannelOptions}
                        placeholder="Select channel"
                      />
                    </label>

                    <label className="block">
                      <FieldLabel>Direction</FieldLabel>
                      <SearchSelect
                        value={followUpDraft.direction}
                        onChange={(value) =>
                          setFollowUpDraft((current) => ({
                            ...current,
                            direction: value as FollowUpDirection,
                          }))
                        }
                        onSearch={searchDirectionOptions}
                        placeholder="Select direction"
                      />
                    </label>

                    <label className="block">
                      <FieldLabel>Logged By</FieldLabel>
                      <input
                        type="text"
                        value={followUpDraft.loggedBy}
                        onChange={(event) =>
                          setFollowUpDraft((current) => ({
                            ...current,
                            loggedBy: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                        placeholder="Admin"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <FieldLabel>Reference Number</FieldLabel>
                      <input
                        type="text"
                        value={followUpDraft.referenceNumber}
                        onChange={(event) =>
                          setFollowUpDraft((current) => ({
                            ...current,
                            referenceNumber: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                        placeholder="Case or ticket number"
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>Next Action</FieldLabel>
                      <input
                        type="text"
                        value={followUpDraft.nextAction}
                        onChange={(event) =>
                          setFollowUpDraft((current) => ({
                            ...current,
                            nextAction: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                        placeholder="What happens next"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <FieldLabel required>Summary</FieldLabel>
                    <textarea
                      value={followUpDraft.summary}
                      onChange={(event) =>
                        setFollowUpDraft((current) => ({
                          ...current,
                          summary: event.target.value,
                        }))
                      }
                      rows={4}
                      className="app-control w-full rounded-2xl px-3 py-2 text-[13px]"
                      placeholder="What was discussed with the payer?"
                    />
                  </label>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={addFollowUpEntry}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                    >
                      <Plus className="h-4 w-4" />
                      Add Follow-up Entry
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {form.followUpLogs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#ece8e1] bg-[#faf9f7] px-4 py-5 text-[13px] text-slate-400">
                    No follow-up entries recorded yet.
                  </div>
                ) : (
                  form.followUpLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-[#f0ece6] bg-[#fbfaf8] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            label={entry.channel}
                            tone="bg-slate-100 text-slate-600"
                          />
                          <Badge
                            label={entry.direction}
                            tone="bg-indigo-100 text-indigo-700"
                          />
                          <span className="text-[12px] text-slate-400">
                            {entry.loggedBy}
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-1 text-[12px] text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTimeLabel(entry.dateTime)}
                        </div>
                      </div>
                      <div className="mt-3 text-[13px] font-medium text-slate-700">
                        {entry.summary}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500">
                        Reference: {entry.referenceNumber || "-"}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500">
                        Next action: {entry.nextAction || "-"}
                      </div>
                      {!isReadOnly ? (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeFollowUpEntry(entry.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#ece8e1] px-3 py-1.5 text-[12px] text-slate-500 hover:bg-white hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            {mode === "view" ? (
              <section className="rounded-2xl border border-[#ece8e1] bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Circle className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[15px] font-semibold text-slate-800">
                    Activity Log
                  </h3>
                </div>
                <div className="space-y-3">
                  {activityEntries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#ece8e1] bg-[#faf9f7] px-4 py-5 text-[13px] text-slate-400">
                      No activity recorded yet.
                    </div>
                  ) : (
                    activityEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-[#f0ece6] bg-[#fbfaf8] px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-[13px] font-medium text-slate-700">
                            {entry.action}
                          </div>
                          <div className="text-[12px] text-slate-400">
                            {formatDateTimeLabel(entry.createdAt)}
                          </div>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-500">
                          {entry.details || "Activity recorded"}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                          {entry.actor}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : null}
          </form>
        </div>

        <div className="flex items-center justify-between border-t border-[#f0ece6] bg-white px-6 py-4">
          <div className="text-[12px] text-slate-400">
            {isReadOnly
              ? "Record is read-only in view mode."
              : ""}
          </div>

          <div className="flex items-center gap-3">
            {mode === "view" ? (
              <>
                <button
                  type="button"
                  onClick={onRequestEdit}
                  className="rounded-xl border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                {isEditMode ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={isSaving || isDeleting}
                    className="rounded-xl border border-red-200 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50"
                  >
                    {isDeleting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </span>
                    ) : (
                      "Delete"
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isDeleting}
                  className="rounded-xl border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="credentialing-form"
                  disabled={isSaving || isDeleting}
                  className="rounded-xl bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === "create" ? "Saving..." : "Updating..."}
                    </span>
                  ) : mode === "create" ? (
                    "Save Credentialing"
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
