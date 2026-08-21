import { ChevronLeft, Circle, GitBranch, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar from "../shared/DataTableToolbar";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import Select from "../shared/Select";
import { getResponsivePageSize } from "../shared/TablePagination";
import { getAllPractices } from "../../services/operations/practices";
import { getAllUsers } from "../../services/operations/users";
import {
  PRACTICE_SERVICE_LINE_OPTIONS,
  formatPracticeServiceLine,
} from "../practices/serviceLines";
import {
  WORKSTREAM_STATUS_OPTIONS,
  createWorkstreamApi,
  deleteWorkstreamApi,
  formatWorkstreamStatus,
  getWorkstream,
  getWorkstreamsView,
  updateWorkstreamApi,
  workstreamStatusClass,
  type OnboardingWorkstream,
  type WorkstreamRow,
} from "../../services/operations/onboardingWorkstreams";
import { canBusinessWrite, readStoredUser } from "../../utils/auth";

type PracticeOption = { id: string; name: string };
type UserOption = { id: string; firstName: string; lastName: string; email: string };

const emptyForm = {
  practiceId: "",
  serviceLine: "",
  status: "PENDING",
  ownerUserId: "",
  targetDate: "",
  notes: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function ownerLabel(user: UserOption) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
}

export default function OnboardingWorkstreamsPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canWrite = canBusinessWrite(currentRole);

  const [rows, setRows] = useState<WorkstreamRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedWorkstream, setSelectedWorkstream] =
    useState<OnboardingWorkstream | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: getResponsivePageSize(),
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    practiceId: "",
    serviceLine: "",
    status: "",
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [practices, setPractices] = useState<PracticeOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  useEffect(() => {
    getAllPractices()
      .then((data) =>
        setPractices(data.map((practice) => ({ id: practice.id, name: practice.name }))),
      )
      .catch((err) => console.error("Failed to load practices:", err));

    getAllUsers({ limit: 1000 })
      .then((data) => setUsers(data.users || []))
      .catch((err) => console.error("Failed to load users:", err));
  }, []);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getWorkstreamsView({
      page: targetPage,
      limit: pagination.limit,
      search: filters.search || undefined,
      practiceId: filters.practiceId || undefined,
      serviceLine: filters.serviceLine || undefined,
      status: filters.status || undefined,
    });
    setRows(data.rows);
    setPagination(data.pagination);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          setError(null);
          await refreshRows(pagination.page);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to load workstreams";
          setError(message);
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      }

      if (filters.search.length > 2 || filters.search.length === 0) {
        void loadData();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    filters.search,
    filters.practiceId,
    filters.serviceLine,
    filters.status,
  ]);

  function openCreateForm() {
    setCreateForm(emptyForm);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedWorkstream(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm(emptyForm);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedWorkstream(null);
  }

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const workstream = await getWorkstream(rowId);
      setSelectedWorkstream(workstream);
      setEditForm({
        practiceId: workstream.practiceId,
        serviceLine: String(workstream.serviceLine),
        status: String(workstream.status),
        ownerUserId: workstream.ownerUserId || "",
        targetDate: toDateInput(workstream.targetDate),
        notes: workstream.notes || "",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load workstream";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!createForm.practiceId || !createForm.serviceLine) {
      toast.error("Practice and service line are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createWorkstreamApi({
        practiceId: createForm.practiceId,
        serviceLine: createForm.serviceLine,
        status: createForm.status,
        ownerUserId: createForm.ownerUserId || null,
        targetDate: createForm.targetDate || null,
        notes: createForm.notes || null,
      });
      closeCreateForm();
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      toast.success("Workstream created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workstream");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedWorkstream) return;

    setIsSaving(true);
    try {
      const updated = await updateWorkstreamApi(selectedWorkstream.id, {
        serviceLine: editForm.serviceLine,
        status: editForm.status,
        ownerUserId: editForm.ownerUserId || null,
        targetDate: editForm.targetDate || null,
        notes: editForm.notes || null,
      });
      setSelectedWorkstream(updated);
      await refreshRows();
      toast.success("Workstream updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update workstream");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedWorkstream) return;
    if (!window.confirm("Delete this workstream and its tasks/milestones?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWorkstreamApi(selectedWorkstream.id);
      closeDetailPanel();
      await refreshRows();
      toast.success("Workstream deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workstream");
    } finally {
      setIsDeleting(false);
    }
  }

  const activeChips = [
    filters.practiceId
      ? {
          key: "practiceId",
          label: "Practice",
          displayValue:
            practices.find((practice) => practice.id === filters.practiceId)?.name ||
            filters.practiceId,
          onClear: () => {
            setFilters((prev) => ({ ...prev, practiceId: "" }));
            setDraftFilters((prev) => ({ ...prev, practiceId: "" }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          },
        }
      : null,
    filters.serviceLine
      ? {
          key: "serviceLine",
          label: "Service Line",
          displayValue: formatPracticeServiceLine(filters.serviceLine),
          onClear: () => {
            setFilters((prev) => ({ ...prev, serviceLine: "" }));
            setDraftFilters((prev) => ({ ...prev, serviceLine: "" }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          },
        }
      : null,
    filters.status
      ? {
          key: "status",
          label: "Status",
          displayValue: formatWorkstreamStatus(filters.status),
          onClear: () => {
            setFilters((prev) => ({ ...prev, status: "" }));
            setDraftFilters((prev) => ({ ...prev, status: "" }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          },
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    displayValue: string;
    onClear: () => void;
  }>;

  function renderFormFields(
    form: typeof emptyForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    options?: { includePractice?: boolean },
  ) {
    return (
      <div className="space-y-4">
        {options?.includePractice !== false ? (
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Practice <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.practiceId}
              onChange={(value) => setForm((prev) => ({ ...prev, practiceId: value }))}
              options={practices.map((practice) => ({
                label: practice.name,
                value: practice.id,
              }))}
              placeholder="Select practice"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Service Line <span className="text-red-500">*</span>
          </label>
          <Select
            value={form.serviceLine}
            onChange={(value) => setForm((prev) => ({ ...prev, serviceLine: value }))}
            options={[...PRACTICE_SERVICE_LINE_OPTIONS]}
            placeholder="Select service line"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Status
          </label>
          <Select
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            options={[...WORKSTREAM_STATUS_OPTIONS]}
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Owner
          </label>
          <Select
            value={form.ownerUserId}
            onChange={(value) => setForm((prev) => ({ ...prev, ownerUserId: value }))}
            options={[
              { label: "Unassigned", value: "" },
              ...users.map((user) => ({
                label: ownerLabel(user),
                value: user.id,
              })),
            ]}
            placeholder="Select owner"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Target Date
          </label>
          <input
            type="date"
            value={form.targetDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, targetDate: event.target.value }))
            }
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            rows={4}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            placeholder="Workstream notes"
          />
        </div>
      </div>
    );
  }

  const createPanel = (
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">Create Workstream</h2>
        <button type="button" onClick={closeCreateForm} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleCreate} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {renderFormFields(createForm, setCreateForm)}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#f0ece6] px-4 py-3">
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

  const detailPanel = (
    <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[460px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button type="button" onClick={closeDetailPanel} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Circle className="h-4 w-4 text-slate-300" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
          {selectedWorkstream
            ? `${selectedWorkstream.practice?.name || "Practice"} · ${formatPracticeServiceLine(String(selectedWorkstream.serviceLine))}`
            : "Workstream"}
        </span>
      </div>

      {isDetailLoading || !selectedWorkstream ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading workstream...
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 space-y-5">
            <div className="rounded-xl border border-[#f0ece6] bg-[#fbfaf8] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-slate-400">
                    % Complete
                  </p>
                  <p className="mt-1 text-[22px] font-semibold text-slate-800">
                    {selectedWorkstream.percentComplete}%
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${workstreamStatusClass(String(selectedWorkstream.status))}`}
                >
                  {formatWorkstreamStatus(String(selectedWorkstream.status))}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-slate-500">
                {selectedWorkstream.completedTasks} of {selectedWorkstream.totalTasks} tasks complete
              </p>
            </div>

            {renderFormFields(editForm, setEditForm, { includePractice: false })}

            <div>
              <h3 className="mb-2 text-[13px] font-semibold text-slate-700">
                Tasks ({selectedWorkstream.tasks.length})
              </h3>
              {selectedWorkstream.tasks.length === 0 ? (
                <p className="text-[13px] text-slate-400">No linked tasks yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedWorkstream.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-[#f0ece6] px-3 py-2 text-[13px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">
                          {task.taskNumber}. {task.name}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">
                          {task.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-[13px] font-semibold text-slate-700">
                Milestones ({selectedWorkstream.milestones.length})
              </h3>
              {selectedWorkstream.milestones.length === 0 ? (
                <p className="text-[13px] text-slate-400">No linked milestones yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedWorkstream.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="rounded-lg border border-[#f0ece6] px-3 py-2 text-[13px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">
                          {milestone.milestoneCode}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">
                          {milestone.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-500">{milestone.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {canWrite ? (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex cursor-pointer items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="app-control inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </aside>
  );

  return (
    <AppLayout
      title="Onboarding Workstreams"
      activeModule="Onboarding Projects"
      activeSubItem="Workstreams"
      navbarIcon={<GitBranch className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Workstreams"
            subtitle="Onboarding Projects"
            searchPlaceholder="Search by practice name..."
            searchValue={filters.search}
            onSearchChange={(value) => {
              setFilters((prev) => ({ ...prev, search: value }));
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            activeFilterCount={activeChips.length}
            activeChips={activeChips}
            onOpenFilterModal={() => setDraftFilters(filters)}
            onApplyFilters={() => {
              setFilters(draftFilters);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onResetFilters={() => {
              const cleared = {
                search: "",
                practiceId: "",
                serviceLine: "",
                status: "",
              };
              setFilters(cleared);
              setDraftFilters(cleared);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            filterModalTitle="Filter Workstreams"
            filterFields={
              <>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                    Practice
                  </span>
                  <select
                    value={draftFilters.practiceId}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        practiceId: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
                  >
                    <option value="">All Practices</option>
                    {practices.map((practice) => (
                      <option key={practice.id} value={practice.id}>
                        {practice.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                    Service Line
                  </span>
                  <select
                    value={draftFilters.serviceLine}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        serviceLine: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
                  >
                    <option value="">All Service Lines</option>
                    {PRACTICE_SERVICE_LINE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                    Status
                  </span>
                  <select
                    value={draftFilters.status}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
                  >
                    <option value="">All Statuses</option>
                    {WORKSTREAM_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            }
            addNewLabel={canWrite ? "New workstream" : undefined}
            onAddNew={canWrite ? openCreateForm : undefined}
            onRefresh={async () => {
              try {
                setIsLoading(true);
                await refreshRows();
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Failed to load workstreams",
                );
              } finally {
                setIsLoading(false);
              }
            }}
            isLoading={isLoading}
            isSaving={isSaving || isSubmitting}
            isDeleting={isDeleting}
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(newSize) =>
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }))
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {error && rows.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
                  <div className="text-[13px] text-red-500">{error}</div>
                </div>
              ) : !isLoading && rows.length === 0 ? (
                <div className="relative flex min-h-[400px] items-center justify-center">
                  <div className="flex max-w-md flex-col items-center px-6 text-center">
                    <EmptyStateIllustration />
                    <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                      No workstreams found
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-400">
                      Create one workstream per service line for a practice.
                    </p>
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create Workstream
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0 text-left">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Practice
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Service Line
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Status
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Owner
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        % Complete
                      </th>
                      <th className="border-b border-[#eeebe5] px-4 py-3 font-medium">
                        Target Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[14px] text-slate-600">
                    {rows.map((row) => {
                      const isSelected = row.id === selectedRowId;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleRowClick(row.id)}
                          className={`cursor-pointer ${
                            isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"
                          }`}
                        >
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.practiceName || "-")}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.serviceLine || "-")}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${workstreamStatusClass(
                                String(row.values.status || ""),
                              )}`}
                            >
                              {formatWorkstreamStatus(String(row.values.status || "-"))}
                            </span>
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.owner || "-")}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.percentComplete ?? 0)}%
                          </td>
                          <td className="border-b border-[#f4f1ec] px-4 py-3">
                            {formatDate(String(row.values.targetDate || ""))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </DataTableToolbar>
        </section>

        {showDetailPanel && detailPanel}
        {showCreateForm && canWrite && createPanel}
      </div>
    </AppLayout>
  );
}
