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
  Grid2X2,
  History,
  LayoutGrid,
  ListFilter,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type DashboardRow = {
  id: string;
  title: string;
  titleAccent: string;
  createdBy: string;
  createdByTone: string;
  creationDate: string;
  lastUpdate: string;
};

type DashboardView = {
  id: string;
  label: string;
  defaultCreatedBy?: string;
  defaultSort?: "title" | "createdBy" | "creationDate" | "lastUpdate";
  defaultSortDirection?: "asc" | "desc";
};

const dashboardRows: DashboardRow[] = [
  {
    id: "1",
    title: "Operations",
    titleAccent: "bg-[#f4e7cf] text-[#8a6331]",
    createdBy: "CRM_API",
    createdByTone: "bg-[#dedede] text-[#3b3b3b]",
    creationDate: "about 2 months ago",
    lastUpdate: "about 2 months ago",
  },
  {
    id: "2",
    title: "Sales Pipeline",
    titleAccent: "bg-[#ece3ff] text-[#6f55b8]",
    createdBy: "CRM_API",
    createdByTone: "bg-[#dedede] text-[#3b3b3b]",
    creationDate: "about 2 months ago",
    lastUpdate: "about 2 months ago",
  },
  {
    id: "3",
    title: "Executive Dashboard",
    titleAccent: "bg-[#e9eefc] text-[#3f5aa7]",
    createdBy: "CRM_API",
    createdByTone: "bg-[#dedede] text-[#3b3b3b]",
    creationDate: "about 2 months ago",
    lastUpdate: "about 2 months ago",
  },
  {
    id: "4",
    title: "Customer Insights",
    titleAccent: "bg-[#fde9e1] text-[#a55840]",
    createdBy: "Jony Ive",
    createdByTone: "bg-[#f5ede4] text-[#84634a]",
    creationDate: "3 months ago",
    lastUpdate: "3 months ago",
  },
  {
    id: "5",
    title: "Team & Activity",
    titleAccent: "bg-[#e8f6eb] text-[#47855a]",
    createdBy: "Phil Schiller",
    createdByTone: "bg-[#edf6df] text-[#68873a]",
    creationDate: "3 months ago",
    lastUpdate: "3 months ago",
  },
  {
    id: "6",
    title: "Untitled",
    titleAccent: "bg-[#f5f5f5] text-[#9c9c9c]",
    createdBy: "Siddhi Gajjar",
    createdByTone: "bg-[#fff3cb] text-[#8f6c06]",
    creationDate: "7 days ago",
    lastUpdate: "7 days ago",
  },
  {
    id: "7",
    title: "Untitled",
    titleAccent: "bg-[#f5f5f5] text-[#9c9c9c]",
    createdBy: "Siddhi Gajjar",
    createdByTone: "bg-[#fff3cb] text-[#8f6c06]",
    creationDate: "7 days ago",
    lastUpdate: "7 days ago",
  },
  {
    id: "8",
    title: "Sales Overview",
    titleAccent: "bg-[#efe6ff] text-[#7554b8]",
    createdBy: "Tim Apple",
    createdByTone: "bg-[#ececec] text-[#585858]",
    creationDate: "3 months ago",
    lastUpdate: "3 months ago",
  },
];

const dashboardViews: DashboardView[] = [
  { id: "all", label: "All Dashboards" },
  {
    id: "crm-api",
    label: "CRM API Dashboards",
    defaultCreatedBy: "CRM_API",
    defaultSort: "title",
    defaultSortDirection: "asc",
  },
  {
    id: "recent",
    label: "Recently Updated",
    defaultSort: "lastUpdate",
    defaultSortDirection: "asc",
  },
];

const sortOptions = [
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "createdBy-asc", label: "Created by A-Z" },
  { value: "creationDate-asc", label: "Newest created" },
  { value: "lastUpdate-asc", label: "Recently updated" },
] as const;

type SortOptionValue = (typeof sortOptions)[number]["value"];

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

