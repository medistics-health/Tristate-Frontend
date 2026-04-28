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
import { EmptyStateIllustration } from "../shared/tablePageUtils";
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

function AllVendorsPage() {
  const [rows, setRows] = useState<VendorRow[]>([]);
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

          const params: VendorQueryParams = {
            page: pagination.page,
            limit: pagination.limit,
            sortBy: sorting[0]?.id || "createdAt",
            sortOrder: sorting[0]?.desc ? "desc" : "asc",
            ...(filters.search && { search: filters.search }),
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
      }

      if (filters.search.length > 2 || filters.search.length === 0) {
        loadData();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, sorting, filters]);

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
    if (!formData.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const vendorData = {
        name: formData.name.trim(),
        type: formData.type,
        ...(formData.renewalDate && { renewalDate: formData.renewalDate }),
        ...(formData.quickbooksVendorId.trim() && {
          quickbooksVendorId: formData.quickbooksVendorId.trim(),
        }),
        ...(formData.remitEmail.trim() && {
          remitEmail: formData.remitEmail.trim(),
        }),
        ...(formData.paymentTerms.trim() && {
          paymentTerms: formData.paymentTerms.trim(),
        }),
      };

      await createVendorApi(vendorData);
      const data = await getVendorsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeCreateForm();
      toast.success("Vendor created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create vendor";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteVendor() {
    if (!selectedRow) return;

    if (!window.confirm("Are you sure you want to delete this vendor?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteVendorApi(selectedRow.id);
      const data = await getVendorsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      closeDetailPanel();
      toast.success("Vendor deleted successfully");
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
    if (!editForm.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    setIsSaving(true);
    try {
      const vendorData = {
        name: editForm.name.trim(),
        type: editForm.type,
        ...(editForm.renewalDate && { renewalDate: editForm.renewalDate }),
        ...(editForm.quickbooksVendorId.trim() && {
          quickbooksVendorId: editForm.quickbooksVendorId.trim(),
        }),
        ...(editForm.remitEmail.trim() && {
          remitEmail: editForm.remitEmail.trim(),
        }),
        ...(editForm.paymentTerms.trim() && {
          paymentTerms: editForm.paymentTerms.trim(),
        }),
      };

      await updateVendorApi(selectedRowId!, vendorData);
      const data = await getVendorsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      toast.success("Vendor updated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update vendor";
      toast.error(message);
    } finally {
      setIsSaving(false);
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
        title="Vendors"
        activeModule="Vendors"
        activeSubItem="All Vendors"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading vendors...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Vendors"
        activeModule="Vendors"
        activeSubItem="All Vendors"
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
      title="Vendors"
      activeModule="Vendors"
      activeSubItem="All Vendors"
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
              <span>All Vendors</span>
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
                placeholder="Search by name..."
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
                    No vendors found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Create your first vendor to get started
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Vendor
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
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-slate-700">
                        {selectedVendor.createdAt
                          ? new Date(selectedVendor.createdAt).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-slate-700">
                        {selectedVendor.updatedAt
                          ? new Date(selectedVendor.updatedAt).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                  </div>

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
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>
                  </div>
                </div>

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
              </form>
            )}
          </aside>
        )}

        {showCreateForm && (
          <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
