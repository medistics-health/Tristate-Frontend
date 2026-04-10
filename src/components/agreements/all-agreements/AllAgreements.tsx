import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type ColumnDef,
  type VisibilityState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import {
  AvatarPill,
  DetailSidePanel,
  getStandardNavbarActions,
  type DetailTabId,
} from "../../shared/PageComponents";
import type {
  AgreementsCellValue,
  AgreementsField,
  AgreementsRow,
  AgreementsUserValue,
  AgreementsViewData,
} from "../types";

type AgreementsTanstackContentProps = {
  data: AgreementsViewData;
};

function getFieldPrefix(type: AgreementsField["type"]) {
  switch (type) {
    case "text":
      return "Abc";
    case "date":
      return "Cal";
    case "user":
      return "Usr";
    case "relation":
      return "Rel";
    default:
      return "123";
  }
}

function isUserValue(value: AgreementsCellValue): value is AgreementsUserValue {
  return Boolean(
    value &&
    typeof value === "object" &&
    "name" in value &&
    "initials" in value,
  );
}

function getSortableValue(value: AgreementsCellValue) {
  if (isUserValue(value)) {
    return value.name;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return value;
}

function renderCellValue(field: AgreementsField, value: AgreementsCellValue) {
  if (field.id === "name" && typeof value === "string") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#f3f2f0] px-2.5 py-1 text-slate-500">
        {value}
      </span>
    );
  }

  if (isUserValue(value)) {
    return <AvatarPill name={value.name} />;
  }

  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-300">—</span>;
  }

  return String(value);
}

const agreementsViewMock: AgreementsViewData = {
  viewId: "5b2b90da-f741-47fe-8672-df3ec8359c2a",
  title: "All Agreements",
  totalCount: 3,
  fields: [
    { id: "name", label: "Name", type: "text", visible: true },
    {
      id: "creationDate",
      label: "Creation date",
      type: "date",
      visible: true,
    },
    {
      id: "lastUpdate",
      label: "Last update",
      type: "date",
      visible: true,
    },
    { id: "updatedBy", label: "Updated by", type: "user", visible: true },
    { id: "createdBy", label: "Created by", type: "user", visible: true },
    { id: "deletedAt", label: "Deleted at", type: "date", visible: false },
    {
      id: "effectiveDate",
      label: "Effective Date",
      type: "date",
      visible: false,
    },
    { id: "id", label: "Id", type: "text", visible: false },
    { id: "practice", label: "Practice", type: "relation", visible: false },
    {
      id: "renewalDate",
      label: "Renewal Date",
      type: "date",
      visible: false,
    },
    { id: "status", label: "Status", type: "text", visible: false },
    {
      id: "terminationDate",
      label: "Termination Date",
      type: "date",
      visible: false,
    },
    { id: "type", label: "Type", type: "text", visible: false },
    { id: "value", label: "Value", type: "text", visible: false },
  ],
  rows: [
    {
      id: "agreement-1",
      values: {
        id: "AGR-001",
        name: "TriState Radiology Services",
        creationDate: "Mar 23, 2026 6:47 PM",
        lastUpdate: "Apr 01, 2026 10:12 AM",
        updatedBy: {
          name: "Siddhi Gajjar",
          initials: "SG",
        },
        createdBy: {
          name: "Riya Shah",
          initials: "RS",
        },
        deletedAt: null,
        effectiveDate: "Apr 15, 2026",
        practice: "TriState Imaging",
        renewalDate: "Apr 15, 2027",
        status: "Active",
        terminationDate: "Apr 14, 2028",
        type: "MSA",
        value: "$128,000",
      },
    },
    {
      id: "agreement-2",
      values: {
        id: "AGR-002",
        name: "Hudson Valley Teleradiology",
        creationDate: "Feb 11, 2026 2:05 PM",
        lastUpdate: "Mar 30, 2026 4:25 PM",
        updatedBy: {
          name: "Nikhil Patel",
          initials: "NP",
        },
        createdBy: {
          name: "Siddhi Gajjar",
          initials: "SG",
        },
        deletedAt: null,
        effectiveDate: "May 01, 2026",
        practice: "Hudson Valley Partners",
        renewalDate: "May 01, 2027",
        status: "Pending Signature",
        terminationDate: "Apr 30, 2028",
        type: "NDA",
        value: "$42,500",
      },
    },
    {
      id: "agreement-3",
      values: {
        id: "AGR-003",
        name: "Empire Diagnostics Network",
        creationDate: "Jan 19, 2026 9:18 AM",
        lastUpdate: "Apr 05, 2026 1:40 PM",
        updatedBy: {
          name: "Aarav Mehta",
          initials: "AM",
        },
        createdBy: {
          name: "Nikhil Patel",
          initials: "NP",
        },
        deletedAt: "Apr 06, 2026 9:00 AM",
        effectiveDate: "Jan 20, 2026",
        practice: "Empire Diagnostics",
        renewalDate: "Jan 20, 2027",
        status: "Archived",
        terminationDate: "Jan 19, 2028",
        type: "BAA",
        value: "$76,900",
      },
    },
  ],
};

