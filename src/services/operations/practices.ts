import axios from "axios";
import { apiConnector } from "../apiConnector";
import { practiceEndpoints } from "../apis";
import type { Practice, PracticeBody, PracticeRow, PracticeViewData } from "../../components/practices/types";

const { LIST, CREATE, GET, UPDATE, DELETE } = practiceEndpoints;

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

function practiceToRow(practice: Practice): PracticeRow {
  return {
    id: practice.id,
    values: {
      id: practice.id,
      name: practice.name,
      npi: practice.npi || "",
      status: practice.status,
      region: practice.region,
      source: practice.source,
      bucket: practice.bucket.join(", "),
      companyId: practice.companyId || "",
      companyName: practice.company?.name || "",
      taxIdId: practice.taxIdId || "",
      taxIdNumber: practice.taxId?.taxIdNumber || "",
      practiceGroupName: practice.practiceGroup?.name || "",
      groupNpiNumbers: practice.groupNpis?.map(g => g.groupNpiNumber).join(", ") || "",
      groupNpis: practice.groupNpis || [],
      personsCount: practice._count?.persons || 0,
      dealsCount: practice._count?.deals || 0,
      creationDate: new Date(practice.createdAt).toLocaleString(),
      lastUpdate: new Date(practice.updatedAt).toLocaleString(),
      createdBy: { name: "User", initials: "U" },
      updatedBy: { name: "User", initials: "U" },
    },
  };
}

const fields = [
  { id: "name", label: "Name", type: "text" as const, visible: true },
  { id: "npi", label: "NPI", type: "text" as const, visible: true },
  { id: "status", label: "Status", type: "text" as const, visible: true },
  { id: "region", label: "Region", type: "text" as const, visible: true },
  { id: "source", label: "Source", type: "text" as const, visible: true },
  { id: "bucket", label: "Bucket", type: "text" as const, visible: false },
  { id: "companyName", label: "Company", type: "text" as const, visible: true },
  { id: "taxIdNumber", label: "Tax ID", type: "text" as const, visible: false },
  { id: "groupNpiNumbers", label: "Group NPIs", type: "text" as const, visible: true },
  { id: "groupNpis", label: "Group NPIs Data", type: "text" as const, visible: false },
  { id: "personsCount", label: "Persons", type: "text" as const, visible: false },
  { id: "dealsCount", label: "Deals", type: "text" as const, visible: false },
  { id: "creationDate", label: "Creation date", type: "text" as const, visible: true },
  { id: "lastUpdate", label: "Last update", type: "text" as const, visible: true },
  { id: "createdBy", label: "Created by", type: "text" as const, visible: false },
  { id: "updatedBy", label: "Updated by", type: "text" as const, visible: false },
];

export type PracticeQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  region?: string;
  source?: string;
  companyId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function getPracticesView(params?: PracticeQueryParams): Promise<PracticeViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.status) queryString.set("status", params.status);
    if (params?.region) queryString.set("region", params.region);
    if (params?.source) queryString.set("source", params.source);
    if (params?.companyId) queryString.set("companyId", params.companyId);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString.toString()}` : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { practices, pagination } = response.data as {
      practices: Practice[];
      pagination: { totalRecords: number; totalPages: number; currentPage: number; limit: number };
    };
    return {
      viewId: "practice-view-001",
      title: "All Practices",
      totalCount: pagination.totalRecords,
      fields,
      rows: practices.map(practiceToRow),
      pagination: {
        page: pagination.currentPage,
        limit: pagination.limit,
        total: pagination.totalRecords,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch practices."));
  }
}

export async function getAllPractices(): Promise<Practice[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LIST,
      credentials: true,
    });
    const { practices } = response.data as { practices: Practice[] };
    return practices;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch practices."));
  }
}

export async function getPractice(id: string): Promise<Practice> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { practice: Practice }).practice;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch practice."));
  }
}

export async function createPracticeApi(data: PracticeBody): Promise<PracticeRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const practice = (response.data as { practice: Practice }).practice;
    return practiceToRow(practice);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create practice."));
  }
}

export async function updatePracticeApi(id: string, data: Partial<PracticeBody>): Promise<PracticeRow> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const practice = (response.data as { practice: Practice }).practice;
    return practiceToRow(practice);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update practice."));
  }
}

export async function deletePracticeApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete practice."));
  }
}
