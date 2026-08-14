import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  CalendarDays,
  ChevronLeft,
  Circle,
  DollarSign,
  LayoutGrid,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar, { type ActiveFilterChip } from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import DatePicker from "../shared/DatePicker";
import { getAllPractices } from "../../services/operations/practices";
import type { NavbarAction } from "../layout/Navbar";
import {
  getInvoicesView,
  getInvoice,
  updateInvoiceApi,
  deleteInvoiceApi,
  invoiceStatusOptions,
  type Invoice,
  type InvoiceBody,
  type InvoiceRow,
  type InvoiceStatus,
} from "../../services/operations/invoices";

const statusStyles: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-600",
};

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

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

function formatDateForInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function OverdueInvoicePage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedRowId = selectedInvoice?.id || null;
  type OverdueFilters = {
    practiceId: string;
    paymentMethod: string;
    dateFrom: string;
    dateTo: string;
  };

  const defaultOverdueFilters: OverdueFilters = {
    practiceId: "",
    paymentMethod: "",
    dateFrom: "",
    dateTo: "",
  };

  const [filters, setFilters] = useState<OverdueFilters>(defaultOverdueFilters);
  const [draftFilters, setDraftFilters] = useState<OverdueFilters>(defaultOverdueFilters);
  const [practices, setPractices] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    getAllPractices()
      .then((list) => setPractices(list))
      .catch(() => setPractices([]));
  }, []);

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultOverdueFilters);
    setDraftFilters(defaultOverdueFilters);
    setSearchInput("");
    setPage(1);
  };

  const activeFilterCount = [
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
          setPage(1);
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
          setPage(1);
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
          setPage(1);
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
          setPage(1);
        },
      });
    }
    return chips;
  }, [filters, practiceFilterLabel]);
  const getResponsivePageSize = () => {
    const height = window.innerHeight;
    if (height >= 1200) return 15;
    if (height >= 900) return 10;
    if (height >= 700) return 8;
    return 6;
  };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(getResponsivePageSize);
  const [userSelectedPageSize, setUserSelectedPageSize] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (!userSelectedPageSize) {
        setPageSize(getResponsivePageSize());
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userSelectedPageSize]);

  type EditForm = {
    status: InvoiceStatus;
    totalAmount: string;
    dueDate: string;
  };

  const initialForm: EditForm = {
    status: "OVERDUE",
    totalAmount: "",
    dueDate: "",
  };

  const [editForm, setEditForm] = useState<EditForm>(initialForm);

  const refreshOverdueInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await getInvoicesView({
        status: "OVERDUE",
        practiceId: filters.practiceId || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      setRows(data.rows);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load invoices";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshOverdueInvoices();
  }, [filters]);

  async function loadInvoiceDetail(id: string) {
    try {
      setIsDetailLoading(true);
      const invoice = await getInvoice(id);
      setSelectedInvoice(invoice);
      setEditForm({
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        dueDate: formatDateForInput(invoice.dueDate),
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load invoice";
      toast.error(msg);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    loadInvoiceDetail(rowId);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedInvoice(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice) return;
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
      await updateInvoiceApi(selectedInvoice.id, {
        status: editForm.status,
        totalAmount: Number.parseFloat(editForm.totalAmount) || 0,
        dueDate: editForm.dueDate
          ? new Date(editForm.dueDate).toISOString()
          : undefined,
      });
      const data = await getInvoicesView({ status: "OVERDUE" });
      setRows(data.rows);
      await loadInvoiceDetail(selectedInvoice.id);
      toast.success("Invoice updated");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to update invoice";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedInvoice) return;
    if (!window.confirm("Are you sure you want to delete this invoice?")) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteInvoiceApi(selectedInvoice.id);
      const data = await getInvoicesView({ status: "OVERDUE" });
      setRows(data.rows);
      closeDetailPanel();
      toast.success("Invoice deleted");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to delete invoice";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        id: "invoiceNumber",
        accessorFn: (row) => row.values.invoiceNumber,
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Invoice</span>
          </div>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleRowClick(row.original.id)}
            className="text-left hover:text-[#4f63ea]"
          >
            {row.original.values.invoiceNumber}
          </button>
        ),
        size: 240,
      },
      {
        id: "practiceName",
        accessorFn: (row) => row.values.practiceName,
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Practice</span>
          </div>
        ),
        cell: ({ row }) => row.original.values.practiceName,
        size: 220,
      },
      {
        id: "totalAmount",
        accessorFn: (row) =>
          row.values.grossInvoiceTotal ||
          row.values.netAmount ||
          (row.values as any).totalAmount ||
          "-",
        header: () => (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span>Amount</span>
          </div>
        ),
        cell: ({ row }) => {
          const val =
            row.original.values.grossInvoiceTotal ||
            row.original.values.netAmount ||
            (row.original.values as any).totalAmount;
          return (
            <span className="font-semibold text-slate-800">
              {formatCurrency(val)}
            </span>
          );
        },
        size: 150,
      },
      {
        id: "dueDate",
        accessorFn: (row) => row.values.dueDate,
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Due Date</span>
          </div>
        ),
        cell: ({ row }) => row.original.values.dueDate,
        size: 140,
      },
      {
        id: "status",
        accessorFn: (row) => row.values.status,
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Status</span>
          </div>
        ),
        cell: ({ row }) => {
          const status = row.original.values.status;
          return (
            <span
              className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${statusStyles[status] || ""}`}
            >
              {formatStatusLabel(status)}
            </span>
          );
        },
        size: 140,
      },
      {
        id: "creationDate",
        accessorFn: (row) => row.values.creationDate,
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Created</span>
          </div>
        ),
        cell: ({ row }) => row.original.values.creationDate,
        size: 180,
      },
      {
        id: "add",
        header: () => <span />,
        cell: () => null,
        enableSorting: false,
        size: 44,
      },
    ],
    [],
  );

  const filteredRows = useMemo(() => {
    const norm = searchInput.trim().toLowerCase();
    if (!norm) return rows;
    return rows.filter((row) => {
      const invNum = (row.values.invoiceNumber || "").toLowerCase();
      const pracName = (row.values.practiceName || "").toLowerCase();
      const amt = String(row.values.totalAmount || "").toLowerCase();
      const status = (row.values.status || "").toLowerCase();
      return (
        invNum.includes(norm) ||
        pracName.includes(norm) ||
        amt.includes(norm) ||
        status.includes(norm)
      );
    });
  }, [rows, searchInput]);

  const totalRecords = filteredRows.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const table = useReactTable({
    data: paginatedRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => toast("Create new invoices from All Invoices."),
    },
  ];



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
      activeSubItem="Overdue Invoices"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Overdue Invoices"
            subtitle="Invoices"
            searchPlaceholder="Search overdue invoices..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Overdue Invoices"
            filterFields={filterFieldsModal}
            onRefresh={refreshOverdueInvoices}
            isLoading={isLoading}
            isSaving={isSaving}
            isDeleting={isDeleting}
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setUserSelectedPageSize(true);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-4 py-3 text-left font-medium last:border-r-0"
                          style={{
                            width: header.getSize()
                              ? `${header.getSize()}px`
                              : undefined,
                          }}
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
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-8 text-center text-[13px] text-slate-400"
                      >
                        No overdue invoices found.
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className={`cursor-pointer text-[13px] text-slate-600 transition-colors ${
                          selectedRowId === row.original.id
                            ? "bg-[#fcfbf9]"
                            : "bg-white hover:bg-[#faf9f7]"
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="border-b border-[#f4f4ec] border-r border-[#f6f2ec] px-4 py-3 last:border-r-0"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DataTableToolbar>
        </section>

        {showDetailPanel && selectedInvoice ? (
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
                {selectedInvoice.invoiceNumber}
              </span>
            </div>

            {isDetailLoading ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading invoice...
              </div>
            ) : (
              <form
                onSubmit={handleUpdate}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Practice</span>
                      <span className="text-right text-slate-700">
                        {selectedInvoice.practice?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Agreement</span>
                      <span className="text-right text-slate-700">
                        {selectedInvoice.agreement?.type || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-right text-slate-700">
                        {new Date(
                          selectedInvoice.createdAt,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-right text-slate-700">
                        {new Date(
                          selectedInvoice.updatedAt,
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            status: e.target.value as InvoiceStatus,
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
                        Total Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.totalAmount}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            totalAmount: e.target.value,
                          }))
                        }
                        disabled
                        className="app-control w-full rounded-md px-3 py-2 text-[13px] bg-slate-50 cursor-not-allowed text-slate-500"
                        placeholder="0.00"
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
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            dueDate: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex cursor-pointer items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="app-control inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default OverdueInvoicePage;
