import {
  ChevronDown,
  ChevronLeft,
  Circle,
  ExternalLink,
  GripVertical,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
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
} from "../../services/operations/assessments";
import { getAllPractices } from "../../services/operations/practices";

type Practice = {
  id: string;
  name: string;
};

type AssessmentStatus = "NOT STARTED" | "IN PROGRESS" | "COMPLETED" | "ACTION REQUIRED" | "CLOSED";

type AssessmentCard = {
  id: string;
  title: string;
  status: AssessmentStatus;
  practiceId: string;
  practiceName: string;
  score: string;
  responses: unknown;
  createdAt: string;
  updatedAt: string;
};

type assessmentProgres = {
  id: AssessmentStatus;
  label: string;
  badgeClassName: string;
};

const assessmentProgressLanes: assessmentProgres[] = [
  {
    id: "NOT STARTED",
    label: "NOT STARTED",
    badgeClassName: "bg-[#e8f7ee] text-[#2ba36f]",
  },
  {
    id: "IN PROGRESS",
    label: "IN PROGRESS",
    badgeClassName: "bg-[#eef1ff] text-[#6b7de2]",
  },
  {
    id: "COMPLETED",
    label: "COMPLETED",
    badgeClassName: "bg-[#fff1bd] text-[#b78800]",
  },
  {
    id: "ACTION REQUIRED",
    label: "ACTION REQUIRED",
    badgeClassName: "bg-[#ffe8e8] text-[#ef5d5d]",
  },
  {
    id: "CLOSED",
    label: "CLOSED",
    badgeClassName: "bg-[#f0e6ff] text-[#9b70dc]",
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function AssessmentProgressPage() {
  const [assessments, setAssessments] = useState<AssessmentCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hideClosed, setHideClosed] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 0 });
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
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getAssessmentsView({
          page: pagination.page,
          limit: pagination.limit,
        });
        const mappedAssessments: AssessmentCard[] = data.rows.map((row) => {
          const assessment = row.values as unknown as Assessment;
          return {
            id: row.id,
            title: `Assessment ${row.id.slice(0, 8).toUpperCase()}`,
            status: assessment.score !== undefined && assessment.score !== null ? "COMPLETED" : 
                    assessment.responses && Object.keys(assessment.responses as object).length > 0 ? "IN PROGRESS" : "NOT STARTED",
            practiceId: row.values.practiceId as string,
            practiceName: row.values.practiceName as string || "-",
            score: row.values.score as string || "-",
            responses: row.values.responses,
            createdAt: row.values.creationDate as string,
            updatedAt: row.values.lastUpdate as string,
          };
        });
        setAssessments(mappedAssessments);
        setPagination(data.pagination);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load assessments";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    if (showCreateForm && practices.length === 0) {
      getAllPractices()
        .then(setPractices)
        .catch((err) => console.error("Failed to load practices:", err));
    }
  }, [showCreateForm, practices.length]);

  async function refreshRows() {
    try {
      const data = await getAssessmentsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      const mappedAssessments: AssessmentCard[] = data.rows.map((row) => {
        const assessment = row.values as unknown as Assessment;
        return {
          id: row.id,
          title: `Assessment ${row.id.slice(0, 8).toUpperCase()}`,
          status: assessment.score !== undefined && assessment.score !== null ? "COMPLETED" :
                  assessment.responses && Object.keys(assessment.responses as object).length > 0 ? "IN PROGRESS" : "NOT STARTED",
          practiceId: row.values.practiceId as string,
          practiceName: row.values.practiceName as string || "-",
          score: row.values.score as string || "-",
          responses: row.values.responses,
          createdAt: row.values.creationDate as string,
          updatedAt: row.values.lastUpdate as string,
        };
      });
      setAssessments(mappedAssessments);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to refresh:", err);
    }
  }

  async function handleRowClick(cardId: string) {
    setSelectedAssessmentId(cardId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const assessment = await getAssessment(cardId);
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
    setSelectedAssessmentId(null);
    setSelectedAssessment(null);
    setEditForm({ responses: {}, score: "" });
  }

  function openCreateForm() {
    setCreateForm({ practiceId: "", responses: {}, score: "" });
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedAssessmentId(null);
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
      await refreshRows();
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

  const visibleLanes = useMemo(
    () =>
      hideClosed
        ? assessmentProgressLanes.filter((lane) => lane.id !== "CLOSED")
        : assessmentProgressLanes,
    [hideClosed],
  );

  const cardsByLane = useMemo(
    () =>
      Object.fromEntries(
        visibleLanes.map((lane) => [
          lane.id,
          assessments.filter((card) => card.status === lane.id),
        ]),
      ) as Record<AssessmentStatus, AssessmentCard[]>,
    [assessments, visibleLanes],
  );

  const selectedCard = useMemo(
    () => assessments.find((card) => card.id === selectedAssessmentId) || null,
    [assessments, selectedAssessmentId],
  );

  function sortLanesByCount() {
    setAssessments((current) =>
      [...current].sort((left, right) =>
        left.status.localeCompare(right.status),
      ),
    );
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
        activeSubItem="Assessment Progress"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading assessments...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && assessments.length === 0) {
    return (
      <AppLayout
        title="Assessments"
        activeModule="Assessments"
        activeSubItem="Assessment Progress"
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
      activeSubItem="Assessment Progress"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <div className="app-panel min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
              <span>Assessment Progress</span>
              <span className="text-slate-400">. {assessments.length}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setHideClosed((current) => !current)}
              >
                Filter
              </button>
              <button type="button" onClick={sortLanesByCount}>
                Sort
              </button>
              <button
                type="button"
                onClick={() => setShowDetailPanel((prev) => !prev)}
              >
                Options
              </button>
            </div>
          </div>

          <div className="min-h-0 h-full overflow-auto">
            {assessments.length === 0 ? (
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
              <div className="grid min-w-[1050px] auto-cols-fr grid-flow-col h-full bg-[#fcfbf9]">
                {visibleLanes.map((lane) => (
                  <section
                    key={lane.id}
                    className="border-r border-[#f0ece6] last:border-r-0 flex flex-col"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-[#fcfbf9] z-10">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[12px] font-semibold ${lane.badgeClassName}`}
                      >
                        {lane.label}
                      </span>
                      <span className="text-[13px] text-slate-400">
                        {cardsByLane[lane.id]?.length || 0}
                      </span>
                    </div>

                    <div className="space-y-2 px-3 pb-4 flex-1 overflow-y-auto">
                      {cardsByLane[lane.id]?.map((card) => {
                        const isSelected = selectedCard?.id === card.id;

                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => handleRowClick(card.id)}
                            className={`flex w-full items-start gap-2 rounded-lg border px-3 py-3 text-left transition-all ${
                              isSelected
                                ? "border-[#9cb1f6] bg-white shadow-[0_4px_12px_rgba(157,177,246,0.15)]"
                                : "border-[#ece8e1] bg-white hover:border-[#cfc8bb]"
                            }`}
                          >
                            <GripVertical className="mt-0.5 h-4 w-4 text-slate-300" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-medium text-slate-700">
                                {card.title}
                              </p>
                              <p className="mt-1 truncate text-[12px] text-slate-400">
                                {card.practiceName}
                              </p>
                            </div>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[#ece8e1] px-3 py-2 text-[13px] text-slate-400 hover:border-[#cfc8bb] hover:text-slate-600 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add New
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
      </div>
    </AppLayout>
  );
}

export default AssessmentProgressPage;
