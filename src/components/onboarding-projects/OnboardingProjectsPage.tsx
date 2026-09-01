import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CheckSquare,
  Flag,
  FolderKanban,
  GitBranch,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { CardGridSkeletonLoader } from "../shared/tablePageUtils";
import { formatPracticeServiceLine } from "../practices/serviceLines";
import {
  getMilestonesApi,
  getProjectsApi,
  getTasksApi,
  getTemplatesApi,
} from "../../services/operations/onboardingProjects";
import {
  formatWorkstreamStatus,
  getWorkstreamsView,
  workstreamStatusClass,
  type OnboardingWorkstream,
} from "../../services/operations/onboardingWorkstreams";
import {
  formatRiskRating,
  formatRiskStatus,
  getRisksView,
  riskRatingClass,
  type OnboardingRisk,
} from "../../services/operations/onboardingRisks";
import {
  formatActionItemStatus,
  getActionItemsView,
  actionItemStatusClass,
  userName,
  type OnboardingActionItem,
} from "../../services/operations/onboardingActionItems";
import type { MilestoneItem } from "./OnboardingMilestonesPage";
import type { TaskItem, TaskStatus } from "./OnboardingTasksPage";
import type { TaskTemplate } from "./OnboardingTemplatesPage";

type DashboardProject = {
  id: string;
  practiceName: string;
  status: string;
  percentComplete: number;
  targetDate: string | null;
  ownerName: string;
  workstreamCount: number;
  blockedWorkstreams: number;
  openRisks: number;
};

const TASK_STATUS_PILL: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "bg-slate-100 text-slate-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-blue-50 text-blue-700",
  },
  BLOCKED: { label: "Blocked", className: "bg-rose-50 text-rose-700" },
  COMPLETE: { label: "Complete", className: "bg-emerald-50 text-emerald-700" },
};

const MILESTONE_STATUS_PILL: Record<
  string,
  { label: string; className: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "bg-slate-100 text-slate-700",
  },
  ON_TRACK: { label: "On Track", className: "bg-emerald-50 text-emerald-700" },
  AT_RISK: { label: "At Risk", className: "bg-amber-50 text-amber-700" },
  COMPLETE: { label: "Complete", className: "bg-indigo-50 text-indigo-700" },
};

