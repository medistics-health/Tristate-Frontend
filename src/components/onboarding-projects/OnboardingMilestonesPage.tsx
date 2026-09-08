import React, { useEffect, useMemo, useState } from "react";
import {
  Edit,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import Select from "../shared/Select";
import DatePicker from "../shared/DatePicker";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import DataTableToolbar, {
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import TablePagination from "../shared/TablePagination";
import { TableSkeletonLoader } from "../shared/tablePageUtils";
import {
  getMilestonesApi,
  createMilestoneApi,
  updateMilestoneApi,
  deleteMilestoneApi,
} from "../../services/operations/onboardingProjects";
import { getPracticesView } from "../../services/operations/practices";
import {
  type ActivityLogEntry,
  getCurrentUserName,
  detectFieldChanges,
  appendActivityLog,
  getEntityActivityLogs,
  saveEntityActivityLogs,
  ActivityLogSection,
} from "../../utils/activityLogs";

export type MilestoneItem = {
  id: string;
  milestoneCode: string;
  description: string;
  practiceName: string;
  serviceLine: string;
  targetWeek: string;
  targetDate: string;
  createdAt?: string;
  updatedAt?: string;
};

type MilestoneFilters = {
  serviceLine: string;
  practiceName: string;
};

const defaultFilters: MilestoneFilters = {
  serviceLine: "",
  practiceName: "",
};

const SERVICE_LINE_OPTIONS = [
  { label: "All Service Lines", value: "" },
  { label: "RCM", value: "RCM" },
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "CCM", value: "CCM" },
  { label: "HR", value: "HR" },
  { label: "MSP / IT", value: "MSP_IT" },
  { label: "VBC", value: "VBC" },
  { label: "Compliance", value: "COMPLIANCE" },
];

export default function OnboardingMilestonesPage() {
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");

  // Filters State
  const [filters, setFilters] = useState<MilestoneFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] =
    useState<MilestoneFilters>(defaultFilters);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] =
    useState<MilestoneItem | null>(null);
  const [viewingMilestone, setViewingMilestone] =
    useState<MilestoneItem | null>(null);
  const [milestoneActivities, setMilestoneActivities] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    if (viewingMilestone?.id) {
      const initialLogs: ActivityLogEntry[] = [
        {
          id: `created_${viewingMilestone.id}`,
          action: "Milestone Created",
          details: `Milestone ${viewingMilestone.milestoneCode || "Checkpoint"} initialized`,
          actor: "System",
          userName: "System",
          createdAt: viewingMilestone.createdAt || new Date().toISOString(),
        },
      ];
      setMilestoneActivities(getEntityActivityLogs("milestone", viewingMilestone.id, initialLogs));
    } else {
      setMilestoneActivities([]);
    }
  }, [viewingMilestone?.id]);

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPracticeName, setFormPracticeName] = useState(
    "Summit Medical Arts (Dr. Shah)",
  );
  const [formServiceLine, setFormServiceLine] = useState("RCM");
  const [formTargetWeek, setFormTargetWeek] = useState("Week 1");
  const [formTargetDate, setFormTargetDate] = useState("");

  // Practices searchable options
  const [practiceOptions, setPracticeOptions] = useState<SearchSelectOption[]>(
    [],
  );

  useEffect(() => {
    async function loadPractices() {
      try {
        const res = await getPracticesView({ limit: 2000 }).catch(() => ({
          rows: [],
        }));
        if (res?.rows && res.rows.length > 0) {
          const formatted = res.rows
            .map((r) => ({
              label: String(r.values.name || ""),
              value: String(r.values.name || ""),
            }))
            .filter((e) => Boolean(e.value));
          setPracticeOptions(formatted);
        }
      } catch (err) {
        console.error("Failed to load practices:", err);
      }
    }
    void loadPractices();
  }, []);

  const searchPracticeOptions = useMemo(
    () => async (query: string) => {
      const q = query.toLowerCase();
      return practiceOptions.filter((p) => p.label.toLowerCase().includes(q));
    },
    [practiceOptions],
  );

  const fetchMilestones = async () => {
    setIsLoading(true);
    try {
      const data = await getMilestonesApi({
        search,
      });

      if (Array.isArray(data)) {
        let filtered = data;
        if (filters.serviceLine) {
          filtered = filtered.filter(
            (m) => m.serviceLine === filters.serviceLine,
          );
        }
        if (filters.practiceName) {
          filtered = filtered.filter(
            (m) => m.practiceName === filters.practiceName,
          );
        }
        setMilestones(filtered);
      } else {
        setMilestones([]);
      }
    } catch (err) {
      console.error("Failed to load milestones:", err);
      setMilestones([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [search, filters]);

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearch("");
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    return [filters.serviceLine, filters.practiceName].filter(
      Boolean,
    ).length;
  }, [filters]);

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.practiceName) {
      chips.push({
        key: "practiceName",
        label: "Practice",
        displayValue: filters.practiceName,
        onClear: () => setFilters((curr) => ({ ...curr, practiceName: "" })),
      });
    }
    if (filters.serviceLine) {
      chips.push({
        key: "serviceLine",
        label: "Service Line",
        displayValue: filters.serviceLine,
        onClear: () => setFilters((curr) => ({ ...curr, serviceLine: "" })),
      });
    }
    return chips;
  }, [filters]);

  const paginatedMilestones = useMemo(() => {
    const start = (page - 1) * pageSize;
    return milestones.slice(start, start + pageSize);
  }, [milestones, page, pageSize]);

  const totalPages = Math.ceil(milestones.length / pageSize) || 1;

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) return;

    try {
      const created = await createMilestoneApi({
        milestoneCode: formCode || `M${milestones.length + 1}`,
        description: formDescription,
        practiceName: formPracticeName,
        serviceLine: formServiceLine,
        targetWeek: formTargetWeek,
        targetDate: formTargetDate,
      });

      if (created?.id) {
        const currentName = getCurrentUserName();
        const initialLogs: ActivityLogEntry[] = [
          {
            id: `act_${Date.now()}`,
            action: "Milestone Created",
            details: `Milestone ${created.milestoneCode || "item"} was created`,
            actor: currentName,
            userName: currentName,
            createdAt: new Date().toISOString(),
          },
        ];
        saveEntityActivityLogs("milestone", created.id, initialLogs);
      }

      toast.success(`Milestone ${created.milestoneCode || "entry"} created!`);
      setIsNewModalOpen(false);
      resetForm();
      fetchMilestones();
    } catch (err: any) {
      toast.error(err.message || "Failed to create milestone");
    }
  };

  const handleOpenEdit = (m: MilestoneItem) => {
    setEditingMilestone(m);
    setFormCode(m.milestoneCode);
    setFormDescription(m.description);
    setFormPracticeName(m.practiceName);
    setFormServiceLine(m.serviceLine);
    setFormTargetWeek(m.targetWeek);
    setFormTargetDate(m.targetDate);
    setIsEditModalOpen(true);
  };

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone || !formDescription.trim()) return;

    try {
      const updated = await updateMilestoneApi(editingMilestone.id, {
        milestoneCode: formCode,
        description: formDescription,
        practiceName: formPracticeName,
        serviceLine: formServiceLine,
        targetWeek: formTargetWeek,
        targetDate: formTargetDate,
      });

      const changes = detectFieldChanges(
        {
          milestoneCode: editingMilestone.milestoneCode,
          description: editingMilestone.description,
          practiceName: editingMilestone.practiceName,
          serviceLine: editingMilestone.serviceLine,
          targetWeek: editingMilestone.targetWeek,
          targetDate: editingMilestone.targetDate,
        },
        {
          milestoneCode: formCode,
          description: formDescription,
          practiceName: formPracticeName,
          serviceLine: formServiceLine,
          targetWeek: formTargetWeek,
          targetDate: formTargetDate,
        },
        {
          milestoneCode: "Code",
          description: "Description",
          practiceName: "Practice",
          serviceLine: "Service Line",
          targetWeek: "Target Week",
          targetDate: "Target Date",
        }
      );

      if (changes.length > 0) {
        const currentLogs = getEntityActivityLogs("milestone", editingMilestone.id);
        const currentName = getCurrentUserName();
        const updatedLogs = appendActivityLog(currentLogs, {
          id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          action: "Milestone Updated",
          details: changes.join("; "),
          actor: currentName,
          userName: currentName,
          createdAt: new Date().toISOString(),
        });
        saveEntityActivityLogs("milestone", editingMilestone.id, updatedLogs);
        if (viewingMilestone?.id === editingMilestone.id) {
          setMilestoneActivities(updatedLogs);
        }
      }

      toast.success(`Milestone ${updated.milestoneCode || "item"} updated!`);
      setIsEditModalOpen(false);
      setEditingMilestone(null);
      resetForm();
      fetchMilestones();
    } catch (err: any) {
      toast.error(err.message || "Failed to update milestone");
    }
  };

  const handleDeleteMilestone = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete Milestone ${code}?`))
      return;

    try {
      await deleteMilestoneApi(id);
      toast.success(`Milestone ${code} deleted!`);
      fetchMilestones();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete milestone");
    }
  };

  const resetForm = () => {
    setFormCode("");
    setFormDescription("");
    setFormPracticeName("Summit Medical Arts (Dr. Shah)");
    setFormServiceLine("RCM");
    setFormTargetWeek("Week 1");
    setFormTargetDate("");
  };

  const metrics = useMemo(() => {
    const total = milestones.length;
    const onTrack = milestones.filter((m) => m.status === "ON_TRACK").length;
    const atRisk = milestones.filter((m) => m.status === "AT_RISK").length;
    const complete = milestones.filter((m) => m.status === "COMPLETE").length;
    return { total, onTrack, atRisk, complete };
  }, [milestones]);

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Practice
        </span>
        <SearchSelect
          value={draftFilters.practiceName}
          onChange={(val) =>
            setDraftFilters((curr) => ({ ...curr, practiceName: val }))
          }
          onSearch={searchPracticeOptions}
          clearable
          toggleOnSelectSame
          placeholder="Search practice"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Service Line
        </span>
        <Select
          value={draftFilters.serviceLine}
          onChange={(val) =>
            setDraftFilters((curr) => ({ ...curr, serviceLine: val }))
          }
          options={SERVICE_LINE_OPTIONS}
          placeholder="Select Service Line"
        />
      </label>
    </>
  );

  return (
    <AppLayout
      title="Onboarding Milestones"
      activeModule="Project Management"
      activeSubItem="Milestones"
    >
      <div className="space-y-4 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f7f5f1] p-2">
        {/* Standardized DataTableToolbar like Credentialing Module */}
        <DataTableToolbar
          title="Project Milestones"
          subtitle="Timeline checkpoints (M1, M2...) and target dates"
          searchPlaceholder="Search milestone ID, description, practice..."
          searchValue={search}
          onSearchChange={setSearch}
          activeFilterCount={activeFilterCount}
          activeChips={activeFilterChips}
          onResetFilters={handleResetFilters}
          onApplyFilters={handleApplyFilters}
          onOpenFilterModal={handleOpenFilterModal}
          filterModalTitle="Filter Project Milestones"
          filterFields={filterFieldsModal}
        />
        {/* Metrics Bar */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Checkpoints
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800">
              {milestones.length}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Unique Practices
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-700">
              {new Set(milestones.map((m) => m.practiceName)).size}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Active Service Lines
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {new Set(milestones.map((m) => m.serviceLine)).size}
            </div>
          </div>
        </div>
        {/* Milestones Data Table */}
        {isLoading ? (
          <TableSkeletonLoader columns={7} rows={5} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {milestones.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No project milestones found. Click "Add Milestone" to create a new
                checkpoint.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Milestone ID</th>
                    <th className="py-3.5 px-4">Practice & Service Line</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Target Week</th>
                    <th className="py-3.5 px-4">Target Date</th>
                    <th className="py-3.5 px-4">Last Updated</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedMilestones.map((m) => {
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setViewingMilestone(m)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                          {m.milestoneCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {m.practiceName}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400">
                            {m.serviceLine}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 max-w-md">
                          {m.description}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {m.targetWeek}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono">
                          {m.targetDate}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {m.updatedAt || m.createdAt || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingMilestone(m)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="View Details & Activity"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Edit Milestone"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMilestone(m.id, m.milestoneCode)
                              }
                              className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Delete Milestone"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Standard Table Pagination */}
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={milestones.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
        )}

        {/* Create Milestone Modal */}
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 font-app-sans">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Add Project Milestone
                </h3>
                <button
                  onClick={() => setIsNewModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleCreateMilestone}
                className="mt-4 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Milestone ID (e.g. M1, M2)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if left blank"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Milestone checkpoint description..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Practice
                    </label>
                    <SearchSelect
                      options={practiceOptions}
                      value={formPracticeName}
                      onChange={(val) => setFormPracticeName(val)}
                      onSearch={searchPracticeOptions}
                      placeholder="Select Practice"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Service Line
                    </label>
                    <Select
                      value={formServiceLine}
                      onChange={(val) => setFormServiceLine(val)}
                      options={SERVICE_LINE_OPTIONS.filter(
                        (o) => o.value !== "",
                      )}
                      placeholder="Select Service Line"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Week
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Week 1 or Week 8-16"
                      value={formTargetWeek}
                      onChange={(e) => setFormTargetWeek(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Date
                    </label>
                    <DatePicker
                      value={formTargetDate}
                      onChange={(val) => setFormTargetDate(val)}
                      placeholder="MM-DD-YYYY"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Save Milestone
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Milestone Modal */}
        {isEditModalOpen && editingMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 font-app-sans">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Edit Project Milestone
                </h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingMilestone(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleUpdateMilestone}
                className="mt-4 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Date
                  </label>
                  <DatePicker
                    value={formTargetDate}
                    onChange={(val) => setFormTargetDate(val)}
                    placeholder="MM-DD-YYYY"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingMilestone(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Update Milestone
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Milestone Modal with Activity Log */}
        {viewingMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 font-app-sans overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {viewingMilestone.milestoneCode}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Milestone Details
                  </h3>
                </div>
                <button
                  onClick={() => setViewingMilestone(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Description
                    </span>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">
                      {viewingMilestone.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Practice
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {viewingMilestone.practiceName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Service Line
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {viewingMilestone.serviceLine}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Target Week
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {viewingMilestone.targetWeek}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Target Date
                      </span>
                      <span className="text-xs font-semibold font-mono text-slate-700">
                        {viewingMilestone.targetDate || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <ActivityLogSection logs={milestoneActivities} title="Milestone Activity History" />
                </div>
              </div>

              <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMilestone;
                    setViewingMilestone(null);
                    handleOpenEdit(m);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Edit Milestone
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMilestone(null)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
