import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../../layout/AppLayout";
import {
  getAgreement,
  getDocusealTemplates,
  getSubmissionApprovalStatus,
  resubmitDocusealSubmissionApi,
  updateAgreementApi,
  getAllAgreements,
  type Agreement,
  type DocusealTemplate,
} from "../../../services/operations/agreements";
import {
  getDocusealFieldInputType,
  getDocusealFieldKey,
  getDocusealFieldLabel,
  getDocusealFieldValue,
  getMissingRequiredDocusealFields,
  getTemplateSubmitterGroups,
} from "../../../utils/docuseal";

const submissionApprovalStatusStyles: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function normalizeDateInputValue(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
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

function getPendingSubmissionChangeStatus(agreement: Agreement) {
  const rowStatus = (
    agreement as Agreement & {
      submissionApprovalStatus?: string;
    }
  ).submissionApprovalStatus;

  if (rowStatus) {
    return rowStatus;
  }

  return getSubmissionApprovalStatus(agreement);
}

function AgreementPendingSubmissionChangesPage() {
  const [searchParams] = useSearchParams();
  const requestedAgreementId = searchParams.get("agreementId") || undefined;
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(
    null,
  );
  const [editableFieldValues, setEditableFieldValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [docusealTemplates, setDocusealTemplates] = useState<
    DocusealTemplate[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");

  const loadAgreementDetail = useCallback(async (id: string) => {
    try {
      setIsDetailLoading(true);
      const agreement = await getAgreement(id);
      setSelectedAgreement(agreement);
      setEditableFieldValues(buildEditableFieldValues(agreement));
      setRejectionNote("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load agreement";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const loadPendingSubmissionChanges = useCallback(
    async (selectedId?: string) => {
      try {
        setIsLoading(true);
        const agreements = await getAllAgreements();

        const detailedAgreements = await Promise.all(
          agreements.map((agreement) => getAgreement(agreement.id)),
        );

        const filteredAgreements = detailedAgreements.filter((agreement) =>
          agreement.docusealSubmissions?.some(
            (submission) =>
              submission.submissionApprovalStatus === "PENDING_APPROVAL",
          ),
        );

        setAgreements(filteredAgreements);

        const nextSelectedId =
          selectedId &&
          filteredAgreements.some((agreement) => agreement.id === selectedId)
            ? selectedId
            : filteredAgreements[0]?.id;

        if (!nextSelectedId) {
          setSelectedAgreement(null);
          return;
        }

        await loadAgreementDetail(nextSelectedId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load pending submission changes";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [loadAgreementDetail],
  );

  useEffect(() => {
    void loadPendingSubmissionChanges(requestedAgreementId);
  }, [loadPendingSubmissionChanges, requestedAgreementId]);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await getDocusealTemplates();
        setDocusealTemplates(response.templates.data || []);
      } catch {
        // Keep fallback labels when template metadata is unavailable.
      }
    }

    void loadTemplates();
  }, []);

  const [rejecting, setIsRejecting] = useState(false);

  function validatePendingRequiredFields() {
    for (const submission of selectedAgreement?.docusealSubmissions || []) {
      if (submission.submissionApprovalStatus !== "PENDING_APPROVAL") {
        continue;
      }

      const template = docusealTemplates.find(
        (item) => item.id === submission.templateId,
      );
      const fieldValues =
        editableFieldValues[submission.id] || submission.fieldValues || {};
      const missingField = getMissingRequiredDocusealFields(
        template,
        fieldValues,
      )[0];

      if (missingField) {
        return {
          templateName: template?.name || `Template ${submission.templateId}`,
          fieldName: getDocusealFieldLabel(missingField),
        };
      }
    }

    return null;
  }

  async function handleReject() {
    if (!selectedAgreement) return;

    if (!rejectionNote?.trim().length) {
      toast.error("Please File Rejection Note");
      return;
    }
    const pendingSubmissions = (
      selectedAgreement.docusealSubmissions || []
    ).filter(
      (submission) =>
        submission.submissionApprovalStatus === "PENDING_APPROVAL" &&
        submission.personId &&
        submission.templateId,
    );

    if (pendingSubmissions.length === 0) {
      toast.error("No pending submission changes found for this agreement");
      return;
    }

    try {
      setIsRejecting(true);

      await updateAgreementApi(selectedAgreement.id, {
        submissionApprovalStatus: "REJECTED",
        docusealSubmissions: pendingSubmissions.map((submission) => ({
          id: submission.id,
          templateId: submission.templateId,
          submissionApprovalNote: rejectionNote.trim() || null,
        })),
      });

      toast.success("Submission Rejected");
      await loadPendingSubmissionChanges(selectedAgreement.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save and resend submission changes";
      toast.error(message);
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleSaveAndResubmit() {
    if (!selectedAgreement) return;

    const pendingSubmissions = (
      selectedAgreement.docusealSubmissions || []
    ).filter(
      (submission) =>
        submission.submissionApprovalStatus === "PENDING_APPROVAL" &&
        submission.personId &&
        submission.templateId,
    );

    if (pendingSubmissions.length === 0) {
      toast.error("No pending submission changes found for this agreement");
      return;
    }

    const missingField = validatePendingRequiredFields();
    if (missingField) {
      toast.error(
        `${missingField.templateName}: ${missingField.fieldName} is required`,
      );
      return;
    }

    try {
      setIsResubmitting(true);

      await updateAgreementApi(selectedAgreement.id, {
        docusealSubmissions: pendingSubmissions.map((submission) => ({
          id: submission.id,
          templateId: submission.templateId,
          fieldValues:
            editableFieldValues[submission.id] || submission.fieldValues || {},
        })),
      });

      await Promise.all(
        pendingSubmissions.map((submission) =>
          resubmitDocusealSubmissionApi({
            agreementId: selectedAgreement.id,
            personId: submission.personId as string,
            templateId: submission.templateId as number,
            fieldValues:
              editableFieldValues[submission.id] ||
              submission.fieldValues ||
              {},
            submissionApprovalStatus: "APPROVED",
          }),
        ),
      );

      toast.success("Submission changes saved and resent");
      await loadPendingSubmissionChanges(selectedAgreement.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save and resend submission changes";
      toast.error(message);
    } finally {
      setIsResubmitting(false);
    }
  }

  return (
    <AppLayout
      title="Pending Submission Changes"
      activeModule="Agreements"
      activeSubItem="Pending Submission Changes"
    >
      <div className="grid h-full gap-3 lg:grid-cols-[500px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Pending Submission Changes
              </h2>
              <p className="text-xs text-slate-500">
                {agreements.length} awaiting resend approval
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                loadPendingSubmissionChanges(selectedAgreement?.id)
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="max-h-[calc(100vh-10rem)] overflow-auto p-3">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                Loading pending submission changes...
              </div>
            ) : agreements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                No submission change requests are waiting for approval.
              </div>
            ) : (
              <div className="space-y-2">
                {agreements.map((agreement) => {
                  const isActive = agreement.id === selectedAgreement?.id;
                  const submissionStatus =
                    getPendingSubmissionChangeStatus(agreement);

                  return (
                    <button
                      key={agreement.id}
                      type="button"
                      onClick={() => loadAgreementDetail(agreement.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-[#4f63ea] bg-[#f5f7ff]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {agreement.practice?.name || "Practice"} |{" "}
                            {agreement.type}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Request ID: {agreement.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium
                            ${
                              // submissionApprovalStatusStyles[submissionStatus] ||
                              // "bg-slate-100 text-slate-700"
                              "bg-indigo-100 text-indigo-700"
                            }
                            `}
                        >
                          {/*{formatStatusLabel(submissionStatus)}*/}
                          {agreement.status}
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
              Submission Change Details
            </h2>
          </div>

          {!selectedAgreement || isDetailLoading ? (
            <div className="flex h-[calc(100%-61px)] items-center justify-center px-6 text-sm text-slate-400">
              {isDetailLoading
                ? "Loading agreement details..."
                : "Select a submission change request to review."}
            </div>
          ) : (
            <div className="flex h-[calc(100%-61px)] flex-col">
              <div className="flex-1 overflow-auto px-5 py-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {selectedAgreement.practice?.name || "Practice"} |{" "}
                      {selectedAgreement.type}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        // submissionApprovalStatusStyles[
                        //   getPendingSubmissionChangeStatus(selectedAgreement)
                        // ] || "bg-slate-100 text-slate-700"
                        "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {/*{formatStatusLabel(
                        getPendingSubmissionChangeStatus(selectedAgreement),
                      )}*/}
                      {selectedAgreement.status}
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
                        Deal
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {selectedAgreement.deal?.name || "-"}
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

                <div className="mt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Requested Template Changes
                  </h4>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Rejection Note
                    </label>
                    <textarea
                      value={rejectionNote}
                      onChange={(event) => setRejectionNote(event.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#4f63ea]"
                      placeholder="Explain why this resend request was rejected"
                    />
                  </div>
                  {selectedAgreement.docusealSubmissions?.some(
                    (submission) =>
                      submission.submissionApprovalStatus ===
                      "PENDING_APPROVAL",
                  ) ? (
                    selectedAgreement.docusealSubmissions
                      .filter(
                        (submission) =>
                          submission.submissionApprovalStatus ===
                          "PENDING_APPROVAL",
                      )
                      .map((submission) => {
                        const submissionFields =
                          editableFieldValues[submission.id] ||
                          submission.fieldValues ||
                          {};
                        const template = docusealTemplates.find(
                          (item) => item.id === submission.templateId,
                        );
                        const submitterGroups = getTemplateSubmitterGroups(
                          template,
                          submissionFields,
                          selectedAgreement?.practice?.name,
                        );

                        return (
                          <div
                            key={submission.id}
                            className="rounded-2xl border border-slate-200 p-4"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-800">
                                {decodeURIComponent(
                                  submission?.url?.split("/").pop() || "",
                                ).replace(".pdf", "")}{" "}
                                - {submission.templateId}
                              </div>
                              <div className="text-xs text-slate-500">
                                Submission status: {submission.status}
                                {submission.submissionApprovalStatus
                                  ? ` | Approval: ${formatStatusLabel(submission.submissionApprovalStatus)}`
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
                                          const key = getDocusealFieldKey(field);
                                          const value = getDocusealFieldValue(
                                            submissionFields,
                                            field,
                                          );
                                          const inputType =
                                            getDocusealFieldInputType(field);

                                          return (
                                            <div
                                              key={field.uuid}
                                              className="rounded-xl bg-slate-50 px-3 py-2"
                                            >
                                              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                {getDocusealFieldLabel(field)}
                                                {field.required && (
                                                  <span className="ml-1 text-red-500">
                                                    *
                                                  </span>
                                                )}
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
                                                  setEditableFieldValues(
                                                    (current) => ({
                                                      ...current,
                                                      [submission.id]: {
                                                        ...(current[
                                                          submission.id
                                                        ] ||
                                                          submission.fieldValues ||
                                                          {}),
                                                        [key]:
                                                          event.target.value,
                                                      },
                                                    }),
                                                  )
                                                }
                                                required={field.required}
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
                      })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                      No pending submission changes were attached to this
                      agreement.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#f0ece6] px-5 py-4">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejecting}
                  className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  {rejecting ? "Rejecting..." : "Reject"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndResubmit}
                  disabled={isResubmitting}
                  className="inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d4ed1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isResubmitting ? "Saving..." : "Save and Resubmit"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

export default AgreementPendingSubmissionChangesPage;
