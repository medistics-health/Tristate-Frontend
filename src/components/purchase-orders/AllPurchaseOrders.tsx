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
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import type { PurchaseOrderRow } from "./types";
import {
  createPurchaseOrderApi,
  deletePurchaseOrderApi,
  getPurchaseOrdersView,
  type PurchaseOrderQueryParams,
} from "../../services/operations/purchaseOrders";
import { getAllVendorsApi } from "../../services/operations/vendors";
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

  const [searchInput, setSearchInput] = useState("");
  const [draftVendorId, setDraftVendorId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");

  const handleOpenFilterModal = () => {
    setDraftVendorId(selectedVendorId);
  };

  const handleApplyFilters = () => {
    setSelectedVendorId(draftVendorId);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setSelectedVendorId("");
    setDraftVendorId("");
    setSearchInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const activeFilterCount = selectedVendorId ? 1 : 0;
  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedVendorId) {
      const vendorName = vendors.find((v) => v.id === selectedVendorId)?.name || selectedVendorId;
      chips.push({
        key: "vendorId",
        label: "Vendor",
        displayValue: vendorName,
        onClear: () => {
          setSelectedVendorId("");
          setDraftVendorId("");
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [selectedVendorId, vendors]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: PurchaseOrderQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sorting[0]?.id || "createdAt",
        sortOrder: sorting[0]?.desc ? "desc" : "asc",
        ...(searchInput.trim() && { search: searchInput.trim() }),
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 400);
    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, sorting, searchInput, selectedVendorId]);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const headers = ["ID", "Vendor", "Invoice ID", "Total Cost", "Created At"];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((r) =>
          [
            `"${r.id}"`,
            `"${r.values.vendorName}"`,
            `"${r.values.invoiceId}"`,
            `"${r.values.totalCost}"`,
            `"${r.values.creationDate}"`,
          ].join(","),
        ),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchase_orders_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Vendor
        </span>
        <Select
          value={draftVendorId}
          onChange={setDraftVendorId}
          options={[
            { label: "All Vendors", value: "" },
            ...vendors.map((v) => ({ label: v.name, value: v.id })),
          ]}
        />
      </label>
    </>
  );

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
        const [invoiceList] = await Promise.all([
          getAllInvoices(),
        ]);
        setInvoices(invoiceList);
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
      loadData();
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
      loadData();
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

  return (
    <AppLayout
      title="Purchase Orders"
      activeModule="Purchase Orders"
      activeSubItem="All Purchase Orders"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="All Purchase Orders"
            subtitle="Purchase Orders"
            searchPlaceholder="Search purchase orders by vendor..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Purchase Orders"
            filterFields={filterFieldsModal}
            addNewLabel="Create Purchase Order"
            onAddNew={openCreateForm}
            onExport={exportCsv}
            onRefresh={loadData}
            isLoading={isLoading}
            isDeleting={isDeleting}
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(newSize) => {
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {rows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-slate-400">
                  <EmptyStateIllustration />
                  <p className="text-[14px]">No purchase orders found.</p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                  >
                    <Plus className="h-4 w-4" /> Create Purchase Order
                  </button>
                </div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b border-[#f0ece6] bg-[#faf9f7]">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-3 text-left font-medium text-slate-500"
                          >
                            <SortableHeaderCell header={header} />
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
                          className={`cursor-pointer border-b border-[#f0ece6] transition-colors ${
                            isSelected ? "bg-[#fcfbf9]" : "hover:bg-[#faf9f7]"
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3 text-slate-600">
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
          </DataTableToolbar>
        </section>

        {showDetailPanel && selectedRow && (
          <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[380px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
              <DetailCard
                title={String(selectedRow.values.vendorName || "Purchase Order")}
                infoRows={[
                  ...(selectedRow.values.invoiceId ? [{ label: "Invoice ID", value: String(selectedRow.values.invoiceId) }] : []),
                  ...(selectedRow.values.totalCost ? [{ label: "Total Cost", value: String(selectedRow.values.totalCost) }] : []),
                ]}
              />
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
          <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
