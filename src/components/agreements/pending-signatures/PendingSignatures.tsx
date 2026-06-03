import { Clock3, RefreshCw, Search, Trash2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../../layout/AppLayout";
import {
  deleteAgreementApi,
  getAgreement,
  getAgreementsView,
  getDocusealTemplates,
  updateAgreementApi,
  type Agreement,
  type AgreementBody,
  type DocusealTemplate,
} from "../../../services/operations/agreements";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-700",
  PENDING_SIGNATURE: "bg-amber-100 text-amber-700",
  SIGNED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-zinc-100 text-zinc-600",
  TERMINATED: "bg-zinc-100 text-zinc-600",
};

const agreementStatusOptions = [
  "DRAFT",
  "ACTIVE",
  "PENDING_SIGNATURE",
  "SIGNED",
  "EXPIRED",
  "TERMINATED",
  "ARCHIVED",
];

const agreementTypeOptions = ["MSA", "SOW", "RENEWAL", "ADDENDUM"];

type AgreementFormState = {
  type: string;
  status: string;
  value: string;
  effectiveDate: string;
  renewalDate: string;
  terminationDate: string;
};

const initialFormState: AgreementFormState = {
  type: "MSA",
  status: "PENDING_SIGNATURE",
  value: "",
  effectiveDate: "",
  renewalDate: "",
  terminationDate: "",
};

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function normalizeDateInputValue(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatDateForInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildFormState(agreement?: Agreement | null): AgreementFormState {
  if (!agreement) return initialFormState;
  return {
    type: agreement.type,
    status: agreement.status,
    value: String(agreement.value || ""),
    effectiveDate: formatDateForInput(agreement.effectiveDate),
    renewalDate: formatDateForInput(agreement.renewalDate),
    terminationDate: formatDateForInput(agreement.terminationDate),
  };
}

function buildEditableFieldValues(agreement?: Agreement | null) {
  return (agreement?.docusealSubmissions || []).reduce<
    Record<string, Record<string, string>>
  >((acc, submission) => {
    acc[submission.id] = Object.entries(submission.fieldValues || {}).reduce<
      Record<string, string>
    >((values, [key, value]) => {
      values[key] = typeof value === "string" ? value : String(value ?? "");
      return values;
    }, {});
    return acc;
  }, {});
}

function getTemplateSubmitterGroups(
  template: DocusealTemplate | undefined,
  fieldValues: Record<string, string>,
) {
  if (!template) {
    return [];
  }

  const templateFields = template.fields || [];
  const groupedFields = templateFields.reduce<
    Record<string, typeof templateFields>
  >((acc, field) => {
    const submitterUuid = field.submitter_uuid || "unknown";
    if (!acc[submitterUuid]) {
      acc[submitterUuid] = [];
    }
    acc[submitterUuid].push(field);
    return acc;
  }, {});

  return (template.submitters || []).map((submitter) => ({
    submitterUuid: submitter.uuid,
    submitterName: submitter.name || "Submitter",
    fields: (groupedFields[submitter.uuid] || []).filter(
      (field) =>
        fieldValues[field.uuid] !== undefined || fieldValues[field.name] !== undefined,
    ),
  }));
}

function AgreementPendingSignaturesPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [editForm, setEditForm] =
    useState<AgreementFormState>(initialFormState);
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templates, setTemplates] = useState<DocusealTemplate[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [editableFieldValues, setEditableFieldValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [templateFieldsDirty, setTemplateFieldsDirty] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);

  function formatAgreementName(agreement: Agreement) {
    return `${agreement.practice?.name || "Practice"} | ${agreement.type}`;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          const data = await getAgreementsView({
            page: pagination.page,
            limit: pagination.limit,
            // status: "PENDING_SIGNATURE",
            status: "SENT",
            search: search || undefined,
          });
          const ids = data.rows.map((row) => row.id);
          const response = await Promise.all(ids.map((id) => getAgreement(id)));
          setAgreements(response);
          setPagination(data.pagination);
          setSelectedRowId((current) => {
            if (
              current &&
              response.some((agreement) => agreement.id === current)
            ) {
              return current;
            }
            return response[0]?.id || null;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load pending signatures";
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      }

      if (search.length === 0 || search.length > 2) {
        loadData();
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    if (!selectedRowId) {
      setSelectedAgreement(null);
      setEditForm(initialFormState);
      setSelectedSubmissionId(null);
      setEditableFieldValues({});
      return;
    }

    const agreementId = selectedRowId;

    async function loadAgreement() {
      try {
        setIsDetailLoading(true);
        const agreement = await getAgreement(agreementId);
        setSelectedAgreement(agreement);
        setEditForm(buildFormState(agreement));
        setEditableFieldValues(buildEditableFieldValues(agreement));
        setSelectedSubmissionId((current) => {
          if (
            current &&
            agreement.docusealSubmissions?.some(
              (submission) => submission.id === current,
            )
          ) {
            return current;
          }
          return agreement.docusealSubmissions?.[0]?.id || null;
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch agreement";
        toast.error(message);
      } finally {
        setIsDetailLoading(false);
      }
    }

    loadAgreement();
  }, [selectedRowId]);

  useEffect(() => {
    if (!selectedAgreement) {
      setTemplates([]);
      setSelectedSubmissionId(null);
      setEditableFieldValues({});
      setSelectedPersonId(null);
      return;
    }

    const templateIds = (selectedAgreement.docusealSubmissions || []).map(
      (s) => s.templateId,
    );

    const firstPersonId =
      selectedAgreement.docusealSubmissions?.find((s) => s.personId)
        ?.personId || null;
    setSelectedPersonId(firstPersonId);

    if (templateIds.length === 0) return;

    setIsTemplatesLoading(true);

    async function loadTemplates() {
      try {
        const res = await getDocusealTemplates();
        const allTemplates = res.templates.data || [];
        const matched = allTemplates.filter((t) => templateIds.includes(t.id));
        setTemplates(matched);
      } catch {
        // ignore template load errors
      } finally {
        setIsTemplatesLoading(false);
      }
    }

    loadTemplates();
  }, [selectedAgreement]);

  function buildPayload(form: AgreementFormState): Partial<AgreementBody> {
    return {
      type: form.type,
      status: form.status,
      value: Number.parseFloat(form.value) || undefined,
      effectiveDate: form.effectiveDate
        ? new Date(form.effectiveDate).toISOString()
        : undefined,
      renewalDate: form.renewalDate
        ? new Date(form.renewalDate).toISOString()
        : undefined,
      terminationDate: form.terminationDate
        ? new Date(form.terminationDate).toISOString()
        : undefined,
    };
  }

  async function refreshPendingSignatures() {
    const data = await getAgreementsView({
      page: pagination.page,
      limit: pagination.limit,
      // status: "PENDING_SIGNATURE",
      status: "SENT",
      search: search || undefined,
    });
    setPagination(data.pagination);
    const ids = data.rows.map((row) => row.id);
    const response = await Promise.all(
      ids.map((agreementId) => getAgreement(agreementId)),
    );
    setAgreements(response);
    if (!response.some((agreement) => agreement.id === selectedRowId)) {
      setSelectedRowId(response[0]?.id || null);
    }
  }

  async function handleSubmitForApproval() {
    const selectedSubmission = selectedAgreement?.docusealSubmissions?.find(
      (submission) => submission.id === selectedSubmissionId,
    );

    if (!selectedRowId || !selectedPersonId || !selectedSubmission) {
      toast.error("Select a signer and template before submitting");
      return;
    }

    setIsSubmittingForApproval(true);
    try {
      await updateAgreementApi(selectedRowId, {
        docusealSubmissions: [
          {
            id: selectedSubmission.id,
            templateId: selectedSubmission.templateId,
            fieldValues:
              editableFieldValues[selectedSubmission.id] ||
              selectedSubmission.fieldValues ||
              {},
          },
        ],
        submissionApprovalStatus: "PENDING_APPROVAL",
      });

      await refreshPendingSignatures();
      const agreement = await getAgreement(selectedRowId);
      setSelectedAgreement(agreement);
      setEditForm(buildFormState(agreement));
      setTemplateFieldsDirty(false);
      toast.success("Submission change request sent for approval");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit change request";
      toast.error(message);
    } finally {
      setIsSubmittingForApproval(false);
    }
  }

  function getTemplateFieldInputType(templateId: number, fieldKey: string) {
    const template = templates.find((item) => item.id === templateId);
    const field = template?.fields?.find(
      (item) => item.uuid === fieldKey || item.name === fieldKey,
    );
    const fieldName = field?.name || fieldKey;
    const fieldType = field?.type?.toLowerCase();

    if (fieldType === "date" || /date/i.test(fieldName)) {
      return "date";
    }

    return "text";
  }

  function handleFieldValueChange(
    submissionId: string,
    fieldName: string,
    value: string,
  ) {
    setTemplateFieldsDirty(true);
    setSelectedSubmissionId(submissionId);
    setEditableFieldValues((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || {}),
        [fieldName]: value,
      },
    }));
  }

  async function handleDeleteAgreement() {
    if (!selectedRowId) return;
    if (!window.confirm("Are you sure you want to delete this agreement?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAgreementApi(selectedRowId);
      await refreshPendingSignatures();
      toast.success("Agreement deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete agreement";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const selectedSubmission = selectedAgreement?.docusealSubmissions?.find(
    (submission) => submission.id === selectedSubmissionId,
  );
  const isSelectedSubmissionPendingApproval =
    selectedSubmission?.submissionApprovalStatus === "PENDING_APPROVAL";

  return (
    <AppLayout
      title="Agreements"
      activeModule="Agreements"
      activeSubItem="Pending Signatures"
    >
      <div className="grid h-full gap-3 lg:grid-cols-[500px_minmax(0,1fr)] font-app-sans">
        <section className="overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Pending Signatures
              </h2>
              <p className="text-xs text-slate-500">
                {agreements.length} waiting for client signature
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void refreshPendingSignatures();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="border-b border-[#f0ece6] px-4 py-3">
            <label className="flex w-full items-center gap-2 rounded-xl border border-[#ece8e1] bg-[#fcfbf9] px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  setSearch(event.target.value);
                }}
                placeholder="Search agreements"
                className="w-full bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="max-h-[calc(100vh-13rem)] overflow-auto p-3">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                Loading pending signatures...
              </div>
            ) : agreements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                No pending signature agreements match the current search.
              </div>
            ) : (
              <div className="space-y-2">
                {agreements.map((agreement) => {
                  const isActive = agreement.id === selectedRowId;
                  const status = String(agreement.status || "");

                  return (
                    <button
                      key={agreement.id}
                      type="button"
                      onClick={() => setSelectedRowId(agreement.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-[#4f63ea] bg-[#f5f7ff]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {formatAgreementName(agreement)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Request ID: {agreement.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            statusStyles[status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {formatStatusLabel(status)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
          <div className="border-b border-[#f0ece6] px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">
              Signature Details
            </h2>
          </div>

          {!selectedRowId ? (
            <div className="flex h-[calc(100%-61px)] items-center justify-center px-6 text-sm text-slate-400">
              Select an agreement to review the signature-ready details.
            </div>
          ) : isDetailLoading || !selectedAgreement ? (
            <div className="flex h-[calc(100%-61px)] items-center justify-center text-sm text-slate-400">
              Loading agreement...
            </div>
          ) : (
            <div className="flex h-[calc(100%-61px)] flex-col">
              <div className="flex-1 overflow-auto px-5 py-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {formatAgreementName(selectedAgreement)}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        statusStyles[selectedAgreement.status] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {formatStatusLabel(selectedAgreement.status)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      <Clock3 className="h-3 w-3" />
                      Pending Signature
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Practice
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {selectedAgreement.practice?.name || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Type
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {selectedAgreement.type}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Effective Date
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {formatDateTime(selectedAgreement.effectiveDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Renewal Date
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {formatDateTime(selectedAgreement.renewalDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Created
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {formatDateTime(selectedAgreement.createdAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Last Updated
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {formatDateTime(selectedAgreement.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Type
                    </label>
                    <select
                      value={editForm.type}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          type: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {agreementTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {agreementStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.value}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          value: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={editForm.effectiveDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          effectiveDate: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Renewal Date
                    </label>
                    <input
                      type="date"
                      value={editForm.renewalDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          renewalDate: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Termination Date
                    </label>
                    <input
                      type="date"
                      value={editForm.terminationDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          terminationDate: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>

                {(isTemplatesLoading ||
                  selectedAgreement.docusealSubmissions?.length) && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-800">
                      Template Inputs
                    </h4>

                    {isTemplatesLoading ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-[#f0ece6] bg-[#faf9f7] py-8 text-[12px] text-slate-400">
                        <svg
                          className="h-4 w-4 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        Loading template fields...
                      </div>
                    ) : (
                      <>
                        <div className="mt-3 space-y-3">
                          {selectedAgreement.docusealSubmissions?.length ? (
                            selectedAgreement.docusealSubmissions.map(
                              (submission) => {
                                const template = templates.find(
                                  (item) => item.id === submission.templateId,
                                );
                                const isActive =
                                  submission.id === selectedSubmissionId;
                                const submissionFields =
                                  editableFieldValues[submission.id] ||
                                  Object.entries(
                                    submission.fieldValues || {},
                                  ).reduce<Record<string, string>>(
                                    (acc, [key, value]) => {
                                      acc[key] =
                                        typeof value === "string"
                                          ? value
                                          : String(value ?? "");
                                      return acc;
                                    },
                                    {},
                                  ) ||
                                  {};
                                const submitterGroups = getTemplateSubmitterGroups(
                                  template,
                                  submissionFields,
                                );

                                return (
                                  <div
                                    key={submission.id}
                                    onClick={() =>
                                      setSelectedSubmissionId(submission.id)
                                    }
                                    className={`w-full rounded-2xl border p-4 text-left transition ${
                                      isActive
                                        ? "border-[#4f63ea] bg-[#f5f7ff]"
                                        : "border-slate-200 bg-white"
                                    }`}
                                  >
                                    <div>
                                      <div className="text-sm font-medium text-slate-800">
                                        {template?.name ||
                                          decodeURIComponent(
                                            submission?.url?.split("/").pop() ||
                                              "",
                                          ).replace(".pdf", "")}{" "}
                                        - {submission.templateId}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        Submission status: {submission.status}
                                        {submission.submissionApprovalStatus
                                          ? ` | Submission Approval: ${formatStatusLabel(submission.submissionApprovalStatus)}`
                                          : submission.approval_status
                                            ? ` | Approval: ${formatStatusLabel(submission.approval_status)}`
                                            : ""}
                                      </div>
                                    </div>

                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                      {submitterGroups.some(
                                        (group) => group.fields.length > 0,
                                      ) ? (
                                        submitterGroups.map((group) =>
                                          group.fields.length > 0 ? (
                                            <div
                                              key={group.submitterUuid}
                                              className="md:col-span-2"
                                            >
                                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {group.submitterName}
                                              </div>
                                              <div className="grid gap-3 md:grid-cols-2">
                                                {group.fields.map((field) => {
                                                  const value =
                                                    submissionFields[field.uuid] ??
                                                    submissionFields[field.name] ??
                                                    "";
                                                  const inputType =
                                                    getTemplateFieldInputType(
                                                      submission.templateId,
                                                      field.uuid || field.name,
                                                    );

                                                  return (
                                                    <div
                                                      key={field.uuid}
                                                      className="rounded-xl bg-slate-50 px-3 py-2"
                                                    >
                                                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                        {field.name || field.type}
                                                      </div>
                                                      <input
                                                        type={inputType}
                                                        value={
                                                          inputType === "date"
                                                            ? normalizeDateInputValue(
                                                                value,
                                                              )
                                                            : value || ""
                                                        }
                                                        onChange={(event) =>
                                                          handleFieldValueChange(
                                                            submission.id,
                                                            field.uuid || field.name,
                                                            event.target.value,
                                                          )
                                                        }
                                                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#4f63ea]"
                                                      />
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ) : null,
                                        )
                                      ) : (
                                        <div className="text-sm text-slate-400">
                                          No template input values were saved.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              },
                            )
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                              No template inputs were attached to this request.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#f0ece6] px-5 py-4">
                <button
                  type="button"
                  onClick={handleDeleteAgreement}
                  disabled={isDeleting}
                  className="flex cursor-pointer items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitForApproval}
                    disabled={
                      isSubmittingForApproval ||
                      isSelectedSubmissionPendingApproval ||
                      !selectedPersonId ||
                      !selectedSubmissionId ||
                      !templateFieldsDirty
                    }
                    className="app-control inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] hover:text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmittingForApproval
                      ? "Submitting..."
                      : isSelectedSubmissionPendingApproval
                        ? "Awaiting Approval"
                        : "Submit For Approval"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

export default AgreementPendingSignaturesPage;
