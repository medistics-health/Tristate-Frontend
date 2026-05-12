import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  Circle,
  Coins,
  LoaderCircle,
  LayoutList,
  Play,
  Plus,
  Receipt,
  Save,
  Send,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Practice } from "../practices/types";
import type { Service } from "../services/types";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import { getAllInvoices, type Invoice } from "../../services/operations/invoices";
import { getAllPractices } from "../../services/operations/practices";
import { getAllServices } from "../../services/operations/services";
import {
  approveBillingRunApi,
  billingRunStatusOptions,
  calculateBillingRunApi,
  createBillingRunApi,
  getBillingReadiness,
  getBillingRun,
  getBillingRunsView,
  postBillingRunApi,
  recordPaymentApi,
  type BillingReadinessResponse,
  type BillingRunDetail,
  type BillingRunRow,
  type BillingRunStatus,
  type BillingSnapshotInput,
} from "../../services/operations/billings";

const statusStyles: Record<BillingRunStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  RUNNING: "bg-sky-100 text-sky-700",
  CALCULATED: "bg-emerald-100 text-emerald-700",
  REVIEW_REQUIRED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-indigo-100 text-indigo-700",
  POSTED: "bg-violet-100 text-violet-700",
  FAILED: "bg-red-100 text-red-700",
  CLOSED: "bg-zinc-100 text-zinc-600",
};

type SnapshotFormRow = {
  metricKey: string;
  metricValue: string;
  serviceId: string;
  sourceType: string;
  sourceReference: string;
};

type CreateRunFormState = {
  practiceId: string;
  periodStart: string;
  periodEnd: string;
  notes: string;
  autoCalculate: boolean;
  snapshots: SnapshotFormRow[];
};

type PaymentAllocationRow = {
  invoiceId: string;
  allocatedAmount: string;
};

type PaymentFormState = {
  practiceId: string;
  amount: string;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  externalReference: string;
  allocations: PaymentAllocationRow[];
};

const initialSnapshotRow = (): SnapshotFormRow => ({
  metricKey: "",
  metricValue: "",
  serviceId: "",
  sourceType: "manual",
  sourceReference: "",
});

const initialCreateRunForm: CreateRunFormState = {
  practiceId: "",
  periodStart: "",
  periodEnd: "",
  notes: "",
  autoCalculate: false,
  snapshots: [initialSnapshotRow()],
};

