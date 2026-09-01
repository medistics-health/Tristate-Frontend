import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  GripVertical,
  Kanban,
  Layers,
  List,
  Lock,
  Plus,
  ShieldAlert,
  Sparkles,
  User,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar, {
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import DatePicker from "../shared/DatePicker";
import { TableSkeletonLoader, CardGridSkeletonLoader } from "../shared/tablePageUtils";
import {
  getTasksApi,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
} from "../../services/operations/onboardingProjects";
import { getPracticesView } from "../../services/operations/practices";
import { getAllUsers } from "../../services/operations/users";

// Types
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETE";
export type TaskPhase =
  | "ONBOARDING_ACCESS"
  | "ASSESSMENT_DISCOVERY"
  | "PLANNING_CONFIGURATION"
  | "TESTING_VALIDATION"
  | "GO_LIVE_STABILIZATION";

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

export type TaskItem = {
  id: string;
  taskNumber: number;
  taskCode?: string; // e.g. TASK3209192
  name: string;
  practiceId?: string;
  practiceName: string;
  workstreamId?: string;
  serviceLine: ServiceLine;
  phase: TaskPhase;
  status: TaskStatus;
  ownerUserId?: string;
  ownerName: string;
  startDate: string; // Formatted MM-DD-YYYY
  dueDate: string; // Formatted MM-DD-YYYY
  deliverable?: string;
  notes?: string;
  dependencies: {
    id: string;
    name: string;
    taskNumber: number;
    taskCode?: string;
    isComplete: boolean;
  }[];
  actionItemsCount: number;
  activityCount: number;
};

type TaskFilters = {
  practiceId: string;
  practiceName: string;
  serviceLine: string;
  phase: string;
  status: string;
  ownerUserId: string;
  ownerName: string;
  dueDateFrom: string;
  dueDateTo: string;
};

const defaultFilters: TaskFilters = {
  practiceId: "",
  practiceName: "",
  serviceLine: "",
  phase: "",
  status: "",
  ownerUserId: "",
  ownerName: "",
  dueDateFrom: "",
  dueDateTo: "",
};

// Formatting & Helper Functions
export function formatToMMDDYYYY(dateInput?: Date | string | null): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
    return dateInput;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
}

function getUserDisplayName(user: any) {
  return (
    [
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
      user.userName,
      user.email,
    ].find((entry) => Boolean(entry && String(entry).trim())) || ""
  );
}

const PHASE_LABELS: Record<TaskPhase, string> = {
  ONBOARDING_ACCESS: "Phase 1: Onboarding & Access",
  ASSESSMENT_DISCOVERY: "Phase 2: Assessment & Discovery",
  PLANNING_CONFIGURATION: "Phase 3: Planning & Configuration",
  TESTING_VALIDATION: "Phase 4: Testing & Validation",
  GO_LIVE_STABILIZATION: "Phase 5: Go-Live & Stabilization",
};

