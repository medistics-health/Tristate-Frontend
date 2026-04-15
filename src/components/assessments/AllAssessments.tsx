import {
  ChevronLeft,
  Circle,
  ExternalLink,
  LayoutList,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import {
  createAssessmentApi,
  deleteAssessmentApi,
  getAssessment,
  getAssessmentsView,
  updateAssessmentApi,
  type Assessment,
  type AssessmentRow,
} from "../../services/operations/assessments";
import { getAllPractices } from "../../services/operations/practices";

type Practice = {
  id: string;
  name: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function AssessmentsPage() {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ search: "" });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [createForm, setCreateForm] = useState({
    practiceId: "",
    responses: {},
    score: "",
  });

  const [editForm, setEditForm] = useState({
    responses: {} as unknown,
    score: "" as string,
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          setError(null);
          const data = await getAssessmentsView({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search || undefined,
            sortOrder,
          });
          setRows(data.rows);
          setPagination(data.pagination);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to load assessments";
          setError(message);
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      }

      if (filters.search.length > 2 || filters.search.length === 0) {
        loadData();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, filters, sortOrder]);

  useEffect(() => {
    if (showCreateForm && practices.length === 0) {
      getAllPractices()
        .then(setPractices)
        .catch((err) => console.error("Failed to load practices:", err));
    }
  }, [showCreateForm, practices.length]);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getAssessmentsView({
      page: targetPage,
      limit: pagination.limit,
      search: filters.search || undefined,
      sortOrder,
    });
    setRows(data.rows);
    setPagination(data.pagination);
  }

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const assessment = await getAssessment(rowId);
      setSelectedAssessment(assessment);
      setEditForm({
        responses: assessment.responses || {},
        score: assessment.score?.toString() || "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch assessment";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedAssessment(null);
    setEditForm({ responses: {}, score: "" });
  }

  function openCreateForm() {
    setCreateForm({ practiceId: "", responses: {}, score: "" });
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedAssessment(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm({ practiceId: "", responses: {}, score: "" });
  }

  async function handleCreateAssessment(event: React.FormEvent) {
    event.preventDefault();
    if (!createForm.practiceId) {
      toast.error("Practice is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await createAssessmentApi({
        practiceId: createForm.practiceId,
        responses: createForm.responses,
        score: createForm.score ? Number.parseFloat(createForm.score) : undefined,
      });
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      closeCreateForm();
      toast.success("Assessment created successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create assessment";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateAssessment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAssessment) return;

    setIsSaving(true);
    try {
      const updatedAssessment = await updateAssessmentApi(selectedAssessment.id, {
        responses: editForm.responses,
        score: editForm.score ? Number.parseFloat(editForm.score) : undefined,
      });
      await refreshRows();
      setSelectedAssessment(updatedAssessment);
      toast.success("Assessment updated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update assessment";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAssessment() {
    if (!selectedAssessment) return;
    if (!window.confirm("Are you sure you want to delete this assessment?")) return;

    setIsDeleting(true);
    try {
      await deleteAssessmentApi(selectedAssessment.id);
      await refreshRows();
      closeDetailPanel();
      toast.success("Assessment deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete assessment";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: openCreateForm,
    },
  ];

  const detailPanel = (
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
          Assessment
        </span>
        <button
          type="button"
          onClick={() => setShowOptionsMenu((current) => !current)}
          className="text-slate-400 hover:text-slate-600"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {isDetailLoading || !selectedAssessment ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading assessment...
        </div>
      ) : (
        <form onSubmit={handleUpdateAssessment} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Practice</span>
                <span className="text-right text-slate-700">
                  {selectedAssessment.practice?.name || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Score</span>
                <span className="text-slate-700">
                  {selectedAssessment.score ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created</span>
                <span className="text-right text-slate-700">
                  {formatDateTime(selectedAssessment.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Update</span>
                <span className="text-right text-slate-700">
                  {formatDateTime(selectedAssessment.updatedAt)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">
                  Score
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.score}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, score: event.target.value }))
                  }
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  placeholder="Enter score"
                />
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">
                  Responses
                </label>
                <textarea
                  value={JSON.stringify(editForm.responses, null, 2)}
                  onChange={(event) => {
                    try {
                      setEditForm((prev) => ({
                        ...prev,
                        responses: JSON.parse(event.target.value),
                      }));
                    } catch {
                      setEditForm((prev) => ({ ...prev, responses: event.target.value }));
                    }
                  }}
                  className="app-control w-full min-h-[150px] rounded-md px-3 py-2 text-[13px] font-mono"
                  placeholder="Enter responses as JSON"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
            <button
              type="button"
              onClick={handleDeleteAssessment}
              disabled={isDeleting}
              className="flex items-center cursor-pointer gap-2 text-[13px] text-red-500 hover:text-red-700"
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

      {showOptionsMenu && selectedAssessment && (
        <div className="absolute right-4 top-10 z-10 w-[205px] rounded-xl border border-[#ece8e1] bg-white p-2 shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
          <button
            type="button"
            onClick={() => setShowOptionsMenu(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
          >
            <ExternalLink className="h-4 w-4" />
            Export
          </button>
        </div>
      )}
    </aside>
  );

  const createPanel = (
    <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">
          Create Assessment
        </h2>
        <button
          type="button"
          onClick={closeCreateForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleCreateAssessment} className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Practice <span className="text-red-500">*</span>
            </label>
            <select
              value={createForm.practiceId}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, practiceId: event.target.value }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            >
              <option value="">Select Practice</option>
              {practices.map((practice) => (
                <option key={practice.id} value={practice.id}>
                  {practice.name}
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
              value={createForm.score}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, score: event.target.value }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              placeholder="Enter score (optional)"
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
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Assessments"
        activeModule="Assessments"
        activeSubItem="All Assessments"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading assessments...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Assessments"
        activeModule="Assessments"
        activeSubItem="All Assessments"
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
      title="Assessments"
      activeModule="Assessments"
      activeSubItem="All Assessments"
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
              <span>All Assessments</span>
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel((current) => !current)}
              >
                Filters
              </button>
              <button
                type="button"
                onClick={() =>
                  setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
                }
              >
                Sort
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              <input
                type="text"
                placeholder="Search by practice name..."
                value={filters.search}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, search: event.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() => setFilters({ search: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.search}
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
                    No assessments found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Create your first assessment to get started
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Assessment
                  </button>
                </div>
              </div>
            ) : (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    <th className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400">
                      Practice
                    </th>
                    <th className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400">
                      Score
                    </th>
                    <th className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400">
                      Created
                    </th>
                    <th className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400">
                      Last Update
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isSelected = row.id === selectedRowId;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => handleRowClick(row.id)}
                        className={`cursor-pointer ${isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"}`}
                      >
                        <td className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600">
                          {String(row.values.practiceName || "-")}
                        </td>
                        <td className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600">
                          {String(row.values.score ?? "-")}
                        </td>
                        <td className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600">
                          {String(row.values.creationDate || "-")}
                        </td>
                        <td className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600">
                          {String(row.values.lastUpdate || "-")}
                        </td>
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
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`rounded px-2 py-1 text-[13px] ${
                      pagination.page === page ? "bg-[#4f63ea] text-white" : "text-slate-500 hover:bg-[#f0ece6]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
      </div>
    </AppLayout>
  );
}

export default AssessmentsPage;
