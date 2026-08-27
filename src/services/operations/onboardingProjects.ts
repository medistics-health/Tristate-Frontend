import axios from "axios";
import { apiConnector } from "../apiConnector";
import { onboardingProjectsEndpoints } from "../apis";
import type { TaskItem, TaskStatus, TaskPhase, ServiceLine } from "../../components/onboarding-projects/OnboardingTasksPage";

const { PROJECTS, PROJECT_UPDATE, TASKS, TASK_CREATE, TASK_UPDATE, TASK_DELETE } = onboardingProjectsEndpoints;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
    return apiMessage ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export type TaskQueryParams = {
  search?: string;
  practiceId?: string;
  serviceLine?: string;
  phase?: string;
  status?: string;
  ownerUserId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
};

export type CreateTaskPayload = {
  name: string;
  practiceId?: string;
  workstreamId?: string;
  serviceLine?: ServiceLine;
  phase?: TaskPhase;
  ownerUserId?: string;
  startDate?: string;
  dueDate?: string;
  deliverable?: string;
  notes?: string;
  dependencyTaskIds?: string[];
};

export type UpdateTaskPayload = {
  name?: string;
  phase?: TaskPhase;
  status?: TaskStatus;
  ownerUserId?: string;
  startDate?: string;
  dueDate?: string;
  deliverable?: string;
  notes?: string;
};

export async function getTasksApi(params?: TaskQueryParams): Promise<TaskItem[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: TASKS,
      params,
      credentials: true,
    });
    if (response?.data?.success && Array.isArray(response.data.tasks)) {
      return response.data.tasks;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch Tasks Tracker:", getErrorMessage(error, "Failed to fetch tasks"));
    throw new Error(getErrorMessage(error, "Failed to fetch tasks"));
  }
}

export async function createTaskApi(payload: CreateTaskPayload): Promise<TaskItem> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: TASK_CREATE,
      body: payload,
      credentials: true,
    });
    if (response?.data?.success && response.data.task) {
      return response.data.task;
    }
    throw new Error(response?.data?.message || "Failed to create task");
  } catch (error) {
    console.error("Failed to create onboarding task:", getErrorMessage(error, "Failed to create task"));
    throw new Error(getErrorMessage(error, "Failed to create task"));
  }
}

export async function updateTaskApi(id: string, payload: UpdateTaskPayload): Promise<TaskItem> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: TASK_UPDATE(id),
      body: payload,
      credentials: true,
    });
    if (response?.data?.success && response.data.task) {
      return response.data.task;
    }
    throw new Error(response?.data?.message || "Failed to update task");
  } catch (error) {
    console.error("Failed to update onboarding task:", getErrorMessage(error, "Failed to update task"));
    throw new Error(getErrorMessage(error, "Failed to update task"));
  }
}

export async function deleteTaskApi(id: string): Promise<boolean> {
  try {
    const response = await apiConnector({
      method: "DELETE",
      url: TASK_DELETE(id),
      credentials: true,
    });
    return Boolean(response?.data?.success);
  } catch (error) {
    console.error("Failed to delete onboarding task:", getErrorMessage(error, "Failed to delete task"));
    throw new Error(getErrorMessage(error, "Failed to delete task"));
  }
}

export async function getProjectsApi(): Promise<any[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: PROJECTS,
      credentials: true,
    });
    if (response?.data?.success && Array.isArray(response.data.projects)) {
      return response.data.projects;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch onboarding projects:", getErrorMessage(error, "Failed to fetch projects"));
    throw new Error(getErrorMessage(error, "Failed to fetch projects"));
  }
}

export async function getTemplatesApi(params?: { serviceLine?: string; search?: string }): Promise<any[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: onboardingProjectsEndpoints.TEMPLATES,
      params,
      credentials: true,
    });
    if (response?.data?.success && Array.isArray(response.data.templates)) {
      return response.data.templates;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch task templates:", getErrorMessage(error, "Failed to fetch task templates"));
    throw new Error(getErrorMessage(error, "Failed to fetch task templates"));
  }
}

export async function createTemplateApi(payload: any): Promise<any> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: onboardingProjectsEndpoints.TEMPLATE_CREATE,
      body: payload,
      credentials: true,
    });
    if (response?.data?.success && response.data.template) {
      return response.data.template;
    }
    throw new Error(response?.data?.message || "Failed to create template");
  } catch (error) {
    console.error("Failed to create task template:", getErrorMessage(error, "Failed to create template"));
    throw new Error(getErrorMessage(error, "Failed to create template"));
  }
}

export async function updateTemplateApi(id: string, payload: any): Promise<any> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: onboardingProjectsEndpoints.TEMPLATE_UPDATE(id),
      body: payload,
      credentials: true,
    });
    if (response?.data?.success && response.data.template) {
      return response.data.template;
    }
    throw new Error(response?.data?.message || "Failed to update template");
  } catch (error) {
    console.error("Failed to update task template:", getErrorMessage(error, "Failed to update template"));
    throw new Error(getErrorMessage(error, "Failed to update template"));
  }
}

export async function deleteTemplateApi(id: string): Promise<boolean> {
  try {
    const response = await apiConnector({
      method: "DELETE",
      url: onboardingProjectsEndpoints.TEMPLATE_DELETE(id),
      credentials: true,
    });
    return Boolean(response?.data?.success);
  } catch (error) {
    console.error("Failed to delete task template:", getErrorMessage(error, "Failed to delete template"));
    throw new Error(getErrorMessage(error, "Failed to delete template"));
  }
}

export async function getMilestonesApi(params?: { status?: string; search?: string }): Promise<any[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: onboardingProjectsEndpoints.MILESTONES,
      params,
      credentials: true,
    });
    if (response?.data?.success && Array.isArray(response.data.milestones)) {
      return response.data.milestones;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch milestones:", getErrorMessage(error, "Failed to fetch milestones"));
    throw new Error(getErrorMessage(error, "Failed to fetch milestones"));
  }
}

export async function createMilestoneApi(payload: any): Promise<any> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: onboardingProjectsEndpoints.MILESTONE_CREATE,
      body: payload,
      credentials: true,
    });
    if (response?.data?.success && response.data.milestone) {
      return response.data.milestone;
    }
    throw new Error(response?.data?.message || "Failed to create milestone");
  } catch (error) {
    console.error("Failed to create milestone:", getErrorMessage(error, "Failed to create milestone"));
    throw new Error(getErrorMessage(error, "Failed to create milestone"));
  }
}

export async function updateMilestoneApi(id: string, payload: any): Promise<any> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: onboardingProjectsEndpoints.MILESTONE_UPDATE(id),
      body: payload,
      credentials: true,
    });
    if (response?.data?.success && response.data.milestone) {
      return response.data.milestone;
    }
    throw new Error(response?.data?.message || "Failed to update milestone");
  } catch (error) {
    console.error("Failed to update milestone:", getErrorMessage(error, "Failed to update milestone"));
    throw new Error(getErrorMessage(error, "Failed to update milestone"));
  }
}

export async function deleteMilestoneApi(id: string): Promise<boolean> {
  try {
    const response = await apiConnector({
      method: "DELETE",
      url: onboardingProjectsEndpoints.MILESTONE_DELETE(id),
      credentials: true,
    });
    return Boolean(response?.data?.success);
  } catch (error) {
    console.error("Failed to delete milestone:", getErrorMessage(error, "Failed to delete milestone"));
    throw new Error(getErrorMessage(error, "Failed to delete milestone"));
  }
}
