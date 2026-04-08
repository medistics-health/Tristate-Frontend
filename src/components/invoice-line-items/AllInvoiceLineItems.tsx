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
  Circle,
  FileText,
  LayoutGrid,
  Plus,
  SlidersHorizontal,
  UserCircle2,
} from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type InvoiceLineRow = {
  id: string;
  name: string;
  creationDate: string;
  lastUpdate: string;
  updatedBy: string;
  createdBy: string;
};

type InvoiceLineView = {
  id: string;
  label: string;
  sort: SortingState;
};

const initialRows: InvoiceLineRow[] = [];

const views: InvoiceLineView[] = [
  {
    id: "all",
    label: "All Invoice Line Items",
    sort: [{ id: "creationDate", desc: true }],
  },
  {
    id: "recent",
    label: "Recently Updated",
    sort: [{ id: "lastUpdate", desc: true }],
  },
];

function parseRelativeAge(value: string) {
  const parts = value.split(" ");
  const amount = Number(parts[0]);
  const unit = parts[1];

  if (Number.isNaN(amount)) {
    return 0;
  }

  if (unit.startsWith("day")) {
    return amount;
  }

  if (unit.startsWith("month")) {
    return amount * 30;
  }

  if (unit.startsWith("year")) {
    return amount * 365;
  }

  return amount;
}

function PurchaseOrderIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-36">
      <ellipse cx="81" cy="98" rx="36" ry="8" fill="#e8eef7" />
      <path
        d="M50 31c5-8 16-13 28-13 9 0 17 3 23 8 4-2 8-3 12-3 11 0 19 7 19 17 0 9-5 15-12 18l-21 28c-5 6-12 9-20 9-5 0-10-1-14-4L44 56c-3-3-5-7-5-12 0-7 4-11 11-13Z"
        fill="#bdeeff"
        stroke="#3f4a56"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M47 54 84 33l43 25-39 23-41-27Z"
        fill="#3f8cff"
        stroke="#3f4a56"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M47 54v8l41 27v-8L47 54Zm80 4v8L88 89v-8l39-23Z"
        fill="#70abff"
        stroke="#3f4a56"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="m56 54 28-16 33 19"
        stroke="#9dd1ff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse cx="84" cy="51" rx="10" ry="7" fill="#c7f0ff" />
      <circle
        cx="120"
        cy="39"
        r="10"
        fill="#4ba3ff"
        stroke="#3f4a56"
        strokeWidth="2.2"
      />
      <path
        d="M117 39h6M120 36v6"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AllInvoiceLineItems() {
  const [rows, setRows] = useState(initialRows);
  const [viewId, setViewId] = useState("all");
  const [sorting, setSorting] = useState<SortingState>(views[0].sort);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    creationDate: true,
    lastUpdate: true,
    updatedBy: true,
    createdBy: true,
  });

  const activeView = views.find((view) => view.id === viewId) ?? views[0];

  const columns = useMemo<ColumnDef<InvoiceLineRow>[]>(
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
        id: "name",
        accessorFn: (row) => row.name,
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Name</span>
          </div>
        ),
        cell: ({ row }) => row.original.name,
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
        cell: ({ row }) => row.original.updatedBy,
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
        cell: ({ row }) => row.original.createdBy,
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

  function addPurchaseOrder() {
    const nextId = `po-${rows.length + 1}`;
    setRows((current) => [
      {
        id: nextId,
        name: `Purchase Order ${current.length + 1}`,
        creationDate: "0 days ago",
        lastUpdate: "0 days ago",
        updatedBy: "Siddhi Gajjar",
        createdBy: "Siddhi Gajjar",
      },
      ...current,
    ]);
  }

  function changeView(nextViewId: string) {
    setViewId(nextViewId);
    const nextView = views.find((view) => view.id === nextViewId) ?? views[0];
    setSorting(nextView.sort);
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: addPurchaseOrder,
    },
    {
      label: "Ctrl K",
      muted: true,
    },
  ];

  return (
    <AppLayout
      title="Invoice Line Items"
      activeModule="Invoice Line Items"
      activeSubItem="All Invoice Line Items"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-panel flex h-full flex-col overflow-hidden rounded-2xl">
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
            </tbody>
          </table>

          {rows.length === 0 ? (
            <div className="relative flex min-h-[520px] items-center justify-center">
              <div className="absolute inset-y-0 left-[42px] w-px bg-[#f7f2ec]" />
              <div className="flex max-w-md flex-col items-center px-6 text-center">
                <PurchaseOrderIllustration />
                <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                  Add your first Invoice Item
                </h2>
                <p className="mt-2 text-[14px] text-slate-400">
                  Use our API or add your first Invoice Item manually
                </p>
                <button
                  type="button"
                  onClick={addPurchaseOrder}
                  className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add a Invoice
                </button>
              </div>
            </div>
          ) : (
            <div className="border-b border-[#f4f1ec] px-4 py-2 text-[13px] text-slate-400">
              <button
                type="button"
                onClick={addPurchaseOrder}
                className="inline-flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default AllInvoiceLineItems;
