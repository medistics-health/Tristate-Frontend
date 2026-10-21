import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import { DetailCard } from "../shared/tablePageUtils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  FileText,
  Building2,
  CalendarDays,
  DollarSign,
  Circle,
  ChevronLeft,
  CheckCircle,
  Clock,
  Send,
  Printer,
  Trash2,
  List,
  Users,
  ExternalLink,
  CreditCard,
  Loader2,
  Mail,
  Edit,
  ShieldCheck,
  AlertCircle,
  ArrowRightLeft,
  Landmark,
  Calendar,
  Info,
} from "lucide-react";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import ConfirmModal from "../shared/ConfirmModal";
import toast from "react-hot-toast";
import {
  getPrefundingInvoices,
  updatePrefundingInvoiceStatus,
  deletePrefundingInvoice,
  openPrefundingInvoicePdf,
  resendPrefundingInvoice,
} from "../../services/operations/prefundingInvoices";
import { getAllPractices, type Practice } from "../../services/operations/practices";
import { getSystemSettingsApi, type SystemSettings } from "../../services/operations/users";
import {
  buildPracticeDefaultProcessingFeeSettings,
  buildProcessingFeeSettings,
  buildPracticeLabelSettings,
  buildGeneralSettingsTotals,
  buildResolvedProcessingFeeSettings,
  getAllocationPercent,
  roundToPrecision,
  type ProcessingFeeSettings,
  type BillingPaymentMethod,
} from "../../utils/processingFeeConfig";

type InvoiceStatus = "Draft" | "Pending Approval" | "Approved" | "Posted";

type InvoiceLineItem = {
  id: string;
  name: string;
  basis: string | null;
  pricingModel: string | null;
  rate: number | null;
  amount: number;
  notes?: string | null;
  includeInGrandTotal?: boolean;
  sequence?: number;
  isOneTime: boolean;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  practice: string;
  practiceId: string;
  prefundingCycle?: string;
  cycle?: string;
  totalAmount: number;
  subtotalAmount?: number;
  processingFeeAmount?: number;
  companyFeeAmount?: number;
  paymentMethod?: string | null;
  paymentMethodDisplay?: string | null;
  feeBearer?: "CLIENT" | "COMPANY" | string | null;
  status: string;
  dueDate: string;
  invoiceDate: string;
  recipient: string;
  recipientName?: string;
  recipientEmail?: string;
  createdBy: string;
  createdDate: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  postedDate: string | null;
  postedAt?: string | null;
  paidDate?: string | null;
  paidAt?: string | null;
  stripeInvoiceId?: string | null;
  stripeHostedInvoiceUrl?: string | null;
  stripeInvoicePdfUrl?: string | null;
  invoicePdfBlobUrl?: string | null;
  receiptPdfBlobUrl?: string | null;
  stripeTransfers?: any[];
  lineItems?: InvoiceLineItem[];
};

const INVOICE_STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Pending Approval", label: "Pending Approval" },
  { value: "Approved", label: "Approved" },
  { value: "Posted", label: "Posted" },
  { value: "Paid", label: "Paid" },
  { value: "Overdue", label: "Overdue" },
];

