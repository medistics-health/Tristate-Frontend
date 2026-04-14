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
import { getAllInvoices, type Invoice } from "../../services/operations/invoices";
import { getAllServices } from "../../services/operations/services";
import type { Service } from "../services/types";
import {
  createInvoiceLineItemApi,
  deleteInvoiceLineItemApi,
  getInvoiceLineItem,
  getInvoiceLineItemsView,
  updateInvoiceLineItemApi,
  type InvoiceLineItem,
  type InvoiceLineItemBody,
  type InvoiceLineItemRow,
} from "../../services/operations/invoiceLineItems";

type FormState = {
  invoiceId: string;
  serviceId: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
};

const initialFormState: FormState = {
  invoiceId: "",
  serviceId: "",
  quantity: "",
  unitPrice: "",
  totalPrice: "",
};

function getInvoiceLabel(invoice: Invoice) {
  return invoice.invoiceNumber || `${invoice.practice?.name || "Invoice"} - ${invoice.id.slice(0, 8).toUpperCase()}`;
}

function formatCurrency(amount?: string | null) {
  if (!amount) return "-";
  const value = Number.parseFloat(amount);
  if (Number.isNaN(value)) return amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function buildFormState(lineItem?: InvoiceLineItem | null): FormState {
  if (!lineItem) return initialFormState;
  return {
    invoiceId: lineItem.invoiceId,
    serviceId: lineItem.serviceId,
    quantity: String(lineItem.quantity),
    unitPrice: lineItem.unitPrice,
    totalPrice: lineItem.totalPrice,
  };
}

function AllInvoiceLineItems() {
  const [rows, setRows] = useState<InvoiceLineItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedLineItem, setSelectedLineItem] = useState<InvoiceLineItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ invoiceId: "" });
  const [sorting, setSorting] = useState<SortingState>([{ id: "creationDate", desc: true }]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(initialFormState);
  const [editForm, setEditForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = useMemo(
    () =>
      [
        {
          id: "invoiceLabel",
          accessorFn: (row: InvoiceLineItemRow) => row.values.invoiceLabel,
          header: () => "Invoice",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) => String(row.original.values.invoiceLabel || "-"),
        },
        {
          id: "serviceName",
          accessorFn: (row: InvoiceLineItemRow) => row.values.serviceName,
          header: () => "Service",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) => String(row.original.values.serviceName || "-"),
        },
        {
          id: "quantity",
          accessorFn: (row: InvoiceLineItemRow) => row.values.quantity,
          header: () => "Quantity",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) => String(row.original.values.quantity ?? "-"),
        },
        {
          id: "unitPrice",
          accessorFn: (row: InvoiceLineItemRow) => row.values.unitPrice,
          header: () => "Unit Price",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) => String(row.original.values.unitPrice || "-"),
        },
        {
          id: "totalPrice",
          accessorFn: (row: InvoiceLineItemRow) => row.values.totalPrice,
          header: () => "Total Price",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) => String(row.original.values.totalPrice || "-"),
        },
        {
          id: "creationDate",
          accessorFn: (row: InvoiceLineItemRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) => String(row.original.values.creationDate),
        },
      ] as ColumnDef<InvoiceLineItemRow>[],
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
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getInvoiceLineItemsView({
          page: pagination.page,
          limit: pagination.limit,
          invoiceId: filters.invoiceId || undefined,
        });
        setRows(data.rows);
        setPagination(data.pagination);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load invoice line items";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [pagination.page, pagination.limit, sorting, filters]);

  useEffect(() => {
    if ((showCreateForm || showDetailPanel || showFilterPanel) && (invoices.length === 0 || services.length === 0)) {
      setOptionsLoading(true);
      Promise.all([getAllInvoices(), getAllServices()])
        .then(([invoiceList, serviceList]) => {
          setInvoices(invoiceList);
          setServices(serviceList);
        })
        .catch((err) => console.error("Failed to load line item options:", err))
        .finally(() => setOptionsLoading(false));
    }
  }, [showCreateForm, showDetailPanel, showFilterPanel, invoices.length, services.length]);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getInvoiceLineItemsView({
      page: targetPage,
      limit: pagination.limit,
      invoiceId: filters.invoiceId || undefined,
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
      const lineItem = await getInvoiceLineItem(rowId);
      setSelectedLineItem(lineItem);
      setEditForm(buildFormState(lineItem));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch invoice line item";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedLineItem(null);
    setEditForm(initialFormState);
  }

  function openCreateForm() {
    setCreateForm(initialFormState);
    setShowCreateForm(true);
    setShowDetailPanel(false);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm(initialFormState);
  }

  function buildPayload(form: FormState): InvoiceLineItemBody {
    const quantity = Number.parseInt(form.quantity, 10);
    const unitPrice = Number.parseFloat(form.unitPrice);
    const totalPrice = Number.parseFloat(form.totalPrice);

    return {
      invoiceId: form.invoiceId,
      serviceId: form.serviceId,
      quantity,
      unitPrice,
      totalPrice,
    };
  }

  function validateForm(form: FormState) {
    if (!form.invoiceId || !form.serviceId || !form.quantity || !form.unitPrice || !form.totalPrice) {
      toast.error("Invoice, service, quantity, unit price and total price are required");
      return false;
    }

    const quantity = Number.parseInt(form.quantity, 10);
    const unitPrice = Number.parseFloat(form.unitPrice);
    const totalPrice = Number.parseFloat(form.totalPrice);

    if (Number.isNaN(quantity) || Number.isNaN(unitPrice) || Number.isNaN(totalPrice)) {
      toast.error("Enter valid numeric values");
      return false;
    }

    return true;
  }

  async function handleCreateLineItem(event: React.FormEvent) {
    event.preventDefault();
    if (!validateForm(createForm)) return;

    setIsSubmitting(true);
    try {
      await createInvoiceLineItemApi(buildPayload(createForm));
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      closeCreateForm();
      toast.success("Invoice line item created successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create invoice line item";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateLineItem(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedLineItem || !validateForm(editForm)) return;

    setIsSaving(true);
    try {
      await updateInvoiceLineItemApi(selectedLineItem.id, buildPayload(editForm));
      await refreshRows();
      const refreshed = await getInvoiceLineItem(selectedLineItem.id);
      setSelectedLineItem(refreshed);
      setEditForm(buildFormState(refreshed));
      toast.success("Invoice line item updated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update invoice line item";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLineItem() {
    if (!selectedLineItem) return;
    if (!window.confirm("Are you sure you want to delete this invoice line item?")) return;

    setIsDeleting(true);
    try {
      await deleteInvoiceLineItemApi(selectedLineItem.id);
      await refreshRows();
      closeDetailPanel();
      toast.success("Invoice line item deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete invoice line item";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const navbarActions = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: openCreateForm,
    },
  ];

  if (isLoading) {
    return (
      <AppLayout title="Invoice Line Items" activeModule="Invoice Line Items" activeSubItem="All Invoice Line Items">
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading invoice line items...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout title="Invoice Line Items" activeModule="Invoice Line Items" activeSubItem="All Invoice Line Items">
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
      title="Invoice Line Items"
      activeModule="Invoice Line Items"
      activeSubItem="All Invoice Line Items"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button type="button" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700">
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>All Invoice Line Items</span>
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
              {optionsLoading ? (
                <div className="text-[13px] text-slate-400">Loading filters...</div>
              ) : (
                <select
                  value={filters.invoiceId}
                  onChange={(event) => {
                    setFilters({ invoiceId: event.target.value });
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="app-control rounded-md px-3 py-1.5 text-[13px]"
                >
                  <option value="">All Invoices</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {getInvoiceLabel(invoice)}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setFilters({ invoiceId: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.invoiceId}
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
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">No invoice line items found</h2>
                  <p className="mt-2 text-[14px] text-slate-400">Create your first invoice line item to get started</p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Invoice Line Item
                  </button>
                </div>
              </div>
            ) : (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400 last:border-r-0">
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
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
                          <td key={cell.id} className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600 last:border-r-0">
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
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`rounded px-2 py-1 text-[13px] ${pagination.page === page ? "bg-[#4f63ea] text-white" : "text-slate-500 hover:bg-[#f0ece6]"}`}
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

        {showDetailPanel && (
          <aside className="app-panel relative flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button type="button" onClick={closeDetailPanel} className="text-slate-400 hover:text-slate-600">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Circle className="h-4 w-4 text-slate-300" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                {selectedLineItem?.service?.name || "Invoice Line Item"}
              </span>
            </div>

            {isDetailLoading || !selectedLineItem ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">Loading line item...</div>
            ) : (
              <form onSubmit={handleUpdateLineItem} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Invoice</span>
                      <span className="text-right text-slate-700">{selectedLineItem.invoice ? getInvoiceLabel(selectedLineItem.invoice) : "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Service</span>
                      <span className="text-right text-slate-700">{selectedLineItem.service?.name || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-right text-slate-700">{new Date(selectedLineItem.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-right text-slate-700">{new Date(selectedLineItem.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">Invoice <span className="text-red-500">*</span></label>
                      <select value={editForm.invoiceId} disabled className="app-control w-full rounded-md px-3 py-2 text-[13px] opacity-70">
                        <option value={editForm.invoiceId}>{selectedLineItem.invoice ? getInvoiceLabel(selectedLineItem.invoice) : editForm.invoiceId}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">Service <span className="text-red-500">*</span></label>
                      <select
                        value={editForm.serviceId}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, serviceId: event.target.value }))}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      >
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>{service.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">Quantity <span className="text-red-500">*</span></label>
                      <input type="number" value={editForm.quantity} onChange={(event) => setEditForm((prev) => ({ ...prev, quantity: event.target.value }))} className="app-control w-full rounded-md px-3 py-2 text-[13px]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">Unit Price <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={editForm.unitPrice} onChange={(event) => setEditForm((prev) => ({ ...prev, unitPrice: event.target.value }))} className="app-control w-full rounded-md px-3 py-2 text-[13px]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">Total Price <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={editForm.totalPrice} onChange={(event) => setEditForm((prev) => ({ ...prev, totalPrice: event.target.value }))} className="app-control w-full rounded-md px-3 py-2 text-[13px]" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                  <button type="button" onClick={handleDeleteLineItem} disabled={isDeleting} className="flex items-center gap-2 text-[13px] text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button type="submit" disabled={isSaving} className="app-control inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        )}

        {showCreateForm && (
          <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">Create Invoice Line Item</h2>
              <button type="button" onClick={closeCreateForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLineItem} className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Invoice <span className="text-red-500">*</span></label>
                  {optionsLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">Loading...</div>
                  ) : (
                    <select value={createForm.invoiceId} onChange={(event) => setCreateForm((prev) => ({ ...prev, invoiceId: event.target.value }))} className="app-control w-full rounded-md px-3 py-2 text-[13px]" required>
                      <option value="">Select Invoice</option>
                      {invoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>{getInvoiceLabel(invoice)}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Service <span className="text-red-500">*</span></label>
                  {optionsLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">Loading...</div>
                  ) : (
                    <select value={createForm.serviceId} onChange={(event) => setCreateForm((prev) => ({ ...prev, serviceId: event.target.value }))} className="app-control w-full rounded-md px-3 py-2 text-[13px]" required>
                      <option value="">Select Service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Quantity <span className="text-red-500">*</span></label>
                  <input type="number" value={createForm.quantity} onChange={(event) => setCreateForm((prev) => ({ ...prev, quantity: event.target.value }))} className="app-control w-full rounded-md px-3 py-2 text-[13px]" required />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Unit Price <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" value={createForm.unitPrice} onChange={(event) => setCreateForm((prev) => ({ ...prev, unitPrice: event.target.value }))} className="app-control w-full rounded-md px-3 py-2 text-[13px]" required />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Total Price <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" value={createForm.totalPrice} onChange={(event) => setCreateForm((prev) => ({ ...prev, totalPrice: event.target.value }))} className="app-control w-full rounded-md px-3 py-2 text-[13px]" required />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
                <button type="button" onClick={closeCreateForm} className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50">
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}

export default AllInvoiceLineItems;
