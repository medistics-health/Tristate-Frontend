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
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import { getResponsivePageSize } from "../shared/TablePagination";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [practicesLoading, setPracticesLoading] = useState(false);
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

  const [pagination, setPagination] = useState({
    page: 1,
    limit: getResponsivePageSize(),
    total: 0,
    totalPages: 0,
  });
  const [userSelectedPageSize, setUserSelectedPageSize] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (!userSelectedPageSize) {
        const newSize = getResponsivePageSize();
        setPagination((prev) => ({ ...prev, limit: newSize }));
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userSelectedPageSize]);

  type AuditFilters = {
    search: string;
    type: string;
    practiceId: string;
    dateFrom: string;
    dateTo: string;
  };

  const defaultFilters: AuditFilters = {
    search: "",
    type: "",
    practiceId: practiceId || "",
    dateFrom: "",
    dateTo: "",
  };

  const [filters, setFilters] = useState<AuditFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);

  const activeSort = sorting[0];

  useEffect(() => {
    getAllPractices()
      .then(setPractices)
      .catch((err) => console.error("Failed to load practices:", err));
  }, []);

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const activeFilterCount = [
    filters.type,
    filters.practiceId,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.type) {
      chips.push({
        key: "type",
        label: "Type",
        displayValue: filters.type,
        onClear: () => {
          setFilters((curr) => ({ ...curr, type: "" }));
          setDraftFilters((curr) => ({ ...curr, type: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.practiceId) {
      chips.push({
        key: "practiceId",
        label: "Practice",
        displayValue:
          practices.find((p) => p.id === filters.practiceId)?.name ||
          filters.practiceId,
        onClear: () => {
          setFilters((curr) => ({ ...curr, practiceId: "" }));
          setDraftFilters((curr) => ({ ...curr, practiceId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.dateFrom) {
      chips.push({
        key: "dateFrom",
        label: "From",
        displayValue: filters.dateFrom,
        onClear: () => {
          setFilters((curr) => ({ ...curr, dateFrom: "" }));
          setDraftFilters((curr) => ({ ...curr, dateFrom: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.dateTo) {
      chips.push({
        key: "dateTo",
        label: "To",
        displayValue: filters.dateTo,
        onClear: () => {
          setFilters((curr) => ({ ...curr, dateTo: "" }));
          setDraftFilters((curr) => ({ ...curr, dateTo: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters, practices]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const refreshAuditRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: Record<string, unknown> = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: activeSort?.id || "createdAt",
        sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : "desc",
      };
      if (searchInput.trim()) params.search = searchInput.trim();
      if (filters.type) params.type = filters.type;
      if (filters.practiceId) params.practiceId = filters.practiceId;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAuditRecords();
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    searchInput,
    filters.type,
    activeSort?.id,
    activeSort?.desc,
    practiceId,
  ]);

  useEffect(() => {
    if (showCreateForm && practices.length === 0) {
      setPracticesLoading(true);
      getAllPractices()
        .then(setPractices)
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setPracticesLoading(false));
    }
  }, [showCreateForm]);

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
  }

  function openCreateForm() {
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedAudit(null);
    setFormData({
      practiceId: practiceId || "",
      type: "COMPLIANCE",
      score: "",
      findings: "",
      recommendations: "",
    });
  }

  function closeCreateForm() {
    setShowCreateForm(false);
  }

  async function handleCreateAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.practiceId) {
      toast.error("Please select a practice");
      return;
    }

    let parsedFindings: unknown = {};
    let parsedRecommendations: unknown = {};

    try {
      parsedFindings = formData.findings ? JSON.parse(formData.findings) : {};
    } catch {
      toast.error("Findings must be valid JSON");
      return;
    }

    try {
      parsedRecommendations = formData.recommendations
        ? JSON.parse(formData.recommendations)
        : {};
    } catch {
      toast.error("Recommendations must be valid JSON");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAuditApi({
        practiceId: formData.practiceId,
        type: formData.type,
        score: formData.score ? Number(formData.score) : undefined,
        findings: parsedFindings,
        recommendations: parsedRecommendations,
      });
      toast.success("Audit created successfully");
      closeCreateForm();
      await refreshAuditRecords();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create audit";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRowId) return;

    let parsedFindings: unknown = undefined;
    let parsedRecommendations: unknown = undefined;

    if (editForm.findings) {
      try {
        parsedFindings = JSON.parse(editForm.findings);
      } catch {
        toast.error("Findings must be valid JSON");
        return;
      }
    }

    if (editForm.recommendations) {
      try {
        parsedRecommendations = JSON.parse(editForm.recommendations);
      } catch {
        toast.error("Recommendations must be valid JSON");
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateAuditApi(selectedRowId, {
        type: editForm.type,
        score: editForm.score ? Number(editForm.score) : undefined,
        findings: parsedFindings,
        recommendations: parsedRecommendations,
      });
      toast.success("Audit updated successfully");
      await refreshAuditRecords();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update audit";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAudit() {
    if (!selectedRowId) return;
    if (!window.confirm("Are you sure you want to delete this audit?")) return;

    setIsDeleting(true);
    try {
      await deleteAuditApi(selectedRowId);
      toast.success("Audit deleted successfully");
      closeDetailPanel();
      await refreshAuditRecords();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete audit";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const navbarActions = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: openCreateForm,
    },
  ];

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Practice
        </span>
        <Select
          value={draftFilters.practiceId}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, practiceId: val }))
          }
          options={[
            { label: "All Practices", value: "" },
            ...practices.map((p) => ({ label: p.name, value: p.id })),
          ]}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Audit Type
        </span>
        <Select
          value={draftFilters.type}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, type: val }))
          }
          options={[
            { label: "All Types", value: "" },
            ...auditTypeOptions.map((t) => ({ label: t, value: t })),
          ]}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
            Created From
          </span>
          <input
            type="date"
            value={draftFilters.dateFrom}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
            }
            className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
            Created To
          </span>
          <input
            type="date"
            value={draftFilters.dateTo}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))
            }
            className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
          />
        </label>
      </div>
    </>
  );

  if (isLoading && rows.length === 0) {
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

  return (
    <AppLayout
      title={title}
      activeModule="Practices"
      activeSubItem={activeSubItem}
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      // navbarActions={navbarActions}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title={viewLabel}
            subtitle="Practice Audits"
            searchPlaceholder="Search audits by practice or deal..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Audits"
            filterFields={filterFieldsModal}
            addNewLabel="Create Audit"
            onAddNew={openCreateForm}
            onRefresh={refreshAuditRecords}
            isLoading={isLoading}
            isSaving={isSaving}
            isDeleting={isDeleting}
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(newSize) => {
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
              setUserSelectedPageSize(true);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
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
                      className="app-control mt-5 inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Audit
                    </button>
                  </div>
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-4 py-3 text-left font-medium last:border-r-0"
                          >
                            <SortableHeaderCell header={header} />
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
                              className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-4 py-3 text-[13px] text-slate-600 last:border-r-0"
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
          </DataTableToolbar>
        </section>

        {showDetailPanel && selectedRow && (
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
                  {(() => {
                    const aTypeColors: Record<string, string> = {
                      COMPLIANCE: "bg-green-100 text-green-700",
                      CODING: "bg-blue-100 text-blue-700",
                      DOCUMENTATION: "bg-orange-100 text-orange-700",
                      REVENUE_CYCLE: "bg-cyan-100 text-cyan-700",
                      OPERATIONAL: "bg-purple-100 text-purple-700",
                      SECURITY: "bg-red-100 text-red-700",
                      QUALITY: "bg-indigo-100 text-indigo-700",
                      FINANCIAL: "bg-yellow-100 text-yellow-700",
                    };
                    const auditType = selectedAudit?.type || String(selectedRow.values.type || "");
                    return (
                      <DetailCard
                        title={`${auditType} Audit`}
                        badge={auditType ? { label: auditType, className: aTypeColors[auditType] || "bg-gray-100 text-gray-700" } : null}
                        infoRows={[
                          ...(selectedAudit?.practice?.name ? [{ label: "Practice", value: selectedAudit.practice.name }] : []),
                          ...(selectedAudit?.score !== null && selectedAudit?.score !== undefined ? [{ label: "Score", value: String(selectedAudit.score) }] : []),
                        ]}
                      />
                    );
                  })()}

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
          <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
