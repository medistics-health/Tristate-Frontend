import axios from "axios";
import { apiConnector } from "../apiConnector";
import { onboardingActionItemEndpoints } from "../apis";
import { formatPracticeServiceLine } from "../../components/practices/serviceLines";

const { LIST, CREATE, GET, UPDATE, DELETE } = onboardingActionItemEndpoints;

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

export const ACTION_ITEM_STATUS_OPTIONS = [
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
    value: "DONE",
    label: "Done",
    className: "bg-emerald-100 text-emerald-800",
  },
] as const;

export type ActionItemStatus =
  (typeof ACTION_ITEM_STATUS_OPTIONS)[number]["value"];

export type ActionItemUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type ActionItemTask = {
  id: string;
  taskNumber: number;
  name: string;
  status: string;
  workstream?: { id: string; serviceLine: string } | null;
};

export type OnboardingActionItem = {
  id: string;
  onboardingProjectId: string;
  practiceId: string;
  taskId?: string | null;
  note: string;
  responsibleUserId?: string | null;
  status: ActionItemStatus | string;
  loggedByUserId: string;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
  task?: ActionItemTask | null;
  responsibleUser?: ActionItemUser | null;
  loggedByUser?: ActionItemUser | null;
};

export type ActionItemBody = {
  practiceId?: string;
  onboardingProjectId?: string;
  taskId?: string | null;
  note: string;
  responsibleUserId?: string | null;
  status?: string;
};

export type ActionItemRow = {
  id: string;
  values: Record<string, string | number | null>;
};

export type ActionItemQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  practiceId?: string;
  taskId?: string;
  status?: string;
  responsibleUserId?: string;
  loggedByUserId?: string;
  loggedFrom?: string;
  loggedTo?: string;
  sortOrder?: "asc" | "desc";
};

export function formatActionItemStatus(value: string) {
  return (
    ACTION_ITEM_STATUS_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export function actionItemStatusClass(value: string) {
  return (
    ACTION_ITEM_STATUS_OPTIONS.find((option) => option.value === value)
      ?.className ?? "bg-slate-100 text-slate-700"
  );
}

export function userName(user?: ActionItemUser | null) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}

export function relatedToLabel(item: OnboardingActionItem) {
  if (item.task) {
    const serviceLine = item.task.workstream?.serviceLine
      ? formatPracticeServiceLine(String(item.task.workstream.serviceLine))
      : null;
    const taskLabel = `T-${item.task.taskNumber} ${item.task.name}`;
    return serviceLine ? `${taskLabel} · ${serviceLine}` : taskLabel;
  }
  return item.practice?.name ? `${item.practice.name} (Practice)` : "Practice";
}

function actionItemToRow(item: OnboardingActionItem): ActionItemRow {
  return {
    id: item.id,
    values: {
      loggedAt: item.loggedAt,
      practiceName: item.practice?.name || "",
      relatedTo: relatedToLabel(item),
      note: item.note,
      status: String(item.status),
      responsible: userName(item.responsibleUser) || "-",
      loggedBy: userName(item.loggedByUser) || "-",
    },
  };
}

export async function getActionItemsView(params?: ActionItemQueryParams) {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.taskId) queryString.set("taskId", params.taskId);
    if (params?.status) queryString.set("status", params.status);
    if (params?.responsibleUserId) {
      queryString.set("responsibleUserId", params.responsibleUserId);
    }
    if (params?.loggedByUserId) {
      queryString.set("loggedByUserId", params.loggedByUserId);
    }
    if (params?.loggedFrom) queryString.set("loggedFrom", params.loggedFrom);
    if (params?.loggedTo) queryString.set("loggedTo", params.loggedTo);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString}` : LIST;
    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { actionItems, pagination } = response.data as {
      actionItems: OnboardingActionItem[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };

    return {
      rows: actionItems.map(actionItemToRow),
      records: actionItems,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch action items."));
  }
}

export async function getActionItem(id: string): Promise<OnboardingActionItem> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { actionItem: OnboardingActionItem }).actionItem;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch action item."));
  }
}

export async function createActionItemApi(
  data: ActionItemBody,
): Promise<OnboardingActionItem> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    return (response.data as { actionItem: OnboardingActionItem }).actionItem;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create action item."));
  }
}

export async function updateActionItemApi(
  id: string,
  data: Partial<ActionItemBody>,
): Promise<OnboardingActionItem> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    return (response.data as { actionItem: OnboardingActionItem }).actionItem;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update action item."));
  }
}

export async function deleteActionItemApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete action item."));
  }
}