function DashboardPage() {
  const [rows, setRows] = useState(dashboardRows);
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedViewId, setSelectedViewId] = useState("all");
  const [savedViews, setSavedViews] = useState(dashboardViews);
  const [createdByFilter, setCreatedByFilter] = useState("CRM_API");
  const [titleQuery, setTitleQuery] = useState("");
  const [sortValue, setSortValue] = useState<SortOptionValue>("title-asc");
  const [showOptions, setShowOptions] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState({
    title: true,
    createdBy: true,
    creationDate: true,
    lastUpdate: true,
  });

  const currentView =
    savedViews.find((view) => view.id === selectedViewId) ?? savedViews[0];

  const createdByOptions = useMemo(
    () => [...new Set(rows.map((row) => row.createdBy))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesCreatedBy =
        !createdByFilter || row.createdBy === createdByFilter;
      const matchesTitle = row.title
        .toLowerCase()
        .includes(titleQuery.trim().toLowerCase());

      return matchesCreatedBy && matchesTitle;
    });
  }, [createdByFilter, rows, titleQuery]);

  const sorting = useMemo<SortingState>(() => {
    const [id, direction] = sortValue.split("-") as [
      "title" | "createdBy" | "creationDate" | "lastUpdate",
      "asc" | "desc",
    ];

    return [{ id, desc: direction === "desc" }];
  }, [sortValue]);

  const columns = useMemo<ColumnDef<DashboardRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={
              filteredRows.length > 0 &&
              filteredRows.every((row) => selectedRowIds[row.id])
            }
            onChange={(event) => {
              const checked = event.target.checked;
              setSelectedRowIds(
                checked
                  ? Object.fromEntries(filteredRows.map((row) => [row.id, true]))
                  : {},
              );
            }}
            className="h-4 w-4 rounded border border-[#c8c8c8]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={Boolean(selectedRowIds[row.original.id])}
            onChange={(event) =>
              setSelectedRowIds((current) => ({
                ...current,
                [row.original.id]: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border border-[#c8c8c8]"
          />
        ),
        enableSorting: false,
        size: 44,
      },
      {
        id: "title",
        accessorFn: (row) => row.title,
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Title</span>
          </div>
        ),
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium ${row.original.titleAccent}`}
          >
            {row.original.title}
          </span>
        ),
        size: 250,
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
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${row.original.createdByTone}`}
          >
            {row.original.createdBy}
          </span>
        ),
        size: 180,
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
        size: 160,
      },
      {
        id: "lastUpdate",
        accessorFn: (row) => parseRelativeAge(row.lastUpdate),
        header: () => (
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-slate-400" />
            <span>Last update</span>
          </div>
        ),
        cell: ({ row }) => row.original.lastUpdate,
        size: 160,
      },
      {
        id: "add",
        header: () => <span className="text-slate-400">+</span>,
        cell: () => null,
        enableSorting: false,
        size: 40,
      },
    ],
    [filteredRows, selectedRowIds],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
      columnVisibility: {
        title: visibleColumns.title,
        createdBy: visibleColumns.createdBy,
        creationDate: visibleColumns.creationDate,
        lastUpdate: visibleColumns.lastUpdate,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  function applyView(viewId: string) {
    const view = savedViews.find((entry) => entry.id === viewId);
    setSelectedViewId(viewId);
    setCreatedByFilter(view?.defaultCreatedBy ?? "");
    setTitleQuery("");

    if (view?.defaultSort && view.defaultSortDirection) {
      setSortValue(
        `${view.defaultSort}-${view.defaultSortDirection}` as SortOptionValue,
      );
    } else {
      setSortValue("title-asc");
    }
  }

  function resetControls() {
    applyView(selectedViewId);
    setVisibleColumns({
      title: true,
      createdBy: true,
      creationDate: true,
      lastUpdate: true,
    });
    setShowOptions(false);
  }

  function saveCurrentView() {
    const nextIndex = savedViews.length + 1;
    const nextView: DashboardView = {
      id: `custom-${nextIndex}`,
      label: `Saved View ${nextIndex}`,
      defaultCreatedBy: createdByFilter || undefined,
      defaultSort: sortValue.split("-")[0] as DashboardView["defaultSort"],
      defaultSortDirection: sortValue.split("-")[1] as "asc" | "desc",
    };

    setSavedViews((current) => [...current, nextView]);
    setSelectedViewId(nextView.id);
  }

  function addNewRecord() {
    const nextId = String(rows.length + 1);
    setRows((current) => [
      {
        id: nextId,
        title: `Untitled ${nextId}`,
        titleAccent: "bg-[#f5f5f5] text-[#9c9c9c]",
        createdBy: "Siddhi Gajjar",
        createdByTone: "bg-[#fff3cb] text-[#8f6c06]",
        creationDate: "0 days ago",
        lastUpdate: "0 days ago",
      },
      ...current,
    ]);
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: addNewRecord,
    },
    {
      label: "Ctrl K",
      muted: true,
    },
  ];

  return (
    <AppLayout
      title="Dashboards"
      activeModule="Dashboards"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e8e3db] bg-white">
        <div className="flex items-center justify-between border-b border-[#eeebe5] px-4 py-2.5">
          <div className="relative">
            <Grid2X2 className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedViewId}
              onChange={(event) => applyView(event.target.value)}
              className="min-w-56 appearance-none rounded-md bg-transparent py-1.5 pl-8 pr-10 text-[14px] font-medium text-slate-700 outline-none"
            >
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-5 text-[13px] text-slate-500">
            <button
              type="button"
              className="hover:text-slate-700"
              onClick={() => setShowFilterBar((current) => !current)}
            >
              Filter
            </button>
            <select
              value={sortValue}
              onChange={(event) => setSortValue(event.target.value as SortOptionValue)}
              className="bg-transparent outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="relative">
              <button
                type="button"
                className="hover:text-slate-700"
                onClick={() => setShowOptions((current) => !current)}
              >
                Options
              </button>

              {showOptions ? (
                <div className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-[#ebe6de] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                  {(
                    [
                      ["title", "Title"],
                      ["createdBy", "Created by"],
                      ["creationDate", "Creation date"],
                      ["lastUpdate", "Last update"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-slate-600 hover:bg-[#f7f5f1]"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[key]}
                        onChange={(event) =>
                          setVisibleColumns((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#f1ede8] px-4 py-2">
          <span className="text-[12px] text-slate-400">
            {currentView.label} . {table.getRowModel().rows.length}
          </span>

          <div className="flex items-center gap-4 text-[13px]">
            <button
              type="button"
              onClick={resetControls}
              className="text-slate-400 hover:text-slate-600"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={saveCurrentView}
              className="rounded-md border border-[#dcd6ff] px-2.5 py-1 text-[#6c63d9] hover:bg-[#f7f5ff]"
            >
              Save as new view
            </button>
          </div>
        </div>

        {showFilterBar ? (
          <div className="flex items-center justify-between border-b border-[#f1ede8] px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              {createdByFilter ? (
                <button
                  type="button"
                  onClick={() => setCreatedByFilter("")}
                  className="inline-flex items-center gap-1 rounded-md bg-[#f0ecff] px-2 py-1 text-[12px] font-medium text-[#6c63d9]"
                >
                  <span>Created by: {createdByFilter}</span>
                  <span>x</span>
                </button>
              ) : null}

              <div className="relative">
                <ListFilter className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-300" />
                <select
                  value={createdByFilter}
                  onChange={(event) => setCreatedByFilter(event.target.value)}
                  className="rounded-md border border-transparent bg-transparent py-1 pl-7 pr-2 text-[13px] text-slate-500 outline-none hover:border-[#ebe6de] hover:bg-[#faf9f7]"
                >
                  <option value="">Add filter</option>
                  {createdByOptions.map((option) => (
                    <option key={option} value={option}>
                      Created by: {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-300" />
                <input
                  value={titleQuery}
                  onChange={(event) => setTitleQuery(event.target.value)}
                  placeholder="Filter title"
                  className="rounded-md border border-[#ece8e1] bg-white py-1 pl-7 pr-2 text-[13px] text-slate-600 outline-none"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-[#f1ede8] border-r border-[#f4f1ec] px-3 py-2 text-left text-[12.5px] font-medium text-slate-400 last:border-r-0"
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
                <tr key={row.id} className="bg-white">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-1.5 text-[13px] text-slate-600 last:border-r-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-b border-[#f4f1ec] px-4 py-2 text-[13px] text-slate-400">
            <button
              type="button"
              onClick={addNewRecord}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New
            </button>
          </div>

          <div className="px-8 py-2 text-[13px] text-slate-400">
            <button type="button" className="inline-flex items-center gap-2">
              Calculate
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default DashboardPage;
