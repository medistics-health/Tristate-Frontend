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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";
import {
  getAllServices,
  getService,
  updateServiceApi,
  deleteServiceApi,
  type Service,
} from "../../services/operations/services";
import { canBusinessWrite, readStoredUser } from "../../utils/auth";

function ActiveServicePage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canManageServices = canBusinessWrite(currentRole);

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  type EditForm = {
    name: string;
    code: string;
    category: string;
    isActive: boolean;
  };

  const initialForm: EditForm = {
    name: "",
    code: "",
    category: "",
    isActive: true,
  };

  const [editForm, setEditForm] = useState<EditForm>(initialForm);

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive),
    [services],
  );

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const all = await getAllServices();
        setServices(all);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load services";
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleRowClick(id: string) {
    setSelectedServiceId(id);
    setShowDetailPanel(true);
    try {
      setIsDetailLoading(true);
      const service = await getService(id);
      setSelectedService(service);
      setEditForm({
        name: service.name,
        code: service.code ?? "",
        category: service.category ?? "",
        isActive: service.isActive,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load service";
      toast.error(msg);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedServiceId(null);
    setSelectedService(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageServices) return;
    if (!selectedService || !editForm.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    setIsSaving(true);
    try {
      await updateServiceApi(selectedService.id, {
        name: editForm.name.trim(),
        code: editForm.code.trim() || null,
        category: editForm.category.trim() || null,
        isActive: editForm.isActive,
      });
      const all = await getAllServices();
      setServices(all);
      const updated = await getService(selectedService.id);
      setSelectedService(updated);
      toast.success("Service updated");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update service";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!canManageServices) return;
    if (!selectedService) return;
    if (!window.confirm("Are you sure you want to delete this service?")) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteServiceApi(selectedService.id);
      const all = await getAllServices();
      setServices(all);
      closeDetailPanel();
      toast.success("Service deleted");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete service";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  function formatDateTime(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  }

  const columns = useMemo<ColumnDef<Service>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Name</span>
          </div>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleRowClick(row.original.id)}
            className="text-left hover:text-[#4f63ea]"
          >
            {row.original.name}
          </button>
        ),
        size: 240,
      },
      {
        id: "code",
        accessorFn: (row) => row.code ?? "",
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Code</span>
          </div>
        ),
        cell: ({ row }) => row.original.code || "-",
        size: 160,
      },
      {
        id: "category",
        accessorFn: (row) => row.category ?? "",
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Category</span>
          </div>
        ),
        cell: ({ row }) => row.original.category || "-",
        size: 200,
      },
      {
        id: "createdAt",
        accessorFn: (row) => row.createdAt,
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Created</span>
          </div>
        ),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
        size: 180,
      },
      {
        id: "updatedAt",
        accessorFn: (row) => row.updatedAt,
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Last Update</span>
          </div>
        ),
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
        size: 180,
      },
      {
        id: "add",
        header: () => <span />,
        cell: () => null,
        enableSorting: false,
        size: 44,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: activeServices,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  const navbarActions: NavbarAction[] = canManageServices
    ? [
        {
          label: "New record",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => toast("Create new services from All Services."),
        },
      ]
    : [];

  if (isLoading) {
    return (
      <AppLayout
        title="Service"
        activeModule="Service"
        activeSubItem="Active Service"
      >
        <div className="flex h-full items-center justify-center text-[13px] text-slate-400">
          Loading active services...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Service"
      activeModule="Service"
      activeSubItem="Active Service"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <section className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-[#f0ece6]">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>Active Service</span>
              <span className="text-slate-400">. {activeServices.length}</span>
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "name"
                      ? [{ id: "name", desc: !current[0].desc }]
                      : [{ id: "name", desc: false }],
                  )
                }
              >
                Sort
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {activeServices.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[13px] text-slate-400">
                No active services found.
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
                          style={{
                            width: header.getSize()
                              ? `${header.getSize()}px`
                              : undefined,
                          }}
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
                    const isSelected = row.original.id === selectedServiceId;
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
        </section>

        {showDetailPanel && selectedService ? (
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
                {selectedService.name}
              </span>
            </div>

            {isDetailLoading ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading service...
              </div>
            ) : (
              <form
                onSubmit={handleUpdate}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Code</span>
                      <span className="text-right text-slate-700">
                        {selectedService.code || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Category</span>
                      <span className="text-right text-slate-700">
                        {selectedService.category || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-right text-slate-700">
                        {formatDateTime(selectedService.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-right text-slate-700">
                        {formatDateTime(selectedService.updatedAt)}
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
                          setEditForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
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
                          setEditForm((prev) => ({
                            ...prev,
                            code: e.target.value,
                          }))
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
                          setEditForm((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        readOnly={!canManageServices}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editIsActive"
                        checked={editForm.isActive}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
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
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex cursor-pointer items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="app-control inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                ) : null}
              </form>
            )}
          </aside>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default ActiveServicePage;