function formatMoney(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "-";
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function PrefundingInvoices() {
  const navigate = useNavigate();
  const [data, setData] = useState<Invoice[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Server-side State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState("");

  type Filters = { status: string; practiceId: string };
  const defaultFilters: Filters = { status: "", practiceId: "" };
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);

  // Detail Panel State
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const selectedInvoice = useMemo(() => {
    return data.find((inv) => inv.id === selectedRowId) || null;
  }, [data, selectedRowId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sortBy = sorting.length > 0 ? sorting[0].id : undefined;
      const sortOrder = sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

      const [invoicesRes, practicesRes, settingsRes] = await Promise.all([
        getPrefundingInvoices({
          page: pagination.page,
          limit: pagination.limit,
          search: searchInput,
          status: filters.status,
          practiceId: filters.practiceId,
          sortBy,
          sortOrder,
        }),
        practices.length === 0 ? getAllPractices() : Promise.resolve(practices),
        systemSettings ? Promise.resolve(systemSettings) : getSystemSettingsApi().catch(() => null),
      ]);

      const list = invoicesRes?.invoices || [];
      setData(list);

      if (invoicesRes?.pagination) {
        setPagination((prev) => ({
          ...prev,
          totalRecords: invoicesRes.pagination.totalRecords,
          totalPages: invoicesRes.pagination.totalPages,
        }));
      }

      if (practicesRes && Array.isArray(practicesRes)) {
        setPractices(practicesRes);
      }

      if (settingsRes && !systemSettings) {
        setSystemSettings(settingsRes);
      }
    } catch (error) {
      console.error("Failed to load prefunding invoices:", error);
      toast.error("Failed to load prefunding invoices");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchInput, filters, sorting]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedInvoice) return;
    setIsUpdatingStatus(true);
    try {
      await updatePrefundingInvoiceStatus(selectedInvoice.id, newStatus);
      toast.success(`Invoice status updated to ${newStatus}`);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePreviewPdf = () => {
    if (!selectedInvoice) return;
    openPrefundingInvoicePdf(selectedInvoice.id);
  };

  const handleResend = async () => {
    if (!selectedInvoice) return;
    setIsResending(true);
    const toastId = toast.loading("Resending invoice email with latest payment link...");
    try {
      await resendPrefundingInvoice(selectedInvoice.id);
      toast.success("Prefunding invoice email resent successfully!", { id: toastId });
      await loadData();
    } catch (err: any) {
      console.error("Failed to resend invoice:", err);
      toast.error(err.message || "Failed to resend prefunding invoice", { id: toastId });
    } finally {
      setIsResending(false);
    }
  };

  const handleDelete = () => {
    if (selectedInvoice) {
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedInvoice) return;
    setIsDeleting(true);
    try {
      await deletePrefundingInvoice(selectedInvoice.id);
      toast.success("Invoice deleted successfully");
      setSelectedRowId(null);
      setShowDeleteModal(false);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateInvoiceFees = useCallback(
    (inv: Invoice) => {
      const invoicePractice = practices.find((p) => p.id === inv.practiceId);
      const rawPaymentMethod = (inv.paymentMethod || invoicePractice?.billingPaymentMethod || "ACH").toUpperCase();
      const currentPaymentMethod: "ACH" | "CREDIT_CARD" = rawPaymentMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "ACH";

      const feeConfig = invoicePractice?.processingFeeConfig
        ? buildProcessingFeeSettings(invoicePractice.processingFeeConfig)
        : buildPracticeDefaultProcessingFeeSettings(systemSettings);

      const resolvedSettings = buildResolvedProcessingFeeSettings(
        feeConfig,
        systemSettings,
      );

      const prefundingBase = Number(inv.subtotalAmount ?? inv.totalAmount);
      const normalizedBase = roundMoney(Math.max(0, prefundingBase));

      let clientProcessingFee = Number(inv.processingFeeAmount || 0);
      let companyAbsorbedFee = Number(inv.companyFeeAmount || 0);

      if (clientProcessingFee === 0 && companyAbsorbedFee === 0 && normalizedBase > 0) {
        if (currentPaymentMethod === "CREDIT_CARD") {
          const clientRule = resolvedSettings.creditCard.CLIENT;
          const companyRule = resolvedSettings.creditCard.COMPANY;
          clientProcessingFee = roundMoney(
            normalizedBase * (clientRule.ratePercent / 100) + clientRule.fixedFee,
          );
          companyAbsorbedFee = roundMoney(
            normalizedBase * (companyRule.ratePercent / 100) + companyRule.fixedFee,
          );
        } else {
          const clientRule = resolvedSettings.ach.CLIENT;
          const companyRule = resolvedSettings.ach.COMPANY;
          clientProcessingFee = roundMoney(
            Math.min(
              roundMoney(normalizedBase * (clientRule.ratePercent / 100)),
              Math.max(0, clientRule.capAmount),
            ),
          );
          companyAbsorbedFee = roundMoney(
            Math.min(
              roundMoney(normalizedBase * (companyRule.ratePercent / 100)),
              Math.max(0, companyRule.capAmount),
            ),
          );
        }
      }

      const grossInvoiceTotal = roundMoney(normalizedBase + clientProcessingFee);

      return {
        currentPaymentMethod,
        prefundingBase: normalizedBase,
        clientProcessingFee,
        companyAbsorbedFee,
        grossInvoiceTotal,
      };
    },
    [practices, systemSettings]
  );

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    let badgeClass = "bg-slate-100 text-slate-700 border border-slate-200";
    if (s.includes("paid")) {
      badgeClass = "bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold";
    } else if (s.includes("overdue")) {
      badgeClass = "bg-red-100 text-red-800 border border-red-300 font-semibold";
    } else if (s.includes("posted")) {
      badgeClass = "bg-teal-100 text-teal-800 border border-teal-300 font-semibold";
    } else if (s.includes("approved")) {
      badgeClass = "bg-blue-100 text-blue-800 border border-blue-300 font-medium";
    } else if (s.includes("pending")) {
      badgeClass = "bg-amber-100 text-amber-800 border border-amber-300 font-medium";
    } else if (s.includes("draft")) {
      badgeClass = "bg-slate-100 text-slate-700 border border-slate-200";
    }

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${badgeClass}`}>
        {status}
      </span>
    );
  };

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Invoice Number</span>
          </div>
        ),
        cell: (info) => <span className="font-medium text-slate-900">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "practice",
        header: () => (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Practice</span>
          </div>
        ),
        cell: (info) => <span>{info.getValue() as string}</span>,
      },
      {
        accessorKey: "prefundingCycle",
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Cycle</span>
          </div>
        ),
        cell: (info) => <span>{info.getValue() as string}</span>,
      },
      {
        id: "paymentMethod",
        header: () => (
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span>Payment Method</span>
          </div>
        ),
        cell: ({ row }) => {
          const inv = row.original;
          const { currentPaymentMethod } = calculateInvoiceFees(inv);
          const isCC = currentPaymentMethod === "CREDIT_CARD";
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isCC
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              <CreditCard className="h-3 w-3" />
              {isCC ? "Credit Card" : "ACH"}
            </span>
          );
        },
      },
      {
        id: "grossTotal",
        header: () => (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span>Gross Invoice Total</span>
          </div>
        ),
        cell: ({ row }) => {
          const inv = row.original;
          const { grossInvoiceTotal, clientProcessingFee, prefundingBase } = calculateInvoiceFees(inv);

          return (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900">
                {grossInvoiceTotal.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </span>
              {clientProcessingFee > 0 ? (
                <span className="text-[11px] text-slate-500">
                  Base: ${prefundingBase.toFixed(2)} + Fee: ${clientProcessingFee.toFixed(2)}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Base: ${prefundingBase.toFixed(2)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Status</span>
          </div>
        ),
        cell: ({ getValue }) => getStatusBadge(getValue() as string),
      },
      {
        id: "stripeSettlement",
        header: () => (
          <div className="flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5 text-slate-400" />
            <span>Stripe Settlement</span>
          </div>
        ),
        cell: ({ row }) => {
          const inv = row.original;
          if (inv.status.toLowerCase() !== "paid") return <span className="text-slate-400">-</span>;
          const transfers = inv.stripeTransfers;
          if (!transfers || transfers.length === 0) return <span className="text-slate-400">N/A</span>;
          const isAllPending = transfers.every((t: any) => t.status === "PENDING");
          if (isAllPending) return <span className="text-amber-600 font-semibold text-xs">In Progress</span>;
          return <span className="text-emerald-600 font-semibold text-xs">Settled</span>;
        },
      },
      {
        id: "transferStatus",
        header: () => (
          <div className="flex items-center gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5 text-slate-400" />
            <span>Transfer Status</span>
          </div>
        ),
        cell: ({ row }) => {
          const inv = row.original;
          if (inv.status.toLowerCase() !== "paid") return <span className="text-slate-400">-</span>;
          const transfers = inv.stripeTransfers;
          if (!transfers || transfers.length === 0) return <span className="text-slate-400">N/A</span>;
          const hasSent = transfers.some((t: any) => t.status === "SENT");
          const isAllSent = transfers.every((t: any) => t.status === "SENT");
          if (isAllSent || hasSent) return <span className="text-emerald-600 font-semibold text-xs">Completed</span>;
          const isFailed = transfers.some((t: any) => t.status === "FAILED");
          if (isFailed) return <span className="text-red-600 font-semibold text-xs">Failed</span>;
          return <span className="text-amber-600 font-semibold text-xs">In Progress</span>;
        },
      },
      {
        accessorKey: "dueDate",
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Due Date</span>
          </div>
        ),
        cell: (info) => <span>{info.getValue() as string}</span>,
      },
    ],
    [calculateInvoiceFees]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const activeFilterChips: ActiveFilterChip[] = [];
  if (filters.status) {
    activeFilterChips.push({
      key: "status",
      label: "Status",
      displayValue: filters.status,
      onClear: () => {
        setFilters((prev) => ({ ...prev, status: "" }));
        setDraftFilters((prev) => ({ ...prev, status: "" }));
      },
    });
  }
  if (filters.practiceId) {
    const practiceName = practices.find((p) => p.id === filters.practiceId)?.name || filters.practiceId;
    activeFilterChips.push({
      key: "practiceId",
      label: "Practice",
      displayValue: practiceName,
      onClear: () => {
        setFilters((prev) => ({ ...prev, practiceId: "" }));
        setDraftFilters((prev) => ({ ...prev, practiceId: "" }));
      },
    });
  }

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Status</span>
        <Select
          value={draftFilters.status}
          onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
          options={[{ value: "", label: "All Statuses" }, ...INVOICE_STATUS_OPTIONS]}
        />
      </label>
      <label className="block mt-4">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Practice</span>
        <Select
          value={draftFilters.practiceId}
          onChange={(val) => setDraftFilters((prev) => ({ ...prev, practiceId: val }))}
          options={[
            { value: "", label: "All Practices" },
            ...practices.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </label>
    </>
  );

  return (
    <AppLayout title="Prefunding Invoices" activeModule="Prefunding">
      <div className="h-full bg-[#f4f1ec] p-6">
        <div className="app-split font-app-sans">
          {/* Main Content */}
          <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
            <div className="h-full flex flex-col max-w-full">
              <DataTableToolbar
                title="Prefunding Invoices"
                subtitle="Manage and post prefunding invoices"
                searchPlaceholder="Search invoices by cycle, practice..."
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                activeFilterCount={activeFilterChips.length}
                activeChips={activeFilterChips}
                onResetFilters={handleResetFilters}
                onApplyFilters={handleApplyFilters}
                filterModalTitle="Filter Invoices"
                filterFields={filterFieldsModal}
                onRefresh={loadData}
                isLoading={isLoading}
                page={pagination.page}
                pageSize={pagination.limit}
                totalRecords={pagination.totalRecords}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                onPageSizeChange={(newSize) => {
                  setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
                }}
              >
                <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                  {data.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-white rounded-b-xl border border-[#e8e4dc] border-t-0">
                      <FileText className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-700">No invoices found</p>
                      <p className="text-xs text-slate-400 mt-1">Generate a prefunding invoice from the Calculate Prefunding page.</p>
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
                                {header.isPlaceholder ? null : <SortableHeaderCell header={header} />}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="bg-white">
                        {table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedRowId(row.original.id)}
                            className={`cursor-pointer transition-colors ${
                              selectedRowId === row.original.id ? "bg-[#f0f4f8]" : "hover:bg-[#fcfaf8]"
                            }`}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="border-b border-[#f0ece6] border-r border-[#fcfaf8] px-4 py-3 text-[13px] text-slate-700 last:border-r-0"
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </DataTableToolbar>
            </div>
          </section>

          {/* Sidebar */}
          {selectedRowId && selectedInvoice && (
            <div className="flex w-[620px] max-w-full flex-shrink-0 flex-col border-l border-[#f0ece6] bg-white transition-all duration-300">
              {/* Header Bar */}
              <div className="flex h-[45px] flex-shrink-0 items-center gap-2 border-b border-[#f0ece6] bg-[#fcfaf8] px-3">
                <button
                  type="button"
                  onClick={() => setSelectedRowId(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <Circle className="h-4 w-4 text-slate-300" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-700">
                  {selectedInvoice.invoiceNumber}
                </span>
                <span className="mr-1">{getStatusBadge(selectedInvoice.status)}</span>
              </div>

              {/* Action Toolbar Header (Standard CRM & BillingRun placement) */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#f0ece6] bg-slate-50/60 px-4 py-2.5">
                {selectedInvoice.status.toLowerCase() === "draft" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const cycleParam = selectedInvoice.cycle || selectedInvoice.prefundingCycle || "";
                        const url = `/prefunding/calculate?invoiceId=${selectedInvoice.id}&practiceId=${selectedInvoice.practiceId}${cycleParam ? `&cycle=${encodeURIComponent(cycleParam)}` : ""}`;
                        navigate(url);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5 text-slate-500" />
                      Edit Draft
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange("Pending Approval")}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-600 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Submit for Approval
                    </button>
                  </>
                )}

                {selectedInvoice.status.toLowerCase().includes("pending") && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("Approved")}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f63ea] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#3d4ecf] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve Invoice
                  </button>
                )}

                {selectedInvoice.status.toLowerCase() === "approved" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("Posted")}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isUpdatingStatus ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Post & Send Invoice
                      </>
                    )}
                  </button>
                )}

                {selectedInvoice.status.toLowerCase() === "posted" && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3.5 w-3.5" />
                        Resend Email
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePreviewPdf}
                  disabled={isPreviewingPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-300" />
                  {isPreviewingPdf
                    ? "Generating..."
                    : selectedInvoice.status.toLowerCase() === "paid"
                    ? "View Receipt"
                    : selectedInvoice.status.toLowerCase() === "posted"
                    ? "View Invoice"
                    : "Preview Invoice"}
                </button>

                {selectedInvoice.status.toLowerCase() !== "approved" &&
                  selectedInvoice.status.toLowerCase() !== "posted" &&
                  selectedInvoice.status.toLowerCase() !== "paid" && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer"
                      title="Delete Invoice"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {(() => {
                  const invoicePractice = practices.find((p) => p.id === selectedInvoice.practiceId);
                  const rawPaymentMethod = (selectedInvoice.paymentMethod || invoicePractice?.billingPaymentMethod || "ACH").toUpperCase();
                  const currentPaymentMethod: "ACH" | "CREDIT_CARD" = rawPaymentMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "ACH";

                  const feeConfig = invoicePractice?.processingFeeConfig
                    ? buildProcessingFeeSettings(invoicePractice.processingFeeConfig)
                    : buildPracticeDefaultProcessingFeeSettings(systemSettings);

                  const resolvedSettings = buildResolvedProcessingFeeSettings(
                    feeConfig,
                    systemSettings,
                  );

                  const prefundingBase = Number(selectedInvoice.subtotalAmount ?? selectedInvoice.totalAmount);
                  const normalizedBase = roundMoney(Math.max(0, prefundingBase));

                  // Calculate exact fees based on rate setup (Client & Company)
                  let clientProcessingFee = Number(selectedInvoice.processingFeeAmount || 0);
                  let companyAbsorbedFee = Number(selectedInvoice.companyFeeAmount || 0);

                  // If invoice is draft/approved or fees are 0, dynamically calculate based on rate setup
                  if (clientProcessingFee === 0 && companyAbsorbedFee === 0 && normalizedBase > 0) {
                    if (currentPaymentMethod === "CREDIT_CARD") {
                      const clientRule = resolvedSettings.creditCard.CLIENT;
                      const companyRule = resolvedSettings.creditCard.COMPANY;
                      clientProcessingFee = roundMoney(
                        normalizedBase * (clientRule.ratePercent / 100) + clientRule.fixedFee,
                      );
                      companyAbsorbedFee = roundMoney(
                        normalizedBase * (companyRule.ratePercent / 100) + companyRule.fixedFee,
                      );
                    } else {
                      const clientRule = resolvedSettings.ach.CLIENT;
                      const companyRule = resolvedSettings.ach.COMPANY;
                      clientProcessingFee = roundMoney(
                        Math.min(
                          roundMoney(normalizedBase * (clientRule.ratePercent / 100)),
                          Math.max(0, clientRule.capAmount),
                        ),
                      );
                      companyAbsorbedFee = roundMoney(
                        Math.min(
                          roundMoney(normalizedBase * (companyRule.ratePercent / 100)),
                          Math.max(0, companyRule.capAmount),
                        ),
                      );
                    }
                  }

                  const grossInvoiceTotal = roundMoney(normalizedBase + clientProcessingFee);

                  return (
                    <>
                      {/* 1. Detail Card: Practice & Core Invoice Details */}
                      <DetailCard
                        title={selectedInvoice.practice}
                        infoRows={[
                          {
                            label: "Prefunding Cycle",
                            value: selectedInvoice.prefundingCycle || selectedInvoice.cycle || "-",
                          },
                          {
                            label: "Invoice Date",
                            value: selectedInvoice.invoiceDate || "-",
                          },
                          {
                            label: "Due Date",
                            value: selectedInvoice.dueDate || "-",
                          },
                          {
                            label: "Recipient (Primary Contact)",
                            value: selectedInvoice.recipientName
                              ? `${selectedInvoice.recipientName} (${selectedInvoice.recipientEmail || "No email"})`
                              : selectedInvoice.recipient || "-",
                          },
                        ]}
                        metric={{
                          label: "Gross Invoice Total",
                          value: formatMoney(grossInvoiceTotal),
                        }}
                      />

                      {/* 2. Billing Run Summary Card */}
                      <div className="rounded-2xl border border-[#eadfcd] bg-gradient-to-br from-[#f9f4ec] via-white to-[#f4f7fb] p-4 text-[13px] space-y-3 shadow-xs">
                        <h3 className="font-semibold text-slate-800 text-[14px] border-b border-[#eadfcd]/40 pb-2 flex items-center justify-between">
                          <span>Billing Run Summary</span>
                          <span className="text-[11px] font-normal text-slate-400">Processing Fees & Totals</span>
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Prefunding amount</span>
                          <span className="font-bold text-slate-800">{formatMoney(normalizedBase)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Processing Fee</span>
                          <span className="font-bold text-slate-700">{formatMoney(clientProcessingFee)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Company Absorbed</span>
                          <span className="font-bold text-slate-700">
                            {formatMoney(normalizedBase === 0 ? 0 : companyAbsorbedFee)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Payment Method</span>
                          <span className="font-bold text-slate-700">
                            {currentPaymentMethod === "CREDIT_CARD" ? "Credit Card" : "ACH"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#eadfcd]/40 pt-2.5">
                          <span className="text-slate-600 font-semibold">Gross Invoice Total</span>
                          <span className="font-extrabold text-[15px] text-emerald-600">
                            {formatMoney(grossInvoiceTotal)}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* 3. Invoice Line Items & Rates Breakdown */}
                {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
                        <List className="h-4 w-4 text-slate-400" />
                        Invoice Line Items & Rates Breakdown
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {selectedInvoice.lineItems.length} items
                      </span>
                    </div>
                    <div className="rounded-xl border border-[#ece8e1] overflow-hidden shadow-2xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#fbfaf8] text-slate-500 font-semibold text-[11px] border-b border-[#ece8e1]">
                          <tr>
                            <th className="px-3.5 py-2.5">Rate / Line Item</th>
                            <th className="px-3 py-2.5">Basis</th>
                            <th className="px-3 py-2.5">Model</th>
                            <th className="px-3 py-2.5">Rate</th>
                            <th className="px-3.5 py-2.5 text-right">Amount</th>
                            <th className="px-2.5 py-2.5 text-center">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ece8e1] bg-white">
                          {(() => {
                            const items = selectedInvoice.lineItems || [];
                            const grossWageItem = items.find((i) =>
                              (i.name || "").toLowerCase().includes("gross wage") ||
                              (i.basis || "").toLowerCase().includes("gross wage")
                            );
                            const otherItems = items.filter((i) => i.id !== grossWageItem?.id);

                            // Checked items = includeInGrandTotal is true (or default true)
                            const checkedItems = otherItems
                              .filter((i) => i.includeInGrandTotal !== false)
                              .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

                            // Unchecked / Additional items = includeInGrandTotal is false
                            const uncheckedItems = otherItems
                              .filter((i) => i.includeInGrandTotal === false)
                              .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

                            const grossWagesAmount = grossWageItem ? grossWageItem.amount : 0;
                            const checkedAmount = checkedItems.reduce((acc, curr) => acc + curr.amount, 0);
                            const prefundingSubtotal = grossWagesAmount + checkedAmount;
                            const uncheckedAmount = uncheckedItems.reduce((acc, curr) => acc + curr.amount, 0);

                            const {
                              currentPaymentMethod,
                              prefundingBase,
                              clientProcessingFee,
                              grossInvoiceTotal,
                            } = calculateInvoiceFees(selectedInvoice);

                            const formatRateVal = (rate: number | null, model: string | null) => {
                              if (rate === null || rate === undefined) return "-";
                              if (model === "Percentage") return `${rate}%`;
                              if (model === "Multiplication") return `x${rate}`;
                              if (model === "Division") return `/${rate}`;
                              return `$${rate}`;
                            };

                            return (
                              <>
                                {/* Employee Gross Wages Row */}
                                {grossWageItem && (
                                  <tr key={grossWageItem.id} className="bg-emerald-50/25 font-medium hover:bg-emerald-50/40 transition-colors">
                                    <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                                      <div className="flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>{grossWageItem.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600">
                                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                        Gross Wages
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600">Addition</td>
                                    <td className="px-3 py-2.5 text-slate-600">-</td>
                                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                                      ${grossWageItem.amount.toFixed(2)}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-center">
                                      <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                                        Wages
                                      </span>
                                    </td>
                                  </tr>
                                )}

                                {/* Checked adjustments (Taxes & Template Line Items) */}
                                {checkedItems.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                                      <div>{item.name}</div>
                                      {item.notes && (
                                        <div className="text-[10px] text-slate-500 font-normal italic mt-0.5">
                                          <span className="text-slate-400 not-italic">Note:</span> {item.notes}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600">
                                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                        {item.basis || "-"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600">{item.pricingModel || "-"}</td>
                                    <td className="px-3 py-2.5 text-slate-600">
                                      {formatRateVal(item.rate, item.pricingModel)}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right font-semibold text-slate-800">
                                      ${item.amount.toFixed(2)}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-center">
                                      {item.isOneTime ? (
                                        <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold">
                                          One-Time
                                        </span>
                                      ) : (
                                        <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                                          Template
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}

                                {/* GMS Projection subtotal (Gross Wages + Adjustments) */}
                                <tr className="bg-slate-50/90 border-t border-[#ece8e1] font-semibold">
                                  <td colSpan={4} className="px-3.5 py-2.5 text-right text-[11px] text-slate-700">
                                    <div>GMS Projection:</div>
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      Gross Wages (${grossWagesAmount.toFixed(2)}) + Adjustments (${checkedAmount.toFixed(2)})
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right text-indigo-700 font-bold text-xs">
                                    ${prefundingSubtotal.toFixed(2)}
                                  </td>
                                  <td></td>
                                </tr>

                                {/* Unchecked Additional Line Items (shown after GMS Projection) */}
                                {uncheckedItems.map((item) => (
                                  <tr key={item.id} className="bg-slate-50/40 hover:bg-slate-50/70 transition-colors">
                                    <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                                      <div>{item.name}</div>
                                      {item.notes && (
                                        <div className="text-[10px] text-slate-500 font-normal italic mt-0.5">
                                          <span className="text-slate-400 not-italic">Note:</span> {item.notes}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600">
                                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                        {item.basis || "Grand Total"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600">{item.pricingModel || "-"}</td>
                                    <td className="px-3 py-2.5 text-slate-600">
                                      {formatRateVal(item.rate, item.pricingModel)}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right font-semibold text-slate-800">
                                      ${item.amount.toFixed(2)}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-center">
                                      {item.isOneTime ? (
                                        <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold">
                                          One-Time
                                        </span>
                                      ) : (
                                        <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                                          Template
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}

                                {/* Total Grand Total (Line Items Subtotal) row */}
                                <tr className="border-t border-[#e2ded6] bg-white font-bold">
                                  <td colSpan={4} className="px-3.5 py-3 text-right">
                                    <div className="text-slate-800 text-[11px] uppercase tracking-wide">
                                      Prefunding Amount (Subtotal):
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      {uncheckedItems.length > 0
                                        ? `GMS Projection ($${prefundingSubtotal.toFixed(2)}) + Additional Line Items ($${uncheckedAmount.toFixed(2)})`
                                        : `GMS Projection ($${prefundingSubtotal.toFixed(2)})`}
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-3 text-right text-slate-900 text-[13px] font-bold">
                                    ${prefundingBase.toFixed(2)}
                                  </td>
                                  <td></td>
                                </tr>

                                {/* Processing Fee row (showing payment method and fee) */}
                                <tr className="bg-slate-50/80 border-t border-[#ece8e1]">
                                  <td colSpan={4} className="px-3.5 py-2.5 text-right font-medium text-slate-600 text-xs">
                                    Payment Processing Fee ({currentPaymentMethod === "CREDIT_CARD" ? "Credit Card" : "ACH"}):
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-semibold text-slate-800 text-xs">
                                    {clientProcessingFee > 0 ? `+$${clientProcessingFee.toFixed(2)}` : "$0.00"}
                                  </td>
                                  <td></td>
                                </tr>

                                <tr className="bg-blue-50/50 border-t-2 border-blue-200 font-bold">
                                  <td colSpan={4} className="px-3.5 py-3 text-right text-blue-950 text-[11px] uppercase tracking-wider">
                                    Gross Invoice Total:
                                  </td>
                                  <td className="px-3.5 py-3 text-right text-[#4f63ea] text-[14px] font-black">
                                    ${grossInvoiceTotal.toFixed(2)}
                                  </td>
                                  <td></td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. Payment & Stripe Info (when paid / Stripe details present) */}
                {(selectedInvoice.paidDate || selectedInvoice.paymentMethodDisplay || (selectedInvoice.stripeTransfers && selectedInvoice.stripeTransfers.length > 0)) && (
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5 text-xs space-y-3">
                    <h4 className="text-[12px] font-semibold text-blue-950 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                      Payment & Stripe Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedInvoice.paymentMethodDisplay && (
                        <div>
                          <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">Payment Method</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">{selectedInvoice.paymentMethodDisplay}</span>
                        </div>
                      )}
                      {selectedInvoice.paidDate && (
                        <div>
                          <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">Paid Date</span>
                          <span className="font-semibold text-emerald-700 mt-0.5 block">{selectedInvoice.paidDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Settlement & Transfer Tracker */}
                    {selectedInvoice.stripeTransfers && selectedInvoice.stripeTransfers.length > 0 && (
                      <div className="pt-3 border-t border-blue-200/60">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">Stripe Settlement</span>
                            <span className={`font-bold mt-0.5 block ${
                              selectedInvoice.stripeTransfers.every((t: any) => t.status === "PENDING")
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}>
                              {selectedInvoice.stripeTransfers.every((t: any) => t.status === "PENDING") ? "In Progress" : "Settled"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wider">Transfer Status</span>
                            <span className={`font-bold mt-0.5 block ${
                              selectedInvoice.stripeTransfers.some((t: any) => t.status === "SENT")
                                ? "text-emerald-700"
                                : selectedInvoice.stripeTransfers.some((t: any) => t.status === "FAILED")
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}>
                              {selectedInvoice.stripeTransfers.some((t: any) => t.status === "SENT")
                                ? "Completed"
                                : selectedInvoice.stripeTransfers.some((t: any) => t.status === "FAILED")
                                ? "Failed"
                                : "In Progress"}
                            </span>
                          </div>
                        </div>

                        {/* Show error messages if any transfer failed */}
                        {selectedInvoice.stripeTransfers.some((t: any) => t.status === "FAILED" && t.failureMessage) && (
                          <div className="mt-2.5 rounded-lg bg-red-50 p-2.5 border border-red-200 text-xs text-red-700">
                            <div className="flex items-center gap-1.5 font-bold text-red-800 mb-1">
                              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                              <span>Transfer Error</span>
                            </div>
                            <div className="pl-5 space-y-1">
                              {selectedInvoice.stripeTransfers
                                .filter((t: any) => t.status === "FAILED" && t.failureMessage)
                                .map((t: any) => (
                                  <div key={t.id} className="text-[11px] leading-tight">
                                    <span className="font-semibold">{t.stripeConnectedAccountId}: </span>
                                    {t.failureMessage}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Audit Information */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <h4 className="text-[12px] font-semibold text-slate-800 mb-2.5 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                    Audit Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Created By</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{selectedInvoice.createdBy}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Created Date & Time</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {selectedInvoice.createdAt
                          ? new Date(selectedInvoice.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : selectedInvoice.createdDate}
                      </span>
                    </div>

                    {selectedInvoice.updatedAt && selectedInvoice.updatedAt !== selectedInvoice.createdAt && (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Last Edited / Modified</span>
                        <span className="font-semibold text-slate-700">
                          {new Date(selectedInvoice.updatedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    )}

                    {selectedInvoice.approvedAt && (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Approved By</span>
                          <span className="font-semibold text-blue-700 mt-0.5 block">
                            {selectedInvoice.approvedBy || "Administrator"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Approved Date & Time</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">
                            {new Date(selectedInvoice.approvedAt).toLocaleString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedInvoice.postedAt && (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider">Posted Date & Time</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {new Date(selectedInvoice.postedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Prefunding Invoice?"
        message={`Are you sure you want to delete invoice "${selectedInvoice?.invoiceNumber || ""}"? This action cannot be undone.`}
        confirmLabel="Delete Invoice"
        cancelLabel="Cancel"
        type="danger"
        isConfirming={isDeleting}
      />
    </AppLayout>
  );
}
