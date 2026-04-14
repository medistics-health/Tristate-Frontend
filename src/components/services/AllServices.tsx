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
import type { ServiceRow } from "./types";
import {
  createServiceApi,
  deleteServiceApi,
  getServicesView,
  type ServiceQueryParams,
} from "../../services/operations/services";
import toast from "react-hot-toast";

function AllServicesPage() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
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

  const [formData, setFormData] = useState({
    name: "",
    clientRate: "",
    vendorRate: "",
    margin: "",
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
          accessorFn: (row: ServiceRow) => row.values.name,
          header: () => "Name",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.name || "-"),
        },
        {
          id: "clientRate",
          accessorFn: (row: ServiceRow) => row.values.clientRate,
          header: () => "Client Rate",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.clientRate || "-"),
        },
        {
          id: "vendorRate",
          accessorFn: (row: ServiceRow) => row.values.vendorRate,
          header: () => "Vendor Rate",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.vendorRate || "-"),
        },
        {
          id: "margin",
          accessorFn: (row: ServiceRow) => row.values.margin,
          header: () => "Margin (%)",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.margin || "-"),
        },
        {
          id: "creationDate",
          accessorFn: (row: ServiceRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: ServiceRow } }) =>
            String(row.original.values.creationDate),
        },
      ] as ColumnDef<ServiceRow>[],
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

          const params: ServiceQueryParams = {
            page: pagination.page,
            limit: pagination.limit,
            sortBy: sorting[0]?.id || "createdAt",
            sortOrder: sorting[0]?.desc ? "desc" : "asc",
            ...(filters.search && { search: filters.search }),
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
      }

      if (filters.search.length > 2 || filters.search.length === 0) {
        loadData();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, sorting, filters]);

  // useEffect(() => {
  //   setPagination((prev) => ({ ...prev, page: 1 }));
  // }, [filters, sorting]);

  function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
  }

  function openCreateForm() {
    setFormData({ name: "", clientRate: "", vendorRate: "", margin: "" });
    setShowCreateForm(true);
    setShowDetailPanel(false);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setFormData({ name: "", clientRate: "", vendorRate: "", margin: "" });
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const serviceData = {
        name: formData.name.trim(),
        clientRate: parseFloat(formData.clientRate) || 0,
        vendorRate: parseFloat(formData.vendorRate) || 0,
        margin: parseFloat(formData.margin) || 0,
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
      setPagination(data.pagination);
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
        title="Services"
        activeModule="Services"
        activeSubItem="All Services"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading services...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Services"
        activeModule="Services"
        activeSubItem="All Services"
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
      title="Services"
      activeModule="Services"
      activeSubItem="All Services"
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
              <span>All Services</span>
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
                    No services found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Create your first service to get started
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Service
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
                {String(selectedRow.values.name)}
              </span>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Name</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.name)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Client Rate</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.clientRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Vendor Rate</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.vendorRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Margin (%)</span>
                  <span className="text-slate-700">
                    {String(selectedRow.values.margin)}
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
                onClick={handleDeleteService}
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
                    Client Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.clientRate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        clientRate: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Vendor Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.vendorRate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vendorRate: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Margin (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.margin}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        margin: e.target.value,
                      }))
                    }
                    placeholder="0.00"
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

export default AllServicesPage;
