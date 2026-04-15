import {
  ChevronLeft,
  Circle,
  LayoutList,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import type { AuditRow, Audit } from "./types";
import {
  createAuditApi,
  deleteAuditApi,
  getAudit,
  getAuditsView,
  updateAuditApi,
} from "../../services/operations/audits";
import { getAllPractices } from "../../services/operations/practices";
import type { Practice } from "../practices/types";
import toast from "react-hot-toast";

type AuditListViewProps = {
  viewLabel: string;
  activeSubItem: string;
  title: string;
  showPracticeFilter?: boolean;
  practiceId?: string;
};

const auditTypeOptions = [
  "COMPLIANCE",
  "CODING",
  "DOCUMENTATION",
  "REVENUE_CYCLE",
  "OPERATIONAL",
];

const typeColors: Record<string, string> = {
  COMPLIANCE: "bg-green-100 text-green-700",
  CODING: "bg-blue-100 text-blue-700",
  DOCUMENTATION: "bg-orange-100 text-orange-700",
  REVENUE_CYCLE: "bg-cyan-100 text-cyan-700",
  OPERATIONAL: "bg-purple-100 text-purple-700",
  SECURITY: "bg-red-100 text-red-700",
  QUALITY: "bg-indigo-100 text-indigo-700",
  FINANCIAL: "bg-yellow-100 text-yellow-700",
};

function AuditListView({
  viewLabel,
  activeSubItem,
  title,
  showPracticeFilter,
  practiceId,
}: AuditListViewProps) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ search: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [practicesLoading, setPracticesLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);
  const [formData, setFormData] = useState({
    practiceId: practiceId || "",
    type: "COMPLIANCE" as string,
    score: "",
    findings: "",
    recommendations: "",
  });

  const [editForm, setEditForm] = useState({
    practiceId: "",
    type: "COMPLIANCE" as string,
    score: "",
    findings: "",
    recommendations: "",
  });

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const columns = useMemo(
    () =>
      [
        {
          id: "type",
          accessorFn: (row: AuditRow) => row.values.type,
          header: () => "Type",
          cell: ({ row }: { row: { original: AuditRow } }) => (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[String(row.original.values.type)] || ""}`}
            >
              {String(row.original.values.type)}
            </span>
          ),
        },
        {
          id: "score",
          accessorFn: (row: AuditRow) => row.values.score,
          header: () => "Score",
          cell: ({ row }: { row: { original: AuditRow } }) =>
            String(row.original.values.score ?? "-"),
        },
        {
          id: "practiceName",
          accessorFn: (row: AuditRow) => row.values.practiceName,
          header: () => "Practice",
          cell: ({ row }: { row: { original: AuditRow } }) =>
            String(row.original.values.practiceName || "-"),
        },
        {
          id: "creationDate",
          accessorFn: (row: AuditRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: AuditRow } }) =>
            String(row.original.values.creationDate),
        },
        {
          id: "lastUpdate",
          accessorFn: (row: AuditRow) => row.values.lastUpdate,
          header: () => "Last Update",
          cell: ({ row }: { row: { original: AuditRow } }) =>
            String(row.original.values.lastUpdate),
        },
      ] as ColumnDef<AuditRow>[],
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

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          setError(null);
          const params: Record<string, unknown> = {
            page: pagination.page,
            limit: pagination.limit,
            sortBy: sorting[0]?.id || "createdAt",
            sortOrder: sorting[0]?.desc ? "desc" : "asc",
          };
          if (filters.search) params.search = filters.search;
          if (filters.type) params.type = filters.type;
          if (showPracticeFilter && practiceId) params.practiceId = practiceId;

          const data = await getAuditsView(params as any);
          setRows(data.rows);
          setPagination(data.pagination);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to load audits";
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
  }, [pagination.page, pagination.limit, sorting, filters, practiceId]);

  // useEffect(() => {
  //   setPagination((prev) => ({ ...prev, page: 1 }));
  // }, [filters, sorting]);

  useEffect(() => {
    if ((showCreateForm || showFilterPanel) && practices.length === 0) {
      setPracticesLoading(true);
      getAllPractices()
        .then(setPractices)
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setPracticesLoading(false));
    }
  }, [showCreateForm, showFilterPanel]);

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const audit = await getAudit(rowId);
      setSelectedAudit(audit);
      setEditForm({
        practiceId: audit.practiceId || "",
        type: audit.type,
        score: String(audit.score || ""),
        findings:
          typeof audit.findings === "object"
            ? JSON.stringify(audit.findings)
            : "",
        recommendations:
          typeof audit.recommendations === "object"
            ? JSON.stringify(audit.recommendations)
            : "",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch audit";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedAudit(null);
    setEditForm({
      practiceId: "",
      type: "COMPLIANCE",
      score: "",
      findings: "",
      recommendations: "",
    });
  }

  function openCreateForm() {
    setFormData({
      practiceId: practiceId || "",
      type: "COMPLIANCE",
      score: "",
      findings: "",
      recommendations: "",
    });
    setShowCreateForm(true);
    setShowDetailPanel(false);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setFormData({
      practiceId: "",
      type: "COMPLIANCE",
      score: "",
      findings: "",
      recommendations: "",
    });
  }

  async function handleCreateAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.practiceId) {
      toast.error("Please select a practice");
      return;
    }

    setIsSubmitting(true);
    try {
      const auditData = {
        practiceId: formData.practiceId,
        type: formData.type as any,
        score: formData.score ? parseFloat(formData.score) : undefined,
        findings: formData.findings ? JSON.parse(formData.findings) : {},
        recommendations: formData.recommendations
          ? JSON.parse(formData.recommendations)
          : {},
      };

      await createAuditApi(auditData);
      const data = await getAuditsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeCreateForm();
      toast.success("Audit created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create audit";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAudit() {
    if (!selectedRow) return;

    if (!window.confirm("Are you sure you want to delete this audit?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAuditApi(selectedRow.id);
      const data = await getAuditsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeDetailPanel();
      toast.success("Audit deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete audit";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUpdateAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.practiceId) {
      toast.error("Practice is required");
      return;
    }

    setIsSaving(true);
    try {
      let parsedFindings: Record<string, unknown> = {};
      let parsedRecommendations: Record<string, unknown> = {};

      try {
        if (editForm.findings.trim()) {
          parsedFindings = JSON.parse(editForm.findings);
        }
      } catch {
        parsedFindings = { raw: editForm.findings };
      }

      try {
        if (editForm.recommendations.trim()) {
          parsedRecommendations = JSON.parse(editForm.recommendations);
        }
      } catch {
        parsedRecommendations = { raw: editForm.recommendations };
      }

      const auditData = {
        practiceId: editForm.practiceId,
        type: editForm.type as
          | "COMPLIANCE"
          | "SECURITY"
          | "QUALITY"
          | "FINANCIAL"
          | "OPERATIONAL",
        score: parseFloat(editForm.score) || undefined,
        findings: parsedFindings,
        recommendations: parsedRecommendations,
      };

      await updateAuditApi(selectedRowId!, auditData);
      const data = await getAuditsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      toast.success("Audit updated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update audit";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  const navbarActions = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: openCreateForm,
    },
  ];

  if (isLoading) {
    return (
      <AppLayout
        title={title}
        activeModule="Audits"
        activeSubItem={activeSubItem}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading audits...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title={title}
        activeModule="Audits"
        activeSubItem={activeSubItem}
      >
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-red-500">{error}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="app-control rounded-md px-4 py-2 text-[14px] font-medium"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={title}
      activeModule="Audits"
      activeSubItem={activeSubItem}
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>{viewLabel}</span>
              {/*<span className="text-slate-400">.{rows.length}</span>*/}
              {/*<ChevronDown className="h-3.5 w-3.5 text-slate-400" />*/}
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
                    current[0]?.id === "creationDate"
                      ? [{ id: "creationDate", desc: !current[0].desc }]
                      : [{ id: "creationDate", desc: true }],
                  )
                }
              >
                Sort
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              {/*<input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, search: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              />*/}
              <select
                value={filters.type}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, type: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Types</option>
                {auditTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFilters({ search: "", type: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.type}
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="relative flex min-h-[400px] items-center justify-center">
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    No audits found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Create your first audit to get started
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Audit
                  </button>
                </div>
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
                    const isSelected = row.original.id === selectedRowId;
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
          {/*{rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-2.5">
              <div className="text-[13px] text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50"
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
                    className={`rounded px-2 py-1 text-[13px] ${pagination.page === page ? "bg-[#4f63ea] text-white" : "text-slate-500 hover:bg-[#f0ece6]"}`}
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
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}*/}
        </section>

        {showDetailPanel && selectedRow && (
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
                {selectedAudit?.type || String(selectedRow.values.type)} Audit
              </span>
            </div>

            {isDetailLoading || !selectedAudit ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading audit...
              </div>
            ) : (
              <form
                onSubmit={handleUpdateAudit}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Practice</span>
                      <span className="text-slate-700">
                        {selectedAudit.practice?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-slate-700">
                        {selectedAudit.createdAt
                          ? new Date(selectedAudit.createdAt).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-slate-700">
                        {selectedAudit.updatedAt
                          ? new Date(selectedAudit.updatedAt).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700 ">
                        Type
                      </label>
                      <select
                        value={editForm.type}
                        onChange={(e) =>
                          setEditForm({ ...editForm, type: e.target.value })
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      >
                        {auditTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Score
                      </label>
                      <input
                        type="number"
                        value={editForm.score}
                        onChange={(e) =>
                          setEditForm({ ...editForm, score: e.target.value })
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Findings (JSON)
                      </label>
                      <textarea
                        value={editForm.findings}
                        onChange={(e) =>
                          setEditForm({ ...editForm, findings: e.target.value })
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        placeholder='{"key": "value"}'
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Recommendations (JSON)
                      </label>
                      <textarea
                        value={editForm.recommendations}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            recommendations: e.target.value,
                          })
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        placeholder='{"key": "value"}'
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                  <button
                    type="button"
                    onClick={handleDeleteAudit}
                    disabled={isDeleting}
                    className="flex items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="app-control inline-flex items-center gap-2 cursor-pointer rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        )}

        {showCreateForm && (
          <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">
                Create Audit
              </h2>
              <button
                type="button"
                onClick={closeCreateForm}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateAudit}
              className="flex-1 overflow-auto p-4"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Practice <span className="text-red-500">*</span>
                  </label>
                  {practicesLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading...
                    </div>
                  ) : (
                    <select
                      value={formData.practiceId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          practiceId: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    >
                      <option value="">Select Practice</option>
                      {practices.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  >
                    {auditTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Score
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.score}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        score: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Findings (JSON)
                  </label>
                  <textarea
                    value={formData.findings}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        findings: e.target.value,
                      }))
                    }
                    placeholder='{"key": "value"}'
                    className="app-control w-full rounded-md px-3 py-2 text-[13px] min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Recommendations (JSON)
                  </label>
                  <textarea
                    value={formData.recommendations}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        recommendations: e.target.value,
                      }))
                    }
                    placeholder='{"key": "value"}'
                    className="app-control w-full rounded-md px-3 py-2 text-[13px] min-h-[80px]"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}

export function AllPracticeAuditsPage() {
  return (
    <AuditListView
      viewLabel="All Practice Audits"
      activeSubItem="All Practice Audits"
      title="Practice Audits"
      showPracticeFilter
    />
  );
}

export default function Audits() {
  return (
    <AuditListView
      viewLabel="All Audits"
      activeSubItem="All Audits"
      title="Audits"
    />
  );
}
