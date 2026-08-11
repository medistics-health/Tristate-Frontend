import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  ChevronLeft,
  Circle,
  LayoutList,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import { getAllPractices } from "../../services/operations/practices";
import { getAllCompanies } from "../../services/operations/companies";
import { getPersonsView } from "../../services/operations/persons";
import { getAllServices } from "../../services/operations/services";
import {
  createDealApi,
  deleteDealApi,
  getDeal,
  getDealsView,
  updateDealApi,
  type Deal,
  type DealApiError,
  type DealBody,
  type DealRow,
  type DealStage,
  type DealStageReadiness,
  dealStageOptions,
} from "../../services/operations/deals";
import type { Practice } from "../practices/types";
import type { Company } from "../companies/types";
import type { Service } from "../services/types";
import { canBusinessWrite, readStoredUser } from "../../utils/auth";

const stageStyles: Record<DealStage, string> = {
  PROSPECTING: "bg-blue-100 text-blue-700",
  QUALIFICATION: "bg-indigo-100 text-indigo-700",
  PROPOSAL: "bg-violet-100 text-violet-700",
  AGREEMENT_SENT: "bg-amber-100 text-amber-800",
  ONBOARDING: "bg-cyan-100 text-cyan-800",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

type DealFormState = {
  practiceId: string;
  companyId: string;
  primaryContactId: string;
  stage: DealStage;
  value: string;
  probability: string;
  expectedCloseDate: string;
  selectedServiceIds: string[];
  nextTaskTitle: string;
  nextTaskDueAt: string;
};

type ContactOption = {
  id: string;
  fullName: string;
  email: string;
  practiceIds: string[];
  companyIds: string[];
};

const initialFormState: DealFormState = {
  practiceId: "",
  companyId: "",
  primaryContactId: "",
  stage: "PROSPECTING",
  value: "",
  probability: "50",
  expectedCloseDate: "",
  selectedServiceIds: [],
  nextTaskTitle: "",
  nextTaskDueAt: "",
};

function formatStageLabel(stage: string) {
  return stage.replace(/_/g, " ");
}

function formatCurrency(amount: number | string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  return formatDateTime(value);
}

function buildFormState(deal?: Deal | null): DealFormState {
  if (!deal) return initialFormState;
  return {
    practiceId: deal.practiceId,
    companyId: deal.companyId || deal.practice?.company?.id || "",
    primaryContactId: deal.primaryContactId || "",
    stage: deal.stage,
    value: String(deal.value),
    probability: String(deal.probability),
    expectedCloseDate: deal.expectedCloseDate
      ? new Date(deal.expectedCloseDate).toISOString().slice(0, 10)
      : "",
    selectedServiceIds: deal.selectedServiceIds || [],
    nextTaskTitle: deal.nextTaskTitle || "",
    nextTaskDueAt: deal.nextTaskDueAt
      ? new Date(deal.nextTaskDueAt).toISOString().slice(0, 10)
      : "",
  };
}

function getReadinessForStage(
  readiness: DealStageReadiness,
  stage: DealStage,
) {
  if (stage === "PROPOSAL") return readiness.PROPOSAL;
  if (stage === "AGREEMENT_SENT") return readiness.AGREEMENT_SENT;
  if (stage === "ONBOARDING") return readiness.ONBOARDING;
  return null;
}

function buildRequirementErrorMessage(
  baseMessage: string,
  missingRequirements?: string[],
) {
  if (!missingRequirements?.length) return baseMessage;
  return `${baseMessage} Missing: ${missingRequirements.join(", ")}.`;
}

function SelectedServicesField({
  form,
  setForm,
  services,
  mode,
  readOnly = false,
}: {
  form: DealFormState;
  setForm: React.Dispatch<React.SetStateAction<DealFormState>>;
  services: Service[];
  mode: "create" | "edit";
  readOnly?: boolean;
}) {
  const selectedServices = services.filter((service) =>
    form.selectedServiceIds.includes(service.id),
  );

  const selectedLabel = selectedServices.length
    ? selectedServices.map((service) => service.name).join(" + ")
    : "-";

  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-slate-700">
        Selected Services
      </label>
      {mode === "edit" ? (
        <div className="mb-2 rounded-md border border-[#ece8e1] bg-[#faf9f7] px-3 py-2 text-[13px] text-slate-700">
          {selectedLabel}
        </div>
      ) : null}
      <details className="rounded-md border border-[#ece8e1] bg-white">
        <summary className="cursor-pointer list-none px-3 py-2 text-[13px] text-slate-700">
          {selectedServices.length
            ? `${selectedServices.length} service${selectedServices.length > 1 ? "s" : ""} selected`
            : "Select services"}
        </summary>
        <div className="max-h-48 space-y-2 overflow-auto border-t border-[#f0ece6] px-3 py-3">
          {services.map((service) => {
            const checked = form.selectedServiceIds.includes(service.id);
            return (
              <label
                key={service.id}
                className="flex cursor-pointer items-start gap-2 text-[13px] text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={readOnly}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      selectedServiceIds: event.target.checked
                        ? [...prev.selectedServiceIds, service.id]
                        : prev.selectedServiceIds.filter((id) => id !== service.id),
                    }))
                  }
                  className="mt-0.5"
                />
                <span>
                  {service.name}
                  {service.category ? ` - ${service.category}` : ""}
                </span>
              </label>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function DealFormFields({
  form,
  setForm,
  practices,
  companies,
  services,
  contactOptions,
  mode,
  readOnly = false,
}: {
  form: DealFormState;
  setForm: React.Dispatch<React.SetStateAction<DealFormState>>;
  practices: Practice[];
  companies: Company[];
  services: Service[];
  contactOptions: ContactOption[];
  mode: "create" | "edit";
  readOnly?: boolean;
}) {
  const selectedPractice = useMemo(
    () => practices.find((practice) => practice.id === form.practiceId) || null,
    [form.practiceId, practices],
  );

  const availableContacts = useMemo(() => {
    return contactOptions.filter((contact) => {
      if (form.practiceId && contact.practiceIds.includes(form.practiceId)) {
        return true;
      }
      if (form.companyId && contact.companyIds.includes(form.companyId)) {
        return true;
      }
      return false;
    });
  }, [contactOptions, form.companyId, form.practiceId]);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Practice <span className="text-red-500">*</span>
        </label>
        <select
          value={form.practiceId}
          disabled={readOnly}
          onChange={(event) => {
            const nextPracticeId = event.target.value;
            const practice = practices.find((item) => item.id === nextPracticeId);
            setForm((prev) => ({
              ...prev,
              practiceId: nextPracticeId,
              companyId: practice?.companyId || "",
              primaryContactId: "",
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
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Company
        </label>
        <select
          value={form.companyId}
          disabled={readOnly}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              companyId: event.target.value,
              primaryContactId: "",
            }))
          }
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        >
          <option value="">Select Company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        {selectedPractice?.company?.name ? (
          <p className="mt-1 text-[12px] text-slate-400">
            Linked practice company: {selectedPractice.company.name}
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Primary Contact
        </label>
        <select
          value={form.primaryContactId}
          disabled={readOnly}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              primaryContactId: event.target.value,
            }))
          }
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        >
          <option value="">Select Contact</option>
          {availableContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.fullName}
              {contact.email ? ` - ${contact.email}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Stage <span className="text-red-500">*</span>
        </label>
        <select
          value={form.stage}
          disabled={readOnly}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              stage: event.target.value as DealStage,
            }))
          }
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        >
          {dealStageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {formatStageLabel(stage)}
            </option>
          ))}
        </select>
      </div>

      <SelectedServicesField
        form={form}
        setForm={setForm}
        services={services}
        mode={mode}
        readOnly={readOnly}
      />

      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Value <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="1"
          value={form.value}
          readOnly={readOnly}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              value: event.target.value,
            }))
          }
          placeholder="0"
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Probability (%) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={form.probability}
          readOnly={readOnly}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              probability: event.target.value,
            }))
          }
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Expected Close Date
        </label>
        <input
          type="date"
          value={form.expectedCloseDate}
          readOnly={readOnly}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              expectedCloseDate: event.target.value,
            }))
          }
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Next Task
        </label>
        <input
          type="text"
          value={form.nextTaskTitle}
          readOnly={readOnly}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              nextTaskTitle: event.target.value,
            }))
          }
          placeholder="Follow-up Call"
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Next Task Due
        </label>
        <input
          type="date"
          value={form.nextTaskDueAt}
          readOnly={readOnly}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              nextTaskDueAt: event.target.value,
            }))
          }
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        />
      </div>
    </div>
  );
}

function DealsPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canManageDeals = canBusinessWrite(currentRole);

  const [rows, setRows] = useState<DealRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
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
  const [filters, setFilters] = useState({
    stage: "",
    practiceId: "",
    minValue: "",
    maxValue: "",
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "lastActivity", desc: true },
  ]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [createForm, setCreateForm] = useState<DealFormState>(initialFormState);
  const [editForm, setEditForm] = useState<DealFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = useMemo(
    () =>
      [
        {
          id: "practiceName",
          accessorFn: (row: DealRow) => row.values.practiceName,
          header: () => "Practice",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.practiceName || "-"),
        },
        {
          id: "companyName",
          accessorFn: (row: DealRow) => row.values.companyName,
          header: () => "Company",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.companyName || "-"),
        },
        {
          id: "primaryContactName",
          accessorFn: (row: DealRow) => row.values.primaryContactName,
          header: () => "Primary Contact",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.primaryContactName || "-"),
        },
        {
          id: "stage",
          accessorFn: (row: DealRow) => row.values.stage,
          header: () => "Stage",
          cell: ({ row }: { row: { original: DealRow } }) => {
            const stage = row.original.values.stage;
            return (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stageStyles[stage]}`}
              >
                {formatStageLabel(stage)}
              </span>
            );
          },
        },
        {
          id: "services",
          accessorFn: (row: DealRow) => row.values.services,
          header: () => "Services",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.services || "-"),
        },
        {
          id: "value",
          accessorFn: (row: DealRow) => row.values.value,
          header: () => "Value",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.value || "-"),
        },
        {
          id: "lastActivity",
          accessorFn: (row: DealRow) => row.values.lastActivity,
          header: () => "Last Activity",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.lastActivity || "-"),
        },
        {
          id: "activityCount",
          accessorFn: (row: DealRow) => row.values.activityCount,
          header: () => "Activity Count",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.activityCount ?? 0),
        },
        {
          id: "nextTask",
          accessorFn: (row: DealRow) => row.values.nextTask,
          header: () => "Next Task",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.nextTask || "-"),
        },
        {
          id: "nextTaskDueAt",
          accessorFn: (row: DealRow) => row.values.nextTaskDueAt,
          header: () => "Next Task Due",
          cell: ({ row }: { row: { original: DealRow } }) =>
            String(row.original.values.nextTaskDueAt || "-"),
        },
      ] as ColumnDef<DealRow>[],
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

  const selectedPracticeForCreate = useMemo(
    () =>
      practices.find((practice) => practice.id === createForm.practiceId) || null,
    [createForm.practiceId, practices],
  );

  const selectedPracticeForEdit = useMemo(
    () =>
      practices.find((practice) => practice.id === editForm.practiceId) || null,
    [editForm.practiceId, practices],
  );

  const activeReadiness = useMemo(
    () =>
      selectedDeal
        ? getReadinessForStage(selectedDeal.stageReadiness, editForm.stage)
        : null,
    [editForm.stage, selectedDeal],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          setError(null);
          const data = await getDealsView({
            page: pagination.page,
            limit: pagination.limit,
            stage: filters.stage || undefined,
            practiceId: filters.practiceId || undefined,
            minValue: filters.minValue
              ? parseFloat(filters.minValue)
              : undefined,
            maxValue: filters.maxValue
              ? parseFloat(filters.maxValue)
              : undefined,
          });
          setRows(data.rows);
          setPagination(data.pagination);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to load deals";
          setError(message);
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      }

      loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.maxValue, filters.minValue, filters.practiceId, filters.stage, pagination.limit, pagination.page, sorting]);

  useEffect(() => {
    getAllPractices().then(setPractices).catch(console.error);
    getAllCompanies().then(setCompanies).catch(console.error);
    getAllServices().then(setServices).catch(console.error);
    getPersonsView({ page: 1, limit: 200 })
      .then((data) => {
        const options = data.rows.map((row) => ({
          id: row.id,
          fullName: String(row.values.fullName || "").trim(),
          email: String(row.values.email || ""),
          practiceIds: Array.isArray(row.values.practiceIds)
            ? (row.values.practiceIds as string[])
            : [],
          companyIds: Array.isArray(row.values.companyIds)
            ? (row.values.companyIds as string[])
            : [],
        }));
        setContactOptions(options);
      })
      .catch(console.error);
  }, []);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getDealsView({
      page: targetPage,
      limit: pagination.limit,
      stage: filters.stage || undefined,
      practiceId: filters.practiceId || undefined,
      minValue: filters.minValue ? parseFloat(filters.minValue) : undefined,
      maxValue: filters.maxValue ? parseFloat(filters.maxValue) : undefined,
    });
    setRows(data.rows);
    setPagination(data.pagination);
  }

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const deal = await getDeal(rowId);
      setSelectedDeal(deal);
      setEditForm(buildFormState(deal));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch deal";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedDeal(null);
    setEditForm(initialFormState);
  }

  function openCreateForm() {
    if (!canManageDeals) return;
    setCreateForm(initialFormState);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedDeal(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm(initialFormState);
  }

  function buildPayload(form: DealFormState, selectedPractice?: Practice | null): DealBody {
    return {
      practiceId: form.practiceId,
      companyId: form.companyId || selectedPractice?.companyId || undefined,
      primaryContactId: form.primaryContactId || undefined,
      stage: form.stage,
      value: parseFloat(form.value),
      probability: parseFloat(form.probability),
      selectedServiceIds: form.selectedServiceIds,
      ...(form.expectedCloseDate
        ? { expectedCloseDate: new Date(form.expectedCloseDate).toISOString() }
        : {}),
      ...(form.nextTaskTitle ? { nextTaskTitle: form.nextTaskTitle } : {}),
      ...(form.nextTaskDueAt
        ? { nextTaskDueAt: new Date(form.nextTaskDueAt).toISOString() }
        : {}),
    };
  }

  async function handleCreateDeal(event: React.FormEvent) {
    event.preventDefault();
    if (!canManageDeals) return;
    if (!createForm.practiceId || !createForm.value) {
      toast.error("Practice and value are required");
      return;
    }
    const value = parseFloat(createForm.value);
    if (Number.isNaN(value)) {
      toast.error("Enter a valid value");
      return;
    }
    setIsSubmitting(true);
    try {
      await createDealApi(buildPayload(createForm, selectedPracticeForCreate));
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      closeCreateForm();
      toast.success("Deal created successfully");
    } catch (err) {
      const error = err as DealApiError;
      toast.error(
        buildRequirementErrorMessage(
          error.message || "Failed to create deal",
          error.missingRequirements,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateDeal(event: React.FormEvent) {
    event.preventDefault();
    if (!canManageDeals) return;
    if (!selectedDeal) return;
    if (!editForm.practiceId || !editForm.value) {
      toast.error("Practice and value are required");
      return;
    }
    const value = parseFloat(editForm.value);
    if (Number.isNaN(value)) {
      toast.error("Enter a valid value");
      return;
    }
    setIsSaving(true);
    try {
      await updateDealApi(
        selectedDeal.id,
        buildPayload(editForm, selectedPracticeForEdit),
      );
      await refreshRows();
      const refreshedDeal = await getDeal(selectedDeal.id);
      setSelectedDeal(refreshedDeal);
      setEditForm(buildFormState(refreshedDeal));
      toast.success("Deal updated successfully");
    } catch (err) {
      const error = err as DealApiError;
      toast.error(
        buildRequirementErrorMessage(
          error.message || "Failed to update deal",
          error.missingRequirements,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDeal() {
    if (!canManageDeals) return;
    if (!selectedDeal) return;
    if (!window.confirm("Are you sure you want to delete this deal?")) return;
    setIsDeleting(true);
    try {
      await deleteDealApi(selectedDeal.id);
      await refreshRows();
      closeDetailPanel();
      toast.success("Deal deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete deal";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const navbarActions = canManageDeals
    ? [
        {
          label: "New Deal",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateForm,
        },
      ]
    : [];

  const detailPanel = (
    <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[430px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
          {selectedDeal?.card.practiceName || selectedDeal?.practice?.name || "Deal"}
        </span>
      </div>

      {isDetailLoading || !selectedDeal ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading deal...
        </div>
      ) : (
        <form
          onSubmit={handleUpdateDeal}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-5 rounded-2xl border border-[#eadfcd] bg-gradient-to-br from-[#f9f4ec] via-white to-[#f4f7fb] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold text-slate-800">
                    {selectedDeal.card.practiceName}
                  </h2>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageStyles[selectedDeal.stage]}`}
                >
                  {formatStageLabel(selectedDeal.stage)}
                </span>
              </div>

              <div className="space-y-2 text-[13px] text-slate-700">
                <div>Services: {selectedDeal.card.servicesLabel || "-"}</div>
                <div>Value: {selectedDeal.card.valueLabel || formatCurrency(selectedDeal.value)}</div>
                <div>
                  Last Activity:{" "}
                  {formatRelativeDate(
                    selectedDeal.card.lastActivityAt || selectedDeal.lastActivityAt,
                  )}
                </div>
                <div>Next Task: {selectedDeal.card.nextTaskTitle || "-"}</div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-[12px] text-slate-600">
                <span>Activity count</span>
                <span className="text-[18px] font-semibold text-slate-800">
                  {selectedDeal.card.activityCount}
                </span>
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
              <div className="mb-2 flex items-center gap-2 font-medium text-slate-700">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Stage Validation
              </div>
              {activeReadiness ? (
                <div className="space-y-2">
                  <div
                    className={`rounded-lg px-3 py-2 text-[12px] ${
                      activeReadiness.complete
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {activeReadiness.complete
                      ? `${formatStageLabel(editForm.stage)} is ready.`
                      : `${formatStageLabel(editForm.stage)} is blocked.`}
                  </div>
                  {!activeReadiness.complete && activeReadiness.missing.length ? (
                    <ul className="space-y-1 text-[12px] text-slate-600">
                      {activeReadiness.missing.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="text-[12px] text-slate-500">
                  Validation rules are enforced for Proposal, Agreement Sent, and
                  Onboarding.
                </p>
              )}
            </div>

            <DealFormFields
              form={editForm}
              setForm={setEditForm}
              practices={practices}
              companies={companies}
              services={services}
              contactOptions={contactOptions}
              mode="edit"
              readOnly={!canManageDeals}
            />
          </div>

          {canManageDeals ? (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={handleDeleteDeal}
                disabled={isDeleting}
                className="flex cursor-pointer items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="app-control inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </aside>
  );

  const createPanel = (
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[430px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">Create Deal</h2>
        <button
          type="button"
          onClick={closeCreateForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleCreateDeal} className="flex-1 overflow-auto p-4">
        <div className="mb-5 rounded-2xl border border-dashed border-[#d9cfbf] bg-[#faf7f2] p-4 text-[13px] text-slate-600">
          <div className="font-medium text-slate-700">Card Preview</div>
          <div className="mt-3 space-y-2">
            <div>{selectedPracticeForCreate?.name || "Practice Name"}</div>
            <div>
              Services:{" "}
              {createForm.selectedServiceIds.length
                ? services
                    .filter((service) =>
                      createForm.selectedServiceIds.includes(service.id),
                    )
                    .map((service) => service.name)
                    .join(" + ")
                : "-"}
            </div>
            <div>Value: {createForm.value ? formatCurrency(createForm.value) : "-"}</div>
            <div>Last Activity: -</div>
            <div>Next Task: {createForm.nextTaskTitle || "-"}</div>
          </div>
        </div>

        <DealFormFields
          form={createForm}
          setForm={setCreateForm}
          practices={practices}
          companies={companies}
          services={services}
          contactOptions={contactOptions}
          mode="create"
        />

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
          <button
            type="button"
            onClick={closeCreateForm}
            className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </aside>
  );

  if (isLoading && rows.length === 0) {
    return (
      <AppLayout title="Deals" activeModule="Deals" activeSubItem="All Deals">
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading deals...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout title="Deals" activeModule="Deals" activeSubItem="All Deals">
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-red-500">{error}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="app-control rounded-md px-4 py-2 text-[14px] font-medium"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Deals"
      activeModule="Deals"
      activeSubItem="All Deals"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-split">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>All Deals</span>
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel((current) => !current)}
              >
                Filters
              </button>
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "lastActivity"
                      ? [{ id: "lastActivity", desc: !current[0].desc }]
                      : [{ id: "lastActivity", desc: true }],
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
                value={filters.stage}
                onChange={(event) => {
                  setFilters((prev) => ({
                    ...prev,
                    stage: event.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Stages</option>
                {dealStageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {formatStageLabel(stage)}
                  </option>
                ))}
              </select>
              <select
                value={filters.practiceId}
                onChange={(event) => {
                  setFilters((prev) => ({
                    ...prev,
                    practiceId: event.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Practices</option>
                {practices.map((practice) => (
                  <option key={practice.id} value={practice.id}>
                    {practice.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Min Value"
                value={filters.minValue}
                onChange={(event) => {
                  setFilters((prev) => ({
                    ...prev,
                    minValue: event.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control w-32 rounded-md px-3 py-1.5 text-[13px]"
              />
              <input
                type="number"
                placeholder="Max Value"
                value={filters.maxValue}
                onChange={(event) => {
                  setFilters((prev) => ({
                    ...prev,
                    maxValue: event.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control w-32 rounded-md px-3 py-1.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    stage: "",
                    practiceId: "",
                    minValue: "",
                    maxValue: "",
                  })
                }
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={
                  !filters.stage &&
                  !filters.practiceId &&
                  !filters.minValue &&
                  !filters.maxValue
                }
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="relative flex min-h-[400px] items-center justify-center">
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    No deals found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Create your first deal to get started
                  </p>
                  {canManageDeals ? (
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Deal
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400 last:border-r-0"
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              onClick={
                                header.column.getCanSort()
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                              className="flex w-full items-center gap-2"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => {
                    const isSelected = row.original.id === selectedRowId;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => handleRowClick(row.original.id)}
                        className={`cursor-pointer ${
                          isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600 last:border-r-0"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-2.5">
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
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
                  (_, index) => index + 1,
                ).map((page) => (
                  <button
                    type="button"
                    key={page}
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
        </section>

        {showDetailPanel && detailPanel}
        {showCreateForm && canManageDeals && createPanel}
      </div>
    </AppLayout>
  );
}

export default DealsPage;
