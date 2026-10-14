import React, { useMemo, useState, useEffect, useCallback } from "react";
import AppLayout from "../layout/AppLayout";
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
} from "../../services/operations/prefundingInvoices";
import { getAllPractices, type Practice } from "../../services/operations/practices";

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
  prefundingCycle: string;
  totalAmount: number;
  status: string;
  dueDate: string;
  invoiceDate: string;
  recipient: string;
  recipientName?: string;
  recipientEmail?: string;
  createdBy: string;
  createdDate: string;
  postedDate: string | null;
  lineItems?: InvoiceLineItem[];
};

const INVOICE_STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Pending Approval", label: "Pending Approval" },
  { value: "Approved", label: "Approved" },
  { value: "Posted", label: "Posted" },
];

export default function PrefundingInvoices() {
  const [data, setData] = useState<Invoice[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
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

      const [invoicesRes, practicesRes] = await Promise.all([
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

  const handlePreviewPdf = async () => {
    if (!selectedInvoice) return;
    setIsPreviewingPdf(true);
    const toastId = toast.loading("Generating A4 Prefunding Invoice PDF...");
    try {
      await openPrefundingInvoicePdf(selectedInvoice.id);
      toast.success("PDF opened in new tab", { id: toastId });
    } catch (err: any) {
      console.error("Failed to generate PDF:", err);
      toast.error(err.message || "Failed to preview PDF", { id: toastId });
    } finally {
      setIsPreviewingPdf(false);
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

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let badgeClass = "bg-slate-100 text-slate-700";
    if (s.includes("pending")) badgeClass = "bg-amber-100 text-amber-800";
    else if (s.includes("approved")) badgeClass = "bg-blue-100 text-blue-800";
    else if (s.includes("posted")) badgeClass = "bg-emerald-100 text-emerald-800";
    else if (s.includes("draft")) badgeClass = "bg-slate-100 text-slate-700";

    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
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
        accessorKey: "totalAmount",
        header: () => (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span>Total Amount</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const val = Number(getValue()) || 0;
          return (
            <span className="font-semibold text-slate-800">
              {val.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </span>
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
    []
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
              <div className="flex h-[45px] flex-shrink-0 items-center gap-2 border-b border-[#f0ece6] bg-[#fcfaf8] px-3">
                <button
                  type="button"
                  onClick={() => setSelectedRowId(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <Circle className="h-4 w-4 text-slate-300" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-700">
                  {selectedInvoice.invoiceNumber}
                </span>
                <span className="mr-1">{getStatusBadge(selectedInvoice.status)}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedInvoice.practice}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    Prefunding Cycle: <span className="font-medium text-slate-700">{selectedInvoice.prefundingCycle}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Invoice Date</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{selectedInvoice.invoiceDate}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Due Date</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{selectedInvoice.dueDate}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Recipient (Primary Contact)</p>
                    {selectedInvoice.recipientName ? (
                      <div className="mt-0.5">
                        <p className="text-sm font-semibold text-slate-800">{selectedInvoice.recipientName}</p>
                        {selectedInvoice.recipientEmail && (
                          <p className="text-xs text-slate-500 mt-0.5">{selectedInvoice.recipientEmail}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-800 mt-0.5 truncate" title={selectedInvoice.recipient}>
                        {selectedInvoice.recipient || "N/A"}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200/60">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Invoice Amount</p>
                    <p className="text-lg font-bold text-[#4f63ea] mt-0.5">
                      {selectedInvoice.totalAmount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </p>
                  </div>
                </div>

                {/* Line Items Breakdown (Styled matching /prefunding/calculate) */}
                {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
                      <List className="h-4 w-4 text-slate-400" />
                      Invoice Line Items & Rates Breakdown
                    </h4>
                    <div className="rounded-xl border border-[#ece8e1] overflow-hidden">
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

                                {/* Total Prefunding Adjustments subtotal (Gross Wages + Adjustments) */}
                                <tr className="bg-slate-50/90 border-t border-[#ece8e1] font-semibold">
                                  <td colSpan={4} className="px-3.5 py-2.5 text-right text-[11px] text-slate-700">
                                    <div>Total Prefunding Adjustments:</div>
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      Gross Wages (${grossWagesAmount.toFixed(2)}) + Adjustments (${checkedAmount.toFixed(2)})
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right text-indigo-700 font-bold text-xs">
                                    ${prefundingSubtotal.toFixed(2)}
                                  </td>
                                  <td></td>
                                </tr>

                                {/* Unchecked Additional Line Items (shown after Total Prefunding Adjustments) */}
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

                                {/* Total Grand Total row */}
                                <tr className="border-t border-[#e2ded6] bg-[#f5f7fe]/80 font-bold">
                                  <td colSpan={4} className="px-3.5 py-3 text-right">
                                    <div className="text-[#4f63ea] text-[11px] uppercase tracking-wide">
                                      Total Grand Total:
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      {uncheckedItems.length > 0
                                        ? `Total Adjustments ($${prefundingSubtotal.toFixed(2)}) + Additional Line Items ($${uncheckedAmount.toFixed(2)})`
                                        : `Total Adjustments ($${prefundingSubtotal.toFixed(2)})`}
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-3 text-right text-[#4f63ea] text-[13px] font-black">
                                    ${selectedInvoice.totalAmount.toFixed(2)}
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

                <div className="border-t border-[#e8e4dc] pt-5">
                  <h4 className="text-[13px] font-semibold text-slate-800 mb-3">Audit Information</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created By</span>
                      <span className="font-medium text-slate-800">{selectedInvoice.createdBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created Date</span>
                      <span className="font-medium text-slate-800">{selectedInvoice.createdDate}</span>
                    </div>
                    {selectedInvoice.postedDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Posted Date</span>
                        <span className="font-medium text-slate-800">{selectedInvoice.postedDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#e8e4dc] pt-5 space-y-2.5">
                  {selectedInvoice.status.toLowerCase() === "draft" && (
                    <button
                      onClick={() => handleStatusChange("Pending Approval")}
                      disabled={isUpdatingStatus}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Clock className="h-4 w-4" />
                      Submit for Approval
                    </button>
                  )}

                  {selectedInvoice.status.toLowerCase().includes("pending") && (
                    <button
                      onClick={() => handleStatusChange("Approved")}
                      disabled={isUpdatingStatus}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-[#4f63ea] hover:bg-[#4f63ea]/90 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Invoice
                    </button>
                  )}

                  {selectedInvoice.status.toLowerCase() === "approved" && (
                    <button
                      onClick={() => handleStatusChange("Posted")}
                      disabled={isUpdatingStatus}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      Post Invoice
                    </button>
                  )}

                  <button
                    onClick={handlePreviewPdf}
                    disabled={isPreviewingPdf}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" />
                    {isPreviewingPdf ? "Generating PDF..." : "Preview & Print PDF (A4)"}
                  </button>

                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Invoice
                  </button>
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
