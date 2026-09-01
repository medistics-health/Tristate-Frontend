import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  Edit,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import Select from "../shared/Select";
import DatePicker from "../shared/DatePicker";
import DataTableToolbar, { type ActiveFilterChip } from "../shared/DataTableToolbar";
import {
  getTemplatesApi,
  createTemplateApi,
  updateTemplateApi,
  deleteTemplateApi,
} from "../../services/operations/onboardingProjects";

import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
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
  startMode?: "OFFSET" | "FIXED_DATE";
  dueMode?: "OFFSET" | "FIXED_DATE";
  startOffsetDays: number;
  dueOffsetDays: number;
  fixedStartDate?: string;
  fixedDueDate?: string;
  deliverable?: string;
  notes?: string;
};

export type TaskTemplate = {
  id: string;
  serviceLine: ServiceLine;
  name: string;
  description?: string;
  defaultOwnerId?: string;
  defaultOwnerName?: string;
  isActive: boolean;
  taskCount: number;
  tasks: TemplateTaskItem[];
  createdAt?: string;
  updatedAt?: string;
};

type TemplateFilters = {
  serviceLine: string;
  ownerUserId: string;
  ownerName: string;
};

const defaultFilters: TemplateFilters = {
  serviceLine: "",
  ownerUserId: "",
  ownerName: "",
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

export default function OnboardingTemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<TemplateFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<TemplateFilters>(defaultFilters);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [userOptions, setUserOptions] = useState<SearchSelectOption[]>([]);

  // Modal state
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const [newServiceName, setNewServiceName] = useState<ServiceLine>("RCM");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newDefaultOwnerId, setNewDefaultOwnerId] = useState("");
  const [newDefaultOwnerName, setNewDefaultOwnerName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [editServiceName, setEditServiceName] = useState<ServiceLine>("RCM");
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editDefaultOwnerId, setEditDefaultOwnerId] = useState("");
  const [editDefaultOwnerName, setEditDefaultOwnerName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Task Item modal (Add & Edit)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskItem, setEditingTaskItem] = useState<TemplateTaskItem | null>(null);
  const [taskItemName, setTaskItemName] = useState("");
  const [taskItemPhase, setTaskItemPhase] = useState<TaskPhase>("ONBOARDING_ACCESS");
  const [taskItemDefaultOwnerId, setTaskItemDefaultOwnerId] = useState("");
  const [taskItemDefaultOwnerName, setTaskItemDefaultOwnerName] = useState("");
  const [taskItemStartMode, setTaskItemStartMode] = useState<"OFFSET" | "FIXED_DATE">("OFFSET");
  const [taskItemDueMode, setTaskItemDueMode] = useState<"OFFSET" | "FIXED_DATE">("OFFSET");
  const [taskItemStartOffset, setTaskItemStartOffset] = useState<number>(0);
  const [taskItemDueOffset, setTaskItemDueOffset] = useState<number>(7);
  const [taskItemFixedStartDate, setTaskItemFixedStartDate] = useState("");
  const [taskItemFixedDueDate, setTaskItemFixedDueDate] = useState("");
  const [taskItemDeliverable, setTaskItemDeliverable] = useState("");
  const [taskItemNotes, setTaskItemNotes] = useState("");

  useEffect(() => {
    getAllUsers({ limit: 1000 })
      .then((res) => {
        if (res && Array.isArray(res.users)) {
          setUserOptions(
            res.users.map((u: any) => ({
              label: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.userName || u.email,
              value: u.id,
            }))
          );
        }
      })
      .catch((err) => console.error("Failed to load users:", err));
  }, []);

  const searchUserOptions = async (query: string): Promise<SearchSelectOption[]> => {
    if (!query) return userOptions;
    const q = query.toLowerCase();
    return userOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  };

  const handleOpenAddTaskModal = () => {
    setEditingTaskItem(null);
    setTaskItemName("");
    setTaskItemPhase("ONBOARDING_ACCESS");
    setTaskItemDefaultOwnerId("");
    setTaskItemDefaultOwnerName("");
    setTaskItemStartMode("OFFSET");
    setTaskItemDueMode("OFFSET");
    setTaskItemStartOffset(0);
    setTaskItemDueOffset(7);
    setTaskItemFixedStartDate("");
    setTaskItemFixedDueDate("");
    setTaskItemDeliverable("");
    setTaskItemNotes("");
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTaskModal = (item: TemplateTaskItem) => {
    setEditingTaskItem(item);
    setTaskItemName(item.taskName);
    setTaskItemPhase(item.phase);
    setTaskItemDefaultOwnerId(item.defaultOwnerId || "");
    setTaskItemDefaultOwnerName(item.defaultOwnerName || "");
    setTaskItemStartMode(item.startMode || (item.fixedStartDate ? "FIXED_DATE" : "OFFSET"));
    setTaskItemDueMode(item.dueMode || (item.fixedDueDate ? "FIXED_DATE" : "OFFSET"));
    setTaskItemStartOffset(item.startOffsetDays ?? 0);
    setTaskItemDueOffset(item.dueOffsetDays ?? 7);
    setTaskItemFixedStartDate(item.fixedStartDate || "");
    setTaskItemFixedDueDate(item.fixedDueDate || "");
    setTaskItemDeliverable(item.deliverable || "");
    setTaskItemNotes(item.notes || "");
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !taskItemName.trim()) return;

    setIsSubmitting(true);
    const existingTasks = selectedTemplate.tasks || [];
    let updatedTasks: TemplateTaskItem[] = [];

    const taskPayload = {
      taskName: taskItemName.trim(),
      phase: taskItemPhase,
      defaultOwnerId: taskItemDefaultOwnerId || undefined,
      defaultOwnerName: taskItemDefaultOwnerName || undefined,
      startMode: taskItemStartMode,
      dueMode: taskItemDueMode,
      startOffsetDays: Number(taskItemStartOffset) || 0,
      dueOffsetDays: Number(taskItemDueOffset) || 7,
      fixedStartDate: taskItemStartMode === "FIXED_DATE" ? taskItemFixedStartDate : undefined,
      fixedDueDate: taskItemDueMode === "FIXED_DATE" ? taskItemFixedDueDate : undefined,
      deliverable: taskItemDeliverable.trim() || undefined,
      notes: taskItemNotes.trim() || undefined,
    };

    if (editingTaskItem) {
      updatedTasks = existingTasks.map((t) => {
        if ((t.id && t.id === editingTaskItem.id) || t.taskNumber === editingTaskItem.taskNumber) {
          return {
            ...t,
            ...taskPayload,
          };
        }
        return t;
      });
    } else {
      const newTaskNumber = existingTasks.length + 1;
      const newTaskObj: TemplateTaskItem = {
        taskNumber: newTaskNumber,
        ...taskPayload,
      };
      updatedTasks = [...existingTasks, newTaskObj];
    }

    try {
      const updated = await updateTemplateApi(selectedTemplate.id, {
        serviceLine: selectedTemplate.serviceLine,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        tasks: updatedTasks,
      });

      toast.success(editingTaskItem ? `Task updated!` : `Task "${taskItemName}" added to blueprint!`);
      setIsTaskModalOpen(false);
      setEditingTaskItem(null);
      fetchTemplates(updated.id || selectedTemplate.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to save task item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTaskItem = async (item: TemplateTaskItem) => {
    if (!selectedTemplate) return;
    if (!window.confirm(`Are you sure you want to remove task "${item.taskName}" from blueprint?`)) return;

    const remainingTasks = (selectedTemplate.tasks || [])
      .filter((t) => {
        if (item.id && t.id) return t.id !== item.id;
        return t.taskNumber !== item.taskNumber;
      })
      .map((t, idx) => ({ ...t, taskNumber: idx + 1 }));

    try {
      const updated = await updateTemplateApi(selectedTemplate.id, {
        serviceLine: selectedTemplate.serviceLine,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        tasks: remainingTasks,
      });

      toast.success(`Task removed from blueprint!`);
      fetchTemplates(updated.id || selectedTemplate.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove task item");
    }
  };

  const fetchTemplates = async (selectId?: string) => {
    setIsLoading(true);
    try {
      const data = await getTemplatesApi({
        serviceLine: filters.serviceLine,
        search,
      });

      if (data && Array.isArray(data)) {
        setTemplates(data);
        if (data.length > 0) {
          const targetId = selectId || selectedTemplate?.id;
          const matched = data.find((t) => t.id === targetId);
          setSelectedTemplate(matched || data[0]);
        } else {
          setSelectedTemplate(null);
        }
      } else {
        setTemplates([]);
        setSelectedTemplate(null);
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
    return [filters.serviceLine, filters.ownerUserId || filters.ownerName].filter(Boolean).length;
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
    if (filters.ownerName || filters.ownerUserId) {
      chips.push({
        key: "owner",
        label: "Default Owner",
        displayValue: filters.ownerName || filters.ownerUserId,
        onClear: () => setFilters((curr) => ({ ...curr, ownerUserId: "", ownerName: "" })),
      });
    }
    return chips;
  }, [filters]);

  const filteredTemplates = useMemo(() => {
    if (!filters.ownerUserId && !filters.ownerName) return templates;
    const targetUserId = filters.ownerUserId;
    const targetName = (filters.ownerName || "").toLowerCase();

    return templates.filter((tpl) => {
      if (targetUserId && tpl.defaultOwnerId === targetUserId) return true;
      if (targetName && tpl.defaultOwnerName && tpl.defaultOwnerName.toLowerCase().includes(targetName)) return true;
      return tpl.tasks.some((t) => {
        if (targetUserId && t.defaultOwnerId === targetUserId) return true;
        if (targetName && t.defaultOwnerName && t.defaultOwnerName.toLowerCase().includes(targetName)) return true;
        return false;
      });
    });
  }, [templates, filters.ownerUserId, filters.ownerName]);

  const paginatedTemplates = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, page, pageSize]);

  const totalPages = Math.ceil(filteredTemplates.length / pageSize) || 1;

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createTemplateApi({
        serviceLine: newServiceName,
        name: newTemplateName,
        description: newDescription,
        defaultOwnerId: newDefaultOwnerId || undefined,
        defaultOwnerName: newDefaultOwnerName || undefined,
        tasks: [],
      });

      toast.success(`Template ${created.name} created!`);
      setIsNewTemplateModalOpen(false);
      setNewTemplateName("");
      setNewDescription("");
      setNewDefaultOwnerId("");
      setNewDefaultOwnerName("");
      fetchTemplates(created.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (tpl: TaskTemplate) => {
    setEditingTemplate(tpl);
    setEditServiceName(tpl.serviceLine);
    setEditTemplateName(tpl.name);
    setEditDescription(tpl.description || "");
    setEditDefaultOwnerId(tpl.defaultOwnerId || "");
    setEditDefaultOwnerName(tpl.defaultOwnerName || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editTemplateName.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await updateTemplateApi(editingTemplate.id, {
        serviceLine: editServiceName,
        name: editTemplateName,
        description: editDescription,
        defaultOwnerId: editDefaultOwnerId || undefined,
        defaultOwnerName: editDefaultOwnerName || undefined,
      });

      toast.success(`Template ${updated.name || "blueprint"} updated successfully!`);
      setIsEditModalOpen(false);
      setEditingTemplate(null);
      fetchTemplates(updated.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to update template");
    } finally {
      setIsSubmitting(false);
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

  const handleAddTaskItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !taskItemName.trim()) return;

    setIsSubmitting(true);
    const existingTasks = selectedTemplate.tasks || [];
    const newTaskNumber = existingTasks.length + 1;
    const newTaskObj = {
      taskNumber: newTaskNumber,
      taskName: taskItemName.trim(),
      phase: taskItemPhase,
      startOffsetDays: Number(taskItemStartOffset) || 0,
      dueOffsetDays: Number(taskItemDueOffset) || 7,
      deliverable: taskItemDeliverable.trim() || undefined,
      notes: taskItemNotes.trim() || undefined,
    };

    const updatedTasks = [...existingTasks, newTaskObj];

    try {
      const updated = await updateTemplateApi(selectedTemplate.id, {
        serviceLine: selectedTemplate.serviceLine,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        tasks: updatedTasks,
      });

      toast.success(`Task "${taskItemName}" added to blueprint!`);
      setIsAddTaskModalOpen(false);
      setTaskItemName("");
      setTaskItemDeliverable("");
      setTaskItemNotes("");
      setTaskItemStartOffset(0);
      setTaskItemDueOffset(7);
      fetchTemplates(updated.id || selectedTemplate.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to add task item to blueprint");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Service Line</span>
        <Select
          value={draftFilters.serviceLine}
          onChange={(val) => setDraftFilters((curr) => ({ ...curr, serviceLine: val }))}
          options={SERVICE_LINE_OPTIONS}
          placeholder="Select Service Line"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Default Owner</span>
        <SearchSelect
          value={draftFilters.ownerUserId}
          displayLabel={draftFilters.ownerName}
          onChange={(val, opt) => {
            setDraftFilters((curr) => ({
              ...curr,
              ownerUserId: val,
              ownerName: opt?.label || val,
            }));
          }}
          onSearch={searchUserOptions}
          clearable
          toggleOnSelectSame
          placeholder="Search default owner"
        />
      </label>
    </>
  );

  const detailPanel = selectedTemplate ? (
    <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[460px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm font-app-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3 bg-[#fbfaf8]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setSelectedTemplate(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-0 truncate text-[14px] font-semibold text-slate-800">
            {selectedTemplate.name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenEdit(selectedTemplate)}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Edit Blueprint"
          >
            <Edit className="h-4 w-4 text-indigo-600" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteTemplate(selectedTemplate.id, selectedTemplate.name)}
            className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            title="Delete Blueprint"
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedTemplate(null)}
            className="rounded p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Metric Summary Card */}
        <div className="rounded-xl border border-[#f0ece6] bg-[#fbfaf8] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                Service Line
              </p>
              <p className="mt-0.5 text-base font-bold text-indigo-700">
                {selectedTemplate.serviceLine}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              {selectedTemplate.tasks.length} Standard Tasks
            </span>
          </div>
          <p className="mt-2 text-[12px] text-slate-500 line-clamp-2">
            {selectedTemplate.description || "No description provided."}
          </p>
        </div>

        {/* Tasks Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-slate-800">
              Tasks Blueprint ({selectedTemplate.tasks.length})
            </h3>
            <button
              type="button"
              onClick={handleOpenAddTaskModal}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task Item
            </button>
          </div>

          {selectedTemplate.tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#ece8e1] bg-[#faf9f7] p-6 text-center">
              <p className="text-[13px] font-medium text-slate-700">No blueprint task items yet</p>
              <p className="mt-1 text-[12px] text-slate-400">
                Click "Add Task Item" to configure standard phase tasks.
              </p>
            </div>
          ) : (
            (
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
                <div key={phaseKey} className="mb-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#f0ece6] pb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      {PHASE_LABELS[phaseKey]}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {phaseTasks.length} tasks
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {phaseTasks.map((item) => (
                      <div
                        key={item.id || item.taskNumber}
                        className="group relative rounded-lg border border-[#f0ece6] bg-white p-3 text-[13px] hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono font-bold text-slate-700 text-[10px]">
                              #{item.taskNumber}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-800 break-words">{item.taskName}</div>
                              {item.defaultOwnerName && item.defaultOwnerName !== "Unassigned" && (
                                <div className="mt-0.5 text-[11px] font-medium text-indigo-600">
                                  Owner: {item.defaultOwnerName}
                                </div>
                              )}
                              {item.deliverable && (
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  Deliverable: <span className="text-slate-700">{item.deliverable}</span>
                                </div>
                              )}
                              {item.notes && (
                                <div className="mt-0.5 text-[11px] text-slate-400 italic">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 text-[11px] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                <Calendar className="h-3 w-3 text-indigo-500" />
                                {item.dueMode === "FIXED_DATE" || item.fixedDueDate
                                  ? `Due: ${item.fixedDueDate}`
                                  : `Due +${item.dueOffsetDays}d`}
                              </span>
                              <div className="mt-0.5 text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1">
                                <Calendar className="h-2.5 w-2.5 text-slate-400" />
                                {item.startMode === "FIXED_DATE" || item.fixedStartDate
                                  ? `Start: ${item.fixedStartDate}`
                                  : `Start +${item.startOffsetDays}d`}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-1 opacity-90">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTaskModal(item)}
                                className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                title="Edit Task Item"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTaskItem(item)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                title="Delete Task Item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  ) : null;

  return (
    <AppLayout title="Onboarding Task Templates" activeModule="Project Management" activeSubItem="Task Templates">
      <div className="app-split p-2 font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
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
            page={page}
            pageSize={pageSize}
            totalRecords={templates.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white p-8">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Loading Templates...
                  </div>
                </div>
              ) : templates.length === 0 ? (
                <div className="relative flex min-h-[300px] items-center justify-center p-8 text-center text-xs text-slate-400">
                  No templates found. Click "New Template" to create a task template blueprint.
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0 text-left">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Service Line
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Blueprint Name
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Tasks Count
                      </th>
                      <th className="border-b border-r border-[#eeebe5] px-4 py-3 font-medium">
                        Default Owner
                      </th>
                      <th className="border-b border-[#eeebe5] px-4 py-3 font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[14px] text-slate-600">
                    {paginatedTemplates.map((tpl) => {
                      const isSelected = selectedTemplate?.id === tpl.id;
                      const taskOwners = Array.from(
                        new Set(
                          tpl.tasks
                            .map((t) => t.defaultOwnerName)
                            .filter((name): name is string => Boolean(name && name !== "Unassigned"))
                        )
                      );
                      const defaultOwner =
                        tpl.defaultOwnerName ||
                        (taskOwners.length > 0 ? taskOwners.join(", ") : "Unassigned");

                      return (
                        <tr
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl)}
                          className={`cursor-pointer ${
                            isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"
                          }`}
                        >
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                              {tpl.serviceLine}
                            </span>
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3 font-semibold text-slate-800">
                            {tpl.name}
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                              {tpl.taskCount || tpl.tasks.length} tasks
                            </span>
                          </td>
                          <td className="border-b border-r border-[#f4f1ec] px-4 py-3 text-slate-600">
                            {defaultOwner}
                          </td>
                          <td className="border-b border-[#f4f1ec] px-4 py-3 text-slate-500">
                            <span className="line-clamp-1">{tpl.description || "-"}</span>
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

        {detailPanel}
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
                <label className="block font-semibold text-slate-700 mb-1">Default Owner</label>
                <SearchSelect
                  value={newDefaultOwnerId}
                  displayLabel={newDefaultOwnerName}
                  onChange={(val, opt) => {
                    setNewDefaultOwnerId(val);
                    setNewDefaultOwnerName(opt?.label || val);
                  }}
                  onSearch={searchUserOptions}
                  clearable
                  toggleOnSelectSame
                  placeholder="Select default owner user"
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
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-app-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Task Template Blueprint</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTemplate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Line *</label>
                <Select
                  value={editServiceName}
                  onChange={(val) => setEditServiceName(val as ServiceLine)}
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
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Owner</label>
                <SearchSelect
                  value={editDefaultOwnerId}
                  displayLabel={editDefaultOwnerName}
                  onChange={(val, opt) => {
                    setEditDefaultOwnerId(val);
                    setEditDefaultOwnerName(opt?.label || val);
                  }}
                  onSearch={searchUserOptions}
                  clearable
                  toggleOnSelectSame
                  placeholder="Select default owner user"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe purpose of this onboarding blueprint..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Updating..." : "Update Blueprint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Task Item to Blueprint Modal */}
      {isTaskModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-app-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTaskItem ? "Edit Task Item" : "Add Task Item to Blueprint"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">{selectedTemplate.name}</p>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTaskItem} className="mt-4 space-y-4 text-xs">
              {/* Row 1: Task Name & Standard Phase */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Task Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EHR & PM System Access Setup"
                    value={taskItemName}
                    onChange={(e) => setTaskItemName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Standard Phase *</label>
                  <select
                    value={taskItemPhase}
                    onChange={(e) => setTaskItemPhase(e.target.value as TaskPhase)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                  >
                    {(
                      [
                        "ONBOARDING_ACCESS",
                        "ASSESSMENT_DISCOVERY",
                        "PLANNING_CONFIGURATION",
                        "TESTING_VALIDATION",
                        "GO_LIVE_STABILIZATION",
                      ] as TaskPhase[]
                    ).map((phase) => (
                      <option key={phase} value={phase}>
                        {PHASE_LABELS[phase]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Default Owner & Deliverable */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Owner</label>
                  <SearchSelect
                    value={taskItemDefaultOwnerId}
                    displayLabel={taskItemDefaultOwnerName}
                    onChange={(val, opt) => {
                      setTaskItemDefaultOwnerId(val);
                      setTaskItemDefaultOwnerName(opt?.label || val);
                    }}
                    onSearch={searchUserOptions}
                    clearable
                    toggleOnSelectSame
                    placeholder="Select default owner user"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deliverable</label>
                  <input
                    type="text"
                    placeholder="e.g. Signed ERA Enrollment Form"
                    value={taskItemDeliverable}
                    onChange={(e) => setTaskItemDeliverable(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: 2-Column Grid for Start Date & Due Date Configurations */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                {/* Start Date Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">Start Date Calculation</label>
                    <div className="flex items-center gap-1 rounded-lg bg-slate-200/60 p-0.5 text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setTaskItemStartMode("OFFSET")}
                        className={`rounded-md px-2 py-0.5 transition-colors ${
                          taskItemStartMode === "OFFSET"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Days Offset
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskItemStartMode("FIXED_DATE")}
                        className={`rounded-md px-2 py-0.5 transition-colors ${
                          taskItemStartMode === "FIXED_DATE"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Fixed Date
                      </button>
                    </div>
                  </div>
                  {taskItemStartMode === "OFFSET" ? (
                    <div>
                      <div className="relative flex items-center">
                        <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min={0}
                          value={taskItemStartOffset}
                          onChange={(e) => setTaskItemStartOffset(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-2.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <span className="mt-1 block text-[10px] text-slate-400">Start +{taskItemStartOffset || 0} days from kickoff</span>
                    </div>
                  ) : (
                    <div>
                      <DatePicker
                        value={taskItemFixedStartDate}
                        onChange={(val) => setTaskItemFixedStartDate(val)}
                        placeholder="MM-DD-YYYY"
                      />
                      <span className="mt-1 block text-[10px] text-indigo-600 font-medium">Direct fixed start date when task is created</span>
                    </div>
                  )}
                </div>

                {/* Due Date Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">Due Date Calculation *</label>
                    <div className="flex items-center gap-1 rounded-lg bg-slate-200/60 p-0.5 text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setTaskItemDueMode("OFFSET")}
                        className={`rounded-md px-2 py-0.5 transition-colors ${
                          taskItemDueMode === "OFFSET"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Days Offset
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskItemDueMode("FIXED_DATE")}
                        className={`rounded-md px-2 py-0.5 transition-colors ${
                          taskItemDueMode === "FIXED_DATE"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Fixed Date
                      </button>
                    </div>
                  </div>
                  {taskItemDueMode === "OFFSET" ? (
                    <div>
                      <div className="relative flex items-center">
                        <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-indigo-500 pointer-events-none" />
                        <input
                          type="number"
                          min={1}
                          required
                          value={taskItemDueOffset}
                          onChange={(e) => setTaskItemDueOffset(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-2.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <span className="mt-1 block text-[10px] text-indigo-500 font-medium">Due +{taskItemDueOffset || 7} days from kickoff</span>
                    </div>
                  ) : (
                    <div>
                      <DatePicker
                        value={taskItemFixedDueDate}
                        onChange={(val) => setTaskItemFixedDueDate(val)}
                        placeholder="MM-DD-YYYY"
                      />
                      <span className="mt-1 block text-[10px] text-indigo-600 font-medium">Direct fixed due date when task is created</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: Notes / Instructions (Full Width) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Internal operational instructions for team..."
                  value={taskItemNotes}
                  onChange={(e) => setTaskItemNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving..." : editingTaskItem ? "Update Task Item" : "Add Task Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
