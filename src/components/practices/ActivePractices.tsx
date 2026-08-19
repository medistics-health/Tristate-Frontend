import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  CalendarDays,
  Circle,
  FileText,
  LayoutGrid,
  MapPin,
  Plus,
  Tag,
  Trash2,
  Save,
  ChevronLeft,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";
import DataTableToolbar, {
  SortableHeaderCell,
} from "../shared/DataTableToolbar";
import { AvatarPill, getStandardNavbarActions } from "../shared/PageComponents";
import {
  getPracticesView,
  getPractice,
  updatePracticeApi,
  deletePracticeApi,
} from "../../services/operations/practices";
import type { Practice, PracticeBody, PracticeRow } from "./types";

function getCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  return String(value);
}

function getDateSortValue(row: PracticeRow, isoKey: string, displayKey: string): number {
  const timestamp = Date.parse(
    String(row.values[isoKey] || row.values[displayKey] || ""),
  );
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function ActivePracticesPage() {
  const [rows, setRows] = useState<PracticeRow[]>([]);
  const [allPractices, setAllPractices] = useState<Practice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  type EditForm = {
    name: string;
    npi: string;
    source: string;
  };

  const initialForm: EditForm = {
    name: "",
    npi: "",
    source: "DIRECT",
  };

  const [editForm, setEditForm] = useState<EditForm>(initialForm);

  async function loadActivePractices() {
    try {
      setIsLoading(true);
      const data = await getPracticesView({ status: "ACTIVE" });
      setRows(data.rows);

      const all = await getPracticesView({ status: "ACTIVE", limit: 1000 });
      const fullPractices: Practice[] = [];
      for (const row of all.rows) {
        try {
          const p = await getPractice(row.id);
          fullPractices.push(p);
        } catch {
          // skip
        }
      }
      setAllPractices(fullPractices);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load practices";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadActivePractices();
  }, []);

  async function loadPracticeDetail(id: string) {
    try {
      setIsDetailLoading(true);
      const practice = await getPractice(id);
      setSelectedPractice(practice);
      setEditForm({
        name: practice.name,
        npi: practice.npi || "",
        source: practice.source,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load practice";
      toast.error(msg);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    loadPracticeDetail(rowId);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedPractice(null);
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPractice || !editForm.name.trim()) {
      toast.error("Practice name is required");
      return;
    }
    setIsSaving(true);
    try {
      await updatePracticeApi(selectedPractice.id, {
        name: editForm.name.trim(),
        npi: editForm.npi.trim() || undefined,
        source: editForm.source as PracticeBody["source"],
      });
      const data = await getPracticesView({ status: "ACTIVE" });
      setRows(data.rows);
      await loadPracticeDetail(selectedPractice.id);
      toast.success("Practice updated");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to update practice";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPractice) return;
    if (!window.confirm("Are you sure you want to delete this practice?")) {
      return;
    }
    setIsDeleting(true);
    try {
      await deletePracticeApi(selectedPractice.id);
      const data = await getPracticesView({ status: "ACTIVE" });
      setRows(data.rows);
      closeDetailPanel();
      toast.success("Practice deleted");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to delete practice";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const columns = useMemo<ColumnDef<PracticeRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => getCellValue(row.values.name),
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Name</span>
          </div>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleRowClick(row.original.id)}
            className="text-left hover:text-[#4f63ea]"
          >
            {getCellValue(row.original.values.name)}
          </button>
        ),
        size: 220,
      },
      {
        id: "npi",
        accessorFn: (row) => getCellValue(row.values.npi),
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>NPI</span>
          </div>
        ),
        cell: ({ row }) => getCellValue(row.original.values.npi),
        size: 160,
      },
      {
        id: "source",
        accessorFn: (row) => getCellValue(row.values.source),
        header: () => (
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <span>Source</span>
          </div>
        ),
        cell: ({ row }) => {
          const value = String(row.original.values.source || "");
          const colors: Record<string, string> = {
            DIRECT: "bg-blue-100 text-blue-700",
            REFERRAL: "bg-purple-100 text-purple-700",
            CHANNEL_PARTNER: "bg-orange-100 text-orange-700",
            OUTBOUND: "bg-cyan-100 text-cyan-700",
            INBOUND: "bg-pink-100 text-pink-700",
          };
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[value] || ""}`}
            >
              {value.replace(/_/g, " ")}
            </span>
          );
        },
        size: 180,
      },
      {
        id: "creationDate",
        accessorFn: (row) => getDateSortValue(row, "createdAt", "creationDate"),
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Created</span>
          </div>
        ),
        cell: ({ row }) => getCellValue(row.original.values.creationDate),
        size: 180,
      },
      {
        id: "lastUpdate",
        accessorFn: (row) => getDateSortValue(row, "updatedAt", "lastUpdate"),
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Last Update</span>
          </div>
        ),
        cell: ({ row }) => getCellValue(row.original.values.lastUpdate),
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
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => toast("Create new practices from All Practices."),
    },
  ];

  const sourceOptions = [
    "DIRECT",
    "REFERRAL",
    "CHANNEL_PARTNER",
    "OUTBOUND",
    "INBOUND",
  ];

  return (
    <AppLayout
      title="Practice"
      activeModule="Practice"
      activeSubItem="Active Practice"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      // navbarActions={navbarActions}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Active Practice"
            subtitle={`${rows.length} records`}
            activeFilterCount={0}
            onResetFilters={() => undefined}
            onRefresh={loadActivePractices}
            isLoading={isLoading}
            isSaving={isSaving}
            isDeleting={isDeleting}
            extraActions={
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "name"
                      ? [{ id: "name", desc: !current[0].desc }]
                      : [{ id: "name", desc: false }],
                  )
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1] hover:border-[#dcd6cb] transition-colors"
              >
                Sort
              </button>
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header, index) => (
                        <th
                          key={header.id}
                          className={`border-b border-[#eeebe5] px-4 py-3 font-medium ${
                            index < headerGroup.headers.length - 1
                              ? "border-r border-[#f2eee8]"
                              : ""
                          }`}
                          style={{
                            width: header.getSize()
                              ? `${header.getSize()}px`
                              : undefined,
                          }}
                        >
                          {header.id === "add" ? (
                            header.isPlaceholder ? null : (
                              flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )
                            )
                          ) : (
                            <SortableHeaderCell
                              key={`${header.id}-${header.column.getIsSorted() || "none"}`}
                              header={header}
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="text-[14px] text-slate-600">
                  {!isLoading && rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-8 text-center text-[13px] text-slate-400"
                      >
                        No active practices found.
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          selectedRowId === row.original.id
                            ? "bg-[#fcfbf9]"
                            : "bg-white"
                        }
                      >
                        {row.getVisibleCells().map((cell, index) => (
                          <td
                            key={cell.id}
                            className={`border-b border-[#f4f1ec] px-4 py-3 ${
                              index < row.getVisibleCells().length - 1
                                ? "border-r border-[#f5f2ed]"
                                : ""
                            }`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DataTableToolbar>
        </section>

        {showDetailPanel && selectedPractice ? (
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
                {selectedPractice.name}
              </span>
            </div>

            {isDetailLoading ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading practice...
              </div>
            ) : (
              <form
                onSubmit={handleUpdate}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">NPI</span>
                      <span className="text-right text-slate-700">
                        {selectedPractice.npi || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-right text-slate-700">
                        {new Date(
                          selectedPractice.createdAt,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-right text-slate-700">
                        {new Date(
                          selectedPractice.updatedAt,
                        ).toLocaleString()}
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
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        NPI
                      </label>
                      <input
                        type="text"
                        value={editForm.npi}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            npi: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Source <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editForm.source}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            source: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      >
                        {sourceOptions.map((source) => (
                          <option key={source} value={source}>
                            {source.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

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
              </form>
            )}
          </aside>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default ActivePracticesPage;