const PHASE_SHORT_BADGES: Record<TaskPhase, { label: string; color: string }> =
  {
    ONBOARDING_ACCESS: {
      label: "P1: Access",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    ASSESSMENT_DISCOVERY: {
      label: "P2: Discovery",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    PLANNING_CONFIGURATION: {
      label: "P3: Config",
      color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    },
    TESTING_VALIDATION: {
      label: "P4: Testing",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    GO_LIVE_STABILIZATION: {
      label: "P5: Go-Live",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  };

const STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  NOT_STARTED: {
    label: "Not Started",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: Activity,
  },
  BLOCKED: {
    label: "Blocked",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: Lock,
  },
  COMPLETE: {
    label: "Complete",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
};

const SERVICE_LINE_OPTIONS = [
  { label: "All Service Lines", value: "" },
  { label: "RCM", value: "RCM" },
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "CCM", value: "CCM" },
  { label: "HR", value: "HR" },
  { label: "MSP/IT", value: "MSP_IT" },
  { label: "VBC", value: "VBC" },
  { label: "Compliance", value: "COMPLIANCE" },
];

const PHASE_OPTIONS = [
  { label: "All Phases", value: "" },
  { label: "Phase 1: Onboarding & Access", value: "ONBOARDING_ACCESS" },
  { label: "Phase 2: Assessment & Discovery", value: "ASSESSMENT_DISCOVERY" },
  {
    label: "Phase 3: Planning & Configuration",
    value: "PLANNING_CONFIGURATION",
  },
  { label: "Phase 4: Testing & Validation", value: "TESTING_VALIDATION" },
  { label: "Phase 5: Go-Live & Stabilization", value: "GO_LIVE_STABILIZATION" },
];

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Blocked", value: "BLOCKED" },
  { label: "Complete", value: "COMPLETE" },
];

export default function OnboardingTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");

  // Searchable options from Backend API
  const [practiceOptions, setPracticeOptions] = useState<SearchSelectOption[]>(
    [],
  );
  const [userOptions, setUserOptions] = useState<SearchSelectOption[]>([]);
  const [newTaskOwnerOptions, setNewTaskOwnerOptions] = useState<
    SearchSelectOption[]
  >([]);
  const [editTaskOwnerOptions, setEditTaskOwnerOptions] = useState<
    SearchSelectOption[]
  >([]);

  // Filters State
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<TaskFilters>(defaultFilters);

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  // Drawer & Modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // New Task Form
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskPracticeId, setNewTaskPracticeId] = useState("");
  const [newTaskPracticeName, setNewTaskPracticeName] = useState("");
  const [newTaskServiceLine, setNewTaskServiceLine] =
    useState<ServiceLine>("RCM");
  const [newTaskPhase, setNewTaskPhase] =
    useState<TaskPhase>("ONBOARDING_ACCESS");
  const [newTaskOwnerUserId, setNewTaskOwnerUserId] = useState("");
  const [newTaskOwnerName, setNewTaskOwnerName] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskDeliverable, setNewTaskDeliverable] = useState("");

  // Edit Task Form
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskPracticeId, setEditTaskPracticeId] = useState("");
  const [editTaskPracticeName, setEditTaskPracticeName] = useState("");
  const [editTaskServiceLine, setEditTaskServiceLine] =
    useState<ServiceLine>("RCM");
  const [editTaskPhase, setEditTaskPhase] =
    useState<TaskPhase>("ONBOARDING_ACCESS");
  const [editTaskOwnerUserId, setEditTaskOwnerUserId] = useState("");
  const [editTaskOwnerName, setEditTaskOwnerName] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState<TaskStatus>("NOT_STARTED");
  const [editTaskStartDate, setEditTaskStartDate] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskDeliverable, setEditTaskDeliverable] = useState("");
  const [editTaskNotes, setEditTaskNotes] = useState("");

  // Load Practices and Users from backend API
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [practicesRes, usersRes] = await Promise.all([
          getPracticesView({ limit: 2000 }).catch(() => ({ rows: [] })),
          getAllUsers({ limit: 1000 }).catch(() => []),
        ]);

        if (practicesRes?.rows && practicesRes.rows.length > 0) {
          const formattedPractices: SearchSelectOption[] = practicesRes.rows
            .map((row) => ({
              label: String(row.values.name || ""),
              value: String(row.values.id || row.values.name || ""),
            }))
            .filter((e) => Boolean(e.value && e.label))
            .sort((a, b) => a.label.localeCompare(b.label));

          setPracticeOptions(formattedPractices);
        }

        const usersArray =
          (usersRes as any)?.users || (Array.isArray(usersRes) ? usersRes : []);
        if (Array.isArray(usersArray) && usersArray.length > 0) {
          const formattedUsers: SearchSelectOption[] = usersArray
            .map((user: any) => ({
              label: [
                getUserDisplayName(user),
                user.role ? `(${user.role})` : "",
              ]
                .filter(Boolean)
                .join(" ")
                .trim(),
              value: user.id || getUserDisplayName(user),
              subLabel: [user.userName, user.email].filter(Boolean).join(" · "),
            }))
            .filter((e: any) => Boolean(e.value && e.label))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));

          setUserOptions(formattedUsers);
        }
      } catch (err) {
        console.error("Failed to load practices and users:", err);
      }
    }

    void loadDropdowns();
  }, []);

  // Filter Owners dynamically when Practice is selected in Create Modal
  useEffect(() => {
    if (!newTaskPracticeId) {
      setNewTaskOwnerOptions(userOptions);
      return;
    }
    let active = true;
    async function loadPracticeOwners() {
      try {
        const data = await getPersonsView({
          limit: 1000,
          practiceId: newTaskPracticeId,
        });
        if (!active) return;
        if (data?.rows && data.rows.length > 0) {
          const formatted = data.rows
            .map((row: any) => ({
              label: String(
                row.values.fullName ||
                  `${row.values.firstName || ""} ${row.values.lastName || ""}`.trim(),
              ),
              value: String(row.values.id || ""),
              subLabel: String(row.values.role || row.values.email || ""),
            }))
            .filter((e) => Boolean(e.value && e.label))
            .sort((a, b) => a.label.localeCompare(b.label));

          setNewTaskOwnerOptions(
            formatted.length > 0 ? formatted : userOptions,
          );
        } else {
          setNewTaskOwnerOptions(userOptions);
        }
      } catch {
        if (active) setNewTaskOwnerOptions(userOptions);
      }
    }
    void loadPracticeOwners();
    return () => {
      active = false;
    };
  }, [newTaskPracticeId, userOptions]);

  // Filter Owners dynamically when Practice is selected in Edit Modal
  useEffect(() => {
    if (!editTaskPracticeId) {
      setEditTaskOwnerOptions(userOptions);
      return;
    }
    let active = true;
    async function loadEditPracticeOwners() {
      try {
        const data = await getPersonsView({
          limit: 1000,
          practiceId: editTaskPracticeId,
        });
        if (!active) return;
        if (data?.rows && data.rows.length > 0) {
          const formatted = data.rows
            .map((row: any) => ({
              label: String(
                row.values.fullName ||
                  `${row.values.firstName || ""} ${row.values.lastName || ""}`.trim(),
              ),
              value: String(row.values.id || ""),
              subLabel: String(row.values.role || row.values.email || ""),
            }))
            .filter((e) => Boolean(e.value && e.label))
            .sort((a, b) => a.label.localeCompare(b.label));

          setEditTaskOwnerOptions(
            formatted.length > 0 ? formatted : userOptions,
          );
        } else {
          setEditTaskOwnerOptions(userOptions);
        }
      } catch {
        if (active) setEditTaskOwnerOptions(userOptions);
      }
    }
    void loadEditPracticeOwners();
    return () => {
      active = false;
    };
  }, [editTaskPracticeId, userOptions]);

  // Search filter functions for SearchSelect
  const searchPracticeOptions = useMemo(
    () => async (query: string) => {
      const normalized = query.trim().toLowerCase();
      return practiceOptions.filter((option) =>
        normalized
          ? option.label.toLowerCase().includes(normalized) ||
            option.value.toLowerCase().includes(normalized)
          : true,
      );
    },
    [practiceOptions],
  );

  const searchUserOptions = useMemo(
    () => async (query: string) => {
      const normalized = query.trim().toLowerCase();
      return userOptions.filter((option) =>
        normalized
          ? option.label.toLowerCase().includes(normalized) ||
            option.subLabel?.toLowerCase().includes(normalized) ||
            option.value.toLowerCase().includes(normalized)
          : true,
      );
    },
    [userOptions],
  );

  const searchNewTaskOwnerOptions = useMemo(
    () => async (query: string) => {
      const normalized = query.trim().toLowerCase();
      return newTaskOwnerOptions.filter((option) =>
        normalized
          ? option.label.toLowerCase().includes(normalized) ||
            option.subLabel?.toLowerCase().includes(normalized) ||
            option.value.toLowerCase().includes(normalized)
          : true,
      );
    },
    [newTaskOwnerOptions],
  );

  const searchEditTaskOwnerOptions = useMemo(
    () => async (query: string) => {
      const normalized = query.trim().toLowerCase();
      return editTaskOwnerOptions.filter((option) =>
        normalized
          ? option.label.toLowerCase().includes(normalized) ||
            option.subLabel?.toLowerCase().includes(normalized) ||
            option.value.toLowerCase().includes(normalized)
          : true,
      );
    },
    [editTaskOwnerOptions],
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasksCount, setTotalTasksCount] = useState(0);
  const [backendMetrics, setBackendMetrics] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    blocked: 0,
    pct: 0,
  });

  // Kanban dedicated per-status state & pagination
  const [kanbanTasks, setKanbanTasks] = useState<Record<TaskStatus, TaskItem[]>>({
    NOT_STARTED: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    COMPLETE: [],
  });
  const [kanbanPage, setKanbanPage] = useState<Record<TaskStatus, number>>({
    NOT_STARTED: 1,
    IN_PROGRESS: 1,
    BLOCKED: 1,
    COMPLETE: 1,
  });
  const [kanbanHasMore, setKanbanHasMore] = useState<Record<TaskStatus, boolean>>({
    NOT_STARTED: false,
    IN_PROGRESS: false,
    BLOCKED: false,
    COMPLETE: false,
  });
  const [isKanbanLoading, setIsKanbanLoading] = useState<Record<TaskStatus, boolean>>({
    NOT_STARTED: false,
    IN_PROGRESS: false,
    BLOCKED: false,
    COMPLETE: false,
  });

  // Dedicated Kanban API fetcher per status column
  const fetchKanbanStatus = async (statusKey: TaskStatus, pageNum: number, append = false) => {
    setIsKanbanLoading((prev) => ({ ...prev, [statusKey]: true }));
    try {
      const params: Record<string, any> = {
        page: pageNum,
        pageSize: 10,
        status: statusKey,
      };
      if (search.trim()) params.search = search.trim();
      if (filters.practiceId) params.practiceId = filters.practiceId;
      if (filters.serviceLine) params.serviceLine = filters.serviceLine;
      if (filters.phase) params.phase = filters.phase;
      if (filters.ownerUserId) params.ownerUserId = filters.ownerUserId;
      if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
      if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;

      const resData = await getTasksApi(params);
      const formatted = resData.tasks.map((t, idx) => ({
        ...t,
        taskCode:
          t.taskCode ||
          `TASK${String(t.taskNumber || idx + 3209190).padStart(7, "0")}`,
        startDate:
          formatToMMDDYYYY(t.startDate) || formatToMMDDYYYY(new Date()),
        dueDate:
          formatToMMDDYYYY(t.dueDate) ||
          formatToMMDDYYYY(new Date(Date.now() + 7 * 86400000)),
      }));

      setKanbanTasks((prev) => ({
        ...prev,
        [statusKey]: append ? [...(prev[statusKey] || []), ...formatted] : formatted,
      }));

      setKanbanHasMore((prev) => ({
        ...prev,
        [statusKey]: pageNum < resData.totalPages,
      }));
    } catch (err) {
      console.error(`Failed to load kanban tasks for status ${statusKey}:`, err);
    } finally {
      setIsKanbanLoading((prev) => ({ ...prev, [statusKey]: false }));
    }
  };

  const loadMoreKanbanStatus = (statusKey: TaskStatus) => {
    const nextPage = (kanbanPage[statusKey] || 1) + 1;
    setKanbanPage((prev) => ({ ...prev, [statusKey]: nextPage }));
    void fetchKanbanStatus(statusKey, nextPage, true);
  };

  // Dedicated overall metrics fetcher for top Statistics bar
  const fetchGlobalMetrics = async () => {
    try {
      const params: Record<string, any> = { page: 1, pageSize: 1 };
      if (search.trim()) params.search = search.trim();
      if (filters.practiceId) params.practiceId = filters.practiceId;
      if (filters.serviceLine) params.serviceLine = filters.serviceLine;
      if (filters.phase) params.phase = filters.phase;
      if (filters.status) params.status = filters.status;
      if (filters.ownerUserId) params.ownerUserId = filters.ownerUserId;
      if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
      if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;

      const resData = await getTasksApi(params);
      if (resData.metrics) {
        setBackendMetrics(resData.metrics);
      }
    } catch (err) {
      console.error("Failed to load overall metrics:", err);
    }
  };

  const initKanbanBoard = () => {
    const statuses: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETE"];
    setKanbanPage({
      NOT_STARTED: 1,
      IN_PROGRESS: 1,
      BLOCKED: 1,
      COMPLETE: 1,
    });
    void fetchGlobalMetrics();
    statuses.forEach((st) => void fetchKanbanStatus(st, 1, false));
  };

  // Fetch tasks for Table View
  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (filters.practiceId) params.practiceId = filters.practiceId;
      if (filters.serviceLine) params.serviceLine = filters.serviceLine;
      if (filters.phase) params.phase = filters.phase;
      if (filters.status) params.status = filters.status;
      if (filters.ownerUserId) params.ownerUserId = filters.ownerUserId;
      if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
      if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;

      const resData = await getTasksApi(params);

      const formatted = resData.tasks.map((t, idx) => ({
        ...t,
        taskCode:
          t.taskCode ||
          `TASK${String(t.taskNumber || idx + 3209190).padStart(7, "0")}`,
        startDate:
          formatToMMDDYYYY(t.startDate) || formatToMMDDYYYY(new Date()),
        dueDate:
          formatToMMDDYYYY(t.dueDate) ||
          formatToMMDDYYYY(new Date(Date.now() + 7 * 86400000)),
      }));

      setTasks(formatted);
      setTotalTasksCount(resData.totalTasks);
      setTotalPages(resData.totalPages);
      if (resData.metrics) {
        setBackendMetrics(resData.metrics);
      }
    } catch (error: any) {
      console.error("Failed to load tasks:", error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "table") {
      fetchTasks();
    } else {
      initKanbanBoard();
    }
  }, [
    viewMode,
    currentPage,
    pageSize,
    search,
    filters.serviceLine,
    filters.phase,
    filters.status,
    filters.practiceId,
    filters.ownerUserId,
    filters.dueDateFrom,
    filters.dueDateTo,
  ]);

  const updateDraftFilter = <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K],
  ) => {
    setDraftFilters((curr) => ({ ...curr, [key]: value }));
  };

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearch("");
    setCurrentPage(1);
  };

  // Filtered Tasks Calculation (API handles backend search/filters, fallback locally if search string provided)
  const filteredTasks = useMemo(() => {
    return tasks;
  }, [tasks]);

  // Metrics from Backend Filter-Wise Calculation
  const metrics = useMemo(() => {
    return backendMetrics;
  }, [backendMetrics]);

  // Status Change Logic with Dependency Guard & API call
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    if (newStatus === "IN_PROGRESS") {
      const hasUnmetDeps = targetTask.dependencies.some(
        (dep) => !dep.isComplete,
      );
      if (hasUnmetDeps) {
        toast.error(
          `Cannot move ${targetTask.taskCode || `Task #${targetTask.taskNumber}`} to "In Progress". It has unmet predecessor dependencies blocking execution!`,
        );
        return;
      }
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: newStatus };
        }
        if (t.dependencies.some((dep) => dep.id === taskId)) {
          const updatedDeps = t.dependencies.map((dep) =>
            dep.id === taskId
              ? { ...dep, isComplete: newStatus === "COMPLETE" }
              : dep,
          );
          return { ...t, dependencies: updatedDeps };
        }
        return t;
      }),
    );

    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await updateTaskApi(taskId, { status: newStatus });
      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(
        `${targetTask.taskCode || `Task #${targetTask.taskNumber}`} updated to ${statusLabel}`,
      );
      // Immediately refresh top Statistics bar & view data across Table or Kanban columns
      void fetchGlobalMetrics();
      if (viewMode === "kanban") {
        initKanbanBoard();
      } else {
        fetchTasks();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update task status");
      fetchTasks();
    }
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDragOverStatus(null);
    setDraggedTaskId(null);

    if (taskId) {
      handleUpdateStatus(taskId, targetStatus);
    }
  };

  // Active Filter Chips
  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.practiceName || filters.practiceId) {
      chips.push({
        key: "practice",
        label: "Practice",
        displayValue: filters.practiceName || filters.practiceId,
        onClear: () => {
          setFilters((curr) => ({ ...curr, practiceId: "", practiceName: "" }));
          setDraftFilters((curr) => ({
            ...curr,
            practiceId: "",
            practiceName: "",
          }));
        },
      });
    }
    if (filters.serviceLine) {
      chips.push({
        key: "serviceLine",
        label: "Service Line",
        displayValue: filters.serviceLine,
        onClear: () => {
          setFilters((curr) => ({ ...curr, serviceLine: "" }));
          setDraftFilters((curr) => ({ ...curr, serviceLine: "" }));
        },
      });
    }
    if (filters.phase) {
      chips.push({
        key: "phase",
        label: "Phase",
        displayValue:
          PHASE_SHORT_BADGES[filters.phase as TaskPhase]?.label ||
          filters.phase,
        onClear: () => {
          setFilters((curr) => ({ ...curr, phase: "" }));
          setDraftFilters((curr) => ({ ...curr, phase: "" }));
        },
      });
    }
    if (filters.status) {
      chips.push({
        key: "status",
        label: "Status",
        displayValue:
          STATUS_CONFIG[filters.status as TaskStatus]?.label || filters.status,
        onClear: () => {
          setFilters((curr) => ({ ...curr, status: "" }));
          setDraftFilters((curr) => ({ ...curr, status: "" }));
        },
      });
    }
    if (filters.ownerName || filters.ownerUserId) {
      chips.push({
        key: "owner",
        label: "Owner",
        displayValue: filters.ownerName || filters.ownerUserId,
        onClear: () => {
          setFilters((curr) => ({ ...curr, ownerUserId: "", ownerName: "" }));
          setDraftFilters((curr) => ({
            ...curr,
            ownerUserId: "",
            ownerName: "",
          }));
        },
      });
    }
    if (filters.dueDateFrom) {
      chips.push({
        key: "dueDateFrom",
        label: "Due From",
        displayValue: filters.dueDateFrom,
        onClear: () => {
          setFilters((curr) => ({ ...curr, dueDateFrom: "" }));
          setDraftFilters((curr) => ({ ...curr, dueDateFrom: "" }));
        },
      });
    }
    if (filters.dueDateTo) {
      chips.push({
        key: "dueDateTo",
        label: "Due To",
        displayValue: filters.dueDateTo,
        onClear: () => {
          setFilters((curr) => ({ ...curr, dueDateTo: "" }));
          setDraftFilters((curr) => ({ ...curr, dueDateTo: "" }));
        },
      });
    }
    return chips;
  }, [filters]);

  const activeFilterCount = activeFilterChips.length;

  // Filter Modal Fields Layout in a clean 2-Section Grid View
  const filterFieldsModal = (
    <>
      {/* Practice Select */}
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Practice
        </span>
        <SearchSelect
          value={draftFilters.practiceId}
          displayLabel={draftFilters.practiceName}
          onChange={(val, opt) => {
            setDraftFilters((curr) => ({
              ...curr,
              practiceId: val,
              practiceName: opt?.label || val,
            }));
          }}
          onSearch={searchPracticeOptions}
          clearable
          toggleOnSelectSame
          placeholder="Search practice"
        />
      </label>

      {/* Assigned Owner Select */}
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Assigned Owner
        </span>
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
          placeholder="Search assigned owner"
        />
      </label>

      {/* Service Line Select */}
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Service Line
        </span>
        <Select
          value={draftFilters.serviceLine}
          onChange={(val) => updateDraftFilter("serviceLine", val)}
          options={SERVICE_LINE_OPTIONS}
          placeholder="Select Service Line"
        />
      </label>

      {/* Phase Select */}
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Onboarding Phase
        </span>
        <Select
          value={draftFilters.phase}
          onChange={(val) => updateDraftFilter("phase", val)}
          options={PHASE_OPTIONS}
          placeholder="Select Phase"
        />
      </label>

      {/* Timeline Date Range */}
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Due From
        </span>
        <DatePicker
          value={draftFilters.dueDateFrom}
          onChange={(val) => updateDraftFilter("dueDateFrom", val)}
          placeholder="From date"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Due To
        </span>
        <DatePicker
          value={draftFilters.dueDateTo}
          onChange={(val) => updateDraftFilter("dueDateTo", val)}
          placeholder="To date"
        />
      </label>
      {/* Status Select */}
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Status
        </span>
        <Select
          value={draftFilters.status}
          onChange={(val) => updateDraftFilter("status", val)}
          options={STATUS_OPTIONS}
          placeholder="Select Status"
        />
      </label>
    </>
  );

  // Add Task handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    try {
      const created = await createTaskApi({
        name: newTaskName,
        practiceId: newTaskPracticeId,
        serviceLine: newTaskServiceLine,
        phase: newTaskPhase,
        ownerUserId: newTaskOwnerUserId,
        startDate: formatToMMDDYYYY(new Date()),
        dueDate: formatToMMDDYYYY(
          newTaskDueDate
            ? new Date(newTaskDueDate)
            : new Date(Date.now() + 7 * 86400000),
        ),
        deliverable: newTaskDeliverable,
      });

      const formattedTask: TaskItem = {
        ...created,
        taskCode:
          created.taskCode ||
          `TASK${String(Math.floor(1000000 + Math.random() * 9000000))}`,
        startDate:
          formatToMMDDYYYY(created.startDate) || formatToMMDDYYYY(new Date()),
        dueDate:
          formatToMMDDYYYY(created.dueDate) ||
          formatToMMDDYYYY(new Date(Date.now() + 7 * 86400000)),
      };

      setTasks((prev) => [formattedTask, ...prev]);
      toast.success(`Task ${formattedTask.taskCode} created successfully!`);
      setIsNewTaskModalOpen(false);
      setNewTaskName("");
      setNewTaskDeliverable("");
      setNewTaskPracticeId("");
      setNewTaskPracticeName("");
      setNewTaskOwnerUserId("");
      setNewTaskOwnerName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTaskName.trim()) return;

    try {
      const updated = await updateTaskApi(selectedTask.id, {
        name: editTaskName,
        phase: editTaskPhase,
        status: editTaskStatus,
        ownerUserId: editTaskOwnerUserId || undefined,
        startDate: editTaskStartDate,
        dueDate: editTaskDueDate,
        deliverable: editTaskDeliverable,
        notes: editTaskNotes,
      });

      const updatedTaskItem: TaskItem = {
        ...selectedTask,
        ...updated,
        name: editTaskName,
        practiceName: editTaskPracticeName || selectedTask.practiceName,
        serviceLine: editTaskServiceLine,
        phase: editTaskPhase,
        status: editTaskStatus,
        ownerUserId: editTaskOwnerUserId,
        ownerName: editTaskOwnerName || selectedTask.ownerName,
        startDate: editTaskStartDate || selectedTask.startDate,
        dueDate: editTaskDueDate || selectedTask.dueDate,
        deliverable: editTaskDeliverable,
        notes: editTaskNotes,
      };

      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? updatedTaskItem : t)),
      );
      setSelectedTask(updatedTaskItem);
      toast.success(
        `Task ${selectedTask.taskCode || `TASK${selectedTask.taskNumber}`} updated!`,
      );
      setIsEditTaskModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    }
  };

  return (
    <AppLayout
      title="Tasks Tracker"
      activeModule="Project Management"
      activeSubItem="Tasks"
    >
      <div className="space-y-4 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f7f5f1] p-2">
        {/* Standardized DataTableToolbar like Credentialing Module */}
        <DataTableToolbar
          title="Tasks Tracker"
          subtitle="Operational task tracker with automated phase gating, workstreams & drag-and-drop kanban"
          searchPlaceholder="Search task code (e.g. TASK3209192), task name, practice..."
          searchValue={search}
          onSearchChange={setSearch}
          activeFilterCount={activeFilterCount}
          activeChips={activeFilterChips}
          onResetFilters={handleResetFilters}
          onApplyFilters={handleApplyFilters}
          onOpenFilterModal={handleOpenFilterModal}
          filterModalTitle="Filter Tasks Tracker"
          filterFields={filterFieldsModal}
          addNewLabel="Add Task"
          onAddNew={() => setIsNewTaskModalOpen(true)}
          extraActions={
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === "kanban"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                Kanban
              </button>
            </div>
          }
        />
        {/* Metric Summary Banner */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Tasks
              </span>
              <Layers className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800">
              {metrics.total}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Active operational items
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                In Progress
              </span>
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-700">
              {metrics.inProgress}
            </div>
            <div className="mt-1 text-xs text-blue-600 font-medium">
              Under active work
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Blocked Tasks
              </span>
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {metrics.blocked}
            </div>
            <div className="mt-1 text-xs text-rose-600 font-medium">
              Predecessor pending
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Completed
              </span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {metrics.completed}
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">
              Deliverables done
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Overall Progress
              </span>
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {metrics.pct}%
              </span>
              <span className="text-xs text-slate-500">complete</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${metrics.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {isLoading ? (
          viewMode === "table" ? (
            <TableSkeletonLoader columns={10} rows={6} />
          ) : (
            <CardGridSkeletonLoader count={6} />
          )
        ) : viewMode === "table" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Task Code</th>
                    <th className="px-4 py-3">Task Name & Practice</th>
                    <th className="px-4 py-3">Service Line</th>
                    <th className="px-4 py-3">Phase</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3">Dependencies</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No onboarding tasks found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => {
                      const statusInfo = STATUS_CONFIG[t.status];
                      const phaseBadge = PHASE_SHORT_BADGES[t.phase];
                      const hasUnmetDeps = t.dependencies.some(
                        (dep) => !dep.isComplete,
                      );
                      const displayCode =
                        t.taskCode ||
                        `TASK${String(t.taskNumber).padStart(6, "0")}`;

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => setSelectedTask(t)}
                        >
                          <td className="px-4 py-3.5 font-bold font-mono text-indigo-700 text-xs">
                            {displayCode}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-900">
                              {t.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {t.practiceName}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              {t.serviceLine}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${phaseBadge.color}`}
                            >
                              {phaseBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                                {t.ownerName.charAt(0)}
                              </div>
                              <span className="text-xs font-medium text-slate-700">
                                {t.ownerName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {t.dueDate}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-slate-500">
                            {t.updatedAt || t.createdAt || "-"}
                          </td>
                          <td className="px-4 py-3.5">
                            {t.dependencies.length === 0 ? (
                              <span className="text-xs text-slate-400">
                                None
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {t.dependencies.map((dep) => (
                                  <span
                                    key={dep.id}
                                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                                      dep.isComplete
                                        ? "text-emerald-600"
                                        : "text-amber-600"
                                    }`}
                                  >
                                    {dep.isComplete ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <Lock className="h-3 w-3 text-amber-500" />
                                    )}
                                    {dep.taskCode || `TASK${dep.taskNumber}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td
                            className="px-4 py-3.5 min-w-[145px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={t.status}
                              onChange={(e) => handleUpdateStatus(t.id, e.target.value as TaskStatus)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-bold focus:outline-none transition-colors cursor-pointer ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                            >
                              <option value="NOT_STARTED" className="bg-white text-slate-800 font-normal">Not Started</option>
                              <option
                                value="IN_PROGRESS"
                                disabled={hasUnmetDeps}
                                className="bg-white text-slate-800 font-normal"
                              >
                                In Progress {hasUnmetDeps ? "(Blocked)" : ""}
                              </option>
                              <option value="BLOCKED" className="bg-white text-slate-800 font-normal">Blocked</option>
                              <option value="COMPLETE" className="bg-white text-slate-800 font-normal">Complete</option>
                            </select>
                          </td>
                          <td
                            className="px-4 py-3.5 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSelectedTask(t)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-900 hover:underline"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Table Footer Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="ml-2">
                  Showing <span className="font-semibold text-slate-900">{totalTasksCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, totalTasksCount)}</span> of{" "}
                  <span className="font-semibold text-slate-900">{totalTasksCount}</span> entries
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <span className="px-2 font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Kanban Board View with Dedicated Per-Status API Queries & View More */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {(
              [
                "NOT_STARTED",
                "IN_PROGRESS",
                "BLOCKED",
                "COMPLETE",
              ] as TaskStatus[]
            ).map((statusKey) => {
              const columnTasks = kanbanTasks[statusKey] || [];
              const statusCfg = STATUS_CONFIG[statusKey];
              const isOver = dragOverStatus === statusKey;
              const hasMore = kanbanHasMore[statusKey];
              const isColLoading = isKanbanLoading[statusKey];

              return (
                <div
                  key={statusKey}
                  onDragOver={(e) => handleDragOver(e, statusKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, statusKey)}
                  className={`flex flex-col rounded-xl border p-3 transition-colors ${
                    isOver
                      ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${statusCfg.bg} border ${statusCfg.border}`}
                      />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {statusCfg.label}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto min-h-[420px]">
                    {columnTasks.length === 0 && !isColLoading ? (
                      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                        Drop task here
                      </div>
                    ) : (
                      columnTasks.map((t) => {
                        const isBeingDragged = draggedTaskId === t.id;
                        const displayCode =
                          t.taskCode ||
                          `TASK${String(t.taskNumber).padStart(6, "0")}`;

                        return (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, t.id)}
                            onClick={() => setSelectedTask(t)}
                            className={`group relative rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md cursor-grab active:cursor-grabbing space-y-2.5 ${
                              isBeingDragged
                                ? "opacity-40 scale-95 border-dashed border-indigo-400"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                <span className="text-xs font-bold font-mono text-indigo-700">
                                  {displayCode}
                                </span>
                              </div>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                {t.serviceLine}
                              </span>
                            </div>

                            <h4 className="text-sm font-semibold text-slate-800 line-clamp-2">
                              {t.name}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {t.practiceName}
                            </p>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                              <div className="flex items-center gap-1 text-slate-600 font-medium">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {t.dueDate}
                              </div>
                              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                <User className="h-3 w-3 text-indigo-500" />
                                {t.ownerName.split(" ")[0]}
                              </div>
                            </div>

                            {t.dependencies.length > 0 && (
                              <div className="rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 flex items-center gap-1">
                                <Lock className="h-3 w-3 text-amber-600" />
                                Depends on{" "}
                                {t.dependencies
                                  .map(
                                    (d) => d.taskCode || `TASK${d.taskNumber}`,
                                  )
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Per-Status View More Button */}
                    {hasMore && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          disabled={isColLoading}
                          onClick={() => loadMoreKanbanStatus(statusKey)}
                          className="w-full rounded-xl border border-indigo-200 bg-indigo-50/70 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                        >
                          {isColLoading ? "Loading..." : "View More"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Task Details Modal (Centered Popup) */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold font-mono tracking-wider text-indigo-600">
                    {selectedTask.taskCode || `TASK${selectedTask.taskNumber}`}{" "}
                    • {selectedTask.serviceLine}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedTask.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTask.practiceName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Current Task Status Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Current Task Status:
                    </span>
                    {(() => {
                      const statusConf =
                        STATUS_CONFIG[selectedTask.status] ||
                        STATUS_CONFIG.NOT_STARTED;
                      const StatusIcon = statusConf.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConf.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTaskName(selectedTask.name);
                        setEditTaskPracticeId(selectedTask.practiceId || "");
                        setEditTaskPracticeName(selectedTask.practiceName);
                        setEditTaskServiceLine(selectedTask.serviceLine);
                        setEditTaskPhase(selectedTask.phase);
                        setEditTaskStatus(selectedTask.status);
                        setEditTaskOwnerUserId(selectedTask.ownerUserId || "");
                        setEditTaskOwnerName(selectedTask.ownerName);
                        setEditTaskStartDate(selectedTask.startDate);
                        setEditTaskDueDate(selectedTask.dueDate);
                        setEditTaskDeliverable(selectedTask.deliverable || "");
                        setEditTaskNotes(selectedTask.notes || "");
                        setIsEditTaskModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit Task Details
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Are you sure you want to delete task "${selectedTask.name}"?`,
                          )
                        ) {
                          try {
                            await deleteTaskApi(selectedTask.id);
                            setTasks((prev) =>
                              prev.filter((item) => item.id !== selectedTask.id),
                            );
                            setSelectedTask(null);
                            toast.success("Task deleted successfully");
                          } catch (err: any) {
                            toast.error(err.message || "Failed to delete task");
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Metadata Grid with MM-DD-YYYY Dates */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Phase</span>
                    <span className="font-semibold text-slate-800">
                      {PHASE_LABELS[selectedTask.phase]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">
                      Assigned Owner
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedTask.ownerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">
                      Start Date (MM-DD-YYYY)
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedTask.startDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">
                      Due Date (MM-DD-YYYY)
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedTask.dueDate}
                    </span>
                  </div>
                </div>

                {/* Deliverable & Notes */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Expected Deliverable
                    </h4>
                    <div className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 min-h-[70px]">
                      {selectedTask.deliverable || "No deliverable specified"}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Notes & Context
                    </h4>
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 min-h-[70px]">
                      {selectedTask.notes || "No notes logged."}
                    </div>
                  </div>
                </div>

                {/* Dependencies Section */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Task Dependencies
                  </h4>
                  {selectedTask.dependencies.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No predecessor dependencies required for this task.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTask.dependencies.map((dep) => (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs bg-white"
                        >
                          <div className="flex items-center gap-2">
                            {dep.isComplete ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-bold font-mono text-indigo-700">
                              {dep.taskCode || `TASK${dep.taskNumber}`}:
                            </span>
                            <span className="text-slate-600">{dep.name}</span>
                          </div>
                          <span
                            className={`font-semibold ${
                              dep.isComplete
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {dep.isComplete ? "Complete" : "Blocking"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create New Task with SearchSelect for Practice and Owner */}
        {isNewTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Create Onboarding Task
                </h3>
                <button
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={handleCreateTask}
                className="mt-4 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Task Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Provider Malpractice Verification"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Practice
                    </label>
                    <SearchSelect
                      value={newTaskPracticeId}
                      displayLabel={newTaskPracticeName}
                      onChange={(val, opt) => {
                        setNewTaskPracticeId(val);
                        setNewTaskPracticeName(opt?.label || val);
                        setNewTaskOwnerUserId("");
                        setNewTaskOwnerName("");
                      }}
                      onSearch={searchPracticeOptions}
                      clearable
                      toggleOnSelectSame
                      placeholder="Search practice"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Assigned Owner
                    </label>
                    <SearchSelect
                      value={newTaskOwnerUserId}
                      displayLabel={newTaskOwnerName}
                      onChange={(val, opt) => {
                        setNewTaskOwnerUserId(val);
                        setNewTaskOwnerName(opt?.label || val);
                      }}
                      onSearch={searchNewTaskOwnerOptions}
                      clearable
                      toggleOnSelectSame
                      placeholder="Search user owner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Service Line
                    </label>
                    <Select
                      value={newTaskServiceLine}
                      onChange={(val) =>
                        setNewTaskServiceLine(val as ServiceLine)
                      }
                      options={SERVICE_LINE_OPTIONS.filter(
                        (o) => o.value !== "",
                      )}
                      placeholder="Select Service Line"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Phase
                    </label>
                    <Select
                      value={newTaskPhase}
                      onChange={(val) => setNewTaskPhase(val as TaskPhase)}
                      options={PHASE_OPTIONS.filter((o) => o.value !== "")}
                      placeholder="Select Phase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Due Date
                    </label>
                    <DatePicker
                      value={newTaskDueDate}
                      onChange={(val) => setNewTaskDueDate(val)}
                      placeholder="MM-DD-YYYY"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Expected Deliverable
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Audit Approval Pack"
                      value={newTaskDeliverable}
                      onChange={(e) => setNewTaskDeliverable(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Task Modal */}
        {isEditTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Onboarding Task
                </h3>
                <button
                  onClick={() => setIsEditTaskModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={handleEditTask}
                className="mt-4 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Task Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTaskName}
                    onChange={(e) => setEditTaskName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Practice
                    </label>
                    <SearchSelect
                      value={editTaskPracticeId}
                      displayLabel={editTaskPracticeName}
                      onChange={(val, opt) => {
                        setEditTaskPracticeId(val);
                        setEditTaskPracticeName(opt?.label || val);
                        setEditTaskOwnerUserId("");
                        setEditTaskOwnerName("");
                      }}
                      onSearch={searchPracticeOptions}
                      clearable
                      toggleOnSelectSame
                      placeholder="Search practice"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Assigned Owner
                    </label>
                    <SearchSelect
                      value={editTaskOwnerUserId}
                      displayLabel={editTaskOwnerName}
                      onChange={(val, opt) => {
                        setEditTaskOwnerUserId(val);
                        setEditTaskOwnerName(opt?.label || val);
                      }}
                      onSearch={searchEditTaskOwnerOptions}
                      clearable
                      toggleOnSelectSame
                      placeholder="Search user owner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Service Line
                    </label>
                    <Select
                      value={editTaskServiceLine}
                      onChange={(val) =>
                        setEditTaskServiceLine(val as ServiceLine)
                      }
                      options={SERVICE_LINE_OPTIONS.filter(
                        (o) => o.value !== "",
                      )}
                      placeholder="Select Service Line"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Phase
                    </label>
                    <Select
                      value={editTaskPhase}
                      onChange={(val) => setEditTaskPhase(val as TaskPhase)}
                      options={PHASE_OPTIONS.filter((o) => o.value !== "")}
                      placeholder="Select Phase"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <Select
                      value={editTaskStatus}
                      onChange={(val) => setEditTaskStatus(val as TaskStatus)}
                      options={STATUS_OPTIONS.filter((o) => o.value !== "")}
                      placeholder="Select Status"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Start Date
                    </label>
                    <DatePicker
                      value={editTaskStartDate}
                      onChange={(val) => setEditTaskStartDate(val)}
                      placeholder="MM-DD-YYYY"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Due Date
                    </label>
                    <DatePicker
                      value={editTaskDueDate}
                      onChange={(val) => setEditTaskDueDate(val)}
                      placeholder="MM-DD-YYYY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Expected Deliverable
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Audit Approval Pack"
                      value={editTaskDeliverable}
                      onChange={(e) => setEditTaskDeliverable(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Notes & Context
                    </label>
                    <input
                      type="text"
                      placeholder="Logged notes..."
                      value={editTaskNotes}
                      onChange={(e) => setEditTaskNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditTaskModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Update Task
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
