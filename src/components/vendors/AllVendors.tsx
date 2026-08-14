import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
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
import AppLayout from "../layout/AppLayout";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import { getResponsivePageSize } from "../shared/TablePagination";
import type { VendorRow, Vendor } from "./types";
import {
  createVendorApi,
  deleteVendorApi,
  getVendor,
  getVendorsView,
  updateVendorApi,
  type VendorQueryParams,
} from "../../services/operations/vendors";
import toast from "react-hot-toast";
import { canOperationsAndFinanceWrite, readStoredUser } from "../../utils/auth";

function AllVendorsPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canManageVendors = canOperationsAndFinanceWrite(currentRole);

  const [rows, setRows] = useState<VendorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "BILLING",
    renewalDate: "",
    quickbooksVendorId: "",
    remitEmail: "",
    paymentTerms: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    type: "BILLING",
    renewalDate: "",
    quickbooksVendorId: "",
    remitEmail: "",
    paymentTerms: "",
  });

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "name",
          accessorFn: (row: VendorRow) => row.values.name,
          header: () => "Name",
          cell: ({ row }: { row: { original: VendorRow } }) =>
            String(row.original.values.name || "-"),
        },
        {
          id: "type",
          accessorFn: (row: VendorRow) => row.values.type,
          header: () => "Type",
          cell: ({ row }: { row: { original: VendorRow } }) =>
            String(row.original.values.type || "-"),
        },
        {
          id: "renewalDate",
          accessorFn: (row: VendorRow) => row.values.renewalDate,
          header: () => "Renewal Date",
          cell: ({ row }: { row: { original: VendorRow } }) =>
            String(row.original.values.renewalDate || "-"),
        },
        {
          id: "quickbooksVendorId",
          accessorFn: (row: VendorRow) => row.values.quickbooksVendorId,
          header: () => "QuickBooks ID",
          cell: ({ row }: { row: { original: VendorRow } }) =>
            String(row.original.values.quickbooksVendorId || "-"),
        },
        {
          id: "remitEmail",
          accessorFn: (row: VendorRow) => row.values.remitEmail,
          header: () => "Remit Email",
          cell: ({ row }: { row: { original: VendorRow } }) =>
            String(row.original.values.remitEmail || "-"),
        },
        {
          id: "paymentTerms",
          accessorFn: (row: VendorRow) => row.values.paymentTerms,
          header: () => "Payment Terms",
          cell: ({ row }: { row: { original: VendorRow } }) =>
            String(row.original.values.paymentTerms || "-"),
        },
        {
          id: "creationDate",
          accessorFn: (row: VendorRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: VendorRow } }) =>
            String(row.original.values.creationDate),
        },
      ] as ColumnDef<VendorRow>[],
    [],
  );

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

  type VendorFilters = {
    search: string;
    type: string;
  };

  const defaultFilters: VendorFilters = {
    search: "",
    type: "",
  };

  const [filters, setFilters] = useState<VendorFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<VendorFilters>(defaultFilters);
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

  const activeFilterCount = [filters.type].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.type) {
      chips.push({
        key: "type",
        label: "Type",
        displayValue: filters.type,
        onClear: () => {
          setFilters((curr) => ({ ...curr, type: "" }));
          setDraftFilters((curr) => ({ ...curr, type: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters.type]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const refreshVendorRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: VendorQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: activeSort?.id || "createdAt",
        sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : "desc",
        ...(searchInput.trim() && { search: searchInput.trim() }),
        ...(filters.type && { type: filters.type }),
      };

      const data = await getVendorsView(params);
      setRows(data.rows);
      setPagination(data.pagination);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load vendors";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshVendorRecords();
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    searchInput,
    filters.type,
    activeSort?.id,
    activeSort?.desc,
  ]);

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const vendor = await getVendor(rowId);
      setSelectedVendor(vendor);
      setEditForm({
        name: vendor.name,
        type: vendor.type,
        renewalDate: vendor.renewalDate ?? "",
        quickbooksVendorId: vendor.quickbooksVendorId ?? "",
        remitEmail: vendor.remitEmail ?? "",
        paymentTerms: vendor.paymentTerms ?? "",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch vendor";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedVendor(null);
    setEditForm({
      name: "",
      type: "BILLING",
      renewalDate: "",
      quickbooksVendorId: "",
      remitEmail: "",
      paymentTerms: "",
    });
  }

  function openCreateForm() {
    if (!canManageVendors) return;
    setFormData({
      name: "",
      type: "BILLING",
      renewalDate: "",
      quickbooksVendorId: "",
      remitEmail: "",
      paymentTerms: "",
    });
    setShowCreateForm(true);
    setShowDetailPanel(false);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setFormData({
      name: "",
      type: "BILLING",
      renewalDate: "",
      quickbooksVendorId: "",
      remitEmail: "",
      paymentTerms: "",
    });
  }

  async function handleCreateVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageVendors) return;

    if (!formData.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const vendorData = {
        name: formData.name.trim(),
        type: formData.type as any,
        renewalDate: formData.renewalDate || undefined,
        quickbooksVendorId: formData.quickbooksVendorId || undefined,
        remitEmail: formData.remitEmail || undefined,
        paymentTerms: formData.paymentTerms || undefined,
      };

      await createVendorApi(vendorData);
      toast.success("Vendor created successfully");
      closeCreateForm();
      await refreshVendorRecords();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create vendor";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteVendor() {
    if (!canManageVendors || !selectedRow) return;

    if (!window.confirm("Are you sure you want to delete this vendor?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteVendorApi(selectedRow.id);
      closeDetailPanel();
      toast.success("Vendor deleted successfully");
      await refreshVendorRecords();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete vendor";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUpdateVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageVendors || !selectedRowId) return;

    if (!editForm.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    setIsSaving(true);
    try {
      const vendorData = {
        name: editForm.name.trim(),
        type: editForm.type as any,
        renewalDate: editForm.renewalDate || undefined,
        quickbooksVendorId: editForm.quickbooksVendorId || undefined,
        remitEmail: editForm.remitEmail || undefined,
        paymentTerms: editForm.paymentTerms || undefined,
      };

      await updateVendorApi(selectedRowId, vendorData);
      toast.success("Vendor updated successfully");
      await refreshVendorRecords();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update vendor";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  const navbarActions = canManageVendors
    ? [
        {
          label: "New record",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateForm,
        },
      ]
    : [];

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Vendor Type
        </span>
        <Select
          value={draftFilters.type}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, type: val }))
          }
          options={[
            { label: "All Types", value: "" },
            { label: "BILLING", value: "BILLING" },
            { label: "CREDENTIALING", value: "CREDENTIALING" },
            { label: "PAYROLL", value: "PAYROLL" },
            { label: "IT_SOFTWARE", value: "IT_SOFTWARE" },
            { label: "MARKETING", value: "MARKETING" },
            { label: "LEGAL", value: "LEGAL" },
            { label: "MEDICAL_SUPPLIES", value: "MEDICAL_SUPPLIES" },
            { label: "OTHER", value: "OTHER" },
          ]}
        />
      </label>
    </>
  );

  return (
    <AppLayout
      title="Vendors"
      activeModule="Vendors"
      activeSubItem="All Vendors"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="All Vendors"
            subtitle="Vendors"
            searchPlaceholder="Search vendors by name..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Vendors"
            filterFields={filterFieldsModal}
            addNewLabel={canManageVendors ? "Create Vendor" : undefined}
            onAddNew={canManageVendors ? openCreateForm : undefined}
            onRefresh={refreshVendorRecords}
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
                      No vendors found
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-400">
                      Create your first vendor to get started
                    </p>
                    {canManageVendors && (
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="app-control mt-5 inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create Vendor
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
                {selectedVendor?.name || String(selectedRow.values.name)}
              </span>
            </div>

            {isDetailLoading || !selectedVendor ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading vendor...
              </div>
            ) : (
              <form
                onSubmit={handleUpdateVendor}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <DetailCard
                    title={selectedVendor?.name || String(selectedRow.values.name)}
                    badge={selectedVendor?.type ? { label: selectedVendor.type, className: "bg-blue-100 text-blue-700" } : null}
                    infoRows={[
                      ...(selectedVendor?.renewalDate ? [{ label: "Renewal Date", value: new Date(selectedVendor.renewalDate).toLocaleDateString() }] : []),
                      ...(selectedVendor?.paymentTerms ? [{ label: "Payment Terms", value: selectedVendor.paymentTerms }] : []),
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
                        readOnly={!canManageVendors}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Type
                      </label>
                      <select
                        value={editForm.type}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            type: e.target.value as
                              | "VENDOR"
                              | "VENDOR_PLATFORM",
                          })
                        }
                        disabled={!canManageVendors}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      >
                        <option value="BILLING">Billing</option>
                        <option value="CODING">Coding</option>
                        <option value="RCM">RCM</option>
                        <option value="COMPLIANCE">Compliance</option>
                        <option value="TECHNOLOGY">Technology</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Renewal Date
                      </label>
                      <input
                        type="date"
                        value={editForm.renewalDate}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            renewalDate: e.target.value,
                          })
                        }
                        readOnly={!canManageVendors}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        QuickBooks Vendor ID
                      </label>
                      <input
                        type="text"
                        value={editForm.quickbooksVendorId}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            quickbooksVendorId: e.target.value,
                          })
                        }
                        readOnly={!canManageVendors}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Remit Email
                      </label>
                      <input
                        type="email"
                        value={editForm.remitEmail}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            remitEmail: e.target.value,
                          })
                        }
                        readOnly={!canManageVendors}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Payment Terms
                      </label>
                      <input
                        type="text"
                        value={editForm.paymentTerms}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            paymentTerms: e.target.value,
                          })
                        }
                        readOnly={!canManageVendors}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>
                  </div>
                </div>

                {canManageVendors ? (
                  <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                    <button
                      type="button"
                      onClick={handleDeleteVendor}
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

        {showCreateForm && canManageVendors && (
          <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">
                Create Vendor
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
              onSubmit={handleCreateVendor}
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
                    placeholder="Vendor name"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  >
                    <option value="BILLING">Billing</option>
                    <option value="CODING">Coding</option>
                    <option value="RCM">RCM</option>
                    <option value="COMPLIANCE">Compliance</option>
                    <option value="TECHNOLOGY">Technology</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        renewalDate: e.target.value,
                      }))
                    }
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    QuickBooks Vendor ID
                  </label>
                  <input
                    type="text"
                    value={formData.quickbooksVendorId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quickbooksVendorId: e.target.value,
                      }))
                    }
                    placeholder="QuickBooks vendor ID"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Remit Email
                  </label>
                  <input
                    type="email"
                    value={formData.remitEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        remitEmail: e.target.value,
                      }))
                    }
                    placeholder="remit@example.com"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTerms: e.target.value,
                      }))
                    }
                    placeholder="Net 30"
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
        )}
      </div>
    </AppLayout>
  );
}

export default AllVendorsPage;
