import axios from "axios";
import { apiConnector } from "../apiConnector";
import { auditEndpoints } from "../apis";
import type { Audit, AuditBody, AuditRow, AuditViewData } from "../../components/audits/types";

const { LIST, CREATE, GET, UPDATE, DELETE } = auditEndpoints;

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

function auditToRow(audit: Audit): AuditRow {
  return {
    id: audit.id,
    values: {
      id: audit.id,
      type: audit.type,
      score: audit.score ?? 0,
      practiceName: audit.practice?.name || "",
      practiceId: audit.practiceId,
      dealName: audit.deal?.name || "",
      dealId: audit.dealId || "",
      findings: audit.findings,
      recommendations: audit.recommendations,
      creationDate: new Date(audit.createdAt).toLocaleString(),
      lastUpdate: new Date(audit.updatedAt).toLocaleString(),
    },
  };
}

const fields = [
  { id: "type", label: "Type", type: "text" as const, visible: true },
  { id: "score", label: "Score", type: "number" as const, visible: true },
  { id: "practiceName", label: "Practice", type: "text" as const, visible: true },
  { id: "dealName", label: "Deal", type: "text" as const, visible: true },
  { id: "creationDate", label: "Creation date", type: "text" as const, visible: true },
  { id: "lastUpdate", label: "Last update", type: "text" as const, visible: false },
];

export type AuditQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  practiceId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function getAuditsView(params?: AuditQueryParams): Promise<AuditViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.type) queryString.set("type", params.type);
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString.toString()}` : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { audits, pagination } = response.data as {
      audits: Audit[];
      pagination?: { totalRecords: number; totalPages: number; currentPage: number; limit: number };
    };
    
    const paginationInfo = pagination || { totalRecords: audits.length, totalPages: 1, currentPage: 1, limit: 10 };
    
    return {
      viewId: "audit-view-001",
      title: "All Audits",
      totalCount: paginationInfo.totalRecords,
      fields,
      rows: audits.map(auditToRow),
      pagination: {
        page: paginationInfo.currentPage,
        limit: paginationInfo.limit,
        total: paginationInfo.totalRecords,
        totalPages: paginationInfo.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch audits."));
  }
}

export async function getAuditsByPractice(practiceId: string): Promise<Audit[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: `${LIST}?practiceId=${practiceId}`,
      credentials: true,
    });
    const { audits } = response.data as { audits: Audit[] };
    return audits;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch audits for practice."));
  }
}

export async function getAudit(id: string): Promise<Audit> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { audit: Audit }).audit;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch audit."));
  }
}

export async function createAuditApi(data: AuditBody): Promise<AuditRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const audit = (response.data as { audit: Audit }).audit;
    return auditToRow(audit);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create audit."));
  }
}

export async function updateAuditApi(id: string, data: Partial<AuditBody>): Promise<AuditRow> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const audit = (response.data as { audit: Audit }).audit;
    return auditToRow(audit);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update audit."));
  }
}

export async function deleteAuditApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete audit."));
  }
}