const initialPaymentForm: PaymentFormState = {
  practiceId: "",
  amount: "",
  currency: "USD",
  paymentDate: "",
  paymentMethod: "check",
  externalReference: "",
  allocations: [{ invoiceId: "", allocatedAmount: "" }],
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatMoney(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "-";
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(numericValue);
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function mapSnapshotsForApi(rows: SnapshotFormRow[]): BillingSnapshotInput[] {
  return rows
    .filter((row) => row.metricKey.trim() || row.metricValue.trim())
    .map((row) => ({
      metricKey: row.metricKey.trim(),
      metricValue: row.metricValue.trim() ? Number(row.metricValue) : null,
      serviceId: row.serviceId || undefined,
      sourceType: row.sourceType || undefined,
      sourceReference: row.sourceReference || undefined,
    }));
}

function BillingRunsPage() {
  const [rows, setRows] = useState<BillingRunRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<BillingRunDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateRunFormState>(initialCreateRunForm);
  const [paymentForm, setPaymentForm] =
    useState<PaymentFormState>(initialPaymentForm);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ practiceId: "", status: "" });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readiness, setReadiness] = useState<BillingReadinessResponse | null>(null);
  const [isReadinessLoading, setIsReadinessLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<
    "calculate" | "approve" | "post" | null
  >(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          !paymentForm.practiceId || invoice.practiceId === paymentForm.practiceId,
      ),
    [invoices, paymentForm.practiceId],
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "practiceName",
          accessorFn: (row: BillingRunRow) => row.values.practiceName,
          header: () => "Practice",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            row.original.values.practiceName,
        },
        {
          id: "status",
          accessorFn: (row: BillingRunRow) => row.values.status,
          header: () => "Status",
          cell: ({ row }: { row: { original: BillingRunRow } }) => {
            const status = row.original.values.status;
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
          id: "period",
          accessorFn: (row: BillingRunRow) => row.values.period,
          header: () => "Period",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            row.original.values.period,
        },
        {
          id: "snapshotCount",
          accessorFn: (row: BillingRunRow) => row.values.snapshotCount,
          header: () => "Snapshots",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            String(row.original.values.snapshotCount),
        },
        {
          id: "itemCount",
          accessorFn: (row: BillingRunRow) => row.values.itemCount,
          header: () => "Items",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            String(row.original.values.itemCount),
        },
        {
          id: "createdAt",
          accessorFn: (row: BillingRunRow) => row.values.createdAt,
          header: () => "Created",
          cell: ({ row }: { row: { original: BillingRunRow } }) =>
            row.original.values.createdAt,
        },
      ] as ColumnDef<BillingRunRow>[],
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
    async function loadRuns() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getBillingRunsView({
          page: pagination.page,
          limit: pagination.limit,
          practiceId: filters.practiceId || undefined,
          status: filters.status || undefined,
        });
        setRows(data.rows);
        setPagination(data.pagination);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load billing runs";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadRuns();
  }, [pagination.page, pagination.limit, filters.practiceId, filters.status]);

  useEffect(() => {
    if (
      (showCreateForm || showPaymentForm || showDetailPanel) &&
      practices.length === 0
    ) {
      setOptionsLoading(true);
      Promise.all([getAllPractices(), getAllInvoices(), getAllServices()])
        .then(([practiceList, invoiceList, serviceList]) => {
          setPractices(practiceList);
          setInvoices(invoiceList);
          setServices(serviceList);
        })
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : "Failed to load billing options";
          toast.error(message);
        })
        .finally(() => setOptionsLoading(false));
    }
  }, [showCreateForm, showPaymentForm, showDetailPanel, practices.length]);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getBillingRunsView({
      page: targetPage,
      limit: pagination.limit,
      practiceId: filters.practiceId || undefined,
      status: filters.status || undefined,
    });
    setRows(data.rows);
    setPagination(data.pagination);
  }

  async function handleRowClick(id: string) {
    setSelectedRowId(id);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setShowPaymentForm(false);
    setIsDetailLoading(true);

    try {
      const run = await getBillingRun(id);
      setSelectedRun(run);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch billing run";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function resetCreateForm() {
    setCreateForm(initialCreateRunForm);
    setReadiness(null);
    setShowCreateForm(false);
  }

  function resetPaymentForm() {
    setPaymentForm(initialPaymentForm);
    setShowPaymentForm(false);
  }

  function openCreateForm() {
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setShowPaymentForm(false);
    setSelectedRowId(null);
    setSelectedRun(null);
    setCreateForm(initialCreateRunForm);
    setReadiness(null);
  }

  function openPaymentForm() {
    setShowPaymentForm(true);
    setShowCreateForm(false);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedRun(null);
    setPaymentForm(initialPaymentForm);
  }

  async function handleCreateRun(event: React.FormEvent) {
    event.preventDefault();
    if (!createForm.practiceId || !createForm.periodStart || !createForm.periodEnd) {
      toast.error("Practice and billing period are required");
      return;
    }

    if (readiness && !readiness.isReady) {
      toast.error("Practice is not billing-ready for the selected period");
      return;
    }

    setIsSubmitting(true);
    try {
      const run = await createBillingRunApi({
        practiceId: createForm.practiceId,
        periodStart: createForm.periodStart,
        periodEnd: createForm.periodEnd,
        notes: createForm.notes || undefined,
        autoCalculate: createForm.autoCalculate,
        snapshots: mapSnapshotsForApi(createForm.snapshots),
      });
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      resetCreateForm();
      toast.success("Billing run created successfully");
      await handleRowClick(run.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create billing run";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function checkReadiness() {
    if (!createForm.practiceId || !createForm.periodStart || !createForm.periodEnd) {
      toast.error("Practice and billing period are required to check readiness");
      return;
    }

    setIsReadinessLoading(true);
    try {
      const result = await getBillingReadiness({
        practiceId: createForm.practiceId,
        periodStart: createForm.periodStart,
        periodEnd: createForm.periodEnd,
      });
      setReadiness(result);
      if (result.isReady) {
        toast.success("Practice is billing-ready");
      } else {
        toast.error("Practice has billing readiness blockers");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check readiness";
      toast.error(message);
      setReadiness(null);
    } finally {
      setIsReadinessLoading(false);
    }
  }

  useEffect(() => {
    if (!showCreateForm) {
      return;
    }

    if (!createForm.practiceId || !createForm.periodStart || !createForm.periodEnd) {
      setReadiness(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void checkReadiness();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    showCreateForm,
    createForm.practiceId,
    createForm.periodStart,
    createForm.periodEnd,
  ]);

  async function reloadSelectedRun() {
    if (!selectedRun) return;
    const run = await getBillingRun(selectedRun.id);
    setSelectedRun(run);
    await refreshRows();
  }

  async function handleRunAction(action: "calculate" | "approve" | "post") {
    if (!selectedRun) return;
    setIsActionLoading(action);
    try {
      if (action === "calculate") {
        await calculateBillingRunApi(selectedRun.id);
        toast.success("Billing run calculated");
      }
      if (action === "approve") {
        await approveBillingRunApi(selectedRun.id);
        toast.success("Billing run approved");
      }
      if (action === "post") {
        const result = await postBillingRunApi(selectedRun.id);
        toast.success(
          `Billing run posted. ${result.invoices.length} invoice(s) created.`,
        );
      }
      await reloadSelectedRun();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${action} billing run`;
      toast.error(message);
    } finally {
      setIsActionLoading(null);
    }
  }

  async function handleRecordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!paymentForm.practiceId || !paymentForm.amount) {
      toast.error("Practice and payment amount are required");
      return;
    }

    setIsRecordingPayment(true);
    try {
      await recordPaymentApi({
        practiceId: paymentForm.practiceId,
        amount: Number(paymentForm.amount),
        currency: paymentForm.currency || "USD",
        paymentDate: paymentForm.paymentDate || undefined,
        paymentMethod: paymentForm.paymentMethod || undefined,
        externalReference: paymentForm.externalReference || undefined,
        allocations: paymentForm.allocations
          .filter((allocation) => allocation.invoiceId && allocation.allocatedAmount)
          .map((allocation) => ({
            invoiceId: allocation.invoiceId,
            allocatedAmount: Number(allocation.allocatedAmount),
          })),
      });
      resetPaymentForm();
      toast.success("Payment recorded successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to record payment";
      toast.error(message);
    } finally {
      setIsRecordingPayment(false);
    }
  }

  const navbarActions = [
    {
      label: "Record payment",
      icon: <Coins className="h-4 w-4" />,
      onClick: openPaymentForm,
    },
    {
      label: "New run",
      icon: <Plus className="h-4 w-4" />,
      onClick: openCreateForm,
    },
  ];

  const detailPanel = (
    <aside className="app-panel relative flex w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button
          type="button"
          onClick={() => {
            setShowDetailPanel(false);
            setSelectedRowId(null);
            setSelectedRun(null);
          }}
          className="text-slate-400 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Circle className="h-4 w-4 text-slate-300" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
          {selectedRun?.practice?.name || "Billing Run"}
        </span>
      </div>

      {isDetailLoading || !selectedRun ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading billing run...
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-[#f0ece6] px-4 py-3">
            <button
              type="button"
              disabled={
                isActionLoading !== null ||
                selectedRun.status === "POSTED" ||
                selectedRun.status === "CLOSED"
              }
              onClick={() => handleRunAction("calculate")}
              className="app-control inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {isActionLoading === "calculate" ? "Calculating..." : "Calculate"}
            </button>
            <button
              type="button"
              disabled={
                isActionLoading !== null ||
                !["CALCULATED", "REVIEW_REQUIRED"].includes(selectedRun.status)
              }
              onClick={() => handleRunAction("approve")}
              className="inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isActionLoading === "approve" ? "Approving..." : "Approve"}
            </button>
            <button
              type="button"
              disabled={
                isActionLoading !== null || selectedRun.status !== "APPROVED"
              }
              onClick={() => handleRunAction("post")}
              className="inline-flex items-center gap-2 rounded-md bg-[#1f7a5b] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {isActionLoading === "post" ? "Posting..." : "Post"}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[selectedRun.status]}`}
                >
                  {formatStatusLabel(selectedRun.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Period</span>
                <span className="text-right text-slate-700">
                  {formatDateTime(selectedRun.periodStart).split(",")[0]} -{" "}
                  {formatDateTime(selectedRun.periodEnd).split(",")[0]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Snapshots</span>
                <span className="text-slate-700">
                  {selectedRun.inputSnapshots?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Calculated Items</span>
                <span className="text-slate-700">
                  {selectedRun.items?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Approved At</span>
                <span className="text-right text-slate-700">
                  {formatDateTime(selectedRun.approvedAt)}
                </span>
              </div>
            </div>

            <div className="space-y-5 text-[13px]">
              <div>
                <h3 className="mb-2 font-medium text-slate-700">Input Snapshots</h3>
                <div className="space-y-2">
                  {(selectedRun.inputSnapshots || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-slate-400">
                      No snapshots captured.
                    </div>
                  ) : (
                    selectedRun.inputSnapshots?.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className="rounded-lg border border-[#f0ece6] px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-700">
                            {snapshot.metricKey}
                          </span>
                          <span className="text-slate-500">
                            {snapshot.metricValue || snapshot.metricTextValue || "-"}
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-400">
                          {snapshot.service?.name || "Run level"} ·{" "}
                          {snapshot.sourceType || "manual"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-medium text-slate-700">Calculated Items</h3>
                <div className="space-y-2">
                  {(selectedRun.items || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-slate-400">
                      No billing items yet.
                    </div>
                  ) : (
                    selectedRun.items?.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-[#f0ece6] px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-700">
                              {item.service?.name || item.serviceId}
                            </div>
                            <div className="mt-1 text-[12px] text-slate-400">
                              Vendor: {item.vendor?.name || "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-slate-700">
                              {formatMoney(item.clientAmount)}
                            </div>
                            <div className="text-[12px] text-slate-400">
                              Margin {formatMoney(item.marginAmount)}
                            </div>
                          </div>
                        </div>
                        {item.exceptionFlags && item.exceptionFlags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.exceptionFlags.map((flag) => (
                              <span
                                key={flag}
                                className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-medium text-slate-700">Vendor Payables</h3>
                <div className="space-y-2">
                  {(selectedRun.vendorPayables || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-slate-400">
                      No vendor payables created yet.
                    </div>
                  ) : (
                    selectedRun.vendorPayables?.map((payable) => (
                      <div
                        key={payable.id}
                        className="rounded-lg border border-[#f0ece6] px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">
                            {payable.vendor?.name || payable.payableNumber || payable.id}
                          </span>
                          <span className="text-slate-700">
                            {formatMoney(payable.totalAmount)}
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-400">
                          {payable.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );

  const createPanel = (
    <aside className="app-panel flex w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">
          Create Billing Run
        </h2>
        <button
          type="button"
          onClick={resetCreateForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleCreateRun} className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Practice <span className="text-red-500">*</span>
            </label>
            <select
              value={createForm.practiceId}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  practiceId: event.target.value,
                }))
              }
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={createForm.periodStart}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    periodStart: event.target.value,
                  }))
                }
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-700">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={createForm.periodEnd}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    periodEnd: event.target.value,
                  }))
                }
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={createForm.notes}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              rows={3}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input
              type="checkbox"
              checked={createForm.autoCalculate}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  autoCalculate: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border border-[#d8d2ca]"
            />
            Auto calculate after creation
          </label>

          <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-medium text-slate-700">
                  Billing Readiness
                </h3>
                <p className="mt-1 text-[12px] text-slate-400">
                  Checks whether the agreement, version, and service terms are ready for billing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void checkReadiness()}
                disabled={isReadinessLoading}
                className="app-control inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium disabled:opacity-50"
              >
                {isReadinessLoading ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Check
              </button>
            </div>

            {!createForm.practiceId || !createForm.periodStart || !createForm.periodEnd ? (
              <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-[12px] text-slate-400">
                Select a practice and billing period to run readiness checks.
              </div>
            ) : readiness ? (
              <div className="space-y-3">
                <div
                  className={`rounded-lg px-3 py-3 text-[12px] ${
                    readiness.isReady
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {readiness.isReady
                    ? "Practice is billing-ready for the selected period."
                    : "Practice is not billing-ready for the selected period."}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-slate-600">
                    Active Agreements: {readiness.summary.activeAgreementCount}
                  </div>
                  <div className="rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-slate-600">
                    Current Versions: {readiness.summary.currentVersionCount}
                  </div>
                  <div className="rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-slate-600">
                    Active Terms: {readiness.summary.activeServiceTermCount}
                  </div>
                  <div className="rounded-lg border border-[#ece7df] bg-white px-3 py-2 text-slate-600">
                    Billable Terms: {readiness.summary.billableServiceTermCount}
                  </div>
                </div>

                <div className="space-y-2">
                  {readiness.issues.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-[12px] text-slate-400">
                      No readiness issues found.
                    </div>
                  ) : (
                    readiness.issues.map((issue, index) => (
                      <div
                        key={`${issue.code}-${index}`}
                        className={`rounded-lg px-3 py-2 text-[12px] ${
                          issue.severity === "ERROR"
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : "border border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        <div className="font-medium">{issue.code}</div>
                        <div className="mt-1">{issue.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#e9e3db] px-3 py-3 text-[12px] text-slate-400">
                Readiness has not been checked yet.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-slate-700">
                Snapshots
              </h3>
              <button
                type="button"
                onClick={() =>
                  setCreateForm((prev) => ({
                    ...prev,
                    snapshots: [...prev.snapshots, initialSnapshotRow()],
                  }))
                }
                className="text-[12px] text-[#4f63ea]"
              >
                Add snapshot
              </button>
            </div>

            <div className="space-y-3">
              {createForm.snapshots.map((snapshot, index) => (
                <div key={index} className="rounded-lg border border-[#ece7df] bg-white p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={snapshot.metricKey}
                      onChange={(event) =>
                        setCreateForm((prev) => {
                          const next = [...prev.snapshots];
                          next[index] = { ...next[index], metricKey: event.target.value };
                          return { ...prev, snapshots: next };
                        })
                      }
                      placeholder="Metric key"
                      className="app-control rounded-md px-3 py-2 text-[13px]"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={snapshot.metricValue}
                      onChange={(event) =>
                        setCreateForm((prev) => {
                          const next = [...prev.snapshots];
                          next[index] = { ...next[index], metricValue: event.target.value };
                          return { ...prev, snapshots: next };
                        })
                      }
                      placeholder="Metric value"
                      className="app-control rounded-md px-3 py-2 text-[13px]"
                    />
                    <select
                      value={snapshot.serviceId}
                      onChange={(event) =>
                        setCreateForm((prev) => {
                          const next = [...prev.snapshots];
                          next[index] = { ...next[index], serviceId: event.target.value };
                          return { ...prev, snapshots: next };
                        })
                      }
                      className="app-control rounded-md px-3 py-2 text-[13px]"
                    >
                      <option value="">Run level</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={snapshot.sourceType}
                      onChange={(event) =>
                        setCreateForm((prev) => {
                          const next = [...prev.snapshots];
                          next[index] = { ...next[index], sourceType: event.target.value };
                          return { ...prev, snapshots: next };
                        })
                      }
                      placeholder="Source type"
                      className="app-control rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="text"
                      value={snapshot.sourceReference}
                      onChange={(event) =>
                        setCreateForm((prev) => {
                          const next = [...prev.snapshots];
                          next[index] = {
                            ...next[index],
                            sourceReference: event.target.value,
                          };
                          return { ...prev, snapshots: next };
                        })
                      }
                      placeholder="Source reference"
                      className="app-control min-w-0 flex-1 rounded-md px-3 py-2 text-[13px]"
                    />
                    {createForm.snapshots.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCreateForm((prev) => ({
                            ...prev,
                            snapshots: prev.snapshots.filter((_, rowIndex) => rowIndex !== index),
                          }))
                        }
                        className="text-[12px] text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
          <button
            type="button"
            onClick={resetCreateForm}
            className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isReadinessLoading || (readiness !== null && !readiness.isReady)}
            className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Run"}
          </button>
        </div>
      </form>
    </aside>
  );

  const paymentPanel = (
    <aside className="app-panel flex w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">
          Record Payment
        </h2>
        <button
          type="button"
          onClick={resetPaymentForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleRecordPayment} className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Practice <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentForm.practiceId}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  practiceId: event.target.value,
                  allocations: [{ invoiceId: "", allocatedAmount: "" }],
                }))
              }
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

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              placeholder="Amount"
              className="app-control rounded-md px-3 py-2 text-[13px]"
              required
            />
            <input
              type="text"
              value={paymentForm.currency}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, currency: event.target.value }))
              }
              className="app-control rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={paymentForm.paymentDate}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  paymentDate: event.target.value,
                }))
              }
              className="app-control rounded-md px-3 py-2 text-[13px]"
            />
            <input
              type="text"
              value={paymentForm.paymentMethod}
              onChange={(event) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value,
                }))
              }
              placeholder="Payment method"
              className="app-control rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          <input
            type="text"
            value={paymentForm.externalReference}
            onChange={(event) =>
              setPaymentForm((prev) => ({
                ...prev,
                externalReference: event.target.value,
              }))
            }
            placeholder="Reference number"
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />

          <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-slate-700">
                Allocations
              </h3>
              <button
                type="button"
                onClick={() =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    allocations: [
                      ...prev.allocations,
                      { invoiceId: "", allocatedAmount: "" },
                    ],
                  }))
                }
                className="text-[12px] text-[#4f63ea]"
              >
                Add allocation
              </button>
            </div>

            <div className="space-y-3">
              {paymentForm.allocations.map((allocation, index) => (
                <div key={index} className="grid grid-cols-[1fr_120px] gap-3">
                  <select
                    value={allocation.invoiceId}
                    onChange={(event) =>
                      setPaymentForm((prev) => {
                        const next = [...prev.allocations];
                        next[index] = { ...next[index], invoiceId: event.target.value };
                        return { ...prev, allocations: next };
                      })
                    }
                    className="app-control rounded-md px-3 py-2 text-[13px]"
                  >
                    <option value="">Select Invoice</option>
                    {filteredInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {(invoice.invoiceNumber || invoice.id.slice(0, 8).toUpperCase()) +
                          " · " +
                          formatMoney(invoice.totalAmount)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={allocation.allocatedAmount}
                    onChange={(event) =>
                      setPaymentForm((prev) => {
                        const next = [...prev.allocations];
                        next[index] = {
                          ...next[index],
                          allocatedAmount: event.target.value,
                        };
                        return { ...prev, allocations: next };
                      })
                    }
                    placeholder="Amount"
                    className="app-control rounded-md px-3 py-2 text-[13px]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
          <button
            type="button"
            onClick={resetPaymentForm}
            className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isRecordingPayment}
            className="app-control rounded-md bg-[#1f7a5b] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {isRecordingPayment ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </aside>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Billing Runs"
        activeModule="Billing"
        activeSubItem="Billing Runs"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading billing runs...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Billing Runs"
        activeModule="Billing"
        activeSubItem="Billing Runs"
      >
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
      title="Billing Runs"
      activeModule="Billing"
      activeSubItem="Billing Runs"
      navbarIcon={<Receipt className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>All Billing Runs</span>
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel((current) => !current)}
              >
                Filters
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
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
              <select
                value={filters.status}
                onChange={(event) => {
                  setFilters((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Statuses</option>
                {billingRunStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFilters({ practiceId: "", status: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.practiceId && !filters.status}
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
                    No billing runs found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Create a billing run to start the billing workflow
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Billing Run
                  </button>
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
                        className={`cursor-pointer ${isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"}`}
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
              <span className="text-[13px] text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from(
                  { length: pagination.totalPages },
                  (_, index) => index + 1,
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
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
        {showPaymentForm && paymentPanel}
      </div>
    </AppLayout>
  );
}

export default BillingRunsPage;