function parseFlexibleDate(value?: string | null): Date | null {
  if (!value) return null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [month, day, year] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplayDate(value?: string | null) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(value?: string | null) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function includesQuery(haystack: string, query: string) {
  return haystack.toLowerCase().includes(query);
}

function personName(
  owner?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null,
  fallback = "Unassigned",
) {
  if (!owner) return fallback;
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return name || owner.email || fallback;
}

function projectStatusClass(status: string) {
  const key = status.toUpperCase().replace(/\s+/g, "_");
  if (key.includes("COMPLETE")) return "bg-emerald-100 text-emerald-800";
  if (key.includes("BLOCK") || key.includes("RISK")) return "bg-rose-100 text-rose-800";
  if (key.includes("PROGRESS") || key.includes("TRACK")) return "bg-sky-100 text-sky-800";
  if (key.includes("WAIT") || key.includes("PENDING")) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function formatStatusLabel(status: string) {
  if (!status) return "Active";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function settleValue<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
  if (result.status === "fulfilled") return result.value;
  console.error(`Failed to load ${label}:`, result.reason);
  return fallback;
}

export default function OnboardingProjectsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [workstreams, setWorkstreams] = useState<OnboardingWorkstream[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskMetrics, setTaskMetrics] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    blocked: 0,
    pct: 0,
  });
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [risks, setRisks] = useState<OnboardingRisk[]>([]);
  const [actionItems, setActionItems] = useState<OnboardingActionItem[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        projectsResult,
        workstreamsResult,
        tasksResult,
        milestonesResult,
        risksResult,
        actionItemsResult,
        templatesResult,
      ] = await Promise.allSettled([
        getProjectsApi(),
        getWorkstreamsView({ limit: 200, sortOrder: "desc" }),
        getTasksApi({ page: 1, pageSize: 100 }),
        getMilestonesApi(),
        getRisksView({ limit: 200, sortOrder: "desc" }),
        getActionItemsView({ limit: 200, sortOrder: "desc" }),
        getTemplatesApi(),
      ]);

      const emptyPage = {
        pagination: { page: 1, limit: 200, total: 0, totalPages: 0 },
        rows: [],
      };
      const rawProjects = settleValue(
        projectsResult,
        [] as Record<string, unknown>[],
        "projects",
      );
      const loadedWorkstreams = settleValue(
        workstreamsResult,
        { ...emptyPage, records: [] as OnboardingWorkstream[] },
        "workstreams",
      ).records;
      const taskData = settleValue(
        tasksResult,
        {
          tasks: [] as TaskItem[],
          totalTasks: 0,
          page: 1,
          pageSize: 100,
          totalPages: 1,
          metrics: { total: 0, completed: 0, inProgress: 0, blocked: 0, pct: 0 },
        },
        "tasks",
      );
      const milestoneData = settleValue(
        milestonesResult,
        [] as MilestoneItem[],
        "milestones",
      );
      const loadedRisks = settleValue(
        risksResult,
        { ...emptyPage, records: [] as OnboardingRisk[] },
        "risks",
      ).records;
      const loadedActions = settleValue(
        actionItemsResult,
        { ...emptyPage, records: [] as OnboardingActionItem[] },
        "action items",
      ).records;
      const templateData = settleValue(
        templatesResult,
        [] as TaskTemplate[],
        "templates",
      );

      const loadedTasks = taskData.tasks || [];

      setWorkstreams(loadedWorkstreams);
      setTasks(loadedTasks);
      setTaskMetrics(
        taskData.metrics || {
          total: loadedTasks.length,
          completed: loadedTasks.filter((task) => task.status === "COMPLETE").length,
          inProgress: loadedTasks.filter((task) => task.status === "IN_PROGRESS").length,
          blocked: loadedTasks.filter((task) => task.status === "BLOCKED").length,
          pct: 0,
        },
      );
      setMilestones(Array.isArray(milestoneData) ? milestoneData : []);
      setRisks(loadedRisks);
      setActionItems(loadedActions);
      setTemplates(Array.isArray(templateData) ? templateData : []);

      const mappedProjects: DashboardProject[] = (rawProjects || [])
        .map((project: Record<string, unknown>) => {
          const id = String(project.id || "");
          if (!id) return null;
          const practice =
            (project.practice as { name?: string } | undefined)?.name ||
            String(project.practiceName || project.name || "Untitled practice");
          const owner = project.owner as
            | { firstName?: string; lastName?: string; email?: string }
            | undefined;
          const relatedWorkstreams = loadedWorkstreams.filter(
            (workstream) =>
              workstream.onboardingProjectId === id ||
              workstream.practiceId === String(project.practiceId || ""),
          );
          const relatedRisks = loadedRisks.filter(
            (risk) =>
              risk.onboardingProjectId === id &&
              String(risk.status).toUpperCase() === "OPEN",
          );
          const percent =
            typeof project.percentComplete === "number"
              ? project.percentComplete
              : relatedWorkstreams.length
                ? Math.round(
                    relatedWorkstreams.reduce(
                      (sum, workstream) => sum + (workstream.percentComplete || 0),
                      0,
                    ) / relatedWorkstreams.length,
                  )
                : 0;

          return {
            id,
            practiceName: practice,
            status: String(project.status || "IN_PROGRESS"),
            percentComplete: percent,
            targetDate: (project.targetDate ||
              project.goLiveDate ||
              null) as string | null,
            ownerName: personName(owner, String(project.ownerName || "Unassigned")),
            workstreamCount: relatedWorkstreams.length,
            blockedWorkstreams: relatedWorkstreams.filter((workstream) =>
              ["BLOCKED", "INTERNAL_ACTION_REQUIRED"].includes(
                String(workstream.status),
              ),
            ).length,
            openRisks: relatedRisks.length,
          };
        })
        .filter(Boolean) as DashboardProject[];

      if (mappedProjects.length > 0) {
        setProjects(mappedProjects);
      } else {
        const byPractice = new Map<string, DashboardProject>();
        for (const workstream of loadedWorkstreams) {
          const key = workstream.practiceId || workstream.onboardingProjectId;
          const existing = byPractice.get(key);
          const blocked = ["BLOCKED", "INTERNAL_ACTION_REQUIRED"].includes(
            String(workstream.status),
          );
          if (!existing) {
            byPractice.set(key, {
              id: workstream.onboardingProjectId || key,
              practiceName: workstream.practice?.name || "Untitled practice",
              status: String(workstream.status || "IN_PROGRESS"),
              percentComplete: workstream.percentComplete || 0,
              targetDate: workstream.targetDate || null,
              ownerName: personName(workstream.owner),
              workstreamCount: 1,
              blockedWorkstreams: blocked ? 1 : 0,
              openRisks: loadedRisks.filter(
                (risk) =>
                  risk.practiceId === workstream.practiceId &&
                  String(risk.status).toUpperCase() === "OPEN",
              ).length,
            });
          } else {
            existing.workstreamCount += 1;
            existing.blockedWorkstreams += blocked ? 1 : 0;
            existing.percentComplete = Math.round(
              (existing.percentComplete * (existing.workstreamCount - 1) +
                (workstream.percentComplete || 0)) /
                existing.workstreamCount,
            );
            if (blocked) existing.status = "AT_RISK";
          }
        }
        setProjects([...byPractice.values()]);
      }

      const failures = [
        projectsResult,
        workstreamsResult,
        tasksResult,
        milestonesResult,
        risksResult,
        actionItemsResult,
        templatesResult,
      ].filter((result) => result.status === "rejected");
      if (failures.length === 7) {
        toast.error("Unable to load onboarding dashboard.");
      } else if (failures.length > 0) {
        toast.error("Some dashboard sections could not be loaded.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const query = search.trim().toLowerCase();

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        query
          ? includesQuery(
              `${project.practiceName} ${project.status} ${project.ownerName}`,
              query,
            )
          : true,
      ),
    [projects, query],
  );

  const attentionWorkstreams = useMemo(() => {
    const rank: Record<string, number> = {
      BLOCKED: 0,
      INTERNAL_ACTION_REQUIRED: 1,
      WAITING_ON_CLIENT: 2,
      PENDING: 3,
      IN_PROGRESS: 4,
    };
    return workstreams
      .filter((workstream) => {
        const status = String(workstream.status);
        const haystack = `${workstream.practice?.name || ""} ${workstream.serviceLine} ${status}`;
        if (query && !includesQuery(haystack, query)) return false;
        return ["BLOCKED", "INTERNAL_ACTION_REQUIRED", "WAITING_ON_CLIENT"].includes(
          status,
        );
      })
      .sort(
        (a, b) =>
          (rank[String(a.status)] ?? 9) - (rank[String(b.status)] ?? 9),
      )
      .slice(0, 6);
  }, [workstreams, query]);

  const attentionTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.status === "COMPLETE") return false;
        const haystack = `${task.name} ${task.practiceName} ${task.ownerName} ${task.status}`;
        if (query && !includesQuery(haystack, query)) return false;
        return task.status === "BLOCKED" || isOverdue(task.dueDate);
      })
      .sort((a, b) => {
        if (a.status === "BLOCKED" && b.status !== "BLOCKED") return -1;
        if (b.status === "BLOCKED" && a.status !== "BLOCKED") return 1;
        return 0;
      })
      .slice(0, 6);
  }, [tasks, query]);

  const attentionMilestones = useMemo(() => {
    return milestones
      .filter((milestone) => {
        if (milestone.status === "COMPLETE") return false;
        const haystack = `${milestone.description} ${milestone.practiceName} ${milestone.serviceLine}`;
        if (query && !includesQuery(haystack, query)) return false;
        return milestone.status === "AT_RISK" || isOverdue(milestone.targetDate);
      })
      .sort((a, b) => {
        if (a.status === "AT_RISK" && b.status !== "AT_RISK") return -1;
        if (b.status === "AT_RISK" && a.status !== "AT_RISK") return 1;
        return 0;
      })
      .slice(0, 6);
  }, [milestones, query]);

  const upcomingMilestones = useMemo(() => {
    const now = Date.now();
    const inFourWeeks = now + 28 * 86400000;
    return milestones
      .filter((milestone) => {
        if (milestone.status === "COMPLETE") return false;
        const date = parseFlexibleDate(milestone.targetDate);
        if (!date) return false;
        const time = date.getTime();
        const haystack = `${milestone.description} ${milestone.practiceName}`;
        if (query && !includesQuery(haystack, query)) return false;
        return time >= now && time <= inFourWeeks;
      })
      .sort((a, b) => {
        const aDate = parseFlexibleDate(a.targetDate)?.getTime() ?? 0;
        const bDate = parseFlexibleDate(b.targetDate)?.getTime() ?? 0;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [milestones, query]);

  const openRisks = useMemo(() => {
    const rank: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    return risks
      .filter((risk) => {
        if (String(risk.status).toUpperCase() !== "OPEN") return false;
        const haystack = `${risk.description} ${risk.practice?.name || ""} ${risk.rating}`;
        return query ? includesQuery(haystack, query) : true;
      })
      .sort(
        (a, b) =>
          (rank[String(a.rating).toUpperCase()] ?? 9) -
          (rank[String(b.rating).toUpperCase()] ?? 9),
      )
      .slice(0, 6);
  }, [risks, query]);

  const openActionItems = useMemo(
    () =>
      actionItems
        .filter((item) => {
          if (String(item.status).toUpperCase() === "DONE") return false;
          const haystack = `${item.note} ${item.practice?.name || ""} ${userName(item.responsibleUser)}`;
          return query ? includesQuery(haystack, query) : true;
        })
        .slice(0, 6),
    [actionItems, query],
  );

  const activeTemplates = useMemo(
    () =>
      templates
        .filter((template) => {
          const haystack = `${template.name} ${template.serviceLine} ${template.defaultOwnerName || ""}`;
          if (query && !includesQuery(haystack, query)) return false;
          return template.isActive !== false;
        })
        .slice(0, 6),
    [templates, query],
  );

  const kpis = [
    {
      label: "Active projects",
      value: projects.length,
      hint: "Practice onboarding portfolio",
      icon: FolderKanban,
      iconClass: "text-indigo-500",
    },
    {
      label: "Workstreams at risk",
      value: workstreams.filter((workstream) =>
        ["BLOCKED", "INTERNAL_ACTION_REQUIRED", "WAITING_ON_CLIENT"].includes(
          String(workstream.status),
        ),
      ).length,
      hint: `${workstreams.length} total workstreams`,
      icon: GitBranch,
      iconClass: "text-orange-500",
    },
    {
      label: "Blocked tasks",
      value: taskMetrics.blocked,
      hint: `${taskMetrics.inProgress} in progress`,
      icon: Lock,
      iconClass: "text-rose-500",
    },
    {
      label: "Open risks",
      value: risks.filter((risk) => String(risk.status).toUpperCase() === "OPEN")
        .length,
      hint: `${
        risks.filter((risk) =>
          ["CRITICAL", "HIGH"].includes(String(risk.rating).toUpperCase()) &&
          String(risk.status).toUpperCase() === "OPEN",
        ).length
      } high / critical`,
      icon: ShieldAlert,
      iconClass: "text-amber-600",
    },
    {
      label: "Task completion",
      value: `${taskMetrics.pct || (taskMetrics.total ? Math.round((taskMetrics.completed / taskMetrics.total) * 100) : 0)}%`,
      hint: `${taskMetrics.completed} of ${taskMetrics.total} complete`,
      icon: Layers,
      iconClass: "text-emerald-500",
    },
  ];

  return (
    <AppLayout
      title="Onboarding Projects"
      activeModule="Onboarding Projects"
      activeSubItem="Projects"
      navbarIcon={<LayoutDashboard className="h-4 w-4 text-slate-500" />}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#ece8e1] bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ece6] bg-gradient-to-r from-white via-[#fcfbf8] to-[#f7f3eb] px-5 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Onboarding Projects
              </div>
              <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-slate-800">
                Dashboard
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={isLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 text-slate-500 ${isLoading ? "animate-spin text-[#4f63ea]" : ""}`}
                />
                Refresh
              </button>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search practices, tasks, risks..."
                  className="app-control w-64 rounded-xl border border-[#ece8e1] bg-white py-2 pl-9 pr-3 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-[#4f63ea]"
                />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <CardGridSkeletonLoader count={6} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {kpi.label}
                    </span>
                    <kpi.icon className={`h-5 w-5 ${kpi.iconClass}`} />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-800">
                    {kpi.value}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{kpi.hint}</div>
                </div>
              ))}
            </div>

            <section className="rounded-2xl border border-[#ece8e1] bg-white p-5 shadow-xs">
              <SectionHeader
                title="Projects"
                to="/onboarding-projects/workstreams"
                count={filteredProjects.length}
              />
              {filteredProjects.length === 0 ? (
                <EmptyLine text="No onboarding projects yet. Workstreams for a practice will appear here as a project." />
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {filteredProjects.slice(0, 6).map((project) => (
                    <Link
                      key={project.id}
                      to="/onboarding-projects/workstreams"
                      className="rounded-xl border border-[#ece8e1] bg-[#fcfbf9] p-4 transition-colors hover:border-[#d7d2c8] hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[15px] font-semibold text-slate-800">
                            {project.practiceName}
                          </div>
                          <div className="mt-1 text-[12px] text-slate-500">
                            Owner {project.ownerName}
                            {project.targetDate
                              ? ` · Go-live ${formatDisplayDate(project.targetDate)}`
                              : ""}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${projectStatusClass(project.status)}`}
                        >
                          {formatStatusLabel(project.status)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Completion</span>
                          <span className="font-semibold text-slate-700">
                            {project.percentComplete}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#4f63ea]"
                            style={{
                              width: `${Math.min(100, Math.max(0, project.percentComplete))}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                        <span className="rounded-md bg-white px-2 py-1 ring-1 ring-[#ece8e1]">
                          {project.workstreamCount} workstreams
                        </span>
                        <span className="rounded-md bg-white px-2 py-1 ring-1 ring-[#ece8e1]">
                          {project.blockedWorkstreams} blocked
                        </span>
                        <span className="rounded-md bg-white px-2 py-1 ring-1 ring-[#ece8e1]">
                          {project.openRisks} open risks
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DashboardPanel
                title="Workstreams needing attention"
                to="/onboarding-projects/workstreams"
                icon={<GitBranch className="h-4 w-4 text-orange-500" />}
                count={attentionWorkstreams.length}
              >
                {attentionWorkstreams.length === 0 ? (
                  <EmptyLine text="No blocked or waiting workstreams." />
                ) : (
                  <ul className="divide-y divide-[#f0ece6]">
                    {attentionWorkstreams.map((workstream) => (
                      <li key={workstream.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-slate-800">
                              {workstream.practice?.name || "Practice"}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-500">
                              {formatPracticeServiceLine(String(workstream.serviceLine))}
                              {" · "}
                              {workstream.percentComplete}% complete
                              {" · "}
                              {personName(workstream.owner)}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${workstreamStatusClass(String(workstream.status))}`}
                          >
                            {formatWorkstreamStatus(String(workstream.status))}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Blocked & overdue tasks"
                to="/onboarding-projects/tasks"
                icon={<Activity className="h-4 w-4 text-rose-500" />}
                count={attentionTasks.length}
              >
                {attentionTasks.length === 0 ? (
                  <EmptyLine text="No blocked or overdue tasks." />
                ) : (
                  <ul className="divide-y divide-[#f0ece6]">
                    {attentionTasks.map((task) => {
                      const status = TASK_STATUS_PILL[task.status] || TASK_STATUS_PILL.NOT_STARTED;
                      return (
                        <li key={task.id} className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-slate-800">
                                {task.taskCode || `T-${task.taskNumber}`} · {task.name}
                              </div>
                              <div className="mt-0.5 text-[12px] text-slate-500">
                                {task.practiceName || "Practice"}
                                {" · Due "}
                                {formatDisplayDate(task.dueDate)}
                                {isOverdue(task.dueDate) ? " · Overdue" : ""}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Milestones at risk"
                to="/onboarding-projects/milestones"
                icon={<Flag className="h-4 w-4 text-amber-500" />}
                count={attentionMilestones.length}
              >
                {attentionMilestones.length === 0 ? (
                  <EmptyLine text="No at-risk or overdue milestones." />
                ) : (
                  <ul className="divide-y divide-[#f0ece6]">
                    {attentionMilestones.map((milestone) => {
                      const status =
                        MILESTONE_STATUS_PILL[milestone.status] ||
                        MILESTONE_STATUS_PILL.NOT_STARTED;
                      return (
                        <li key={milestone.id} className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-slate-800">
                                {milestone.milestoneCode} · {milestone.description}
                              </div>
                              <div className="mt-0.5 text-[12px] text-slate-500">
                                {milestone.practiceName}
                                {" · "}
                                {formatPracticeServiceLine(milestone.serviceLine)}
                                {" · "}
                                {formatDisplayDate(milestone.targetDate)}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Upcoming go-lives"
                to="/onboarding-projects/milestones"
                icon={<AlertTriangle className="h-4 w-4 text-indigo-500" />}
                count={upcomingMilestones.length}
              >
                {upcomingMilestones.length === 0 ? (
                  <EmptyLine text="No milestones due in the next 4 weeks." />
                ) : (
                  <ul className="divide-y divide-[#f0ece6]">
                    {upcomingMilestones.map((milestone) => (
                      <li key={milestone.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-slate-800">
                            {milestone.description}
                          </div>
                          <div className="text-[12px] text-slate-500">
                            {milestone.practiceName}
                          </div>
                        </div>
                        <span className="shrink-0 text-[12px] font-medium text-slate-600">
                          {formatDisplayDate(milestone.targetDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Open risks"
                to="/onboarding-projects/risks"
                icon={<ShieldAlert className="h-4 w-4 text-rose-500" />}
                count={openRisks.length}
              >
                {openRisks.length === 0 ? (
                  <EmptyLine text="No open risks in the register." />
                ) : (
                  <ul className="divide-y divide-[#f0ece6]">
                    {openRisks.map((risk) => (
                      <li key={risk.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-slate-800">
                              R-{risk.riskNumber} · {risk.description}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-500">
                              {risk.practice?.name || "Practice"}
                              {" · "}
                              {formatRiskStatus(String(risk.status))}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${riskRatingClass(String(risk.rating))}`}
                          >
                            {formatRiskRating(String(risk.rating))}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Open action items"
                to="/onboarding-projects/action-items"
                icon={<CheckSquare className="h-4 w-4 text-sky-500" />}
                count={openActionItems.length}
              >
                {openActionItems.length === 0 ? (
                  <EmptyLine text="No open action items." />
                ) : (
                  <ul className="divide-y divide-[#f0ece6]">
                    {openActionItems.map((item) => (
                      <li key={item.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-[13px] font-semibold text-slate-800">
                              {item.note}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-500">
                              {item.practice?.name || "Practice"}
                              {" · "}
                              {userName(item.responsibleUser) || "Unassigned"}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${actionItemStatusClass(String(item.status))}`}
                          >
                            {formatActionItemStatus(String(item.status))}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>
            </div>

            <DashboardPanel
              title="Active task templates"
              to="/onboarding-projects/templates"
              icon={<Layers className="h-4 w-4 text-indigo-500" />}
              count={activeTemplates.length}
            >
              {activeTemplates.length === 0 ? (
                <EmptyLine text="No active templates. Add service-line playbooks in Task Templates." />
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {activeTemplates.map((template) => (
                    <Link
                      key={template.id}
                      to="/onboarding-projects/templates"
                      className="rounded-xl border border-[#ece8e1] bg-[#fcfbf9] p-4 hover:border-[#d7d2c8]"
                    >
                      <div className="text-[13px] font-semibold text-slate-800">
                        {template.name}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500">
                        {formatPracticeServiceLine(template.serviceLine)}
                        {" · "}
                        {template.taskCount} tasks
                        {template.defaultOwnerName
                          ? ` · ${template.defaultOwnerName}`
                          : ""}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </DashboardPanel>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function SectionHeader({
  title,
  to,
  count,
}: {
  title: string;
  to: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-slate-800">
        {title}
        <span className="ml-2 text-[12px] font-medium text-slate-400">{count}</span>
      </h2>
      <Link
        to={to}
        className="text-[12px] font-semibold text-[#4f63ea] hover:underline"
      >
        View all
      </Link>
    </div>
  );
}

function DashboardPanel({
  title,
  to,
  icon,
  count,
  children,
}: {
  title: string;
  to: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#ece8e1] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
          <span className="text-[12px] font-medium text-slate-400">{count}</span>
        </div>
        <Link
          to={to}
          className="text-[12px] font-semibold text-[#4f63ea] hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-6 text-center text-[13px] text-slate-400">{text}</p>;
}
