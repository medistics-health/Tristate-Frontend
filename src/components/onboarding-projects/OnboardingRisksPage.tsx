import { AlertTriangle, ChevronLeft, Circle, Plus, Save, Trash2, X } from "lucide-react";
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
  RISK_LEVEL_OPTIONS,
  RISK_RATING_OPTIONS,
  RISK_STATUS_OPTIONS,
  computeRiskRating,
  createRiskApi,
  deleteRiskApi,
  formatRiskRating,
  formatRiskStatus,
  getRisk,
  getRisksView,
  riskRatingClass,
  riskStatusClass,
  updateRiskApi,
  type OnboardingRisk,
  type RiskRow,
} from "../../services/operations/onboardingRisks";
import { canBusinessWrite, readStoredUser } from "../../utils/auth";

type PracticeOption = { id: string; name: string };
type UserOption = { id: string; firstName: string; lastName: string; email: string };

const emptyForm = {
  practiceId: "",
  workstreamId: "",
  description: "",
  impact: "MEDIUM",
  probability: "MEDIUM",
  mitigation: "",
  ownerUserId: "",
  status: "OPEN",
};

function ownerLabel(user: UserOption) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
}

export default function OnboardingRisksPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canWrite = canBusinessWrite(currentRole);

  const [rows, setRows] = useState<RiskRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<OnboardingRisk | null>(null);
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
    rating: "",
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
      ? selectedRisk?.practiceId || ""
      : "";

  useEffect(() => {
    if (!activePracticeId) {
      setWorkstreams([]);
      return;
    }

    getWorkstreamsView({ practiceId: activePracticeId, limit: 1000 })
      .then((data) => setWorkstreams(data.records))
      .catch((err) => console.error("Failed to load workstreams:", err));
  }, [activePracticeId]);

  async function refreshRows(targetPage = pagination.page) {
    const data = await getRisksView({
      page: targetPage,
      limit: pagination.limit,
      search: filters.search || undefined,
      practiceId: filters.practiceId || undefined,
      status: filters.status || undefined,
      rating: filters.rating || undefined,
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
          const message = err instanceof Error ? err.message : "Failed to load risks";
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
    filters.rating,
  ]);

  function openCreateForm() {
    setCreateForm(emptyForm);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedRisk(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm(emptyForm);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedRisk(null);
  }

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    setIsDetailLoading(true);

    try {
      const risk = await getRisk(rowId);
      setSelectedRisk(risk);
      setEditForm({
        practiceId: risk.practiceId,
        workstreamId: risk.workstreamId || "",
        description: risk.description,
        impact: String(risk.impact),
        probability: String(risk.probability),
        mitigation: risk.mitigation || "",
        ownerUserId: risk.ownerUserId || "",
        status: String(risk.status),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load risk";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!createForm.practiceId || !createForm.description.trim()) {
      toast.error("Practice and description are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createRiskApi({
        practiceId: createForm.practiceId,
        workstreamId: createForm.workstreamId || null,
        description: createForm.description,
        impact: createForm.impact,
        probability: createForm.probability,
        mitigation: createForm.mitigation || null,
        ownerUserId: createForm.ownerUserId || null,
        status: createForm.status,
      });
      closeCreateForm();
      await refreshRows(1);
      setPagination((prev) => ({ ...prev, page: 1 }));
      toast.success("Risk created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create risk");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRisk) return;
    if (!editForm.description.trim()) {
      toast.error("Description is required.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateRiskApi(selectedRisk.id, {
        workstreamId: editForm.workstreamId || null,
        description: editForm.description,
        impact: editForm.impact,
        probability: editForm.probability,
        mitigation: editForm.mitigation || null,
        ownerUserId: editForm.ownerUserId || null,
        status: editForm.status,
      });
      setSelectedRisk(updated);
      await refreshRows();
      toast.success("Risk updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update risk");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedRisk) return;
    if (!window.confirm("Delete this risk?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteRiskApi(selectedRisk.id);
      closeDetailPanel();
      await refreshRows();
      toast.success("Risk deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete risk");
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
    filters.status
      ? {
          key: "status",
          label: "Status",
          displayValue: formatRiskStatus(filters.status),
          onClear: () => {
            setFilters((prev) => ({ ...prev, status: "" }));
            setDraftFilters((prev) => ({ ...prev, status: "" }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          },
        }
      : null,
    filters.rating
      ? {
          key: "rating",
          label: "Rating",
          displayValue: formatRiskRating(filters.rating),
          onClear: () => {
            setFilters((prev) => ({ ...prev, rating: "" }));
            setDraftFilters((prev) => ({ ...prev, rating: "" }));
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

  const workstreamOptions = useMemo(
    () => [
      { label: "Practice-wide (no workstream)", value: "" },
      ...workstreams.map((workstream) => ({
        label: formatPracticeServiceLine(String(workstream.serviceLine)),
        value: workstream.id,
      })),
    ],
    [workstreams],
  );

  function renderFormFields(
    form: typeof emptyForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    options?: { includePractice?: boolean },
  ) {
    const rating = computeRiskRating(form.impact, form.probability);

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
                setForm((prev) => ({ ...prev, practiceId: value, workstreamId: "" }))
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
            Workstream
          </label>
          <Select
            value={form.workstreamId}
            onChange={(value) => setForm((prev) => ({ ...prev, workstreamId: value }))}
            options={workstreamOptions}
            placeholder="Optional"
            disabled={!form.practiceId && options?.includePractice !== false}
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            rows={3}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            placeholder="Describe the risk"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Impact
            </label>
            <Select
              value={form.impact}
              onChange={(value) => setForm((prev) => ({ ...prev, impact: value }))}
              options={[...RISK_LEVEL_OPTIONS]}
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Probability
            </label>
            <Select
              value={form.probability}
              onChange={(value) => setForm((prev) => ({ ...prev, probability: value }))}
              options={[...RISK_LEVEL_OPTIONS]}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Rating
          </label>
          <div className="flex items-center gap-2 rounded-md border border-[#ece8e1] bg-[#fbfaf8] px-3 py-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${riskRatingClass(rating)}`}
            >
              {formatRiskRating(rating)}
            </span>
            <span className="text-[12px] text-slate-400">
              Derived from Impact × Probability
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Mitigation Strategy
          </label>
          <textarea
            value={form.mitigation}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, mitigation: event.target.value }))
            }
            rows={4}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            placeholder="How this risk will be mitigated"
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
            Status
          </label>
          <Select
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            options={[...RISK_STATUS_OPTIONS]}
          />
        </div>
      </div>
    );
  }

  const createPanel = (
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">Create Risk</h2>
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
          {selectedRisk
            ? `R-${selectedRisk.riskNumber} · ${selectedRisk.practice?.name || "Practice"}`
            : "Risk"}
        </span>
      </div>

      {isDetailLoading || !selectedRisk ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading risk...
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 space-y-5">
            <div className="rounded-xl border border-[#f0ece6] bg-[#fbfaf8] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-slate-400">
                    Risk ID
                  </p>
                  <p className="mt-1 text-[22px] font-semibold text-slate-800">
                    R-{selectedRisk.riskNumber}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${riskRatingClass(
                    String(selectedRisk.rating),
                  )}`}
                >
                  {formatRiskRating(String(selectedRisk.rating))}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-slate-500">
                {formatRiskStatus(String(selectedRisk.status))}
                {selectedRisk.workstream
                  ? ` · ${formatPracticeServiceLine(String(selectedRisk.workstream.serviceLine))}`
                  : " · Practice-wide"}
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
      title="Onboarding Risk Register"
      activeModule="Onboarding Projects"
      activeSubItem="Risks"
      navbarIcon={<AlertTriangle className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Risk Register"
            subtitle="Onboarding Projects"
            searchPlaceholder="Search by practice or description..."
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
                rating: "",
              };
              setFilters(cleared);
              setDraftFilters(cleared);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            filterModalTitle="Filter Risks"
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
                    {RISK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
                    Rating
                  </span>
                  <select
                    value={draftFilters.rating}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        rating: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
                  >
                    <option value="">All Ratings</option>
                    {RISK_RATING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            }
            addNewLabel={canWrite ? "New risk" : undefined}
            onAddNew={canWrite ? openCreateForm : undefined}
            onRefresh={async () => {
              try {
                setIsLoading(true);
                await refreshRows();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to load risks");
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
                      No risks found
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-400">
                      Track practice-wide or workstream risks, ratings, and mitigations.
                    </p>
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create Risk
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0 text-left">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Risk ID
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Practice
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Workstream
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Description
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Rating
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Owner
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
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3 font-medium text-slate-700">
                            {String(row.values.riskId || "-")}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.practiceName || "-")}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.workstream || "-")}
                          </td>
                          <td className="max-w-[280px] truncate border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.description || "-")}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${riskRatingClass(
                                String(row.values.rating || ""),
                              )}`}
                            >
                              {formatRiskRating(String(row.values.rating || "-"))}
                            </span>
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            {String(row.values.owner || "-")}
                          </td>
                          <td className="border-b border-[#f4f1ec] px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${riskStatusClass(
                                String(row.values.status || ""),
                              )}`}
                            >
                              {formatRiskStatus(String(row.values.status || "-"))}
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
