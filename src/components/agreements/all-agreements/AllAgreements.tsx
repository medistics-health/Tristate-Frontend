import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  Circle,
  LayoutList,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  ExternalLink,
  FileText,
  GitBranch,
  Settings,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../../layout/AppLayout";
import {
  createAgreementApi,
  createDocusealSubmissionApi,
  sendAgreementEmailApi,
  deleteAgreementApi,
  getAgreement,
  getAgreementsView,
  updateAgreementApi,
  getDocusealTemplates,
  type Agreement,
  type AgreementBody,
  type DocusealTemplate,
  getAgreementDocusealId,
} from "../../../services/operations/agreements";
import {
  getAgreementVersions,
  getAgreementServiceTerms,
  createAgreementServiceTermApi,
  createAgreementVersionApi,
  updateAgreementVersionApi,
  updateAgreementServiceTermApi,
  deleteAgreementVersionApi,
  deleteAgreementServiceTermApi,
  type AgreementVersion,
  type AgreementServiceTerm,
  type PricingModel,
  pricingModelOptions,
} from "../../../services/operations/agreements";
import { getAllPractices } from "../../../services/operations/practices";
import { getAllServices } from "../../../services/operations/services";
import { getAllVendorsApi } from "../../../services/operations/vendors";
import type { Practice } from "../../practices/types";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-700",
  PENDING_SIGNATURE: "bg-amber-100 text-amber-700",
  SIGNED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-zinc-100 text-zinc-600",
};

const agreementStatusOptions = ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"];

const agreementTypeOptions = ["MSA", "SOW", "RENEWAL", "ADDENDUM"];

type AgreementFormState = {
  practiceId: string;
  dealId: string;
  type: string;
  status: string;
  value: string;
  effectiveDate: string;
  renewalDate: string;
  terminationDate: string;
  // docusealTemplates: string[];
  docusealTemplates: any[];
};

const initialFormState: AgreementFormState = {
  practiceId: "",
  dealId: "",
  type: "MSA",
  status: "DRAFT",
  value: "",
  effectiveDate: "",
  renewalDate: "",
  terminationDate: "",
  docusealTemplates: [],
};

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatPricingModel(model: string) {
  return model
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
    practiceId: agreement.practiceId,
    dealId: agreement.dealId || "",
    type: agreement.type,
    status: agreement.status,
    value: String(agreement.value || ""),
    effectiveDate: formatDateForInput(agreement.effectiveDate),
    renewalDate: formatDateForInput(agreement.renewalDate),
    terminationDate: formatDateForInput(agreement.terminationDate),
    docusealTemplates: agreement?.docusealSubmissions,
  };
}

type AgreementRow = {
  id: string;
  values: Record<string, string | number | null>;
};

