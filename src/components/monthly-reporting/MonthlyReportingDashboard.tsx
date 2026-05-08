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
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
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
import { EmptyStateIllustration } from "../shared/tablePageUtils";

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
  const [showFilterPanel, setShowFilterPanel] = useState(false);
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

  return (
    <AppLayout
      title="Monthly Reports"
      activeModule="Monthly Reports"
      activeSubItem="Dashboard"
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>Monthly Reporting Dashboard</span>
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
                    current[0]?.id === "dueDate"
                      ? [{ id: "dueDate", desc: !current[0].desc }]
                      : [{ id: "dueDate", desc: true }],
                  )
                }
              >
                Sort
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, status: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Submitted">Submitted</option>
              </select>
              <input
                type="text"
                placeholder="Search by practice..."
                value={filters.practiceName}
                onChange={(e) => {
                  setFilters((prev) => ({
                    ...prev,
                    practiceName: e.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px] w-48"
              />
              <input
                type="text"
                placeholder="Search by service..."
                value={filters.serviceName}
                onChange={(e) => {
                  setFilters((prev) => ({
                    ...prev,
                    serviceName: e.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px] w-48"
              />
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    search: "",
                    status: "",
                    practiceName: "",
                    serviceName: "",
                  })
                }
                disabled={
                  !filters.status &&
                  !filters.practiceName &&
                  !filters.serviceName
                }
                className="text-[13px] text-[#4f63ea] hover:underline disabled:opacity-40"
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex min-h-[300px] items-center justify-center gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-[13px]">Loading reports...</span>
              </div>
            ) : error && rows.length === 0 ? (
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
            ) : rows.length === 0 ? (
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
                <thead className="sticky top-0 z-10 bg-white text-[13px] font-medium text-slate-400">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header, index) => (
                        <th
                          key={header.id}
                          className={`border-b border-[#eeebe5] px-4 py-3 ${
                            index < headerGroup.headers.length - 1
                              ? "border-r border-[#f2eee8]"
                              : ""
                          }`}
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
        </div>

        {showDetailPanel && (
          <aside className="app-panel relative flex w-[500px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
                      <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Practice</span>
                          <span className="text-right text-slate-700">
                            {selectedReport.practiceName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Service</span>
                          <span className="text-right text-slate-700">
                            {selectedReport.serviceName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Status</span>
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                              statusStyles[selectedReport.status] ??
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {selectedReport.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Submitted By</span>
                          <span className="text-right text-slate-700">
                            {selectedReport.submittedBy || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Due Date</span>
                          <span className="text-right text-slate-700">
                            {selectedReport.dueDate || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Created</span>
                          <span className="text-right text-slate-700">
                            {new Date(
                              selectedReport.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

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
