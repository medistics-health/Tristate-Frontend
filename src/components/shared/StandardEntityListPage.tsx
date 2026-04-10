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
  ChevronDown,
  FileText,
  LayoutGrid,
  SlidersHorizontal,
  UserCircle2,
  Circle,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import {
  AvatarPill,
  DetailSidePanel,
  getStandardNavbarActions,
  type DetailTabId,
} from "./PageComponents";
import {
  buildStandardEntityRow,
  EmptyStateIllustration,
  parseRelativeAge,
  type StandardEntityRow,
} from "./tablePageUtils";

type StandardEntityListPageProps = {
  title: string;
  activeModule: string;
  activeSubItem: string;
  viewLabel: string;
  itemLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel: string;
  initialRows?: StandardEntityRow[];
};

function StandardEntityListPage({
  title,
  activeModule,
  activeSubItem,
  viewLabel,
  itemLabel,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  initialRows = [],
}: StandardEntityListPageProps) {
  const [rows, setRows] = useState(initialRows);
  const [viewId, setViewId] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    creationDate: true,
    lastUpdate: true,
    updatedBy: true,
    createdBy: true,
  });

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTabId>("home");

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId]
  );

  const views = useMemo(
    () => [
      {
        id: "all",
        label: viewLabel,
        sort: [{ id: "creationDate", desc: true }] as SortingState,
      },
      {
        id: "recent",
        label: "Recently Updated",
        sort: [{ id: "lastUpdate", desc: true }] as SortingState,
      },
    ],
    [viewLabel],
  );

  const columns = useMemo<ColumnDef<StandardEntityRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={rows.length > 0 && rows.every((row) => selectedIds[row.id])}
            onChange={(event) =>
              setSelectedIds(
                event.target.checked
                  ? Object.fromEntries(rows.map((row) => [row.id, true]))
                  : {},
              )
            }
            className="h-4 w-4 rounded border border-[#cec8bf]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={Boolean(selectedIds[row.original.id])}
            onChange={(event) =>
              setSelectedIds((current) => ({
                ...current,
                [row.original.id]: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border border-[#cec8bf]"
          />
        ),
        enableSorting: false,
        size: 42,
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Name</span>
          </div>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setSelectedRowId(row.original.id);
              setShowDetailPanel(true);
            }}
            className="flex items-center gap-2 text-left hover:text-[#4f63ea]"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f7f5f1] text-[11px] text-slate-300">
              -
            </span>
            <span>{row.original.name}</span>
          </button>
        ),
        size: 220,
      },
      {
        id: "creationDate",
        accessorFn: (row) => parseRelativeAge(row.creationDate),
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Creation date</span>
          </div>
        ),
        cell: ({ row }) => row.original.creationDate,
        size: 180,
      },
      {
        id: "lastUpdate",
        accessorFn: (row) => parseRelativeAge(row.lastUpdate),
        header: () => (
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>Last update</span>
          </div>
        ),
        cell: ({ row }) => row.original.lastUpdate,
        size: 180,
      },
      {
        id: "updatedBy",
        accessorFn: (row) => row.updatedBy,
        header: () => (
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Updated by</span>
          </div>
        ),
        cell: ({ row }) => <AvatarPill name={row.original.updatedBy} />,
        size: 160,
      },
      {
        id: "createdBy",
        accessorFn: (row) => row.createdBy,
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Created by</span>
          </div>
        ),
        cell: ({ row }) => <AvatarPill name={row.original.createdBy} />,
        size: 160,
      },
      {
        id: "add",
        header: () => <span>+</span>,
        cell: () => null,
        enableSorting: false,
        size: 44,
      },
    ],
    [rows, selectedIds],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  function addRow() {
    const nextIndex = rows.length + 1;
    const newRow = buildStandardEntityRow(nextIndex, itemLabel);
    setRows((current) => [newRow, ...current]);
    setSelectedRowId(newRow.id);
    setShowDetailPanel(true);
  }

  function updateRow(rowId: string, updater: (row: StandardEntityRow) => StandardEntityRow) {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? updater(row) : row)),
    );
  }

  function deleteSelectedRow() {
    if (!selectedRow) return;
    setRows((current) => current.filter((row) => row.id !== selectedRow.id));
    setShowDetailPanel(false);
    setShowOptionsMenu(false);
  }

  function changeView(nextViewId: string) {
    setViewId(nextViewId);
    const nextView = views.find((view) => view.id === nextViewId) ?? views[0];
    setSorting(nextView.sort);
  }

  return (
    <AppLayout
      title={title}
      activeModule={activeModule}
      activeSubItem={activeSubItem}
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={getStandardNavbarActions(addRow)}
    >
      <div className="flex h-full gap-2">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <div className="relative">
              <LayoutGrid className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <select
                value={viewId}
                onChange={(event) => changeView(event.target.value)}
                className="min-w-56 appearance-none rounded-md bg-transparent py-1.5 pl-8 pr-10 text-[14px] font-medium text-slate-700 outline-none"
              >
                {views.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button type="button">Filter</button>
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
              <button
                type="button"
                onClick={() =>
                  setColumnVisibility((current) => ({
                    ...current,
                    updatedBy: !current.updatedBy,
                  }))
                }
              >
                Options
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400 last:border-r-0"
                        style={{
                          width: header.getSize() ? `${header.getSize()}px` : undefined,
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
                            className={`flex w-full items-center gap-2 ${
                              header.id === "select" ? "justify-center" : ""
                            }`}
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
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={selectedRowId === row.original.id ? "bg-[#fcfbf9]" : "bg-white"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600 last:border-r-0"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 ? (
              <div className="relative flex min-h-[520px] items-center justify-center">
                <div className="absolute inset-y-0 left-[42px] w-px bg-[#f7f2ec]" />
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    {emptyTitle}
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">{emptyDescription}</p>
                  <button
                    type="button"
                    onClick={addRow}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {emptyActionLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-b border-[#f4f1ec] px-4 py-2 text-[13px] text-slate-400">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New
                </button>
              </div>
            )}
          </div>
        </div>

        <DetailSidePanel
          isOpen={showDetailPanel && !!selectedRow}
          onClose={() => setShowDetailPanel(false)}
          title={selectedRow?.name || ""}
          onTitleChange={(newName) => {
            if (selectedRow) {
              updateRow(selectedRow.id, (row) => ({ ...row, name: newName }));
            }
          }}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onDelete={deleteSelectedRow}
          metadata={[
            {
              label: (
                <>
                  <Circle className="h-3.5 w-3.5" />
                  <span>Created by</span>
                </>
              ),
              value: <AvatarPill name={selectedRow?.createdBy || ""} />,
            },
            {
              label: (
                <>
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Creation date</span>
                </>
              ),
              value: selectedRow?.creationDate,
            },
            {
              label: (
                <>
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Last update</span>
                </>
              ),
              value: selectedRow?.lastUpdate,
            },
            {
              label: (
                <>
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>Updated by</span>
                </>
              ),
              value: <AvatarPill name={selectedRow?.updatedBy || ""} />,
            },
          ]}
        />
      </div>
    </AppLayout>
  );
}

export default StandardEntityListPage;
