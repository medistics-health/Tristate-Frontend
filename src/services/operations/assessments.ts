import axios from "axios";
import { apiConnector } from "../apiConnector";
import { assessmentEndpoints } from "../apis";

const { LIST, CREATE, GET, UPDATE, DELETE } = assessmentEndpoints;

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

export type Assessment = {
  id: string;
  practiceId: string;
  responses: unknown;
  score?: number;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
};

export type AssessmentBody = {
  practiceId: string;
  responses?: unknown;
  score?: number;
};

export type AssessmentRow = {
  id: string;
  values: Record<string, AssessmentCellValue>;
};

export type AssessmentCellValue = string | number | unknown | null;

export type AssessmentViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  rows: AssessmentRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function assessmentToRow(assessment: Assessment): AssessmentRow {
  return {
    id: assessment.id,
    values: {
      id: assessment.id,
      practiceId: assessment.practiceId,
      practiceName: assessment.practice?.name || "",
      score: assessment.score ?? "-",
      responses: assessment.responses,
      creationDate: new Date(assessment.createdAt).toLocaleString(),
      lastUpdate: new Date(assessment.updatedAt).toLocaleString(),
    },
  };
}

export type AssessmentQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortOrder?: "asc" | "desc";
};

export async function getAssessmentsView(params?: AssessmentQueryParams): Promise<AssessmentViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString.toString()}` : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { assessments, pagination } = response.data as {
      assessments: Assessment[];
      pagination?: { total: number; page: number; limit: number; totalPages: number };
    };

    const paginationInfo = pagination || { total: assessments.length, page: 1, limit: 10, totalPages: 1 };

    return {
      viewId: "assessment-view-001",
      title: "All Assessments",
      totalCount: paginationInfo.total,
      rows: assessments.map(assessmentToRow),
      pagination: {
        page: paginationInfo.page,
        limit: paginationInfo.limit,
        total: paginationInfo.total,
        totalPages: paginationInfo.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch assessments."));
  }
}

export async function getAssessment(id: string): Promise<Assessment> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { assessment: Assessment }).assessment;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch assessment."));
  }
}

export async function createAssessmentApi(data: AssessmentBody): Promise<Assessment> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    return (response.data as { assessment: Assessment }).assessment;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create assessment."));
  }
}

export async function updateAssessmentApi(id: string, data: Partial<AssessmentBody>): Promise<Assessment> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    return (response.data as { assessment: Assessment }).assessment;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update assessment."));
  }
}

export async function deleteAssessmentApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete assessment."));
  }
}
