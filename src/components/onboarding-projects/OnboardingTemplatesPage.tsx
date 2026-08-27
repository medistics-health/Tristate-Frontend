import React, { useEffect, useMemo, useState } from "react";
import {
  Layers,
  Plus,
  User,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Edit,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import Select from "../shared/Select";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import DataTableToolbar, { type ActiveFilterChip } from "../shared/DataTableToolbar";
import TablePagination from "../shared/TablePagination";
import {
  getTemplatesApi,
  createTemplateApi,
  updateTemplateApi,
  deleteTemplateApi,
} from "../../services/operations/onboardingProjects";
import { getAllUsers } from "../../services/operations/users";

export type ServiceLine =
  | "HR"
  | "BENEFITS"
  | "CREDENTIALING"
  | "RCM"
  | "CCM"
  | "VBC"
  | "BACK_OFFICE"
  | "COMPLIANCE"
  | "MSP_IT"
  | "EMR"
  | "SYNGATE"
  | "SALES"
  | "CREDIT_CARDS";

export type TaskPhase =
  | "ONBOARDING_ACCESS"
  | "ASSESSMENT_DISCOVERY"
  | "PLANNING_CONFIGURATION"
  | "TESTING_VALIDATION"
  | "GO_LIVE_STABILIZATION";

export type TemplateTaskItem = {
  id?: string;
  taskNumber: number;
  taskName: string;
  phase: TaskPhase;
  defaultOwnerId?: string;
  defaultOwnerName?: string;
  startOffsetDays: number;
  dueOffsetDays: number;
  deliverable?: string;
  notes?: string;
};

export type TaskTemplate = {
  id: string;
  serviceLine: ServiceLine;
  name: string;
  description?: string;
  isActive: boolean;
  taskCount: number;
  tasks: TemplateTaskItem[];
  createdAt?: string;
  updatedAt?: string;
};

type TemplateFilters = {
  serviceLine: string;
};

const defaultFilters: TemplateFilters = {
  serviceLine: "",
};

const SERVICE_LINE_OPTIONS = [
  { label: "All Service Lines", value: "" },
  { label: "RCM", value: "RCM" },
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "CCM", value: "CCM" },
  { label: "HR", value: "HR" },
  { label: "Benefits", value: "BENEFITS" },
  { label: "MSP / IT", value: "MSP_IT" },
  { label: "VBC", value: "VBC" },
  { label: "Compliance", value: "COMPLIANCE" },
  { label: "EMR", value: "EMR" },
  { label: "Back Office", value: "BACK_OFFICE" },
  { label: "Syngate", value: "SYNGATE" },
  { label: "Sales", value: "SALES" },
  { label: "Credit Cards", value: "CREDIT_CARDS" },
];

const PHASE_LABELS: Record<TaskPhase, string> = {
  ONBOARDING_ACCESS: "Phase 1: Onboarding & Access",
  ASSESSMENT_DISCOVERY: "Phase 2: Assessment & Discovery",
  PLANNING_CONFIGURATION: "Phase 3: Planning & Configuration",
  TESTING_VALIDATION: "Phase 4: Testing & Validation",
  GO_LIVE_STABILIZATION: "Phase 5: Go-Live & Stabilization",
};

const DEFAULT_OWNER_MAPPING: Record<ServiceLine, string> = {
  RCM: "Abid Patel / Anabil Sen",
  CREDENTIALING: "Vibha Sharma",
  CCM: "Cindy Crawford",
  HR: "Rob Jenkins",
  BENEFITS: "Rob Jenkins",
  MSP_IT: "Tarun Kumar",
  VBC: "Sri",
  COMPLIANCE: "Vibha Sharma",
  EMR: "Tarun Kumar",
  BACK_OFFICE: "Hemin / Sidhdhi",
  SYNGATE: "Tarun Kumar",
  SALES: "Krunal",
  CREDIT_CARDS: "Abid Patel",
};

