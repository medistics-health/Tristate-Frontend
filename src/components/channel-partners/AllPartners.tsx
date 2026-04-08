import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Circle, LayoutGrid, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type AllPartnersRow = {
  id: string;
};

function AllPartnersPage() {
  const [rows, setRows] = useState<AllPartnersRow[]>(
    Array.from({ length: 1 }, (_, index) => ({
      id: `pending-${index + 1}`,
    })),
  );
  const [filterCount, setFilterCount] = useState(0);
  const [viewName, setViewName] = useState("All Partners");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const columns = useMemo<ColumnDef<AllPartnersRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={
              rows.length > 0 && rows.every((row) => selectedIds[row.id])
            }
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
        id: "add-column",
        header: () => <span className="text-slate-400">+</span>,
        cell: () => null,
        enableSorting: false,
        size: 80,
      },
    ],
    [rows, selectedIds],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function addNewRow() {
    setRows((current) => [...current, { id: `pending-${current.length + 1}` }]);
  }

  function resetView() {
    setFilterCount(0);
    setSelectedIds({});
    setViewName("All Partners");
  }

  function updateView() {
    setViewName((current) =>
      current === "All Partners" ? "All Partners (Updated)" : "All Partners",
    );
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: addNewRow,
    },
    {
      label: "Ctrl K",
      muted: true,
    },
  ];

  return (
    <AppLayout
      title="Partners"
      activeModule="Partners"
      activeSubItem="Partners Catalog"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-panel flex h-full flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
          <div className="flex items-center gap-2 text-[14px] font-medium text-slate-700">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <button
              type="button"
              onClick={updateView}
              className="inline-flex items-center gap-1"
            >
              <span>{viewName}</span>
              <span className="text-slate-400">· {rows.length}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center gap-6 text-[14px] text-slate-500">
            <button
              type="button"
              onClick={() => setFilterCount((count) => count + 1)}
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => setRows((current) => [...current].reverse())}
            >
              Sort
            </button>
            <button
              type="button"
              onClick={() =>
                setRows((current) =>
                  current.slice(0, Math.max(current.length - 1, 0)),
                )
              }
            >
              Options
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2 text-[13px]">
          <button
            type="button"
            onClick={() => setFilterCount((count) => count + 1)}
            className="text-slate-400 hover:text-slate-600"
          >
            + Add filter
            {filterCount > 0 ? ` (${filterCount})` : ""}
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={resetView}
              className="text-slate-400 hover:text-slate-600"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={updateView}
              className="inline-flex items-center gap-2 rounded-md bg-[#5d5ae6] px-3 py-1.5 text-white"
            >
              Update view
              <ChevronDown className="h-3.5 w-3.5" />
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
                        width: header.getSize()
                          ? `${header.getSize()}px`
                          : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
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
              ))}

              <tr>
                <td
                  colSpan={2}
                  className="border-b border-[#f4f1ec] px-3 py-2 text-[13px] text-slate-400"
                >
                  <button
                    type="button"
                    onClick={addNewRow}
                    className="inline-flex items-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add New
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="px-4 py-3 text-[12px] text-slate-300">
            <button
              type="button"
              onClick={resetView}
              className="inline-flex items-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset temporary changes
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default AllPartnersPage;
