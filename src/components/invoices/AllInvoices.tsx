import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ExternalLink,
  LayoutList,
  Plus,
  Save,
  Trash2,
  X,
  ChevronLeft,
  Circle,
  RefreshCw,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, { type ActiveFilterChip } from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import DatePicker from "../shared/DatePicker";
import { getAllPractices } from "../../services/operations/practices";
import {
  getAllAgreements,
  type AgreementOption,
} from "../../services/operations/agreements";
import {
  createInvoiceApi,
  deleteInvoiceApi,
  getInvoice,
  getInvoicesView,
  invoiceStatusOptions,
  updateInvoiceApi,
  resendStripeInvoice,
  syncInvoiceToQuickBooks,
  syncPaymentToQuickBooks,
  quickSyncInvoicePayment,
  type Invoice,
  type InvoiceBody,
  type InvoiceRow,
  type InvoiceStatus,
} from "../../services/operations/invoices";
import { invoiceEndpoints } from "../../services/apis";
import type { Practice } from "../practices/types";
import StripeInvoiceFlow from "./StripeInvoiceFlow";
import {
  canFinanceWrite,
  canManageIntegrations,
  canOperationsAndFinanceWrite,
  readStoredUser,
} from "../../utils/auth";

const statusStyles: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-600",
};

type InvoiceFormState = {
  practiceId: string;
  agreementId: string;
  totalAmount: string;
  status: InvoiceStatus;
  dueDate: string;
};

const initialFormState: InvoiceFormState = {
  practiceId: "",
  agreementId: "",
  totalAmount: "",
  status: "DRAFT",
  dueDate: "",
};

