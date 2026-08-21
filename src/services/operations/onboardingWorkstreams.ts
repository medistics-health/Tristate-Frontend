import axios from "axios";
import { apiConnector } from "../apiConnector";
import { onboardingWorkstreamEndpoints } from "../apis";
import type { PracticeServiceLine } from "../../components/practices/serviceLines";
import {
  formatPracticeServiceLine,
} from "../../components/practices/serviceLines";

const { LIST, CREATE, GET, UPDATE, DELETE } = onboardingWorkstreamEndpoints;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = (
      error.response?.data as { message?: string } | undefined
    )?.message;
    return apiMessage ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export const WORKSTREAM_STATUS_OPTIONS = [
  {
    value: "COMPLETE_CONTRACTED",
    label: "Complete/Contracted",
    className: "bg-emerald-100 text-emerald-800",
  },
  {
    value: "WAITING_ON_CLIENT",
    label: "Waiting on Client",
    className: "bg-amber-100 text-amber-800",
  },
  {
    value: "PENDING",
    label: "Pending",
    className: "bg-slate-100 text-slate-700",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    className: "bg-sky-100 text-sky-800",
  },
  {
    value: "INTERNAL_ACTION_REQUIRED",
    label: "Internal Action Required",
    className: "bg-orange-100 text-orange-800",
  },
  {
    value: "BLOCKED",
    label: "Blocked",
    className: "bg-red-100 text-red-800",
  },
] as const;

export type WorkstreamStatus =
  (typeof WORKSTREAM_STATUS_OPTIONS)[number]["value"];

export type WorkstreamOwner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type WorkstreamTask = {
  id: string;
  taskNumber: number;
  name: string;
  status: string;
  dueDate?: string | null;
};

export type WorkstreamMilestone = {
  id: string;
  milestoneCode: string;
  description: string;
  status: string;
  targetDate?: string | null;
};

export type OnboardingWorkstream = {
  id: string;
  onboardingProjectId: string;
  practiceId: string;
  serviceLine: PracticeServiceLine | string;
  status: WorkstreamStatus | string;
  ownerUserId?: string | null;
  targetDate?: string | null;
  notes?: string | null;
  percentComplete: number;
  completedTasks: number;
  totalTasks: number;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
  owner?: WorkstreamOwner | null;
  tasks: WorkstreamTask[];
  milestones: WorkstreamMilestone[];
  _count?: { tasks: number; milestones: number };
};

export type WorkstreamBody = {
  practiceId?: string;
  onboardingProjectId?: string;
  serviceLine: string;
  status?: string;
  ownerUserId?: string | null;
  targetDate?: string | null;
  notes?: string | null;
};

export type WorkstreamRow = {
  id: string;
  values: Record<string, string | number | null>;
};

export type WorkstreamQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  practiceId?: string;
  serviceLine?: string;
  status?: string;
  ownerUserId?: string;
  sortOrder?: "asc" | "desc";
};

export function formatWorkstreamStatus(status: string) {
  return (
    WORKSTREAM_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function workstreamStatusClass(status: string) {
  return (
    WORKSTREAM_STATUS_OPTIONS.find((option) => option.value === status)
      ?.className ?? "bg-slate-100 text-slate-700"
  );
}

function ownerName(owner?: WorkstreamOwner | null) {
  if (!owner) return "";
  return [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
}

function workstreamToRow(workstream: OnboardingWorkstream): WorkstreamRow {
  return {
    id: workstream.id,
    values: {
      practiceName: workstream.practice?.name || "",
      serviceLine: formatPracticeServiceLine(String(workstream.serviceLine)),
      status: String(workstream.status),
      statusLabel: formatWorkstreamStatus(String(workstream.status)),
      owner: ownerName(workstream.owner) || "-",
      percentComplete: workstream.percentComplete,
      targetDate: workstream.targetDate || "",
      taskCount: workstream.totalTasks,
      milestoneCount: workstream.milestones?.length ?? workstream._count?.milestones ?? 0,
    },
  };
}

export async function getWorkstreamsView(params?: WorkstreamQueryParams) {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.serviceLine) queryString.set("serviceLine", params.serviceLine);
    if (params?.status) queryString.set("status", params.status);
    if (params?.ownerUserId) queryString.set("ownerUserId", params.ownerUserId);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString}` : LIST;
    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { workstreams, pagination } = response.data as {
      workstreams: OnboardingWorkstream[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };

    return {
      rows: workstreams.map(workstreamToRow),
      records: workstreams,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch workstreams."));
  }
}

export async function getWorkstream(id: string): Promise<OnboardingWorkstream> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { workstream: OnboardingWorkstream }).workstream;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch workstream."));
  }
}

export async function createWorkstreamApi(
  data: WorkstreamBody,
): Promise<OnboardingWorkstream> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    return (response.data as { workstream: OnboardingWorkstream }).workstream;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create workstream."));
  }
}

export async function updateWorkstreamApi(
  id: string,
  data: Partial<WorkstreamBody>,
): Promise<OnboardingWorkstream> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    return (response.data as { workstream: OnboardingWorkstream }).workstream;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update workstream."));
  }
}

export async function deleteWorkstreamApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete workstream."));
  }
}
