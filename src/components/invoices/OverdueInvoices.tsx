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
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await getInvoicesView({ status: "OVERDUE" });
        setRows(data.rows);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Failed to load invoices";
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

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
        accessorFn: (row) => row.values.totalAmount,
        header: () => (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span>Amount</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.values.totalAmount}
          </span>
        ),
        size: 140,
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
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status] || ""}`}
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

  const table = useReactTable({
    data: rows,
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

  if (isLoading) {
    return (
      <AppLayout
        title="Invoices"
        activeModule="Invoices"
        activeSubItem="Overdue Invoices"
      >
        <div className="flex h-full items-center justify-center text-[13px] text-slate-400">
          Loading overdue invoices...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Invoices"
      activeModule="Invoices"
      activeSubItem="Overdue Invoices"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-[#f0ece6]">
          <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
            <span className="text-[15px] font-medium text-slate-700">
              Overdue Invoices
            </span>
            <span className="text-[14px] text-slate-400">
              . {rows.length}
            </span>

            <div className="ml-auto flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "dueDate"
                      ? [{ id: "dueDate", desc: !current[0].desc }]
                      : [{ id: "dueDate", desc: false }],
                  )
                }
              >
                Sort
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400 last:border-r-0"
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
                {rows.length === 0 ? (
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
                      className={
                        selectedRowId === row.original.id
                          ? "bg-[#fcfbf9]"
                          : "bg-white"
                      }
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showDetailPanel && selectedInvoice ? (
          <aside className="app-panel relative flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