export default function OnboardingTemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<TemplateFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<TemplateFilters>(defaultFilters);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  // Modal State - Create & Edit
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const [newServiceName, setNewServiceName] = useState<ServiceLine>("RCM");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getTemplatesApi({
        serviceLine: filters.serviceLine,
        search,
      });

      if (data && Array.isArray(data)) {
        setTemplates(data);
        if (data.length > 0) {
          if (!selectedTemplate) {
            setSelectedTemplate(data[0]);
          } else {
            const updated = data.find((t) => t.id === selectedTemplate.id);
            if (updated) setSelectedTemplate(updated);
          }
        }
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
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
    return [filters.serviceLine].filter(Boolean).length;
  }, [filters]);

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
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

  const paginatedTemplates = useMemo(() => {
    const start = (page - 1) * pageSize;
    return templates.slice(start, start + pageSize);
  }, [templates, page, pageSize]);

  const totalPages = Math.ceil(templates.length / pageSize) || 1;

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    try {
      const created = await createTemplateApi({
        serviceLine: newServiceName,
        name: newTemplateName,
        description: newDescription,
        tasks: [],
      });

      toast.success(`Template ${created.name} created!`);
      setIsNewTemplateModalOpen(false);
      setNewTemplateName("");
      setNewDescription("");
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to create template");
    }
  };

  const handleOpenEdit = (tpl: TaskTemplate) => {
    setEditingTemplate(tpl);
    setNewServiceName(tpl.serviceLine);
    setNewTemplateName(tpl.name);
    setNewDescription(tpl.description || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !newTemplateName.trim()) return;

    try {
      const updated = await updateTemplateApi(editingTemplate.id, {
        serviceLine: newServiceName,
        name: newTemplateName,
        description: newDescription,
      });

      toast.success(`Template ${updated.name || "blueprint"} updated successfully!`);
      setIsEditModalOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to update template");
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;

    try {
      await deleteTemplateApi(id);
      toast.success(`Template "${name}" deleted!`);
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete template");
    }
  };

  const filterFieldsModal = (
    <div className="grid grid-cols-1 gap-4">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Service Line</span>
        <Select
          value={draftFilters.serviceLine}
          onChange={(val) => setDraftFilters({ serviceLine: val })}
          options={SERVICE_LINE_OPTIONS}
          placeholder="Select Service Line"
        />
      </label>
    </div>
  );

  return (
    <AppLayout title="Onboarding Task Templates" activeModule="Task Tracker" activeSubItem="Task Templates">
      <div className="space-y-6 p-6 font-app-sans">
        <DataTableToolbar
          title="Task Templates"
          subtitle="Service line blueprints and 5-phase task offset templates"
          searchPlaceholder="Search templates by name, description..."
          searchValue={search}
          onSearchChange={setSearch}
          activeFilterCount={activeFilterCount}
          activeChips={activeFilterChips}
          onResetFilters={handleResetFilters}
          onApplyFilters={handleApplyFilters}
          onOpenFilterModal={handleOpenFilterModal}
          filterModalTitle="Filter Task Templates"
          filterFields={filterFieldsModal}
          addNewLabel="New Template"
          onAddNew={() => {
            setNewServiceName("RCM");
            setNewTemplateName("");
            setNewDescription("");
            setIsNewTemplateModalOpen(true);
          }}
        />

        {/* Two-Column Workspace Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Template List Cards */}
          <div className="space-y-3 lg:col-span-4">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white p-8">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  Loading Templates...
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                No templates found matching your filters.
              </div>
            ) : (
              <>
                {paginatedTemplates.map((tpl) => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  const defaultOwner = DEFAULT_OWNER_MAPPING[tpl.serviceLine] || "Operations Team";

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`group relative cursor-pointer rounded-xl border p-4 shadow-sm transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {tpl.serviceLine}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {tpl.taskCount || tpl.tasks.length} Standard Tasks
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(tpl);
                            }}
                            title="Edit Template"
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(tpl.id, tpl.name);
                            }}
                            title="Delete Template"
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {tpl.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{tpl.description}</p>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-600 font-medium">
                          <User className="h-3 w-3 text-indigo-500" />
                          <span>Owner: {defaultOwner}</span>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "text-indigo-600 translate-x-1" : "text-slate-300"}`} />
                      </div>
                    </div>
                  );
                })}

                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  totalRecords={templates.length}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                />
              </>
            )}
          </div>

          {/* Template Details & Tasks View */}
          <div className="lg:col-span-8">
            {selectedTemplate ? (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="border-b border-slate-200 bg-slate-50/60 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800">
                          {selectedTemplate.serviceLine} Blueprint
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          Default Team Owner: {DEFAULT_OWNER_MAPPING[selectedTemplate.serviceLine] || "Operations"}
                        </span>
                      </div>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">{selectedTemplate.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">{selectedTemplate.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(selectedTemplate)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                      >
                        <Edit className="h-3.5 w-3.5 text-indigo-600" />
                        Edit Blueprint
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(selectedTemplate.id, selectedTemplate.name)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tasks Grouped By Phase */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Standard Phase Tasks & Offset Days
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      Auto-calculates Due Date = Kickoff + Offset Days
                    </span>
                  </div>

                  {(
                    [
                      "ONBOARDING_ACCESS",
                      "ASSESSMENT_DISCOVERY",
                      "PLANNING_CONFIGURATION",
                      "TESTING_VALIDATION",
                      "GO_LIVE_STABILIZATION",
                    ] as TaskPhase[]
                  ).map((phaseKey) => {
                    const phaseTasks = selectedTemplate.tasks.filter((t) => t.phase === phaseKey);
                    if (phaseTasks.length === 0) return null;

                    return (
                      <div key={phaseKey} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            {PHASE_LABELS[phaseKey]}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 shadow-xs border border-slate-200">
                            {phaseTasks.length} Tasks
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 overflow-hidden">
                          {phaseTasks.map((item) => (
                            <div key={item.id || item.taskNumber} className="p-3.5 flex items-start justify-between gap-4 text-xs hover:bg-slate-50/80 transition-colors">
                              <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono font-bold text-slate-700 text-[11px]">
                                  #{item.taskNumber}
                                </span>
                                <div>
                                  <div className="font-semibold text-slate-900">{item.taskName}</div>
                                  {item.deliverable && (
                                    <div className="mt-0.5 text-[11px] text-slate-500 font-medium">
                                      Deliverable: <span className="text-slate-700">{item.deliverable}</span>
                                    </div>
                                  )}
                                  {item.notes && (
                                    <div className="mt-0.5 text-[11px] text-slate-400 italic">{item.notes}</div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <div className="font-semibold text-indigo-700 text-[11px]">
                                    Due +{item.dueOffsetDays} Days
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    Start +{item.startOffsetDays}d
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                Select a service line blueprint card on the left to view template tasks.
              </div>
            )}
          </div>
        </div>

        {/* Create Template Modal */}
        {isNewTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-app-sans">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Create Task Template Blueprint</h3>
                <button
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTemplate} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Line *</label>
                  <Select
                    value={newServiceName}
                    onChange={(val) => setNewServiceName(val as ServiceLine)}
                    options={SERVICE_LINE_OPTIONS.filter((o) => o.value !== "")}
                    placeholder="Select Service Line"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Template Blueprint Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard RCM Blueprint"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe purpose of this onboarding blueprint..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsNewTemplateModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Template Modal */}
        {isEditModalOpen && editingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-app-sans">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Edit Task Template Blueprint</h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTemplate(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateTemplate} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Line *</label>
                  <Select
                    value={newServiceName}
                    onChange={(val) => setNewServiceName(val as ServiceLine)}
                    options={SERVICE_LINE_OPTIONS.filter((o) => o.value !== "")}
                    placeholder="Select Service Line"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Template Blueprint Name *</label>
                  <input
                    type="text"
                    required
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingTemplate(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Update Blueprint
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

