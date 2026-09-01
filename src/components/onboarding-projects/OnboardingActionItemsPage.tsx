import { CheckSquare, ChevronLeft, Circle, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar from "../shared/DataTableToolbar";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import Select from "../shared/Select";
import { getResponsivePageSize } from "../shared/TablePagination";
import { getAllPractices } from "../../services/operations/practices";
import { getAllUsers } from "../../services/operations/users";
import { formatPracticeServiceLine } from "../practices/serviceLines";
import {
  getWorkstreamsView,
  type OnboardingWorkstream,
} from "../../services/operations/onboardingWorkstreams";
import {
  ACTION_ITEM_STATUS_OPTIONS,
  actionItemStatusClass,
  createActionItemApi,
  deleteActionItemApi,
  formatActionItemStatus,
  getActionItem,
  getActionItemsView,
  relatedToLabel,
  updateActionItemApi,
  userName,
  type ActionItemRow,
  type OnboardingActionItem,
} from "../../services/operations/onboardingActionItems";
import { canBusinessWrite, readStoredUser } from "../../utils/auth";

type PracticeOption = { id: string; name: string };
type UserOption = { id: string; firstName: string; lastName: string; email: string };

const emptyForm = {
  practiceId: "",
  taskId: "",
  note: "",
  responsibleUserId: "",
  status: "PENDING",
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ownerLabel(user: UserOption) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
}

export default function OnboardingActionItemsPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canWrite = canBusinessWrite(currentRole);

  const [rows, setRows] = useState<ActionItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<OnboardingActionItem | null>(null);
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
    status: "",
    responsibleUserId: "",
    loggedFrom: "",
    loggedTo: "",
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [practices, setPractices] = useState<PracticeOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [workstreams, setWorkstreams] = useState<OnboardingWorkstream[]>([]);
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

  const activePracticeId = showCreateForm
    ? createForm.practiceId
    : showDetailPanel
      ? selectedItem?.practiceId || ""
      : "";

  useEffect(() => {
    if (!activePracticeId) {
      setWorkstreams([]);
      return;
    }

    getWorkstreamsView({ practiceId: activePracticeId, limit: 1000 })
      .then((data) => setWorkstreams(data.records))
      .catch((err) => console.error("Failed to load tasks:", err));
  }, [activePracticeId]);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getActionItemsView({
      page: targetPage,
      limit: pagination.limit,
      search: filters.search || undefined,
      practiceId: filters.practiceId || undefined,
      status: filters.status || undefined,
      responsibleUserId: filters.responsibleUserId || undefined,
      loggedFrom: filters.loggedFrom || undefined,
      loggedTo: filters.loggedTo || undefined,
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
            err instanceof Error ? err.message : "Failed to load action items";
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
    filters.status,
    filters.responsibleUserId,
    filters.loggedFrom,
    filters.loggedTo,
  ]);

  function openCreateForm() {
    setCreateForm(emptyForm);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedItem(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm(emptyForm);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedItem(null);
  }

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const item = await getActionItem(rowId);
      setSelectedItem(item);
      setEditForm({
        practiceId: item.practiceId,
        taskId: item.taskId || "",
        note: item.note,
        responsibleUserId: item.responsibleUserId || "",
        status: String(item.status),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load action item";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!createForm.practiceId || !createForm.note.trim()) {
      toast.error("Practice and note are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createActionItemApi({
        practiceId: createForm.practiceId,
        taskId: createForm.taskId || null,
        note: createForm.note,
        responsibleUserId: createForm.responsibleUserId || null,
        status: createForm.status,
      });
      closeCreateForm();
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      toast.success("Action item logged");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log action item");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedItem) return;
    if (!editForm.note.trim()) {
      toast.error("Note is required.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateActionItemApi(selectedItem.id, {
        taskId: editForm.taskId || null,
        note: editForm.note,
        responsibleUserId: editForm.responsibleUserId || null,
        status: editForm.status,
      });
      setSelectedItem(updated);
      await refreshRows();
      toast.success("Action item updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update action item");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedItem) return;
    if (!window.confirm("Delete this action item?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteActionItemApi(selectedItem.id);
      closeDetailPanel();
      await refreshRows();
      toast.success("Action item deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete action item");
    } finally {
      setIsDeleting(false);
    }
  }

  const taskOptions = useMemo(
    () => [
      { label: "Practice (no specific task)", value: "" },
      ...workstreams.flatMap((workstream) =>
        (workstream.tasks || []).map((task) => ({
          label: `T-${task.taskNumber} ${task.name} · ${formatPracticeServiceLine(
            String(workstream.serviceLine),
          )}`,
          value: task.id,
        })),
      ),
    ],
    [workstreams],
  );

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
    filters.status
      ? {
          key: "status",
          label: "Status",
          displayValue: formatActionItemStatus(filters.status),
          onClear: () => {
            setFilters((prev) => ({ ...prev, status: "" }));
            setDraftFilters((prev) => ({ ...prev, status: "" }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          },
        }
      : null,
    filters.responsibleUserId
      ? {
          key: "responsibleUserId",
          label: "Responsible",
          displayValue:
            ownerLabel(
              users.find((user) => user.id === filters.responsibleUserId) || {
                id: "",
                firstName: "",
                lastName: "",
                email: filters.responsibleUserId,
              },
            ),
          onClear: () => {
            setFilters((prev) => ({ ...prev, responsibleUserId: "" }));
            setDraftFilters((prev) => ({ ...prev, responsibleUserId: "" }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          },
        }
      : null,
    filters.loggedFrom
      ? {
          key: "loggedFrom",
          label: "From",
          displayValue: filters.loggedFrom,
          onClear: () => {
            setFilters((prev) => ({ ...prev, loggedFrom: "" }));
            setDraftFilters((prev) => ({ ...prev, loggedFrom: "" }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          },
        }
      : null,
    filters.loggedTo
      ? {
          key: "loggedTo",
          label: "To",
          displayValue: filters.loggedTo,
          onClear: () => {
            setFilters((prev) => ({ ...prev, loggedTo: "" }));
            setDraftFilters((prev) => ({ ...prev, loggedTo: "" }));
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
              onChange={(value) =>
                setForm((prev) => ({ ...prev, practiceId: value, taskId: "" }))
              }
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
            Related To
          </label>
          <Select
            value={form.taskId}
            onChange={(value) => setForm((prev) => ({ ...prev, taskId: value }))}
            options={taskOptions}
            placeholder="Practice or a specific task"
            disabled={!form.practiceId && options?.includePractice !== false}
          />
          <p className="mt-1 text-[12px] text-slate-400">
            Defaults to the practice. Optionally attach a task.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Note <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.note}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, note: event.target.value }))
            }
            rows={5}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            placeholder="What was discussed or what needs to happen"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Person Responsible
          </label>
          <Select
            value={form.responsibleUserId}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, responsibleUserId: value }))
            }
            options={[
              { label: "Unassigned", value: "" },
              ...users.map((user) => ({
                label: ownerLabel(user),
                value: user.id,
              })),
            ]}
            placeholder="Select person"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Status
          </label>
          <Select
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            options={[...ACTION_ITEM_STATUS_OPTIONS]}
          />
        </div>
      </div>
    );
  }

  const createPanel = (
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">Log Action Item</h2>
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
            {isSubmitting ? "Logging..." : "Log Item"}
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
          {selectedItem
            ? `${selectedItem.practice?.name || "Practice"} · ${formatDateTime(selectedItem.loggedAt)}`
            : "Action Item"}
        </span>
      </div>

      {isDetailLoading || !selectedItem ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading action item...
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 space-y-5">
            <div className="rounded-xl border border-[#f0ece6] bg-[#fbfaf8] p-4">
              <p className="text-[12px] uppercase tracking-wide text-slate-400">
                Date Logged
              </p>
              <p className="mt-1 text-[18px] font-semibold text-slate-800">
                {formatDateTime(selectedItem.loggedAt)}
              </p>
              <p className="mt-2 text-[12px] text-slate-500">
                Logged by {userName(selectedItem.loggedByUser) || "Unknown"}
                {" · "}
                {relatedToLabel(selectedItem)}
              </p>
            </div>

            {renderFormFields(editForm, setEditForm, { includePractice: false })}
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
      title="Onboarding Action Items"
      activeModule="Project Management"
      activeSubItem="Action Items"
      navbarIcon={<CheckSquare className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Action Items"
            subtitle="Project Management"
            searchPlaceholder="Search notes, practices, or tasks..."
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
                status: "",
                responsibleUserId: "",
                loggedFrom: "",
                loggedTo: "",
              };
              setFilters(cleared);
              setDraftFilters(cleared);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            filterModalTitle="Filter Action Items"
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
                    {ACTION_ITEM_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                    Person Responsible
                  </span>
                  <select
                    value={draftFilters.responsibleUserId}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        responsibleUserId: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
                  >
                    <option value="">Anyone</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {ownerLabel(user)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                    Logged From
                  </span>
                  <input
                    type="date"
                    value={draftFilters.loggedFrom}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        loggedFrom: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                    Logged To
                  </span>
                  <input
                    type="date"
                    value={draftFilters.loggedTo}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        loggedTo: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
                  />
                </label>
              </>
            }
            addNewLabel={canWrite ? "Log item" : undefined}
            onAddNew={canWrite ? openCreateForm : undefined}
            onRefresh={async () => {
              try {
                setIsLoading(true);
                await refreshRows();
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Failed to load action items",
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
                      No action items found
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-400">
                      Replace dated spreadsheet columns with a filterable feed of notes,
                      owners, and status.
                    </p>
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Log Action Item
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0 text-left">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Date Logged
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Practice
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Related To
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Note
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Responsible
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Logged By
                      </th>
                      <th className="border-b border-[#eeebe5] px-4 py-3 font-medium">
                        Status
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
                          <td className="whitespace-nowrap border-b border-r border-[#f4f1ec] px-4 py-3 font-medium text-slate-700">
                            {formatDateTime(String(row.values.loggedAt || ""))}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.practiceName || "-")}
                          </td>
                          <td className="max-w-[220px] truncate border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.relatedTo || "-")}
                          </td>
                          <td className="max-w-[320px] truncate border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.note || "-")}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.responsible || "-")}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.loggedBy || "-")}
                          </td>
                          <td className="border-b border-[#f4f1ec] px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${actionItemStatusClass(
                                String(row.values.status || ""),
                              )}`}
                            >
                              {formatActionItemStatus(String(row.values.status || "-"))}
                            </span>
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
