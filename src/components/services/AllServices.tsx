import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
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
import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { exportAllPagesToCsv, formatUsDateTime } from "../../utils/csvExport";
import AppLayout from "../layout/AppLayout";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import { getResponsivePageSize } from "../shared/TablePagination";
import type { ServiceRow, Service } from "./types";
import {
  createServiceApi,
  deleteServiceApi,
  getService,
  getServicesView,
  updateServiceApi,
  type ServiceQueryParams,
} from "../../services/operations/services";
import { getAllVendorsApi } from "../../services/operations/vendors";
import type { Vendor } from "../vendors/types";
import {
  getStripeConnectedAccounts,
  type StripeConnectedAccount,
} from "../../services/operations/stripeAccounts";
import Select from "../shared/Select";
import { canBusinessWrite, readStoredUser } from "../../utils/auth";

function AllServicesPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canManageServices = canBusinessWrite(currentRole);

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stripeAccounts, setStripeAccounts] = useState<StripeConnectedAccount[]>([]);
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

  type ServiceFilters = {
    search: string;
    category: string;
    vendorId: string;
    isActive: string;
  };

  const defaultFilters: ServiceFilters = {
    search: "",
    category: "",
    vendorId: "",
    isActive: "",
  };

  const [filters, setFilters] = useState<ServiceFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<ServiceFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);

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
    filters.category,
    filters.vendorId,
    filters.isActive,
  ].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.category) {
      chips.push({
        key: "category",
        label: "Category",
        displayValue: filters.category,
        onClear: () => {
          setFilters((curr) => ({ ...curr, category: "" }));
          setDraftFilters((curr) => ({ ...curr, category: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.vendorId) {
      const vendorName = vendors.find((v) => v.id === filters.vendorId)?.name || filters.vendorId;
      chips.push({
        key: "vendorId",
        label: "Vendor",
        displayValue: vendorName,
        onClear: () => {
          setFilters((curr) => ({ ...curr, vendorId: "" }));
          setDraftFilters((curr) => ({ ...curr, vendorId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.isActive) {
      chips.push({
        key: "isActive",
        label: "Status",
        displayValue: filters.isActive === "true" ? "Active" : "Inactive",
        onClear: () => {
          setFilters((curr) => ({ ...curr, isActive: "" }));
          setDraftFilters((curr) => ({ ...curr, isActive: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters, vendors]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  function getStripeAccountLabel(accountId?: string | null) {
    if (!accountId) return "Stripe account not available";
    return (
      stripeAccounts.find((account) => account.id === accountId)?.displayName ||
      accountId
    );
  }

  const columns = useMemo(
    () =>
      [
        {
          id: "name",
          accessorFn: (row: ServiceRow) => row.values.name,
          header: () => "Name",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.name || "-"),
        },
        {
          id: "code",
          accessorFn: (row: ServiceRow) => row.values.code,
          header: () => "Code",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.code || "-"),
        },
        {
          id: "category",
          accessorFn: (row: ServiceRow) => row.values.category,
          header: () => "Category",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.category || "-"),
        },
        {
          id: "vendorName",
          accessorFn: (row: ServiceRow) => row.values.vendorName,
          header: () => "Vendor",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.vendorName || "Vendor not available"),
        },
        {
          id: "stripeAccount",
          accessorFn: (row: ServiceRow) => row.values.stripeConnectedAccountId,
          header: () => "Stripe Account",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(
              row.original.values.stripeConnectedAccountName ||
                (row.original.values.stripeConnectedAccountId
                  ? getStripeAccountLabel(
                      String(row.original.values.stripeConnectedAccountId),
                    )
                  : "Stripe account not available"),
            ),
        },
        {
          id: "isActive",
          accessorFn: (row: ServiceRow) => row.values.isActive,
          header: () => "Active",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            row.original.values.isActive ? "Yes" : "No",
        },
        {
          id: "creationDate",
          accessorFn: (row: ServiceRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.creationDate),
        },
      ] as ColumnDef<ServiceRow>[],
    [stripeAccounts],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const refreshServiceRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: ServiceQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: activeSort?.id || "createdAt",
        sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : "desc",
        ...(searchInput.trim() && { search: searchInput.trim() }),
        ...(filters.category && { category: filters.category }),
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.isActive !== "" && { isActive: filters.isActive === "true" }),
      };

      const data = await getServicesView(params);
      setRows(data.rows);
      setPagination(data.pagination);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load services";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAllVendorsApi()
      .then(setVendors)
      .catch((err) => {
        console.error("Failed to load vendors", err);
      });

    getStripeConnectedAccounts()
      .then(setStripeAccounts)
      .catch((err) => {
        console.error("Failed to load Stripe accounts", err);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshServiceRecords();
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    searchInput,
    filters.category,
    filters.vendorId,
    filters.isActive,
    activeSort?.id,
    activeSort?.desc,
  ]);

  // useEffect(() => {
  //   setPagination((prev) => ({ ...prev, page: 1 }));
  // }, [filters, sorting]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    stripeConnectedAccountId: "",
    vendorId: "",
    isActive: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    category: "",
    stripeConnectedAccountId: "",
    vendorId: "",
    isActive: true,
  });

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const service = await getService(rowId);
        setSelectedService(service);
        setEditForm({
          name: service.name,
          code: service.code ?? "",
          category: service.category ?? "",
          stripeConnectedAccountId: service.stripeConnectedAccountId ?? "",
          vendorId: service.vendorId ?? "",
          isActive: service.isActive ?? true,
        });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch service";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedService(null);
    setEditForm({
      name: "",
      code: "",
      category: "",
      stripeConnectedAccountId: "",
      vendorId: "",
      isActive: true,
    });
  }

  function openCreateForm() {
    if (!canManageServices) return;
    setFormData({
      name: "",
      code: "",
      category: "",
      stripeConnectedAccountId: "",
      isActive: true,
      vendorId: "",
    });
    setShowCreateForm(true);
    setShowDetailPanel(false);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setFormData({
      name: "",
      code: "",
      category: "",
      stripeConnectedAccountId: "",
      vendorId: "",
      isActive: true,
    });
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageServices) return;
    if (!formData.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!formData.stripeConnectedAccountId) {
      toast.error("Stripe account is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const serviceData = {
        name: formData.name.trim(),
        ...(formData.code.trim() && { code: formData.code.trim() }),
        ...(formData.category.trim() && { category: formData.category.trim() }),
        stripeConnectedAccountId: formData.stripeConnectedAccountId || null,
        vendorId: formData.vendorId || null,
        isActive: formData.isActive,
      };

      await createServiceApi(serviceData);
      const data = await getServicesView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeCreateForm();
      toast.success("Service created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create service";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteService() {
    if (!canManageServices) return;
    if (!selectedRow) return;

    if (!window.confirm("Are you sure you want to delete this service?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteServiceApi(selectedRow.id);
      const data = await getServicesView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      closeDetailPanel();
      toast.success("Service deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete service";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUpdateService(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageServices) return;
    if (!editForm.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!editForm.stripeConnectedAccountId) {
      toast.error("Stripe account is required");
      return;
    }

    setIsSaving(true);
    try {
      const serviceData = {
        name: editForm.name.trim(),
        ...(editForm.code.trim() && { code: editForm.code.trim() }),
        ...(editForm.category.trim() && { category: editForm.category.trim() }),
        stripeConnectedAccountId: editForm.stripeConnectedAccountId || null,
        vendorId: editForm.vendorId || null,
        isActive: editForm.isActive,
      };

      await updateServiceApi(selectedRowId!, serviceData);
      const data = await getServicesView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      toast.success("Service updated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update service";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Category
        </span>
        <input
          type="text"
          value={draftFilters.category}
          onChange={(e) =>
            setDraftFilters((prev) => ({ ...prev, category: e.target.value }))
          }
          placeholder="Filter by category..."
          className="w-full rounded-md border border-[#e2ddd5] px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Vendor
        </span>
        <Select
          value={draftFilters.vendorId}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, vendorId: val }))
          }
          options={[
            { label: "All Vendors", value: "" },
            ...vendors.map((v) => ({ label: v.name, value: v.id })),
          ]}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Active Status
        </span>
        <Select
          value={draftFilters.isActive}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, isActive: val }))
          }
          options={[
            { label: "All Statuses", value: "" },
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
          ]}
        />
      </label>
    </>
  );

  const exportCsv = async () => {
    try {
      toast.loading("Exporting CSV...", { id: "export-csv" });
      const headers = [
        "Service Name",
        "Code",
        "Category",
        "Vendor",
        "Stripe Account",
        "Active",
        "Created Date & Time",
      ];

      await exportAllPagesToCsv({
        filenamePrefix: "services",
        headers,
        pageSize: 50,
        fetchPage: async (page, limit) => {
          const res = await getServicesView({
            page,
            limit,
            search: searchInput.trim() || undefined,
            category: filters.category || undefined,
            vendorId: filters.vendorId || undefined,
            isActive: filters.isActive === "" ? undefined : filters.isActive === "true",
            sortBy: activeSort?.id || "createdAt",
            sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : "desc",
          });
          return {
            items: res.rows,
            totalPages: res.pagination.totalPages,
          };
        },
        rowToCsvFields: (r) => [
          r.values.name,
          r.values.code || "-",
          r.values.category || "-",
          r.values.vendorName || "Vendor not available",
          r.values.stripeConnectedAccountName ||
            (r.values.stripeConnectedAccountId
              ? getStripeAccountLabel(String(r.values.stripeConnectedAccountId))
              : "Stripe account not available"),
          r.values.isActive ? "Yes" : "No",
          formatUsDateTime(r.values.creationDate),
        ],
      });
      toast.success("CSV Exported successfully", { id: "export-csv" });
    } catch (e) {
      console.error("Failed to export services CSV:", e);
      toast.error(e instanceof Error ? e.message : "Failed to export CSV", { id: "export-csv" });
    }
  };

  return (
    <AppLayout
      title="Services"
      activeModule="Services"
      activeSubItem="All Services"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="All Services"
            subtitle="Service Catalog"
            searchPlaceholder="Search services by name, code, or category..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Services"
            filterFields={filterFieldsModal}
            addNewLabel={canManageServices ? "Create Service" : undefined}
            onAddNew={canManageServices ? openCreateForm : undefined}
            onExport={exportCsv}
            onRefresh={refreshServiceRecords}
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
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
              {rows.length === 0 ? (
                <div className="relative flex min-h-[400px] items-center justify-center">
                  <div className="flex max-w-md flex-col items-center px-6 text-center">
                    <EmptyStateIllustration />
                    <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                      No services found
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-400">
                      Create your first service to get started
                    </p>
                    {canManageServices && (
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="app-control mt-5 inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create Service
                      </button>
                    )}
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

        {showDetailPanel && selectedRow && (
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
                {selectedService?.name || String(selectedRow.values.name)}
              </span>
            </div>

            {isDetailLoading || !selectedService ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading service...
              </div>
            ) : (
              <form onSubmit={handleUpdateService} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-4">
                  <DetailCard
                    title={selectedService?.name || String(selectedRow.values.name)}
                    badge={selectedService ? { label: selectedService.isActive ? "Active" : "Inactive", className: selectedService.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700" } : null}
                      infoRows={[
                        ...(selectedService?.code ? [{ label: "Code", value: selectedService.code }] : []),
                        ...(selectedService?.category ? [{ label: "Category", value: selectedService.category }] : []),
                          {
                            label: "Stripe Account",
                            value:
                              selectedService?.stripeConnectedAccountName ||
                              getStripeAccountLabel(
                                selectedService?.stripeConnectedAccountId,
                              ),
                          },
                        {
                          label: "Stripe Account ID",
                          value: selectedService?.stripeConnectedAccountId || "Not available",
                        },
                        { label: "Vendor", value: selectedService?.vendor?.name ?? "Vendor not available" },
                      ]}
                  />

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        readOnly={!canManageServices}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Code
                      </label>
                      <input
                        type="text"
                        value={editForm.code}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            code: e.target.value,
                          })
                        }
                        readOnly={!canManageServices}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Category
                      </label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            category: e.target.value,
                          })
                        }
                        readOnly={!canManageServices}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Stripe Account <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={editForm.stripeConnectedAccountId}
                        onChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            stripeConnectedAccountId: value,
                          }))
                        }
                        placeholder="Select Stripe account"
                        options={stripeAccounts.map((account) => ({
                          label: `${account.displayName} (${account.id})`,
                          value: account.id,
                        }))}
                      />
                      <p className="mt-1 text-[12px] text-slate-400">
                        {editForm.stripeConnectedAccountId
                          ? getStripeAccountLabel(editForm.stripeConnectedAccountId)
                          : "Stripe account is required"}
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Vendor
                      </label>
                      <Select
                        value={editForm.vendorId}
                        onChange={(value) =>
                          setEditForm((prev) => ({ ...prev, vendorId: value }))
                        }
                        placeholder="Select vendor"
                        options={vendors.map((vendor) => ({
                          label: vendor.name,
                          value: vendor.id,
                        }))}
                      />
                      <p className="mt-1 text-[12px] text-slate-400">
                        {editForm.vendorId
                          ? vendors.find((vendor) => vendor.id === editForm.vendorId)?.name
                          : "Vendor not available"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editIsActive"
                        checked={editForm.isActive}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            isActive: e.target.checked,
                          })
                        }
                        disabled={!canManageServices}
                        className="h-4 w-4 rounded border-slate-300 text-[#4f63ea]"
                      />
                      <label
                        htmlFor="editIsActive"
                        className="text-[13px] font-medium text-slate-700"
                      >
                        Active
                      </label>
                    </div>
                  </div>
                </div>

                {canManageServices ? (
                  <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                    <button
                      type="button"
                      onClick={handleDeleteService}
                      disabled={isDeleting}
                      className="flex items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
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
                ) : null}
              </form>
            )}
          </aside>
        )}

        {showCreateForm && canManageServices && (
          <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">
                Create Service
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
              onSubmit={handleCreateService}
              className="flex-1 overflow-auto p-4"
            >
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Service name"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        code: e.target.value,
                      }))
                    }
                    placeholder="Service code"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Category
                      </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder="Service category"
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Stripe Account <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.stripeConnectedAccountId}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            stripeConnectedAccountId: value,
                          }))
                        }
                        placeholder="Select Stripe account"
                        options={stripeAccounts.map((account) => ({
                          label: `${account.displayName} (${account.id})`,
                          value: account.id,
                        }))}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Vendor
                      </label>
                      <Select
                        value={formData.vendorId}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, vendorId: value }))
                        }
                        placeholder="Select vendor"
                        options={vendors.map((vendor) => ({
                          label: vendor.name,
                          value: vendor.id,
                        }))}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createIsActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#4f63ea]"
                  />
                  <label
                    htmlFor="createIsActive"
                    className="text-[13px] font-medium text-slate-700"
                  >
                    Active
                  </label>
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

export default AllServicesPage;
