import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, Circle, LayoutList, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import type { PurchaseOrderRow } from "./types";
import {
  createPurchaseOrderApi,
  deletePurchaseOrderApi,
  getPurchaseOrdersView,
  type PurchaseOrderQueryParams,
} from "../../services/operations/purchaseOrders";
import { getAllVendors } from "../../services/operations/vendors";
import { getAllInvoices } from "../../services/operations/invoices";
import type { Vendor } from "../../services/operations/vendors";
import type { Invoice } from "../../services/operations/invoices";
import toast from "react-hot-toast";

function getInvoiceLabel(invoice: Invoice) {
  if (invoice.invoiceNumber) {
    return invoice.invoiceNumber;
  }

  const practiceName = invoice.practice?.name || "Invoice";
  return `${practiceName} - ${invoice.id.slice(0, 8).toUpperCase()}`;
}

function AllPurchaseOrdersPage() {
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ search: "" });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  // const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [formData, setFormData] = useState({
    vendorId: "",
    invoiceId: "",
    totalCost: "",
  });

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "vendorName",
          accessorFn: (row: PurchaseOrderRow) => row.values.vendorName,
          header: () => "Vendor",
          cell: ({ row }: { row: { original: PurchaseOrderRow } }) =>
            String(row.original.values.vendorName || "-"),
        },
        {
          id: "invoiceId",
          accessorFn: (row: PurchaseOrderRow) => row.values.invoiceId,
          header: () => "Invoice ID",
          cell: ({ row }: { row: { original: PurchaseOrderRow } }) =>
            String(row.original.values.invoiceId || "-"),
        },
        {
          id: "totalCost",
          accessorFn: (row: PurchaseOrderRow) => row.values.totalCost,
          header: () => "Total Cost",
          cell: ({ row }: { row: { original: PurchaseOrderRow } }) =>
            String(row.original.values.totalCost || "-"),
        },
        {
          id: "creationDate",
          accessorFn: (row: PurchaseOrderRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: PurchaseOrderRow } }) =>
            String(row.original.values.creationDate),
        },
      ] as ColumnDef<PurchaseOrderRow>[],
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
        const params: PurchaseOrderQueryParams = {
          page: pagination.page,
          limit: pagination.limit,
          sortBy: sorting[0]?.id || "createdAt",
          sortOrder: sorting[0]?.desc ? "desc" : "asc",
          ...(filters.search && { search: filters.search }),
        };
        const data = await getPurchaseOrdersView(params);
        setRows(data.rows);
        setPagination(data.pagination);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load purchase orders";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [pagination.page, pagination.limit, sorting, filters]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filters, sorting]);

  function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
  }

  async function openCreateForm() {
    setFormData({ vendorId: "", invoiceId: "", totalCost: "" });
    setShowCreateForm(true);
    setShowDetailPanel(false);

    if (vendors.length === 0 || invoices.length === 0) {
      setLoadingOptions(true);
      try {
        // const [vendorList, invoiceList] = await Promise.all([
        const [invoiceList] = await Promise.all([
          // getAllVendors(),
          getAllInvoices(),
        ]);

        // setVendors(vendorList);
        setInvoices(invoiceList);

        console.log("invoiceList:", invoiceList);
      } catch (err) {
        console.error("Failed to load options:", err);
      } finally {
        setLoadingOptions(false);
      }
    }
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setFormData({ vendorId: "", invoiceId: "", totalCost: "" });
  }

  async function handleCreatePurchaseOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.vendorId || !formData.invoiceId || !formData.totalCost) {
      toast.error("Vendor, Invoice and Total Cost are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const poData = {
        vendorId: formData.vendorId,
        invoiceId: formData.invoiceId,
        totalCost: parseFloat(formData.totalCost),
      };

      await createPurchaseOrderApi(poData);
      const data = await getPurchaseOrdersView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeCreateForm();
      toast.success("Purchase order created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create purchase order";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePurchaseOrder() {
    if (!selectedRow) return;

    if (
      !window.confirm("Are you sure you want to delete this purchase order?")
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePurchaseOrderApi(selectedRow.id);
      const data = await getPurchaseOrdersView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeDetailPanel();
      toast.success("Purchase order deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete purchase order";
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
      <AppLayout
        title="Purchase Orders"
        activeModule="Purchase Orders"
        activeSubItem="All Purchase Orders"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading purchase orders...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Purchase Orders"
        activeModule="Purchase Orders"
        activeSubItem="All Purchase Orders"
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
      title="Purchase Orders"
      activeModule="Purchase Orders"
      activeSubItem="All Purchase Orders"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
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
              <span>All Purchase Orders</span>
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
              <input
                type="text"
                placeholder="Search by vendor name..."
                value={filters.search}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, search: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() => setFilters({ search: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
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
                    No purchase orders found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Create your first purchase order to get started
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Purchase Order
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
        </section>

        {showDetailPanel && selectedRow && (
          <aside className="app-panel relative flex w-[380px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
                Purchase Order
              </span>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Vendor</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.vendorName)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Invoice ID</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.invoiceId)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Cost</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.totalCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.creationDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Update</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.lastUpdate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={handleDeletePurchaseOrder}
                disabled={isDeleting}
                className="flex items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </aside>
        )}

        {showCreateForm && (
          <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">
                Create Purchase Order
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
              onSubmit={handleCreatePurchaseOrder}
              className="flex-1 overflow-auto p-4"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Vendor <span className="text-red-500">*</span>
                  </label>
                  {loadingOptions ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading...
                    </div>
                  ) : (
                    <select
                      value={formData.vendorId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          vendorId: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Invoice <span className="text-red-500">*</span>
                  </label>
                  {loadingOptions ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading...
                    </div>
                  ) : (
                    <select
                      value={formData.invoiceId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          invoiceId: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    >
                      <option value="">Select Invoice</option>
                      {invoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {getInvoiceLabel(invoice)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Total Cost <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalCost}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        totalCost: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    required
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
        )}
      </div>
    </AppLayout>
  );
}

export default AllPurchaseOrdersPage;
