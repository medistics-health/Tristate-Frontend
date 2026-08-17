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
  LayoutList,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import DatePicker from "../shared/DatePicker";
import { getResponsivePageSize } from "../shared/TablePagination";
import {
  getAllInvoices,
  type Invoice,
} from "../../services/operations/invoices";
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
  return (
    invoice.invoiceNumber ||
    `${invoice.practice?.name || "Invoice"} - ${invoice.id.slice(0, 8).toUpperCase()}`
  );
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
  const [selectedLineItem, setSelectedLineItem] =
    useState<InvoiceLineItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
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

  type LineItemFilters = {
    invoiceId: string;
    invoiceNumber: string;
    dateFrom: string;
    dateTo: string;
  };

  const defaultFilters: LineItemFilters = {
    invoiceId: "",
    invoiceNumber: "",
    dateFrom: "",
    dateTo: "",
  };

  const [filters, setFilters] = useState<LineItemFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<LineItemFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(initialFormState);
  const [editForm, setEditForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeSort = sorting[0];

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const activeFilterCount = [
    filters.invoiceId,
    filters.invoiceNumber,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const invoiceFilterLabel = useMemo(
    () => invoices.find((inv) => inv.id === filters.invoiceId)?.invoiceNumber || filters.invoiceId,
    [invoices, filters.invoiceId],
  );

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.invoiceId) {
      chips.push({
        key: "invoiceId",
        label: "Invoice",
        displayValue: invoiceFilterLabel,
        onClear: () => {
          setFilters((curr) => ({ ...curr, invoiceId: "" }));
          setDraftFilters((curr) => ({ ...curr, invoiceId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.invoiceNumber) {
      chips.push({
        key: "invoiceNumber",
        label: "Invoice #",
        displayValue: filters.invoiceNumber,
        onClear: () => {
          setFilters((curr) => ({ ...curr, invoiceNumber: "" }));
          setDraftFilters((curr) => ({ ...curr, invoiceNumber: "" }));
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
  }, [filters, invoiceFilterLabel]);

  const columns = useMemo(
    () =>
      [
        {
          id: "invoiceLabel",
          accessorFn: (row: InvoiceLineItemRow) => row.values.invoiceLabel,
          header: () => "Invoice",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.invoiceLabel || "-"),
        },
        {
          id: "serviceName",
          accessorFn: (row: InvoiceLineItemRow) => row.values.serviceName,
          header: () => "Service",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.serviceName || "-"),
        },
        {
          id: "description",
          accessorFn: (row: InvoiceLineItemRow) => row.values.description,
          header: () => "Description",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.description || "-"),
        },
        {
          id: "quantity",
          accessorFn: (row: InvoiceLineItemRow) => row.values.quantity,
          header: () => "Quantity",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.quantity ?? "-"),
        },
        {
          id: "unitPrice",
          accessorFn: (row: InvoiceLineItemRow) => row.values.unitPrice,
          header: () => "Unit Price",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.unitPrice || "-"),
        },
        {
          id: "totalPrice",
          accessorFn: (row: InvoiceLineItemRow) => row.values.totalPrice,
          header: () => "Total Price",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.totalPrice || "-"),
        },
        {
          id: "creationDate",
          accessorFn: (row: InvoiceLineItemRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.creationDate),
        },
      ] as ColumnDef<InvoiceLineItemRow>[],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const refreshAllLineItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getInvoiceLineItemsView({
        page: pagination.page,
        limit: pagination.limit,
        search: searchInput.trim() || undefined,
        invoiceId: filters.invoiceId || undefined,
        invoiceNumber: filters.invoiceNumber.trim() || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        sortBy: activeSort?.id,
        sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : undefined,
      });
      setRows(data.rows);
      setPagination(data.pagination);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load invoice line items";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAllLineItems();
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    searchInput,
    filters.invoiceId,
    filters.invoiceNumber,
    filters.dateFrom,
    filters.dateTo,
    activeSort?.id,
    activeSort?.desc,
  ]);

  async function refreshRows(targetPage = pagination.page) {
    await refreshAllLineItems();
  }

  useEffect(() => {
    if (
      (showCreateForm || showDetailPanel || showFilterPanel) &&
      (invoices.length === 0 || services.length === 0)
    ) {
      setOptionsLoading(true);
      Promise.all([getAllInvoices(), getAllServices()])
        .then(([invoiceList, serviceList]) => {
          setInvoices(invoiceList);
          setServices(serviceList);
        })
        .catch((err) => console.error("Failed to load line item options:", err))
        .finally(() => setOptionsLoading(false));
    }
  }, [
    showCreateForm,
    showDetailPanel,
    showFilterPanel,
    invoices.length,
    services.length,
  ]);

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
      const message =
        err instanceof Error
          ? err.message
          : "Failed to fetch invoice line item";
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
    if (
      !form.invoiceId ||
      !form.serviceId ||
      !form.quantity ||
      !form.unitPrice ||
      !form.totalPrice
    ) {
      toast.error(
        "Invoice, service, quantity, unit price and total price are required",
      );
      return false;
    }

    const quantity = Number.parseInt(form.quantity, 10);
    const unitPrice = Number.parseFloat(form.unitPrice);
    const totalPrice = Number.parseFloat(form.totalPrice);

    if (
      Number.isNaN(quantity) ||
      Number.isNaN(unitPrice) ||
      Number.isNaN(totalPrice)
    ) {
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
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create invoice line item";
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
      await updateInvoiceLineItemApi(
        selectedLineItem.id,
        buildPayload(editForm),
      );
      await refreshRows();
      const refreshed = await getInvoiceLineItem(selectedLineItem.id);
      setSelectedLineItem(refreshed);
      setEditForm(buildFormState(refreshed));
      toast.success("Invoice line item updated successfully");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to update invoice line item";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLineItem() {
    if (!selectedLineItem) return;
    if (
      !window.confirm("Are you sure you want to delete this invoice line item?")
    )
      return;

    setIsDeleting(true);
    try {
      await deleteInvoiceLineItemApi(selectedLineItem.id);
      await refreshRows();
      closeDetailPanel();
      toast.success("Invoice line item deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to delete invoice line item";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Invoice Number
        </span>
        <input
          type="text"
          value={draftFilters.invoiceNumber}
          onChange={(e) =>
            setDraftFilters((prev) => ({ ...prev, invoiceNumber: e.target.value }))
          }
          placeholder="e.g. INV-001"
          className="app-control w-full rounded-xl border border-[#ece8e1] bg-white px-3 py-2 text-[13px] text-slate-800 placeholder-slate-400 focus:border-[#4f63ea] focus:ring-1 focus:ring-[#4f63ea]/20 outline-none transition-all"
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
      title="Invoice Line Items"
      activeModule="Invoice Line Items"
      activeSubItem="All Invoice Line Items"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="All Invoice Line Items"
            subtitle="Invoice Line Items"
            searchPlaceholder="Search invoice line items..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Invoice Line Items"
            filterFields={filterFieldsModal}
            onRefresh={refreshAllLineItems}
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
                      No invoice line items found
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-400">
                      No invoice line items available for display
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
                          className={`cursor-pointer ${isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"}`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-4 py-3 text-[13px] text-slate-600 last:border-r-0"
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

        {showDetailPanel && (
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
                {selectedLineItem?.service?.name || "Invoice Line Item"}
              </span>
            </div>

            {isDetailLoading || !selectedLineItem ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading line item...
              </div>
            ) : (
              <form
                onSubmit={handleUpdateLineItem}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <DetailCard
                  title={selectedLineItem?.service?.name || "Invoice Line Item"}
                  infoRows={[
                      ...(selectedLineItem?.invoice ? [{ label: "Invoice", value: getInvoiceLabel(selectedLineItem.invoice) }] : []),
                      ...(selectedLineItem?.description ? [{ label: "Description", value: selectedLineItem.description }] : []),
                      ...(selectedLineItem?.quantity ? [{ label: "Quantity", value: String(selectedLineItem.quantity) }] : []),
                      ...(selectedLineItem?.unitPrice ? [{ label: "Unit Price", value: String(selectedLineItem.unitPrice) }] : []),
                      ...(selectedLineItem?.totalPrice ? [{ label: "Total Price", value: String(selectedLineItem.totalPrice) }] : []),
                    ]}
                  />

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Invoice <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editForm.invoiceId}
                        disabled
                        className="app-control w-full rounded-md px-3 py-2 text-[13px] opacity-70"
                      >
                        <option value={editForm.invoiceId}>
                          {selectedLineItem.invoice
                            ? getInvoiceLabel(selectedLineItem.invoice)
                            : editForm.invoiceId}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Service <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editForm.serviceId}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            serviceId: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      >
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={editForm.quantity}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            quantity: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Unit Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.unitPrice}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            unitPrice: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Total Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.totalPrice}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            totalPrice: event.target.value,
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
                    onClick={handleDeleteLineItem}
                    disabled={isDeleting}
                    className="flex items-center cursor-pointer gap-2 text-[13px] text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="app-control inline-flex items-center gap-2 cursor-pointer rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        )}

        {showCreateForm && (
          <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">
                Create Invoice Line Item
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
              onSubmit={handleCreateLineItem}
              className="flex-1 overflow-auto p-4"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Invoice <span className="text-red-500">*</span>
                  </label>
                  {optionsLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading...
                    </div>
                  ) : (
                    <select
                      value={createForm.invoiceId}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          invoiceId: event.target.value,
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
                    Service <span className="text-red-500">*</span>
                  </label>
                  {optionsLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading...
                    </div>
                  ) : (
                    <select
                      value={createForm.serviceId}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          serviceId: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    >
                      <option value="">Select Service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={createForm.quantity}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        quantity: event.target.value,
                      }))
                    }
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Unit Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.unitPrice}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        unitPrice: event.target.value,
                      }))
                    }
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Total Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.totalPrice}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        totalPrice: event.target.value,
                      }))
                    }
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

export default AllInvoiceLineItems;
