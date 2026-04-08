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
  CircleDollarSign,
  FileText,
  Plus,
  UserCircle2,
} from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import { LayoutGrid } from "lucide-react";
import type { ReactNode } from "react";
export type NavbarAction = {
  label: string;
  muted?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
};

type NavbarProps = {
  title: string;
  icon?: ReactNode;
  actions?: NavbarAction[];
};

type ReminderDueRow = {
  id: string;
  name: string;
  vendor: string;
  amount: string;
  dueIn: string;
  createdBy: string;
};

const initialRows: ReminderDueRow[] = [
  {
    id: "ReminderDue-1",
    name: "PO-001",
    vendor: "TriState Imaging Supply",
    amount: "$12,500",
    dueIn: "3 days",
    createdBy: "Siddhi Gajjar",
  },
  {
    id: "ReminderDue-2",
    name: "PO-002",
    vendor: "Metro Diagnostics",
    amount: "$4,860",
    dueIn: "5 days",
    createdBy: "Nikhil Patel",
  },
];

function parseDueIn(value: string) {
  const amount = Number(value.split(" ")[0]);
  return Number.isNaN(amount) ? 0 : amount;
}

function ReminderDuePage() {
  const [rows, setRows] = useState(initialRows);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dueIn", desc: false },
  ]);
  const [showOnlyHighValue, setShowOnlyHighValue] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [showCreatedBy, setShowCreatedBy] = useState(true);

  const filteredRows = useMemo(
    () =>
      showOnlyHighValue
        ? rows.filter((row) => Number(row.amount.replace(/[$,]/g, "")) >= 5000)
        : rows,
    [rows, showOnlyHighValue],
  );

  const columns = useMemo<ColumnDef<ReminderDueRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={
              filteredRows.length > 0 &&
              filteredRows.every((row) => selectedIds[row.id])
            }
            onChange={(event) =>
              setSelectedIds(
                event.target.checked
                  ? Object.fromEntries(
                      filteredRows.map((row) => [row.id, true]),
                    )
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
        size: 140,
      },
      {
        id: "vendor",
        accessorFn: (row) => row.vendor,
        header: () => <span>Vendor</span>,
        cell: ({ row }) => row.original.vendor,
        size: 260,
      },
      {
        id: "amount",
        accessorFn: (row) => Number(row.amount.replace(/[$,]/g, "")),
        header: () => (
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span>Amount</span>
          </div>
        ),
        cell: ({ row }) => row.original.amount,
        size: 140,
      },
      {
        id: "dueIn",
        accessorFn: (row) => parseDueIn(row.dueIn),
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Due in</span>
          </div>
        ),
        cell: ({ row }) => row.original.dueIn,
        size: 120,
      },
      {
        id: "createdBy",
        accessorFn: (row) => row.createdBy,
        header: () => (
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Created by</span>
          </div>
        ),
        cell: ({ row }) => row.original.createdBy,
        size: 170,
      },
      {
        id: "add",
        header: () => <span>+</span>,
        cell: () => null,
        enableSorting: false,
        size: 44,
      },
    ],
    [filteredRows, selectedIds],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
      columnVisibility: {
        createdBy: showCreatedBy,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  function addPurchaseOrder() {
    setRows((current) => [
      {
        id: `ReminderDue-${current.length + 1}`,
        name: `PO-00${current.length + 1}`,
        vendor: "New Vendor",
        amount: "$6,000",
        dueIn: "7 days",
        createdBy: "Siddhi Gajjar",
      },
      ...current,
    ]);
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => "",
    },
    {
      label: "Ctrl K",
      muted: true,
    },
  ];
  return (
    <AppLayout
      title="Practice"
      activeModule="Practice"
      activeSubItem="Reminder Due"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-panel flex h-full flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
          <span className="text-[15px] font-medium text-slate-700">
            Reminder Due
          </span>
          <span className="text-[14px] text-slate-400">
            . {table.getRowModel().rows.length}
          </span>

          <div className="ml-auto flex items-center gap-6 text-[14px] text-slate-500">
            <button
              type="button"
              onClick={() => setShowOnlyHighValue((current) => !current)}
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() =>
                setSorting((current) =>
                  current[0]?.id === "dueIn"
                    ? [{ id: "dueIn", desc: !current[0].desc }]
                    : [{ id: "dueIn", desc: false }],
                )
              }
            >
              Sort
            </button>
            <button
              type="button"
              onClick={() => setShowCreatedBy((current) => !current)}
            >
              Options
            </button>
          </div>
        </div>

        <div className="border-b border-[#f0ece6] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            {showOnlyHighValue ? (
              <button
                type="button"
                onClick={() => setShowOnlyHighValue(false)}
                className="inline-flex items-center gap-2 rounded-md bg-[#eef3ff] px-3 py-1.5 text-[13px] font-medium text-[#5b71ad]"
              >
                <span className="text-[11px]">123</span>
                <span>Amount: {">="} $5,000</span>
                <span>x</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowOnlyHighValue(true)}
              className="text-[14px] text-slate-500"
            >
              + Add filter
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

              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  className="border-b border-[#f4f1ec] px-4 py-2 text-[13px] text-slate-400"
                >
                  <button
                    type="button"
                    onClick={addPurchaseOrder}
                    className="inline-flex items-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add New
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

export default ReminderDuePage;
