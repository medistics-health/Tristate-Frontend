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
import { exportAllPagesToCsv, formatUsDateTime } from "../../utils/csvExport";
import {
  getAllInvoices,
  getInvoicesView,
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

type AllInvoiceLineItemsProps = {
  viewMode?: "client" | "tristate";
};

function AllInvoiceLineItems({ viewMode = "client" }: AllInvoiceLineItemsProps) {
  const isTristate = viewMode === "tristate";
  const pageTitle = isTristate
    ? "Tristate Invoice Line Items"
    : "Client Invoice Line Items";
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
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  type LineItemFilters = {
    invoiceId: string;
    serviceId: string;
    dateFrom: string;
    dateTo: string;
  };

  const defaultFilters: LineItemFilters = {
    invoiceId: "",
    serviceId: "",
    dateFrom: "",
    dateTo: "",
  };

  const [filters, setFilters] = useState<LineItemFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<LineItemFilters>(defaultFilters);
  const [selectedInvoiceOption, setSelectedInvoiceOption] = useState<SearchSelectOption | null>(null);
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
          header: () => (isTristate ? "Client Unit Price" : "Unit Price"),
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.unitPrice || "-"),
        },
        {
          id: "totalPrice",
          accessorFn: (row: InvoiceLineItemRow) => row.values.totalPrice,
          header: () => (isTristate ? "Client Total Price" : "Total Price"),
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.totalPrice || "-"),
        },
        ...(isTristate
          ? [
              {
                id: "externalUnitPrice",
                accessorFn: (row: InvoiceLineItemRow) =>
                  row.values.externalUnitPrice,
                header: () => "Tristate Unit Price",
                cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
                  String(row.original.values.externalUnitPrice || "-"),
              },
              {
                id: "externalTotalPrice",
                accessorFn: (row: InvoiceLineItemRow) =>
                  row.values.externalTotalPrice,
                header: () => "Tristate Total Price",
                cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
                  String(row.original.values.externalTotalPrice || "-"),
              },
              {
                id: "companyFeeDeductionAmount",
                accessorFn: (row: InvoiceLineItemRow) =>
                  row.values.companyFeeDeductionAmount,
                header: () => "Company Absorbed",
                cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
                  String(row.original.values.companyFeeDeductionAmount || "-"),
              },
            ]
          : []),
        {
          id: "creationDate",
          accessorFn: (row: InvoiceLineItemRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.creationDate),
        },
      ] as ColumnDef<InvoiceLineItemRow>[],
    [isTristate],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortField = sorting[0]?.id || "creationDate";
  const sortDesc = sorting[0]?.desc ?? true;

  useEffect(() => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [viewMode]);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getInvoiceLineItemsView({
          page: pagination.page,
          limit: pagination.limit,
          invoiceId: filters.invoiceId || undefined,
          serviceId: filters.serviceId || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          search: searchInput.trim() || undefined,
        });
        setRows(data.rows);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
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
    }
    loadData();
  }, [
    pagination.page,
    pagination.limit,
    sortField,
    sortDesc,
    filters.invoiceId,
    filters.serviceId,
    filters.dateFrom,
    filters.dateTo,
    searchInput,
  ]);

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





  const searchInvoices = async (query: string): Promise<SearchSelectOption[]> => {
    const q = query.trim();
    try {
      const data = await getInvoicesView({
        page: 1,
        limit: 50,
        ...(q && { search: q }),
      });
      return data.rows.map((row) => ({
        label: row.values.invoiceNumber || row.id,
        subLabel: row.values.practiceName !== "-" ? row.values.practiceName : undefined,
        value: row.id,
      }));
    } catch (e) {
      const list = invoices.length > 0 ? invoices : await getAllInvoices();
      const qLower = q.toLowerCase();
      return list
        .filter(
          (inv) =>
            !qLower ||
            (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(qLower)) ||
            (inv.practice?.name && inv.practice.name.toLowerCase().includes(qLower)),
        )
        .map((inv) => ({
          label: inv.invoiceNumber || getInvoiceLabel(inv),
          subLabel: inv.practice?.name,
          value: inv.id,
        }));
    }
  };

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
    if (invoices.length === 0 || services.length === 0) {
      setOptionsLoading(true);
      Promise.all([getAllInvoices(), getAllServices()])
        .then(([invList, srvList]) => {
          setInvoices(invList);
          setServices(srvList);
        })
        .finally(() => setOptionsLoading(false));
    }
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
    filters.serviceId,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.invoiceId) {
      const inv = invoices.find((i) => i.id === filters.invoiceId);
      const display = selectedInvoiceOption?.label || (inv ? inv.invoiceNumber || getInvoiceLabel(inv) : filters.invoiceId);
      chips.push({
        key: "invoiceId",
        label: "Invoice",
        displayValue: display,
        onClear: () => {
          setFilters((curr) => ({ ...curr, invoiceId: "" }));
          setDraftFilters((curr) => ({ ...curr, invoiceId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.serviceId) {
      const srv = services.find((s) => s.id === filters.serviceId);
      const display = srv ? srv.name : filters.serviceId;
      chips.push({
        key: "serviceId",
        label: "Service",
        displayValue: display,
        onClear: () => {
          setFilters((curr) => ({ ...curr, serviceId: "" }));
          setDraftFilters((curr) => ({ ...curr, serviceId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.dateFrom) {
      chips.push({
        key: "dateFrom",
        label: "Created From",
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
        label: "Created To",
        displayValue: filters.dateTo,
        onClear: () => {
          setFilters((curr) => ({ ...curr, dateTo: "" }));
          setDraftFilters((curr) => ({ ...curr, dateTo: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters, invoices, services]);

  const exportCsv = async () => {
    try {
      toast.loading("Exporting CSV...", { id: "export-csv" });
      const headers = [
        "Invoice",
        "Service",
        "Description",
        "Quantity",
        "Unit Price",
        "Total Price",
        ...(isTristate ? ["Tristate Unit Price", "Tristate Total Price", "Company Absorbed"] : []),
        "Created Date & Time",
      ];

      await exportAllPagesToCsv({
        filenamePrefix: isTristate ? "tristate_invoice_line_items" : "client_invoice_line_items",
        headers,
        pageSize: 50,
        fetchPage: async (page, limit) => {
          const res = await getInvoiceLineItemsView({
            page,
            limit,
            invoiceId: filters.invoiceId || undefined,
            serviceId: filters.serviceId || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            search: searchInput.trim() || undefined,
          });
          return {
            items: res.rows,
            totalPages: res.pagination.totalPages,
          };
        },
        rowToCsvFields: (r) => [
          r.values.invoiceLabel,
          r.values.serviceName,
          r.values.description,
          r.values.quantity,
          r.values.unitPrice,
          r.values.totalPrice,
          ...(isTristate
            ? [
                r.values.externalUnitPrice || "",
                r.values.externalTotalPrice || "",
                r.values.companyFeeDeductionAmount || "",
              ]
            : []),
          formatUsDateTime(r.values.creationDate),
        ],
      });
      toast.success("CSV Exported successfully", { id: "export-csv" });
    } catch (e) {
      toast.error("Failed to export CSV", { id: "export-csv" });
    }
  };

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Invoice
        </span>
        <SearchSelect
          value={draftFilters.invoiceId}
          displayLabel={selectedInvoiceOption?.label}
          onChange={(val, opt) => {
            setDraftFilters((prev) => ({ ...prev, invoiceId: val }));
            if (opt) setSelectedInvoiceOption(opt);
            else setSelectedInvoiceOption(null);
          }}
          onSearch={searchInvoices}
          clearable
          toggleOnSelectSame
          placeholder="Search invoice number..."
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Service
        </span>
        <Select
          value={draftFilters.serviceId}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, serviceId: val }))
          }
          options={[
            { label: "All Services", value: "" },
            ...services.map((srv) => ({
              label: srv.name,
              value: srv.id,
            })),
          ]}
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
      title={pageTitle}
      activeModule="Invoice Line Items"
      activeSubItem={pageTitle}
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title={pageTitle}
            subtitle="Invoice Line Items"
            searchPlaceholder="Search line items by invoice or service..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Line Items"
            filterFields={filterFieldsModal}
            onExport={exportCsv}
            onRefresh={async () => {
              try {
                setIsLoading(true);
                setError(null);
                const data = await getInvoiceLineItemsView({
                  page: pagination.page,
                  limit: pagination.limit,
                  invoiceId: filters.invoiceId || undefined,
                  serviceId: filters.serviceId || undefined,
                  dateFrom: filters.dateFrom || undefined,
                  dateTo: filters.dateTo || undefined,
                  search: searchInput.trim() || undefined,
                });
                setRows(data.rows);
                setPagination((prev) => ({
                  ...prev,
                  total: data.pagination.total,
                  totalPages: data.pagination.totalPages,
                }));
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
            }}
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
            }}
          >
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-slate-400">
                  <EmptyStateIllustration />
                  <p className="text-[14px]">No invoice line items found.</p>
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
                      ...(selectedLineItem?.externalUnitPrice ? [{ label: "Tristate Unit Price", value: String(selectedLineItem.externalUnitPrice) }] : []),
                      ...(selectedLineItem?.externalTotalPrice ? [{ label: "Tristate Total Price", value: String(selectedLineItem.externalTotalPrice) }] : []),
                      ...(selectedLineItem?.companyFeeDeductionAmount ? [{ label: "Company Absorbed", value: String(selectedLineItem.companyFeeDeductionAmount) }] : []),
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