function formatCurrency(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function parseCurrencyToNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  // Remove any characters except digits, dot, and minus
  const cleaned = String(value).replace(/[^0-9.-]+/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatDateForInput(value?: string | null) {
  if (!value) return "";
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

function buildFormState(invoice?: Invoice | null): InvoiceFormState {
  if (!invoice) return initialFormState;
  return {
    practiceId: invoice.practiceId,
    agreementId: invoice.agreementId || "",
    totalAmount: invoice.totalAmount,
    status: invoice.status,
    dueDate: formatDateForInput(invoice.dueDate),
  };
}

function AllInvoicePage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canInvoiceWrite = canOperationsAndFinanceWrite(currentRole);
  const canFinanceActions = canFinanceWrite(currentRole);
  const canIntegrationActions = canManageIntegrations(currentRole);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [agreements, setAgreements] = useState<AgreementOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const getResponsivePageSize = () => {
    const height = window.innerHeight;
    if (height >= 1200) return 15;
    if (height >= 900) return 10;
    if (height >= 700) return 8;
    return 6;
  };

  const [pagination, setPagination] = useState({
    page: 1,
    limit: getResponsivePageSize(),
    total: 0,
    totalPages: 0,
  });
  const [userSelectedPageSize, setUserSelectedPageSize] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (!userSelectedPageSize) {
        const newSize = getResponsivePageSize();
        setPagination((prev) => ({ ...prev, limit: newSize }));
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userSelectedPageSize]);

  type InvoiceFilters = {
    search: string;
    status: string;
    practiceId: string;
    paymentMethod: string;
    dateFrom: string;
    dateTo: string;
  };

  const defaultInvoiceFilters: InvoiceFilters = {
    search: "",
    status: "",
    practiceId: "",
    paymentMethod: "",
    dateFrom: "",
    dateTo: "",
  };

  const [filters, setFilters] = useState<InvoiceFilters>(defaultInvoiceFilters);
  const [draftFilters, setDraftFilters] = useState<InvoiceFilters>(defaultInvoiceFilters);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (practices.length === 0) {
      getAllPractices()
        .then((list) => setPractices(list))
        .catch(() => setPractices([]));
    }
  }, [practices.length]);

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters(defaultInvoiceFilters);
    setDraftFilters(defaultInvoiceFilters);
    setSearchInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const activeFilterCount = [
    filters.status,
    filters.practiceId,
    filters.paymentMethod,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const practiceFilterLabel = useMemo(
    () => practices.find((p) => p.id === filters.practiceId)?.name || filters.practiceId,
    [practices, filters.practiceId],
  );

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.practiceId) {
      chips.push({
        key: "practiceId",
        label: "Practice",
        displayValue: practiceFilterLabel,
        onClear: () => {
          setFilters((curr) => ({ ...curr, practiceId: "" }));
          setDraftFilters((curr) => ({ ...curr, practiceId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.status) {
      chips.push({
        key: "status",
        label: "Status",
        displayValue: formatStatusLabel(filters.status),
        onClear: () => {
          setFilters((curr) => ({ ...curr, status: "" }));
          setDraftFilters((curr) => ({ ...curr, status: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.paymentMethod) {
      chips.push({
        key: "paymentMethod",
        label: "Payment",
        displayValue:
          filters.paymentMethod === "CREDIT_CARD"
            ? "Credit Card"
            : filters.paymentMethod === "ACH"
              ? "ACH"
              : filters.paymentMethod,
        onClear: () => {
          setFilters((curr) => ({ ...curr, paymentMethod: "" }));
          setDraftFilters((curr) => ({ ...curr, paymentMethod: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.dateFrom) {
      chips.push({
        key: "dateFrom",
        label: "From",
        displayValue: filters.dateFrom,
        onClear: () => {
          setFilters((curr) => ({ ...curr, dateFrom: "" }));
          setDraftFilters((curr) => ({ ...curr, dateFrom: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.dateTo) {
      chips.push({
        key: "dateTo",
        label: "To",
        displayValue: filters.dateTo,
        onClear: () => {
          setFilters((curr) => ({ ...curr, dateTo: "" }));
          setDraftFilters((curr) => ({ ...curr, dateTo: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters, practiceFilterLabel]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);
  const [createForm, setCreateForm] =
    useState<InvoiceFormState>(initialFormState);
  const [editForm, setEditForm] = useState<InvoiceFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendInvoiceId, setResendInvoiceId] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const isActionLoading = (id: string, action: string) =>
    actionLoading[id]?.[action] || false;
  const setActionState = (id: string, action: string, state: boolean) => {
    setActionLoading((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [action]: state },
    }));
  };

  const filteredAgreementsForCreate = useMemo(
    () =>
      agreements.filter(
        (agreement) =>
          !createForm.practiceId ||
          agreement.practiceId === createForm.practiceId,
      ),
    [agreements, createForm.practiceId],
  );

  const filteredAgreementsForEdit = useMemo(
    () =>
      agreements.filter(
        (agreement) =>
          !editForm.practiceId || agreement.practiceId === editForm.practiceId,
      ),
    [agreements, editForm.practiceId],
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "practiceName",
          accessorFn: (row: InvoiceRow) => row.values.practiceName,
          header: () => "Practice",
          cell: ({ row }: { row: { original: InvoiceRow } }) =>
            String(row.original.values.practiceName || "-"),
        },
        {
          id: "status",
          accessorFn: (row: InvoiceRow) => row.values.status,
          header: () => "Status",
          cell: ({ row }: { row: { original: InvoiceRow } }) => {
            const status = row.original.values.status;
            return (
              <span
                className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
              >
                {formatStatusLabel(status)}
              </span>
            );
          },
        },
        {
          id: "actions",
          header: () => "Actions",
          cell: ({ row }: { row: { original: InvoiceRow } }) => {
            const invoice = row.original;
            return (
              <div className="flex items-center gap-1">
                {invoice.values.quickbooksInvoiceId ? (
                  <div className="flex items-center gap-1">
                    <div
                      className="p-1 text-green-600"
                      title={`Invoice synced: ${invoice.values.quickbooksInvoiceId}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    {invoice.values.quickbooksPaymentId && (
                      <div
                        className="p-1 text-emerald-600"
                        title={`Payment synced: ${invoice.values.quickbooksPaymentId}`}
                      >
                        <DollarSign className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ) : canIntegrationActions ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncToQB(invoice.id);
                    }}
                    disabled={isActionLoading(invoice.id, "sync")}
                    className="p-1 text-slate-400 hover:text-green-600 transition-colors disabled:opacity-50"
                    title="Sync to QuickBooks"
                  >
                    <img
                      src="https://quickbooks.intuit.com/cas/dam/IMAGE/A8u8GvpJS/apple-touch-icon-152x152.png"
                      alt="QB"
                      className="h-4 w-4 grayscale hover:grayscale-0 transition-all"
                    />
                  </button>
                ) : null}
              </div>
            );
          },
        },
        {
          id: "netServices",
          accessorFn: (row: InvoiceRow) => row.values.netServices,
          header: () => "Net Services",
          cell: ({ row }: { row: { original: InvoiceRow } }) =>
            String(row.original.values.netServices || "-"),
        },
        {
          id: "grossInvoiceTotal",
          accessorFn: (row: InvoiceRow) => row.values.grossInvoiceTotal,
          header: () => "Gross Invoice Total",
          cell: ({ row }: { row: { original: InvoiceRow } }) =>
            String(row.original.values.grossInvoiceTotal || "-"),
        },
        {
          id: "processingFee",
          accessorFn: (row: InvoiceRow) => row.values.processingFee,
          header: () => "Processing Fee",
          cell: ({ row }: { row: { original: InvoiceRow } }) =>
            String(row.original.values.processingFee || "-"),
        },
        {
          id: "companyAbsorbed",
          accessorFn: (row: InvoiceRow) => row.values.companyAbsorbed,
          header: () => "Company Absorbed",
          cell: ({ row }: { row: { original: InvoiceRow } }) => {
            const vals = row.original.values as any;
            const rawCompany = vals.companyAbsorbed;
            const companyNum = parseCurrencyToNumber(rawCompany);
            const netServicesNum = parseCurrencyToNumber(vals.netServices);
            const netAmountNum = parseCurrencyToNumber(vals.netAmount);

            // If Net Services or Net Amount is zero, force display $0.00 per UX request
            if (netServicesNum === 0 || netAmountNum === 0) {
              return formatCurrency(0);
            }

            if (rawCompany !== undefined && rawCompany !== null && String(rawCompany).trim() !== "") {
              return String(formatCurrency(rawCompany));
            }

            if (netServicesNum === 0 && netAmountNum === 0) {
              return formatCurrency(0);
            }

            return "-";
          },
        },
        {
          id: "paymentMethod",
          accessorFn: (row: InvoiceRow) => row.values.paymentMethod,
          header: () => "Payment Method",
          cell: ({ row }: { row: { original: InvoiceRow } }) =>
            String(row.original.values.paymentMethod || "-"),
        },
        {
          id: "netAmount",
          accessorFn: (row: InvoiceRow) => row.values.netAmount,
          header: () => "Net Amount",
          cell: ({ row }: { row: { original: InvoiceRow } }) => {
            const vals = row.original.values as any;
            const netServicesNum = parseCurrencyToNumber(vals.netServices);
            const netAmountRaw = vals.netAmount;
            const netAmountNum = parseCurrencyToNumber(netAmountRaw);

            if (netServicesNum === 0) {
              return formatCurrency(0);
            }

            if (netAmountRaw !== undefined && netAmountRaw !== null && String(netAmountRaw).trim() !== "") {
              return formatCurrency(netAmountNum);
            }

            return "-";
          },
        },
        {
          id: "dueDate",
          accessorFn: (row: InvoiceRow) => row.values.dueDate,
          header: () => "Due Date",
          cell: ({ row }: { row: { original: InvoiceRow } }) =>
            String(row.original.values.dueDate || "-"),
        },
        {
          id: "creationDate",
          accessorFn: (row: InvoiceRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: InvoiceRow } }) =>
            String(row.original.values.creationDate),
        },
      ] as ColumnDef<InvoiceRow>[],
    [actionLoading, canIntegrationActions],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const refreshInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getInvoicesView({
        page: pagination.page,
        limit: pagination.limit,
        search: searchInput.trim() || undefined,
        status: filters.status || undefined,
        practiceId: filters.practiceId || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      setRows(data.rows);
      setPagination(data.pagination);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load invoices";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshInvoices();
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    searchInput,
    filters.status,
    filters.practiceId,
    filters.paymentMethod,
    filters.dateFrom,
    filters.dateTo,
  ]);

  useEffect(() => {
    if (
      (showCreateForm || showDetailPanel) &&
      (practices.length === 0 || agreements.length === 0)
    ) {
      setOptionsLoading(true);
      Promise.all([getAllPractices(), getAllAgreements()])
        .then(([practiceList, agreementList]) => {
          setPractices(practiceList);
          setAgreements(agreementList);
        })
        .catch((err) => console.error("Failed to load invoice options:", err))
        .finally(() => setOptionsLoading(false));
    }
  }, [showCreateForm, showDetailPanel, practices.length, agreements.length]);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getInvoicesView({
      page: targetPage,
      limit: pagination.limit,
      search: filters.search || undefined,
      status: filters.status || undefined,
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
      const invoice = await getInvoice(rowId);
      setSelectedInvoice(invoice);
      setEditForm(buildFormState(invoice));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch invoice";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedInvoice(null);
    setEditForm(initialFormState);
  }

  function openCreateForm() {
    setCreateForm(initialFormState);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedInvoice(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm(initialFormState);
  }

  function buildPayload(form: InvoiceFormState): InvoiceBody {
    return {
      practiceId: form.practiceId,
      agreementId: form.agreementId || null,
      totalAmount: Number.parseFloat(form.totalAmount),
      status: form.status,
      ...(form.dueDate
        ? { dueDate: new Date(form.dueDate).toISOString() }
        : {}),
    };
  }

  async function handleCreateInvoice(event: React.FormEvent) {
    event.preventDefault();
    if (!canInvoiceWrite) {
      toast.error("You do not have permission to create invoices.");
      return;
    }
    if (!createForm.practiceId || !createForm.totalAmount) {
      toast.error("Practice, total amount and status are required");
      return;
    }
    const amount = Number.parseFloat(createForm.totalAmount);
    if (Number.isNaN(amount)) {
      toast.error("Enter a valid total amount");
      return;
    }
    setIsSubmitting(true);
    try {
      await createInvoiceApi(buildPayload(createForm));
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      closeCreateForm();
      toast.success("Invoice created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create invoice";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateInvoice(event: React.FormEvent) {
    event.preventDefault();
    if (!canInvoiceWrite) {
      toast.error("You do not have permission to update invoices.");
      return;
    }
    if (!selectedInvoice) return;
    if (!editForm.practiceId || !editForm.totalAmount) {
      toast.error("Practice, total amount and status are required");
      return;
    }
    const amount = Number.parseFloat(editForm.totalAmount);
    if (Number.isNaN(amount)) {
      toast.error("Enter a valid total amount");
      return;
    }
    if (editForm.dueDate) {
      const selectedDate = new Date(editForm.dueDate + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        toast.error("Due date must be today or a future date");
        return;
      }
    }
    setIsSaving(true);
    try {
      const updatedInvoice = await updateInvoiceApi(
        selectedInvoice.id,
        buildPayload(editForm),
      );
      await refreshRows();
      const refreshedInvoice = await getInvoice(updatedInvoice.id);
      setSelectedInvoice(refreshedInvoice);
      setEditForm(buildFormState(refreshedInvoice));
      toast.success("Invoice updated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update invoice";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteInvoice() {
    if (!selectedInvoice) return;
    if (!canInvoiceWrite) {
      toast.error("You do not have permission to delete invoices.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this invoice?"))
      return;
    setIsDeleting(true);
    try {
      await deleteInvoiceApi(selectedInvoice.id);
      await refreshRows();
      closeDetailPanel();
      toast.success("Invoice deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete invoice";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSyncToQB(invoiceId: string) {
    if (!canIntegrationActions) {
      toast.error("Only finance/admin can sync with QuickBooks.");
      return;
    }
    try {
      setActionState(invoiceId, "sync", true);
      await syncInvoiceToQuickBooks(invoiceId);
      toast.success("Synced to QuickBooks successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sync to QuickBooks.",
      );
    } finally {
      setActionState(invoiceId, "sync", false);
    }
  }

  async function handleSyncPaymentToQB(paymentId: string, invoiceId: string) {
    if (!canIntegrationActions) {
      toast.error("Only finance/admin can sync payments to QuickBooks.");
      return;
    }
    try {
      setActionState(invoiceId, "syncPayment", true);
      await syncPaymentToQuickBooks(paymentId);
      toast.success("Payment synced to QuickBooks successfully.");
      // Refresh invoice to show the checkmark
      const refreshed = await getInvoice(invoiceId);
      setSelectedInvoice(refreshed);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to sync payment to QuickBooks.",
      );
    } finally {
      setActionState(invoiceId, "syncPayment", false);
    }
  }

  async function handleQuickSyncPaymentToQB(invoiceId: string) {
    if (!canIntegrationActions) {
      toast.error("Only finance/admin can sync payments to QuickBooks.");
      return;
    }
    try {
      setActionState(invoiceId, "syncPayment", true);
      await quickSyncInvoicePayment(invoiceId);
      toast.success("Payment recorded and synced to QuickBooks!");
      // Refresh invoice to show the checkmark
      const refreshed = await getInvoice(invoiceId);
      setSelectedInvoice(refreshed);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to quick-sync payment.",
      );
    } finally {
      setActionState(invoiceId, "syncPayment", false);
    }
  }

  async function handleResendInvoice() {
    if (!resendInvoiceId) return;
    if (!canFinanceActions) {
      toast.error("Only finance/admin can resend invoices.");
      return;
    }
    try {
      setIsResending(true);
      await resendStripeInvoice(resendInvoiceId);
      toast.success("Invoice resent successfully");
      await refreshRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resend invoice",
      );
    } finally {
      setIsResending(false);
    }
  }

  function openInvoicePdf(invoice: Invoice) {
    const target =
      invoice.status === "PAID"
        ? invoiceEndpoints.RECEIPT_PDF(invoice.id)
        : invoiceEndpoints.PDF(invoice.id);
    window.open(target, "_blank", "noopener,noreferrer");
  }

  const navbarActions: any[] = [
    // {
    //   label: "New record",
    //   icon: <Plus className="h-4 w-4" />,
    //   onClick: openCreateForm,
    // },
  ];
  const detailPanel = (
    <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
          {selectedInvoice?.invoiceNumber || "Invoice"}
        </span>
      </div>

      {isDetailLoading || !selectedInvoice ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading invoice...
        </div>
      ) : (
        <form
          onSubmit={handleUpdateInvoice}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-auto p-4">
            {(() => {
              const invStatusColors: Record<string, string> = {
                DRAFT: "bg-slate-100 text-slate-700",
                SENT: "bg-blue-100 text-blue-700",
                PAID: "bg-green-100 text-green-700",
                PARTIALLY_PAID: "bg-amber-100 text-amber-700",
                OVERDUE: "bg-red-100 text-red-700",
                CANCELLED: "bg-gray-100 text-gray-700",
              };
              const invStatus = selectedInvoice?.status || "";
              return (
                <DetailCard
                  title={selectedInvoice?.invoiceNumber || "Invoice"}
                  badge={
                    invStatus
                      ? {
                          label: invStatus,
                          className:
                            invStatusColors[invStatus] ||
                            "bg-gray-100 text-gray-700",
                        }
                      : null
                  }
                  infoRows={[
                    ...(selectedInvoice?.practice?.name
                      ? [
                          {
                            label: "Practice",
                            value: selectedInvoice.practice.name,
                          },
                        ]
                      : []),
                    ...(selectedInvoice?.totalAmount
                      ? [
                          {
                            label: "Total Amount",
                            value: String(selectedInvoice.totalAmount),
                          },
                        ]
                      : []),
                    ...(selectedInvoice?.dueDate
                      ? [
                          {
                            label: "Due Date",
                            value: new Date(
                              selectedInvoice.dueDate,
                            ).toLocaleDateString(),
                          },
                        ]
                      : []),
                    ...(selectedInvoice?.paidAt
                      ? [
                          {
                            label: "Paid At",
                            value: formatDateTime(selectedInvoice.paidAt),
                          },
                        ]
                      : []),
                    ...(selectedInvoice?.payerEmail
                      ? [
                          {
                            label: "Payer Email",
                            value: selectedInvoice.payerEmail,
                          },
                        ]
                      : []),
                  ]}
                  metric={
                    selectedInvoice?.lineItems?.length !== undefined
                      ? {
                          label: "Line Items",
                          value: String(selectedInvoice.lineItems.length),
                        }
                      : null
                  }
                />
              );
            })()}

            {false && <div className="mb-4 space-y-4">
                <div className="rounded-2xl border border-[#ece7df] bg-white p-4">
                  <h3 className="mb-3 text-[13px] font-semibold text-slate-800">
                    Client Invoice Line Items
                  </h3>
                  {selectedInvoice?.lineItems?.length ? (
                    <div className="space-y-2">
                      {selectedInvoice.lineItems.map((item) => (
                      <div
                        key={`client-${item.id}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-[#f1ede7] bg-[#fcfbf9] px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-slate-700">
                            {item.description ||
                              item.service?.name ||
                              item.service?.code ||
                              "Line Item"}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Qty: {item.quantity || 1}
                            {" · "}
                            Unit Price: {formatCurrency(item.unitPrice)}
                          </div>
                        </div>
                        <div className="shrink-0 text-[12px] font-semibold text-slate-800">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#e6dfd6] bg-[#fcfbf9] px-3 py-3 text-[12px] text-slate-500">
                      No client invoice line items available for this invoice.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#ece7df] bg-white p-4">
                  <h3 className="mb-3 text-[13px] font-semibold text-slate-800">
                    Tristate Invoice Line Items
                  </h3>
                  {selectedInvoice?.lineItems?.length ? (
                    <div className="space-y-2">
                      {selectedInvoice.lineItems.map((item) => (
                      <div
                        key={`internal-${item.id}`}
                        className="rounded-lg border border-[#f1ede7] bg-[#fcfbf9] px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-slate-700">
                              {item.description ||
                                item.service?.name ||
                                item.service?.code ||
                                "Line Item"}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              Internal transfer amount
                            </div>
                          </div>
                          <div className="shrink-0 text-[12px] font-semibold text-slate-800">
                            {formatCurrency(
                              item.externalTotalPrice ?? item.totalPrice,
                            )}
                          </div>
                        </div>
                        {Number(item.companyFeeDeductionAmount || 0) > 0 && (
                          <div className="mt-2 text-[11px] text-amber-700">
                            Company absorbed:{" "}
                            {formatCurrency(item.companyFeeDeductionAmount)}
                          </div>
                        )}
                      </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#e6dfd6] bg-[#fcfbf9] px-3 py-3 text-[12px] text-slate-500">
                      No Tristate invoice line items available for this invoice.
                    </div>
                  )}
                </div>
              </div>}

            <div className="space-y-4">
              {/*<div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">
                  Practice <span className="text-red-500">*</span>
                </label>
                {optionsLoading ? (
                  <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                    Loading...
                  </div>
                ) : (
                  <select
                    value={editForm.practiceId}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        practiceId: event.target.value,
                        agreementId: "",
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
                )}
              </div>*/}

              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">
                  Agreement
                </label>
                {optionsLoading ? (
                  <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                    Loading...
                  </div>
                ) : (
                  <select
                    value={editForm.agreementId}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        agreementId: event.target.value,
                      }))
                    }
                    disabled
                    className="app-control w-full rounded-md px-3 py-2 text-[13px] bg-slate-50 cursor-not-allowed text-slate-500"
                  >
                    <option value="">No Agreement</option>
                    {filteredAgreementsForEdit.map((agreement) => (
                      <option key={agreement.id} value={agreement.id}>
                        {agreement.type} •{" "}
                        {agreement.practice?.name || "Practice"} •{" "}
                        {agreement.id.slice(0, 8).toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}
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
                      status: event.target.value as InvoiceStatus,
                    }))
                  }
                  disabled
                  className="app-control w-full rounded-md px-3 py-2 text-[13px] bg-slate-50 cursor-not-allowed text-slate-500"
                >
                  {invoiceStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">
                  Total Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.totalAmount}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      totalAmount: event.target.value,
                    }))
                  }
                  disabled
                  className="app-control w-full rounded-md px-3 py-2 text-[13px] bg-slate-50 cursor-not-allowed text-slate-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      dueDate: event.target.value,
                    }))
                  }
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                />
              </div>
            </div>

            {/* --- STRIPE FLOW SECTION --- */}
            <StripeInvoiceFlow
              invoice={selectedInvoice}
              canResend={canFinanceActions}
              onUpdate={() => {
                refreshRows();
                getInvoice(selectedInvoice.id).then(setSelectedInvoice);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-[#f1f5f9] px-2 py-3 bg-white sticky bottom-0 z-20">
            {/* Sync QB Button */}
            {canIntegrationActions && (
              <button
                type="button"
                onClick={() =>
                  selectedInvoice && handleSyncToQB(selectedInvoice.id)
                }
                disabled={isActionLoading(selectedInvoice?.id || "", "sync")}
                className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 transition-all hover:bg-slate-50 disabled:opacity-50 shadow-sm"
                title="Sync Invoice to QuickBooks"
              >
                <img
                  src="https://quickbooks.intuit.com/cas/dam/IMAGE/A8u8GvpJS/apple-touch-icon-152x152.png"
                  alt="QB"
                  className="h-4 w-4 shrink-0 rounded-sm"
                />
                <div className="flex flex-col items-start leading-none gap-0">
                  <span className="text-[8px] font-bold text-[#94a3b8] uppercase tracking-tighter">
                    Sync
                  </span>
                  <span className="text-[12px] font-extrabold text-slate-800">
                    INV
                  </span>
                </div>
              </button>
            )}

            {/* Sync Payment Button */}
            {canIntegrationActions && selectedInvoice?.status === "PAID" && (
              <button
                type="button"
                onClick={() => {
                  const paymentId =
                    selectedInvoice.paymentAllocations?.[0]?.payment?.id;
                  if (paymentId) {
                    handleSyncPaymentToQB(paymentId, selectedInvoice.id);
                  } else {
                    handleQuickSyncPaymentToQB(selectedInvoice.id);
                  }
                }}
                disabled={
                  isActionLoading(selectedInvoice?.id || "", "syncPayment") ||
                  !!selectedInvoice.paymentAllocations?.[0]?.payment
                    ?.quickbooksPaymentId
                }
                className={`flex h-9 shrink-0 items-center gap-2 rounded-lg border px-2.5 transition-all shadow-sm ${
                  selectedInvoice.paymentAllocations?.[0]?.payment
                    ?.quickbooksPaymentId
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : "bg-white border-[#e2e8f0] hover:bg-slate-50"
                } disabled:opacity-50`}
                title={
                  !selectedInvoice.paymentAllocations?.length
                    ? "No payment record found"
                    : selectedInvoice.paymentAllocations[0].payment
                          .quickbooksPaymentId
                      ? "Payment already synced"
                      : "Sync Payment to QuickBooks"
                }
              >
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${selectedInvoice.paymentAllocations?.[0]?.payment?.quickbooksPaymentId ? "text-emerald-500" : "text-slate-400"}`}
                />
                <div className="flex flex-col items-start leading-none gap-0 text-left">
                  <span className="text-[8px] font-bold text-[#94a3b8] uppercase tracking-tighter">
                    Sync
                  </span>
                  <span className="text-[12px] font-extrabold text-slate-800">
                    PMT
                  </span>
                </div>
              </button>
            )}

            {/* Delete Button */}
            {canInvoiceWrite && (
              <button
                type="button"
                onClick={handleDeleteInvoice}
                disabled={isDeleting}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#fee2e2] bg-white px-2.5 text-[12px] font-bold text-[#ef4444] transition-all hover:bg-red-50 disabled:opacity-50 shadow-sm"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <div className="flex flex-col items-start leading-none gap-0 text-left">
                  <span className="text-[8px] font-bold text-[#fca5a5] uppercase tracking-tighter">
                    Delete
                  </span>
                  <span className="text-[12px] font-extrabold text-red-600 uppercase">
                    Inv
                  </span>
                </div>
              </button>
            )}

            {/* Save Changes Button */}
            {canInvoiceWrite && (
              <button
                type="submit"
                disabled={isSaving}
                className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#4f63ea] px-3 ml-auto text-white shadow-lg transition-all hover:bg-[#3d50d6] disabled:opacity-50"
              >
                <Save className="h-5 w-5 shrink-0" />
                <span className="text-[12px] font-extrabold uppercase tracking-tight whitespace-nowrap">
                  Save
                </span>
              </button>
            )}
          </div>
        </form>
      )}
    </aside>
  );
  const createPanel = (
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">
          Create Invoice
        </h2>
        <button
          type="button"
          onClick={closeCreateForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleCreateInvoice} className="flex-1 overflow-auto p-4">
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
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    practiceId: event.target.value,
                    agreementId: "",
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
            )}
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Agreement
            </label>
            {optionsLoading ? (
              <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                Loading...
              </div>
            ) : (
              <select
                value={createForm.agreementId}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    agreementId: event.target.value,
                  }))
                }
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              >
                <option value="">No Agreement</option>
                {filteredAgreementsForCreate.map((agreement) => (
                  <option key={agreement.id} value={agreement.id}>
                    {agreement.type} • {agreement.practice?.name || "Practice"}{" "}
                    • {agreement.id.slice(0, 8).toUpperCase()}
                  </option>
                ))}
              </select>
            )}
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
                  status: event.target.value as InvoiceStatus,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            >
              {invoiceStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Total Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={createForm.totalAmount}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  totalAmount: event.target.value,
                }))
              }
              placeholder="0.00"
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Due Date
            </label>
            <input
              type="date"
              value={createForm.dueDate}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  dueDate: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
        </div>

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



  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Invoices"
        activeModule="Invoices"
        activeSubItem="All Invoices"
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

  const searchPractices = async (query: string): Promise<SearchSelectOption[]> => {
    const list = practices.length > 0 ? practices : await getAllPractices();
    const q = query.trim().toLowerCase();
    return list
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .map((p) => ({ label: p.name, value: p.id }));
  };

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Practice
        </span>
        <SearchSelect
          value={draftFilters.practiceId}
          displayLabel={
            practices.find((p) => p.id === draftFilters.practiceId)?.name || ""
          }
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, practiceId: val }))
          }
          onSearch={searchPractices}
          clearable
          toggleOnSelectSame
          placeholder="Search practice"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Status
        </span>
        <Select
          value={draftFilters.status}
          onChange={(value) =>
            setDraftFilters((prev) => ({ ...prev, status: value }))
          }
          options={[
            { label: "All Statuses", value: "" },
            ...invoiceStatusOptions.map((status) => ({
              label: formatStatusLabel(status),
              value: status,
            })),
          ]}
          placeholder="All Statuses"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Payment Method
        </span>
        <Select
          value={draftFilters.paymentMethod}
          onChange={(value) =>
            setDraftFilters((prev) => ({ ...prev, paymentMethod: value }))
          }
          options={[
            { label: "All Payment Methods", value: "" },
            { label: "Credit Card", value: "CREDIT_CARD" },
            { label: "ACH", value: "ACH" },
          ]}
          placeholder="All Payment Methods"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Created Date From
        </span>
        <DatePicker
          value={draftFilters.dateFrom}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, dateFrom: val }))
          }
          placeholder="MM-DD-YYYY"
          className="rounded-xl border-[#ece8e1]"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Created Date To
        </span>
        <DatePicker
          value={draftFilters.dateTo}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, dateTo: val }))
          }
          placeholder="MM-DD-YYYY"
          className="rounded-xl border-[#ece8e1]"
        />
      </label>
    </>
  );

  return (
    <AppLayout
      title="Invoices"
      activeModule="Invoices"
      activeSubItem="All Invoices"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="All Invoices"
            subtitle="Invoices"
            searchPlaceholder="Search invoices..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Invoices"
            filterFields={filterFieldsModal}
            onRefresh={refreshInvoices}
            isLoading={isLoading}
            isSaving={isSaving}
            isDeleting={isDeleting}
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(newSize) => {
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
              setUserSelectedPageSize(true);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {rows.length === 0 ? (
                <div className="relative flex min-h-[400px] items-center justify-center">
                  <div className="flex max-w-md flex-col items-center px-6 text-center">
                    <EmptyStateIllustration />
                    <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                      No invoices found
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-400">
                      No invoice records available for the selected criteria.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-4 py-3 text-left font-medium last:border-r-0"
                          >
                            {header.isPlaceholder ? null : (
                              <button
                                type="button"
                                onClick={
                                  header.column.getCanSort()
                                    ? header.column.getToggleSortingHandler()
                                    : undefined
                                }
                                className="flex w-full items-center gap-2 font-medium"
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
                          className={`cursor-pointer text-[13px] text-slate-600 transition-colors ${
                            isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-4 py-3 last:border-r-0"
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
          </DataTableToolbar>
        </section>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
      </div>
    </AppLayout>
  );
}

export default AllInvoicePage;