function AllAgreementsPage() {
  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ search: "", status: "", type: "" });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [createForm, setCreateForm] =
    useState<AgreementFormState>(initialFormState);
  const [editForm, setEditForm] =
    useState<AgreementFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [docusealTemplates, setDocusealTemplates] = useState<
    DocusealTemplate[]
  >([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [signers, setSigners] = useState<any[]>([]);
  const [selectedSignerId, setSelectedSignerId] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Tabs for detail panel
  const [activeTab, setActiveTab] = useState<"overview" | "versions" | "terms">(
    "overview",
  );

  // Versions state
  const [versions, setVersions] = useState<AgreementVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [versionForm, setVersionForm] = useState({
    versionNumber: 1,
    isCurrent: true,
    effectiveDate: "",
    endDate: "",
    notes: "",
  });
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Service Terms state
  const [serviceTerms, setServiceTerms] = useState<AgreementServiceTerm[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [showTermForm, setShowTermForm] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [termForm, setTermForm] = useState({
    serviceId: "",
    vendorId: "",
    pricingModel: "PER_PATIENT" as PricingModel,
    pricingConfig: "{}",
    currency: "USD",
    priority: 1,
    minimumFee: "",
    effectiveDate: "",
    endDate: "",
    isActive: true,
    externalReference: "",
  });
  const [isSavingTerm, setIsSavingTerm] = useState(false);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

  const columns = useMemo<ColumnDef<AgreementRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row: AgreementRow) => row.values.name,
        header: () => "Name",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.name || "-"),
      },
      {
        id: "type",
        accessorFn: (row: AgreementRow) => row.values.type,
        header: () => "Type",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.type || "-"),
      },
      {
        id: "status",
        accessorFn: (row: AgreementRow) => row.values.status,
        header: () => "Status",
        cell: ({ row }: { row: { original: AgreementRow } }) => {
          const status = String(row.original.values.status || "");
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
            >
              {formatStatusLabel(status)}
            </span>
          );
        },
      },
      {
        id: "practiceName",
        accessorFn: (row: AgreementRow) => row.values.practiceName,
        header: () => "Practice",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.practiceName || "-"),
      },
      {
        id: "value",
        accessorFn: (row: AgreementRow) => row.values.value,
        header: () => "Value",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.value || "-"),
      },
      {
        id: "effectiveDate",
        accessorFn: (row: AgreementRow) => row.values.effectiveDate,
        header: () => "Effective Date",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.effectiveDate || "-"),
      },
      {
        id: "creationDate",
        accessorFn: (row: AgreementRow) => row.values.creationDate,
        header: () => "Created",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.creationDate),
      },
      {
        id: "signingStatus",
        accessorFn: (row: AgreementRow) => row.values.signingStatus,
        header: () => "Signing",
        cell: ({ row }: { row: { original: AgreementRow } }) => {
          const status = String(row.original.values.signingStatus || "");
          if (!status) return null;
          const isComplete = status.includes("/") && !status.includes("0/");
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isComplete
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {status}
            </span>
          );
        },
        size: 100,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          const params: Record<string, unknown> = {
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search || undefined,
            status: filters.status || undefined,
            type: filters.type || undefined,
          };
          if (sorting[0]?.id) {
            params.sortBy = sorting[0].id;
            params.sortOrder = sorting[0]?.desc ? "desc" : "asc";
          }

          const data = await getAgreementsView(params as any);
          setRows(data.rows);
          setPagination(data.pagination);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to load agreements";
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      }

      if (filters.search.length > 2 || filters.search.length === 0) {
        loadData();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, sorting, filters]);

  useEffect(() => {
    if ((showCreateForm || showDetailPanel) && practices.length === 0) {
      setOptionsLoading(true);
      getAllPractices()
        .then((practiceList) => {
          setPractices(practiceList);
        })
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setOptionsLoading(false));
    }
  }, [showCreateForm, showDetailPanel, practices.length]);

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setActiveTab("overview");
    setIsDetailLoading(true);

    try {
      const agreement = await getAgreement(rowId);
      setSelectedAgreement(agreement);
      setEditForm(buildFormState(agreement));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch agreement";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function loadVersions(agreementId: string) {
    setVersionsLoading(true);
    try {
      const data = await getAgreementVersions({
        agreementId,
        page: 1,
        limit: 50,
      });
      setVersions(data.versions);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load versions";
      toast.error(message);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function loadServiceTerms(agreementId: string) {
    setTermsLoading(true);
    try {
      const data = await getAgreementServiceTerms({
        agreementId,
        page: 1,
        limit: 50,
      });
      setServiceTerms(data.terms);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load service terms";
      toast.error(message);
    } finally {
      setTermsLoading(false);
    }
  }

  function handleTabChange(tab: "overview" | "versions" | "terms") {
    setActiveTab(tab);
    if (tab === "versions" && selectedRowId && versions.length === 0) {
      loadVersions(selectedRowId);
    } else if (tab === "terms" && selectedRowId && serviceTerms.length === 0) {
      loadServiceTerms(selectedRowId);
      if (services.length === 0) {
        getAllServices().then(setServices).catch(console.error);
      }
      if (vendors.length === 0) {
        getAllVendorsApi().then(setVendors).catch(console.error);
      }
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedAgreement(null);
    setEditForm(initialFormState);
  }

  function openCreateForm() {
    setCreateForm(initialFormState);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedAgreement(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm(initialFormState);
  }

  function buildPayload(form: AgreementFormState): AgreementBody {
    return {
      practiceId: form.practiceId,
      dealId: form.dealId || null,
      type: form.type,
      status: form.status,
      value: Number.parseFloat(form.value) || undefined,
      ...(form.effectiveDate
        ? { effectiveDate: new Date(form.effectiveDate).toISOString() }
        : {}),
      ...(form.renewalDate
        ? { renewalDate: new Date(form.renewalDate).toISOString() }
        : {}),
      ...(form.terminationDate
        ? { terminationDate: new Date(form.terminationDate).toISOString() }
        : {}),
      ...(form.docusealTemplates?.length > 0
        ? {
            docusealSubmissions: form.docusealTemplates.map((id: string) => {
              const template = docusealTemplates.find(
                (t) => t.id === Number(id),
              );
              return {
                externalId: Number(id),
                status: "PENDING",
                templateId: Number(id),
                url: template?.documents?.[0]?.url || undefined,
                slug: template?.slug,
                submitters: template?.submitters?.map((init: any) => ({
                  role: init.name,
                  uuid: init.uuid,
                })),
              };
            }),
          }
        : {}),
    };
  }

  async function handleCreateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.practiceId) {
      toast.error("Practice is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAgreementApi(buildPayload(createForm));
      const data = await getAgreementsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeCreateForm();
      toast.success("Agreement created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create agreement";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.practiceId) {
      toast.error("Practice is required");
      return;
    }

    setIsSaving(true);
    try {
      const { docusealTemplates, ...updateData } = editForm;
      await updateAgreementApi(
        selectedRowId!,
        buildPayload(updateData as AgreementFormState),
      );
      const data = await getAgreementsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      toast.success("Agreement updated successfully");
    } catch (err) {
      console.log(err);
      const message =
        err instanceof Error ? err.message : "Failed to update agreement";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAgreement() {
    if (!selectedRowId) return;
    if (!window.confirm("Are you sure you want to delete this agreement?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAgreementApi(selectedRowId);
      const data = await getAgreementsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeDetailPanel();
      toast.success("Agreement deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete agreement";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSendForSignature() {
    const docusealId = getAgreementDocusealId(selectedAgreement!);
    if (!selectedAgreement || !selectedSignerId || !docusealId) {
      toast.error("Please select a person and ensure agreement has a template");
      return;
    }

    setIsSending(true);
    try {
      const result = await createDocusealSubmissionApi({
        agreementId: selectedAgreement.id,
        personId: selectedSignerId,
        templateId: String(docusealId),
      });

      if (result.submission?.embedUrl) {
        await sendAgreementEmailApi({
          agreementId: selectedAgreement.id,
          personId: selectedSignerId,
        });
      }

      toast.success("Signature request sent successfully!");
      setSelectedSignerId("");

      const updatedAgreement = await getAgreement(selectedAgreement.id);
      setSelectedAgreement(updatedAgreement);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send signature request";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }

  async function loadDocusealTemplates() {
    if (docusealTemplates.length > 0) return;
    setTemplatesLoading(true);
    try {
      const response = await getDocusealTemplates();
      setDocusealTemplates(response.templates.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch templates";
      toast.error(message);
    } finally {
      setTemplatesLoading(false);
    }
  }

  const navbarActions = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: openCreateForm,
    },
  ];

  const detailPanel = (
    <aside className="app-panel relative flex w-[500px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button
          type="button"
          onClick={closeDetailPanel}
          className="text-slate-400 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Circle className="h-4 w-4 text-slate-300" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
          {selectedAgreement?.type || "Agreement"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#f0ece6] px-4">
        <button
          type="button"
          onClick={() => handleTabChange("overview")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium ${
            activeTab === "overview"
              ? "border-[#4f63ea] text-[#4f63ea]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Overview
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("versions")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium ${
            activeTab === "versions"
              ? "border-[#4f63ea] text-[#4f63ea]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          Versions
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("terms")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium ${
            activeTab === "terms"
              ? "border-[#4f63ea] text-[#4f63ea]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Service Terms
        </button>
      </div>

      {isDetailLoading || !selectedAgreement ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading agreement...
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <form
              onSubmit={handleUpdateAgreement}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-auto p-4">
                <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Practice</span>
                    <span className="text-right text-slate-700">
                      {selectedAgreement.practice?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Deal</span>
                    <span className="text-right text-slate-700">
                      {selectedAgreement.deal?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Created</span>
                    <span className="text-right text-slate-700">
                      {formatDateTime(selectedAgreement.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Last Update</span>
                    <span className="text-right text-slate-700">
                      {formatDateTime(selectedAgreement.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Type <span className="text-red-500">*</span>
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
                      required
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
                      Status <span className="text-red-500">*</span>
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
                      required
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
                      Agreement Templates
                    </label>

                    {editForm?.docusealTemplates?.length ? (
                      editForm.docusealTemplates.map(
                        (init: any, index: number) => (
                          <a
                            key={index}
                            href={init.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[13px] text-[#4f63ea] hover:text-[#3d4ed1] hover:underline"
                          >
                            Open Template
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ),
                      )
                    ) : (
                      <span className="text-[13px] text-slate-400">
                        No template attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                <button
                  type="button"
                  onClick={handleDeleteAgreement}
                  disabled={isDeleting}
                  className="flex items-center cursor-pointer gap-2 text-[13px] text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="app-control inline-flex items-center gap-2 cursor-pointer rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* Versions Tab */}
          {activeTab === "versions" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
                <h3 className="text-[14px] font-medium text-slate-700">
                  Versions ({versions.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingVersionId(null);
                    setShowVersionForm(!showVersionForm);
                    setVersionForm({
                      versionNumber: versions.length + 1,
                      isCurrent: true,
                      effectiveDate: "",
                      endDate: "",
                      notes: "",
                    });
                  }}
                  className="inline-flex items-center cursor-pointer gap-1.5 rounded-md bg-[#4f63ea] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3d4ed1]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Version
                </button>
              </div>

              {showVersionForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedRowId) return;
                    setIsSavingVersion(true);
                    try {
                      if (editingVersionId) {
                        await updateAgreementVersionApi(editingVersionId, {
                          versionNumber: versionForm.versionNumber,
                          isCurrent: versionForm.isCurrent,
                          effectiveDate: versionForm.effectiveDate
                            ? new Date(versionForm.effectiveDate).toISOString()
                            : undefined,
                          endDate: versionForm.endDate
                            ? new Date(versionForm.endDate).toISOString()
                            : undefined,
                          notes: versionForm.notes,
                        });
                        toast.success("Version updated successfully");
                      } else {
                        await createAgreementVersionApi({
                          agreementId: selectedRowId,
                          versionNumber: versionForm.versionNumber,
                          isCurrent: versionForm.isCurrent,
                          effectiveDate: versionForm.effectiveDate
                            ? new Date(versionForm.effectiveDate).toISOString()
                            : undefined,
                          endDate: versionForm.endDate
                            ? new Date(versionForm.endDate).toISOString()
                            : undefined,
                          notes: versionForm.notes,
                        });
                        toast.success("Version created successfully");
                      }
                      setShowVersionForm(false);
                      setEditingVersionId(null);
                      loadVersions(selectedRowId);
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : `Failed to ${editingVersionId ? "update" : "create"} version`,
                      );
                    } finally {
                      setIsSavingVersion(false);
                    }
                  }}
                  className="border-b border-[#f0ece6] bg-[#faf9f7] p-4 space-y-3"
                >
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Version Number
                    </label>
                    <input
                      type="number"
                      value={versionForm.versionNumber}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          versionNumber: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={versionForm.isCurrent}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          isCurrent: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#4f63ea]"
                    />
                    <label className="text-[12px] text-slate-700">
                      Set as current version
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={versionForm.effectiveDate}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          effectiveDate: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={versionForm.endDate}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Notes
                    </label>
                    <textarea
                      value={versionForm.notes}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSavingVersion}
                      className="rounded-md bg-[#4f63ea] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
                    >
                      {isSavingVersion ? "Saving..." : (editingVersionId ? "Update" : "Save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVersionForm(false);
                        setEditingVersionId(null);
                      }}
                      className="rounded-md border border-[#ece8e1] px-3 py-1.5 text-[12px] font-medium text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-auto">
                {versionsLoading ? (
                  <div className="flex items-center justify-center p-4 text-[13px] text-slate-400">
                    Loading versions...
                  </div>
                ) : versions.length === 0 ? (
                  <div className="flex items-center justify-center p-4 text-[13px] text-slate-400">
                    No versions found. Create one to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0ece6]">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-[#faf9f7]"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-slate-700">
                              Version {version.versionNumber}
                            </span>
                            {version.isCurrent && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[12px] text-slate-500">
                            {version.effectiveDate
                              ? `Effective: ${new Date(version.effectiveDate).toLocaleDateString()}`
                              : "No effective date"}
                            {version.endDate &&
                              ` - ${new Date(version.endDate).toLocaleDateString()}`}
                          </div>
                          {version.notes && (
                            <div className="mt-1 text-[12px] text-slate-500">
                              {version.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVersionId(version.id);
                              setVersionForm({
                                versionNumber: version.versionNumber,
                                isCurrent: version.isCurrent,
                                effectiveDate: version.effectiveDate
                                  ? new Date(version.effectiveDate).toISOString().slice(0, 10)
                                  : "",
                                endDate: version.endDate
                                  ? new Date(version.endDate).toISOString().slice(0, 10)
                                  : "",
                                notes: version.notes || "",
                              });
                              setShowVersionForm(true);
                            }}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm("Delete this version?")) return;
                              try {
                                await deleteAgreementVersionApi(version.id);
                                toast.success("Version deleted");
                                if (selectedRowId) loadVersions(selectedRowId);
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to delete",
                                );
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Terms Tab */}
          {activeTab === "terms" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
                <h3 className="text-[14px] font-medium text-slate-700">
                  Service Terms ({serviceTerms.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTermId(null);
                    setShowTermForm(!showTermForm);
                    setTermForm({
                      serviceId: "",
                      vendorId: "",
                      pricingModel: "PER_PATIENT" as PricingModel,
                      pricingConfig: "{}",
                      currency: "USD",
                      priority: 1,
                      minimumFee: "",
                      effectiveDate: "",
                      endDate: "",
                      isActive: true,
                      externalReference: "",
                    });
                  }}
                  className="inline-flex items-center cursor-pointer gap-1.5 rounded-md bg-[#4f63ea] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3d4ed1]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Term
                </button>
              </div>

              {showTermForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedRowId || !termForm.serviceId) {
                      toast.error("Service is required");
                      return;
                    }
                    setIsSavingTerm(true);
                    try {
                      if (editingTermId) {
                        await updateAgreementServiceTermApi(editingTermId, {
                          serviceId: termForm.serviceId,
                          vendorId: termForm.vendorId || null,
                          pricingModel: termForm.pricingModel,
                          pricingConfig: JSON.parse(termForm.pricingConfig),
                          currency: termForm.currency,
                          priority: termForm.priority,
                          minimumFee: termForm.minimumFee
                            ? parseFloat(termForm.minimumFee)
                            : undefined,
                          effectiveDate: termForm.effectiveDate
                            ? new Date(termForm.effectiveDate).toISOString()
                            : undefined,
                          endDate: termForm.endDate
                            ? new Date(termForm.endDate).toISOString()
                            : undefined,
                          isActive: termForm.isActive,
                          externalReference: termForm.externalReference,
                        });
                        toast.success("Service term updated successfully");
                      } else {
                        await createAgreementServiceTermApi({
                          agreementId: selectedRowId,
                          serviceId: termForm.serviceId,
                          vendorId: termForm.vendorId || null,
                          pricingModel: termForm.pricingModel,
                          pricingConfig: JSON.parse(termForm.pricingConfig),
                          currency: termForm.currency,
                          priority: termForm.priority,
                          minimumFee: termForm.minimumFee
                            ? parseFloat(termForm.minimumFee)
                            : undefined,
                          effectiveDate: termForm.effectiveDate
                            ? new Date(termForm.effectiveDate).toISOString()
                            : undefined,
                          endDate: termForm.endDate
                            ? new Date(termForm.endDate).toISOString()
                            : undefined,
                          isActive: termForm.isActive,
                          externalReference: termForm.externalReference,
                        });
                        toast.success("Service term created successfully");
                      }
                      setShowTermForm(false);
                      setEditingTermId(null);
                      loadServiceTerms(selectedRowId);
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : `Failed to ${editingTermId ? "update" : "create"} term`,
                      );
                    } finally {
                      setIsSavingTerm(false);
                    }
                  }}
                  className="border-b border-[#f0ece6] bg-[#faf9f7] p-4 space-y-3 max-h-[400px] overflow-y-auto"
                >
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Service <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={termForm.serviceId}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          serviceId: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      required
                    >
                      <option value="">Select Service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Vendor
                    </label>
                    <select
                      value={termForm.vendorId}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          vendorId: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                    >
                      <option value="">None</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Pricing Model <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={termForm.pricingModel}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          pricingModel: e.target.value as PricingModel,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      required
                    >
                      {pricingModelOptions.map((model) => (
                        <option key={model} value={model}>
                          {model.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Pricing Config (JSON)
                    </label>
                    <textarea
                      value={termForm.pricingConfig}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          pricingConfig: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px] font-mono"
                      rows={3}
                      placeholder='{"rate": 100}'
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-slate-700">
                        Minimum Fee
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={termForm.minimumFee}
                        onChange={(e) =>
                          setTermForm((prev) => ({
                            ...prev,
                            minimumFee: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-slate-700">
                        Priority
                      </label>
                      <input
                        type="number"
                        value={termForm.priority}
                        onChange={(e) =>
                          setTermForm((prev) => ({
                            ...prev,
                            priority: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-slate-700">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        value={termForm.effectiveDate}
                        onChange={(e) =>
                          setTermForm((prev) => ({
                            ...prev,
                            effectiveDate: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-slate-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={termForm.endDate}
                        onChange={(e) =>
                          setTermForm((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={termForm.isActive}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#4f63ea]"
                    />
                    <label className="text-[12px] text-slate-700">Active</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSavingTerm}
                      className="rounded-md bg-[#4f63ea] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
                    >
                      {isSavingTerm ? "Saving..." : (editingTermId ? "Update" : "Save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTermForm(false);
                        setEditingTermId(null);
                      }}
                      className="rounded-md border border-[#ece8e1] px-3 py-1.5 text-[12px] font-medium text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-auto">
                {termsLoading ? (
                  <div className="flex items-center justify-center p-4 text-[13px] text-slate-400">
                    Loading service terms...
                  </div>
                ) : serviceTerms.length === 0 ? (
                  <div className="flex items-center justify-center p-4 text-[13px] text-slate-400">
                    No service terms found. Add one to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0ece6]">
                    {serviceTerms.map((term) => (
                      <div
                        key={term.id}
                        className="px-4 py-3 hover:bg-[#faf9f7]"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-slate-700">
                                {term.service?.name || "Unknown Service"}
                              </span>
                              {term.isActive && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-[12px] text-slate-500">
                              {formatPricingModel(term.pricingModel)} •{" "}
                              {term.currency}
                              {term.vendor?.name &&
                                ` • Vendor: ${term.vendor.name}`}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Priority: {term.priority}
                              {term.minimumFee &&
                                ` • Min Fee: $${term.minimumFee}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTermId(term.id);
                                setTermForm({
                                  serviceId: term.serviceId,
                                  vendorId: term.vendorId || "",
                                  pricingModel: term.pricingModel as PricingModel,
                                  pricingConfig: JSON.stringify(term.pricingConfig || {}),
                                  currency: term.currency,
                                  priority: term.priority,
                                  minimumFee: term.minimumFee?.toString() || "",
                                  effectiveDate: term.effectiveDate
                                    ? new Date(term.effectiveDate).toISOString().slice(0, 10)
                                    : "",
                                  endDate: term.endDate
                                    ? new Date(term.endDate).toISOString().slice(0, 10)
                                    : "",
                                  isActive: term.isActive,
                                  externalReference: term.externalReference || "",
                                });
                                setShowTermForm(true);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm("Delete this service term?"))
                                  return;
                                try {
                                  await deleteAgreementServiceTermApi(term.id);
                                  toast.success("Service term deleted");
                                  if (selectedRowId)
                                    loadServiceTerms(selectedRowId);
                                } catch (err) {
                                  toast.error(
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to delete",
                                  );
                                }
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );

  const createPanel = (
    <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">
          Create Agreement
        </h2>
        <button
          type="button"
          onClick={closeCreateForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={handleCreateAgreement}
        className="flex-1 overflow-auto p-4"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Practice <span className="text-red-500">*</span>
            </label>
            {optionsLoading ? (
              <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                Loading...
              </div>
            ) : (
              <select
                value={createForm.practiceId}
                onChange={(event) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    practiceId: event.target.value,
                    dealId: "",
                  }));
                }}
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                required
              >
                <option value="">Select Practice</option>
                {practices.map((practice) => (
                  <option key={practice.id} value={practice.id}>
                    {practice.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={createForm.type}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  type: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
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
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={createForm.status}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  status: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            >
              {agreementStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          {/*<div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Value
            </label>
            <input
              type="number"
              step="0.01"
              value={createForm.value}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  value: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              placeholder="0.00"
            />
          </div>*/}

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Effective Date
            </label>
            <input
              type="date"
              value={createForm.effectiveDate}
              onChange={(event) =>
                setCreateForm((prev) => ({
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
              value={createForm.renewalDate}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  renewalDate: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          {/*<div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Termination Date
            </label>
            <input
              type="date"
              value={createForm.terminationDate}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  terminationDate: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>*/}

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Agreement Templates
            </label>
            {templatesLoading ? (
              <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                Loading...
              </div>
            ) : (
              <div
                onClick={() => loadDocusealTemplates()}
                className="app-control rounded-md px-3 py-2 text-[13px] max-h-[150px] overflow-y-auto"
              >
                {docusealTemplates.length === 0 ? (
                  <span className="text-slate-400">
                    Click to load templates
                  </span>
                ) : (
                  <div className="space-y-2">
                    {docusealTemplates.map((template) => (
                      <label
                        key={template.id}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={createForm.docusealTemplates.includes(
                            String(template.id),
                          )}
                          onChange={(e) => {
                            const templateId = String(template.id);
                            setCreateForm((prev) => ({
                              ...prev,
                              docusealTemplates: e.target.checked
                                ? [...prev.docusealTemplates, templateId]
                                : prev.docusealTemplates.filter(
                                    (id: string) => id !== templateId,
                                  ),
                            }));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-[#4f63ea] focus:ring-[#4f63ea]"
                        />
                        <span className="text-slate-700">{template.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
            <button
              type="button"
              onClick={closeCreateForm}
              className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] cursor-pointer font-medium text-slate-600 hover:bg-[#f7f5f1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#f7f5f1] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Agreement"}
            </button>
          </div>
          {/*<button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[#4f63ea] py-2 text-[14px] font-medium text-white hover:bg-[#3d4ed1]"
          >
            {isSubmitting ? "Creating..." : "Create Agreement"}
          </button>*/}
        </div>
      </form>
    </aside>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Agreements"
        activeModule="Agreements"
        activeSubItem="All Agreements"
        navbarActions={navbarActions}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading agreements...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Agreements"
      activeModule="Agreements"
      activeSubItem="All Agreements"
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8e3db] bg-white">
          <div className="flex items-center justify-between border-b border-[#eeebe5] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>Agreements</span>
              {/*<span className="text-slate-400">
                .{table.getRowModel().rows.length}
              </span>*/}
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                Filters
              </button>
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "creationDate"
                      ? [{ id: "creationDate", desc: !current[0].desc }]
                      : [{ id: "creationDate", desc: true }],
                  )
                }
              >
                Sort
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, status: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Statuses</option>
                {agreementStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              <select
                value={filters.type}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, type: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Types</option>
                {agreementTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFilters({ search: "", status: "", type: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.status && !filters.type}
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-white text-[13px] font-medium text-slate-400">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        className={`border-b border-[#eeebe5] px-4 py-3 ${
                          index < headerGroup.headers.length - 1
                            ? "border-r border-[#f2eee8]"
                            : ""
                        }`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="text-[14px] text-slate-600">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      selectedRowId === row.original.id
                        ? "bg-[#fcfbf9]"
                        : "bg-white"
                    }
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <td
                        key={cell.id}
                        className={`border-b border-[#f4f1ec] px-4 py-3 ${
                          index < row.getVisibleCells().length - 1
                            ? "border-r border-[#f5f2ed]"
                            : ""
                        }`}
                      >
                        {cell.column.id === "name" ? (
                          <button
                            type="button"
                            onClick={() => handleRowClick(row.original.id)}
                            className="hover:text-[#4f63ea]"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </button>
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-2.5">
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                {Array.from(
                  { length: pagination.totalPages },
                  (_, i) => i + 1,
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`rounded px-2 py-1 text-[13px] ${
                      pagination.page === page
                        ? "bg-[#4f63ea] text-white"
                        : "text-slate-500 hover:bg-[#f0ece6]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
      </div>
    </AppLayout>
  );
}

export default AllAgreementsPage;