function AllAgreementsPage() {
  const [data, setData] = useState<AgreementsViewData | null>(
    agreementsViewMock,
  );

  const [rows, setRows] = useState(data.rows);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabId>("home");

  const [fieldQuery, setFieldQuery] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () =>
      Object.fromEntries(data.fields.map((field) => [field.id, field.visible])),
  );

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const columns = useMemo<ColumnDef<AgreementsRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <span className="flex h-4 w-4 rounded border border-[#bbb8b2]" />
        ),
        cell: () => (
          <span className="flex h-4 w-4 rounded border border-[#bbb8b2]" />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 52,
      },
      ...data.fields.map((field) => ({
        id: field.id,
        accessorFn: (row: AgreementsRow) =>
          getSortableValue(row.values[field.id]),
        header: () => (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">{getFieldPrefix(field.type)}</span>
            <span>{field.label}</span>
          </div>
        ),
        cell: ({ row }: { row: { original: AgreementsRow } }) => (
          <button
            type="button"
            onClick={() => {
              if (field.id === "name") {
                setSelectedRowId(row.original.id);
                setShowDetailPanel(true);
                setIsFilterPanelOpen(false);
              }
            }}
            className={field.id === "name" ? "hover:text-[#4f63ea]" : ""}
          >
            {renderCellValue(field, row.original.values[field.id])}
          </button>
        ),
        size: field.id === "name" ? 280 : 220,
      })),
    ],
    [data.fields],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredVisibleFields = data.fields.filter(
    (field) =>
      columnVisibility[field.id] !== false &&
      field.label.toLowerCase().includes(fieldQuery.trim().toLowerCase()),
  );

  const filteredHiddenFields = data.fields.filter(
    (field) =>
      columnVisibility[field.id] === false &&
      field.label.toLowerCase().includes(fieldQuery.trim().toLowerCase()),
  );

  function toggleFieldVisibility(fieldId: string) {
    table.getColumn(fieldId)?.toggleVisibility();
  }

  function addRow() {
    const nextId = `new-agreement-${rows.length + 1}`;
    const newRow: AgreementsRow = {
      id: nextId,
      values: {
        name: `New Agreement ${rows.length + 1}`,
        status: "Draft",
        type: "Master Service Agreement",
        effective_date: "2026-04-09",
        expiration_date: "2027-04-09",
        practice: "TriState Imaging",
      },
    };
    setRows((current) => [newRow, ...current]);
    setSelectedRowId(nextId);
    setShowDetailPanel(true);
    setIsFilterPanelOpen(false);
  }

  return (
    <AppLayout
      title="Agreements"
      activeModule="Agreements"
      activeSubItem="All Agreements"
      navbarActions={getStandardNavbarActions(addRow)}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center border-b border-[#efebe4] px-4 py-3">
            <div className="flex items-center gap-2 text-[15px] font-medium text-slate-700">
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4 text-slate-500"
                fill="none"
              >
                <path
                  d="M4.5 5.5H15.5M4.5 10H15.5M4.5 14.5H15.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>{data.title}</span>
              <span className="text-slate-400">
                . {table.getRowModel().rows.length}
              </span>
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400">
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="ml-auto flex items-center gap-6 text-[14px] text-slate-500">
              <button
                className={`font-medium ${
                  isFilterPanelOpen ? "text-slate-700" : "text-slate-500"
                }`}
                onClick={() => {
                  setIsFilterPanelOpen((current) => !current);
                  setShowDetailPanel(false);
                }}
              >
                Filter
              </button>
              <button
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
                onClick={() =>
                  data.fields.forEach((field) => {
                    table.getColumn(field.id)?.toggleVisibility(true);
                  })
                }
              >
                Reset
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-white text-[13px] font-medium text-slate-400">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        className={`border-b border-[#efebe4] px-4 py-3 ${
                          index < headerGroup.headers.length - 1
                            ? "border-r border-[#f2eee8]"
                            : ""
                        } ${index === 0 ? "w-[52px] text-center" : ""}`}
                        style={{
                          width: header.getSize()
                            ? `${header.getSize()}px`
                            : undefined,
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={`w-full ${
                              index === 0 ? "flex justify-center" : "text-left"
                            } ${
                              header.column.getCanSort()
                                ? "cursor-pointer"
                                : "cursor-default"
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
              <tbody className="text-[14px] text-slate-600">
                {table.getRowModel().rows.map((row) => (
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
                        className={`border-b border-[#f4f1ec] px-4 py-3 align-middle ${
                          index < row.getVisibleCells().length - 1
                            ? "border-r border-[#f5f2ed]"
                            : ""
                        } ${index === 0 ? "text-center" : ""}`}
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

            <div className="border-b border-[#f4f1ec] px-4 py-3 text-[14px] text-slate-400">
              {table.getRowModel().rows.length === 0 ? (
                "No agreements match the current filters."
              ) : (
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add New
                </button>
              )}
            </div>
          </div>
        </div>

        {isFilterPanelOpen ? (
          <aside className="w-[348px] border border-[#efebe4] bg-[#fcfbf9] shadow-[-8px_0_24px_rgba(15,23,42,0.06)] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[#efebe4] px-4 py-3">
              <button
                className="text-xl leading-none text-slate-400"
                onClick={() => setIsFilterPanelOpen(false)}
              >
                ×
              </button>
              <h2 className="text-[15px] font-medium text-slate-700">Filter</h2>
            </div>

            <div className="h-[calc(100%-53px)] overflow-y-auto">
              <div className="border-b border-[#efebe4] px-4 py-3">
                <input
                  type="text"
                  value={fieldQuery}
                  onChange={(event) => setFieldQuery(event.target.value)}
                  placeholder="Search fields"
                  className="w-full bg-transparent text-[14px] text-slate-500 outline-none placeholder:text-slate-300"
                />
              </div>

              <div className="border-b border-[#efebe4] px-4 py-3">
                <input
                  type="text"
                  value={
                    (table.getColumn("name")?.getFilterValue() as string) ?? ""
                  }
                  onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
                  }
                  placeholder="Filter agreements by name"
                  className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-2 text-[14px] text-slate-500 outline-none placeholder:text-slate-300"
                />
              </div>

              <div className="px-4 py-3">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.03em] text-slate-300">
                  Visible fields
                </p>
                <div className="space-y-1">
                  {filteredVisibleFields.map((field) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => toggleFieldVisibility(field.id)}
                      className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left text-[14px] text-slate-600"
                    >
                      <span className="text-[11px] text-slate-400">
                        {getFieldPrefix(field.type)}
                      </span>
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#efebe4] bg-[#f7f5f1] px-4 py-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.03em] text-slate-300">
                  Hidden fields
                </p>
              </div>

              <div className="px-4 py-3">
                <div className="space-y-1">
                  {filteredHiddenFields.map((field) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => toggleFieldVisibility(field.id)}
                      className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left text-[14px] text-slate-500"
                    >
                      <span className="text-[11px] text-slate-400">
                        {getFieldPrefix(field.type)}
                      </span>
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        ) : null}

        {showDetailPanel && selectedRow && (
          <DetailSidePanel
            isOpen={showDetailPanel}
            onClose={() => setShowDetailPanel(false)}
            title={String(selectedRow.values.name || "")}
            onTitleChange={(newTitle) => {
              setRows((current) =>
                current.map((row) =>
                  row.id === selectedRow.id
                    ? { ...row, values: { ...row.values, name: newTitle } }
                    : row,
                ),
              );
            }}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onDelete={() => {
              setRows((current) =>
                current.filter((r) => r.id !== selectedRow.id),
              );
              setShowDetailPanel(false);
            }}
            metadata={data.fields
              .filter((f) => f.id !== "name")
              .map((field) => ({
                label: (
                  <>
                    <span className="text-[11px]">
                      {getFieldPrefix(field.type)}
                    </span>
                    <span>{field.label}</span>
                  </>
                ),
                value: renderCellValue(field, selectedRow.values[field.id]),
              }))}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default AllAgreementsPage;
