import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  Circle,
  LayoutList,
  Plus,
  Save,
  Trash2,
  FileText,
  BarChart3,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import {
  getMonthlyReportsView,
  getMonthlyReport,
  updateMonthlyReport,
  deleteMonthlyReport,
} from "../../services/operations/monthlyReports";
import { getAllPractices } from "../../services/operations/practices";
import { getAllServices } from "../../services/operations/services";
import type { MonthlyReportRow, MonthlyReport } from "./types";
import type { Practice } from "../practices/types";
import type { Service } from "../services/types";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";

const statusStyles: Record<string, string> = {
  Submitted: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function MonthlyReportingDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MonthlyReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    practiceName: "",
    serviceName: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(
    null,
  );
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "metrics">(
    "overview",
  );
  const [practices, setPractices] = useState<Practice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [editMetrics, setEditMetrics] = useState<Record<string, string>>({});

  const [editMonth, setEditMonth] = useState("");
  const [editYear, setEditYear] = useState<number>(new Date().getFullYear());

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          setError(null);
          const params: Record<string, unknown> = {
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search || undefined,
            status: filters.status || undefined,
            practiceName: filters.practiceName || undefined,
            serviceName: filters.serviceName || undefined,
          };
          if (sorting[0]?.id) {
            params.sortBy = sorting[0].id;
            params.sortOrder = sorting[0]?.desc ? "desc" : "asc";
          }

          const data = await getMonthlyReportsView(params as any);
          setRows(data.rows);
          setPagination(data.pagination);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to load reports";
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

  useEffect(() => {
    if (showDetailPanel && practices.length === 0) {
      getAllPractices()
        .then(setPractices)
        .catch(() => {});
      getAllServices()
        .then(setServices)
        .catch(() => {});
    }
  }, [showDetailPanel, practices.length]);

  async function refreshRows() {
    const params: Record<string, unknown> = {
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search || undefined,
      status: filters.status || undefined,
      practiceName: filters.practiceName || undefined,
      serviceName: filters.serviceName || undefined,
    };
    if (sorting[0]?.id) {
      params.sortBy = sorting[0].id;
      params.sortOrder = sorting[0]?.desc ? "desc" : "asc";
    }
    const data = await getMonthlyReportsView(params as any);
    setRows(data.rows);
    setPagination(data.pagination);
  }

  const columns = useMemo<ColumnDef<MonthlyReportRow>[]>(
    () => [
      {
        id: "practiceName",
        accessorFn: (r) => r.values.practiceName,
        header: () => "Practice",
        cell: ({ row }) => (
          <span className="font-medium text-slate-700">
            {row.original.values.practiceName}
          </span>
        ),
      },
      {
        id: "serviceName",
        accessorFn: (r) => r.values.serviceName,
        header: () => "Service",
        cell: ({ row }) => <span>{row.original.values.serviceName}</span>,
      },
      {
        id: "status",
        accessorFn: (r) => r.values.status,
        header: () => "Status",
        cell: ({ row }) => {
          const s = row.original.values.status;
          return (
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                statusStyles[s] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {s}
            </span>
          );
        },
      },
      {
        id: "submittedBy",
        accessorFn: (r) => r.values.submittedBy,
        header: () => "Submitted By",
        cell: ({ row }) => (
          <span className="text-slate-600">
            {row.original.values.submittedBy}
          </span>
        ),
      },
      {
        id: "dueDate",
        accessorFn: (r) => r.values.dueDate,
        header: () => "Due Date",
        cell: ({ row }) => (
          <span className="text-slate-600">{row.original.values.dueDate}</span>
        ),
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
  });

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setActiveTab("overview");
    setIsDetailLoading(true);
    setSelectedReport(null);

    try {
      const report = await getMonthlyReport(rowId);
      setSelectedReport(report);
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(report.metrics)) {
        flat[k] = String(v ?? "");
      }
      setEditMetrics(flat);
      setEditMonth(report.month);
      setEditYear(report.year);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch report";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedReport(null);
    setEditMetrics({});
  }

  async function handleUpdateReport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReport) return;

    setIsSaving(true);
    try {
      const numericMetrics: Record<string, number> = {};
      for (const [k, v] of Object.entries(editMetrics)) {
        numericMetrics[k] = Number(v) || 0;
      }

      await updateMonthlyReport(selectedReport.id, {
        practiceId: selectedReport.practiceId,
        practiceName: selectedReport.practiceName,
        serviceName: selectedReport.serviceName,
        serviceId: selectedReport.serviceId,
        month: editMonth,
        year: editYear,
        metrics: numericMetrics as any,
      });

      const data = await getMonthlyReportsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      setSelectedReport((prev) =>
        prev
          ? {
              ...prev,
              metrics: numericMetrics,
              month: editMonth,
              year: editYear,
            }
          : prev,
      );
      toast.success("Report updated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update report";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteReport() {
    if (!selectedRowId) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    setIsDeleting(true);
    try {
      await deleteMonthlyReport(selectedRowId);
      const data = await getMonthlyReportsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeDetailPanel();
      toast.success("Report deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete report";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleMetricEdit(key: string, value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setEditMetrics((prev) => ({ ...prev, [key]: value }));
  }

  const navbarActions = [
    {
      label: "Submit Report",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => navigate("/monthly-reporting/submit"),
    },
  ];

  const activeFilterCount = [
    filters.status,
    filters.practiceName,
    filters.serviceName,
  ].filter(Boolean).length;

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.status) {
      chips.push({
        key: "status",
        label: "Status",
        displayValue: filters.status,
        onClear: () => {
          setFilters((curr) => ({ ...curr, status: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.practiceName) {
      chips.push({
        key: "practiceName",
        label: "Practice",
        displayValue: filters.practiceName,
        onClear: () => {
          setFilters((curr) => ({ ...curr, practiceName: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.serviceName) {
      chips.push({
        key: "serviceName",
        label: "Service",
        displayValue: filters.serviceName,
        onClear: () => {
          setFilters((curr) => ({ ...curr, serviceName: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters.status, filters.practiceName, filters.serviceName]);

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Status
        </span>
        <Select
          value={filters.status}
          onChange={(val) => {
            setFilters((prev) => ({ ...prev, status: val }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          options={[
            { label: "All Statuses", value: "" },
            { label: "Pending", value: "Pending" },
            { label: "Submitted", value: "Submitted" },
          ]}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Practice
        </span>
        <input
          type="text"
          placeholder="Search by practice..."
          value={filters.practiceName}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, practiceName: e.target.value }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Service
        </span>
        <input
          type="text"
          placeholder="Search by service..."
          value={filters.serviceName}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, serviceName: e.target.value }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
        />
      </label>
    </>
  );

  return (
    <AppLayout
      title="Monthly Reports"
      activeModule="Monthly Reports"
      activeSubItem="Dashboard"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="app-split">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Monthly Reporting Dashboard"
            subtitle="Monthly Reports"
            searchPlaceholder="Search reports..."
            searchValue={filters.search}
            onSearchChange={(value) => {
              setFilters((prev) => ({ ...prev, search: value }));
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={() => {
              setFilters({
                search: "",
                status: "",
                practiceName: "",
                serviceName: "",
              });
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            filterModalTitle="Filter Reports"
            filterFields={filterFieldsModal}
            addNewLabel="Submit Report"
            onAddNew={() => navigate("/monthly-reporting/submit")}
            onRefresh={async () => {
              try {
                setIsLoading(true);
                await refreshRows();
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : "Failed to load reports";
                setError(message);
                toast.error(message);
              } finally {
                setIsLoading(false);
              }
            }}
            isLoading={isLoading}
            isSaving={isSaving}
            isDeleting={isDeleting}
            extraActions={
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "dueDate"
                      ? [{ id: "dueDate", desc: !current[0].desc }]
                      : [{ id: "dueDate", desc: true }],
                  )
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1] hover:border-[#dcd6cb] transition-colors"
              >
                Sort
              </button>
            }
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
            onPageSizeChange={(newSize) =>
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }))
            }
          >

            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {!isLoading && error && rows.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
                  <div className="text-[13px] text-red-500">{error}</div>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="app-control rounded-md px-4 py-2 text-[13px] font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : !isLoading && rows.length === 0 ? (
              <div className="relative flex min-h-[400px] items-center justify-center">
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    No reports found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Submit your first monthly report to get started
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/monthly-reporting/submit")}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Submit Report
                  </button>
                </div>
              </div>
            ) : (
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
                          >
                            <SortableHeaderCell header={header} />
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
                          className={`border-b border-[#f4f1ec] px-4 py-3 ${
                            index < row.getVisibleCells().length - 1
                              ? "border-r border-[#f5f2ed]"
                              : ""
                          }`}
                        >
                          {cell.column.id === "practiceName" ? (
                            <button
                              type="button"
                              onClick={() => handleRowClick(row.original.id)}
                              className="hover:text-[#4f63ea]"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </button>
                          ) : (
                            flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </DataTableToolbar>
        </section>

        {showDetailPanel && (
          <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[500px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
                {selectedRow?.values.practiceName
                  ? `${selectedRow.values.practiceName} - ${selectedRow.values.serviceName}`
                  : "Report"}
              </span>
            </div>

            <div className="flex items-center gap-1 border-b border-[#f0ece6] px-4">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium ${
                  activeTab === "overview"
                    ? "border-[#4f63ea] text-[#4f63ea]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("metrics")}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium ${
                  activeTab === "metrics"
                    ? "border-[#4f63ea] text-[#4f63ea]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Metrics
              </button>
            </div>

            {isDetailLoading || !selectedReport ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading report...
              </div>
            ) : (
              <>
                {activeTab === "overview" && (
                  <form
                    onSubmit={handleUpdateReport}
                    className="flex flex-1 flex-col overflow-hidden"
                  >
                    <div className="flex-1 overflow-auto p-4">
                      <DetailCard
                        title={`${selectedReport.practiceName} - ${selectedReport.serviceName}`}
                        badge={selectedReport.status ? { label: selectedReport.status, className: statusStyles[selectedReport.status] ?? "bg-slate-100 text-slate-600" } : null}
                        infoRows={[
                          ...(selectedReport.submittedBy ? [{ label: "Submitted By", value: selectedReport.submittedBy }] : []),
                          ...(selectedReport.dueDate ? [{ label: "Due Date", value: selectedReport.dueDate }] : []),
                        ]}
                      />

                      <div className="space-y-4">
                        <div>
                          <label className="mb-1 block text-[13px] font-medium text-slate-700">
                            Month
                          </label>
                          <select
                            value={editMonth}
                            onChange={(e) => setEditMonth(e.target.value)}
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          >
                            {months.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[13px] font-medium text-slate-700">
                            Year
                          </label>
                          <select
                            value={editYear}
                            onChange={(e) =>
                              setEditYear(Number(e.target.value))
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          >
                            {Array.from(
                              { length: 5 },
                              (_, i) => new Date().getFullYear() - 2 + i,
                            )
                              .filter((y) => y <= new Date().getFullYear())
                              .map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                      <button
                        type="button"
                        onClick={handleDeleteReport}
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

                {activeTab === "metrics" && (
                  <form
                    onSubmit={handleUpdateReport}
                    className="flex flex-1 flex-col overflow-hidden"
                  >
                    <div className="flex-1 overflow-auto p-4">
                      <div className="space-y-4">
                        {Object.keys(editMetrics).length > 0 ? (
                          Object.entries(editMetrics).map(([key, value]) => (
                            <div key={key}>
                              <label className="mb-1 block text-[13px] font-medium text-slate-700">
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (s) => s.toUpperCase())}
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={value}
                                onChange={(e) =>
                                  handleMetricEdit(key, e.target.value)
                                }
                                placeholder="0"
                                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                              />
                            </div>
                          ))
                        ) : (
                          <div className="text-[13px] text-slate-400">
                            No metrics data available
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                      <button
                        type="button"
                        onClick={handleDeleteReport}
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
              </>
            )}
          </aside>
        )}
      </div>
    </AppLayout>
  );
}

export default MonthlyReportingDashboard;
