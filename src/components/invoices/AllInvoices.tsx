import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, Circle, LayoutList, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import { getAllPractices } from "../../services/operations/practices";
import { getAllAgreements, type AgreementOption } from "../../services/operations/agreements";
import {
  createInvoiceApi,
  deleteInvoiceApi,
  getInvoice,
  getInvoicesView,
  invoiceStatusOptions,
  updateInvoiceApi,
  type Invoice,
  type InvoiceBody,
  type InvoiceRow,
  type InvoiceStatus,
} from "../../services/operations/invoices";
import type { Practice } from "../practices/types";

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

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
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
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [sorting, setSorting] = useState<SortingState>([{ id: "creationDate", desc: true }]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [agreements, setAgreements] = useState<AgreementOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [createForm, setCreateForm] = useState<InvoiceFormState>(initialFormState);
  const [editForm, setEditForm] = useState<InvoiceFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredAgreementsForCreate = useMemo(
    () => agreements.filter((agreement) => !createForm.practiceId || agreement.practiceId === createForm.practiceId),
    [agreements, createForm.practiceId],
  );

  const filteredAgreementsForEdit = useMemo(
    () => agreements.filter((agreement) => !editForm.practiceId || agreement.practiceId === editForm.practiceId),
    [agreements, editForm.practiceId],
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "practiceName",
          accessorFn: (row: InvoiceRow) => row.values.practiceName,
          header: () => "Practice",
          cell: ({ row }: { row: { original: InvoiceRow } }) => String(row.original.values.practiceName || "-"),
        },
        {
          id: "status",
          accessorFn: (row: InvoiceRow) => row.values.status,
          header: () => "Status",
          cell: ({ row }: { row: { original: InvoiceRow } }) => {
            const status = row.original.values.status;
            return (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
                {formatStatusLabel(status)}
              </span>
            );
          },
        },
        {
          id: "totalAmount",
          accessorFn: (row: InvoiceRow) => row.values.totalAmount,
          header: () => "Total Amount",
          cell: ({ row }: { row: { original: InvoiceRow } }) => String(row.original.values.totalAmount || "-"),
        },
        {
          id: "dueDate",
          accessorFn: (row: InvoiceRow) => row.values.dueDate,
          header: () => "Due Date",
          cell: ({ row }: { row: { original: InvoiceRow } }) => String(row.original.values.dueDate || "-"),
        },
        {
          id: "creationDate",
          accessorFn: (row: InvoiceRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: InvoiceRow } }) => String(row.original.values.creationDate),
        },
      ] as ColumnDef<InvoiceRow>[],
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
          setError(null);
          const data = await getInvoicesView({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search || undefined,
            status: filters.status || undefined,
          });
          setRows(data.rows);
          setPagination(data.pagination);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to load invoices";
          setError(message);
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      }

      if (filters.search.length > 2 || filters.search.length === 0) {
        loadData();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, sorting, filters]);

  useEffect(() => {
    if ((showCreateForm || showDetailPanel) && (practices.length === 0 || agreements.length === 0)) {
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
      const message = err instanceof Error ? err.message : "Failed to fetch invoice";
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
      ...(form.dueDate ? { dueDate: new Date(form.dueDate).toISOString() } : {}),
    };
  }

  async function handleCreateInvoice(event: React.FormEvent) {
    event.preventDefault();
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
      const message = err instanceof Error ? err.message : "Failed to create invoice";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateInvoice(event: React.FormEvent) {
    event.preventDefault();
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
    setIsSaving(true);
    try {
      const updatedInvoice = await updateInvoiceApi(selectedInvoice.id, buildPayload(editForm));
      await refreshRows();
      const refreshedInvoice = await getInvoice(updatedInvoice.id);
      setSelectedInvoice(refreshedInvoice);
      setEditForm(buildFormState(refreshedInvoice));
      toast.success("Invoice updated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update invoice";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteInvoice() {
    if (!selectedInvoice) return;
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    setIsDeleting(true);
    try {
      await deleteInvoiceApi(selectedInvoice.id);
      await refreshRows();
      closeDetailPanel();
      toast.success("Invoice deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete invoice";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const navbarActions = [{ label: "New record", icon: <Plus className="h-4 w-4" />, onClick: openCreateForm }];
  const detailPanel = (
    <aside className="app-panel relative flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button type="button" onClick={closeDetailPanel} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Circle className="h-4 w-4 text-slate-300" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
          {selectedInvoice?.invoiceNumber || "Invoice"}
        </span>
      </div>

      {isDetailLoading || !selectedInvoice ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">Loading invoice...</div>
      ) : (
        <form onSubmit={handleUpdateInvoice} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Practice</span>
                <span className="text-right text-slate-700">{selectedInvoice.practice?.name || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Agreement</span>
                <span className="text-right text-slate-700">
                  {selectedInvoice.agreement
                    ? `${selectedInvoice.agreement.type || "Agreement"} • ${selectedInvoice.agreement.id.slice(0, 8).toUpperCase()}`
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Line Items</span>
                <span className="text-slate-700">{selectedInvoice.lineItems?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Purchase Orders</span>
                <span className="text-slate-700">{selectedInvoice.purchaseOrders?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created</span>
                <span className="text-right text-slate-700">{formatDateTime(selectedInvoice.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Update</span>
                <span className="text-right text-slate-700">{formatDateTime(selectedInvoice.updatedAt)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">
                  Practice <span className="text-red-500">*</span>
                </label>
                {optionsLoading ? (
                  <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">Loading...</div>
                ) : (
                  <select
                    value={editForm.practiceId}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, practiceId: event.target.value, agreementId: "" }))
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
                <label className="mb-1 block text-[13px] font-medium text-slate-700">Agreement</label>
                {optionsLoading ? (
                  <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">Loading...</div>
                ) : (
                  <select
                    value={editForm.agreementId}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, agreementId: event.target.value }))}
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  >
                    <option value="">No Agreement</option>
                    {filteredAgreementsForEdit.map((agreement) => (
                      <option key={agreement.id} value={agreement.id}>
                        {agreement.type} • {agreement.practice?.name || "Practice"} • {agreement.id.slice(0, 8).toUpperCase()}
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
                  onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as InvoiceStatus }))}
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
                  value={editForm.totalAmount}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, totalAmount: event.target.value }))}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">Due Date</label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
            <button
              type="button"
              onClick={handleDeleteInvoice}
              disabled={isDeleting}
              className="flex items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="app-control inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </aside>
  );
  const createPanel = (
    <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">Create Invoice</h2>
        <button type="button" onClick={closeCreateForm} className="text-slate-400 hover:text-slate-600">
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
              <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">Loading...</div>
            ) : (
              <select
                value={createForm.practiceId}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, practiceId: event.target.value, agreementId: "" }))
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
            <label className="mb-1 block text-[13px] font-medium text-slate-700">Agreement</label>
            {optionsLoading ? (
              <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">Loading...</div>
            ) : (
              <select
                value={createForm.agreementId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, agreementId: event.target.value }))}
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              >
                <option value="">No Agreement</option>
                {filteredAgreementsForCreate.map((agreement) => (
                  <option key={agreement.id} value={agreement.id}>
                    {agreement.type} • {agreement.practice?.name || "Practice"} • {agreement.id.slice(0, 8).toUpperCase()}
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
              onChange={(event) => setCreateForm((prev) => ({ ...prev, status: event.target.value as InvoiceStatus }))}
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
              onChange={(event) => setCreateForm((prev) => ({ ...prev, totalAmount: event.target.value }))}
              placeholder="0.00"
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">Due Date</label>
            <input
              type="date"
              value={createForm.dueDate}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))}
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

  if (isLoading) {
    return (
      <AppLayout title="Invoices" activeModule="Invoices" activeSubItem="All Invoices">
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading invoices...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout title="Invoices" activeModule="Invoices" activeSubItem="All Invoices">
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-red-500">{error}</div>
          <button type="button" onClick={() => window.location.reload()} className="app-control rounded-md px-4 py-2 text-[14px] font-medium">
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Invoices"
      activeModule="Invoices"
      activeSubItem="All Invoices"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button type="button" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700">
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>All Invoices</span>
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button type="button" onClick={() => setShowFilterPanel((current) => !current)}>
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
              <input
                type="text"
                placeholder="Search by practice name..."
                value={filters.search}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, search: event.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              />
              <select
                value={filters.status}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, status: event.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Statuses</option>
                {invoiceStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFilters({ search: "", status: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.search && !filters.status}
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
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">No invoices found</h2>
                  <p className="mt-2 text-[14px] text-slate-400">Create your first invoice to get started</p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Invoice
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
                              {flexRender(header.column.columnDef.header, header.getContext())}
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
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`rounded px-2 py-1 text-[13px] ${
                      pagination.page === page ? "bg-[#4f63ea] text-white" : "text-slate-500 hover:bg-[#f0ece6]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
      </div>
    </AppLayout>
  );
}

export default AllInvoicePage;
